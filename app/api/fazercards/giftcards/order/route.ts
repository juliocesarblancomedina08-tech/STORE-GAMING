import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const FAZER_API_BASE = (
process.env.FAZERCARDS_API_URL ||
"https://api.fzr.cards/api/v2"
).replace(//+$/, "");

const FAZER_API_KEY = process.env.FAZERCARDS_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
process.env.SUPABASE_SERVICE_ROLE_KEY;

const PROFIT_PER_UNIT = 0.25;
const MAX_QUANTITY = 100;
const CATEGORY_ID = "roblox_global";

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown): string {
if (typeof value === "string") return value.trim();
if (typeof value === "number" && Number.isFinite(value)) return String(value);
return "";
}

function numberValue(value: unknown): number | null {
if (typeof value === "number" && Number.isFinite(value)) return value;

if (typeof value === "string" && value.trim() !== "") {
const parsed = Number(value);
if (Number.isFinite(parsed)) return parsed;
}

return null;
}

function extractObject(value: unknown): JsonObject {
if (!isObject(value)) return {};

for (const key of ["data", "result", "order", "purchase"]) {
const nested = value[key];
if (isObject(nested)) return { ...value, ...nested };
}

return value;
}

function extractOrderId(data: unknown): string {
const obj = extractObject(data);

for (const key of [
"supplier_order_id",
"order_id",
"orderId",
"transaction_id",
"transactionId",
"id",
]) {
const value = text(obj[key]);
if (value) return value;
}

return "";
}

function extractCodes(data: unknown): unknown[] {
if (!isObject(data)) return [];

const obj = extractObject(data);

for (const key of [
"gift_codes",
"giftCodes",
"codes",
"keys",
"serials",
"items",
]) {
const value = obj[key];
if (Array.isArray(value) && value.length > 0) return value;
}

for (const key of ["data", "result", "order", "purchase"]) {
const nested = obj[key];

if (isObject(nested)) {
  const codes = extractCodes(nested);
  if (codes.length > 0) return codes;
}

}

return [];
}

function extractStatus(data: unknown): string {
const obj = extractObject(data);

for (const key of ["status", "state", "order_status", "orderStatus"]) {
const value = text(obj[key]).toLowerCase();
if (value) return value;
}

return "";
}

function isFailedStatus(status: string): boolean {
return [
"failed",
"failure",
"error",
"rejected",
"cancelled",
"canceled",
].includes(status);
}

function isCompletedStatus(status: string): boolean {
return [
"completed",
"complete",
"success",
"successful",
"delivered",
"fulfilled",
].includes(status);
}

function supplierHeaders(): HeadersInit {
return {
"X-API-Key": FAZER_API_KEY!,
Accept: "application/json",
"Content-Type": "application/json",
"User-Agent": "STORE-GAMING/1.0",
};
}

async function parseResponse(response: Response): Promise<unknown> {
const raw = await response.text();

if (!raw) return {};

try {
return JSON.parse(raw);
} catch {
return { raw };
}
}

function jsonError(message: string, status: number) {
return NextResponse.json(
{ success: false, error: message },
{ status }
);
}

export async function POST(request: NextRequest) {
let orderId = "";

try {
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
return jsonError(
"Faltan las variables de configuración de Supabase en Vercel.",
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
const token = authorization.startsWith("Bearer ")
  ? authorization.slice(7).trim()
  : "";

if (!token) {
  return jsonError("Debes iniciar sesión para comprar.", 401);
}

const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

const {
  data: { user },
  error: userError,
} = await supabaseAdmin.auth.getUser(token);

if (userError || !user) {
  return jsonError(
    "La sesión no es válida. Inicia sesión nuevamente.",
    401
  );
}

let body: unknown;

try {
  body = await request.json();
} catch {
  return jsonError("El cuerpo de la solicitud no es JSON válido.", 400);
}

if (!isObject(body)) {
  return jsonError("Los datos de compra no son válidos.", 400);
}

const cardId = text(body.card_id);
const quantity = numberValue(body.quantity);
const idempotencyKey = text(body.idempotency_key);

if (!cardId) {
  return jsonError("Falta seleccionar una tarjeta.", 400);
}

if (
  quantity === null ||
  !Number.isInteger(quantity) ||
  quantity < 1 ||
  quantity > MAX_QUANTITY
) {
  return jsonError(
    `La cantidad debe ser un número entero entre 1 y ${MAX_QUANTITY}.`,
    400
  );
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

if (!uuidPattern.test(idempotencyKey)) {
  return jsonError(
    "La clave de compra no es válida. Intenta nuevamente.",
    400
  );
}

const catalogResponse = await fetch(
  `${FAZER_API_BASE}/giftcards/cards?category_id=${encodeURIComponent(CATEGORY_ID)}`,
  {
    method: "GET",
    headers: supplierHeaders(),
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  }
);

const catalogData = await parseResponse(catalogResponse);

if (!catalogResponse.ok) {
  console.error(
    "[STORE GAMING] Error consultando catálogo:",
    catalogResponse.status,
    catalogData
  );

  return jsonError(
    "No se pudo verificar el catálogo de Roblox. Intenta más tarde.",
    502
  );
}

const root = isObject(catalogData) ? catalogData : {};
let catalogList: unknown[] = [];

if (Array.isArray(catalogData)) {
  catalogList = catalogData;
} else if (Array.isArray(root.cards)) {
  catalogList = root.cards;
} else if (Array.isArray(root.offers)) {
  catalogList = root.offers;
} else if (Array.isArray(root.data)) {
  catalogList = root.data;
} else if (isObject(root.data)) {
  if (Array.isArray(root.data.cards)) {
    catalogList = root.data.cards;
  } else if (Array.isArray(root.data.offers)) {
    catalogList = root.data.offers;
  }
}

const card = catalogList.find((item: unknown) => {
  if (!isObject(item)) return false;
  return text(item.card_id ?? item.id) === cardId;
});

if (!isObject(card)) {
  return jsonError(
    "La tarjeta seleccionada ya no aparece en el catálogo de Roblox Global.",
    409
  );
}

const supplierPrice = numberValue(
  card.price_usd ?? card.price ?? card.cost
);

if (supplierPrice === null || supplierPrice <= 0) {
  console.error("[STORE GAMING] Precio inválido del proveedor:", card);

  return jsonError(
    "FazerCards no devolvió un precio válido para esta tarjeta.",
    502
  );
}

const stock = numberValue(card.stock ?? card.available_stock);

if (stock !== null && stock < quantity) {
  return jsonError("No hay suficiente stock para esa cantidad.", 409);
}

const maxQuantity = numberValue(
  card.max_order_quantity ?? card.max_quantity
);

if (maxQuantity !== null && quantity > maxQuantity) {
  return jsonError(
    `La cantidad máxima permitida es ${maxQuantity}.`,
    400
  );
}

const offerName =
  text(card.name ?? card.title ?? card.offer_name) ||
  `Roblox Global - ${cardId}`;

const unitRetailPrice =
  Math.round((supplierPrice + PROFIT_PER_UNIT) * 100) / 100;

const retailTotal =
  Math.round(unitRetailPrice * quantity * 100) / 100;

const supplierTotal =
  Math.round(supplierPrice * quantity * 100) / 100;

const { data: profile, error: profileError } = await supabaseAdmin
  .from("profiles")
  .select("username,email")
  .eq("id", user.id)
  .maybeSingle();

if (profileError) {
  console.error("[STORE GAMING] Error leyendo perfil:", profileError);
  return jsonError("No se pudo verificar tu perfil.", 500);
}

const username =
  text(profile?.username) ||
  text(user.user_metadata?.username) ||
  text(user.email?.split("@")[0]) ||
  "Cliente";

const email = text(profile?.email) || text(user.email);

const { data: reserveData, error: reserveError } =
  await supabaseAdmin.rpc(
    "create_gift_card_order_and_reserve_balance",
    {
      p_user_id: user.id,
      p_username: username,
      p_email: email,
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
  console.error("[STORE GAMING] Error reservando saldo:", reserveError);

  return jsonError(
    "No se pudo reservar el saldo. Verifica tu saldo e inténtalo nuevamente.",
    409
  );
}

const reservation = Array.isArray(reserveData)
  ? reserveData[0]
  : reserveData;

if (!isObject(reservation)) {
  console.error("[STORE GAMING] Respuesta inesperada de RPC:", reserveData);
  return jsonError("No se pudo confirmar la creación del pedido.", 500);
}

orderId = text(reservation.order_id ?? reservation.id);

if (!orderId) {
  console.error("[STORE GAMING] La RPC no devolvió order_id:", reserveData);
  return jsonError(
    "La reserva no devolvió el identificador del pedido.",
    500
  );
}

const created = reservation.created === true;

if (!created) {
  const { data: existing, error: existingError } = await supabaseAdmin
    .from("gift_card_orders")
    .select(
      "id,status,supplier_order_id,gift_codes,retail_price,quantity,offer_name"
    )
    .eq("id", orderId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingError || !existing) {
    console.error(
      "[STORE GAMING] Error recuperando pedido existente:",
      existingError
    );

    return jsonError(
      "La solicitud ya existe, pero no se pudo recuperar el pedido.",
      500
    );
  }

  return NextResponse.json({
    success: true,
    duplicate: true,
    order_id: existing.id,
    supplier_order_id: existing.supplier_order_id,
    status: existing.status,
    gift_codes: existing.gift_codes || [],
    message:
      "Esta solicitud ya había sido procesada. No se envió una segunda compra.",
  });
}

let supplierResponse: Response;

try {
  supplierResponse = await fetch(`${FAZER_API_BASE}/giftcards/order`, {
    method: "POST",
    headers: supplierHeaders(),
    body: JSON.stringify({
      category_id: CATEGORY_ID,
      card_id: cardId,
      quantity,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(30000),
  });
} catch (networkError) {
  console.error(
    "[STORE GAMING] Resultado incierto al enviar a FazerCards:",
    networkError
  );

  await supabaseAdmin
    .from("gift_card_orders")
    .update({
      status: "PENDING",
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .eq("user_id", user.id);

  return NextResponse.json(
    {
      success: true,
      order_id: orderId,
      status: "PENDING",
      message:
        "El pedido quedó pendiente de verificación. No repitas la compra; consulta Mis pedidos.",
    },
    { status: 202 }
  );
}

const supplierData = await parseResponse(supplierResponse);
const supplierOrderId = extractOrderId(supplierData);
const supplierStatus = extractStatus(supplierData);
const giftCodes = extractCodes(supplierData);

console.info("[STORE GAMING] Respuesta de FazerCards:", {
  httpStatus: supplierResponse.status,
  supplierOrderId: supplierOrderId || null,
  supplierStatus: supplierStatus || null,
  codesReceived: giftCodes.length,
  internalOrderId: orderId,
});

if (giftCodes.length > 0) {
  const { error: saveError } = await supabaseAdmin
    .from("gift_card_orders")
    .update({
      status: "COMPLETED",
      supplier_order_id: supplierOrderId || null,
      supplier_response: supplierData,
      gift_codes: giftCodes,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .eq("user_id", user.id);

  if (saveError) {
    console.error(
      "[STORE GAMING] Error guardando códigos recibidos:",
      saveError
    );

    return NextResponse.json(
      {
        success: false,
        order_id: orderId,
        status: "PROCESSING",
        message:
          "El proveedor respondió, pero no se pudieron guardar los códigos. Contacta con soporte con este número de pedido.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    order_id: orderId,
    supplier_order_id: supplierOrderId || null,
    status: "COMPLETED",
    gift_codes: giftCodes,
    message: "Compra completada. Tus códigos están disponibles en Mis pedidos.",
  });
}

if (!supplierResponse.ok) {
  console.error("[STORE GAMING] Error HTTP de FazerCards:", {
    status: supplierResponse.status,
    response: supplierData,
    orderId,
  });

  await supabaseAdmin
    .from("gift_card_orders")
    .update({
      status: "PENDING",
      supplier_order_id: supplierOrderId || null,
      supplier_response: supplierData,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .eq("user_id", user.id);

  return NextResponse.json(
    {
      success: true,
      order_id: orderId,
      supplier_order_id: supplierOrderId || null,
      status: "PENDING",
      message:
        "FazerCards no confirmó la entrega. El pedido quedó pendiente de verificación para proteger tu saldo.",
    },
    { status: 202 }
  );
}

const nextStatus =
  supplierOrderId && !isFailedStatus(supplierStatus)
    ? "PROCESSING"
    : "PENDING";

const { error: updateError } = await supabaseAdmin
  .from("gift_card_orders")
  .update({
    status: nextStatus,
    supplier_order_id: supplierOrderId || null,
    supplier_response: supplierData,
    updated_at: new Date().toISOString(),
  })
  .eq("id", orderId)
  .eq("user_id", user.id);

if (updateError) {
  console.error(
    "[STORE GAMING] Error actualizando estado del pedido:",
    updateError
  );

  return NextResponse.json(
    {
      success: false,
      order_id: orderId,
      status: "PENDING",
      message:
        "La compra fue enviada, pero no se pudo actualizar su estado. No repitas la compra; revisa Mis pedidos.",
    },
    { status: 500 }
  );
}

return NextResponse.json(
  {
    success: true,
    order_id: orderId,
    supplier_order_id: supplierOrderId || null,
    status: nextStatus,
    gift_codes: [],
    message: supplierOrderId
      ? "FazerCards registró la solicitud. Estamos esperando los códigos."
      : "El pedido quedó pendiente de confirmación. Consulta Mis pedidos más tarde.",
  },
  { status: 202 }
);

} catch (error) {
console.error("[STORE GAMING] Error procesando compra:", error);

if (orderId && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
  try {
    const supabaseAdmin = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    await supabaseAdmin
      .from("gift_card_orders")
      .update({
        status: "PENDING",
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);
  } catch (updateError) {
    console.error(
      "[STORE GAMING] No se pudo guardar el estado pendiente:",
      updateError
    );
  }
}

return NextResponse.json(
  {
    success: false,
    order_id: orderId || null,
    error:
      "Ocurrió un error al procesar la compra. Si el pedido ya fue creado, no lo repitas; revisa Mis pedidos o contacta con soporte.",
  },
  { status: 500 }
);

}
}
