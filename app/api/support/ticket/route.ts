
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SupportMessage = {
  id?: number | string;
  sender?: "ai" | "user" | "admin";
  text?: string;
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

function getMessageText(message: any): string {
  if (typeof message?.text === "string") {
    return message.text.trim().slice(0, MAX_MESSAGE_LENGTH);
  }

  if (typeof message?.content === "string") {
    return message.content.trim().slice(0, MAX_MESSAGE_LENGTH);
  }

  if (typeof message?.message === "string") {
    return message.message.trim().slice(0, MAX_MESSAGE_LENGTH);
  }

  return "";
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

      if (message.sender === "ai") {
        sender = "ai";
      } else if (message.sender === "admin" && isAdmin) {
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
  incoming: StoredMessage[],
  isAdmin: boolean
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

  // Un usuario no puede insertar mensajes que aparenten proceder
  // del administrador.
  const safeIncoming = incoming.map((message) => ({
    ...message,
    sender:
      message.sender === "admin" && !isAdmin
        ? ("user" as const)
        : message.sender,
  }));

  const combined = [...previous];
  const seen = new Set(
    previous.map((message) => `${message.sender}:${String(message.id)}`)
  );

  for (const message of safeIncoming) {
    const key = `${message.sender}:${String(message.id)}`;

    if (!seen.has(key)) {
      combined.push(message);
      seen.add(key);
    }
  }

  return combined.slice(-MAX_MESSAGES);
}

function getAdminIds(): string[] {
  return (process.env.SUPPORT_ADMIN_USER_IDS || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

export async function POST(request: NextRequest) {
  try {
    // 1. Verificar la sesión de Supabase.
    const authorization =
      request.headers.get("authorization") || "";

    const tokenMatch = authorization.match(/^Bearer\s+(.+)$/i);
    const accessToken = tokenMatch?.[1]?.trim();

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

    // La función administrativa nunca confía en body.sender.
    const isAdmin = getAdminIds().includes(user.id);

    // 2. Leer el cuerpo.
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

    const rawTicketId = body?.ticketId;

    let ticketId: number | null = null;

    if (
      rawTicketId !== undefined &&
      rawTicketId !== null &&
      rawTicketId !== ""
    ) {
      ticketId = Number(rawTicketId);

      if (!Number.isSafeInteger(ticketId) || ticketId <= 0) {
        return NextResponse.json(
          {
            success: false,
            error: "El identificador del ticket no es válido.",
          },
          { status: 400 }
        );
      }
    }

    // 3. Normalizar los mensajes recibidos.
    let rawMessages: SupportMessage[] = Array.isArray(body?.messages)
      ? body.messages
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
            id: `initial-${Date.now()}`,
            sender: "user",
            text: initialMessage.trim(),
          },
        ];
      }
    }

    if (rawMessages.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Debes escribir un mensaje para continuar.",
        },
        { status: 400 }
      );
    }

    const incomingMessages = normalizeMessages(
      rawMessages,
      isAdmin
    );

    if (incomingMessages.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No se recibió ningún mensaje válido.",
        },
        { status: 400 }
      );
    }

    const category =
      typeof body?.category === "string" &&
      body.category.trim()
        ? body.category.trim().slice(0, MAX_CATEGORY_LENGTH)
        : "Otro/pregunta";

    const subject =
      typeof body?.subject === "string" &&
      body.subject.trim()
        ? body.subject.trim().slice(0, MAX_SUBJECT_LENGTH)
        : "Solicitud de soporte";

    const requestedStatus = normalizeStatus(body?.status);

    // El nombre y el correo se obtienen de la sesión verificada.
    const metadata = user.user_metadata || {};

    const authenticatedUsername =
      typeof metadata.username === "string"
        ? metadata.username.slice(0, 100)
        : typeof metadata.full_name === "string"
        ? metadata.full_name.slice(0, 100)
        : null;

    const authenticatedEmail = user.email || null;

    // Solo los mensajes de usuario sirven como mensaje inicial.
    const userMessages = incomingMessages.filter(
      (message) => message.sender === "user"
    );

    const lastUserMessage =
      userMessages[userMessages.length - 1]?.text ||
      "El cliente solicitó atención del administrador.";

    // 4. Actualizar un ticket existente.
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

      // Un usuario solo puede modificar sus propios tickets.
      // Un administrador debe estar incluido en la lista autorizada.
      if (!isAdmin && existingTicket.user_id !== user.id) {
        return NextResponse.json(
          {
            success: false,
            error: "No tienes permiso para acceder a este ticket.",
          },
          { status: 403 }
        );
      }

      const conversation = mergeConversations(
        existingTicket.conversation,
        incomingMessages,
        isAdmin
      );

      // Los usuarios normales no pueden cambiar el estado.
      let finalStatus: SupportStatus = normalizeStatus(
        existingTicket.status
      ) || "PENDING";

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

      const {
        data: updatedTicket,
        error: updateError,
      } = await supabaseAdmin
        .from("support_tickets")
        .update({
          // No permitimos cambiar el propietario del ticket.
          user_id: existingTicket.user_id,

          username: existingTicket.username,
          email: existingTicket.email,

          category: isAdmin
            ? category
            : existingTicket.category,

          subject: isAdmin
            ? subject
            : existingTicket.subject,

          message:
            existingTicket.message ||
            lastUserMessage,

          conversation,
          status: finalStatus,
          updated_at: new Date().toISOString(),
        })
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

      // Notificar respuestas administrativas sin bloquear el guardado.
      const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
      const telegramAdminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;

      if (
        isAdmin &&
        lastAdminMessage &&
        telegramBotToken &&
        telegramAdminChatId
      ) {
        try {
          await fetch(
            `https://api.telegram.org/bot${telegramBotToken}/sendMessage`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: telegramAdminChatId,
                text: [
                  "💬 RESPUESTA ADMINISTRATIVA",
                  `🎫 Ticket: #${updatedTicket.id}`,
                  `📌 Estado: ${updatedTicket.status}`,
                  "",
                  lastAdminMessage.text.slice(0, 3000),
                ].join("\n"),
              }),
              signal: AbortSignal.timeout(5000),
            }
          );
        } catch (telegramError) {
          console.error(
            "Error notificando actualización por Telegram:",
            telegramError
          );
        }
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
          headers: { "Cache-Control": "no-store" },
        }
      );
    }

    // 5. Crear ticket nuevo.
    // No permitimos que un mensaje administrativo cree tickets en nombre
    // de otro usuario mediante datos proporcionados por el navegador.
    if (isAdmin && incomingMessages.every((m) => m.sender === "admin")) {
      return NextResponse.json(
        {
          success: false,
          error: "No se puede crear un ticket nuevo solo con mensajes administrativos.",
        },
        { status: 400 }
      );
    }

    const conversation = mergeConversations(
      [],
      incomingMessages,
      isAdmin
    );

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
        message: lastUserMessage,
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

    // 6. Notificar a Telegram al crear un ticket nuevo.
    const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
    const telegramAdminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;

    if (telegramBotToken && telegramAdminChatId) {
      const notification = [
        "🆘 NUEVO TICKET DE SOPORTE",
        "",
        `🎫 Ticket: #${ticket.id}`,
        "📌 Estado: PENDIENTE",
        "",
        `📂 Categoría: ${category}`,
        `📝 Asunto: ${subject}`,
        "",
        authenticatedUsername
          ? `👤 Usuario: ${authenticatedUsername}`
          : "👤 Usuario: No identificado",
        authenticatedEmail
          ? `📧 Email: ${authenticatedEmail}`
          : "",
        `🆔 Usuario ID: ${user.id}`,
        "",
        "💬 Mensaje del cliente:",
        lastUserMessage.slice(0, 3000),
      ]
        .filter(Boolean)
        .join("\n");

      try {
        const telegramResponse = await fetch(
          `https://api.telegram.org/bot${telegramBotToken}/sendMessage`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: telegramAdminChatId,
              text: notification,
            }),
            signal: AbortSignal.timeout(5000),
          }
        );

        if (!telegramResponse.ok) {
          console.error(
            "Telegram rechazó la notificación:",
            telegramResponse.status
          );
        }
      } catch (telegramError) {
        // El ticket ya se guardó; un fallo de Telegram no debe
        // convertir la creación en un error para el usuario.
        console.error(
          "Error enviando notificación a Telegram:",
          telegramError
        );
      }
    } else {
      console.warn(
        "Telegram no está configurado: faltan TELEGRAM_BOT_TOKEN o TELEGRAM_ADMIN_CHAT_ID."
      );
    }

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
        headers: { "Cache-Control": "no-store" },
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
