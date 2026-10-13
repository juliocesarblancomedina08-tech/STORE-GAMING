
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_PAGE_SIZE = 100;
const SUPPORT_ADMIN_EMAIL = "juliocesarblancomedina08@gmail.com";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type SupportTicket = {
  id: string;
  user_id: string;
  username: string | null;
  email: string | null;
  category: string | null;
  subject: string | null;
  message: string | null;
  conversation: unknown;
  status: string | null;
  created_at: string;
  updated_at: string;
};

function getBearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");

  if (!authorization) return null;

  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

function getAdminIds(): string[] {
  return (process.env.SUPPORT_ADMIN_USER_IDS || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

function isSupportAdmin(user: {
  id: string;
  email?: string;
}): boolean {
  const email = user.email?.trim().toLowerCase();

  return (
    email === SUPPORT_ADMIN_EMAIL.toLowerCase() ||
    getAdminIds().includes(user.id)
  );
}

export async function GET(request: NextRequest) {
  try {
    // 1. Obtener el token de sesión.
    const token = getBearerToken(request);

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: "No autorizado. Inicia sesión para continuar.",
        },
        { status: 401 }
      );
    }

    // 2. Validar el token con Supabase Auth.
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: "La sesión no es válida o ha expirado.",
        },
        { status: 401 }
      );
    }

    // 3. Verificar el administrador usando los datos autenticados.
    const isAdmin = isSupportAdmin({
      id: user.id,
      email: user.email,
    });

    // 4. Leer y validar los filtros.
    const { searchParams } = new URL(request.url);

    const requestedUserId =
      searchParams.get("user_id")?.trim() || null;

    if (requestedUserId && !UUID_PATTERN.test(requestedUserId)) {
      return NextResponse.json(
        {
          success: false,
          error: "El identificador del usuario no es válido.",
        },
        { status: 400 }
      );
    }

    // Los clientes solo pueden consultar sus propios tickets.
    let finalUserId: string;

    if (isAdmin) {
      // El administrador puede ver todos los tickets o filtrar por usuario.
      finalUserId = requestedUserId || "";
    } else {
      if (requestedUserId && requestedUserId !== user.id) {
        return NextResponse.json(
          {
            success: false,
            error: "No tienes permiso para consultar estos tickets.",
          },
          { status: 403 }
        );
      }

      finalUserId = user.id;
    }

    // 5. Configurar la paginación.
    const pageParam = Number.parseInt(
      searchParams.get("page") || "1",
      10
    );

    const limitParam = Number.parseInt(
      searchParams.get("limit") || "50",
      10
    );

    const page =
      Number.isSafeInteger(pageParam) && pageParam > 0
        ? Math.min(pageParam, 1000000)
        : 1;

    const limit =
      Number.isSafeInteger(limitParam) && limitParam > 0
        ? Math.min(limitParam, MAX_PAGE_SIZE)
        : 50;

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // 6. Consultar los tickets.
    let query = supabaseAdmin
      .from("support_tickets")
      .select(
        "id, user_id, username, email, category, subject, message, conversation, status, created_at, updated_at",
        { count: "exact" }
      )
      .order("updated_at", { ascending: false })
      .range(from, to);

    // Solo se filtra por user_id cuando corresponde.
    // El administrador sin filtro obtiene tickets de todos los clientes.
    if (finalUserId) {
      query = query.eq("user_id", finalUserId);
    }

    const {
      data: ticketsData,
      error: ticketsError,
      count,
    } = await query;

    if (ticketsError) {
      console.error(
        "Error consultando tickets de soporte:",
        ticketsError
      );

      return NextResponse.json(
        {
          success: false,
          error: "No se pudieron obtener los tickets de soporte.",
        },
        { status: 500 }
      );
    }

    const tickets = (ticketsData ?? []) as unknown as SupportTicket[];

    // 7. Normalizar los datos.
    const normalizedTickets = tickets.map((ticket) => ({
      id: ticket.id,
      user_id: ticket.user_id,
      username: ticket.username,
      email: ticket.email,
      category: ticket.category || "Otro/pregunta",
      subject: ticket.subject || "Solicitud de soporte",
      message: ticket.message || "",
      conversation: Array.isArray(ticket.conversation)
        ? ticket.conversation
        : [],
      status: ticket.status || "PENDING",
      created_at: ticket.created_at,
      updated_at: ticket.updated_at,
    }));

    const total = count ?? 0;

    return NextResponse.json(
      {
        success: true,
        isAdmin,
        tickets: normalizedTickets,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error("Error en la API de tickets:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Ocurrió un error al obtener los tickets de soporte.",
      },
      { status: 500 }
    );
  }
}
