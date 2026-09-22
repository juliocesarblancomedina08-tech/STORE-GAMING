import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

type SupportMessage = {
  id?: number;
  sender?: "ai" | "user";
  text?: string;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const messages: SupportMessage[] = Array.isArray(body?.messages)
      ? body.messages
      : [];

    if (messages.length === 0) {
      return NextResponse.json(
        {
          error: "La conversación de soporte está vacía.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Buscamos el último mensaje enviado por el cliente.
     */
    const userMessages = messages.filter(
      (message) =>
        message?.sender === "user" &&
        typeof message?.text === "string" &&
        message.text.trim()
    );

    const lastUserMessage =
      userMessages[userMessages.length - 1]?.text?.trim() ||
      "El cliente solicitó atención del administrador.";

    /*
     * Guardamos la conversación completa como JSON.
     */
    const conversation = messages.map((message) => ({
      sender: message.sender || "user",
      text: message.text || "",
    }));

    /*
     * Creamos el ticket en Supabase.
     */
    const { data: ticket, error: ticketError } =
      await supabaseAdmin
        .from("support_tickets")
        .insert({
          subject: lastUserMessage.slice(0, 120),
          message: lastUserMessage,
          conversation,
          status: "PENDING",
        })
        .select("id, created_at")
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
        },
        {
          status: 500,
        }
      );
    }

    /*
     * Notificación al administrador mediante Telegram.
     *
     * Las credenciales permanecen únicamente en las
     * variables de entorno del servidor.
     */
    const telegramBotToken =
      process.env.TELEGRAM_BOT_TOKEN;

    const telegramAdminChatId =
      process.env.TELEGRAM_ADMIN_CHAT_ID;

    if (telegramBotToken && telegramAdminChatId) {
      const notification =
        [
          "🆘 NUEVO PEDIDO DE SOPORTE",
          "",
          `🎫 Ticket: #${ticket.id}`,
          "📌 Estado: PENDIENTE",
          "",
          "💬 Consulta del cliente:",
          lastUserMessage,
          "",
          "👉 Revisar solicitud de soporte.",
        ].join("\n");

      try {
        const telegramResponse = await fetch(
          `https://api.telegram.org/bot${telegramBotToken}/sendMessage`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              chat_id: telegramAdminChatId,
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
