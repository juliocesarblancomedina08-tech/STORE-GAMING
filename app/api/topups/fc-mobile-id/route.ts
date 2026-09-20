import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/*
 * ============================================================
 * CONFIGURACIÓN
 * ============================================================
 */

const FAZER_API_BASE =
  process.env.FAZERCARDS_API_URL ||
  "https://api.fzr.cards/api/v2";

const CATEGORY_ID = "eafc_mobile_id";

const FAZER_API_KEY =
  process.env.FAZERCARDS_API_KEY || "";

/*
 * ============================================================
 * OFERTAS REALES DE FAZERCARDS
 * ============================================================
 */

const OFFERS = [
  {
    id: "40_fc_points",
    name: "40 FC Points",
    retailPrice: 0.51,
    supplierPrice: 0.3526,
  },

  {
    id: "100_fc_points",
    name: "100 FC Points",
    retailPrice: 1.02,
    supplierPrice: 0.8665,
  },

  {
    id: "520_fc_points",
    name: "520 FC Points",
    retailPrice: 4.41,
    supplierPrice: 4.2617,
  },

  {
    id: "1070_fc_points",
    name: "1070 FC Puntos",
    retailPrice: 8.72,
    supplierPrice: 8.5738,
  },

  {
    id: "2200_fc_points",
    name: "2200 FC Points",
    retailPrice: 17.89,
    supplierPrice: 17.7421,
  },

  {
    id: "5750_fc_points",
    name: "5750 FC Points",
    retailPrice: 43.24,
    supplierPrice: 43.0908,
  },

  {
    id: "12000_fc_points",
    name: "12000 FC Points",
    retailPrice: 86.39,
    supplierPrice: 86.242,
  },

  {
    id: "39_silver",
    name: "39 Silver",
    retailPrice: 0.51,
    supplierPrice: 0.3526,
  },

  {
    id: "99_silver",
    name: "99 Silver",
    retailPrice: 1.02,
    supplierPrice: 0.8665,
  },

  {
    id: "499_silver",
    name: "499 Silver",
    retailPrice: 4.41,
    supplierPrice: 4.2617,
  },

  {
    id: "999_plata",
    name: "999 Plata",
    retailPrice: 8.72,
    supplierPrice: 8.5738,
  },

  {
    id: "1999_plata",
    name: "1999 Plata",
    retailPrice: 17.89,
    supplierPrice: 17.7421,
  },

  {
    id: "4999_plata",
    name: "4999 Plata",
    retailPrice: 43.24,
    supplierPrice: 43.0908,
  },

  {
    id: "9999_plata",
    name: "9999 Plata",
    retailPrice: 86.39,
    supplierPrice: 86.242,
  },
] as const;

/*
 * ============================================================
 * TIPOS
 * ============================================================
 */

type SupplierResponse = {
  [key: string]: unknown;
};

/*
 * ============================================================
 * RESPUESTAS DE ERROR
 * ============================================================
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

/*
 * ============================================================
 * POST
 * ============================================================
 */

export async function POST(
  request: NextRequest
) {
  let internalOrderId: string | null = null;
  let reserved = false;

  try {
    /*
     * ========================================================
     * 1. VERIFICAR API KEY
     * ========================================================
     */

    if (!FAZER_API_KEY) {
      console.error(
        "FAZERCARDS_API_KEY no está configurada."
      );

      return jsonError(
        "El servicio de recarga no está configurado.",
        500
      );
    }

    /*
     * ========================================================
     * 2. AUTENTICAR USUARIO
     * ========================================================
     */

    const authHeader =
      request.headers.get("authorization");

    if (!authHeader) {
      return jsonError(
        "No autorizado.",
        401
      );
    }

    const token =
      authHeader.startsWith("Bearer ")
        ? authHeader.slice(7)
        : authHeader;

    if (!token) {
      return jsonError(
        "Token de autenticación inválido.",
        401
      );
    }

    const {
      data: userData,
      error: userError,
    } =
      await supabaseAdmin.auth.getUser(
        token
      );

    if (
      userError ||
      !userData?.user
    ) {
      console.error(
        "ERROR AUTENTICANDO USUARIO:",
        userError
      );

      return jsonError(
        "Sesión inválida o expirada.",
        401
      );
    }

    const userId =
      userData.user.id;

    /*
     * ========================================================
     * 3. LEER BODY
     * ========================================================
     */

    let body: {
      offerId?: string;
      offerName?: string;
      playerId?: string;
      retailPrice?: number;
      quantity?: number;
      idempotencyKey?: string;
    };

    try {
      body = await request.json();
    } catch {
      return jsonError(
        "El cuerpo de la solicitud no es válido."
      );
    }

    const {
      offerId,
      offerName,
      playerId,
      retailPrice,
      quantity = 1,
      idempotencyKey,
    } = body;

    /*
     * ========================================================
     * 4. VALIDAR DATOS
     * ========================================================
     */

    if (!offerId) {
      return jsonError(
        "Falta la oferta."
      );
    }

    if (!playerId) {
      return jsonError(
        "Falta el ID del jugador."
      );
    }

    if (
      typeof quantity !== "number" ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 10
    ) {
      return jsonError(
        "La cantidad no es válida."
      );
    }

    const cleanPlayerId =
      String(playerId)
        .trim()
        .replace(/[^0-9]/g, "");

    if (!cleanPlayerId) {
      return jsonError(
        "El ID del jugador no es válido."
      );
    }

    if (cleanPlayerId.length < 4) {
      return jsonError(
        "El ID del jugador parece demasiado corto."
      );
    }

    /*
     * ========================================================
     * 5. BUSCAR OFERTA REAL
     * ========================================================
     */

    const offer =
      OFFERS.find(
        (item) =>
          item.id === offerId
      );

    if (!offer) {
      return jsonError(
        "La oferta seleccionada no existe."
      );
    }

    /*
     * ========================================================
     * 6. VALIDAR PRECIO EN SERVIDOR
     * ========================================================
     */

    if (
      retailPrice !== undefined
    ) {
      const clientPrice =
        Number(retailPrice);

      if (
        !Number.isFinite(clientPrice) ||
        Math.abs(
          clientPrice -
            offer.retailPrice
        ) > 0.001
      ) {
        console.error(
          "PRECIO INVÁLIDO:",
          {
            clientPrice,
            serverPrice:
              offer.retailPrice,
          }
        );

        return jsonError(
          "El precio de la oferta no coincide.",
          400
        );
      }
    }

    /*
     * ========================================================
     * 7. VALIDAR NOMBRE SI VIENE DEL CLIENTE
     * ========================================================
     */

    if (
      offerName &&
      String(offerName).trim() !==
        offer.name
    ) {
      console.error(
        "NOMBRE DE OFERTA INVÁLIDO:",
        {
          received:
            offerName,
          expected:
            offer.name,
        }
      );

      return jsonError(
        "La oferta seleccionada no coincide.",
        400
      );
    }

    /*
     * ========================================================
     * 8. CALCULAR TOTAL
     * ========================================================
     */

    const totalRetailPrice =
      Number(
        (
          offer.retailPrice *
          quantity
        ).toFixed(2)
      );

    const totalSupplierPrice =
      Number(
        (
          offer.supplierPrice *
          quantity
        ).toFixed(4)
      );

    /*
     * ========================================================
     * 9. IDEMPOTENCIA
     * ========================================================
     */

    const finalIdempotencyKey =
      idempotencyKey ||
      `fc-mobile-id-${userId}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 10)}`;

    const {
      data: existingOrderRaw,
      error:
        existingOrderError,
    } =
      await supabaseAdmin
        .from("topup_orders")
        .select(
          [
            "id",
            "status",
            "supplier_order_id",
            "offer_id",
            "offer_name",
            "player_id",
            "retail_price",
            "supplier_price",
          ].join(",")
        )
        .eq(
          "idempotency_key",
          finalIdempotencyKey
        )
        .maybeSingle();

    const existingOrderData =
      existingOrderRaw as
        | {
            id: string;
            status: string | null;
            supplier_order_id:
              | string
              | null;
            offer_id:
              | string
              | null;
            offer_name:
              | string
              | null;
            player_id:
              | string
              | null;
            retail_price:
              | number
              | null;
            supplier_price:
              | number
              | null;
          }
        | null;

    if (existingOrderError) {
      console.error(
        "ERROR BUSCANDO ORDEN EXISTENTE:",
        existingOrderError
      );
    }

    if (existingOrderData) {
      return NextResponse.json({
        ok: true,
        alreadyProcessed: true,
        orderNumber:
          existingOrderData.id,
        supplierOrderId:
          existingOrderData.supplier_order_id,
        status:
          existingOrderData.status,
        offerId:
          existingOrderData.offer_id,
        offerName:
          existingOrderData.offer_name,
        playerId:
          existingOrderData.player_id,
        retailPrice:
          existingOrderData.retail_price,
        supplierPrice:
          existingOrderData.supplier_price,
      });
    }

    /*
     * ========================================================
     * 10. CREAR ORDEN INTERNA
     * ========================================================
     */

    const {
      data: createdOrder,
      error:
        createOrderError,
    } =
      await supabaseAdmin
        .from("topup_orders")
        .insert({
          user_id: userId,

          category_id:
            CATEGORY_ID,

          offer_id:
            offer.id,

          offer_name:
            offer.name,

          player_id:
            cleanPlayerId,

          retail_price:
            totalRetailPrice,

          supplier_price:
            totalSupplierPrice,

          quantity,

          idempotency_key:
            finalIdempotencyKey,

          status:
            "RESERVED",

          supplier_response:
            {
              category_id:
                CATEGORY_ID,

              offer_id:
                offer.id,

              player_id:
                cleanPlayerId,

              quantity,
            },

          created_at:
            new Date().toISOString(),

          updated_at:
            new Date().toISOString(),
        })
        .select("id")
        .single();

    if (
      createOrderError ||
      !createdOrder
    ) {
      console.error(
        "ERROR CREANDO ORDEN:",
        createOrderError
      );

      return jsonError(
        "No se pudo crear la orden.",
        500
      );
    }

    internalOrderId =
      createdOrder.id;

    /*
     * ========================================================
     * 11. RESERVAR SALDO
     * ========================================================
     */

    const {
      data: reserveData,
      error:
        reserveError,
    } =
      await supabaseAdmin.rpc(
        "reserve_topup_balance",
        {
          p_user_id: userId,
          p_order_id:
            internalOrderId,
          p_amount:
            totalRetailPrice,
        }
      );

    if (
      reserveError ||
      !reserveData
    ) {
      console.error(
        "ERROR RESERVANDO SALDO:",
        reserveError
      );

      await supabaseAdmin
        .from("topup_orders")
        .update({
          status: "FAILED",

          supplier_response: {
            error:
              "INSUFFICIENT_BALANCE_OR_RESERVATION_FAILED",
            details:
              reserveError?.message ||
              null,
          },

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          internalOrderId
        );

      return jsonError(
        "No tienes saldo suficiente para realizar esta compra.",
        400
      );
    }

    reserved = true;

    /*
     * ========================================================
     * 12. PREPARAR SOLICITUD A FAZERCARDS
     * ========================================================
     *
     * IMPORTANTE:
     *
     * FazerCards recibe:
     *
     * category_id
     * offer_id
     * fields.player_id
     *
     * La oferta ya fue validada en nuestro servidor.
     */

    const supplierIdempotencyKey =
      `${finalIdempotencyKey}-1`;

    const supplierBody = {
      category_id:
        CATEGORY_ID,

      offer_id:
        offer.id,

      fields: {
        player_id:
          cleanPlayerId,
      },
    };

    /*
     * ========================================================
     * 13. ENVIAR A FAZERCARDS
     * ========================================================
     */

    let supplierResponse:
      Response;

    try {
      supplierResponse =
        await fetch(
          `${FAZER_API_BASE}/topups/order`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Accept:
                "application/json",

              "X-API-Key":
                FAZER_API_KEY,

              "Idempotency-Key":
                supplierIdempotencyKey,

              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36",

              Referer:
                "https://reseller.fazercards.com/",

              Origin:
                "https://reseller.fazercards.com",
            },

            body: JSON.stringify(
              supplierBody
            ),

            signal:
              AbortSignal.timeout(
                30000
              ),
          }
        );
    } catch (supplierNetworkError) {
      /*
       * No sabemos si FazerCards recibió
       * la solicitud o no.
       *
       * Por seguridad NO devolvemos
       * automáticamente el saldo.
       */

      console.error(
        "ERROR DE RED FAZERCARDS:",
        supplierNetworkError
      );

      await supabaseAdmin
        .from("topup_orders")
        .update({
          status:
            "SUPPLIER_PENDING",

          supplier_response: {
            error:
              "SUPPLIER_NETWORK_ERROR",

            message:
              supplierNetworkError instanceof
              Error
                ? supplierNetworkError.message
                : String(
                    supplierNetworkError
                  ),

            request:
              supplierBody,
          },

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          internalOrderId
        );

      reserved = false;

      return NextResponse.json(
        {
          ok: true,

          orderNumber:
            internalOrderId,

          status:
            "SUPPLIER_PENDING",

          message:
            "La orden fue recibida y está pendiente de confirmación del proveedor.",
        },
        {
          status: 202,
        }
      );
    }

    /*
     * ========================================================
     * 14. LEER RESPUESTA DEL PROVEEDOR
     * ========================================================
     */

    const supplierText =
      await supplierResponse.text();

    let supplierData:
      SupplierResponse = {};

    try {
      supplierData =
        supplierText
          ? JSON.parse(
              supplierText
            )
          : {};
    } catch {
      supplierData = {
        raw:
          supplierText,
      };
    }

    console.log(
      "RESPUESTA FAZERCARDS FC MOBILE:",
      {
        status:
          supplierResponse.status,

        ok:
          supplierResponse.ok,

        data:
          supplierData,
      }
    );

    /*
     * ========================================================
     * 15. DETECTAR RECHAZO DEL PROVEEDOR
     * ========================================================
     */

    const supplierDataRecord =
      supplierData as Record<
        string,
        unknown
      >;

    const supplierStatusRaw =
      supplierDataRecord.status;

    const supplierStatus =
      typeof supplierStatusRaw ===
      "string"
        ? supplierStatusRaw.toUpperCase()
        : "";

    const supplierOrderIdRaw =
      supplierDataRecord.order_id ??
      supplierDataRecord.id ??
      supplierDataRecord.orderId;

    const supplierOrderId =
      supplierOrderIdRaw !==
        undefined &&
      supplierOrderIdRaw !==
        null
        ? String(
            supplierOrderIdRaw
          )
        : null;

    const supplierRejected =
      !supplierResponse.ok ||
      [
        "FAILED",
        "FAILURE",
        "REJECTED",
        "CANCELLED",
        "CANCELED",
        "ERROR",
      ].includes(
        supplierStatus
      );

    if (supplierRejected) {
      /*
       * ======================================================
       * REEMBOLSAR RESERVA
       * ======================================================
       */

      const {
        error:
          refundError,
      } =
        await supabaseAdmin.rpc(
          "refund_topup_balance",
          {
            p_order_id:
              internalOrderId,
          }
        );

      if (refundError) {
        console.error(
          "ERROR DEVOLVIENDO SALDO:",
          refundError
        );

        await supabaseAdmin
          .from("topup_orders")
          .update({
            status:
              "REFUND_PENDING",

            supplier_response:
              supplierData,

            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            internalOrderId
          );

        reserved = false;

        return jsonError(
          "El proveedor rechazó la recarga y el reembolso quedó pendiente.",
          502
        );
      }

      await supabaseAdmin
        .from("topup_orders")
        .update({
          status:
            "FAILED",

          supplier_order_id:
            supplierOrderId,

          supplier_response:
            supplierData,

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          internalOrderId
        );

      reserved = false;

      return jsonError(
        "El proveedor rechazó la recarga. El saldo reservado fue devuelto.",
        502,
        {
          orderNumber:
            internalOrderId,

          supplierOrderId,
        }
      );
    }

    /*
     * ========================================================
     * 16. DETERMINAR ESTADO INTERNO
     * ========================================================
     */

    let internalStatus =
      "SUPPLIER_PENDING";

    const completedStatuses = [
      "COMPLETED",
      "SUCCESS",
      "SUCCEEDED",
      "DELIVERED",
      "DONE",
    ];

    if (
      supplierResponse.ok &&
      completedStatuses.includes(
        supplierStatus
      )
    ) {
      internalStatus =
        "COMPLETED";
    }

    /*
     * ========================================================
     * 17. SI NO HAY ID DEL PROVEEDOR
     * ========================================================
     */

    if (!supplierOrderId) {
      /*
       * No marcamos como fallida porque
       * FazerCards pudo haber aceptado
       * la solicitud sin devolver todavía
       * el número final.
       */

      await supabaseAdmin
        .from("topup_orders")
        .update({
          status:
            "SUPPLIER_PENDING",

          supplier_response:
            supplierData,

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          internalOrderId
        );

      reserved = false;

      return NextResponse.json(
        {
          ok: true,

          orderNumber:
            internalOrderId,

          status:
            "SUPPLIER_PENDING",

          offerId:
            offer.id,

          offerName:
            offer.name,

          playerId:
            cleanPlayerId,

          retailPrice:
            totalRetailPrice,

          supplierPrice:
            totalSupplierPrice,

          supplierResponse:
            supplierData,
        },
        {
          status: 202,
        }
      );
    }

    /*
     * ========================================================
     * 18. ACTUALIZAR ORDEN
     * ========================================================
     */

    const {
      error:
        updateError,
    } =
      await supabaseAdmin
        .from("topup_orders")
        .update({
          supplier_order_id:
            supplierOrderId,

          status:
            internalStatus,

          supplier_response:
            supplierData,

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          internalOrderId
        );

    if (updateError) {
      console.error(
        "ERROR ACTUALIZANDO ORDEN:",
        updateError
      );

      /*
       * La compra pudo haberse realizado
       * correctamente en FazerCards.
       *
       * Por eso NO hacemos refund automático.
       */

      reserved = false;

      return jsonError(
        "La recarga fue enviada pero no se pudo actualizar la orden.",
        500,
        {
          orderNumber:
            internalOrderId,

          supplierOrderId,
        }
      );
    }

    /*
     * ========================================================
     * 19. RESERVA YA PROCESADA
     * ========================================================
     */

    reserved = false;

    /*
     * ========================================================
     * 20. RESPUESTA FINAL
     * ========================================================
     */

    return NextResponse.json({
      ok: true,

      orderNumber:
        internalOrderId,

      supplierOrderId,

      status:
        internalStatus,

      supplierStatus,

      offerId:
        offer.id,

      offerName:
        offer.name,

      playerId:
        cleanPlayerId,

      quantity,

      retailPrice:
        totalRetailPrice,

      supplierPrice:
        totalSupplierPrice,

      supplierResponse:
        supplierData,
    });

  } catch (error) {
    /*
     * ========================================================
     * ERROR GENERAL
     * ========================================================
     */

    console.error(
      "ERROR GENERAL FC MOBILE (ID):",
      error
    );

    if (internalOrderId) {
      await supabaseAdmin
        .from("topup_orders")
        .update({
          status:
            reserved
              ? "SUPPLIER_PENDING"
              : "FAILED",

          supplier_response: {
            error:
              "INTERNAL_SERVER_ERROR",

            message:
              error instanceof Error
                ? error.message
                : String(error),
          },

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          internalOrderId
        );
    }

    return jsonError(
      "Ocurrió un error procesando la orden.",
      500
    );
  }
}
