import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";

const ADMIN_EMAIL =
  "juliocesarblancomedina08@gmail.com";

export async function GET(request: Request) {
  try {
    /*
     * =====================================================
     * VERIFICAR SESIÓN
     * =====================================================
     */

    const authorization =
      request.headers.get("authorization");

    if (!authorization) {
      return NextResponse.json(
        {
          error:
            "No autorizado.",
        },
        {
          status: 401,
        }
      );
    }

    const token =
      authorization.replace(
        /^Bearer\s+/i,
        ""
      ).trim();

    if (!token) {
      return NextResponse.json(
        {
          error:
            "Token de acceso no válido.",
        },
        {
          status: 401,
        }
      );
    }

    /*
     * Obtener el usuario real mediante
     * Supabase Admin.
     */
    const {
      data: {
        user,
      },
      error: userError,
    } =
      await supabaseAdmin.auth.getUser(
        token
      );

    if (
      userError ||
      !user ||
      !user.email
    ) {
      console.error(
        "ERROR VERIFICANDO USUARIO:",
        userError
      );

      return NextResponse.json(
        {
          error:
            "Sesión no válida.",
        },
        {
          status: 401,
        }
      );
    }

    /*
     * =====================================================
     * VERIFICAR ADMINISTRADOR
     * =====================================================
     */

    if (
      user.email
        .trim()
        .toLowerCase() !==
      ADMIN_EMAIL.toLowerCase()
    ) {
      return NextResponse.json(
        {
          error:
            "No tienes permisos de administrador.",
        },
        {
          status: 403,
        }
      );
    }

    /*
     * =====================================================
     * OBTENER TICKETS
     * =====================================================
     */

    const { searchParams } =
      new URL(request.url);

    const userId =
      searchParams.get("user_id");

    let query = supabaseAdmin
      .from("support_tickets")
      .select(
        "id, user_id, username, email, category, subject, message, conversation, status, created_at, updated_at"
      )
      .order(
        "updated_at",
        {
          ascending: false,
        }
      );

    /*
     * Si se solicita un usuario específico,
     * devolvemos solamente sus tickets.
     *
     * Esto mantiene funcionando también
     * la página normal de soporte.
     */
    if (
      userId &&
      userId.trim()
    ) {
      query = query.eq(
        "user_id",
        userId.trim()
      );
    }

    const {
      data: tickets,
      error: ticketsError,
    } = await query;

    if (ticketsError) {
      console.error(
        "ERROR OBTENIENDO TICKETS:",
        ticketsError
      );

      return NextResponse.json(
        {
          error:
            "No se pudieron obtener las consultas de soporte.",
          details:
            ticketsError.message,
        },
        {
          status: 500,
        }
      );
    }

    /*
     * =====================================================
     * NORMALIZAR RESPUESTA
     * =====================================================
     */

    const normalizedTickets =
      (tickets || []).map(
        (ticket) => ({
          id: ticket.id,

          user_id:
            ticket.user_id,

          username:
            ticket.username,

          email:
            ticket.email,

          category:
            ticket.category ||
            "Otro/pregunta",

          subject:
            ticket.subject ||
            "Solicitud de soporte",

          message:
            ticket.message || "",

          conversation:
            Array.isArray(
              ticket.conversation
            )
              ? ticket.conversation
              : [],

          status:
            ticket.status ||
            "PENDING",

          created_at:
            ticket.created_at,

          updated_at:
            ticket.updated_at,
        })
      );

    /*
     * =====================================================
     * RESPUESTA
     * =====================================================
     */

    return NextResponse.json(
      {
        success: true,

        tickets:
          normalizedTickets,

        total:
          normalizedTickets.length,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      "ERROR API SUPPORT TICKETS:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Ocurrió un error al obtener las consultas de soporte.",
      },
      {
        status: 500,
      }
    );
  }
  }
