import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL!;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY!;

const FAZERCARDS_API_URL =
  process.env.FAZERCARDS_API_URL ||
  "https://api.fzr.cards/api/v2";

const FAZERCARDS_API_KEY =
  process.env.FAZERCARDS_API_KEY!;

const CATEGORY_ID = "sausage_man";
const GAME_NAME = "Sausage Man";
const STORE_MARGIN = 0.2;

const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

type SausageOffer = {
  id: string;
  name: string;
  supplierPrice: number;
  retailPrice: number;
};

const OFFERS: SausageOffer[] = [
  {
    id: "61_candies",
    name: "61 Caramelos",
    supplierPrice: 0.3909,
    retailPrice: 0.5909,
  },
  {
    id: "186_candies",
    name: "186 Caramelos",
    supplierPrice: 1.1717,
    retailPrice: 1.3717,
  },
  {
    id: "318_candies",
    name: "318 Caramelos",
    supplierPrice: 1.9525,
    retailPrice: 2.1525,
  },
  {
    id: "686_candies",
    name: "686 Caramelos",
    supplierPrice: 3.9051,
    retailPrice: 4.1051,
  },
  {
    id: "1378_candies",
    name: "1378 Caramelos",
    supplierPrice: 7.4092,
    retailPrice: 7.6092,
  },
  {
    id: "2118_caramelos",
    name: "2118 Caramelos",
    supplierPrice: 11.3142,
    retailPrice: 11.5142,
  },
  {
    id: "3548_caramelos",
    name: "3548 Caramelos",
    supplierPrice: 19.5153,
    retailPrice: 19.7153,
  },
  {
    id: "7108_caramelos",
    name: "7108 Caramelos",
    supplierPrice: 39.0195,
    retailPrice: 39.2195,
  },
];

function normalizeStatus(value: unknown): string {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function extractSupplierOrderId(data: any): string | null {
  return (
    data?.order?.id ||
    data?.order_id ||
    data?.id ||
    data?.supplier_order_id ||
    null
  );
}

function extractSupplierStatus(data: any): string {
  return (
    data?.order?.status ||
    data?.status ||
    "processing"
  );
}

async function refundOrder(orderId: string) {
  try {
    await supabaseAdmin.rpc(
      "refund_topup_balance",
      {
        p_order_id: orderId,
      }
    );
  } catch (error) {
    console.error(
      "Error devolviendo saldo:",
      error
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        {
          error:
            "Configuración de Supabase incompleta.",
        },
        { status: 500 }
      );
    }

    if (!FAZERCARDS_API_KEY) {
      return NextResponse.json(
        {
          error:
            "FAZERCARDS_API_KEY no está configurada.",
        },
        { status: 500 }
      );
    }

    const authorization =
      request.headers.get("authorization") || "";

    if (!authorization.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          error: "No autorizado.",
        },
        { status: 401 }
      );
    }

    const accessToken =
      authorization.slice("Bearer ".length).trim();

    if (!accessToken) {
      return NextResponse.json(
        {
          error: "Token de acceso inválido.",
        },
        { status: 401 }
      );
    }

    const {
      data: authData,
      error: authError,
    } = await supabaseAdmin.auth.getUser(
      accessToken
    );

    if (
      authError ||
      !authData?.user
    ) {
      return NextResponse.json(
        {
          error: "Sesión inválida o expirada.",
        },
        { status: 401 }
      );
    }

    const user = authData.user;

    const body = await request.json();

    const offerId = String(
      body?.offerId || ""
    ).trim();

    const characterId = String(
      body?.characterId ||
        body?.playerId ||
        ""
    ).trim();

    const idempotencyKey = String(
      body?.idempotencyKey || ""
    ).trim();

    const retailPrice = Number(
      body?.retailPrice
    );

    if (!offerId) {
      return NextResponse.json(
        {
          error: "Debe seleccionar una oferta.",
        },
        { status: 400 }
      );
    }

    if (!/^\d{4,20}$/.test(characterId)) {
      return NextResponse.json(
        {
          error:
            "El ID de personaje debe contener entre 4 y 20 números.",
        },
        { status: 400 }
      );
    }

    if (!idempotencyKey) {
      return NextResponse.json(
        {
          error:
            "Falta la clave de idempotencia.",
        },
        { status: 400 }
      );
    }

    const offer = OFFERS.find(
      (item) => item.id === offerId
    );

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
      ) > 0.01
    ) {
      return NextResponse.json(
        {
          error:
            "El precio de la oferta no es válido.",
        },
        { status: 400 }
      );
    }

    /*
     * Comprobar idempotencia en nuestra base de datos.
     */

    const {
      data: existingOrder,
      error: existingOrderError,
    } = await supabaseAdmin
      .from("topup_orders")
      .select(
        "id, status, supplier_order_id, supplier_response, retail_price"
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
        "Error comprobando idempotencia:",
        existingOrderError
      );

      return NextResponse.json(
        {
          error:
            "No se pudo comprobar la orden.",
        },
        { status: 500 }
      );
    }

    if (existingOrder) {
      return NextResponse.json({
        ok: true,
        reused: true,
        orderNumber: existingOrder.id,
        supplierOrderId:
          existingOrder.supplier_order_id ||
          null,
        orderStatus:
          existingOrder.status,
        supplierResponse:
          existingOrder.supplier_response ||
          null,
      });
    }

    /*
     * Comprobar saldo.
     */

    const {
      data: profile,
      error: profileError,
    } = await supabaseAdmin
      .from("profiles")
      .select("balance")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        {
          error:
            "No se pudo comprobar el saldo.",
        },
        { status: 500 }
      );
    }

    const balance = Number(
      profile.balance || 0
    );

    if (balance < offer.retailPrice) {
      return NextResponse.json(
        {
          error:
            "Saldo insuficiente para realizar esta compra.",
        },
        { status: 400 }
      );
    }

    /*
     * Crear orden interna.
     */

    const {
      data: insertedOrder,
      error: insertError,
    } = await supabaseAdmin
      .from("topup_orders")
      .insert({
        user_id: user.id,
        category_id: CATEGORY_ID,
        game: GAME_NAME,
        offer_id: offer.id,
        offer_name: offer.name,
        retail_price: offer.retailPrice,
        supplier_price: offer.supplierPrice,
        supplier_fields: {
          character_id: characterId,
        },
        idempotency_key: idempotencyKey,
        status: "RESERVED",
      })
      .select()
      .single();

    if (
      insertError ||
      !insertedOrder
    ) {
      console.error(
        "Error creando orden:",
        insertError
      );

      return NextResponse.json(
        {
          error:
            "No se pudo crear la orden.",
          details:
            insertError?.message ||
            null,
        },
        { status: 500 }
      );
    }

    /*
     * Reservar saldo.
     */

    const {
      error: reserveError,
    } = await supabaseAdmin.rpc(
      "reserve_topup_balance",
      {
        p_order_id:
          insertedOrder.id,
      }
    );

    if (reserveError) {
      await supabaseAdmin
        .from("topup_orders")
        .update({
          status: "FAILED",
          updated_at: new Date().toISOString(),
        })
        .eq(
          "id",
          insertedOrder.id
        );

      console.error(
        "Error reservando saldo:",
        reserveError
      );

      return NextResponse.json(
        {
          error:
            reserveError.message ||
            "No se pudo reservar el saldo.",
        },
        { status: 400 }
      );
    }

    /*
     * Crear orden en FazerCards.
     *
     * IMPORTANTE:
     * FazerCards recibe:
     * category_id
     * offer_id
     * fields.character_id
     */

    const supplierPayload = {
      category_id: CATEGORY_ID,
      offer_id: offer.id,
      fields: {
        character_id: characterId,
      },
    };

    let supplierResponse: any;

    try {
      const supplierRequest =
        await fetch(
          `${FAZERCARDS_API_URL}/topups/order`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
              Accept:
                "application/json",
              "X-API-Key":
                FAZERCARDS_API_KEY,
              "Idempotency-Key":
                idempotencyKey,
            },
            body: JSON.stringify(
              supplierPayload
            ),
            cache: "no-store",
          }
        );

      const responseText =
        await supplierRequest.text();

      try {
        supplierResponse =
          responseText
            ? JSON.parse(responseText)
            : {};
      } catch {
        supplierResponse = {
          raw: responseText,
        };
      }

      await supabaseAdmin
        .from("topup_orders")
        .update({
          supplier_response:
            supplierResponse,
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          insertedOrder.id
        );

      if (!supplierRequest.ok) {
        await refundOrder(
          insertedOrder.id
        );

        return NextResponse.json(
          {
            error:
              supplierResponse?.error ||
              supplierResponse?.message ||
              "El proveedor rechazó la orden. El saldo fue reembolsado.",
            providerResponse:
              supplierResponse,
          },
          { status: 400 }
        );
      }
    } catch (supplierNetworkError) {
      console.error(
        "Error de conexión con FazerCards:",
        supplierNetworkError
      );

      /*
       * No hacemos refund automático aquí porque
       * el proveedor podría haber recibido la orden
       * aunque nuestra conexión haya fallado.
       */

      await supabaseAdmin
        .from("topup_orders")
        .update({
          status: "SUPPLIER_PENDING",
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          insertedOrder.id
        );

      return NextResponse.json(
        {
          ok: true,
          orderNumber:
            insertedOrder.id,
          supplierOrderId: null,
          orderStatus:
            "SUPPLIER_PENDING",
          message:
            "La orden fue enviada y está pendiente de confirmación.",
        },
        { status: 200 }
      );
    }

    const supplierOrderId =
      extractSupplierOrderId(
        supplierResponse
      );

    const supplierStatus =
      extractSupplierStatus(
        supplierResponse
      );

    const normalizedStatus =
      normalizeStatus(
        supplierStatus
      );

    let internalStatus =
      "SUPPLIER_PENDING";

    if (
      normalizedStatus ===
        "completed" ||
      normalizedStatus ===
        "complete" ||
      normalizedStatus ===
        "success"
    ) {
      internalStatus =
        "COMPLETED";
    }

    if (
      normalizedStatus ===
        "failed" ||
      normalizedStatus ===
        "failure" ||
      normalizedStatus ===
        "cancelled" ||
      normalizedStatus ===
        "canceled" ||
      normalizedStatus ===
        "refunded" ||
      normalizedStatus ===
        "refund"
    ) {
      await refundOrder(
        insertedOrder.id
      );

      return NextResponse.json(
        {
          error:
            supplierResponse?.error ||
            supplierResponse?.message ||
            "El proveedor rechazó la orden. El saldo fue reembolsado.",
          providerResponse:
            supplierResponse,
        },
        { status: 400 }
      );
    }

    await supabaseAdmin
      .from("topup_orders")
      .update({
        supplier_order_id:
          supplierOrderId,
        status: internalStatus,
        supplier_response:
          supplierResponse,
        completed_at:
          internalStatus ===
          "COMPLETED"
            ? new Date().toISOString()
            : null,
        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        insertedOrder.id
      );

    return NextResponse.json({
      ok: true,
      orderNumber:
        insertedOrder.id,
      supplierOrderId,
      orderStatus:
        internalStatus,
      supplierStatus,
      supplierResponse,
    });
  } catch (error) {
    console.error(
      "Error API Sausage Man:",
      error
    );

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
