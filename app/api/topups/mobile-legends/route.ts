
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const FAZER_API_BASE = (
  process.env.FAZERCARDS_API_URL ||
  "https://api.fzr.cards/api/v2"
).replace(/\/+$/, "");

const CATEGORY_ID = "mobile_legends_united_states";
const GAME_NAME = "Mobile Legends";
const VIP_MARKUP = 0.08;

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
  user_id: string;
  status: string | null;
  supplier_order_id: string | null;
  offer_id: string | null;
  offer_name: string | null;
  player_id: string | null;
  retail_price: number | null;
  supplier_price: number | null;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json(
    {
      ok: false,
      error: message,
    },
    { status }
  );
}

function getOffer(offerId: string): Offer | null {
  return OFFERS.find((offer) => offer.id === offerId) ?? null;
}

function isSuccessfulSupplierStatus(status: string): boolean {
  const normalized = status.toLowerCase().trim();

  return [
    "completed",
    "complete",
    "success",
    "successful",
    "delivered",
    "done",
  ].includes(normalized);
}

function isRejectedSupplierStatus(status: string): boolean {
  const normalized = status.toLowerCase().trim();

  return [
    "rejected",
    "failed",
    "failure",
    "cancelled",
    "canceled",
    "error",
    "refund",
    "refunded",
    "refund_success",
  ].includes(normalized);
}

function getSupplierOrderId(data: any): string | null {
  const id =
    data?.order?.id ??
    data?.data?.order?.id ??
    data?.order_id ??
    data?.orderId ??
    data?.data?.order_id ??
    data?.data?.orderId ??
    data?.data?.id ??
    data?.id ??
    null;

  return id == null ? null : String(id);
}

export async function POST(request: NextRequest) {
  let internalOrderId: string | null = null;
  let reserved = false;

  try {
    /*
     * 1. AUTENTICACIÓN
     */

    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return jsonError("No autorizado.", 401);
    }

    const accessToken = authorization.slice(7).trim();

    if (!accessToken) {
      return jsonError("Token de acceso inválido.", 401);
    }

    const {
      data: userData,
      error: userError,
    } = await supabaseAdmin.auth.getUser(accessToken);

    if (userError || !userData.user) {
      console.error("ERROR OBTENIENDO USUARIO:", userError);

      return jsonError("Sesión inválida o expirada.", 401);
    }

    const user = userData.user;

    /*
     * 2. LEER DATOS
     */

    let body: any;

    try {
      body = await request.json();
    } catch {
      return jsonError("La solicitud no contiene JSON válido.", 400);
    }

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
      typeof body?.idempotencyKey === "string"
        ? body.idempotencyKey.trim()
        : "";

    /*
     * 3. VALIDAR OFERTA
     */

    const offer = getOffer(offerId);

    if (!offer) {
      return jsonError("La oferta seleccionada no existe.", 400);
    }

    /*
     * 4. VALIDAR PLAYER ID
     */

    if (!/^[0-9]{3,20}$/.test(playerId)) {
      return jsonError(
        "El ID del jugador debe contener entre 3 y 20 números.",
        400
      );
    }

    /*
     * 5. VALIDAR SERVER ID
     */

    if (!/^[0-9]{1,20}$/.test(serverId)) {
      return jsonError(
        "El ID del servidor debe contener entre 1 y 20 números.",
        400
      );
    }

    /*
     * 6. VALIDAR IDEMPOTENCIA
     */

    if (
      !idempotencyKey ||
      idempotencyKey.length < 10 ||
      idempotencyKey.length > 100
    ) {
      return jsonError("La clave de la orden no es válida.", 400);
    }

    /*
     * 7. COMPROBAR VIP DIRECTAMENTE EN SUPABASE
     */

    const {
      data: profile,
      error: profileError,
    } = await supabaseAdmin
      .from("profiles")
      .select("vip_expires_at")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("ERROR CONSULTANDO VIP:", profileError);

      return jsonError(
        "No se pudo comprobar tu membresía VIP.",
        500
      );
    }

    const vipExpiresAt = profile?.vip_expires_at
      ? new Date(profile.vip_expires_at).getTime()
      : 0;

    const vipActive =
      Number.isFinite(vipExpiresAt) &&
      vipExpiresAt > Date.now();

    /*
     * 8. CALCULAR PRECIO EN EL SERVIDOR
     */

    const supplierPrice = Number(offer.supplierPrice);

    const retailPrice = vipActive
      ? Number((supplierPrice + VIP_MARKUP).toFixed(4))
      : Number(offer.retailPrice);

    if (
      !Number.isFinite(supplierPrice) ||
      supplierPrice <= 0 ||
      !Number.isFinite(retailPrice) ||
      retailPrice <= 0
    ) {
      return jsonError("El precio de la oferta no es válido.", 400);
    }

    console.log("MOBILE LEGENDS PRICE CHECK:", {
      offerId: offer.id,
      supplierPrice,
      retailPrice,
      vipActive,
    });

    /*
     * 9. BUSCAR ORDEN EXISTENTE
     */

    const {
      data: existingOrderData,
      error: existingOrderError,
    } = await supabaseAdmin
      .from("topup_orders")
      .select(
        [
          "id",
          "user_id",
          "status",
          "supplier_order_id",
          "offer_id",
          "offer_name",
          "player_id",
          "retail_price",
          "supplier_price",
        ].join(",")
      )
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (existingOrderError) {
      console.error(
        "ERROR COMPROBANDO IDEMPOTENCIA:",
        existingOrderError
      );

      return jsonError(
        "No se pudo comprobar la orden anterior.",
        500
      );
    }

    const existingOrder =
      existingOrderData as ExistingOrder | null;

    if (existingOrder) {
      if (
        existingOrder.user_id !== user.id ||
        existingOrder.offer_id !== offer.id ||
        String(existingOrder.player_id) !== playerId
      ) {
        return jsonError(
          "La clave ya fue utilizada con otros datos.",
          409
        );
      }

      return NextResponse.json({
        ok: true,
        alreadyCreated: true,
        orderNumber: existingOrder.id,
        supplierOrderId: existingOrder.supplier_order_id,
        status: existingOrder.status,
        offerId: existingOrder.offer_id,
        offerName: existingOrder.offer_name,
        playerId: existingOrder.player_id,
        retailPrice: existingOrder.retail_price,
        supplierPrice: existingOrder.supplier_price,
      });
    }

    /*
     * 10. CREAR ORDEN INTERNA
     */

    const username =
      user.user_metadata?.username ??
      user.user_metadata?.user_name ??
      null;

    const email = user.email ?? null;

    const {
      data: insertedOrder,
      error: insertOrderError,
    } = await supabaseAdmin
      .from("topup_orders")
      .insert({
        user_id: user.id,
        username,
        email,
        game: GAME_NAME,
        category_id: CATEGORY_ID,
        offer_id: offer.id,
        offer_name: offer.name,
        player_id: playerId,
        retail_price: retailPrice,
        supplier_price: supplierPrice,
        currency: "USD",
        status: "RESERVED",
        idempotency_key: idempotencyKey,
        supplier_fields: {
          player_id: playerId,
          server_id: serverId,
          vip_active: vipActive,
        },
      })
      .select("id")
      .single();

    if (insertOrderError || !insertedOrder) {
      console.error(
        "ERROR CREANDO ORDEN INTERNA:",
        insertOrderError
      );

      return jsonError("No se pudo crear la orden.", 500);
    }

    internalOrderId = insertedOrder.id;

    /*
     * 11. RESERVAR SALDO
     */

    const {
      error: reserveError,
    } = await supabaseAdmin.rpc(
      "reserve_topup_balance",
      {
        p_user_id: user.id,
        p_amount: retailPrice,
      }
    );

    if (reserveError) {
      console.error("ERROR RESERVANDO SALDO:", reserveError);

      const { error: failedUpdateError } =
        await supabaseAdmin
          .from("topup_orders")
          .update({
            status: "FAILED",
            updated_at: new Date().toISOString(),
          })
          .eq("id", internalOrderId);

      if (failedUpdateError) {
        console.error(
          "ERROR ACTUALIZANDO ORDEN SIN RESERVA:",
          failedUpdateError
        );
      }

      return jsonError(
        "No se pudo reservar el saldo. Comprueba tu balance.",
        400
      );
    }

    reserved = true;

    /*
     * 12. API KEY DE FAZERCARDS
     */

    const fazerApiKey = process.env.FAZERCARDS_API_KEY;

    if (!fazerApiKey) {
      console.error("FALTA FAZERCARDS_API_KEY.");

      const { error: refundError } =
        await supabaseAdmin.rpc(
          "refund_topup_balance",
          {
            p_order_id: internalOrderId,
          }
        );

      if (refundError) {
        console.error(
          "ERROR DEVOLVIENDO SALDO:",
          refundError
        );

        return jsonError(
          "El servicio no está configurado y el reembolso necesita revisión.",
          500
        );
      }

      reserved = false;

      await supabaseAdmin
        .from("topup_orders")
        .update({
          status: "FAILED",
          updated_at: new Date().toISOString(),
        })
        .eq("id", internalOrderId);

      return jsonError(
        "El servicio de recargas no está configurado.",
        500
      );
    }

    /*
     * 13. ENVIAR PEDIDO A FAZERCARDS
     */

    let supplierResponse: Response;

    try {
      supplierResponse = await fetch(
        `${FAZER_API_BASE}/topups/order`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "X-API-Key": fazerApiKey,
            "Idempotency-Key": idempotencyKey,
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36",
            Referer: "https://reseller.fazercards.com/",
            Origin: "https://reseller.fazercards.com",
          },
          body: JSON.stringify({
            category_id: CATEGORY_ID,
            offer_id: offer.id,
            fields: {
              player_id: playerId,
              server_id: serverId,
            },
          }),
          cache: "no-store",
          signal: AbortSignal.timeout(30000),
        }
      );
    } catch (supplierConnectionError) {
      console.error(
        "ERROR CONECTANDO CON FAZERCARDS:",
        supplierConnectionError
      );

      const { error: pendingError } =
        await supabaseAdmin
          .from("topup_orders")
          .update({
            status: "SUPPLIER_PENDING",
            supplier_response: {
              error: "SUPPLIER_CONNECTION_OUTCOME_UNKNOWN",
              message: String(supplierConnectionError),
            },
            updated_at: new Date().toISOString(),
          })
          .eq("id", internalOrderId);

      if (pendingError) {
        console.error(
          "ERROR GUARDANDO ESTADO PENDIENTE:",
          pendingError
        );
      }

      return NextResponse.json(
        {
          ok: true,
          orderNumber: internalOrderId,
          status: "SUPPLIER_PENDING",
          retailPrice,
          supplierPrice,
          message:
            "No se pudo confirmar la respuesta del proveedor. La orden queda pendiente de verificación y el saldo permanece reservado.",
        },
        { status: 202 }
      );
    }

    /*
     * 14. LEER RESPUESTA
     */

    const supplierText = await supplierResponse.text();

    let supplierData: any = null;

    try {
      supplierData = supplierText
        ? JSON.parse(supplierText)
        : null;
    } catch {
      supplierData = supplierText;
    }

    console.log(
      "FAZERCARDS MOBILE LEGENDS:",
      supplierResponse.status,
      supplierData
    );

    const supplierOrderId =
      getSupplierOrderId(supplierData);

    const supplierStatus = String(
      supplierData?.status ??
      supplierData?.order?.status ??
      supplierData?.data?.status ??
      ""
    ).trim();

    /*
     * 15. RESPUESTA HTTP NO EXITOSA
     */

    if (!supplierResponse.ok) {
      console.error(
        "FAZERCARDS RESPUESTA NO OK:",
        supplierResponse.status,
        supplierData
      );

      const ambiguous =
        supplierResponse.status >= 500 ||
        supplierResponse.status === 429;

      const now = new Date().toISOString();

      const { error: saveError } =
        await supabaseAdmin
          .from("topup_orders")
          .update({
            ...(supplierOrderId
              ? { supplier_order_id: supplierOrderId }
              : {}),
            supplier_response: supplierData,
            status: ambiguous ? "SUPPLIER_PENDING" : "FAILED",
            ...(!ambiguous ? { failed_at: now } : {}),
            updated_at: now,
          })
          .eq("id", internalOrderId);

      if (saveError) {
        console.error(
          "ERROR GUARDANDO RESPUESTA DE FAZERCARDS:",
          saveError
        );

        return jsonError(
          "FazerCards respondió, pero no se pudo guardar la respuesta. Revisa la orden antes de repetirla.",
          500
        );
      }

      if (ambiguous) {
        return NextResponse.json(
          {
            ok: true,
            orderNumber: internalOrderId,
            supplierOrderId,
            status: "SUPPLIER_PENDING",
            retailPrice,
            supplierPrice,
            message:
              "La respuesta necesita verificación. El saldo permanece reservado.",
          },
          { status: 202 }
        );
      }

      const { error: refundError } =
        await supabaseAdmin.rpc(
          "refund_topup_balance",
          {
            p_order_id: internalOrderId,
          }
        );

      if (refundError) {
        console.error(
          "ERROR DEVOLVIENDO SALDO:",
          refundError
        );

        return jsonError(
          "FazerCards rechazó la orden, pero el reembolso necesita revisión.",
          500
        );
      }

      reserved = false;

      return NextResponse.json(
        {
          ok: false,
          error:
            supplierData?.message ||
            supplierData?.error ||
            "FazerCards rechazó el pedido.",
          orderNumber: internalOrderId,
          supplierOrderId,
          status: "REFUNDED",
        },
        { status: 400 }
      );
    }

    /*
     * 16. RESPUESTA SIN ID DEL PROVEEDOR
     */

    if (!supplierOrderId) {
      const { error: pendingUpdateError } =
        await supabaseAdmin
          .from("topup_orders")
          .update({
            status: "SUPPLIER_PENDING",
            supplier_response: supplierData,
            updated_at: new Date().toISOString(),
          })
          .eq("id", internalOrderId);

      if (pendingUpdateError) {
        console.error(
          "ERROR ACTUALIZANDO ORDEN PENDIENTE:",
          pendingUpdateError
        );
      }

      return NextResponse.json(
        {
          ok: true,
          orderNumber: internalOrderId,
          supplierOrderId: null,
          status: "SUPPLIER_PENDING",
          offerId: offer.id,
          offerName: offer.name,
          playerId,
          serverId,
          retailPrice,
          supplierPrice,
          vipActive,
          supplierStatus: supplierStatus || "pending",
        },
        { status: 202 }
      );
    }

    /*
     * 17. DETERMINAR ESTADO
     */

    let internalStatus = "SUPPLIER_PENDING";

    if (isSuccessfulSupplierStatus(supplierStatus)) {
      internalStatus = "COMPLETED";
    }

    if (isRejectedSupplierStatus(supplierStatus)) {
      internalStatus = "FAILED";
    }

    /*
     * 18. GUARDAR RESPUESTA DEL PROVEEDOR
     */

    const now = new Date().toISOString();

    const { error: updateOrderError } =
      await supabaseAdmin
        .from("topup_orders")
        .update({
          supplier_order_id: supplierOrderId,
          supplier_response: supplierData,
          status: internalStatus,
          ...(internalStatus === "COMPLETED"
            ? { completed_at: now }
            : {}),
          ...(internalStatus === "FAILED"
            ? { failed_at: now }
            : {}),
          updated_at: now,
        })
        .eq("id", internalOrderId);

    if (updateOrderError) {
      console.error(
        "ERROR ACTUALIZANDO ORDEN:",
        updateOrderError
      );

      return NextResponse.json(
        {
          ok: true,
          orderNumber: internalOrderId,
          supplierOrderId,
          status: "SUPPLIER_PENDING",
          message:
            "La orden fue enviada al proveedor, pero necesita revisión del registro interno.",
        },
        { status: 202 }
      );
    }

    /*
     * 19. PROVEEDOR RECHAZÓ
     */

    if (internalStatus === "FAILED") {
      const { error: refundError } =
        await supabaseAdmin.rpc(
          "refund_topup_balance",
          {
            p_order_id: internalOrderId,
          }
        );

      if (refundError) {
        console.error(
          "ERROR DEVOLVIENDO SALDO:",
          refundError
        );

        return jsonError(
          "FazerCards rechazó el pedido, pero el reembolso necesita revisión.",
          500
        );
      }

      reserved = false;

      return NextResponse.json(
        {
          ok: false,
          error: "FazerCards rechazó el pedido.",
          orderNumber: internalOrderId,
          supplierOrderId,
          status: "REFUNDED",
          offerId: offer.id,
          offerName: offer.name,
          playerId,
          serverId,
          retailPrice,
          supplierPrice,
          vipActive,
          supplierStatus,
        },
        { status: 400 }
      );
    }

    /*
     * 20. PROVEEDOR COMPLETÓ INMEDIATAMENTE
     */

    if (internalStatus === "COMPLETED") {
      const { error: completeError } =
        await supabaseAdmin.rpc(
          "complete_topup_order",
          {
            p_supplier_order_id: supplierOrderId,
          }
        );

      if (completeError) {
        console.error(
          "ERROR COMPLETANDO ORDEN:",
          completeError
        );
      } else {
        reserved = false;
      }
    }

    /*
     * 21. RESPUESTA FINAL
     */

    return NextResponse.json({
      ok: true,
      orderNumber: internalOrderId,
      supplierOrderId,
      status: internalStatus,
      offerId: offer.id,
      offerName: offer.name,
      playerId,
      serverId,
      retailPrice,
      supplierPrice,
      vipActive,
      supplierStatus: supplierStatus || "pending",
    });
  } catch (error) {
    console.error("ERROR GENERAL MOBILE LEGENDS:", error);

    /*
     * No reembolsar si el proveedor pudo haber recibido
     * la orden. Solo se revisan órdenes que sigan RESERVED.
     */

    if (internalOrderId && reserved) {
      try {
        const { data: currentOrder } =
          await supabaseAdmin
            .from("topup_orders")
            .select("status")
            .eq("id", internalOrderId)
            .maybeSingle();

        if (currentOrder?.status === "RESERVED") {
          const { error: refundError } =
            await supabaseAdmin.rpc(
              "refund_topup_balance",
              {
                p_order_id: internalOrderId,
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
      "No se pudo procesar la orden. Revisa su estado antes de volver a comprar.",
      500
    );
  }
}
