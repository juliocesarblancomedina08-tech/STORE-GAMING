import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

const FAZER_API_BASE = "https://api.fzr.cards/api/v2";

const CATEGORY_ID = "free_fire_latam";

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

const OFFERS = [
  {
    id: "110_diamonds",
    name: "110 Diamonds",
    retailPrice: 0.78,
    supplierPrice: 0.6972,
  },
  {
    id: "341_diamonds",
    name: "341 Diamonds",
    retailPrice: 2.2,
    supplierPrice: 2.0796,
  },
  {
    id: "572_diamonds",
    name: "572 Diamonds",
    retailPrice: 3.67,
    supplierPrice: 3.5131,
  },
  {
    id: "1166_diamonds",
    name: "1166 Diamonds",
    retailPrice: 6.73,
    supplierPrice: 6.5214,
  },
  {
    id: "2398_diamonds",
    name: "2398 Diamonds",
    retailPrice: 13.27,
    supplierPrice: 12.9519,
  },
  {
    id: "6160_diamonds",
    name: "6160 Diamonds",
    retailPrice: 33.7,
    supplierPrice: 32.9602,
  },
  {
    id: "booyah_pass",
    name: "Pase Elite",
    retailPrice: 4,
    supplierPrice: 3.8738,
  },
  {
    id: "weekly_membership",
    name: "Membresía semanal",
    retailPrice: 2.3,
    supplierPrice: 2.1893,
  },
  {
    id: "monthly_membership",
    name: "Membresía mensual",
    retailPrice: 10.72,
    supplierPrice: 10.482,
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

  if (!authorization.toLowerCase().startsWith("bearer ")) {
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

function isSuccessfulSupplierStatus(status: string | null) {
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

export async function POST(request: NextRequest) {
  let internalOrderId: string | null = null;
  let reserved = false;

  try {
    /*
     * ============================================================
     * 1. OBTENER TOKEN DEL USUARIO
     * ============================================================
     */

    const accessToken = getBearerToken(request);

    if (!accessToken) {
      return jsonError(
        "No autorizado.",
        401
      );
    }

    /*
     * ============================================================
     * 2. VERIFICAR USUARIO EN SUPABASE
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

    const user = userData.user;

    /*
     * ============================================================
     * 3. LEER DATOS DEL PEDIDO
     * ============================================================
     */

    const body = await request.json();

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
     * 4. VALIDACIONES BÁSICAS
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

    /*
     * ============================================================
     * 5. BUSCAR OFERTA EN NUESTRO CATÁLOGO
     * ============================================================
     *
     * No confiamos en el precio enviado por el navegador.
     * El precio válido sale de nuestro servidor.
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

    /*
     * ============================================================
     * 6. COMPROBAR PRECIO DEL FRONTEND
     * ============================================================
     *
     * Esto no es una medida de seguridad principal.
     * Solo sirve para detectar un frontend desactualizado.
     */

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
        "El precio de la oferta ha cambiado. Recargue la página e inténtelo nuevamente.",
        409
      );
    }

    /*
     * ============================================================
     * 7. COMPROBAR IDEMPOTENCIA
     * ============================================================
     *
     * Si el navegador reenvía exactamente la misma petición,
     * no creamos otra orden.
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
          idempotencyKey
        )
        .maybeSingle();

    const existingOrder =
      existingOrderData as ExistingOrder | null;

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
     * 8. DATOS DEL PERFIL
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
     * 9. CREAR ORDEN INTERNA EN RESERVED
     * ============================================================
     */

    const {
      data: insertedOrder,
      error:
        insertOrderError,
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
       * Puede ser una carrera de idempotencia.
       * Intentamos recuperar la orden existente.
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
            idempotencyKey
          )
          .maybeSingle();

      const raceOrder =
        raceOrderData as ExistingOrder | null;

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
     * 10. RESERVAR / DESCONTAR SALDO
     * ============================================================
     *
     * La función SQL bloquea el perfil y comprueba el saldo
     * antes de descontarlo.
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
     * 11. VERIFICAR API KEY DE FAZERCARDS
     * ============================================================
     */

    const fazerApiKey =
      process.env
        .FAZERCARDS_API_KEY;

    if (!fazerApiKey) {
      console.error(
        "Falta FAZERCARDS_API_KEY."
      );

      /*
       * Devolvemos el saldo porque todavía
       * no hemos enviado nada al proveedor.
       */

      try {
        await supabaseAdmin.rpc(
          "refund_topup_balance",
          {
            p_order_id:
              internalOrderId,
          }
        );

        reserved = false;
      } catch (refundError) {
        console.error(
          "ERROR DEVOLVIENDO SALDO:",
          refundError
        );
      }

      return jsonError(
        "El servicio de recargas no está configurado.",
        500
      );
    }

    /*
     * ============================================================
     * 12. CREAR ORDEN DIRECTAMENTE EN FAZERCARDS
     * ============================================================
     *
     * IMPORTANTE:
     *
     * NO usamos /topups/validate-id.
     *
     * FazerCards confirmó que esta categoría no soporta
     * validación previa de ID:
     *
     * "ID validation is not available for this category_id"
     *
     * Por eso enviamos directamente:
     *
     * POST /topups/order
     *
     * con:
     *
     * category_id
     * offer_id
     * fields.player_id
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

              "X-API-Key":
                fazerApiKey,

              "Idempotency-Key":
                idempotencyKey,
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

            cache: "no-store",
          }
        );
    } catch (supplierNetworkError) {
      console.error(
        "ERROR DE RED CON FAZERCARDS:",
        supplierNetworkError
      );

      /*
       * MUY IMPORTANTE:
       *
       * Si no sabemos si FazerCards recibió la petición,
       * NO devolvemos automáticamente el saldo.
       *
       * La orden queda SUPPLIER_PENDING para revisión/reintento.
       */

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

          retailPrice,

          supplierPrice,

          supplierStatus:
            null,

          message:
            "La orden quedó pendiente de confirmación del proveedor.",
        },
        {
          status: 202,
        }
      );
    }

    /*
     * ============================================================
     * 13. LEER RESPUESTA DE FAZERCARDS
     * ============================================================
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
     * 14. FAZERCARDS RECHAZÓ LA ORDEN
     * ============================================================
     */

    if (
      !supplierResponse.ok ||
      isSupplierRejection(
        supplierData
      )
    ) {
      console.error(
        "FAZERCARDS RECHAZÓ LA ORDEN:",
        {
          httpStatus:
            supplierResponse.status,

          supplierData,
        }
      );

      /*
       * Si el proveedor rechazó claramente la orden,
       * podemos devolver el saldo.
       */

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
            internalOrderId
          );

        return jsonError(
          "El proveedor rechazó la orden y el reembolso quedó pendiente.",
          502
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
            "REFUNDED",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ============================================================
     * 15. RESPUESTA NO CLARA DEL PROVEEDOR
     * ============================================================
     *
     * Si FazerCards responde algo que no nos permite determinar
     * claramente el resultado, NO hacemos reembolso automático.
     */

    if (
      !supplierOrderId
    ) {
      console.warn(
        "FAZERCARDS RESPONDIÓ SIN ID DE ORDEN:",
        supplierData
      );

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

          retailPrice,

          supplierPrice,

          supplierStatus,
        },
        {
          status: 202,
        }
      );
    }

    /*
     * ============================================================
     * 16. MAPEAR ESTADO DE FAZERCARDS
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
     * 17. ACTUALIZAR ORDEN INTERNA
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

    if (updateOrderError) {
      /*
       * NO reembolsamos aquí automáticamente.
       *
       * FazerCards ya recibió/aceptó la orden.
       * Devolver el dinero ahora podría provocar una doble
       * pérdida si la recarga termina completándose.
       */

      console.error(
        "ERROR ACTUALIZANDO ORDEN INTERNA:",
        updateOrderError
      );

      return jsonError(
        "La orden fue enviada al proveedor, pero no se pudo actualizar su registro interno.",
        500
      );
    }

    /*
     * ============================================================
     * 18. SI FAZERCARDS YA DEVOLVIÓ COMPLETED
     * ============================================================
     *
     * El webhook también podrá llamar a complete_topup_order().
     * La función es idempotente.
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

      if (completeError) {
        console.error(
          "ERROR MARCANDO COMPLETED:",
          completeError
        );

        /*
         * No devolvemos saldo.
         * La orden del proveedor ya fue completada.
         */
      }
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

      retailPrice,

      supplierPrice,

      supplierStatus,
    });
  } catch (error) {
    /*
     * ============================================================
     * ERROR GENERAL
     * ============================================================
     */

    console.error(
      "ERROR GENERAL CREANDO TOPUP:",
      error
    );

    /*
     * Solo intentamos devolver el saldo si la orden todavía
     * estaba RESERVED.
     *
     * Si FazerCards pudo haber recibido la orden, NO hacemos
     * un reembolso automático.
     */

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
            .select(
              "status"
            )
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

          if (refundError) {
            console.error(
              "ERROR EN REEMBOLSO DEL CATCH:",
              refundError
            );
          }
        }
      } catch (refundCatchError) {
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
