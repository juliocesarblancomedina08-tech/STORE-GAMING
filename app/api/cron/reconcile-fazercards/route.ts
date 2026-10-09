import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);
const FAZER_API_BASE = process.env.FAZERCARDS_API_URL || "https://api.fzr.cards/api/v2";
const FAZER_API_KEY = process.env.FAZERCARDS_API_KEY;
const CRON_SECRET = process.env.CRON_SECRET;

function normalizeStatus(value: unknown): string {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, "_");
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

  const { data: orders, error } = await supabaseAdmin
    .from("topup_orders")
    .select("id, supplier_order_id, status")
    .in("status", ["SUPPLIER_PENDING", "PENDING", "PROCESSING", "CONFIRMED"])
    .not("supplier_order_id", "is", null)
    .order("updated_at", { ascending: true })
    .limit(50);

  if (error) {
    console.error("Error leyendo órdenes pendientes:", error);
    return NextResponse.json({ ok: false, error: "No se pudieron leer las órdenes." }, { status: 500 });
  }

  let checked = 0;
  let completed = 0;
  let refunded = 0;
  let stillPending = 0;
  const failures: Array<{ orderId: string; message: string }> = [];

  for (const order of orders ?? []) {
    const supplierId = String(order.supplier_order_id ?? "").trim();
    if (!supplierId) continue;

    try {
      const response = await fetch(`${FAZER_API_BASE}/orders/${encodeURIComponent(supplierId)}`, {
        method: "GET",
        headers: { "X-API-Key": FAZER_API_KEY, Accept: "application/json" },
        cache: "no-store",
      });
      const text = await response.text();
      let payload: any;
      try { payload = text ? JSON.parse(text) : {}; } catch { payload = { raw: text }; }

      if (!response.ok) {
        failures.push({ orderId: order.id, message: `FazerCards HTTP ${response.status}` });
        continue;
      }

      const providerOrder = payload?.order ?? payload?.data?.order ?? payload?.data ?? payload;
      const status = normalizeStatus(providerOrder?.status ?? payload?.status);
      const { error: saveError } = await supabaseAdmin
        .from("topup_orders")
        .update({ supplier_order_id: supplierId, supplier_response: payload, updated_at: new Date().toISOString() })
        .eq("id", order.id);
      if (saveError) throw new Error(`No se guardó la respuesta: ${saveError.message}`);

      checked += 1;
      if (["completed", "complete", "success", "successful", "succeeded", "delivered", "done"].includes(status)) {
        const { error: rpcError } = await supabaseAdmin.rpc("complete_topup_order", { p_supplier_order_id: supplierId });
        if (rpcError) throw new Error(`No se pudo completar: ${rpcError.message}`);
        completed += 1;
      } else if (["failed", "failure", "rejected", "declined", "denied", "error", "refund", "refunded", "cancelled", "canceled"].includes(status)) {
        const { error: rpcError } = await supabaseAdmin.rpc("store_gaming_refund_balance", { p_order_id: order.id });
        if (rpcError) throw new Error(`No se pudo reembolsar: ${rpcError.message}`);
        refunded += 1;
      } else {
        const nextStatus = ["confirmed", "accepted"].includes(status) ? "CONFIRMED" : "SUPPLIER_PENDING";
        const { error: statusError } = await supabaseAdmin
          .from("topup_orders")
          .update({ status: nextStatus, updated_at: new Date().toISOString() })
          .eq("id", order.id)
          .not("status", "in", "(COMPLETED,REFUNDED,CANCELLED)");
        if (statusError) throw new Error(`No se pudo actualizar el estado: ${statusError.message}`);
        stillPending += 1;
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error("Error reconciliando orden FazerCards:", order.id, message);
      failures.push({ orderId: order.id, message });
    }
  }

  return NextResponse.json({ ok: failures.length === 0, checked, completed, refunded, stillPending, failures });
}
