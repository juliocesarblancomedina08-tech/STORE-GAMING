
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const FAZER_API_BASE = (
  process.env.FAZERCARDS_API_URL ||
  "https://api.fzr.cards/api/v2"
).replace(/\/+$/, "");

const FAZER_API_KEY = process.env.FAZERCARDS_API_KEY;
const FAZERCARDS_ORIGIN = process.env.FAZERCARDS_ORIGIN?.trim();
const CATEGORY_ID = "free_fire_latam";

const supabaseAdmin = createClient(
  SUPABASE_URL || "https://example.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY || "missing-service-role-key",
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

const FREE_FIRE_OFFERS = [
  { id: "ff-110", supplierOfferId: "110_diamonds", name: "110 Diamonds", price: 0.78, supplierPrice: 0.6871 },
  { id: "ff-341", supplierOfferId: "341_diamonds", name: "341 Diamonds", price: 2.2094, supplierPrice: 2.0594 },
  { id: "ff-572", supplierOfferId: "572_diamonds", name: "572 Diamonds", price: 3.6429, supplierPrice: 3.4929 },
  { id: "ff-1166", supplierOfferId: "1166_diamonds", name: "1166 Diamonds", price: 6.631, supplierPrice: 6.481 },
  { id: "ff-2398", supplierOfferId: "2398_diamonds", name: "2398 Diamonds", price: 13.011, supplierPrice: 12.861 },
  { id: "ff-6160", supplierOfferId: "6160_diamantes", name: "6160 Diamonds", price: 32.8881, supplierPrice: 32.7381 },
  { id: "ff-210", supplierOfferId: "210_diamantes", name: "210 Diamonds", price: 2.0945, supplierPrice: 1.9445 },
  { id: "ff-530", supplierOfferId: "530_diamantes", name: "530 Diamonds", price: 5.0162, supplierPrice: 4.8662 },
  { id: "ff-1080", supplierOfferId: "1080_diamantes", name: "1080 Diamonds", price: 9.8724, supplierPrice: 9.7224 },
  { id: "ff-2200", supplierOfferId: "2200_diamantes", name: "2200 Diamonds", price: 19.5948, supplierPrice: 19.4448 },
  { id: "ff-weekly-lite", supplierOfferId: "weekly_lite", name: "Semanal Lite", price: 0.6538, supplierPrice: 0.5038 },
  { id: "ff-weekly-membership", supplierOfferId: "membresía_semanal", name: "Membresía semanal", price: 2.3282, supplierPrice: 2.1782 },
  { id: "ff-elite-pass", supplierOfferId: "booyah_pass", name: "Booyah Pass", price: 4.0138, supplierPrice: 3.8638 },
  { id: "ff-monthly-membership", supplierOfferId: "membresía_mensual", name: "Membresía mensual", price: 10.632, supplierPrice: 10.482 },
  { id: "ff-100", supplierOfferId: "100_diamantes", name: "100 Diamonds", price: 1.1273, supplierPrice: 0.9773 },
] as const;

type GenericObject = Record<string, any>;

function isObject(value: unknown): value is GenericObject {
  return value !== null &&
    typeof value === "object" &&
    !Array.isArray(value);
}

function extractSupplierOrderId(result: unknown): string {
  if (!isObject(result)) return "";

  const data = isObject(result.data) ? result.data : {};
  const order = isObject(result.order) ? result.order : {};
  const dataOrder = isObject(data.order) ? data.order : {};

  const candidates = [
    order.id,
    dataOrder.id,
    result.order_id,
    result.orderId,
    data.order_id,
    data.orderId,
    data.id,
    result.id,
  ];

  for (const candidate of candidates) {
    if (typeof candidate !== "string" && typeof candidate !== "number") {
      continue;
    }

    const id = String(candidate).trim();

    if (/^ord-[A-Za-z0-9_-]+$/.test(id)) {
      return id;
    }
  }

  return "";
}

function extractSupplierStatus(result: unknown): string {
  if (!isObject(result)) return "PENDING";

  const data = isObject(result.data) ? result.data : {};
  const order = isObject(result.order) ? result.order : {};
  const dataOrder = isObject(data.order) ? data.order : {};

  return String(
    order.status ??
    dataOrder.status ??
    result.status ??
    data.status ??
    "PENDING"
  ).trim().toUpperCase();
}

function findLocalOffer(offerId: string) {
  return FREE_FIRE_OFFERS.find(
    (offer) => offer.id === offerId ||
      offer.supplierOfferId === offerId
  );
}

async function getUserFromRequest(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) return null;

  const token = authorization.substring(7).trim();
  if (!token) return null;

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) return null;
  return user;
}

async function updateOrder(
  orderId: string,
  values: GenericObject
): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from("topup_orders")
    .update({
      ...values,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    throw new Error(
      `No se pudo guardar la orden ${orderId}: ${
        error?.message || "Supabase no devolvió la orden actualizada."
      }`
    );
  }
}

async function savePendingSafely(
  orderId: string,
  response?: unknown,
  reason?: string
) {
  const values: GenericObject = {
    status: "SUPPLIER_PENDING",
  };

  if (response !== undefined) {
    values.supplier_response = {
      response,
      requires_reconciliation: true,
      reason: reason || "PROVIDER_RESULT_UNCERTAIN",
      saved_at: new Date().toISOString(),
    };
  }

  await updateOrder(orderId, values);
}

async function refundAndVerify(orderId: string) {
  const { error } = await supabaseAdmin.rpc(
    "refund_topup_balance",
    { p_order_id: orderId }
  );

  if (error) {
    throw new Error(`Error solicitando reembolso: ${error.message}`);
  }

  const { data, error: verifyError } = await supabaseAdmin
    .from("topup_orders")
    .select("status, refunded_at")
    .eq("id", orderId)
    .maybeSingle();

  if (
    verifyError ||
    !data ||
    String(data.status).toUpperCase() !== "REFUNDED" ||
    !data.refunded_at
  ) {
    throw new Error(
      `No se pudo verificar el reembolso de la orden ${orderId}.`
    );
  }
}

export async function POST(request: NextRequest) {
  let orderId: string | null = null;
  let providerRequestStarted = false;
  let providerResponseReceived = false;
  let providerResponseBody: unknown = undefined;

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Faltan variables de entorno de Supabase.");
      return NextResponse.json(
        { ok: false, error: "Supabase no está configurado en el servidor." },
        { status: 500 }
      );
    }

    if (!FAZER_API_KEY) {
      console.error("Falta FAZERCARDS_API_KEY.");
      return NextResponse.json(
        { ok: false, error: "Falta configurar FazerCards en el servidor." },
        { status: 500 }
      );
    }

    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "No autorizado." },
        { status: 401 }
      );
    }

    let body: GenericObject;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { ok: false, error: "El cuerpo de la solicitud no es JSON válido." },
        { status: 400 }
      );
    }

    const offerId = String(body.offerId ?? "").trim();
    const playerId = String(body.playerId ?? "").trim();

    if (!offerId) {
      return NextResponse.json(
        { ok: false, error: "Falta seleccionar una oferta." },
        { status: 400 }
      );
    }

    if (!playerId) {
      return NextResponse.json(
        { ok: false, error: "Debe introducir el ID del jugador." },
        { status: 400 }
      );
    }

    const localOffer = findLocalOffer(offerId);

    if (!localOffer) {
      return NextResponse.json(
        {
          ok: false,
          error: "La oferta de Free Fire no existe en STORE GAMING.",
          receivedOfferId: offerId,
        },
        { status: 400 }
      );
    }

    const retailPrice = Number(localOffer.price);

    if (!Number.isFinite(retailPrice) || retailPrice <= 0) {
      return NextResponse.json(
        { ok: false, error: "El precio de la oferta no es válido." },
        { status: 400 }
      );
    }

    // Reservar saldo.
    const { error: reserveError } = await supabaseAdmin.rpc(
      "store_gaming_reserve_balance",
      {
        p_user_id: user.id,
        p_amount: retailPrice,
      }
    );

    if (reserveError) {
      console.error("Error reservando saldo:", reserveError);
      return NextResponse.json(
        {
          ok: false,
          error: reserveError.message || "No se pudo reservar el saldo.",
        },
        { status: 400 }
      );
    }

    const idempotencyKey = randomUUID();

    // Crear la orden local.
    const { data: createdOrder, error: orderError } = await supabaseAdmin
      .from("topup_orders")
      .insert({
        user_id: user.id,
        username:
          user.user_metadata?.username ||
          user.user_metadata?.name ||
          user.email ||
          "Cliente",
        email: user.email,
        game: "Free Fire LATAM",
        category_id: CATEGORY_ID,
        offer_id: localOffer.id,
        offer_name: localOffer.name,
        player_id: playerId,
        retail_price: retailPrice,
        supplier_price: Number(localOffer.supplierPrice),
        currency: "USD",
        status: "RESERVED",
        idempotency_key: idempotencyKey,
        supplier_fields: {
          player_id: playerId,
          supplier_offer_id: localOffer.supplierOfferId,
        },
      })
      .select("id")
      .single();

    if (orderError || !createdOrder) {
      console.error("Error creando topup_order:", orderError);

      // La orden no se creó y no se ha enviado la compra al proveedor.
      const { error: refundError } = await supabaseAdmin.rpc(
        "store_gaming_admin_adjust_balance",
        {
          p_user_id: user.id,
          p_amount: retailPrice,
          p_action: "REFUND",
        }
      );

      if (refundError) {
        console.error(
          "No se pudo devolver la reserva tras fallar la creación:",
          refundError
        );
      }

      return NextResponse.json(
        {
          ok: false,
          error: refundError
            ? "No se creó la orden y la devolución necesita revisión administrativa."
            : orderError?.message || "No se pudo crear la orden.",
        },
        { status: 500 }
      );
    }

    orderId = createdOrder.id;

    await updateOrder(orderId, { status: "PROCESSING" });

    const fazerPayload = {
      category_id: CATEGORY_ID,
      offer_id: localOffer.supplierOfferId,
      fields: { player_id: playerId },
    };

    const headers: Record<string, string> = {
      "X-API-Key": FAZER_API_KEY,
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    if (FAZERCARDS_ORIGIN) {
      try {
        headers.Origin = new URL(FAZERCARDS_ORIGIN).origin;
      } catch {
        await savePendingSafely(
          orderId,
          { error: "FAZERCARDS_ORIGIN no es una URL válida." },
          "INVALID_PROVIDER_ORIGIN"
        );

        return NextResponse.json(
          {
            ok: false,
            orderId,
            status: "SUPPLIER_PENDING",
            message: "La configuración del origen requiere revisión.",
          },
          { status: 202 }
        );
      }
    }

    console.info("Enviando orden de Free Fire a FazerCards", {
      orderId,
      offerId: localOffer.id,
      categoryId: CATEGORY_ID,
    });

    // Desde que comienza fetch, un timeout o error de red puede dejar
    // incierto si FazerCards recibió la petición. No se debe repetir sola.
    providerRequestStarted = true;

    const response = await fetch(`${FAZER_API_BASE}/topups/order`, {
      method: "POST",
      headers,
      body: JSON.stringify(fazerPayload),
      cache: "no-store",
      signal: AbortSignal.timeout(25000),
    });

    const responseText = await response.text();
    let result: unknown;

    try {
      result = responseText ? JSON.parse(responseText) : {};
    } catch {
      result = { raw: responseText };
    }

    providerResponseReceived = true;
    providerResponseBody = result;

    const supplierId = extractSupplierOrderId(result);
    const supplierStatus = extractSupplierStatus(result);
    const now = new Date().toISOString();

    console.info("Respuesta de FazerCards recibida", {
      orderId,
      httpStatus: response.status,
      hasValidSupplierId: Boolean(supplierId),
      supplierStatus,
    });

    // Respuestas HTTP no exitosas.
    if (!response.ok) {
      const ambiguous =
        response.status === 408 ||
        response.status === 425 ||
        response.status === 429 ||
        response.status >= 500;

      const values: GenericObject = {
        supplier_response: result,
        status: ambiguous ? "SUPPLIER_PENDING" : "FAILED",
      };

      if (supplierId) values.supplier_order_id = supplierId;
      if (!ambiguous) values.failed_at = now;

      await updateOrder(orderId, values);

      if (ambiguous) {
        return NextResponse.json(
          {
            ok: true,
            orderId,
            supplierOrderId: supplierId || null,
            status: "SUPPLIER_PENDING",
            message:
              "La respuesta no confirma el resultado final. No repitas la compra; se requiere verificación.",
          },
          { status: 202 }
        );
      }

      // Solo reembolsar ante un rechazo HTTP definitivo sin ID de orden.
      // Si el proveedor devolvió un ID, se deja pendiente para verificarlo.
      if (supplierId) {
        await updateOrder(orderId, {
          status: "SUPPLIER_PENDING",
        });

        return NextResponse.json(
          {
            ok: true,
            orderId,
            supplierOrderId: supplierId,
            status: "SUPPLIER_PENDING",
            message:
              "El proveedor devolvió un identificador pese al error HTTP. La orden requiere verificación antes de cualquier reembolso.",
          },
          { status: 202 }
        );
      }

      await refundAndVerify(orderId);

      return NextResponse.json(
        {
          ok: false,
          orderId,
          status: "REFUNDED",
          message: "FazerCards rechazó la solicitud y se verificó la devolución.",
        },
        { status: 400 }
      );
    }

    // Respuesta HTTP exitosa pero sin un ID válido: guardar la respuesta
    // y no reintentar la compra automáticamente.
    if (!supplierId) {
      await updateOrder(orderId, {
        status: "SUPPLIER_PENDING",
        supplier_response: {
          response: result,
          requires_reconciliation: true,
          reason: "MISSING_OR_INVALID_SUPPLIER_ORDER_ID",
          saved_at: now,
        },
      });

      return NextResponse.json(
        {
          ok: true,
          orderId,
          status: "SUPPLIER_PENDING",
          message:
            "FazerCards respondió, pero falta un ID válido. No repitas la compra; requiere revisión.",
        },
        { status: 202 }
      );
    }

    // Guardar y verificar el ID antes de procesar cualquier estado.
    await updateOrder(orderId, {
      supplier_order_id: supplierId,
      supplier_response: result,
    });

    const { data: savedOrder, error: verifyIdError } = await supabaseAdmin
      .from("topup_orders")
      .select("supplier_order_id")
      .eq("id", orderId)
      .maybeSingle();

    if (
      verifyIdError ||
      !savedOrder ||
      savedOrder.supplier_order_id !== supplierId
    ) {
      console.error("No se pudo verificar el ID guardado:", {
        orderId,
        supplierId,
        error: verifyIdError,
      });

      return NextResponse.json(
        {
          ok: true,
          orderId,
          supplierOrderId: supplierId,
          status: "SUPPLIER_PENDING",
          message:
            "FazerCards devolvió un ID, pero no se pudo verificar el guardado. No repitas la compra.",
        },
        { status: 202 }
      );
    }

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
      const { error: completeError } = await supabaseAdmin.rpc(
        "complete_topup_order",
        { p_supplier_order_id: supplierId }
      );

      if (completeError) {
        console.error("Error completando orden:", completeError);

        await updateOrder(orderId, { status: "SUPPLIER_PENDING" });

        return NextResponse.json(
          {
            ok: true,
            orderId,
            supplierOrderId: supplierId,
            status: "SUPPLIER_PENDING",
            message:
              "El proveedor indica que terminó, pero STORE GAMING debe reconciliar el estado.",
          },
          { status: 202 }
        );
      }

      const { data: finalOrder, error: finalError } = await supabaseAdmin
        .from("topup_orders")
        .select("status, refunded_at")
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
            supplierOrderId: supplierId,
            status: "SUPPLIER_PENDING",
            message:
              "La finalización necesita verificación mediante la reconciliación.",
          },
          { status: 202 }
        );
      }

      return NextResponse.json({
        ok: true,
        orderId,
        supplierOrderId: supplierId,
        status: "COMPLETED",
        message: "Recarga completada correctamente.",
      });
    }

    if (supplierStatus === "REFUND_FAILED") {
      await updateOrder(orderId, {
        status: "SUPPLIER_PENDING",
        supplier_response: {
          response: result,
          normalized_status: supplierStatus,
          requires_reconciliation: true,
        },
      });

      return NextResponse.json(
        {
          ok: true,
          orderId,
          supplierOrderId: supplierId,
          status: "SUPPLIER_PENDING",
          message:
            "El proveedor informó REFUND_FAILED. No se hizo un reembolso automático.",
        },
        { status: 202 }
      );
    }

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
      // La orden ya tiene ID de proveedor: el cron debe consultar el estado
      // real antes de devolver el saldo, evitando reembolsos por estados
      // que pudieran ser transitorios o tener un significado distinto.
      await updateOrder(orderId, {
        status: "SUPPLIER_PENDING",
        supplier_response: {
          response: result,
          reported_status: supplierStatus,
          requires_reconciliation: true,
        },
      });

      return NextResponse.json(
        {
          ok: true,
          orderId,
          supplierOrderId: supplierId,
          status: "SUPPLIER_PENDING",
          message:
            "El proveedor informó un estado de fallo. Se verificará mediante reconciliación antes de devolver el saldo.",
        },
        { status: 202 }
      );
    }

    const nextStatus = ["CONFIRMED", "ACCEPTED"].includes(supplierStatus)
      ? "CONFIRMED"
      : supplierStatus === "PROCESSING"
        ? "PROCESSING"
        : "SUPPLIER_PENDING";

    await updateOrder(orderId, { status: nextStatus });

    return NextResponse.json(
      {
        ok: true,
        orderId,
        supplierOrderId: supplierId,
        status: nextStatus,
        message:
          "La orden quedó registrada y se verificará su estado con FazerCards.",
      },
      { status: 202 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);

    console.error("Free Fire API error:", {
      orderId,
      providerRequestStarted,
      providerResponseReceived,
      message,
    });

    if (orderId) {
      try {
        if (providerResponseReceived) {
          // La respuesta se recibió, pero un guardado posterior pudo fallar.
          // Guardamos la respuesta disponible y dejamos la orden pendiente.
          await savePendingSafely(
            orderId,
            providerResponseBody,
            "ERROR_AFTER_PROVIDER_RESPONSE"
          );
        } else if (providerRequestStarted) {
          // Timeout/error de red después de iniciar la petición:
          // no se puede saber con seguridad si el proveedor la recibió.
          await savePendingSafely(
            orderId,
            undefined,
            "PROVIDER_REQUEST_RESULT_UNKNOWN"
          );
        } else {
          // No se inició la petición al proveedor. No reembolsamos aquí
          // automáticamente: se conserva la orden para revisión segura.
          await savePendingSafely(
            orderId,
            { error: message },
            "ERROR_BEFORE_PROVIDER_REQUEST"
          );
        }
      } catch (saveError) {
        console.error(
          "No se pudo guardar el estado pendiente:",
          orderId,
          saveError
        );
      }

      return NextResponse.json(
        {
          ok: false,
          orderId,
          status: "SUPPLIER_PENDING",
          message:
            "No se pudo confirmar el resultado. No repitas la compra; revisa la orden antes de actuar.",
        },
        { status: 202 }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        status: "ERROR",
        message: "No se pudo iniciar la orden.",
      },
      { status: 500 }
    );
  }
}
