
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

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
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
    "Tu solicitud puede continuar por el sistema de tickets. " +
    "Por favor, vuelve a intentarlo más tarde."
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const ticketId = Number(body.ticketId ?? body.ticket_id);
    const userMessage = String(
      body.message ?? body.text ?? ""
    ).trim();

    if (
      !Number.isSafeInteger(ticketId) ||
      ticketId <= 0
    ) {
      return jsonError("El ID del ticket no es válido.", 400);
    }

    if (!userMessage) {
      return jsonError("Escribe un mensaje antes de enviarlo.", 400);
    }

    if (userMessage.length > 6000) {
      return jsonError("El mensaje es demasiado largo.", 400);
    }

    const authorization = request.headers.get("authorization");
    const accessToken = authorization?.startsWith("Bearer ")
      ? authorization.slice(7).trim()
      : "";

    if (!accessToken) {
      return jsonError("Debes iniciar sesión para usar el soporte.", 401);
    }

    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(accessToken);

    if (authError || !user) {
      return jsonError("La sesión no es válida o ha caducado.", 401);
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

    if (["CLOSED", "COMPLETED", "CANCELLED"].includes(status)) {
      return jsonError(
        "Este ticket está cerrado. Abre uno nuevo para continuar.",
        409
      );
    }

    const conversation = normalizeConversation(ticket.conversation);

    const lastMessage = conversation[conversation.length - 1];

    // Evita guardar dos veces la misma solicitud si el cliente reintenta.
    if (
      lastMessage?.sender === "user" &&
      lastMessage.text?.trim() === userMessage
    ) {
      // Continúa con la generación de la respuesta.
    }

    const userEntry: ConversationMessage = {
      id: crypto.randomUUID(),
      sender: "user",
      text: userMessage,
      created_at: new Date().toISOString(),
    };

    const updatedConversation = [...conversation, userEntry];

    const saveConversation = async (
      messages: ConversationMessage[]
    ) => {
      const { data, error } = await supabaseAdmin
        .from("support_tickets")
        .update({ conversation: messages })
        .eq("id", ticketId)
        .select("id");

      if (error) {
        console.error("Error guardando conversación:", error);
        return false;
      }

      return !!data?.length;
    };

    const savedUserMessage = await saveConversation(
      updatedConversation
    );

    if (!savedUserMessage) {
      return jsonError(
        "No se pudo guardar tu mensaje en el ticket.",
        500
      );
    }

    if (!OPENAI_API_KEY) {
      const answer = fallbackAnswer();

      const assistantEntry: ConversationMessage = {
        id: crypto.randomUUID(),
        sender: "assistant",
        text: answer,
        created_at: new Date().toISOString(),
      };

      await saveConversation([
        ...updatedConversation,
        assistantEntry,
      ]);

      return NextResponse.json({
        success: true,
        saved: true,
        fallback: true,
        message: answer,
        response: answer,
        answer,
        needsAdmin: true,
        showAdminButton: true,
      });
    }

    let ticketContext = "";

    try {
      const baseUrl = request.nextUrl.origin;

      const toolHeaders = {
        Authorization: `Bearer ${accessToken}`,
      };

      const [depositsResponse, ordersResponse] = await Promise.all([
        fetch(
          `${baseUrl}/api/support/tools/deposits?limit=100`,
          { headers: toolHeaders, cache: "no-store" }
        ),
        fetch(
          `${baseUrl}/api/support/tools/orders?limit=100`,
          { headers: toolHeaders, cache: "no-store" }
        ),
      ]);

      const deposits = depositsResponse.ok
        ? await depositsResponse.text()
        : "No se pudieron consultar los depósitos.";

      const orders = ordersResponse.ok
        ? await ordersResponse.text()
        : "No se pudieron consultar los pedidos.";

      ticketContext = `
Información disponible de depósitos:
${deposits.slice(0, 10000)}

Información disponible de pedidos:
${orders.slice(0, 10000)}
`;
    } catch (error) {
      console.error("Error cargando contexto de soporte:", error);
    }

    const conversationText = updatedConversation
      .slice(-20)
      .map(
        (message) =>
          `${message.sender === "assistant" ? "Asistente" : "Cliente"}: ${message.text}`
      )
      .join("\n");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

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
Eres el asistente de soporte de STORE GAMING.
Responde en español, con claridad, amabilidad y brevedad.
Usa los datos proporcionados únicamente como contexto.
No inventes pagos, depósitos, pedidos, reembolsos ni estados.
Nunca afirmes que una operación se completó si no está confirmada.
Si no puedes verificar algo, explícalo y recomienda continuar mediante el ticket.
No solicites contraseñas, claves privadas ni frases semilla.
            `.trim(),
            input: `
Ticket ID: ${ticketId}

Contexto del sistema:
${ticketContext}

Conversación:
${conversationText}

Responde al último mensaje del cliente.
            `.trim(),
          }),
        }
      );
    } finally {
      clearTimeout(timeout);
    }

    const responseData = await openAIResponse.json().catch(() => ({}));

    if (!openAIResponse.ok) {
      console.error(
        "Error de OpenAI:",
        openAIResponse.status,
        responseData
      );

      const answer = fallbackAnswer();

      const assistantEntry: ConversationMessage = {
        id: crypto.randomUUID(),
        sender: "assistant",
        text: answer,
        created_at: new Date().toISOString(),
      };

      await saveConversation([
        ...updatedConversation,
        assistantEntry,
      ]);

      return NextResponse.json({
        success: true,
        saved: true,
        fallback: true,
        message: answer,
        response: answer,
        answer,
        needsAdmin: true,
        showAdminButton: true,
      });
    }

    const answer = String(
      responseData.output_text ||
        responseData.output
          ?.flatMap((item: { content?: Array<{ text?: string }> }) =>
            item.content || []
          )
          .map((content: { text?: string }) => content.text || "")
          .join("\n") ||
        ""
    ).trim();

    if (!answer) {
      return NextResponse.json({
        success: false,
        error: "El asistente no devolvió una respuesta.",
      }, { status: 502 });
    }

    const assistantEntry: ConversationMessage = {
      id: crypto.randomUUID(),
      sender: "assistant",
      text: answer,
      created_at: new Date().toISOString(),
    };

    const savedAssistantMessage = await saveConversation([
      ...updatedConversation,
      assistantEntry,
    ]);

    return NextResponse.json({
      success: true,
      saved: savedAssistantMessage,
      fallback: false,
      message: answer,
      response: answer,
      answer,
      needsAdmin: false,
      showAdminButton: false,
    });
  } catch (error) {
    console.error("Error en /api/support/chat:", error);

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
