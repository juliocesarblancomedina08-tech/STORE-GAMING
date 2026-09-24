import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";

type SupportMessage = {
  id?: number;
  sender?: "ai" | "user" | "admin";
  text?: string;
};

type SupportStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "COMPLETED";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    /*
     * =====================================================
     * DATOS GENERALES
     * =====================================================
     */

    const ticketId =
      typeof body?.ticketId === "number"
        ? body.ticketId
        : typeof body?.ticketId === "string" &&
          body.ticketId.trim()
        ? Number(body.ticketId)
        : null;

    /*
     * =====================================================
     * MENSAJES RECIBIDOS
     * =====================================================
     *
     * Normalmente la página envía "messages".
     *
     * Para la creación inicial del ticket también
     * aceptamos "message", "initialMessage" o "text".
     *
     * Esto evita que la primera consulta sea rechazada
     * simplemente porque todavía no existe una conversación.
     */

    let messages: SupportMessage[] =
      Array.isArray(body?.messages)
        ? body.messages
        : [];

    const fallbackMessage =
      typeof body?.message === "string" &&
      body.message.trim()
        ? body.message.trim()
        : typeof body?.initialMessage === "string" &&
          body.initialMessage.trim()
        ? body.initialMessage.trim()
        : typeof body?.text === "string" &&
          body.text.trim()
        ? body.text.trim()
        : "";

    /*
     * Si no llegaron mensajes pero sí llegó el
     * mensaje inicial del cliente, lo convertimos
     * automáticamente en el primer mensaje.
     */
    if (
      messages.length === 0 &&
      fallbackMessage
    ) {
      messages = [
        {
          id: Date.now(),
          sender: "user",
          text: fallbackMessage,
        },
      ];
    }

    /*
     * =====================================================
     * DATOS DEL TICKET
     * =====================================================
     */

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

    /*
     * =====================================================
     * ESTADO
     * =====================================================
     */

    const requestedStatus =
      typeof body?.status === "string"
        ? body.status.trim().toUpperCase()
        : null;

    let status: SupportStatus = "PENDING";

    if (
      requestedStatus === "PENDING" ||
      requestedStatus === "IN_PROGRESS" ||
      requestedStatus === "COMPLETED"
    ) {
      status = requestedStatus;
    }

    /*
     * =====================================================
     * CONVERSACIÓN NORMALIZADA
     * =====================================================
     */

    const conversation = messages
      .filter(
        (message) =>
          message &&
          typeof message.text === "string"
      )
      .map((message, index) => ({
        id:
          typeof message.id === "number"
            ? message.id
            : Date.now() + index,

        sender:
          message.sender === "admin"
            ? "admin"
            : message.sender === "ai"
            ? "ai"
            : "user",

        text:
          message.text?.trim() || "",
      }))
      .filter(
        (message) =>
          message.text.length > 0
      );

    /*
     * =====================================================
     * VALIDACIÓN DE CONVERSACIÓN
     * =====================================================
     *
     * Aquí solamente rechazamos si realmente no
     * existe ningún mensaje de texto.
     */

    if (conversation.length === 0) {
      return NextResponse.json(
        {
          error:
            "Debes escribir un mensaje para crear la consulta.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * =====================================================
     * ÚLTIMO MENSAJE DEL CLIENTE
     * =====================================================
     */

    const userMessages =
      conversation.filter(
        (message) =>
          message.sender === "user" &&
          typeof message.text === "string" &&
          message.text.trim()
      );

    const lastUserMessage =
      userMessages[
        userMessages.length - 1
      ]?.text?.trim() ||
      "El cliente solicitó atención del administrador.";

    /*
     * =====================================================
     * ACTUALIZAR TICKET EXISTENTE
     * =====================================================
     *
     * Cuando existe ticketId NO creamos otro ticket.
     *
     * Esto se utiliza para:
     *
     * - Respuestas del administrador.
     * - Cambiar estado.
     * - Continuar una conversación existente.
     */

    if (
      ticketId !== null &&
      Number.isFinite(ticketId)
    ) {
      /*
       * Primero comprobamos que el ticket exista.
       */

      const {
        data: existingTicket,
        error: existingTicketError,
      } = await supabaseAdmin
        .from("support_tickets")
        .select(
          "id, user_id, username, email, category, subject, message, conversation, status, created_at, updated_at"
        )
        .eq("id", ticketId)
        .single();

      if (
        existingTicketError ||
        !existingTicket
      ) {
        console.error(
          "ERROR BUSCANDO TICKET:",
          existingTicketError
        );

        return NextResponse.json(
          {
            error:
              "El ticket de soporte no existe.",
          },
          {
            status: 404,
          }
        );
      }

      /*
       * Si el administrador está enviando
       * una respuesta y no especificó estado,
       * el ticket pasa automáticamente
       * a EN PROCESO.
       */

      const sender =
        body?.sender === "admin"
          ? "admin"
          : body?.sender === "ai"
          ? "ai"
          : "user";

      let finalStatus: SupportStatus =
        status;

      if (
        sender === "admin" &&
        !requestedStatus
      ) {
        finalStatus = "IN_PROGRESS";
      }

      /*
       * Si el ticket ya estaba completado y
       * el administrador manda otra respuesta,
       * permitimos que vuelva a EN PROCESO.
       */

      if (
        sender === "admin" &&
        finalStatus === "PENDING" &&
        existingTicket.status ===
          "COMPLETED"
      ) {
        finalStatus = "IN_PROGRESS";
      }

      /*
       * Actualizamos EL MISMO registro.
       */

      const {
        data: updatedTicket,
        error: updateError,
      } = await supabaseAdmin
        .from("support_tickets")
        .update({
          user_id:
            userId ||
            existingTicket.user_id,

          username:
            username ||
            existingTicket.username,

          email:
            email ||
            existingTicket.email,

          category:
            category ||
            existingTicket.category,

          subject:
            subject ||
            existingTicket.subject,

          /*
           * Conservamos el mensaje original
           * del ticket.
           */

          message:
            existingTicket.message ||
            lastUserMessage,

          conversation,

          status: finalStatus,

          updated_at:
            new Date().toISOString(),
        })
        .eq("id", ticketId)
        .select(
          "id, user_id, username, email, category, subject, message, conversation, status, created_at, updated_at"
        )
        .single();

      if (updateError) {
        console.error(
          "ERROR ACTUALIZANDO TICKET:",
          updateError
        );

        return NextResponse.json(
          {
            error:
              "No se pudo actualizar el ticket de soporte.",
            details:
              updateError.message,
          },
          {
            status: 500,
          }
        );
      }

      return NextResponse.json({
        success: true,
        ticketId: updatedTicket.id,
        status: updatedTicket.status,
        updated_at:
          updatedTicket.updated_at,
        ticket: updatedTicket,
      });
    }

    /*
     * =====================================================
     * CREAR TICKET NUEVO
     * =====================================================
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
        "id, user_id, username, email, category, subject, message, conversation, status, created_at, updated_at"
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
          details:
            ticketError.message,
        },
        {
          status: 500,
        }
      );
    }

    /*
     * =====================================================
     * NOTIFICACIÓN TELEGRAM
     * =====================================================
     *
     * Solo se envía al crear un ticket nuevo.
     *
     * Las respuestas del administrador NO
     * generan nuevas notificaciones de ticket.
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

    /*
     * =====================================================
     * RESPUESTA
     * =====================================================
     */

    return NextResponse.json({
      success: true,
      ticketId: ticket.id,
      status: ticket.status,
      updated_at:
        ticket.updated_at,
      message:
        "Tu solicitud fue enviada al administrador.",
      ticket,
    });
  } catch (error) {
    console.error(
      "ERROR API SUPPORT TICKET:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Ocurrió un error al procesar la solicitud de soporte.",
      },
      {
        status: 500,
      }
    );
  }
            }
