import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY!;

const FAZER_API_BASE =
  (process.env.FAZERCARDS_API_URL || "https://api.fzr.cards/api/v2").replace(/\/+$/, "");

const FAZER_API_KEY = process.env.FAZERCARDS_API_KEY!;

// Debe coincidir exactamente con un origen autorizado en el panel de FazerCards.
// Configurar FAZERCARDS_ORIGIN en Vercel; usar el dominio estable de la tienda por defecto.
const FAZERCARDS_ORIGIN = process.env.FAZERCARDS_ORIGIN?.trim();

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
    // VALIDAR CONFIGURACIÓN DEL PROVEEDOR
    // -------------------------------------------------------------------------

    if (!FAZER_API_KEY) {
      console.error("Falta la variable FAZERCARDS_API_KEY en el entorno del servidor.");
      return NextResponse.json(
        { ok: false, error: "Falta configurar la clave API de FazerCards en el servidor." },
        { status: 500 },
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
            "Supabase no devolvió la orden creada.",
          details: orderError
            ? {
                code: orderError.code || null,
                details: orderError.details || null,
                hint: orderError.hint || null,
                message: orderError.message || null,
              }
            : { message: "createdOrder llegó vacío y no se recibió un error de Supabase." },
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

            ...(FAZERCARDS_ORIGIN
              ? { Origin: new URL(FAZERCARDS_ORIGIN).origin }
              : {}),

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
      console.error("FazerCards respondió no OK:", fazerResponse.status, fazerResult);

      const rejectedSupplierOrderId =
        fazerResult?.order?.id ??
        fazerResult?.data?.order?.id ??
        fazerResult?.order_id ??
        fazerResult?.orderId ??
        fazerResult?.data?.order_id ??
        fazerResult?.data?.orderId ??
        fazerResult?.data?.id ??
        fazerResult?.id ??
        null;
      const now = new Date().toISOString();
      const ambiguous = fazerResponse.status >= 500 || fazerResponse.status === 429;

      const { error: saveError } = await supabaseAdmin
        .from("topup_orders")
        .update({
          ...(rejectedSupplierOrderId ? { supplier_order_id: String(rejectedSupplierOrderId) } : {}),
          supplier_response: fazerResult,
          status: ambiguous ? "SUPPLIER_PENDING" : "FAILED",
          ...(!ambiguous ? { failed_at: now } : {}),
          updated_at: now,
        })
        .eq("id", orderId);

      if (saveError) {
        console.error("Error guardando respuesta de FazerCards:", saveError);
        return NextResponse.json({ ok: false, error: "No se pudo guardar la respuesta del proveedor. Revisa la orden antes de repetirla." }, { status: 500 });
      }

      if (ambiguous) {
        return NextResponse.json({
          ok: true,
          orderId,
          supplierOrderId: rejectedSupplierOrderId ? String(rejectedSupplierOrderId) : null,
          status: "SUPPLIER_PENDING",
          message: "Respuesta temporal del proveedor. El saldo queda reservado hasta verificar el estado real de la orden.",
        }, { status: 202 });
      }

      const { error: refundError } = await supabaseAdmin.rpc("refund_topup_balance", { p_order_id: orderId });
      if (refundError) {
        console.error("Error devolviendo saldo tras rechazo definitivo:", refundError);
        return NextResponse.json({ ok: false, error: "FazerCards rechazó la orden, pero el reembolso necesita revisión.", orderId }, { status: 500 });
      }

      return NextResponse.json({
        ok: false,
        error: fazerResult?.message || fazerResult?.error || "FazerCards rechazó la orden.",
        orderId,
        supplierOrderId: rejectedSupplierOrderId ? String(rejectedSupplierOrderId) : null,
        status: "REFUNDED",
      }, { status: 400 });
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
      fazerResult?.data?.order_id ??
      fazerResult?.data?.orderId ??
      fazerResult?.data?.id ??
      fazerResult?.id ??
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
    // COMPLETED: el RPC es quien decide y guarda el estado final de forma segura.
    // -------------------------------------------------------------------------

    if (
      [
        "COMPLETED",
        "COMPLETE",
        "SUCCESS",
        "SUCCESSFUL",
        "SUCCEEDED",
        "DELIVERED",
        "DONE",
      ].includes(supplierStatus)
    ) {
      const { error: completeError } = await supabaseAdmin.rpc(
        "complete_topup_order",
        { p_supplier_order_id: String(supplierOrderId) },
      );

      if (completeError) {
        console.error("Error completando orden confirmada por FazerCards:", completeError);
        await supabaseAdmin
          .from("topup_orders")
          .update({
            status: "SUPPLIER_PENDING",
            updated_at: new Date().toISOString(),
          })
          .eq("id", orderId);

        // No repetir la compra: FazerCards ya respondió con éxito.
        // El cron debe reconciliar el estado usando supplier_order_id.
        return NextResponse.json({
          ok: true,
          orderId,
          supplierOrderId: String(supplierOrderId),
          status: "SUPPLIER_PENDING",
          message: "FazerCards confirmó la recarga; STORE GAMING la verificará mediante el cron.",
        }, { status: 202 });
      }

      const { data: finalOrder, error: finalOrderError } = await supabaseAdmin
        .from("topup_orders")
        .select("status, refunded_at")
        .eq("id", orderId)
        .maybeSingle();

      if (
        finalOrderError ||
        !finalOrder ||
        String(finalOrder.status ?? "").toUpperCase() !== "COMPLETED" ||
        finalOrder.refunded_at
      ) {
        console.error("No se pudo verificar la finalización de la orden:", finalOrderError);
        return NextResponse.json({
          ok: true,
          orderId,
          supplierOrderId: String(supplierOrderId),
          status: "SUPPLIER_PENDING",
          message: "FazerCards confirmó la recarga; el estado final está pendiente de reconciliación.",
        }, { status: 202 });
      }

      return NextResponse.json({
        ok: true,
        orderId,
        supplierOrderId: String(supplierOrderId),
        status: "COMPLETED",
        message: "Recarga completada correctamente.",
      });
    }

    // -------------------------------------------------------------------------
    // REFUND_FAILED: NO significa que el reembolso se haya completado.
    // Dejamos la orden pendiente para que el cron vuelva a consultar al proveedor.
    // -------------------------------------------------------------------------

    if (supplierStatus === "REFUND_FAILED") {
      await supabaseAdmin
        .from("topup_orders")
        .update({
          status: "SUPPLIER_PENDING",
          supplier_response: {
            ...((fazerResult && typeof fazerResult === "object" && !Array.isArray(fazerResult)) ? fazerResult : { response: fazerResult }),
            normalized_status: supplierStatus,
            requires_reconciliation: true,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      return NextResponse.json({
        ok: true,
        orderId,
        supplierOrderId: String(supplierOrderId),
        status: "SUPPLIER_PENDING",
        message: "FazerCards informó REFUND_FAILED. No se hizo un reembolso automático; la orden queda pendiente de verificación.",
      }, { status: 202 });
    }

    // -------------------------------------------------------------------------
    // FALLO DEFINITIVO O REEMBOLSO CONFIRMADO
    // -------------------------------------------------------------------------

    if (
      [
        "FAILED",
        "FAILURE",
        "ERROR",
        "REJECTED",
        "DECLINED",
        "DENIED",
        "CANCELLED",
        "CANCELED",
        "REFUND",
        "REFUNDED",
        "REFUND_SUCCESS",
      ].includes(supplierStatus)
    ) {
      const { error: refundError } = await supabaseAdmin.rpc(
        "refund_topup_balance",
        { p_order_id: orderId },
      );
      if (refundError) {
        console.error("Error devolviendo saldo tras fallo confirmado:", refundError);
        return NextResponse.json({ ok: false, error: "El proveedor confirmó el fallo, pero el reembolso necesita revisión.", orderId }, { status: 500 });
      }

      const { data: refundedOrder, error: verifyRefundError } = await supabaseAdmin
        .from("topup_orders")
        .select("status, refunded_at")
        .eq("id", orderId)
        .maybeSingle();

      if (verifyRefundError || !refundedOrder || String(refundedOrder.status ?? "").toUpperCase() !== "REFUNDED" || !refundedOrder.refunded_at) {
        console.error("No se pudo verificar el reembolso:", verifyRefundError);
        return NextResponse.json({ ok: false, error: "Se solicitó el reembolso, pero no se pudo confirmar en la base de datos.", orderId }, { status: 500 });
      }

      return NextResponse.json({
        ok: false,
        orderId,
        supplierOrderId: String(supplierOrderId),
        status: "REFUNDED",
        message: ["REFUND", "REFUNDED", "REFUND_SUCCESS"].includes(supplierStatus)
          ? "FazerCards indicó un reembolso y STORE GAMING confirmó la devolución del saldo."
          : "La recarga falló y STORE GAMING confirmó la devolución del saldo.",
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
    console.error("Free Fire API error; el resultado del proveedor puede ser desconocido:", error);

    if (orderId) {
      const { error: saveError } = await supabaseAdmin
        .from("topup_orders")
        .update({
          // Preserve any supplier response already stored before the exception.
          status: "SUPPLIER_PENDING",
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      if (saveError) console.error("Error guardando orden pendiente:", saveError);
    }

    return NextResponse.json({
      ok: true,
      orderId,
      status: orderId ? "SUPPLIER_PENDING" : "ERROR",
      message: orderId
        ? "No se pudo confirmar el resultado de la petición. El saldo no se devuelve automáticamente; la orden requiere verificación."
        : "No se pudo iniciar la orden.",
    }, { status: orderId ? 202 : 500 });
  }
}
