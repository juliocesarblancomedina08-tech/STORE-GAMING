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
const FAZERCARDS_CRON_SECRET = process.env.FAZERCARDS_CRON_SECRET;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const TOPUP_PENDING_STATUSES = [
"SUPPLIER_PENDING",
"PENDING",
"PROCESSING",
"CONFIRMED",
];

const GIFTCARD_PENDING_STATUSES = [
"SUPPLIER_PENDING",
"PENDING",
"PROCESSING",
"CONFIRMED",
];

const MAX_ORDERS_PER_RUN = 100;

type Obj = Record<string, unknown>;

function asObject(value: unknown): Obj | null {
if (
value !== null &&
typeof value === "object" &&
!Array.isArray(value)
) {
return value as Obj;
}

return null;
}

function getText(value: unknown): string {
if (typeof value === "string") return value.trim();

if (typeof value === "number" && Number.isFinite(value)) {
return String(value);
}

return "";
}

function normalizeStatus(value: unknown): string {
return getText(value)
.toLowerCase()
.replace(/[\s-]+/g, "_");
}

function findNestedValue(
payload: unknown,
keys: string[],
depth = 0,
): unknown {
const root = asObject(payload);

if (!root || depth > 7) return undefined;

for (const key of keys) {
const value = root[key];

if (
  value !== undefined &&
  value !== null &&
  value !== ""
) {
  return value;
}

}

for (const key of [
"data",
"order",
"result",
"response",
"payload",
]) {
const value = findNestedValue(root[key], keys, depth + 1);

if (value !== undefined) return value;

}

return undefined;
}

function getSupplierOrderId(payload: unknown): string {
const value = getText(
findNestedValue(payload, [
"supplier_order_id",
"order_id",
"orderId",
"id",
]),
);

return /^ord-[A-Za-z0-9_-]+$/.test(value) ? value : "";
}

function getProviderStatus(payload: unknown): string {
return normalizeStatus(
findNestedValue(payload, ["status", "order_status"]),
);
}

function getProviderCodes(payload: unknown): unknown {
return findNestedValue(payload, [
"gift_codes",
"giftCodes",
"codes",
"keys",
"serials",
"gift_code",
"giftCode",
"code",
"serial",
"pin",
]);
}

function hasCodes(value: unknown): boolean {
if (typeof value === "string") {
return value.trim().length > 0;
}

if (Array.isArray(value)) {
return value.length > 0;
}

const obj = asObject(value);

return obj !== null && Object.keys(obj).length > 0;
}

function isCompletedStatus(status: string): boolean {
return [
"completed",
"complete",
"success",
"successful",
"succeeded",
"delivered",
"done",
].includes(status);
}

function isFailedStatus(status: string): boolean {
return [
"failed",
"failure",
"rejected",
"declined",
"denied",
"error",
"refunded",
"refund",
].includes(status);
}

function getTopupNextStatus(status: string): string {
if (status === "processing") return "PROCESSING";

if (["confirmed", "accepted"].includes(status)) {
return "CONFIRMED";
}

return "SUPPLIER_PENDING";
}

async function readResponse(response: Response): Promise<unknown> {
const body = await response.text();

if (!body) return {};

try {
return JSON.parse(body) as unknown;
} catch {
return { raw: body.slice(0, 2000) };
}
}

async function getSupplierOrder(
supplierId: string,
): Promise<{ payload: unknown; status: string }> {
const response = await fetch(
"${FAZER_API_BASE}/orders/${encodeURIComponent(supplierId)}",
{
method: "GET",
headers: {
"X-API-Key": FAZER_API_KEY!,
Accept: "application/json",
},
cache: "no-store",
signal: AbortSignal.timeout(15000),
},
);

const payload = await readResponse(response);

if (!response.ok) {
throw new Error(
"FazerCards respondió HTTP ${response.status}: ${JSON.stringify(payload).slice(0, 300)}",
);
}

const status = getProviderStatus(payload);

if (!status) {
throw new Error(
"FazerCards no devolvió un estado reconocible.",
);
}

return { payload, status };
}

async function reconcileTopups(supabase: any) {
const result = {
scanned: 0,
checked: 0,
completed: 0,
refunded: 0,
pending: 0,
missingSupplierId: 0,
errors: [] as Array<{ id: string; message: string }>,
};

const { data: orders, error } = await supabase
.from("topup_orders")
.select("id,supplier_order_id,supplier_response,status,updated_at")
.in("status", TOPUP_PENDING_STATUSES)
.order("updated_at", { ascending: true })
.limit(MAX_ORDERS_PER_RUN);

if (error) {
throw new Error("Top Up: ${error.message}");
}

for (const order of orders ?? []) {
result.scanned++;

const supplierId = getText(order.supplier_order_id);

if (!/^ord-[A-Za-z0-9_-]+$/.test(supplierId)) {
  result.missingSupplierId++;
  continue;
}

try {
  const currentStatus = getText(order.status).toUpperCase();

  if (!TOPUP_PENDING_STATUSES.includes(currentStatus)) {
    continue;
  }

  const { payload, status } = await getSupplierOrder(supplierId);
  result.checked++;

  const oldResponse = asObject(order.supplier_response) ?? {};

  const { error: saveError } = await supabase
    .from("topup_orders")
    .update({
      supplier_response: {
        ...oldResponse,
        reconciliation: {
          last_response: payload,
          checked_at: new Date().toISOString(),
        },
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", order.id)
    .in("status", TOPUP_PENDING_STATUSES);

  if (saveError) {
    throw new Error(saveError.message);
  }

  if (isCompletedStatus(status)) {
    const { error: rpcError } = await supabase.rpc(
      "complete_topup_order",
      { p_supplier_order_id: supplierId },
    );

    if (rpcError) {
      throw new Error(`Completar Top Up: ${rpcError.message}`);
    }

    result.completed++;
  } else if (isFailedStatus(status)) {
    const { error: rpcError } = await supabase.rpc(
      "refund_topup_balance",
      { p_order_id: order.id },
    );

    if (rpcError) {
      throw new Error(`Reembolsar Top Up: ${rpcError.message}`);
    }

    result.refunded++;
  } else {
    const { error: statusError } = await supabase
      .from("topup_orders")
      .update({
        status: getTopupNextStatus(status),
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id)
      .in("status", TOPUP_PENDING_STATUSES);

    if (statusError) {
      throw new Error(statusError.message);
    }

    result.pending++;
  }
} catch (error) {
  result.errors.push({
    id: String(order.id),
    message: error instanceof Error ? error.message : String(error),
  });
}

}

return result;
}

async function reconcileGiftCards(supabase: any) {
const result = {
scanned: 0,
checked: 0,
completed: 0,
refunded: 0,
pending: 0,
missingSupplierId: [] as string[],
errors: [] as Array<{ id: string; message: string }>,
};

const { data: orders, error } = await supabase
.from("gift_card_orders")
.select(
"id,supplier_order_id,supplier_response,status,gift_codes,updated_at",
)
.in("status", GIFTCARD_PENDING_STATUSES)
.order("updated_at", { ascending: true })
.limit(MAX_ORDERS_PER_RUN);

if (error) {
throw new Error("Gift Cards: ${error.message}");
}

for (const order of orders ?? []) {
result.scanned++;

const supplierId = getText(order.supplier_order_id);

/*
 * No inventar identificadores ni volver a enviar compras.
 * Las órdenes sin ID se informan para revisión.
 */
if (!/^ord-[A-Za-z0-9_-]+$/.test(supplierId)) {
  result.missingSupplierId.push(String(order.id));
  continue;
}

try {
  const currentStatus = getText(order.status).toUpperCase();

  if (!GIFTCARD_PENDING_STATUSES.includes(currentStatus)) {
    continue;
  }

  const { payload, status } = await getSupplierOrder(supplierId);
  result.checked++;

  const oldResponse = asObject(order.supplier_response) ?? {};
  const oldReconciliation = asObject(oldResponse.reconciliation) ?? {};
  const codes = getProviderCodes(payload);
  const isDelivered = isCompletedStatus(status) && hasCodes(codes);
  const isFailed = isFailedStatus(status);

  const update: Record<string, unknown> = {
    supplier_response: {
      ...oldResponse,
      reconciliation: {
        ...oldReconciliation,
        last_response: payload,
        checked_at: new Date().toISOString(),
      },
    },
    updated_at: new Date().toISOString(),
  };

  if (isDelivered) {
    update.status = "COMPLETED";
    update.gift_codes = codes;
    update.completed_at = new Date().toISOString();
  } else if (isFailed) {
    update.status = "FAILED";
    update.failed_at = new Date().toISOString();
  } else {
    update.status =
      status === "processing"
        ? "PROCESSING"
        : ["confirmed", "accepted"].includes(status)
          ? "CONFIRMED"
          : "SUPPLIER_PENDING";
  }

  const { data: saved, error: saveError } = await supabase
    .from("gift_card_orders")
    .update(update)
    .eq("id", order.id)
    .in("status", GIFTCARD_PENDING_STATUSES)
    .select("id");

  if (saveError) {
    throw new Error(saveError.message);
  }

  if (!saved?.length) {
    continue;
  }

  if (isDelivered) {
    result.completed++;
  } else if (isFailed) {
    const { error: refundError } = await supabase.rpc(
      "refund_gift_card_order",
      { p_order_id: order.id },
    );

    if (refundError) {
      throw new Error(
        `Reembolsar Gift Card: ${refundError.message}`,
      );
    }

    result.refunded++;
  } else {
    result.pending++;
  }
} catch (error) {
  result.errors.push({
    id: String(order.id),
    message: error instanceof Error ? error.message : String(error),
  });
}

}

return result;
}

export async function GET(request: NextRequest) {
if (!FAZERCARDS_CRON_SECRET) {
return NextResponse.json(
{ ok: false, error: "Cron de FazerCards no configurado." },
{ status: 500 },
);
}

if (
request.headers.get("authorization") !==
"Bearer ${FAZERCARDS_CRON_SECRET}"
) {
return NextResponse.json(
{ ok: false, error: "No autorizado." },
{ status: 401 },
);
}

if (!FAZER_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
return NextResponse.json(
{
ok: false,
error: "Faltan variables de entorno de FazerCards o Supabase.",
},
{ status: 500 },
);
}

const supabase = createClient(
SUPABASE_URL,
SUPABASE_SERVICE_ROLE_KEY,
{
auth: {
autoRefreshToken: false,
persistSession: false,
},
},
);

const errors: string[] = [];
let topup: unknown = null;
let giftcards: unknown = null;

try {
topup = await reconcileTopups(supabase);
} catch (error) {
errors.push(
"Top Up: ${error instanceof Error ? error.message : String(error)}",
);
}

try {
giftcards = await reconcileGiftCards(supabase);
} catch (error) {
errors.push(
"Gift Cards: ${error instanceof Error ? error.message : String(error)}",
);
}

const result = {
ok: errors.length === 0,
topup,
giftcards,
errors,
timestamp: new Date().toISOString(),
};

console.info("FAZERCARDS_RECONCILIATION_RESULT", result);

return NextResponse.json(result, {
status: errors.length ? 500 : 200,
});
}
