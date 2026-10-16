import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "";

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const ADMIN_EMAIL = "juliocesarblancomedina08@gmail.com";

export async function GET(request: NextRequest) {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: "Falta configurar Supabase en el servidor.",
        },
        { status: 500 }
      );
    }

    const authorization = request.headers.get("authorization");
    const token = authorization?.startsWith("Bearer ")
      ? authorization.slice(7)
      : "";

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: "Sesión no autorizada.",
        },
        { status: 401 }
      );
    }

    const supabaseAdmin = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Verificar el token con Supabase Auth.
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: "La sesión ha caducado o no es válida.",
        },
        { status: 401 }
      );
    }

    if (
      user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "No tienes permiso para consultar los clientes.",
        },
        { status: 403 }
      );
    }

    // Obtener todos los usuarios de Auth.
    const clients: {
      id: string;
      email: string;
      created_at: string;
      name: string;
      email_confirmed: boolean;
    }[] = [];

    let page = 1;
    const perPage = 1000;

    while (true) {
      const {
        data: { users },
        error,
      } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage,
      });

      if (error) {
        console.error(
          "Error consultando usuarios:",
          error.message
        );

        return NextResponse.json(
          {
            success: false,
            error: "No se pudieron cargar los clientes.",
          },
          { status: 500 }
        );
      }

      for (const client of users) {
        clients.push({
          id: client.id,
          email: client.email || "",
          created_at: client.created_at,
          name:
            client.user_metadata?.full_name ||
            client.user_metadata?.name ||
            client.user_metadata?.username ||
            "",
          email_confirmed: Boolean(client.email_confirmed_at),
        });
      }

      if (users.length < perPage) break;

      page++;
    }

    // Ordenar desde el registro más reciente.
    clients.sort(
      (a, b) =>
        new Date(b.created_at).getTime() -
        new Date(a.created_at).getTime()
    );

    return NextResponse.json(
      {
        success: true,
        total: clients.length,
        clients,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Error en API de clientes:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Error interno al consultar los clientes.",
      },
      { status: 500 }
    );
  }
            }
