
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ChatSender = "user" | "ai" | "assistant" | "admin" | "system";

interface ChatMessage {
  id?: string | number;
  sender: ChatSender;
  message?: string;
  text?: string;
  content?: string;
  created_at?: string;
}

interface ChatRequestBody {
  message?: string;
  text?: string;
  messages?: ChatMessage[];
  ticketId?: string | number | null;
  category?: string;
  subject?: string;
}

interface TicketRow {
  id: string | number;
  user_id?: string | null;
  username?: string | null;
  email?: string | null;
  category?: string | null;
  subject?: string | null;
  message?: string | null;
  conversation?: unknown;
  status?: string | null;
}

const OPENAI_URL = "https://api.openai.com/v1/responses";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";

const SUPPORT_SYSTEM_PROMPT = `
Eres el asistente de atención al cliente de STORE GAMING.

Responde en español, de forma amable, clara y breve.
Ayuda con recargas gamer, tarjetas de regalo, pedidos,
pagos y problemas relacionados con la tienda.

Utiliza solamente la información disponible en la conversación.
No inventes pagos recibidos, pedidos entregados, saldos,
transacciones, reembolsos ni confirmaciones.

Si necesitas que una persona revise el caso, explica que
el equipo de soporte debe comprobarlo.

Nunca solicites contraseñas, claves privadas, frases semilla
ni códigos de autenticación.
No afirmes que has realizado una operación si no existe
una confirmación verificable.
`.trim();

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function getMessageText(item: ChatMessage): string {
  const value = item.message ?? item.text ?? item.content ?? "";
  return typeof value === "string" ? value.trim() : "";
}

function normalizeConversation(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === "object" && item !== null
    )
    .map((item) => {
      const rawSender =
        typeof item.sender === "string" ? item.sender.toLowerCase() : "";

      let sender: ChatSender = "ai";

      if (rawSender === "user") {
        sender = "user";
      } else if (rawSender === "admin") {
        sender = "admin";
      } else if (rawSender === "system") {
        sender = "system";
      } else if (
        rawSender === "assistant" ||
        rawSender === "ai" ||
        rawSender === "bot"
      ) {
        sender = "ai";
      }

      const message = getMessageText({
        sender,
        message:
          typeof item.message === "string" ? item.message : undefined,
        text: typeof item.text === "string" ? item.text : undefined,
        content:
          typeof item.content === "string" ? item.content : undefined,
      });

      return {
        id:
          typeof item.id === "string" || typeof item.id === "number"
            ? item.id
            : undefined,
        sender,
        message,
        created_at:
          typeof item.created_at === "string"
            ? item.created_at
            : undefined,
      };
    })
    .filter((item) => item.message.length > 0);
}

function sameMessage(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function extractLatestUserMessage(
  body: ChatRequestBody,
  conversation: ChatMessage[]
): string {
  const directMessage =
    typeof body.message === "string"
      ? body.message.trim()
      : typeof body.text === "string"
        ? body.text.trim()
        : "";

  if (directMessage) {
    return directMessage;
  }

  if (Array.isArray(body.messages)) {
    for (let index = body.messages.length - 1; index >= 0; index--) {
      const item = body.messages[index];

      if (item && item.sender === "user") {
        const message = getMessageText(item);

        if (message) {
          return message;
        }
      }
    }
  }

  for (let index = conversation.length - 1; index >= 0; index--) {
    const item = conversation[index];

    if (item.sender === "user") {
      const message = getMessageText(item);

      if (message) {
        return message;
      }
    }
  }

  return "";
}

function getOpenAIText(data: unknown): string {
  if (!data || typeof data !== "object") {
    return "";
  }

  const result = data as {
    output_text?: unknown;
    output?: Array<{
      content?: Array<{
        type?: string;
        text?: string;
      }>;
    }>;
  };

  if (
    typeof result.output_text === "string" &&
    result.output_text.trim()
  ) {
    return result.output_text.trim();
  }

  const parts: string[] = [];

  if (Array.isArray(result.output)) {
    for (const outputItem of result.output) {
      if (!Array.isArray(outputItem.content)) {
        continue;
      }

      for (const contentItem of outputItem.content) {
        if (
          contentItem.type === "output_text" &&
          typeof contentItem.text === "string"
        ) {
          parts.push(contentItem.text);
        }
      }
    }
  }

  return parts.join("\n").trim();
}

function isOpenAIQuotaError(data: unknown): boolean {
  if (!data || typeof data !== "object") {
    return false;
  }

  const error = (data as {
    error?: { code?: string; type?: string; message?: string };
  }).error;

  if (!error) {
    return false;
  }

  const details = [
    error.code,
    error.type,
    error.message,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    details.includes("insufficient_quota") ||
    details.includes("credit_balance_exhausted") ||
    details.includes("billing")
  );
}

async function saveConversation(
  ticketId: string | number,
  messages: ChatMessage[]
): Promise<boolean> {
  const storedConversation = messages.map((item) => ({
    id: item.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    sender: item.sender === "ai" ? "assistant" : item.sender,
    text: getMessageText(item),
    created_at: item.created_at ?? new Date().toISOString(),
  }));

  const { error } = await supabaseAdmin
    .from("support_tickets")
    .update({
      conversation: storedConversation,
      updated_at: new Date().toISOString(),
    })
    .eq("id", ticketId);

  if (error) {
    console.error(
      "[support/chat] Error guardando conversación:",
      error.message
    );
    return false;
  }

  return true;
}

export async function POST(request: NextRequest) {
  try {
    let body: ChatRequestBody;

    try {
      body = (await request.json()) as ChatRequestBody;
    } catch {
      return jsonError("El cuerpo de la solicitud no es un JSON válido.", 400);
    }

    const ticketId = body.ticketId;

    if (
      ticketId !== undefined &&
      ticketId !== null &&
      !(
        (typeof ticketId === "number" &&
          Number.isSafeInteger(ticketId) &&
          ticketId > 0) ||
        (typeof ticketId === "string" &&
          /^\d+$/.test(ticketId) &&
          Number(ticketId) > 0)
      )
    ) {
      return jsonError("El identificador del ticket no es válido.", 400);
    }

    const authorization = request.headers.get("authorization");
    const accessToken = authorization?.startsWith("Bearer ")
      ? authorization.slice(7).trim()
      : "";

    let authenticatedUserId: string | null = null;

    if (accessToken) {
      const { data: authData, error: authError } =
        await supabaseAdmin.auth.getUser(accessToken);

      if (authError || !authData.user) {
        return jsonError(
          "Tu sesión ha expirado. Inicia sesión nuevamente.",
          401
        );
      }

      authenticatedUserId = authData.user.id;
    }

    let ticket: TicketRow | null = null;
    let conversation: ChatMessage[] = [];

    if (ticketId !== undefined && ticketId !== null) {
      const { data, error } = await supabaseAdmin
        .from("support_tickets")
        .select(
          "id, user_id, username, email, category, subject, message, conversation, status"
        )
        .eq("id", ticketId)
        .maybeSingle();

      if (error) {
        console.error(
          "[support/chat] Error consultando ticket:",
          error.message
        );
        return jsonError("No se pudo consultar el ticket de soporte.", 500);
      }

      if (!data) {
        return jsonError("El ticket de soporte no existe.", 404);
      }

      ticket = data as TicketRow;

      const adminEmails = (process.env.SUPPORT_ADMIN_EMAIL || "")
        .split(",")
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean);

      const adminUserIds = (process.env.SUPPORT_ADMIN_USER_IDS || "")
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);

      let isAdmin = false;

      if (authenticatedUserId) {
        const { data: userData } =
          await supabaseAdmin.auth.admin.getUserById(
            authenticatedUserId
          );

        const userEmail = userData.user?.email?.toLowerCase() ?? "";

        isAdmin =
          adminUserIds.includes(authenticatedUserId) ||
          (userEmail !== "" && adminEmails.includes(userEmail));
      }

      if (!authenticatedUserId && ticket.user_id) {
        return jsonError(
          "Debes iniciar sesión para acceder a este ticket.",
          401
        );
      }

      if (
        ticket.user_id &&
        authenticatedUserId !== ticket.user_id &&
        !isAdmin
      ) {
        return jsonError(
          "No tienes permiso para acceder a este ticket.",
          403
        );
      }

      const status = (ticket.status || "").toLowerCase();

      if (
        ["closed", "completed", "resolved", "cerrado", "completado", "resuelto"].includes(
          status
        )
      ) {
        return jsonError(
          "Este ticket está cerrado. Abre uno nuevo para continuar.",
          409
        );
      }

      conversation = normalizeConversation(ticket.conversation);
    }

    const clientMessages = normalizeConversation(body.messages);

    // El frontend puede enviar el mensaje dentro de "messages",
    // sin incluir un campo "message" independiente.
    const latestUserMessage = extractLatestUserMessage(
      body,
      clientMessages.length > 0 ? clientMessages : conversation
    );

    if (!latestUserMessage) {
      return jsonError(
        "Escribe un mensaje antes de enviarlo.",
        400
      );
    }

    // Se conserva la conversación guardada en la base de datos.
    // Si el frontend ya guardó el último mensaje, no lo duplicamos.
    if (clientMessages.length > 0) {
      for (const item of clientMessages) {
        const text = getMessageText(item);

        if (!text) {
          continue;
        }

        const exists = conversation.some(
          (saved) =>
            saved.sender === item.sender &&
            sameMessage(getMessageText(saved), text)
        );

        if (!exists) {
          conversation.push({
            sender: item.sender,
            message: text,
            created_at: item.created_at ?? new Date().toISOString(),
          });
        }
      }
    }

    const latestMessageAlreadyExists = conversation.some(
      (item) =>
        item.sender === "user" &&
        sameMessage(getMessageText(item), latestUserMessage)
    );

    if (!latestMessageAlreadyExists) {
      conversation.push({
        sender: "user",
        message: latestUserMessage,
        created_at: new Date().toISOString(),
      });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    let assistantReply = "";

    if (!apiKey) {
      assistantReply =
        "Gracias por contactar con STORE GAMING. En este momento, el asistente automático no está configurado. Tu mensaje puede quedar registrado en el ticket para que el equipo de soporte lo revise.";
    } else {
      const history = conversation
        .filter(
          (item) =>
            item.sender === "user" ||
            item.sender === "ai" ||
            item.sender === "assistant" ||
            item.sender === "admin"
        )
        .slice(-20)
        .map((item) => ({
          role:
            item.sender === "user" ? "user" : "assistant",
          content: getMessageText(item),
        }))
        .filter((item) => item.content.length > 0);

      const ticketContext = [
        `Categoría: ${ticket?.category || body.category || "General"}`,
        `Asunto: ${ticket?.subject || body.subject || "Consulta de soporte"}`,
        `Ticket: ${ticket?.id ?? "Sin ticket asociado"}`,
      ].join("\n");

      try {
        const openAIResponse = await fetch(OPENAI_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: OPENAI_MODEL,
            instructions: `${SUPPORT_SYSTEM_PROMPT}\n\nContexto del ticket:\n${ticketContext}`,
            input: history,
            max_output_tokens: 500,
          }),
          cache: "no-store",
        });

        const responseData: unknown = await openAIResponse.json();

        if (!openAIResponse.ok) {
          if (isOpenAIQuotaError(responseData)) {
            assistantReply =
              "Gracias por escribir a STORE GAMING. El asistente automático no puede responder en este momento porque el servicio de IA necesita revisar su facturación o sus créditos. Tu consulta se conservará en el ticket para su revisión.";
          } else {
            console.error(
              "[support/chat] Error de OpenAI:",
              JSON.stringify(responseData)
            );

            assistantReply =
              "He recibido tu mensaje, pero ahora mismo no puedo generar una respuesta automática. Tu consulta puede quedar registrada para que el equipo de soporte la revise.";
          }
        } else {
          assistantReply = getOpenAIText(responseData);

          if (!assistantReply) {
            assistantReply =
              "He recibido tu mensaje, pero no he podido generar una respuesta. Inténtalo nuevamente más tarde.";
          }
        }
      } catch (error) {
        console.error("[support/chat] Error conectando con OpenAI:", error);

        assistantReply =
          "He recibido tu mensaje, pero el servicio de respuestas automáticas no está disponible en este momento. Inténtalo más tarde.";
      }
    }

    conversation.push({
      sender: "ai",
      message: assistantReply,
      created_at: new Date().toISOString(),
    });

    let saved = false;

    if (ticketId !== undefined && ticketId !== null) {
      saved = await saveConversation(ticketId, conversation);

      if (!saved) {
        return NextResponse.json(
          {
            message: assistantReply,
            response: assistantReply,
            answer: assistantReply,
            sender: "ai",
            saved: false,
            warning:
              "La respuesta se generó, pero no se pudo guardar la conversación.",
          },
          { status: 200 }
        );
      }
    }

    return NextResponse.json(
      {
        message: assistantReply,
        response: assistantReply,
        answer: assistantReply,
        sender: "ai",
        ticketId: ticketId ?? null,
        saved,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[support/chat] Error inesperado:", error);

    return NextResponse.json(
      {
        error:
          "Ocurrió un error interno al procesar tu mensaje. Inténtalo nuevamente.",
      },
      { status: 500 }
    );
  }
}
