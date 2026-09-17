import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

const FAZER_API_BASE = "https://api.fzr.cards/api/v2";

const CATEGORY_ID = "free_fire_latam";

/**
 * Precios RETAIL de STORE GAMING.
 *
 * Estos son los precios que paga el cliente.
 * Nunca usamos el precio enviado por el navegador.
 */
const OFFERS: Record<
  string,
  {
    name: string;
    retailPrice: number;
    supplierPrice: number;
  }
> = {
  "110_diamonds": {
    name: "110 Diamonds",
    retailPrice: 0.78,
    supplierPrice: 0.6972,
  },

  "341_diamonds": {
    name: "341 Diamonds",
    retailPrice: 2.2,
    supplierPrice: 2.0796,
  },

  "572_diamonds": {
    name: "572 Diamonds",
    retailPrice: 3.67,
    supplierPrice: 3.5131,
  },

  "1166_diamonds": {
    name: "1166 Diamonds",
    retailPrice: 6.73,
    supplierPrice: 6.5214,
  },

  "2398_diamonds": {
    name: "2398 Diamonds",
    retailPrice: 13.27,
    supplierPrice: 12.9519,
  },

  "6160_diamonds": {
    name: "6160 Diamonds",
    retailPrice: 33.7,
    supplierPrice: 32.9602,
  },

  "booyah_pass": {
    name: "Pase Elite",
    retailPrice: 4.0,
    supplierPrice: 3.8738,
  },

  "weekly_membership": {
    name: "Membresía semanal",
    retailPrice: 2.3,
    supplierPrice: 2.1893,
  },

  "monthly_membership": {
    name: "Membresía mensual",
    retailPrice: 10.72,
    supplierPrice: 10.482,
  },
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

function getBearerToken(request: NextRequest): string | null {
  const authorization = request.headers.get("authorization");

  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(" ");

  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token.trim();
}

function normalizeIdempotencyKey(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function generateIdempotencyKey(): string {
  return crypto.randomUUID();
}

function extractSupplierOrderId(data: any): string | null {
  const candidates = [
    data?.order?.id,
    data?.order_id,
    data?.id,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return null;
}

function extractSupplierStatus(data: any): string | null {
  const candidates = [
    data?.order?.status,
    data?.status,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim().toLowerCase();
    }
  }

  return null;
}

async function parseSupplierResponse(response: Response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return {
      raw: text,
    };
  }
}

export async function POST(request: NextRequest) {
  let internalOrderId: string | null = null;

  try {
    /*
     * ============================================================
     * 1. VERIFICAR CONFIGURACIÓN
     * ============================================================
     */

    const fazerApiKey = process.env.FAZERCARDS_API_KEY;

    if (!fazerApiKey) {
      console.error("FAZERCARDS_API_KEY NO CONFIGURADA");

      return jsonError(
        "El servicio de recargas no está configurado correctamente.",
        500
      );
    }

    /*
     * ============================================================
     * 2. AUTENTICAR USUARIO DE STORE GAMING
     * ============================================================
     */

    const accessToken = getBearerToken(request);

    if (!accessToken) {
      return jsonError("No autorizado.", 401);
    }

    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(accessToken);

    if (authError || !user) {
      console.error("AUTH ERROR:", authError);

      return jsonError("La sesión no es válida.", 401);
    }

    /*
     * ============================================================
     * 3. LEER BODY
     * ============================================================
     */

    let body: any;

    try {
      body = await request.json();
    } catch {
      return jsonError("Datos de compra inválidos.");
    }

    const offerId =
      typeof body?.offerId === "string"
        ? body.offerId.trim()
        : "";

    const playerId =
      typeof body?.playerId === "string"
        ? body.playerId.trim()
        : "";

    let idempotencyKey = normalizeIdempotencyKey(
      body?.idempotencyKey
    );

    /*
     * ============================================================
     * 4. VALIDACIONES BÁSICAS
     * ============================================================
     */

    if (!offerId) {
      return jsonError("Oferta inválida.");
    }

    if (!playerId) {
      return jsonError("Debe introducir el ID del jugador.");
    }

    if (!/^[0-9]+$/.test(playerId)) {
      return jsonError("El ID del jugador debe contener solamente números.");
    }

    if (playerId.length < 4 || playerId.length > 20) {
      return jsonError("El ID del jugador no tiene un formato válido.");
    }

    /*
     * Si el navegador no envía una clave, el servidor genera una.
     */
    if (!idempotencyKey) {
      idempotencyKey = generateIdempotencyKey();
    }

    if (idempotencyKey.length > 255) {
      return jsonError("Clave de idempotencia inválida.");
    }

    /*
     * ============================================================
     * 5. DETERMINAR OFERTA DESDE EL SERVIDOR
     * ============================================================
     *
     * IMPORTANTE:
     *
     * NO confiamos en:
     *   body.offerName
     *   body.retailPrice
     *
     * El navegador solamente manda offerId.
     */

    const selectedOffer = OFFERS[offerId];

    if (!selectedOffer) {
      return jsonError("La oferta seleccionada no está disponible.");
    }

    const retailPrice = selectedOffer.retailPrice;
    const supplierPrice = selectedOffer.supplierPrice;
    const offerName = selectedOffer.name;

    /*
     * ============================================================
     * 6. EVITAR PEDIDOS DUPLICADOS EN STORE GAMING
     * ============================================================
     */

    const { data: existingOrder, error: existingOrderError } =
      await supabaseAdmin
        .from("topup_orders")
        .select(
          `
            id,
            user_id,
            offer_id,
            offer_name,
            player_id,
            retail_price,
            supplier_price,
            status,
            supplier_order_id,
            idempotency_key,
            created_at
          `
        )
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();

    if (existingOrderError) {
      console.error(
        "ERROR BUSCANDO IDEMPOTENCY KEY:",
        existingOrderError
      );

      return jsonError(
        "No se pudo comprobar el estado del pedido.",
        500
      );
    }

    if (existingOrder) {
      /*
       * Si la misma petición llegó otra vez, devolvemos
       * exactamente la orden anterior.
       *
       * No volvemos a descontar saldo.
       * No volvemos a llamar a FazerCards.
       */

      if (existingOrder.user_id !== user.id) {
        return jsonError("Solicitud no válida.", 409);
      }

      return NextResponse.json({
        ok: true,
        duplicate: true,
        orderNumber: existingOrder.id,
        supplierOrderId: existingOrder.supplier_order_id,
        status: existingOrder.status,
        offerId: existingOrder.offer_id,
        offerName: existingOrder.offer_name,
        playerId: existingOrder.player_id,
        retailPrice: Number(existingOrder.retail_price),
        supplierPrice: Number(existingOrder.supplier_price),
        createdAt: existingOrder.created_at,
      });
    }

    /*
     * ============================================================
     * 7. DATOS DEL USUARIO
     * ============================================================
     */

    const email = user.email ?? "";

    const username =
      email.split("@")[0] ||
      user.user_metadata?.username ||
      "usuario";

    /*
     * ============================================================
     * 8. VALIDAR PLAYER ID CON FAZERCARDS
     * ============================================================
     *
     * Lo hacemos ANTES de descontar el saldo.
     */

    try {
      const validateResponse = await fetch(
        `${FAZER_API_BASE}/topups/validate-id`,
        {
          method: "POST",
          headers: {
            "X-API-Key": fazerApiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            category_id: CATEGORY_ID,
            fields: {
              player_id: playerId,
            },
          }),
          cache: "no-store",
        }
      );

      const validateResult = await parseSupplierResponse(
        validateResponse
      );

      if (!validateResponse.ok || validateResult?.ok === false) {
        console.error(
          "FAZERCARDS VALIDATE-ID ERROR:",
          validateResponse.status,
          validateResult
        );

        return jsonError(
          validateResult?.error ||
            "No se pudo validar el ID de Free Fire.",
          400
        );
      }

      if (validateResult?.valid === false) {
        return jsonError(
          "El ID de Free Fire no es válido. Revíselo antes de continuar.",
          400
        );
      }
    } catch (validationError) {
      console.error(
        "FAZERCARDS VALIDATE-ID NETWORK ERROR:",
        validationError
      );

      return jsonError(
        "No se pudo validar el ID de Free Fire. Inténtelo nuevamente.",
        502
      );
    }

    /*
     * ============================================================
     * 9. CREAR ORDEN INTERNA ANTES DE TOCAR EL SALDO
     * ============================================================
     *
     * Esto corrige el problema de la versión anterior.
     *
     * Primero existe la orden.
     * Después reservamos/descontamos el saldo.
     */

    internalOrderId = crypto.randomUUID();

    const { error: insertOrderError } = await supabaseAdmin
      .from("topup_orders")
      .insert({
        id: internalOrderId,
        user_id: user.id,
        username,
        email,
        game: "FREE FIRE LATAM",
        category_id: CATEGORY_ID,
        offer_id: offerId,
        offer_name: offerName,
        player_id: playerId,
        retail_price: retailPrice,
        supplier_price: supplierPrice,
        currency: "USD",
        status: "RESERVED",
        supplier_order_id: null,
        idempotency_key: idempotencyKey,
        supplier_fields: {
          player_id: playerId,
        },
        supplier_response: null,
      });

    if (insertOrderError) {
      console.error(
        "ERROR INSERTANDO TOPUP ORDER:",
        insertOrderError
      );

      if (insertOrderError.code === "23505") {
        const { data: retryExistingOrder } =
          await supabaseAdmin
            .from("topup_orders")
            .select(
              `
                id,
                user_id,
                offer_id,
                offer_name,
                player_id,
                retail_price,
                supplier_price,
                status,
                supplier_order_id,
                created_at
              `
            )
            .eq("idempotency_key", idempotencyKey)
            .maybeSingle();

        if (
          retryExistingOrder &&
          retryExistingOrder.user_id === user.id
        ) {
          return NextResponse.json({
            ok: true,
            duplicate: true,
            orderNumber: retryExistingOrder.id,
            supplierOrderId:
              retryExistingOrder.supplier_order_id,
            status: retryExistingOrder.status,
            offerId: retryExistingOrder.offer_id,
            offerName: retryExistingOrder.offer_name,
            playerId: retryExistingOrder.player_id,
            retailPrice: Number(
              retryExistingOrder.retail_price
            ),
            supplierPrice: Number(
              retryExistingOrder.supplier_price
            ),
            createdAt: retryExistingOrder.created_at,
          });
        }
      }

      return jsonError(
        "No se pudo crear la orden.",
        500
      );
    }

    /*
     * ============================================================
     * 10. RESERVAR / DESCONTAR SALDO
     * ============================================================
     */

    const { data: reserveResult, error: reserveError } =
      await supabaseAdmin.rpc("reserve_topup_balance", {
        p_user_id: user.id,
        p_amount: retailPrice,
      });

    if (reserveError) {
      console.error(
        "ERROR RESERVANDO SALDO:",
        reserveError
      );

      /*
       * La orden existe, pero no se pudo cobrar.
       * La eliminamos porque nunca llegó a FazerCards.
       */

      await supabaseAdmin
        .from("topup_orders")
        .delete()
        .eq("id", internalOrderId)
        .eq("user_id", user.id);

      const message =
        reserveError.message?.toLowerCase().includes("saldo")
          ? "Saldo insuficiente para realizar esta compra."
          : "No se pudo reservar el saldo.";

      return jsonError(message, 400);
    }

    /*
     * ============================================================
     * 11. CONFIRMAR QUE LA RESERVA SE REALIZÓ
     * ============================================================
     */

    if (reserveResult === false) {
      console.error(
        "RESERVE_TOPUP_BALANCE DEVOLVIÓ FALSE"
      );

      await supabaseAdmin
        .from("topup_orders")
        .delete()
        .eq("id", internalOrderId)
        .eq("user_id", user.id);

      return jsonError(
        "No se pudo reservar el saldo.",
        400
      );
    }

    /*
     * ============================================================
     * 12. LLAMAR A FAZERCARDS
     * ============================================================
     */

    let fazerResult: any = null;
    let fazerResponse: Response | null = null;

    try {
      fazerResponse = await fetch(
        `${FAZER_API_BASE}/topups/order`,
        {
          method: "POST",
          headers: {
            "X-API-Key": fazerApiKey,
            "Idempotency-Key": idempotencyKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            category_id: CATEGORY_ID,
            offer_id: offerId,
            fields: {
              player_id: playerId,
            },
          }),
          cache: "no-store",
        }
      );

      fazerResult = await parseSupplierResponse(
        fazerResponse
      );
    } catch (supplierNetworkError) {
      /*
       * ========================================================
       * CASO CRÍTICO:
       *
       * No sabemos si FazerCards recibió el pedido.
       *
       * Por seguridad NO devolvemos el saldo inmediatamente.
       *
       * Dejamos SUPPLIER_PENDING.
       *
       * El webhook / revisión posterior resolverá el estado.
       * ========================================================
       */

      console.error(
        "FAZERCARDS NETWORK ERROR:",
        supplierNetworkError
      );

      await supabaseAdmin
        .from("topup_orders")
        .update({
          status: "SUPPLIER_PENDING",
          supplier_response: {
            error: "NETWORK_ERROR",
          },
        })
        .eq("id", internalOrderId);

      return NextResponse.json(
        {
          ok: true,
          pending: true,
          message:
            "Su pedido fue recibido y está siendo verificado.",
          orderNumber: internalOrderId,
          supplierOrderId: null,
          status: "SUPPLIER_PENDING",
        },
        { status: 202 }
      );
    }

    /*
     * ============================================================
     * 13. GUARDAR RESPUESTA DEL PROVEEDOR
     * ============================================================
     */

    const supplierOrderId =
      extractSupplierOrderId(fazerResult);

    const supplierStatus =
      extractSupplierStatus(fazerResult);

    /*
     * ============================================================
     * 14. FAZERCARDS RECHAZÓ LA ORDEN
     * ============================================================
     */

    if (
      !fazerResponse.ok ||
      fazerResult?.ok === false
    ) {
      console.error(
        "FAZERCARDS ORDER ERROR:",
        fazerResponse.status,
        fazerResult
      );

      /*
       * El proveedor respondió explícitamente que NO creó
       * el pedido.
       *
       * Por tanto podemos devolver el saldo.
       */

      await supabaseAdmin
        .from("topup_orders")
        .update({
          status: "RESERVED",
          supplier_response: fazerResult,
        })
        .eq("id", internalOrderId);

      const { error: refundError } =
        await supabaseAdmin.rpc(
          "refund_topup_balance",
          {
            p_order_id: internalOrderId,
          }
        );

      if (refundError) {
        /*
         * MUY IMPORTANTE:
         *
         * Si el proveedor rechazó pero el refund falla,
         * NO escondemos el problema.
         *
         * La orden queda registrada para poder corregirla
         * desde administración.
         */

        console.error(
          "ERROR DEVOLVIENDO SALDO:",
          refundError
        );

        await supabaseAdmin
          .from("topup_orders")
          .update({
            status: "REFUND_PENDING",
            supplier_response: {
              fazer: fazerResult,
              refund_error: refundError.message,
            },
          })
          .eq("id", internalOrderId);

        return NextResponse.json(
          {
            ok: false,
            error:
              "El proveedor rechazó el pedido y la devolución está pendiente de procesamiento.",
            orderNumber: internalOrderId,
          },
          { status: 502 }
        );
      }

      return NextResponse.json(
        {
          ok: false,
          refunded: true,
          error:
            fazerResult?.error ||
            "FazerCards rechazó la orden.",
          orderNumber: internalOrderId,
        },
        { status: 400 }
      );
    }

    /*
     * ============================================================
     * 15. FAZERCARDS RESPONDIÓ OK PERO NO ENCONTRAMOS ID
     * ============================================================
     *
     * NO devolvemos el dinero.
     *
     * Puede que FazerCards haya creado la orden y que
     * simplemente la respuesta tenga una estructura distinta.
     *
     * Queda SUPPLIER_PENDING para investigación/webhook.
     */

    if (!supplierOrderId) {
      console.error(
        "FAZERCARDS OK PERO SIN SUPPLIER ORDER ID:",
        fazerResult
      );

      await supabaseAdmin
        .from("topup_orders")
        .update({
          status: "SUPPLIER_PENDING",
          supplier_response: fazerResult,
        })
        .eq("id", internalOrderId);

      return NextResponse.json(
        {
          ok: true,
          pending: true,
          message:
            "El pedido fue recibido y está pendiente de confirmación.",
          orderNumber: internalOrderId,
          supplierOrderId: null,
          status: "SUPPLIER_PENDING",
        },
        { status: 202 }
      );
    }

    /*
     * ============================================================
     * 16. GUARDAR ORDER ID DE FAZERCARDS
     * ============================================================
     */

    let internalStatus = "SUPPLIER_PENDING";

    if (
      supplierStatus === "completed" ||
      supplierStatus === "complete"
    ) {
      internalStatus = "COMPLETED";
    } else if (
      supplierStatus === "failed" ||
      supplierStatus === "refunded"
    ) {
      internalStatus = "SUPPLIER_PENDING";
    } else {
      /*
       * Normalmente será processing / pending.
       */
      internalStatus = "SUPPLIER_PENDING";
    }

    const { error: updateOrderError } =
      await supabaseAdmin
        .from("topup_orders")
        .update({
          supplier_order_id: supplierOrderId,
          status: internalStatus,
          supplier_response: fazerResult,
        })
        .eq("id", internalOrderId);

    if (updateOrderError) {
      /*
       * MUY IMPORTANTE:
       *
       * FazerCards ya pudo haber creado la orden.
       * NO hacemos refund aquí.
       *
       * El pedido existe en el proveedor y debe poder
       * localizarse mediante idempotency/webhook.
       */

      console.error(
        "ERROR GUARDANDO SUPPLIER ORDER ID:",
        updateOrderError
      );

      return NextResponse.json(
        {
          ok: true,
          pending: true,
          message:
            "El pedido fue enviado al proveedor y está pendiente de sincronización.",
          orderNumber: internalOrderId,
          supplierOrderId,
          status: "SUPPLIER_PENDING",
        },
        { status: 202 }
      );
    }

    /*
     * ============================================================
     * 17. SI FAZERCARDS YA DEVOLVIÓ COMPLETED
     * ============================================================
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
        /*
         * La orden del proveedor está completada, pero nuestra
         * DB todavía no pudo actualizarla.
         *
         * NO hacemos refund.
         */

        console.error(
          "ERROR COMPLETANDO ORDEN INTERNA:",
          completeError
        );

        return NextResponse.json(
          {
            ok: true,
            pending: true,
            message:
              "La compra fue procesada por el proveedor y está pendiente de sincronización.",
            orderNumber: internalOrderId,
            supplierOrderId,
            status: "SUPPLIER_PENDING",
          },
          { status: 202 }
        );
      }
    }

    /*
     * ============================================================
     * 18. RESPUESTA FINAL
     * ============================================================
     */

    return NextResponse.json({
      ok: true,
      orderNumber: internalOrderId,
      supplierOrderId,
      status: internalStatus,
      offerId,
      offerName,
      playerId,
      retailPrice,
      supplierStatus,
    });
  } catch (error: any) {
    /*
     * ============================================================
     * ERROR GENERAL
     * ============================================================
     */

    console.error(
      "FREE FIRE TOPUP UNHANDLED ERROR:",
      error
    );

    /*
     * Si la orden interna ya fue creada y todavía está RESERVED,
     * intentamos devolver el saldo.
     *
     * Si FazerCards pudo haber recibido el pedido, este bloque
     * NO debe ejecutarse después de una respuesta ambigua del
     * proveedor; esos casos ya retornan SUPPLIER_PENDING arriba.
     */

    if (internalOrderId) {
      try {
        const { data: order } =
          await supabaseAdmin
            .from("topup_orders")
            .select("status")
            .eq("id", internalOrderId)
            .maybeSingle();

        if (order?.status === "RESERVED") {
          const { error: refundError } =
            await supabaseAdmin.rpc(
              "refund_topup_balance",
              {
                p_order_id: internalOrderId,
              }
            );

          if (refundError) {
            console.error(
              "ERROR EN REFUND DE ERROR GENERAL:",
              refundError
            );

            await supabaseAdmin
              .from("topup_orders")
              .update({
                status: "REFUND_PENDING",
                supplier_response: {
                  internal_error:
                    error?.message ||
                    String(error),
                  refund_error:
                    refundError.message,
                },
              })
              .eq("id", internalOrderId);
          }
        }
      } catch (refundCatchError) {
        console.error(
          "ERROR VERIFICANDO REFUND:",
          refundCatchError
        );
      }
    }

    return jsonError(
      "No se pudo procesar la compra. Inténtelo nuevamente.",
      500
    );
  }
}
