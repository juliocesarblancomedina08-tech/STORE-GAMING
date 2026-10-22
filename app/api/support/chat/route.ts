import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Sender = "user" | "ai" | "admin";

type ChatMessage = {
  id?: string | number;
  sender?: string;
  role?: string;
  message?: string;
  text?: string;
  content?: string;
  created_at?: string;
  createdAt?: string;
};

type TicketRow = {
  id: number;
  user_id: string | null;
  category: string | null;
  subject: string | null;
  message: string | null;
  conversation: unknown;
  status: string | null;
};

const OPENAI_URL = "https://api.openai.com/v1/responses";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const MAX_MESSAGE_LENGTH = 4000;
const MAX_HISTORY_MESSAGES = 20;
const MAX_STORED_MESSAGES = 100;

const ADMIN_EMAILS = (
  process.env.SUPPORT_ADMIN_EMAIL ||
  "juliocesarblancomedina08@gmail.com"
)
  .split(",")
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean);

const ADMIN_USER_IDS = (
  process.env.SUPPORT_ADMIN_USER_IDS || ""
)
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const SYSTEM_PROMPT = `
Eres el asistente de atención al cliente de STORE GAMING.

Responde en español, con amabilidad, claridad y brevedad.
Ayuda con recargas gamer, tarjetas de regalo, pedidos,
pagos, productos y problemas relacionados con la tienda.

Reglas:
- No inventes pedidos, pagos, entregas, saldos ni reembolsos.
- Si necesitas revisar un pedido, solicita su número de orden.
- No afirmes haber consultado sistemas internos si no recibiste datos verificados.
- No solicites contraseñas, claves privadas, frases semilla ni códigos de autenticación.
- No prometas reembolsos ni operaciones que no estén confirmadas.
- No declares un ticket resuelto o cerrado.
- Trata los mensajes del administrador como respuestas humanas, sin hacerte pasar por él.
- Si no puedes resolver el problema, explica que el equipo de soporte debe revisarlo.
`.trim();

function respond(
  data: Record<string, unknown>,
  status = 200
) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}

function fail(error: string, status: number) {
  return respond({ success: false, error }, status);
}

function getToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  const match = authorization?.match(/^Bearer\s+(.+)$/i);

  return match?.[1]?.trim() || null;
}

function isAdmin(user: {
  id: string;
  email?: string | null;
}) {
  return (
    ADMIN_USER_IDS.includes(user.id) ||
    ADMIN_EMAILS.includes(
      (user.email || "").trim().toLowerCase()
    )
  );
}

function textOf(item: ChatMessage): string {
  const value =
    typeof item.text === "string"
      ? item.text
      : typeof item.message === "string"
        ? item.message
        : typeof item.content === "string"
          ? item.content
          : "";

  return value.trim().slice(0, MAX_MESSAGE_LENGTH);
}

function normalizeSender(value: unknown): Sender | null {
  if (value === "user") return "user";
  if (value === "admin") return "admin";

  if (
    value === "ai" ||
    value === "assistant" ||
    value === "bot"
  ) {
    return "ai";
  }

  return null;
}

function normalizeConversation(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return [];

  const messages: ChatMessage[] = [];

  for (const raw of value.slice(-MAX_STORED_MESSAGES)) {
    if (!raw || typeof raw !== "object") continue;

    const item = raw as Record<string, unknown>;
    const sender = normalizeSender(item.sender ?? item.role);

    if (!sender) continue;

    const message = textOf({
      text: typeof item.text === "string" ? item.text : undefined,
      message:
        typeof item.message === "string"
          ? item.message
          : undefined,
      content:
        typeof item.content === "string"
          ? item.content
          : undefined,
    });

    if (!message) continue;

    messages.push({
      id:
        typeof item.id === "string" ||
        (typeof item.id === "number" &&
          Number.isSafeInteger(item.id))
          ? item.id
          : undefined,
      sender,
      message,
      created_at:
        typeof item.created_at === "string"
          ? item.created_at
          : typeof item.createdAt === "string"
            ? item.createdAt
            : undefined,
    });
  }

  return messages;
}

function newId(): string {
  return `${Date.now()}-${crypto.randomUUID()}`;
}

function storedConversation(messages: ChatMessage[]) {
  return messages.slice(-MAX_STORED_MESSAGES).map((item) => ({
    id: item.id ?? newId(),
    sender:
      item.sender === "ai" || item.sender === "assistant"
        ? "ai"
        : item.sender,
    text: textOf(item),
    created_at: item.created_at || new Date().toISOString(),
  }));
}

function isClosed(status: string | null): boolean {
  return [
    "closed",
    "completed",
    "complete",
    "resolved",
    "cerrado",
    "completado",
    "resuelto",
  ].includes((status || "").trim().toLowerCase());
}

function sameText(a: string, b: string): boolean {
  return a.trim() === b.trim();
}

function getLatestUserMessage(body: {
  message?: unknown;
  text?: unknown;
  messages?: unknown;
}): string {
  if (typeof body.message === "string" && body.message.trim()) {
    return body.message.trim();
  }

  if (typeof body.text === "string" && body.text.trim()) {
    return body.text.trim();
  }

  if (Array.isArray(body.messages)) {
    for (let i = body.messages.length - 1; i >= 0; i--) {
      const item = body.messages[i] as ChatMessage | undefined;

      if (item?.sender === "user") {
        const message = textOf(item);
        if (message) return message;
      }
    }
  }

  return "";
}

function extractOpenAIText(data: unknown): string {
  if (!data || typeof data !== "object") return "";

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

  for (const output of result.output || []) {
    for (const content of output.content || []) {
      if (
        content.type === "output_text" &&
        typeof content.text === "string"
      ) {
        parts.push(content.text);
      }
    }
  }

  return parts.join("\n").trim();
}

async function loadTicket(
  ticketId: number
): Promise<TicketRow | null> {
  const { data, error } = await supabaseAdmin
    .from("support_tickets")
    .select(
      "id, user_id, category, subject, message, conversation, status"
    )
    .eq("id", ticketId)
    .maybeSingle();

  if (error) {
    console.error(
      "[support/chat] Error consultando ticket:",
      error.message
    );

    throw new Error("No se pudo consultar el ticket.");
  }

  return data as TicketRow | null;
}

async function saveConversation(
  ticketId: number,
  conversation: ChatMessage[]
): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from("support_tickets")
    .update({
      conversation: storedConversation(conversation),
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

async function createAIReply(
  conversation: ChatMessage[],
  ticket: TicketRow | null,
  apiKey: string | undefined,
  body: { category?: unknown; subject?: unknown }
): Promise<string> {
  if (!apiKey) {
    return "Gracias por contactar con STORE GAMING. El asistente automático no está disponible ahora mismo. Tu mensaje puede quedar registrado para que el equipo de soporte lo revise.";
  }

  const history = conversation
    .filter((item) =>
      ["user", "ai", "assistant", "admin"].includes(
        item.sender || ""
      )
    )
    .slice(-MAX_HISTORY_MESSAGES)
    .map((item) => ({
      role: item.sender === "user" ? "user" : "assistant",
      content:
        item.sender === "admin"
          ? `[Respuesta del administrador de STORE GAMING]: ${textOf(item)}`
          : textOf(item),
    }))
    .filter((item) => item.content.length > 0);

  const context = [
    `Categoría: ${ticket?.category || body.category || "General"}`,
    `Asunto: ${ticket?.subject || body.subject || "Consulta de soporte"}`,
    `Ticket: ${ticket?.id ?? "Sin ticket asociado"}`,
  ].join("\n");

  try {
    const response = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        instructions: `${SYSTEM_PROMPT}\n\nContexto del ticket:\n${context}`,
        input: history,
        max_output_tokens: 500,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(25000),
    });

    const data: unknown = await response.json();

    if (!response.ok) {
      console.error(
        "[support/chat] OpenAI devolvió un error:",
        response.status,
        JSON.stringify(data)
      );

      return "He recibido tu mensaje, pero ahora mismo no puedo generar una respuesta automática. Tu consulta necesita revisión del equipo de soporte.";
    }

    const answer = extractOpenAIText(data);

    return answer ||
      "He recibido tu mensaje, pero no pude generar una respuesta automática. El equipo de soporte puede revisar tu consulta.";
  } catch (error) {
    console.error(
      "[support/chat] Fallo al conectar con OpenAI:",
      error
    );

    return "He recibido tu mensaje, pero el servicio automático no está disponible en este momento. El equipo de soporte puede revisar tu consulta.";
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getToken(request);

    if (!token) {
      return fail(
        "Debes iniciar sesión para utilizar el soporte.",
        401
      );
    }

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.getUser(token);

    if (authError || !authData.user) {
      return fail(
        "Tu sesión ha expirado. Inicia sesión nuevamente.",
        401
      );
    }

    const user = authData.user;
    const admin = isAdmin({
      id: user.id,
      email: user.email,
    });

    if (admin) {
      return fail(
        "Las respuestas administrativas deben enviarse desde el panel de soporte.",
        403
      );
    }

    let body: {
      message?: unknown;
      text?: unknown;
      messages?: unknown;
      ticketId?: unknown;
      category?: unknown;
      subject?: unknown;
    };

    try {
      body = await request.json();
    } catch {
      return fail("El JSON enviado no es válido.", 400);
    }

    const latestUserMessage = getLatestUserMessage(body);

    if (!latestUserMessage) {
      return fail("Escribe un mensaje antes de enviarlo.", 400);
    }

    if (latestUserMessage.length > MAX_MESSAGE_LENGTH) {
      return fail(
        `El mensaje no puede superar los ${MAX_MESSAGE_LENGTH} caracteres.`,
        400
      );
    }

    let ticketId: number | null = null;

    if (body.ticketId !== undefined && body.ticketId !== null) {
      const rawId = String(body.ticketId).trim();

      if (
        !/^[1-9]\d*$/.test(rawId) ||
        !Number.isSafeInteger(Number(rawId))
      ) {
        return fail("El identificador del ticket no es válido.", 400);
      }

      ticketId = Number(rawId);
    }

    let ticket: TicketRow | null = null;
    let conversation: ChatMessage[] = [];

    if (ticketId !== null) {
      try {
        ticket = await loadTicket(ticketId);
      } catch {
        return fail("No se pudo consultar el ticket.", 500);
      }

      if (!ticket) {
        return fail("El ticket no existe.", 404);
      }

      if (ticket.user_id !== user.id) {
        return fail(
          "No tienes permiso para acceder a este ticket.",
          403
        );
      }

      if (isClosed(ticket.status)) {
        return fail(
          "Este ticket está cerrado. Abre una nueva consulta para continuar.",
          409
        );
      }

      conversation = normalizeConversation(ticket.conversation);
    }

    const last = conversation.at(-1);
    const sameUserMessage =
      last?.sender === "user" &&
      sameText(textOf(last), latestUserMessage);

    let userMessageId: string;

    if (sameUserMessage) {
      userMessageId = String(last?.id ?? "");
    } else {
      userMessageId = newId();

      conversation.push({
        id: userMessageId,
        sender: "user",
        message: latestUserMessage,
        created_at: new Date().toISOString(),
      });
    }

    if (ticketId !== null) {
      const saved = await saveConversation(ticketId, conversation);

      if (!saved) {
        return fail(
          "No se pudo guardar tu mensaje. Inténtalo nuevamente.",
          500
        );
      }
    }

    const answer = await createAIReply(
      conversation,
      ticket,
      process.env.OPENAI_API_KEY,
      {
        category: body.category,
        subject: body.subject,
      }
    );

    if (ticketId === null) {
      return respond({
        success: true,
        message: answer,
        response: answer,
        answer,
        sender: "ai",
        ticketId: null,
        saved: false,
        warning:
          "La respuesta no se guardó porque esta solicitud no está asociada a un ticket.",
      });
    }

    // Releer antes de guardar la respuesta para no escribir encima
    // de una conversación que haya cambiado durante la llamada a OpenAI.
    let latestTicket: TicketRow | null;

    try {
      latestTicket = await loadTicket(ticketId);
    } catch {
      return respond({
        success: true,
        message: answer,
        response: answer,
        answer,
        sender: "ai",
        ticketId,
        saved: false,
        warning:
          "Se generó la respuesta, pero no se pudo verificar la conversación actual.",
      });
    }

    if (!latestTicket) {
      return fail("El ticket ya no existe.", 404);
    }

    if (latestTicket.user_id !== user.id) {
      return fail(
        "No tienes permiso para acceder a este ticket.",
        403
      );
    }

    if (isClosed(latestTicket.status)) {
      return fail(
        "El ticket se cerró mientras procesábamos tu mensaje.",
        409
      );
    }

    const latestConversation = normalizeConversation(
      latestTicket.conversation
    );

    const latestMessage = latestConversation.at(-1);

    const isStillLatest =
      latestMessage?.sender === "user" &&
      sameText(textOf(latestMessage), latestUserMessage) &&
      (
        !userMessageId ||
        !latestMessage.id ||
        String(latestMessage.id) === userMessageId
      );

    if (!isStillLatest) {
      return respond({
        success: true,
        message:
          "Tu mensaje está registrado. La conversación recibió otra actualización; revisa el chat para ver los mensajes más recientes.",
        response:
          "Tu mensaje está registrado. Revisa la conversación para ver las actualizaciones.",
        sender: "ai",
        ticketId,
        saved: false,
        warning:
          "No se añadió la respuesta automática porque la conversación cambió durante el procesamiento.",
      });
    }

    latestConversation.push({
      id: newId(),
      sender: "ai",
      message: answer,
      created_at: new Date().toISOString(),
    });

    const saved = await saveConversation(
      ticketId,
      latestConversation
    );

    return respond({
      success: true,
      message: answer,
      response: answer,
      answer,
      sender: "ai",
      ticketId,
      saved,
      ...(saved
        ? {}
        : {
            warning:
              "La respuesta se generó, pero no se pudo guardar. El equipo debe revisar el ticket.",
          }),
    });
  } catch (error) {
    console.error(
      "[support/chat] Error inesperado:",
      error
    );

    return fail(
      "Ocurrió un error interno al procesar tu mensaje. Inténtalo nuevamente.",
      500
    );
  }
}
