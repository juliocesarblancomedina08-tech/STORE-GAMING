
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

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

type Obj = Record<string, unknown>;

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

function isObject(value: unknown): value is Obj {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function parseExistingOrder(value: unknown): ExistingOrder | null {
  if (!isObject(value)) return null;

  if (
    typeof value.id !== "string" ||
    typeof value.user_id !== "string"
  ) {
    return null;
  }

  return {
    id: value.id,
    user_id: value.user_id,
    status:
      typeof value.status === "string"
        ? value.status
        : null,
    supplier_order_id:
      typeof value.supplier_order_id === "string"
        ? value.supplier_order_id
        : null,
    offer_id:
      typeof value.offer_id === "string"
        ? value.offer_id
        : null,
    offer_name:
      typeof value.offer_name === "string"
        ? value.offer_name
        : null,
    player_id:
      typeof value.player_id === "string"
        ? value.player_id
        : null,
    retail_price:
      typeof value.retail_price === "number"
        ? value.retail_price
        : value.retail_price == null
          ? null
          : Number(value.retail_price),
    supplier_price:
      typeof value.supplier_price === "number"
        ? value.supplier_price
        : value.supplier_price == null
          ? null
          : Number(value.supplier_price),
  };
}

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

function getSupplierOrderId(value: unknown): string {
  if (!isObject(value)) return "";

  const data = isObject(value.data) ? value.data : {};
  const order = isObject(value.order) ? value.order : {};
  const dataOrder = isObject(data.order) ? data.order : {};

  const candidates = [
    order.id,
    dataOrder.id,
    value.order_id,
    value.orderId,
    data.order_id,
    data.orderId,
    data.id,
    value.id,
  ];

  for (const candidate of candidates) {
    if (
      typeof candidate !== "string" &&
      typeof candidate !== "number"
    ) {
      continue;
    }

    const id = String(candidate).trim();

    if (id.length > 0 && id.length <= 200) {
      return id;
    }
  }

  return "";
}

function getSupplierStatus(value: unknown): string {
  if (!isObject(value)) return "PENDING";

  const data = isObject(value.data) ? value.data : {};
  const order = isObject(value.order) ? value.order : {};
  const dataOrder = isObject(data.order) ? data.order : {};

  return String(
    order.status ??
      dataOrder.status ??
      value.status ??
      data.status ??
      "PENDING"
  )
    .trim()
    .toUpperCase();
}

function isSuccessfulSupplierStatus(status: string): boolean {
  return [
    "COMPLETED",
    "COMPLETE",
    "SUCCESS",
    "SUCCESSFUL",
    "SUCCEEDED",
    "DELIVERED",
    "DONE",
  ].includes(status.toUpperCase().trim());
}

function isRejectedSupplierStatus(status: string): boolean {
  return [
    "FAILED",
    "FAILURE",
    "ERROR",
    "REJECTED",
    "DECLINED",
    "DENIED",
    "CANCELLED",
    "CANCELED",
    "REFUND",
    "REFUNDED",
    "REFUND_SUCCESS",
    "REFUND_FAILED",
  ].includes(status.toUpperCase().trim());
}

async function getUser(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization.slice(7).trim();

  if (!token) return null;

  const { data, error } =
    await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) return null;

  return data.user;
}

async function updateOrder(
  orderId: string,
  values: Obj
) {
  const { data, error } = await supabaseAdmin
    .from("topup_orders")
    .update({
      ...values,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    throw new Error(
      `No se pudo actualizar la orden: ${
        error?.message || "orden no encontrada"
      }`
    );
  }
}

async function setPending(
  orderId: string,
  reason: string,
  response?: unknown
) {
  const supplierResponse: Obj = {
    requires_reconciliation: true,
    reason,
    saved_at: new Date().toISOString(),
  };

  if (response !== undefined) {
    supplierResponse.response = response;
  }

  await updateOrder(orderId, {
    status: "SUPPLIER_PENDING",
    supplier_response: supplierResponse,
  });
}

function responseForExistingOrder(
  orderId: string,
  status: string
) {
  const normalized = status.toUpperCase();

  if (normalized === "COMPLETED") {
    return NextResponse.json({
      ok: true,
      orderNumber: orderId,
      status: normalized,
      message: "Esta solicitud ya figura como completada.",
    });
  }

  if (
    normalized === "REFUNDED" ||
    normalized === "CANCELLED"
  ) {
    return NextResponse.json(
      {
        ok: false,
        orderNumber: orderId,
        status: normalized,
        message:
          "Esta solicitud ya tiene un estado final. No se envió otra compra.",
      },
      { status: 409 }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      orderNumber: orderId,
      status: normalized,
      message:
        "Esta solicitud ya está registrada. No se volvió a enviar a FazerCards.",
    },
    { status: 202 }
  );
}

export async function POST(request: NextRequest) {
  let internalOrderId: string | null = null;
  let reserved = false;
  let providerRequestStarted = false;
  let providerResponseReceived = false;
  let providerResponseBody: unknown;

  try {
    /*
     * 1. CONFIGURACIÓN
     */

    if (!process.env.FAZERCARDS_API_KEY) {
      return jsonError(
        "Falta configurar FazerCards en el servidor.",
        500
      );
    }

    /*
     * 2. AUTENTICACIÓN
     */

    const user = await getUser(request);

    if (!user) {
      return jsonError("Sesión inválida o expirada.", 401);
    }

    /*
     * 3. LEER DATOS
     */

    let body: Obj;

    try {
      const parsedBody: unknown = await request.json();

      if (!isObject(parsedBody)) {
        return jsonError("Los datos enviados no son válidos.", 400);
      }

      body = parsedBody;
    } catch {
      return jsonError(
        "La solicitud no contiene JSON válido.",
        400
      );
    }

    const offerId =
      typeof body.offerId === "string"
        ? body.offerId.trim()
        : "";

    const playerId =
      typeof body.playerId === "string"
        ? body.playerId.trim()
        : "";

    const serverId =
      typeof body.serverId === "string"
        ? body.serverId.trim()
        : "";

    const idempotencyKey =
      typeof request.headers.get("idempotency-key") === "string"
        ? request.headers.get("idempotency-key")!.trim()
        : typeof body.idempotencyKey === "string"
          ? body.idempotencyKey.trim()
          : "";

    /*
     * 4. VALIDACIONES
     */

    const offer = getOffer(offerId);

    if (!offer) {
      return jsonError(
        "La oferta seleccionada no existe.",
        400
      );
    }

    if (!/^[0-9]{3,20}$/.test(playerId)) {
      return jsonError(
        "El ID del jugador debe contener entre 3 y 20 números.",
        400
      );
    }

    if (!/^[0-9]{1,20}$/.test(serverId)) {
      return jsonError(
        "El ID del servidor debe contener entre 1 y 20 números.",
        400
      );
    }

    if (
      !idempotencyKey ||
      idempotencyKey.length < 10 ||
      idempotencyKey.length > 100
    ) {
      return jsonError(
        "La clave de la orden no es válida.",
        400
      );
    }

    /*
     * 5. COMPROBAR VIP
     */

    const { data: profile, error: profileError } =
      await supabaseAdmin
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
     * 6. CALCULAR PRECIO
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
      return jsonError(
        "El precio de la oferta no es válido.",
        400
      );
    }

    console.info("MOBILE LEGENDS PRICE CHECK:", {
      userId: user.id,
      offerId: offer.id,
      supplierPrice,
      retailPrice,
      vipActive,
    });

    /*
     * 7. COMPROBAR IDEMPOTENCIA
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

    // Se valida la respuesta como unknown.
    // No se realiza el cast problemático a ExistingOrder.
    const existingOrder: ExistingOrder | null =
      parseExistingOrder(existingOrderData);

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

      return responseForExistingOrder(
        existingOrder.id,
        existingOrder.status || "SUPPLIER_PENDING"
      );
    }

    /*
     * 8. CREAR ORDEN INTERNA
     */

    const username =
      user.user_metadata?.username ??
      user.user_metadata?.user_name ??
      user.user_metadata?.name ??
      null;

    const { data: insertedOrder, error: insertOrderError } =
      await supabaseAdmin
        .from("topup_orders")
        .insert({
          user_id: user.id,
          username,
          email: user.email ?? null,
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

      return jsonError(
        "No se pudo crear la orden.",
        500
      );
    }

    internalOrderId = insertedOrder.id;

    /*
     * 9. RESERVAR SALDO
     */

    const { error: reserveError } =
      await supabaseAdmin.rpc(
        "reserve_topup_balance",
        {
          p_user_id: user.id,
          p_amount: retailPrice,
        }
      );

    if (reserveError) {
      console.error(
        "ERROR RESERVANDO SALDO:",
        reserveError
      );

      await updateOrder(internalOrderId, {
        status: "FAILED",
      });

      return jsonError(
        "No se pudo reservar el saldo. Comprueba tu balance.",
        400
      );
    }

    reserved = true;

    /*
     * 10. MARCAR ORDEN EN PROCESO
     */

    await updateOrder(internalOrderId, {
      status: "PROCESSING",
    });

    /*
     * 11. ENVIAR A FAZERCARDS
     */

    const fazerApiKey = process.env.FAZERCARDS_API_KEY!;

    const payload = {
      category_id: CATEGORY_ID,
      offer_id: offer.id,
      fields: {
        player_id: playerId,
        server_id: serverId,
      },
    };

    console.info(
      "ENVIANDO ORDEN MOBILE LEGENDS A FAZERCARDS:",
      {
        orderId: internalOrderId,
        offerId: offer.id,
        categoryId: CATEGORY_ID,
      }
    );

    providerRequestStarted = true;

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
          },
          body: JSON.stringify(payload),
          cache: "no-store",
          signal: AbortSignal.timeout(25000),
        }
      );
    } catch (connectionError) {
      console.error(
        "ERROR CONECTANDO CON FAZERCARDS:",
        connectionError
      );

      await setPending(
        internalOrderId,
        "PROVIDER_REQUEST_RESULT_UNKNOWN",
        {
          error: String(connectionError),
        }
      );

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
     * 12. LEER RESPUESTA
     */

    const supplierText = await supplierResponse.text();

    let supplierData: unknown;

    try {
      supplierData = supplierText
        ? JSON.parse(supplierText)
        : {};
    } catch {
      supplierData = {
        raw: supplierText,
      };
    }

    providerResponseReceived = true;
    providerResponseBody = supplierData;

    const supplierOrderId =
      getSupplierOrderId(supplierData);

    const supplierStatus =
      getSupplierStatus(supplierData);

    console.info("RESPUESTA FAZERCARDS MOBILE LEGENDS:", {
      orderId: internalOrderId,
      httpStatus: supplierResponse.status,
      supplierOrderId: supplierOrderId || null,
      supplierStatus,
    });

    /*
     * 13. RESPUESTA HTTP NO EXITOSA
     *
     * Una respuesta HTTP no exitosa no demuestra por sí sola
     * que el proveedor no haya procesado la compra.
     */

    if (!supplierResponse.ok) {
      await setPending(
        internalOrderId,
        "NON_SUCCESS_HTTP_RESPONSE",
        {
          http_status: supplierResponse.status,
          supplier_order_id: supplierOrderId || null,
          response: supplierData,
        }
      );

      return NextResponse.json(
        {
          ok: true,
          orderNumber: internalOrderId,
          supplierOrderId: supplierOrderId || null,
          status: "SUPPLIER_PENDING",
          message:
            "La respuesta necesita verificación. El saldo permanece reservado y no se ha enviado otra compra.",
        },
        { status: 202 }
      );
    }

    /*
     * 14. RESPUESTA SIN ID DEL PROVEEDOR
     */

    if (!supplierOrderId) {
      await setPending(
        internalOrderId,
        "MISSING_SUPPLIER_ORDER_ID",
        supplierData
      );

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
          supplierStatus,
          message:
            "FazerCards respondió, pero falta el identificador de la orden. Se requiere verificación.",
        },
        { status: 202 }
      );
    }

    /*
     * 15. GUARDAR Y VERIFICAR ID DEL PROVEEDOR
     */

    await updateOrder(internalOrderId, {
      supplier_order_id: supplierOrderId,
      supplier_response: supplierData,
      status: "SUPPLIER_PENDING",
    });

    const {
      data: savedOrder,
      error: verifyIdError,
    } = await supabaseAdmin
      .from("topup_orders")
      .select("supplier_order_id")
      .eq("id", internalOrderId)
      .maybeSingle();

    if (
      verifyIdError ||
      !savedOrder ||
      savedOrder.supplier_order_id !== supplierOrderId
    ) {
      await setPending(
        internalOrderId,
        "SUPPLIER_ID_SAVE_NOT_VERIFIED",
        supplierData
      );

      return NextResponse.json(
        {
          ok: true,
          orderNumber: internalOrderId,
          supplierOrderId,
          status: "SUPPLIER_PENDING",
          message:
            "No se pudo verificar el ID guardado. La orden requiere revisión.",
        },
        { status: 202 }
      );
    }

    /*
     * 16. PROVEEDOR INFORMA QUE COMPLETÓ
     */

    if (isSuccessfulSupplierStatus(supplierStatus)) {
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

        await setPending(
          internalOrderId,
          "COMPLETION_RPC_FAILED",
          supplierData
        );

        return NextResponse.json(
          {
            ok: true,
            orderNumber: internalOrderId,
            supplierOrderId,
            status: "SUPPLIER_PENDING",
            message:
              "El proveedor informa que terminó, pero la orden requiere reconciliación.",
          },
          { status: 202 }
        );
      }

      const {
        data: finalOrder,
        error: finalError,
      } = await supabaseAdmin
        .from("topup_orders")
        .select("status, refunded_at")
        .eq("id", internalOrderId)
        .maybeSingle();

      if (
        finalError ||
        !finalOrder ||
        String(finalOrder.status).toUpperCase() !== "COMPLETED" ||
        finalOrder.refunded_at
      ) {
        return NextResponse.json(
          {
            ok: true,
            orderNumber: internalOrderId,
            supplierOrderId,
            status: "SUPPLIER_PENDING",
            message:
              "La finalización necesita verificación mediante reconciliación.",
          },
          { status: 202 }
        );
      }

      reserved = false;

      return NextResponse.json({
        ok: true,
        orderNumber: internalOrderId,
        supplierOrderId,
        status: "COMPLETED",
        offerId: offer.id,
        offerName: offer.name,
        playerId,
        serverId,
        retailPrice,
        supplierPrice,
        vipActive,
        supplierStatus,
        message: "Recarga completada correctamente.",
      });
    }

    /*
     * 17. PROVEEDOR INFORMA UN FALLO
     *
     * Se mantiene pendiente para verificar el resultado
     * antes de devolver el saldo.
     */

    if (isRejectedSupplierStatus(supplierStatus)) {
      await setPending(
        internalOrderId,
        `SUPPLIER_REPORTED_${supplierStatus}`,
        supplierData
      );

      return NextResponse.json(
        {
          ok: true,
          orderNumber: internalOrderId,
          supplierOrderId,
          status: "SUPPLIER_PENDING",
          offerId: offer.id,
          offerName: offer.name,
          playerId,
          serverId,
          retailPrice,
          supplierPrice,
          vipActive,
          supplierStatus,
          message:
            "El proveedor informó un fallo. Se verificará antes de devolver el saldo.",
        },
        { status: 202 }
      );
    }

    /*
     * 18. ORDEN ACEPTADA O EN PROCESO
     */

    const nextStatus = [
      "CONFIRMED",
      "ACCEPTED",
    ].includes(supplierStatus)
      ? "CONFIRMED"
      : supplierStatus === "PROCESSING"
        ? "PROCESSING"
        : "SUPPLIER_PENDING";

    await updateOrder(internalOrderId, {
      status: nextStatus,
      supplier_response: supplierData,
    });

    return NextResponse.json(
      {
        ok: true,
        orderNumber: internalOrderId,
        supplierOrderId,
        status: nextStatus,
        offerId: offer.id,
        offerName: offer.name,
        playerId,
        serverId,
        retailPrice,
        supplierPrice,
        vipActive,
        supplierStatus,
        message:
          "La orden quedó registrada y se verificará con FazerCards.",
      },
      { status: 202 }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    console.error("ERROR GENERAL MOBILE LEGENDS:", {
      orderId: internalOrderId,
      providerRequestStarted,
      providerResponseReceived,
      message,
    });

    /*
     * 19. MANEJO SEGURO DE ERRORES
     */

    if (internalOrderId && reserved) {
      try {
        if (
          providerRequestStarted ||
          providerResponseReceived
        ) {
          await setPending(
            internalOrderId,
            providerResponseReceived
              ? "ERROR_AFTER_PROVIDER_RESPONSE"
              : "PROVIDER_REQUEST_RESULT_UNKNOWN",
            providerResponseBody
          );
        } else {
          const {
            data: currentOrder,
            error: currentOrderError,
          } = await supabaseAdmin
            .from("topup_orders")
            .select("status")
            .eq("id", internalOrderId)
            .maybeSingle();

          if (currentOrderError) {
            throw currentOrderError;
          }

          if (
            currentOrder &&
            ["RESERVED", "PROCESSING"].includes(
              String(currentOrder.status).toUpperCase()
            )
          ) {
            const { error: refundError } =
              await supabaseAdmin.rpc(
                "refund_topup_balance",
                {
                  p_order_id: internalOrderId,
                }
              );

            if (refundError) {
              throw refundError;
            }
          }
        }
      } catch (recoveryError) {
        console.error(
          "ERROR RECUPERANDO ORDEN:",
          internalOrderId,
          recoveryError
        );
      }
    }

    if (internalOrderId) {
      return NextResponse.json(
        {
          ok: false,
          orderNumber: internalOrderId,
          status: "SUPPLIER_PENDING",
          message:
            "No se pudo confirmar el resultado. Revisa el estado de la orden antes de volver a comprar.",
        },
        { status: 202 }
      );
    }

    return jsonError(
      "No se pudo iniciar la orden.",
      500
    );
  }
}
