import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

const FAZER_API_BASE =
  process.env.FAZERCARDS_API_URL ||
  "https://api.fzr.cards/api/v2";

const FAZER_API_KEY =
  process.env.FAZERCARDS_API_KEY || "";

const CATEGORY_ID = "delta_force";

const OFFERS = [
  {
    id: "18_delta_coins",
    name: "18 Delta Coins",
    price: 0.38,
    supplierPrice: 0.2217,
  },
  {
    id: "30_delta_coins",
    name: "30 Delta Coins",
    price: 0.54,
    supplierPrice: 0.3829,
  },
  {
    id: "60_delta_coins",
    name: "60 Delta Coins",
    price: 0.93,
    supplierPrice: 0.7758,
  },
  {
    id: "320_delta_coins",
    name: "320 Delta Coins",
    price: 4.04,
    supplierPrice: 3.8889,
  },
  {
    id: "460_delta_coins",
    name: "460 Delta Coins",
    price: 5.79,
    supplierPrice: 5.642,
  },
  {
    id: "750_delta_coins",
    name: "750 Delta Coins",
    price: 7.92,
    supplierPrice: 7.7678,
  },
  {
    id: "1480_delta_coins",
    name: "1480 Delta Coins",
    price: 15.69,
    supplierPrice: 15.5357,
  },
  {
    id: "1980_delta_coins",
    name: "1980 Delta Coins",
    price: 19.58,
    supplierPrice: 19.4246,
  },
  {
    id: "3950_delta_coins",
    name: "3950 Delta Coins",
    price: 38.99,
    supplierPrice: 38.8391,
  },
  {
    id: "8100_delta_coins",
    name: "8100 Delta Coins",
    price: 77.82,
    supplierPrice: 77.6682,
  },
  {
    id: "16200_delta_coins",
    name: "16200 Delta Coins",
    price: 157.84,
    supplierPrice: 157.6929,
  },
  {
    id: "24300_delta_coins",
    name: "24300 Delta Coins",
    price: 236.69,
    supplierPrice: 236.5449,
  },
  {
    id: "season_pass_operations_special",
    name: "Season Pass Operations Special",
    price: 4.42,
    supplierPrice: 4.2647,
  },
  {
    id: "season_pass_warfare_special",
    name: "Season Pass Warfare Special",
    price: 4.42,
    supplierPrice: 4.2647,
  },
  {
    id: "season_pass_delta_force_deluxe",
    name: "Season Pass Delta Force Deluxe",
    price: 6.06,
    supplierPrice: 5.909,
  },
] as const;

function getBearerToken(
  request: NextRequest
) {
  const authorization =
    request.headers.get("authorization") ||
    "";

  if (!authorization.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice(7).trim();
}

function getSupplierOrderId(
  data: any
): string | null {
  const candidates = [
    data?.order_id,
    data?.orderId,
    data?.supplier_order_id,
    data?.supplierOrderId,
    data?.id,
    data?.data?.order_id,
    data?.data?.orderId,
    data?.data?.supplier_order_id,
    data?.data?.supplierOrderId,
    data?.data?.id,
    data?.order?.order_id,
    data?.order?.orderId,
    data?.order?.supplier_order_id,
    data?.order?.supplierOrderId,
    data?.order?.id,
  ];

  for (const value of candidates) {
    if (
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
    ) {
      return String(value);
    }
  }

  return null;
}

function getSupplierStatus(
  data: any
): string | null {
  const candidates = [
    data?.status,
    data?.order_status,
    data?.orderStatus,
    data?.data?.status,
    data?.data?.order_status,
    data?.data?.orderStatus,
    data?.order?.status,
    data?.order?.order_status,
    data?.order?.orderStatus,
  ];

  for (const value of candidates) {
    if (
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
    ) {
      return String(value)
        .trim()
        .toLowerCase();
    }
  }

  return null;
}

function isSupplierRejected(
  status: string | null
) {
  if (!status) {
    return false;
  }

  return [
    "rejected",
    "reject",
    "failed",
    "failure",
    "cancelled",
    "canceled",
    "declined",
    "error",
  ].includes(status);
}

function isSupplierCompleted(
  status: string | null
) {
  if (!status) {
    return false;
  }

  return [
    "completed",
    "complete",
    "success",
    "successful",
    "delivered",
    "done",
  ].includes(status);
}

function getRetailPrice(
  offer: (typeof OFFERS)[number]
) {
  return Number(
    Number(offer.price).toFixed(2)
  );
}

export async function POST(
  request: NextRequest
) {
  let reserved = false;
  let insertedOrderId: string | null = null;

  try {
    /* =========================
       AUTH
    ========================== */

    const accessToken =
      getBearerToken(request);

    if (!accessToken) {
      return NextResponse.json(
        {
          error:
            "No autorizado. Inicie sesión.",
        },
        { status: 401 }
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
      return NextResponse.json(
        {
          error:
            "Sesión inválida o expirada.",
        },
        { status: 401 }
      );
    }

    const user = userData.user;


    /* =========================
       BODY
    ========================== */

    const body =
      await request.json();

    const offerId =
      String(body?.offerId || "")
        .trim();

    const playerId =
      String(body?.playerId || "")
        .trim();

    const idempotencyKey =
      String(
        body?.idempotencyKey || ""
      ).trim();

    const requestedRetailPrice =
      Number(body?.retailPrice);


    /* =========================
       VALIDACIONES
    ========================== */

    if (!offerId) {
      return NextResponse.json(
        {
          error:
            "Debe seleccionar una oferta.",
        },
        { status: 400 }
      );
    }

    if (!playerId) {
      return NextResponse.json(
        {
          error:
            "Debe introducir el Player ID.",
        },
        { status: 400 }
      );
    }

    if (!/^[0-9]+$/.test(playerId)) {
      return NextResponse.json(
        {
          error:
            "El Player ID solo puede contener números.",
        },
        { status: 400 }
      );
    }

    if (playerId.length < 4) {
      return NextResponse.json(
        {
          error:
            "El Player ID debe tener al menos 4 números.",
        },
        { status: 400 }
      );
    }

    if (playerId.length > 32) {
      return NextResponse.json(
        {
          error:
            "El Player ID es demasiado largo.",
        },
        { status: 400 }
      );
    }

    if (!idempotencyKey) {
      return NextResponse.json(
        {
          error:
            "Falta la clave de idempotencia.",
        },
        { status: 400 }
      );
    }


    /* =========================
       OFERTA
    ========================== */

    const offer =
      OFFERS.find(
        (item) => item.id === offerId
      );

    if (!offer) {
      return NextResponse.json(
        {
          error:
            "La oferta seleccionada no existe.",
        },
        { status: 400 }
      );
    }

    const retailPrice =
      getRetailPrice(offer);

    if (
      Number.isFinite(
        requestedRetailPrice
      ) &&
      Math.abs(
        requestedRetailPrice -
          retailPrice
      ) > 0.001
    ) {
      return NextResponse.json(
        {
          error:
            "El precio de la oferta no coincide.",
        },
        { status: 400 }
      );
    }


    /* =========================
       IDEMPOTENCIA
    ========================== */

    const {
      data: existingOrder,
      error:
        existingOrderError,
    } =
      await supabaseAdmin
        .from("topup_orders")
        .select(
          "id,order_number,status,supplier_order_id,retail_price"
        )
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
        "Error comprobando idempotencia:",
        existingOrderError
      );

      return NextResponse.json(
        {
          error:
            "No se pudo comprobar la orden.",
        },
        { status: 500 }
      );
    }

    if (existingOrder) {
      return NextResponse.json(
        {
          ok: true,
          duplicate: true,
          order: existingOrder,
          orderNumber:
            existingOrder.order_number ||
            existingOrder.id,
        },
        { status: 200 }
      );
    }


    /* =========================
       PERFIL / BALANCE
    ========================== */

    const {
      data: profile,
      error: profileError,
    } =
      await supabaseAdmin
        .from("profiles")
        .select(
          "id,email,balance"
        )
        .eq(
          "id",
          user.id
        )
        .maybeSingle();

    if (
      profileError
    ) {
      console.error(
        "Error obteniendo perfil:",
        profileError
      );

      return NextResponse.json(
        {
          error:
            "No se pudo obtener el perfil.",
        },
        { status: 500 }
      );
    }

    if (!profile) {
      return NextResponse.json(
        {
          error:
            "Perfil de usuario no encontrado.",
        },
        { status: 404 }
      );
    }

    const balance =
      Number(profile.balance || 0);

    if (
      !Number.isFinite(balance) ||
      balance < retailPrice
    ) {
      return NextResponse.json(
        {
          error:
            "Saldo insuficiente.",
          balance,
          required: retailPrice,
        },
        { status: 400 }
      );
    }


    /* =========================
       CREAR ORDEN
    ========================== */

    const {
      data: insertedOrder,
      error: insertError,
    } =
      await supabaseAdmin
        .from("topup_orders")
        .insert({
          user_id: user.id,

          game:
            "Delta Force",

          category_id:
            CATEGORY_ID,

          offer_id:
            offer.id,

          offer_name:
            offer.name,

          player_id:
            playerId,

          currency:
            "USD",

          retail_price:
            retailPrice,

          supplier_price:
            Number(
              offer.supplierPrice
            ),

          status:
            "RESERVED",

          idempotency_key:
            idempotencyKey,

          supplier_fields: {
            player_id:
              playerId,
          },
        })
        .select(
          "*"
        )
        .single();

    if (
      insertError ||
      !insertedOrder
    ) {
      console.error(
        "Error creando topup_order:",
        insertError
      );

      return NextResponse.json(
        {
          error:
            "No se pudo crear la orden.",
        },
        { status: 500 }
      );
    }

    insertedOrderId =
      insertedOrder.id;


    /* =========================
       RESERVAR SALDO
    ========================== */

    const {
      data: reserveResult,
      error: reserveError,
    } =
      await supabaseAdmin.rpc(
        "reserve_topup_balance",
        {
          p_user_id:
            user.id,

          p_amount:
            retailPrice,
        }
      );

    if (reserveError) {
      console.error(
        "Error reservando saldo:",
        reserveError
      );

      await supabaseAdmin
        .from("topup_orders")
        .update({
          status: "FAILED",
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          insertedOrderId
        );

      return NextResponse.json(
        {
          error:
            reserveError.message ||
            "No se pudo reservar el saldo.",
        },
        { status: 400 }
      );
    }

    if (
      reserveResult === false
    ) {
      await supabaseAdmin
        .from("topup_orders")
        .update({
          status: "FAILED",
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          insertedOrderId
        );

      return NextResponse.json(
        {
          error:
            "Saldo insuficiente.",
        },
        { status: 400 }
      );
    }

    reserved = true;


    /* =========================
       ENVIAR A FAZERCARDS
    ========================== */

    if (!FAZER_API_KEY) {
      console.error(
        "Falta FAZERCARDS_API_KEY."
      );

      await supabaseAdmin.rpc(
        "refund_topup_balance",
        {
          p_order_id:
            insertedOrderId,
        }
      );

      reserved = false;

      return NextResponse.json(
        {
          error:
            "La configuración del proveedor está incompleta.",
        },
        { status: 500 }
      );
    }

    const supplierPayload = {
      category_id:
        CATEGORY_ID,

      offer_id:
        offer.id,

      fields: {
        player_id:
          playerId,
      },
    };

    let supplierResponse: Response;

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
                idempotencyKey,

              "User-Agent":
                "STORE-GAMING/1.0",

              Referer:
                "https://store-gaming.vercel.app/",

              Origin:
                "https://store-gaming.vercel.app",
            },

            body:
              JSON.stringify(
                supplierPayload
              ),
          }
        );
    } catch (supplierNetworkError) {
      /*
       * No sabemos si FazerCards recibió
       * el pedido. Por seguridad NO hacemos
       * refund automático.
       */

      console.error(
        "Error de red con FazerCards:",
        supplierNetworkError
      );

      await supabaseAdmin
        .from("topup_orders")
        .update({
          status:
            "SUPPLIER_PENDING",

          supplier_response: {
            error:
              supplierNetworkError instanceof
              Error
                ? supplierNetworkError.message
                : String(
                    supplierNetworkError
                  ),

            payload:
              supplierPayload,
          },

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          insertedOrderId
        );

      reserved = false;

      return NextResponse.json(
        {
          ok: true,

          pending: true,

          orderNumber:
            insertedOrder.order_number ||
            insertedOrder.id,

          message:
            "El pedido quedó pendiente de confirmación del proveedor.",
        },
        { status: 202 }
      );
    }


    /* =========================
       LEER RESPUESTA
    ========================== */

    const responseText =
      await supplierResponse.text();

    let supplierData: any = null;

    try {
      supplierData =
        responseText
          ? JSON.parse(responseText)
          : null;
    } catch {
      supplierData = {
        raw:
          responseText,
      };
    }

    const supplierOrderId =
      getSupplierOrderId(
        supplierData
      );

    const supplierStatus =
      getSupplierStatus(
        supplierData
      );


    /* =========================
       PROVEEDOR RECHAZÓ
    ========================== */

    if (
      !supplierResponse.ok ||
      isSupplierRejected(
        supplierStatus
      )
    ) {
      console.error(
        "FazerCards rechazó la orden:",
        {
          status:
            supplierResponse.status,

          supplierStatus,

          supplierData,
        }
      );

      let refundError:
        | unknown
        | null = null;

      if (insertedOrderId) {
        const {
          error:
            refundRpcError,
        } =
          await supabaseAdmin.rpc(
            "refund_topup_balance",
            {
              p_order_id:
                insertedOrderId,
            }
          );

        refundError =
          refundRpcError;
      }

      if (refundError) {
        console.error(
          "Error haciendo refund:",
          refundError
        );

        await supabaseAdmin
          .from("topup_orders")
          .update({
            status:
              "REFUND_PENDING",

            supplier_order_id:
              supplierOrderId,

            supplier_response:
              supplierData,

            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            insertedOrderId
          );

        reserved = false;

        return NextResponse.json(
          {
            error:
              "El proveedor rechazó la orden y el reembolso quedó pendiente.",
          },
          { status: 502 }
        );
      }

      reserved = false;

      return NextResponse.json(
        {
          error:
            "El proveedor rechazó la orden.",

          supplier:
            supplierData,
        },
        { status: 502 }
      );
    }


    /* =========================
       SIN ORDER ID
    ========================== */

    if (!supplierOrderId) {
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
          insertedOrderId
        );

      reserved = false;

      return NextResponse.json(
        {
          ok: true,

          pending: true,

          orderNumber:
            insertedOrder.order_number ||
            insertedOrder.id,

          message:
            "El pedido fue enviado y quedó pendiente de confirmación.",
        },
        { status: 202 }
      );
    }


    /* =========================
       ACTUALIZAR ORDEN
    ========================== */

    const finalStatus =
      isSupplierCompleted(
        supplierStatus
      )
        ? "COMPLETED"
        : "SUPPLIER_PENDING";

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
            finalStatus,

          supplier_response:
            supplierData,

          completed_at:
            finalStatus ===
            "COMPLETED"
              ? new Date().toISOString()
              : null,

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          insertedOrderId
        );

    if (updateError) {
      console.error(
        "Error actualizando topup_order:",
        updateError
      );

      /*
       * No hacemos refund porque el proveedor
       * ya entregó un order ID.
       */
      reserved = false;

      return NextResponse.json(
        {
          ok: true,

          pending: true,

          orderNumber:
            insertedOrder.order_number ||
            insertedOrder.id,

          supplierOrderId,

          message:
            "El proveedor aceptó el pedido, pero la actualización local quedó pendiente.",
        },
        { status: 202 }
      );
    }

    reserved = false;


    /* =========================
       RESPUESTA FINAL
    ========================== */

     return NextResponse.json(
      {
        ok: true,

        orderNumber:
          insertedOrder.order_number ||
          insertedOrder.id,

        orderId:
          insertedOrder.id,

        supplierOrderId,

        status:
          finalStatus,

        supplier:
          supplierData,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "Error general Delta Force:",
      error
    );

    /*
     * Si ya habíamos reservado el saldo pero
     * ocurrió un error antes de conocer si
     * FazerCards aceptó el pedido, dejamos la
     * orden pendiente para evitar doble
     * recarga/refund incorrecto.
     */
    if (
      insertedOrderId &&
      reserved
    ) {
      try {
        await supabaseAdmin
          .from("topup_orders")
          .update({
            status:
              "SUPPLIER_PENDING",

            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            insertedOrderId
          );
      } catch (updateError) {
        console.error(
          "No se pudo marcar la orden como pendiente:",
          updateError
        );
      }
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Error interno del servidor.",
      },
      { status: 500 }
    );
  }
}
