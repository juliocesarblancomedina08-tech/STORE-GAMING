// app/api/webhooks/fazercards/route.ts

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type JsonObject = Record<string, unknown>;

type FinalStatus =
  | "CREATED"
  | "PENDING"
  | "PROCESSING"
  | "CONFIRMED"
  | "COMPLETED"
  | "FAILED"
  | "REFUNDED"
  | "CANCELLED"
  | "UNKNOWN";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FAZER_WEBHOOK_SECRET = process.env.FAZER_WEBHOOK_SECRET;

function getSupabase() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Faltan variables de entorno de Supabase.");
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function isObject(value: unknown): value is JsonObject {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function normalize(value: unknown): string {
  if (typeof value !== "string" && typeof value !== "number") {
    return "";
  }

  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[\s.-]+/g, "_");
}

function getHeaderSignature(request: NextRequest): string | null {
  const names = [
    "x-webhook-signature",
    "x-fazercards-signature",
    "x-signature",
  ];

  for (const name of names) {
    const value = request.headers.get(name);

    if (value) {
      return value.trim();
    }
  }

  return null;
}

function verifySignature(
  rawBody: string,
  suppliedSignature: string | null
): boolean {
  if (!FAZER_WEBHOOK_SECRET || !suppliedSignature) {
    return false;
  }

  const signature = suppliedSignature.replace(/^sha256=/i, "");

  if (!/^[a-f0-9]{64}$/i.test(signature)) {
    return false;
  }

  const expected = crypto
    .createHmac("sha256", FAZER_WEBHOOK_SECRET)
    .update(rawBody, "utf8")
    .digest("hex");

  const expectedBuffer = Buffer.from(expected, "hex");
  const suppliedBuffer = Buffer.from(signature, "hex");

  if (expectedBuffer.length !== suppliedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, suppliedBuffer);
}

function getOrderObjects(payload: unknown): JsonObject[] {
  if (!isObject(payload)) {
    return [];
  }

  const result: JsonObject[] = [];
  const queue: JsonObject[] = [payload];
  const visited = new Set<JsonObject>();

  while (queue.length > 0 && result.length < 50) {
    const current = queue.shift()!;

    if (visited.has(current)) {
      continue;
    }

    visited.add(current);
    result.push(current);

    for (const key of [
      "data",
      "order",
      "result",
      "response",
      "payload",
    ]) {
      const child = current[key];

      if (isObject(child) && !visited.has(child)) {
        queue.push(child);
      }
    }
  }

  return result;
}

function getSupplierOrderId(
  objects: JsonObject[]
): string | null {
  const keys = [
    "supplier_order_id",
    "supplierOrderId",
    "external_order_id",
    "externalOrderId",
    "provider_order_id",
    "providerOrderId",
    "order_id",
    "orderId",
  ];

  for (const object of objects) {
    for (const key of keys) {
      const value = object[key];

      if (
        (typeof value === "string" ||
          typeof value === "number") &&
        String(value).trim()
      ) {
        return String(value).trim();
      }
    }
  }

  // A provider order ID such as ord-12345 may be in "id".
  for (const object of objects) {
    const value = object.id;

    if (
      (typeof value === "string" ||
        typeof value === "number") &&
      /^ord[-_]/i.test(String(value).trim())
    ) {
      return String(value).trim();
    }
  }

  return null;
}

function getExplicitStatus(
  objects: JsonObject[]
): string {
  const keys = [
    "status",
    "order_status",
    "orderStatus",
    "state",
  ];

  // First inspect the order-specific objects, then the rest.
  const orderedObjects = [
    ...objects.filter(
      (object) =>
        "order" in object ||
        "order_id" in object ||
        "orderId" in object ||
        "supplier_order_id" in object ||
        "supplierOrderId" in object
    ),
    ...objects,
  ];

  const seen = new Set<JsonObject>();

  for (const object of orderedObjects) {
    if (seen.has(object)) {
      continue;
    }

    seen.add(object);

    for (const key of keys) {
      const value = object[key];

      if (typeof value === "string" && value.trim()) {
        return normalize(value);
      }
    }
  }

  return "";
}

function getEvent(objects: JsonObject[]): string {
  const keys = [
    "event",
    "event_type",
    "eventType",
    "type",
    "topic",
  ];

  for (const object of objects) {
    for (const key of keys) {
      const value = object[key];

      if (typeof value !== "string" || !value.trim()) {
        continue;
      }

      const event = normalize(value);

      // Avoid treating arbitrary message text as an event.
      if (
        event.startsWith("order_") ||
        event.startsWith("order.")
      ) {
        return event;
      }
    }
  }

  return "";
}

function statusFromValue(value: string): FinalStatus {
  switch (value) {
    case "created":
    case "new":
      return "CREATED";

    case "pending":
    case "queued":
    case "waiting":
    case "awaiting":
    case "supplier_pending":
      return "PENDING";

    case "processing":
    case "in_progress":
    case "inprogress":
      return "PROCESSING";

    case "confirmed":
    case "accepted":
    case "approved":
      return "CONFIRMED";

    case "completed":
    case "complete":
    case "success":
    case "successful":
    case "delivered":
    case "done":
      return "COMPLETED";

    case "failed":
    case "failure":
    case "error":
    case "rejected":
    case "declined":
      return "FAILED";

    case "refunded":
    case "refund":
      return "REFUNDED";

    case "cancelled":
    case "canceled":
      return "CANCELLED";

    default:
      return "UNKNOWN";
  }
}

function statusFromEvent(event: string): FinalStatus {
  const eventStatus = event
    .replace(/^order_/, "")
    .replace(/^order\./, "");

  return statusFromValue(eventStatus);
}

function getFinalStatus(
  explicitStatus: string,
  event: string
): FinalStatus {
  const status = statusFromValue(explicitStatus);

  // A recognized explicit provider status takes priority.
  if (status !== "UNKNOWN") {
    return status;
  }

  // If no recognized status exists, use a recognized order event.
  return statusFromEvent(event);
}

function internalStatus(
  status: FinalStatus
): string | null {
  switch (status) {
    case "CREATED":
    case "PENDING":
      return "SUPPLIER_PENDING";

    case "PROCESSING":
      return "PROCESSING";

    case "CONFIRMED":
      return "CONFIRMED";

    case "COMPLETED":
      return "COMPLETED";

    case "FAILED":
      return "FAILED";

    case "REFUNDED":
      return "REFUNDED";

    case "CANCELLED":
      return "CANCELLED";

    default:
      return null;
  }
}

async function createNotification(
  supabase: ReturnType<typeof getSupabase>,
  userId: string,
  title: string,
  message: string,
  orderId: string
) {
  try {
    const { error } = await supabase.rpc(
      "store_gaming_create_notification",
      {
        p_user_id: userId,
        p_title: title,
        p_message: message,
        p_order_id: orderId,
      }
    );

    if (error) {
      console.error(
        "No se pudo crear la notificación:",
        error.message
      );
    }
  } catch (error) {
    console.error(
      "Error creando notificación:",
      error instanceof Error ? error.message : "Error desconocido"
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!FAZER_WEBHOOK_SECRET) {
      console.error(
        "No está configurada FAZER_WEBHOOK_SECRET."
      );

      return NextResponse.json(
        { ok: false, error: "Webhook no configurado." },
        { status: 500 }
      );
    }

    const rawBody = await request.text();
    const suppliedSignature = getHeaderSignature(request);

    if (!verifySignature(rawBody, suppliedSignature)) {
      return NextResponse.json(
        { ok: false, error: "Firma inválida." },
        { status: 401 }
      );
    }

    let payload: unknown;

    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { ok: false, error: "JSON inválido." },
        { status: 400 }
      );
    }

    if (!isObject(payload)) {
      return NextResponse.json(
        { ok: false, error: "Formato de evento inválido." },
        { status: 400 }
      );
    }

    const objects = getOrderObjects(payload);
    const supplierOrderId = getSupplierOrderId(objects);

    if (!supplierOrderId) {
      return NextResponse.json(
        {
          ok: false,
          error: "No se encontró el ID del pedido del proveedor.",
        },
        { status: 400 }
      );
    }

    const providerStatus = getExplicitStatus(objects);
    const event = getEvent(objects);
    const finalStatus = getFinalStatus(providerStatus, event);

    if (finalStatus === "UNKNOWN") {
      // Do not change order status based on an unknown event.
      return NextResponse.json({
        ok: true,
        action: "IGNORED_UNKNOWN_STATUS",
        supplierOrderId,
      });
    }

    const supabase = getSupabase();

    const { data: order, error: orderError } = await supabase
      .from("topup_orders")
      .select(
        "id, user_id, status, supplier_order_id, supplier_response, retail_price"
      )
      .eq("supplier_order_id", supplierOrderId)
      .maybeSingle();

    if (orderError) {
      console.error(
        "Error buscando pedido:",
        orderError.message
      );

      return NextResponse.json(
        { ok: false, error: "No se pudo consultar el pedido." },
        { status: 500 }
      );
    }

    if (!order) {
      // Return an error so the provider can retry if it supports retries.
      return NextResponse.json(
        {
          ok: false,
          error: "Pedido no encontrado.",
          supplierOrderId,
        },
        { status: 404 }
      );
    }

    const previousStatus = String(order.status ?? "")
      .trim()
      .toUpperCase();

    // Store the latest webhook payload for later diagnosis.
    const oldResponse = isObject(order.supplier_response)
      ? order.supplier_response
      : {};

    const { error: saveResponseError } = await supabase
      .from("topup_orders")
      .update({
        supplier_response: {
          ...oldResponse,
          last_webhook: payload,
          last_webhook_received_at: new Date().toISOString(),
          last_webhook_event: event || null,
          last_webhook_status: providerStatus || null,
        },
      })
      .eq("id", order.id);

    if (saveResponseError) {
      console.error(
        "No se pudo guardar el webhook:",
        saveResponseError.message
      );

      return NextResponse.json(
        { ok: false, error: "No se pudo guardar el evento." },
        { status: 500 }
      );
    }

    // Do not downgrade an order already completed or refunded.
    if (
      previousStatus === "COMPLETED" ||
      previousStatus === "REFUNDED"
    ) {
      return NextResponse.json({
        ok: true,
        action: "ALREADY_TERMINAL",
        status: previousStatus,
        supplierOrderId,
      });
    }

    // A cancellation event does not itself prove that the provider
    // refunded the money. Leave the balance untouched.
    if (finalStatus === "CANCELLED") {
      const { error } = await supabase
        .from("topup_orders")
        .update({ status: "CANCELLED" })
        .eq("id", order.id)
        .neq("status", "COMPLETED")
        .neq("status", "REFUNDED");

      if (error) {
        console.error(
          "Error actualizando cancelación:",
          error.message
        );

        return NextResponse.json(
          { ok: false, error: "No se pudo actualizar la cancelación." },
          { status: 500 }
        );
      }

      await createNotification(
        supabase,
        order.user_id,
        "Pedido cancelado",
        "El proveedor notificó que el pedido fue cancelado. Si corresponde un reembolso, se verificará por separado.",
        order.id
      );

      return NextResponse.json({
        ok: true,
        action: "CANCELLED_NO_REFUND",
        supplierOrderId,
      });
    }

    if (finalStatus === "COMPLETED") {
      const { error: rpcError } = await supabase.rpc(
        "complete_topup_order",
        {
          p_supplier_order_id: supplierOrderId,
        }
      );

      if (rpcError) {
        console.error(
          "Error completando pedido:",
          rpcError.message
        );

        return NextResponse.json(
          { ok: false, error: "No se pudo completar el pedido." },
          { status: 500 }
        );
      }

      await createNotification(
        supabase,
        order.user_id,
        "Pedido completado",
        "El proveedor confirmó que tu recarga fue completada.",
        order.id
      );

      return NextResponse.json({
        ok: true,
        action: "COMPLETED",
        supplierOrderId,
      });
    }

    if (
      finalStatus === "FAILED" ||
      finalStatus === "REFUNDED"
    ) {
      const { error: refundError } = await supabase.rpc(
        "store_gaming_refund_balance",
        {
          p_order_id: order.id,
        }
      );

      if (refundError) {
        console.error(
          "Error procesando reembolso:",
          refundError.message
        );

        return NextResponse.json(
          { ok: false, error: "No se pudo procesar el reembolso." },
          { status: 500 }
        );
      }

      await createNotification(
        supabase,
        order.user_id,
        "Reembolso procesado",
        "El proveedor confirmó que el pedido no se completó. Revisa tu balance para verificar el reembolso.",
        order.id
      );

      return NextResponse.json({
        ok: true,
        action: "REFUNDED",
        supplierOrderId,
      });
    }

    const nextStatus = internalStatus(finalStatus);

    if (!nextStatus) {
      return NextResponse.json({
        ok: true,
        action: "IGNORED",
        supplierOrderId,
      });
    }

    const { error: updateError } = await supabase
      .from("topup_orders")
      .update({ status: nextStatus })
      .eq("id", order.id)
      .neq("status", "COMPLETED")
      .neq("status", "REFUNDED");

    if (updateError) {
      console.error(
        "Error actualizando estado:",
        updateError.message
      );

      return NextResponse.json(
        { ok: false, error: "No se pudo actualizar el estado." },
        { status: 500 }
      );
    }

    if (finalStatus === "CONFIRMED") {
      const { error: confirmError } = await supabase.rpc(
        "confirm_topup_order",
        {
          p_supplier_order_id: supplierOrderId,
        }
      );

      if (confirmError) {
        console.error(
          "Error confirmando pedido:",
          confirmError.message
        );

        return NextResponse.json(
          { ok: false, error: "No se pudo confirmar el pedido." },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      ok: true,
      action: "STATUS_UPDATED",
      supplierOrderId,
      status: nextStatus,
    });
  } catch (error) {
    console.error(
      "Error en webhook de FazerCards:",
      error instanceof Error ? error.message : "Error desconocido"
    );

    return NextResponse.json(
      { ok: false, error: "Error interno del webhook." },
      { status: 500 }
    );
  }
}
