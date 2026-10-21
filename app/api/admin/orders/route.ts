
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { isAdminUser } from "../../../../lib/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ORDER_FIELDS = `
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
          { ok: false, error: "Acceso denegado. Solo un administrador puede realizar esta acción." },
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
 * GET: carga las órdenes para el panel de administración.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authorizeAdmin(request);

    if (!auth.ok) {
      return auth.response;
    }

    const { data, error } = await supabaseAdmin
      .from("topup_orders")
      .select(ORDER_FIELDS)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("ERROR CARGANDO ÓRDENES ADMIN:", error);

      return NextResponse.json(
        { ok: false, error: "No se pudieron cargar las órdenes." },
        { status: 500 }
      );
    }

    const orders = data || [];

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
 * PATCH: actualiza manualmente el estado de una orden.
 * Recibe: { orderId: string, status: OrderStatus }
 */
export async function PATCH(request: NextRequest) {
  try {
    const auth = await authorizeAdmin(request);

    if (!auth.ok) {
      return auth.response;
    }

    let body: { orderId?: unknown; status?: unknown };

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

    if (!orderId) {
      return NextResponse.json(
        { ok: false, error: "Falta el identificador de la orden (orderId)." },
        { status: 400 }
      );
    }

    if (
      !ALLOWED_STATUSES.includes(requestedStatus as OrderStatus)
    ) {
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

    const updateData: Record<string, string> = {
      status,
      updated_at: now,
    };

    // Registra la fecha correspondiente al estado seleccionado.
    if (status === "COMPLETED") {
      updateData.completed_at = now;
    } else if (status === "REFUNDED") {
      updateData.refunded_at = now;
    } else if (status === "CANCELLED") {
      updateData.failed_at = now;
    }

    const { data: order, error } = await supabaseAdmin
      .from("topup_orders")
      .update(updateData)
      .eq("id", orderId)
      .select(ORDER_FIELDS)
      .maybeSingle();

    if (error) {
      console.error("ERROR ACTUALIZANDO ORDEN ADMIN:", error);

      return NextResponse.json(
        {
          ok: false,
          error: "No se pudo actualizar la orden. Comprueba los campos de la tabla.",
        },
        { status: 500 }
      );
    }

    if (!order) {
      return NextResponse.json(
        { ok: false, error: "No se encontró ninguna orden con ese identificador." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Estado de la orden actualizado correctamente.",
      order,
    });
  } catch (error) {
    console.error("ERROR API ADMIN ORDERS PATCH:", error);

    return NextResponse.json(
      { ok: false, error: "Error interno al actualizar la orden." },
      { status: 500 }
    );
  }
}
