
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ADMIN_EMAIL = "juliocesarblancomedina08@gmail.com";

async function authenticateAdmin(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization.slice(7);

  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) {
    return null;
  }

  if (
    (data.user.email || "").toLowerCase() !==
    ADMIN_EMAIL.toLowerCase()
  ) {
    return null;
  }

  return data.user;
}

// Consultar la tasa y el número de transferencia.
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("manual_payment_settings")
      .select("exchange_rate, transfer_phone, updated_at")
      .eq("id", 1)
      .single();

    if (error || !data) {
      return NextResponse.json(
        {
          success: false,
          error: "No se pudo obtener la configuración del pago.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      settings: {
        exchange_rate: Number(data.exchange_rate),
        transfer_phone: data.transfer_phone,
        updated_at: data.updated_at,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}

// Actualizar la tasa y el número de transferencia.
// Solo puede hacerlo el administrador autorizado.
export async function PATCH(request: NextRequest) {
  try {
    const admin = await authenticateAdmin(request);

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          error: "No tienes autorización para modificar esta configuración.",
        },
        { status: 401 }
      );
    }

    const body = await request.json();

    const exchangeRate = Number(body.exchange_rate);
    const transferPhone =
      body.transfer_phone === undefined
        ? undefined
        : String(body.transfer_phone).trim();

    if (
      !Number.isFinite(exchangeRate) ||
      exchangeRate <= 0 ||
      exchangeRate > 100000000
    ) {
      return NextResponse.json(
        { success: false, error: "La tasa de cambio no es válida." },
        { status: 400 }
      );
    }

    if (
      transferPhone !== undefined &&
      (transferPhone.length < 5 || transferPhone.length > 30)
    ) {
      return NextResponse.json(
        { success: false, error: "El número de transferencia no es válido." },
        { status: 400 }
      );
    }

    const updateData: {
      exchange_rate: number;
      updated_at: string;
      updated_by: string;
      transfer_phone?: string;
    } = {
      exchange_rate: exchangeRate,
      updated_at: new Date().toISOString(),
      updated_by: admin.id,
    };

    if (transferPhone !== undefined) {
      updateData.transfer_phone = transferPhone;
    }

    const { data, error } = await supabaseAdmin
      .from("manual_payment_settings")
      .update(updateData)
      .eq("id", 1)
      .select("exchange_rate, transfer_phone, updated_at")
      .single();

    if (error || !data) {
      return NextResponse.json(
        {
          success: false,
          error: "No se pudo guardar la configuración.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Configuración actualizada correctamente.",
      settings: {
        exchange_rate: Number(data.exchange_rate),
        transfer_phone: data.transfer_phone,
        updated_at: data.updated_at,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}
