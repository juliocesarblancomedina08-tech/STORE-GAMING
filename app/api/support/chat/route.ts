import { NextRequest, NextResponse } from "next/server";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const SUPPORT_INSTRUCTIONS = `
Eres el asistente oficial de soporte de 🛒STORE GAMING🎮.

Tu función es ayudar a los clientes de STORE GAMING de forma clara,
amable y breve.

IMPORTANTE:

- No inventes precios, ofertas, pedidos, estados de pagos ni información
  que no tengas disponible.
- No inventes datos de cuentas de clientes.
- No inventes números de pedidos.
- No prometas reembolsos ni cambios que no estén confirmados.
- Si el cliente pregunta por un pedido concreto y no tienes acceso a los
  datos de ese pedido, explícale que necesitas que el administrador revise
  el caso.
- Si el problema puede resolverse explicando cómo funciona STORE GAMING,
  intenta resolverlo directamente.
- Si el cliente tiene un problema con una compra, pago, depósito, saldo,
  pedido, recarga o cualquier situación que requiera revisar información
  privada de su cuenta, no inventes una solución.
- Si después de explicar la situación el cliente necesita intervención
  humana, debes indicar que puede solicitar al administrador.
- Si el cliente expresa que la respuesta no le sirve, que no resolvió su
  problema, que quiere hablar con una persona, administrador o soporte
  humano, considera que necesita atención del administrador.

Temas que puedes explicar:

- Cómo realizar una recarga.
- Cómo seleccionar un juego.
- Cómo seleccionar una oferta.
- Cómo introducir el ID del jugador.
- Cómo consultar pedidos.
- Cómo funciona el saldo.
- Cómo realizar depósitos.
- Información general sobre soporte.
- Problemas generales de navegación dentro de STORE GAMING.

Cuando no puedas resolver un problema con seguridad, dilo claramente.

Nunca digas que eres un empleado humano.
Identifícate como el asistente IA de STORE GAMING.

Responde siempre en español.

Tus respuestas deben ser fáciles de entender desde un teléfono.
Evita respuestas excesivamente largas.

Al final de tu respuesta, si consideras que el cliente necesita
intervención humana, incluye una línea exactamente así:

[LLAMAR_AL_ADMINISTRADOR]

Si no necesita intervención humana, NO incluyas esa línea.
`;

function cleanMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((message): message is ChatMessage => {
      if (!message || typeof message !== "object") {
        return false;
      }

      const item = message as Record<string, unknown>;

      return (
        (item.role === "user" || item.role === "assistant") &&
        typeof item.content === "string"
      );
    })
    .map((message) => ({
      role: message.role,
      content: message.content.trim(),
    }))
    .filter((message) => message.content.length > 0)
    .slice(-30);
}

function removeAdminMarker(text: string) {
  return text
    .replace(/\[LLAMAR_AL_ADMINISTRADOR\]/gi, "")
    .trim();
}

export async function POST(request: NextRequest) {
  try {
    if (!OPENAI_API_KEY) {
      console.error(
        "FALTA OPENAI_API_KEY EN LAS VARIABLES DE ENTORNO."
      );

      return NextResponse.json(
        {
          error:
            "El sistema de soporte no está configurado correctamente.",
        },
        {
          status: 500,
        }
      );
    }

    const body = await request.json();

    const messages = cleanMessages(body?.messages);

    if (messages.length === 0) {
      return NextResponse.json(
        {
          error: "No se recibió ningún mensaje.",
        },
        {
          status: 400,
        }
      );
    }

    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-5.6-luna",

          instructions: SUPPORT_INSTRUCTIONS,

          input: messages.map((message) => ({
            role: message.role,
            content: [
              {
                type: "input_text",
                text: message.content,
              },
            ],
          })),

          max_output_tokens: 500,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("ERROR OPENAI:", data);

      return NextResponse.json(
        {
          error:
            "No se pudo obtener una respuesta del asistente.",
        },
        {
          status: 500,
        }
      );
    }

    const rawAnswer =
      typeof data?.output_text === "string"
        ? data.output_text.trim()
        : "";

    if (!rawAnswer) {
      return NextResponse.json(
        {
          error:
            "El asistente no devolvió una respuesta.",
        },
        {
          status: 500,
        }
      );
    }

    const needsAdmin =
      /\[LLAMAR_AL_ADMINISTRADOR\]/i.test(rawAnswer);

    const answer = removeAdminMarker(rawAnswer);

    return NextResponse.json({
      answer,
      needsAdmin,
      showAdminButton: needsAdmin,
    });
  } catch (error) {
    console.error("ERROR API SUPPORT CHAT:", error);

    return NextResponse.json(
      {
        error:
          "Ocurrió un error al procesar la consulta de soporte.",
      },
      {
        status: 500,
      }
    );
  }
}
