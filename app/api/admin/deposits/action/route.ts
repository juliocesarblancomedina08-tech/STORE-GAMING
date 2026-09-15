import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const ADMIN_EMAIL =
  "juliocesarblancomedina08@gmail.com";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const supabaseAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(
  request: NextRequest
) {
  try {
    const authorization =
      request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          error: "No autorizado.",
        },
        {
          status: 401,
        }
      );
    }

    const token = authorization.replace(
      "Bearer ",
      ""
    );

    const {
      data: {
        user,
      },
      error: userError,
    } = await supabaseAuth.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        {
          error: "Sesión inválida.",
        },
        {
          status: 401,
        }
      );
    }

    if (
      (user.email || "").toLowerCase() !==
      ADMIN_EMAIL.toLowerCase()
    ) {
      return NextResponse.json(
        {
          error: "No tienes permisos de administrador.",
        },
        {
          status: 403,
        }
      );
    }

    const body = await request.json();

    const depositId = body?.depositId;
    const action = body?.action;

    if (
      typeof depositId !== "string" ||
      !depositId
    ) {
      return NextResponse.json(
        {
          error: "ID de depósito inválido.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      action !== "CONFIRM" &&
      action !== "REJECT"
    ) {
      return NextResponse.json(
        {
          error: "Acción inválida.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * CONFIRMAR
     *
     * Utilizamos la función SQL segura que
     * creamos anteriormente.
     */
    if (action === "CONFIRM") {
      const {
        data,
        error,
      } = await supabaseAdmin.rpc(
        "confirm_deposit",
        {
          p_deposit_id: depositId,
        }
      );

      if (error) {
        console.error(error);

        return NextResponse.json(
          {
            error:
              error.message ||
              "No se pudo confirmar el depósito.",
          },
          {
            status: 400,
          }
        );
      }

      return NextResponse.json({
        success: true,
        action: "CONFIRMED",
        deposit: data,
      });
    }

    /*
     * RECHAZAR
     *
     * Un depósito rechazado nunca modifica
     * el balance.
     */
    const {
      data: rejectedDeposit,
      error: rejectError,
    } = await supabaseAdmin
      .from("deposits")
      .update({
        status: "REJECTED",
      })
      .eq("id", depositId)
      .eq("status", "PENDING")
      .select()
      .single();

    if (rejectError || !rejectedDeposit) {
      console.error(rejectError);

      return NextResponse.json(
        {
          error:
            "El depósito no existe, ya fue procesado o no pudo ser rechazado.",
        },
        {
          status: 400,
        }
      );
    }

    return NextResponse.json({
      success: true,
      action: "REJECTED",
      deposit: rejectedDeposit,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "Error interno del servidor.",
      },
      {
        status: 500,
      }
    );
  }
      }
