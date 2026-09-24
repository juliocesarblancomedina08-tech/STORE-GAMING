import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabase-admin";

type OrderRecord = {
  id: string;
  user_id: string;
  username: string | null;
  email: string | null;
  game: string | null;
  category_id: string | null;
  offer_id: string | null;
  offer_name: string | null;
  player_id: string | null;
  retail_price: number | null;
  supplier_price: number | null;
  currency: string | null;
  status: string | null;
  idempotency_key: string | null;
  supplier_fields: unknown;
  supplier_order_id: string | null;
  supplier_response: unknown;
  refunded_at: string | null;
  completed_at: string | null;
  failed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export async function GET(request: NextRequest) {
  try {
    const authorization =
      request.headers.get("authorization") || "";

    if (!authorization.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          success: false,
          error: "No autorizado.",
        },
        { status: 401 }
      );
    }

    const accessToken = authorization
      .replace("Bearer ", "")
      .trim();

    if (!accessToken) {
      return NextResponse.json(
        {
          success: false,
          error: "No autorizado.",
        },
        { status: 401 }
      );
    }

    /*
     * IMPORTANTE:
     * El usuario se obtiene directamente del token.
     * Nunca confiamos en un user_id enviado por el cliente.
     */
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(accessToken);

    if (userError || !user?.id) {
      return NextResponse.json(
        {
          success: false,
          error:
            "La sesión no es válida o ha expirado.",
        },
        { status: 401 }
      );
    }

    const userId = user.id;

    const { searchParams } = new URL(request.url);

    const orderId =
      searchParams.get("order_id")?.trim() || "";

    /*
     * Permitimos consultar historial amplio.
     * Por defecto se revisan los últimos 100 pedidos.
     */
    const limitParam =
      searchParams.get("limit")?.trim() || "100";

    let limit = Number.parseInt(limitParam, 10);

    if (!Number.isFinite(limit) || limit <= 0) {
      limit = 100;
    }

    if (limit > 500) {
      limit = 500;
    }

    let query = supabaseAdmin
      .from("topup_orders")
      .select(
        [
          "id",
          "user_id",
          "username",
          "email",
          "game",
          "category_id",
          "offer_id",
          "offer_name",
          "player_id",
          "retail_price",
          "supplier_price",
          "currency",
          "status",
          "idempotency_key",
          "supplier_fields",
          "supplier_order_id",
          "supplier_response",
          "refunded_at",
          "completed_at",
          "failed_at",
          "created_at",
          "updated_at",
        ].join(", ")
      )
      .eq("user_id", userId)
      .order("created_at", {
        ascending: false,
      })
      .limit(limit);

    /*
     * Si el cliente/IA proporciona un número de pedido,
     * buscamos específicamente ese pedido.
     */
    if (orderId) {
      query = query.eq("id", orderId);
    }

    const {
      data: orders,
      error: ordersError,
    } = await query;

    if (ordersError) {
      console.error(
        "Error buscando pedidos de soporte:",
        ordersError
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "No fue posible consultar los pedidos.",
        },
        { status: 500 }
      );
    }

    const orderRecords =
      (orders ?? []) as unknown as OrderRecord[];

    const formattedOrders = orderRecords.map(
      (order) => {
        const status =
          order.status?.toUpperCase() || "";

        let situation =
          "PEDIDO EN PROCESO";

        if (
          status === "COMPLETED" ||
          order.completed_at
        ) {
          situation = "PEDIDO COMPLETADO";
        } else if (
          status === "CANCELLED" ||
          status === "CANCELED"
        ) {
          situation = "PEDIDO CANCELADO";
        } else if (
          status === "FAILED" ||
          order.failed_at
        ) {
          situation = "PEDIDO FALLIDO";
        } else if (
          status === "REFUNDED" ||
          order.refunded_at
        ) {
          situation = "PEDIDO REEMBOLSADO";
        } else if (
          status === "PENDING"
        ) {
          situation = "PEDIDO PENDIENTE";
        } else if (
          status === "PROCESSING"
        ) {
          situation = "PEDIDO EN PROCESO";
        }

        return {
          id: order.id,
          game: order.game,
          category_id: order.category_id,
          offer_id: order.offer_id,
          offer_name: order.offer_name,
          player_id: order.player_id,
          retail_price: order.retail_price,
          supplier_price: order.supplier_price,
          currency: order.currency,
          status: order.status,
          supplier_order_id:
            order.supplier_order_id,
          supplier_fields:
            order.supplier_fields,
          refunded_at: order.refunded_at,
          completed_at: order.completed_at,
          failed_at: order.failed_at,
          created_at: order.created_at,
          updated_at: order.updated_at,
          situation,
        };
      }
    );

    const total =
      formattedOrders.length;

    const pending =
      formattedOrders.filter(
        (order) =>
          order.status?.toUpperCase() ===
            "PENDING" ||
          order.status?.toUpperCase() ===
            "PROCESSING"
      ).length;

    const completed =
      formattedOrders.filter(
        (order) =>
          order.status?.toUpperCase() ===
            "COMPLETED" ||
          order.completed_at !== null
      ).length;

    const cancelled =
      formattedOrders.filter(
        (order) => {
          const status =
            order.status?.toUpperCase();

          return (
            status === "CANCELLED" ||
            status === "CANCELED"
          );
        }
      ).length;

    const failed =
      formattedOrders.filter(
        (order) =>
          order.status?.toUpperCase() ===
            "FAILED" ||
          order.failed_at !== null
      ).length;

    const refunded =
      formattedOrders.filter(
        (order) =>
          order.status?.toUpperCase() ===
            "REFUNDED" ||
          order.refunded_at !== null
      ).length;

    return NextResponse.json({
      success: true,

      user: {
        id: user.id,
        email: user.email || null,
      },

      summary: {
        total,
        pending,
        completed,
        cancelled,
        failed,
        refunded,
      },

      /*
       * Aquí están incluidos también los pedidos
       * creados ANTES de existir la IA.
       */
      orders: formattedOrders,
    });
  } catch (error) {
    console.error(
      "Error inesperado en herramienta de pedidos:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Ocurrió un error al consultar los pedidos.",
      },
      { status: 500 }
    );
  }
      }
