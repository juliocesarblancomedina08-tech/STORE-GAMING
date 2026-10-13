import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SupportMessage = {
  id?: number | string;
  sender?: "ai" | "user" | "admin";
  role?: "assistant" | "user" | "admin";
  text?: string;
  content?: string;
  message?: string;
  created_at?: string;
  createdAt?: string;
};

type SupportStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED";

type StoredMessage = {
  id: number | string;
  sender: "ai" | "user" | "admin";
  text: string;
  created_at?: string;
};

const MAX_MESSAGES = 100;
const MAX_MESSAGE_LENGTH = 4000;
const MAX_SUBJECT_LENGTH = 200;
const MAX_CATEGORY_LENGTH = 100;

const SUPPORT_ADMIN_EMAIL = "juliocesarblancomedina08@gmail.com";

const VALID_STATUSES: SupportStatus[] = [
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
];

function normalizeStatus(value: unknown): SupportStatus | null {
  if (typeof value !== "string") return null;

  const status = value.trim().toUpperCase();

  return VALID_STATUSES.includes(status as SupportStatus)
    ? (status as SupportStatus)
    : null;
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
  email?: string;
}): boolean {
  return (
    user.email?.trim().toLowerCase() ===
      SUPPORT_ADMIN_EMAIL.toLowerCase() ||
    getAdminIds().includes(user.id)
  );
}

function getMessageText(message: SupportMessage): string {
  const value =
    typeof message.text === "string"
      ? message.text
      : typeof message.message === "string"
        ? message.message
        : typeof message.content === "string"
          ? message.content
          : "";

  return value.trim().slice(0, MAX_MESSAGE_LENGTH);
}

function getMessageDate(
  message: SupportMessage
): string | undefined {
  const value = message.created_at ?? message.createdAt;

  if (typeof value !== "string" || !value.trim()) {
    return undefined;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? undefined
    : date.toISOString();
}

/**
 * Crea un identificador estable cuando el cliente no envía uno.
 * Esto evita generar un ID diferente cada vez que se reenvía
 * la conversación completa.
 */
function createStableMessageId(
  sender: StoredMessage["sender"],
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

function normalizeMessages(
  messages: SupportMessage[],
  isAdmin: boolean
): StoredMessage[] {
  const normalized: StoredMessage[] = [];

  for (const message of messages
    .filter(
      (item) => item && typeof item === "object"
    )
    .slice(-MAX_MESSAGES)) {
    const text = getMessageText(message);

    if (!text) continue;

    let sender: StoredMessage["sender"] = "user";

    if (
      message.sender === "ai" ||
      message.role === "assistant"
    ) {
      sender = "ai";
    } else if (
      isAdmin &&
      (message.sender === "admin" ||
        message.role === "admin")
    ) {
      sender = "admin";
    }

    const created_at = getMessageDate(message);

    const id =
      typeof message.id === "string" &&
      message.id.trim()
        ? message.id
        : typeof message.id === "number"
          ? message.id
          : createStableMessageId(
              sender,
              text,
              created_at
            );

    normalized.push({
      id,
      sender,
      text,
      ...(created_at ? { created_at } : {}),
    });
  }

  // Evitar mensajes repetidos dentro de la misma petición.
  const seen = new Set<string>();

  return normalized.filter((message) => {
    const key = `${message.sender}:${String(message.id)}`;

    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}

function normalizeStoredConversation(
  existing: unknown
): StoredMessage[] {
  if (!Array.isArray(existing)) return [];

  const result: StoredMessage[] = [];

  existing.forEach((item: any, index: number) => {
    if (!item || typeof item !== "object") return;

    const text =
      typeof item.text === "string"
        ? item.text
        : typeof item.message === "string"
          ? item.message
          : typeof item.content === "string"
            ? item.content
            : "";

    if (!text.trim()) return;

    let sender: StoredMessage["sender"];

    if (["user", "ai", "admin"].includes(item.sender)) {
      sender = item.sender;
    } else if (item.role === "assistant") {
      sender = "ai";
    } else if (
      item.role === "user" ||
      item.role === "admin"
    ) {
      sender = item.role;
    } else {
      sender = "user";
    }

    const created_at = getMessageDate(item);

    const id =
      typeof item.id === "string" ||
      typeof item.id === "number"
        ? item.id
        : createStableMessageId(
            sender,
            text.trim(),
            created_at
          ) || `previous-${index}`;

    result.push({
      id,
      sender,
      text: text.trim().slice(0, MAX_MESSAGE_LENGTH),
      ...(created_at ? { created_at } : {}),
    });
  });

  return result.slice(-MAX_MESSAGES);
}

function messageKey(message: StoredMessage): string {
  return `${message.sender}:${String(message.id)}`;
}

function mergeConversations(
  existing: unknown,
  incoming: StoredMessage[]
): StoredMessage[] {
  const previous = normalizeStoredConversation(existing);
  const combined = [...previous];

  const seen = new Set(previous.map(messageKey));

  for (const message of incoming) {
    const key = messageKey(message);

    if (!seen.has(key)) {
      combined.push(message);
      seen.add(key);
    }
  }

  return combined.slice(-MAX_MESSAGES);
}

function getAuthenticatedUsername(user: {
  user_metadata?: Record<string, unknown>;
}): string | null {
  const metadata = user.user_metadata || {};

  if (typeof metadata.username === "string") {
    return metadata.username.slice(0, 100);
  }

  if (typeof metadata.full_name === "string") {
    return metadata.full_name.slice(0, 100);
  }

  return null;
}

async function notifyTelegram(text: string): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;

  if (!botToken || !chatId) {
    console.warn(
      "Telegram no está configurado: faltan TELEGRAM_BOT_TOKEN o TELEGRAM_ADMIN_CHAT_ID."
    );
    return;
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: text.slice(0, 3900),
        }),
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!response.ok) {
      console.error(
        "Telegram rechazó la notificación:",
        response.status
      );
    }
  } catch (error) {
    console.error(
      "Error enviando notificación a Telegram:",
      error
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Validar la sesión real de Supabase.
    const accessToken = getBearerToken(request);

    if (!accessToken) {
      return NextResponse.json(
        {
          success: false,
          error: "Debes iniciar sesión para utilizar el soporte.",
        },
        { status: 401 }
      );
    }

    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(accessToken);

    if (authError || !user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: "La sesión no es válida o ha expirado.",
        },
        { status: 401 }
      );
    }

    // 2. Comprobar los permisos del usuario autenticado.
    const isAdmin = isSupportAdmin({
      id: user.id,
      email: user.email,
    });

    // 3. Leer y validar el cuerpo de la petición.
    let body: any;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "La solicitud no contiene un JSON válido.",
        },
        { status: 400 }
      );
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        {
          success: false,
          error: "El contenido de la solicitud no es válido.",
        },
        { status: 400 }
      );
    }

    // 4. Validar el identificador del ticket.
    const rawTicketId = body.ticketId;
    let ticketId: string | null = null;

    if (
      rawTicketId !== undefined &&
      rawTicketId !== null &&
      rawTicketId !== ""
    ) {
      if (
        (typeof rawTicketId !== "string" &&
          typeof rawTicketId !== "number") ||
        !String(rawTicketId).trim()
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "El identificador del ticket no es válido.",
          },
          { status: 400 }
        );
      }

      ticketId = String(rawTicketId).trim();
    }

    // 5. Aceptar tanto "messages" como "conversation".
    let rawMessages: SupportMessage[] = Array.isArray(
      body.messages
    )
      ? body.messages
      : Array.isArray(body.conversation)
        ? body.conversation
        : [];

    // Compatibilidad con las peticiones que envían un solo mensaje.
    if (rawMessages.length === 0) {
      const singleMessage =
        typeof body.message === "string"
          ? body.message
          : typeof body.initialMessage === "string"
            ? body.initialMessage
            : typeof body.text === "string"
              ? body.text
              : "";

      if (singleMessage.trim()) {
        rawMessages = [
          {
            id: `single-${Date.now()}`,
            sender: isAdmin ? "admin" : "user",
            text: singleMessage.trim(),
            created_at: new Date().toISOString(),
          },
        ];
      }
    }

    const incomingMessages = normalizeMessages(
      rawMessages,
      isAdmin
    );

    const requestedStatus = normalizeStatus(body.status);

    const categoryProvided =
      typeof body.category === "string" &&
      body.category.trim().length > 0;

    const subjectProvided =
      typeof body.subject === "string" &&
      body.subject.trim().length > 0;

    const category = categoryProvided
      ? body.category.trim().slice(0, MAX_CATEGORY_LENGTH)
      : "Otro/pregunta";

    const subject = subjectProvided
      ? body.subject.trim().slice(0, MAX_SUBJECT_LENGTH)
      : "Solicitud de soporte";

    const authenticatedUsername =
      getAuthenticatedUsername(user);

    const authenticatedEmail = user.email || null;

    // 6. Actualizar un ticket existente.
    if (ticketId !== null) {
      const {
        data: existingTicket,
        error: findError,
      } = await supabaseAdmin
        .from("support_tickets")
        .select(
          "id, user_id, username, email, category, subject, message, conversation, status, created_at, updated_at"
        )
        .eq("id", ticketId)
        .maybeSingle();

      if (findError) {
        console.error(
          "Error buscando ticket:",
          findError.message
        );

        return NextResponse.json(
          {
            success: false,
            error: "No se pudo consultar el ticket.",
          },
          { status: 500 }
        );
      }

      if (!existingTicket) {
        return NextResponse.json(
          {
            success: false,
            error: "El ticket de soporte no existe.",
          },
          { status: 404 }
        );
      }

      // Un cliente solo puede modificar sus propios tickets.
      if (!isAdmin && existingTicket.user_id !== user.id) {
        return NextResponse.json(
          {
            success: false,
            error: "No tienes permiso para acceder a este ticket.",
          },
          { status: 403 }
        );
      }

      // Los clientes no pueden cambiar el estado.
      if (!isAdmin && requestedStatus) {
        return NextResponse.json(
          {
            success: false,
            error: "Solo el administrador puede cambiar el estado.",
          },
          { status: 403 }
        );
      }

      // Si la petición incluye una conversación completa,
      // fusionarla con la guardada sin repetir mensajes conocidos.
      const previousConversation =
        normalizeStoredConversation(
          existingTicket.conversation
        );

      const previousKeys = new Set(
        previousConversation.map(messageKey)
      );

      const conversation = mergeConversations(
        previousConversation,
        incomingMessages
      );

      const newMessages = incomingMessages.filter(
        (message) => !previousKeys.has(messageKey(message))
      );

      let finalStatus: SupportStatus =
        normalizeStatus(existingTicket.status) || "PENDING";

      if (isAdmin && requestedStatus) {
        finalStatus = requestedStatus;
      } else if (
        isAdmin &&
        newMessages.some(
          (message) => message.sender === "admin"
        ) &&
        finalStatus !== "COMPLETED"
      ) {
        finalStatus = "IN_PROGRESS";
      }

      // Identificar mensajes realmente nuevos para las notificaciones.
      const lastNewAdminMessage = [...newMessages]
        .reverse()
        .find((message) => message.sender === "admin");

      const lastNewUserMessage = [...newMessages]
        .reverse()
        .find((message) => message.sender === "user");

      const statusChanged =
        finalStatus !==
        (normalizeStatus(existingTicket.status) || "PENDING");

      if (
        newMessages.length === 0 &&
        !statusChanged &&
        !requestedStatus &&
        !(isAdmin && categoryProvided) &&
        !(isAdmin && subjectProvided)
      ) {
        // No fallar si el cliente vuelve a enviar una conversación
        // que ya está guardada: devolver el ticket existente.
        return NextResponse.json(
          {
            success: true,
            ticketId: existingTicket.id,
            status: existingTicket.status,
            updated_at: existingTicket.updated_at,
            ticket: {
              ...existingTicket,
              conversation: previousConversation,
            },
          },
          {
            headers: {
              "Cache-Control": "no-store, max-age=0",
            },
          }
        );
      }

      const updatePayload: Record<string, unknown> = {
        conversation,
        status: finalStatus,
        updated_at: new Date().toISOString(),
      };

      // IMPORTANTE:
      // No reemplazar el asunto ni la categoría con valores
      // predeterminados cuando el administrador solo responde
      // o cambia el estado.
      if (isAdmin && categoryProvided) {
        updatePayload.category = category;
      }

      if (isAdmin && subjectProvided) {
        updatePayload.subject = subject;
      }

      if (
        lastNewUserMessage &&
        !existingTicket.message
      ) {
        updatePayload.message = lastNewUserMessage.text;
      }

      const {
        data: updatedTicket,
        error: updateError,
      } = await supabaseAdmin
        .from("support_tickets")
        .update(updatePayload)
        .eq("id", ticketId)
        .select(
          "id, user_id, username, email, category, subject, message, conversation, status, created_at, updated_at"
        )
        .single();

      if (updateError || !updatedTicket) {
        console.error(
          "Error actualizando ticket:",
          updateError?.message
        );

        return NextResponse.json(
          {
            success: false,
            error: "No se pudo actualizar el ticket de soporte.",
          },
          { status: 500 }
        );
      }

      if (isAdmin && lastNewAdminMessage) {
        await notifyTelegram(
          [
            "💬 RESPUESTA ADMINISTRATIVA",
            `🎫 Ticket: #${updatedTicket.id}`,
            `📌 Estado: ${updatedTicket.status}`,
            "",
            lastNewAdminMessage.text,
          ].join("\n")
        );
      }

      return NextResponse.json(
        {
          success: true,
          ticketId: updatedTicket.id,
          status: updatedTicket.status,
          updated_at: updatedTicket.updated_at,
          ticket: {
            ...updatedTicket,
            conversation: normalizeStoredConversation(
              updatedTicket.conversation
            ),
          },
        },
        {
          headers: {
            "Cache-Control": "no-store, max-age=0",
          },
        }
      );
    }

    // 7. Crear un ticket nuevo.
    // La identidad se obtiene de la sesión, no del navegador.
    if (incomingMessages.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Escribe un mensaje antes de crear el ticket.",
        },
        { status: 400 }
      );
    }

    if (
      isAdmin &&
      incomingMessages.every(
        (message) => message.sender === "admin"
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No se puede crear un ticket nuevo únicamente con mensajes administrativos.",
        },
        { status: 400 }
      );
    }

    const conversation = mergeConversations(
      [],
      incomingMessages
    );

    const firstUserMessage = incomingMessages.find(
      (message) => message.sender === "user"
    );

    if (!firstUserMessage) {
      return NextResponse.json(
        {
          success: false,
          error: "El ticket nuevo debe incluir un mensaje del cliente.",
        },
        { status: 400 }
      );
    }

    const {
      data: ticket,
      error: ticketError,
    } = await supabaseAdmin
      .from("support_tickets")
      .insert({
        user_id: user.id,
        username: authenticatedUsername,
        email: authenticatedEmail,
        category,
        subject,
        message: firstUserMessage.text,
        conversation,
        status: "PENDING",
      })
      .select(
        "id, user_id, username, email, category, subject, message, conversation, status, created_at, updated_at"
      )
      .single();

    if (ticketError || !ticket) {
      console.error(
        "Error creando ticket:",
        ticketError?.message
      );

      return NextResponse.json(
        {
          success: false,
          error: "No se pudo crear la solicitud de soporte.",
        },
        { status: 500 }
      );
    }

    // 8. Notificar al administrador por Telegram.
    await notifyTelegram(
      [
        "🆘 NUEVO TICKET DE SOPORTE",
        "",
        `🎫 Ticket: #${ticket.id}`,
        "📌 Estado: PENDIENTE",
        "",
        `📂 Categoría: ${category}`,
        `📝 Asunto: ${subject}`,
        `👤 Usuario: ${authenticatedUsername || "No identificado"}`,
        `📧 Email: ${authenticatedEmail || "No disponible"}`,
        `🆔 Usuario ID: ${user.id}`,
        "",
        "💬 Mensaje del cliente:",
        firstUserMessage.text,
      ].join("\n")
    );

    return NextResponse.json(
      {
        success: true,
        ticketId: ticket.id,
        status: ticket.status,
        updated_at: ticket.updated_at,
        message: "Tu solicitud fue enviada al administrador.",
        ticket: {
          ...ticket,
          conversation: normalizeStoredConversation(
            ticket.conversation
          ),
        },
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error(
      "Error en /api/support/ticket:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Ocurrió un error al procesar la solicitud de soporte.",
      },
      { status: 500 }
    );
  }
}
