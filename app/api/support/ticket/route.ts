
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

function jsonError(error: string, status: number) {
  return NextResponse.json(
    { success: false, error },
    {
      status,
      headers: { "Cache-Control": "no-store, max-age=0" },
    }
  );
}

function normalizeStatus(value: unknown): SupportStatus | null {
  if (typeof value !== "string") return null;

  const status = value.trim().toUpperCase();

  return VALID_STATUSES.includes(status as SupportStatus)
    ? (status as SupportStatus)
    : null;
}

function getBearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  const match = authorization?.match(/^Bearer\s+(.+)$/i);

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

/**
 * Solo acepta mensajes del cliente y del administrador.
 * Las respuestas de IA deben guardarse exclusivamente desde
 * la ruta del servidor que genera esas respuestas.
 */
function normalizeMessages(
  messages: SupportMessage[],
  isAdmin: boolean
): StoredMessage[] {
  const normalized: StoredMessage[] = [];

  for (const message of messages
    .filter((item) => item && typeof item === "object")
    .slice(-MAX_MESSAGES)) {
    const text = getMessageText(message);

    if (!text) continue;

    const declaredSender = message.sender || message.role;

    let sender: StoredMessage["sender"];

    if (declaredSender === "user") {
      sender = "user";
    } else if (isAdmin && declaredSender === "admin") {
      sender = "admin";
    } else {
      // No aceptar mensajes ai/assistant desde el navegador.
      continue;
    }

    const created_at = getMessageDate(message);

    const id =
      typeof message.id === "string" && message.id.trim()
        ? message.id.trim()
        : typeof message.id === "number" &&
            Number.isSafeInteger(message.id)
          ? message.id
          : createStableMessageId(sender, text, created_at);

    normalized.push({
      id,
      sender,
      text,
      ...(created_at ? { created_at } : {}),
    });
  }

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

  for (const item of existing.slice(-MAX_MESSAGES)) {
    if (!item || typeof item !== "object") continue;

    const value = item as Record<string, unknown>;

    const text =
      typeof value.text === "string"
        ? value.text
        : typeof value.message === "string"
          ? value.message
          : typeof value.content === "string"
            ? value.content
            : "";

    if (!text.trim()) continue;

    const rawSender = value.sender ?? value.role;

    let sender: StoredMessage["sender"];

    if (rawSender === "ai" || rawSender === "assistant") {
      sender = "ai";
    } else if (rawSender === "admin") {
      sender = "admin";
    } else if (rawSender === "user") {
      sender = "user";
    } else {
      sender = "user";
    }

    const createdAtValue =
      typeof value.created_at === "string"
        ? value.created_at
        : typeof value.createdAt === "string"
          ? value.createdAt
          : undefined;

    const created_at = createdAtValue
      ? getMessageDate({ created_at: createdAtValue })
      : undefined;

    const id =
      typeof value.id === "string" ||
      (typeof value.id === "number" &&
        Number.isSafeInteger(value.id))
        ? value.id
        : createStableMessageId(
            sender,
            text.trim(),
            created_at
          );

    result.push({
      id,
      sender,
      text: text.trim().slice(0, MAX_MESSAGE_LENGTH),
      ...(created_at ? { created_at } : {}),
    });
  }

  return result;
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

    if (seen.has(key)) continue;

    combined.push(message);
    seen.add(key);
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
    console.error("Error enviando notificación a Telegram:", error);
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Validar la sesión de Supabase.
    const accessToken = getBearerToken(request);

    if (!accessToken) {
      return jsonError(
        "Debes iniciar sesión para utilizar el soporte.",
        401
      );
    }

    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(accessToken);

    if (authError || !user?.id) {
      return jsonError(
        "La sesión no es válida o ha expirado.",
        401
      );
    }

    const admin = isSupportAdmin({
      id: user.id,
      email: user.email,
    });

    // 2. Leer el cuerpo.
    let body: Record<string, unknown>;

    try {
      body = await request.json();
    } catch {
      return jsonError(
        "La solicitud no contiene un JSON válido.",
        400
      );
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return jsonError(
        "El contenido de la solicitud no es válido.",
        400
      );
    }

    // 3. Validar el ID del ticket, si existe.
    const rawTicketId = body.ticketId;
    let ticketId: string | null = null;

    if (
      rawTicketId !== undefined &&
      rawTicketId !== null &&
      rawTicketId !== ""
    ) {
      const value = String(rawTicketId).trim();

      if (
        !/^\d+$/.test(value) ||
        !/^[1-9]\d*$/.test(value) ||
        !Number.isSafeInteger(Number(value))
      ) {
        return jsonError(
          "El identificador del ticket no es válido.",
          400
        );
      }

      ticketId = value;
    }

    // 4. Obtener los mensajes de entrada.
    let rawMessages: SupportMessage[] = Array.isArray(body.messages)
      ? (body.messages as SupportMessage[])
      : Array.isArray(body.conversation)
        ? (body.conversation as SupportMessage[])
        : [];

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
            sender: admin ? "admin" : "user",
            text: singleMessage.trim(),
            created_at: new Date().toISOString(),
          },
        ];
      }
    }

    const incomingMessages = normalizeMessages(
      rawMessages,
      admin
    );

    const requestedStatus = normalizeStatus(body.status);

    if (
      body.status !== undefined &&
      body.status !== null &&
      body.status !== "" &&
      !requestedStatus
    ) {
      return jsonError("El estado solicitado no es válido.", 400);
    }

    const categoryProvided =
      typeof body.category === "string" &&
      body.category.trim().length > 0;

    const subjectProvided =
      typeof body.subject === "string" &&
      body.subject.trim().length > 0;

    const category = categoryProvided
      ? (body.category as string).trim().slice(0, MAX_CATEGORY_LENGTH)
      : "Otro/pregunta";

    const subject = subjectProvided
      ? (body.subject as string).trim().slice(0, MAX_SUBJECT_LENGTH)
      : "Solicitud de soporte";

    const username = getAuthenticatedUsername(user);
    const email = user.email || null;

    // 5. Actualizar un ticket existente.
    if (ticketId !== null) {
      const { data: existingTicket, error: findError } =
        await supabaseAdmin
          .from("support_tickets")
          .select(
            "id, user_id, username, email, category, subject, message, conversation, status, created_at, updated_at"
          )
          .eq("id", ticketId)
          .maybeSingle();

      if (findError) {
        console.error("Error buscando ticket:", findError.message);
        return jsonError("No se pudo consultar el ticket.", 500);
      }

      if (!existingTicket) {
        return jsonError("El ticket de soporte no existe.", 404);
      }

      if (!admin && existingTicket.user_id !== user.id) {
        return jsonError(
          "No tienes permiso para acceder a este ticket.",
          403
        );
      }

      const currentStatus =
        normalizeStatus(existingTicket.status) || "PENDING";

      let finalStatus = currentStatus;

      if (admin) {
        if (requestedStatus) {
          finalStatus = requestedStatus;
        }
      } else if (requestedStatus) {
        // Un cliente solo puede reabrir su ticket completado.
        if (
          requestedStatus === "PENDING" &&
          currentStatus === "COMPLETED"
        ) {
          finalStatus = "PENDING";
        } else {
          return jsonError(
            "Solo puedes reabrir un ticket completado; los demás cambios de estado corresponden al administrador.",
            403
          );
        }
      }

      const previousConversation = normalizeStoredConversation(
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

      if (
        admin &&
        newMessages.some((message) => message.sender === "admin") &&
        finalStatus !== "COMPLETED" &&
        !requestedStatus
      ) {
        finalStatus = "IN_PROGRESS";
      }

      const lastNewAdminMessage = [...newMessages]
        .reverse()
        .find((message) => message.sender === "admin");

      const lastNewUserMessage = [...newMessages]
        .reverse()
        .find((message) => message.sender === "user");

      const statusChanged = finalStatus !== currentStatus;

      const shouldNotifyAdmin =
        !admin &&
        body.notifyAdmin === true &&
        Boolean(lastNewUserMessage);

      if (
        newMessages.length === 0 &&
        !statusChanged &&
        !(admin && categoryProvided) &&
        !(admin && subjectProvided)
      ) {
        return NextResponse.json(
          {
            success: true,
            ticketId: existingTicket.id,
            status: currentStatus,
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

      // Solo el administrador puede modificar estos campos.
      if (admin && categoryProvided) {
        updatePayload.category = category;
      }

      if (admin && subjectProvided) {
        updatePayload.subject = subject;
      }

      if (lastNewUserMessage && !existingTicket.message) {
        updatePayload.message = lastNewUserMessage.text;
      }

      const { data: updatedTicket, error: updateError } =
        await supabaseAdmin
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

        return jsonError(
          "No se pudo actualizar el ticket de soporte.",
          500
        );
      }

      if (admin && lastNewAdminMessage) {
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

      if (shouldNotifyAdmin && lastNewUserMessage) {
        await notifyTelegram(
          [
            "🆘 SOLICITUD DE ATENCIÓN DEL ADMINISTRADOR",
            `🎫 Ticket: #${updatedTicket.id}`,
            `👤 Usuario: ${username || "No identificado"}`,
            `📧 Email: ${email || "No disponible"}`,
            "",
            "💬 Mensaje:",
            lastNewUserMessage.text,
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

    // 6. Crear un ticket nuevo.
    const firstUserMessage = incomingMessages.find(
      (message) => message.sender === "user"
    );

    if (!firstUserMessage) {
      return jsonError(
        "Escribe un mensaje válido del cliente antes de crear el ticket.",
        400
      );
    }

    const conversation = mergeConversations([], incomingMessages);

    const { data: ticket, error: ticketError } =
      await supabaseAdmin
        .from("support_tickets")
        .insert({
          user_id: user.id,
          username,
          email,
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
      console.error("Error creando ticket:", ticketError?.message);

      return jsonError(
        "No se pudo crear la solicitud de soporte.",
        500
      );
    }

    await notifyTelegram(
      [
        "🆘 NUEVO TICKET DE SOPORTE",
        "",
        `🎫 Ticket: #${ticket.id}`,
        "📌 Estado: PENDIENTE",
        "",
        `📂 Categoría: ${category}`,
        `📝 Asunto: ${subject}`,
        `👤 Usuario: ${username || "No identificado"}`,
        `📧 Email: ${email || "No disponible"}`,
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
    console.error("Error en /api/support/ticket:", error);

    return jsonError(
      "Ocurrió un error al procesar la solicitud de soporte.",
      500
    );
  }
}
