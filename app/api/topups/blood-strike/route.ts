import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

import {
  BLOOD_STRIKE,
  BloodStrikeOffer,
} from "../../../../lib/games/blood-strike";

export const dynamic = "force-dynamic";

/*
|--------------------------------------------------------------------------
| CONFIGURACIÓN
|--------------------------------------------------------------------------
*/

const CATEGORY_ID = BLOOD_STRIKE.categoryId;

const FAZER_API_BASE =
  process.env.FAZERCARDS_BASE_URL ||
  "https://api.fzr.cards/api/v2";

const FAZER_API_KEY =
  process.env.FAZERCARDS_API_KEY || "";

const REQUEST_TIMEOUT_MS = 30_000;

/*
|--------------------------------------------------------------------------
| TIPOS
|--------------------------------------------------------------------------
*/

type OrderRow = {
  id: string;
  order_number: string;
  user_id: string;
  category_id: string;
  offer_id: string;
  offer_name: string;
  player_id: string;
  amount: number | string;
  price: number | string;
  supplier_price: number | string;
  supplier_order_id: string | null;
  supplier_status: string | null;
  status: string;
  idempotency_key: string;
  created_at: string;
};

type SupplierOrder = {
  id?: string;
  order_id?: string;
  status?: string;
  kind?: string;
};

type SupplierResponse = {
  ok?: boolean;
  error?: string;
  code?: string;

  order?: SupplierOrder;

  id?: string;
  order_id?: string;
  status?: string;
};

/*
|--------------------------------------------------------------------------
| RESPUESTAS
|--------------------------------------------------------------------------
*/

function jsonError(
  message: string,
  status = 400,
  extra: Record<string, unknown> = {}
) {
  return NextResponse.json(
    {
      ok: false,
      error: message,
      ...extra,
    },
    { status }
  );
}

function jsonSuccess(
  data: Record<string, unknown>
) {
  return NextResponse.json({
    ok: true,
    ...data,
  });
}

/*
|--------------------------------------------------------------------------
| UTILIDADES
|--------------------------------------------------------------------------
*/

function normalizeString(
  value: unknown
): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function normalizePlayerId(
  value: unknown
): string {
  return normalizeString(value);
}

function normalizeIdempotencyKey(
  value: unknown
): string {
  return normalizeString(value);
}

function roundMoney(
  value: number
): number {
  return Math.round(value * 100) / 100;
}

function toNumber(
  value: unknown
): number {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
}

/*
|--------------------------------------------------------------------------
| VALIDACIÓN DEL ID DEL JUGADOR
|--------------------------------------------------------------------------
|
| Blood Strike puede utilizar IDs alfanuméricos.
|
*/

function isValidPlayerId(
  playerId: string
): boolean {
  if (
    playerId.length < 4 ||
    playerId.length > 32
  ) {
    return false;
  }

  return /^[A-Za-z0-9_-]+$/.test(
    playerId
  );
}

/*
|--------------------------------------------------------------------------
| VALIDACIÓN DE IDEMPOTENCY KEY
|--------------------------------------------------------------------------
*/

function isValidIdempotencyKey(
  key: string
): boolean {
  if (
    key.length < 8 ||
    key.length > 200
  ) {
    return false;
  }

  return true;
}

/*
|--------------------------------------------------------------------------
| TIMEOUT PARA FETCH
|--------------------------------------------------------------------------
*/

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeout = REQUEST_TIMEOUT_MS
) {
  const controller =
    new AbortController();

  const timer = setTimeout(
    () => controller.abort(),
    timeout
  );

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

/*
|--------------------------------------------------------------------------
| AUTENTICACIÓN
|--------------------------------------------------------------------------
*/

async function getAuthenticatedUser(
  request: NextRequest
) {
  const authorization =
    request.headers.get("authorization") ||
    request.headers.get("Authorization") ||
    "";

  if (!authorization) {
    return {
      user: null,
      error: "No autenticado.",
    };
  }

  const match =
    authorization.match(
      /^Bearer\s+(.+)$/i
    );

  if (!match) {
    return {
      user: null,
      error: "Token de autenticación inválido.",
    };
  }

  const accessToken =
    match[1].trim();

  if (!accessToken) {
    return {
      user: null,
      error: "Token de autenticación vacío.",
    };
  }

  const {
    data,
    error,
  } =
    await supabaseAdmin.auth.getUser(
      accessToken
    );

  if (error || !data.user) {
    return {
      user: null,
      error:
        "La sesión no es válida o ha expirado.",
    };
  }

  return {
    user: data.user,
    error: null,
  };
}

/*
|--------------------------------------------------------------------------
| HEADERS DEL RESELLER
|--------------------------------------------------------------------------
*/

function supplierHeaders(
  idempotencyKey?: string
): Record<string, string> {
  const headers: Record<
    string,
    string
  > = {
    "Content-Type":
      "application/json",

    Accept:
      "application/json",

    "X-API-Key":
      FAZER_API_KEY,
  };

  /*
   * También dejamos Authorization como
   * alternativa compatible con la API.
   */
  if (FAZER_API_KEY) {
    headers.Authorization =
      `Bearer ${FAZER_API_KEY}`;
  }

  if (idempotencyKey) {
    headers["Idempotency-Key"] =
      idempotencyKey;
  }

  return headers;
}

/*
|--------------------------------------------------------------------------
| EXTRAER ID DE ORDEN DEL RESELLER
|--------------------------------------------------------------------------
*/

function getSupplierOrderId(
  result: SupplierResponse
): string {
  return (
    result.order?.id ||
    result.order?.order_id ||
    result.id ||
    result.order_id ||
    ""
  );
}

/*
|--------------------------------------------------------------------------
| EXTRAER ESTADO DEL RESELLER
|--------------------------------------------------------------------------
*/

function getSupplierStatus(
  result: SupplierResponse
): string {
  return (
    result.order?.status ||
    result.status ||
    "processing"
  );
}

/*
|--------------------------------------------------------------------------
| CREAR ORDEN EN FAZERCARDS
|--------------------------------------------------------------------------
*/

async function createSupplierOrder(params: {
  supplierOfferId: string;
  playerId: string;
  idempotencyKey: string;
}) {
  if (!FAZER_API_KEY) {
    throw new Error(
      "FAZERCARDS_API_KEY no está configurada."
    );
  }

  const response =
    await fetchWithTimeout(
      `${FAZER_API_BASE}/topups/order`,
      {
        method: "POST",

        headers:
          supplierHeaders(
            params.idempotencyKey
          ),

        body: JSON.stringify({
          category_id:
            CATEGORY_ID,

          offer_id:
            params.supplierOfferId,

          fields: {
            player_id:
              params.playerId,
          },
        }),
      }
    );

  let data: SupplierResponse =
    {};

  try {
    data =
      (await response.json()) as SupplierResponse;
  } catch {
    data = {};
  }

  if (!response.ok || data.ok === false) {
    const supplierMessage =
      data.error ||
      `El reseller rechazó la orden (${response.status}).`;

    throw new Error(
      supplierMessage
    );
  }

  return data;
}

/*
|--------------------------------------------------------------------------
| GET
|--------------------------------------------------------------------------
|
| Devuelve la configuración de Blood Strike
| sin exponer la API key.
|
*/

export async function GET() {
  return jsonSuccess({
    category: {
      id: BLOOD_STRIKE.id,
      categoryId:
        BLOOD_STRIKE.categoryId,
      name: BLOOD_STRIKE.name,
      image: BLOOD_STRIKE.image,
      description:
        BLOOD_STRIKE.description,
      playerField:
        BLOOD_STRIKE.playerField,
    },

    offers:
      BLOOD_STRIKE.offers.map(
        (offer) => ({
          id: offer.id,
          name: offer.name,
          displayName:
            offer.displayName,
          price:
            offer.price,
        })
      ),
  });
}

/*
|--------------------------------------------------------------------------
| POST
|--------------------------------------------------------------------------
*/

export async function POST(
  request: NextRequest
) {
  /*
   * ================================================================
   * 1. AUTENTICAR USUARIO
   * ================================================================
   */

  const {
    user,
    error: authError,
  } =
    await getAuthenticatedUser(
      request
    );

  if (!user) {
    return jsonError(
      authError ||
        "No autenticado.",
      401
    );
  }

  /*
   * ================================================================
   * 2. LEER BODY
   * ================================================================
   */

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError(
      "El cuerpo de la solicitud no es válido.",
      400
    );
  }

  if (
    !body ||
    typeof body !== "object"
  ) {
    return jsonError(
      "Solicitud inválida.",
      400
    );
  }

  const payload =
    body as Record<
      string,
      unknown
    >;

  const offerId =
    normalizeString(
      payload.offerId
    );

  const playerId =
    normalizePlayerId(
      payload.playerId
    );

  const idempotencyKey =
    normalizeIdempotencyKey(
      payload.idempotencyKey
    );

  /*
   * ================================================================
   * 3. VALIDAR OFFER ID
   * ================================================================
   */

  if (!offerId) {
    return jsonError(
      "Debe seleccionar una oferta.",
      400
    );
  }

  /*
   * ================================================================
   * 4. VALIDAR PLAYER ID
   * ================================================================
   */

  if (!playerId) {
    return jsonError(
      "Debe introducir el ID del jugador.",
      400
    );
  }

  if (
    !isValidPlayerId(
      playerId
    )
  ) {
    return jsonError(
      "El ID del jugador no tiene un formato válido.",
      400
    );
  }

  /*
   * ================================================================
   * 5. VALIDAR IDEMPOTENCY KEY
   * ================================================================
   */

  if (
    !isValidIdempotencyKey(
      idempotencyKey
    )
  ) {
    return jsonError(
      "La clave de idempotencia no es válida.",
      400
    );
  }

  /*
   * ================================================================
   * 6. BUSCAR OFERTA EN EL SERVIDOR
   * ================================================================
   *
   * Nunca confiamos en el precio enviado por el navegador.
   *
   * El usuario solamente manda:
   *
   * offerId
   * playerId
   * idempotencyKey
   *
   * El servidor determina:
   *
   * precio
   * nombre
   * supplierOfferId
   *
   * ================================================================
   */

  const offer =
    BLOOD_STRIKE.offers.find(
      (item) =>
        item.id === offerId
    );

  if (!offer) {
    return jsonError(
      "La oferta seleccionada no existe.",
      404
    );
  }

  /*
   * ================================================================
   * 7. VALORES CONTROLADOS POR SERVIDOR
   * ================================================================
   */

  const retailPrice =
    roundMoney(
      toNumber(
        offer.price
      )
    );

  const supplierPrice =
    roundMoney(
      toNumber(
        offer.supplierPrice
      )
    );

  const supplierOfferId =
    normalizeString(
      offer.supplierOfferId
    );

  if (!supplierOfferId) {
    return jsonError(
      "La oferta no tiene configurado el ID del reseller.",
      500
    );
  }

  /*
   * ================================================================
   * 8. COMPROBAR ORDEN DUPLICADA
   * ================================================================
   */

  const {
    data: existingOrder,
    error:
      existingOrderError,
  } =
    await supabaseAdmin
      .from("orders")
      .select("*")
      .eq(
        "user_id",
        user.id
      )
      .eq(
        "idempotency_key",
        idempotencyKey
      )
      .maybeSingle();

  if (
    existingOrderError
  ) {
    console.error(
      "Existing order lookup error:",
      existingOrderError
    );

    return jsonError(
      "No se pudo comprobar la orden anterior.",
      500
    );
  }

  /*
   * Si ya existe, devolvemos la orden existente
   * y NO volvemos a cobrar/crear en el reseller.
   */

  if (existingOrder) {
    const order =
      existingOrder as OrderRow;

    return jsonSuccess({
      message:
        "La orden ya había sido creada.",

      order: {
        id:
          order.id,

        order_number:
          order.order_number,

        user_id:
          order.user_id,

        category_id:
          order.category_id,

        offer_id:
          order.offer_id,

        offer_name:
          order.offer_name,

        player_id:
          order.player_id,

        amount:
          order.amount,

        price:
          order.price,

        currency:
          "USD",

        supplier_order_id:
          order.supplier_order_id,

        supplier_status:
          order.supplier_status,

        status:
          order.status,

        created_at:
          order.created_at,
      },

      supplierOrderId:
        order.supplier_order_id,

      status:
        order.status,
    });
  }

  /*
   * ================================================================
   * 9. GENERAR NÚMERO DE ORDEN LOCAL
   * ================================================================
   */

  const generatedOrderNumber =
    `BS-${Date.now()}-${Math.floor(
      Math.random() * 10000
    )
      .toString()
      .padStart(4, "0")}`;

  /*
   * ================================================================
   * 10. CREAR ORDEN LOCAL
   * ================================================================
   *
   * Primero registramos la intención de compra.
   *
   * El estado inicial es pending.
   *
   * ================================================================
   */

  const {
    data: localOrder,
    error:
      localOrderError,
  } =
    await supabaseAdmin
      .from("orders")
      .insert({
        order_number:
          generatedOrderNumber,

        user_id:
          user.id,

        category_id:
          CATEGORY_ID,

        offer_id:
          offer.id,

        offer_name:
          offer.name,

        player_id:
          playerId,

        amount:
          retailPrice,

        price:
          retailPrice,

        supplier_price:
          supplierPrice,

        supplier_order_id:
          null,

        supplier_status:
          "pending",

        status:
          "pending",

        idempotency_key:
          idempotencyKey,
      })
      .select("*")
      .single();

  if (
    localOrderError ||
    !localOrder
  ) {
    console.error(
      "Local Blood Strike order creation error:",
      localOrderError
    );

    return jsonError(
      "No se pudo crear la orden.",
      500
    );
  }

  /*
   * ================================================================
   * 11. ENVIAR ORDEN AL RESELLER
   * ================================================================
   *
   * Aquí se envía:
   *
   * category_id = Blood Strike
   * offer_id    = oferta correspondiente
   * player_id   = ID introducido por el usuario
   *
   * ================================================================
   */

  let supplierResult:
    SupplierResponse;

  try {
    supplierResult =
      await createSupplierOrder({
        supplierOfferId,
        playerId,
        idempotencyKey,
      });
  } catch (error) {
    console.error(
      "Blood Strike supplier error:",
      error
    );

    /*
     * ============================================================
     * MARCAR ERROR DEL RESELLER
     * ============================================================
     */

    await supabaseAdmin
      .from("orders")
      .update({
        status:
          "supplier_error",

        supplier_status:
          "error",
      })
      .eq(
        "id",
        localOrder.id
      );

    return jsonError(
      error instanceof Error
        ? error.message
        : "El reseller no pudo procesar la orden.",
      502,
      {
        orderNumber:
          generatedOrderNumber,
      }
    );
  }

  /*
   * ================================================================
   * 12. OBTENER INFORMACIÓN DEL RESELLER
   * ================================================================
   */

  const supplierOrderId =
    getSupplierOrderId(
      supplierResult
    );

  const supplierStatus =
    getSupplierStatus(
      supplierResult
    );

  /*
   * ================================================================
   * 13. DETERMINAR ESTADO LOCAL
   * ================================================================
   */

  let localStatus =
    "processing";

  if (
    supplierStatus ===
      "completed" ||
    supplierStatus ===
      "complete"
  ) {
    localStatus =
      "completed";
  }

  if (
    supplierStatus ===
      "failed" ||
    supplierStatus ===
      "error"
  ) {
    localStatus =
      "supplier_error";
  }

  if (
    supplierStatus ===
      "refunded" ||
    supplierStatus ===
      "refund"
  ) {
    localStatus =
      "refunded";
  }

  /*
   * ================================================================
   * 14. ACTUALIZAR ORDEN LOCAL
   * ================================================================
   */

  const {
    data: updatedOrder,
    error:
      updateOrderError,
  } =
    await supabaseAdmin
      .from("orders")
      .update({
        supplier_order_id:
          supplierOrderId ||
          null,

        supplier_status:
          supplierStatus,

        status:
          localStatus,
      })
      .eq(
        "id",
        localOrder.id
      )
      .select("*")
      .single();

  if (
    updateOrderError ||
    !updatedOrder
  ) {
    console.error(
      "Blood Strike order update error:",
      updateOrderError
    );

    /*
     * La orden del reseller pudo haberse creado,
     * por lo que NO intentamos crear otra orden.
     */

    return jsonSuccess({
      message:
        "La orden fue enviada al reseller, pero no se pudo actualizar completamente el registro local.",

      order: {
        id:
          localOrder.id,

        order_number:
          generatedOrderNumber,

        user_id:
          user.id,

        category_id:
          CATEGORY_ID,

        offer_id:
          offer.id,

        offer_name:
          offer.name,

        player_id:
          playerId,

        amount:
          retailPrice,

        price:
          retailPrice,

        currency:
          "USD",

        supplier_order_id:
          supplierOrderId ||
          null,

        supplier_status:
          supplierStatus,

        status:
          localStatus,
      },

      supplier:
        supplierResult,

      supplierOrderId:
        supplierOrderId ||
        null,

      status:
        localStatus,
    });
  }

  /*
   * ================================================================
   * 15. RESPUESTA FINAL
   * ================================================================
   */

  const order =
    updatedOrder as OrderRow;

  return jsonSuccess({
    message:
      "Orden de Blood Strike creada correctamente.",

    order: {
      id:
        order.id,

      order_number:
        order.order_number,

      user_id:
        order.user_id,

      category_id:
        order.category_id,

      offer_id:
        order.offer_id,

      offer_name:
        order.offer_name,

      player_id:
        order.player_id,

      amount:
        order.amount,

      price:
        order.price,

      currency:
        "USD",

      supplier_order_id:
        order.supplier_order_id,

      supplier_status:
        order.supplier_status,

      status:
        order.status,

      created_at:
        order.created_at,
    },

    supplier:
      supplierResult,

    supplierOrderId:
      order.supplier_order_id,

    status:
      order.status,
  });
}
