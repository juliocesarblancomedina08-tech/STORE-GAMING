import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

const FAZER_API_BASE =
  process.env.FAZERCARDS_API_URL ||
  "https://api.fzr.cards/api/v2";

const FAZER_API_KEY =
  process.env.FAZERCARDS_API_KEY || "";

const CATEGORY_ID = "arena_breakout";

/*
 * STORE GAMING gana $0.20 sobre
 * el precio real de FazerCards.
 */
const STORE_MARGIN = 0.20;

/*
 * ============================================================
 * CATÁLOGO ARENA BREAKOUT
 * ============================================================
 *
 * supplierPrice = precio real de FazerCards
 * price         = precio que paga el cliente
 */

const OFFERS = [
  {
    id: "66_bonds",
    name: "66 Bonos",
    price: 0.9909,
    supplierPrice: 0.7909,
  },
  {
    id: "335_bonds",
    name: "335 Bonos",
    price: 4.1877,
    supplierPrice: 3.9877,
  },
  {
    id: "675_bonds",
    name: "675 Bonos",
    price: 8.1844,
    supplierPrice: 7.9844,
  },
  {
    id: "1690_bonds",
    name: "1690 Bonos",
    price: 20.1566,
    supplierPrice: 19.9566,
  },
  {
    id: "3400_bonds",
    name: "3400 Bonos",
    price: 40.1756,
    supplierPrice: 39.9756,
  },
  {
    id: "6820_bonds",
    name: "6820 Bonos",
    price: 80.0283,
    supplierPrice: 79.8283,
  },
  {
    id: "beginner_select",
    name: "Beginner Select",
    price: 0.9194,
    supplierPrice: 0.7194,
  },
  {
    id: "monthly_advanced_battle_pass_activation_pass",
    name:
      "Pase de activación del pase de batalla avanzado mensual",
    price: 1.0534,
    supplierPrice: 0.8534,
  },
  {
    id: "bulletproof_case_privileges",
    name:
      "Privilegios de la caja a prueba de balas",
    price: 2.4064,
    supplierPrice: 2.2064,
  },
  {
    id: "bulletproof_case_30d",
    name:
      "Caja a prueba de balas (30d)",
    price: 2.3681,
    supplierPrice: 2.1681,
  },
  {
    id: "monthly_premium_battle_pass_activation_pass",
    name:
      "Monthly Premium Battle Pass Activation Pass",
    price: 3.6527,
    supplierPrice: 3.4527,
  },
  {
    id: "composite_case_privileges",
    name:
      "Composite Case Privileges",
    price: 6.8394,
    supplierPrice: 6.6394,
  },
  {
    id: "composition_case_30d",
    name:
      "Composition Case (30d)",
    price: 6.7457,
    supplierPrice: 6.5457,
  },
  {
    id: "quarterly_premium_battle_pass_bundle_activation_pass_bundle",
    name:
      "Quarterly Premium Battle Pass Bundle Activation Pass Bundle",
    price: 10.5692,
    supplierPrice: 10.3692,
  },
] as const;

/*
 * ============================================================
 * BEARER TOKEN
 * ============================================================
 */

function getBearerToken(
  request: NextRequest
) {
  const authorization =
    request.headers.get("authorization") ||
    "";

  if (
    !authorization.startsWith(
      "Bearer "
    )
  ) {
    return null;
  }

  return authorization
    .slice(7)
    .trim();
}

/*
 * ============================================================
 * OBTENER ID DE ORDEN DE FAZERCARDS
 * ============================================================
 */

function getSupplierOrderId(
  data: any
): string | null {
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

/*
 * ============================================================
 * OBTENER ESTADO DE FAZERCARDS
 * ============================================================
 */

function getSupplierStatus(
  data: any
): string | null {
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
      return String(value)
        .trim()
        .toLowerCase();
    }
  }

  return null;
}

/*
 * ============================================================
 * ESTADOS RECHAZADOS
 * ============================================================
 */

function isSupplierRejected(
  status: string | null
) {
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

/*
 * ============================================================
 * ESTADOS COMPLETADOS
 * ============================================================
 */

function isSupplierCompleted(
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
    "delivered",
    "done",
  ].includes(status);
}

/*
 * ============================================================
 * PRECIO
 * ============================================================
 */

function getRetailPrice(
  offer: (typeof OFFERS)[number]
) {
  return Number(
    Number(
      offer.supplierPrice +
        STORE_MARGIN
    ).toFixed(4)
  );
}

/*
 * ============================================================
 * POST
 * ============================================================
 */

export async function POST(
  request: NextRequest
) {
  let reserved = false;

  let insertedOrderId:
    | string
    | null = null;

  try {
    /*
     * ========================================================
     * AUTH
     * ========================================================
     */

    const accessToken =
      getBearerToken(request);

    if (!accessToken) {
      return NextResponse.json(
        {
          error:
            "No autorizado. Inicie sesión.",
        },
        {
          status: 401,
        }
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
      return NextResponse.json(
        {
          error:
            "Sesión inválida o expirada.",
        },
        {
          status: 401,
        }
      );
    }

    const user =
      userData.user;

    /*
     * ========================================================
     * BODY
     * ========================================================
     */

    const body =
      await request.json();

    const offerId =
      String(
        body?.offerId || ""
      ).trim();

    const playerId =
      String(
        body?.playerId || ""
      ).trim();

    const idempotencyKey =
      String(
        body?.idempotencyKey || ""
      ).trim();

    const requestedRetailPrice =
      Number(
        body?.retailPrice
      );

    /*
     * ========================================================
     * VALIDAR OFERTA
     * ========================================================
     */

    if (!offerId) {
      return NextResponse.json(
        {
          error:
            "Debe seleccionar una oferta.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ========================================================
     * VALIDAR PLAYER ID
     * ========================================================
     */

    if (!playerId) {
      return NextResponse.json(
        {
          error:
            "Debe introducir el Player ID.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !/^[0-9]+$/.test(
        playerId
      )
    ) {
      return NextResponse.json(
        {
          error:
            "El Player ID solo puede contener números.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      playerId.length < 4
    ) {
      return NextResponse.json(
        {
          error:
            "El Player ID debe tener al menos 4 números.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      playerId.length > 32
    ) {
      return NextResponse.json(
        {
          error:
            "El Player ID es demasiado largo.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ========================================================
     * VALIDAR IDEMPOTENCY KEY
     * ========================================================
     */

    if (!idempotencyKey) {
      return NextResponse.json(
        {
          error:
            "Falta la clave de idempotencia.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ========================================================
     * BUSCAR OFERTA
     * ========================================================
     */

    const offer =
      OFFERS.find(
        (item) =>
          item.id ===
          offerId
      );

    if (!offer) {
      return NextResponse.json(
        {
          error:
            "La oferta seleccionada no existe.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ========================================================
     * VALIDAR PRECIO
     * ========================================================
     */

    if (
      !Number.isFinite(
        offer.supplierPrice
      ) ||
      offer.supplierPrice <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Esta oferta todavía no tiene un precio disponible.",
        },
        {
          status: 400,
        }
      );
    }

    const retailPrice =
      getRetailPrice(
        offer
      );

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
        {
          status: 400,
        }
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
          expected:
            retailPrice,
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ========================================================
     * IDEMPOTENCIA
     * ========================================================
     */

    const {
      data: existingOrder,
      error:
        existingOrderError,
    } =
      await supabaseAdmin
        .from("topup_orders")
        .select(
          "id,status,supplier_order_id,retail_price"
        )
        .eq(
          "user_id",
          user.id
        )
        .eq(
          "idempotency_key",
          idempotencyKey
        )
        .maybeSingle();

    if (
      existingOrderError
    ) {
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
        {
          status: 500,
        }
      );
    }

    if (existingOrder) {
      return NextResponse.json(
        {
          ok: true,
          duplicate: true,
          order:
            existingOrder,
          orderNumber:
            existingOrder.id,
        },
        {
          status: 200,
        }
      );
    }

    /*
     * ========================================================
     * PERFIL / BALANCE
     * ========================================================
     *
     * ESTA PARTE ES IGUAL A DELTA FORCE.
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

    if (
      profileError
    ) {
      console.error(
        "Error obteniendo perfil:",
        profileError
      );

      return NextResponse.json(
        {
          error:
            "No se pudo obtener el perfil.",
          details:
            profileError.message,
        },
        {
          status: 500,
        }
      );
    }

    if (!profile) {
      return NextResponse.json(
        {
          error:
            "Perfil de usuario no encontrado.",
        },
        {
          status: 404,
        }
      );
    }

    const balance =
      Number(
        profile.balance || 0
      );

    if (
      !Number.isFinite(
        balance
      ) ||
      balance < retailPrice
    ) {
      return NextResponse.json(
        {
          error:
            "Saldo insuficiente.",
          balance,
          required:
            retailPrice,
        },
        {
          status: 400,
        }
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
    } =
      await supabaseAdmin
        .from("topup_orders")
        .insert({
          user_id:
            user.id,

          game:
            "Arena Breakout",

          category_id:
            CATEGORY_ID,

          offer_id:
            offer.id,

          offer_name:
            offer.name,

          player_id:
            playerId,

          currency:
            "USD",

          retail_price:
            retailPrice,

          supplier_price:
            Number(
              offer.supplierPrice
            ),

          status:
            "RESERVED",

          idempotency_key:
            idempotencyKey,

          supplier_fields: {
            player_id:
              playerId,
          },
        })
        .select(
          "*"
        )
        .single();

    if (
      insertError ||
      !insertedOrder
    ) {
      console.error(
        "Error creando topup_order:",
        insertError
      );

      return NextResponse.json(
        {
          error:
            "No se pudo crear la orden.",
          details:
            insertError?.message,
        },
        {
          status: 500,
        }
      );
    }

    insertedOrderId =
      insertedOrder.id;

    /*
     * ========================================================
     * RESERVAR SALDO
     * ========================================================
     *
     * EXACTAMENTE EL MISMO FORMATO QUE DELTA FORCE.
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

    if (
      reserveError
    ) {
      console.error(
        "Error reservando saldo:",
        reserveError
      );

      await supabaseAdmin
        .from("topup_orders")
        .update({
          status:
            "FAILED",

          supplier_response: {
            reserve_error:
              reserveError.message,
          },

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          insertedOrderId
        );

      return NextResponse.json(
        {
          error:
            reserveError.message ||
            "No se pudo reservar el saldo.",
        },
        {
          status: 400,
        }
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

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          insertedOrderId
        );

      return NextResponse.json(
        {
          error:
            "Saldo insuficiente.",
        },
        {
          status: 400,
        }
      );
    }

    reserved = true;

    /*
     * ========================================================
     * COMPROBAR API KEY
     * ========================================================
     */

    if (!FAZER_API_KEY) {
      console.error(
        "Falta FAZERCARDS_API_KEY."
      );

      /*
       * Devolver el saldo porque todavía
       * no hemos enviado nada al proveedor.
       */

      await supabaseAdmin.rpc(
        "refund_topup_balance",
        {
          p_order_id:
            insertedOrderId,
        }
      );

      reserved = false;

      await supabaseAdmin
        .from("topup_orders")
        .update({
          status:
            "REFUNDED",

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          insertedOrderId
        );

      return NextResponse.json(
        {
          error:
            "La configuración del proveedor está incompleta.",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * ========================================================
     * PAYLOAD PARA FAZERCARDS
     * ========================================================
     *
     * NO mandamos:
     *
     * - retailPrice
     * - supplierPrice
     * - offerName
     *
     * Solo lo que necesita FazerCards.
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
      "ARENA BREAKOUT -> FAZERCARDS:",
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
            method:
              "POST",

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

            cache:
              "no-store",
          }
        );
    } catch (
      supplierNetworkError
    ) {
      /*
       * No hacemos refund porque no sabemos
       * si FazerCards recibió el pedido.
       */

      console.error(
        "Error de red con FazerCards:",
        supplierNetworkError
      );

      await supabaseAdmin
        .from("topup_orders")
        .update({
          status:
            "SUPPLIER_PENDING",

          supplier_response: {
            network_error:
              supplierNetworkError instanceof
              Error
                ? supplierNetworkError.message
                : String(
                    supplierNetworkError
                  ),

            request:
              supplierPayload,
          },

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          insertedOrderId
        );

      reserved = false;

      return NextResponse.json(
        {
          ok: true,

          pending: true,

          orderNumber:
            insertedOrder.id,

          message:
            "El pedido quedó pendiente de confirmación del proveedor.",
        },
        {
          status: 202,
        }
      );
    }

    /*
     * ========================================================
     * LEER RESPUESTA DE FAZERCARDS
     * ========================================================
     */

    const responseText =
      await supplierResponse.text();

    let supplierData: any =
      null;

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

    console.log(
      "RESPUESTA ARENA BREAKOUT:",
      {
        httpStatus:
          supplierResponse.status,

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
        insertedOrderId
      );

    /*
     * ========================================================
     * PROVEEDOR RECHAZÓ
     * ========================================================
     */

    if (
      !supplierResponse.ok ||
      isSupplierRejected(
        supplierStatus
      )
    ) {
      console.error(
        "FAZERCARDS RECHAZÓ ARENA BREAKOUT:",
        {
          httpStatus:
            supplierResponse.status,

          supplierStatus,

          supplierData,
        }
      );

      /*
       * Reembolsar únicamente cuando tenemos
       * una respuesta explícita del proveedor
       * indicando que rechazó.
       */

      const {
        error:
          refundError,
      } =
        await supabaseAdmin.rpc(
          "refund_topup_balance",
          {
            p_order_id:
              insertedOrderId,
          }
        );

      if (
        refundError
      ) {
        console.error(
          "Error haciendo refund:",
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
            insertedOrderId
          );

        reserved = false;

        return NextResponse.json(
          {
            error:
              "El proveedor rechazó la orden y el reembolso quedó pendiente.",

            supplier:
              supplierData,
          },
          {
            status: 502,
          }
        );
      }

      reserved = false;

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
          insertedOrderId
        );

      /*
       * Intentamos mostrar el mensaje real
       * del proveedor.
       */

      const supplierMessage =
        supplierData?.error ||
        supplierData?.message ||
        supplierData?.detail ||
        "El proveedor rechazó la orden.";

      return NextResponse.json(
        {
          error:
            `El proveedor rechazó la orden: ${supplierMessage}. El saldo fue reembolsado.`,

          supplier:
            supplierData,

          orderNumber:
            insertedOrder.id,
        },
        {
          status: 502,
        }
      );
    }

    /*
     * ========================================================
     * NO HAY ORDER ID
     * ========================================================
     *
     * Si FazerCards respondió HTTP OK pero no
     * encontramos el ID, NO reembolsamos.
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
          insertedOrderId
        );

      reserved = false;

      return NextResponse.json(
        {
          ok: true,

          pending: true,

          orderNumber:
            insertedOrder.id,

          message:
            "El pedido fue enviado al proveedor y quedó pendiente de confirmación.",
        },
        {
          status: 202,
        }
      );
    }

    /*
     * ========================================================
     * PEDIDO COMPLETADO
     * ========================================================
     */

    if (
      isSupplierCompleted(
        supplierStatus
      )
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
          "Error completando orden:",
          completeError
        );

        /*
         * El proveedor ya aceptó/completó.
         * No hacemos refund.
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
            insertedOrderId
          );

        reserved = false;

        return NextResponse.json(
          {
            ok: true,

            pending: true,

            orderNumber:
              supplierOrderId,

            supplierOrderId,

            message:
              "La orden fue aceptada por el proveedor y está pendiente de confirmación.",
          },
          {
            status: 202,
          }
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
          insertedOrderId
        );

      reserved = false;

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
        {
          status: 200,
        }
      );
    }

    /*
     * ========================================================
     * PROCESSING / PENDING
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
        insertedOrderId
      );

    reserved = false;

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
      {
        status: 202,
      }
    );
  } catch (error) {
    /*
     * ========================================================
     * ERROR GENERAL
     * ========================================================
     */

    console.error(
      "ERROR GENERAL ARENA BREAKOUT:",
      error
    );

    /*
     * Si la orden ya fue enviada al proveedor,
     * no hacemos refund automático.
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
      {
        status: 500,
      }
    );
  }
}
