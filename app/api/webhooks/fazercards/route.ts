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

/* =====================================================
   VERIFICAR FIRMA DE FAZERCARDS
===================================================== */
function verifySignature(
  rawBody: string,
  signature: string
): boolean {
  if (!FAZER_WEBHOOK_SECRET || !signature) {
    return false;
  }

  const expected =
    "sha256=" +
    crypto
      .createHmac(
        "sha256",
        FAZER_WEBHOOK_SECRET
      )
      .update(rawBody)
      .digest("hex");

  const expectedBuffer = Buffer.from(
    expected,
    "utf8"
  );

  const signatureBuffer = Buffer.from(
    signature.trim(),
    "utf8"
  );

  if (
    expectedBuffer.length !==
    signatureBuffer.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    expectedBuffer,
    signatureBuffer
  );
}

/* =====================================================
   EXTRAER ORDER ID
===================================================== */
function extractSupplierOrderId(
  payload: any
): string {
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

  for (const candidate of candidates) {
    if (
      typeof candidate === "string" &&
      candidate.trim()
    ) {
      return candidate.trim();
    }

    if (
      typeof candidate === "number" &&
      Number.isFinite(candidate)
    ) {
      return String(candidate);
    }
  }

  return "";
}

/* =====================================================
   EXTRAER STATUS
===================================================== */
function extractSupplierStatus(
  payload: any
): string {
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

  for (const candidate of candidates) {
    if (
      typeof candidate === "string" &&
      candidate.trim()
    ) {
      return candidate
        .trim()
        .toLowerCase();
    }
  }

  return "";
}

/* =====================================================
   EXTRAER EVENTO
===================================================== */
function extractEvent(
  payload: any
): string {
  const event =
    payload?.event ??
    payload?.type ??
    payload?.data?.event ??
    "";

  if (typeof event !== "string") {
    return "";
  }

  return event
    .trim()
    .toLowerCase();
}

/* =====================================================
   ESTADO INTERNO
===================================================== */
function getInternalStatus(
  supplierStatus: string
): string {
  const normalized =
    supplierStatus
      .trim()
      .toLowerCase();

  if (
    normalized === "processing" ||
    normalized === "in_progress" ||
    normalized === "in-progress" ||
    normalized === "queued"
  ) {
    return "PROCESSING";
  }

  if (
    normalized === "created" ||
    normalized === "pending"
  ) {
    return "PENDING";
  }

  if (
    normalized === "confirmed"
  ) {
    return "CONFIRMED";
  }

  return "PENDING";
}

/* =====================================================
   CREAR NOTIFICACIÓN
   Si falla la notificación, no bloquea el webhook.
===================================================== */
async function createNotification(
  userId: string,
  title: string,
  message: string,
  sourceId: string
) {
  try {
    const { error } =
      await supabaseAdmin.rpc(
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

/* =====================================================
   WEBHOOK
===================================================== */
export async function POST(
  request: NextRequest
) {
  try {
    /* =================================================
       1. LEER BODY RAW
    ================================================= */
    const rawBody =
      await request.text();

    /* =================================================
       2. OBTENER FIRMA
    ================================================= */
    const signature =
      request.headers.get(
        "x-webhook-signature"
      ) ||
      request.headers.get(
        "x-fazercards-signature"
      ) ||
      "";

    /* =================================================
       3. VERIFICAR FIRMA
    ================================================= */
    if (
      !verifySignature(
        rawBody,
        signature
      )
    ) {
      console.error(
        "FAZERCARDS WEBHOOK: FIRMA INVÁLIDA"
      );

      return new NextResponse(
        "Invalid signature",
        {
          status: 401,
        }
      );
    }

    /* =================================================
       4. PARSEAR JSON
    ================================================= */
    let payload: any;

    try {
      payload =
        JSON.parse(rawBody);
    } catch (error) {
      console.error(
        "FAZERCARDS WEBHOOK: JSON INVÁLIDO",
        error
      );

      return new NextResponse(
        "Invalid JSON",
        {
          status: 400,
        }
      );
    }

    /* =================================================
       5. EXTRAER INFORMACIÓN
    ================================================= */
    const event =
      extractEvent(payload);

    const supplierOrderId =
      extractSupplierOrderId(
        payload
      );

    let status =
      extractSupplierStatus(
        payload
      );

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

    /* =================================================
       6. VALIDAR ORDER ID
    ================================================= */
    if (!supplierOrderId) {
      console.error(
        "FAZERCARDS: ORDER ID NO ENCONTRADO"
      );

      return NextResponse.json({
        ok: true,
        action: "IGNORED",
        reason:
          "ORDER_ID_NOT_FOUND",
      });
    }

    /* =================================================
       7. BUSCAR ORDEN INTERNA
    ================================================= */
    const {
      data: internalOrder,
      error: orderError,
    } =
      await supabaseAdmin
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
        {
          status: 500,
        }
      );
    }

    /* =================================================
       8. ORDEN NO ENCONTRADA
    ================================================= */
    if (!internalOrder) {
      console.error(
        "ORDEN INTERNA NO ENCONTRADA:",
        supplierOrderId
      );

      return NextResponse.json({
        ok: true,
        action: "IGNORED",
        reason:
          "ORDER_NOT_FOUND",
        supplierOrderId,
      });
    }

    /* =================================================
       9. GUARDAR WEBHOOK COMPLETO
    ================================================= */
    const {
      error: responseError,
    } =
      await supabaseAdmin
        .from("topup_orders")
        .update({
          supplier_response:
            payload,
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          internalOrder.id
        );

    if (responseError) {
      console.error(
        "ERROR GUARDANDO WEBHOOK:",
        responseError
      );

      return new NextResponse(
        "Database error",
        {
          status: 500,
        }
      );
    }

    /* =================================================
       10. EVENTOS SOPORTADOS
    ================================================= */
    const supportedEvent =
      event ===
        "order.status_changed" ||
      event === "order.created" ||
      event === "order.processing" ||
      event === "order.confirmed" ||
      event === "order.completed" ||
      event === "order.failed" ||
      event === "order.cancelled" ||
      event === "order.canceled" ||
      event === "order.refunded";

    if (!supportedEvent) {
      console.log(
        "EVENTO NO SOPORTADO:",
        event
      );

      return NextResponse.json({
        ok: true,
        action: "IGNORED",
        event,
        status,
        orderId:
          internalOrder.id,
        supplierOrderId,
      });
    }

    /* =================================================
       11. EVENTOS EXPLÍCITOS
    ================================================= */

    if (
      event === "order.processing"
    ) {
      status = "processing";
    }

    if (
      event === "order.confirmed"
    ) {
      status = "confirmed";
    }

    if (
      event === "order.created"
    ) {
      status = "created";
    }

    if (
      event === "order.completed"
    ) {
      status = "completed";
    }

    if (
      event === "order.failed"
    ) {
      status = "failed";
    }

    if (
      event === "order.cancelled" ||
      event === "order.canceled"
    ) {
      status = "cancelled";
    }

    if (
      event === "order.refunded"
    ) {
      status = "refunded";
    }

    /* =================================================
       12. ESTADO ACTUAL
    ================================================= */
    const currentStatus =
      String(
        internalOrder.status || ""
      )
        .trim()
        .toUpperCase();

    /* =================================================
       13. COMPLETED ES FINAL
    ================================================= */
    if (
      currentStatus ===
      "COMPLETED"
    ) {
      console.log(
        "ORDEN YA COMPLETADA. WEBHOOK IGNORADO."
      );

      return NextResponse.json({
        ok: true,
        action:
          "ALREADY_COMPLETED",
        orderId:
          internalOrder.id,
        supplierOrderId,
        status:
          "COMPLETED",
      });
    }

    /* =================================================
       14. REFUNDED ES FINAL
    ================================================= */
    if (
      currentStatus ===
      "REFUNDED"
    ) {
      console.log(
        "ORDEN YA REEMBOLSADA. WEBHOOK IGNORADO."
      );

      return NextResponse.json({
        ok: true,
        action:
          "ALREADY_REFUNDED",
        orderId:
          internalOrder.id,
        supplierOrderId,
        status:
          "REFUNDED",
      });
    }

    /* =================================================
       15. COMPLETED / SUCCESS
    ================================================= */
    if (
      status === "completed" ||
      status === "complete" ||
      status === "success" ||
      status === "successful" ||
      status === "delivered" ||
      status === "done"
    ) {
      const {
        error: completeError,
      } =
        await supabaseAdmin.rpc(
          "complete_topup_order",
          {
            p_supplier_order_id:
              supplierOrderId,
          }
        );

      if (completeError) {
        console.error(
          "ERROR COMPLETANDO TOPUP:",
          completeError
        );

        return new NextResponse(
          "Database error",
          {
            status: 500,
          }
        );
      }

      await createNotification(
        internalOrder.user_id,
        "🎮 Recarga completada",
        `Tu pedido ${internalOrder.id} fue completado correctamente.`,
        internalOrder.id
      );

      console.log(
        "✅ TOPUP COMPLETADO:",
        supplierOrderId
      );

      return NextResponse.json({
        ok: true,
        action: "UPDATED",
        orderId:
          internalOrder.id,
        supplierOrderId,
        status:
          "COMPLETED",
      });
    }

    /* =================================================
       16. REFUNDED / FAILED / CANCELLED

       Estos estados devuelven el saldo mediante:

       fail_topup_order()
             ↓
       refund_topup_balance()
             ↓
       + retail_price al balance
             ↓
       transactions = REFUND
             ↓
       topup_orders = REFUNDED

       El RPC protege contra doble reembolso.
    ================================================= */
    if (
      status === "refunded" ||
      status === "failed" ||
      status === "failure" ||
      status === "cancelled" ||
      status === "canceled" ||
      status === "rejected" ||
      status === "error"
    ) {
      const {
        data: refundResult,
        error: refundError,
      } =
        await supabaseAdmin.rpc(
          "fail_topup_order",
          {
            p_supplier_order_id:
              supplierOrderId,
          }
        );

      if (refundError) {
        console.error(
          "❌ ERROR REEMBOLSANDO TOPUP:",
          refundError
        );

        return new NextResponse(
          "Database error",
          {
            status: 500,
          }
        );
      }

      await createNotification(
        internalOrder.user_id,
        "💰 Saldo reembolsado",
        `El pedido ${internalOrder.id} fue reembolsado. El saldo utilizado fue devuelto a tu billetera.`,
        internalOrder.id
      );

      console.log(
        "========================================"
      );

      console.log(
        "✅ TOPUP REEMBOLSADO"
      );

      console.log({
        internalOrderId:
          internalOrder.id,
        supplierOrderId,
        supplierStatus:
          status,
        refundResult,
        refundedAmount:
          internalOrder.retail_price,
      });

      console.log(
        "========================================"
      );

      return NextResponse.json({
        ok: true,
        action: "REFUNDED",
        orderId:
          internalOrder.id,
        supplierOrderId,
        status:
          "REFUNDED",
        refundedAmount:
          internalOrder.retail_price,
      });
    }

    /* =================================================
       17. ESTADOS INTERMEDIOS
    ================================================= */
    const internalStatus =
      getInternalStatus(status);

    const {
      error: intermediateError,
    } =
      await supabaseAdmin
        .from("topup_orders")
        .update({
          status:
            internalStatus,
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          internalOrder.id
        );

    if (intermediateError) {
      console.error(
        "ERROR ACTUALIZANDO ESTADO:",
        intermediateError
      );

      return new NextResponse(
        "Database error",
        {
          status: 500,
        }
      );
    }

    console.log(
      "🔄 TOPUP ACTUALIZADO:",
      {
        internalOrderId:
          internalOrder.id,
        supplierOrderId,
        supplierStatus:
          status,
        internalStatus,
      }
    );

    return NextResponse.json({
      ok: true,
      action: "UPDATED",
      orderId:
        internalOrder.id,
      supplierOrderId,
      status:
        internalStatus,
    });
  } catch (error) {
    console.error(
      "FAZERCARDS WEBHOOK ERROR:",
      error
    );

    return new NextResponse(
      "Internal server error",
      {
        status: 500,
      }
    );
  }
        }
