import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

import { FREE_FIRE_LATAM } from "../../../../lib/games/free-fire-latam";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/*
|--------------------------------------------------------------------------
| CONFIGURACIÓN
|--------------------------------------------------------------------------
*/

const CATEGORY_ID =
  FREE_FIRE_LATAM.categoryId;

const FAZER_API_BASE =
  process.env.FAZERCARDS_API_URL ||
  "https://api.fzr.cards/api/v2";

const FAZERCARDS_API_KEY =
  process.env.FAZERCARDS_API_KEY || "";

const SUPPLIER_TIMEOUT = 30000;

/*
|--------------------------------------------------------------------------
| TIPOS
|--------------------------------------------------------------------------
*/

type AuthUser = {
  id: string;
  email?: string | null;
};

type OfferRow = {
  id: string;
  supplierOfferId: string;
  name: string;
  display: string;
  price: number;
  supplierPrice: number;
  icon?: string;
};

type TopupOrderRow = {
  id?: string;
  order_number?: string | null;
  user_id?: string | null;
  category_id?: string | null;
  offer_id?: string | null;
  offer_name?: string | null;
  player_id?: string | null;
  quantity?: number | null;
  retail_price?: number | null;
  amount?: number | null;
  price?: number | null;
  supplier_price?: number | null;
  currency?: string | null;
  supplier_order_id?: string | null;
  supplier_status?: string | null;
  supplier_response?: unknown;
  status?: string | null;
  idempotency_key?: string | null;
  error_message?: string | null;
  created_at?: string | null;
  [key: string]: unknown;
};

type SupplierResponse = {
  ok?: boolean;
  success?: boolean;
  status?: string;
  message?: string;
  error?: string;

  order?: {
    id?: string | number | null;
    order_id?: string | number | null;
    status?: string | null;
    [key: string]: unknown;
  };

  data?: {
    id?: string | number | null;
    order_id?: string | number | null;
    status?: string | null;

    order?: {
      id?: string | number | null;
      order_id?: string | number | null;
      status?: string | null;
      [key: string]: unknown;
    };

    [key: string]: unknown;
  };

  id?: string | number | null;
  order_id?: string | number | null;

  [key: string]: unknown;
};

/*
|--------------------------------------------------------------------------
| UTILIDADES
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
    {
      status,
    }
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
    {
      status,
    }
  );
}

function normalizeString(
  value: unknown
): string {
  if (
    typeof value !== "string" &&
    typeof value !== "number"
  ) {
    return "";
  }

  return String(value).trim();
}

function normalizePlayerId(
  value: unknown
): string {
  return normalizeString(value).replace(
    /\s+/g,
    ""
  );
}

function normalizeIdempotencyKey(
  value: unknown
): string {
  return normalizeString(value);
}

function isValidPlayerId(
  playerId: string
): boolean {
  return /^[0-9]{4,20}$/.test(
    playerId
  );
}

function isValidIdempotencyKey(
  key: string
): boolean {
  return (
    key.length >= 8 &&
    key.length <= 200
  );
}

function roundMoney(
  value: number
): number {
  return (
    Math.round(
      (value + Number.EPSILON) * 100
    ) / 100
  );
}

function toNumber(
  value: unknown
): number {
  const parsed =
    typeof value === "number"
      ? value
      : Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

function getSupplierOrderId(
  data: SupplierResponse
): string | null {
  const value =
    data?.order?.id ??
    data?.order?.order_id ??
    data?.data?.id ??
    data?.data?.order_id ??
    data?.data?.order?.id ??
    data?.data?.order?.order_id ??
    data?.id ??
    data?.order_id ??
    null;

  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  return String(value);
}

function getSupplierStatus(
  data: SupplierResponse
): string | null {
  const value =
    data?.order?.status ??
    data?.data?.order?.status ??
    data?.status ??
    null;

  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  return String(value);
}

/*
|--------------------------------------------------------------------------
| TIMEOUT
|--------------------------------------------------------------------------
*/

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeout = SUPPLIER_TIMEOUT
): Promise<Response> {
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
): Promise<{
  user: AuthUser | null;
  error: string | null;
}> {
  const authorization =
    request.headers.get(
      "authorization"
    );

  if (!authorization) {
    return {
      user: null,
      error:
        "Falta el token de autenticación.",
    };
  }

  const match =
    authorization.match(
      /^Bearer\s+(.+)$/i
    );

  if (!match) {
    return {
      user: null,
      error:
        "Token de autenticación inválido.",
    };
  }

  const accessToken =
    match[1].trim();

  if (!accessToken) {
    return {
      user: null,
      error:
        "Token de autenticación vacío.",
    };
  }

  const {
    data,
    error,
  } =
    await supabaseAdmin.auth.getUser(
      accessToken
    );

  if (
    error ||
    !data?.user
  ) {
    return {
      user: null,
      error:
        "No se pudo validar la sesión.",
    };
  }

  return {
    user: {
      id: data.user.id,
      email:
        data.user.email ?? null,
    },
    error: null,
  };
}

/*
|--------------------------------------------------------------------------
| HEADERS FAZERCARDS
|--------------------------------------------------------------------------
*/

function supplierHeaders(
  idempotencyKey: string
): HeadersInit {
  return {
    "Content-Type":
      "application/json",

    Accept:
      "application/json",

    "X-API-Key":
      FAZERCARDS_API_KEY,

    "Idempotency-Key":
      idempotencyKey,

    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36",

    Referer:
      "https://reseller.fazercards.com/",

    Origin:
      "https://reseller.fazercards.com",
  };
}

/*
|--------------------------------------------------------------------------
| CREAR PEDIDO EN FAZERCARDS
|--------------------------------------------------------------------------
*/

async function createSupplierOrder(
  params: {
    supplierOfferId: string;
    playerId: string;
    idempotencyKey: string;
  }
): Promise<{
  ok: boolean;
  data: SupplierResponse | null;
  error: string | null;
  uncertain?: boolean;
}> {
  if (!FAZERCARDS_API_KEY) {
    return {
      ok: false,
      data: null,
      error:
        "FAZERCARDS_API_KEY no está configurada.",
    };
  }

  const url =
    `${FAZER_API_BASE}/topups/order`;

  const body = {
    category_id:
      CATEGORY_ID,

    offer_id:
      params.supplierOfferId,

    fields: {
      player_id:
        params.playerId,
    },
  };

  try {
    const response =
      await fetchWithTimeout(
        url,
        {
          method: "POST",

          headers:
            supplierHeaders(
              params.idempotencyKey
            ),

          body:
            JSON.stringify(body),
        }
      );

    const raw =
      await response.text();

    let data:
      SupplierResponse = {};

    try {
      data =
        raw
          ? JSON.parse(raw)
          : {};
    } catch {
      data = {
        message: raw,
      };
    }

    /*
     * Los errores 5xx pueden significar que
     * el proveedor recibió el pedido pero
     * nuestra aplicación no obtuvo respuesta.
     */
    if (
      response.status >= 500
    ) {
      return {
        ok: false,
        data,
        error:
          data?.message ||
          data?.error ||
          `El proveedor respondió con HTTP ${response.status}.`,
        uncertain: true,
      };
    }

    if (!response.ok) {
      return {
        ok: false,
        data,
        error:
          data?.message ||
          data?.error ||
          `El proveedor respondió con HTTP ${response.status}.`,
        uncertain: false,
      };
    }

    return {
      ok: true,
      data,
      error: null,
      uncertain: false,
    };
  } catch (error) {
    return {
      ok: false,
      data: null,
      error:
        error instanceof Error
          ? error.message
          : "Error desconocido al contactar al proveedor.",
      uncertain: true,
    };
  }
}

/*
|--------------------------------------------------------------------------
| GET
|--------------------------------------------------------------------------
*/

export async function GET(
  request: NextRequest
) {
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

  return jsonSuccess({
    category:
      CATEGORY_ID,

    game:
      FREE_FIRE_LATAM.game,

    offers:
      FREE_FIRE_LATAM.offers.map(
        (offer) => ({
          id: offer.id,

          name: offer.name,

          display:
            offer.display,

          price:
            offer.price,

          icon:
            offer.icon,
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

  let body:
    Record<string, unknown>;

  try {
    body =
      await request.json();
  } catch {
    return jsonError(
      "El cuerpo de la solicitud no es un JSON válido.",
      400
    );
  }

  const offerId =
    normalizeString(
      body.offerId
    );

  const playerId =
    normalizePlayerId(
      body.playerId
    );

  const idempotencyKey =
    normalizeIdempotencyKey(
      body.idempotencyKey
    );

  if (!offerId) {
    return jsonError(
      "Debe seleccionar una oferta."
    );
  }

  if (!playerId) {
    return jsonError(
      "Debe introducir su ID de jugador."
    );
  }

  if (
    !isValidPlayerId(
      playerId
    )
  ) {
    return jsonError(
      "El ID de jugador no es válido."
    );
  }

  if (
    !isValidIdempotencyKey(
      idempotencyKey
    )
  ) {
    return jsonError(
      "La clave de idempotencia no es válida."
    );
  }

  /*
  |--------------------------------------------------------------------------
  | BUSCAR OFERTA
  |--------------------------------------------------------------------------
  */

  const offer =
    FREE_FIRE_LATAM.offers.find(
      (item) =>
        item.id === offerId
    ) as
      | OfferRow
      | undefined;

  if (!offer) {
    return jsonError(
      "La oferta seleccionada no existe.",
      404
    );
  }

  /*
  |--------------------------------------------------------------------------
  | PRECIO CONTROLADO POR SERVIDOR
  |--------------------------------------------------------------------------
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

  if (
    retailPrice <= 0
  ) {
    return jsonError(
      "La oferta tiene un precio inválido.",
      500
    );
  }

  if (
    supplierPrice <= 0
  ) {
    return jsonError(
      "La oferta no tiene un precio de proveedor válido.",
      500
    );
  }

  if (!supplierOfferId) {
    return jsonError(
      "La oferta no tiene configurado el ID del proveedor.",
      500
    );
  }

  /*
  |--------------------------------------------------------------------------
  | IDEMPOTENCIA
  |--------------------------------------------------------------------------
  */

  const {
    data:
      existingOrders,
    error:
      existingOrderError,
  } =
    await supabaseAdmin
      .from("topup_orders")
      .select("*")
      .eq(
        "user_id",
        user.id
      )
      .eq(
        "idempotency_key",
        idempotencyKey
      )
      .limit(1);

  if (existingOrderError) {
    console.error(
      "Error buscando pedido existente:",
      existingOrderError
    );
  }

  const existingOrder =
    existingOrders?.[0] as
      | TopupOrderRow
      | undefined;

  if (existingOrder) {
    return jsonSuccess({
      message:
        "El pedido ya había sido creado.",

      order:
        existingOrder,

      orderNumber:
        existingOrder.order_number ||
        existingOrder.id ||
        "",

      supplierOrderId:
        existingOrder.supplier_order_id ||
        null,

      status:
        existingOrder.status ||
        "PENDING",

      duplicate:
        true,
    });
  }

  /*
  |--------------------------------------------------------------------------
  | CREAR PEDIDO LOCAL
  |--------------------------------------------------------------------------
  */

  const orderPayload = {
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

    quantity:
      1,

    retail_price:
      retailPrice,

    amount:
      retailPrice,

    price:
      retailPrice,

    supplier_price:
      supplierPrice,

    currency:
      "USD",

    status:
      "RESERVED",

    supplier_status:
      "PENDING",

    idempotency_key:
      idempotencyKey,
  };

  const {
    data:
      createdOrderData,
    error:
      createOrderError,
  } =
    await supabaseAdmin
      .from("topup_orders")
      .insert(
        orderPayload
      )
      .select("*")
      .single();

  if (createOrderError) {
    /*
     * Puede ser una condición de carrera
     * con la misma idempotency key.
     */
    const duplicateLookup =
      await supabaseAdmin
        .from("topup_orders")
        .select("*")
        .eq(
          "user_id",
          user.id
        )
        .eq(
          "idempotency_key",
          idempotencyKey
        )
        .limit(1);

    const duplicateOrder =
      duplicateLookup
        .data?.[0] as
        | TopupOrderRow
        | undefined;

    if (duplicateOrder) {
      return jsonSuccess({
        message:
          "El pedido ya había sido creado.",

        order:
          duplicateOrder,

        orderNumber:
          duplicateOrder.order_number ||
          duplicateOrder.id ||
          "",

        supplierOrderId:
          duplicateOrder.supplier_order_id ||
          null,

        status:
          duplicateOrder.status ||
          "PENDING",

        duplicate:
          true,
      });
    }

    console.error(
      "Error creando topup_orders:",
      createOrderError
    );

    return jsonError(
      "No se pudo crear el pedido.",
      500,
      {
        detail:
          createOrderError.message,
      }
    );
  }

  const createdOrder =
    createdOrderData as TopupOrderRow;

  const localOrderId =
    normalizeString(
      createdOrder.id
    );

  const localOrderNumber =
    normalizeString(
      createdOrder.order_number
    ) ||
    localOrderId;

  /*
  |--------------------------------------------------------------------------
  | ENVIAR A FAZERCARDS
  |--------------------------------------------------------------------------
  */

  const supplierResult =
    await createSupplierOrder({
      supplierOfferId,

      playerId,

      idempotencyKey,
    });

  /*
  |--------------------------------------------------------------------------
  | RESPUESTA INCIERTA
  |--------------------------------------------------------------------------
  */

  if (
    !supplierResult.ok &&
    supplierResult.uncertain
  ) {
    await supabaseAdmin
      .from("topup_orders")
      .update({
        status:
          "SUPPLIER_PENDING",

        supplier_status:
          "PENDING",

        error_message:
          supplierResult.error,

        supplier_response:
          supplierResult.data,
      })
      .eq(
        "id",
        localOrderId
      );

    return jsonSuccess(
      {
        message:
          "El pedido fue recibido y está pendiente de confirmación.",

        orderNumber:
          localOrderNumber,

        order: {
          ...createdOrder,

          status:
            "SUPPLIER_PENDING",

          supplier_status:
            "PENDING",
        },

        supplierOrderId:
          null,

        status:
          "SUPPLIER_PENDING",
      },
      202
    );
  }

  /*
  |--------------------------------------------------------------------------
  | ERROR DEFINITIVO DEL PROVEEDOR
  |--------------------------------------------------------------------------
  */

  if (
    !supplierResult.ok ||
    !supplierResult.data
  ) {
    console.error(
      "FazerCards rechazó el pedido:",
      supplierResult.error
    );

    await supabaseAdmin
      .from("topup_orders")
      .update({
        status:
          "FAILED",

        supplier_status:
          "FAILED",

        error_message:
          supplierResult.error,

        supplier_response:
          supplierResult.data,
      })
      .eq(
        "id",
        localOrderId
      );

    return jsonError(
      supplierResult.error ||
        "FazerCards rechazó el pedido.",
      502,
      {
        orderNumber:
          localOrderNumber,

        status:
          "FAILED",
      }
    );
  }

  /*
  |--------------------------------------------------------------------------
  | RESPUESTA DEL PROVEEDOR
  |--------------------------------------------------------------------------
  */

  const supplierData =
    supplierResult.data;

  const supplierOrderId =
    getSupplierOrderId(
      supplierData
    );

  const supplierStatus =
    getSupplierStatus(
      supplierData
    );

  /*
  |--------------------------------------------------------------------------
  | SI FAZERCARDS NO DEVUELVE ID
  |--------------------------------------------------------------------------
  */

  if (!supplierOrderId) {
    await supabaseAdmin
      .from("topup_orders")
      .update({
        status:
          "SUPPLIER_PENDING",

        supplier_status:
          supplierStatus ||
          "PENDING",

        supplier_response:
          supplierData,

        error_message:
          "El proveedor respondió, pero no devolvió un número de orden.",
      })
      .eq(
        "id",
        localOrderId
      );

    return jsonSuccess(
      {
        message:
          "El pedido fue enviado y está pendiente de confirmación.",

        orderNumber:
          localOrderNumber,

        supplierOrderId:
          null,

        status:
          "SUPPLIER_PENDING",

        order: {
          ...createdOrder,

          status:
            "SUPPLIER_PENDING",

          supplier_status:
            supplierStatus ||
            "PENDING",
        },

        supplier:
          supplierData,
      },
      202
    );
  }

  /*
  |--------------------------------------------------------------------------
  | DETERMINAR ESTADO
  |--------------------------------------------------------------------------
  */

  const normalizedSupplierStatus =
    (
      supplierStatus ||
      ""
    ).toLowerCase();

  let finalStatus =
    "SUPPLIER_PENDING";

  if (
    [
      "completed",
      "complete",
      "success",
      "successful",
      "delivered",
      "done",
    ].includes(
      normalizedSupplierStatus
    )
  ) {
    finalStatus =
      "COMPLETED";
  } else if (
    [
      "failed",
      "failure",
      "rejected",
      "cancelled",
      "canceled",
      "error",
    ].includes(
      normalizedSupplierStatus
    )
  ) {
    finalStatus =
      "FAILED";
  } else if (
    [
      "pending",
      "processing",
      "in_progress",
      "created",
      "queued",
    ].includes(
      normalizedSupplierStatus
    )
  ) {
    finalStatus =
      "SUPPLIER_PENDING";
  }

  /*
  |--------------------------------------------------------------------------
  | ACTUALIZAR PEDIDO
  |--------------------------------------------------------------------------
  */

  const updateData: Record<
    string,
    unknown
  > = {
    status:
      finalStatus,

    supplier_status:
      supplierStatus ||
      "PENDING",

    supplier_order_id:
      supplierOrderId,

    supplier_response:
      supplierData,
  };

  const {
    data:
      updatedOrderData,
    error:
      updateOrderError,
  } =
    await supabaseAdmin
      .from("topup_orders")
      .update(
        updateData
      )
      .eq(
        "id",
        localOrderId
      )
      .select("*")
      .single();

  if (updateOrderError) {
    console.error(
      "Error actualizando topup_orders:",
      updateOrderError
    );

    return jsonSuccess({
      message:
        "Pedido enviado al proveedor correctamente.",

      orderNumber:
        localOrderNumber,

      supplierOrderId,

      status:
        finalStatus,

      order: {
        ...createdOrder,

        ...updateData,
      },

      supplier:
        supplierData,
    });
  }

  const updatedOrder =
    updatedOrderData as TopupOrderRow;

  /*
  |--------------------------------------------------------------------------
  | RESPUESTA FINAL
  |--------------------------------------------------------------------------
  */

  return jsonSuccess({
    message:
      finalStatus ===
      "COMPLETED"
        ? "Pedido completado correctamente."
        : "Pedido creado correctamente.",

    orderNumber:
      updatedOrder.order_number ||
      localOrderNumber,

    supplierOrderId,

    status:
      finalStatus,

    order:
      updatedOrder,

    supplier:
      supplierData,
  });
}
