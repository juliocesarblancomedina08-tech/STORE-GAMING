
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
  .map((id) => id.trim())
  .filter(Boolean);

type ConversationMessage = {
  id?: string;
  sender?: string;
  text?: string;
  message?: string;
  content?: string;
  created_at?: string;
  [key: string]: unknown;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function normalizeConversation(value: unknown): ConversationMessage[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(
      (item): item is ConversationMessage =>
        !!item && typeof item === "object"
    )
    .map((item) => ({
      ...item,
      sender: String(item.sender || "user"),
      text: String(item.text || item.message || item.content || ""),
    }))
    .filter((item) => item.text?.trim());
}

function isAdmin(user: {
  id: string;
  email?: string;
}): boolean {
  const emailMatches =
    !!SUPPORT_ADMIN_EMAIL &&
    user.email?.toLowerCase() === SUPPORT_ADMIN_EMAIL.toLowerCase();

  return (
    emailMatches ||
    SUPPORT_ADMIN_USER_IDS.includes(user.id)
  );
}

function fallbackAnswer() {
  return (
    "Ahora mismo no puedo generar una respuesta automática. " +
    "Tu mensaje se ha recibido y puedes continuar por este ticket. " +
    "Inténtalo de nuevo más tarde."
  );
}

function extractMessage(body: Record<string, unknown>): string {
  const possibleFields = [
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

  for (const value of possibleFields) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  // Compatibilidad con algunos formularios que envían el mensaje anidado.
  const nested = body.data;

  if (nested && typeof nested === "object") {
    const data = nested as Record<string, unknown>;

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

function extractTicketId(body: Record<string, unknown>): number {
  const candidates = [
    body.ticketId,
    body.ticket_id,
    body.ticketID,
    body.id,
    body.ticket,
  ];

  for (const value of candidates) {
    const raw =
      value && typeof value === "object"
        ? (value as Record<string, unknown>).id
        : value;

    if (
      (typeof raw === "number" ||
        typeof raw === "string") &&
      String(raw).trim() !== ""
    ) {
      const parsed = Number(raw);

      if (Number.isSafeInteger(parsed) && parsed > 0) {
        return parsed;
      }
    }
  }

  return 0;
}

export async function POST(request: NextRequest) {
  try {
    let parsedBody: unknown;

    try {
      parsedBody = await request.json();
    } catch {
      return jsonError("El cuerpo de la petición no es JSON válido.", 400);
    }

    if (
      !parsedBody ||
      typeof parsedBody !== "object" ||
      Array.isArray(parsedBody)
    ) {
      return jsonError("Los datos enviados no son válidos.", 400);
    }

    const body = parsedBody as Record<string, unknown>;
    const ticketId = extractTicketId(body);
    const userMessage = extractMessage(body);

    if (!ticketId) {
      return jsonError(
        "Falta el ID del ticket o no tiene un formato válido.",
        400
      );
    }

    if (!userMessage) {
      console.warn(
        "Soporte: no se encontró el mensaje. Campos recibidos:",
        Object.keys(body)
      );

      return jsonError(
        "Escribe un mensaje antes de enviarlo. Si ya escribiste, actualiza la página y vuelve a intentarlo.",
        400
      );
    }

    if (userMessage.length > 6000) {
      return jsonError(
        "El mensaje es demasiado largo. Máximo 6000 caracteres.",
        400
      );
    }

    const authorization = request.headers.get("authorization");
    const accessToken = authorization?.startsWith("Bearer ")
      ? authorization.slice(7).trim()
      : "";

    if (!accessToken) {
      return jsonError(
        "Debes iniciar sesión para usar el soporte.",
        401
      );
    }

    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(accessToken);

    if (authError || !user) {
      return jsonError(
        "La sesión no es válida o ha caducado. Inicia sesión nuevamente.",
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
      console.error("Error consultando el ticket:", ticketError);
      return jsonError("No se pudo consultar el ticket.", 500);
    }

    if (!ticket) {
      return jsonError("No se encontró el ticket.", 404);
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
        "Este ticket está cerrado. Abre uno nuevo para continuar.",
        409
      );
    }

    const conversation = normalizeConversation(
      ticket.conversation
    );

    const userEntry: ConversationMessage = {
      id: crypto.randomUUID(),
      sender: "user",
      text: userMessage,
      created_at: new Date().toISOString(),
    };

    const updatedConversation = [
      ...conversation,
      userEntry,
    ];

    async function saveConversation(
      messages: ConversationMessage[]
    ): Promise<boolean> {
      const { data, error } = await supabaseAdmin
        .from("support_tickets")
        .update({ conversation: messages })
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

    const userMessageSaved = await saveConversation(
      updatedConversation
    );

    if (!userMessageSaved) {
      return jsonError(
        "No se pudo guardar el mensaje en el ticket.",
        500
      );
    }

    async function saveFallback() {
      const answer = fallbackAnswer();

      const assistantEntry: ConversationMessage = {
        id: crypto.randomUUID(),
        sender: "assistant",
        text: answer,
        created_at: new Date().toISOString(),
      };

      const saved = await saveConversation([
        ...updatedConversation,
        assistantEntry,
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
      console.error("Falta configurar OPENAI_API_KEY en Vercel.");
      return await saveFallback();
    }

    let ticketContext = "";

    try {
      const baseUrl = request.nextUrl.origin;

      const toolHeaders = {
        Authorization: `Bearer ${accessToken}`,
      };

      const [depositsResponse, ordersResponse] =
        await Promise.all([
          fetch(
            `${baseUrl}/api/support/tools/deposits?limit=100`,
            {
              headers: toolHeaders,
              cache: "no-store",
            }
          ),
          fetch(
            `${baseUrl}/api/support/tools/orders?limit=100`,
            {
              headers: toolHeaders,
              cache: "no-store",
            }
          ),
        ]);

      const deposits = depositsResponse.ok
        ? await depositsResponse.text()
        : "No se pudieron consultar los depósitos.";

      const orders = ordersResponse.ok
        ? await ordersResponse.text()
        : "No se pudieron consultar los pedidos.";

      ticketContext = `
INFORMACIÓN DE DEPÓSITOS:
${deposits.slice(0, 10000)}

INFORMACIÓN DE PEDIDOS:
${orders.slice(0, 10000)}
`;
    } catch (error) {
      console.error(
        "Error cargando el contexto del soporte:",
        error
      );
    }

    const conversationText = updatedConversation
      .slice(-20)
      .map((message) => {
        const sender =
          message.sender === "assistant"
            ? "Asistente"
            : "Cliente";

        return `${sender}: ${message.text}`;
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

Responde en español, de forma amable, clara y breve.
Utiliza la información disponible para ayudar al cliente.
No inventes depósitos, pedidos, pagos, reembolsos ni estados.
No afirmes que un pago se ha recibido si no está verificado.
Si no tienes información suficiente, explícalo y recomienda continuar por el ticket.
Nunca solicites contraseñas, claves privadas ni frases semilla.
            `.trim(),
            input: `
ID DEL TICKET: ${ticketId}

CONTEXTO DEL SISTEMA:
${ticketContext}

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

    const responseData = await openAIResponse
      .json()
      .catch(() => ({}));

    if (!openAIResponse.ok) {
      console.error(
        "Error de OpenAI:",
        openAIResponse.status,
        responseData
      );

      return await saveFallback();
    }

    const outputText =
      typeof responseData.output_text === "string"
        ? responseData.output_text
        : "";

    const outputItems = Array.isArray(responseData.output)
      ? responseData.output
      : [];

    const extractedOutput = outputItems
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
      .join("\n");

    const answer = (
      outputText || extractedOutput
    ).trim();

    if (!answer) {
      console.error(
        "OpenAI respondió sin texto utilizable."
      );

      return await saveFallback();
    }

    const assistantEntry: ConversationMessage = {
      id: crypto.randomUUID(),
      sender: "assistant",
      text: answer,
      created_at: new Date().toISOString(),
    };

    const assistantMessageSaved = await saveConversation([
      ...updatedConversation,
      assistantEntry,
    ]);

    return NextResponse.json({
      success: true,
      saved: assistantMessageSaved,
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
