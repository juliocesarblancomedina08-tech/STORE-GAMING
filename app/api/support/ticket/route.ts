
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
};

type SupportStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED";

type StoredMessage = {
  id: number | string;
  sender: "ai" | "user" | "admin";
  text: string;
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
      : typeof message.content === "string"
        ? message.content
        : typeof message.message === "string"
          ? message.message
          : "";

  return value.trim().slice(0, MAX_MESSAGE_LENGTH);
}

function normalizeMessages(
  messages: SupportMessage[],
  isAdmin: boolean
): StoredMessage[] {
  return messages
    .filter((message) => message && typeof message === "object")
    .slice(-MAX_MESSAGES)
    .map((message, index) => {
      const text = getMessageText(message);

      let sender: StoredMessage["sender"] = "user";

      if (message.sender === "ai" || message.role === "assistant") {
        sender = "ai";
      } else if (
        (message.sender === "admin" || message.role === "admin") &&
        isAdmin
      ) {
        sender = "admin";
      }

      const id =
        typeof message.id === "string" ||
        typeof message.id === "number"
          ? message.id
          : `${Date.now()}-${index}`;

      return { id, sender, text };
    })
    .filter((message) => message.text.length > 0);
}

function mergeConversations(
  existing: unknown,
  incoming: StoredMessage[]
): StoredMessage[] {
  const previous: StoredMessage[] = Array.isArray(existing)
    ? existing
        .filter(
          (message: any) =>
            message &&
            typeof message.text === "string" &&
            ["user", "ai", "admin"].includes(message.sender)
        )
        .map((message: any, index: number) => ({
          id:
            typeof message.id === "string" ||
            typeof message.id === "number"
              ? message.id
              : `previous-${index}`,
          sender: message.sender as StoredMessage["sender"],
          text: message.text.slice(0, MAX_MESSAGE_LENGTH),
        }))
    : [];

  const combined = [...previous];
  const seen = new Set(
    previous.map(
      (message) => `${message.sender}:${String(message.id)}`
    )
  );

  for (const message of incoming) {
    const key = `${message.sender}:${String(message.id)}`;

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
    console.error("Error enviando notificación a Telegram:", error);
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

    // 2. Verificar permisos desde la identidad autenticada.
    const isAdmin = isSupportAdmin({
      id: user.id,
      email: user.email,
    });

    // 3. Leer el cuerpo.
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

    // 4. Validar el identificador del ticket.
    // Se conserva como string para no alterar IDs UUID.
    const rawTicketId = body?.ticketId;
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

    // 5. Recibir los mensajes.
    let rawMessages: SupportMessage[] = Array.isArray(body?.messages)
      ? body.messages
      : Array.isArray(body?.conversation)
        ? body.conversation
        : [];

    if (rawMessages.length === 0) {
      const initialMessage =
        typeof body?.message === "string"
          ? body.message
          : typeof body?.initialMessage === "string"
            ? body.initialMessage
            : typeof body?.text === "string"
              ? body.text
              : "";

      if (initialMessage.trim()) {
        rawMessages = [
          {
            id: `message-${Date.now()}`,
            sender: isAdmin ? "admin" : "user",
            text: initialMessage.trim(),
          },
        ];
      }
    }

    const incomingMessages = normalizeMessages(rawMessages, isAdmin);

    const requestedStatus = normalizeStatus(body?.status);

    const category =
      typeof body?.category === "string" && body.category.trim()
        ? body.category.trim().slice(0, MAX_CATEGORY_LENGTH)
        : "Otro/pregunta";

    const subject =
      typeof body?.subject === "string" && body.subject.trim()
        ? body.subject.trim().slice(0, MAX_SUBJECT_LENGTH)
        : "Solicitud de soporte";

    const authenticatedUsername = getAuthenticatedUsername(user);
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
        console.error("Error buscando ticket:", findError.message);

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

      // Los clientes solo pueden acceder a sus propios tickets.
      if (!isAdmin && existingTicket.user_id !== user.id) {
        return NextResponse.json(
          {
            success: false,
            error: "No tienes permiso para acceder a este ticket.",
          },
          { status: 403 }
        );
      }

      // Los clientes no pueden cambiar el estado ni escribir
      // mensajes haciéndose pasar por el administrador.
      if (!isAdmin && requestedStatus) {
        return NextResponse.json(
          {
            success: false,
            error: "Solo el administrador puede cambiar el estado.",
          },
          { status: 403 }
        );
      }

      const conversation = mergeConversations(
        existingTicket.conversation,
        incomingMessages
      );

      let finalStatus: SupportStatus =
        normalizeStatus(existingTicket.status) || "PENDING";

      if (isAdmin && requestedStatus) {
        finalStatus = requestedStatus;
      } else if (
        isAdmin &&
        incomingMessages.some((message) => message.sender === "admin") &&
        finalStatus !== "COMPLETED"
      ) {
        finalStatus = "IN_PROGRESS";
      }

      const lastAdminMessage = [...incomingMessages]
        .reverse()
        .find((message) => message.sender === "admin");

      const lastUserMessage = [...incomingMessages]
        .reverse()
        .find((message) => message.sender === "user");

      // Un cambio de estado no necesita incluir mensajes nuevos.
      if (incomingMessages.length === 0 && !requestedStatus) {
        return NextResponse.json(
          {
            success: false,
            error: "Debes enviar un mensaje o un estado válido.",
          },
          { status: 400 }
        );
      }

      const updatePayload: Record<string, unknown> = {
        conversation,
        status: finalStatus,
        updated_at: new Date().toISOString(),
      };

      // Solo el administrador puede editar categoría y asunto.
      if (isAdmin) {
        updatePayload.category = category;
        updatePayload.subject = subject;
      }

      if (lastUserMessage && !existingTicket.message) {
        updatePayload.message = lastUserMessage.text;
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

      if (isAdmin && lastAdminMessage) {
        await notifyTelegram(
          [
            "💬 RESPUESTA ADMINISTRATIVA",
            `🎫 Ticket: #${updatedTicket.id}`,
            `📌 Estado: ${updatedTicket.status}`,
            "",
            lastAdminMessage.text,
          ].join("\n")
        );
      }

      return NextResponse.json(
        {
          success: true,
          ticketId: updatedTicket.id,
          status: updatedTicket.status,
          updated_at: updatedTicket.updated_at,
          ticket: updatedTicket,
        },
        {
          headers: { "Cache-Control": "no-store, max-age=0" },
        }
      );
    }

    // 7. Crear un ticket nuevo para el usuario autenticado.
    // No se confía en user_id, email ni username enviados por el navegador.
    if (incomingMessages.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Escribe un mensaje antes de crear el ticket.",
        },
        { status: 400 }
      );
    }

    if (isAdmin && incomingMessages.every((m) => m.sender === "admin")) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No se puede crear un ticket nuevo únicamente con mensajes administrativos.",
        },
        { status: 400 }
      );
    }

    const conversation = mergeConversations([], incomingMessages);

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
      console.error("Error creando ticket:", ticketError?.message);

      return NextResponse.json(
        {
          success: false,
          error: "No se pudo crear la solicitud de soporte.",
        },
        { status: 500 }
      );
    }

    // 8. Notificar al administrador por Telegram, si está configurado.
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
        ticket,
      },
      {
        headers: { "Cache-Control": "no-store, max-age=0" },
      }
    );
  } catch (error) {
    console.error("Error en /api/support/ticket:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Ocurrió un error al procesar la solicitud de soporte.",
      },
      { status: 500 }
    );
  }
}
