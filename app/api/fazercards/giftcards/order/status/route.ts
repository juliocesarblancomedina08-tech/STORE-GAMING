import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

const admin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;

type GiftCode = {
  code: string;
  [key: string]: unknown;
};

function fail(error: string, status: number) {
  return NextResponse.json(
    { success: false, error },
    { status }
  );
}

function extractOrder(payload: unknown): Record<string, unknown> {
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

function extractStatus(payload: unknown): string {
  const order = extractOrder(payload);

  return String(order.status ?? order.state ?? "").toLowerCase();
}

function extractCodes(payload: unknown): GiftCode[] {
  const order = extractOrder(payload);

  const items =
    order.cards ??
    order.gift_codes ??
    order.codes ??
    order.items;

  if (!Array.isArray(items)) return [];

  const codes: GiftCode[] = [];

  for (const item of items) {
    if (typeof item === "string" && item.trim()) {
      codes.push({ code: item.trim() });
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
        codes.push({ ...obj, code: code.trim() });
      }
    }
  }

  return codes;
}

function extractSupplierOrderId(
  payload: unknown
): string | null {
  const order = extractOrder(payload);

  const id =
    order.order_id ??
    order.id ??
    order.reference ??
    order.reference_id;

  return id === undefined || id === null ? null : String(id);
}

function completed(status: string) {
  return [
    "completed",
    "complete",
    "success",
    "successful",
    "delivered",
    "finished",
  ].includes(status);
}

function failed(status: string) {
  return [
    "failed",
    "failure",
    "rejected",
    "cancelled",
    "canceled",
    "declined",
  ].includes(status);
}

async function refundOrder(orderId: string) {
  if (!admin) throw new Error("SUPABASE_NOT_CONFIGURED");

  const { error } = await admin.rpc(
    "refund_gift_card_order",
    { p_order_id: orderId }
  );

  if (error) {
    console.error("Gift card refund error:", error.message);
    throw new Error("REFUND_FAILED");
  }
}

async function supplierGet(orderId: string) {
  const headers = new Headers({
    Accept: "application/json",
    "X-API-Key": FAZER_API_KEY,
  });

  if (FAZER_ORIGIN) {
    headers.set("Origin", FAZER_ORIGIN);
  }

  return fetch(
    `${FAZER_API_BASE}/orders/${encodeURIComponent(orderId)}`,
    {
      method: "GET",
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    }
  );
}

export async function GET(request: NextRequest) {
  if (!admin) {
    return fail("La configuración de Supabase está incompleta.", 500);
  }

  if (!FAZER_API_KEY) {
    return fail("Falta configurar FAZERCARDS_API_KEY.", 500);
  }

  const authorization = request.headers.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    return fail("Debes iniciar sesión para consultar tus órdenes.", 401);
  }

  const {
    data: authData,
    error: authError,
  } = await admin.auth.getUser(match[1].trim());

  if (authError || !authData.user) {
    return fail("Tu sesión no es válida.", 401);
  }

  const userId = authData.user.id;
  const orderId = request.nextUrl.searchParams.get("id")?.trim();

  if (!orderId) {
    return fail("Falta el identificador de la orden.", 400);
  }

  const { data: order, error: orderError } = await admin
    .from("gift_card_orders")
    .select(
      "id, user_id, game, offer_name, quantity, retail_price, status, supplier_order_id, gift_codes, created_at, completed_at, refunded_at"
    )
    .eq("id", orderId)
    .eq("user_id", userId)
    .maybeSingle();

  if (orderError) {
    console.error("Gift card order lookup error:", orderError.message);
    return fail("No pudimos consultar tu pedido.", 500);
  }

  if (!order) {
    return fail("No encontramos esa orden en tu cuenta.", 404);
  }

  // No consultar al proveedor si ya se conoce el resultado final.
  if (
    ["COMPLETED", "FAILED", "REFUNDED"].includes(order.status)
  ) {
    return NextResponse.json({
      success: true,
      order,
      refreshed: false,
    });
  }

  // Si no hay ID de proveedor, no inventar uno ni realizar otra compra.
  if (!order.supplier_order_id) {
    return NextResponse.json({
      success: true,
      order,
      refreshed: false,
      message:
        "El pedido todavía no tiene una referencia del proveedor y requiere verificación.",
    });
  }

  let supplierResponse: Response;

  try {
    supplierResponse = await supplierGet(order.supplier_order_id);
  } catch (error) {
    console.error("Supplier status request failed:", error);

    return NextResponse.json({
      success: true,
      order,
      refreshed: false,
      message:
        "No pudimos consultar al proveedor en este momento. El pedido conserva su estado actual.",
    });
  }

  if (!supplierResponse.ok) {
    // Un error HTTP al consultar el estado no demuestra que
    // la compra original haya fallado.
    console.error(
      "Supplier status HTTP error:",
      supplierResponse.status
    );

    return NextResponse.json({
      success: true,
      order,
      refreshed: false,
      message:
        "El proveedor no pudo confirmar el estado. No se ha realizado ningún reembolso automático.",
    });
  }

  let payload: unknown;

  try {
    payload = await supplierResponse.json();
  } catch {
    return NextResponse.json({
      success: true,
      order,
      refreshed: false,
      message: "La respuesta de estado del proveedor no es válida.",
    });
  }

  const status = extractStatus(payload);
  const codes = extractCodes(payload);
  const supplierOrderId =
    extractSupplierOrderId(payload) || order.supplier_order_id;

  const now = new Date().toISOString();

  if (codes.length > 0) {
    const { data: updated, error: updateError } = await admin
      .from("gift_card_orders")
      .update({
        status: "COMPLETED",
        supplier_order_id: supplierOrderId,
        supplier_response: payload,
        gift_codes: codes,
        completed_at: now,
        updated_at: now,
      })
      .eq("id", order.id)
      .eq("user_id", userId)
      .neq("status", "REFUNDED")
      .select(
        "id, user_id, game, offer_name, quantity, retail_price, status, supplier_order_id, gift_codes, created_at, completed_at, refunded_at"
      )
      .maybeSingle();

    if (updateError || !updated) {
      console.error(
        "Could not save supplier codes:",
        updateError?.message
      );

      return fail(
        "El proveedor entregó una respuesta, pero no pudimos guardar los códigos. Contacta con soporte.",
        500
      );
    }

    return NextResponse.json({
      success: true,
      refreshed: true,
      order: updated,
      message: "La compra está completada.",
    });
  }

  if (completed(status)) {
    // Un estado completado sin códigos no es suficiente para
    // marcar la orden como entregada.
    return NextResponse.json({
      success: true,
      order,
      refreshed: false,
      message:
        "El proveedor indica que el pedido terminó, pero todavía no recibimos los códigos. Se necesita verificar la respuesta.",
    });
  }

  if (failed(status)) {
    const { error: updateError } = await admin
      .from("gift_card_orders")
      .update({
        status: "FAILED",
        supplier_order_id: supplierOrderId,
        supplier_response: payload,
        failed_at: now,
        updated_at: now,
      })
      .eq("id", order.id)
      .eq("user_id", userId)
      .not("status", "in", '("COMPLETED","REFUNDED")');

    if (updateError) {
      console.error(
        "Could not mark gift card order failed:",
        updateError.message
      );

      return fail("No pudimos actualizar el estado del pedido.", 500);
    }

    try {
      await refundOrder(order.id);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error:
            "La orden parece fallida, pero no pudimos confirmar el reembolso. Contacta con soporte.",
          order_id: order.id,
        },
        { status: 500 }
      );
    }

    const { data: refundedOrder } = await admin
      .from("gift_card_orders")
      .select(
        "id, game, offer_name, quantity, retail_price, status, gift_codes, created_at, refunded_at"
      )
      .eq("id", order.id)
      .eq("user_id", userId)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      refreshed: true,
      order: refundedOrder,
      message: "El pedido falló y se procesó el reembolso.",
    });
  }

  // Los estados desconocidos o en proceso no provocan reembolsos.
  const { data: updated, error: updateError } = await admin
    .from("gift_card_orders")
    .update({
      status: "PROCESSING",
      supplier_order_id: supplierOrderId,
      supplier_response: payload,
      updated_at: now,
    })
    .eq("id", order.id)
    .eq("user_id", userId)
    .not("status", "in", '("COMPLETED","REFUNDED")')
    .select(
      "id, game, offer_name, quantity, retail_price, status, supplier_order_id, gift_codes, created_at, completed_at, refunded_at"
    )
    .maybeSingle();

  if (updateError) {
    console.error("Could not update processing order:", updateError.message);
    return fail("No pudimos actualizar el pedido.", 500);
  }

  return NextResponse.json({
    success: true,
    refreshed: true,
    order: updated || order,
    message: "El pedido sigue en proceso.",
  });
}
