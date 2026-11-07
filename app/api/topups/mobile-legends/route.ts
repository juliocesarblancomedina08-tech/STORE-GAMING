
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const FAZER_API_BASE = (
  process.env.FAZERCARDS_API_URL ||
  "https://api.fzr.cards/api/v2"
).replace(/\/+$/, "");

const CATEGORY_ID = "mobile_legends_united_states";
const GAME_NAME = "Mobile Legends (United States)";

const NORMAL_MARKUP = 0.20;
const VIP_MARKUP = 0.08;

type Offer = {
  id: string;
  name: string;
  supplierPrice: number;
};

const OFFERS: Offer[] = [
  { id: "51_5_diamonds", name: "51 + 5 Diamonds", supplierPrice: 0.8665 },
  { id: "weekly_diamond_pass", name: "Weekly Diamond Pass", supplierPrice: 1.7430 },
  { id: "253_25_diamonds", name: "253 + 25 Diamonds", supplierPrice: 4.3423 },
  { id: "505_66_diamonds", name: "505 + 66 Diamonds", supplierPrice: 8.7048 },
  { id: "1010_182_diamonds", name: "1010 + 182 Diamonds", supplierPrice: 17.3391 },
  { id: "1515_273_diamonds", name: "1515 + 273 Diamonds", supplierPrice: 25.9935 },
  { id: "2525_480_diamonds", name: "2525 + 480 Diamonds", supplierPrice: 43.3225 },
  { id: "3030_576_diamonds", name: "3030 + 576 Diamonds", supplierPrice: 51.9870 },
  { id: "4008_802_diamonds", name: "4008 + 802 Diamonds", supplierPrice: 69.3160 },
  { id: "5010_1002_diamonds", name: "5010 + 1002 Diamonds", supplierPrice: 86.6450 },
];

function jsonError(message: string, status = 400) {
  return NextResponse.json(
    { ok: false, error: message },
    { status }
  );
}

function calculatePrice(supplierPrice: number, vip: boolean) {
  return Number(
    (supplierPrice + (vip ? VIP_MARKUP : NORMAL_MARKUP)).toFixed(4)
  );
}

function getOffer(id: string) {
  return OFFERS.find((offer) => offer.id === id) ?? null;
}

function isSuccessfulSupplierStatus(status: string) {
  return [
    "completed",
    "complete",
    "success",
    "successful",
    "delivered",
    "done",
  ].includes(status.toLowerCase().trim());
}

function isRejectedSupplierStatus(status: string) {
  return [
    "rejected",
    "failed",
    "failure",
    "cancelled",
    "canceled",
    "error",
  ].includes(status.toLowerCase().trim());
}

async function authenticate(request: NextRequest) {
  const authorization = request.headers.get("authorization") || "";

  if (!authorization.startsWith("Bearer ")) {
    return { user: null, error: "No autorizado." };
  }

  const token = authorization.slice(7).trim();

  if (!token) {
    return { user: null, error: "Token inválido." };
  }

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    return {
      user: null,
      error: "Sesión inválida o expirada.",
    };
  }

  return { user, error: null };
}

async function getVipStatus(userId: string) {
  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .select("vip_expires_at")
    .eq("id", userId)
    .maybeSingle();

  if (error || !profile) {
    throw new Error("No se pudo comprobar el estado VIP.");
  }

  const expiration = profile.vip_expires_at
    ? new Date(profile.vip_expires_at).getTime()
    : 0;

  return Number.isFinite(expiration) && expiration > Date.now();
}

/*
 * GET: catálogo y precios según el usuario.
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error } = await authenticate(request);

    if (!user) {
      return jsonError(error || "No autorizado.", 401);
    }

    const vipActive = await getVipStatus(user.id);

    const offers = OFFERS.map((offer) => ({
      offer_id: offer.id,
      name: offer.name,
      supplier_price: offer.supplierPrice,
      retail_price: calculatePrice(
        offer.supplierPrice,
        vipActive
      ),
      vip_active: vipActive,
    }));

    return NextResponse.json({
      ok: true,
      game: GAME_NAME,
      category_id: CATEGORY_ID,
      currency: "USD",
      vip_active: vipActive,
      fields: [
        { key: "player_id", label: "Player ID", type: "text" },
        { key: "server_id", label: "Server ID", type: "text" },
      ],
      offers,
    });
  } catch (error) {
    console.error("ERROR CATÁLOGO MOBILE LEGENDS:", error);

    return jsonError(
      "No se pudo cargar el catálogo.",
      500
    );
  }
}

/*
 * POST: crear y procesar una compra.
 */
export async function POST(request: NextRequest) {
  let internalOrderId: string | null = null;
  let reserved = false;

  try {
    const { user, error } = await authenticate(request);

    if (!user) {
      return jsonError(error || "No autorizado.", 401);
    }

    if (!process.env.FAZERCARDS_API_KEY) {
      return jsonError(
        "El servicio de recargas no está configurado.",
        500
      );
    }

    const body = await request.json();

    const offerId =
      typeof body?.offerId === "string"
        ? body.offerId.trim()
        : "";

    const playerId =
      typeof body?.playerId === "string"
        ? body.playerId.trim()
        : "";

    const serverId =
      typeof body?.serverId === "string"
        ? body.serverId.trim()
        : "";

    const idempotencyKey =
      typeof body?.idempotencyKey === "string"
        ? body.idempotencyKey.trim()
        : "";

    const offer = getOffer(offerId);

    if (!offer) {
      return jsonError("La oferta seleccionada no existe.");
    }

    if (!/^[0-9]{3,20}$/.test(playerId)) {
      return jsonError("El Player ID no es válido.");
    }

    if (!/^[0-9]{1,20}$/.test(serverId)) {
      return jsonError("El Server ID no es válido.");
    }

    if (
      !idempotencyKey ||
      idempotencyKey.length > 150
    ) {
      return jsonError("Falta la clave de seguridad del pedido.");
    }

    /*
     * Comprobar si el pedido ya existe.
     */
    const { data: existingOrder, error: existingError } =
      await supabaseAdmin
        .from("topup_orders")
        .select("id,status,supplier_order_id,retail_price")
        .eq("user_id", user.id)
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();

    if (existingError) {
      console.error("ERROR IDEMPOTENCIA:", existingError);
      return jsonError("No se pudo comprobar el pedido.", 500);
    }

    if (existingOrder) {
      return NextResponse.json({
        ok: true,
        reused: true,
        orderNumber: existingOrder.id,
        supplierOrderId: existingOrder.supplier_order_id,
        status: existingOrder.status,
        retailPrice: existingOrder.retail_price,
      });
    }

    /*
     * Precio calculado exclusivamente en el servidor.
     */
    const vipActive = await getVipStatus(user.id);
    const supplierPrice = offer.supplierPrice;
    const retailPrice = calculatePrice(
      supplierPrice,
      vipActive
    );

    const username =
      user.user_metadata?.username ??
      user.user_metadata?.user_name ??
      null;

    /*
     * Crear registro interno.
     */
    const { data: insertedOrder, error: insertError } =
      await supabaseAdmin
        .from("topup_orders")
        .insert({
          user_id: user.id,
          username,
          email: user.email ?? null,
          game: GAME_NAME,
          category_id: CATEGORY_ID,
          offer_id: offer.id,
          offer_name: offer.name,
          player_id: playerId,
          retail_price: retailPrice,
          supplier_price: supplierPrice,
          currency: "USD",
          status: "RESERVED",
          idempotency_key: idempotencyKey,
          supplier_fields: {
            player_id: playerId,
            server_id: serverId,
            vip_active: vipActive,
          },
        })
        .select("id")
        .single();

    if (insertError || !insertedOrder) {
      console.error("ERROR CREANDO ORDEN:", insertError);
      return jsonError("No se pudo crear el pedido.", 500);
    }

    internalOrderId = insertedOrder.id;

    /*
     * Reservar el saldo.
     */
    const { error: reserveError } = await supabaseAdmin.rpc(
      "reserve_topup_balance",
      {
        p_user_id: user.id,
        p_amount: retailPrice,
      }
    );

    if (reserveError) {
      console.error("ERROR RESERVANDO SALDO:", reserveError);

      await supabaseAdmin
        .from("topup_orders")
        .update({
          status: "FAILED",
          failed_at: new Date().toISOString(),
        })
        .eq("id", internalOrderId);

      if (
        reserveError.message?.toLowerCase().includes("saldo")
      ) {
        return jsonError("SALDO INSUFICIENTE.", 400);
      }

      return jsonError(
        "No se pudo reservar el saldo.",
        400
      );
    }

    reserved = true;

    /*
     * Enviar pedido a FazerCards.
     */
    let supplierResponse: Response;

    try {
      supplierResponse = await fetch(
        `${FAZER_API_BASE}/topups/order`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "X-API-Key": process.env.FAZERCARDS_API_KEY!,
            "Idempotency-Key": idempotencyKey,
            "User-Agent": "STORE-GAMING/1.0",
          },
          body: JSON.stringify({
            category_id: CATEGORY_ID,
            offer_id: offer.id,
            fields: {
              player_id: playerId,
              server_id: serverId,
            },
          }),
          cache: "no-store",
        }
      );
    } catch (networkError) {
      /*
       * Resultado incierto: no devolver saldo automáticamente.
       * El proveedor podría haber recibido el pedido.
       */
      console.error("ERROR DE RED FAZERCARDS:", networkError);

      await supabaseAdmin
        .from("topup_orders")
        .update({
          status: "SUPPLIER_PENDING",
          updated_at: new Date().toISOString(),
        })
        .eq("id", internalOrderId);

      return NextResponse.json(
        {
          ok: true,
          orderNumber: internalOrderId,
          status: "SUPPLIER_PENDING",
          retailPrice,
          message: "El pedido está pendiente de confirmación.",
        },
        { status: 202 }
      );
    }

    const supplierText = await supplierResponse.text();

    let supplierData: any = {};

    try {
      supplierData = supplierText
        ? JSON.parse(supplierText)
        : {};
    } catch {
      supplierData = { raw: supplierText };
    }

    const supplierOrderId =
      supplierData?.order_id ??
      supplierData?.id ??
      supplierData?.order?.id ??
      supplierData?.data?.order_id ??
      supplierData?.data?.id ??
      null;

    const supplierStatus = String(
      supplierData?.status ??
      supplierData?.order?.status ??
      supplierData?.data?.status ??
      ""
    ).trim();

    console.log(
      "RESPUESTA FAZERCARDS MOBILE LEGENDS US:",
      supplierResponse.status,
      supplierData
    );

    /*
     * Si el proveedor confirma un rechazo, devolver el saldo.
     */
    if (isRejectedSupplierStatus(supplierStatus)) {
      await supabaseAdmin
        .from("topup_orders")
        .update({
          status: "FAILED",
          supplier_order_id: supplierOrderId,
          supplier_response: supplierData,
          failed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", internalOrderId);

      const { error: refundError } = await supabaseAdmin.rpc(
        "refund_topup_balance",
        { p_order_id: internalOrderId }
      );

      if (refundError) {
        console.error("ERROR DEVOLVIENDO SALDO:", refundError);
      } else {
        reserved = false;
      }

      return NextResponse.json(
        {
          ok: false,
          error: "FazerCards rechazó el pedido.",
          status: "FAILED",
          orderNumber: internalOrderId,
        },
        { status: 400 }
      );
    }

    /*
     * Sin confirmación clara: mantener el pedido pendiente.
     */
    if (
      !supplierResponse.ok ||
      !supplierOrderId ||
      !supplierStatus
    ) {
      await supabaseAdmin
        .from("topup_orders")
        .update({
          status: "SUPPLIER_PENDING",
          supplier_order_id: supplierOrderId,
          supplier_response: supplierData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", internalOrderId);

      return NextResponse.json(
        {
          ok: true,
          orderNumber: internalOrderId,
          supplierOrderId,
          status: "SUPPLIER_PENDING",
          retailPrice,
          message: "El pedido está pendiente de confirmación.",
        },
        { status: 202 }
      );
    }

    /*
     * Guardar estado confirmado.
     */
    if (isSuccessfulSupplierStatus(supplierStatus)) {
      const { error: completeError } = await supabaseAdmin.rpc(
        "complete_topup_order",
        {
          p_supplier_order_id: String(supplierOrderId),
        }
      );

      if (completeError) {
        console.error("ERROR COMPLETANDO ORDEN:", completeError);
      } else {
        reserved = false;
      }

      return NextResponse.json({
        ok: true,
        orderNumber: internalOrderId,
        supplierOrderId,
        status: completeError ? "SUPPLIER_PENDING" : "COMPLETED",
        retailPrice,
        supplierPrice,
        vipActive,
      });
    }

    await supabaseAdmin
      .from("topup_orders")
      .update({
        status: "SUPPLIER_PENDING",
        supplier_order_id: supplierOrderId,
        supplier_response: supplierData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", internalOrderId);

    return NextResponse.json(
      {
        ok: true,
        orderNumber: internalOrderId,
        supplierOrderId,
        status: "SUPPLIER_PENDING",
        retailPrice,
        supplierPrice,
        vipActive,
      },
      { status: 202 }
    );
  } catch (error) {
    console.error("ERROR MOBILE LEGENDS US:", error);

    /*
     * No se reembolsa automáticamente en un error inesperado
     * después de enviar el pedido al proveedor.
     */
    if (internalOrderId) {
      await supabaseAdmin
        .from("topup_orders")
        .update({
          status: "SUPPLIER_PENDING",
          updated_at: new Date().toISOString(),
        })
        .eq("id", internalOrderId)
        .eq("status", "RESERVED");
    }

    return jsonError("No se pudo procesar el pedido.", 500);
  }
}
