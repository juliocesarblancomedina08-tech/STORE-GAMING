import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

const FAZER_API_BASE = "https://api.fzr.cards/api/v2";
const CATEGORY_ID = "free_fire_latam";

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

  const parts = authorization.trim().split(/\s+/);

  if (parts.length !== 2) {
    return null;
  }

  const [scheme, token] = parts;

  if (scheme.toLowerCase() !== "bearer") {
    return null;
  }

  return token?.trim() || null;
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
    data?.orderId,
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

async function parseSupplierResponse(response: Response): Promise<any> {
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
     * 1. CONFIGURACIÓN
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
     * 2. AUTENTICACIÓN
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

      return jsonError(
        "La sesión no es válida.",
        401
      );
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
      return jsonError(
        "Datos de compra inválidos."
      );
    }

    const offerId =
      typeof body?.offerId === "string"
        ? body.offerId.trim()
        : "";

    const playerId =
      typeof body?.playerId === "string"
        ? body.playerId.trim()
        : "";

    let idempotencyKey =
      normalizeIdempotencyKey(
        body?.idempotencyKey
      );

    /*
     * ============================================================
     * 4. VALIDACIONES
     * ============================================================
     */

    if (!offerId) {
      return jsonError(
        "Oferta inválida."
      );
    }

    if (!playerId) {
      return jsonError(
        "Debe introducir el ID del jugador."
      );
    }

    if (!/^[0-9]+$/.test(playerId)) {
      return jsonError(
        "El ID del jugador debe contener solamente números."
      );
    }

    if (
      playerId.length < 4 ||
      playerId.length > 20
    ) {
      return jsonError(
        "El ID del jugador no tiene un formato válido."
      );
    }

    if (!idempotencyKey) {
      idempotencyKey =
        generateIdempotencyKey();
    }

    if (idempotencyKey.length > 255) {
      return jsonError(
        "Clave de idempotencia inválida."
      );
    }

    /*
     * ============================================================
     * 5. OBTENER OFERTA DESDE EL SERVIDOR
     * ============================================================
     */

    const selectedOffer =
      OFFERS[offerId];

    if (!selectedOffer) {
      return jsonError(
        "La oferta seleccionada no está disponible."
      );
    }

    const retailPrice =
      selectedOffer.retailPrice;

    const supplierPrice =
      selectedOffer.supplierPrice;

    const offerName =
      selectedOffer.name;

    /*
     * ============================================================
     * 6. COMPROBAR DUPLICADOS
     * ============================================================
     */

    const {
      data: existingOrder,
      error: existingOrderError,
    } = await supabaseAdmin
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
      .eq(
        "idempotency_key",
        idempotencyKey
      )
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
      if (
        existingOrder.user_id !==
        user.id
      ) {
        return jsonError(
          "Solicitud no válida.",
          409
        );
      }

      return NextResponse.json({
        ok: true,
        duplicate: true,
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
          Number(
            existingOrder.retail_price
          ),
        supplierPrice:
          Number(
            existingOrder.supplier_price
          ),
        createdAt:
          existingOrder.created_at,
      });
    }

    /*
     * ============================================================
     * 7. DATOS DEL USUARIO
     * ============================================================
     */

    const email =
      user.email ?? "";

    const username =
      typeof user.user_metadata?.username ===
        "string" &&
      user.user_metadata.username.trim()
        ? user.user_metadata.username.trim()
        : email
        ? email.split("@")[0]
        : "usuario";

    /*
     * ============================================================
     * 8. VALIDAR ID CON FAZERCARDS
     * ============================================================
     */

    try {
      const validateResponse =
        await fetch(
          `${FAZER_API_BASE}/topups/validate-id`,
          {
            method: "POST",
            headers: {
              "X-API-Key":
                fazerApiKey,
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              category_id:
                CATEGORY_ID,
              fields: {
                player_id:
                  playerId,
              },
            }),
            cache: "no-store",
          }
        );

      const validateResult =
        await parseSupplierResponse(
          validateResponse
        );

      if (
        !validateResponse.ok ||
        validateResult?.ok === false
      ) {
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

      if (
        validateResult?.valid === false
      ) {
        return jsonError(
          "El ID de Free Fire no es válido. Revíselo antes de continuar.",
          400
        );
      }
    } catch (
      validationError
    ) {
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
     * 9. CREAR ORDEN INTERNA
     * ============================================================
     */

    internalOrderId =
      crypto.randomUUID();

    const {
      error: insertOrderError,
    } = await supabaseAdmin
      .from("topup_orders")
      .insert({
        id: internalOrderId,
        user_id: user.id,
        username,
        email,
        game:
          "FREE FIRE LATAM",
        category_id:
          CATEGORY_ID,
        offer_id:
          offerId,
        offer_name:
          offerName,
        player_id:
          playerId,
        retail_price:
          retailPrice,
        supplier_price:
          supplierPrice,
        currency: "USD",
        status:
          "RESERVED",
        supplier_order_id:
          null,
        idempotency_key:
          idempotencyKey,
        supplier_fields: {
          player_id:
            playerId,
        },
        supplier_response:
          null,
      });

    if (insertOrderError) {
      console.error(
        "ERROR INSERTANDO TOPUP ORDER:",
        insertOrderError
      );

      if (
        insertOrderError.code ===
        "23505"
      ) {
        const {
          data:
            retryExistingOrder,
        } = await supabaseAdmin
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
          .eq(
            "idempotency_key",
            idempotencyKey
          )
          .maybeSingle();

        if (
          retryExistingOrder &&
          retryExistingOrder.user_id ===
            user.id
        ) {
          return NextResponse.json({
            ok: true,
            duplicate: true,
            orderNumber:
              retryExistingOrder.id,
            supplierOrderId:
              retryExistingOrder.supplier_order_id,
            status:
              retryExistingOrder.status,
            offerId:
              retryExistingOrder.offer_id,
            offerName:
              retryExistingOrder.offer_name,
            playerId:
              retryExistingOrder.player_id,
            retailPrice:
              Number(
                retryExistingOrder.retail_price
              ),
            supplierPrice:
              Number(
                retryExistingOrder.supplier_price
              ),
            createdAt:
              retryExistingOrder.created_at,
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
     * 10. DESCONTAR / RESERVAR SALDO
     * ============================================================
     */

    const {
      data: reserveResult,
      error: reserveError,
    } = await supabaseAdmin.rpc(
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
        .delete()
        .eq(
          "id",
          internalOrderId
        )
        .eq(
          "user_id",
          user.id
        );

      const message =
        reserveError.message
          ?.toLowerCase()
          .includes("saldo")
          ? "Saldo insuficiente para realizar esta compra."
          : "No se pudo reservar el saldo.";

      return jsonError(
        message,
        400
      );
    }

    if (
      reserveResult === false
    ) {
      console.error(
        "RESERVE_TOPUP_BALANCE DEVOLVIÓ FALSE"
      );

      await supabaseAdmin
        .from("topup_orders")
        .delete()
        .eq(
          "id",
          internalOrderId
        )
        .eq(
          "user_id",
          user.id
        );

      return jsonError(
        "No se pudo reservar el saldo.",
        400
      );
    }

    /*
     * ============================================================
     * 11. ENVIAR PEDIDO A FAZERCARDS
     * ============================================================
     */

    let fazerResult: any = {};
    let fazerResponse: Response;

    try {
      fazerResponse =
        await fetch(
          `${FAZER_API_BASE}/topups/order`,
          {
            method: "POST",
            headers: {
              "X-API-Key":
                fazerApiKey,
              "Idempotency-Key":
                idempotencyKey,
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              category_id:
                CATEGORY_ID,
              offer_id:
                offerId,
              fields: {
                player_id:
                  playerId,
              },
            }),
            cache: "no-store",
          }
        );

      fazerResult =
        await parseSupplierResponse(
          fazerResponse
        );
    } catch (
      supplierNetworkError
    ) {
      /*
       * No sabemos si FazerCards recibió el pedido.
       * NO devolvemos el saldo.
       */

      console.error(
        "FAZERCARDS NETWORK ERROR:",
        supplierNetworkError
      );

      await supabaseAdmin
        .from("topup_orders")
        .update({
          status:
            "SUPPLIER_PENDING",
          supplier_response: {
            error:
              "NETWORK_ERROR",
            message:
              supplierNetworkError instanceof
              Error
                ? supplierNetworkError.message
                : String(
                    supplierNetworkError
                  ),
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
          pending: true,
          message:
            "Su pedido fue recibido y está siendo verificado.",
          orderNumber:
            internalOrderId,
          supplierOrderId:
            null,
          status:
            "SUPPLIER_PENDING",
        },
        { status: 202 }
      );
    }

    /*
     * ============================================================
     * 12. EXTRAER DATOS DEL PROVEEDOR
     * ============================================================
     */

    const supplierOrderId =
      extractSupplierOrderId(
        fazerResult
      );

    const supplierStatus =
      extractSupplierStatus(
        fazerResult
      );

    /*
     * ============================================================
     * 13. PROVEEDOR RECHAZÓ
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

      await supabaseAdmin
        .from("topup_orders")
        .update({
          status:
            "RESERVED",
          supplier_response:
            fazerResult,
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          internalOrderId
        );

      const {
        error: refundError,
      } = await supabaseAdmin.rpc(
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
            supplier_response: {
              fazer:
                fazerResult,
              refund_error:
                refundError.message,
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
            ok: false,
            error:
              "El proveedor rechazó el pedido y la devolución está pendiente de procesamiento.",
            orderNumber:
              internalOrderId,
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
          orderNumber:
            internalOrderId,
        },
        { status: 400 }
      );
    }

    /*
     * ============================================================
     * 14. FAZERCARDS RESPONDIÓ OK SIN ID
     * ============================================================
     */

    if (!supplierOrderId) {
      console.error(
        "FAZERCARDS OK PERO SIN SUPPLIER ORDER ID:",
        fazerResult
      );

      await supabaseAdmin
        .from("topup_orders")
        .update({
          status:
            "SUPPLIER_PENDING",
          supplier_response:
            fazerResult,
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
          pending: true,
          message:
            "El pedido fue recibido y está pendiente de confirmación.",
          orderNumber:
            internalOrderId,
          supplierOrderId:
            null,
          status:
            "SUPPLIER_PENDING",
        },
        { status: 202 }
      );
    }

    /*
     * ============================================================
     * 15. DETERMINAR ESTADO INTERNO
     * ============================================================
     */

    let internalStatus =
      "SUPPLIER_PENDING";

    if (
      supplierStatus ===
        "completed" ||
      supplierStatus ===
        "complete" ||
      supplierStatus ===
        "success" ||
      supplierStatus ===
        "successful"
    ) {
      internalStatus =
        "COMPLETED";
    }

    /*
     * ============================================================
     * 16. GUARDAR ORDER ID DEL PROVEEDOR
     * ============================================================
     */

    const {
      error: updateOrderError,
    } = await supabaseAdmin
      .from("topup_orders")
      .update({
        supplier_order_id:
          supplierOrderId,
        status:
          internalStatus,
        supplier_response:
          fazerResult,
        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        internalOrderId
      );

    if (updateOrderError) {
      console.error(
        "ERROR GUARDANDO SUPPLIER ORDER ID:",
        updateOrderError
      );

      /*
       * NO hacemos refund.
       *
       * FazerCards pudo haber creado el pedido.
       */

      return NextResponse.json(
        {
          ok: true,
          pending: true,
          message:
            "El pedido fue enviado al proveedor y está pendiente de sincronización.",
          orderNumber:
            internalOrderId,
          supplierOrderId,
          status:
            "SUPPLIER_PENDING",
        },
        { status: 202 }
      );
    }

    /*
     * ============================================================
     * 17. COMPLETADO INMEDIATAMENTE
     * ============================================================
     */

    if (
      internalStatus ===
      "COMPLETED"
    ) {
      const {
        error: completeError,
      } = await supabaseAdmin.rpc(
        "complete_topup_order",
        {
          p_supplier_order_id:
            supplierOrderId,
        }
      );

      if (completeError) {
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
            orderNumber:
              internalOrderId,
            supplierOrderId,
            status:
              "SUPPLIER_PENDING",
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
      orderNumber:
        internalOrderId,
      supplierOrderId,
      status:
        internalStatus,
      offerId,
      offerName,
      playerId,
      retailPrice,
      supplierPrice,
      supplierStatus,
    });
  } catch (error: unknown) {
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
     * Solo intentamos refund si la orden interna
     * existe y sigue RESERVED.
     */

    if (internalOrderId) {
      try {
        const {
          data: order,
          error: orderError,
        } = await supabaseAdmin
          .from("topup_orders")
          .select("status")
          .eq(
            "id",
            internalOrderId
          )
          .maybeSingle();

        if (orderError) {
          console.error(
            "ERROR CONSULTANDO ORDEN PARA REFUND:",
            orderError
          );
        }

        if (
          order?.status ===
          "RESERVED"
        ) {
          const {
            error: refundError,
          } = await supabaseAdmin.rpc(
            "refund_topup_balance",
            {
              p_order_id:
                internalOrderId,
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
                status:
                  "REFUND_PENDING",
                supplier_response: {
                  internal_error:
                    error instanceof
                    Error
                      ? error.message
                      : String(error),
                  refund_error:
                    refundError.message,
                },
                updated_at:
                  new Date().toISOString(),
              })
              .eq(
                "id",
                internalOrderId
              );
          }
        }
      } catch (
        refundCatchError
      ) {
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
