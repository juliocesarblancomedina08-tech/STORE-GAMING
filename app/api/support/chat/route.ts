import { NextResponse } from "next/server";

type SupportMessage = {
  id?: number;
  sender?: "ai" | "user";
  text?: string;
};

const OPENAI_API_URL =
  "https://api.openai.com/v1/responses";

const SUPPORT_INSTRUCTIONS = `
Eres el asistente oficial de soporte de 🛒STORE GAMING🎮.

Tu función es ayudar a los clientes con problemas relacionados con la tienda, pedidos, recargas, pagos, productos, códigos, cuentas y funcionamiento general del sitio.

REGLAS IMPORTANTES:

1. Responde siempre en español.
2. Sé claro, amable y directo.
3. No inventes información.
4. No inventes precios, números de pedido, estados de pedidos, saldos, pagos, direcciones, códigos ni datos de cuentas.
5. Si el usuario pregunta por un pedido específico pero no proporciona información suficiente, pídele los datos necesarios.
6. Si el problema requiere revisar información interna de STORE GAMING a la que no tienes acceso, explica que no puedes comprobarlo directamente.
7. Si el problema no puede solucionarse desde el asistente, indica que puede solicitar atención del administrador.
8. No afirmes que realizaste una acción si realmente no puedes realizarla.
9. No digas que tienes acceso a Supabase, Telegram, FazerCards, pedidos internos o cuentas de usuarios.
10. Para problemas como pagos no acreditados, pedidos atascados, productos no recibidos, errores de cuenta o cualquier situación que requiera revisión manual, puedes recomendar contactar al administrador.
11. Mantén las respuestas relativamente cortas y fáciles de leer desde un teléfono.
12. No uses respuestas genéricas si puedes dar pasos concretos.

Cuando el problema necesite intervención humana, termina indicando claramente que el usuario puede solicitar atención del administrador.
`;

function extractResponseText(data: any): string {
  // 1. La Responses API puede proporcionar directamente output_text.
  if (
    typeof data?.output_text === "string" &&
    data.output_text.trim()
  ) {
    return data.output_text.trim();
  }

  // 2. Buscar texto dentro de output[].content[].
  if (Array.isArray(data?.output)) {
    const parts: string[] = [];

    for (const outputItem of data.output) {
      if (!Array.isArray(outputItem?.content)) {
        continue;
      }

      for (const contentItem of outputItem.content) {
        if (
          typeof contentItem?.text === "string" &&
          contentItem.text.trim()
        ) {
          parts.push(contentItem.text.trim());
        }
      }
    }

    if (parts.length > 0) {
      return parts.join("\n\n").trim();
    }
  }

  // 3. Búsqueda adicional por si la estructura cambia.
  function findText(value: any): string[] {
    if (typeof value === "string") {
      return [];
    }

    if (Array.isArray(value)) {
      const results: string[] = [];

      for (const item of value) {
        results.push(...findText(item));
      }

      return results;
    }

    if (value && typeof value === "object") {
      const results: string[] = [];

      for (const [key, child] of Object.entries(value)) {
        if (
          key === "text" &&
          typeof child === "string" &&
          child.trim()
        ) {
          results.push(child.trim());
          continue;
        }

        results.push(...findText(child));
      }

      return results;
    }

    return [];
  }

  const fallbackParts = findText(data);

  if (fallbackParts.length > 0) {
    return fallbackParts.join("\n\n").trim();
  }

  return "";
}

function detectNeedsAdmin(answer: string): boolean {
  const normalized = answer
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const adminPhrases = [
    "administrador",
    "atencion humana",
    "atención humana",
    "soporte humano",
    "contactar al administrador",
    "contacta al administrador",
    "comunicate con el administrador",
    "comunícate con el administrador",
    "solicitar atencion",
    "solicitar atención",
    "intervencion humana",
    "intervención humana",
    "revisar manualmente",
    "revision manual",
    "revisión manual",
  ];

  return adminPhrases.some((phrase) =>
    normalized.includes(
      phrase
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
    )
  );
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      console.error(
        "OPENAI_API_KEY no está configurada."
      );

      return NextResponse.json(
        {
          error:
            "El servicio de soporte no está configurado correctamente.",
        },
        {
          status: 500,
        }
      );
    }

    const body = await request.json();

    const category =
      typeof body?.category === "string" &&
      body.category.trim()
        ? body.category.trim()
        : "Otro/pregunta";

    const subject =
      typeof body?.subject === "string" &&
      body.subject.trim()
        ? body.subject.trim()
        : "Solicitud de soporte";

    const messages: SupportMessage[] =
      Array.isArray(body?.messages)
        ? body.messages
        : [];

    if (messages.length === 0) {
      return NextResponse.json(
        {
          error:
            "No se recibió ningún mensaje.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Convertimos la conversación a un texto claro.
     *
     * Esto evita depender de una estructura específica
     * de mensajes de la Responses API.
     */
    const conversation = messages
      .filter(
        (message) =>
          typeof message?.text === "string" &&
          message.text.trim()
      )
      .map((message) => {
        const sender =
          message.sender === "ai"
            ? "ASISTENTE"
            : "CLIENTE";

        return `${sender}:\n${message.text?.trim()}`;
      })
      .join("\n\n");

    if (!conversation.trim()) {
      return NextResponse.json(
        {
          error:
            "No se recibió ningún mensaje válido.",
        },
        {
          status: 400,
        }
      );
    }

    const input = `
CATEGORÍA:
${category}

SUJETO:
${subject}

CONVERSACIÓN:
${conversation}

Responde al último mensaje del cliente teniendo en cuenta toda la conversación anterior.
`;

    console.log(
      "ENVIANDO SOLICITUD A OPENAI SUPPORT..."
    );

    const openAIResponse = await fetch(
      OPENAI_API_URL,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-5.6-luna",
          instructions: SUPPORT_INSTRUCTIONS,
          input,
        }),
      }
    );

    const rawResponse =
      await openAIResponse.text();

    let data: any = null;

    try {
      data = JSON.parse(rawResponse);
    } catch {
      data = null;
    }

    if (!openAIResponse.ok) {
      console.error(
        "ERROR RESPUESTA OPENAI:",
        rawResponse
      );

      const openAIError =
        data?.error?.message ||
        data?.error?.code ||
        rawResponse ||
        "OpenAI no pudo procesar la solicitud.";

      return NextResponse.json(
        {
          error: `Error del servicio de soporte: ${openAIError}`,
        },
        {
          status: 502,
        }
      );
    }

    const answer = extractResponseText(data);

    /*
     * Este es el punto importante de la corrección.
     *
     * Si OpenAI respondió correctamente pero no encontramos
     * el texto, devolvemos información útil para poder detectar
     * la estructura recibida en los logs de Vercel.
     */
    if (!answer) {
      console.error(
        "OPENAI RESPONDIÓ SIN TEXTO:",
        JSON.stringify(data)
      );

      return NextResponse.json(
        {
          error:
            "El asistente recibió la solicitud pero no devolvió ningún mensaje.",
        },
        {
          status: 502,
        }
      );
    }

    const needsAdmin =
      detectNeedsAdmin(answer);

    console.log(
      "RESPUESTA OPENAI SUPPORT RECIBIDA."
    );

    return NextResponse.json({
      success: true,
      answer,
      needsAdmin,
      showAdminButton: needsAdmin,
    });
  } catch (error) {
    console.error(
      "ERROR API SUPPORT CHAT:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Ocurrió un error al conectar con el asistente de soporte.",
      },
      {
        status: 500,
      }
    );
  }
          }
