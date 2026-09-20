import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const FAZER_API_BASE =
  process.env.FAZERCARDS_API_URL ||
  "https://api.fzr.cards/api/v2";

const FAZER_API_KEY =
  process.env.FAZERCARDS_API_KEY || "";

const CATEGORY_ID = "eafc_mobile_id";

const OFFERS = [
  {
    id: "40_fc_points",
    name: "40 FC Points",
    retailPrice: 0.51,
    supplierPrice: 0.3526,
  },
  {
    id: "100_fc_points",
    name: "100 FC Points",
    retailPrice: 1.02,
    supplierPrice: 0.8665,
  },
  {
    id: "520_fc_points",
    name: "520 FC Points",
    retailPrice: 4.41,
    supplierPrice: 4.2617,
  },
  {
    id: "1070_fc_points",
    name: "1070 FC Puntos",
    retailPrice: 8.72,
    supplierPrice: 8.5738,
  },
  {
    id: "2200_fc_points",
    name: "2200 FC Points",
    retailPrice: 17.89,
    supplierPrice: 17.7421,
  },
  {
    id: "5750_fc_points",
    name: "5750 FC Points",
    retailPrice: 43.24,
    supplierPrice: 43.0908,
  },
  {
    id: "12000_fc_points",
    name: "12000 FC Points",
    retailPrice: 86.39,
    supplierPrice: 86.242,
  },
  {
    id: "39_silver",
    name: "39 Silver",
    retailPrice: 0.51,
    supplierPrice: 0.3526,
  },
  {
    id: "99_silver",
    name: "99 Silver",
    retailPrice: 1.02,
    supplierPrice: 0.8665,
  },
  {
    id: "499_silver",
    name: "499 Silver",
    retailPrice: 4.41,
    supplierPrice: 4.2617,
  },
  {
    id: "999_plata",
    name: "999 Plata",
    retailPrice: 8.72,
    supplierPrice: 8.5738,
  },
  {
    id: "1999_plata",
    name: "1999 Plata",
    retailPrice: 17.89,
    supplierPrice: 17.7421,
  },
  {
    id: "4999_plata",
    name: "4999 Plata",
    retailPrice: 43.24,
    supplierPrice: 43.0908,
  },
  {
    id: "9999_plata",
    name: "9999 Plata",
    retailPrice: 86.39,
    supplierPrice: 86.242,
  },
] as const;

type Offer = (typeof OFFERS)[number];

type ExistingOrder = {
  id: string;
  status: string | null;
  supplier_order_id?: string | null;
  supplier_response?: unknown;
};

function getSupabaseAdmin() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE;

  if (!url || !key) {
    throw new Error(
      "Faltan las variables de Supabase."
    );
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function normalizeStatus(value: unknown) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

export async function POST(
  request: NextRequest
) {
  let supabaseAdmin:
    | ReturnType<typeof getSupabaseAdmin>
    | null = null;

  let orderId: string | null = null;

  let reserved = false;

  try {
    supabaseAdmin = getSupabaseAdmin();

    if (!FAZER_API_KEY) {
      return NextResponse.json(
        {
          error:
            "FAZERCARDS_API_KEY no está configurada.",
        },
        { status: 500 }
      );
    }

    const authorization =
      request.headers.get("authorization");

    if (
      !authorization ||
      !authorization.startsWith("Bearer ")
    ) {
      return NextResponse.json(
        {
          error: "No autorizado.",
        },
        { status: 401 }
      );
    }

    const accessToken =
      authorization.replace("Bearer ", "").trim();

    const {
      data: { user },
      error: authError,
    } =
      await supabaseAdmin.auth.getUser(
        accessToken
      );

    if (authError || !user) {
      return NextResponse.json(
        {
          error: "Sesión no válida.",
        },
        { status: 401 }
      );
    }

    const body = await request.json();

    const offerId =
      typeof body.offerId === "string"
        ? body.offerId.trim()
        : "";

    const offerName =
      typeof body.offerName === "string"
        ? body.offerName.trim()
        : "";

    const playerId =
      typeof body.playerId === "string"
        ? body.playerId.trim()
        : String(
            body.playerId ?? ""
          ).trim();

    const retailPrice =
      Number(body.retailPrice);

    const quantity =
      Number(body.quantity ?? 1);

    const idempotencyKey =
      typeof body.idempotencyKey === "string"
        ? body.idempotencyKey.trim()
        : "";

    if (!offerId) {
      return NextResponse.json(
        {
          error:
            "Debe seleccionar una oferta.",
        },
        { status: 400 }
      );
    }

    if (!playerId) {
      return NextResponse.json(
        {
          error:
            "Debe proporcionar el ID del jugador.",
        },
        { status: 400 }
      );
    }

    if (!/^\d+$/.test(playerId)) {
      return NextResponse.json(
        {
          error:
            "El ID del jugador debe contener solamente números.",
        },
        { status: 400 }
      );
    }

    if (playerId.length < 4) {
      return NextResponse.json(
        {
          error:
            "El ID del jugador no es válido.",
        },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 10
    ) {
      return NextResponse.json(
        {
          error:
            "La cantidad debe estar entre 1 y 10.",
        },
        { status: 400 }
      );
    }

    /*
     * El frontend envía supplierOfferId.
     */

    const offer = OFFERS.find(
      (item) => item.id === offerId
    ) as Offer | undefined;

    if (!offer) {
      return NextResponse.json(
        {
          error:
            "La oferta seleccionada no existe.",
        },
        { status: 400 }
      );
    }

    if (
      !Number.isFinite(retailPrice) ||
      Math.abs(
        retailPrice - offer.retailPrice
      ) > 0.001
    ) {
      return NextResponse.json(
        {
          error:
            "El precio de la oferta no coincide.",
        },
        { status: 400 }
      );
    }

    if (
      offerName &&
      offerName !== offer.name
    ) {
      return NextResponse.json(
        {
          error:
            "La oferta seleccionada no coincide.",
        },
        { status: 400 }
      );
    }

    const totalRetailPrice = Number(
      (
        offer.retailPrice *
        quantity
      ).toFixed(4)
    );

    const totalSupplierPrice = Number(
      (
        offer.supplierPrice *
        quantity
      ).toFixed(4)
    );

    /*
     * Evitar pedidos duplicados.
     */

    if (idempotencyKey) {
      const {
        data: existingOrderRaw,
      } = await supabaseAdmin
        .from("topup_orders")
        .select(
          "id,status,supplier_order_id,supplier_response"
        )
        .eq("user_id", user.id)
        .eq(
          "idempotency_key",
          idempotencyKey
        )
        .maybeSingle();

      const existingOrder =
        existingOrderRaw as ExistingOrder | null;

      if (existingOrder?.id) {
        return NextResponse.json({
          success: true,
          existing: true,
          orderId: existingOrder.id,
          status: existingOrder.status,
          supplierOrderId:
            existingOrder.supplier_order_id ||
            null,
        });
      }
    }

    /*
     * Crear orden.
     */

    const {
      data: createdOrder,
      error: createError,
    } = await supabaseAdmin
      .from("topup_orders")
      .insert({
        user_id: user.id,

        category_id:
          CATEGORY_ID,

        offer_id:
          offer.id,

        offer_name:
          offer.name,

        player_id:
          playerId,

        retail_price:
          totalRetailPrice,

        supplier_price:
          totalSupplierPrice,

        quantity,

        idempotency_key:
          idempotencyKey || null,

        status:
          "RESERVED",

        supplier_response:
          null,
      })
      .select("id,status")
      .single();

    if (
      createError ||
      !createdOrder
    ) {
      return NextResponse.json(
        {
          error:
            createError?.message ||
            "No se pudo crear la orden.",
        },
        { status: 500 }
      );
    }

    orderId =
      String(createdOrder.id);

    /*
     * Reservar saldo.
     */

    const {
      error: reserveError,
    } = await supabaseAdmin.rpc(
      "reserve_topup_balance",
      {
        p_user_id:
          user.id,

        p_order_id:
          orderId,

        p_amount:
          totalRetailPrice,
      }
    );

    if (reserveError) {
      await supabaseAdmin
        .from("topup_orders")
        .update({
          status:
            "FAILED",

          supplier_response: {
            stage:
              "reserve_balance",

            error:
              reserveError.message,
          },
        })
        .eq("id", orderId);

      return NextResponse.json(
        {
          error:
            reserveError.message ||
            "No hay saldo suficiente.",
        },
        { status: 400 }
      );
    }

    reserved = true;

    /*
     * Pedido a FazerCards.
     */

    const controller =
      new AbortController();

    const timeout =
      setTimeout(
        () => controller.abort(),
        30000
      );

    let supplierResponse: Response;

    try {
      supplierResponse =
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
                FAZER_API_KEY,

              "Idempotency-Key":
                idempotencyKey ||
                `store-gaming-${orderId}`,

              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36",

              Referer:
                "https://reseller.fazercards.com/",

              Origin:
                "https://reseller.fazercards.com",
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

            signal:
              controller.signal,
          }
        );
    } catch (error) {
      clearTimeout(timeout);

      await supabaseAdmin
        .from("topup_orders")
        .update({
          status:
            "SUPPLIER_PENDING",

          supplier_response: {
            stage:
              "supplier_request",

            error:
              error instanceof Error
                ? error.message
                : "Error de conexión con FazerCards.",
          },
        })
        .eq("id", orderId);

      return NextResponse.json({
        success: true,

        status:
          "SUPPLIER_PENDING",

        orderId,

        message:
          "La orden fue creada y está pendiente de confirmación del proveedor.",
      });
    }

    clearTimeout(timeout);

    const rawText =
      await supplierResponse.text();

    let supplierData: unknown;

    try {
      supplierData =
        rawText
          ? JSON.parse(rawText)
          : null;
    } catch {
      supplierData = {
        raw: rawText,
      };
    }

    const supplierObject =
      supplierData &&
      typeof supplierData ===
        "object"
        ? (supplierData as Record<
            string,
            unknown
          >)
        : {};

    const supplierStatus =
      normalizeStatus(
        supplierObject.status ??
          supplierObject.state ??
          supplierObject.order_status
      );

    const supplierOrderId =
      supplierObject.order_id ??
      supplierObject.orderId ??
      supplierObject.id ??
      supplierObject.reference ??
      null;

    const rejectedStatuses =
      new Set([
        "FAILED",
        "FAILURE",
        "REJECTED",
        "CANCELLED",
        "CANCELED",
        "ERROR",
      ]);

    /*
     * Proveedor rechazó.
     */

    if (
      !supplierResponse.ok ||
      rejectedStatuses.has(
        supplierStatus
      )
    ) {
      if (reserved) {
        try {
          await supabaseAdmin.rpc(
            "refund_topup_balance",
            {
              p_order_id:
                orderId,
            }
          );
        } catch {
          await supabaseAdmin
            .from("topup_orders")
            .update({
              status:
                "REFUND_PENDING",

              supplier_response:
                supplierData,
            })
            .eq(
              "id",
              orderId
            );

          return NextResponse.json(
            {
              error:
                "El proveedor rechazó la orden y el reembolso quedó pendiente.",

              orderId,
            },
            { status: 502 }
          );
        }
      }

      await supabaseAdmin
        .from("topup_orders")
        .update({
          status:
            "FAILED",

          supplier_order_id:
            supplierOrderId != null
              ? String(
                  supplierOrderId
                )
              : null,

          supplier_response:
            supplierData,
        })
        .eq(
          "id",
          orderId
        );

      return NextResponse.json(
        {
          error:
            typeof supplierObject.message ===
            "string"
              ? supplierObject.message
              : "El proveedor rechazó la orden.",

          orderId,
        },
        { status: 502 }
      );
    }

    /*
     * El proveedor no entregó todavía
     * el número de orden.
     */

    if (!supplierOrderId) {
      await supabaseAdmin
        .from("topup_orders")
        .update({
          status:
            "SUPPLIER_PENDING",

          supplier_response:
            supplierData,
        })
        .eq(
          "id",
          orderId
        );

      return NextResponse.json({
        success: true,

        status:
          "SUPPLIER_PENDING",

        orderId,

        message:
          "La orden fue enviada y está pendiente de confirmación.",
      });
    }

    const completedStatuses =
      new Set([
        "COMPLETED",
        "SUCCESS",
        "SUCCEEDED",
        "DELIVERED",
        "DONE",
      ]);

    /*
     * Pedido completado.
     */

    if (
      completedStatuses.has(
        supplierStatus
      )
    ) {
      const {
        error: completeError,
      } =
        await supabaseAdmin.rpc(
          "complete_topup_order",
          {
            p_order_id:
              orderId,

            p_supplier_order_id:
              String(
                supplierOrderId
              ),

            p_supplier_response:
              supplierData,
          }
        );

      if (completeError) {
        await supabaseAdmin
          .from("topup_orders")
          .update({
            status:
              "SUPPLIER_PENDING",

            supplier_order_id:
              String(
                supplierOrderId
              ),

            supplier_response:
              supplierData,
          })
          .eq(
            "id",
            orderId
          );

        return NextResponse.json({
          success: true,

          status:
            "SUPPLIER_PENDING",

          orderId,

          supplierOrderId:
            String(
              supplierOrderId
            ),

          message:
            "El proveedor confirmó la orden, pero estamos terminando de actualizarla.",
        });
      }

      return NextResponse.json({
        success: true,

        status:
          "COMPLETED",

        orderId,

        supplierOrderId:
          String(
            supplierOrderId
          ),
      });
    }

    /*
     * Pedido aceptado pero todavía
     * no completado.
     */

    await supabaseAdmin
      .from("topup_orders")
      .update({
        status:
          "SUPPLIER_PENDING",

        supplier_order_id:
          String(
            supplierOrderId
          ),

        supplier_response:
          supplierData,
      })
      .eq(
        "id",
        orderId
      );

    return NextResponse.json({
      success: true,

      status:
        "SUPPLIER_PENDING",

      orderId,

      supplierOrderId:
        String(
          supplierOrderId
        ),

      message:
        "La orden fue enviada correctamente y está pendiente de confirmación.",
    });
  } catch (error) {
    console.error(
      "FC MOBILE ID TOPUP ERROR:",
      error
    );

    if (
      supabaseAdmin &&
      orderId
    ) {
      try {
        await supabaseAdmin
          .from("topup_orders")
          .update({
            status: reserved
              ? "SUPPLIER_PENDING"
              : "FAILED",

            supplier_response: {
              stage:
                "unexpected_error",

              error:
                error instanceof Error
                  ? error.message
                  : "Error interno desconocido.",
            },
          })
          .eq(
            "id",
            orderId
          );
      } catch {
        // No ocultar el error original.
      }
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Error interno del servidor.",
      },
      { status: 500 }
    );
  }
        }
