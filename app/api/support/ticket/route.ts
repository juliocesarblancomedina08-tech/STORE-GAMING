import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";

type SupportMessage = {
  id?: number;
  sender?: "ai" | "user";
  text?: string;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const messages: SupportMessage[] =
      Array.isArray(body?.messages)
        ? body.messages
        : [];

    if (messages.length === 0) {
      return NextResponse.json(
        {
          error:
            "La conversación de soporte está vacía.",
        },
        {
          status: 400,
        }
      );
    }

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

    /*
     * Información del usuario.
     *
     * Por ahora recibimos estos datos desde el cliente.
     * En el siguiente paso conectaremos el soporte
     * directamente con la sesión de Supabase para
     * obtenerlos automáticamente.
     */
    const userId =
      typeof body?.userId === "string" &&
      body.userId.trim()
        ? body.userId.trim()
        : null;

    const username =
      typeof body?.username === "string" &&
      body.username.trim()
        ? body.username.trim()
        : null;

    const email =
      typeof body?.email === "string" &&
      body.email.trim()
        ? body.email.trim()
        : null;

    const userMessages = messages.filter(
      (message) =>
        message?.sender === "user" &&
        typeof message?.text === "string" &&
        message.text.trim()
    );

    const lastUserMessage =
      userMessages[
        userMessages.length - 1
      ]?.text?.trim() ||
      "El cliente solicitó atención del administrador.";

    const conversation = messages.map(
      (message) => ({
        sender:
          message.sender === "ai"
            ? "ai"
            : "user",
        text:
          typeof message.text === "string"
            ? message.text
            : "",
      })
    );

    /*
     * Crear el ticket.
     */
    const {
      data: ticket,
      error: ticketError,
    } = await supabaseAdmin
      .from("support_tickets")
      .insert({
        user_id: userId,
        username,
        email,
        category,
        subject,
        message: lastUserMessage,
        conversation,
        status: "PENDING",
      })
      .select(
        "id, user_id, username, email, category, subject, status, created_at, updated_at"
      )
      .single();

    if (ticketError) {
      console.error(
        "ERROR CREANDO TICKET DE SOPORTE:",
        ticketError
      );

      return NextResponse.json(
        {
          error:
            "No se pudo crear la solicitud de soporte.",
          details: ticketError.message,
        },
        {
          status: 500,
        }
      );
    }

    /*
     * Notificación al administrador por Telegram.
     */
    const telegramBotToken =
      process.env.TELEGRAM_BOT_TOKEN;

    const telegramAdminChatId =
      process.env.TELEGRAM_ADMIN_CHAT_ID;

    if (
      telegramBotToken &&
      telegramAdminChatId
    ) {
      const notification = [
        "🆘 NUEVO TICKET DE SOPORTE",
        "",
        `🎫 Ticket: #${ticket.id}`,
        "📌 Estado: PENDIENTE",
        "",
        `📂 Categoría: ${category}`,
        `📝 Sujeto: ${subject}`,
        "",
        username
          ? `👤 Usuario: ${username}`
          : "👤 Usuario: No identificado",
        email
          ? `📧 Email: ${email}`
          : "",
        userId
          ? `🆔 Usuario ID: ${userId}`
          : "",
        "",
        "💬 Mensaje del cliente:",
        lastUserMessage,
        "",
        "👉 Revisar ticket en STORE GAMING.",
      ]
        .filter(Boolean)
        .join("\n");

      try {
        const telegramResponse =
          await fetch(
            `https://api.telegram.org/bot${telegramBotToken}/sendMessage`,
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                chat_id:
                  telegramAdminChatId,
                text: notification,
              }),
            }
          );

        if (!telegramResponse.ok) {
          const telegramError =
            await telegramResponse.text();

          console.error(
            "ERROR NOTIFICANDO POR TELEGRAM:",
            telegramError
          );
        }
      } catch (telegramError) {
        console.error(
          "ERROR DE CONEXIÓN CON TELEGRAM:",
          telegramError
        );
      }
    } else {
      console.warn(
        "TELEGRAM NO CONFIGURADO: faltan TELEGRAM_BOT_TOKEN o TELEGRAM_ADMIN_CHAT_ID."
      );
    }

    return NextResponse.json({
      success: true,
      ticketId: ticket.id,
      status: ticket.status,
      message:
        "Tu solicitud fue enviada al administrador.",
    });
  } catch (error) {
    console.error(
      "ERROR API SUPPORT TICKET:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Ocurrió un error al crear la solicitud de soporte.",
      },
      {
        status: 500,
      }
    );
  }
        }
