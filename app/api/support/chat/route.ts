
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";

const ADMIN_EMAIL =
  (process.env.SUPPORT_ADMIN_EMAIL ||
    "juliocesarblancomedina08@gmail.com").toLowerCase();

const ADMIN_USER_IDS = (process.env.SUPPORT_ADMIN_USER_IDS || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;

type SupportMessage = {
  id: string;
  sender: "user" | "ai" | "admin";
  text: string;
  created_at: string;
};

function jsonError(
  error: string,
  status = 400,
  code?: string
) {
  return NextResponse.json(
    {
      success: false,
      error,
      ...(code ? { code } : {}),
    },
    { status }
  );
}

function messageText(value: unknown): string {
  if (typeof value === "string") return value.trim();

  if (value && typeof value === "object") {
    const item = value as Record<string, unknown>;

    for (const key of ["text", "message", "content"]) {
      if (typeof item[key] === "string") {
        return (item[key] as string).trim();
      }
    }
  }

  return "";
}

function normalizeConversation(value: unknown): SupportMessage[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item, index): SupportMessage | null => {
      if (!item || typeof item !== "object") return null;

      const row = item as Record<string, unknown>;

      const rawSender = String(
        row.sender || row.role || ""
      ).toLowerCase();

      let sender: SupportMessage["sender"];

      if (rawSender === "user") {
        sender = "user";
      } else if (
        rawSender === "ai" ||
        rawSender === "assistant" ||
        rawSender === "bot"
      ) {
        sender = "ai";
      } else if (rawSender === "admin" || rawSender === "agent") {
        sender = "admin";
      } else {
        return null;
      }

      const text = messageText(row);
      if (!text) return null;

      const createdAt =
        typeof row.created_at === "string"
          ? row.created_at
          : typeof row.createdAt === "string"
            ? row.createdAt
            : new Date().toISOString();

      return {
        id:
          typeof row.id === "string" && row.id.trim()
            ? row.id
            : `support-${sender}-${index}-${createdAt}`,
        sender,
        text,
        created_at: createdAt,
      };
    })
    .filter((item): item is SupportMessage => item !== null);
}

function getLatestUserMessage(body: Record<string, unknown>) {
  const directMessage = messageText(body.message || body.text);

  if (directMessage) return directMessage;

  const messages = normalizeConversation(body.messages);

  for (let index = messages.length - 1; index >= 0; index--) {
    if (messages[index].sender === "user") {
      return messages[index].text;
    }
  }

  return "";
}

function createMessageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function fallbackReply(category: string) {
  return [
    "Gracias por contactar con el soporte de STORE GAMING.",
    "",
    "He recibido tu mensaje, pero en este momento no he podido generar una respuesta automática.",
    "Tu consulta puede continuar desde el panel de soporte para que el equipo la revise.",
    "",
    category ? `Categoría: ${category}.` : "",
    "Por favor, no envíes el mismo mensaje repetidamente. Si el problema continúa, utiliza el ticket existente.",
  ]
    .filter(Boolean)
    .join("\n");
}

async function generateAIReply(
  conversation: SupportMessage[],
  category: string,
  subject: string
): Promise<string> {
  if (!OPENAI_API_KEY) {
    return fallbackReply(category);
  }

  const recentMessages = conversation.slice(-12).map((message) => ({
    role:
      message.sender === "user"
        ? "user"
        : "assistant",
    content:
      message.sender === "admin"
        ? `[Respuesta del administrador] ${message.text}`
        : message.text,
  }));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        instructions: [
          "Eres el asistente de soporte de STORE GAMING.",
          "Responde siempre en español, con claridad, amabilidad y brevedad.",
          "Ayuda con compras, pagos, recargas, tarjetas, suscripciones, pedidos y consultas sobre la API.",
          "No inventes pagos, pedidos, reembolsos, saldos ni cambios de estado.",
          "No afirmes que has realizado acciones en la cuenta si no tienes herramientas para realizarlas.",
          "Si necesitas que un administrador intervenga, indícalo y recomienda continuar el ticket desde el panel de soporte.",
          "Nunca solicites contraseñas, claves privadas ni códigos de autenticación.",
        ].join(" "),
        input: [
          {
            role: "user",
            content: `Categoría del ticket: ${category || "No especificada"}\nAsunto: ${subject || "No especificado"}`,
          },
          ...recentMessages,
        ],
        max_output_tokens: 500,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return fallbackReply(category);
    }

    const data = (await response.json()) as {
      output_text?: string;
      output?: Array<{
        content?: Array<{
          type?: string;
          text?: string;
        }>;
      }>;
    };

    let answer =
      typeof data.output_text === "string"
        ? data.output_text.trim()
        : "";

    if (!answer && Array.isArray(data.output)) {
      answer = data.output
        .flatMap((item) => item.content || [])
        .filter((item) => item.type === "output_text")
        .map((item) => item.text || "")
        .join("\n")
        .trim();
    }

    return answer || fallbackReply(category);
  } catch {
    return fallbackReply(category);
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return jsonError(
        "El servidor de soporte no está configurado correctamente.",
        500,
        "SERVER_CONFIG"
      );
    }

    const authorization = request.headers.get("authorization") || "";
    const tokenMatch = authorization.match(/^Bearer\s+(.+)$/i);

    if (!tokenMatch) {
      return jsonError(
        "Debes iniciar sesión para utilizar el soporte.",
        401,
        "UNAUTHORIZED"
      );
    }

    const token = tokenMatch[1].trim();

    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return jsonError(
        "Tu sesión no es válida. Inicia sesión nuevamente.",
        401,
        "INVALID_SESSION"
      );
    }

    const isAdmin =
      (user.email || "").toLowerCase() === ADMIN_EMAIL ||
      ADMIN_USER_IDS.includes(user.id);

    if (isAdmin) {
      return jsonError(
        "Las respuestas administrativas deben enviarse desde el panel de soporte.",
        403,
        "ADMIN_PANEL_REQUIRED"
      );
    }

    let body: Record<string, unknown>;

    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return jsonError("El contenido enviado no es válido.");
    }

    const rawTicketId = body.ticketId ?? body.ticket_id;
    const ticketId = Number(rawTicketId);

    if (
      rawTicketId === undefined ||
      rawTicketId === null ||
      rawTicketId === "" ||
      !Number.isSafeInteger(ticketId) ||
      ticketId <= 0
    ) {
      return jsonError(
        "No se recibió un identificador de ticket válido.",
        400,
        "INVALID_TICKET_ID"
      );
    }

    const incomingText = getLatestUserMessage(body);

    if (!incomingText) {
      return jsonError(
        "Escribe un mensaje antes de enviarlo.",
        400,
        "EMPTY_MESSAGE"
      );
    }

    if (incomingText.length > 5000) {
      return jsonError(
        "El mensaje es demasiado largo. Reduce su extensión e inténtalo nuevamente.",
        400,
        "MESSAGE_TOO_LONG"
      );
    }

    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from("support_tickets")
      .select("id,user_id,category,subject,message,conversation,status")
      .eq("id", ticketId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (ticketError) {
      console.error("Error consultando ticket de soporte:", ticketError);

      return jsonError(
        "No se pudo consultar el ticket. Inténtalo nuevamente.",
        500,
        "TICKET_READ_ERROR"
      );
    }

    if (!ticket) {
      return jsonError(
        "No se encontró el ticket o no tienes permiso para acceder.",
        404,
        "TICKET_NOT_FOUND"
      );
    }

    const status = String(ticket.status || "").toUpperCase();

    if (["COMPLETED", "CLOSED"].includes(status)) {
      return jsonError(
        "Este ticket está cerrado. Abre o utiliza un ticket disponible para continuar.",
        409,
        "TICKET_CLOSED"
      );
    }

    let conversation = normalizeConversation(ticket.conversation);

    if (
      conversation.length === 0 &&
      typeof ticket.message === "string" &&
      ticket.message.trim()
    ) {
      conversation.push({
        id: createMessageId(),
        sender: "user",
        text: ticket.message.trim(),
        created_at: new Date().toISOString(),
      });
    }

    const lastMessage = conversation[conversation.length - 1];

    // Evita agregar otra copia si el cliente ya guardó el mensaje.
    const sameLastUserMessage =
      lastMessage?.sender === "user" &&
      lastMessage.text.trim() === incomingText.trim();

    if (!sameLastUserMessage) {
      conversation.push({
        id: createMessageId(),
        sender: "user",
        text: incomingText,
        created_at: new Date().toISOString(),
      });
    }

    const userMessage =
      conversation[conversation.length - 1];

    // Si ya existe una respuesta posterior para este mensaje, no la duplica.
    const userMessageIndex = conversation.findIndex(
      (message) => message.id === userMessage.id
    );

    const existingReply = conversation
      .slice(userMessageIndex + 1)
      .find(
        (message) =>
          message.sender === "ai" || message.sender === "admin"
      );

    if (existingReply) {
      return NextResponse.json({
        success: true,
        message: existingReply.text,
        response: existingReply.text,
        answer: existingReply.text,
        sender: existingReply.sender,
        ticketId: ticket.id,
        saved: true,
        duplicate: true,
        conversation,
      });
    }

    // Guardar primero el mensaje del cliente.
    const { error: saveUserError } = await supabaseAdmin
      .from("support_tickets")
      .update({
        conversation,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ticketId)
      .eq("user_id", user.id);

    if (saveUserError) {
      console.error("Error guardando mensaje del cliente:", saveUserError);

      return jsonError(
        "No se pudo guardar tu mensaje. Inténtalo nuevamente.",
        500,
        "MESSAGE_SAVE_ERROR"
      );
    }

    const category = String(ticket.category || body.category || "");
    const subject = String(ticket.subject || body.subject || "");

    const answer = await generateAIReply(
      conversation,
      category,
      subject
    );

    const aiMessage: SupportMessage = {
      id: createMessageId(),
      sender: "ai",
      text: answer,
      created_at: new Date().toISOString(),
    };

    // Volver a leer para no sobrescribir una respuesta del administrador
    // o mensajes que hayan llegado mientras se generaba la respuesta.
    const { data: latestTicket, error: latestError } = await supabaseAdmin
      .from("support_tickets")
      .select("conversation")
      .eq("id", ticketId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (latestError || !latestTicket) {
      console.error("No se pudo verificar el ticket tras la respuesta:", latestError);

      return NextResponse.json({
        success: true,
        message: answer,
        response: answer,
        answer,
        sender: "ai",
        ticketId: ticket.id,
        saved: false,
        warning: "La respuesta se generó, pero no se pudo confirmar su guardado.",
      });
    }

    const latestConversation = normalizeConversation(
      latestTicket.conversation
    );

    const alreadyAnswered = latestConversation.some(
      (message) =>
        message.sender === "ai" &&
        message.created_at >= userMessage.created_at
    );

    if (alreadyAnswered) {
      const lastAI = [...latestConversation]
        .reverse()
        .find((message) => message.sender === "ai");

      return NextResponse.json({
        success: true,
        message: lastAI?.text || answer,
        response: lastAI?.text || answer,
        answer: lastAI?.text || answer,
        sender: "ai",
        ticketId: ticket.id,
        saved: true,
        duplicate: true,
        conversation: latestConversation,
      });
    }

    const finalConversation = [...latestConversation, aiMessage];

    const { error: saveAIError } = await supabaseAdmin
      .from("support_tickets")
      .update({
        conversation: finalConversation,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ticketId)
      .eq("user_id", user.id);

    if (saveAIError) {
      console.error("Error guardando respuesta de IA:", saveAIError);

      return NextResponse.json({
        success: true,
        message: answer,
        response: answer,
        answer,
        sender: "ai",
        ticketId: ticket.id,
        saved: false,
        warning: "La respuesta se generó, pero no se pudo guardar en el ticket.",
      });
    }

    return NextResponse.json({
      success: true,
      message: answer,
      response: answer,
      answer,
      sender: "ai",
      ticketId: ticket.id,
      saved: true,
      conversation: finalConversation,
    });
  } catch (error) {
    console.error("Error inesperado en soporte IA:", error);

    return jsonError(
      "Ocurrió un error inesperado al responder. Puedes intentarlo nuevamente.",
      500,
      "INTERNAL_ERROR"
    );
  }
}
