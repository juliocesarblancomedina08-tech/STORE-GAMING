import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";

const ADMIN_EMAIL =
  "juliocesarblancomedina08@gmail.com";

/*
 * =====================================================
 * OBTENER TOKEN
 * =====================================================
 */

function getBearerToken(request: Request) {
  const authorization =
    request.headers.get("authorization");

  if (
    !authorization ||
    !authorization
      .toLowerCase()
      .startsWith("bearer ")
  ) {
    return null;
  }

  const token =
    authorization
      .replace(/^Bearer\s+/i, "")
      .trim();

  return token || null;
}

/*
 * =====================================================
 * GET
 * =====================================================
 */

export async function GET(request: Request) {
  try {
    /*
     * =====================================================
     * OBTENER TOKEN
     * =====================================================
     */

    const token =
      getBearerToken(request);

    if (!token) {
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

    /*
     * =====================================================
     * VERIFICAR USUARIO REAL
     * =====================================================
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

    const authenticatedUserId =
      user.id;

    const authenticatedEmail =
      user.email
        .trim()
        .toLowerCase();

    /*
     * =====================================================
     * VERIFICAR SI ES ADMIN
     * =====================================================
     */

    const isAdmin =
      authenticatedEmail ===
      ADMIN_EMAIL.toLowerCase();

    /*
     * =====================================================
     * OBTENER user_id SOLICITADO
     * =====================================================
     */

    const { searchParams } =
      new URL(request.url);

    const requestedUserId =
      searchParams.get(
        "user_id"
      )?.trim() || null;

    /*
     * =====================================================
     * SEGURIDAD
     * =====================================================
     *
     * ADMIN:
     * Puede consultar todos los tickets
     * o filtrar por un usuario.
     *
     * USUARIO NORMAL:
     * Solo puede consultar sus propios
     * tickets.
     */

    let finalUserId:
      string | null = null;

    if (isAdmin) {
      /*
       * Si el administrador especifica
       * user_id, filtramos por ese usuario.
       *
       * Si no lo especifica, mostramos
       * todos los tickets.
       */
      finalUserId =
        requestedUserId;
    } else {
      /*
       * Usuario normal.
       *
       * Si intenta consultar otro
       * user_id, se rechaza.
       */
      if (
        requestedUserId &&
        requestedUserId !==
          authenticatedUserId
      ) {
        return NextResponse.json(
          {
            error:
              "No tienes permiso para consultar estas conversaciones.",
          },
          {
            status: 403,
          }
        );
      }

      /*
       * Siempre usamos el ID real
       * de la sesión.
       */
      finalUserId =
        authenticatedUserId;
    }

    /*
     * =====================================================
     * OBTENER TICKETS
     * =====================================================
     */

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
     * Aplicar filtro de usuario
     * cuando corresponda.
     */

    if (finalUserId) {
      query = query.eq(
        "user_id",
        finalUserId
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

        isAdmin,

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
