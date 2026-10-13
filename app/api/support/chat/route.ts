
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";

const SUPPORT_ADMIN_EMAIL = process.env.SUPPORT_ADMIN_EMAIL;
const SUPPORT_ADMIN_USER_IDS = (
  process.env.SUPPORT_ADMIN_USER_IDS || ""
)
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

type ChatMessage = {
  id?: string | number;
  sender: string;
  text: string;
  created_at?: string;
};

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

function normalizeConversation(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(
      (item): item is Record<string, unknown> =>
        !!item && typeof item === "object"
    )
    .map((item) => {
      const rawText =
        typeof item.text === "string"
          ? item.text
          : typeof item.message === "string"
            ? item.message
            : typeof item.content === "string"
              ? item.content
              : "";

      const rawSender = String(
        item.sender || item.role || "user"
      ).toLowerCase();

      let sender = "user";

      if (rawSender === "assistant" || rawSender === "ai") {
        sender = "assistant";
      } else if (rawSender === "admin") {
        sender = "admin";
      }

      return {
        id:
          typeof item.id === "string" ||
          typeof item.id === "number"
            ? item.id
            : undefined,
        sender,
        text: rawText.trim(),
        created_at:
          typeof item.created_at === "string"
            ? item.created_at
            : undefined,
      };
    })
    .filter((item) => item.text.length > 0);
}

function extractLastUserMessage(
  body: Record<string, unknown>
): string {
  // La página actual envía el historial bajo "messages".
  if (Array.isArray(body.messages)) {
    const messages = normalizeConversation(body.messages);

    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].sender === "user") {
        return messages[i].text;
      }
    }
  }

  // Compatibilidad con peticiones que envían un mensaje individual.
  const fields = [
    body.message,
    body.text,
    body.content,
    body.userMessage,
    body.user_message,
    body.prompt,
    body.input,
    body.messageText,
    body.message_text,
    body.newMessage,
    body.new_message,
  ];

  for (const value of fields) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  // Compatibilidad con un objeto data anidado.
  if (
    body.data &&
    typeof body.data === "object" &&
    !Array.isArray(body.data)
  ) {
    const data = body.data as Record<string, unknown>;

    for (const key of [
      "message",
      "text",
      "content",
      "userMessage",
      "user_message",
    ]) {
      const value = data[key];

      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }
  }

  return "";
}

function extractTicketId(
  body: Record<string, unknown>
): number {
  const values = [
    body.ticketId,
    body.ticket_id,
    body.ticketID,
    body.id,
    body.ticket,
  ];

  for (const value of values) {
    const candidate =
      value && typeof value === "object"
        ? (value as Record<string, unknown>).id
        : value;

    if (
      (typeof candidate === "string" ||
        typeof candidate === "number") &&
      String(candidate).trim()
    ) {
      const id = Number(candidate);

      if (Number.isSafeInteger(id) && id > 0) {
        return id;
      }
    }
  }

  return 0;
}

function isAdmin(user: {
  id: string;
  email?: string;
}): boolean {
  const emailMatches =
    !!SUPPORT_ADMIN_EMAIL &&
    user.email?.toLowerCase() ===
      SUPPORT_ADMIN_EMAIL.toLowerCase();

  return (
    emailMatches ||
    SUPPORT_ADMIN_USER_IDS.includes(user.id)
  );
}

function fallbackAnswer(): string {
  return (
    "He recibido tu consulta, pero el asistente automático " +
    "no está disponible en este momento. Tu mensaje permanece " +
    "en el ticket. Inténtalo de nuevo más tarde o solicita " +
    "ayuda al administrador."
  );
}

export async function POST(request: NextRequest) {
  try {
    let parsed: unknown;

    try {
      parsed = await request.json();
    } catch {
      return jsonError("La petición no contiene JSON válido.", 400);
    }

    if (
      !parsed ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      return jsonError("Los datos enviados no son válidos.", 400);
    }

    const body = parsed as Record<string, unknown>;
    const ticketId = extractTicketId(body);
    const userMessage = extractLastUserMessage(body);

    if (!ticketId) {
      return jsonError(
        "No se recibió un ID de ticket válido.",
        400
      );
    }

    if (!userMessage) {
      console.warn(
        "Soporte: no se encontró un mensaje de usuario.",
        {
          fields: Object.keys(body),
          messagesIsArray: Array.isArray(body.messages),
        }
      );

      return jsonError(
        "No se encontró el texto del mensaje. Comprueba que escribiste el mensaje e inténtalo de nuevo.",
        400
      );
    }

    if (userMessage.length > 6000) {
      return jsonError(
        "El mensaje supera el máximo de 6000 caracteres.",
        400
      );
    }

    const authorization =
      request.headers.get("authorization") || "";

    const accessToken = authorization.startsWith("Bearer ")
      ? authorization.slice(7).trim()
      : "";

    if (!accessToken) {
      return jsonError(
        "Tu sesión ha expirado. Inicia sesión de nuevo.",
        401
      );
    }

    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(accessToken);

    if (authError || !user) {
      return jsonError(
        "La sesión no es válida. Inicia sesión de nuevo.",
        401
      );
    }

    const { data: ticket, error: ticketError } =
      await supabaseAdmin
        .from("support_tickets")
        .select("*")
        .eq("id", ticketId)
        .maybeSingle();

    if (ticketError) {
      console.error(
        "Error consultando support_tickets:",
        ticketError
      );

      return jsonError(
        "No se pudo consultar el ticket.",
        500
      );
    }

    if (!ticket) {
      return jsonError(
        "No se encontró el ticket solicitado.",
        404
      );
    }

    const ownerId = String(
      ticket.user_id ?? ticket.customer_id ?? ""
    );

    if (ownerId !== user.id && !isAdmin(user)) {
      return jsonError(
        "No tienes permiso para acceder a este ticket.",
        403
      );
    }

    const status = String(ticket.status || "").toUpperCase();

    if (
      ["CLOSED", "COMPLETED", "CANCELLED"].includes(status)
    ) {
      return jsonError(
        "Este ticket está cerrado. Abre una nueva consulta.",
        409
      );
    }

    /*
     * La página guarda primero la conversación mediante
     * /api/support/ticket. Por eso leemos la conversación
     * actual y no agregamos dos veces el último mensaje.
     */
    let conversation = normalizeConversation(
      ticket.conversation
    );

    const lastMessage = conversation[conversation.length - 1];

    if (
      !lastMessage ||
      lastMessage.sender !== "user" ||
      lastMessage.text.trim() !== userMessage
    ) {
      conversation = [
        ...conversation,
        {
          id: crypto.randomUUID(),
          sender: "user",
          text: userMessage,
          created_at: new Date().toISOString(),
        },
      ];
    }

    async function saveConversation(
      messages: ChatMessage[]
    ): Promise<boolean> {
      const storedConversation = messages.map((item) => ({
        id: item.id ?? crypto.randomUUID(),
        sender: item.sender,
        text: item.text,
        created_at:
          item.created_at || new Date().toISOString(),
      }));

      const { data, error } = await supabaseAdmin
        .from("support_tickets")
        .update({ conversation: storedConversation })
        .eq("id", ticketId)
        .select("id");

      if (error) {
        console.error(
          "Error guardando la conversación:",
          error
        );

        return false;
      }

      return !!data?.length;
    }

    const userSaved = await saveConversation(conversation);

    if (!userSaved) {
      return jsonError(
        "No se pudo guardar el mensaje en la consulta.",
        500
      );
    }

    async function returnFallback() {
      const answer = fallbackAnswer();

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        sender: "assistant",
        text: answer,
        created_at: new Date().toISOString(),
      };

      const saved = await saveConversation([
        ...conversation,
        assistantMessage,
      ]);

      return NextResponse.json({
        success: true,
        saved,
        fallback: true,
        message: answer,
        response: answer,
        answer,
        needsAdmin: true,
        showAdminButton: true,
      });
    }

    if (!OPENAI_API_KEY) {
      console.error(
        "Falta OPENAI_API_KEY en las variables de Vercel."
      );

      return await returnFallback();
    }

    let supportContext = "";

    try {
      const baseUrl = request.nextUrl.origin;

      const headers = {
        Authorization: `Bearer ${accessToken}`,
      };

      const [depositsResponse, ordersResponse] =
        await Promise.all([
          fetch(
            `${baseUrl}/api/support/tools/deposits?limit=100`,
            {
              headers,
              cache: "no-store",
            }
          ),
          fetch(
            `${baseUrl}/api/support/tools/orders?limit=100`,
            {
              headers,
              cache: "no-store",
            }
          ),
        ]);

      const deposits = depositsResponse.ok
        ? await depositsResponse.text()
        : "Información de depósitos no disponible.";

      const orders = ordersResponse.ok
        ? await ordersResponse.text()
        : "Información de pedidos no disponible.";

      supportContext = `
DEPÓSITOS:
${deposits.slice(0, 10000)}

PEDIDOS:
${orders.slice(0, 10000)}
`;
    } catch (error) {
      console.error(
        "Error consultando los datos del soporte:",
        error
      );
    }

    const conversationText = conversation
      .slice(-20)
      .map((item) => {
        const name =
          item.sender === "assistant"
            ? "Asistente"
            : item.sender === "admin"
              ? "Administrador"
              : "Cliente";

        return `${name}: ${item.text}`;
      })
      .join("\n");

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      25000
    );

    let openAIResponse: Response;

    try {
      openAIResponse = await fetch(
        "https://api.openai.com/v1/responses",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          signal: controller.signal,
          body: JSON.stringify({
            model: OPENAI_MODEL,
            instructions: `
Eres el asistente oficial de soporte de STORE GAMING.
Responde en español, de forma clara, breve y amable.
Utiliza los datos disponibles como contexto, pero no inventes
depósitos, pedidos, pagos, reembolsos ni estados.
No confirmes pagos sin pruebas verificables.
Si no tienes información suficiente, explícalo y recomienda
continuar mediante el ticket o solicitar un administrador.
Nunca pidas contraseñas, claves privadas ni frases semilla.
            `.trim(),
            input: `
TICKET: ${ticketId}

CONTEXTO DEL SISTEMA:
${supportContext}

CONVERSACIÓN:
${conversationText}

Responde al último mensaje del cliente.
            `.trim(),
          }),
        }
      );
    } finally {
      clearTimeout(timeout);
    }

    const openAIData = await openAIResponse
      .json()
      .catch(() => ({}));

    if (!openAIResponse.ok) {
      console.error(
        "Error de OpenAI:",
        openAIResponse.status,
        openAIData
      );

      return await returnFallback();
    }

    let answer =
      typeof openAIData.output_text === "string"
        ? openAIData.output_text.trim()
        : "";

    if (!answer && Array.isArray(openAIData.output)) {
      answer = openAIData.output
        .flatMap((item: { content?: unknown[] }) =>
          Array.isArray(item.content) ? item.content : []
        )
        .map((content: unknown) => {
          if (
            content &&
            typeof content === "object" &&
            "text" in content &&
            typeof content.text === "string"
          ) {
            return content.text;
          }

          return "";
        })
        .filter(Boolean)
        .join("\n")
        .trim();
    }

    if (!answer) {
      console.error(
        "OpenAI no devolvió texto en la respuesta."
      );

      return await returnFallback();
    }

    const assistantMessage: ChatMessage = {
      id: crypto.randomUUID(),
      sender: "assistant",
      text: answer,
      created_at: new Date().toISOString(),
    };

    const saved = await saveConversation([
      ...conversation,
      assistantMessage,
    ]);

    return NextResponse.json({
      success: true,
      saved,
      fallback: false,
      message: answer,
      response: answer,
      answer,
      needsAdmin: false,
      showAdminButton: false,
    });
  } catch (error) {
    console.error(
      "Error en /api/support/chat:",
      error
    );

    if (
      error instanceof Error &&
      error.name === "AbortError"
    ) {
      return jsonError(
        "El asistente tardó demasiado en responder. Inténtalo de nuevo.",
        504
      );
    }

    return jsonError(
      "Ocurrió un error interno al procesar el mensaje.",
      500
    );
  }
}
