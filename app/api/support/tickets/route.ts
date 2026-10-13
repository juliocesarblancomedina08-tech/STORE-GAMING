import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_PAGE_SIZE = 100;
const MAX_MESSAGES = 100;
const MAX_MESSAGE_LENGTH = 4000;

const SUPPORT_ADMIN_EMAIL = (
  process.env.SUPPORT_ADMIN_EMAIL ||
  "juliocesarblancomedina08@gmail.com"
)
  .trim()
  .toLowerCase();

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

function jsonError(error: string, status: number) {
  return NextResponse.json(
    {
      success: false,
      error,
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}

function jsonSuccess(data: Record<string, unknown>) {
  return NextResponse.json(data, {
    status: 200,
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}

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
  email?: string | null;
}): boolean {
  const email = user.email?.trim().toLowerCase();

  return (
    email === SUPPORT_ADMIN_EMAIL ||
    getAdminIds().includes(user.id)
  );
}

function normalizeStatus(value: unknown): SupportStatus {
  if (typeof value !== "string") return "PENDING";

  const status = value.trim().toUpperCase();

  if (
    status === "COMPLETED" ||
    status === "CLOSED" ||
    status === "COMPLETE"
  ) {
    return "COMPLETED";
  }

  if (
    status === "IN_PROGRESS" ||
    status === "IN PROGRESS" ||
    status === "IN-PROGRESS"
  ) {
    return "IN_PROGRESS";
  }

  if (status === "PENDING") {
    return "PENDING";
  }

  return "PENDING";
}

function getMessageDate(item: unknown): string | undefined {
  if (!item || typeof item !== "object") {
    return undefined;
  }

  const value = item as Record<string, unknown>;
  const rawDate = value.created_at ?? value.createdAt;

  if (typeof rawDate !== "string" || !rawDate.trim()) {
    return undefined;
  }

  const date = new Date(rawDate);

  return Number.isNaN(date.getTime())
    ? undefined
    : date.toISOString();
}

function createStableMessageId(
  sender: string,
  text: string,
  createdAt?: string
): string {
  if (createdAt) {
    return `${sender}-${createdAt}`;
  }

  let hash = 2166136261;
  const value = `${sender}:${text}`;

  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return `${sender}-${(hash >>> 0).toString(36)}`;
}

/**
 * Normaliza los mensajes sin modificar la conversación almacenada.
 * Conserva los remitentes user, ai y admin para que el panel
 * pueda distinguir las respuestas del administrador de las de IA.
 */
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

  for (const item of source.slice(-MAX_MESSAGES)) {
    if (!item || typeof item !== "object") continue;

    const value = item as Record<string, unknown>;

    const rawText =
      typeof value.text === "string"
        ? value.text
        : typeof value.message === "string"
          ? value.message
          : typeof value.content === "string"
            ? value.content
            : "";

    const text = rawText
      .trim()
      .slice(0, MAX_MESSAGE_LENGTH);

    if (!text) continue;

    const rawSender = value.sender ?? value.role;

    let sender: StoredMessage["sender"];

    if (
      rawSender === "ai" ||
      rawSender === "assistant"
    ) {
      sender = "ai";
    } else if (rawSender === "admin") {
      sender = "admin";
    } else {
      // Compatibilidad con mensajes antiguos sin remitente.
      sender = "user";
    }

    const messageDate = getMessageDate(value);

    const id =
      typeof value.id === "string" &&
      value.id.trim().length > 0
        ? value.id
        : typeof value.id === "number" &&
            Number.isSafeInteger(value.id)
          ? value.id
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

  // Compatibilidad con tickets antiguos que solo tienen
  // el mensaje inicial en la columna message.
  if (
    result.length === 0 &&
    typeof fallbackMessage === "string" &&
    fallbackMessage.trim()
  ) {
    const text = fallbackMessage
      .trim()
      .slice(0, MAX_MESSAGE_LENGTH);

    const date = createdAt
      ? getMessageDate({ created_at: createdAt })
      : undefined;

    result.push({
      id: createStableMessageId(
        "user",
        text,
        date
      ),
      sender: "user",
      text,
      message: text,
      ...(date ? { created_at: date } : {}),
    });
  }

  return result.slice(-MAX_MESSAGES);
}

export async function GET(request: NextRequest) {
  try {
    // 1. Validar el token de sesión.
    const token = getBearerToken(request);

    if (!token) {
      return jsonError(
        "No autorizado. Inicia sesión para continuar.",
        401
      );
    }

    // 2. Verificar la sesión con Supabase Auth.
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user?.id) {
      return jsonError(
        "La sesión no es válida o ha expirado.",
        401
      );
    }

    // 3. Comprobar los permisos del administrador.
    const isAdmin = isSupportAdmin({
      id: user.id,
      email: user.email,
    });

    // 4. Validar los filtros.
    const { searchParams } = new URL(request.url);

    const requestedUserId =
      searchParams.get("user_id")?.trim() || null;

    if (
      requestedUserId &&
      !UUID_PATTERN.test(requestedUserId)
    ) {
      return jsonError(
        "El identificador del usuario no es válido.",
        400
      );
    }

    // Un cliente nunca puede consultar tickets de otra persona.
    // Si el administrador no especifica user_id, puede consultar
    // todos los tickets para su panel.
    let finalUserId: string | null;

    if (isAdmin) {
      finalUserId = requestedUserId;
    } else {
      if (
        requestedUserId &&
        requestedUserId !== user.id
      ) {
        return jsonError(
          "No tienes permiso para consultar estos tickets.",
          403
        );
      }

      finalUserId = user.id;
    }

    // 5. Validar la paginación.
    const rawPage = searchParams.get("page");
    const rawLimit = searchParams.get("limit");

    const pageParam =
      rawPage === null || rawPage.trim() === ""
        ? 1
        : Number(rawPage);

    const limitParam =
      rawLimit === null || rawLimit.trim() === ""
        ? 50
        : Number(rawLimit);

    if (
      !Number.isSafeInteger(pageParam) ||
      pageParam < 1
    ) {
      return jsonError(
        "El número de página no es válido.",
        400
      );
    }

    if (
      !Number.isSafeInteger(limitParam) ||
      limitParam < 1
    ) {
      return jsonError(
        "El límite de resultados no es válido.",
        400
      );
    }

    const page = Math.min(pageParam, 1000000);
    const limit = Math.min(limitParam, MAX_PAGE_SIZE);

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // 6. Consultar Supabase.
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

      return jsonError(
        "No se pudieron obtener los tickets de soporte.",
        500
      );
    }

    const tickets = (
      ticketsData ?? []
    ) as unknown as SupportTicket[];

    // 7. Normalizar los tickets y sus conversaciones.
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

    // 8. Devolver los resultados sin caché.
    return jsonSuccess({
      success: true,
      isAdmin,
      tickets: normalizedTickets,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error(
      "Error en la API de tickets:",
      error
    );

    return jsonError(
      "Ocurrió un error al obtener los tickets de soporte.",
      500
    );
  }
}
