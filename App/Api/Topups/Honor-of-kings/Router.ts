import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "";

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const FAZER_API_BASE =
  process.env.FAZERCARDS_API_URL ||
  "https://api.fzr.cards/api/v2";

const FAZER_API_KEY =
  process.env.FAZERCARDS_API_KEY || "";

const CATEGORY_ID = "honor_of_kings";
const GAME_NAME = "Honor of Kings";
const STORE_MARGIN = 0.20;

const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

type Offer = {
  id: string;
  name: string;
  supplierPrice: number;
  retailPrice: number;
};

const OFFERS: Offer[] = [
  {
    id: "16_tokens",
    name: "16 Tokens",
    supplierPrice: 0.1713,
    retailPrice: 0.3713,
  },
  {
    id: "double_token_lucky_bag",
    name: "Double Token Lucky Bag",
    supplierPrice: 0.3224,
    retailPrice: 0.5224,
  },
  {
    id: "honor_point_value_pack",
    name: "Honor Point Value Pack",
    supplierPrice: 0.3224,
    retailPrice: 0.5224,
  },
  {
    id: "standard_purchase_rebate_pack",
    name: "Standard Purchase Rebate Paquete",
    supplierPrice: 0.3224,
    retailPrice: 0.5224,
  },
  {
    id: "80_tokens",
    name: "80 Tokens",
    supplierPrice: 0.8463,
    retailPrice: 1.0463,
  },
  {
    id: "weekly_card",
    name: "Weekly Card",
    supplierPrice: 0.9471,
    retailPrice: 1.1471,
  },
  {
    id: "premium_purchase_rebate_pack",
    name: "Premium Purchase Rebate Pack",
    supplierPrice: 1.1888,
    retailPrice: 1.3888,
  },
  {
    id: "240_tokens",
    name: "240 Tokens",
    supplierPrice: 2.5288,
    retailPrice: 2.7288,
  },
  {
    id: "weekly_card_plus",
    name: "Weekly Card Plus",
    supplierPrice: 2.9016,
    retailPrice: 3.1016,
  },
  {
    id: "400_tokens",
    name: "400 Tokens",
    supplierPrice: 4.2214,
    retailPrice: 4.4214,
  },
  {
    id: "560_tokens",
    name: "560 Tokens",
    supplierPrice: 5.914,
    retailPrice: 6.114,
  },
  {
    id: "830_tokens",
    name: "830 Tokens",
    supplierPrice: 8.4429,
    retailPrice: 8.6429,
  },
  {
    id: "1245_tokens",
    name: "1245 Tokens",
    supplierPrice: 12.6643,
    retailPrice: 12.8643,
  },
  {
    id: "2508_tokens",
    name: "2508 Tokens",
    supplierPrice: 25.3386,
    retailPrice: 25.5386,
  },
  {
    id: "4180_tokens",
    name: "4180 Tokens",
    supplierPrice: 42.2344,
    retailPrice: 42.4344,
  },
  {
    id: "8360_tokens",
    name: "8360 Tokens",
    supplierPrice: 84.4688,
    retailPrice: 84.6688,
  },
];

function normalizeStatus(value: unknown) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

function extractSupplierOrderId(data: any): string {
  return String(
    data?.order_id ||
      data?.orderId ||
      data?.supplier_order_id ||
      data?.supplierOrderId ||
      data?.data?.order_id ||
      data?.data?.orderId ||
      data?.data?.supplier_order_id ||
      data?.data?.supplierOrderId ||
      ""
  );
}

function extractSupplierStatus(data: any): string {
  return normalizeStatus(
    data?.status ||
      data?.order_status ||
      data?.data?.status ||
      data?.data?.order_status
  );
}

async function refundOrder(orderId: string) {
  const { error } = await supabaseAdmin.rpc(
    "refund_topup_balance",
    {
      p_order_id: orderId,
    }
  );

  return error;
}

export async function POST(
  request: NextRequest
) {
  let createdOrderId: string | null = null;

  try {
    if (
      !SUPABASE_URL ||
      !SUPABASE_SERVICE_ROLE_KEY
    ) {
      return NextResponse.json(
        {
          error:
            "Configuración de Supabase incompleta.",
        },
        { status: 500 }
      );
    }

    if (!FAZER_API_KEY) {
      return NextResponse.json(
        {
          error:
            "Configuración de FazerCards incompleta.",
        },
        { status: 500 }
      );
    }

    const authorization =
      request.headers.get("authorization") || "";

    if (!authorization.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          error: "No autorizado.",
        },
        { status: 401 }
      );
    }

    const accessToken =
      authorization.substring("Bearer ".length);

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
          error: "Sesión inválida.",
        },
        { status: 401 }
      );
    }

    const user = userData.user;

    const body = await request.json();

    const offerId = String(
      body?.offerId || ""
    ).trim();

    const playerId = String(
      body?.playerId || ""
    ).trim();

    const idempotencyKey = String(
      body?.idempotencyKey || ""
    ).trim();

    const retailPrice = Number(
      body?.retailPrice
    );

    if (!offerId) {
      return NextResponse.json(
        {
          error: "Falta la oferta.",
        },
        { status: 400 }
      );
    }

    if (!playerId) {
      return NextResponse.json(
        {
          error: "Falta el Player ID.",
        },
        { status: 400 }
      );
    }

    if (!/^\d{4,20}$/.test(playerId)) {
      return NextResponse.json(
        {
          error:
            "El Player ID debe contener entre 4 y 20 dígitos.",
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

    const offer = OFFERS.find(
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

    const expectedRetail =
      Number(
        (
          offer.supplierPrice +
          STORE_MARGIN
        ).toFixed(4)
      );

    if (
      !Number.isFinite(retailPrice) ||
      Math.abs(
        retailPrice - expectedRetail
      ) > 0.01
    ) {
      return NextResponse.json(
        {
          error:
            "El precio de la oferta no coincide con el precio del servidor.",
        },
        { status: 400 }
      );
    }

    /*
     * Comprobar idempotencia.
     */
    const {
      data: existingOrder,
      error: existingOrderError,
    } = await supabaseAdmin
      .from("topup_orders")
      .select("*")
      .eq("user_id", user.id)
      .eq(
        "idempotency_key",
        idempotencyKey
      )
      .maybeSingle();

    if (existingOrderError) {
      return NextResponse.json(
        {
          error:
            "No se pudo comprobar la orden.",
        },
        { status: 500 }
      );
    }

    if (existingOrder) {
      return NextResponse.json({
        ok: true,
        alreadyExists: true,
        order: existingOrder,
        orderNumber:
          existingOrder.order_number ||
          existingOrder.id,
        supplierOrderId:
          existingOrder.supplier_order_id ||
          "",
        status:
          existingOrder.status || "",
      });
    }

    /*
     * Consultar saldo.
     */
    const {
      data: profile,
      error: profileError,
    } = await supabaseAdmin
      .from("profiles")
      .select("balance")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json(
        {
          error:
            "No se pudo comprobar el saldo.",
        },
        { status: 500 }
      );
    }

    const balance = Number(
      profile?.balance || 0
    );

    if (balance < retailPrice) {
      return NextResponse.json(
        {
          error: "Saldo insuficiente.",
        },
        { status: 400 }
      );
    }

    /*
     * Crear orden.
     */
    const {
      data: insertedOrder,
      error: insertError,
    } = await supabaseAdmin
      .from("topup_orders")
      .insert({
        user_id: user.id,

        game: GAME_NAME,

        category_id: CATEGORY_ID,

        offer_id: offer.id,

        offer_name: offer.name,

        player_id: playerId,

        currency: "USDT",

        retail_price: retailPrice,

        supplier_price: offer.supplierPrice,

        status: "RESERVED",

        idempotency_key:
          idempotencyKey,

        supplier_fields: {
          player_id: playerId,
        },

        created_at: new Date().toISOString(),

        updated_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (insertError || !insertedOrder) {
      return NextResponse.json(
        {
          error:
            "No se pudo crear la orden.",
          details:
            insertError?.message,
        },
        { status: 500 }
      );
    }

    createdOrderId =
      insertedOrder.id;

    /*
     * Reservar saldo.
     */
    const {
      error: reserveError,
    } = await supabaseAdmin.rpc(
      "reserve_topup_balance",
      {
        p_order_id:
          insertedOrder.id,
      }
    );

    if (reserveError) {
      await supabaseAdmin
        .from("topup_orders")
        .update({
          status: "FAILED",
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          insertedOrder.id
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

    /*
     * Pedido REAL a FazerCards.
     */
    const supplierPayload = {
      category_id: CATEGORY_ID,

      offer_id: offer.id,

      fields: {
        player_id: playerId,
      },
    };

    let supplierResponse: any = null;

    try {
      const supplierRequest =
        await fetch(
          `${FAZER_API_BASE}/topups/order`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              "X-API-Key":
                FAZER_API_KEY,

              "Idempotency-Key":
                idempotencyKey,

              Accept:
                "application/json",
            },

            body: JSON.stringify(
              supplierPayload
            ),

            cache: "no-store",
          }
        );

      const responseText =
        await supplierRequest.text();

      try {
        supplierResponse =
          responseText
            ? JSON.parse(responseText)
            : null;
      } catch {
        supplierResponse = {
          raw: responseText,
        };
      }

      /*
       * Guardar respuesta completa
       * del proveedor.
       */
      await supabaseAdmin
        .from("topup_orders")
        .update({
          supplier_response:
            supplierResponse,

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          insertedOrder.id
        );

      /*
       * Error HTTP del proveedor.
       */
      if (!supplierRequest.ok) {
        const refundError =
          await refundOrder(
            insertedOrder.id
          );

        if (refundError) {
          await supabaseAdmin
            .from("topup_orders")
            .update({
              status:
                "REFUND_PENDING",

              updated_at:
                new Date().toISOString(),
            })
            .eq(
              "id",
              insertedOrder.id
            );

          return NextResponse.json(
            {
              error:
                "El proveedor rechazó la orden y el reembolso quedó pendiente.",

              provider:
                supplierResponse,
            },
            { status: 502 }
          );
        }

        return NextResponse.json(
          {
            error:
              supplierResponse?.error ||
              supplierResponse?.message ||
              supplierResponse?.detail ||
              "El proveedor rechazó la orden. El saldo fue reembolsado.",

            provider:
              supplierResponse,
          },
          { status: 400 }
        );
      }
    } catch (supplierError) {
      /*
       * Si hubo error de red después
       * de enviar el pedido, NO hacemos
       * reembolso automático porque no
       * sabemos si FazerCards recibió
       * la orden.
       */
      await supabaseAdmin
        .from("topup_orders")
        .update({
          status:
            "SUPPLIER_PENDING",

          supplier_response: {
            network_error:
              supplierError instanceof Error
                ? supplierError.message
                : String(
                    supplierError
                  ),
          },

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          insertedOrder.id
        );

      return NextResponse.json(
        {
          ok: true,

          order: {
            ...insertedOrder,
            status:
              "SUPPLIER_PENDING",
          },

          orderNumber:
            insertedOrder.order_number ||
            insertedOrder.id,

          supplierOrderId: "",

          status:
            "SUPPLIER_PENDING",

          message:
            "La orden fue enviada y está pendiente de confirmación del proveedor.",
        },
        { status: 202 }
      );
    }

    const supplierOrderId =
      extractSupplierOrderId(
        supplierResponse
      );

    const supplierStatus =
      extractSupplierStatus(
        supplierResponse
      );

    /*
     * Si FazerCards no devolvió
     * número de orden, dejamos
     * pendiente para evitar
     * marcarla como fallida
     * incorrectamente.
     */
    if (!supplierOrderId) {
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
          insertedOrder.id
        );

      return NextResponse.json(
        {
          ok: true,

          order: {
            ...insertedOrder,
            status:
              "SUPPLIER_PENDING",
          },

          orderNumber:
            insertedOrder.order_number ||
            insertedOrder.id,

          supplierOrderId: "",

          status:
            "SUPPLIER_PENDING",
        },
        { status: 202 }
      );
    }

    /*
     * Pedido recibido por FazerCards.
     */
    const completedStatuses = [
      "COMPLETED",
      "COMPLETE",
      "SUCCESS",
      "SUCCEEDED",
      "DONE",
    ];

    const finalStatus =
      completedStatuses.includes(
        supplierStatus
      )
        ? "COMPLETED"
        : "SUPPLIER_PENDING";

    const { data: updatedOrder } =
      await supabaseAdmin
        .from("topup_orders")
        .update({
          supplier_order_id:
            supplierOrderId,

          supplier_response:
            supplierResponse,

          status: finalStatus,

          completed_at:
            finalStatus === "COMPLETED"
              ? new Date().toISOString()
              : null,

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          insertedOrder.id
        )
        .select("*")
        .single();

    return NextResponse.json({
      ok: true,

      order:
        updatedOrder || {
          ...insertedOrder,

          supplier_order_id:
            supplierOrderId,

          status: finalStatus,
        },

      orderNumber:
        updatedOrder?.order_number ||
        insertedOrder.order_number ||
        insertedOrder.id,

      supplierOrderId,

      status: finalStatus,
    });
  } catch (error) {
    console.error(
      "HONOR_OF_KINGS_ORDER_ERROR:",
      error
    );

    /*
     * Si la orden ya existe y ocurrió
     * un error después de enviarla,
     * no hacemos un reembolso automático.
     */
    if (createdOrderId) {
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
          createdOrderId
        );
    }

    return NextResponse.json(
      {
        error:
          "No se pudo completar el procesamiento de la orden.",

        details:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    );
  }
    }
