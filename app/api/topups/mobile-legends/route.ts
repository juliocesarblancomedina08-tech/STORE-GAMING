import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";

const FAZER_API_BASE = "https://api.fzr.cards/api/v2";
const CATEGORY_ID = "mobile_legends_united_states";
const GAME_NAME = "Mobile Legends";

const OFFERS = [
  {
    id: "51_5_diamonds",
    supplierOfferId: "51_5_diamonds",
    name: "51 + 5 Diamantes",
    retailPrice: 1.02,
    supplierPrice: 0.8665,
  },
  {
    id: "weekly_diamond_pass",
    supplierOfferId: "weekly_diamond_pass",
    name: "Pase semanal de diamantes",
    retailPrice: 1.89,
    supplierPrice: 1.743,
  },
  {
    id: "253_25_diamonds",
    supplierOfferId: "253_25_diamonds",
    name: "253 + 25 Diamantes",
    retailPrice: 4.49,
    supplierPrice: 4.3423,
  },
  {
    id: "505_66_diamantes",
    supplierOfferId: "505_66_diamantes",
    name: "505 + 66 Diamantes",
    retailPrice: 8.85,
    supplierPrice: 8.7048,
  },
  {
    id: "1010_182_diamantes",
    supplierOfferId: "1010_182_diamantes",
    name: "1010 + 182 Diamantes",
    retailPrice: 17.49,
    supplierPrice: 17.3391,
  },
  {
    id: "1515_273_diamantes",
    supplierOfferId: "1515_273_diamantes",
    name: "1515 + 273 Diamantes",
    retailPrice: 26.14,
    supplierPrice: 25.9935,
  },
  {
    id: "2525_480_diamantes",
    supplierOfferId: "2525_480_diamantes",
    name: "2525 + 480 Diamantes",
    retailPrice: 43.47,
    supplierPrice: 43.3225,
  },
  {
    id: "3030_576_diamantes",
    supplierOfferId: "3030_576_diamantes",
    name: "3030 + 576 Diamantes",
    retailPrice: 52.14,
    supplierPrice: 51.987,
  },
  {
    id: "4008_802_diamantes",
    supplierOfferId: "4008_802_diamantes",
    name: "4008 + 802 Diamantes",
    retailPrice: 69.47,
    supplierPrice: 69.316,
  },
  {
    id: "5010_1002_diamantes",
    supplierOfferId: "5010_1002_diamantes",
    name: "5010 + 1002 Diamantes",
    retailPrice: 86.8,
    supplierPrice: 86.645,
  },
] as const;

type Offer = (typeof OFFERS)[number];

function getOffer(offerId: string): Offer | undefined {
  return OFFERS.find((offer) => offer.id === offerId);
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export async function POST(request: NextRequest) {
  let orderId: string | null = null;
  let balanceReserved = false;

  try {
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          ok: false,
          error: "No autorizado.",
        },
        { status: 401 }
      );
    }

    const accessToken = authorization.replace("Bearer ", "").trim();

    if (!accessToken) {
      return NextResponse.json(
        {
          ok: false,
          error: "Token inválido.",
        },
        { status: 401 }
      );
    }

    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(accessToken);

    if (authError || !user) {
      return NextResponse.json(
        {
          ok: false,
          error: "Sesión inválida o expirada.",
        },
        { status: 401 }
      );
    }

    const body = await request.json();

    const offerId =
      typeof body?.offerId === "string"
        ? body.offerId.trim()
        : "";

    const playerId =
      typeof body?.playerId === "string"
        ? body.playerId.trim()
        : "";

    const serverId =
      typeof body?.serverId === "string"
        ? body.serverId.trim()
        : "";

    const idempotencyKey =
      typeof body?.idempotencyKey === "string"
        ? body.idempotencyKey.trim()
        : "";

    if (!offerId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Debe seleccionar una oferta.",
        },
        { status: 400 }
      );
    }

    if (!playerId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Debe introducir el ID del jugador.",
        },
        { status: 400 }
      );
    }

    if (!serverId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Debe introducir el ID del servidor.",
        },
        { status: 400 }
      );
    }

    if (!/^\d+$/.test(playerId)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El ID del jugador debe contener solamente números.",
        },
        { status: 400 }
      );
    }

    if (!/^\d+$/.test(serverId)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El ID del servidor debe contener solamente números.",
        },
        { status: 400 }
      );
    }

    if (playerId.length < 3 || playerId.length > 20) {
      return NextResponse.json(
        {
          ok: false,
          error: "El ID del jugador no es válido.",
        },
        { status: 400 }
      );
    }

    if (serverId.length < 1 || serverId.length > 20) {
      return NextResponse.json(
        {
          ok: false,
          error: "El ID del servidor no es válido.",
        },
        { status: 400 }
      );
    }

    const offer = getOffer(offerId);

    if (!offer) {
      return NextResponse.json(
        {
          ok: false,
          error: "La oferta seleccionada no existe.",
        },
        { status: 400 }
      );
    }

    /*
     * Evitar pedidos duplicados.
     */
    if (idempotencyKey) {
      const {
        data: existingOrder,
        error: existingOrderError,
      } = await supabaseAdmin
        .from("topup_orders")
        .select(
          "id,status,game,offer_name,retail_price,supplier_order_id"
        )
        .eq("user_id", user.id)
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();

      if (existingOrderError) {
        console.error(
          "Error comprobando idempotencia:",
          existingOrderError
        );
      }

      if (existingOrder) {
        return NextResponse.json({
          ok: true,
          duplicate: true,
          order: existingOrder,
        });
      }
    }

    /*
     * Crear la orden en nuestra base de datos.
     */
    const { data: createdOrder, error: createOrderError } =
      await supabaseAdmin
        .from("topup_orders")
        .insert({
          user_id: user.id,
          username: user.user_metadata?.username ?? null,
          email: user.email ?? null,

          game: GAME_NAME,
          category_id: CATEGORY_ID,

          offer_id: offer.id,
          offer_name: offer.name,

          player_id: playerId,

          retail_price: offer.retailPrice,
          supplier_price: offer.supplierPrice,

          currency: "USD",
          status: "pending",

          idempotency_key: idempotencyKey || null,

          supplier_fields: {
            id_jugador: playerId,
            id_servidor: serverId,
          },
        })
        .select(
          "id,status,game,category_id,offer_id,offer_name,player_id,retail_price,supplier_price,currency,supplier_order_id"
        )
        .single();

    if (createOrderError || !createdOrder) {
      console.error(
        "Error creando orden Mobile Legends:",
        createOrderError
      );

      return NextResponse.json(
        {
          ok: false,
          error: "No se pudo crear el pedido.",
          detail: createOrderError?.message ?? null,
        },
        { status: 500 }
      );
    }

    orderId = createdOrder.id;

    /*
     * Reservar saldo.
     */
    const {
      data: reserveResult,
      error: reserveError,
    } = await supabaseAdmin.rpc(
      "store_gaming_reserve_balance",
      {
        p_user_id: user.id,
        p_amount: offer.retailPrice,
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
          status: "rejected",
        })
        .eq("id", orderId);

      return NextResponse.json(
        {
          ok: false,
          error: "No se pudo reservar el saldo.",
          detail: reserveError.message,
        },
        { status: 400 }
      );
    }

    if (reserveResult === false) {
      await supabaseAdmin
        .from("topup_orders")
        .update({
          status: "rejected",
        })
        .eq("id", orderId);

      return NextResponse.json(
        {
          ok: false,
          error: "Saldo insuficiente.",
        },
        { status: 400 }
      );
    }

    balanceReserved = true;

    /*
     * Enviar pedido a FazerCards.
     *
     * Los campos REALES de Mobile Legends son:
     * id_jugador
     * id_servidor
     */
    const fazerResponse = await fetch(
      `${FAZER_API_BASE}/topups/order`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-API-Key":
            process.env.FAZERCARDS_API_KEY ?? "",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36",
          Referer:
            "https://reseller.fazercards.com/",
          Origin:
            "https://reseller.fazercards.com",
        },
        body: JSON.stringify({
          category_id: CATEGORY_ID,
          offer_id: offer.supplierOfferId,
          fields: {
            id_jugador: playerId,
            id_servidor: serverId,
          },
        }),
      }
    );

    const supplierText = await fazerResponse.text();

    let supplierData: any = null;

    try {
      supplierData = supplierText
        ? JSON.parse(supplierText)
        : null;
    } catch {
      supplierData = supplierText;
    }

    console.log(
      "FazerCards Mobile Legends:",
      fazerResponse.status,
      supplierData
    );

    /*
     * FazerCards rechazó el pedido.
     */
    if (!fazerResponse.ok) {
      if (balanceReserved) {
        const { error: refundError } =
          await supabaseAdmin.rpc(
            "store_gaming_refund_balance",
            {
              p_user_id: user.id,
              p_amount: offer.retailPrice,
            }
          );

        if (refundError) {
          console.error(
            "Error devolviendo saldo:",
            refundError
          );
        }

        balanceReserved = false;
      }

      await supabaseAdmin
        .from("topup_orders")
        .update({
          status: "rejected",
          supplier_status: String(
            supplierData?.status ??
              `http_${fazerResponse.status}`
          ),
        })
        .eq("id", orderId);

      return NextResponse.json(
        {
          ok: false,
          error: "FazerCards rechazó el pedido.",
          supplier_status: fazerResponse.status,
          supplier_response: supplierData,
        },
        { status: 400 }
      );
    }

    /*
     * Obtener ID del pedido del proveedor.
     */
    const supplierOrderId =
      supplierData?.order_id ??
      supplierData?.id ??
      supplierData?.order?.id ??
      supplierData?.data?.order_id ??
      supplierData?.data?.id ??
      null;

    const supplierStatus = String(
      supplierData?.status ??
        supplierData?.order?.status ??
        supplierData?.data?.status ??
        "pending"
    ).toLowerCase();

    await supabaseAdmin
      .from("topup_orders")
      .update({
        supplier_order_id: supplierOrderId,
        supplier_status: supplierStatus,
      })
      .eq("id", orderId);

    /*
     * Estados rechazados.
     */
    const rejectedStatuses = [
      "rejected",
      "failed",
      "cancelled",
      "canceled",
      "error",
    ];

    if (rejectedStatuses.includes(supplierStatus)) {
      if (balanceReserved) {
        const { error: refundError } =
          await supabaseAdmin.rpc(
            "store_gaming_refund_balance",
            {
              p_user_id: user.id,
              p_amount: offer.retailPrice,
            }
          );

        if (refundError) {
          console.error(
            "Error devolviendo saldo:",
            refundError
          );
        }

        balanceReserved = false;
      }

      await supabaseAdmin
        .from("topup_orders")
        .update({
          status: "rejected",
        })
        .eq("id", orderId);

      return NextResponse.json(
        {
          ok: false,
          error: "FazerCards rechazó el pedido.",
          order_id: orderId,
          supplier_status: supplierStatus,
          supplier_response: supplierData,
        },
        { status: 400 }
      );
    }

    /*
     * Estados pendientes.
     */
    const pendingStatuses = [
      "pending",
      "processing",
      "in_progress",
      "created",
      "queued",
    ];

    if (
      pendingStatuses.includes(supplierStatus) ||
      !supplierOrderId
    ) {
      await supabaseAdmin
        .from("topup_orders")
        .update({
          status: "pending",
        })
        .eq("id", orderId);

      return NextResponse.json({
        ok: true,
        order_id: orderId,
        supplier_order_id: supplierOrderId,
        status: "pending",
        message:
          "Pedido creado correctamente y enviado a FazerCards.",
      });
    }

    /*
     * Si FazerCards devuelve una confirmación
     * inmediata, completamos la orden.
     */
    const {
      error: completeError,
    } = await supabaseAdmin.rpc(
      "store_gaming_complete_order",
      {
        p_user_id: user.id,
        p_amount: offer.retailPrice,
      }
    );

    if (completeError) {
      console.error(
        "Error completando la orden:",
        completeError
      );

      await supabaseAdmin
        .from("topup_orders")
        .update({
          status: "pending",
        })
        .eq("id", orderId);

      return NextResponse.json({
        ok: true,
        order_id: orderId,
        supplier_order_id: supplierOrderId,
        status: "pending",
        message:
          "Pedido enviado correctamente y pendiente de confirmación.",
      });
    }

    balanceReserved = false;

    await supabaseAdmin
      .from("topup_orders")
      .update({
        status: "completed",
      })
      .eq("id", orderId);

    return NextResponse.json({
      ok: true,
      order_id: orderId,
      supplier_order_id: supplierOrderId,
      status: "completed",
      message: "Pedido creado correctamente.",
    });
  } catch (error) {
    console.error(
      "Error inesperado Mobile Legends:",
      error
    );

    /*
     * Si ocurrió un error después de reservar el saldo,
     * intentamos devolverlo.
     */
    if (balanceReserved && orderId) {
      try {
        const { data: orderData } =
          await supabaseAdmin
            .from("topup_orders")
            .select("user_id,retail_price")
            .eq("id", orderId)
            .maybeSingle();

        if (orderData) {
          await supabaseAdmin.rpc(
            "store_gaming_refund_balance",
            {
              p_user_id: orderData.user_id,
              p_amount: Number(
                orderData.retail_price
              ),
            }
          );
        }

        await supabaseAdmin
          .from("topup_orders")
          .update({
            status: "rejected",
          })
          .eq("id", orderId);
      } catch (refundError) {
        console.error(
          "Error en devolución después del fallo:",
          refundError
        );
      }
    }

    return NextResponse.json(
      {
        ok: false,
        error:
          "Error interno al crear el pedido.",
        detail: errorMessage(error),
      },
      { status: 500 }
    );
  }
}
