import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";

const FAZER_API =
  "https://api.fzr.cards/api/v2";

const CATEGORY_ID =
  "free_fire_latam";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL!;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY!;

const FAZER_API_KEY =
  process.env.FAZERCARDS_API_KEY!;

const supabaseAdmin =
  createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY
  );

export async function POST(
  request: NextRequest
) {
  let createdOrderId: string | null = null;

  try {
    /*
     * =========================
     * VARIABLES DE ENTORNO
     * =========================
     */

    if (
      !SUPABASE_URL ||
      !SUPABASE_SERVICE_ROLE_KEY ||
      !FAZER_API_KEY
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Configuración del servidor incompleta.",
        },
        { status: 500 }
      );
    }

    /*
     * =========================
     * AUTENTICACIÓN
     * =========================
     */

    const authorization =
      request.headers.get(
        "authorization"
      );

    if (
      !authorization ||
      !authorization.startsWith(
        "Bearer "
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No autenticado.",
        },
        { status: 401 }
      );
    }

    const accessToken =
      authorization.replace(
        "Bearer ",
        ""
      ).trim();

    const {
      data: { user },
      error: userError,
    } =
      await supabaseAdmin.auth.getUser(
        accessToken
      );

    if (userError || !user) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "La sesión no es válida.",
        },
        { status: 401 }
      );
    }

    /*
     * =========================
     * DATOS RECIBIDOS
     * =========================
     */

    const body =
      await request.json();

    const {
      offerId,
      offerName,
      retailPrice,
      playerId,
      idempotencyKey,
    } = body;

    if (
      typeof offerId !== "string" ||
      !offerId.trim()
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Oferta inválida.",
        },
        { status: 400 }
      );
    }

    if (
      typeof offerName !== "string" ||
      !offerName.trim()
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Nombre de oferta inválido.",
        },
        { status: 400 }
      );
    }

    if (
      typeof retailPrice !== "number" ||
      !Number.isFinite(
        retailPrice
      ) ||
      retailPrice <= 0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Precio inválido.",
        },
        { status: 400 }
      );
    }

    if (
      typeof playerId !== "string" ||
      !/^\d{4,20}$/.test(
        playerId.trim()
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "ID de jugador inválido.",
        },
        { status: 400 }
      );
    }

    /*
     * =========================
     * CLAVE IDEMPOTENTE
     * =========================
     */

    const finalIdempotencyKey =
      typeof idempotencyKey === "string" &&
      idempotencyKey.trim()
        ? idempotencyKey.trim()
        : randomUUID();

    /*
     * =========================
     * COMPROBAR SI YA EXISTE
     * =========================
     */

    const {
      data: existingOrder,
    } = await supabaseAdmin
      .from("topup_orders")
      .select("*")
      .eq(
        "idempotency_key",
        finalIdempotencyKey
      )
      .maybeSingle();

    if (existingOrder) {
      return NextResponse.json({
        ok: true,
        orderNumber:
          existingOrder.id,
        status:
          existingOrder.status,
        existing: true,
      });
    }

    /*
     * =========================
     * PRECIO INTERNO
     * =========================
     *
     * IMPORTANTE:
     * No confiamos en el precio
     * enviado por el navegador.
     *
     * Estos son los precios reales
     * autorizados de STORE GAMING.
     */

    const approvedPrices: Record<
      string,
      number
    > = {
      "110_diamonds": 0.78,
      "341_diamonds": 2.2,
      "572_diamonds": 3.67,
      "1166_diamonds": 6.73,
      "2398_diamonds": 13.27,
      "6160_diamonds": 33.7,
      "booyah_pass": 4,
      "weekly_membership": 2.3,
      "monthly_membership": 10.72,
    };

    const approvedPrice =
      approvedPrices[offerId];

    if (
      typeof approvedPrice !==
      "number"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "La oferta no está disponible.",
        },
        { status: 400 }
      );
    }

    /*
     * =========================
     * DATOS DEL USUARIO
     * =========================
     */

    const email =
      user.email || "";

    const username =
      email.split("@")[0] ||
      "usuario";

    /*
     * =========================
     * RESERVAR/DESCONTAR SALDO
     * =========================
     */

    const {
      error: reserveError,
    } = await supabaseAdmin.rpc(
      "reserve_topup_balance",
      {
        p_user_id: user.id,
        p_amount: approvedPrice,
      }
    );

    if (reserveError) {
      console.error(
        "RESERVE ERROR:",
        reserveError
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "No tienes suficiente saldo para realizar esta compra.",
        },
        { status: 400 }
      );
    }

    /*
     * =========================
     * CREAR ORDEN INTERNA
     * =========================
     */

    const internalOrderId =
      `FF-${Date.now()
        .toString()
        .slice(-8)}-${randomUUID()
        .slice(0, 6)
        .toUpperCase()}`;

    createdOrderId =
      internalOrderId;

    const {
      error: insertError,
    } = await supabaseAdmin
      .from("topup_orders")
      .insert({
        id: internalOrderId,

        user_id: user.id,

        username,

        email,

        game:
          "FREE FIRE LATAM",

        category_id:
          CATEGORY_ID,

        offer_id:
          offerId,

        offer_name:
          offerName,

        player_id:
          playerId.trim(),

        retail_price:
          approvedPrice,

        supplier_price:
          0,

        currency:
          "USD",

        status:
          "RESERVED",

        supplier_order_id:
          null,

        idempotency_key:
          finalIdempotencyKey,

        supplier_fields: {
          player_id:
            playerId.trim(),
        },

        supplier_response:
          null,
      });

    if (insertError) {
      console.error(
        "INSERT ORDER ERROR:",
        insertError
      );

      await supabaseAdmin.rpc(
        "refund_topup_balance",
        {
          p_order_id:
            internalOrderId,
        }
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "No se pudo registrar la orden.",
        },
        { status: 500 }
      );
    }

    /*
     * =========================
     * ENVIAR A FAZERCARDS
     * =========================
     */

    let fazerResponse: Response;

    try {
      fazerResponse =
        await fetch(
          `${FAZER_API}/topups/order`,
          {
            method: "POST",

            headers: {
              "X-API-Key":
                FAZER_API_KEY,

              "Idempotency-Key":
                finalIdempotencyKey,

              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              category_id:
                CATEGORY_ID,

              offer_id:
                offerId,

              fields: {
                player_id:
                  playerId.trim(),
              },
            }),

            cache: "no-store",
          }
        );
    } catch (supplierConnectionError) {
      console.error(
        "FAZER CONNECTION ERROR:",
        supplierConnectionError
      );

      await supabaseAdmin
        .from("topup_orders")
        .update({
          status:
            "SUPPLIER_PENDING",

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          internalOrderId
        );

      /*
       * NO HACEMOS REFUND AQUÍ.
       *
       * Puede haber ocurrido que
       * FazerCards recibió la orden
       * pero la respuesta se perdió.
       *
       * La misma idempotency key permite
       * reintentar sin duplicar la orden.
       */

      return NextResponse.json(
        {
          ok: false,
          error:
            "La orden está siendo procesada por el proveedor. No vuelvas a pagar.",
          orderNumber:
            internalOrderId,
        },
        { status: 202 }
      );
    }

    let fazerResult: any = null;

    try {
      fazerResult =
        await fazerResponse.json();
    } catch {
      fazerResult = null;
    }

    /*
     * =========================
     * FAZERCARDS RECHAZÓ
     * =========================
     */

    if (
      !fazerResponse.ok ||
      !fazerResult?.ok
    ) {
      console.error(
        "FAZER ORDER ERROR:",
        fazerResult
      );

      await supabaseAdmin.rpc(
        "refund_topup_balance",
        {
          p_order_id:
            internalOrderId,
        }
      );

      await supabaseAdmin
        .from("topup_orders")
        .update({
          status:
            "REFUNDED",

          supplier_response:
            fazerResult,

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          internalOrderId
        );

      return NextResponse.json(
        {
          ok: false,
          error:
            fazerResult?.error ||
            "FazerCards rechazó la orden. El saldo fue devuelto.",
        },
        { status: 400 }
      );
    }

    /*
     * =========================
     * PEDIDO ACEPTADO
     * =========================
     */

    const supplierOrderId =
      fazerResult?.order?.id ||
      fazerResult?.order_id ||
      null;

    const supplierStatus =
      fazerResult?.order?.status ||
      fazerResult?.status ||
      "processing";

    /*
     * =========================
     * ACTUALIZAR ORDEN
     * =========================
     */

    await supabaseAdmin
      .from("topup_orders")
      .update({
        status:
          supplierStatus
            .toString()
            .toUpperCase(),

        supplier_order_id:
          supplierOrderId,

        supplier_response:
          fazerResult,

        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        internalOrderId
      );

    /*
     * =========================
     * RESPUESTA
     * =========================
     */

    return NextResponse.json({
      ok: true,

      orderNumber:
        internalOrderId,

      supplierOrderId,

      status:
        supplierStatus,

      message:
        "Orden enviada correctamente a FazerCards.",
    });
  } catch (error) {
    console.error(
      "FREE FIRE TOPUP ERROR:",
      error
    );

    /*
     * Si todavía tenemos una orden
     * interna creada, NO hacemos
     * refund automático aquí si
     * no sabemos si FazerCards recibió
     * la solicitud.
     */

    return NextResponse.json(
      {
        ok: false,
        error:
          "Ocurrió un error procesando la orden.",
        orderNumber:
          createdOrderId,
      },
      { status: 500 }
    );
  }
        }
