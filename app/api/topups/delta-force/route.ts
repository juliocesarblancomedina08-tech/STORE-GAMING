import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const FAZER_API_BASE =
  process.env.FAZERCARDS_API_URL ||
  "https://api.fzr.cards/api/v2";

const CATEGORY_ID = "delta_force";

type Offer = {
  id: string;
  name: string;
  retailPrice: number;
  supplierPrice: number;
};

/*
 * ============================================================
 * OFERTAS REALES DE FAZERCARDS — DELTA FORCE
 * ============================================================
 */

const OFFERS: Offer[] = [
  {
    id: "18_delta_coins",
    name: "18 Delta Coins",
    retailPrice: 0.38,
    supplierPrice: 0.2217,
  },
  {
    id: "30_delta_coins",
    name: "30 Delta Coins",
    retailPrice: 0.54,
    supplierPrice: 0.3829,
  },
  {
    id: "60_delta_coins",
    name: "60 Delta Coins",
    retailPrice: 0.93,
    supplierPrice: 0.7758,
  },
  {
    id: "320_delta_coins",
    name: "320 Delta Coins",
    retailPrice: 4.04,
    supplierPrice: 3.8889,
  },
  {
    id: "460_delta_coins",
    name: "460 Delta Coins",
    retailPrice: 5.79,
    supplierPrice: 5.642,
  },
  {
    id: "750_delta_coins",
    name: "750 Delta Coins",
    retailPrice: 7.92,
    supplierPrice: 7.7678,
  },
  {
    id: "1480_delta_coins",
    name: "1480 Delta Coins",
    retailPrice: 15.69,
    supplierPrice: 15.5357,
  },
  {
    id: "1980_delta_coins",
    name: "1980 Delta Coins",
    retailPrice: 19.58,
    supplierPrice: 19.4246,
  },
  {
    id: "3950_delta_coins",
    name: "3950 Delta Coins",
    retailPrice: 38.99,
    supplierPrice: 38.8391,
  },
  {
    id: "8100_delta_coins",
    name: "8100 Delta Coins",
    retailPrice: 77.82,
    supplierPrice: 77.6682,
  },
  {
    id: "16200_delta_coins",
    name: "16200 Delta Coins",
    retailPrice: 157.84,
    supplierPrice: 157.6929,
  },
  {
    id: "24300_delta_coins",
    name: "24300 Delta Coins",
    retailPrice: 236.69,
    supplierPrice: 236.5449,
  },
  {
    id: "season_pass_operations_special",
    name: "Season Pass Operations Special",
    retailPrice: 4.42,
    supplierPrice: 4.2647,
  },
  {
    id: "season_pass_warfare_special",
    name: "Season Pass Warfare Special",
    retailPrice: 4.42,
    supplierPrice: 4.2647,
  },
  {
    id: "season_pass_delta_force_deluxe",
    name: "Season Pass Delta Force Deluxe",
    retailPrice: 6.06,
    supplierPrice: 5.909,
  },
];

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
    request.headers.get("authorization") || "";

  if (
    !authorization
      .toLowerCase()
      .startsWith("bearer ")
  ) {
    return null;
  }

  return authorization.slice(7).trim() || null;
}

function normalizeIdempotencyKey(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const clean = value.trim();

  if (!clean) {
    return null;
  }

  return clean.slice(0, 255);
}

function getSupplierOrderId(data: any): string | null {
  return (
    data?.order?.id ??
    data?.data?.order?.id ??
    data?.id ??
    data?.order_id ??
    null
  );
}

function getSupplierStatus(data: any): string | null {
  return (
    data?.order?.status ??
    data?.data?.order?.status ??
    data?.status ??
    null
  );
}

function isSuccessfulSupplierStatus(
  status: string | null
) {
  if (!status) {
    return false;
  }

  return [
    "completed",
    "complete",
    "success",
    "successful",
  ].includes(status.toLowerCase());
}

function isSupplierRejection(data: any) {
  const status = getSupplierStatus(data);

  if (
    status &&
    [
      "rejected",
      "failed",
      "failure",
      "cancelled",
      "canceled",
      "declined",
    ].includes(status.toLowerCase())
  ) {
    return true;
  }

  if (data?.ok === false) {
    return true;
  }

  return false;
}

export async function POST(
  request: NextRequest
) {
  let internalOrderId: string | null = null;
  let reserved = false;

  try {
    /*
     * ============================================================
     * 1. AUTENTICACIÓN
     * ============================================================
     */

    const accessToken =
      getBearerToken(request);

    if (!accessToken) {
      return jsonError(
        "No autorizado.",
        401
      );
    }

    const {
      data: userData,
      error: userError,
    } =
      await supabaseAdmin.auth.getUser(
        accessToken
      );

    if (
      userError ||
      !userData?.user
    ) {
      return jsonError(
        "La sesión no es válida o ha expirado.",
        401
      );
    }

    const user = userData.user;

    /*
     * ============================================================
     * 2. DATOS DEL PEDIDO
     * ============================================================
     */

    const body =
      await request.json();

    const offerId =
      typeof body?.offerId === "string"
        ? body.offerId.trim()
        : "";

    const offerName =
      typeof body?.offerName === "string"
        ? body.offerName.trim()
        : "";

    const playerId =
      typeof body?.playerId === "string"
        ? body.playerId.trim()
        : "";

    const requestedRetailPrice =
      Number(body?.retailPrice);

    const idempotencyKey =
      normalizeIdempotencyKey(
        body?.idempotencyKey
      ) ||
      crypto.randomUUID();

    /*
     * ============================================================
     * 3. VALIDACIONES
     * ============================================================
     */

    if (!offerId) {
      return jsonError(
        "Debe seleccionar una oferta."
      );
    }

    if (!playerId) {
      return jsonError(
        "Debe proporcionar el Player ID."
      );
    }

    if (!/^[0-9]+$/.test(playerId)) {
      return jsonError(
        "El Player ID solo puede contener números."
      );
    }

    if (playerId.length < 4) {
      return jsonError(
        "El Player ID parece demasiado corto."
      );
    }

    /*
     * ============================================================
     * 4. BUSCAR OFERTA REAL
     * ============================================================
     */

    const offer =
      OFFERS.find(
        (item) =>
          item.id === offerId
      );

    if (!offer) {
      return jsonError(
        "La oferta seleccionada no existe."
      );
    }

    const retailPrice =
      Number(offer.retailPrice);

    const supplierPrice =
      Number(offer.supplierPrice);

    if (
      Number.isFinite(
        requestedRetailPrice
      ) &&
      Math.abs(
        requestedRetailPrice -
          retailPrice
      ) > 0.0001
    ) {
      return jsonError(
        "El precio de la oferta ha cambiado. Recargue la página.",
        409
      );
    }

    /*
     * ============================================================
     * 5. IDEMPOTENCIA
     * ============================================================
     */

    const {
      data: existingOrderRaw,
      error: existingOrderError,
    } =
      await supabaseAdmin
        .from("topup_orders")
        .select(
          [
            "id",
            "status",
            "supplier_order_id",
            "offer_id",
            "offer_name",
            "player_id",
            "retail_price",
            "supplier_price",
          ].join(",")
        )
        .eq(
          "idempotency_key",
          idempotencyKey
        )
        .maybeSingle();

    /*
     * FIX:
     * Supabase puede inferir incorrectamente el tipo
     * de existingOrderData. Definimos explícitamente
     * la estructura esperada.
     */

    const existingOrderData =
      existingOrderRaw as
        | {
            id: string;
            status: string | null;
            supplier_order_id:
              | string
              | null;
            offer_id:
              | string
              | null;
            offer_name:
              | string
              | null;
            player_id:
              | string
              | null;
            retail_price:
              | number
              | null;
            supplier_price:
              | number
              | null;
          }
        | null;

    if (existingOrderError) {
      console.error(
        "ERROR BUSCANDO IDEMPOTENCIA:",
        existingOrderError
      );

      return jsonError(
        "No se pudo comprobar la solicitud anterior.",
        500
      );
    }

    if (existingOrderData) {
      return NextResponse.json({
        ok: true,

        alreadyCreated: true,

        orderNumber:
          existingOrderData.id,

        supplierOrderId:
          existingOrderData.supplier_order_id,

        status:
          existingOrderData.status,

        offerId:
          existingOrderData.offer_id,

        offerName:
          existingOrderData.offer_name,

        playerId:
          existingOrderData.player_id,

        retailPrice:
          existingOrderData.retail_price,

        supplierPrice:
          existingOrderData.supplier_price,
      });
    }

    /*
     * ============================================================
     * 6. PERFIL DEL USUARIO
     * ============================================================
     */

    const {
      data: profile,
      error: profileError,
    } =
      await supabaseAdmin
        .from("profiles")
        .select(
          "id,email,balance"
        )
        .eq(
          "id",
          user.id
        )
        .maybeSingle();

    if (profileError) {
      console.error(
        "ERROR OBTENIENDO PERFIL:",
        profileError
      );

      return jsonError(
        "No se pudo obtener el perfil del usuario.",
        500
      );
    }

    if (!profile) {
      return jsonError(
        "El perfil del usuario no existe.",
        404
      );
    }

    /*
     * ============================================================
     * 7. CREAR ORDEN INTERNA
     * ============================================================
     */

    const {
      data: insertedOrder,
      error: insertOrderError,
    } =
      await supabaseAdmin
        .from("topup_orders")
        .insert({
          user_id: user.id,

          username:
            user.user_metadata
              ?.username ??
            user.user_metadata
              ?.user_name ??
            null,

          email:
            profile.email ??
            user.email ??
            null,

          game:
            "Delta Force",

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
        })
        .select("id")
        .single();

    if (
      insertOrderError ||
      !insertedOrder
    ) {
      console.error(
        "ERROR CREANDO ORDEN:",
        insertOrderError
      );

      return jsonError(
        "No se pudo crear la orden.",
        500
      );
    }

    internalOrderId =
      insertedOrder.id;

    /*
     * ============================================================
     * 8. RESERVAR SALDO
     * ============================================================
     */

    const {
      error: reserveError,
    } =
      await supabaseAdmin.rpc(
        "reserve_topup_balance",
        {
          p_user_id:
            user.id,

          p_amount:
            retailPrice,
        }
      );

    if (reserveError) {
      console.error(
        "ERROR RESERVANDO SALDO:",
        reserveError
      );

      await supabaseAdmin
        .from("topup_orders")
        .update({
          status:
            "FAILED",

          failed_at:
            new Date().toISOString(),

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          internalOrderId
        );

      if (
        reserveError.message
          ?.toLowerCase()
          .includes(
            "saldo insuficiente"
          )
      ) {
        return jsonError(
          "SALDO INSUFICIENTE",
          400
        );
      }

      return jsonError(
        reserveError.message ||
          "No se pudo reservar el saldo.",
        400
      );
    }

    reserved = true;

    /*
     * ============================================================
     * 9. API KEY
     * ============================================================
     */

    const fazerApiKey =
      process.env
        .FAZERCARDS_API_KEY;

    if (!fazerApiKey) {
      await supabaseAdmin.rpc(
        "refund_topup_balance",
        {
          p_order_id:
            internalOrderId,
        }
      );

      reserved = false;

      return jsonError(
        "El servicio de recargas no está configurado.",
        500
      );
  }

    /*
     * ============================================================
     * 10. PREPARAR SOLICITUD A FAZERCARDS
     * ============================================================
     */

    const supplierPayload = {
      category: CATEGORY_ID,

      offer_id:
        offer.id,

      player_id:
        playerId,

      quantity: 1,

      order_id:
        internalOrderId,
    };

    console.log(
      "FAZERCARDS REQUEST:",
      JSON.stringify(
        supplierPayload
      )
    );

    /*
     * ============================================================
     * 11. ENVIAR ORDEN A FAZERCARDS
     * ============================================================
     */

    let supplierResponse:
      Response;

    try {
      supplierResponse =
        await fetch(
          `${FAZER_API_BASE}/orders`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${fazerApiKey}`,

              "X-API-Key":
                fazerApiKey,
            },

            body: JSON.stringify(
              supplierPayload
            ),

            cache: "no-store",
          }
        );
    } catch (fetchError) {
      console.error(
        "ERROR FETCH FAZERCARDS:",
        fetchError
      );

      await supabaseAdmin
        .from("topup_orders")
        .update({
          status:
            "SUPPLIER_PENDING",

          supplier_response: {
            error:
              "NETWORK_ERROR",
          },

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          internalOrderId
        );

      return jsonError(
        "No se pudo conectar con el proveedor. La orden quedó pendiente.",
        502
      );
    }

    /*
     * ============================================================
     * 12. LEER RESPUESTA DEL PROVEEDOR
     * ============================================================
     */

    const supplierText =
      await supplierResponse.text();

    let supplierData: any = null;

    try {
      supplierData =
        supplierText
          ? JSON.parse(
              supplierText
            )
          : null;
    } catch {
      supplierData = {
        raw:
          supplierText,
      };
    }

    console.log(
      "FAZERCARDS STATUS:",
      supplierResponse.status
    );

    console.log(
      "FAZERCARDS RESPONSE:",
      supplierData
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
     * ============================================================
     * 13. RESPUESTA HTTP DEL PROVEEDOR
     * ============================================================
     */

    if (
      !supplierResponse.ok
    ) {
      console.error(
        "FAZERCARDS HTTP ERROR:",
        supplierResponse.status,
        supplierData
      );

      /*
       * Si FazerCards respondió claramente
       * que rechazó la orden, podemos marcarla
       * como fallida.
       *
       * Si fue un error ambiguo de servidor,
       * mantenemos SUPPLIER_PENDING para evitar
       * un doble envío.
       */

      if (
        isSupplierRejection(
          supplierData
        )
      ) {
        await supabaseAdmin
          .from("topup_orders")
          .update({
            status:
              "FAILED",

            supplier_order_id:
              supplierOrderId,

            supplier_status:
              supplierStatus,

            supplier_response:
              supplierData,

            failed_at:
              new Date().toISOString(),

            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            internalOrderId
          );

        /*
         * Reembolso solamente cuando
         * existe una respuesta explícita
         * de rechazo.
         */

        if (reserved) {
          await supabaseAdmin.rpc(
            "refund_topup_balance",
            {
              p_order_id:
                internalOrderId,
            }
          );

          reserved = false;
        }

        return jsonError(
          "El proveedor rechazó la orden.",
          502,
          {
            orderNumber:
              internalOrderId,

            supplierOrderId,
          }
        );
      }

      await supabaseAdmin
        .from("topup_orders")
        .update({
          status:
            "SUPPLIER_PENDING",

          supplier_order_id:
            supplierOrderId,

          supplier_status:
            supplierStatus,

          supplier_response:
            supplierData,

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          internalOrderId
        );

      return jsonError(
        "El proveedor no confirmó la solicitud. La orden quedó pendiente.",
        502,
        {
          orderNumber:
            internalOrderId,

          supplierOrderId,
        }
      );
    }

    /*
     * ============================================================
     * 14. RESPUESTA EXITOSA DE FAZERCARDS
     * ============================================================
     */

    const finalStatus =
      isSuccessfulSupplierStatus(
        supplierStatus
      )
        ? "COMPLETED"
        : "SUPPLIER_PENDING";

    /*
     * ============================================================
     * 15. ACTUALIZAR ORDEN INTERNA
     * ============================================================
     */

    const {
      error:
        updateOrderError,
    } =
      await supabaseAdmin
        .from("topup_orders")
        .update({
          status:
            finalStatus,

          supplier_order_id:
            supplierOrderId,

          supplier_status:
            supplierStatus,

          supplier_response:
            supplierData,

          completed_at:
            finalStatus ===
            "COMPLETED"
              ? new Date().toISOString()
              : null,

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          internalOrderId
        );

    if (updateOrderError) {
      console.error(
        "ERROR ACTUALIZANDO ORDEN:",
        updateOrderError
      );

      /*
       * La orden ya pudo haber sido
       * aceptada por FazerCards.
       *
       * No hacemos reembolso automático.
       */

      return jsonError(
        "La orden fue enviada al proveedor, pero no se pudo actualizar su estado interno.",
        500,
        {
          orderNumber:
            internalOrderId,

          supplierOrderId,
        }
      );
    }

    /*
     * ============================================================
     * 16. RESPUESTA FINAL
     * ============================================================
     */

    return NextResponse.json({
      ok: true,

      orderNumber:
        internalOrderId,

      supplierOrderId,

      status:
        finalStatus,

      supplierStatus,

      offerId:
        offer.id,

      offerName:
        offer.name,

      playerId,

      retailPrice,

      supplierPrice,

      supplierResponse:
        supplierData,
    });

    /*
     * ============================================================
     * FIN DEL POST
     * ============================================================
     */

  } catch (error) {
    console.error(
      "ERROR GENERAL DELTA FORCE:",
      error
    );

    /*
     * Si algo falla después de crear la orden,
     * no hacemos un reembolso automático porque
     * FazerCards podría haber recibido la solicitud.
     */

    if (internalOrderId) {
      await supabaseAdmin
        .from("topup_orders")
        .update({
          status:
            reserved
              ? "SUPPLIER_PENDING"
              : "FAILED",

          supplier_response: {
            error:
              "INTERNAL_SERVER_ERROR",
          },

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          internalOrderId
        );
    }

    return jsonError(
      "Ocurrió un error procesando la orden.",
      500
    );
  }
}
