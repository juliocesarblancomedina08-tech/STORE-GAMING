import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { isAdminUser } from "../../../../lib/admin";

function getBearerToken(request: NextRequest) {
  const authorization =
    request.headers.get("authorization") || "";

  if (
    !authorization
      .toLowerCase()
      .startsWith("bearer ")
  ) {
    return null;
  }

  return authorization
    .slice(7)
    .trim() || null;
}

export async function GET(
  request: NextRequest
) {
  try {
    const accessToken =
      getBearerToken(request);

    if (!accessToken) {
      return NextResponse.json(
        {
          error: "No autorizado.",
        },
        { status: 401 }
      );
    }

    const authorized =
      await isAdminUser(accessToken);

    if (!authorized) {
      return NextResponse.json(
        {
          error: "Acceso denegado.",
        },
        { status: 403 }
      );
    }

    const {
      data,
      error,
    } = await supabaseAdmin
      .from("topup_orders")
      .select(
        `
          id,
          user_id,
          username,
          email,
          game,
          category_id,
          offer_id,
          offer_name,
          player_id,
          retail_price,
          supplier_price,
          currency,
          status,
          supplier_order_id,
          supplier_fields,
          supplier_response,
          refunded_at,
          completed_at,
          failed_at,
          created_at,
          updated_at
        `
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      );

    if (error) {
      console.error(
        "ERROR CARGANDO ÓRDENES ADMIN:",
        error
      );

      return NextResponse.json(
        {
          error:
            "No se pudieron cargar las órdenes.",
        },
        { status: 500 }
      );
    }

    const orders = data || [];

    const totalOrders =
      orders.length;

    const totalAmount =
      orders.reduce(
        (total, order) =>
          total +
          (Number(
            order.retail_price
          ) || 0),
        0
      );

    return NextResponse.json({
      ok: true,
      orders,
      totalOrders,
      totalAmount,
    });
  } catch (error) {
    console.error(
      "ERROR API ADMIN ORDERS:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Error interno del servidor.",
      },
      { status: 500 }
    );
  }
}
