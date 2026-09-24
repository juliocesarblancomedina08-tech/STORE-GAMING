import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

const FAZER_API_BASE = "https://api.fzr.cards/api/v2";
const CATEGORY_ID = "codm_activision_us";

type Offer = {
  id: string;
  supplierOfferId: string;
  name: string;
  displayName: string;
  price: number;
  supplierPrice: number;
  icon: string;
};

const OFFERS: Offer[] = [
  {
    id: "cod-88",
    supplierOfferId: "88_cp",
    name: "80 + 8 CP",
    displayName: "88 CP",
    price: 1.15,
    supplierPrice: 0.9974,
    icon: "🪙",
  },
  {
    id: "cod-460",
    supplierOfferId: "460_cp",
    name: "400 + 60 CP",
    displayName: "460 CP",
    price: 5.18,
    supplierPrice: 5.0274,
    icon: "🪙",
  },
  {
    id: "cod-960",
    supplierOfferId: "960_cp",
    name: "800 + 160 CP",
    displayName: "960 CP",
    price: 10.21,
    supplierPrice: 10.0649,
    icon: "🪙",
  },
  {
    id: "cod-2600",
    supplierOfferId: "2600_cp",
    name: "2000 + 600 CP",
    displayName: "2600 CP",
    price: 25.33,
    supplierPrice: 25.1774,
    icon: "🪙",
  },
  {
    id: "cod-5400",
    supplierOfferId: "5400_cp",
    name: "4000 + 1400 CP",
    displayName: "5400 CP",
    price: 50.51,
    supplierPrice: 50.3649,
    icon: "🪙",
  },
  {
    id: "cod-11600",
    supplierOfferId: "11600_cp",
    name: "8000 + 3600 CP",
    displayName: "11600 CP",
    price: 100.89,
    supplierPrice: 100.7399,
    icon: "🪙",
  },
  {
    id: "cod-23200",
    supplierOfferId: "23200_cp",
    name: "16000 + 7200 CP",
    displayName: "23200 CP",
    price: 201.64,
    supplierPrice: 201.4899,
    icon: "🪙",
  },
  {
    id: "cod-34800",
    supplierOfferId: "34800_cp",
    name: "24000 + 10800 CP",
    displayName: "34800 CP",
    price: 302.39,
    supplierPrice: 302.2399,
    icon: "🪙",
  },
  {
    id: "cod-58000",
    supplierOfferId: "58000_cp",
    name: "40000 + 18000 CP",
    displayName: "58000 CP",
    price: 503.89,
    supplierPrice: 503.7399,
    icon: "🪙",
  },
];

function getOffer(offerId: string): Offer | null {
  return (
    OFFERS.find(
      (offer) => offer.id === offerId
    ) ?? null
  );
}

function normalizeUserId(value: unknown): string {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, "");
}

function createIdempotencyKey(): string {
  return `cod-${crypto.randomUUID()}`;
}

/*
|--------------------------------------------------------------------------
| DIAGNÓSTICO DE FAZERCARDS
|--------------------------------------------------------------------------
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
      balanceData =
        await response.json();
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

/*
|--------------------------------------------------------------------------
| POST
|--------------------------------------------------------------------------
*/

export async function POST(
  request: NextRequest
) {
  let createdOrderId: string | null =
    null;

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

    let body: any;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El cuerpo de la solicitud no es válido.",
        },
        { status: 400 }
      );
    }

    const offerId =
      String(
        body?.offerId ?? ""
      ).trim();

    const userId =
      normalizeUserId(
        body?.playerId ??
          body?.userId
      );

    const requestedIdempotencyKey =
      typeof body?.idempotencyKey ===
      "string"
        ? body.idempotencyKey.trim()
        : "";

    const idempotencyKey =
      requestedIdempotencyKey ||
      createIdempotencyKey();

    // =========================================================
    // 3. VALIDACIONES
    // =========================================================

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

    if (!userId) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Debe introducir el ID de usuario de Activision.",
        },
        { status: 400 }
      );
    }

    /*
     * Call of Duty Mobile Activision utiliza
     * el campo user_id.
     *
     * Permitimos:
     * - letras
     * - números
     * - guion
     * - guion bajo
     *
     * Igual que en el API anterior de COD.
     */

    if (
      !/^[A-Za-z0-9_-]{4,32}$/.test(
        userId
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El ID de usuario de Activision no tiene un formato válido.",
        },
        { status: 400 }
      );
    }

    // =========================================================
    // 4. OFERTA CONTROLADA POR EL SERVIDOR
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
    // 5. PEDIDO DUPLICADO
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
    // 6. CREAR ORDEN LOCAL
    // =========================================================

    const orderPayload = {
      user_id: user.id,

      game:
        "Call of Duty Mobile - Activision (EE. UU.)",

      category_id:
        CATEGORY_ID,

      offer_id:
        offer.id,

      offer_name:
        offer.displayName,

      player_id:
        userId,

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
        user_id:
          userId,
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
    // 7. RESERVAR SALDO
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
    // 8. API KEY
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
    // 9. PEDIDO A FAZERCARDS
    // =========================================================

    const supplierPayload = {
      category_id:
        CATEGORY_ID,

      offer_id:
        offer.supplierOfferId,

      fields: {
        user_id:
          userId,
      },
    };

    console.log(
      "Enviando pedido de Call of Duty a FazerCards:",
      {
        category_id:
          CATEGORY_ID,

        offer_id:
          offer.supplierOfferId,

        fields: {
          user_id:
            userId,
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
    // 10. LEER RESPUESTA
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
    // 11. ERROR 403
    // =========================================================

    if (
      supplierResponse.status ===
      403
    ) {
      console.error(
        "FazerCards rechazó el pedido: 403",
        supplierData
      );

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
    // 12. OTROS ERRORES DE FAZERCARDS
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
    // 13. OBTENER DATOS DEL PEDIDO
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
    // 14. SIN ID DEL PROVEEDOR
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
    // 15. COMPLETADO
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
          "Error completando saldo:",
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
          "Orden de Call of Duty Mobile completada correctamente.",
      });
    }

    // =========================================================
    // 16. PENDIENTE
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
    // 17. FALLIDO
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
    // 18. ESTADO DESCONOCIDO
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
      "Error general en /api/topups/call-of-duty:",
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
