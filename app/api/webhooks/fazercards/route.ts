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
 *
 * Evento actual:
 *
 * {
 *   "event": "order.status_changed",
 *   "data": {
 *     "order_id": "ord-1001",
 *     "status": "completed"
 *   }
 * }
 *
 * También dejamos compatibilidad con otras
 * estructuras que pudiera enviar FazerCards.
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
 * WEBHOOK
 * =====================================================
 */

export async function POST(
  request: NextRequest
) {
  try {
    /*
     * =================================================
     * 1. LEER CUERPO RAW
     * =================================================
     *
     * No usamos request.json()
     * antes de verificar la firma.
     */

    const rawBody =
      await request.text();

    /*
     * =================================================
     * 2. OBTENER FIRMA
     * =================================================
     *
     * Header principal:
     * X-Webhook-Signature
     *
     * También aceptamos:
     * X-FazerCards-Signature
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

    const status =
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

      /*
       * El webhook fue recibido correctamente,
       * pero no tenemos una orden interna que
       * podamos relacionar.
       *
       * Respondemos 200 para evitar reintentos
       * innecesarios de un evento que no podemos
       * procesar.
       */

      return NextResponse.json({
        ok: true,
        action: "IGNORED",
        reason: "ORDER_ID_NOT_FOUND",
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
        reason: "ORDER_NOT_FOUND",
        supplierOrderId,
      });
    }

    /*
     * =================================================
     * 9. GUARDAR RESPUESTA DEL WEBHOOK
     * =================================================
     *
     * No cambiamos todavía el estado interno.
     * Primero guardamos la información recibida.
     */

    const {
      error: updateResponseError,
    } = await supabaseAdmin
      .from("topup_orders")
      .update({
        supplier_response: payload,
        updated_at: new Date().toISOString(),
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
     * 10. EVENTO ACTUAL DE FAZERCARDS
     * =================================================
     *
     * El evento oficial actual es:
     *
     * order.status_changed
     *
     * Pero también aceptamos eventos antiguos
     * para mantener compatibilidad.
     */

    const supportedEvent =
      event ===
        "order.status_changed" ||
      event ===
        "order.completed" ||
      event ===
        "order.failed" ||
      event ===
        "order.refunded";

    if (!supportedEvent) {
      console.log(
        "FAZERCARDS WEBHOOK IGNORADO - EVENTO NO SOPORTADO:",
        {
          event,
          status,
          supplierOrderId,
          internalOrderId:
            internalOrder.id,
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
     * 11. DETERMINAR ESTADO FINAL
     * =================================================
     */

    let finalStatus = status;

    /*
     * Compatibilidad con eventos antiguos
     * que pueden no traer data.status.
     */

    if (
      event ===
        "order.completed"
    ) {
      finalStatus =
        "completed";
    }

    if (
      event ===
        "order.failed"
    ) {
      finalStatus =
        "failed";
    }

    if (
      event ===
        "order.refunded"
    ) {
      finalStatus =
        "refunded";
    }

    /*
     * =================================================
     * 12. COMPLETED
     * =================================================
     */

    if (
      finalStatus ===
        "completed" ||
      finalStatus ===
        "complete" ||
      finalStatus ===
        "success" ||
      finalStatus ===
        "successful"
    ) {
      /*
       * Si ya estaba completada,
       * no volvemos a modificar saldo.
       *
       * complete_topup_order()
       * también protege el estado.
       */

      const {
        data: completeResult,
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
          result:
            completeResult,
        }
      );

      return NextResponse.json({
        ok: true,
        action: "COMPLETED",
        orderId:
          internalOrder.id,
        supplierOrderId,
        status:
          "COMPLETED",
      });
    }

    /*
     * =================================================
     * 13. FAILED / REFUNDED
     * =================================================
     *
     * En cualquiera de estos estados:
     *
     * 1. Se marca la orden como FAILED.
     * 2. fail_topup_order()
     *    llama a refund_topup_balance().
     * 3. El saldo retail_price se devuelve.
     * 4. La orden termina REFUNDED.
     *
     * Las funciones SQL ya protegen contra
     * reembolsos duplicados.
     */

    if (
      finalStatus ===
        "failed" ||
      finalStatus ===
        "failure" ||
      finalStatus ===
        "refunded" ||
      finalStatus ===
        "cancelled" ||
      finalStatus ===
        "canceled"
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
            finalStatus,
          result:
            failResult,
        }
      );

      return NextResponse.json({
        ok: true,
        action: "REFUNDED",
        orderId:
          internalOrder.id,
        supplierOrderId,
        status:
          "REFUNDED",
      });
    }

    /*
     * =================================================
     * 14. ESTADOS INTERMEDIOS
     * =================================================
     *
     * Ejemplos:
     *
     * processing
     * pending
     * queued
     * created
     *
     * No devolvemos saldo.
     */

    console.log(
      "FAZERCARDS WEBHOOK - ESTADO INTERMEDIO:",
      {
        event,
        status: finalStatus,
        supplierOrderId,
        internalOrderId:
          internalOrder.id,
      }
    );

    return NextResponse.json({
      ok: true,
      action: "IGNORED",
      event,
      status: finalStatus,
      orderId:
        internalOrder.id,
      supplierOrderId,
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
