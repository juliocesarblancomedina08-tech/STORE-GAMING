import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

function normalizeBaseUrl(value: string): string {
  let result = value.trim();

  while (result.endsWith("/")) {
    result = result.slice(0, -1);
  }

  return result;
}

const FAZER_API_BASE = normalizeBaseUrl(
  process.env.FAZERCARDS_API_URL ||
    "https://api.fzr.cards/api/v2"
);

const FAZER_API_KEY = process.env.FAZERCARDS_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const CATEGORY_ID = "roblox_global";
const PROFIT_PER_UNIT = 0.25;
const MAX_QUANTITY = 100;

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function getNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  return 0;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;

  try {
    return JSON.stringify(error);
  } catch {
    return "Error desconocido";
  }
}

function getNestedObjects(data: unknown): JsonObject[] {
  if (Array.isArray(data)) {
    return data.filter(isObject);
  }

  if (!isObject(data)) return [];

  const candidates = [
    data.cards,
    data.offers,
    data.results,
    isObject(data.data) ? data.data.cards : undefined,
    isObject(data.data) ? data.data.offers : undefined,
    isObject(data.data) ? data.data.results : undefined,
    data.data,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter(isObject);
    }
  }

  return [];
}

function getSupplierOrderId(data: unknown): string {
  if (!isObject(data)) return "";

  const direct = [
    data.order_id,
    data.orderId,
    data.id,
    data.reference,
  ];

  for (const value of direct) {
    const text = getText(value);
    if (text) return text;
  }

  if (isObject(data.data)) {
    return getSupplierOrderId(data.data);
  }

  if (isObject(data.order)) {
    return getSupplierOrderId(data.order);
  }

  return "";
}

function getSupplierStatus(data: unknown): string {
  if (!isObject(data)) return "";

  const direct = [
    data.status,
    data.order_status,
    data.orderStatus,
  ];

  for (const value of direct) {
    const text = getText(value);
    if (text) return text.toLowerCase();
  }

  if (isObject(data.data)) {
    return getSupplierStatus(data.data);
  }

  if (isObject(data.order)) {
    return getSupplierStatus(data.order);
  }

  return "";
}

function getGiftCodes(data: unknown): unknown[] {
  if (!isObject(data)) return [];

  const candidates = [
    data.codes,
    data.gift_codes,
    data.giftCodes,
    data.serials,
    data.keys,
    data.items,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate.length > 0) {
      return candidate;
    }
  }

  if (isObject(data.data)) {
    return getGiftCodes(data.data);
  }

  if (isObject(data.order)) {
    return getGiftCodes(data.order);
  }

  return [];
}

async function readResponse(response: Response): Promise<unknown> {
  const raw = await response.text();

  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch {
    return { raw };
  }
}

async function fazerCardsRequest(
  endpoint: string,
  method: "GET" | "POST",
  body?: JsonObject
) {
  if (!FAZER_API_KEY) {
    throw new Error("Falta configurar FAZERCARDS_API_KEY en Vercel.");
  }

  const response = await fetch(`${FAZER_API_BASE}${endpoint}`, {
    method,
    headers: {
      "X-API-Key": FAZER_API_KEY,
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": "STORE-GAMING/1.0",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    cache: "no-store",
    signal: AbortSignal.timeout(25000),
  });

  const data = await readResponse(response);

  return {
    ok: response.ok,
    status: response.status,
    data,
  };
}

export async function POST(request: NextRequest) {
  let orderId = "";
  let supabaseAdmin:
    | ReturnType<typeof createClient>
    | null = null;

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        {
          ok: false,
          error: "Falta configurar Supabase en las variables de Vercel.",
        },
        { status: 500 }
      );
    }

    if (!FAZER_API_KEY) {
      return NextResponse.json(
        {
          ok: false,
          error: "Falta configurar FAZERCARDS_API_KEY en Vercel.",
        },
        { status: 500 }
      );
    }

    const authorization = request.headers.get("authorization") || "";
    const tokenMatch = authorization.match(/^Bearer\s+(.+)$/i);
    const token = tokenMatch?.[1]?.trim();

    if (!token) {
      return NextResponse.json(
        { ok: false, error: "Debes iniciar sesión para comprar." },
        { status: 401 }
      );
    }

    supabaseAdmin = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const {
      data: authData,
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    const user = authData?.user;

    if (authError || !user) {
      return NextResponse.json(
        { ok: false, error: "La sesión no es válida o ha caducado." },
        { status: 401 }
      );
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { ok: false, error: "El cuerpo de la solicitud no es JSON válido." },
        { status: 400 }
      );
    }

    if (!isObject(body)) {
      return NextResponse.json(
        { ok: false, error: "Solicitud inválida." },
        { status: 400 }
      );
    }

    const cardId = getText(body.card_id ?? body.cardId);
    const quantity = Number(body.quantity ?? 1);
    const idempotencyKey = getText(body.idempotency_key);

    if (!cardId) {
      return NextResponse.json(
        { ok: false, error: "Falta card_id." },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > MAX_QUANTITY
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: `La cantidad debe ser un número entero entre 1 y ${MAX_QUANTITY}.`,
        },
        { status: 400 }
      );
    }

    if (
      !idempotencyKey ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        idempotencyKey
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "Falta una idempotency_key válida. Vuelve a iniciar la compra.",
        },
        { status: 400 }
      );
    }

    // Leer únicamente columnas que existen en public.profiles.
    const {
      data: profile,
      error: profileError,
    } = await supabaseAdmin
      .from("profiles")
      .select("id, email, balance")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("[STORE GAMING] Error leyendo perfil:", {
        code: profileError.code,
        message: profileError.message,
      });

      return NextResponse.json(
        { ok: false, error: "No se pudo consultar tu perfil." },
        { status: 500 }
      );
    }

    if (!profile) {
      return NextResponse.json(
        {
          ok: false,
          error: "No se encontró tu perfil de STORE GAMING.",
        },
        { status: 404 }
      );
    }

    const email =
      getText(profile.email) || getText(user.email);

    // No se presupone que exista un campo username en profiles.
    const metadata = isObject(user.user_metadata)
      ? user.user_metadata
      : {};

    const username =
      getText(metadata.username) ||
      getText(metadata.full_name) ||
      getText(metadata.name) ||
      email ||
      user.id;

    // Consultar la oferta actual al proveedor antes de reservar saldo.
    const catalog = await fazerCardsRequest(
      `/giftcards/cards?category_id=${encodeURIComponent(CATEGORY_ID)}`,
      "GET"
    );

    if (!catalog.ok) {
      console.error("[STORE GAMING] Error consultando catálogo FazerCards:", {
        status: catalog.status,
        data: catalog.data,
      });

      return NextResponse.json(
        {
          ok: false,
          error: "FazerCards no permitió consultar las ofertas.",
          supplier_status: catalog.status,
        },
        { status: 502 }
      );
    }

    const cards = getNestedObjects(catalog.data);

    const selectedCard = cards.find((card) => {
      const possibleIds = [
        card.card_id,
        card.cardId,
        card.offer_id,
        card.offerId,
        card.id,
      ];

      return possibleIds.some(
        (value) => getText(value) === cardId
      );
    });

    if (!selectedCard) {
      return NextResponse.json(
        {
          ok: false,
          error: "La tarjeta seleccionada ya no está disponible en FazerCards.",
        },
        { status: 409 }
      );
    }

    const supplierUnitPrice = getNumber(
      selectedCard.price_usd ??
        selectedCard.price ??
        selectedCard.cost
    );

    if (supplierUnitPrice <= 0) {
      console.error("[STORE GAMING] Precio de proveedor inválido:", {
        cardId,
        selectedCard,
      });

      return NextResponse.json(
        {
          ok: false,
          error: "FazerCards devolvió un precio inválido para esta tarjeta.",
        },
        { status: 502 }
      );
    }

    const retailUnitPrice = Number(
      (supplierUnitPrice + PROFIT_PER_UNIT).toFixed(2)
    );

    const retailTotal = Number(
      (retailUnitPrice * quantity).toFixed(2)
    );

    const supplierTotal = Number(
      (supplierUnitPrice * quantity).toFixed(2)
    );

    const offerName =
      getText(selectedCard.name) ||
      getText(selectedCard.offer_name) ||
      getText(selectedCard.title) ||
      `Roblox Global ${cardId}`;

    // Reservar/deducir el saldo y crear la orden de forma atómica.
    const {
      data: reservationData,
      error: reservationError,
    } = await supabaseAdmin.rpc(
      "create_gift_card_order_and_reserve_balance",
      {
        p_user_id: user.id,
        p_username: username,
        p_email: email,
        p_category_id: CATEGORY_ID,
        p_card_id: cardId,
        p_offer_name: offerName,
        p_quantity: quantity,
        p_retail_price: retailTotal,
        p_supplier_price: supplierTotal,
        p_idempotency_key: idempotencyKey,
      }
    );

    if (reservationError) {
      console.error("[STORE GAMING] Error reservando saldo:", {
        code: reservationError.code,
        message: reservationError.message,
      });

      return NextResponse.json(
        {
          ok: false,
          error: "No se pudo crear el pedido ni reservar el saldo.",
        },
        { status: 500 }
      );
    }

    const reservation = Array.isArray(reservationData)
      ? reservationData[0]
      : reservationData;

    if (!isObject(reservation)) {
      console.error(
        "[STORE GAMING] Respuesta inesperada de la reserva:",
        reservationData
      );

      return NextResponse.json(
        {
          ok: false,
          error: "La reserva de saldo devolvió una respuesta inesperada.",
        },
        { status: 500 }
      );
    }

    orderId = getText(
      reservation.order_id ??
        reservation.id ??
        reservation.gift_card_order_id
    );

    if (!orderId) {
      console.error(
        "[STORE GAMING] La reserva no devolvió order_id:",
        reservationData
      );

      return NextResponse.json(
        {
          ok: false,
          error: "No se pudo identificar el pedido reservado.",
        },
        { status: 500 }
      );
    }

    const created =
      reservation.created === true ||
      reservation.is_new === true;

    // Si el RPC devuelve una orden preexistente, nunca volver a enviarla.
    if (!created) {
      const { data: existingOrder, error: existingError } =
        await supabaseAdmin
          .from("gift_card_orders")
          .select(
            "id, status, supplier_order_id, gift_codes, retail_price, quantity"
          )
          .eq("id", orderId)
          .maybeSingle();

      if (existingError) {
        console.error(
          "[STORE GAMING] Error leyendo orden idempotente:",
          existingError.message
        );
      }

      return NextResponse.json(
        {
          ok: true,
          duplicate: true,
          message:
            "Esta solicitud ya fue procesada. No se envió otra compra al proveedor.",
          order: existingOrder || { id: orderId },
        },
        { status: 200 }
      );
    }

    // Enviar una sola vez la compra al proveedor.
    let supplierResult: {
      ok: boolean;
      status: number;
      data: unknown;
    };

    try {
      supplierResult = await fazerCardsRequest(
        "/giftcards/order",
        "POST",
        {
          category_id: CATEGORY_ID,
          card_id: cardId,
          quantity,
        }
      );
    } catch (supplierNetworkError) {
      // Un timeout no demuestra que el proveedor no haya creado la orden.
      // Se conserva pendiente y NO se reintenta automáticamente.
      console.error("[STORE GAMING] Resultado incierto al enviar pedido:", {
        orderId,
        error: getErrorMessage(supplierNetworkError),
      });

      await supabaseAdmin
        .from("gift_card_orders")
        .update({
          status: "SUPPLIER_PENDING",
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      return NextResponse.json(
        {
          ok: false,
          pending: true,
          order_id: orderId,
          error:
            "No pudimos confirmar la respuesta de FazerCards. El pedido queda pendiente de conciliación para evitar una compra duplicada.",
        },
        { status: 202 }
      );
    }

    const supplierData = supplierResult.data;
    const supplierOrderId = getSupplierOrderId(supplierData);
    const supplierStatus = getSupplierStatus(supplierData);
    const giftCodes = getGiftCodes(supplierData);

    console.info("[STORE GAMING] Respuesta de FazerCards:", {
      orderId,
      supplierOrderId: supplierOrderId || null,
      httpStatus: supplierResult.status,
      supplierStatus: supplierStatus || null,
      hasCodes: giftCodes.length > 0,
      supplierOk: supplierResult.ok,
    });

    if (!supplierResult.ok) {
      // Guardamos el resultado para investigar antes de reintentar.
      await supabaseAdmin
        .from("gift_card_orders")
        .update({
          status: "SUPPLIER_PENDING",
          supplier_order_id: supplierOrderId || null,
          supplier_response: supplierData as never,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      return NextResponse.json(
        {
          ok: false,
          pending: true,
          order_id: orderId,
          supplier_status: supplierResult.status,
          error:
            "FazerCards no confirmó la compra. El pedido queda pendiente de revisión.",
        },
        { status: 202 }
      );
    }

    const failedStatuses = [
      "failed",
      "failure",
      "error",
      "cancelled",
      "canceled",
      "rejected",
    ];

    if (failedStatuses.includes(supplierStatus)) {
      await supabaseAdmin
        .from("gift_card_orders")
        .update({
          status: "SUPPLIER_PENDING",
          supplier_order_id: supplierOrderId || null,
          supplier_response: supplierData as never,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      return NextResponse.json(
        {
          ok: false,
          pending: true,
          order_id: orderId,
          error:
            "FazerCards devolvió un estado de fallo. Se requiere revisar el resultado antes de reembolsar o reintentar.",
        },
        { status: 202 }
      );
    }

    const completedStatuses = [
      "completed",
      "complete",
      "success",
      "successful",
      "delivered",
    ];

    const supplierCompleted =
      completedStatuses.includes(supplierStatus);

    if (giftCodes.length > 0 || supplierCompleted) {
      const updateData: JsonObject = {
        status: "COMPLETED",
        supplier_order_id: supplierOrderId || null,
        supplier_response: supplierData,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (giftCodes.length > 0) {
        updateData.gift_codes = giftCodes;
      }

      const { error: updateError } = await supabaseAdmin
        .from("gift_card_orders")
        .update(updateData as never)
        .eq("id", orderId);

      if (updateError) {
        console.error(
          "[STORE GAMING] Error guardando resultado completado:",
          updateError.message
        );

        return NextResponse.json(
          {
            ok: false,
            pending: true,
            order_id: orderId,
            supplier_order_id: supplierOrderId || null,
            error:
              "FazerCards respondió, pero STORE GAMING no pudo guardar el resultado. No repitas la compra.",
          },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          ok: true,
          order_id: orderId,
          supplier_order_id: supplierOrderId || null,
          status: "COMPLETED",
          quantity,
          total: retailTotal,
          gift_codes: giftCodes,
          message: "FazerCards confirmó el pedido.",
        },
        { status: 200 }
      );
    }

    // Si el proveedor aceptó la solicitud pero aún no completó la entrega.
    const { error: pendingUpdateError } = await supabaseAdmin
      .from("gift_card_orders")
      .update({
        status: "SUPPLIER_PENDING",
        supplier_order_id: supplierOrderId || null,
        supplier_response: supplierData as never,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (pendingUpdateError) {
      console.error(
        "[STORE GAMING] Error guardando orden pendiente:",
        pendingUpdateError.message
      );
    }

    return NextResponse.json(
      {
        ok: true,
        pending: true,
        order_id: orderId,
        supplier_order_id: supplierOrderId || null,
        status: "SUPPLIER_PENDING",
        message:
          "FazerCards recibió la solicitud, pero todavía no confirmó la entrega. El pedido debe revisarse mediante la ruta de conciliación.",
      },
      { status: 202 }
    );
  } catch (error) {
    console.error("[STORE GAMING] Error en ruta de compra:", {
      orderId: orderId || null,
      message: getErrorMessage(error),
    });

    // Si ya se creó una orden, no la reenviamos ni reembolsamos
    // automáticamente: el resultado del proveedor podría ser incierto.
    if (orderId && supabaseAdmin) {
      await supabaseAdmin
        .from("gift_card_orders")
        .update({
          status: "SUPPLIER_PENDING",
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);
    }

    return NextResponse.json(
      {
        ok: false,
        pending: Boolean(orderId),
        order_id: orderId || null,
        error: orderId
          ? "No se pudo confirmar el resultado. El pedido requiere conciliación; no repitas la compra."
          : "Ocurrió un error al preparar el pedido.",
      },
      { status: orderId ? 202 : 500 }
    );
  }
}
