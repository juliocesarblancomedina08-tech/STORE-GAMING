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

export async function GET(request: NextRequest) {
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

    const {
      data: deposits,
      error,
    } = await supabaseAdmin
      .from("deposits")
      .select(
        "id,user_id,amount,network,address,status,created_at"
      )
      .eq("status", "PENDING")
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error(error);

      return NextResponse.json(
        {
          error:
            "No se pudieron cargar los depósitos.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      deposits: deposits || [],
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
