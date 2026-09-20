import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

import { CALL_OF_DUTY } from "../../../../lib/games/call-of-duty";

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
  CALL_OF_DUTY.categoryId;

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

function normalizeUserId(value: unknown): string {
  return normalizeString(value).replace(/\s+/g, "");
}

function normalizeIdempotencyKey(value: unknown): string {
  return normalizeString(value);
}

function isValidUserId(value: string): boolean {
  /*
   * FazerCards utiliza el campo:
   *
   * user_id
   *
   * para Call of Duty Mobile Activision.
   *
   * Permitimos números, letras, guion y
   * guion bajo.
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
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

/*
|--------------------------------------------------------------------------
| TIMEOUT PARA FAZERCARDS
|--------------------------------------------------------------------------
*/

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout = REQUEST_TIMEOUT
) {
  const controller = new AbortController();

  const timer = setTimeout(() => {
    controller.abort();
  }, timeout);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      cache: "no-store",
    });
  } finally {
    clearTimeout(timer);
  }
}

/*
|--------------------------------------------------------------------------
| EXTRAER DATOS DE LA RESPUESTA DEL PROVEEDOR
|--------------------------------------------------------------------------
*/

function extractSupplierOrder(
  data: SupplierResponse | null
): SupplierOrder | null {
  if (!data) {
    return null;
  }

  if (data.order) {
    return data.order;
  }

  if (data.data) {
    return data.data;
  }

  if (
    data.id ||
    data.order_id ||
    data.status
  ) {
    return {
      id: data.id,
      order_id: data.order_id,
      status: data.status,
    };
  }

  return null;
}

function extractSupplierOrderId(
  data: SupplierResponse | null
): string | null {
  const order = extractSupplierOrder(data);

  if (!order) {
    return null;
  }

  return (
    order.id ||
    order.order_id ||
    null
  );
}

function extractSupplierStatus(
  data: SupplierResponse | null
): string {
  const order = extractSupplierOrder(data);

  return (
    order?.status ||
    data?.status ||
    "pending"
  );
}

/*
|--------------------------------------------------------------------------
| POST
|--------------------------------------------------------------------------
*/

export async function POST(
  request: NextRequest
) {
  try {
    /*
     * ---------------------------------------------------------------
     * 1. COMPROBAR CONFIGURACIÓN
     * ---------------------------------------------------------------
     */

    if (!FAZERCARDS_API_KEY) {
      console.error(
        "FAZERCARDS_API_KEY no está configurada."
      );

      return jsonError(
        "El servicio de recarga no está configurado.",
        500
      );
    }

    /*
     * ---------------------------------------------------------------
     * 2. AUTENTICACIÓN SUPABASE
     * ---------------------------------------------------------------
     */

    const authorization =
      request.headers.get("authorization") || "";

    if (!authorization.startsWith("Bearer ")) {
      return jsonError(
        "Sesión no válida.",
        401
      );
    }

    const accessToken =
      authorization.slice(7).trim();

    if (!accessToken) {
      return jsonError(
        "Token de autenticación no válido.",
        401
      );
    }

    const {
      data: userData,
      error: userError,
    } =
      await supabaseAdmin.auth.getUser(
        accessToken
      );

    if (
      userError ||
      !userData?.user
    ) {
      console.error(
        "SUPABASE AUTH ERROR:",
        userError
      );

      return jsonError(
        "La sesión ha expirado. Inicie sesión nuevamente.",
        401
      );
    }

    const authenticatedUser =
      userData.user;

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
        "El cuerpo de la solicitud no es válido.",
        400
      );
    }

    const offerId =
      normalizeString(
        body?.offerId
      );

    const userId =
      normalizeUserId(
        body?.userId
      );

    const idempotencyKey =
      normalizeIdempotencyKey(
        body?.idempotencyKey
      );

    /*
     * ---------------------------------------------------------------
     * 4. VALIDAR OFERTA
     * ---------------------------------------------------------------
     */

    if (!offerId) {
      return jsonError(
        "Debe seleccionar una oferta."
      );
    }

    const selectedOffer =
      CALL_OF_DUTY.offers.find(
        (offer) =>
          offer.id === offerId
      );

    if (!selectedOffer) {
      return jsonError(
        "La oferta seleccionada no existe.",
        400
      );
    }

    /*
     * ---------------------------------------------------------------
     * 5. VALIDAR ID DE ACTIVISION
     * ---------------------------------------------------------------
     */

    if (!userId) {
      return jsonError(
        "Debe introducir el ID de usuario de Activision."
      );
    }

    if (!isValidUserId(userId)) {
      return jsonError(
        "El ID de usuario de Activision no tiene un formato válido."
      );
    }

    /*
     * ---------------------------------------------------------------
     * 6. VALIDAR IDEMPOTENCIA
     * ---------------------------------------------------------------
     */

    if (
      !isValidIdempotencyKey(
        idempotencyKey
      )
    ) {
      return jsonError(
        "La clave de la orden no es válida."
      );
    }

    /*
     * ---------------------------------------------------------------
     * 7. COMPROBAR ORDEN DUPLICADA
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
          "idempotency_key",
          idempotencyKey
        )
        .maybeSingle();

    if (existingOrderError) {
      console.error(
        "CHECK EXISTING ORDER ERROR:",
        existingOrderError
      );

      return jsonError(
        "No se pudo comprobar la orden.",
        500
      );
    }

    if (existingOrder) {
      return jsonSuccess({
        message:
          "Esta orden ya fue procesada.",

        order:
          existingOrder,
      });
    }

    /*
     * ---------------------------------------------------------------
     * 8. CREAR NÚMERO DE ORDEN
     * ---------------------------------------------------------------
     */

    const orderNumber =
      `COD-${Date.now()
        .toString()
        .slice(-8)}`;

    const localOrderId =
      crypto.randomUUID();

    /*
     * ---------------------------------------------------------------
     * 9. CREAR ORDEN LOCAL
     * ---------------------------------------------------------------
     *
     * Guardamos el user_id de Activision en
     * player_id porque esa es la estructura
     * que ya utiliza la tabla orders.
     */

    const orderToInsert = {
      id: localOrderId,

      order_number:
        orderNumber,

      user_id:
        authenticatedUser.id,

      category_id:
        CATEGORY_ID,

      offer_id:
        selectedOffer.id,

      offer_name:
        selectedOffer.displayName,

      player_id:
        userId,

      amount:
        roundMoney(
          selectedOffer.price
        ),

      price:
        roundMoney(
          selectedOffer.price
        ),

      supplier_price:
        roundMoney(
          selectedOffer.supplierPrice
        ),

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
      error: insertOrderError,
    } =
      await supabaseAdmin
        .from("orders")
        .insert(
          orderToInsert
        )
        .select("*")
        .single();

    if (
      insertOrderError ||
      !insertedOrder
    ) {
      console.error(
        "INSERT CALL OF DUTY ORDER ERROR:",
        insertOrderError
      );

      return jsonError(
        "No se pudo crear la orden.",
        500
      );
    }

    /*
     * ---------------------------------------------------------------
     * 10. ENVIAR ORDEN A FAZERCARDS
     * ---------------------------------------------------------------
     */

    const supplierUrl =
      `${FAZERCARDS_BASE_URL}/topups/order`;

    const supplierBody = {
      category_id:
        CATEGORY_ID,

      offer_id:
        selectedOffer.supplierOfferId,

      fields: {
        user_id:
          userId,
      },
    };

    let supplierResponse:
      Response;

    let supplierData:
      SupplierResponse | null =
        null;

    try {
      supplierResponse =
        await fetchWithTimeout(
          supplierUrl,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Accept:
                "application/json",

              "X-API-Key":
                FAZERCARDS_API_KEY,

              Authorization:
                `Bearer ${FAZERCARDS_API_KEY}`,

              "Idempotency-Key":
                idempotencyKey,
            },

            body:
              JSON.stringify(
                supplierBody
              ),
          }
        );

      const supplierText =
        await supplierResponse.text();

      try {
        supplierData =
          supplierText
            ? JSON.parse(
                supplierText
              )
            : null;
      } catch {
        supplierData = {
          ok: false,
          message:
            supplierText ||
            "Respuesta no JSON del proveedor.",
        };
      }
    } catch (error: any) {
      console.error(
        "FAZERCARDS CALL OF DUTY REQUEST ERROR:",
        error
      );

      await supabaseAdmin
        .from("orders")
        .update({
          status:
            "failed",

          supplier_status:
            "request_failed",
        })
        .eq(
          "id",
          insertedOrder.id
        );

      return jsonError(
        "No fue posible conectar con FazerCards.",
        502,
        {
          order:
            insertedOrder,
        }
      );
    }

    /*
     * ---------------------------------------------------------------
     * 11. COMPROBAR RESPUESTA FAZERCARDS
     * ---------------------------------------------------------------
     */

    if (
      !supplierResponse.ok ||
      supplierData?.ok === false
    ) {
      console.error(
        "FAZERCARDS CALL OF DUTY ERROR:",
        {
          status:
            supplierResponse.status,

          response:
            supplierData,
        }
      );

      await supabaseAdmin
        .from("orders")
        .update({
          status:
            "failed",

          supplier_status:
            String(
              supplierData?.code ||
                supplierResponse.status ||
                "failed"
            ),
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
          supplierStatus:
            supplierResponse.status,

          supplier:
            supplierData,

          order:
            insertedOrder,
        }
      );
    }

    /*
     * ---------------------------------------------------------------
     * 12. EXTRAER ORDEN DEL PROVEEDOR
     * ---------------------------------------------------------------
     */

    const supplierOrderId =
      extractSupplierOrderId(
        supplierData
      );

    const finalSupplierStatus =
      extractSupplierStatus(
        supplierData
      );

    /*
     * ---------------------------------------------------------------
     * 13. ACTUALIZAR ORDEN LOCAL
     * ---------------------------------------------------------------
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
        "UPDATE CALL OF DUTY ORDER ERROR:",
        updateOrderError
      );

      /*
       * La orden ya fue aceptada por FazerCards.
       *
       * No debemos volver a enviarla.
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
     * 14. RESPUESTA FINAL
     * ---------------------------------------------------------------
     */

    return jsonSuccess({
      message:
        "Orden de Call of Duty Mobile creada correctamente.",

      order:
        updatedOrder,

      supplier:
        supplierData,

      supplierOrderId:
        supplierOrderId,
    });
  } catch (error: any) {
    console.error(
      "CALL OF DUTY TOPUP ERROR:",
      error
    );

    return jsonError(
      error?.message ||
        "Error interno al procesar la orden.",
      500
    );
  }
}
