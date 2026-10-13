
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabase-admin";

type DepositRecord = {
  id: string;
  user_id: string;
  username: string | null;
  email: string | null;
  amount: number;
  currency: string;
  payment_method: string | null;
  network: string | null;
  status: string;
  created_at: string;
  confirmed_at: string | null;
  expires_at: string;
  credited_at: string | null;
};

export async function GET(request: NextRequest) {
  try {
    // 1. Verificar la sesión del usuario
    const authorization =
      request.headers.get("authorization") || "";

    if (!authorization.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "No autorizado." },
        { status: 401 }
      );
    }

    const accessToken = authorization
      .slice("Bearer ".length)
      .trim();

    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: "No autorizado." },
        { status: 401 }
      );
    }

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(accessToken);

    if (userError || !user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: "La sesión no es válida o ha expirado.",
        },
        { status: 401 }
      );
    }

    // 2. Leer filtros de consulta
    const { searchParams } = new URL(request.url);

    const depositId =
      searchParams.get("deposit_id")?.trim() || "";

    const limitParam =
      searchParams.get("limit")?.trim() || "100";

    let limit = Number.parseInt(limitParam, 10);

    if (!Number.isFinite(limit) || limit < 1) {
      limit = 100;
    }

    limit = Math.min(limit, 500);

    // 3. Consultar solo depósitos del usuario autenticado
    let query = supabaseAdmin
      .from("deposits")
      .select(
        [
          "id",
          "user_id",
          "username",
          "email",
          "amount",
          "currency",
          "payment_method",
          "network",
          "status",
          "created_at",
          "confirmed_at",
          "expires_at",
          "credited_at",
        ].join(", ")
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    // Buscar un depósito específico si se proporciona su UUID
    if (depositId) {
      const uuidPattern =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      if (!uuidPattern.test(depositId)) {
        return NextResponse.json(
          {
            success: false,
            error: "El identificador del depósito no es válido.",
          },
          { status: 400 }
        );
      }

      query = query.eq("id", depositId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error consultando depósitos:", error);

      return NextResponse.json(
        {
          success: false,
          error: "No fue posible consultar los depósitos.",
        },
        { status: 500 }
      );
    }

    const deposits = (data ?? []) as DepositRecord[];

    // 4. Normalizar estados sin confundir confirmación con acreditación
    const formattedDeposits = deposits.map((deposit) => {
      const status = deposit.status.toUpperCase();

      let situation = "ESTADO PENDIENTE DE REVISIÓN";

      if (deposit.credited_at) {
        situation = "DEPÓSITO ACREDITADO";
      } else if (status === "EXPIRED") {
        situation = "DEPÓSITO EXPIRADO, NO ACREDITADO";
      } else if (status === "CONFIRMED") {
        situation = "CONFIRMADO, PERO SIN ACREDITACIÓN REGISTRADA";
      } else if (
        status === "FAILED" ||
        status === "CANCELLED" ||
        status === "CANCELED"
      ) {
        situation = "DEPÓSITO FALLIDO O CANCELADO";
      } else if (status === "PENDING") {
        situation = "DEPÓSITO PENDIENTE";
      }

      return {
        id: deposit.id,
        amount: deposit.amount,
        currency: deposit.currency,
        payment_method: deposit.payment_method,
        network: deposit.network,
        status: deposit.status,
        created_at: deposit.created_at,
        confirmed_at: deposit.confirmed_at,
        expires_at: deposit.expires_at,
        credited_at: deposit.credited_at,
        situation,
      };
    });

    // 5. Resumen del historial consultado
    const summary = {
      total: formattedDeposits.length,
      credited: formattedDeposits.filter(
        (deposit) => deposit.credited_at !== null
      ).length,
      confirmedNotCredited: formattedDeposits.filter(
        (deposit) =>
          deposit.status.toUpperCase() === "CONFIRMED" &&
          deposit.credited_at === null
      ).length,
      expiredNotCredited: formattedDeposits.filter(
        (deposit) =>
          deposit.status.toUpperCase() === "EXPIRED" &&
          deposit.credited_at === null
      ).length,
      pending: formattedDeposits.filter(
        (deposit) =>
          deposit.status.toUpperCase() === "PENDING" &&
          deposit.credited_at === null
      ).length,
    };

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email || null,
      },
      summary,
      deposits: formattedDeposits,
    });
  } catch (error) {
    console.error("Error inesperado consultando depósitos:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Ocurrió un error al consultar los depósitos.",
      },
      { status: 500 }
    );
  }
}
