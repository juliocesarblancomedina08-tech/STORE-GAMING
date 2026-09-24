import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabase-admin";

type DepositRecord = {
  id: string;
  user_id: string;
  username: string | null;
  email: string | null;
  amount: number;
  currency: string | null;
  payment_method: string | null;
  network: string | null;
  wallet_address: string | null;
  tx_hash: string | null;
  status: string | null;
  created_at: string | null;
  confirmed_at: string | null;
  expires_at: string | null;
  credited_at: string | null;
};

export async function GET(request: NextRequest) {
  try {
    // =========================================================
    // 1. COMPROBAR SESIÓN
    // =========================================================

    const authorization =
      request.headers.get("authorization") || "";

    if (!authorization.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          success: false,
          error: "No autorizado.",
        },
        { status: 401 }
      );
    }

    const accessToken = authorization
      .replace("Bearer ", "")
      .trim();

    if (!accessToken) {
      return NextResponse.json(
        {
          success: false,
          error: "No autorizado.",
        },
        { status: 401 }
      );
    }

    // =========================================================
    // 2. OBTENER USUARIO AUTENTICADO
    // =========================================================

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

    const userId = user.id;

    // =========================================================
    // 3. PARÁMETROS OPCIONALES
    // =========================================================

    const { searchParams } = new URL(request.url);

    const depositId =
      searchParams.get("deposit_id")?.trim() || "";

    const limitParam =
      searchParams.get("limit")?.trim() || "10";

    let limit = Number.parseInt(limitParam, 10);

    if (!Number.isFinite(limit) || limit <= 0) {
      limit = 10;
    }

    if (limit > 20) {
      limit = 20;
    }

    // =========================================================
    // 4. BUSCAR DEPÓSITOS
    //
    // SIEMPRE se filtra por el usuario autenticado.
    // =========================================================

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
          "wallet_address",
          "tx_hash",
          "status",
          "created_at",
          "confirmed_at",
          "expires_at",
          "credited_at",
        ].join(", ")
      )
      .eq("user_id", userId)
      .order("created_at", {
        ascending: false,
      })
      .limit(limit);

    // =========================================================
    // 5. DEPÓSITO ESPECÍFICO
    // =========================================================

    if (depositId) {
      query = query.eq("id", depositId);
    }

    const {
      data: deposits,
      error: depositsError,
    } = await query;

    if (depositsError) {
      console.error(
        "Error buscando depósitos:",
        depositsError
      );

      return NextResponse.json(
        {
          success: false,
          error: "No fue posible consultar los depósitos.",
        },
        { status: 500 }
      );
    }

    // =========================================================
    // 6. TIPAR LOS REGISTROS
    // =========================================================

    const depositRecords =
      (deposits ?? []) as unknown as DepositRecord[];

    // =========================================================
    // 7. PREPARAR INFORMACIÓN PARA LA IA
    // =========================================================

    const formattedDeposits = depositRecords.map(
      (deposit) => {
        /*
         * IMPORTANTE:
         * credited_at es la referencia principal para saber
         * si el saldo fue acreditado.
         *
         * No dependemos únicamente de confirmed_at porque
         * existe en la base de datos un caso real donde:
         *
         * status = CONFIRMED
         * confirmed_at = NULL
         * credited_at = fecha
         */

        const credited =
          deposit.credited_at !== null;

        const confirmed =
          deposit.confirmed_at !== null;

        let situation =
          "DEPÓSITO SIN ACREDITAR";

        if (credited) {
          situation = "DEPÓSITO ACREDITADO";
        } else if (
          deposit.status === "EXPIRED"
        ) {
          situation = "DEPÓSITO EXPIRADO";
        } else if (
          deposit.status === "CONFIRMED"
        ) {
          situation =
            "CONFIRMADO PERO NO APARECE COMO ACREDITADO";
        }

        return {
          id: deposit.id,
          amount: deposit.amount,
          currency: deposit.currency,
          payment_method:
            deposit.payment_method,
          network: deposit.network,
          tx_hash: deposit.tx_hash,
          status: deposit.status,
          created_at: deposit.created_at,
          confirmed_at: deposit.confirmed_at,
          expires_at: deposit.expires_at,
          credited_at: deposit.credited_at,

          confirmed,
          credited,
          situation,
        };
      }
    );

    // =========================================================
    // 8. RESUMEN
    // =========================================================

    const total = formattedDeposits.length;

    const creditedCount =
      formattedDeposits.filter(
        (deposit) => deposit.credited
      ).length;

    const notCreditedCount =
      formattedDeposits.filter(
        (deposit) => !deposit.credited
      ).length;

    // =========================================================
    // 9. RESPUESTA
    // =========================================================

    return NextResponse.json({
      success: true,

      user: {
        id: user.id,
        email: user.email || null,
      },

      summary: {
        total,
        credited: creditedCount,
        not_credited: notCreditedCount,
      },

      deposits: formattedDeposits,
    });
  } catch (error) {
    console.error(
      "Error inesperado en herramienta de depósitos:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Ocurrió un error al consultar los depósitos.",
      },
      { status: 500 }
    );
  }
          }
