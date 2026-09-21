import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";

const FAZER_API_BASE = "https://api.fzr.cards/api/v2";
const CATEGORY_ID = "mobile_legends_united_states";
const GAME_NAME = "Mobile Legends";

type Offer = {
  id: string;
  name: string;
  retailPrice: number;
  supplierPrice: number;
};

const OFFERS: Offer[] = [
  {
    id: "51_5_diamonds",
    name: "51 + 5 Diamantes",
    retailPrice: 1.02,
    supplierPrice: 0.8665,
  },
  {
    id: "weekly_diamond_pass",
    name: "Pase semanal de diamantes",
    retailPrice: 1.89,
    supplierPrice: 1.743,
  },
  {
    id: "253_25_diamonds",
    name: "253 + 25 Diamantes",
    retailPrice: 4.49,
    supplierPrice: 4.3423,
  },
  {
    id: "505_66_diamantes",
    name: "505 + 66 Diamantes",
    retailPrice: 8.85,
    supplierPrice: 8.7048,
  },
  {
    id: "1010_182_diamantes",
    name: "1010 + 182 Diamantes",
    retailPrice: 17.49,
    supplierPrice: 17.3391,
  },
  {
    id: "1515_273_diamantes",
    name: "1515 + 273 Diamantes",
    retailPrice: 26.14,
    supplierPrice: 25.9935,
  },
  {
    id: "2525_480_diamantes",
    name: "2525 + 480 Diamantes",
    retailPrice: 43.47,
    supplierPrice: 43.3225,
  },
  {
    id: "3030_576_diamantes",
    name: "3030 + 576 Diamantes",
    retailPrice: 52.14,
    supplierPrice: 51.987,
  },
  {
    id: "4008_802_diamantes",
    name: "4008 + 802 Diamantes",
    retailPrice: 69.47,
    supplierPrice: 69.316,
  },
  {
    id: "5010_1002_diamantes",
    name: "5010 + 1002 Diamantes",
    retailPrice: 86.8,
    supplierPrice: 86.645,
  },
];

type ExistingOrder = {
  id: string;
  status: string | null;
  supplier_order_id: string | null;
  offer_id: string | null;
  offer_name: string | null;
  player_id: string | null;
  retail_price: number | null;
  supplier_price: number | null;
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
    { status }
  );
}

function getOffer(
  offerId: string
): Offer | null {
  return (
    OFFERS.find(
      (offer) => offer.id === offerId
    ) ?? null
  );
}

function isSuccessfulSupplierStatus(
  status: string
): boolean {
  const normalized = status
    .toLowerCase()
    .trim();

  return [
    "completed",
    "complete",
    "success",
    "successful",
    "delivered",
    "done",
  ].includes(normalized);
}

function isRejectedSupplierStatus(
  status: string
): boolean {
  const normalized = status
    .toLowerCase()
    .trim();

  return [
    "rejected",
    "failed",
    "failure",
    "cancelled",
    "canceled",
    "error",
  ].includes(normalized);
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
     * 1. AUTENTICACIÓN
     * ============================================================
     */

    const authorization =
      request.headers.get(
        "authorization"
      );

    if (
      !authorization ||
      !authorization.startsWith(
        "Bearer "
      )
    ) {
      return jsonError(
        "No autorizado.",
        401
      );
    }

    const accessToken =
      authorization
        .replace("Bearer ", "")
        .trim();

    if (!accessToken) {
      return jsonError(
        "Token de acceso inválido.",
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
      !userData.user
    ) {
      console.error(
        "ERROR OBTENIENDO USUARIO:",
        userError
      );

      return jsonError(
        "Sesión inválida o expirada.",
        401
      );
    }

    const user =
      userData.user;

    /*
     * ============================================================
     * 2. LEER DATOS DEL PEDIDO
     * ============================================================
     */

    const body =
      await request.json();

    const offerId =
      typeof body?.offerId === "string"
        ? body.offerId.trim()
        : "";

    const playerId =
      typeof body?.playerId === "string"
        ? body.playerId.trim()
        : "";

    const serverId =
      typeof body?.serverId === "string"
        ? body.serverId.trim()
        : "";

    const idempotencyKey =
      typeof body?.idempotencyKey ===
      "string"
        ? body.idempotencyKey.trim()
        : "";

    /*
     * ============================================================
     * 3. VALIDAR OFERTA
     * ============================================================
     */

    const offer =
      getOffer(offerId);

    if (!offer) {
      return jsonError(
        "La oferta seleccionada no existe.",
        400
      );
    }

    /*
     * ============================================================
     * 4. VALIDAR ID DEL JUGADOR
     * ============================================================
     */

    if (!playerId) {
      return jsonError(
        "Debe introducir el ID del jugador.",
        400
      );
    }

    if (
      !/^[0-9]+$/.test(
        playerId
      )
    ) {
      return jsonError(
        "El ID del jugador debe contener solamente números.",
        400
      );
    }

    if (
      playerId.length < 3 ||
      playerId.length > 20
    ) {
      return jsonError(
        "El ID del jugador no es válido.",
        400
      );
    }

    /*
     * ============================================================
     * 5. VALIDAR ID DEL SERVIDOR
     * ============================================================
     */

    if (!serverId) {
      return jsonError(
        "Debe introducir el ID del servidor.",
        400
      );
    }

    if (
      !/^[0-9]+$/.test(
        serverId
      )
    ) {
      return jsonError(
        "El ID del servidor debe contener solamente números.",
        400
      );
    }

    if (
      serverId.length < 1 ||
      serverId.length > 20
    ) {
      return jsonError(
        "El ID del servidor no es válido.",
        400
      );
    }

    /*
     * ============================================================
     * 6. CLAVE DE IDEMPOTENCIA
     * ============================================================
     */

    const finalIdempotencyKey =
      idempotencyKey ||
      crypto.randomUUID();

    /*
     * ============================================================
     * 7. COMPROBAR SI YA EXISTE LA ORDEN
     * ============================================================
     */

    const {
      data: existingOrderData,
      error:
        existingOrderError,
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
          finalIdempotencyKey
        )
        .maybeSingle();

    const existingOrder =
      existingOrderData as unknown as
        | ExistingOrder
        | null;

    if (
      existingOrderError &&
      existingOrderError.code !==
        "PGRST116"
    ) {
      console.error(
        "ERROR COMPROBANDO IDEMPOTENCIA:",
        existingOrderError
      );
    }

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
     * 8. CREAR ORDEN INTERNA
     * ============================================================
     */

    const username =
      user.user_metadata
        ?.username ??
      user.user_metadata
        ?.user_name ??
      null;

    const email =
      user.email ?? null;

    const {
      data: insertedOrder,
      error:
        insertOrderError,
    } =
      await supabaseAdmin
        .from("topup_orders")
        .insert({
          user_id:
            user.id,

          username,

          email,

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
            offer.retailPrice,

          supplier_price:
            offer.supplierPrice,

          currency:
            "USD",

          status:
            "RESERVED",

          idempotency_key:
            finalIdempotencyKey,

          supplier_fields: {
            player_id:
              playerId,

            id_servidor:
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

      /*
       * Puede existir una carrera de idempotencia.
       */

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
            finalIdempotencyKey
          )
          .maybeSingle();

      const raceOrder =
        raceOrderData as unknown as
          | ExistingOrder
          | null;

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
      error:
        reserveError,
    } =
      await supabaseAdmin.rpc(
        "reserve_topup_balance",
        {
          p_user_id:
            user.id,

          p_amount:
            offer.retailPrice,
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

      return jsonError(
        reserveError.message ||
          "No se pudo reservar el saldo.",
        400
      );
    }

    reserved = true;

    /*
     * ============================================================
     * 10. COMPROBAR API KEY
     * ============================================================
     */

    const fazerApiKey =
      process.env
        .FAZERCARDS_API_KEY;

    if (!fazerApiKey) {
      console.error(
        "Falta FAZERCARDS_API_KEY."
      );

      try {
        await supabaseAdmin.rpc(
          "refund_topup_balance",
          {
            p_order_id:
              internalOrderId,
          }
        );

        reserved = false;
      } catch (
        refundError
      ) {
        console.error(
          "ERROR DEVOLVIENDO SALDO:",
          refundError
        );
      }

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

      return jsonError(
        "El servicio de recargas no está configurado.",
        500
      );
    }

    /*
     * ============================================================
     * 11. ENVIAR PEDIDO A FAZERCARDS
     * ============================================================
     *
     * IMPORTANTE:
     *
     * FazerCards está exigiendo:
     *
     * player_id
     *
     * Para el servidor mantenemos:
     *
     * id_servidor
     *
     * ============================================================
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
                fazerApiKey,

              "Idempotency-Key":
                finalIdempotencyKey,

              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36",

              Referer:
                "https://reseller.fazercards.com/",

              Origin:
                "https://reseller.fazercards.com",
            },

            body:
              JSON.stringify({
                category_id:
                  CATEGORY_ID,

                offer_id:
                  offer.id,

                fields: {
                  player_id:
                    playerId,

                  id_servidor:
                    serverId,
                },
              }),
          }
        );
    } catch (
      supplierConnectionError
    ) {
      console.error(
        "ERROR CONECTANDO CON FAZERCARDS:",
        supplierConnectionError
      );

      if (
        reserved &&
        internalOrderId
      ) {
        try {
          await supabaseAdmin.rpc(
            "refund_topup_balance",
            {
              p_order_id:
                internalOrderId,
            }
          );

          reserved = false;
        } catch (
          refundError
        ) {
          console.error(
            "ERROR DEVOLVIENDO SALDO:",
            refundError
          );
        }
      }

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

      return jsonError(
        "No se pudo conectar con FazerCards.",
        502
      );
    }

    /*
     * ============================================================
     * 12. LEER RESPUESTA DE FAZERCARDS
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
      supplierData =
        supplierText;
    }

    console.log(
      "FAZERCARDS MOBILE LEGENDS:",
      supplierResponse.status,
      supplierData
    );

    /*
     * ============================================================
     * 13. ID DEL PEDIDO DEL PROVEEDOR
     * ============================================================
     */

    const supplierOrderId =
      supplierData?.order_id ??
      supplierData?.id ??
      supplierData?.order?.id ??
      supplierData?.data?.order_id ??
      supplierData?.data?.id ??
      null;

    const supplierStatus =
      String(
        supplierData?.status ??
          supplierData?.order?.status ??
          supplierData?.data?.status ??
          ""
      ).trim();

    /*
     * ============================================================
     * 14. FAZERCARDS RECHAZÓ
     * ============================================================
     */

    if (
      !supplierResponse.ok
    ) {
      console.error(
        "FAZERCARDS RECHAZÓ MOBILE LEGENDS:",
        {
          status:
            supplierResponse.status,

          response:
            supplierData,
        }
      );

      if (
        reserved &&
        internalOrderId
      ) {
        const {
          error:
            refundError,
        } =
          await supabaseAdmin.rpc(
            "refund_topup_balance",
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
        } else {
          reserved = false;
        }
      }

      await supabaseAdmin
        .from("topup_orders")
        .update({
          status:
            "FAILED",

          supplier_order_id:
            supplierOrderId,

          supplier_status:
            supplierStatus ||
            `HTTP_${supplierResponse.status}`,

          supplier_response:
            supplierData,

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          internalOrderId
        );

      return NextResponse.json(
        {
          ok: false,

          error:
            "FazerCards rechazó el pedido.",

          supplierStatus:
            supplierResponse.status,

          supplierResponse:
            supplierData,
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ============================================================
     * 15. FAZERCARDS NO DEVOLVIÓ ID
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

          supplier_response:
            supplierData,

          supplier_status:
            supplierStatus ||
            "pending",

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          internalOrderId
        );

      return NextResponse.json(
        {
          ok: true,

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

          retailPrice:
            offer.retailPrice,

          supplierPrice:
            offer.supplierPrice,

          supplierStatus:
            supplierStatus ||
            "pending",
        },
        {
          status: 202,
        }
      );
    }

    /*
     * ============================================================
     * 16. DETERMINAR ESTADO
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

    if (
      isRejectedSupplierStatus(
        supplierStatus
      )
    ) {
      internalStatus =
        "FAILED";
    }

    /*
     * ============================================================
     * 17. ACTUALIZAR ORDEN
     * ============================================================
     */

    const updateData: Record<
      string,
      unknown
    > = {
      supplier_order_id:
        supplierOrderId,

      status:
        internalStatus,

      supplier_status:
        supplierStatus ||
        "pending",

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

    if (
      internalStatus ===
      "FAILED"
    ) {
      updateData.failed_at =
        new Date().toISOString();
    }

    const {
      error:
        updateOrderError,
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

    if (
      updateOrderError
    ) {
      console.error(
        "ERROR ACTUALIZANDO ORDEN:",
        updateOrderError
      );

      return jsonError(
        "La orden fue enviada al proveedor, pero no se pudo actualizar su registro interno.",
        500
      );
    }

    /*
     * ============================================================
     * 18. PROVEEDOR RECHAZÓ
     * ============================================================
     */

    if (
      internalStatus ===
      "FAILED"
    ) {
      if (
        reserved &&
        internalOrderId
      ) {
        const {
          error:
            refundError,
        } =
          await supabaseAdmin.rpc(
            "refund_topup_balance",
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
        } else {
          reserved = false;
        }
      }

      return NextResponse.json(
        {
          ok: false,

          error:
            "FazerCards rechazó el pedido.",

          orderNumber:
            internalOrderId,

          supplierOrderId,

          status:
            "FAILED",

          offerId:
            offer.id,

          offerName:
            offer.name,

          playerId,

          serverId,

          retailPrice:
            offer.retailPrice,

          supplierPrice:
            offer.supplierPrice,

          supplierStatus,
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ============================================================
     * 19. PROVEEDOR COMPLETÓ INMEDIATAMENTE
     * ============================================================
     */

    if (
      internalStatus ===
      "COMPLETED"
    ) {
      const {
        error:
          completeError,
      } =
        await supabaseAdmin.rpc(
          "complete_topup_order",
          {
            p_supplier_order_id:
              supplierOrderId,
          }
        );

      if (
        completeError
      ) {
        console.error(
          "ERROR COMPLETANDO ORDEN:",
          completeError
        );
      } else {
        reserved = false;
      }
    }

    /*
     * ============================================================
     * 20. RESPUESTA FINAL
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

      retailPrice:
        offer.retailPrice,

      supplierPrice:
        offer.supplierPrice,

      supplierStatus:
        supplierStatus ||
        "pending",
    });
  } catch (error) {
    /*
     * ============================================================
     * ERROR GENERAL
     * ============================================================
     */

    console.error(
      "ERROR GENERAL MOBILE LEGENDS:",
      error
    );

    if (
      internalOrderId &&
      reserved
    ) {
      try {
        const {
          data: currentOrder,
        } =
          await supabaseAdmin
            .from("topup_orders")
            .select("status")
            .eq(
              "id",
              internalOrderId
            )
            .maybeSingle();

        if (
          currentOrder?.status ===
          "RESERVED"
        ) {
          const {
            error:
              refundError,
          } =
            await supabaseAdmin.rpc(
              "refund_topup_balance",
              {
                p_order_id:
                  internalOrderId,
              }
            );

          if (
            refundError
          ) {
            console.error(
              "ERROR EN REEMBOLSO DEL CATCH:",
              refundError
            );
          }
        }
      } catch (
        refundCatchError
      ) {
        console.error(
          "ERROR INTENTANDO REEMBOLSO:",
          refundCatchError
        );
      }
    }

    return jsonError(
      "No se pudo procesar la orden.",
      500
    );
  }
}
