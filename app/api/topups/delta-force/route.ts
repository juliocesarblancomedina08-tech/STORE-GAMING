import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

import {
  DELTA_FORCE_CATEGORY_ID,
  DELTA_FORCE_OFFERS,
} from "../../../../lib/games/delta-force";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const FAZER_API_BASE = (
  process.env.FAZERCARDS_API_URL ||
  "https://api.fzr.cards/api/v2"
).replace(/\/+$/, "");

const FAZER_API_KEY = process.env.FAZERCARDS_API_KEY;
const FAZERCARDS_ORIGIN = process.env.FAZERCARDS_ORIGIN?.trim();

const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

async function getUserFromRequest(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ") || !supabaseAdmin) {
    return null;
  }

  const accessToken = authorization.substring(7);

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(accessToken);

  if (error || !user) {
    return null;
  }

  return user;
}

function getProviderOrderId(result: any): string | null {
  const id =
    result?.order?.id ??
    result?.data?.order?.id ??
    result?.order_id ??
    result?.orderId ??
    result?.data?.order_id ??
    result?.data?.orderId ??
    result?.data?.id ??
    result?.id;

  return id == null || String(id).trim() === ""
    ? null
    : String(id);
}

function getProviderStatus(result: any): string {
  return String(
    result?.order?.status ??
      result?.data?.order?.status ??
      result?.status ??
      result?.data?.status ??
      "PENDING",
  )
    .trim()
    .toUpperCase();
}

function respondWithOrder(order: any, message?: string) {
  return NextResponse.json({
    ok: true,
    orderId: order.id,
    orderNumber: order.order_number || order.id,
    supplierOrderId: order.supplier_order_id || null,
    status: order.status || "SUPPLIER_PENDING",
    order,
    message: message || "La orden está registrada.",
  });
}

export async function POST(request: NextRequest) {
  let orderId: string | null = null;

  try {
    // 1. COMPROBAR CONFIGURACIÓN

    if (
      !supabaseAdmin ||
      !FAZER_API_KEY
    ) {
      console.error(
        "Faltan variables de Supabase o FazerCards en el servidor.",
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "El servicio de recargas no está configurado correctamente.",
        },
        { status: 500 },
      );
    }

    // 2. VALIDAR SESIÓN

    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "No autorizado. Inicia sesión nuevamente." },
        { status: 401 },
      );
    }

    // 3. LEER LOS DATOS

    let body: any;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { ok: false, error: "Los datos enviados no son válidos." },
        { status: 400 },
      );
    }

    const { offerId, playerId } = body || {};

    const idempotencyKey =
      typeof body?.idempotencyKey === "string" &&
      body.idempotencyKey.length <= 100 &&
      /^[a-zA-Z0-9_-]+$/.test(body.idempotencyKey)
        ? body.idempotencyKey
        : randomUUID();

    // 4. VALIDAR OFERTA

    if (
      typeof offerId !== "string" ||
      !offerId.trim()
    ) {
      return NextResponse.json(
        { ok: false, error: "Selecciona una oferta." },
        { status: 400 },
      );
    }

    const localOffer = DELTA_FORCE_OFFERS.find(
      (offer) =>
        offer.id === offerId ||
        offer.supplierOfferId === offerId,
    );

    if (!localOffer) {
      return NextResponse.json(
        {
          ok: false,
          error: "La oferta de Delta Force no existe.",
        },
        { status: 400 },
      );
    }

    // 5. VALIDAR ID DEL JUGADOR

    const cleanPlayerId = String(playerId ?? "")
      .trim()
      .replace(/\s+/g, "");

    if (!/^[0-9]{4,20}$/.test(cleanPlayerId)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El ID del jugador debe contener entre 4 y 20 números.",
        },
        { status: 400 },
      );
    }

    // 6. COMPROBAR SI ESTA CLAVE YA TIENE UNA ORDEN

    const { data: existingOrder, error: existingError } =
      await supabaseAdmin
        .from("topup_orders")
        .select("*")
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();

    if (existingError) {
      console.error(
        "Error comprobando la clave de idempotencia:",
        existingError,
      );

      return NextResponse.json(
        {
          ok: false,
          error: "No se pudo comprobar la orden anterior.",
        },
        { status: 500 },
      );
    }

    if (existingOrder) {
      if (
        existingOrder.user_id !== user.id ||
        existingOrder.offer_id !== localOffer.id ||
        String(existingOrder.player_id) !== cleanPlayerId
      ) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "La clave de orden ya fue utilizada con otros datos.",
          },
          { status: 409 },
        );
      }

      // Nunca volver a enviar al proveedor una orden ya registrada.
      return respondWithOrder(
        existingOrder,
        "Esta orden ya estaba registrada. No se ha enviado otra compra.",
      );
    }

    // 7. CALCULAR EL PRECIO DESDE EL CATÁLOGO DEL SERVIDOR

    const retailPrice = Number(localOffer.price);
    const supplierPrice = Number(localOffer.supplierPrice);

    if (
      !Number.isFinite(retailPrice) ||
      retailPrice <= 0 ||
      !Number.isFinite(supplierPrice) ||
      supplierPrice <= 0
    ) {
      return NextResponse.json(
        { ok: false, error: "El precio de la oferta no es válido." },
        { status: 400 },
      );
    }

    // 8. RESERVAR EL SALDO
    // Se utiliza el mismo RPC que la API de Free Fire.

    const { error: reserveError } =
      await supabaseAdmin.rpc(
        "store_gaming_reserve_balance",
        {
          p_user_id: user.id,
          p_amount: retailPrice,
        },
      );

    if (reserveError) {
      console.error("Error reservando saldo:", reserveError);

      return NextResponse.json(
        {
          ok: false,
          error:
            reserveError.message ||
            "No tienes saldo suficiente o no se pudo reservar.",
        },
        { status: 400 },
      );
    }

    // 9. CREAR LA ORDEN EN SUPABASE

    const { data: createdOrder, error: orderError } =
      await supabaseAdmin
        .from("topup_orders")
        .insert({
          user_id: user.id,

          username:
            user.user_metadata?.username ||
            user.user_metadata?.name ||
            user.email ||
            "Cliente",

          email: user.email,

          game: "Delta Force",

          category_id: DELTA_FORCE_CATEGORY_ID,

          offer_id: localOffer.id,

          offer_name: localOffer.name,

          player_id: cleanPlayerId,

          retail_price: retailPrice,

          supplier_price: supplierPrice,

          currency: "USD",

          status: "RESERVED",

          idempotency_key: idempotencyKey,

          supplier_fields: {
            player_id: cleanPlayerId,
            supplier_offer_id: localOffer.supplierOfferId,
          },
        })
        .select("*")
        .single();

    if (orderError || !createdOrder) {
      console.error("Error creando la orden:", orderError);

      // Devolver el saldo si no se pudo registrar la orden.
      const { error: refundError } =
        await supabaseAdmin.rpc(
          "store_gaming_admin_adjust_balance",
          {
            p_user_id: user.id,
            p_amount: retailPrice,
            p_action: "REFUND",
          },
        );

      if (refundError) {
        console.error(
          "No se pudo devolver el saldo automáticamente:",
          refundError,
        );
      }

      return NextResponse.json(
        {
          ok: false,
          error: refundError
            ? "No se pudo registrar la orden y el reembolso requiere revisión administrativa."
            : "No se pudo registrar la orden. Si el saldo no aparece, contacta con soporte.",
        },
        { status: 500 },
      );
    }

    orderId = createdOrder.id;

    // 10. MARCAR COMO EN PROCESO

    const { error: processingError } =
      await supabaseAdmin
        .from("topup_orders")
        .update({
          status: "PROCESSING",
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

    if (processingError) {
      console.error(
        "No se pudo actualizar el estado de la orden:",
        processingError,
      );
    }

    // 11. ENVIAR LA ORDEN A FAZERCARDS

    const fazerPayload = {
      category_id: DELTA_FORCE_CATEGORY_ID,
      offer_id: localOffer.supplierOfferId,
      fields: {
        player_id: cleanPlayerId,
      },
    };

    let fazerResponse: Response;

    try {
      fazerResponse = await fetch(
        `${FAZER_API_BASE}/topups/order`,
        {
          method: "POST",
          headers: {
            "X-API-Key": FAZER_API_KEY,
            "Content-Type": "application/json",
            Accept: "application/json",
            ...(FAZERCARDS_ORIGIN
              ? {
                  Origin: new URL(FAZERCARDS_ORIGIN).origin,
                }
              : {}),
          },
          body: JSON.stringify(fazerPayload),
          cache: "no-store",
          signal: AbortSignal.timeout(30000),
        },
      );
    } catch (providerError) {
      // Una desconexión no demuestra que FazerCards no recibiera la orden.
      // Por seguridad, no se reembolsa automáticamente.

      console.error(
        "No se pudo confirmar la respuesta de FazerCards:",
        providerError,
      );

      await supabaseAdmin
        .from("topup_orders")
        .update({
          status: "SUPPLIER_PENDING",
          supplier_response: {
            message: "No se pudo confirmar la respuesta del proveedor.",
            requires_reconciliation: true,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      return NextResponse.json(
        {
          ok: true,
          orderId,
          orderNumber: orderId,
          status: "SUPPLIER_PENDING",
          message:
            "La orden necesita verificación. No vuelvas a comprar hasta revisar su estado.",
        },
        { status: 202 },
      );
    }

    // 12. LEER LA RESPUESTA DEL PROVEEDOR

    const responseText = await fazerResponse.text();

    let fazerResult: any;

    try {
      fazerResult = JSON.parse(responseText);
    } catch {
      fazerResult = { raw: responseText };
    }

    const supplierOrderId = getProviderOrderId(fazerResult);
    const supplierStatus = getProviderStatus(fazerResult);

    // 13. RESPUESTA HTTP DE ERROR

    if (!fazerResponse.ok) {
      const ambiguous =
        fazerResponse.status >= 500 ||
        fazerResponse.status === 429;

      const { error: saveError } =
        await supabaseAdmin
          .from("topup_orders")
          .update({
            ...(supplierOrderId
              ? { supplier_order_id: supplierOrderId }
              : {}),
            supplier_response: fazerResult,
            status: ambiguous ? "SUPPLIER_PENDING" : "FAILED",
            ...(!ambiguous
              ? { failed_at: new Date().toISOString() }
              : {}),
            updated_at: new Date().toISOString(),
          })
          .eq("id", orderId);

      if (saveError) {
        console.error(
          "No se pudo guardar la respuesta del proveedor:",
          saveError,
        );

        return NextResponse.json(
          {
            ok: false,
            error:
              "No se pudo guardar la respuesta. Revisa la orden antes de volver a intentarlo.",
            orderId,
          },
          { status: 500 },
        );
      }

      if (ambiguous) {
        return NextResponse.json(
          {
            ok: true,
            orderId,
            orderNumber: orderId,
            supplierOrderId,
            status: "SUPPLIER_PENDING",
            message:
              "La respuesta del proveedor es incierta. El saldo permanece reservado hasta verificar la orden.",
          },
          { status: 202 },
        );
      }

      const { error: refundError } =
        await supabaseAdmin.rpc(
          "refund_topup_balance",
          { p_order_id: orderId },
        );

      if (refundError) {
        console.error("Error devolviendo saldo:", refundError);

        return NextResponse.json(
          {
            ok: false,
            error:
              "El proveedor rechazó la orden, pero el reembolso requiere revisión.",
            orderId,
          },
          { status: 500 },
        );
      }

      return NextResponse.json(
        {
          ok: false,
          error:
            fazerResult?.message ||
            fazerResult?.error ||
            "FazerCards rechazó la orden.",
          orderId,
          supplierOrderId,
          status: "REFUNDED",
        },
        { status: 400 },
      );
    }

    // 14. GUARDAR RESPUESTA E ID DEL PROVEEDOR

    const { error: saveSupplierError } =
      await supabaseAdmin
        .from("topup_orders")
        .update({
          ...(supplierOrderId
            ? { supplier_order_id: supplierOrderId }
            : {}),
          supplier_response: fazerResult,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

    if (saveSupplierError) {
      console.error(
        "Error guardando la respuesta de FazerCards:",
        saveSupplierError,
      );

      return NextResponse.json(
        {
          ok: true,
          orderId,
          orderNumber: orderId,
          supplierOrderId,
          status: "SUPPLIER_PENDING",
          message:
            "La orden se envió al proveedor, pero necesita verificación.",
        },
        { status: 202 },
      );
    }

    // Si el proveedor no devuelve un ID, no se debe enviar otra compra.
    if (!supplierOrderId) {
      await supabaseAdmin
        .from("topup_orders")
        .update({
          status: "SUPPLIER_PENDING",
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      return NextResponse.json(
        {
          ok: true,
          orderId,
          orderNumber: orderId,
          status: "SUPPLIER_PENDING",
          message:
            "El proveedor recibió una respuesta, pero la orden necesita verificación.",
        },
        { status: 202 },
      );
    }

    // 15. ORDEN COMPLETADA

    const completedStatuses = [
      "COMPLETED",
      "COMPLETE",
      "SUCCESS",
      "SUCCESSFUL",
      "SUCCEEDED",
      "DELIVERED",
      "DONE",
    ];

    if (completedStatuses.includes(supplierStatus)) {
      const { error: completeError } =
        await supabaseAdmin.rpc(
          "complete_topup_order",
          {
            p_supplier_order_id: supplierOrderId,
          },
        );

      if (completeError) {
        console.error(
          "Error finalizando la orden:",
          completeError,
        );

        await supabaseAdmin
          .from("topup_orders")
          .update({
            status: "SUPPLIER_PENDING",
            updated_at: new Date().toISOString(),
          })
          .eq("id", orderId);

        return NextResponse.json(
          {
            ok: true,
            orderId,
            orderNumber: orderId,
            supplierOrderId,
            status: "SUPPLIER_PENDING",
            message:
              "El proveedor confirmó la orden, pero su estado final necesita verificación.",
          },
          { status: 202 },
        );
      }

      const { data: finalOrder, error: finalError } =
        await supabaseAdmin
          .from("topup_orders")
          .select("*")
          .eq("id", orderId)
          .maybeSingle();

      if (
        finalError ||
        !finalOrder ||
        String(finalOrder.status).toUpperCase() !== "COMPLETED" ||
        finalOrder.refunded_at
      ) {
        return NextResponse.json(
          {
            ok: true,
            orderId,
            orderNumber: orderId,
            supplierOrderId,
            status: "SUPPLIER_PENDING",
            message:
              "La orden está pendiente de verificación final.",
          },
          { status: 202 },
        );
      }

      return respondWithOrder(
        finalOrder,
        "Recarga completada correctamente.",
      );
    }

    // 16. FALLO CONFIRMADO POR EL PROVEEDOR

    const failedStatuses = [
      "FAILED",
      "FAILURE",
      "ERROR",
      "REJECTED",
      "DECLINED",
      "DENIED",
      "CANCELLED",
      "CANCELED",
      "REFUND",
      "REFUNDED",
      "REFUND_SUCCESS",
    ];

    if (failedStatuses.includes(supplierStatus)) {
      const { error: refundError } =
        await supabaseAdmin.rpc(
          "refund_topup_balance",
          { p_order_id: orderId },
        );

      if (refundError) {
        console.error(
          "Error devolviendo saldo tras el fallo:",
          refundError,
        );

        return NextResponse.json(
          {
            ok: false,
            error:
              "La orden falló, pero el reembolso necesita revisión.",
            orderId,
          },
          { status: 500 },
        );
      }

      const { data: refundedOrder, error: verifyError } =
        await supabaseAdmin
          .from("topup_orders")
          .select("status, refunded_at")
          .eq("id", orderId)
          .maybeSingle();

      if (
        verifyError ||
        !refundedOrder ||
        String(refundedOrder.status).toUpperCase() !== "REFUNDED" ||
        !refundedOrder.refunded_at
      ) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "El reembolso necesita verificación administrativa.",
            orderId,
          },
          { status: 500 },
        );
      }

      return NextResponse.json({
        ok: false,
        orderId,
        orderNumber: orderId,
        supplierOrderId,
        status: "REFUNDED",
        message: "La orden falló y se confirmó la devolución del saldo.",
      });
    }

    // 17. CUALQUIER OTRO ESTADO QUEDA PENDIENTE

    const normalizedStatus = [
      "CONFIRMED",
      "ACCEPTED",
    ].includes(supplierStatus)
      ? "CONFIRMED"
      : "SUPPLIER_PENDING";

    await supabaseAdmin
      .from("topup_orders")
      .update({
        status: normalizedStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    return NextResponse.json(
      {
        ok: true,
        orderId,
        orderNumber: orderId,
        supplierOrderId,
        status: normalizedStatus,
        message:
          normalizedStatus === "CONFIRMED"
            ? "La orden fue confirmada por FazerCards."
            : "La orden está pendiente de procesamiento.",
      },
      { status: normalizedStatus === "CONFIRMED" ? 200 : 202 },
    );
  } catch (error) {
    console.error("Error en la API de Delta Force:", error);

    // Si la orden ya existe, no se reembolsa a ciegas:
    // el proveedor podría haber recibido la solicitud.
    if (orderId && supabaseAdmin) {
      await supabaseAdmin
        .from("topup_orders")
        .update({
          status: "SUPPLIER_PENDING",
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);
    }

    return NextResponse.json(
      {
        ok: Boolean(orderId),
        orderId,
        orderNumber: orderId || undefined,
        status: orderId ? "SUPPLIER_PENDING" : "ERROR",
        error: orderId
          ? undefined
          : "No se pudo iniciar la orden.",
        message: orderId
          ? "El resultado de la compra no se pudo confirmar. Revisa el estado antes de repetirla."
          : "Ocurrió un error al procesar la solicitud.",
      },
      { status: orderId ? 202 : 500 },
    );
  }
          }
