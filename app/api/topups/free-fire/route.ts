import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY!;

const FAZER_API_BASE =
  process.env.FAZERCARDS_API_URL ||
  "https://api.fzr.cards/api/v2";

const FAZER_API_KEY = process.env.FAZERCARDS_API_KEY!;

const CATEGORY_ID = "free_fire_latam";

const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
);

// -----------------------------------------------------------------------------
// OFERTAS DE FREE FIRE LATAM
// -----------------------------------------------------------------------------

const FREE_FIRE_OFFERS = [
  {
    id: "ff-110",
    supplierOfferId: "110_diamonds",
    name: "110 Diamonds",
    price: 0.78,
    supplierPrice: 0.6871,
  },
  {
    id: "ff-341",
    supplierOfferId: "341_diamonds",
    name: "341 Diamonds",
    price: 2.2094,
    supplierPrice: 2.0594,
  },
  {
    id: "ff-572",
    supplierOfferId: "572_diamonds",
    name: "572 Diamonds",
    price: 3.6429,
    supplierPrice: 3.4929,
  },
  {
    id: "ff-1166",
    supplierOfferId: "1166_diamonds",
    name: "1166 Diamonds",
    price: 6.631,
    supplierPrice: 6.481,
  },
  {
    id: "ff-2398",
    supplierOfferId: "2398_diamonds",
    name: "2398 Diamonds",
    price: 13.011,
    supplierPrice: 12.861,
  },
  {
    id: "ff-6160",
    supplierOfferId: "6160_diamantes",
    name: "6160 Diamonds",
    price: 32.8881,
    supplierPrice: 32.7381,
  },
  {
    id: "ff-210",
    supplierOfferId: "210_diamantes",
    name: "210 Diamonds",
    price: 2.0945,
    supplierPrice: 1.9445,
  },
  {
    id: "ff-530",
    supplierOfferId: "530_diamantes",
    name: "530 Diamonds",
    price: 5.0162,
    supplierPrice: 4.8662,
  },
  {
    id: "ff-1080",
    supplierOfferId: "1080_diamantes",
    name: "1080 Diamonds",
    price: 9.8724,
    supplierPrice: 9.7224,
  },
  {
    id: "ff-2200",
    supplierOfferId: "2200_diamantes",
    name: "2200 Diamonds",
    price: 19.5948,
    supplierPrice: 19.4448,
  },
  {
    id: "ff-weekly-lite",
    supplierOfferId: "weekly_lite",
    name: "Semanal Lite",
    price: 0.6538,
    supplierPrice: 0.5038,
  },
  {
    id: "ff-weekly-membership",
    supplierOfferId: "membresía_semanal",
    name: "Membresía semanal",
    price: 2.3282,
    supplierPrice: 2.1782,
  },
  {
    id: "ff-elite-pass",
    supplierOfferId: "booyah_pass",
    name: "Booyah Pass",
    price: 4.0138,
    supplierPrice: 3.8638,
  },
  {
    id: "ff-monthly-membership",
    supplierOfferId: "membresía_mensual",
    name: "Membresía mensual",
    price: 10.632,
    supplierPrice: 10.482,
  },
  {
    id: "ff-100",
    supplierOfferId: "100_diamantes",
    name: "100 Diamonds",
    price: 1.1273,
    supplierPrice: 0.9773,
  },
] as const;

// -----------------------------------------------------------------------------
// OBTENER USUARIO
// -----------------------------------------------------------------------------

async function getUserFromRequest(
  request: NextRequest,
) {
  const authorization =
    request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  const accessToken =
    authorization.substring(7);

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(
    accessToken,
  );

  if (error || !user) {
    return null;
  }

  return user;
}

// -----------------------------------------------------------------------------
// BUSCAR OFERTA EN NUESTRO LIB
// -----------------------------------------------------------------------------

function findLocalOffer(offerId: string) {
  return FREE_FIRE_OFFERS.find(
    (offer) =>
      offer.id === offerId ||
      offer.supplierOfferId === offerId,
  );
}

// -----------------------------------------------------------------------------
// CONSULTAR OFERTAS DE FAZERCARDS
// -----------------------------------------------------------------------------

async function getFazerCardsOffers() {
  const url =
    `${FAZER_API_BASE}/topups/offers?category_id=` +
    encodeURIComponent(CATEGORY_ID);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "X-API-Key": FAZER_API_KEY,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  const text = await response.text();

  let data: any;

  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  if (!response.ok) {
    throw new Error(
      `FazerCards offers error ${response.status}: ${
        typeof data === "string"
          ? data
          : JSON.stringify(data)
      }`,
    );
  }

  return data;
}

// -----------------------------------------------------------------------------
// EXTRAER OFERTAS
// -----------------------------------------------------------------------------

function extractOffers(data: any): any[] {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.offers)) {
    return data.offers;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  if (Array.isArray(data?.data?.offers)) {
    return data.data.offers;
  }

  if (Array.isArray(data?.results)) {
    return data.results;
  }

  return [];
}

// -----------------------------------------------------------------------------
// POST
// -----------------------------------------------------------------------------

export async function POST(
  request: NextRequest,
) {
  let orderId: string | null = null;

  try {
    // -------------------------------------------------------------------------
    // USUARIO
    // -------------------------------------------------------------------------

    const user =
      await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json(
        {
          ok: false,
          error: "No autorizado.",
        },
        { status: 401 },
      );
    }

    // -------------------------------------------------------------------------
    // BODY
    // -------------------------------------------------------------------------

    const body = await request.json();

    const {
      offerId,
      playerId,
    } = body;

    // -------------------------------------------------------------------------
    // VALIDAR OFERTA
    // -------------------------------------------------------------------------

    if (!offerId) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Falta seleccionar una oferta.",
        },
        { status: 400 },
      );
    }

    // -------------------------------------------------------------------------
    // VALIDAR PLAYER ID
    // -------------------------------------------------------------------------

    if (!playerId) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Debe introducir el ID del jugador.",
        },
        { status: 400 },
      );
    }

    const cleanPlayerId =
      String(playerId).trim();

    if (!cleanPlayerId) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El ID del jugador no puede estar vacío.",
        },
        { status: 400 },
      );
    }

    // -------------------------------------------------------------------------
    // BUSCAR OFERTA LOCAL
    // -------------------------------------------------------------------------

    const localOffer =
      findLocalOffer(String(offerId));

    if (!localOffer) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "La oferta de Free Fire no existe en STORE GAMING.",
          receivedOfferId: offerId,
        },
        { status: 400 },
      );
    }

    /*
      Ejemplo:

      STORE GAMING
      ff-110

      FazerCards
      110_diamonds
    */

    const supplierOfferId =
      localOffer.supplierOfferId;

    // -------------------------------------------------------------------------
    // CONSULTAR FAZERCARDS
    // -------------------------------------------------------------------------

    let fazerData: any;

    try {
      fazerData =
        await getFazerCardsOffers();
    } catch (error) {
      console.error(
        "Error consultando ofertas de FazerCards:",
        error,
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "No se pudieron consultar las ofertas de FazerCards.",
          details:
            error instanceof Error
              ? error.message
              : "Error desconocido",
        },
        { status: 502 },
      );
    }

    const fazerOffers =
      extractOffers(fazerData);

    // -------------------------------------------------------------------------
    // BUSCAR LA OFERTA REAL EN FAZERCARDS
    // -------------------------------------------------------------------------

    const fazerOffer =
      fazerOffers.find((offer: any) => {
        const ids = [
          offer?.id,
          offer?.offer_id,
          offer?.offerId,
          offer?.supplier_offer_id,
          offer?.supplierOfferId,
        ]
          .filter(Boolean)
          .map(String);

        return ids.includes(
          String(supplierOfferId),
        );
      });

    if (!fazerOffer) {
      console.error(
        "Oferta no encontrada en FazerCards",
        {
          categoryId: CATEGORY_ID,
          storeGamingOfferId:
            localOffer.id,
          supplierOfferId,
          fazerOffers,
        },
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "La oferta no está disponible en FazerCards.",
          offerId: localOffer.id,
          supplierOfferId,
          categoryId: CATEGORY_ID,
        },
        { status: 400 },
      );
    }

    // -------------------------------------------------------------------------
    // PRECIO
    // -------------------------------------------------------------------------

    const retailPrice =
      Number(localOffer.price);

    if (
      !Number.isFinite(retailPrice) ||
      retailPrice <= 0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El precio de la oferta no es válido.",
        },
        { status: 400 },
      );
    }

    // -------------------------------------------------------------------------
    // RESERVAR SALDO
    // -------------------------------------------------------------------------

    const {
      data: reserveData,
      error: reserveError,
    } =
      await supabaseAdmin.rpc(
        "store_gaming_reserve_balance",
        {
          p_user_id: user.id,
          p_amount: retailPrice,
        },
      );

    if (reserveError) {
      console.error(
        "Error reservando saldo:",
        reserveError,
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            reserveError.message ||
            "No se pudo reservar el saldo.",
        },
        { status: 400 },
      );
    }

    // -------------------------------------------------------------------------
    // GENERAR IDEMPOTENCY KEY
    // -----------------------------------------------------------------------------
    // ESTA ERA LA PARTE QUE CAUSABA EL ERROR DEL BUILD.
    // randomUUID está importado arriba desde "crypto".
    // -----------------------------------------------------------------------------

    const idempotencyKey =
      randomUUID();

    // -------------------------------------------------------------------------
    // CREAR ORDEN EN SUPABASE
    // -------------------------------------------------------------------------

    const {
      data: createdOrder,
      error: orderError,
    } =
      await supabaseAdmin
        .from("topup_orders")
        .insert({
          user_id: user.id,

          username:
            user.user_metadata
              ?.username ||
            user.user_metadata?.name ||
            user.email ||
            "Cliente",

          email: user.email,

          game: "Free Fire LATAM",

          category_id: CATEGORY_ID,

          // ID INTERNO DE STORE GAMING
          // Ejemplo: ff-110
          offer_id: localOffer.id,

          offer_name: localOffer.name,

          player_id: cleanPlayerId,

          retail_price: retailPrice,

          supplier_price:
            Number(
              localOffer.supplierPrice,
            ),

          currency: "USD",

          status: "RESERVED",

          // OBLIGATORIO EN topup_orders
          idempotency_key:
            idempotencyKey,

          supplier_fields: {
            player_id:
              cleanPlayerId,

            supplier_offer_id:
              localOffer.supplierOfferId,
          },
        })
        .select("id")
        .single();

    // -------------------------------------------------------------------------
    // ERROR CREANDO ORDEN
    // -------------------------------------------------------------------------

    if (
      orderError ||
      !createdOrder
    ) {
      console.error(
        "Error creando topup_order:",
        orderError,
      );

      // Devolver saldo reservado
      // porque la orden no pudo crearse.
      await supabaseAdmin.rpc(
        "store_gaming_admin_adjust_balance",
        {
          p_user_id: user.id,
          p_amount: retailPrice,
          p_action: "REFUND",
        },
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            orderError?.message ||
            "No se pudo crear la orden.",
        },
        { status: 500 },
      );
    }

    orderId =
      createdOrder.id;

    // -------------------------------------------------------------------------
    // CAMBIAR ORDEN A PROCESSING
    // -------------------------------------------------------------------------

    await supabaseAdmin
      .from("topup_orders")
      .update({
        status: "PROCESSING",
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", orderId);

    // -------------------------------------------------------------------------
    // PREPARAR ORDEN PARA FAZERCARDS
    // -----------------------------------------------------------------------------
    //
    // IMPORTANTE:
    //
    // NO enviamos:
    //
    // ff-110
    //
    // Enviamos:
    //
    // 110_diamonds
    //
    // -------------------------------------------------------------------------

    const fazerOrderUrl =
      `${FAZER_API_BASE}/topups/order`;

    const fazerPayload = {
      category_id:
        CATEGORY_ID,

      offer_id:
        supplierOfferId,

      fields: {
        player_id:
          cleanPlayerId,
      },
    };

    console.log(
      "Enviando orden a FazerCards:",
      JSON.stringify(
        fazerPayload,
        null,
        2,
      ),
    );

    // -------------------------------------------------------------------------
    // CREAR ORDEN EN FAZERCARDS
    // -------------------------------------------------------------------------

    const fazerResponse =
      await fetch(
        fazerOrderUrl,
        {
          method: "POST",

          headers: {
            "X-API-Key":
              FAZER_API_KEY,

            "Content-Type":
              "application/json",

            Accept:
              "application/json",
          },

          body: JSON.stringify(
            fazerPayload,
          ),
        },
      );

    const fazerText =
      await fazerResponse.text();

    let fazerResult: any;

    try {
      fazerResult =
        JSON.parse(fazerText);
    } catch {
      fazerResult = {
        raw: fazerText,
      };
    }

    // -------------------------------------------------------------------------
    // FAZERCARDS RECHAZÓ LA ORDEN
    // -------------------------------------------------------------------------

    if (!fazerResponse.ok) {
      console.error(
        "FazerCards rechazó la orden:",
        fazerResponse.status,
        fazerResult,
      );

      await supabaseAdmin
        .from("topup_orders")
        .update({
          status: "CANCELLED",

          supplier_response:
            fazerResult,

          failed_at:
            new Date().toISOString(),

          updated_at:
            new Date().toISOString(),
        })
        .eq("id", orderId);

      await supabaseAdmin.rpc(
        "store_gaming_refund_balance",
        {
          p_order_id:
            orderId,
        },
      );

      return NextResponse.json(
        {
          ok: false,

          error:
            fazerResult?.message ||
            fazerResult?.error ||
            "FazerCards rechazó la orden.",

          fazer:
            fazerResult,
        },
        {
          status:
            fazerResponse.status >=
              400 &&
            fazerResponse.status <
              500
              ? 400
              : 502,
        },
      );
    }

    // -------------------------------------------------------------------------
    // OBTENER ID DE ORDEN DE FAZERCARDS
    // -------------------------------------------------------------------------

    // FazerCards responde así: { ok: true, order: { id, status } }.
    // Leer order.id y order.status evita dejar la orden sin ID del proveedor.
    const supplierOrderId =
      fazerResult?.order?.id ??
      fazerResult?.data?.order?.id ??
      fazerResult?.order_id ??
      fazerResult?.orderId ??
      fazerResult?.id ??
      fazerResult?.data?.order_id ??
      fazerResult?.data?.orderId ??
      fazerResult?.data?.id ??
      null;

    const supplierStatus =
      String(
        fazerResult?.order?.status ??
          fazerResult?.data?.order?.status ??
          fazerResult?.status ??
          fazerResult?.data?.status ??
          "PENDING",
      ).trim().toUpperCase();

    // -------------------------------------------------------------------------
    // FAZERCARDS NO DEVOLVIÓ ID
    // -------------------------------------------------------------------------

    if (!supplierOrderId) {
      await supabaseAdmin
        .from("topup_orders")
        .update({
          status:
            "SUPPLIER_PENDING",

          supplier_response:
            fazerResult,

          updated_at:
            new Date().toISOString(),
        })
        .eq("id", orderId);

      return NextResponse.json({
        ok: true,

        orderId,

        status:
          "SUPPLIER_PENDING",

        message:
          "La orden fue enviada a FazerCards y está pendiente de confirmación.",
      });
    }

    // -------------------------------------------------------------------------
    // GUARDAR ID DE FAZERCARDS
    // -------------------------------------------------------------------------

    await supabaseAdmin
      .from("topup_orders")
      .update({
        supplier_order_id:
          String(
            supplierOrderId,
          ),

        supplier_response:
          fazerResult,

        updated_at:
          new Date().toISOString(),
      })
      .eq("id", orderId);

    // -------------------------------------------------------------------------
    // COMPLETED
    // -------------------------------------------------------------------------

    if (
      [
        "COMPLETED",
        "SUCCESS",
        "DONE",
      ].includes(
        supplierStatus,
      )
    ) {
      await supabaseAdmin
        .from("topup_orders")
        .update({
          status:
            "COMPLETED",

          completed_at:
            new Date().toISOString(),

          updated_at:
            new Date().toISOString(),
        })
        .eq("id", orderId);

      await supabaseAdmin.rpc(
        "store_gaming_complete_order",
        {
          p_supplier_order_id:
            String(
              supplierOrderId,
            ),
        },
      );

      return NextResponse.json({
        ok: true,

        orderId,

        supplierOrderId:
          String(
            supplierOrderId,
          ),

        status:
          "COMPLETED",

        message:
          "Recarga completada correctamente.",
      });
    }

    // -------------------------------------------------------------------------
    // FAILED / ERROR / REJECTED / CANCELLED
    // -------------------------------------------------------------------------

    if (
      [
        "FAILED",
        "ERROR",
        "REJECTED",
        "CANCELLED",
        "CANCELED",
        "REFUND",
        "REFUNDED",
        "REFUND_SUCCESS",
      ].includes(
        supplierStatus,
      )
    ) {
      await supabaseAdmin
        .from("topup_orders")
        .update({
          status:
            "CANCELLED",

          failed_at:
            new Date().toISOString(),

          updated_at:
            new Date().toISOString(),
        })
        .eq("id", orderId);

      await supabaseAdmin.rpc(
        "store_gaming_refund_balance",
        {
          p_order_id:
            orderId,
        },
      );

      return NextResponse.json({
        ok: false,

        orderId,

        supplierOrderId:
          String(
            supplierOrderId,
          ),

        status:
          "CANCELLED",

        message:
          ["REFUND", "REFUNDED", "REFUND_SUCCESS"].includes(supplierStatus)
            ? "FazerCards indicó un reembolso y STORE GAMING solicitó devolver el saldo."
            : "La recarga fue rechazada y STORE GAMING solicitó devolver el saldo.",
      });
    }

    // -------------------------------------------------------------------------
    // CONFIRMED / ACCEPTED
    // -------------------------------------------------------------------------

    if (
      [
        "CONFIRMED",
        "ACCEPTED",
      ].includes(
        supplierStatus,
      )
    ) {
      await supabaseAdmin
        .from("topup_orders")
        .update({
          status:
            "CONFIRMED",

          updated_at:
            new Date().toISOString(),
        })
        .eq("id", orderId);

      return NextResponse.json({
        ok: true,

        orderId,

        supplierOrderId:
          String(
            supplierOrderId,
          ),

        status:
          "CONFIRMED",

        message:
          "La orden fue confirmada por FazerCards.",
      });
    }

    // -------------------------------------------------------------------------
    // PENDING / PROCESSING / OTROS
    // -------------------------------------------------------------------------

    await supabaseAdmin
      .from("topup_orders")
      .update({
        status:
          "SUPPLIER_PENDING",

        updated_at:
          new Date().toISOString(),
      })
      .eq("id", orderId);

    return NextResponse.json({
      ok: true,

      orderId,

      supplierOrderId:
        String(
          supplierOrderId,
        ),

      status:
        "SUPPLIER_PENDING",

      message:
        "La orden fue enviada y está pendiente de procesamiento.",
    });
  } catch (error) {
    // -------------------------------------------------------------------------
    // ERROR GENERAL
    // -------------------------------------------------------------------------

    console.error(
      "Free Fire API error:",
      error,
    );

    // -------------------------------------------------------------------------
    // INTENTAR DEVOLVER SALDO SI YA EXISTÍA UNA ORDEN
    // -------------------------------------------------------------------------

    if (orderId) {
      try {
        await supabaseAdmin
          .from("topup_orders")
          .update({
            status:
              "CANCELLED",

            failed_at:
              new Date().toISOString(),

            updated_at:
              new Date().toISOString(),
          })
          .eq("id", orderId);

        await supabaseAdmin.rpc(
          "store_gaming_refund_balance",
          {
            p_order_id:
              orderId,
          },
        );
      } catch (
        refundError
      ) {
        console.error(
          "Error intentando devolver saldo:",
          refundError,
        );
      }
    }

    return NextResponse.json(
      {
        ok: false,

        error:
          error instanceof Error
            ? error.message
            : "Error interno del servidor.",
      },
      { status: 500 },
    );
  }
}

// -----------------------------------------------------------------------------
// GET
// -----------------------------------------------------------------------------

export async function GET() {
  return NextResponse.json({
    ok: true,

    game:
      "Free Fire LATAM",

    categoryId:
      CATEGORY_ID,

    playerField:
      "player_id",

    offers:
      FREE_FIRE_OFFERS.map(
        (offer) => ({
          id:
            offer.id,

          supplierOfferId:
            offer.supplierOfferId,

          name:
            offer.name,

          price:
            offer.price,
        }),
      ),
  });
  }
