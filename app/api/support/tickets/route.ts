import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_PAGE_SIZE = 100;
const MAX_MESSAGE_LENGTH = 4000;
const SUPPORT_ADMIN_EMAIL = "juliocesarblancomedina08@gmail.com";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type SupportStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED";

type StoredMessage = {
  id: string | number;
  sender: "user" | "ai" | "admin";
  text: string;
  message: string;
  created_at?: string;
};

type SupportTicket = {
  id: string | number;
  user_id: string | null;
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
  return (
    user.email?.trim().toLowerCase() ===
      SUPPORT_ADMIN_EMAIL.toLowerCase() ||
    getAdminIds().includes(user.id)
  );
}

function normalizeStatus(value: unknown): SupportStatus {
  if (typeof value !== "string") return "PENDING";

  const status = value.trim().toUpperCase();

  if (
    status === "PENDING" ||
    status === "IN_PROGRESS" ||
    status === "COMPLETED"
  ) {
    return status;
  }

  // Compatibilidad con registros antiguos.
  if (
    status === "CLOSED" ||
    status === "COMPLETE" ||
    status === "COMPLETED"
  ) {
    return "COMPLETED";
  }

  if (
    status === "IN PROGRESS" ||
    status === "IN-PROGRESS"
  ) {
    return "IN_PROGRESS";
  }

  return "PENDING";
}

function getMessageDate(item: any): string | undefined {
  const value = item?.created_at ?? item?.createdAt;

  if (typeof value !== "string" || !value.trim()) {
    return undefined;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? undefined
    : date.toISOString();
}

function createStableMessageId(
  sender: string,
  text: string,
  createdAt?: string
): string {
  if (createdAt) return `${sender}-${createdAt}`;

  let hash = 2166136261;
  const value = `${sender}:${text}`;

  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return `${sender}-${(hash >>> 0).toString(36)}`;
}

function normalizeConversation(
  conversation: unknown,
  fallbackMessage?: string | null,
  createdAt?: string
): StoredMessage[] {
  const source = Array.isArray(conversation)
    ? conversation
    : [];

  const result: StoredMessage[] = [];
  const seen = new Set<string>();

  for (const item of source.slice(-100)) {
    if (!item || typeof item !== "object") continue;

    const rawText =
      typeof item.text === "string"
        ? item.text
        : typeof item.message === "string"
          ? item.message
          : typeof item.content === "string"
            ? item.content
            : "";

    const text = rawText.trim().slice(0, MAX_MESSAGE_LENGTH);

    if (!text) continue;

    let sender: StoredMessage["sender"];

    if (
      item.sender === "user" ||
      item.sender === "ai" ||
      item.sender === "admin"
    ) {
      sender = item.sender;
    } else if (item.role === "assistant") {
      sender = "ai";
    } else if (
      item.role === "admin" ||
      item.role === "user"
    ) {
      sender = item.role;
    } else {
      sender = "user";
    }

    const messageDate = getMessageDate(item);

    const id =
      typeof item.id === "string" ||
      typeof item.id === "number"
        ? item.id
        : createStableMessageId(
            sender,
            text,
            messageDate
          );

    const key = `${sender}:${String(id)}`;

    if (seen.has(key)) continue;

    seen.add(key);

    result.push({
      id,
      sender,
      text,
      message: text,
      ...(messageDate
        ? { created_at: messageDate }
        : {}),
    });
  }

  // Compatibilidad con tickets antiguos que tienen un mensaje
  // inicial guardado en la columna message, pero sin conversación.
  if (
    result.length === 0 &&
    typeof fallbackMessage === "string" &&
    fallbackMessage.trim()
  ) {
    const text = fallbackMessage
      .trim()
      .slice(0, MAX_MESSAGE_LENGTH);

    result.push({
      id: createStableMessageId(
        "user",
        text,
        createdAt
      ),
      sender: "user",
      text,
      message: text,
      ...(createdAt ? { created_at: createdAt } : {}),
    });
  }

  return result.slice(-100);
}

export async function GET(request: NextRequest) {
  try {
    // 1. Validar el token de sesión.
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

    // 2. Validar la sesión con Supabase Auth.
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

    // 3. Comprobar si el usuario es administrador.
    const isAdmin = isSupportAdmin({
      id: user.id,
      email: user.email,
    });

    // 4. Leer y validar los filtros.
    const { searchParams } = new URL(request.url);

    const requestedUserId =
      searchParams.get("user_id")?.trim() || null;

    if (
      requestedUserId &&
      !UUID_PATTERN.test(requestedUserId)
    ) {
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
      finalUserId = requestedUserId || "";
    } else {
      if (
        requestedUserId &&
        requestedUserId !== user.id
      ) {
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

    // 5. Validar la paginación.
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

    // 6. Consultar los tickets en Supabase.
    let query = supabaseAdmin
      .from("support_tickets")
      .select(
        "id, user_id, username, email, category, subject, message, conversation, status, created_at, updated_at",
        { count: "exact" }
      )
      .order("updated_at", { ascending: false })
      .range(from, to);

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
        ticketsError.message
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

    // 7. Normalizar los tickets y sus mensajes.
    const normalizedTickets = tickets.map((ticket) => {
      const conversation = normalizeConversation(
        ticket.conversation,
        ticket.message,
        ticket.created_at
      );

      return {
        id: ticket.id,
        user_id: ticket.user_id,
        username: ticket.username,
        email: ticket.email,
        category: ticket.category || "Otro/pregunta",
        subject: ticket.subject || "Solicitud de soporte",
        message: ticket.message || "",
        conversation,
        status: normalizeStatus(ticket.status),
        created_at: ticket.created_at,
        updated_at: ticket.updated_at,
      };
    });

    const total = count ?? 0;

    // 8. Devolver datos sin caché.
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
    console.error(
      "Error en la API de tickets:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Ocurrió un error al obtener los tickets de soporte.",
      },
      { status: 500 }
    );
  }
}
