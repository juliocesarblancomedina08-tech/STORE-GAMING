
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { isAdminUser } from "../../../../lib/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TOPUP_FIELDS = `
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
`;

const GIFT_CARD_FIELDS = `
  id,
  user_id,
  username,
  email,
  game,
  category_id,
  card_id,
  offer_name,
  quantity,
  retail_price,
  supplier_price,
  status,
  supplier_order_id,
  supplier_response,
  gift_codes,
  refunded_at,
  completed_at,
  failed_at,
  created_at,
  updated_at
`;

const ALLOWED_STATUSES = [
  "PENDING",
  "COMPLETED",
  "REFUNDED",
  "CANCELLED",
] as const;

type OrderStatus = (typeof ALLOWED_STATUSES)[number];

function getBearerToken(request: NextRequest): string | null {
  const authorization = request.headers.get("authorization") || "";

  if (!authorization.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  return authorization.slice(7).trim() || null;
}

async function authorizeAdmin(request: NextRequest) {
  const accessToken = getBearerToken(request);

  if (!accessToken) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { ok: false, error: "No autorizado. Inicia sesión nuevamente." },
        { status: 401 }
      ),
    };
  }

  try {
    const authorized = await isAdminUser(accessToken);

    if (!authorized) {
      return {
        ok: false as const,
        response: NextResponse.json(
          {
            ok: false,
            error: "Acceso denegado. Solo un administrador puede realizar esta acción.",
          },
          { status: 403 }
        ),
      };
    }

    return { ok: true as const };
  } catch (error) {
    console.error("ERROR VERIFICANDO ADMIN:", error);

    return {
      ok: false as const,
      response: NextResponse.json(
        { ok: false, error: "No se pudo verificar el acceso de administrador." },
        { status: 500 }
      ),
    };
  }
}

/**
 * GET: carga recargas y tarjetas regalo.
 * orderType identifica la tabla de origen de cada orden.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authorizeAdmin(request);

    if (!auth.ok) return auth.response;

    const [topupsResult, giftCardsResult] = await Promise.all([
      supabaseAdmin
        .from("topup_orders")
        .select(TOPUP_FIELDS)
        .order("created_at", { ascending: false }),

      supabaseAdmin
        .from("gift_card_orders")
        .select(GIFT_CARD_FIELDS)
        .order("created_at", { ascending: false }),
    ]);

    if (topupsResult.error) {
      console.error("ERROR CARGANDO RECARGAS:", topupsResult.error);

      return NextResponse.json(
        { ok: false, error: "No se pudieron cargar las órdenes de recarga." },
        { status: 500 }
      );
    }

    if (giftCardsResult.error) {
      console.error("ERROR CARGANDO TARJETAS REGALO:", giftCardsResult.error);

      return NextResponse.json(
        {
          ok: false,
          error:
            "No se pudieron cargar las tarjetas regalo. Comprueba que las columnas de la tabla coincidan con la consulta.",
        },
        { status: 500 }
      );
    }

    const topups = (topupsResult.data || []).map((order) => ({
      ...order,
      orderType: "topup" as const,
      gift_codes: [],
    }));

    const giftCards = (giftCardsResult.data || []).map((order) => ({
      ...order,
      orderType: "gift_card" as const,
      offer_id: order.card_id,
      currency: "USD",
      player_id: null,
      supplier_fields: null,
    }));

    const orders = [...topups, ...giftCards].sort(
      (a, b) =>
        new Date(b.created_at).getTime() -
        new Date(a.created_at).getTime()
    );

    const totalAmount = orders.reduce(
      (total, order) => total + (Number(order.retail_price) || 0),
      0
    );

    return NextResponse.json({
      ok: true,
      orders,
      totalOrders: orders.length,
      totalAmount,
    });
  } catch (error) {
    console.error("ERROR API ADMIN ORDERS GET:", error);

    return NextResponse.json(
      { ok: false, error: "Error interno al cargar las órdenes." },
      { status: 500 }
    );
  }
}

/**
 * PATCH: actualiza el estado en la tabla original de la orden.
 * No realiza reembolsos de saldo automáticamente.
 */
export async function PATCH(request: NextRequest) {
  try {
    const auth = await authorizeAdmin(request);

    if (!auth.ok) return auth.response;

    let body: {
      orderId?: unknown;
      status?: unknown;
      orderType?: unknown;
    };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { ok: false, error: "El cuerpo de la solicitud no contiene JSON válido." },
        { status: 400 }
      );
    }

    const orderId =
      typeof body.orderId === "string" ? body.orderId.trim() : "";

    const requestedStatus =
      typeof body.status === "string"
        ? body.status.trim().toUpperCase()
        : "";

    const orderType =
      typeof body.orderType === "string" ? body.orderType : "topup";

    if (!orderId) {
      return NextResponse.json(
        { ok: false, error: "Falta el identificador de la orden." },
        { status: 400 }
      );
    }

    if (orderType !== "topup" && orderType !== "gift_card") {
      return NextResponse.json(
        { ok: false, error: "Tipo de orden inválido." },
        { status: 400 }
      );
    }

    if (!ALLOWED_STATUSES.includes(requestedStatus as OrderStatus)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Estado inválido. Usa PENDING, COMPLETED, REFUNDED o CANCELLED.",
        },
        { status: 400 }
      );
    }

    const status = requestedStatus as OrderStatus;
    const now = new Date().toISOString();

    const updateData: Record<string, string | null> = {
      status,
      updated_at: now,
    };

    if (status === "COMPLETED") {
      updateData.completed_at = now;
    } else if (status === "REFUNDED") {
      updateData.refunded_at = now;
    } else if (status === "CANCELLED") {
      updateData.failed_at = now;
    }

    const table =
      orderType === "gift_card" ? "gift_card_orders" : "topup_orders";

    const selectFields =
      orderType === "gift_card" ? GIFT_CARD_FIELDS : TOPUP_FIELDS;

    const { data: order, error } = await supabaseAdmin
      .from(table)
      .update(updateData)
      .eq("id", orderId)
      .select(selectFields)
      .maybeSingle();

    if (error) {
      console.error("ERROR ACTUALIZANDO ORDEN ADMIN:", error);

      return NextResponse.json(
        { ok: false, error: "No se pudo actualizar el estado de la orden." },
        { status: 500 }
      );
    }

    if (!order) {
      return NextResponse.json(
        { ok: false, error: "No se encontró la orden indicada." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Estado actualizado. Este cambio no realiza un reembolso de saldo.",
      order: {
        ...order,
        orderType,
        ...(orderType === "gift_card"
          ? {
              offer_id: "card_id" in order ? order.card_id : null,
              currency: "USD",
              player_id: null,
              supplier_fields: null,
            }
          : { gift_codes: [] }),
      },
    });
  } catch (error) {
    console.error("ERROR API ADMIN ORDERS PATCH:", error);

    return NextResponse.json(
      { ok: false, error: "Error interno al actualizar la orden." },
      { status: 500 }
    );
  }
}
