import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

async function authenticateUser(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization.slice(7);

  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) {
    return null;
  }

  return data.user;
}

export async function POST(request: NextRequest) {
  try {
    const user = await authenticateUser(request);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Sesión no válida. Inicia sesión nuevamente."
        },
        { status: 401 }
      );
    }

    const body = await request.json();

    const amountCup = Number(body.amount_cup);

    const senderPhone =
      typeof body.sender_phone === "string"
        ? body.sender_phone.trim()
        : "";

    if (
      !Number.isFinite(amountCup) ||
      amountCup <= 0 ||
      amountCup > 100000000
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "El importe en CUP no es válido."
        },
        { status: 400 }
      );
    }

    if (
      !senderPhone ||
      senderPhone.length < 5 ||
      senderPhone.length > 30
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Introduce un número válido del remitente."
        },
        { status: 400 }
      );
    }

    if (!/^[0-9+\-()\s]+$/.test(senderPhone)) {
      return NextResponse.json(
        {
          success: false,
          error: "El número del remitente contiene caracteres no válidos."
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
      console.error("Transfer CUP rate:", settingsError);

      return NextResponse.json(
        {
          success: false,
          error: "No se pudo consultar la tasa de transferencia."
        },
        { status: 500 }
      );
    }

    const exchangeRate = Number(settings.transfer_exchange_rate);

    if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "La tasa de transferencia configurada no es válida."
        },
        { status: 500 }
      );
    }

    // El cálculo se realiza en el servidor.
    const balanceAmount = Number(
      (amountCup / exchangeRate).toFixed(4)
    );

    if (!Number.isFinite(balanceAmount) || balanceAmount <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No se pudo calcular el balance."
        },
        { status: 400 }
      );
    }

    const { data: order, error: insertError } =
      await supabaseAdmin
        .from("transfer_cup_orders")
        .insert({
          user_id: user.id,
          amount_cup: amountCup,
          exchange_rate: exchangeRate,
          balance_amount: balanceAmount,
          sender_phone: senderPhone,
          status: "pending"
        })
        .select(
          "id, amount_cup, exchange_rate, balance_amount, sender_phone, status, created_at"
        )
        .single();

    if (insertError || !order) {
      console.error("Error creando transfer_cup_order:", insertError);

      return NextResponse.json(
        {
          success: false,
          error: "No se pudo crear el pedido de transferencia."
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Pedido creado. Ahora puedes adjuntar el comprobante.",
      order
    });

  } catch (error) {
    console.error("Transfer CUP orders POST:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Error interno del servidor."
      },
      { status: 500 }
    );
  }
       }
