
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabase-admin";

export const dynamic = "force-dynamic";

const ADMIN_EMAIL = "juliocesarblancomedina08@gmail.com";

function jsonError(message: string, status: number) {
  return NextResponse.json(
    { ok: false, error: message },
    { status }
  );
}

export async function POST(request: NextRequest) {
  try {
    // 1. Verificar el token de sesión
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return jsonError("No has iniciado sesión.", 401);
    }

    const token = authorization.slice(7).trim();

    if (!token) {
      return jsonError("Token de sesión vacío.", 401);
    }

    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return jsonError("La sesión no es válida o ha caducado.", 401);
    }

    // 2. Verificar que sea el administrador
    if (user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      return jsonError("No tienes permiso para ajustar saldos.", 403);
    }

    // 3. Leer y validar los datos
    let body: {
      userId?: unknown;
      amount?: unknown;
      action?: unknown;
    };

    try {
      body = await request.json();
    } catch {
      return jsonError("El cuerpo de la solicitud no es JSON válido.", 400);
    }

    const userId =
      typeof body.userId === "string" ? body.userId.trim() : "";

    const amountText =
      typeof body.amount === "string" ||
      typeof body.amount === "number"
        ? String(body.amount).trim()
        : "";

    const action = body.action;

    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidPattern.test(userId)) {
      return jsonError("El identificador del usuario no es válido.", 400);
    }

    if (action !== "ADD" && action !== "SUBTRACT") {
      return jsonError("La operación debe ser ADD o SUBTRACT.", 400);
    }

    // Acepta cantidades positivas con un máximo de 4 decimales.
    // Se conserva como texto para evitar redondeos innecesarios en JavaScript.
    if (!/^\d+(?:\.\d{1,4})?$/.test(amountText)) {
      return jsonError(
        "Introduce una cantidad válida con un máximo de 4 decimales.",
        400
      );
    }

    const amountNumber = Number(amountText);

    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      return jsonError("La cantidad debe ser mayor que cero.", 400);
    }

    // 4. Ejecutar el ajuste atómico en Supabase.
    // La función también registra la transacción en el historial.
    const { data, error } = await supabaseAdmin.rpc(
      "store_gaming_admin_adjust_balance",
      {
        p_user_id: userId,
        p_amount: amountText,
        p_action: action,
      }
    );

    if (error) {
      console.error("Error en ajuste de saldo:", error);

      const message = error.message || "";

      if (message.includes("saldo suficiente")) {
        return jsonError("El usuario no tiene saldo suficiente.", 400);
      }

      if (message.includes("No se encontró el usuario")) {
        return jsonError("No se encontró el usuario seleccionado.", 404);
      }

      if (
        message.includes("cantidad") ||
        message.includes("positiva") ||
        message.includes("decimales")
      ) {
        return jsonError(message, 400);
      }

      return jsonError(
        "No se pudo ajustar el saldo. Revisa los registros de Supabase.",
        500
      );
    }

    if (!data || data.ok !== true) {
      return jsonError("Supabase no confirmó el ajuste de saldo.", 500);
    }

    // 5. Responder con los saldos confirmados por la base de datos.
    return NextResponse.json({
      ok: true,
      message:
        action === "ADD"
          ? "Saldo agregado correctamente."
          : "Saldo restado correctamente.",
      client: {
        id: data.userId,
        balance: data.balanceAfter,
      },
      transaction: {
        action: data.action,
        amount: data.amount,
        balanceBefore: data.balanceBefore,
        balanceAfter: data.balanceAfter,
      },
    });
  } catch (error) {
    console.error("Error inesperado al ajustar saldo:", error);

    return jsonError("Ocurrió un error interno al ajustar el saldo.", 500);
  }
}
