import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

const FAZER_API_BASE = "https://api.fzr.cards/api/v2";
const CATEGORY_ID = "free_fire_latam";

const OFFERS = [
  {
    id: "ff-110",
    supplierOfferId: "110_diamonds",
    name: "110 Diamonds",
    price: 0.78,
    supplierPrice: 0.6871,
  },
  {
    id: "ff-341",
    supplierOfferId: "341_diamonds",
    name: "341 Diamonds",
    price: 2.2094,
    supplierPrice: 2.0594,
  },
  {
    id: "ff-572",
    supplierOfferId: "572_diamonds",
    name: "572 Diamonds",
    price: 3.6429,
    supplierPrice: 3.4929,
  },
  {
    id: "ff-1166",
    supplierOfferId: "1166_diamonds",
    name: "1166 Diamonds",
    price: 6.631,
    supplierPrice: 6.481,
  },
  {
    id: "ff-2398",
    supplierOfferId: "2398_diamonds",
    name: "2398 Diamonds",
    price: 13.011,
    supplierPrice: 12.861,
  },
  {
    id: "ff-6160",
    supplierOfferId: "6160_diamantes",
    name: "6160 Diamonds",
    price: 32.8881,
    supplierPrice: 32.7381,
  },
  {
    id: "ff-210",
    supplierOfferId: "210_diamantes",
    name: "210 Diamonds",
    price: 2.0945,
    supplierPrice: 1.9445,
  },
  {
    id: "ff-530",
    supplierOfferId: "530_diamantes",
    name: "530 Diamonds",
    price: 5.0162,
    supplierPrice: 4.8662,
  },
  {
    id: "ff-1080",
    supplierOfferId: "1080_diamantes",
    name: "1080 Diamonds",
    price: 9.8724,
    supplierPrice: 9.7224,
  },
  {
    id: "ff-2200",
    supplierOfferId: "2200_diamantes",
    name: "2200 Diamonds",
    price: 19.5948,
    supplierPrice: 19.4448,
  },
  {
    id: "ff-weekly-lite",
    supplierOfferId: "weekly_lite",
    name: "Semanal Lite",
    price: 0.6538,
    supplierPrice: 0.5038,
  },
  {
    id: "ff-weekly-membership",
    supplierOfferId: "membresía_semanal",
    name: "Membresía semanal",
    price: 2.3282,
    supplierPrice: 2.1782,
  },
  {
    id: "ff-elite-pass",
    supplierOfferId: "booyah_pass",
    name: "Booyah Pass",
    price: 4.0138,
    supplierPrice: 3.8638,
  },
  {
    id: "ff-monthly-membership",
    supplierOfferId: "membresía_mensual",
    name: "Membresía mensual",
    price: 10.632,
    supplierPrice: 10.482,
  },
  {
    id: "ff-100",
    supplierOfferId: "100_diamantes",
    name: "100 Diamonds",
    price: 1.1273,
    supplierPrice: 0.9773,
  },
] as const;

type Offer = (typeof OFFERS)[number];

function getOffer(offerId: string): Offer | null {
  return (
    OFFERS.find(
      (offer) => offer.id === offerId
    ) ?? null
  );
}

function normalizePlayerId(
  value: unknown
): string {
  return String(value ?? "").replace(
    /\D/g,
    ""
  );
}

function createIdempotencyKey(): string {
  return `ff-${crypto.randomUUID()}`;
}

/**
 * Diagnóstico de FazerCards.
 *
 * Si POST /topups/order devuelve 403,
 * consultamos /me y /balance para saber si:
 *
 * la API key es válida
 * la cuenta está activa
 * existe saldo
 * el plan está activo
 */
async function getFazerDiagnostics(
  apiKey: string
) {
  const headers = {
    Accept: "application/json",
    "X-API-Key": apiKey,
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36",
    Referer:
      "https://reseller.fazercards.com/",
    Origin:
      "https://reseller.fazercards.com",
  };

  let meStatus: number | null = null;
  let meData: any = null;

  let balanceStatus: number | null = null;
  let balanceData: any = null;

  try {
    const response = await fetch(
      `${FAZER_API_BASE}/me`,
      {
        method: "GET",
        headers,
        cache: "no-store",
      }
    );

    meStatus = response.status;

    try {
      meData = await response.json();
    } catch {
      meData = null;
    }
  } catch (error) {
    console.error(
      "Error consultando FazerCards /me:",
      error
    );
  }

  try {
    const response = await fetch(
      `${FAZER_API_BASE}/balance`,
      {
        method: "GET",
        headers,
        cache: "no-store",
      }
    );

    balanceStatus = response.status;

    try {
      balanceData = await response.json();
    } catch {
      balanceData = null;
    }
  } catch (error) {
    console.error(
      "Error consultando FazerCards /balance:",
      error
    );
  }

  return {
    meStatus,
    meData,
    balanceStatus,
    balanceData,
  };
}

export async function POST(
  request: NextRequest
) {
  let createdOrderId: string | null = null;
  let balanceReserved = false;

  try {
    // =========================================================
    // 1. AUTENTICACIÓN
    // =========================================================

    const authorization =
      request.headers.get(
        "authorization"
      );

    if (
      !authorization?.startsWith(
        "Bearer "
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "No autorizado.",
        },
        { status: 401 }
      );
    }

    const accessToken =
      authorization
        .substring(7)
        .trim();

    if (!accessToken) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Token de acceso inválido.",
        },
        { status: 401 }
      );
    }

    const {
      data: { user },
      error: userError,
    } =
      await supabaseAdmin.auth.getUser(
        accessToken
      );

    if (userError || !user) {
      return NextResponse.json(
        {
          ok: false,
          error: "Sesión no válida.",
        },
        { status: 401 }
      );
    }

    // =========================================================
    // 2. DATOS DEL PEDIDO
    // =========================================================

    const body =
      await request.json();

    const offerId =
      String(
        body?.offerId ?? ""
      ).trim();

    const playerId =
      normalizePlayerId(
        body?.playerId
      );

    const requestedIdempotencyKey =
      typeof body?.idempotencyKey ===
      "string"
        ? body.idempotencyKey.trim()
        : "";

    const idempotencyKey =
      requestedIdempotencyKey ||
      createIdempotencyKey();

    if (!offerId) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Debe seleccionar una oferta.",
        },
        { status: 400 }
      );
    }

    if (!playerId) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Debe introducir el ID del jugador.",
        },
        { status: 400 }
      );
    }

    if (
      !/^\d{4,20}$/.test(
        playerId
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El ID del jugador no es válido.",
        },
        { status: 400 }
      );
    }

    // =========================================================
    // 3. OFERTA CONTROLADA POR EL SERVIDOR
    // =========================================================

    const offer =
      getOffer(offerId);

    if (!offer) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "La oferta seleccionada no existe.",
        },
        { status: 400 }
      );
    }

    const retailPrice =
      Number(offer.price);

    const supplierPrice =
      Number(
        offer.supplierPrice
      );

    // =========================================================
    // 4. PEDIDO DUPLICADO
    // =========================================================

    const {
      data: existingOrder,
      error:
        existingOrderError,
    } =
      await supabaseAdmin
        .from("topup_orders")
        .select(
          "id,status,supplier_order_id,retail_price,offer_id,player_id"
        )
        .eq(
          "user_id",
          user.id
        )
        .eq(
          "idempotency_key",
          idempotencyKey
        )
        .maybeSingle();

    if (existingOrderError) {
      console.error(
        "Error comprobando pedido existente:",
        existingOrderError
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "No se pudo comprobar el pedido.",
        },
        { status: 500 }
      );
    }

    if (existingOrder) {
      return NextResponse.json({
        ok: true,
        duplicate: true,
        orderId:
          existingOrder.id,
        status:
          existingOrder.status,
        supplierOrderId:
          existingOrder.supplier_order_id,
        message:
          "Este pedido ya fue procesado.",
      });
    }

    // =========================================================
    // 5. CREAR ORDEN LOCAL
    // =========================================================

    const orderPayload = {
      user_id:
        user.id,

      game:
        "Free Fire LATAM",

      category_id:
        CATEGORY_ID,

      offer_id:
        offer.id,

      offer_name:
        offer.name,

      player_id:
        playerId,

      retail_price:
        retailPrice,

      supplier_price:
        supplierPrice,

      currency:
        "USD",

      status:
        "RESERVED",

      idempotency_key:
        idempotencyKey,

      supplier_fields: {
        player_id:
          playerId,
      },
    };

    const {
      data: createdOrder,
      error:
        createOrderError,
    } =
      await supabaseAdmin
        .from("topup_orders")
        .insert(
          orderPayload
        )
        .select("id")
        .single();

    if (
      createOrderError ||
      !createdOrder
    ) {
      console.error(
        "Error creando pedido en topup_orders:",
        createOrderError
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            "No se pudo crear el pedido.",
          detail:
            createOrderError?.message ??
            null,
        },
        { status: 500 }
      );
    }

    createdOrderId =
      createdOrder.id;

    // =========================================================
    // 6. RESERVAR SALDO
    // =========================================================

    const {
      error: reserveError,
    } =
      await supabaseAdmin.rpc(
        "store_gaming_reserve_balance",
        {
          p_user_id:
            user.id,

          p_amount:
            retailPrice,
        }
      );

    if (reserveError) {
      console.error(
        "Error reservando saldo:",
        reserveError
      );

      await supabaseAdmin
        .from("topup_orders")
        .update({
          status:
            "CANCELLED",

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          createdOrderId
        );

      return NextResponse.json(
        {
          ok: false,
          error:
            reserveError.message ===
            "SALDO INSUFICIENTE"
              ? "Saldo insuficiente."
              : reserveError.message ||
                "No se pudo reservar el saldo.",
        },
        { status: 400 }
      );
    }

    balanceReserved = true;

    // =========================================================
    // 7. API KEY
    // =========================================================

    const fazerApiKey =
      process.env
        .FAZERCARDS_API_KEY;

    if (!fazerApiKey) {
      console.error(
        "FAZERCARDS_API_KEY no está configurada."
      );

      await supabaseAdmin.rpc(
        "store_gaming_refund_balance",
        {
          p_order_id:
            createdOrderId,
        }
      );

      balanceReserved = false;

      return NextResponse.json(
        {
          ok: false,
          error:
            "Proveedor no configurado.",
        },
        { status: 500 }
      );
    }

    // =========================================================
    // 8. PEDIDO A FAZERCARDS
    // =========================================================

    const supplierPayload = {
      category_id:
        CATEGORY_ID,

      offer_id:
        offer.supplierOfferId,

      fields: {
        player_id:
          playerId,
      },
    };

    console.log(
      "Enviando pedido a FazerCards:",
      {
        category_id:
          CATEGORY_ID,

        offer_id:
          offer.supplierOfferId,

        fields: {
          player_id:
            playerId,
        },
      }
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
                fazerApiKey,

              "Idempotency-Key":
                idempotencyKey,

              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36",

              Referer:
                "https://reseller.fazercards.com/",

              Origin:
                "https://reseller.fazercards.com",
            },

            body:
              JSON.stringify(
                supplierPayload
              ),

            cache:
              "no-store",
          }
        );
    } catch (
      supplierNetworkError
    ) {
      console.error(
        "Error de red con FazerCards:",
        supplierNetworkError
      );

      await supabaseAdmin
        .from("topup_orders")
        .update({
          status:
            "SUPPLIER_PENDING",

          supplier_status:
            "pending",

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          createdOrderId
        );

      balanceReserved = false;

      return NextResponse.json(
        {
          ok: true,
          pending: true,
          orderId:
            createdOrderId,
          message:
            "El pedido fue recibido y está pendiente de confirmación.",
        },
        { status: 202 }
      );
    }

        // =========================================================
    // 9. LEER RESPUESTA
    // =========================================================

    let supplierData: any =
      null;

    try {
      supplierData =
        await supplierResponse.json();
    } catch {
      supplierData = null;
    }

    // =========================================================
    // 10. ERROR 403 DE FAZERCARDS
    // =========================================================

    if (
      supplierResponse.status === 403
    ) {
      console.error(
        "FazerCards rechazó el pedido: 403",
        supplierData
      );

      // Diagnóstico automático.
      const diagnostics =
        await getFazerDiagnostics(
          fazerApiKey
        );

      console.error(
        "DIAGNÓSTICO FAZERCARDS:",
        {
          meStatus:
            diagnostics.meStatus,

          meData:
            diagnostics.meData,

          balanceStatus:
            diagnostics.balanceStatus,

          balanceData:
            diagnostics.balanceData,
        }
      );

      await supabaseAdmin
        .from("topup_orders")
        .update({
          status:
            "REJECTED",

          supplier_status:
            "forbidden",

          supplier_response: {
            status: 403,

            response:
              supplierData,

            diagnostics,
          },

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          createdOrderId
        );

      const {
        error: refundError,
      } =
        await supabaseAdmin.rpc(
          "store_gaming_refund_balance",
          {
            p_order_id:
              createdOrderId,
          }
        );

      if (refundError) {
        console.error(
          "Error devolviendo saldo:",
          refundError
        );
      }

      balanceReserved = false;

      return NextResponse.json(
        {
          ok: false,

          error:
            "FazerCards no tiene habilitado este servicio para la API key.",

          supplierStatus:
            403,

          diagnostics: {
            meStatus:
              diagnostics.meStatus,

            me:
              diagnostics.meData,

            balanceStatus:
              diagnostics.balanceStatus,

            balance:
              diagnostics.balanceData,
          },
        },
        { status: 400 }
      );
    }

    // =========================================================
    // 11. OTROS ERRORES DE FAZERCARDS
    // =========================================================

    if (
      !supplierResponse.ok
    ) {
      console.error(
        "FazerCards rechazó el pedido:",
        supplierResponse.status,
        supplierData
      );

      await supabaseAdmin
        .from("topup_orders")
        .update({
          status:
            "REJECTED",

          supplier_status:
            "rejected",

          supplier_response:
            supplierData,

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          createdOrderId
        );

      const {
        error: refundError,
      } =
        await supabaseAdmin.rpc(
          "store_gaming_refund_balance",
          {
            p_order_id:
              createdOrderId,
          }
        );

      if (refundError) {
        console.error(
          "Error devolviendo saldo:",
          refundError
        );
      }

      balanceReserved = false;

      return NextResponse.json(
        {
          ok: false,

          error:
            supplierData?.message ||
            supplierData?.error ||
            "FazerCards rechazó el pedido.",

          supplierStatus:
            supplierResponse.status,

          supplierResponse:
            supplierData,
        },
        { status: 400 }
      );
    }

    // =========================================================
    // 12. OBTENER DATOS DEL PEDIDO
    // =========================================================

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

    const supplierStatusRaw =
      supplierData?.status ??
      supplierData?.order?.status ??
      supplierData?.data?.status ??
      supplierData?.data?.order?.status ??
      "pending";

    const supplierStatus =
      String(
        supplierStatusRaw
      ).toLowerCase();

    // =========================================================
    // 13. SIN ID DEL PROVEEDOR
    // =========================================================

    if (!supplierOrderId) {
      console.error(
        "FazerCards no devolvió supplier_order_id:",
        supplierData
      );

      await supabaseAdmin
        .from("topup_orders")
        .update({
          status:
            "SUPPLIER_PENDING",

          supplier_status:
            supplierStatus,

          supplier_response:
            supplierData,

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          createdOrderId
        );

      balanceReserved = false;

      return NextResponse.json(
        {
          ok: true,

          pending: true,

          orderId:
            createdOrderId,

          message:
            "Pedido enviado y pendiente de confirmación del proveedor.",
        },
        { status: 202 }
      );
    }

    // =========================================================
    // 14. COMPLETADO
    // =========================================================

    const completedStatuses = [
      "completed",
      "complete",
      "success",
      "successful",
      "done",
    ];

    if (
      completedStatuses.includes(
        supplierStatus
      )
    ) {
      const {
        error: updateError,
      } =
        await supabaseAdmin
          .from("topup_orders")
          .update({
            status:
              "COMPLETED",

            supplier_order_id:
              String(
                supplierOrderId
              ),

            supplier_status:
              supplierStatus,

            supplier_response:
              supplierData,

            completed_at:
              new Date().toISOString(),

            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            createdOrderId
          );

      if (updateError) {
        console.error(
          "Error actualizando orden completada:",
          updateError
        );
      }

      const {
        error: completeError,
      } =
        await supabaseAdmin.rpc(
          "store_gaming_complete_order",
          {
            p_supplier_order_id:
              String(
                supplierOrderId
              ),
          }
        );

      if (completeError) {
        console.error(
          "Error completando orden:",
          completeError
        );
      }

      balanceReserved = false;

      return NextResponse.json({
        ok: true,

        completed: true,

        orderId:
          createdOrderId,

        supplierOrderId:
          String(
            supplierOrderId
          ),

        status:
          "COMPLETED",

        message:
          "Orden completada correctamente.",
      });
    }

    // =========================================================
    // 15. PENDIENTE
    // =========================================================

    const pendingStatuses = [
      "pending",
      "processing",
      "in_progress",
      "created",
      "waiting",
      "queued",
    ];

    if (
      pendingStatuses.includes(
        supplierStatus
      )
    ) {
      await supabaseAdmin
        .from("topup_orders")
        .update({
          status:
            "SUPPLIER_PENDING",

          supplier_order_id:
            String(
              supplierOrderId
            ),

          supplier_status:
            supplierStatus,

          supplier_response:
            supplierData,

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          createdOrderId
        );

      balanceReserved = false;

      return NextResponse.json(
        {
          ok: true,

          pending: true,

          orderId:
            createdOrderId,

          supplierOrderId:
            String(
              supplierOrderId
            ),

          status:
            "SUPPLIER_PENDING",

          message:
            "Orden creada y pendiente de confirmación.",
        },
        { status: 202 }
      );
    }

    // =========================================================
    // 16. FALLIDO
    // =========================================================

    const failedStatuses = [
      "failed",
      "failure",
      "rejected",
      "cancelled",
      "canceled",
      "error",
    ];

    if (
      failedStatuses.includes(
        supplierStatus
      )
    ) {
      await supabaseAdmin
        .from("topup_orders")
        .update({
          status:
            "REJECTED",

          supplier_order_id:
            String(
              supplierOrderId
            ),

          supplier_status:
            supplierStatus,

          supplier_response:
            supplierData,

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          createdOrderId
        );

      const {
        error: refundError,
      } =
        await supabaseAdmin.rpc(
          "store_gaming_refund_balance",
          {
            p_order_id:
              createdOrderId,
          }
        );

      if (refundError) {
        console.error(
          "Error devolviendo saldo:",
          refundError
        );
      }

      balanceReserved = false;

      return NextResponse.json(
        {
          ok: false,

          error:
            supplierData?.message ||
            supplierData?.error ||
            "El proveedor rechazó el pedido.",

          orderId:
            createdOrderId,

          supplierOrderId:
            String(
              supplierOrderId
            ),
        },
        { status: 400 }
      );
    }

    // =========================================================
    // 17. ESTADO DESCONOCIDO
    // =========================================================

    await supabaseAdmin
      .from("topup_orders")
      .update({
        status:
          "SUPPLIER_PENDING",

        supplier_order_id:
          String(
            supplierOrderId
          ),

        supplier_status:
          supplierStatus,

        supplier_response:
          supplierData,

        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        createdOrderId
      );

    balanceReserved = false;

    return NextResponse.json(
      {
        ok: true,

        pending: true,

        orderId:
          createdOrderId,

        supplierOrderId:
          String(
            supplierOrderId
          ),

        status:
          "SUPPLIER_PENDING",

        message:
          "Pedido enviado y pendiente de confirmación.",
      },
      { status: 202 }
    );
  } catch (error: any) {
    console.error(
      "Error general en /api/topups/free-fire:",
      error
    );

    if (
      createdOrderId &&
      balanceReserved
    ) {
      try {
        await supabaseAdmin.rpc(
          "store_gaming_refund_balance",
          {
            p_order_id:
              createdOrderId,
          }
        );
      } catch (
        refundError
      ) {
        console.error(
          "Error en devolución durante catch:",
          refundError
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
