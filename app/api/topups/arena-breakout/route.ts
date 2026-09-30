import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL!;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY!;

const FAZER_API_BASE =
  process.env.FAZERCARDS_API_URL ||
  "https://api.fzr.cards/api/v2";

const FAZER_API_KEY =
  process.env.FAZERCARDS_API_KEY || "";

const CATEGORY_ID = "arena_breakout";

const STORE_MARGIN = 0.2;

const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/*
 * ============================================================
 * TIPOS
 * ============================================================
 */

type FazerOffer = {
  offer_id: string;
  name: string;
  price_usd: string | number;
};

type FazerCatalogResponse = {
  ok?: boolean;
  category_id?: string;
  name?: string;
  offers?: FazerOffer[];
  fields?: Array<{
    key?: string;
    label?: string;
    type?: string;
  }>;
  error?: string;
  message?: string;
};

type FazerOrderResponse = {
  ok?: boolean;
  error?: string;
  message?: string;
  code?: string;
  order?: {
    id?: string;
    status?: string;
    kind?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

/*
 * ============================================================
 * FUNCIONES AUXILIARES
 * ============================================================
 */

function round4(value: number) {
  return Math.round(value * 10000) / 10000;
}

function getBearerToken(
  request: NextRequest
) {
  const authorization =
    request.headers.get("authorization");

  if (!authorization) {
    return null;
  }

  if (
    !authorization
      .toLowerCase()
      .startsWith("bearer ")
  ) {
    return null;
  }

  return authorization.slice(7).trim();
}

function getSupplierError(
  data: FazerOrderResponse
) {
  return (
    data?.error ||
    data?.message ||
    data?.code ||
    "El proveedor rechazó la orden."
  );
}

/*
 * ============================================================
 * GET CATÁLOGO REAL DE FAZERCARDS
 * ============================================================
 *
 * Antes de crear la orden consultamos el catálogo actual.
 *
 * Esto evita:
 *
 * - offer_id incorrecto
 * - precio viejo
 * - oferta eliminada
 * - SKU cambiado por FazerCards
 *
 * FazerCards documenta:
 *
 * GET /topups/offers?category_id=...
 *
 * y posteriormente:
 *
 * POST /topups/order
 *
 * con category_id + offer_id + fields.
 */

async function getArenaCatalog() {
  const response = await fetch(
    `${FAZER_API_BASE}/topups/offers?category_id=${encodeURIComponent(
      CATEGORY_ID
    )}`,
    {
      method: "GET",
      headers: {
        "X-API-Key": FAZER_API_KEY,
        Accept: "application/json",
      },
      cache: "no-store",
    }
  );

  const text =
    await response.text();

  let data: FazerCatalogResponse = {};

  try {
    data = text
      ? JSON.parse(text)
      : {};
  } catch {
    throw new Error(
      "FazerCards devolvió una respuesta de catálogo inválida."
    );
  }

  if (!response.ok || data.ok === false) {
    throw new Error(
      data.error ||
        data.message ||
        `No se pudo cargar el catálogo de Arena Breakout (${response.status}).`
    );
  }

  if (
    !Array.isArray(data.offers)
  ) {
    throw new Error(
      "FazerCards no devolvió las ofertas de Arena Breakout."
    );
  }

  return data;
}

/*
 * ============================================================
 * POST
 * ============================================================
 */

export async function POST(
  request: NextRequest
) {
  let createdOrderId: string | null = null;

  try {
    /*
     * --------------------------------------------------------
     * VARIABLES DE ENTORNO
     * --------------------------------------------------------
     */

    if (!SUPABASE_URL) {
      return NextResponse.json(
        {
          error:
            "Falta NEXT_PUBLIC_SUPABASE_URL.",
        },
        {
          status: 500,
        }
      );
    }

    if (!SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        {
          error:
            "Falta SUPABASE_SERVICE_ROLE_KEY.",
        },
        {
          status: 500,
        }
      );
    }

    if (!FAZER_API_KEY) {
      return NextResponse.json(
        {
          error:
            "Falta FAZERCARDS_API_KEY.",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * --------------------------------------------------------
     * AUTENTICACIÓN
     * --------------------------------------------------------
     */

    const accessToken =
      getBearerToken(request);

    if (!accessToken) {
      return NextResponse.json(
        {
          error:
            "Sesión no válida. Inicia sesión nuevamente.",
        },
        {
          status: 401,
        }
      );
    }

    const {
      data: authData,
      error: authError,
    } =
      await supabaseAdmin.auth.getUser(
        accessToken
      );

    if (
      authError ||
      !authData?.user
    ) {
      return NextResponse.json(
        {
          error:
            "Sesión no válida o expirada.",
        },
        {
          status: 401,
        }
      );
    }

    const user = authData.user;

    /*
     * --------------------------------------------------------
     * BODY
     * --------------------------------------------------------
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

    const clientRetailPrice =
      Number(body?.retailPrice);

    const idempotencyKey =
      typeof body?.idempotencyKey === "string" &&
      body.idempotencyKey.trim()
        ? body.idempotencyKey.trim()
        : crypto.randomUUID();

    /*
     * --------------------------------------------------------
     * VALIDACIÓN DEL OFFER ID
     * --------------------------------------------------------
     */

    if (!offerId) {
      return NextResponse.json(
        {
          error:
            "Debes seleccionar una oferta.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * --------------------------------------------------------
     * VALIDACIÓN DEL PLAYER ID
     * --------------------------------------------------------
     *
     * Arena Breakout utiliza player_id.
     */

    if (!playerId) {
      return NextResponse.json(
        {
          error:
            "Introduce tu Player ID.",
        },
        {
          status: 400,
        }
      );
    }

    if (!/^[0-9]+$/.test(playerId)) {
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

    if (playerId.length < 4) {
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

    if (playerId.length > 32) {
      return NextResponse.json(
        {
          error:
            "El Player ID no puede superar 32 números.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * --------------------------------------------------------
     * IDEMPOTENCIA LOCAL
     * --------------------------------------------------------
     *
     * Si el usuario toca dos veces el botón o el navegador
     * reintenta la petición, no creamos dos órdenes locales.
     */

    const {
      data: existingOrder,
      error: existingOrderError,
    } =
      await supabaseAdmin
        .from("topup_orders")
        .select(
          `
            id,
            user_id,
            category_id,
            offer_id,
            offer_name,
            player_id,
            retail_price,
            supplier_price,
            currency,
            status,
            supplier_order_id,
            supplier_response,
            created_at,
            updated_at
          `
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

    if (existingOrderError) {
      console.error(
        "ERROR COMPROBANDO IDEMPOTENCIA:",
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
          reused: true,
          order: existingOrder,
          orderNumber:
            existingOrder.supplier_order_id ||
            existingOrder.id,
        },
        {
          status: 200,
        }
      );
    }

    /*
     * --------------------------------------------------------
     * OBTENER CATÁLOGO ACTUAL DE FAZERCARDS
     * --------------------------------------------------------
     */

    let catalog:
      FazerCatalogResponse;

    try {
      catalog =
        await getArenaCatalog();
    } catch (catalogError) {
      console.error(
        "ERROR CATÁLOGO ARENA BREAKOUT:",
        catalogError
      );

      return NextResponse.json(
        {
          error:
            catalogError instanceof Error
              ? catalogError.message
              : "No se pudo comprobar el catálogo de Arena Breakout.",
        },
        {
          status: 502,
        }
      );
    }

    /*
     * --------------------------------------------------------
     * BUSCAR OFERTA EXACTA
     * --------------------------------------------------------
     */

    const supplierOffer =
      catalog.offers?.find(
        (offer) =>
          String(
            offer.offer_id
          ) === offerId
      );

    if (!supplierOffer) {
      return NextResponse.json(
        {
          error:
            "La oferta seleccionada ya no está disponible en FazerCards.",
          offerId,
        },
        {
          status: 400,
        }
      );
    }

    const supplierPrice =
      Number(
        supplierOffer.price_usd
      );

    if (
      !Number.isFinite(
        supplierPrice
      ) ||
      supplierPrice <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Esta oferta no tiene un precio válido en FazerCards.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * --------------------------------------------------------
     * PRECIO REAL DEL SERVIDOR
     * --------------------------------------------------------
     */

    const retailPrice =
      round4(
        supplierPrice +
          STORE_MARGIN
      );

    /*
     * El navegador puede enviar un precio.
     *
     * NO confiamos en él.
     *
     * Solamente lo comprobamos para detectar una versión vieja
     * de la página.
     */

    if (
      Number.isFinite(
        clientRetailPrice
      )
    ) {
      const difference =
        Math.abs(
          clientRetailPrice -
            retailPrice
        );

      if (
        difference >
        0.0002
      ) {
        console.warn(
          "PRECIO DEL CLIENTE DIFERENTE AL PRECIO DEL SERVIDOR:",
          {
            clientRetailPrice,
            retailPrice,
            offerId,
          }
        );
      }
    }

    /*
     * --------------------------------------------------------
     * PERFIL / BALANCE
     * --------------------------------------------------------
     */

    const {
      data: profile,
      error: profileError,
    } =
      await supabaseAdmin
        .from("profiles")
        .select(
          `
            id,
            username,
            email,
            balance
          `
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

      return NextResponse.json(
        {
          error:
            "No se pudo comprobar el saldo.",
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
            "No se encontró el perfil del usuario.",
        },
        {
          status: 404,
        }
      );
    }

    const currentBalance =
      Number(
        profile.balance
      ) || 0;

    if (
      currentBalance <
      retailPrice
    ) {
      return NextResponse.json(
        {
          error:
            "Saldo insuficiente para realizar esta compra.",
          balance: currentBalance,
          required: retailPrice,
        },
        {
          status: 400,
        }
      );
    }

    /*
     * --------------------------------------------------------
     * DATOS QUE SE ENVIARÁN A FAZERCARDS
     * --------------------------------------------------------
     *
     * IMPORTANTE:
     *
     * FazerCards espera:
     *
     * {
     *   category_id,
     *   offer_id,
     *   fields: {
     *     player_id
     *   }
     * }
     */

    const supplierFields = {
      player_id: playerId,
    };

    /*
     * --------------------------------------------------------
     * CREAR ORDEN LOCAL
     * --------------------------------------------------------
     */

    const { data: createdOrder, error: insertError } =
      await supabaseAdmin
        .from("topup_orders")
        .insert({
          user_id:
            user.id,

          username:
            profile.username ||
            user.user_metadata
              ?.username ||
            null,

          email:
            profile.email ||
            user.email ||
            null,

          game:
            "Arena Breakout",

          category_id:
            CATEGORY_ID,

          offer_id:
            supplierOffer.offer_id,

          offer_name:
            supplierOffer.name,

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

          supplier_fields:
            supplierFields,

          supplier_response:
            null,
        })
        .select(
          `
            id,
            user_id,
            username,
            email,
            game,
            category_id,
            offer_id,
            offer_name,
            player_id,
            retail_price,
            supplier_price,
            currency,
            status,
            supplier_order_id,
            supplier_fields,
            supplier_response,
            created_at,
            updated_at
          `
        )
        .single();

    if (insertError) {
      console.error(
        "ERROR CREANDO ORDEN LOCAL:",
        insertError
      );

      /*
       * Posible carrera de idempotencia:
       * otro request pudo crearla justo antes.
       */

      const {
        data: retryExisting,
      } =
        await supabaseAdmin
          .from("topup_orders")
          .select(
            `
              id,
              user_id,
              category_id,
              offer_id,
              offer_name,
              player_id,
              retail_price,
              supplier_price,
              currency,
              status,
              supplier_order_id,
              supplier_response,
              created_at,
              updated_at
            `
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

      if (retryExisting) {
        return NextResponse.json(
          {
            ok: true,
            reused: true,
            order:
              retryExisting,
            orderNumber:
              retryExisting.supplier_order_id ||
              retryExisting.id,
          },
          {
            status: 200,
          }
        );
      }

      return NextResponse.json(
        {
          error:
            "No se pudo crear la orden.",
          details:
            insertError.message,
        },
        {
          status: 500,
        }
      );
    }

    createdOrderId =
      createdOrder.id;

    /*
     * --------------------------------------------------------
     * RESERVAR SALDO
     * --------------------------------------------------------
     *
     * El RPC se encarga de descontar/reservar el dinero
     * asociado a esta orden.
     */

    const {
      data: reserveResult,
      error: reserveError,
    } =
      await supabaseAdmin.rpc(
        "reserve_topup_balance",
        {
          p_order_id:
            createdOrder.id,
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

          supplier_response: {
            local_error:
              "No se pudo reservar el saldo.",
            details:
              reserveError.message,
          },

          failed_at:
            new Date().toISOString(),

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          createdOrder.id
        );

      return NextResponse.json(
        {
          error:
            "No se pudo reservar el saldo.",
          details:
            reserveError.message,
        },
        {
          status: 500,
        }
      );
    }

    /*
     * Algunos RPC devuelven false cuando no se pudo reservar.
     */

    if (
      reserveResult === false
    ) {
      await supabaseAdmin
        .from("topup_orders")
        .update({
          status:
            "FAILED",

          supplier_response: {
            local_error:
              "Saldo insuficiente o no disponible para reservar.",
          },

          failed_at:
            new Date().toISOString(),

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          createdOrder.id
        );

      return NextResponse.json(
        {
          error:
            "No se pudo reservar el saldo.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * --------------------------------------------------------
     * ACTUALIZAR ESTADO
     * --------------------------------------------------------
     */

    await supabaseAdmin
      .from("topup_orders")
      .update({
        status:
          "PENDING",

        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        createdOrder.id
      );

     /*
     * --------------------------------------------------------
     * ENVIAR ORDEN A FAZERCARDS
     * --------------------------------------------------------
     *
     * ESTE ES EL CAMBIO PRINCIPAL.
     *
     * NO enviamos retailPrice.
     * NO enviamos supplierPrice.
     * NO enviamos offerName.
     *
     * FazerCards recibe únicamente los datos necesarios
     * para ejecutar el top-up.
     */

    const supplierBody = {
      category_id:
        CATEGORY_ID,

      offer_id:
        supplierOffer.offer_id,

      fields:
        supplierFields,
    };

    console.log(
      "ENVIANDO ORDEN A FAZERCARDS:",
      {
        category_id:
          CATEGORY_ID,

        offer_id:
          supplierOffer.offer_id,

        fields:
          supplierFields,

        localOrderId:
          createdOrder.id,
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
                FAZER_API_KEY,

              "Idempotency-Key":
                idempotencyKey,

              "Content-Type":
                "application/json",

              Accept:
                "application/json",

              "User-Agent":
                "STORE-GAMING/1.0",

              Referer:
                "https://store-gaming-qspc6vr62.vercel.app/",

              Origin:
                "https://store-gaming-qspc6vr62.vercel.app",
            },

            body:
              JSON.stringify(
                supplierBody
              ),

            cache:
              "no-store",
          }
        );
    } catch (networkError) {
      /*
       * ------------------------------------------------------
       * ERROR DE RED
       * ------------------------------------------------------
       *
       * Muy importante:
       *
       * Si nuestra conexión con FazerCards se cae después de
       * enviar la orden, NO debemos reembolsar inmediatamente.
       *
       * Podríamos haber enviado el pedido correctamente y
       * simplemente no haber recibido la respuesta.
       *
       * Por eso queda SUPPLIER_PENDING.
       */

      console.error(
        "ERROR DE RED CON FAZERCARDS:",
        networkError
      );

      await supabaseAdmin
        .from("topup_orders")
        .update({
          status:
            "SUPPLIER_PENDING",

          supplier_response: {
            network_error:
              true,

            message:
              networkError instanceof Error
                ? networkError.message
                : String(
                    networkError
                  ),

            request:
              supplierBody,
          },

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          createdOrder.id
        );

      return NextResponse.json(
        {
          ok: true,

          pending: true,

          orderNumber:
            createdOrder.id,

          order: {
            ...createdOrder,
            status:
              "SUPPLIER_PENDING",
          },

          message:
            "La orden fue enviada y está pendiente de confirmación del proveedor.",
        },
        {
          status: 202,
        }
      );
    }

    /*
     * --------------------------------------------------------
     * LEER RESPUESTA DE FAZERCARDS
     * --------------------------------------------------------
     */

    const supplierText =
      await supplierResponse.text();

    let supplierData:
      FazerOrderResponse = {};

    try {
      supplierData =
        supplierText
          ? JSON.parse(
              supplierText
            )
          : {};
    } catch {
      supplierData = {
        ok:
          supplierResponse.ok,

        error:
          supplierText ||
          `Respuesta inválida del proveedor (${supplierResponse.status}).`,
      };
    }

    console.log(
      "RESPUESTA FAZERCARDS:",
      {
        status:
          supplierResponse.status,

        data:
          supplierData,
      }
    );

    /*
     * --------------------------------------------------------
     * GUARDAR RESPUESTA DEL PROVEEDOR
     * --------------------------------------------------------
     */

    await supabaseAdmin
      .from("topup_orders")
      .update({
        supplier_response:
          supplierData,

        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        createdOrder.id
      );

    /*
     * --------------------------------------------------------
     * FAZERCARDS RECHAZÓ LA ORDEN
     * --------------------------------------------------------
     */

    if (
      !supplierResponse.ok ||
      supplierData.ok === false
    ) {
      const supplierError =
        getSupplierError(
          supplierData
        );

      console.error(
        "FAZERCARDS RECHAZÓ LA ORDEN:",
        {
          supplierStatus:
            supplierResponse.status,

          supplierError,

          supplierData,

          request:
            supplierBody,
        }
      );

      /*
       * Intentamos devolver el saldo reservado.
       */

      const {
        error: refundError,
      } =
        await supabaseAdmin.rpc(
          "refund_topup_balance",
          {
            p_order_id:
              createdOrder.id,
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
              ...(supplierData ||
                {}),

              supplier_rejected:
                true,

              supplier_error:
                supplierError,

              refund_error:
                refundError.message,
            },

            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            createdOrder.id
          );

        return NextResponse.json(
          {
            error:
              "El proveedor rechazó la orden y el reembolso quedó pendiente.",
            supplierError,
            orderId:
              createdOrder.id,
          },
          {
            status: 502,
          }
        );
      }

      await supabaseAdmin
        .from("topup_orders")
        .update({
          status:
            "REFUNDED",

          supplier_response: {
            ...(supplierData ||
              {}),

            supplier_rejected:
              true,

            supplier_error:
              supplierError,
          },

          refunded_at:
            new Date().toISOString(),

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          createdOrder.id
        );

      return NextResponse.json(
        {
          error:
            `El proveedor rechazó la orden: ${supplierError}. El saldo fue reembolsado.`,

          supplierError,

          orderId:
            createdOrder.id,

          supplierResponse:
            supplierData,
        },
        {
          status: 502,
        }
      );
    }

    /*
     * --------------------------------------------------------
     * ORDEN ACEPTADA
     * --------------------------------------------------------
     */

    const supplierOrderId =
      supplierData?.order?.id ||
      "";

    const supplierStatus =
      String(
        supplierData?.order?.status ||
          ""
      ).toLowerCase();

    /*
     * --------------------------------------------------------
     * COMPLETADA INMEDIATAMENTE
     * --------------------------------------------------------
     */

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
      const { error: completeError } =
        await supabaseAdmin.rpc(
          "complete_topup_order",
          {
            p_supplier_order_id:
              supplierOrderId,
          }
        );

      if (completeError) {
        console.error(
          "ERROR MARCANDO ORDEN COMPLETADA:",
          completeError
        );

        /*
         * La orden del proveedor sí fue aceptada.
         *
         * NO reembolsamos aquí.
         *
         * Queda pendiente para que el webhook la finalice.
         */

        await supabaseAdmin
          .from("topup_orders")
          .update({
            status:
              "SUPPLIER_PENDING",

            supplier_order_id:
              supplierOrderId ||
              null,

            supplier_response:
              supplierData,

            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            createdOrder.id
          );

        return NextResponse.json(
          {
            ok: true,

            pending: true,

            orderNumber:
              supplierOrderId ||
              createdOrder.id,

            supplierOrderId:
              supplierOrderId ||
              null,

            order: {
              ...createdOrder,
              status:
                "SUPPLIER_PENDING",
            },

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
            supplierOrderId ||
            null,

          supplier_response:
            supplierData,

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          createdOrder.id
        );

      return NextResponse.json(
        {
          ok: true,

          orderNumber:
            supplierOrderId ||
            createdOrder.id,

          supplierOrderId:
            supplierOrderId ||
            null,

          status:
            "COMPLETED",

          order: {
            ...createdOrder,
            status:
              "COMPLETED",
            supplier_order_id:
              supplierOrderId ||
              null,
          },
        },
        {
          status: 200,
        }
      );
    }

    /*
     * --------------------------------------------------------
     * PROCESSING / CREATED / PENDING
     * --------------------------------------------------------
     *
     * FazerCards normalmente devuelve processing.
     *
     * NO reembolsamos.
     *
     * El webhook finalizará la orden.
     */

    await supabaseAdmin
      .from("topup_orders")
      .update({
        status:
          "SUPPLIER_PENDING",

        supplier_order_id:
          supplierOrderId ||
          null,

        supplier_response:
          supplierData,

        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        createdOrder.id
      );

    return NextResponse.json(
      {
        ok: true,

        pending: true,

        orderNumber:
          supplierOrderId ||
          createdOrder.id,

        supplierOrderId:
          supplierOrderId ||
          null,

        status:
          "SUPPLIER_PENDING",

        order: {
          ...createdOrder,

          status:
            "SUPPLIER_PENDING",

          supplier_order_id:
            supplierOrderId ||
            null,

          supplier_response:
            supplierData,
        },

        message:
          "Orden enviada correctamente al proveedor y pendiente de confirmación.",
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
     * Si tenemos una orden local y algo falló después de
     * crearla, NO hacemos un reembolso automático aquí.
     *
     * Primero la dejamos pendiente para evitar devolver dinero
     * cuando FazerCards pudiera haber recibido el pedido.
     */

    if (createdOrderId) {
      try {
        await supabaseAdmin
          .from("topup_orders")
          .update({
            status:
              "SUPPLIER_PENDING",

            supplier_response: {
              internal_error:
                error instanceof Error
                  ? error.message
                  : String(error),
            },

            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            createdOrderId
          );
      } catch (updateError) {
        console.error(
          "ERROR ACTUALIZANDO ORDEN DESPUÉS DEL ERROR:",
          updateError
        );
      }
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
