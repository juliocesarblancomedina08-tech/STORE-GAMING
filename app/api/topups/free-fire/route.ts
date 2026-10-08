import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

const FAZER_API_BASE =
  process.env.FAZERCARDS_API_URL ||
  "https://api.fzr.cards/api/v2";

const CATEGORY_ID = "free_fire_latam";
const DEFAULT_MARKUP_USD = 0.15;

type FazerOffer = {
  offer_id?: string;
  id?: string;
  name?: string;
  price_usd?: string | number;
  price?: string | number;
};

type FazerField = {
  key?: string;
  label?: string;
  type?: string;
  required?: boolean;
};

function createIdempotencyKey(): string {
  return `ff-${crypto.randomUUID()}`;
}

function normalizePlayerId(value: unknown): string {
  return String(value ?? "").replace(/\D/g, "");
}

function getMarkup(): number {
  const value = Number(
    process.env.TOPUP_MARKUP_USD ?? DEFAULT_MARKUP_USD
  );

  if (!Number.isFinite(value) || value < 0) {
    return DEFAULT_MARKUP_USD;
  }

  return value;
}

function getFazerHeaders(apiKey: string) {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    "X-API-Key": apiKey,
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36",
    Referer: "https://reseller.fazercards.com/",
    Origin: "https://reseller.fazercards.com",
  };
}

async function getLiveOffers(apiKey: string) {
  const response = await fetch(
    `${FAZER_API_BASE}/topups/offers?category_id=${encodeURIComponent(
      CATEGORY_ID
    )}`,
    {
      method: "GET",
      headers: getFazerHeaders(apiKey),
      cache: "no-store",
    }
  );

  let data: any = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      data,
      offers: [] as FazerOffer[],
      fields: [] as FazerField[],
    };
  }

  const offers: FazerOffer[] = Array.isArray(data?.offers)
    ? data.offers
    : Array.isArray(data?.items)
      ? data.items
      : [];

  const fields: FazerField[] = Array.isArray(data?.fields)
    ? data.fields
    : [];

  return {
    ok: true,
    status: response.status,
    data,
    offers,
    fields,
  };
}

function findOffer(offers: FazerOffer[], requestedOfferId: string) {
  const requested = String(requestedOfferId ?? "").trim();
  if (!requested) return null;

  const normalized = requested.startsWith("ff-")
    ? requested.substring(3)
    : requested;

  return (
    offers.find(
      (offer) =>
        String(offer.offer_id ?? offer.id ?? "") === requested
    ) ??
    offers.find(
      (offer) =>
        String(offer.offer_id ?? offer.id ?? "") === normalized
    ) ??
    null
  );
}

function getOfferId(offer: FazerOffer): string {
  return String(offer.offer_id ?? offer.id ?? "").trim();
}

function getOfferName(offer: FazerOffer): string {
  return String(offer.name ?? getOfferId(offer)).trim();
}

function getSupplierPrice(offer: FazerOffer): number {
  const price = Number(offer.price_usd ?? offer.price ?? 0);
  return Number.isFinite(price) && price > 0 ? price : 0;
}

function buildSupplierFields(
  fields: FazerField[],
  playerId: string,
  bodyFields: unknown
) {
  const suppliedFields =
    bodyFields &&
    typeof bodyFields === "object" &&
    !Array.isArray(bodyFields)
      ? (bodyFields as Record<string, unknown>)
      : {};

  const result: Record<string, string> = {};

  for (const field of fields) {
    const key = String(field?.key ?? "").trim();
    if (!key) continue;

    if (key === "player_id") {
      result[key] = playerId;
      continue;
    }

    const supplied = suppliedFields[key];
    if (
      supplied !== undefined &&
      supplied !== null &&
      String(supplied).trim() !== ""
    ) {
      result[key] = String(supplied).trim();
    }
  }

  if (fields.length === 0 && playerId) {
    result.player_id = playerId;
  }

  return result;
}

function getMissingRequiredFields(
  fields: FazerField[],
  supplierFields: Record<string, string>
) {
  return fields
    .filter((field) => field?.required !== false)
    .map((field) => String(field?.key ?? "").trim())
    .filter(Boolean)
    .filter((key) => !supplierFields[key]);
}

export async function POST(request: NextRequest) {
  let createdOrderId: string | null = null;
  let balanceReserved = false;

  try {
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { ok: false, error: "No autorizado." },
        { status: 401 }
      );
    }

    const accessToken = authorization.substring(7).trim();

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(accessToken);

    if (userError || !user) {
      return NextResponse.json(
        { ok: false, error: "Sesión no válida." },
        { status: 401 }
      );
    }

    const fazerApiKey = process.env.FAZERCARDS_API_KEY;

    if (!fazerApiKey) {
      return NextResponse.json(
        { ok: false, error: "Proveedor no configurado." },
        { status: 500 }
      );
    }

    const body = await request.json();

    const offerId = String(body?.offerId ?? "").trim();
    const playerId = normalizePlayerId(body?.playerId);
    const idempotencyKey =
      typeof body?.idempotencyKey === "string" &&
      body.idempotencyKey.trim()
        ? body.idempotencyKey.trim()
        : createIdempotencyKey();

    if (!offerId) {
      return NextResponse.json(
        { ok: false, error: "Debe seleccionar una oferta." },
        { status: 400 }
      );
    }

    if (!playerId || !/^\d{4,20}$/.test(playerId)) {
      return NextResponse.json(
        { ok: false, error: "El ID del jugador no es válido." },
        { status: 400 }
      );
    }

    const liveCatalog = await getLiveOffers(fazerApiKey);

    if (!liveCatalog.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "No se pudo consultar el catálogo actual de Free Fire.",
          supplierStatus: liveCatalog.status,
          supplierResponse: liveCatalog.data,
        },
        { status: 502 }
      );
    }

    if (liveCatalog.offers.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "FazerCards no tiene ofertas disponibles para Free Fire LATAM.",
        },
        { status: 400 }
      );
    }

    const offer = findOffer(liveCatalog.offers, offerId);

    if (!offer) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "La oferta seleccionada ya no está disponible en FazerCards.",
          requestedOfferId: offerId,
        },
        { status: 400 }
      );
    }

    const supplierOfferId = getOfferId(offer);
    const offerName = getOfferName(offer);
    const supplierPrice = getSupplierPrice(offer);

    if (!supplierOfferId || supplierPrice <= 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "La oferta del proveedor no tiene un precio válido.",
        },
        { status: 400 }
      );
    }

    const retailPrice = Number(
      (supplierPrice + getMarkup()).toFixed(4)
    );

    const supplierFields = buildSupplierFields(
      liveCatalog.fields,
      playerId,
      body?.fields
    );

    const missingFields = getMissingRequiredFields(
      liveCatalog.fields,
      supplierFields
    );

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "Faltan datos requeridos para realizar esta recarga.",
          missingFields,
        },
        { status: 400 }
      );
    }

    const { data: existingOrder, error: existingOrderError } =
      await supabaseAdmin
        .from("topup_orders")
        .select(
          "id,status,supplier_order_id,retail_price,offer_id,player_id"
        )
        .eq("user_id", user.id)
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();

    if (existingOrderError) {
      return NextResponse.json(
        {
          ok: false,
          error: "No se pudo comprobar el pedido.",
        },
        { status: 500 }
      );
    }

    if (existingOrder) {
      return NextResponse.json({
        ok: true,
        duplicate: true,
        orderId: existingOrder.id,
        status: existingOrder.status,
        supplierOrderId: existingOrder.supplier_order_id,
      });
    }

    const { data: createdOrder, error: createOrderError } =
      await supabaseAdmin
        .from("topup_orders")
        .insert({
          user_id: user.id,
          game: "Free Fire LATAM",
          category_id: CATEGORY_ID,
          offer_id: offerId,
          offer_name: offerName,
          player_id: playerId,
          retail_price: retailPrice,
          supplier_price: supplierPrice,
          currency: "USD",
          status: "RESERVED",
          idempotency_key: idempotencyKey,
          supplier_fields: supplierFields,
        })
        .select("id")
        .single();

    if (createOrderError || !createdOrder) {
      return NextResponse.json(
        {
          ok: false,
          error: "No se pudo crear el pedido.",
          detail: createOrderError?.message ?? null,
        },
        { status: 500 }
      );
    }

    createdOrderId = createdOrder.id;

    const { error: reserveError } = await supabaseAdmin.rpc(
      "reserve_topup_balance",
      {
        p_user_id: user.id,
        p_amount: retailPrice,
      }
    );

    if (reserveError) {
      await supabaseAdmin
        .from("topup_orders")
        .update({
          status: "CANCELLED",
          updated_at: new Date().toISOString(),
        })
        .eq("id", createdOrderId);

      return NextResponse.json(
        {
          ok: false,
          error:
            reserveError.message === "SALDO INSUFICIENTE"
              ? "Saldo insuficiente."
              : reserveError.message ||
                "No se pudo reservar el saldo.",
        },
        { status: 400 }
      );
    }

    balanceReserved = true;

    await supabaseAdmin
      .from("topup_orders")
      .update({
        status: "PENDING",
        updated_at: new Date().toISOString(),
      })
      .eq("id", createdOrderId);

    const supplierResponse = await fetch(
      `${FAZER_API_BASE}/topups/order`,
      {
        method: "POST",
        headers: {
          ...getFazerHeaders(fazerApiKey),
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          category_id: CATEGORY_ID,
          offer_id: supplierOfferId,
          fields: supplierFields,
        }),
        cache: "no-store",
      }
    );

    let supplierData: any = null;

    try {
      supplierData = await supplierResponse.json();
    } catch {
      supplierData = null;
    }

    if (!supplierResponse.ok) {
      await supabaseAdmin
        .from("topup_orders")
        .update({
          status: "REJECTED",
          supplier_status: "rejected",
          supplier_response: supplierData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", createdOrderId);

      const { error: refundError } = await supabaseAdmin.rpc(
        "refund_topup_balance",
        { p_order_id: createdOrderId }
      );

      if (refundError) {
        console.error("Error devolviendo saldo:", refundError);
      }

      balanceReserved = false;

      return NextResponse.json(
        {
          ok: false,
          error:
            supplierData?.message ||
            supplierData?.error ||
            "FazerCards rechazó el pedido.",
          supplierStatus: supplierResponse.status,
          supplierResponse: supplierData,
        },
        { status: 400 }
      );
    }

    const supplierOrderId =
      supplierData?.order_id ??
      supplierData?.orderId ??
      supplierData?.id ??
      supplierData?.order?.id ??
      supplierData?.data?.order_id ??
      supplierData?.data?.orderId ??
      supplierData?.data?.id ??
      supplierData?.data?.order?.id ??
      null;

    const supplierStatus = String(
      supplierData?.status ??
        supplierData?.order?.status ??
        supplierData?.data?.status ??
        supplierData?.data?.order?.status ??
        "pending"
    ).toLowerCase();

    if (!supplierOrderId) {
      await supabaseAdmin
        .from("topup_orders")
        .update({
          status: "PENDING",
          supplier_status: supplierStatus,
          supplier_response: supplierData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", createdOrderId);

      return NextResponse.json(
        {
          ok: true,
          pending: true,
          orderId: createdOrderId,
          message:
            "Pedido enviado y pendiente de confirmación del proveedor.",
        },
        { status: 202 }
      );
    }

    const completedStatuses = [
      "completed",
      "complete",
      "success",
      "successful",
      "done",
    ];

    if (completedStatuses.includes(supplierStatus)) {
      await supabaseAdmin
        .from("topup_orders")
        .update({
          status: "COMPLETED",
          supplier_order_id: String(supplierOrderId),
          supplier_status: supplierStatus,
          supplier_response: supplierData,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", createdOrderId);

      const { error: completeError } = await supabaseAdmin.rpc(
        "complete_topup_order",
        {
          p_supplier_order_id: String(supplierOrderId),
        }
      );

      if (completeError) {
        console.error("Error completando orden:", completeError);
      }

      balanceReserved = false;

      return NextResponse.json({
        ok: true,
        completed: true,
        orderId: createdOrderId,
        supplierOrderId: String(supplierOrderId),
        status: "COMPLETED",
      });
    }

    const confirmedStatuses = [
      "confirmed",
      "confirmado",
      "confirmada",
    ];

    if (confirmedStatuses.includes(supplierStatus)) {
      await supabaseAdmin
        .from("topup_orders")
        .update({
          status: "CONFIRMED",
          supplier_order_id: String(supplierOrderId),
          supplier_status: supplierStatus,
          supplier_response: supplierData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", createdOrderId);

      const { error: confirmError } = await supabaseAdmin.rpc(
        "confirm_topup_order",
        {
          p_supplier_order_id: String(supplierOrderId),
        }
      );

      if (confirmError) {
        console.error("Error confirmando orden:", confirmError);
      }

      return NextResponse.json(
        {
          ok: true,
          confirmed: true,
          orderId: createdOrderId,
          supplierOrderId: String(supplierOrderId),
          status: "CONFIRMED",
        },
        { status: 202 }
      );
    }

    const failedStatuses = [
      "failed",
      "failure",
      "rejected",
      "cancelled",
      "canceled",
      "error",
    ];

    if (failedStatuses.includes(supplierStatus)) {
      await supabaseAdmin
        .from("topup_orders")
        .update({
          status: "REJECTED",
          supplier_order_id: String(supplierOrderId),
          supplier_status: supplierStatus,
          supplier_response: supplierData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", createdOrderId);

      const { error: refundError } = await supabaseAdmin.rpc(
        "refund_topup_balance",
        { p_order_id: createdOrderId }
      );

      if (refundError) {
        console.error("Error devolviendo saldo:", refundError);
      }

      balanceReserved = false;

      return NextResponse.json(
        {
          ok: false,
          error:
            supplierData?.message ||
            supplierData?.error ||
            "El proveedor rechazó el pedido.",
          orderId: createdOrderId,
          supplierOrderId: String(supplierOrderId),
        },
        { status: 400 }
      );
    }

    await supabaseAdmin
      .from("topup_orders")
      .update({
        status: "PENDING",
        supplier_order_id: String(supplierOrderId),
        supplier_status: supplierStatus,
        supplier_response: supplierData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", createdOrderId);

    return NextResponse.json(
      {
        ok: true,
        pending: true,
        orderId: createdOrderId,
        supplierOrderId: String(supplierOrderId),
        status: "PENDING",
      },
      { status: 202 }
    );
  } catch (error: any) {
    console.error(
      "Error general en /api/topups/free-fire:",
      error
    );

    if (createdOrderId && balanceReserved) {
      try {
        await supabaseAdmin
          .from("topup_orders")
          .update({
            status: "PENDING",
            supplier_status: "unknown",
            updated_at: new Date().toISOString(),
          })
          .eq("id", createdOrderId)
          .in("status", [
            "RESERVED",
            "PENDING",
            "PROCESSING",
            "SUPPLIER_PENDING",
          ]);
      } catch (stateError) {
        console.error(
          "Error actualizando estado después del fallo:",
          stateError
        );
      }
    }

    return NextResponse.json(
      {
        ok: false,
        error:
          error?.message ||
          "No se pudo crear el pedido.",
      },
      { status: 500 }
    );
  }
}
