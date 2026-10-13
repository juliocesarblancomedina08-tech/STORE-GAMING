
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

const SUPPORT_ADMIN_EMAILS = (
  process.env.SUPPORT_ADMIN_EMAIL ||
  "juliocesarblancomedina08@gmail.com"
)
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

const SUPPORT_ADMIN_USER_IDS = (
  process.env.SUPPORT_ADMIN_USER_IDS || ""
)
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

const MAX_MESSAGE_LENGTH = 4000;
const MAX_HISTORY_MESSAGES = 20;

const SUPPORT_SYSTEM_PROMPT = `
Eres el asistente de atención al cliente de STORE GAMING.

Responde en español, de forma amable, clara y breve.
Ayuda con recargas gamer, tarjetas de regalo, pedidos,
pagos, productos y problemas relacionados con la tienda.

REGLAS IMPORTANTES:

1. No inventes pedidos, pagos recibidos, entregas, saldos,
transacciones, reembolsos ni confirmaciones.

2. Si una consulta depende de un pedido, solicita su número
de orden. El formato de ejemplo es Orden-11111, pero no
afirmes que ese número pertenece a un pedido real.

3. Explica que el cliente puede buscar el número de orden
en los detalles o en la confirmación de su compra.

4. No afirmes que has consultado una base de datos, revisado
un pago o verificado una entrega si no recibiste datos reales
y verificables de una herramienta autorizada.

5. No tienes permiso para acceder por tu cuenta a cuentas,
pedidos, saldos o información privada. Si esa información
no está disponible en el contexto proporcionado, solicita
los datos no sensibles necesarios o deriva el caso al equipo.

6. Si el problema requiere comprobaciones internas, no puedes
resolverlo con la información disponible o el cliente lo pide,
explica que el equipo de soporte debe revisarlo.

7. Nunca solicites contraseñas, claves privadas, frases semilla,
códigos de autenticación ni otros secretos de acceso.

8. No prometas reembolsos ni afirmes que realizaste operaciones
que no hayan sido confirmadas.

9. Una respuesta tuya no significa que el problema esté resuelto.
No declares que un ticket está cerrado o completado. El estado
del ticket lo gestiona el sistema de soporte.

10. Si aparece una respuesta de un administrador en el historial,
respétala como una intervención humana. No afirmes ser ese
administrador ni atribuyas a la IA sus respuestas.

Si no tienes información suficiente, dilo claramente y ofrece
escalar la consulta al equipo de soporte.
`.trim();

function jsonError(message: string, status: number) {
  return NextResponse.json(
    { success: false, error: message },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    }
  );
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
    .map((item): ChatMessage => {
      const rawSender =
        typeof item.sender === "string"
          ? item.sender.toLowerCase()
          : "";

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
          typeof item.message === "string"
            ? item.message
            : undefined,
        text:
          typeof item.text === "string"
            ? item.text
            : undefined,
        content:
          typeof item.content === "string"
            ? item.content
            : undefined,
      });

      return {
        id:
          typeof item.id === "string" ||
          typeof item.id === "number"
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
    .filter((item) => getMessageText(item).length > 0);
}

function sameMessage(a: string, b: string): boolean {
  return a.trim() === b.trim();
}

function createMessageId(): string {
  return `${Date.now()}-${crypto.randomUUID()}`;
}

function toStoredConversation(messages: ChatMessage[]) {
  return messages.map((item) => ({
    id: item.id ?? createMessageId(),
    sender: item.sender === "ai" ? "assistant" : item.sender,
    text: getMessageText(item),
    created_at: item.created_at ?? new Date().toISOString(),
  }));
}

function extractLatestUserMessage(body: ChatRequestBody): string {
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

      if (item?.sender === "user") {
        const message = getMessageText(item);

        if (message) {
          return message;
        }
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

  const error = (
    data as {
      error?: {
        code?: string;
        type?: string;
        message?: string;
      };
    }
  ).error;

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

function isClosedStatus(status?: string | null): boolean {
  const normalized = (status || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  return [
    "closed",
    "completed",
    "complete",
    "resolved",
    "cerrado",
    "completado",
    "resuelto",
  ].includes(normalized);
}

async function saveConversation(
  ticketId: string | number,
  messages: ChatMessage[]
): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from("support_tickets")
    .update({
      conversation: toStoredConversation(messages),
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

async function getTicket(
  ticketId: string | number
): Promise<TicketRow | null> {
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
    throw new Error("No se pudo consultar el ticket.");
  }

  return data as TicketRow | null;
}

export async function POST(request: NextRequest) {
  try {
    let body: ChatRequestBody;

    try {
      body = (await request.json()) as ChatRequestBody;
    } catch {
      return jsonError(
        "El cuerpo de la solicitud no es un JSON válido.",
        400
      );
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
          Number.isSafeInteger(Number(ticketId)) &&
          Number(ticketId) > 0)
      )
    ) {
      return jsonError(
        "El identificador del ticket no es válido.",
        400
      );
    }

    // Todas las solicitudes deben tener una sesión válida.
    const authorization = request.headers.get("authorization");
    const accessToken = authorization?.startsWith("Bearer ")
      ? authorization.slice(7).trim()
      : "";

    if (!accessToken) {
      return jsonError(
        "Debes iniciar sesión para utilizar el soporte.",
        401
      );
    }

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.getUser(accessToken);

    if (authError || !authData.user) {
      return jsonError(
        "Tu sesión ha expirado. Inicia sesión nuevamente.",
        401
      );
    }

    const authenticatedUserId = authData.user.id;
    const userEmail = authData.user.email?.trim().toLowerCase() || "";

    const isAdmin =
      SUPPORT_ADMIN_USER_IDS.includes(authenticatedUserId) ||
      (userEmail !== "" &&
        SUPPORT_ADMIN_EMAILS.includes(userEmail));

    let ticket: TicketRow | null = null;
    let conversation: ChatMessage[] = [];

    if (ticketId !== undefined && ticketId !== null) {
      try {
        ticket = await getTicket(ticketId);
      } catch {
        return jsonError(
          "No se pudo consultar el ticket de soporte.",
          500
        );
      }

      if (!ticket) {
        return jsonError(
          "El ticket de soporte no existe.",
          404
        );
      }

      if (!ticket.user_id && !isAdmin) {
        return jsonError(
          "Este ticket no tiene un propietario válido. Contacta con soporte.",
          403
        );
      }

      if (
        ticket.user_id &&
        ticket.user_id !== authenticatedUserId &&
        !isAdmin
      ) {
        return jsonError(
          "No tienes permiso para acceder a este ticket.",
          403
        );
      }

      if (isClosedStatus(ticket.status)) {
        return jsonError(
          "Este ticket está cerrado. Abre un ticket nuevo para continuar.",
          409
        );
      }

      conversation = normalizeConversation(ticket.conversation);
    }

    const latestUserMessage = extractLatestUserMessage(body);

    if (!latestUserMessage) {
      return jsonError(
        "Escribe un mensaje antes de enviarlo.",
        400
      );
    }

    if (latestUserMessage.length > MAX_MESSAGE_LENGTH) {
      return jsonError(
        `El mensaje no puede superar los ${MAX_MESSAGE_LENGTH} caracteres.`,
        400
      );
    }

    // Este endpoint responde como IA únicamente a mensajes de clientes.
    // Las respuestas humanas se envían mediante el endpoint de administración.
    if (isAdmin) {
      return jsonError(
        "Las respuestas del administrador deben enviarse desde el panel de soporte.",
        403
      );
    }

    const latestStoredMessage = conversation.at(-1);
    const messageAlreadyLast =
      latestStoredMessage?.sender === "user" &&
      sameMessage(
        getMessageText(latestStoredMessage),
        latestUserMessage
      );

    let userMessageId: string | undefined;

    if (!messageAlreadyLast) {
      userMessageId = createMessageId();

      conversation.push({
        id: userMessageId,
        sender: "user",
        message: latestUserMessage,
        created_at: new Date().toISOString(),
      });
    } else {
      userMessageId =
        typeof latestStoredMessage?.id === "string"
          ? latestStoredMessage.id
          : undefined;
    }

    // Guardamos el mensaje del cliente antes de llamar a la IA,
    // para que no se pierda si el servicio automático falla.
    if (ticketId !== undefined && ticketId !== null) {
      const savedUserMessage = await saveConversation(
        ticketId,
        conversation
      );

      if (!savedUserMessage) {
        return jsonError(
          "No se pudo guardar tu mensaje. Inténtalo nuevamente.",
          500
        );
      }
    }

    const apiKey = process.env.OPENAI_API_KEY;
    let assistantReply = "";

    if (!apiKey) {
      assistantReply =
        "Gracias por contactar con STORE GAMING. El asistente automático no está configurado en este momento. Tu mensaje ha quedado registrado en el ticket para que puedas recibir ayuda del equipo de soporte.";
    } else {
      const history = conversation
        .filter(
          (item) =>
            item.sender === "user" ||
            item.sender === "ai" ||
            item.sender === "assistant" ||
            item.sender === "admin"
        )
        .slice(-MAX_HISTORY_MESSAGES)
        .map((item) => ({
          role:
            item.sender === "user" ? "user" as const : "assistant" as const,
          content:
            item.sender === "admin"
              ? `[Respuesta del Administrador de STORE GAMING]: ${getMessageText(item)}`
              : getMessageText(item),
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
            instructions:
              `${SUPPORT_SYSTEM_PROMPT}\n\nContexto del ticket:\n${ticketContext}`,
            input: history,
            max_output_tokens: 500,
          }),
          cache: "no-store",
        });

        const responseData: unknown = await openAIResponse.json();

        if (!openAIResponse.ok) {
          if (isOpenAIQuotaError(responseData)) {
            assistantReply =
              "Gracias por escribir a STORE GAMING. El asistente automático no puede responder ahora porque el servicio de IA necesita revisar su facturación o sus créditos. Tu consulta está registrada; el equipo de soporte puede revisarla.";
          } else {
            console.error(
              "[support/chat] Error de OpenAI:",
              JSON.stringify(responseData)
            );

            assistantReply =
              "He recibido tu mensaje, pero ahora mismo no puedo generar una respuesta automática. Tu consulta está registrada para que el equipo de soporte pueda revisarla.";
          }
        } else {
          assistantReply = getOpenAIText(responseData);

          if (!assistantReply) {
            assistantReply =
              "He recibido tu mensaje, pero no he podido generar una respuesta. Inténtalo nuevamente más tarde o solicita la revisión del equipo de soporte.";
          }
        }
      } catch (error) {
        console.error(
          "[support/chat] Error conectando con OpenAI:",
          error
        );

        assistantReply =
          "He recibido tu mensaje, pero el servicio de respuestas automáticas no está disponible en este momento. Tu consulta está registrada para su revisión.";
      }
    }

    if (ticketId !== undefined && ticketId !== null) {
      // Volvemos a leer la conversación antes de guardar la respuesta.
      // Así evitamos reemplazar una respuesta de administrador que
      // haya llegado mientras la IA estaba procesando el mensaje.
      let latestTicket: TicketRow | null;

      try {
        latestTicket = await getTicket(ticketId);
      } catch {
        return NextResponse.json(
          {
            success: true,
            message: assistantReply,
            response: assistantReply,
            answer: assistantReply,
            sender: "ai",
            ticketId,
            saved: false,
            warning:
              "La respuesta se generó, pero no se pudo verificar el estado más reciente del ticket.",
          },
          {
            status: 200,
            headers: { "Cache-Control": "no-store" },
          }
        );
      }

      if (!latestTicket) {
        return jsonError(
          "El ticket ya no está disponible.",
          404
        );
      }

      if (
        latestTicket.user_id &&
        latestTicket.user_id !== authenticatedUserId
      ) {
        return jsonError(
          "No tienes permiso para acceder a este ticket.",
          403
        );
      }

      if (isClosedStatus(latestTicket.status)) {
        return jsonError(
          "El ticket se ha cerrado mientras procesábamos tu mensaje.",
          409
        );
      }

      const latestConversation = normalizeConversation(
        latestTicket.conversation
      );

      const lastMessage = latestConversation.at(-1);

      // Si un administrador ya respondió o hay un mensaje posterior,
      // no añadimos una respuesta automática encima de esa intervención.
      const currentUserMessageIsLast =
        lastMessage?.sender === "user" &&
        sameMessage(
          getMessageText(lastMessage),
          latestUserMessage
        ) &&
        (
          !userMessageId ||
          !lastMessage.id ||
          String(lastMessage.id) === userMessageId
        );

      if (!currentUserMessageIsLast) {
        return NextResponse.json(
          {
            success: true,
            message:
              "Tu mensaje está registrado. El ticket recibió una actualización mientras procesábamos la consulta; revisa la conversación para ver la respuesta más reciente.",
            response:
              "Tu mensaje está registrado. Revisa la conversación para ver la respuesta más reciente.",
            sender: "ai",
            ticketId,
            saved: false,
            warning:
              "No se añadió una respuesta automática para evitar sobrescribir mensajes más recientes.",
          },
          {
            status: 200,
            headers: { "Cache-Control": "no-store" },
          }
        );
      }

      latestConversation.push({
        id: createMessageId(),
        sender: "ai",
        message: assistantReply,
        created_at: new Date().toISOString(),
      });

      const saved = await saveConversation(
        ticketId,
        latestConversation
      );

      return NextResponse.json(
        {
          success: true,
          message: assistantReply,
          response: assistantReply,
          answer: assistantReply,
          sender: "ai",
          ticketId,
          saved,
          ...(saved
            ? {}
            : {
                warning:
                  "La respuesta se generó, pero no se pudo guardar la conversación.",
              }),
        },
        {
          status: 200,
          headers: { "Cache-Control": "no-store" },
        }
      );
    }

    // Respuesta sin ticket asociado. La persistencia requiere un ticket.
    return NextResponse.json(
      {
        success: true,
        message: assistantReply,
        response: assistantReply,
        answer: assistantReply,
        sender: "ai",
        ticketId: null,
        saved: false,
        warning:
          "La respuesta se generó, pero no se guardó en un ticket porque no se proporcionó un ticketId.",
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (error) {
    console.error(
      "[support/chat] Error inesperado:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Ocurrió un error interno al procesar tu mensaje. Inténtalo nuevamente.",
      },
      {
        status: 500,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }
}
