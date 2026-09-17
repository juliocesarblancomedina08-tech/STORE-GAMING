import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL!;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY!;

const FAZER_WEBHOOK_SECRET =
  process.env.FAZER_WEBHOOK_SECRET!;

const supabaseAdmin =
  createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY
  );

/*
 * =====================================================
 * VERIFICAR FIRMA DE FAZERCARDS
 * =====================================================
 */

function verifySignature(
  rawBody: string,
  signature: string
) {
  if (!FAZER_WEBHOOK_SECRET) {
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
 * WEBHOOK
 * =====================================================
 */

export async function POST(
  request: NextRequest
) {
  try {
    /*
     * =================================================
     * LEER CUERPO RAW
     * =================================================
     *
     * IMPORTANTE:
     * No usamos request.json()
     * antes de verificar la firma.
     *
     * La firma se calcula sobre el
     * cuerpo original.
     */

    const rawBody =
      await request.text();

    /*
     * =================================================
     * FIRMA
     * =================================================
     *
     * La documentación actual usa
     * X-Webhook-Signature.
     *
     * También aceptamos
     * X-FazerCards-Signature
     * para compatibilidad.
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
     * VERIFICACIÓN
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
     * PARSEAR EVENTO
     * =================================================
     */

    let payload: any;

    try {
      payload =
        JSON.parse(rawBody);
    } catch {
      return new NextResponse(
        "Invalid JSON",
        {
          status: 400,
        }
      );
    }

    /*
     * =================================================
     * DATOS DEL EVENTO
     * =================================================
     */

    const event =
      payload?.event ||
      payload?.type ||
      "";

    const data =
      payload?.data ||
      {};

    const supplierOrderId =
      data?.order_id ||
      data?.orderId ||
      payload?.order_id ||
      payload?.orderId ||
      payload?.order?.id ||
      data?.order?.id ||
      null;

    const status =
      (
        data?.status ||
        payload?.status ||
        payload?.order?.status ||
        ""
      )
        .toString()
        .toLowerCase();

    /*
     * =================================================
     * LOG CONTROLADO
     * =================================================
     */

    console.log(
      "FAZERCARDS WEBHOOK:",
      {
        event,
        supplierOrderId,
        status,
      }
    );

    /*
     * =================================================
     * SIN ORDER ID
     * =================================================
     */

    if (!supplierOrderId) {
      console.warn(
        "FAZERCARDS WEBHOOK SIN ORDER ID"
      );

      /*
       * Respondemos 200 porque la firma
       * fue válida y no tiene sentido
       * provocar reintentos infinitos.
       */

      return NextResponse.json({
        ok: true,
        ignored: true,
        reason:
          "ORDER_ID_NOT_FOUND",
      });
    }

    /*
     * =================================================
     * BUSCAR ORDEN INTERNA
     * =================================================
     */

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
        "ERROR BUSCANDO TOPUP:",
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
     * ORDEN NO ENCONTRADA
     * =================================================
     */

    if (!internalOrder) {
      console.warn(
        "FAZERCARDS ORDER NO ENCONTRADA:",
        supplierOrderId
      );

      /*
       * Puede ser una orden creada
       * directamente desde el panel de
       * FazerCards o una orden antigua.
       */

      return NextResponse.json({
        ok: true,
        ignored: true,
        reason:
          "INTERNAL_ORDER_NOT_FOUND",
      });
    }

    /*
     * =================================================
     * COMPLETADA
     * =================================================
     */

    if (
      event ===
        "order.completed" ||
      status === "completed"
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

      console.log(
        "TOPUP COMPLETADO:",
        internalOrder.id
      );

      return NextResponse.json({
        ok: true,
        action: "COMPLETED",
        orderId:
          internalOrder.id,
      });
    }

    /*
     * =================================================
     * FALLIDA
     * =================================================
     */

    if (
      event ===
        "order.failed" ||
      status === "failed"
    ) {
      const {
        error: failError,
      } =
        await supabaseAdmin.rpc(
          "fail_topup_order",
          {
            p_supplier_order_id:
              supplierOrderId,
          }
        );

      if (failError) {
        console.error(
          "ERROR FALLANDO TOPUP:",
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
        internalOrder.id
      );

      return NextResponse.json({
        ok: true,
        action: "REFUNDED",
        orderId:
          internalOrder.id,
      });
    }

    /*
     * =================================================
     * REEMBOLSADA
     * =================================================
     */

    if (
      event ===
        "order.refunded" ||
      status === "refunded"
    ) {
      const {
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
          "ERROR DEVOLVIENDO SALDO:",
          refundError
        );

        return new NextResponse(
          "Database error",
          {
            status: 500,
          }
        );
      }

      console.log(
        "TOPUP REEMBOLSADO / SALDO DEVUELTO:",
        internalOrder.id
      );

      return NextResponse.json({
        ok: true,
        action: "REFUNDED",
        orderId:
          internalOrder.id,
      });
    }

    /*
     * =================================================
     * OTROS ESTADOS
     * =================================================
     *
     * Ejemplo:
     * processing
     * pending
     * etc.
     *
     * No tocamos el saldo.
     */

    console.log(
      "FAZERCARDS WEBHOOK IGNORADO:",
      {
        event,
        status,
        orderId:
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
