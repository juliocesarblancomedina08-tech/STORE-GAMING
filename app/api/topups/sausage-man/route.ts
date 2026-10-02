import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

const FAZER_API_BASE =
  process.env.FAZERCARDS_API_URL ||
  "https://api.fzr.cards/api/v2";

const FAZER_API_KEY =
  process.env.FAZERCARDS_API_KEY || "";

const CATEGORY_ID = "sausage_man";
const GAME_NAME = "Sausage Man";
const STORE_MARGIN = 0.20;

const OFFERS = [
  {
    id: "61_candies",
    name: "61 Candies",
    supplierPrice: 0.3909,
    retailPrice: 0.5909,
  },
  {
    id: "186_candies",
    name: "186 Candies",
    supplierPrice: 1.1717,
    retailPrice: 1.3717,
  },
  {
    id: "318_candies",
    name: "318 Candies",
    supplierPrice: 1.9525,
    retailPrice: 2.1525,
  },
  {
    id: "686_candies",
    name: "686 Candies",
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
] as const;

function getBearerToken(request: NextRequest) {
  const authorization =
    request.headers.get("authorization") || "";

  if (!authorization.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice(7).trim();
}

function getSupplierOrderId(data: any): string | null {
  const candidates = [
    data?.order_id,
    data?.orderId,
    data?.supplier_order_id,
    data?.supplierOrderId,
    data?.id,

    data?.data?.order_id,
    data?.data?.orderId,
    data?.data?.supplier_order_id,
    data?.data?.supplierOrderId,
    data?.data?.id,

    data?.order?.order_id,
    data?.order?.orderId,
    data?.order?.supplier_order_id,
    data?.order?.supplierOrderId,
    data?.order?.id,
  ];

  for (const value of candidates) {
    if (
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
    ) {
      return String(value);
    }
  }

  return null;
}

function getSupplierStatus(data: any): string | null {
  const candidates = [
    data?.status,
    data?.order_status,
    data?.orderStatus,

    data?.data?.status,
    data?.data?.order_status,
    data?.data?.orderStatus,

    data?.order?.status,
    data?.order?.order_status,
    data?.order?.orderStatus,
  ];

  for (const value of candidates) {
    if (
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
    ) {
      return String(value).trim().toLowerCase();
    }
  }

  return null;
}

function isSupplierRejected(status: string | null) {
  if (!status) {
    return false;
  }

  return [
    "rejected",
    "reject",
    "failed",
    "failure",
    "cancelled",
    "canceled",
    "declined",
    "error",
  ].includes(status);
}

function isSupplierCompleted(status: string | null) {
  if (!status) {
    return false;
  }

  return [
    "completed",
    "complete",
    "success",
    "successful",
    "delivered",
    "done",
  ].includes(status);
}

function getRetailPrice(
  offer: (typeof OFFERS)[number]
) {
  return Number(
    (
      offer.supplierPrice +
      STORE_MARGIN
    ).toFixed(4)
  );
}

export async function POST(request: NextRequest) {
  let insertedOrderId: string | null = null;

  try {
    /*
     * ========================================================
     * AUTENTICACIÓN
     * ========================================================
     */

    const accessToken = getBearerToken(request);

    if (!accessToken) {
      return NextResponse.json(
        {
          error: "No autorizado. Inicie sesión.",
        },
        { status: 401 }
      );
    }

    const {
      data: userData,
      error: userError,
    } = await supabaseAdmin.auth.getUser(
      accessToken
    );

    if (userError || !userData?.user) {
      return NextResponse.json(
        {
          error: "Sesión inválida o expirada.",
        },
        { status: 401 }
      );
    }

    const user = userData.user;

    /*
     * ========================================================
     * DATOS DEL PEDIDO
     * ========================================================
     */

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

    const requestedRetailPrice = Number(
      body?.retailPrice
    );

    /*
     * ========================================================
     * VALIDACIONES
     * ========================================================
     */

    if (!offerId) {
      return NextResponse.json(
        {
          error: "Debe seleccionar una oferta.",
        },
        { status: 400 }
      );
    }

    if (!characterId) {
      return NextResponse.json(
        {
          error:
            "Debe introducir el ID de personaje.",
        },
        { status: 400 }
      );
    }

    if (!/^[0-9]+$/.test(characterId)) {
      return NextResponse.json(
        {
          error:
            "El ID de personaje solo puede contener números.",
        },
        { status: 400 }
      );
    }

    if (characterId.length < 4) {
      return NextResponse.json(
        {
          error:
            "El ID de personaje debe tener al menos 4 números.",
        },
        { status: 400 }
      );
    }

    if (characterId.length > 20) {
      return NextResponse.json(
        {
          error:
            "El ID de personaje es demasiado largo.",
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

    /*
     * ========================================================
     * BUSCAR OFERTA
     * ========================================================
     */

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
      !Number.isFinite(
        offer.supplierPrice
      ) ||
      offer.supplierPrice <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Esta oferta no tiene un precio disponible.",
        },
        { status: 400 }
      );
    }

    /*
     * ========================================================
     * VALIDAR PRECIO DEL CLIENTE
     * ========================================================
     */

    const retailPrice =
      getRetailPrice(offer);

    if (
      !Number.isFinite(
        requestedRetailPrice
      )
    ) {
      return NextResponse.json(
        {
          error:
            "El precio de la oferta no es válido.",
        },
        { status: 400 }
      );
    }

    if (
      Math.abs(
        requestedRetailPrice -
          retailPrice
      ) > 0.0001
    ) {
      return NextResponse.json(
        {
          error:
            "El precio de la oferta no coincide.",
          expected: retailPrice,
        },
        { status: 400 }
      );
    }

    /*
     * ========================================================
     * IDEMPOTENCIA
     * ========================================================
     */

    const {
      data: existingOrder,
      error: existingOrderError,
    } = await supabaseAdmin
      .from("topup_orders")
      .select(
        "id,status,supplier_order_id,retail_price"
      )
      .eq("user_id", user.id)
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
          details:
            existingOrderError.message,
        },
        { status: 500 }
      );
    }

    if (existingOrder) {
      return NextResponse.json(
        {
          ok: true,
          duplicate: true,
          order: existingOrder,
          orderNumber:
            existingOrder.id,
          supplierOrderId:
            existingOrder.supplier_order_id ||
            "",
          status:
            existingOrder.status || "",
        },
        { status: 200 }
      );
    }

    /*
     * ========================================================
     * COMPROBAR SALDO
     * ========================================================
     */

    const {
      data: profile,
      error: profileError,
    } = await supabaseAdmin
      .from("profiles")
      .select("id,balance")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json(
        {
          error:
            "No se pudo comprobar el saldo.",
          details:
            profileError.message,
        },
        { status: 500 }
      );
    }

    if (!profile) {
      return NextResponse.json(
        {
          error:
            "Perfil de usuario no encontrado.",
        },
        { status: 404 }
      );
    }

    const balance = Number(
      profile.balance || 0
    );

    if (
      !Number.isFinite(balance) ||
      balance < retailPrice
    ) {
      return NextResponse.json(
        {
          error: "Saldo insuficiente.",
          balance,
          required: retailPrice,
        },
        { status: 400 }
      );
    }

    /*
     * ========================================================
     * CREAR ORDEN LOCAL
     * ========================================================
     */

    const {
      data: insertedOrder,
      error: insertError,
    } = await supabaseAdmin
      .from("topup_orders")
      .insert({
        user_id: user.id,

        game: GAME_NAME,

        category_id:
          CATEGORY_ID,

        offer_id:
          offer.id,

        offer_name:
          offer.name,

        player_id:
          characterId,

        currency: "USDT",

        retail_price:
          retailPrice,

        supplier_price:
          offer.supplierPrice,

        status: "RESERVED",

        idempotency_key:
          idempotencyKey,

        supplier_fields: {
          character_id:
            characterId,
        },

        created_at:
          new Date().toISOString(),

        updated_at:
          new Date().toISOString(),
      })
      .select("*")
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
            insertError?.message,
        },
        { status: 500 }
      );
    }

    insertedOrderId =
      insertedOrder.id;

    /*
     * ========================================================
     * RESERVAR SALDO
     * ========================================================
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
      console.error(
        "Error reservando saldo:",
        reserveError
      );

      await supabaseAdmin
        .from("topup_orders")
        .update({
          status: "FAILED",

          supplier_response: {
            reserve_error:
              reserveError.message,
          },

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          insertedOrder.id
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
     * ========================================================
     * COMPROBAR API KEY
     * ========================================================
     */

    if (!FAZER_API_KEY) {
      await supabaseAdmin.rpc(
        "refund_topup_balance",
        {
          p_order_id:
            insertedOrder.id,
        }
      );

      return NextResponse.json(
        {
          error:
            "La configuración de FazerCards está incompleta.",
        },
        { status: 500 }
      );
    }

    /*
     * ========================================================
     * PAYLOAD FAZERCARDS
     * ========================================================
     */

    const supplierPayload = {
      category_id:
        CATEGORY_ID,

      offer_id:
        offer.id,

      fields: {
        character_id:
          characterId,
      },
    };

    console.log(
      "SAUSAGE MAN -> FAZERCARDS:",
      supplierPayload
    );

    /*
     * ========================================================
     * ENVIAR PEDIDO
     * ========================================================
     */

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
                idempotencyKey,

              "User-Agent":
                "STORE-GAMING/1.0",
            },

            body:
              JSON.stringify(
                supplierPayload
              ),

            cache: "no-store",
          }
        );
    } catch (networkError) {
      console.error(
        "Error de red FazerCards:",
        networkError
      );

      /*
       * No hacemos refund porque
       * no sabemos si el proveedor
       * recibió el pedido.
       */

      await supabaseAdmin
        .from("topup_orders")
        .update({
          status:
            "SUPPLIER_PENDING",

          supplier_response: {
            network_error:
              networkError instanceof
              Error
                ? networkError.message
                : String(
                    networkError
                  ),
          },

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
          pending: true,

          orderNumber:
            insertedOrder.id,

          supplierOrderId: "",

          status:
            "SUPPLIER_PENDING",

          message:
            "El pedido quedó pendiente de confirmación del proveedor.",
        },
        { status: 202 }
      );
    }

    /*
     * ========================================================
     * LEER RESPUESTA
     * ========================================================
     */

    const responseText =
      await supplierResponse.text();

    let supplierData: any = null;

    try {
      supplierData =
        responseText
          ? JSON.parse(
              responseText
            )
          : null;
    } catch {
      supplierData = {
        raw: responseText,
      };
    }

    console.log(
      "RESPUESTA FAZERCARDS SAUSAGE MAN:",
      {
        status:
          supplierResponse.status,

        data:
          supplierData,
      }
    );

    const supplierOrderId =
      getSupplierOrderId(
        supplierData
      );

    const supplierStatus =
      getSupplierStatus(
        supplierData
      );

    /*
     * ========================================================
     * GUARDAR RESPUESTA
     * ========================================================
     */

    await supabaseAdmin
      .from("topup_orders")
      .update({
        supplier_order_id:
          supplierOrderId,

        supplier_response:
          supplierData,

        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        insertedOrder.id
      );

    /*
     * ========================================================
     * RECHAZO DEL PROVEEDOR
     * ========================================================
     */

    if (
      !supplierResponse.ok ||
      isSupplierRejected(
        supplierStatus
      )
    ) {
      console.error(
        "FAZERCARDS RECHAZÓ SAUSAGE MAN:",
        supplierData
      );

      const {
        error: refundError,
      } =
        await supabaseAdmin.rpc(
          "refund_topup_balance",
          {
            p_order_id:
              insertedOrder.id,
          }
        );

      if (refundError) {
        await supabaseAdmin
          .from("topup_orders")
          .update({
            status:
              "REFUND_PENDING",

            supplier_order_id:
              supplierOrderId,

            supplier_response:
              supplierData,

            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            insertedOrder.id
          );

        return NextResponse.json(
          {
            error:
              "El proveedor rechazó la orden y el reembolso quedó pendiente.",

            supplier:
              supplierData,
          },
          { status: 502 }
        );
      }

      await supabaseAdmin
        .from("topup_orders")
        .update({
          status:
            "REFUNDED",

          supplier_order_id:
            supplierOrderId,

          supplier_response:
            supplierData,

          refunded_at:
            new Date().toISOString(),

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          insertedOrder.id
        );

      const supplierMessage =
        supplierData?.error ||
        supplierData?.message ||
        supplierData?.detail ||
        "El proveedor rechazó la orden.";

      return NextResponse.json(
        {
          error:
            `${supplierMessage} El saldo fue reembolsado.`,

          supplier:
            supplierData,

          orderNumber:
            insertedOrder.id,
        },
        { status: 502 }
      );
    }

    /*
     * ========================================================
     * SIN ID DEL PROVEEDOR
     * ========================================================
     */

    if (!supplierOrderId) {
      await supabaseAdmin
        .from("topup_orders")
        .update({
          status:
            "SUPPLIER_PENDING",

          supplier_response:
            supplierData,

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
          pending: true,

          orderNumber:
            insertedOrder.id,

          supplierOrderId: "",

          status:
            "SUPPLIER_PENDING",

          message:
            "El pedido fue enviado al proveedor y quedó pendiente de confirmación.",
        },
        { status: 202 }
      );
    }

    /*
     * ========================================================
     * COMPLETADO
     * ========================================================
     */

    if (
      isSupplierCompleted(
        supplierStatus
      )
    ) {
      const {
        error: completeError,
      } =
        await supabaseAdmin.rpc(
          "complete_topup_order",
          {
            p_supplier_order_id:
              supplierOrderId,
          }
        );

      if (completeError) {
        console.error(
          "Error completando orden:",
          completeError
        );

        /*
         * No reembolsar.
         * FazerCards ya aceptó la orden.
         */

        await supabaseAdmin
          .from("topup_orders")
          .update({
            status:
              "SUPPLIER_PENDING",

            supplier_order_id:
              supplierOrderId,

            supplier_response:
              supplierData,

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
            pending: true,

            orderNumber:
              supplierOrderId,

            supplierOrderId,

            status:
              "SUPPLIER_PENDING",
          },
          { status: 202 }
        );
      }

      await supabaseAdmin
        .from("topup_orders")
        .update({
          supplier_order_id:
            supplierOrderId,

          supplier_response:
            supplierData,

          status:
            "COMPLETED",

          completed_at:
            new Date().toISOString(),

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

          status:
            "COMPLETED",

          orderNumber:
            supplierOrderId,

          supplierOrderId,

          order: {
            ...insertedOrder,

            status:
              "COMPLETED",

            supplier_order_id:
              supplierOrderId,
          },
        },
        { status: 200 }
      );
    }

    /*
     * ========================================================
     * PENDIENTE / PROCESSING
     * ========================================================
     */

    await supabaseAdmin
      .from("topup_orders")
      .update({
        status:
          "SUPPLIER_PENDING",

        supplier_order_id:
          supplierOrderId,

        supplier_response:
          supplierData,

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

        pending: true,

        status:
          "SUPPLIER_PENDING",

        orderNumber:
          supplierOrderId,

        supplierOrderId,

        order: {
          ...insertedOrder,

          status:
            "SUPPLIER_PENDING",

          supplier_order_id:
            supplierOrderId,
        },

        message:
          "Pedido enviado correctamente al proveedor y pendiente de confirmación.",
      },
      { status: 202 }
    );
  } catch (error) {
    console.error(
      "ERROR GENERAL SAUSAGE MAN:",
      error
    );

    /*
     * Si la orden ya existe,
     * no hacemos refund automático.
     * Se deja pendiente para evitar
     * doble reembolso.
     */

    if (insertedOrderId) {
      await supabaseAdmin
        .from("topup_orders")
        .update({
          status:
            "SUPPLIER_PENDING",

          supplier_response: {
            internal_error:
              error instanceof
              Error
                ? error.message
                : String(
                    error
                  ),
          },

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          insertedOrderId
        );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo procesar la orden.",
      },
      { status: 500 }
    );
  }
}
