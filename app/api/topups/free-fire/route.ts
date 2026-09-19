import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

import { FREE_FIRE_LATAM } from "../../../../lib/games/free-fire-latam";

export const dynamic = "force-dynamic";

/*
|--------------------------------------------------------------------------
| CONFIGURACIÓN
|--------------------------------------------------------------------------
*/

const CATEGORY_ID =
  FREE_FIRE_LATAM.categoryId;

const FAZERCARDS_BASE_URL =
  process.env.FAZERCARDS_BASE_URL ||
  "https://api.fazercards.com";

const FAZERCARDS_API_KEY =
  process.env.FAZERCARDS_API_KEY || "";

const SUPPLIER_TIMEOUT =
  30000;

/*
|--------------------------------------------------------------------------
| TIPOS
|--------------------------------------------------------------------------
*/

type AuthUser = {
  id: string;
  email?: string | null;
};

type OrderRow = {
  id?: string;
  order_number?: string | null;
  user_id?: string | null;
  category_id?: string | null;
  offer_id?: string | null;
  offer_name?: string | null;
  player_id?: string | null;
  amount?: number | null;
  price?: number | null;
  supplier_price?: number | null;
  supplier_order_id?: string | null;
  supplier_status?: string | null;
  status?: string | null;
  idempotency_key?: string | null;
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
  return normalizeString(value)
    .replace(/\s+/g, "");
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

  const timer =
    setTimeout(
      () => controller.abort(),
      timeout
    );

  try {
    return await fetch(
      input,
      {
        ...init,
        signal:
          controller.signal,
      }
    );
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
        data.user.email ??
        null,
    },
    error: null,
  };
}

/*
|--------------------------------------------------------------------------
| PROVEEDOR
|--------------------------------------------------------------------------
*/

function supplierHeaders(): HeadersInit {
  return {
    "Content-Type":
      "application/json",

    Accept:
      "application/json",

    ...(FAZERCARDS_API_KEY
      ? {
          Authorization:
            `Bearer ${FAZERCARDS_API_KEY}`,
        }
      : {}),
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
    orderId: string;
    idempotencyKey: string;
  }
): Promise<{
  ok: boolean;
  data: SupplierResponse | null;
  error: string | null;
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
    `${FAZERCARDS_BASE_URL}/api/orders`;

  const body = {
    offer_id:
      params.supplierOfferId,

    player_id:
      params.playerId,

    external_order_id:
      params.orderId,

    idempotency_key:
      params.idempotencyKey,
  };

  try {
    const response =
      await fetchWithTimeout(
        url,
        {
          method: "POST",

          headers:
            supplierHeaders(),

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

    if (!response.ok) {
      return {
        ok: false,
        data,
        error:
          data?.message ||
          data?.error ||
          `Proveedor respondió con HTTP ${response.status}.`,
      };
    }

    return {
      ok: true,
      data,
      error: null,
    };
  } catch (error) {
    return {
      ok: false,
      data: null,
      error:
        error instanceof Error
          ? error.message
          : "Error desconocido al contactar al proveedor.",
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
  | BUSCAR OFERTA EN EL CATÁLOGO DEL SERVIDOR
  |--------------------------------------------------------------------------
  */

  const offer =
    FREE_FIRE_LATAM.offers.find(
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
    offer.supplierOfferId;

  /*
  |--------------------------------------------------------------------------
  | VALIDACIONES DEL CATÁLOGO
  |--------------------------------------------------------------------------
  */

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

  if (
    !supplierOfferId
  ) {
    return jsonError(
      "La oferta no tiene configurado el ID del proveedor.",
      500
    );
  }

  /*
  |--------------------------------------------------------------------------
  | EVITAR PEDIDOS DUPLICADOS
  |--------------------------------------------------------------------------
  */

  const {
    data:
      existingOrders,
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
      .limit(1);

  if (existingOrderError) {
    console.error(
      "Error buscando pedido existente:",
      existingOrderError
    );
  }

  const existingOrder =
    existingOrders?.[0] as
      | OrderRow
      | undefined;

  if (existingOrder) {
    return jsonSuccess({
      message:
        "El pedido ya había sido creado.",

      order:
        existingOrder,

      duplicate:
        true,
    });
  }

  /*
  |--------------------------------------------------------------------------
  | DATOS BÁSICOS DEL PEDIDO
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

  /*
  |--------------------------------------------------------------------------
  | CREAR PEDIDO LOCAL
  |--------------------------------------------------------------------------
  */

  const {
    data:
      createdOrderData,
    error:
      createOrderError,
  } =
    await supabaseAdmin
      .from("orders")
      .insert(
        orderPayload
      )
      .select("*")
      .single();

  if (createOrderError) {
    const duplicateLookup =
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
        .limit(1);

    const duplicateOrder =
      duplicateLookup
        .data?.[0] as
        | OrderRow
        | undefined;

    if (duplicateOrder) {
      return jsonSuccess({
        message:
          "El pedido ya había sido creado.",

        order:
          duplicateOrder,

        duplicate:
          true,
      });
    }

    console.error(
      "Error creando pedido:",
      createOrderError
    );

    return jsonError(
      "No se pudo crear el pedido.",
      500
    );
  }

  const createdOrder =
    createdOrderData as OrderRow;

  /*
  |--------------------------------------------------------------------------
  | ID LOCAL DEL PEDIDO
  |--------------------------------------------------------------------------
  */

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
  | ENVIAR AL PROVEEDOR
  |--------------------------------------------------------------------------
  */

  const supplierResult =
    await createSupplierOrder({
      supplierOfferId,

      playerId,

      orderId:
        localOrderNumber,

      idempotencyKey,
    });

  /*
  |--------------------------------------------------------------------------
  | ERROR DEL PROVEEDOR
  |--------------------------------------------------------------------------
  */

  if (
    !supplierResult.ok ||
    !supplierResult.data
  ) {
    console.error(
      "Error creando pedido en proveedor:",
      supplierResult.error
    );

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
        localOrderId
      );

    return jsonError(
      "La orden fue creada localmente, pero no pudo enviarse al proveedor.",
      502,
      {
        order: {
          ...createdOrder,

          status:
            "supplier_error",

          supplier_status:
            "error",
        },

        supplierError:
          supplierResult.error,
      }
    );
  }

  /*
  |--------------------------------------------------------------------------
  | DATOS DEL PROVEEDOR
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
  | ACTUALIZAR PEDIDO
  |--------------------------------------------------------------------------
  */

  const updatedFields: Record<
    string,
    unknown
  > = {
    status:
      supplierStatus ||
      "processing",

    supplier_status:
      supplierStatus ||
      "processing",
  };

  if (supplierOrderId) {
    updatedFields
      .supplier_order_id =
      supplierOrderId;
  }

  const {
    data:
      updatedOrderData,
    error:
      updateOrderError,
  } =
    await supabaseAdmin
      .from("orders")
      .update(
        updatedFields
      )
      .eq(
        "id",
        localOrderId
      )
      .select("*")
      .single();

  if (updateOrderError) {
    console.error(
      "Error actualizando pedido:",
      updateOrderError
    );

    return jsonSuccess({
      message:
        "Pedido enviado al proveedor.",

      order: {
        ...createdOrder,

        ...updatedFields,
      },

      supplier:
        supplierData,

      supplierOrderId,
    });
  }

  const updatedOrder =
    updatedOrderData as OrderRow;

  /*
  |--------------------------------------------------------------------------
  | RESPUESTA FINAL
  |--------------------------------------------------------------------------
  */

  return jsonSuccess({
    message:
      "Pedido creado correctamente.",

    order:
      updatedOrder,

    supplier:
      supplierData,

    supplierOrderId,
  });
    }
