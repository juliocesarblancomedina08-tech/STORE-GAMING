import { NextRequest, NextResponse } from "next/server";

type SupportMessage = {
  id?: string | number;
  sender?: "ai" | "user" | "admin";
  role?: "assistant" | "user" | "admin";
  text?: string;
  content?: string;
  message?: string;
};

const OPENAI_URL =
  "https://api.openai.com/v1/responses";

const SUPPORT_INSTRUCTIONS = `
Eres el agente de soporte oficial de STORE GAMING.

Tu trabajo NO es solamente conversar.

Debes ayudar al usuario revisando la información real
de su cuenta que el sistema te proporciona.

IMPORTANTE:

1. Puedes revisar los pedidos históricos del usuario.
2. Puedes revisar los depósitos históricos del usuario.
3. Los pedidos y depósitos pueden haber sido creados ANTES
   de que existiera este sistema de inteligencia artificial.
4. NO debes asumir que solamente existen los pedidos o
   depósitos creados después de la creación de la IA.
5. Debes utilizar la información histórica proporcionada
   por las herramientas del sistema.
6. Si el usuario pregunta por un pedido específico,
   utiliza su número de pedido para localizarlo.
7. Si el usuario dice que un pedido está atascado,
   revisa primero sus pedidos anteriores y actuales.
8. Si no puedes identificar cuál pedido es, pídele al usuario
   que vaya a "Órdenes" y copie el número que aparece como
   "Orden".
9. Si el usuario pregunta por un depósito, revisa sus
   depósitos históricos.
10. Para saber si un depósito realmente fue acreditado,
    utiliza principalmente el campo credited_at.
11. confirmed_at indica confirmación, pero NO debe utilizarse
    por sí solo para afirmar que el dinero fue acreditado.
12. Si un depósito tiene credited_at, puedes indicar que
    aparece como acreditado.
13. Si está CONFIRMED pero no tiene credited_at, indica que
    aparece confirmado pero no acreditado según los datos.
14. Si está EXPIRED y no tiene credited_at, indica que aparece
    expirado y no acreditado.
15. Nunca inventes estados, pedidos, depósitos, reembolsos,
    cantidades ni fechas.
16. Si un pedido aparece cancelado, fallido o reembolsado,
    explica lo que muestran los datos.
17. Si existe información de reembolso, úsala.
18. Si el problema requiere intervención humana o no puede
    resolverse con los datos disponibles, debes mostrar la
    opción para llamar al administrador.
19. No debes decir que revisaste información que no aparece
    en los datos proporcionados.
20. No debes modificar dinero, pedidos o depósitos.
    Tu función en esta etapa es solamente consultar y explicar.

Cuando el usuario simplemente diga "Hola", responde
amablemente y pregunta en qué problema puedes ayudar.

Si el usuario pregunta por un pedido, depósito, saldo o pago,
primero analiza los datos disponibles antes de pedirle
información que ya tengas.

Si necesitas el número de una orden específica y no puedes
determinar cuál es, pídeselo claramente.

Si puedes resolver el problema con la información disponible,
NO muestres al administrador.

Solo indica que puede llamar al administrador cuando realmente
necesites intervención humana o no puedas resolver el caso.
`;

function extractResponseText(data: any): string {
  if (
    typeof data?.output_text === "string" &&
    data.output_text.trim()
  ) {
    return data.output_text.trim();
  }

  const output = Array.isArray(data?.output)
    ? data.output
    : [];

  const parts: string[] = [];

  for (const item of output) {
    if (!Array.isArray(item?.content)) {
      continue;
    }

    for (const content of item.content) {
      if (
        typeof content?.text === "string" &&
        content.text.trim()
      ) {
        parts.push(content.text.trim());
      }
    }
  }

  return parts.join("\n").trim();
}

function detectNeedsAdmin(answer: string): boolean {
  const text = answer.toLowerCase();

  const phrases = [
    "llamar al administrador",
    "contactar al administrador",
    "administrador debe revisar",
    "necesito que un administrador",
    "debe revisarlo un administrador",
    "intervención del administrador",
    "intervencion del administrador",
    "soporte humano",
    "agente humano",
  ];

  return phrases.some((phrase) =>
    text.includes(phrase)
  );
}

export async function POST(
  request: NextRequest
) {
  try {
    const apiKey =
      process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Falta configurar OPENAI_API_KEY.",
        },
        { status: 500 }
      );
    }

    /*
     * --------------------------------------------------
     * SESIÓN DEL USUARIO
     * --------------------------------------------------
     */

    const authorization =
      request.headers.get("authorization") || "";

    if (!authorization.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          success: false,
          error: "No autorizado.",
        },
        { status: 401 }
      );
    }

    const accessToken = authorization
      .replace("Bearer ", "")
      .trim();

    if (!accessToken) {
      return NextResponse.json(
        {
          success: false,
          error: "No autorizado.",
        },
        { status: 401 }
      );
    }

    /*
     * --------------------------------------------------
     * DATOS DEL MENSAJE
     * --------------------------------------------------
     */

    const body = await request.json();

    const category =
      typeof body?.category === "string"
        ? body.category
        : "Otro";

    const subject =
      typeof body?.subject === "string"
        ? body.subject
        : "Consulta de soporte";

    let messages: SupportMessage[] =
      Array.isArray(body?.messages)
        ? body.messages
        : [];

    /*
     * Compatibilidad con el mensaje inicial.
     */

    if (messages.length === 0) {
      const fallbackMessage =
        typeof body?.message === "string"
          ? body.message
          : typeof body?.initialMessage === "string"
          ? body.initialMessage
          : typeof body?.text === "string"
          ? body.text
          : "";

      if (fallbackMessage.trim()) {
        messages = [
          {
            id: Date.now(),
            sender: "user",
            text: fallbackMessage.trim(),
          },
        ];
      }
    }

    if (messages.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No se recibió ningún mensaje.",
        },
        { status: 400 }
      );
    }

    const conversation = messages
      .map((message) => {
        const text =
          typeof message?.text === "string"
            ? message.text
            : typeof message?.content === "string"
            ? message.content
            : typeof message?.message === "string"
            ? message.message
            : "";

        if (!text.trim()) {
          return null;
        }

        const sender =
          message?.sender ||
          message?.role ||
          "user";

        return {
          sender,
          text: text.trim(),
        };
      })
      .filter(Boolean);

    if (conversation.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No se recibió ningún mensaje válido.",
        },
        { status: 400 }
      );
    }

    /*
     * --------------------------------------------------
     * CONSULTAR DEPÓSITOS HISTÓRICOS
     * --------------------------------------------------
     */

    let depositsData: any = {
      success: false,
      error:
        "No se pudieron consultar los depósitos.",
    };

    try {
      const depositsUrl =
        new URL(
          "/api/support/tools/deposits",
          request.url
        );

      depositsUrl.searchParams.set(
        "limit",
        "100"
      );

      const depositsResponse =
        await fetch(
          depositsUrl.toString(),
          {
            method: "GET",
            headers: {
              Authorization:
                `Bearer ${accessToken}`,
            },
            cache: "no-store",
          }
        );

      depositsData =
        await depositsResponse.json();
    } catch (error) {
      console.error(
        "Error consultando depósitos:",
        error
      );
    }

    /*
     * --------------------------------------------------
     * CONSULTAR PEDIDOS HISTÓRICOS
     * --------------------------------------------------
     */

    let ordersData: any = {
      success: false,
      error:
        "No se pudieron consultar los pedidos.",
    };

    try {
      const ordersUrl =
        new URL(
          "/api/support/tools/orders",
          request.url
        );

      ordersUrl.searchParams.set(
        "limit",
        "100"
      );

      const ordersResponse =
        await fetch(
          ordersUrl.toString(),
          {
            method: "GET",
            headers: {
              Authorization:
                `Bearer ${accessToken}`,
            },
            cache: "no-store",
          }
        );

      ordersData =
        await ordersResponse.json();
    } catch (error) {
      console.error(
        "Error consultando pedidos:",
        error
      );
    }

    /*
     * --------------------------------------------------
     * CONTEXTO PARA LA IA
     * --------------------------------------------------
     */

    const systemContext = `
DATOS REALES DEL USUARIO OBTENIDOS DEL SISTEMA:

CATEGORÍA:
${category}

SUJETO:
${subject}

DEPÓSITOS HISTÓRICOS:
${JSON.stringify(
  depositsData,
  null,
  2
)}

PEDIDOS HISTÓRICOS:
${JSON.stringify(
  ordersData,
  null,
  2
)}

IMPORTANTE:
Los pedidos y depósitos anteriores incluidos aquí pueden
haber sido creados antes de que existiera el agente de IA.
Debes considerarlos igualmente.

No inventes información que no aparezca en estos datos.
`;

    /*
     * --------------------------------------------------
     * CONVERSACIÓN
     * --------------------------------------------------
     */

    const conversationText =
      conversation
        .map((message: any) => {
          const role =
            message.sender === "ai" ||
            message.sender === "assistant"
              ? "ASISTENTE"
              : message.sender === "admin"
              ? "ADMINISTRADOR"
              : "USUARIO";

          return `${role}: ${message.text}`;
        })
        .join("\n");

    const input = `
${systemContext}

CONVERSACIÓN ACTUAL:

${conversationText}

Responde al usuario de forma clara, natural y en español.
`;

    /*
     * --------------------------------------------------
     * OPENAI
     * --------------------------------------------------
     */

    const openaiResponse =
      await fetch(OPENAI_URL, {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
          Authorization:
            `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-5.6-luna",
          instructions:
            SUPPORT_INSTRUCTIONS,
          input,
        }),
      });

    const rawText =
      await openaiResponse.text();

    let openaiData: any = null;

    try {
      openaiData =
        JSON.parse(rawText);
    } catch {
      openaiData = null;
    }

    if (!openaiResponse.ok) {
      console.error(
        "Error de OpenAI:",
        rawText
      );

      let errorMessage =
        "Error del servicio de soporte.";

      if (
        typeof openaiData?.error?.message ===
        "string"
      ) {
        errorMessage =
          openaiData.error.message;
      }

      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
        },
        {
          status: 502,
        }
      );
    }

    const answer =
      extractResponseText(
        openaiData
      );

    if (!answer) {
      return NextResponse.json(
        {
          success: false,
          error:
            "La IA no devolvió una respuesta.",
        },
        { status: 502 }
      );
    }

    const needsAdmin =
      detectNeedsAdmin(answer);

    return NextResponse.json({
      success: true,
      answer,
      needsAdmin,
      showAdminButton: needsAdmin,
    });
  } catch (error) {
    console.error(
      "Error en /api/support/chat:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Ocurrió un error en el servicio de soporte.",
      },
      { status: 500 }
    );
  }
  }
