
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_AMOUNT_CUP = 100000000;

async function authenticateUser(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization.slice(7).trim();

  if (!token) return null;

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) return null;

  return user;
}

export async function POST(request: NextRequest) {
  try {
    const user = await authenticateUser(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Sesión no válida. Inicia sesión nuevamente.",
          code: "UNAUTHORIZED",
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const amountCup = Number(body.amount_cup);

    if (
      !Number.isFinite(amountCup) ||
      amountCup <= 0 ||
      amountCup > MAX_AMOUNT_CUP
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "El importe indicado no es válido.",
        },
        { status: 400 }
      );
    }

    const { data: settings, error: settingsError } =
      await supabaseAdmin
        .from("manual_payment_settings")
        .select("transfer_exchange_rate")
        .eq("id", 1)
        .single();

    if (settingsError || !settings) {
      return NextResponse.json(
        {
          success: false,
          error: "No se pudo cargar la tasa de prueba.",
        },
        { status: 500 }
      );
    }

    const exchangeRate = Number(
      settings.transfer_exchange_rate
    );

    if (
      !Number.isFinite(exchangeRate) ||
      exchangeRate <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "La tasa de prueba no está configurada.",
        },
        { status: 500 }
      );
    }

    const balanceAmount = Number(
      (amountCup / exchangeRate).toFixed(4)
    );

    const { data: order, error: insertError } =
      await supabaseAdmin
        .from("manual_orders")
        .insert({
          user_id: user.id,
          method: "transferencia_cup",
          amount_cup: amountCup,
          exchange_rate: exchangeRate,
          balance_amount: balanceAmount,
          confirmation_number: null,
          receipt_url: null,
          status: "pending",
          admin_note:
            "MODO DEMOSTRACIÓN: solicitud de prueba. No acredita fondos.",
        })
        .select(
          "id, amount_cup, exchange_rate, balance_amount, status, created_at"
        )
        .single();

    if (insertError || !order) {
      console.error(
        "Error creando solicitud TRANSFERENCIA CUP:",
        insertError
      );

      return NextResponse.json(
        {
          success: false,
          error: "No se pudo registrar la solicitud.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        demo_mode: true,
        message: "Solicitud de prueba registrada.",
        order,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Error en TRANSFERENCIA CUP:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Ocurrió un error al registrar la solicitud.",
      },
      { status: 500 }
    );
  }
}
