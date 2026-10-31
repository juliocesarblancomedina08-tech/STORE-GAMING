
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const ADMIN_EMAIL = "juliocesarblancomedina08@gmail.com";

function responseError(message: string, status = 400) {
  return NextResponse.json(
    { success: false, error: message },
    { status }
  );
}

async function authenticateAdmin(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return {
      error: "Sesión no autorizada.",
      status: 401,
    };
  }

  const token = authorization.slice(7).trim();

  if (!token) {
    return {
      error: "Token de sesión ausente.",
      status: 401,
    };
  }

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    return {
      error: "La sesión no es válida o ha expirado.",
      status: 401,
    };
  }

  if (
    String(user.email || "").toLowerCase() !==
    ADMIN_EMAIL.toLowerCase()
  ) {
    return {
      error: "No tienes permisos de administrador.",
      status: 403,
    };
  }

  return { user };
}

// GET: consultar solicitudes
export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateAdmin(request);

    if ("error" in auth) {
      return responseError(auth.error, auth.status);
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "pending";

    let query = supabaseAdmin
      .from("manual_orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (status !== "all") {
      if (!["pending", "approved", "rejected"].includes(status)) {
        return responseError("Filtro de estado no válido.");
      }

      query = query.eq("status", status);
    }

    const { data: orders, error } = await query;

    if (error) {
      console.error("Manual orders GET:", error);
      return responseError(
        "No se pudieron consultar las solicitudes.",
        500
      );
    }

    const enrichedOrders = await Promise.all(
      (orders || []).map(async (order) => {
        let username: string | null = null;
        let email: string | null = null;

        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("email")
          .eq("id", order.user_id)
          .maybeSingle();

        if (profile?.email) {
          email = profile.email;
        }

        if (!email) {
          const { data: userData } =
            await supabaseAdmin.auth.admin.getUserById(
              order.user_id
            );

          email = userData?.user?.email || null;
        }

        return {
          ...order,
          email,
          username,
        };
      })
    );

    return NextResponse.json({
      success: true,
      orders: enrichedOrders,
    });
  } catch (error) {
    console.error("Manual orders GET error:", error);

    return responseError(
      "Error interno al consultar las solicitudes.",
      500
    );
  }
}

// POST: aprobar o rechazar solicitudes
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateAdmin(request);

    if ("error" in auth) {
      return responseError(auth.error, auth.status);
    }

    let body: {
      orderId?: string;
      action?: string;
      adminNote?: string;
    };

    try {
      body = await request.json();
    } catch {
      return responseError("El contenido enviado no es válido.");
    }

    const orderId = String(body.orderId || "").trim();
    const action = String(body.action || "").trim();

    const adminNote =
      typeof body.adminNote === "string"
        ? body.adminNote.trim().slice(0, 1000)
        : null;

    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (!uuidPattern.test(orderId)) {
      return responseError("Identificador de solicitud no válido.");
    }

    if (!["approve", "reject"].includes(action)) {
      return responseError("Acción no permitida.");
    }

    const { data, error } = await supabaseAdmin.rpc(
      "process_manual_order",
      {
        p_order_id: orderId,
        p_admin_id: auth.user.id,
        p_action: action,
        p_admin_note: adminNote,
      }
    );

    if (error) {
      console.error("Manual order RPC:", error);

      return responseError(
        error.message || "No se pudo procesar la solicitud.",
        400
      );
    }

    return NextResponse.json({
      success: true,
      message:
        action === "approve"
          ? "Solicitud aprobada y balance acreditado."
          : "Solicitud rechazada.",
      result: data,
    });
  } catch (error) {
    console.error("Manual orders POST error:", error);

    return responseError(
      "Error interno al procesar la solicitud.",
      500
    );
  }
}
