import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
 * CLIENTE SUPABASE
 * ============================================================
 */

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/*
 * ============================================================
 * OFERTAS REALES DE EAFC MOBILE (ID)
 *
 * Precio de venta = precio proveedor + $0.15
 * ============================================================
 */

const OFFERS = [
  {
    id: "fc-40",
    supplierOfferId: "40_fc_points",
    name: "40 FC Points",
    price: 0.51,
    supplierPrice: 0.3526,
  },
  {
    id: "fc-100",
    supplierOfferId: "100_fc_points",
    name: "100 FC Points",
    price: 1.02,
    supplierPrice: 0.8665,
  },
  {
    id: "fc-520",
    supplierOfferId: "520_fc_points",
    name: "520 FC Points",
    price: 4.41,
    supplierPrice: 4.2617,
  },
  {
    id: "fc-1070",
    supplierOfferId: "1070_fc_points",
    name: "1070 FC Puntos",
    price: 8.72,
    supplierPrice: 8.5738,
  },
  {
    id: "fc-2200",
    supplierOfferId: "2200_fc_points",
    name: "2200 FC Points",
    price: 17.89,
    supplierPrice: 17.7421,
  },
  {
    id: "fc-5750",
    supplierOfferId: "5750_fc_points",
    name: "5750 FC Points",
    price: 43.24,
    supplierPrice: 43.0908,
  },
  {
    id: "fc-12000",
    supplierOfferId: "12000_fc_points",
    name: "12000 FC Points",
    price: 86.39,
    supplierPrice: 86.242,
  },
  {
    id: "fc-39-silver",
    supplierOfferId: "39_silver",
    name: "39 Silver",
    price: 0.51,
    supplierPrice: 0.3526,
  },
  {
    id: "fc-99-silver",
    supplierOfferId: "99_silver",
    name: "99 Silver",
    price: 1.02,
    supplierPrice: 0.8665,
  },
  {
    id: "fc-499-silver",
    supplierOfferId: "499_silver",
    name: "499 Silver",
    price: 4.41,
    supplierPrice: 4.2617,
  },
  {
    id: "fc-999-plata",
    supplierOfferId: "999_plata",
    name: "999 Plata",
    price: 8.72,
    supplierPrice: 8.5738,
  },
  {
    id: "fc-1999-plata",
    supplierOfferId: "1999_plata",
    name: "1999 Plata",
    price: 17.89,
    supplierPrice: 17.7421,
  },
  {
    id: "fc-4999-plata",
    supplierOfferId: "4999_plata",
    name: "4999 Plata",
    price: 43.24,
    supplierPrice: 43.0908,
  },
  {
    id: "fc-9999-plata",
    supplierOfferId: "9999_plata",
    name: "9999 Plata",
    price: 86.39,
    supplierPrice: 86.242,
  },
] as const;

/*
 * ============================================================
 * TIPOS AUXILIARES
 * ============================================================
 */

type Offer = (typeof OFFERS)[number];

type ExistingOrder = {
  id: string;
  order_number?: string | null;
  supplier_order_id?: string | null;
  status?: string | null;
};

/*
 * ============================================================
 * HELPERS
 * ============================================================
 */

function jsonError(
  message: string,
  status = 400
) {
  return NextResponse.json(
    {
      ok: false,
      error: message,
    },
    { status }
  );
}

function getOffer(
  offerId: string
): Offer | null {
  return (
    OFFERS.find(
      (offer) => offer.id === offerId
    ) || null
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
  let reservationMade = false;
  let createdOrderId = "";

  try {
    /*
     * ==========================================================
     * 1. LEER BODY
     * ==========================================================
     */

    const body = await request.json();

    const {
      offerId,
      offerName,
      playerId,
      retailPrice,
      quantity = 1,
      idempotencyKey,
    } = body || {};

    /*
     * ==========================================================
     * 2. VALIDAR DATOS BÁSICOS
     * ==========================================================
     */

    if (
      typeof offerId !== "string" ||
      !offerId.trim()
    ) {
      return jsonError(
        "Debe seleccionar una oferta."
      );
    }

    if (
      typeof playerId !== "string" ||
      !playerId.trim()
    ) {
      return jsonError(
        "Debe introducir el ID del jugador."
      );
    }

    if (
      typeof idempotencyKey !== "string" ||
      !idempotencyKey.trim()
    ) {
      return jsonError(
        "No se recibió la clave de seguridad de la orden."
      );
    }

    /*
     * ==========================================================
     * 3. VALIDAR PLAYER ID
     * ==========================================================
     */

    const cleanPlayerId =
      playerId.trim();

    if (
      !/^[0-9]+$/.test(
        cleanPlayerId
      )
    ) {
      return jsonError(
        "El ID del jugador debe contener solamente números."
      );
    }

    if (
      cleanPlayerId.length < 4 ||
      cleanPlayerId.length > 20
    ) {
      return jsonError(
        "El ID del jugador no tiene un formato válido."
      );
    }

    /*
     * ==========================================================
     * 4. VALIDAR CANTIDAD
     *
     * Por seguridad, actualmente solo permitimos 1.
     * Cada compra genera una orden independiente.
     * ==========================================================
     */

    const cleanQuantity =
      Number(quantity);

    if (
      !Number.isInteger(
        cleanQuantity
      ) ||
      cleanQuantity !== 1
    ) {
      return jsonError(
        "La cantidad solicitada no es válida."
      );
    }

    /*
     * ==========================================================
     * 5. COMPROBAR OFERTA REAL
     * ==========================================================
     */

    const offer =
      getOffer(offerId);

    if (!offer) {
      return jsonError(
        "La oferta seleccionada no existe."
      );
    }

    /*
     * ==========================================================
     * 6. VALIDAR PRECIO EN SERVIDOR
     *
     * Nunca confiamos en el precio enviado por el navegador.
     * ==========================================================
     */

    const serverPrice =
      Number(
        offer.price.toFixed(2)
      );

    if (
      retailPrice !== undefined &&
      retailPrice !== null
    ) {
      const clientPrice =
        Number(retailPrice);

      if (
        !Number.isFinite(
          clientPrice
        ) ||
        Math.abs(
          clientPrice -
            serverPrice
        ) > 0.001
      ) {
        return jsonError(
          "El precio de la oferta no coincide con el precio actual."
        );
      }
    }

    /*
     * ==========================================================
     * 7. COMPROBAR SESIÓN
     * ==========================================================
     */

    const authorization =
      request.headers.get(
        "authorization"
      );

    if (
      !authorization ||
      !authorization.startsWith(
        "Bearer "
      )
    ) {
      return jsonError(
        "No hay una sesión válida.",
        401
      );
    }

    const accessToken =
      authorization.substring(
        7
      ).trim();

    if (!accessToken) {
      return jsonError(
        "Token de sesión inválido.",
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
      !userData.user
    ) {
      return jsonError(
        "Su sesión ha expirado. Inicie sesión nuevamente.",
        401
      );
    }

    const userId =
      userData.user.id;

    /*
     * ==========================================================
     * 8. IDEMPOTENCIA
     *
     * Evita crear dos órdenes si el cliente repite la misma
     * solicitud.
     * ==========================================================
     */

    const {
      data: existingOrderRaw,
      error: existingOrderError,
    } =
      await supabaseAdmin
        .from("topup_orders")
        .select(
          "id, order_number, supplier_order_id, status"
        )
        .eq(
          "idempotency_key",
          idempotencyKey
        )
        .eq(
          "user_id",
          userId
        )
        .maybeSingle();

    if (
      existingOrderError &&
      existingOrderError.code !==
        "PGRST116"
    ) {
      console.error(
        "ERROR BUSCANDO ORDEN EXISTENTE:",
        existingOrderError
      );
    }

    const existingOrder =
      existingOrderRaw as
        | ExistingOrder
        | null;

    if (existingOrder) {
      return NextResponse.json({
        ok: true,
        duplicate: true,
        order: existingOrder,
        orderNumber:
          existingOrder.order_number ||
          "",
        supplierOrderId:
          existingOrder.supplier_order_id ||
          "",
        status:
          existingOrder.status ||
          "PENDING",
      });
    }

    /*
     * ==========================================================
     * 9. COMPROBAR BALANCE DEL USUARIO
     * ==========================================================
     */

    const {
      data: profile,
      error: profileError,
    } =
      await supabaseAdmin
        .from("profiles")
        .select(
          "id, balance"
        )
        .eq(
          "id",
          userId
        )
        .maybeSingle();

    if (
      profileError
    ) {
      console.error(
        "ERROR OBTENIENDO PERFIL:",
        profileError
      );

      return jsonError(
        "No se pudo comprobar su balance.",
        500
      );
    }

    if (!profile) {
      return jsonError(
        "No se encontró el perfil del usuario.",
        404
      );
    }

    const currentBalance =
      Number(
        profile.balance || 0
      );

    if (
      currentBalance <
      serverPrice
    ) {
      return jsonError(
        `Balance insuficiente. Necesita ${serverPrice.toFixed(
          2
        )}$ para realizar esta compra.`
      );
    }

    /*
     * ==========================================================
     * 10. CREAR ORDEN LOCAL
     * ==========================================================
     */

    const {
      data: createdOrder,
      error: createOrderError,
    } =
      await supabaseAdmin
        .from("topup_orders")
        .insert({
          user_id: userId,

          category_id:
            CATEGORY_ID,

          offer_id:
            offer.supplierOfferId,

          offer_name:
            offerName ||
            offer.name,

          player_id:
            cleanPlayerId,

          quantity:
            cleanQuantity,

          retail_price:
            serverPrice,

          supplier_price:
            offer.supplierPrice,

          currency:
            "USD",

          status:
            "RESERVED",

          idempotency_key:
            idempotencyKey,
        })
        .select(
          "id, order_number, status"
        )
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

    createdOrderId =
      createdOrder.id;

    /*
     * ==========================================================
     * 11. RESERVAR BALANCE
     * ==========================================================
     */

    const {
      data: reserveResult,
      error: reserveError,
    } =
      await supabaseAdmin.rpc(
        "reserve_topup_balance",
        {
          p_user_id:
            userId,

          p_order_id:
            createdOrderId,

          p_amount:
            serverPrice,
        }
      );

    if (
      reserveError
    ) {
      console.error(
        "ERROR RESERVANDO BALANCE:",
        reserveError
      );

      await supabaseAdmin
        .from("topup_orders")
        .update({
          status:
            "FAILED",
          error_message:
            "No se pudo reservar el balance.",
        })
        .eq(
          "id",
          createdOrderId
        );

      return jsonError(
        "No se pudo reservar el balance de la compra.",
        500
      );
    }

    /*
     * Algunos proyectos devuelven un objeto con success.
     * Si existe y es false, no continuamos.
     */

    if (
      reserveResult &&
      typeof reserveResult ===
        "object" &&
      "success" in
        reserveResult &&
      (reserveResult as {
        success?: boolean;
      }).success === false
    ) {
      await supabaseAdmin
        .from("topup_orders")
        .update({
          status:
            "FAILED",
          error_message:
            "Balance insuficiente.",
        })
        .eq(
          "id",
          createdOrderId
        );

      return jsonError(
        "No hay balance suficiente para realizar esta compra."
      );
    }

    reservationMade =
      true;

    /*
     * ==========================================================
     * 12. CAMBIAR A SUPPLIER_PENDING
     * ==========================================================
     */

    await supabaseAdmin
      .from("topup_orders")
      .update({
        status:
          "SUPPLIER_PENDING",
      })
      .eq(
        "id",
        createdOrderId
      );

    /*
     * ==========================================================
     * 13. COMPROBAR API KEY
     * ==========================================================
     */

    if (!FAZER_API_KEY) {
      console.error(
        "FAZERCARDS_API_KEY NO CONFIGURADA."
      );

      /*
       * El balance queda reservado porque todavía no sabemos
       * si el proveedor recibió la orden.
       */

      return NextResponse.json(
        {
          ok: true,
          order: {
            ...createdOrder,
            status:
              "SUPPLIER_PENDING",
          },
          orderNumber:
            createdOrder.order_number ||
            "",
          supplierOrderId:
            "",
          status:
            "SUPPLIER_PENDING",
          warning:
            "La orden quedó pendiente de procesamiento.",
        },
        { status: 202 }
      );
    }

    /*
     * ==========================================================
     * 14. ENVIAR ORDEN A FAZERCARDS
     * ==========================================================
     */

    const supplierResponse =
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
              idempotencyKey,

            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36",

            Referer:
              "https://reseller.fazercards.com/",

            Origin:
              "https://reseller.fazercards.com",
          },

          body: JSON.stringify({
            category_id:
              CATEGORY_ID,

            offer_id:
              offer.supplierOfferId,

            fields: {
              player_id:
                cleanPlayerId,
            },
          }),

          cache:
            "no-store",
        }
      );

    /*
     * ==========================================================
     * 15. LEER RESPUESTA DEL PROVEEDOR
     * ==========================================================
     */

    const responseText =
      await supplierResponse.text();

    let supplierData: any =
      null;

    try {
      supplierData =
        responseText
          ? JSON.parse(
              responseText
            )
          : null;
    } catch {
      supplierData = null;
    }

    /*
     * ==========================================================
     * 16. ERROR DEL PROVEEDOR
     *
     * Si el servidor respondió 5xx, timeout o una respuesta
     * incierta, mantenemos SUPPLIER_PENDING.
     * ==========================================================
     */

    if (
      supplierResponse.status >=
      500
    ) {
      console.error(
        "FAZERCARDS 5XX:",
        supplierResponse.status,
        responseText
      );

      return NextResponse.json(
        {
          ok: true,
          order: {
            ...createdOrder,
            status:
              "SUPPLIER_PENDING",
          },
          orderNumber:
            createdOrder.order_number ||
            "",
          supplierOrderId:
            "",
          status:
            "SUPPLIER_PENDING",
          warning:
            "El proveedor no confirmó la orden. La compra quedó pendiente para evitar un cobro duplicado.",
        },
        { status: 202 }
      );
    }

    /*
     * ==========================================================
     * 17. DETECTAR RECHAZO
     * ==========================================================
     */

    const supplierRejected =
      !supplierResponse.ok ||
      supplierData?.success ===
        false ||
      supplierData?.ok === false ||
      supplierData?.status ===
        "FAILED" ||
      supplierData?.status ===
        "REJECTED" ||
      supplierData?.status ===
        "CANCELLED" ||
      supplierData?.error;

    if (
      supplierRejected
    ) {
      console.error(
        "FAZERCARDS RECHAZÓ LA ORDEN:",
        {
          status:
            supplierResponse.status,
          response:
            supplierData ||
            responseText,
        }
      );

      /*
       * ========================================================
       * 18. REEMBOLSAR RESERVA
       * ========================================================
       */

      if (
        reservationMade
      ) {
        const {
          error: refundError,
        } =
          await supabaseAdmin.rpc(
            "refund_topup_balance",
            {
              p_order_id:
                createdOrderId,
            }
          );

        if (
          refundError
        ) {
          console.error(
            "ERROR REEMBOLSANDO BALANCE:",
            refundError
          );

          await supabaseAdmin
            .from("topup_orders")
            .update({
              status:
                "REFUND_PENDING",

              error_message:
                "Proveedor rechazó la orden y el reembolso quedó pendiente.",
            })
            .eq(
              "id",
              createdOrderId
            );

          return jsonError(
            "El proveedor rechazó la compra y el reembolso quedó pendiente de procesamiento.",
            502
          );
        }
      }

      await supabaseAdmin
        .from("topup_orders")
        .update({
          status:
            "FAILED",

          error_message:
            supplierData?.error ||
            supplierData?.message ||
            "El proveedor rechazó la orden.",
        })
        .eq(
          "id",
          createdOrderId
        );

      return jsonError(
        supplierData?.error ||
          supplierData?.message ||
          "El proveedor rechazó la orden.",
        502
      );
    }

    /*
     * ==========================================================
     * 19. OBTENER ID DE ORDEN DEL PROVEEDOR
     * ==========================================================
     */

    const supplierOrderId =
      supplierData?.order_id ||
      supplierData?.orderId ||
      supplierData?.id ||
      supplierData?.data?.order_id ||
      supplierData?.data?.orderId ||
      supplierData?.data?.id ||
      "";

    const supplierStatus =
      supplierData?.status ||
      supplierData?.data?.status ||
      "PENDING";

    /*
     * ==========================================================
     * 20. SI NO HAY ID DEL PROVEEDOR
     *
     * No asumimos que la orden falló.
     * Puede haber sido creada y simplemente no devolver el ID
     * en el formato esperado.
     * ==========================================================
     */

    if (
      !supplierOrderId
    ) {
      console.warn(
        "FAZERCARDS RESPONDIÓ SIN ID DE ORDEN:",
        supplierData
      );

      await supabaseAdmin
        .from("topup_orders")
        .update({
          status:
            "SUPPLIER_PENDING",

          supplier_response:
            supplierData,
        })
        .eq(
          "id",
          createdOrderId
        );

      return NextResponse.json(
        {
          ok: true,

          order: {
            ...createdOrder,

            status:
              "SUPPLIER_PENDING",
          },

          orderNumber:
            createdOrder.order_number ||
            "",

          supplierOrderId:
            "",

          status:
            "SUPPLIER_PENDING",

          warning:
            "La orden fue enviada al proveedor y quedó pendiente de confirmación.",
        },
        { status: 202 }
      );
    }

    /*
     * ==========================================================
     * 21. DETERMINAR ESTADO FINAL
     * ==========================================================
     */

    const normalizedStatus =
      String(
        supplierStatus
      ).toUpperCase();

    let finalStatus =
      "SUPPLIER_PENDING";

    if (
      normalizedStatus ===
        "COMPLETED" ||
      normalizedStatus ===
        "SUCCESS" ||
      normalizedStatus ===
        "SUCCEEDED" ||
      normalizedStatus ===
        "DELIVERED"
    ) {
      finalStatus =
        "COMPLETED";
    }

    /*
     * ==========================================================
     * 22. GUARDAR RESPUESTA DEL PROVEEDOR
     * ==========================================================
     */

    const {
      error: updateOrderError,
    } =
      await supabaseAdmin
        .from("topup_orders")
        .update({
          supplier_order_id:
            String(
              supplierOrderId
            ),

          supplier_status:
            supplierStatus,

          supplier_response:
            supplierData,

          status:
            finalStatus,
        })
        .eq(
          "id",
          createdOrderId
        );

    if (
      updateOrderError
    ) {
      console.error(
        "ERROR ACTUALIZANDO ORDEN:",
        updateOrderError
      );

      /*
       * La compra pudo haberse creado correctamente en el
       * proveedor. No hacemos reembolso automático aquí.
       */

      return NextResponse.json(
        {
          ok: true,

          order: {
            ...createdOrder,

            supplier_order_id:
              String(
                supplierOrderId
              ),

            status:
              "SUPPLIER_PENDING",
          },

          orderNumber:
            createdOrder.order_number ||
            "",

          supplierOrderId:
            String(
              supplierOrderId
            ),

          status:
            "SUPPLIER_PENDING",

          warning:
            "La compra fue enviada al proveedor y quedó pendiente de actualización.",
        },
        { status: 202 }
      );
    }

    /*
     * ==========================================================
     * 23. COMPLETAR RESERVA SI EL PROVEEDOR CONFIRMÓ
     * ==========================================================
     */

    if (
      finalStatus ===
      "COMPLETED"
    ) {
      const {
        error: completeError,
      } =
        await supabaseAdmin.rpc(
          "complete_topup_order",
          {
            p_order_id:
              createdOrderId,
          }
        );

      if (
        completeError
      ) {
        console.error(
          "ERROR COMPLETANDO BALANCE:",
          completeError
        );

        /*
         * No hacemos refund porque el proveedor ya confirmó
         * la compra.
         */
      }
    }

    /*
     * ==========================================================
     * 24. RESPUESTA FINAL
     * ==========================================================
     */

    return NextResponse.json({
      ok: true,

      order: {
        ...createdOrder,

        supplier_order_id:
          String(
            supplierOrderId
          ),

        status:
          finalStatus,
      },

      orderNumber:
        createdOrder.order_number ||
        "",

      supplierOrderId:
        String(
          supplierOrderId
        ),

      status:
        finalStatus,
    });
  } catch (error) {
    /*
     * ============================================================
     * ERROR GENERAL
     * ============================================================
     */

    console.error(
      "ERROR API FC MOBILE ID:",
      error
    );

    /*
     * Si ya habíamos reservado balance y algo salió mal después,
     * dejamos la orden como SUPPLIER_PENDING para no hacer un
     * reembolso incorrecto cuando no sabemos si FazerCards recibió
     * la compra.
     */

    if (
      createdOrderId &&
      reservationMade
    ) {
      try {
        await supabaseAdmin
          .from("topup_orders")
          .update({
            status:
              "SUPPLIER_PENDING",

            error_message:
              "Error inesperado después de reservar el balance. Se requiere comprobar el estado del proveedor.",
          })
          .eq(
            "id",
            createdOrderId
          );
      } catch (
        updateError
      ) {
        console.error(
          "ERROR ACTUALIZANDO ORDEN TRAS EXCEPCIÓN:",
          updateError
        );
      }

      return NextResponse.json(
        {
          ok: true,

          status:
            "SUPPLIER_PENDING",

          warning:
            "La orden quedó pendiente de confirmación. Revise el estado antes de volver a realizar la compra.",
        },
        { status: 202 }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error:
          "No se pudo procesar la orden.",
      },
      { status: 500 }
    );
  }
}
