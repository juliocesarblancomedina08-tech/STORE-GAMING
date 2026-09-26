import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL!;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY!;

const FAZER_WEBHOOK_SECRET =
  process.env.FAZER_WEBHOOK_SECRET!;

const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);

export const dynamic = "force-dynamic";

/*
 * =====================================================
 * VERIFICAR FIRMA DE FAZERCARDS
 * =====================================================
 */

function verifySignature(
  rawBody: string,
  signature: string
): boolean {
  if (!FAZER_WEBHOOK_SECRET) {
    console.error(
      "FAZERCARDS WEBHOOK: FALTA FAZER_WEBHOOK_SECRET"
    );

    return false;
  }

  if (!signature) {
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

  const expectedBuffer =
    Buffer.from(
      expected,
      "utf8"
    );

  const signatureBuffer =
    Buffer.from(
      signature,
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

/*
 * =====================================================
 * EXTRAER ORDER ID
 * =====================================================
 */

function extractSupplierOrderId(
  payload: any
): string {
  const candidates = [
    payload?.data?.order_id,
    payload?.data?.orderId,
    payload?.order_id,
    payload?.orderId,
    payload?.data?.order?.id,
    payload?.order?.id,
  ];

  for (const candidate of candidates) {
    if (
      typeof candidate === "string" &&
      candidate.trim()
    ) {
      return candidate.trim();
    }
  }

  return "";
}

/*
 * =====================================================
 * EXTRAER STATUS
 * =====================================================
 */

function extractSupplierStatus(
  payload: any
): string {
  const candidates = [
    payload?.data?.status,
    payload?.status,
    payload?.data?.order?.status,
    payload?.order?.status,
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

/*
 * =====================================================
 * EXTRAER EVENTO
 * =====================================================
 */

function extractEvent(
  payload: any
): string {
  const event =
    payload?.event ??
    payload?.type ??
    "";

  if (
    typeof event !== "string"
  ) {
    return "";
  }

  return event
    .trim()
    .toLowerCase();
}

/*
 * =====================================================
 * ESTADO INTERNO PENDIENTE
 * =====================================================
 */

function getInternalPendingStatus(
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
    normalized === "queued" ||
    normalized === "created"
  ) {
    return "SUPPLIER_PENDING";
  }

  return "PENDING";
}

/*
 * =====================================================
 * WEBHOOK
 * =====================================================
 */

export async function POST(
  request: NextRequest
) {
  try {

    /*
     * =================================================
     * 1. LEER BODY RAW
     * =================================================
     */

    const rawBody =
      await request.text();

    /*
     * =================================================
     * 2. OBTENER FIRMA
     * =================================================
     */

    const signature =
      request.headers.get(
        "x-webhook-signature"
      ) ||
      request.headers.get(
        "x-fazercards-signature"
      ) ||
      "";

    /*
     * =================================================
     * 3. VERIFICAR FIRMA
     * =================================================
     */

    const validSignature =
      verifySignature(
        rawBody,
        signature
      );

    if (!validSignature) {
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

    /*
     * =================================================
     * 4. PARSEAR JSON
     * =================================================
     */

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

    /*
     * =================================================
     * 5. EXTRAER INFORMACIÓN
     * =================================================
     */

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
      "FAZERCARDS WEBHOOK RECIBIDO:",
      {
        event,
        supplierOrderId,
        status,
      }
    );

    /*
     * =================================================
     * 6. VALIDAR ORDER ID
     * =================================================
     */

    if (!supplierOrderId) {
      console.error(
        "FAZERCARDS WEBHOOK: NO SE ENCONTRÓ ORDER ID",
        payload
      );

      return NextResponse.json({
        ok: true,
        action: "IGNORED",
        reason:
          "ORDER_ID_NOT_FOUND",
      });
    }

    /*
     * =================================================
     * 7. BUSCAR ORDEN INTERNA
     * =================================================
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
        "ERROR BUSCANDO ORDEN TOPUP:",
        orderError
      );

      return new NextResponse(
        "Database error",
        {
          status: 500,
        }
      );
    }

    /*
     * =================================================
     * 8. ORDEN NO ENCONTRADA
     * =================================================
     */

    if (!internalOrder) {
      console.error(
        "FAZERCARDS WEBHOOK: ORDEN INTERNA NO ENCONTRADA",
        {
          supplierOrderId,
          event,
          status,
        }
      );

      return NextResponse.json({
        ok: true,
        action: "IGNORED",
        reason:
          "ORDER_NOT_FOUND",
        supplierOrderId,
      });
    }

    /*
     * =================================================
     * 9. GUARDAR WEBHOOK RECIBIDO
     * =================================================
     */

    const {
      error: updateResponseError,
    } = await supabaseAdmin
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

    if (updateResponseError) {
      console.error(
        "ERROR GUARDANDO WEBHOOK EN TOPUP_ORDER:",
        updateResponseError
      );

      return new NextResponse(
        "Database error",
        {
          status: 500,
        }
      );
    }

    /*
     * =================================================
     * 10. EVENTOS SOPORTADOS
     * =================================================
     */

    const supportedEvent =
      event === "order.status_changed" ||
      event === "order.created" ||
      event === "order.processing" ||
      event === "order.completed" ||
      event === "order.failed" ||
      event === "order.refunded";

    /*
     * =================================================
     * 11. EVENTO NO SOPORTADO
     * =================================================
     */

    if (!supportedEvent) {
      console.log(
        "FAZERCARDS WEBHOOK IGNORADO - EVENTO NO SOPORTADO:",
        {
          event,
          status,
          supplierOrderId,
        }
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

    /*
     * =================================================
     * 12. NORMALIZAR EVENTOS
     * =================================================
     */

    if (
      event ===
      "order.processing"
    ) {
      status =
        "processing";
    }

    if (
      event ===
      "order.created"
    ) {
      status =
        "created";
    }

    if (
      event ===
      "order.completed"
    ) {
      status =
        "completed";
    }

    if (
      event ===
      "order.failed"
    ) {
      status =
        "failed";
    }

    if (
      event ===
      "order.refunded"
    ) {
      status =
        "refunded";
    }

    /*
     * =================================================
     * 13. PROTEGER ESTADOS FINALES
     * =================================================
     *
     * Una orden COMPLETED o REFUNDED queda cerrada.
     *
     * Un webhook atrasado no puede cambiarla.
     */

    const currentStatus =
      String(
        internalOrder.status ||
        ""
      )
        .trim()
        .toUpperCase();

    const isCompleted =
      currentStatus ===
      "COMPLETED";

    const isRefunded =
      currentStatus ===
      "REFUNDED";

    /*
     * Si ya fue COMPLETED:
     *
     * No permitimos FAILED,
     * REFUNDED ni estados intermedios.
     */

    if (isCompleted) {
      console.log(
        "WEBHOOK IGNORADO - ORDEN YA COMPLETADA:",
        {
          internalOrderId:
            internalOrder.id,
          supplierOrderId,
          receivedStatus:
            status,
        }
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

    /*
     * Si ya fue REFUNDED:
     *
     * No permitimos COMPLETED
     * ni nuevos estados intermedios.
     */

    if (isRefunded) {
      console.log(
        "WEBHOOK IGNORADO - ORDEN YA REEMBOLSADA:",
        {
          internalOrderId:
            internalOrder.id,
          supplierOrderId,
          receivedStatus:
            status,
        }
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

    /*
     * =================================================
     * 14. COMPLETED
     * =================================================
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
        error: completeError,
      } = await supabaseAdmin.rpc(
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

      console.log(
        "TOPUP COMPLETADO:",
        {
          internalOrderId:
            internalOrder.id,
          supplierOrderId,
        }
      );

      return NextResponse.json({
        ok: true,
        action:
          "UPDATED",
        orderId:
          internalOrder.id,
        supplierOrderId,
        status:
          "COMPLETED",
      });
    }

    /*
     * =================================================
     * 15. FAILED / REFUNDED / CANCELLED
     * =================================================
     */

    if (
      status === "failed" ||
      status === "failure" ||
      status === "refunded" ||
      status === "cancelled" ||
      status === "canceled" ||
      status === "rejected" ||
      status === "error"
    ) {

      const {
        data: failResult,
        error: failError,
      } = await supabaseAdmin.rpc(
        "fail_topup_order",
        {
          p_supplier_order_id:
            supplierOrderId,
        }
      );

      if (failError) {
        console.error(
          "ERROR FALLANDO / REEMBOLSANDO TOPUP:",
          failError
        );

        return new NextResponse(
          "Database error",
          {
            status: 500,
          }
        );
      }

      console.log(
        "TOPUP FALLIDO / SALDO DEVUELTO:",
        {
          internalOrderId:
            internalOrder.id,
          supplierOrderId,
          supplierStatus:
            status,
          result:
            failResult,
        }
      );

      return NextResponse.json({
        ok: true,
        action:
          "UPDATED",
        orderId:
          internalOrder.id,
        supplierOrderId,
        status:
          "REFUNDED",
      });
    }

    /*
     * =================================================
     * 16. ESTADOS INTERMEDIOS
     * =================================================
     */

    const internalStatus =
      getInternalPendingStatus(
        status
      );

    const {
      error:
        intermediateUpdateError,
    } = await supabaseAdmin
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

    if (
      intermediateUpdateError
    ) {
      console.error(
        "ERROR ACTUALIZANDO ESTADO INTERMEDIO:",
        intermediateUpdateError
      );

      return new NextResponse(
        "Database error",
        {
          status: 500,
        }
      );
    }

    console.log(
      "TOPUP ACTUALIZADO - MISMA ORDEN:",
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
      action:
        "UPDATED",
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
