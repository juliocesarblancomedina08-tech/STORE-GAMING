cat > app/api/topups/fc-mobile-id/route.ts <<'EOF'
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import {
  fcMobileIdGame,
  FcMobileIdOffer,
} from "../../../../lib/games/fc-mobile-id";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const FAZER_API_BASE =
  process.env.FAZERCARDS_API_URL ||
  "https://api.fzr.cards/api/v2";

const CATEGORY_ID = "eafc_mobile_id";

function jsonError(
  message: string,
  status = 400,
  extra: Record<string, unknown> = {}
) {
  return NextResponse.json(
    {
      ok: false,
      error: message,
      ...extra,
    },
    { status }
  );
}

function getBearerToken(request: NextRequest) {
  const authorization =
    request.headers.get("authorization");

  if (!authorization) {
    return null;
  }

  if (
    !authorization
      .toLowerCase()
      .startsWith("bearer ")
  ) {
    return null;
  }

  return authorization
    .slice(7)
    .trim() || null;
}

function normalizeIdempotencyKey(
  value: string | null
) {
  if (!value) {
    return null;
  }

  const clean = value.trim();

  if (!clean) {
    return null;
  }

  return clean.slice(0, 255);
}

function getSupplierOrderId(
  data: any
): string | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const candidates = [
    data.order_id,
    data.orderId,
    data.supplier_order_id,
    data.supplierOrderId,
    data.id,
    data.data?.order_id,
    data.data?.orderId,
    data.data?.supplier_order_id,
    data.data?.supplierOrderId,
    data.data?.id,
  ];

  for (const value of candidates) {
    if (
      typeof value === "string" &&
      value.trim()
    ) {
      return value.trim();
    }

    if (
      typeof value === "number" &&
      Number.isFinite(value)
    ) {
      return String(value);
    }
  }

  return null;
}

function getSupplierStatus(
  data: any
): string {
  if (!data || typeof data !== "object") {
    return "";
  }

  const value =
    data.status ??
    data.order_status ??
    data.orderStatus ??
    data.data?.status ??
    data.data?.order_status ??
    data.data?.orderStatus ??
    "";

  return String(value)
    .trim()
    .toLowerCase();
}

function isSuccessfulSupplierStatus(
  status: string
) {
  return [
    "success",
    "successful",
    "completed",
    "complete",
    "delivered",
    "done",
    "paid",
  ].includes(status);
}

function isSupplierRejection(
  status: string
) {
  return [
    "failed",
    "failure",
    "rejected",
    "cancelled",
    "canceled",
    "refunded",
    "error",
    "declined",
  ].includes(status);
}

function getErrorMessage(
  data: any
): string {
  if (!data) {
    return "El proveedor no devolvió información.";
  }

  if (typeof data === "string") {
    return data;
  }

  const candidates = [
    data.error,
    data.message,
    data.detail,
    data.error_message,
    data.data?.error,
    data.data?.message,
    data.data?.detail,
  ];

  for (const value of candidates) {
    if (
      typeof value === "string" &&
      value.trim()
    ) {
      return value.trim();
    }
  }

  return "El proveedor rechazó el pedido.";
}

export async function POST(
  request: NextRequest
) {
  let createdOrderId: string | null = null;
  let reservedAmount = 0;
  let userId: string | null = null;

  try {
    const token =
      getBearerToken(request);

    if (!token) {
      return jsonError(
        "No autorizado.",
        401
      );
    }

    const {
      data: { user },
      error: userError,
    } =
      await supabaseAdmin.auth.getUser(
        token
      );

    if (userError || !user) {
      return jsonError(
        "Sesión inválida o expirada.",
        401
      );
    }

    userId = user.id;

    let body: any;

    try {
      body = await request.json();
    } catch {
      return jsonError(
        "El cuerpo de la solicitud no es válido."
      );
    }

    const offerId =
      typeof body?.offerId === "string"
        ? body.offerId.trim()
        : "";

    const playerId =
      typeof body?.playerId === "string"
        ? body.playerId.trim()
        : "";

    const quantity =
      Number.isInteger(body?.quantity) &&
      body.quantity > 0
        ? body.quantity
        : 1;

    if (!offerId) {
      return jsonError(
        "Debe seleccionar una oferta."
      );
    }

    if (!playerId) {
      return jsonError(
        "Debe introducir el ID del jugador."
      );
    }

    if (!/^[0-9]+$/.test(playerId)) {
      return jsonError(
        "El ID del jugador solo puede contener números."
      );
    }

    if (playerId.length < 4) {
      return jsonError(
        "El ID del jugador parece demasiado corto."
      );
    }

    if (playerId.length > 20) {
      return jsonError(
        "El ID del jugador es demasiado largo."
      );
    }

    const offer =
      fcMobileIdGame.offers.find(
        (item) => item.id === offerId
      ) as FcMobileIdOffer | undefined;

    if (!offer) {
      return jsonError(
        "La oferta seleccionada no existe."
      );
    }

    const totalPrice = Number(
      (
        offer.price * quantity
      ).toFixed(2)
    );

    const supplierTotal = Number(
      (
        offer.supplierPrice *
        quantity
      ).toFixed(4)
    );

    if (
      !Number.isFinite(totalPrice) ||
      totalPrice <= 0
    ) {
      return jsonError(
        "El precio de la oferta no es válido."
      );
    }

    const idempotencyKey =
      normalizeIdempotencyKey(
        request.headers.get(
          "idempotency-key"
        )
      );

    if (idempotencyKey) {
      const {
        data: existingOrderRaw,
        error: existingOrderError,
      } = await supabaseAdmin
        .from("topup_orders")
        .select(
          "id,status,supplier_order_id,offer_id,offer_name,player_id,retail_price,supplier_price"
        )
        .eq("user_id", user.id)
        .eq(
          "idempotency_key",
          idempotencyKey
        )
        .maybeSingle();

      if (
        existingOrderError &&
        existingOrderError.code !==
          "PGRST116"
      ) {
        return jsonError(
          "No se pudo comprobar el pedido existente.",
          500,
          {
            details:
              existingOrderError.message,
          }
        );
      }

      if (existingOrderRaw) {
        const existingOrder =
          existingOrderRaw as unknown as {
            id: string;
            status: string;
            supplier_order_id:
              | string
              | null;
            offer_id: string;
            offer_name: string;
            player_id: string;
            retail_price: number;
            supplier_price: number;
          };

        return NextResponse.json({
          ok: true,
          duplicate: true,
          order: existingOrder,
        });
      }
    }

    const {
      data: profile,
      error: profileError,
    } = await supabaseAdmin
      .from("profiles")
      .select("id,balance")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      return jsonError(
        "No se pudo consultar el saldo.",
        500,
        {
          details:
            profileError.message,
        }
      );
    }

    if (!profile) {
      return jsonError(
        "No se encontró el perfil del usuario.",
        404
      );
    }

    const currentBalance =
      Number(profile.balance ?? 0);

    if (
      !Number.isFinite(
        currentBalance
      ) ||
      currentBalance < totalPrice
    ) {
      return jsonError(
        "Saldo insuficiente.",
        400,
        {
          balance: currentBalance,
          required: totalPrice,
        }
      );
    }

    const orderInsert = {
      user_id: user.id,
      game: fcMobileIdGame.name,
      category_id: CATEGORY_ID,
      offer_id: offer.id,
      offer_name: offer.name,
      player_id: playerId,
      quantity,
      retail_price: totalPrice,
      supplier_price: supplierTotal,
      status: "processing",
      supplier_order_id: null,
      idempotency_key:
        idempotencyKey,
    };

    const {
      data: createdOrder,
      error: createOrderError,
    } =
      await supabaseAdmin
        .from("topup_orders")
        .insert(orderInsert)
        .select()
        .single();

    if (
      createOrderError ||
      !createdOrder
    ) {
      return jsonError(
        "No se pudo crear la orden.",
        500,
        {
          details:
            createOrderError?.message,
        }
      );
    }

    createdOrderId =
      createdOrder.id;

    const {
      data: reserveResult,
      error: reserveError,
    } =
      await supabaseAdmin.rpc(
        "reserve_topup_balance",
        {
          p_user_id: user.id,
          p_amount: totalPrice,
          p_order_id:
            createdOrder.id,
        }
      );

    if (reserveError) {
      await supabaseAdmin
        .from("topup_orders")
        .update({
          status: "failed",
          error_message:
            reserveError.message,
        })
        .eq(
          "id",
          createdOrder.id
        );

      return jsonError(
        "No se pudo reservar el saldo.",
        500,
        {
          details:
            reserveError.message,
        }
      );
    }

    if (
      reserveResult === false ||
      (
        reserveResult &&
        typeof reserveResult ===
          "object" &&
        "success" in
          reserveResult &&
        reserveResult.success ===
          false
      )
    ) {
      await supabaseAdmin
        .from("topup_orders")
        .update({
          status: "failed",
          error_message:
            "Saldo insuficiente.",
        })
        .eq(
          "id",
          createdOrder.id
        );

      return jsonError(
        "Saldo insuficiente."
      );
    }

    reservedAmount =
      totalPrice;

    const apiKey =
      process.env.FAZERCARDS_API_KEY;

    if (!apiKey) {
      await supabaseAdmin.rpc(
        "refund_topup_balance",
        {
          p_user_id: user.id,
          p_amount:
            reservedAmount,
          p_order_id:
            createdOrder.id,
          p_reason:
            "FAZERCARDS_API_KEY no configurada",
        }
      );

      await supabaseAdmin
        .from("topup_orders")
        .update({
          status: "failed",
          error_message:
            "FAZERCARDS_API_KEY no configurada.",
        })
        .eq(
          "id",
          createdOrder.id
        );

      return jsonError(
        "El servicio de recarga no está configurado.",
        500
      );
    }

    const supplierResponse =
      await fetch(
        `${FAZER_API_BASE}/topups/order`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Accept:
              "application/json",
            "X-API-Key":
              apiKey,
            "Idempotency-Key":
              idempotencyKey ||
              createdOrder.id,
            "User-Agent":
              "STORE-GAMING/1.0",
            Referer:
              "https://store-gaming.vercel.app/",
            Origin:
              "https://store-gaming.vercel.app",
          },
          body: JSON.stringify({
            category_id:
              CATEGORY_ID,
            offer_id:
              offer.id,
            fields: {
              player_id:
                playerId,
            },
          }),
        }
      );

    const responseText =
      await supplierResponse.text();

    let supplierData: any =
      null;

    try {
      supplierData =
        responseText
          ? JSON.parse(
              responseText
            )
          : null;
    } catch {
      supplierData =
        responseText;
    }

    if (!supplierResponse.ok) {
      const message =
        getErrorMessage(
          supplierData
        );

      await supabaseAdmin.rpc(
        "refund_topup_balance",
        {
          p_user_id: user.id,
          p_amount:
            reservedAmount,
          p_order_id:
            createdOrder.id,
          p_reason: message,
        }
      );

      await supabaseAdmin
        .from("topup_orders")
        .update({
          status: "failed",
          error_message:
            message,
        })
        .eq(
          "id",
          createdOrder.id
        );

      return jsonError(
        message,
        502,
        {
          orderId:
            createdOrder.id,
        }
      );
    }

    const supplierOrderId =
      getSupplierOrderId(
        supplierData
      );

    const supplierStatus =
      getSupplierStatus(
        supplierData
      );

    if (
      isSupplierRejection(
        supplierStatus
      )
    ) {
      const message =
        getErrorMessage(
          supplierData
        );

      await supabaseAdmin.rpc(
        "refund_topup_balance",
        {
          p_user_id: user.id,
          p_amount:
            reservedAmount,
          p_order_id:
            createdOrder.id,
          p_reason: message,
        }
      );

      await supabaseAdmin
        .from("topup_orders")
        .update({
          status: "failed",
          supplier_order_id:
            supplierOrderId,
          supplier_status:
            supplierStatus,
          error_message:
            message,
        })
        .eq(
          "id",
          createdOrder.id
        );

      return jsonError(
        message,
        502,
        {
          orderId:
            createdOrder.id,
          supplierOrderId,
        }
      );
    }

    let localStatus =
      "pending";

    if (
      isSuccessfulSupplierStatus(
        supplierStatus
      )
    ) {
      localStatus =
        "completed";
    }

    await supabaseAdmin
      .from("topup_orders")
      .update({
        status: localStatus,
        supplier_order_id:
          supplierOrderId,
        supplier_status:
          supplierStatus ||
          null,
        supplier_response:
          supplierData,
      })
      .eq(
        "id",
        createdOrder.id
      );

    return NextResponse.json({
      ok: true,
      order: {
        id: createdOrder.id,
        game:
          fcMobileIdGame.name,
        categoryId:
          CATEGORY_ID,
        offerId:
          offer.id,
        offerName:
          offer.name,
        playerId,
        quantity,
        retailPrice:
          totalPrice,
        supplierPrice:
          supplierTotal,
        status:
          localStatus,
        supplierOrderId,
      },
      supplier:
        supplierData,
    });
  } catch (error: any) {
    console.error(
      "FC Mobile topup error:",
      error
    );

    if (
      createdOrderId &&
      userId &&
      reservedAmount > 0
    ) {
      try {
        await supabaseAdmin.rpc(
          "refund_topup_balance",
          {
            p_user_id:
              userId,
            p_amount:
              reservedAmount,
            p_order_id:
              createdOrderId,
            p_reason:
              error?.message ||
              "Error interno procesando el pedido.",
          }
        );

        await supabaseAdmin
          .from("topup_orders")
          .update({
            status:
              "failed",
            error_message:
              error?.message ||
              "Error interno procesando el pedido.",
          })
          .eq(
            "id",
            createdOrderId
          );
      } catch (
        refundError
      ) {
        console.error(
          "FC Mobile refund error:",
          refundError
        );
      }
    }

    return jsonError(
      "Error interno procesando el pedido.",
      500
    );
  }
}
EOF
