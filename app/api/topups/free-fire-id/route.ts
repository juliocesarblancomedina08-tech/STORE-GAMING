import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import { FREE_FIRE_ID } from "../../../../lib/games/free-fire-id";

export const dynamic = "force-dynamic";

const FAZER_API_BASE =
  process.env.FAZERCARDS_API_URL ||
  "https://api.fzr.cards/api/v2";

const FAZER_API_KEY =
  process.env.FAZERCARDS_API_KEY || "";

const CATEGORY_ID = "free_fire_id";

const STORE_MARGIN = 0.20;

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

export async function POST(
  request: NextRequest
) {
  let insertedOrderId: string | null = null;
  let reserved = false;

  try {
    /*
     * ============================================================
     * 1. AUTENTICACIÓN
     * ============================================================
     */

    const authorization =
      request.headers.get("authorization") || "";

    if (
      !authorization.startsWith("Bearer ")
    ) {
      return jsonError(
        "Sesión no válida.",
        401
      );
    }

    const accessToken =
      authorization
        .slice(7)
        .trim();

    if (!accessToken) {
      return jsonError(
        "Sesión no válida.",
        401
      );
    }

    const {
      data: { user },
      error: authError,
    } =
      await supabaseAdmin.auth.getUser(
        accessToken
      );

    if (authError || !user) {
      return jsonError(
        "Su sesión ha expirado. Inicie sesión nuevamente.",
        401
      );
    }

    /*
     * ============================================================
     * 2. LEER DATOS
     * ============================================================
     */

    const body =
      await request.json();

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
        : "";

    const idempotencyKey =
      typeof body.idempotencyKey ===
      "string"
        ? body.idempotencyKey.trim()
        : "";

    const clientRetailPrice =
      Number(body.retailPrice);

    if (!offerId) {
      return jsonError(
        "Seleccione una oferta."
      );
    }

    if (!playerId) {
      return jsonError(
        "Introduzca su ID de jugador."
      );
    }

    if (
      !/^[0-9]+$/.test(playerId)
    ) {
      return jsonError(
        "El ID debe contener solamente números."
      );
    }

    if (
      playerId.length < 4 ||
      playerId.length > 20
    ) {
      return jsonError(
        "El ID parece no tener un formato válido."
      );
    }

    if (!idempotencyKey) {
      return jsonError(
        "Falta la clave de seguridad del pedido."
      );
    }

    /*
     * ============================================================
     * 3. BUSCAR OFERTA
     * ============================================================
     */

    const offer =
      FREE_FIRE_ID.offers.find(
        (item) =>
          item.id === offerId
      );

    if (!offer) {
      return jsonError(
        "La oferta seleccionada no existe."
      );
    }

    const expectedRetailPrice =
      Number(
        (
          offer.supplierPrice +
          STORE_MARGIN
        ).toFixed(4)
      );

    if (
      !Number.isFinite(
        clientRetailPrice
      ) ||
      Math.abs(
        clientRetailPrice -
          expectedRetailPrice
      ) > 0.01
    ) {
      return jsonError(
        "El precio de la oferta no coincide con el catálogo."
      );
    }

    const retailPrice =
      expectedRetailPrice;

    /*
     * ============================================================
     * 4. IDEMPOTENCIA
     * ============================================================
     */

    const {
      data: existingOrder,
      error: existingOrderError,
    } =
      await supabaseAdmin
        .from("topup_orders")
        .select("*")
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
        "ERROR COMPROBANDO IDEMPOTENCIA:",
        existingOrderError
      );

      return jsonError(
        "No se pudo comprobar la orden.",
        500
      );
    }

    if (existingOrder) {
      return NextResponse.json({
        ok: true,
        reused: true,
        id: existingOrder.id,
        orderNumber:
          existingOrder.id,
        supplierOrderId:
          existingOrder.supplier_order_id,
        status:
          existingOrder.status,
      });
    }

    /*
     * ============================================================
     * 5. COMPROBAR SALDO
     * ============================================================
     */

    const {
      data: profile,
      error: profileError,
    } =
      await supabaseAdmin
        .from("profiles")
        .select("balance")
        .eq(
          "id",
          user.id
        )
        .maybeSingle();

    if (profileError) {
      console.error(
        "ERROR OBTENIENDO BALANCE:",
        profileError
      );

      return jsonError(
        "No se pudo comprobar el saldo.",
        500
      );
    }

    const balance =
      Number(
        profile?.balance || 0
      );

    if (
      balance < retailPrice
    ) {
      return jsonError(
        "SALDO INSUFICIENTE",
        400
      );
    }

    /*
     * ============================================================
     * 6. CREAR ORDEN INTERNA
     * ============================================================
     */

    const {
      data: insertedOrder,
      error: insertError,
    } =
      await supabaseAdmin
        .from("topup_orders")
        .insert({
          user_id:
            user.id,

          game:
            FREE_FIRE_ID.name,

          category_id:
            CATEGORY_ID,

          offer_id:
            offer.id,

          offer_name:
            offerName ||
            offer.name,

          player_id:
            playerId,

          retail_price:
            retailPrice,

          supplier_price:
            offer.supplierPrice,

          currency:
            "USDT",

          status:
            "RESERVED",

          idempotency_key:
            idempotencyKey,

          supplier_fields: {
            player_id:
              playerId,
          },
        })
        .select("*")
        .single();

    if (
      insertError ||
      !insertedOrder
    ) {
      console.error(
        "ERROR CREANDO TOPUP_ORDER:",
        insertError
      );

      return jsonError(
        "No se pudo crear la orden.",
        500
      );
    }

    insertedOrderId =
      insertedOrder.id;

    /*
     * ============================================================
     * 7. RESERVAR SALDO
     * ============================================================
     */

    const {
      data: reserveResult,
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
          insertedOrderId
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

    if (
      reserveResult === false
    ) {
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
          insertedOrderId
        );

      return jsonError(
        "SALDO INSUFICIENTE",
        400
      );
    }

    reserved = true;

    /*
     * ============================================================
     * 8. COMPROBAR API KEY
     * ============================================================
     */

    if (!FAZER_API_KEY) {
      console.error(
        "FALTA FAZERCARDS_API_KEY"
      );

      await supabaseAdmin.rpc(
        "refund_topup_balance",
        {
          p_order_id:
            insertedOrderId,
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
     * 9. ENVIAR PEDIDO A FAZERCARDS
     * ============================================================
     */

    const supplierPayload = {
      category_id:
        CATEGORY_ID,

      offer_id:
        offer.id,

      fields: {
        player_id:
          playerId,
      },
    };

    console.log(
      "ENVIANDO PEDIDO A FAZERCARDS:",
      JSON.stringify(
        supplierPayload
      )
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
                idempotencyKey,

              "User-Agent":
                "STORE-GAMING/1.0",
            },

            body: JSON.stringify(
              supplierPayload
            ),
          }
        );
    } catch (
      supplierNetworkError
    ) {
      console.error(
        "ERROR DE RED CON FAZERCARDS:",
        supplierNetworkError
      );

      await supabaseAdmin
        .from("topup_orders")
        .update({
          status:
            "SUPPLIER_PENDING",

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          insertedOrderId
        );

      return NextResponse.json(
        {
          ok: true,

          orderNumber:
            insertedOrderId,

          id:
            insertedOrderId,

          supplierOrderId:
            null,

          status:
            "SUPPLIER_PENDING",

          message:
            "La orden fue creada y quedó pendiente de confirmación del proveedor.",
        },
        {
          status: 202,
        }
      );
    }

    /*
     * ============================================================
     * 10. LEER RESPUESTA
     * ============================================================
     */

    const responseText =
      await supplierResponse.text();

    let supplierData: any =
      {};

    try {
      supplierData =
        responseText
          ? JSON.parse(
              responseText
            )
          : {};
    } catch {
      supplierData = {
        raw:
          responseText,
      };
    }

    console.log(
      "RESPUESTA DE FAZERCARDS:",
      JSON.stringify(
        supplierData
      )
    );

    /*
     * ============================================================
     * 11. OBTENER ID DEL PROVEEDOR
     * ============================================================
     */

    const supplierOrderId =
      supplierData?.order_id ||
      supplierData?.orderId ||
      supplierData?.id ||
      supplierData?.data?.order_id ||
      supplierData?.data?.orderId ||
      supplierData?.data?.id ||
      null;

    const supplierStatus =
      String(
        supplierData?.status ||
          supplierData?.data?.status ||
          ""
      ).toUpperCase();

    /*
     * ============================================================
     * 12. PROVEEDOR RECHAZÓ
     * ============================================================
     */

    if (
      !supplierResponse.ok
    ) {
      console.error(
        "FAZERCARDS RECHAZÓ LA ORDEN:",
        supplierResponse.status,
        supplierData
      );

      let refundError:
        unknown = null;

      try {
        await supabaseAdmin.rpc(
          "refund_topup_balance",
          {
            p_order_id:
              insertedOrderId,
          }
        );

        reserved = false;
      } catch (error) {
        refundError = error;

        console.error(
          "ERROR DEVOLVIENDO SALDO:",
          error
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
            refundError
              ? "REFUND_PENDING"
              : "REFUNDED",

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          insertedOrderId
        );

      if (refundError) {
        return jsonError(
          "El proveedor rechazó la orden y la devolución del saldo quedó pendiente.",
          502
        );
      }

      return jsonError(
        supplierData?.message ||
          supplierData?.error ||
          "El proveedor rechazó la orden.",
        400
      );
    }

    /*
     * ============================================================
     * 13. DETERMINAR ESTADO
     * ============================================================
     */

    let finalStatus =
      "SUPPLIER_PENDING";

    if (
      [
        "COMPLETED",
        "SUCCESS",
        "SUCCEEDED",
        "DONE",
      ].includes(
        supplierStatus
      )
    ) {
      finalStatus =
        "COMPLETED";
    }

    if (
      [
        "FAILED",
        "FAILURE",
        "REFUNDED",
        "CANCELLED",
        "CANCELED",
      ].includes(
        supplierStatus
      )
    ) {
      finalStatus =
        "FAILED";
    }

    /*
     * ============================================================
     * 14. ACTUALIZAR ORDEN
     * ============================================================
     */

    await supabaseAdmin
      .from("topup_orders")
      .update({
        supplier_order_id:
          supplierOrderId,

        supplier_response:
          supplierData,

        status:
          finalStatus,

        completed_at:
          finalStatus ===
          "COMPLETED"
            ? new Date().toISOString()
            : null,

        failed_at:
          finalStatus ===
          "FAILED"
            ? new Date().toISOString()
            : null,

        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        insertedOrderId
      );

    /*
     * ============================================================
     * 15. SI FALLÓ, DEVOLVER SALDO
     * ============================================================
     */

    if (
      finalStatus ===
      "FAILED"
    ) {
      try {
        await supabaseAdmin.rpc(
          "refund_topup_balance",
          {
            p_order_id:
              insertedOrderId,
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

        await supabaseAdmin
          .from("topup_orders")
          .update({
            status:
              "REFUND_PENDING",

            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            insertedOrderId
          );
      }
    }

    /*
     * ============================================================
     * 16. RESPUESTA FINAL
     * ============================================================
     */

    return NextResponse.json({
      ok: true,

      reused: false,

      id:
        insertedOrderId,

      orderNumber:
        insertedOrderId,

      supplierOrderId:
        supplierOrderId,

      status:
        finalStatus,

      offerId:
        offer.id,

      offerName:
        offer.name,

      playerId,

      retailPrice,

      supplierPrice:
        offer.supplierPrice,

      currency:
        "USDT",
    });
  } catch (error) {
    console.error(
      "ERROR GENERAL FREE FIRE ID:",
      error
    );

    /*
     * Si ya existe una orden y ocurrió
     * un error después, NO crear otra.
     */

    if (insertedOrderId) {
      await supabaseAdmin
        .from("topup_orders")
        .update({
          status:
            reserved
              ? "SUPPLIER_PENDING"
              : "FAILED",

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          insertedOrderId
        );
    }

    return jsonError(
      "No se pudo procesar la orden.",
      500
    );
  }
                          }
