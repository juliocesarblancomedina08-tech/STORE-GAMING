
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "";

const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";

type ChatMessage = {
  id?: string | number;
  sender: "user" | "ai" | "admin";
  message: string;
  created_at?: string;
};

function jsonError(
  error: string,
  status = 400,
  code?: string
) {
  return NextResponse.json(
    { success: false, error, code },
    { status }
  );
}

function normalizeConversation(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(
      (item): item is Record<string, unknown> =>
        !!item && typeof item === "object"
    )
    .map((item) => {
      const rawSender = String(
        item.sender || item.role || "user"
      ).toLowerCase();

      const sender: ChatMessage["sender"] =
        rawSender === "admin"
          ? "admin"
          : rawSender === "ai" ||
              rawSender === "assistant"
            ? "ai"
            : "user";

      return {
        id:
          typeof item.id === "string" ||
          typeof item.id === "number"
            ? item.id
            : undefined,
        sender,
        message: String(
          item.message || item.text || item.content || ""
        ).trim(),
        created_at:
          typeof item.created_at === "string"
            ? item.created_at
            : undefined,
      };
    })
    .filter((item) => item.message.length > 0);
}

function sameMessage(
  a: ChatMessage,
  b: ChatMessage
): boolean {
  return (
    a.sender === b.sender &&
    a.message.trim() === b.message.trim()
  );
}

function mergeMessages(
  existing: ChatMessage[],
  incoming: ChatMessage[]
): ChatMessage[] {
  const result = [...existing];

  for (const message of incoming) {
    const duplicateById =
      message.id !== undefined &&
      result.some(
        (item) =>
          item.id !== undefined &&
          String(item.id) === String(message.id)
      );

    if (duplicateById) continue;

    const duplicateByContent = result.some(
      (item) =>
        sameMessage(item, message) &&
        item.created_at === message.created_at
    );

    if (!duplicateByContent) result.push(message);
  }

  return result;
}

async function generateAIResponse(
  conversation: ChatMessage[],
  category: string,
  subject: string
): Promise<string> {
  if (!OPENAI_API_KEY) {
    return "Gracias por contactar con STORE GAMING. Tu mensaje quedó registrado. Nuestro equipo de soporte te ayudará con tu consulta. Si necesitas atención personal, utiliza el botón para solicitar al administrador.";
  }

  const history = conversation
    .slice(-20)
    .map((item) => ({
      role:
        item.sender === "user"
          ? "user"
          : "assistant",
      content:
        item.sender === "admin"
          ? `[Mensaje del administrador]: ${item.message}`
          : item.message,
    }));

  const response = await fetch(
    "https://api.openai.com/v1/responses",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        instructions: [
          "Eres el asistente de soporte oficial de STORE GAMING.",
          "Responde en español, de forma clara, amable y breve.",
          "Ayuda con pagos, pedidos, recargas, tarjetas, suscripciones y la API de STORE GAMING.",
          "Nunca afirmes que un pago se ha acreditado o que un pedido se ha completado si no tienes confirmación real de la base de datos.",
          "Nunca solicites contraseñas, claves privadas, códigos de autenticación ni claves secretas.",
          "No inventes estados de pedidos ni prometas tiempos de resolución.",
          "Si no puedes resolver el problema, indica que el usuario puede solicitar al administrador.",
          `Categoría del ticket: ${category || "No especificada"}.`,
          `Asunto del ticket: ${subject || "No especificado"}.`,
        ].join("\n"),
        input: history,
        max_output_tokens: 500,
      }),
      signal: AbortSignal.timeout(30000),
    }
  );

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
        `OpenAI respondió con estado ${response.status}`
    );
  }

  const outputText = String(data?.output_text || "").trim();

  if (outputText) return outputText;

  const extracted = Array.isArray(data?.output)
    ? data.output
        .flatMap((item: any) =>
          Array.isArray(item?.content) ? item.content : []
        )
        .filter((item: any) => item?.type === "output_text")
        .map((item: any) => item.text || "")
        .join("\n")
        .trim()
    : "";

  if (extracted) return extracted;

  throw new Error("La IA no devolvió texto.");
}

export async function POST(request: NextRequest) {
  try {
    if (
      !SUPABASE_URL ||
      !SUPABASE_ANON_KEY ||
      !SUPABASE_SERVICE_ROLE_KEY
    ) {
      return jsonError(
        "Falta configurar la URL o las claves de Supabase en las variables de entorno.",
        500,
        "SUPABASE_CONFIG"
      );
    }

    const authorization =
      request.headers.get("authorization") || "";

    const token = authorization.startsWith("Bearer ")
      ? authorization.slice(7).trim()
      : "";

    if (!token) {
      return jsonError(
        "Debes iniciar sesión para utilizar el soporte.",
        401,
        "UNAUTHORIZED"
      );
    }

    const supabaseAuth = createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser(token);

    if (authError || !user) {
      return jsonError(
        "La sesión no es válida. Inicia sesión nuevamente.",
        401,
        "INVALID_SESSION"
      );
    }

    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return jsonError("El cuerpo de la solicitud no es válido.");
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
        "El identificador del ticket no es válido.",
        400,
        "INVALID_TICKET_ID"
      );
    }

    const adminEmails = (
      process.env.SUPPORT_ADMIN_EMAIL ||
      "juliocesarblancomedina08@gmail.com"
    )
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);

    const adminIds = (
      process.env.SUPPORT_ADMIN_USER_IDS || ""
    )
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    const isAdmin =
      (!!user.email &&
        adminEmails.includes(user.email.toLowerCase())) ||
      adminIds.includes(user.id);

    if (isAdmin) {
      return jsonError(
        "Las respuestas administrativas deben enviarse desde el panel de soporte.",
        403,
        "ADMIN_USE_SUPPORT_PANEL"
      );
    }

    const supabase = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const { data: ticket, error: ticketError } =
      await supabase
        .from("support_tickets")
        .select(
          "id,user_id,category,subject,message,conversation,status"
        )
        .eq("id", ticketId)
        .eq("user_id", user.id)
        .maybeSingle();

    if (ticketError) {
      console.error("Error leyendo ticket:", ticketError);

      return jsonError(
        "No se pudo consultar el ticket de soporte.",
        500,
        "TICKET_READ_ERROR"
      );
    }

    if (!ticket) {
      return jsonError(
        "No se encontró el ticket o no tienes permiso para acceder a él.",
        404,
        "TICKET_NOT_FOUND"
      );
    }

    if (
      ["CLOSED", "COMPLETED"].includes(
        String(ticket.status || "").toUpperCase()
      )
    ) {
      return jsonError(
        "Este ticket está cerrado. Reábrelo antes de enviar otro mensaje.",
        409,
        "TICKET_CLOSED"
      );
    }

    const incoming = normalizeConversation(body.messages);

    const lastIncomingUser = [...incoming]
      .reverse()
      .find((item) => item.sender === "user");

    if (!lastIncomingUser) {
      return jsonError(
        "No se encontró el mensaje del usuario.",
        400,
        "USER_MESSAGE_MISSING"
      );
    }

    const currentConversation = normalizeConversation(
      ticket.conversation
    );

    const alreadyHasMessage = currentConversation.some(
      (item) =>
        item.sender === "user" &&
        (
          (
            lastIncomingUser.id !== undefined &&
            item.id !== undefined &&
            String(item.id) === String(lastIncomingUser.id)
          ) ||
          (
            item.message === lastIncomingUser.message &&
            item.created_at === lastIncomingUser.created_at
          )
        )
    );

    let conversation = mergeMessages(
      currentConversation,
      incoming
    );

    if (!alreadyHasMessage) {
      conversation = mergeMessages(
        conversation,
        [lastIncomingUser]
      );
    }

    const lastMessage = conversation[conversation.length - 1];

    if (
      lastMessage?.sender === "ai" &&
      conversation.length > 0
    ) {
      return NextResponse.json({
        success: true,
        saved: true,
        sender: "ai",
        ticketId,
        message: lastMessage.message,
        response: lastMessage.message,
        conversation,
      });
    }

    // Evita que un segundo mensaje se procese mientras el último
    // mensaje del usuario ya tiene una respuesta posterior guardada.
    const latestUserIndex = conversation
      .map((item) => item.sender)
      .lastIndexOf("user");

    const laterAIResponse = conversation
      .slice(latestUserIndex + 1)
      .find(
        (item) =>
          item.sender === "ai" || item.sender === "admin"
      );

    if (laterAIResponse) {
      return NextResponse.json({
        success: true,
        saved: true,
        sender: laterAIResponse.sender,
        ticketId,
        message: laterAIResponse.message,
        response: laterAIResponse.message,
        conversation,
      });
    }

    // Guardamos el mensaje del usuario antes de consultar la IA.
    const { error: saveUserError } = await supabase
      .from("support_tickets")
      .update({
        conversation,
        message: lastIncomingUser.message,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ticketId)
      .eq("user_id", user.id);

    if (saveUserError) {
      console.error("Error guardando mensaje:", saveUserError);

      return jsonError(
        "No se pudo guardar tu mensaje. Inténtalo nuevamente.",
        500,
        "MESSAGE_SAVE_ERROR"
      );
    }

    let answer: string;
    let aiUnavailable = false;

    try {
      answer = await generateAIResponse(
        conversation,
        String(ticket.category || body.category || ""),
        String(ticket.subject || body.subject || "")
      );
    } catch (error) {
      console.error("Error generando respuesta de IA:", error);

      aiUnavailable = true;
      answer =
        "Gracias por escribir a STORE GAMING. Tu mensaje quedó registrado, pero ahora mismo no pude generar una respuesta automática. Puedes volver a intentarlo o solicitar que el administrador continúe contigo.";
    }

    const aiMessage: ChatMessage = {
      id: `ai-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,
      sender: "ai",
      message: answer,
      created_at: new Date().toISOString(),
    };

    conversation = mergeMessages(conversation, [aiMessage]);

    const { error: saveAIError } = await supabase
      .from("support_tickets")
      .update({
        conversation,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ticketId)
      .eq("user_id", user.id);

    if (saveAIError) {
      console.error("Error guardando respuesta de IA:", saveAIError);

      return NextResponse.json(
        {
          success: false,
          saved: false,
          error:
            "La respuesta se generó, pero no se pudo guardar. Actualiza el chat para comprobar el estado.",
          code: "AI_SAVE_ERROR",
          ticketId,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      saved: true,
      sender: "ai",
      ticketId,
      message: answer,
      response: answer,
      answer,
      aiUnavailable,
      conversation,
    });
  } catch (error) {
    console.error("Error en /api/support/chat:", error);

    return jsonError(
      error instanceof Error &&
        error.name === "TimeoutError"
        ? "La consulta tardó demasiado. Inténtalo nuevamente."
        : "Ocurrió un error al procesar el mensaje de soporte.",
      500,
      "CHAT_INTERNAL_ERROR"
    );
  }
}
