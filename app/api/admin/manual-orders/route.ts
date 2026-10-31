
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const ADMIN_EMAIL = "juliocesarblancomedina08@gmail.com";
const RECEIPT_BUCKET = "manual-payment-receipts";
const SIGNED_URL_SECONDS = 600;

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

// GET: consultar solicitudes y generar enlaces temporales
// para visualizar los comprobantes privados.
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
        let receipt_signed_url: string | null = null;
        let receipt_error: string | null = null;

        // Obtener información del cliente.
        const { data: profile, error: profileError } =
          await supabaseAdmin
            .from("profiles")
            .select("email")
            .eq("id", order.user_id)
            .maybeSingle();

        if (profileError) {
          console.error(
            "Manual order profile lookup:",
            profileError
          );
        }

        if (profile?.email) {
          email = profile.email;
        }

        if (!email) {
          const { data: userData, error: userError } =
            await supabaseAdmin.auth.admin.getUserById(
              order.user_id
            );

          if (userError) {
            console.error(
              "Manual order user lookup:",
              userError
            );
          }

          email = userData?.user?.email || null;
        }

        // receipt_url almacena la ruta del objeto,
        // no una URL pública.
        if (
          typeof order.receipt_url === "string" &&
          order.receipt_url.trim()
        ) {
          const receiptPath = order.receipt_url.trim();

          // Comprobar que el archivo pertenece al usuario
          // y a la solicitud correspondiente.
          const expectedPrefix =
            `${order.user_id}/${order.id}/`;

          if (!receiptPath.startsWith(expectedPrefix)) {
            receipt_error =
              "La ruta del comprobante no es válida.";
          } else {
            const {
              data: signedData,
              error: signedError,
            } = await supabaseAdmin.storage
              .from(RECEIPT_BUCKET)
              .createSignedUrl(
                receiptPath,
                SIGNED_URL_SECONDS
              );

            if (signedError || !signedData?.signedUrl) {
              console.error(
                "Manual order signed URL:",
                signedError
              );

              receipt_error =
                "No se pudo generar el enlace del comprobante.";
            } else {
              receipt_signed_url = signedData.signedUrl;
            }
          }
        }

        return {
          ...order,
          email,
          username,
          receipt_signed_url,
          receipt_error,
        };
      })
    );

    return NextResponse.json(
      {
        success: true,
        orders: enrichedOrders,
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      }
    );
  } catch (error) {
    console.error("Manual orders GET error:", error);

    return responseError(
      "Error interno al consultar las solicitudes.",
      500
    );
  }
}

// POST: aprobar o rechazar solicitudes.
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
      return responseError(
        "El contenido enviado no es válido."
      );
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
      return responseError(
        "Identificador de solicitud no válido."
      );
    }

    if (!["approve", "reject"].includes(action)) {
      return responseError("Acción no permitida.");
    }

    // Verificar que la solicitud exista antes de procesarla.
    const { data: order, error: orderError } =
      await supabaseAdmin
        .from("manual_orders")
        .select("id, status, receipt_url")
        .eq("id", orderId)
        .maybeSingle();

    if (orderError) {
      console.error(
        "Manual order lookup POST:",
        orderError
      );

      return responseError(
        "No se pudo verificar la solicitud.",
        500
      );
    }

    if (!order) {
      return responseError(
        "La solicitud no existe.",
        404
      );
    }

    if (order.status !== "pending") {
      return responseError(
        "Esta solicitud ya fue procesada."
      );
    }

    if (action === "approve") {
      if (
        typeof order.receipt_url !== "string" ||
        !order.receipt_url.trim()
      ) {
        return responseError(
          "No se puede aprobar una solicitud sin comprobante."
        );
      }

      const expectedPrefix =
        `${auth.user.id}/${orderId}/`;

      // La ruta del comprobante pertenece al cliente,
      // no al administrador. La comprobación correcta
      // de su propietario se realiza mediante la solicitud.
      const { data: fullOrder } = await supabaseAdmin
        .from("manual_orders")
        .select("user_id, receipt_url")
        .eq("id", orderId)
        .single();

      if (
        !fullOrder?.user_id ||
        !fullOrder.receipt_url ||
        !fullOrder.receipt_url.startsWith(
          `${fullOrder.user_id}/${orderId}/`
        )
      ) {
        return responseError(
          "El comprobante no tiene una ruta válida."
        );
      }
    }

    // La función SQL comprueba el administrador,
    // bloquea la solicitud y evita acreditaciones duplicadas.
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
        error.message ||
          "No se pudo procesar la solicitud.",
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
