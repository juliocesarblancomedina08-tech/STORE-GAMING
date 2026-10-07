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
 * EXTRAER ID DE LA ORDEN DE FAZERCARDS
 * =========================================================
 */
function extractSupplierOrderId(payload: any): string {
  const candidates = [
    payload?.data?.order_id,
    payload?.data?.orderId,
    payload?.data?.id,

    payload?.order_id,
    payload?.orderId,

    payload?.data?.order?.id,
    payload?.data?.order?.order_id,
    payload?.data?.order?.orderId,

    payload?.order?.id,
    payload?.order?.order_id,
    payload?.order?.orderId,

    payload?.id,
  ];

  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }

  return "";
}

/**
 * =========================================================
 * EXTRAER STATUS DE FAZERCARDS
 * =========================================================
 */
function extractSupplierStatus(payload: any): string {
  const candidates = [
    payload?.data?.status,
    payload?.status,

    payload?.data?.order?.status,
    payload?.order?.status,

    payload?.data?.order?.state,
    payload?.order?.state,

    payload?.data?.order_status,
    payload?.order_status,
  ];

  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) {
      return value.trim().toLowerCase();
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
  const value =
    payload?.event ??
    payload?.type ??
    payload?.data?.event ??
    "";

  return typeof value === "string"
    ? value.trim().toLowerCase()
    : "";
}

/**
 * =========================================================
 * ESTADOS INTERMEDIOS
 *
 * FazerCards puede mandar:
 *
 * processing
 * in_progress
 * queued
 * created
 * pending
 *
 * En STORE GAMING todos esos estados serán PENDING.
 *
 * CONFIRMED NO entra aquí porque tiene su propio bloque.
 * =========================================================
 */
function getInternalStatus(supplierStatus: string): string {
  const normalized = String(supplierStatus || "")
    .trim()
    .toLowerCase();

  if (
    normalized === "processing" ||
    normalized === "in_progress" ||
    normalized === "in-progress" ||
    normalized === "queued" ||
    normalized === "created" ||
    normalized === "waiting" ||
    normalized === "pending"
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
      console.error(
        "ERROR CREANDO NOTIFICACIÓN:",
        error
      );
    }
  } catch (error) {
    console.error(
      "ERROR NOTIFICACIÓN:",
      error
    );
  }
}

/**
 * =========================================================
 * WEBHOOK POST
 * =========================================================
 */
export async function POST(request: NextRequest) {
  try {
    /**
     * -------------------------------------------------------
     * LEER BODY ORIGINAL
     * -------------------------------------------------------
     */
    const rawBody = await request.text();

    /**
     * -------------------------------------------------------
     * OBTENER FIRMA
     * -------------------------------------------------------
     */
    const signature =
      request.headers.get("x-webhook-signature") ||
      request.headers.get("x-fazercards-signature") ||
      "";

    /**
     * -------------------------------------------------------
     * VALIDAR FIRMA
     * -------------------------------------------------------
     */
    if (!verifySignature(rawBody, signature)) {
      console.error(
        "FAZERCARDS WEBHOOK: FIRMA INVÁLIDA"
      );

      return new NextResponse(
        "Invalid signature",
        { status: 401 }
      );
    }

    /**
     * -------------------------------------------------------
     * PARSEAR JSON
     * -------------------------------------------------------
     */
    let payload: any;

    try {
      payload = JSON.parse(rawBody);
    } catch (error) {
      console.error(
        "FAZERCARDS WEBHOOK: JSON INVÁLIDO",
        error
      );

      return new NextResponse(
        "Invalid JSON",
        { status: 400 }
      );
    }

    /**
     * -------------------------------------------------------
     * EXTRAER INFORMACIÓN
     * -------------------------------------------------------
     */
    const event = extractEvent(payload);

    const supplierOrderId =
      extractSupplierOrderId(payload);

    let status =
      extractSupplierStatus(payload);

    console.log(
      "========== FAZERCARDS WEBHOOK =========="
    );

    console.log({
      event,
      supplierOrderId,
      status,
    });

    console.log(
      "PAYLOAD:",
      JSON.stringify(payload)
    );

    /**
     * -------------------------------------------------------
     * SI NO HAY ID, IGNORAR
     * -------------------------------------------------------
     */
    if (!supplierOrderId) {
      return NextResponse.json({
        ok: true,
        action: "IGNORED",
        reason: "ORDER_ID_NOT_FOUND",
      });
    }

    /**
     * -------------------------------------------------------
     * BUSCAR ORDEN INTERNA
     * -------------------------------------------------------
     */
    const {
      data: internalOrder,
      error: orderError,
    } = await supabaseAdmin
      .from("topup_orders")
      .select("*")
      .eq(
        "supplier_order_id",
        supplierOrderId
      )
      .maybeSingle();

    if (orderError) {
      console.error(
        "ERROR BUSCANDO ORDEN:",
        orderError
      );

      return new NextResponse(
        "Database error",
        { status: 500 }
      );
    }

    /**
     * -------------------------------------------------------
     * ORDEN NO ENCONTRADA
     * -------------------------------------------------------
     */
    if (!internalOrder) {
      console.error(
        "ORDEN INTERNA NO ENCONTRADA:",
        supplierOrderId
      );

      return NextResponse.json({
        ok: true,
        action: "IGNORED",
        reason: "ORDER_NOT_FOUND",
        supplierOrderId,
      });
    }

    /**
     * -------------------------------------------------------
     * GUARDAR RESPUESTA COMPLETA DE FAZERCARDS
     * -------------------------------------------------------
     */
    const {
      error: responseError,
    } = await supabaseAdmin
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

      return new NextResponse(
        "Database error",
        { status: 500 }
      );
    }

    /**
     * =======================================================
     * EVENTOS SOPORTADOS
     * =======================================================
     */
    const knownStatuses = new Set([
      "pending",
      "processing",
      "in_progress",
      "in-progress",
      "queued",
      "created",
      "waiting",
      "confirmed",
      "confirmado",
      "completed",
      "complete",
      "success",
      "successful",
      "delivered",
      "done",
      "failed",
      "failure",
      "rejected",
      "error",
      "refund",
      "refunded",
      "cancelled",
      "canceled",
    ]);

    const supportedEvent =
      event === "order.status_changed" ||
      event === "order.created" ||
      event === "order.processing" ||
      event === "order.confirmed" ||
      event === "order.completed" ||
      event === "order.failed" ||
      event === "order.cancelled" ||
      event === "order.canceled" ||
      event === "order.refunded" ||
      knownStatuses.has(status);

    if (!supportedEvent) {
      return NextResponse.json({
        ok: true,
        action: "IGNORED",
        event,
        status,
        orderId: internalOrder.id,
        supplierOrderId,
      });
    }

    /**
     * =======================================================
     * LOS EVENTOS EXPLÍCITOS TIENEN PRIORIDAD
     * =======================================================
     */

    if (
      event === "order.processing" ||
      event === "order.in_progress" ||
      event === "order.in-progress"
    ) {
      status = "processing";
    }

    if (event === "order.confirmed") {
      status = "confirmed";
    }

    if (event === "order.created") {
      status = "created";
    }

    if (
      event === "order.completed" ||
      event === "order.success" ||
      event === "order.successful" ||
      event === "order.delivered"
    ) {
      status = "completed";
    }

    if (event === "order.failed") {
      status = "failed";
    }

    if (
      event === "order.cancelled" ||
      event === "order.canceled"
    ) {
      status = "cancelled";
    }

    if (
      event === "order.refunded" ||
      event === "order.refund"
    ) {
      status = "refunded";
    }

    /**
     * =======================================================
     * STATUS ACTUAL DE STORE GAMING
     * =======================================================
     */
    const currentStatus =
      String(internalOrder.status || "")
        .trim()
        .toUpperCase();

    /**
     * =======================================================
     * PROTEGER ESTADOS FINALES
     * =======================================================
     */

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

    /**
     * =======================================================
     * CONFIRMADO
     *
     * Cuando FazerCards manda:
     *
     * confirmed
     * order.confirmed
     *
     * Store Gaming pasa a:
     *
     * CONFIRMED
     *
     * NO se reembolsa.
     * NO se completa todavía.
     * =======================================================
     */
    if (
      status === "confirmed" ||
      status === "confirmado" ||
      status === "confirm"
    ) {
      const {
        error,
      } = await supabaseAdmin.rpc(
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

    /**
     * =======================================================
     * COMPLETADO
     *
     * Estados aceptados de FazerCards:
     *
     * completed
     * complete
     * success
     * successful
     * delivered
     * done
     * =======================================================
     */
    if (
      status === "completed" ||
      status === "complete" ||
      status === "success" ||
      status === "successful" ||
      status === "delivered" ||
      status === "done"
    ) {
      const {
        error,
      } = await supabaseAdmin.rpc(
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

    /**
     * =======================================================
     * REEMBOLSADO / FALLIDO
     *
     * Estos estados devuelven el saldo.
     *
     * FAILED
     * FAILURE
     * REJECTED
     * ERROR
     * REFUND
     * REFUNDED
     *
     * Resultado:
     *
     * REFUNDED
     * =======================================================
     */
    if (
      status === "refund" ||
      status === "refunded" ||
      status === "failed" ||
      status === "failure" ||
      status === "rejected" ||
      status === "error"
    ) {
      const {
        data,
        error,
      } = await supabaseAdmin.rpc(
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

    /**
     * =======================================================
     * CANCELADO
     *
     * CANCELLED queda separado de REFUNDED.
     *
     * El saldo se devuelve, pero el pedido conserva:
     *
     * CANCELLED
     * =======================================================
     */
    if (
      status === "cancelled" ||
      status === "canceled"
    ) {
      const {
        data,
        error,
      } = await supabaseAdmin.rpc(
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

    /**
     * =======================================================
     * PENDIENTE
     *
     * processing
     * in_progress
     * queued
     * created
     * pending
     *
     * Todo queda como:
     *
     * PENDING
     *
     * IMPORTANTE:
     * confirmed ya fue tratado arriba.
     * =======================================================
     */
    const internalStatus =
      getInternalStatus(status);

    const {
      error: intermediateError,
    } = await supabaseAdmin
      .from("topup_orders")
      .update({
        status: internalStatus,
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
        internalOrderId:
          internalOrder.id,
        supplierOrderId,
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
