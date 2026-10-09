import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const FAZER_WEBHOOK_SECRET = process.env.FAZER_WEBHOOK_SECRET!;

const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);

export const dynamic = "force-dynamic";

/**
 * =========================================================
 * NORMALIZADORES
 * =========================================================
 */
function normalize(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function toId(value: unknown): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

/**
 * =========================================================
 * VERIFICAR FIRMA DE FAZERCARDS
 * =========================================================
 */
function verifySignature(rawBody: string, signature: string): boolean {
  if (!FAZER_WEBHOOK_SECRET || !signature) return false;

  const expected =
    "sha256=" +
    crypto
      .createHmac("sha256", FAZER_WEBHOOK_SECRET)
      .update(rawBody)
      .digest("hex");

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature.trim(), "utf8");

  if (a.length !== b.length) return false;

  return crypto.timingSafeEqual(a, b);
}

/**
 * =========================================================
 * OBTENER VALORES DE OBJETOS ANIDADOS
 *
 * Free Fire LATAM puede venir dentro de:
 * data
 * result
 * response
 * order
 * data.order
 * result.order
 * etc.
 * =========================================================
 */
function getContainers(payload: any): any[] {
  const containers: any[] = [];
  const queue: any[] = [payload];
  const seen = new Set<any>();

  while (queue.length > 0 && containers.length < 100) {
    const current = queue.shift();

    if (!current || typeof current !== "object") continue;
    if (seen.has(current)) continue;

    seen.add(current);
    containers.push(current);

    if (Array.isArray(current)) {
      for (const item of current) {
        if (item && typeof item === "object") queue.push(item);
      }
      continue;
    }

    for (const value of Object.values(current)) {
      if (value && typeof value === "object") {
        queue.push(value);
      }
    }
  }

  return containers;
}

/**
 * =========================================================
 * EXTRAER ID DE ORDEN DEL PROVEEDOR
 *
 * Se buscan primero nombres específicos de orden.
 * NO se usa cualquier "id" como primera opción para evitar
 * confundir user_id, product_id, event_id, etc.
 * =========================================================
 */
function extractOrderIdCandidates(payload: any): string[] {
  const keys = [
    "supplier_order_id",
    "supplierOrderId",
    "supplier_order_number",
    "supplierOrderNumber",
    "order_id",
    "orderId",
    "order_number",
    "orderNumber",
    "external_order_id",
    "externalOrderId",
    "reference",
    "order_reference",
    "orderReference",
  ];

  const result: string[] = [];
  const containers = getContainers(payload);

  for (const container of containers) {
    for (const key of keys) {
      const value = toId(container?.[key]);
      if (value && !result.includes(value)) result.push(value);
    }
  }

  for (const container of containers) {
    const hasOrderContext =
      container?.order ||
      container?.order_status ||
      container?.orderStatus ||
      container?.supplier_status ||
      container?.supplierStatus ||
      container?.status ||
      container?.state;

    if (hasOrderContext) {
      const value = toId(container?.id);
      if (value && !result.includes(value)) result.push(value);
    }
  }

  return result;
}

function extractSupplierOrderId(payload: any): string {
  return extractOrderIdCandidates(payload)[0] || "";
}

/**
 * =========================================================
 * EXTRAER STATUS
 * =========================================================
 */
function extractSupplierStatus(payload: any): string {
  const priorityKeys = [
    "supplier_status",
    "supplierStatus",
    "order_status",
    "orderStatus",
    "status",
    "state",
  ];

  const containers = getContainers(payload);

  // Prioridad absoluta a señales explícitas de rechazo/fallo.
  const rejectionKeys = [
    "supplier_status",
    "supplierStatus",
    "order_status",
    "orderStatus",
    "status",
    "state",
    "result",
    "error",
    "error_code",
    "errorCode",
    "reason",
    "message",
  ];

  const rejectionWords = [
    "rejected",
    "reject",
    "declined",
    "decline",
    "denied",
    "deny",
    "failed",
    "failure",
    "failed_order",
    "order_failed",
    "refused",
    "refuse",
    "cancelled",
    "canceled",
    "error",
  ];

  for (const container of containers) {
    for (const key of rejectionKeys) {
      const value = normalize(container?.[key]);
      if (!value) continue;

      for (const word of rejectionWords) {
        if (value === word || value.includes(word)) {
          return word === "cancelled" || word === "canceled"
            ? "cancelled"
            : "failed";
        }
      }
    }
  }

  for (const container of containers) {
    if (container?.success === false) return "failed";
    if (container?.success === true) return "success";

    for (const key of priorityKeys) {
      const value = normalize(container?.[key]);
      if (value) return value;
    }
  }

  return "";
}

function isFailureSignal(payload: any, currentStatus = ""): boolean {
  const failureWords = [
    "rejected", "reject", "declined", "decline", "denied", "deny",
    "failed", "failure", "failed_order", "order_failed",
    "refused", "refuse", "error", "unsuccessful", "not_completed",
    "payment_failed", "topup_failed", "order_rejected", "order_declined",
  ];

  const failureKeys = [
    "supplier_status", "supplierStatus", "order_status", "orderStatus",
    "status", "state", "result_status", "resultStatus", "success",
    "error", "error_code", "errorCode", "error_message", "errorMessage",
    "reason", "failure_reason", "failureReason", "message",
  ];

  if (failureWords.some((word) => currentStatus === word || currentStatus.includes(word))) {
    return true;
  }

  for (const container of getContainers(payload)) {
    for (const key of failureKeys) {
      const value = container?.[key];
      if (typeof value === "boolean") {
        if (key === "success" && value === false) return true;
        continue;
      }
      const text = normalize(value);
      if (!text) continue;
      if (failureWords.some((word) => text === word || text.includes(word))) {
        return true;
      }
    }
  }

  return false;
}

function isCancellationSignal(payload: any, currentStatus = ""): boolean {
  if (currentStatus === "cancelled" || currentStatus === "canceled" || currentStatus.includes("cancelled") || currentStatus.includes("canceled")) {
    return true;
  }

  const cancellationWords = ["cancelled", "canceled", "cancel", "order_cancelled", "order_canceled"];
  const keys = ["supplier_status", "supplierStatus", "order_status", "orderStatus", "status", "state", "event", "type", "reason", "message"];

  for (const container of getContainers(payload)) {
    for (const key of keys) {
      const text = normalize(container?.[key]);
      if (text && cancellationWords.some((word) => text === word || text.includes(word))) {
        return true;
      }
    }
  }

  return false;
}

/**
 * =========================================================
 * EXTRAER EVENTO
 * =========================================================
 */
function extractEvent(payload: any): string {
  const keys = [
    "event",
    "type",
    "event_type",
    "eventType",
    "webhook_event",
    "webhookEvent",
  ];

  for (const container of getContainers(payload)) {
    for (const key of keys) {
      const value = normalize(container?.[key]);
      if (value) return value;
    }
  }

  return "";
}

/**
 * =========================================================
 * NORMALIZAR EVENTO
 * =========================================================
 */
function statusFromEvent(event: string): string {
  const e = normalize(event);

  if (
    e === "order.confirmed" ||
    e === "order.confirm" ||
    e === "confirmed" ||
    e === "confirm"
  ) {
    return "confirmed";
  }

  if (
    e === "order.completed" ||
    e === "order.complete" ||
    e === "order.success" ||
    e === "order.successful" ||
    e === "order.delivered" ||
    e === "completed" ||
    e === "complete" ||
    e === "success" ||
    e === "successful" ||
    e === "delivered"
  ) {
    return "completed";
  }

  if (
    e === "order.failed" ||
    e === "order.failure" ||
    e === "order.rejected" ||
    e === "order.declined" ||
    e === "order.denied" ||
    e === "order.refused" ||
    e === "failed" ||
    e === "failure" ||
    e === "rejected" ||
    e === "declined" ||
    e === "denied" ||
    e === "refused" ||
    e === "error"
  ) {
    return "failed";
  }

  if (
    e === "order.cancelled" ||
    e === "order.canceled" ||
    e === "cancelled" ||
    e === "canceled"
  ) {
    return "cancelled";
  }

  if (
    e === "order.refunded" ||
    e === "order.refund" ||
    e === "refunded" ||
    e === "refund"
  ) {
    return "refunded";
  }

  if (
    e === "order.processing" ||
    e === "order.in_progress" ||
    e === "order.in-progress" ||
    e === "processing" ||
    e === "in_progress" ||
    e === "in-progress"
  ) {
    return "processing";
  }

  if (
    e === "order.created" ||
    e === "created" ||
    e === "pending" ||
    e === "queued" ||
    e === "waiting"
  ) {
    return "pending";
  }

  return "";
}

/**
 * =========================================================
 * ESTADO INTERNO
 * =========================================================
 */
function normalizeSupplierState(value: string): string {
  const s = normalize(value).replace(/\s+/g, "_");

  const failed = [
    "failed", "failure", "rejected", "reject", "declined",
    "decline", "denied", "deny", "refused", "refuse",
    "error", "unsuccessful", "not_completed", "payment_failed",
    "topup_failed", "order_failed", "order_rejected",
    "order_declined", "order_denied", "order_refused",
    "provider_rejected", "provider_failed", "failed_order",
  ];

  if (failed.some((x) => s === x || s.includes(x))) return "failed";

  const cancelled = ["cancelled", "canceled", "cancel", "order_cancelled", "order_canceled"];
  if (cancelled.some((x) => s === x || s.includes(x))) return "cancelled";

  const refunded = ["refunded", "refund", "reversed", "reversal"];
  if (refunded.some((x) => s === x || s.includes(x))) return "refunded";

  const completed = ["completed", "complete", "success", "successful", "succeeded", "done", "delivered"];
  if (completed.some((x) => s === x || s.includes(x))) return "completed";

  const confirmed = ["confirmed", "confirm", "confirmado"];
  if (confirmed.some((x) => s === x || s.includes(x))) return "confirmed";

  const pending = ["pending", "processing", "in_progress", "in-progress", "created", "waiting", "queued", "accepted", "submitted", "received"];
  if (pending.some((x) => s === x || s.includes(x))) return "pending";

  return s;
}

function getInternalStatus(status: string): string {
  const normalized = normalize(status);

  if (
    normalized === "pending" ||
    normalized === "processing" ||
    normalized === "in_progress" ||
    normalized === "in-progress" ||
    normalized === "queued" ||
    normalized === "created" ||
    normalized === "waiting"
  ) {
    return "PENDING";
  }

  return "PENDING";
}

/**
 * =========================================================
 * CREAR NOTIFICACIÓN
 * =========================================================
 */
async function createNotification(
  userId: string,
  title: string,
  message: string,
  sourceId: string
) {
  try {
    const { error } = await supabaseAdmin.rpc(
      "store_gaming_create_notification",
      {
        p_user_id: userId,
        p_title: title,
        p_message: message,
        p_type: "TOPUP",
        p_source_type: "TOPUP_ORDER",
        p_source_id: sourceId,
      }
    );

    if (error) {
      console.error("ERROR CREANDO NOTIFICACIÓN:", error);
    }
  } catch (error) {
    console.error("ERROR NOTIFICACIÓN:", error);
  }
}

/**
 * =========================================================
 * BUSCAR ORDEN
 *
 * Primero por supplier_order_id.
 * Si no existe, intentamos order_number si FazerCards
 * devuelve ese campo y nuestra tabla lo tiene.
 * =========================================================
 */
async function findInternalOrder(payload: any) {
  const candidates = extractOrderIdCandidates(payload);

  console.log("ORDER ID CANDIDATES:", candidates);

  for (const candidate of candidates) {
    const bySupplier = await supabaseAdmin
      .from("topup_orders")
      .select("*")
      .eq("supplier_order_id", candidate)
      .maybeSingle();

    if (bySupplier.error) {
      console.error("ERROR BUSCANDO supplier_order_id:", bySupplier.error);
      return { data: null, error: bySupplier.error, matchedId: "" };
    }

    if (bySupplier.data) {
      return { data: bySupplier.data, error: null, matchedId: candidate };
    }
  }

  for (const candidate of candidates) {
    const byInternalId = await supabaseAdmin
      .from("topup_orders")
      .select("*")
      .eq("id", candidate)
      .maybeSingle();

    if (byInternalId.error) {
      console.error("ERROR BUSCANDO id interno:", byInternalId.error);
      return { data: null, error: byInternalId.error, matchedId: "" };
    }

    if (byInternalId.data) {
      return { data: byInternalId.data, error: null, matchedId: candidate };
    }
  }

  // Respaldo importante: la creación puede haber guardado el ID del proveedor
  // dentro de supplier_response, aunque supplier_order_id haya quedado NULL.
  // En ese caso, el webhook debe poder encontrar la orden y completar la columna.
  for (const candidate of candidates) {
    const paths = [
      "supplier_response->order->>id",
      "supplier_response->data->order->>id",
      "supplier_response->result->order->>id",
      "supplier_response->response->order->>id",
      "supplier_response->data->>order_id",
      "supplier_response->>order_id",
    ];

    for (const path of paths) {
      const byStoredResponse = await supabaseAdmin
        .from("topup_orders")
        .select("*")
        .eq(path, candidate)
        .maybeSingle();

      if (byStoredResponse.error) {
        // Algunos JSON paths no existirán en todos los registros. Registramos
        // el error y seguimos con los demás formatos antes de abortar.
        console.error(
          "ERROR BUSCANDO ID EN supplier_response:",
          path,
          byStoredResponse.error
        );
        continue;
      }

      if (byStoredResponse.data) {
        return {
          data: byStoredResponse.data,
          error: null,
          matchedId: candidate,
        };
      }
    }
  }

  return { data: null, error: null, matchedId: "" };
}

/**
 * =========================================================
 * WEBHOOK POST
 * =========================================================
 */
export async function POST(request: NextRequest) {
  try {
    // -------------------------------------------------------
    // 1. BODY ORIGINAL
    // -------------------------------------------------------
    const rawBody = await request.text();

    // -------------------------------------------------------
    // 2. FIRMA
    // -------------------------------------------------------
    const signature =
      request.headers.get("x-webhook-signature") ||
      request.headers.get("x-fazercards-signature") ||
      request.headers.get("x-signature") ||
      "";

    if (!verifySignature(rawBody, signature)) {
      console.error("FAZERCARDS WEBHOOK: FIRMA INVÁLIDA");

      return new NextResponse("Invalid signature", {
        status: 401,
      });
    }

    // -------------------------------------------------------
    // 3. JSON
    // -------------------------------------------------------
    let payload: any;

    try {
      payload = JSON.parse(rawBody);
    } catch (error) {
      console.error("FAZERCARDS WEBHOOK: JSON INVÁLIDO", error);

      return new NextResponse("Invalid JSON", {
        status: 400,
      });
    }

    // -------------------------------------------------------
    // 4. EXTRAER DATOS
    // -------------------------------------------------------
    const event = extractEvent(payload);

    const eventStatus = statusFromEvent(event);

    const orderIdCandidates = extractOrderIdCandidates(payload);
    const supplierOrderId = extractSupplierOrderId(payload);

    let status = extractSupplierStatus(payload);

    // NO dejamos que un evento genérico (por ejemplo order.created)
    // tape un rechazo explícito que venga en status/reason/error/message.
    // Un rechazo siempre tiene prioridad porque debe activar el reembolso.
    const normalizedExtractedStatus = normalize(status);
    const explicitFailure = isFailureSignal(payload, normalizedExtractedStatus);
    const explicitCancellation = isCancellationSignal(payload, normalizedExtractedStatus);

    if (explicitFailure) {
      status = "failed";
    } else if (explicitCancellation) {
      status = "cancelled";
    } else if (eventStatus) {
      status = eventStatus;
    }

    console.log("========== FAZERCARDS WEBHOOK ==========");
    console.log("EVENT:", event);
    console.log("EVENT STATUS:", eventStatus);
    console.log("SUPPLIER ORDER ID:", supplierOrderId);
    console.log("SUPPLIER STATUS:", status);
    console.log("PAYLOAD:", JSON.stringify(payload));

    // -------------------------------------------------------
    // 5. SIN ID
    // -------------------------------------------------------
    if (orderIdCandidates.length === 0) {
      console.error(
        "FAZERCARDS WEBHOOK: NO SE ENCONTRÓ NINGÚN ID DE ORDEN"
      );

      return NextResponse.json({
        ok: true,
        action: "IGNORED",
        reason: "ORDER_ID_NOT_FOUND",
        event,
        status,
      });
    }

    // -------------------------------------------------------
    // 6. BUSCAR ORDEN INTERNA
    // -------------------------------------------------------
    const {
      data: internalOrder,
      error: orderError,
      matchedId,
    } = await findInternalOrder(payload);

    if (orderError) {
      console.error(
        "ERROR BUSCANDO ORDEN:",
        orderError
      );

      return new NextResponse("Database error", {
        status: 500,
      });
    }

    if (!internalOrder) {
      console.error(
        "ORDEN INTERNA NO ENCONTRADA:",
        supplierOrderId
      );

      // IMPORTANTE:
      // Respondemos 200 para que FazerCards no reintente
      // indefinidamente un evento que no podemos asociar.
      return NextResponse.json({
        ok: true,
        action: "IGNORED",
        reason: "ORDER_NOT_FOUND",
        supplierOrderId,
        event,
        status,
      });
    }

    // Only use an actual supplier ID for supplier_order_id/RPC calls.
    // matchedId can be our internal UUID when the webhook payload references it.
    const effectiveSupplierOrderId =
      internalOrder.supplier_order_id || supplierOrderId || "";

    console.log(
      "ORDEN INTERNA ENCONTRADA:",
      {
        internalOrderId: internalOrder.id,
        internalStatus: internalOrder.status,
        supplierOrderId: effectiveSupplierOrderId,
        matchedId,
        categoryId: internalOrder.category_id,
        game: internalOrder.game,
        offerId: internalOrder.offer_id,
        playerId: internalOrder.player_id,
      }
    );

    if (!internalOrder.supplier_order_id && supplierOrderId) {
      const { error: supplierIdError } = await supabaseAdmin
        .from("topup_orders")
        .update({
          supplier_order_id: supplierOrderId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", internalOrder.id);

      if (supplierIdError) {
        console.error("ERROR GUARDANDO SUPPLIER ORDER ID:", supplierIdError);
        return new NextResponse("Database error", { status: 500 });
      }
    }

    // -------------------------------------------------------
    // 7. GUARDAR PAYLOAD COMPLETO
    // -------------------------------------------------------
    const { error: responseError } =
      await supabaseAdmin
        .from("topup_orders")
        .update({
          supplier_response: payload,
          updated_at: new Date().toISOString(),
        })
        .eq("id", internalOrder.id);

    if (responseError) {
      console.error(
        "ERROR GUARDANDO WEBHOOK:",
        responseError
      );

      return new NextResponse("Database error", {
        status: 500,
      });
    }

    // -------------------------------------------------------
    // 8. NORMALIZAR STATUS
    // -------------------------------------------------------
    status = normalizeSupplierState(status || eventStatus || "pending");

    const currentStatus = normalize(
      internalOrder.status
    ).toUpperCase();

    // -------------------------------------------------------
    // 9. ESTADOS FINALES
    // -------------------------------------------------------
    if (currentStatus === "COMPLETED") {
      return NextResponse.json({
        ok: true,
        action: "ALREADY_COMPLETED",
        orderId: internalOrder.id,
        supplierOrderId: effectiveSupplierOrderId,
        status: "COMPLETED",
      });
    }

    if (currentStatus === "REFUNDED") {
      return NextResponse.json({
        ok: true,
        action: "ALREADY_REFUNDED",
        orderId: internalOrder.id,
        supplierOrderId: effectiveSupplierOrderId,
        status: "REFUNDED",
      });
    }

    if (currentStatus === "CANCELLED") {
      // A cancelled row without refunded_at may be left over from a failed
      // refund attempt. Let an explicit failed/refund/cancel provider event
      // retry the idempotent SQL refund function.
      const canRetryRefund = ["failed", "refunded", "cancelled"].includes(status);
      if (internalOrder.refunded_at || !canRetryRefund) {
        return NextResponse.json({
          ok: true,
          action: "ALREADY_CANCELLED",
          orderId: internalOrder.id,
          supplierOrderId: effectiveSupplierOrderId,
          status: "CANCELLED",
        });
      }
    }

    // -------------------------------------------------------
    // 10. CONFIRMED
    // -------------------------------------------------------
    if (
      status === "confirmed" ||
      status === "confirmado" ||
      status === "confirm"
    ) {
      const { error } =
        await supabaseAdmin.rpc(
          "confirm_topup_order",
          {
            p_supplier_order_id:
              effectiveSupplierOrderId,
          }
        );

      if (error) {
        console.error(
          "ERROR CONFIRMANDO TOPUP:",
          error
        );

        return new NextResponse(
          "Database error",
          { status: 500 }
        );
      }

      await createNotification(
        internalOrder.user_id,
        "✅ Recarga confirmada",
        `Tu pedido ${internalOrder.id} fue confirmado por el proveedor.`,
        internalOrder.id
      );

      return NextResponse.json({
        ok: true,
        action: "CONFIRMED",
        orderId: internalOrder.id,
        supplierOrderId: effectiveSupplierOrderId,
        status: "CONFIRMED",
      });
    }

    // -------------------------------------------------------
    // 11. COMPLETED
    // -------------------------------------------------------
    if (
      status === "completed" ||
      status === "complete" ||
      status === "success" ||
      status === "successful" ||
      status === "delivered" ||
      status === "done" ||
      status.includes("completed") ||
      status.includes("success")
    ) {
      const { error } =
        await supabaseAdmin.rpc(
          "complete_topup_order",
          {
            p_supplier_order_id:
              effectiveSupplierOrderId,
          }
        );

      if (error) {
        console.error(
          "ERROR COMPLETANDO TOPUP:",
          error
        );

        return new NextResponse(
          "Database error",
          { status: 500 }
        );
      }

      await createNotification(
        internalOrder.user_id,
        "🎮 Recarga completada",
        `Tu pedido ${internalOrder.id} fue completado correctamente.`,
        internalOrder.id
      );

      return NextResponse.json({
        ok: true,
        action: "COMPLETED",
        orderId: internalOrder.id,
        supplierOrderId: effectiveSupplierOrderId,
        status: "COMPLETED",
      });
    }

    // -------------------------------------------------------
    // 12. FAILED / REJECTED / REFUNDED
    // -------------------------------------------------------
    if (status === "failed" || status === "refunded") {
      const { data, error } =
        await supabaseAdmin.rpc(
          "store_gaming_refund_balance",
          {
            p_order_id: internalOrder.id,
          }
        );

      if (error) {
        console.error(
          "ERROR REEMBOLSANDO TOPUP:",
          error
        );

        return new NextResponse(
          "Database error",
          { status: 500 }
        );
      }

      await createNotification(
        internalOrder.user_id,
        "💰 Saldo reembolsado",
        `El pedido ${internalOrder.id} fue rechazado por el proveedor y el saldo utilizado fue devuelto a tu billetera.`,
        internalOrder.id
      );

      return NextResponse.json({
        ok: true,
        action: "REFUNDED",
        orderId: internalOrder.id,
        supplierOrderId: effectiveSupplierOrderId,
        status: "REFUNDED",
        refundedAmount: internalOrder.retail_price,
        result: data,
      });
    }

    // -------------------------------------------------------
    // 13. CANCELLED
    // -------------------------------------------------------
    if (status === "cancelled") {
      const { data, error } =
        await supabaseAdmin.rpc(
          "store_gaming_refund_balance",
          {
            p_order_id: internalOrder.id,
          }
        );

      if (error) {
        console.error(
          "ERROR REEMBOLSANDO CANCELACIÓN:",
          error
        );

        return new NextResponse(
          "Database error",
          { status: 500 }
        );
      }

      const { error: cancelStatusError } = await supabaseAdmin
        .from("topup_orders")
        .update({
          status: "CANCELLED",
          updated_at: new Date().toISOString(),
        })
        .eq("id", internalOrder.id);

      if (cancelStatusError) {
        console.error("ERROR ACTUALIZANDO ESTADO CANCELLED:", cancelStatusError);
        return new NextResponse("Database error", { status: 500 });
      }

      await createNotification(
        internalOrder.user_id,
        "❌ Pedido cancelado",
        `El pedido ${internalOrder.id} fue cancelado y el saldo fue devuelto a tu billetera.`,
        internalOrder.id
      );

      return NextResponse.json({
        ok: true,
        action: "CANCELLED",
        orderId: internalOrder.id,
        supplierOrderId: effectiveSupplierOrderId,
        status: "CANCELLED",
        refundedAmount: internalOrder.retail_price,
        result: data,
      });
    }

    // -------------------------------------------------------
    // 14. PENDING / PROCESSING
    // -------------------------------------------------------
    const internalStatus =
      getInternalStatus(status);

    const { error: intermediateError } =
      await supabaseAdmin
        .from("topup_orders")
        .update({
          status: internalStatus,
          supplier_order_id:
            internalOrder.supplier_order_id ||
            supplierOrderId,
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", internalOrder.id);

    if (intermediateError) {
      console.error(
        "ERROR ACTUALIZANDO ESTADO:",
        intermediateError
      );

      return new NextResponse(
        "Database error",
        { status: 500 }
      );
    }

    console.log(
      "🔄 TOPUP ACTUALIZADO:",
      {
        internalOrderId: internalOrder.id,
        supplierOrderId,
        categoryId: internalOrder.category_id,
        game: internalOrder.game,
        supplierStatus: status,
        internalStatus,
      }
    );

    return NextResponse.json({
      ok: true,
      action: "UPDATED",
      orderId: internalOrder.id,
      supplierOrderId,
      status: internalStatus,
    });
  } catch (error) {
    console.error(
      "FAZERCARDS WEBHOOK ERROR:",
      error
    );

    return new NextResponse(
      "Internal server error",
      { status: 500 }
    );
  }
}
