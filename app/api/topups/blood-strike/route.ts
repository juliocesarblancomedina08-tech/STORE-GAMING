import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

import { BLOOD_STRIKE } from "../../../../lib/games/blood-strike";

export const dynamic = "force-dynamic";

/*
|--------------------------------------------------------------------------
| CONFIGURACIÓN
|--------------------------------------------------------------------------
*/

const FAZERCARDS_BASE_URL =
  process.env.FAZERCARDS_BASE_URL ||
  "https://api.fzr.cards/api/v2";

const FAZERCARDS_API_KEY =
  process.env.FAZERCARDS_API_KEY || "";

const CATEGORY_ID =
  BLOOD_STRIKE.categoryId;

const REQUEST_TIMEOUT = 30000;

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
  amount: number;
  price: number;
  supplier_price: number;
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
  message?: string;
  order?: SupplierOrder;
  data?: SupplierOrder;
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
  data: Record<string, unknown>,
  status = 200
) {
  return NextResponse.json(
    {
      ok: true,
      ...data,
    },
    { status }
  );
}

/*
|--------------------------------------------------------------------------
| UTILIDADES
|--------------------------------------------------------------------------
*/

function normalizeString(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function normalizePlayerId(value: unknown): string {
  return normalizeString(value).replace(/\s+/g, "");
}

function normalizeIdempotencyKey(value: unknown): string {
  return normalizeString(value);
}

function isValidPlayerId(value: string): boolean {
  /*
   * Blood Strike devuelve player_id como campo de texto.
   *
   * Permitimos:
   * - números
   * - letras
   * - guion
   * - guion bajo
   *
   * Entre 4 y 32 caracteres.
   */
  return /^[A-Za-z0-9_-]{4,32}$/.test(value);
}

function isValidIdempotencyKey(value: string): boolean {
  return value.length >= 8 && value.length <= 200;
}

function roundMoney(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function toNumber(value: unknown): number {
  const numberValue =
    typeof value === "number"
      ? value
      : Number(value);

  return Number.isFinite(numberValue)
    ? numberValue
    : 0;
}

/*
|--------------------------------------------------------------------------
| ORDER ID DEL PROVEEDOR
|--------------------------------------------------------------------------
*/

function getSupplierOrderId(
  response: SupplierResponse
): string | null {
  const possibleIds = [
    response.order?.id,
    response.order?.order_id,
    response.data?.id,
    response.data?.order_id,
    response.id,
    response.order_id,
  ];

  for (const value of possibleIds) {
    if (
      typeof value === "string" &&
      value.trim()
    ) {
      return value.trim();
    }
  }

  return null;
}

/*
|--------------------------------------------------------------------------
| STATUS DEL PROVEEDOR
|--------------------------------------------------------------------------
*/

function getSupplierStatus(
  response: SupplierResponse
): string | null {
  const possibleStatuses = [
    response.order?.status,
    response.data?.status,
    response.status,
  ];

  for (const value of possibleStatuses) {
    if (
      typeof value === "string" &&
      value.trim()
    ) {
      return value.trim();
    }
  }

  return null;
}

/*
|--------------------------------------------------------------------------
| FETCH CON TIMEOUT
|--------------------------------------------------------------------------
*/

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeout = REQUEST_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();

  const timer = setTimeout(() => {
    controller.abort();
  }, timeout);

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
| AUTENTICACIÓN SUPABASE
|--------------------------------------------------------------------------
*/

async function getAuthenticatedUser(
  request: NextRequest
) {
  const authorization =
    request.headers.get("authorization") || "";

  if (!authorization) {
    return {
      user: null,
      error: "Falta el token de autenticación.",
    };
  }

  const match =
    authorization.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    return {
      user: null,
      error: "Token de autenticación inválido.",
    };
  }

  const accessToken = match[1].trim();

  if (!accessToken) {
    return {
      user: null,
      error: "Token de autenticación vacío.",
    };
  }

  const {
    data,
    error,
  } = await supabaseAdmin.auth.getUser(
    accessToken
  );

  if (error || !data.user) {
    return {
      user: null,
      error:
        error?.message ||
        "No se pudo verificar el usuario.",
    };
  }

  return {
    user: data.user,
    error: null,
  };
}

/*
|--------------------------------------------------------------------------
| HEADERS FAZERCARDS
|--------------------------------------------------------------------------
*/

function supplierHeaders(
  idempotencyKey?: string
): Record<string, string> {
  const headers: Record<string, string> = {
    "X-API-Key": FAZERCARDS_API_KEY,
    Authorization:
      `Bearer ${FAZERCARDS_API_KEY}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  if (idempotencyKey) {
    headers["Idempotency-Key"] =
      idempotencyKey;
  }

  return headers;
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
  const url =
    `${FAZERCARDS_BASE_URL}/topups/order`;

  const body = {
    category_id: CATEGORY_ID,

    offer_id:
      params.supplierOfferId,

    fields: {
      player_id:
        params.playerId,
    },
  };

  const response =
    await fetchWithTimeout(url, {
      method: "POST",

      headers:
        supplierHeaders(
          params.idempotencyKey
        ),

      body: JSON.stringify(body),

      cache: "no-store",
    });

  let data: SupplierResponse = {};

  try {
    data =
      (await response.json()) as SupplierResponse;
  } catch {
    data = {};
  }

  return {
    response,
    data,
  };
}

/*
|--------------------------------------------------------------------------
| GET
|--------------------------------------------------------------------------
| Devuelve el catálogo configurado en el servidor.
|--------------------------------------------------------------------------
*/

export async function GET() {
  try {
    return jsonSuccess({
      category: {
        id: BLOOD_STRIKE.categoryId,
        name: BLOOD_STRIKE.name,
        note: BLOOD_STRIKE.note,
      },

      fields: [
        {
          key:
            BLOOD_STRIKE.playerField.name,

          label:
            BLOOD_STRIKE.playerField.label,

          type:
            BLOOD_STRIKE.playerField.type,
        },
      ],

      offers:
        BLOOD_STRIKE.offers.map(
          (offer) => ({
            id: offer.id,

            offer_id:
              offer.supplierOfferId,

            name:
              offer.name,

            displayName:
              offer.displayName,

            price:
              offer.price,

            price_usd:
              offer.price.toFixed(2),

            supplier_price:
              offer.supplierPrice,
          })
        ),
    });
  } catch (error: any) {
    console.error(
      "BLOOD STRIKE GET ERROR:",
      error
    );

    return jsonError(
      error?.message ||
        "Error obteniendo el catálogo.",
      500
    );
  }
}

/*
|--------------------------------------------------------------------------
| POST
|--------------------------------------------------------------------------
| Crea una orden local y posteriormente la
| envía a FazerCards.
|--------------------------------------------------------------------------
*/

export async function POST(
  request: NextRequest
) {
  /*
   * ---------------------------------------------------------------
   * 1. CONFIGURACIÓN DEL PROVEEDOR
   * ---------------------------------------------------------------
   */

  if (!FAZERCARDS_API_KEY) {
    return jsonError(
      "FAZERCARDS_API_KEY no está configurada.",
      500
    );
  }

  /*
   * ---------------------------------------------------------------
   * 2. AUTENTICAR USUARIO
   * ---------------------------------------------------------------
   */

  const {
    user,
    error: authError,
  } = await getAuthenticatedUser(
    request
  );

  if (!user) {
    return jsonError(
      authError ||
        "No autorizado.",
      401
    );
  }

  /*
   * ---------------------------------------------------------------
   * 3. LEER BODY
   * ---------------------------------------------------------------
   */

  let body: any;

  try {
    body = await request.json();
  } catch {
    return jsonError(
      "El cuerpo de la solicitud no es JSON válido.",
      400
    );
  }

  const offerId =
    normalizeString(body?.offerId);

  const playerId =
    normalizePlayerId(body?.playerId);

  const idempotencyKey =
    normalizeIdempotencyKey(
      body?.idempotencyKey
    );

  /*
   * ---------------------------------------------------------------
   * 4. VALIDACIONES
   * ---------------------------------------------------------------
   */

  if (!offerId) {
    return jsonError(
      "Falta offerId."
    );
  }

  if (!playerId) {
    return jsonError(
      "Falta playerId."
    );
  }

  if (!isValidPlayerId(playerId)) {
    return jsonError(
      "El Player ID debe tener entre 4 y 32 caracteres y solo puede contener letras, números, guion o guion bajo."
    );
  }

  if (!idempotencyKey) {
    return jsonError(
      "Falta idempotencyKey."
    );
  }

  if (
    !isValidIdempotencyKey(
      idempotencyKey
    )
  ) {
    return jsonError(
      "idempotencyKey inválida."
    );
  }

  /*
   * ---------------------------------------------------------------
   * 5. BUSCAR OFERTA EN EL SERVIDOR
   * ---------------------------------------------------------------
   *
   * MUY IMPORTANTE:
   *
   * Nunca confiamos en el precio enviado
   * por el navegador.
   *
   * El servidor obtiene la oferta desde
   * BLOOD_STRIKE.
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

  const retailPrice =
    roundMoney(
      toNumber(offer.price)
    );

  const supplierPrice =
    roundMoney(
      toNumber(
        offer.supplierPrice
      )
    );

  const supplierOfferId =
    offer.supplierOfferId;

  /*
   * ---------------------------------------------------------------
   * 6. COMPROBAR ORDEN DUPLICADA
   * ---------------------------------------------------------------
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

  if (existingOrderError) {
    console.error(
      "CHECK DUPLICATE ORDER ERROR:",
      existingOrderError
    );

    return jsonError(
      "No se pudo comprobar si la orden ya existe.",
      500
    );
  }

  /*
   * Si ya existe, devolvemos la orden
   * anterior en vez de crear otra.
   */

  if (existingOrder) {
    return jsonSuccess({
      message:
        "La orden ya había sido creada.",
      order:
        existingOrder as OrderRow,
      supplierOrderId:
        existingOrder.supplier_order_id,
      supplier: {
        status:
          existingOrder.supplier_status,
      },
      duplicate: true,
    });
  }

  /*
   * ---------------------------------------------------------------
   * 7. GENERAR NÚMERO DE ORDEN
   * ---------------------------------------------------------------
   */

  const orderNumber =
    `BS-${Date.now()}-${Math.floor(
      Math.random() * 10000
    )
      .toString()
      .padStart(4, "0")}`;

  /*
   * ---------------------------------------------------------------
   * 8. CREAR ORDEN LOCAL
   * ---------------------------------------------------------------
   */

  const localOrder = {
    order_number:
      orderNumber,

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
  };

  const {
    data: insertedOrder,
    error:
      insertOrderError,
  } =
    await supabaseAdmin
      .from("orders")
      .insert(
        localOrder
      )
      .select("*")
      .single();

  if (insertOrderError) {
    /*
     * Posible carrera de idempotencia:
     * si otra petición creó la orden
     * justo antes, intentamos recuperarla.
     */

    if (
      insertOrderError.code ===
        "23505" ||
      /duplicate/i.test(
        insertOrderError.message ||
          ""
      )
    ) {
      const {
        data: duplicateOrder,
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

      if (duplicateOrder) {
        return jsonSuccess({
          message:
            "La orden ya había sido creada.",
          order:
            duplicateOrder,
          supplierOrderId:
            duplicateOrder.supplier_order_id,
          supplier: {
            status:
              duplicateOrder.supplier_status,
          },
          duplicate: true,
        });
      }
    }

    console.error(
      "INSERT BLOOD STRIKE ORDER ERROR:",
      insertOrderError
    );

    return jsonError(
      "No se pudo crear la orden local.",
      500
    );
  }

  /*
   * ---------------------------------------------------------------
   * 9. ENVIAR ORDEN A FAZERCARDS
   * ---------------------------------------------------------------
   */

  let supplierResult: {
    response: Response;
    data: SupplierResponse;
  };

  try {
    supplierResult =
      await createSupplierOrder({
        supplierOfferId:
          supplierOfferId,

        playerId:
          playerId,

        idempotencyKey:
          idempotencyKey,
      });
  } catch (error: any) {
    console.error(
      "FAZERCARDS BLOOD STRIKE REQUEST ERROR:",
      error
    );

    /*
     * El pedido local queda marcado como
     * error del proveedor.
     */

    await supabaseAdmin
      .from("orders")
      .update({
        status:
          "supplier_error",

        supplier_status:
          "request_error",
      })
      .eq(
        "id",
        insertedOrder.id
      );

    return jsonError(
      error?.name ===
        "AbortError"
        ? "FazerCards tardó demasiado en responder."
        : error?.message ||
            "No se pudo contactar con FazerCards.",
      502,
      {
        order:
          insertedOrder,
      }
    );
  }

  const {
    response:
      supplierResponse,
    data:
      supplierData,
  } =
    supplierResult;

  /*
   * ---------------------------------------------------------------
   * 10. COMPROBAR RESPUESTA DEL PROVEEDOR
   * ---------------------------------------------------------------
   */

  const supplierOrderId =
    getSupplierOrderId(
      supplierData
    );

  const supplierStatus =
    getSupplierStatus(
      supplierData
    );

  const supplierOk =
    supplierResponse.ok &&
    supplierData?.ok !== false;

  /*
   * ---------------------------------------------------------------
   * 11. ERROR DEL PROVEEDOR
   * ---------------------------------------------------------------
   */

  if (!supplierOk) {
    console.error(
      "FAZERCARDS BLOOD STRIKE ORDER ERROR:",
      {
        httpStatus:
          supplierResponse.status,

        response:
          supplierData,
      }
    );

    await supabaseAdmin
      .from("orders")
      .update({
        status:
          "supplier_error",

        supplier_status:
          supplierStatus ||
          "error",

        supplier_order_id:
          supplierOrderId,
      })
      .eq(
        "id",
        insertedOrder.id
      );

    return jsonError(
      supplierData?.error ||
        supplierData?.message ||
        "FazerCards rechazó la orden.",
      502,
      {
        order: {
          ...insertedOrder,
          status:
            "supplier_error",
          supplier_status:
            supplierStatus ||
            "error",
          supplier_order_id:
            supplierOrderId,
        },

        supplier:
          supplierData,
      }
    );
  }

  /*
   * ---------------------------------------------------------------
   * 12. ACTUALIZAR ORDEN LOCAL
   * ---------------------------------------------------------------
   */

  const finalSupplierStatus =
    supplierStatus ||
    "processing";

  const {
    data: updatedOrder,
    error:
      updateOrderError,
  } =
    await supabaseAdmin
      .from("orders")
      .update({
        supplier_order_id:
          supplierOrderId,

        supplier_status:
          finalSupplierStatus,

        status:
          finalSupplierStatus,
      })
      .eq(
        "id",
        insertedOrder.id
      )
      .select("*")
      .single();

  if (updateOrderError) {
    console.error(
      "UPDATE BLOOD STRIKE ORDER ERROR:",
      updateOrderError
    );

    /*
     * La orden ya fue aceptada por FazerCards.
     *
     * Aunque falle la actualización local,
     * no debemos volver a enviarla al proveedor.
     */

    return jsonSuccess({
      message:
        "La orden fue enviada a FazerCards, pero no se pudo actualizar completamente el registro local.",

      order: {
        ...insertedOrder,

        supplier_order_id:
          supplierOrderId,

        supplier_status:
          finalSupplierStatus,

        status:
          finalSupplierStatus,
      },

      supplier:
        supplierData,

      supplierOrderId:
        supplierOrderId,
    });
  }

  /*
   * ---------------------------------------------------------------
   * 13. RESPUESTA FINAL
   * ---------------------------------------------------------------
   */

  return jsonSuccess({
    message:
      "Orden de Blood Strike creada correctamente.",

    order:
      updatedOrder,

    supplier:
      supplierData,

    supplierOrderId:
      supplierOrderId,
  });
}
