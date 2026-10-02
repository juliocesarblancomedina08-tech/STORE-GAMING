import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

import { BLOOD_STRIKE } from "../../../../lib/games/blood-strike";

export const dynamic = "force-dynamic";

const FAZERCARDS_BASE_URL =
  process.env.FAZERCARDS_BASE_URL ||
  "https://api.fzr.cards/api/v2";

const FAZERCARDS_API_KEY =
  process.env.FAZERCARDS_API_KEY || "";

const CATEGORY_ID =
  BLOOD_STRIKE.categoryId;

const REQUEST_TIMEOUT = 30000;

/*
 * ================================================================
 * TIPOS
 * ================================================================
 */

type SupplierOrder = {
  id?: string;
  order_id?: string;
  status?: string;
  state?: string;
};

type SupplierResponse = {
  ok?: boolean;
  error?: string;
  code?: string;
  message?: string;

  order?: SupplierOrder;

  data?: SupplierOrder;

  result?: SupplierOrder;

  id?: string;

  order_id?: string;

  status?: string;

  state?: string;
};

/*
 * ================================================================
 * RESPUESTAS
 * ================================================================
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

/*
 * ================================================================
 * UTILIDADES
 * ================================================================
 */

function normalizeString(
  value: unknown
): string {
  if (
    typeof value !==
    "string"
  ) {
    return "";
  }

  return value.trim();
}

function normalizePlayerId(
  value: unknown
): string {
  return normalizeString(
    value
  ).replace(/\s+/g, "");
}

function normalizeIdempotencyKey(
  value: unknown
): string {
  return normalizeString(
    value
  );
}

function isValidPlayerId(
  value: string
): boolean {
  return /^[A-Za-z0-9_-]{4,32}$/.test(
    value
  );
}

function isValidIdempotencyKey(
  value: string
): boolean {
  return (
    value.length >= 8 &&
    value.length <= 200
  );
}

function roundMoney(
  value: number
): number {
  return (
    Math.round(
      value * 10000
    ) / 10000
  );
}

function toNumber(
  value: unknown
): number {
  const parsed =
    typeof value ===
    "number"
      ? value
      : Number(value);

  return Number.isFinite(
    parsed
  )
    ? parsed
    : 0;
}

/*
 * ================================================================
 * EXTRAER ORDEN DE FAZERCARDS
 * ================================================================
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

  if (data.result) {
    return data.result;
  }

  if (
    data.id ||
    data.order_id ||
    data.status ||
    data.state
  ) {
    return {
      id: data.id,
      order_id:
        data.order_id,
      status:
        data.status,
      state:
        data.state,
    };
  }

  return null;
}

function extractSupplierOrderId(
  data: SupplierResponse | null
): string | null {
  const order =
    extractSupplierOrder(
      data
    );

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
  const order =
    extractSupplierOrder(
      data
    );

  return (
    order?.status ||
    order?.state ||
    data?.status ||
    data?.state ||
    "pending"
  );
}

/*
 * ================================================================
 * FETCH CON TIMEOUT
 * ================================================================
 */

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout = REQUEST_TIMEOUT
) {
  const controller =
    new AbortController();

  const timer =
    setTimeout(() => {
      controller.abort();
    }, timeout);

  try {
    return await fetch(
      url,
      {
        ...options,
        signal:
          controller.signal,
        cache: "no-store",
      }
    );
  } finally {
    clearTimeout(timer);
  }
}

/*
 * ================================================================
 * AUTENTICACIÓN
 * ================================================================
 */

async function getAuthenticatedUser(
  request: NextRequest
) {
  const authorization =
    request.headers.get(
      "authorization"
    ) || "";

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
    !data.user
  ) {
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
 * ================================================================
 * REEMBOLSO
 * ================================================================
 */

async function refundOrder(
  orderId: string
) {
  try {
    const {
      error,
    } =
      await supabaseAdmin.rpc(
        "store_gaming_refund_balance",
        {
          p_order_id:
            orderId,
        }
      );

    if (error) {
      console.error(
        "BLOOD STRIKE REFUND ERROR:",
        error
      );

      return false;
    }

    return true;
  } catch (error) {
    console.error(
      "BLOOD STRIKE REFUND EXCEPTION:",
      error
    );

    return false;
  }
}

/*
 * ================================================================
 * GET
 * ================================================================
 */

export async function GET() {
  try {
    return jsonSuccess({
      category: {
        id:
          BLOOD_STRIKE.categoryId,

        name:
          BLOOD_STRIKE.name,

        note:
          BLOOD_STRIKE.note,
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
            id:
              offer.id,

            offer_id:
              offer.supplierOfferId,

            name:
              offer.name,

            displayName:
              offer.displayName,

            price:
              offer.price,

            price_usd:
              offer.price.toFixed(
                2
              ),

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
 * ================================================================
 * POST
 * ================================================================
 */

export async function POST(
  request: NextRequest
) {
  let reservedBalance =
    false;

  let insertedOrderId:
    | string
    | null = null;

  try {
    /*
     * --------------------------------------------------------------
     * 1. CONFIGURACIÓN
     * --------------------------------------------------------------
     */

    if (!FAZERCARDS_API_KEY) {
      return jsonError(
        "FAZERCARDS_API_KEY no está configurada.",
        500
      );
    }

    /*
     * --------------------------------------------------------------
     * 2. AUTENTICACIÓN
     * --------------------------------------------------------------
     */

    const {
      user,
      error:
        authError,
    } =
      await getAuthenticatedUser(
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
     * --------------------------------------------------------------
     * 3. BODY
     * --------------------------------------------------------------
     */

    let body: any;

    try {
      body =
        await request.json();
    } catch {
      return jsonError(
        "El cuerpo de la solicitud no es JSON válido.",
        400
      );
    }

    const offerId =
      normalizeString(
        body?.offerId
      );

    const playerId =
      normalizePlayerId(
        body?.playerId
      );

    const idempotencyKey =
      normalizeIdempotencyKey(
        body?.idempotencyKey
      );

    /*
     * --------------------------------------------------------------
     * 4. VALIDAR OFERTA
     * --------------------------------------------------------------
     */

    if (!offerId) {
      return jsonError(
        "Falta offerId."
      );
    }

    const selectedOffer =
      BLOOD_STRIKE.offers.find(
        (offer) =>
          offer.id ===
          offerId
      );

    if (!selectedOffer) {
      return jsonError(
        "La oferta seleccionada no existe.",
        400
      );
    }

    /*
     * --------------------------------------------------------------
     * 5. VALIDAR PLAYER ID
     * --------------------------------------------------------------
     */

    if (!playerId) {
      return jsonError(
        "Falta el Player ID."
      );
    }

    if (
      !isValidPlayerId(
        playerId
      )
    ) {
      return jsonError(
        "El Player ID debe tener entre 4 y 32 caracteres y solo puede contener letras, números, guion o guion bajo."
      );
    }

    /*
     * --------------------------------------------------------------
     * 6. VALIDAR IDEMPOTENCIA
     * --------------------------------------------------------------
     */

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
     * --------------------------------------------------------------
     * 7. PRECIO
     * --------------------------------------------------------------
     */

    const retailPrice =
      roundMoney(
        toNumber(
          selectedOffer.price
        )
      );

    const supplierPrice =
      roundMoney(
        toNumber(
          selectedOffer.supplierPrice
        )
      );

    if (
      retailPrice <= 0
    ) {
      return jsonError(
        "El precio de la oferta no es válido.",
        500
      );
    }

    /*
     * --------------------------------------------------------------
     * 8. COMPROBAR ORDEN DUPLICADA
     * --------------------------------------------------------------
     */

    const {
      data: existingOrder,
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
        .maybeSingle();

    if (
      existingOrderError
    ) {
      console.error(
        "CHECK EXISTING BLOOD STRIKE ORDER ERROR:",
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
          "La orden ya había sido creada.",

        order: {
          ...existingOrder,

          order_number:
            existingOrder.id,
        },

        supplierOrderId:
          existingOrder.supplier_order_id,

        duplicate:
          true,
      });
    }

    /*
     * --------------------------------------------------------------
     * 9. DATOS DEL USUARIO
     * --------------------------------------------------------------
     *
     * No consultamos profiles.
     *
     * El saldo será controlado mediante
     * store_gaming_reserve_balance.
     * --------------------------------------------------------------
     */

    const username =
      user.user_metadata
        ?.username ||
      null;

    const email =
      user.email ||
      null;

    /*
     * --------------------------------------------------------------
     * 10. CREAR ORDEN LOCAL
     * --------------------------------------------------------------
     */

    const supplierFields = {
      player_id:
        playerId,
    };

    const {
      data: insertedOrder,
      error:
        insertOrderError,
    } =
      await supabaseAdmin
        .from("topup_orders")
        .insert({
          user_id:
            user.id,

          username,

          email,

          game:
            BLOOD_STRIKE.name,

          category_id:
            CATEGORY_ID,

          offer_id:
            selectedOffer.id,

          offer_name:
            selectedOffer.name,

          player_id:
            playerId,

          retail_price:
            retailPrice,

          supplier_price:
            supplierPrice,

          currency:
            "USDT",

          status:
            "RESERVED",

          idempotency_key:
            idempotencyKey,

          supplier_fields:
            supplierFields,

          supplier_order_id:
            null,

          supplier_response:
            null,
        })
        .select("*")
        .single();

    if (
      insertOrderError ||
      !insertedOrder
    ) {
      console.error(
        "INSERT BLOOD STRIKE TOPUP ORDER ERROR:",
        insertOrderError
      );

      return jsonError(
        "No se pudo crear la orden.",
        500
      );
    }

    insertedOrderId =
      insertedOrder.id;

    /*
     * --------------------------------------------------------------
     * 11. RESERVAR SALDO
     * --------------------------------------------------------------
     */

    const {
      data: reserveResult,
      error:
        reserveError,
    } =
      await supabaseAdmin.rpc(
        "store_gaming_reserve_balance",
        {
          p_user_id:
            user.id,

          p_amount:
            retailPrice,
        }
      );

    if (reserveError) {
      console.error(
        "BLOOD STRIKE RESERVE BALANCE ERROR:",
        reserveError
      );

      await supabaseAdmin
        .from("topup_orders")
        .update({
          status:
            "REJECTED",

          failed_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          insertedOrderId
        );

      return jsonError(
        "No tienes saldo suficiente para realizar esta compra.",
        400
      );
    }

    let reserveOk =
      true;

    if (
      typeof reserveResult ===
      "boolean"
    ) {
      reserveOk =
        reserveResult;
    }

    if (
      reserveResult &&
      typeof reserveResult ===
        "object" &&
      "success" in
        (
          reserveResult as Record<
            string,
            unknown
          >
        )
    ) {
      reserveOk =
        Boolean(
          (
            reserveResult as Record<
              string,
              unknown
            >
          ).success
        );
    }

    if (!reserveOk) {
      await supabaseAdmin
        .from("topup_orders")
        .update({
          status:
            "REJECTED",

          failed_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          insertedOrderId
        );

      return jsonError(
        "No tienes saldo suficiente para realizar esta compra.",
        400
      );
    }

    reservedBalance =
      true;

    /*
     * --------------------------------------------------------------
     * 12. ENVIAR A FAZERCARDS
     * --------------------------------------------------------------
     */

    const supplierUrl =
      `${FAZERCARDS_BASE_URL}/topups/order`;

    const supplierBody = {
      category_id:
        CATEGORY_ID,

      offer_id:
        selectedOffer.supplierOfferId,

      fields: {
        player_id:
          playerId,
      },
    };

    console.log(
      "BLOOD STRIKE → FAZERCARDS:",
      {
        category_id:
          CATEGORY_ID,

        offer_id:
          selectedOffer.supplierOfferId,

        fields: {
          player_id:
            playerId,
        },
      }
    );

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
            method:
              "POST",

            headers: {
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
            },

            body:
              JSON.stringify(
                supplierBody
              ),
          }
        );

      const supplierText =
        await supplierResponse.text();

      console.log(
        "FAZERCARDS BLOOD STRIKE RESPONSE:",
        {
          status:
            supplierResponse.status,

          body:
            supplierText,
        }
      );

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
    } catch (error) {
      console.error(
        "FAZERCARDS BLOOD STRIKE REQUEST ERROR:",
        error
      );

      /*
       * No sabemos si FazerCards recibió
       * la solicitud.
       *
       * Por seguridad no reenviamos ni
       * liberamos inmediatamente el saldo.
       *
       * La orden queda pendiente para
       * evitar cobrar y posteriormente
       * ejecutar una segunda recarga.
       */

      await supabaseAdmin
        .from("topup_orders")
        .update({
          status:
            "SUPPLIER_PENDING",

          supplier_response: {
            error:
              "No se pudo confirmar la respuesta de FazerCards.",
          },
        })
        .eq(
          "id",
          insertedOrderId
        );

      return jsonSuccess(
        {
          message:
            "La orden quedó pendiente de confirmación del proveedor.",

          order: {
            ...insertedOrder,

            order_number:
              insertedOrder.id,

            status:
              "SUPPLIER_PENDING",
          },
        },
        202
      );
    }

    /*
     * --------------------------------------------------------------
     * 13. GUARDAR RESPUESTA DEL PROVEEDOR
     * --------------------------------------------------------------
     */

    await supabaseAdmin
      .from("topup_orders")
      .update({
        supplier_response:
          supplierData,
      })
      .eq(
        "id",
        insertedOrderId
      );

     /*
     * --------------------------------------------------------------
     * 14. ERROR DEL PROVEEDOR
     * --------------------------------------------------------------
     */

    if (
      !supplierResponse.ok ||
      supplierData?.ok ===
        false
    ) {
      console.error(
        "FAZERCARDS BLOOD STRIKE ERROR:",
        {
          status:
            supplierResponse.status,

          response:
            supplierData,
        }
      );

      if (
        reservedBalance &&
        insertedOrderId
      ) {
        await refundOrder(
          insertedOrderId
        );

        reservedBalance =
          false;
      }

      await supabaseAdmin
        .from("topup_orders")
        .update({
          status:
            "REJECTED",

          failed_at:
            new Date().toISOString(),

          supplier_response:
            supplierData,
        })
        .eq(
          "id",
          insertedOrderId
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
        }
      );
    }

    /*
     * --------------------------------------------------------------
     * 15. EXTRAER INFORMACIÓN DE FAZERCARDS
     * --------------------------------------------------------------
     */

    const supplierOrderId =
      extractSupplierOrderId(
        supplierData
      );

    const supplierStatus =
      extractSupplierStatus(
        supplierData
      );

    const normalizedStatus =
      supplierStatus
        .toLowerCase()
        .trim();

    /*
     * --------------------------------------------------------------
     * 16. ESTADOS
     * --------------------------------------------------------------
     */

    const completedStatuses = [
      "completed",
      "complete",
      "success",
      "successful",
      "delivered",
      "done",
    ];

    const failedStatuses = [
      "failed",
      "failure",
      "rejected",
      "cancelled",
      "canceled",
      "error",
    ];

    const isCompleted =
      completedStatuses.includes(
        normalizedStatus
      );

    const isFailed =
      failedStatuses.includes(
        normalizedStatus
      );

    /*
     * --------------------------------------------------------------
     * 17. ORDEN COMPLETADA
     * --------------------------------------------------------------
     */

    if (isCompleted) {
      if (supplierOrderId) {
        const {
          error:
            completeError,
        } =
          await supabaseAdmin.rpc(
            "store_gaming_complete_order",
            {
              p_supplier_order_id:
                supplierOrderId,
            }
          );

        if (completeError) {
          console.error(
            "BLOOD STRIKE COMPLETE ORDER ERROR:",
            completeError
          );
        }
      }

      reservedBalance =
        false;
    }

    /*
     * --------------------------------------------------------------
     * 18. ORDEN FALLIDA
     * --------------------------------------------------------------
     */

    if (
      isFailed &&
      reservedBalance &&
      insertedOrderId
    ) {
      await refundOrder(
        insertedOrderId
      );

      reservedBalance =
        false;
    }

    /*
     * --------------------------------------------------------------
     * 19. PENDIENTE
     * --------------------------------------------------------------
     */

    if (
      !isCompleted &&
      !isFailed
    ) {
      await supabaseAdmin
        .from("topup_orders")
        .update({
          supplier_order_id:
            supplierOrderId,

          supplier_response:
            supplierData,

          status:
            "SUPPLIER_PENDING",
        })
        .eq(
          "id",
          insertedOrderId
        );

      return jsonSuccess(
        {
          message:
            "La orden fue enviada a FazerCards y quedó pendiente de procesamiento.",

          order: {
            ...insertedOrder,

            order_number:
              insertedOrder.id,

            supplier_order_id:
              supplierOrderId,

            status:
              "SUPPLIER_PENDING",
          },

          supplier:
            supplierData,

          supplierOrderId:
            supplierOrderId,
        },
        202
      );
    }

    /*
     * --------------------------------------------------------------
     * 20. ESTADO FINAL
     * --------------------------------------------------------------
     */

    const localStatus =
      isCompleted
        ? "COMPLETED"
        : "REJECTED";

    /*
     * --------------------------------------------------------------
     * 21. ACTUALIZAR ORDEN
     * --------------------------------------------------------------
     */

    const {
      data: updatedOrder,
      error:
        updateOrderError,
    } =
      await supabaseAdmin
        .from("topup_orders")
        .update({
          supplier_order_id:
            supplierOrderId,

          supplier_response:
            supplierData,

          status:
            localStatus,

          completed_at:
            isCompleted
              ? new Date().toISOString()
              : null,

          failed_at:
            isFailed
              ? new Date().toISOString()
              : null,
        })
        .eq(
          "id",
          insertedOrderId
        )
        .select("*")
        .single();

    if (
      updateOrderError
    ) {
      console.error(
        "UPDATE BLOOD STRIKE ORDER ERROR:",
        updateOrderError
      );

      /*
       * FazerCards ya recibió
       * la orden.
       *
       * NO volver a enviarla.
       */

      return jsonSuccess({
        message:
          "La orden fue enviada a FazerCards, pero no se pudo actualizar completamente el registro local.",

        order: {
          ...insertedOrder,

          order_number:
            insertedOrder.id,

          supplier_order_id:
            supplierOrderId,

          status:
            localStatus,
        },

        supplier:
          supplierData,

        supplierOrderId:
          supplierOrderId,
      });
    }

    /*
     * --------------------------------------------------------------
     * 22. RESPUESTA FINAL
     * --------------------------------------------------------------
     */

    return jsonSuccess({
      message:
        isCompleted
          ? "Orden de Blood Strike completada correctamente."
          : "Orden de Blood Strike procesada.",

      order: {
        ...updatedOrder,

        order_number:
          updatedOrder.id,
      },

      supplier:
        supplierData,

      supplierOrderId:
        supplierOrderId,
    });
  } catch (error: any) {
    console.error(
      "BLOOD STRIKE TOPUP ERROR:",
      error
    );

    /*
     * Solo hacemos reembolso en un error
     * inesperado si todavía sabemos que
     * el saldo fue reservado.
     *
     * Si FazerCards ya pudo haber recibido
     * la orden, evitamos reenviarla.
     */

    if (
      reservedBalance &&
      insertedOrderId
    ) {
      await refundOrder(
        insertedOrderId
      );

      try {
        await supabaseAdmin
          .from("topup_orders")
          .update({
            status:
              "REJECTED",

            failed_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            insertedOrderId
          );
      } catch (updateError) {
        console.error(
          "BLOOD STRIKE FINAL ORDER UPDATE ERROR:",
          updateError
        );
      }
    }

    return jsonError(
      error?.message ||
        "Error interno al procesar la orden.",
      500
    );
  }
}
