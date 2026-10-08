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
function extractSupplierOrderId(payload: any): string {
  const priorityKeys = [
    "supplier_order_id",
    "supplierOrderId",
    "order_id",
    "orderId",
    "order_number",
    "orderNumber",
    "supplier_id",
    "supplierId",
  ];

  const containers = getContainers(payload);

  for (const container of containers) {
    for (const key of priorityKeys) {
      const value = toId(container?.[key]);
      if (value) return value;
    }
  }

  // Fallback: solamente aceptar "id" si el objeto parece ser una orden.
  for (const container of containers) {
    const hasOrderContext =
      container?.order ||
      container?.order_status ||
      container?.supplier_status ||
      container?.status;

    if (hasOrderContext) {
      const value = toId(container?.id);
      if (value) return value;
    }
  }

  return "";
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

  for (const container of containers) {
    for (const key of priorityKeys) {
      const value = normalize(container?.[key]);
      if (value) return value;
    }
  }

  return "";
}

/**
 * =========================================================
 * EXTRAER EVENTO
 * =========================================================
 */
function extractEvent(payload: any): string {
  const candidates = [
    payload?.event,
    payload?.type,
    payload?.event_type,
    payload?.eventType,
    payload?.data?.event,
    payload?.data?.type,
    payload?.result?.event,
    payload?.result?.type,
  ];

  for (const value of candidates) {
    const normalized = normalize(value);
    if (normalized) return normalized;
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
    e === "failed" ||
    e === "failure" ||
    e === "rejected" ||
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
async function findInternalOrder(supplierOrderId: string, payload: any) {
  const { data, error } = await supabaseAdmin
    .from("topup_orders")
    .select("*")
    .eq("supplier_order_id", supplierOrderId)
    .maybeSingle();

  if (error) {
    return { data: null, error };
  }

  if (data) {
    return { data, error: null };
  }

  const orderNumberCandidates: string[] = [];
  const containers = getContainers(payload);

  for (const container of containers) {
    for (const key of ["order_number", "orderNumber"]) {
      const value = toId(container?.[key]);
      if (value) orderNumberCandidates.push(value);
    }
  }

  const uniqueOrderNumbers: string[] = [];

  for (const orderNumber of orderNumberCandidates) {
    if (!uniqueOrderNumbers.includes(orderNumber)) {
      uniqueOrderNumbers.push(orderNumber);
    }
  }

  for (const orderNumber of uniqueOrderNumbers) {
    const result = await supabaseAdmin
      .from("topup_orders")
      .select("*")
      .eq("id", orderNumber)
      .maybeSingle();

    if (!result.error && result.data) {
      return { data: result.data, error: null };
    }
  }

  return { data: null, error: null };
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

    const supplierOrderId =
      extractSupplierOrderId(payload);

    let status =
      extractSupplierStatus(payload);

    // Los eventos explícitos tienen prioridad.
    if (eventStatus) {
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
    if (!supplierOrderId) {
      console.error(
        "FAZERCARDS WEBHOOK: NO SE ENCONTRÓ SUPPLIER ORDER ID"
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
    } = await findInternalOrder(
      supplierOrderId,
      payload
    );

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

    console.log(
      "ORDEN INTERNA ENCONTRADA:",
      {
        internalOrderId: internalOrder.id,
        internalStatus: internalOrder.status,
        supplierOrderId: internalOrder.supplier_order_id,
        categoryId: internalOrder.category_id,
        game: internalOrder.game,
        offerId: internalOrder.offer_id,
        playerId: internalOrder.player_id,
      }
    );

    // -------------------------------------------------------
    // 7. GUARDAR PAYLOAD COMPLETO
    // -------------------------------------------------------
    const { error: responseError } =
      await supabaseAdmin
        .from("topup_orders")
        .update({
          supplier_response: payload,
          supplier_status: status || null,
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
    status = normalize(status);

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
        supplierOrderId,
        status: "COMPLETED",
      });
    }

    if (currentStatus === "REFUNDED") {
      return NextResponse.json({
        ok: true,
        action: "ALREADY_REFUNDED",
        orderId: internalOrder.id,
        supplierOrderId,
        status: "REFUNDED",
      });
    }

    if (currentStatus === "CANCELLED") {
      return NextResponse.json({
        ok: true,
        action: "ALREADY_CANCELLED",
        orderId: internalOrder.id,
        supplierOrderId,
        status: "CANCELLED",
      });
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
              supplierOrderId,
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
        supplierOrderId,
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
      status === "done"
    ) {
      const { error } =
        await supabaseAdmin.rpc(
          "complete_topup_order",
          {
            p_supplier_order_id:
              supplierOrderId,
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
        supplierOrderId,
        status: "COMPLETED",
      });
    }

    // -------------------------------------------------------
    // 12. FAILED / REFUNDED
    // -------------------------------------------------------
    if (
      status === "refund" ||
      status === "refunded" ||
      status === "failed" ||
      status === "failure" ||
      status === "rejected" ||
      status === "error"
    ) {
      const { data, error } =
        await supabaseAdmin.rpc(
          "fail_topup_order",
          {
            p_supplier_order_id:
              supplierOrderId,
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
        `El pedido ${internalOrder.id} fue reembolsado. El saldo utilizado fue devuelto a tu billetera.`,
        internalOrder.id
      );

      return NextResponse.json({
        ok: true,
        action: "REFUNDED",
        orderId: internalOrder.id,
        supplierOrderId,
        status: "REFUNDED",
        refundedAmount:
          internalOrder.retail_price,
        result: data,
      });
    }

    // -------------------------------------------------------
    // 13. CANCELLED
    // -------------------------------------------------------
    if (
      status === "cancelled" ||
      status === "canceled"
    ) {
      const { data, error } =
        await supabaseAdmin.rpc(
          "cancel_topup_order",
          {
            p_supplier_order_id:
              supplierOrderId,
          }
        );

      if (error) {
        console.error(
          "ERROR CANCELANDO TOPUP:",
          error
        );

        return new NextResponse(
          "Database error",
          { status: 500 }
        );
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
        supplierOrderId,
        status: "CANCELLED",
        refundedAmount:
          internalOrder.retail_price,
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
          supplier_status:
            status || "pending",
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
