
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const FAZER_API_BASE = (
  process.env.FAZERCARDS_API_URL ||
  "https://api.fzr.cards/api/v2"
).replace(/\/+$/, "");

const FAZER_API_KEY = process.env.FAZERCARDS_API_KEY || "";
const FAZER_ORIGIN = process.env.FAZERCARDS_ORIGIN || "";

const CATEGORY_ID = "roblox_global";
const PROFIT_PER_UNIT = 0.25;
const MAX_QUANTITY = 100;

const admin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;

type SupplierOffer = {
  card_id?: string | number;
  offer_id?: string | number;
  id?: string | number;
  name?: string;
  price_usd?: string | number;
  price?: string | number;
  stock?: string | number;
  quantity?: string | number;
  max_order_quantity?: string | number;
  maxOrderQuantity?: string | number;
  min_order_quantity?: string | number;
};

type GiftCode = {
  code: string;
  [key: string]: unknown;
};

function jsonError(
  error: string,
  status: number,
  extra: Record<string, unknown> = {}
) {
  return NextResponse.json(
    { success: false, error, ...extra },
    { status }
  );
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function parseNumber(value: unknown): number {
  if (typeof value === "number") return value;

  if (typeof value === "string") {
    const parsed = Number(value.replace(/[$,\s]/g, ""));
    return Number.isFinite(parsed) ? parsed : NaN;
  }

  return NaN;
}

function findOffers(payload: unknown): SupplierOffer[] {
  if (!payload || typeof payload !== "object") return [];

  const obj = payload as Record<string, unknown>;

  if (Array.isArray(obj.offers)) {
    return obj.offers as SupplierOffer[];
  }

  if (obj.data && typeof obj.data === "object") {
    const result = findOffers(obj.data);
    if (result.length) return result;
  }

  if (obj.result && typeof obj.result === "object") {
    const result = findOffers(obj.result);
    if (result.length) return result;
  }

  if (obj.category && typeof obj.category === "object") {
    return findOffers(obj.category);
  }

  return [];
}

function offerId(offer: SupplierOffer): string {
  return String(
    offer.card_id ?? offer.offer_id ?? offer.id ?? ""
  );
}

function getStock(offer: SupplierOffer): number {
  const value = parseNumber(offer.stock ?? offer.quantity);

  // Stock desconocido no significa stock infinito.
  return Number.isFinite(value) ? value : -1;
}

function getMaximum(offer: SupplierOffer): number {
  const value = parseNumber(
    offer.max_order_quantity ?? offer.maxOrderQuantity
  );

  return Number.isFinite(value) && value > 0
    ? Math.min(Math.floor(value), MAX_QUANTITY)
    : MAX_QUANTITY;
}

function extractOrderObject(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== "object") return {};

  const obj = payload as Record<string, unknown>;

  if (obj.order && typeof obj.order === "object") {
    return obj.order as Record<string, unknown>;
  }

  if (obj.data && typeof obj.data === "object") {
    const data = obj.data as Record<string, unknown>;

    if (data.order && typeof data.order === "object") {
      return data.order as Record<string, unknown>;
    }

    return data;
  }

  return obj;
}

function extractSupplierOrderId(
  payload: unknown
): string | null {
  const order = extractOrderObject(payload);

  const value =
    order.order_id ??
    order.id ??
    order.reference ??
    order.reference_id;

  return value === undefined || value === null
    ? null
    : String(value);
}

function extractStatus(payload: unknown): string {
  const order = extractOrderObject(payload);

  return String(
    order.status ??
    order.state ??
    ""
  ).toLowerCase();
}

function extractCodes(payload: unknown): GiftCode[] {
  const order = extractOrderObject(payload);

  const possible =
    order.cards ??
    order.gift_codes ??
    order.codes ??
    order.items;

  if (!Array.isArray(possible)) return [];

  const result: GiftCode[] = [];

  for (const item of possible) {
    if (typeof item === "string" && item.trim()) {
      result.push({ code: item.trim() });
      continue;
    }

    if (item && typeof item === "object") {
      const obj = item as Record<string, unknown>;

      const code =
        obj.code ??
        obj.card_code ??
        obj.pin ??
        obj.serial;

      if (typeof code === "string" && code.trim()) {
        result.push({
          ...obj,
          code: code.trim(),
        });
      }
    }
  }

  return result;
}

function isCompletedStatus(status: string): boolean {
  return [
    "completed",
    "complete",
    "success",
    "successful",
    "delivered",
    "finished",
  ].includes(status);
}

function isFailedStatus(status: string): boolean {
  return [
    "failed",
    "failure",
    "rejected",
    "cancelled",
    "canceled",
    "declined",
  ].includes(status);
}

async function supplierFetch(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(init.headers);

  headers.set("X-API-Key", FAZER_API_KEY);
  headers.set("Accept", "application/json");

  if (init.body) {
    headers.set("Content-Type", "application/json");
  }

  if (FAZER_ORIGIN) {
    headers.set("Origin", FAZER_ORIGIN);
  }

  return fetch(`${FAZER_API_BASE}${path}`, {
    ...init,
    headers,
    cache: "no-store",
    signal: AbortSignal.timeout(25000),
  });
}

async function refundOrder(orderId: string) {
  if (!admin) {
    throw new Error("SUPABASE_ADMIN_NOT_CONFIGURED");
  }

  const { data, error } = await admin.rpc(
    "refund_gift_card_order",
    { p_order_id: orderId }
  );

  if (error) {
    console.error("Gift card refund failed:", error.message);
    throw new Error("REFUND_FAILED");
  }

  return data;
}

export async function POST(request: NextRequest) {
  if (!admin) {
    return jsonError(
      "La configuración de Supabase en el servidor está incompleta.",
      500
    );
  }

  if (!FAZER_API_KEY) {
    return jsonError(
      "Falta configurar FAZERCARDS_API_KEY en Vercel.",
      500
    );
  }

  const authorization = request.headers.get("authorization") || "";
  const tokenMatch = authorization.match(/^Bearer\s+(.+)$/i);

  if (!tokenMatch) {
    return jsonError("Debes iniciar sesión para comprar.", 401);
  }

  const token = tokenMatch[1].trim();

  const {
    data: authData,
    error: authError,
  } = await admin.auth.getUser(token);

  if (authError || !authData.user) {
    return jsonError("Tu sesión no es válida. Inicia sesión de nuevo.", 401);
  }

  const user = authData.user;

  let body: Record<string, unknown>;

  try {
    const parsed = await request.json();

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return jsonError("La solicitud no es válida.", 400);
    }

    body = parsed as Record<string, unknown>;
  } catch {
    return jsonError("El cuerpo de la solicitud no es JSON válido.", 400);
  }

  const cardId = String(body.card_id ?? "").trim();
  const quantity = Number(body.quantity);
  const suppliedKey = String(body.idempotency_key ?? "").trim();

  if (!cardId || cardId.length > 150) {
    return jsonError("La tarjeta seleccionada no es válida.", 400);
  }

  if (
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > MAX_QUANTITY
  ) {
    return jsonError(
      `La cantidad debe estar entre 1 y ${MAX_QUANTITY}.`,
      400
    );
  }

  // El cliente debe reutilizar la misma clave al repetir
  // una solicitud por error de conexión.
  const idempotencyKey =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      suppliedKey
    )
      ? suppliedKey
      : randomUUID();

  // No aceptar precios ni descuentos enviados por el navegador.
  let catalogResponse: Response;

  try {
    catalogResponse = await supplierFetch(
      `/giftcards/cards?category_id=${encodeURIComponent(CATEGORY_ID)}`,
      { method: "GET" }
    );
  } catch (error) {
    console.error("FazerCards catalog request failed:", error);
    return jsonError(
      "No pudimos verificar el catálogo. No se realizó ningún cobro.",
      502
    );
  }

  if (!catalogResponse.ok) {
    console.error(
      "FazerCards catalog HTTP status:",
      catalogResponse.status
    );

    return jsonError(
      "No pudimos verificar el precio y el stock con el proveedor.",
      502
    );
  }

  let catalogPayload: unknown;

  try {
    catalogPayload = await catalogResponse.json();
  } catch {
    return jsonError(
      "El proveedor devolvió una respuesta de catálogo no válida.",
      502
    );
  }

  const offers = findOffers(catalogPayload);

  if (!offers.length) {
    console.error(
      "Unexpected FazerCards catalog shape:",
      JSON.stringify(catalogPayload).slice(0, 1500)
    );

    return jsonError(
      "No pudimos interpretar el catálogo del proveedor. No se realizó ningún cobro.",
      502
    );
  }

  const offer = offers.find((item) => offerId(item) === cardId);

  if (!offer) {
    return jsonError(
      "La tarjeta ya no está disponible en el catálogo. Actualiza la página.",
      409
    );
  }

  const supplierUnitPrice = parseNumber(
    offer.price_usd ?? offer.price
  );

  if (!Number.isFinite(supplierUnitPrice) || supplierUnitPrice <= 0) {
    return jsonError(
      "El proveedor no devolvió un precio válido.",
      502
    );
  }

  const stock = getStock(offer);

  if (stock < 0) {
    return jsonError(
      "No podemos confirmar el stock de esta tarjeta. Inténtalo más tarde.",
      409
    );
  }

  if (stock < quantity) {
    return jsonError(
      `Stock insuficiente. Disponibles: ${stock}.`,
      409
    );
  }

  if (quantity > getMaximum(offer)) {
    return jsonError(
      `La cantidad máxima permitida por compra es ${getMaximum(offer)}.`,
      400
    );
  }

  const supplierTotal = roundMoney(supplierUnitPrice * quantity);
  const retailUnitPrice = roundMoney(
    supplierUnitPrice + PROFIT_PER_UNIT
  );
  const retailTotal = roundMoney(retailUnitPrice * quantity);

  const offerName = String(
    offer.name || `Roblox Global - ${cardId}`
  ).slice(0, 200);

  // Obtener información de perfil sin confiar en datos del cliente.
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, username, email")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Profile lookup failed:", profileError.message);
    return jsonError("No pudimos verificar tu cuenta.", 500);
  }

  if (!profile) {
    return jsonError(
      "No encontramos tu perfil de STORE GAMING.",
      404
    );
  }

  // Esta función SQL descuenta el saldo y crea la orden
  // dentro de una sola transacción.
  const { data: reserveData, error: reserveError } =
    await admin.rpc(
      "create_gift_card_order_and_reserve_balance",
      {
        p_user_id: user.id,
        p_username: String(
          profile.username ?? user.user_metadata?.username ?? ""
        ).slice(0, 150),
        p_email: String(profile.email ?? user.email ?? "").slice(0, 320),
        p_category_id: CATEGORY_ID,
        p_card_id: cardId,
        p_offer_name: offerName,
        p_quantity: quantity,
        p_retail_price: retailTotal,
        p_supplier_price: supplierTotal,
        p_idempotency_key: idempotencyKey,
      }
    );

  if (reserveError) {
    console.error(
      "Gift card balance reservation failed:",
      reserveError.message
    );

    const message = reserveError.message.toLowerCase();

    if (
      message.includes("insufficient") ||
      message.includes("insufficient_balance") ||
      message.includes("saldo")
    ) {
      return jsonError("No tienes saldo suficiente para esta compra.", 402);
    }

    return jsonError(
      "No pudimos reservar tu saldo. No se envió la compra al proveedor.",
      500
    );
  }

  const reservation = Array.isArray(reserveData)
    ? reserveData[0]
    : reserveData;

  const orderId = reservation?.order_id as string | undefined;
  const created = reservation?.created as boolean | undefined;

  if (!orderId) {
    console.error("Unexpected reserve RPC result:", reserveData);

    return jsonError(
      "No pudimos confirmar la creación de tu pedido.",
      500
    );
  }

  // Si la clave ya existía, no volver a enviar una compra
  // al proveedor. La orden anterior debe verificarse.
  if (created === false) {
    const { data: existing, error: existingError } = await admin
      .from("gift_card_orders")
      .select(
        "id, status, quantity, retail_price, offer_name, supplier_order_id, gift_codes, created_at"
      )
      .eq("id", orderId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingError || !existing) {
      return jsonError(
        "La solicitud ya existe, pero no pudimos recuperar su estado.",
        500
      );
    }

    return NextResponse.json({
      success: true,
      duplicate: true,
      order: existing,
      message:
        "Esta solicitud ya había sido recibida. No se envió otra compra.",
    });
  }

  // Desde aquí puede haber una compra externa real.
  // Un timeout o un 5xx no se reintenta automáticamente.
  let supplierResponse: Response;

  try {
    supplierResponse = await supplierFetch("/giftcards/order", {
      method: "POST",
      body: JSON.stringify({
        category_id: CATEGORY_ID,
        card_id: cardId,
        quantity,
      }),
    });
  } catch (error) {
    console.error("FazerCards order outcome is uncertain:", error);

    await admin
      .from("gift_card_orders")
      .update({
        status: "PENDING",
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    return NextResponse.json(
      {
        success: true,
        status: "PENDING",
        order_id: orderId,
        message:
          "Tu pedido quedó pendiente de verificación. No vuelvas a comprar la misma tarjeta mientras comprobamos el resultado.",
      },
      { status: 202 }
    );
  }

  let supplierPayload: unknown = {};

  try {
    supplierPayload = await supplierResponse.json();
  } catch {
    // Sin un cuerpo válido no podemos asegurar si el proveedor
    // llegó a procesar la orden.
  }

  const supplierOrderId = extractSupplierOrderId(supplierPayload);
  const supplierStatus = extractStatus(supplierPayload);
  const giftCodes = extractCodes(supplierPayload);

  const supplierSaysSuccess =
    supplierResponse.ok &&
    (
      giftCodes.length > 0 ||
      isCompletedStatus(supplierStatus)
    );

  const supplierSaysFailed =
    supplierResponse.status >= 400 &&
    supplierResponse.status < 500 &&
    supplierResponse.status !== 408 &&
    supplierResponse.status !== 429;

  // Guardar la respuesta del proveedor para poder investigar
  // el pedido sin exponerla al navegador.
  const safeSupplierResponse =
    supplierPayload &&
    typeof supplierPayload === "object"
      ? supplierPayload
      : { raw: String(supplierPayload) };

  if (supplierSaysSuccess && giftCodes.length > 0) {
    const { error: updateError } = await admin
      .from("gift_card_orders")
      .update({
        status: "COMPLETED",
        supplier_order_id: supplierOrderId,
        supplier_response: safeSupplierResponse,
        gift_codes: giftCodes,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId)
      .eq("user_id", user.id);

    if (updateError) {
      // No reembolsar: el proveedor pudo entregar los códigos.
      console.error(
        "Could not save delivered gift codes:",
        updateError.message
      );

      return NextResponse.json(
        {
          success: true,
          status: "PROCESSING",
          order_id: orderId,
          message:
            "El proveedor respondió, pero estamos verificando el registro del pedido. No vuelvas a comprarlo.",
        },
        { status: 202 }
      );
    }

    return NextResponse.json({
      success: true,
      status: "COMPLETED",
      order_id: orderId,
      message: "Tu compra se completó. Consulta tus órdenes para ver los códigos.",
    });
  }

  if (supplierSaysFailed) {
    await admin
      .from("gift_card_orders")
      .update({
        status: "FAILED",
        supplier_order_id: supplierOrderId,
        supplier_response: safeSupplierResponse,
        failed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    try {
      await refundOrder(orderId);
    } catch {
      return jsonError(
        "El proveedor rechazó el pedido, pero no pudimos confirmar el reembolso automático. Contacta con soporte y no repitas la compra.",
        500,
        { order_id: orderId }
      );
    }

    return NextResponse.json(
      {
        success: false,
        status: "REFUNDED",
        order_id: orderId,
        message:
          "El proveedor rechazó la compra. El pedido fue marcado para reembolso al balance.",
      },
      { status: 502 }
    );
  }

  // Respuesta aceptada sin códigos, respuesta inesperada o
  // error del servidor: mantener la orden sin reintentar.
  const nextStatus =
    supplierResponse.ok &&
    supplierOrderId &&
    !isFailedStatus(supplierStatus)
      ? "PROCESSING"
      : "PENDING";

  const { error: pendingUpdateError } = await admin
    .from("gift_card_orders")
    .update({
      status: nextStatus,
      supplier_order_id: supplierOrderId,
      supplier_response: safeSupplierResponse,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (pendingUpdateError) {
    console.error(
      "Could not save pending supplier response:",
      pendingUpdateError.message
    );
  }

  return NextResponse.json(
    {
      success: true,
      status: nextStatus,
      order_id: orderId,
      message:
        "Tu pedido está pendiente de confirmación. No vuelvas a comprar la misma tarjeta mientras verificamos su estado.",
    },
    { status: 202 }
  );
}
