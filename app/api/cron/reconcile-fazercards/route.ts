import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const FAZER_API_BASE = (
  process.env.FAZERCARDS_API_URL || "https://api.fzr.cards/api/v2"
).replace(/\/+$/, "");
const FAZER_API_KEY = process.env.FAZERCARDS_API_KEY;
const CRON_SECRET = process.env.CRON_SECRET;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const PENDING_STATUSES = [
  "SUPPLIER_PENDING",
  "PENDING",
  "PROCESSING",
  "CONFIRMED",
];

function normalizeStatus(value: unknown): string {
  return String(value ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function asObject(value: unknown): Record<string, any> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, any>)
    : null;
}

/** Busca el ID de FazerCards en la columna o en la respuesta guardada. */
function getSupplierOrderId(order: Record<string, any>): string {
  const saved = asObject(order.supplier_response);
  const candidates = [
    order.supplier_order_id,
    saved?.order?.id,
    saved?.data?.order?.id,
    saved?.data?.order_id,
    saved?.order_id,
    saved?.data?.id,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" || typeof candidate === "number") {
      const value = String(candidate).trim();
      if (/^ord-[A-Za-z0-9_-]+$/.test(value)) return value;
    }
  }
  return "";
}

function getProviderOrder(payload: unknown): Record<string, any> {
  const root = asObject(payload) ?? {};
  const data = asObject(root.data);
  return asObject(root.order) ?? asObject(data?.order) ?? data ?? root;
}

function getProviderStatus(payload: unknown): string {
  const root = asObject(payload) ?? {};
  const order = getProviderOrder(payload);
  return normalizeStatus(order.status ?? root.status ?? asObject(root.data)?.status);
}

function isCompletedStatus(status: string): boolean {
  return ["completed", "complete", "success", "successful", "succeeded", "delivered", "done"].includes(status);
}

function isRefundWorthyFailureStatus(status: string): boolean {
  // No se reembolsan automáticamente cancelaciones ambiguas.
  return ["failed", "failure", "rejected", "declined", "denied", "error", "refund", "refunded"].includes(status);
}

export async function GET(request: NextRequest) {
  if (!CRON_SECRET) {
    console.error("Falta configurar CRON_SECRET.");
    return NextResponse.json({ ok: false, error: "Cron no configurado." }, { status: 500 });
  }

  if (request.headers.get("authorization") !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: "No autorizado." }, { status: 401 });
  }

  if (!FAZER_API_KEY) {
    return NextResponse.json({ ok: false, error: "Falta FAZERCARDS_API_KEY." }, { status: 500 });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Faltan variables de entorno de Supabase para el cron.");
    return NextResponse.json({ ok: false, error: "Supabase no está configurado para el cron." }, { status: 500 });
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const {
    data: ordersWithColumnId,
    error: columnQueryError,
  } = await supabaseAdmin
    .from("topup_orders")
    .select("id, supplier_order_id, supplier_response, status, updated_at")
    .in("status", PENDING_STATUSES)
    .not("supplier_order_id", "is", null)
    .order("updated_at", { ascending: true })
    .limit(100);

  if (columnQueryError) {
    console.error("Error leyendo órdenes con ID de proveedor:", columnQueryError);
    return NextResponse.json({ ok: false, error: "No se pudieron leer las órdenes." }, { status: 500 });
  }

  const {
    data: ordersWithResponseOnly,
    error: responseQueryError,
  } = await supabaseAdmin
    .from("topup_orders")
    .select("id, supplier_order_id, supplier_response, status, updated_at")
    .in("status", PENDING_STATUSES)
    .is("supplier_order_id", null)
    .not("supplier_response", "is", null)
    .order("updated_at", { ascending: true })
    .limit(100);

  if (responseQueryError) {
    console.error("Error leyendo respuestas de proveedor:", responseQueryError);
    return NextResponse.json({ ok: false, error: "No se pudieron leer las respuestas de proveedor." }, { status: 500 });
  }

  const mergedOrders = new Map<string, any>();
  for (const order of [...(ordersWithColumnId ?? []), ...(ordersWithResponseOnly ?? [])]) {
    mergedOrders.set(order.id, order);
  }

  let checked = 0;
  let completed = 0;
  let refunded = 0;
  let stillPending = 0;
  let missingSupplierId = 0;
  const failures: Array<{ orderId: string; message: string }> = [];

  // Array.from evita el error de TypeScript con MapIterator.
  for (const order of Array.from(mergedOrders.values())) {
    const supplierId = getSupplierOrderId(order);
    if (!supplierId) {
      missingSupplierId += 1;
      continue;
    }

    try {
      const response = await fetch(`${FAZER_API_BASE}/orders/${encodeURIComponent(supplierId)}`, {
        method: "GET",
        headers: { "X-API-Key": FAZER_API_KEY, Accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      });

      const text = await response.text();
      let payload: unknown;
      try {
        payload = text ? JSON.parse(text) : {};
      } catch {
        payload = { raw: text };
      }

      if (!response.ok) {
        failures.push({ orderId: order.id, message: `FazerCards HTTP ${response.status}` });
        continue;
      }

      const status = getProviderStatus(payload);
      if (!status) {
        failures.push({ orderId: order.id, message: "FazerCards no devolvió un estado reconocible." });
        continue;
      }

      const { data: savedRows, error: saveError } = await supabaseAdmin
        .from("topup_orders")
        .update({
          supplier_order_id: supplierId,
          supplier_response: payload,
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id)
        .in("status", PENDING_STATUSES)
        .select("id");

      if (saveError) throw new Error(`No se guardó la respuesta: ${saveError.message}`);
      if (!savedRows?.length) continue;
      checked += 1;

      if (isCompletedStatus(status)) {
        const { error: rpcError } = await supabaseAdmin.rpc("complete_topup_order", {
          p_supplier_order_id: supplierId,
        });
        if (rpcError) throw new Error(`No se pudo completar: ${rpcError.message}`);
        completed += 1;
      } else if (isRefundWorthyFailureStatus(status)) {
        const { error: rpcError } = await supabaseAdmin.rpc("store_gaming_refund_balance", {
          p_order_id: order.id,
        });
        if (rpcError) throw new Error(`No se pudo reembolsar: ${rpcError.message}`);
        refunded += 1;
      } else {
        const nextStatus = ["confirmed", "accepted"].includes(status) ? "CONFIRMED" : "SUPPLIER_PENDING";
        const { error: statusError } = await supabaseAdmin
          .from("topup_orders")
          .update({ status: nextStatus, updated_at: new Date().toISOString() })
          .eq("id", order.id)
          .in("status", PENDING_STATUSES);
        if (statusError) throw new Error(`No se pudo actualizar el estado: ${statusError.message}`);
        stillPending += 1;
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error("Error reconciliando orden FazerCards:", order.id, message);
      failures.push({ orderId: order.id, message });
    }
  }

  return NextResponse.json({
    ok: failures.length === 0,
    checked,
    completed,
    refunded,
    stillPending,
    missingSupplierId,
    failures,
  });
}
