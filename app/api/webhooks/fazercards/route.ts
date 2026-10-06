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
function verifySignature(rawBody: string, signature: string): boolean {
  if (!FAZER_WEBHOOK_SECRET) {
    console.error(
      "FAZERCARDS WEBHOOK: FALTA FAZER_WEBHOOK_SECRET"
    );
    return false;
  }

  if (!signature) return false;

  const expected =
    "sha256=" +
    crypto
      .createHmac("sha256", FAZER_WEBHOOK_SECRET)
      .update(rawBody)
      .digest("hex");

  const expectedBuffer = Buffer.from(expected, "utf8");
  const signatureBuffer = Buffer.from(signature.trim(), "utf8");

  if (expectedBuffer.length !== signatureBuffer.length) {
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
function extractSupplierOrderId(payload: any): string {
  const candidates = [
    payload?.data?.order_id,
    payload?.data?.orderId,
    payload?.order_id,
    payload?.orderId,
    payload?.data?.order?.id,
    payload?.order?.id,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return "";
}

/* =====================================================
   EXTRAER STATUS
===================================================== */
function extractSupplierStatus(payload: any): string {
  const candidates = [
    payload?.data?.status,
    payload?.status,
    payload?.data?.order?.status,
    payload?.order?.status,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim().toLowerCase();
    }
  }

  return "";
}

/* =====================================================
   EXTRAER EVENTO
===================================================== */
function extractEvent(payload: any): string {
  const event = payload?.event ?? payload?.type ?? "";

  if (typeof event !== "string") return "";

  return event.trim().toLowerCase();
}

/* =====================================================
   NORMALIZAR ESTADO INTERNO

   IMPORTANTE:
   - Los estados se mantienen en inglés en la base de datos.
   - La interfaz de STORE GAMING puede mostrarlos en español.
===================================================== */
function getInternalStatus(supplierStatus: string): string {
  const normalized = supplierStatus.trim().toLowerCase();

  if (
    normalized === "processing" ||
    normalized === "in_progress" ||
    normalized === "in-progress" ||
    normalized === "queued"
  ) {
    return "PROCESSING";
  }

  if (normalized === "created" || normalized === "pending") {
    return "PENDING";
  }

  if (normalized === "confirmed") {
    return "CONFIRMED";
  }

  return "PENDING";
}

/* =====================================================
   WEBHOOK
===================================================== */
export async function POST(request: NextRequest) {
  try {
    /* 1. Leer body RAW */
    const rawBody = await request.text();

    /* 2. Obtener firma */
    const signature =
      request.headers.get("x-webhook-signature") ||
      request.headers.get("x-fazercards-signature") ||
      "";

    /* 3. Verificar firma */
    if (!verifySignature(rawBody, signature)) {
      console.error("FAZERCARDS WEBHOOK: FIRMA INVÁLIDA");

      return new NextResponse("Invalid signature", {
        status: 401,
      });
    }

    /* 4. Parsear JSON */
    let payload: any;

    try {
      payload = JSON.parse(rawBody);
    } catch (error) {
      console.error("FAZERCARDS WEBHOOK: JSON INVÁLIDO", error);

      return new NextResponse("Invalid JSON", {
        status: 400,
      });
    }

    /* 5. Extraer información */
    const event = extractEvent(payload);
    const supplierOrderId = extractSupplierOrderId(payload);
    let status = extractSupplierStatus(payload);

    console.log("FAZERCARDS WEBHOOK RECIBIDO:", {
      event,
      supplierOrderId,
      status,
    });

    /* 6. Validar Order ID */
    if (!supplierOrderId) {
      console.error(
        "FAZERCARDS WEBHOOK: NO SE ENCONTRÓ ORDER ID",
        payload
      );

      return NextResponse.json({
        ok: true,
        action: "IGNORED",
        reason: "ORDER_ID_NOT_FOUND",
      });
    }

    /* 7. Buscar orden interna */
    const { data: internalOrder, error: orderError } =
      await supabaseAdmin
        .from("topup_orders")
        .select("*")
        .eq("supplier_order_id", supplierOrderId)
        .maybeSingle();

    if (orderError) {
      console.error("ERROR BUSCANDO ORDEN TOPUP:", orderError);

      return new NextResponse("Database error", {
        status: 500,
      });
    }

    /* 8. Orden no encontrada */
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

    /* 9. Guardar siempre el webhook recibido */
    const { error: updateResponseError } = await supabaseAdmin
      .from("topup_orders")
      .update({
        supplier_response: payload,
        updated_at: new Date().toISOString(),
      })
      .eq("id", internalOrder.id);

    if (updateResponseError) {
      console.error(
        "ERROR GUARDANDO WEBHOOK EN TOPUP_ORDER:",
        updateResponseError
      );

      return new NextResponse("Database error", {
        status: 500,
      });
    }

    /* 10. Eventos soportados */
    const supportedEvent =
      event === "order.status_changed" ||
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
        orderId: internalOrder.id,
        supplierOrderId,
      });
    }

    /* 11. Normalizar eventos explícitos */
    if (event === "order.processing") status = "processing";
    if (event === "order.confirmed") status = "confirmed";
    if (event === "order.created") status = "created";
    if (event === "order.completed") status = "completed";
    if (event === "order.failed") status = "failed";
    if (event === "order.cancelled" || event === "order.canceled") {
      status = "cancelled";
    }
    if (event === "order.refunded") status = "refunded";

    /* 12. Estados finales protegidos */
    const currentStatus = String(internalOrder.status || "")
      .trim()
      .toUpperCase();

    /*
     * COMPLETED es final.
     * Un webhook atrasado de processing/confirmed/failed/refunded
     * no debe cambiar una recarga que ya terminó correctamente.
     */
    if (currentStatus === "COMPLETED") {
      console.log("WEBHOOK IGNORADO - ORDEN YA COMPLETADA:", {
        internalOrderId: internalOrder.id,
        supplierOrderId,
        receivedStatus: status,
      });

      return NextResponse.json({
        ok: true,
        action: "ALREADY_COMPLETED",
        orderId: internalOrder.id,
        supplierOrderId,
        status: "COMPLETED",
      });
    }

    /*
     * REFUNDED es final.
     * El RPC de reembolso ya protege contra doble devolución.
     */
    if (currentStatus === "REFUNDED") {
      console.log("WEBHOOK IGNORADO - ORDEN YA REEMBOLSADA:", {
        internalOrderId: internalOrder.id,
        supplierOrderId,
        receivedStatus: status,
      });

      return NextResponse.json({
        ok: true,
        action: "ALREADY_REFUNDED",
        orderId: internalOrder.id,
        supplierOrderId,
        status: "REFUNDED",
      });
    }

    /* 13. COMPLETED / SUCCESS */
    if (
      status === "completed" ||
      status === "complete" ||
      status === "success" ||
      status === "successful" ||
      status === "delivered" ||
      status === "done"
    ) {
      const { error: completeError } = await supabaseAdmin.rpc(
        "complete_topup_order",
        {
          p_supplier_order_id: supplierOrderId,
        }
      );

      if (completeError) {
        console.error("ERROR COMPLETANDO TOPUP:", completeError);

        return new NextResponse("Database error", {
          status: 500,
        });
      }

      console.log("TOPUP COMPLETADO:", {
        internalOrderId: internalOrder.id,
        supplierOrderId,
      });

      return NextResponse.json({
        ok: true,
        action: "UPDATED",
        orderId: internalOrder.id,
        supplierOrderId,
        status: "COMPLETED",
      });
    }

    /*
     * 14. FAILED / CANCELLED / REFUNDED
     *
     * El RPC existente fail_topup_order hace dos cosas:
     *   1) marca la orden como FAILED;
     *   2) llama refund_topup_balance(), que devuelve el saldo
     *      y finalmente cambia la orden a REFUNDED.
     *
     * Por eso el estado final real será REFUNDED.
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
      const { data: failResult, error: failError } =
        await supabaseAdmin.rpc("fail_topup_order", {
          p_supplier_order_id: supplierOrderId,
        });

      if (failError) {
        console.error(
          "ERROR FALLANDO / REEMBOLSANDO TOPUP:",
          failError
        );

        return new NextResponse("Database error", {
          status: 500,
        });
      }

      console.log("TOPUP FALLIDO / SALDO DEVUELTO:", {
        internalOrderId: internalOrder.id,
        supplierOrderId,
        supplierStatus: status,
        result: failResult,
      });

      return NextResponse.json({
        ok: true,
        action: "UPDATED",
        orderId: internalOrder.id,
        supplierOrderId,
        status: "REFUNDED",
      });
    }

    /* 15. ESTADOS INTERMEDIOS */
    const internalStatus = getInternalStatus(status);

    const { error: intermediateUpdateError } = await supabaseAdmin
      .from("topup_orders")
      .update({
        status: internalStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", internalOrder.id);

    if (intermediateUpdateError) {
      console.error(
        "ERROR ACTUALIZANDO ESTADO INTERMEDIO:",
        intermediateUpdateError
      );

      return new NextResponse("Database error", {
        status: 500,
      });
    }

    console.log("TOPUP ACTUALIZADO - MISMA ORDEN:", {
      internalOrderId: internalOrder.id,
      supplierOrderId,
      supplierStatus: status,
      internalStatus,
    });

    return NextResponse.json({
      ok: true,
      action: "UPDATED",
      orderId: internalOrder.id,
      supplierOrderId,
      status: internalStatus,
    });
  } catch (error) {
    console.error("FAZERCARDS WEBHOOK ERROR:", error);

    return new NextResponse("Internal server error", {
      status: 500,
    });
  }
}
