import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

const FAZER_API_BASE =
  "https://api.fzr.cards/api/v2";

const CATEGORY_ID =
  "mobile_legends_united_states";

const GAME_NAME =
  "Mobile Legends";

type Offer = {
  id: string;
  supplierOfferId: string;
  name: string;
  display: string;
  price: number;
  supplierPrice: number;
};

const OFFERS: Offer[] = [
  {
    id: "51_5_diamonds",
    supplierOfferId: "51_5_diamonds",
    name: "51 + 5 Diamantes",
    display: "51 + 5💎",
    price: 0.97,
    supplierPrice: 0.8665,
  },

  {
    id: "weekly_diamond_pass",
    supplierOfferId: "weekly_diamond_pass",
    name: "Pase Semanal de Diamantes",
    display: "PASE SEMANAL",
    price: 1.85,
    supplierPrice: 1.7430,
  },

  {
    id: "253_25_diamonds",
    supplierOfferId: "253_25_diamonds",
    name: "253 + 25 Diamantes",
    display: "253 + 25💎",
    price: 4.45,
    supplierPrice: 4.3423,
  },

  {
    id: "505_66_diamonds",
    supplierOfferId: "505_66_diamonds",
    name: "505 + 66 Diamantes",
    display: "505 + 66💎",
    price: 8.80,
    supplierPrice: 8.7048,
  },

  {
    id: "1010_182_diamonds",
    supplierOfferId: "1010_182_diamonds",
    name: "1010 + 182 Diamantes",
    display: "1010 + 182💎",
    price: 17.45,
    supplierPrice: 17.3391,
  },
];

type ExistingOrder = {
  id: string;
  status: string;
  supplier_order_id: string | null;
  offer_id: string;
  offer_name: string;
  player_id: string;
  retail_price: number;
  supplier_price: number;
};

function jsonError(
  message: string,
  status = 400
) {
  return NextResponse.json(
    {
      ok: false,
      error: message,
    },
    {
      status,
    }
  );
}

function getBearerToken(
  request: NextRequest
) {
  const header =
    request.headers.get(
      "authorization"
    );

  if (!header) {
    return null;
  }

  const match =
    header.match(
      /^Bearer\s+(.+)$/i
    );

  return match
    ? match[1].trim()
    : null;
}

function normalizeIdempotencyKey(
  value: unknown
) {
  if (
    typeof value !== "string"
  ) {
    return "";
  }

  const cleaned =
    value.trim();

  if (
    !cleaned ||
    cleaned.length > 200
  ) {
    return "";
  }

  return cleaned;
}

function getSupplierOrderId(
  data: any
): string | null {
  return (
    data?.order?.id ??
    data?.data?.order?.id ??
    data?.order_id ??
    data?.id ??
    null
  );
}

function getSupplierStatus(
  data: any
): string | null {
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
    "done",
  ].includes(
    status.toLowerCase()
  );
}

function isSupplierRejection(
  data: any
) {
  const status =
    getSupplierStatus(data);

  if (
    status &&
    [
      "rejected",
      "failed",
      "failure",
      "cancelled",
      "canceled",
      "declined",
      "error",
    ].includes(
      status.toLowerCase()
    )
  ) {
    return true;
  }

  if (
    data?.ok === false
  ) {
    return true;
  }

  return false;
}

async function getFazerDiagnostics(
  apiKey: string
) {
  const headers = {
    Accept:
      "application/json",

    "X-API-Key":
      apiKey,

    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36",

    Referer:
      "https://reseller.fazercards.com/",

    Origin:
      "https://reseller.fazercards.com",
  };

  let meStatus:
    | number
    | null = null;

  let meData:
    | any
    | null = null;

  let balanceStatus:
    | number
    | null = null;

  let balanceData:
    | any
    | null = null;

  try {
    const response =
      await fetch(
        `${FAZER_API_BASE}/me`,
        {
          method: "GET",
          headers,
          cache:
            "no-store",
        }
      );

    meStatus =
      response.status;

    try {
      meData =
        await response.json();
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
    const response =
      await fetch(
        `${FAZER_API_BASE}/balance`,
        {
          method: "GET",
          headers,
          cache:
            "no-store",
        }
      );

    balanceStatus =
      response.status;

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

export async function POST(
  request: NextRequest
) {
  let internalOrderId:
    | string
    | null = null;

  let reserved = false;

  try {
    /*
     * ============================================================
     * 1. TOKEN
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

    /*
     * ============================================================
     * 2. USUARIO
     * ============================================================
     */

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

    const user =
      userData.user;

    /*
     * ============================================================
     * 3. DATOS DEL PEDIDO
     * ============================================================
     */

    const body =
      await request.json();

    const offerId =
      typeof body?.offerId ===
      "string"
        ? body.offerId.trim()
        : "";

    const playerId =
      typeof body?.playerId ===
      "string"
        ? body.playerId.trim()
        : "";

    const serverId =
      typeof body?.serverId ===
      "string"
        ? body.serverId.trim()
        : "";

    const idempotencyKey =
      normalizeIdempotencyKey(
        body?.idempotencyKey
      ) ||
      crypto.randomUUID();

    /*
     * ============================================================
     * 4. VALIDACIONES
     * ============================================================
     */

    if (!offerId) {
      return jsonError(
        "Debe seleccionar una oferta."
      );
    }

    if (!playerId) {
      return jsonError(
        "Debe proporcionar el ID del jugador."
      );
    }

    if (
      !/^[0-9]+$/.test(
        playerId
      )
    ) {
      return jsonError(
        "El ID del jugador solo puede contener números."
      );
    }

    if (
      playerId.length < 4
    ) {
      return jsonError(
        "El ID del jugador parece demasiado corto."
      );
    }

    if (!serverId) {
      return jsonError(
        "Debe proporcionar el ID del servidor."
      );
    }

    if (
      !/^[0-9]+$/.test(
        serverId
      )
    ) {
      return jsonError(
        "El ID del servidor solo puede contener números."
      );
    }

    if (
      serverId.length < 2
    ) {
      return jsonError(
        "El ID del servidor parece demasiado corto."
      );
    }

    /*
     * ============================================================
     * 5. OFERTA
     * ============================================================
     */

    const offer =
      OFFERS.find(
        (item) =>
          item.id === offerId
      );

    if (!offer) {
      return jsonError(
        "La oferta seleccionada no está disponible."
      );
    }

    const retailPrice =
      Number(offer.price);

    const supplierPrice =
      Number(
        offer.supplierPrice
      );

    /*
     * ============================================================
     * 6. IDEMPOTENCIA
     * ============================================================
     */

    const {
      data: existingOrderData,
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

    if (existingOrderError) {
      console.error(
        "ERROR COMPROBANDO IDEMPOTENCIA:",
        existingOrderError
      );

      return jsonError(
        "No se pudo comprobar el pedido existente.",
        500
      );
    }

    const existingOrder =
      existingOrderData as unknown as
        ExistingOrder | null;

    if (existingOrder) {
      return NextResponse.json({
        ok: true,
        alreadyCreated: true,

        orderNumber:
          existingOrder.id,

        supplierOrderId:
          existingOrder.supplier_order_id,

        status:
          existingOrder.status,

        offerId:
          existingOrder.offer_id,

        offerName:
          existingOrder.offer_name,

        playerId:
          existingOrder.player_id,

        retailPrice:
          existingOrder.retail_price,

        supplierPrice:
          existingOrder.supplier_price,
      });
    }

    /*
     * ============================================================
     * 7. PERFIL
     * ============================================================
     */

    const {
      data: profile,
      error: profileError,
    } =
      await supabaseAdmin
        .from("profiles")
        .select(
          "email,balance"
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
        "No se pudo obtener el perfil.",
        500
      );
    }

    if (!profile) {
      return jsonError(
        "El perfil del usuario no existe.",
        400
      );
    }

    /*
     * ============================================================
     * 8. CREAR ORDEN INTERNA
     * ============================================================
     */

    const {
      data: insertedOrder,
      error: insertOrderError,
    } =
      await supabaseAdmin
        .from("topup_orders")
        .insert({
          user_id:
            user.id,

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
            GAME_NAME,

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

            server_id:
              serverId,
          },
        })
        .select("id")
        .single();

    if (
      insertOrderError ||
      !insertedOrder
    ) {
      console.error(
        "ERROR CREANDO ORDEN INTERNA:",
        insertOrderError
      );

      const {
        data: raceOrderData,
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

      const raceOrder =
        raceOrderData as unknown as
          ExistingOrder | null;

      if (raceOrder) {
        return NextResponse.json({
          ok: true,
          alreadyCreated: true,

          orderNumber:
            raceOrder.id,

          supplierOrderId:
            raceOrder.supplier_order_id,

          status:
            raceOrder.status,

          offerId:
            raceOrder.offer_id,

          offerName:
            raceOrder.offer_name,

          playerId:
            raceOrder.player_id,

          retailPrice:
            raceOrder.retail_price,

          supplierPrice:
            raceOrder.supplier_price,
        });
      }

      return jsonError(
        "No se pudo crear la orden.",
        500
      );
    }

    internalOrderId =
      insertedOrder.id;

    /*
     * ============================================================
     * 9. RESERVAR SALDO
     * ============================================================
     */

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
        "ERROR RESERVANDO SALDO:",
        reserveError
      );

      await supabaseAdmin
        .from("topup_orders")
        .update({
          status:
            "FAILED",

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
     * 10. API KEY
     * ============================================================
     */

    const apiKey =
      process.env.FAZERCARDS_API_KEY;

    if (!apiKey) {
      await supabaseAdmin.rpc(
        "store_gaming_refund_balance",
        {
          p_order_id:
            internalOrderId,
        }
      );

      reserved = false;

      return jsonError(
        "FAZERCARDS_API_KEY no está configurada.",
        500
      );
    }

    /*
     * ============================================================
     * 11. PEDIDO A FAZERCARDS
     * ============================================================
     */

    const supplierPayload = {
      category_id:
        CATEGORY_ID,

      offer_id:
        offer.supplierOfferId,

      fields: {
        player_id:
          playerId,

        server_id:
          serverId,
      },
    };

    console.log(
      "Enviando Mobile Legends a FazerCards:",
      {
        category_id:
          CATEGORY_ID,

        offer_id:
          offer.supplierOfferId,

        fields: {
          player_id:
            playerId,

          server_id:
            serverId,
        },
      }
    );

    let supplierResponse:
      Response;

    try {
      supplierResponse =
        await fetch(
          `${FAZER_API_BASE}/topups/order`,
          {
            method:
              "POST",

            headers: {
              "X-API-Key":
                apiKey,

              "Content-Type":
                "application/json",

              Accept:
                "application/json",

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
    } catch (supplierNetworkError) {
      console.error(
        "ERROR DE RED CON FAZERCARDS:",
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
          internalOrderId
        );

      reserved = false;

      return NextResponse.json(
        {
          ok: true,

          pending: true,

          orderNumber:
            internalOrderId,

          supplierOrderId:
            null,

          status:
            "SUPPLIER_PENDING",

          offerId:
            offer.id,

          offerName:
            offer.name,

          playerId,

          serverId,

          retailPrice,

          supplierPrice,

          message:
            "La orden quedó pendiente de confirmación del proveedor.",
        },
        {
          status:
            202,
        }
      );
    }

    /*
     * ============================================================
     * 12. RESPUESTA DEL PROVEEDOR
     * ============================================================
     */

    const responseText =
      await supplierResponse.text();

    let supplierData:
      any = null;

    try {
      supplierData =
        responseText
          ? JSON.parse(
              responseText
            )
          : null;
    } catch {
      supplierData = {
        raw:
          responseText,
      };
    }

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
     * 13. ERROR 403
     * ============================================================
     */

    if (
      supplierResponse.status ===
      403
    ) {
      console.error(
        "FAZERCARDS RECHAZÓ MOBILE LEGENDS: 403",
        supplierData
      );

      const diagnostics =
        await getFazerDiagnostics(
          apiKey
        );

      console.error(
        "DIAGNÓSTICO FAZERCARDS MOBILE LEGENDS:",
        diagnostics
      );

      await supabaseAdmin
        .from("topup_orders")
        .update({
          status:
            "REJECTED",

          supplier_status:
            "forbidden",

          supplier_response: {
            status:
              403,

            response:
              supplierData,

            diagnostics,
          },

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          internalOrderId
        );

      const {
        error: refundError,
      } =
        await supabaseAdmin.rpc(
          "store_gaming_refund_balance",
          {
            p_order_id:
              internalOrderId,
          }
        );

      if (refundError) {
        console.error(
          "ERROR DEVOLVIENDO SALDO:",
          refundError
        );
      }

      reserved = false;

      return NextResponse.json(
        {
          ok: false,

          error:
            "FazerCards rechazó el pedido con código 403.",

          orderNumber:
            internalOrderId,

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
        {
          status:
            400,
        }
      );
    }

    /*
     * ============================================================
     * 14. OTROS RECHAZOS
     * ============================================================
     */

    if (
      !supplierResponse.ok ||
      isSupplierRejection(
        supplierData
      )
    ) {
      console.error(
        "FAZERCARDS RECHAZÓ MOBILE LEGENDS:",
        {
          httpStatus:
            supplierResponse.status,

          supplierData,
        }
      );

      await supabaseAdmin
        .from("topup_orders")
        .update({
          status:
            "REJECTED",

          supplier_order_id:
            supplierOrderId,

          supplier_status:
            supplierStatus ??
            "rejected",

          supplier_response:
            supplierData,

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          internalOrderId
        );

      const {
        error: refundError,
      } =
        await supabaseAdmin.rpc(
          "store_gaming_refund_balance",
          {
            p_order_id:
              internalOrderId,
          }
        );

      if (refundError) {
        console.error(
          "ERROR DEVOLVIENDO SALDO:",
          refundError
        );
      }

      reserved = false;

      return NextResponse.json(
        {
          ok: false,

          error:
            supplierData?.error ||
            supplierData?.message ||
            "FazerCards rechazó la orden.",

          orderNumber:
            internalOrderId,

          supplierOrderId,

          status:
            "REJECTED",
        },
        {
          status:
            400,
        }
      );
    }

    /*
     * ============================================================
     * 15. SIN ID DEL PROVEEDOR
     * ============================================================
     */

    if (
      !supplierOrderId
    ) {
      await supabaseAdmin
        .from("topup_orders")
        .update({
          status:
            "SUPPLIER_PENDING",

          supplier_status:
            supplierStatus ??
            "pending",

          supplier_response:
            supplierData,

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          internalOrderId
        );

      reserved = false;

      return NextResponse.json(
        {
          ok: true,

          pending: true,

          orderNumber:
            internalOrderId,

          supplierOrderId:
            null,

          status:
            "SUPPLIER_PENDING",

          offerId:
            offer.id,

          offerName:
            offer.name,

          playerId,

          serverId,

          retailPrice,

          supplierPrice,

          supplierStatus:
            supplierStatus ??
            "pending",
        },
        {
          status:
            202,
        }
      );
    }

    /*
     * ============================================================
     * 16. ESTADO INTERNO
     * ============================================================
     */

    let internalStatus =
      "SUPPLIER_PENDING";

    if (
      isSuccessfulSupplierStatus(
        supplierStatus
      )
    ) {
      internalStatus =
        "COMPLETED";
    }

    /*
     * ============================================================
     * 17. ACTUALIZAR ORDEN
     * ============================================================
     */

    const updateData:
      Record<
        string,
        unknown
      > = {
      supplier_order_id:
        supplierOrderId,

      status:
        internalStatus,

      supplier_status:
        supplierStatus,

      supplier_response:
        supplierData,

      updated_at:
        new Date().toISOString(),
    };

    if (
      internalStatus ===
      "COMPLETED"
    ) {
      updateData.completed_at =
        new Date().toISOString();
    }

    const {
      error: updateError,
    } =
      await supabaseAdmin
        .from("topup_orders")
        .update(
          updateData
        )
        .eq(
          "id",
          internalOrderId
        );

    if (updateError) {
      console.error(
        "ERROR ACTUALIZANDO ORDEN:",
        updateError
      );
    }

    /*
     * ============================================================
     * 18. COMPLETADA
     * ============================================================
     */

    if (
      internalStatus ===
      "COMPLETED"
    ) {
      const {
        error: completeError,
      } =
        await supabaseAdmin.rpc(
          "store_gaming_complete_order",
          {
            p_supplier_order_id:
              supplierOrderId,
          }
        );

      if (completeError) {
        console.error(
          "ERROR COMPLETANDO SALDO:",
          completeError
        );
      }

      reserved = false;
    }

    /*
     * ============================================================
     * 19. RESPUESTA FINAL
     * ============================================================
     */

    return NextResponse.json({
      ok: true,

      orderNumber:
        internalOrderId,

      supplierOrderId,

      status:
        internalStatus,

      offerId:
        offer.id,

      offerName:
        offer.name,

      playerId,

      serverId,

      retailPrice,

      supplierPrice,

      supplierStatus,
    });
  } catch (error) {
    console.error(
      "ERROR MOBILE LEGENDS TOP UP:",
      error
    );

    if (
      internalOrderId &&
      reserved
    ) {
      try {
        await supabaseAdmin.rpc(
          "store_gaming_refund_balance",
          {
            p_order_id:
              internalOrderId,
          }
        );
      } catch (
        refundError
      ) {
        console.error(
          "ERROR EN REEMBOLSO:",
          refundError
        );
      }
    }

    return jsonError(
      error instanceof Error
        ? error.message
        : "Error procesando la compra.",
      500
    );
  }
}
