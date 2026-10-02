import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { LEAGUE_OF_LEGENDS_ID } from "../../../../lib/games/league-of-legends-id";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const FAZERCARDS_API =
  process.env.FAZERCARDS_API_URL ||
  "https://api.fzr.cards/api/v2";

const FAZERCARDS_API_KEY =
  process.env.FAZERCARDS_API_KEY;

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL!;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return "Error desconocido";
  }
}

function getSupplierOrderId(data: any): string | null {
  return (
    data?.order_id ??
    data?.orderId ??
    data?.id ??
    data?.order?.order_id ??
    data?.order?.orderId ??
    data?.order?.id ??
    data?.data?.order_id ??
    data?.data?.orderId ??
    data?.data?.id ??
    null
  );
}

function getSupplierStatus(data: any): string {
  const status =
    data?.status ??
    data?.order?.status ??
    data?.data?.status ??
    "";

  return String(status).trim().toLowerCase();
}

function isCompleted(status: string) {
  return [
    "completed",
    "complete",
    "success",
    "successful",
    "done",
  ].includes(status);
}

function isFailed(status: string) {
  return [
    "failed",
    "failure",
    "rejected",
    "cancelled",
    "canceled",
    "error",
  ].includes(status);
}

async function refundOrder(orderId: string) {
  const { error } = await supabaseAdmin.rpc(
    "store_gaming_refund_balance",
    {
      p_order_id: orderId,
    }
  );

  if (error) {
    console.error(
      "[League of Legends] Error devolviendo saldo:",
      error
    );
  }

  return error;
}

export async function POST(request: Request) {
  let orderId: string | null = null;

  try {
    if (!FAZERCARDS_API_KEY) {
      return NextResponse.json(
        {
          ok: false,
          error: "Falta FAZERCARDS_API_KEY.",
        },
        { status: 500 }
      );
    }

    if (!SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        {
          ok: false,
          error: "Falta SUPABASE_SERVICE_ROLE_KEY.",
        },
        { status: 500 }
      );
    }

    const authorization =
      request.headers.get("authorization") || "";

    if (!authorization.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          ok: false,
          error: "No autorizado.",
        },
        { status: 401 }
      );
    }

    const accessToken =
      authorization.replace("Bearer ", "").trim();

    if (!accessToken) {
      return NextResponse.json(
        {
          ok: false,
          error: "Token de sesión inválido.",
        },
        { status: 401 }
      );
    }

    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(accessToken);

    if (authError || !user) {
      return NextResponse.json(
        {
          ok: false,
          error: "Sesión inválida o expirada.",
        },
        { status: 401 }
      );
    }

    const body = await request.json();

    const offerId =
      typeof body?.offerId === "string"
        ? body.offerId.trim()
        : "";

    const riotId =
      typeof body?.riotId === "string"
        ? body.riotId.trim()
        : "";

    const idempotencyKey =
      typeof body?.idempotencyKey === "string"
        ? body.idempotencyKey.trim()
        : "";

    if (!offerId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Falta offerId.",
        },
        { status: 400 }
      );
    }

    if (!riotId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Falta Riot ID.",
        },
        { status: 400 }
      );
    }

    if (!idempotencyKey) {
      return NextResponse.json(
        {
          ok: false,
          error: "Falta idempotencyKey.",
        },
        { status: 400 }
      );
    }

    const riotParts = riotId.split("#");

    if (
      riotParts.length !== 2 ||
      !riotParts[0].trim() ||
      !riotParts[1].trim()
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "El Riot ID debe tener el formato Nombre#TAG.",
        },
        { status: 400 }
      );
    }

    const offer = LEAGUE_OF_LEGENDS_ID.offers.find(
      (item) => item.id === offerId
    );

    if (!offer) {
      return NextResponse.json(
        {
          ok: false,
          error: "La oferta seleccionada no es válida.",
        },
        { status: 400 }
      );
    }

    /*
     * Idempotencia:
     * Si el cliente reenvía la misma solicitud, devolvemos
     * la orden existente y no volvemos a cobrar el saldo.
     */
    const { data: existingOrder, error: existingError } =
      await supabaseAdmin
        .from("topup_orders")
        .select(
          "id, status, supplier_order_id, retail_price, offer_name"
        )
        .eq("user_id", user.id)
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();

    if (existingError) {
      console.error(
        "[League of Legends] Error comprobando idempotencia:",
        existingError
      );

      return NextResponse.json(
        {
          ok: false,
          error: "No se pudo comprobar la orden.",
        },
        { status: 500 }
      );
    }

    if (existingOrder) {
      return NextResponse.json({
        ok: true,
        existing: true,
        order: existingOrder,
        orderNumber: existingOrder.id,
        supplierOrderId:
          existingOrder.supplier_order_id ?? "",
      });
    }

    /*
     * Reservar el saldo del usuario.
     */
    const { data: reserveData, error: reserveError } =
      await supabaseAdmin.rpc(
        "store_gaming_reserve_balance",
        {
          p_user_id: user.id,
          p_amount: offer.price,
        }
      );

    if (reserveError) {
      console.error(
        "[League of Legends] Error reservando saldo:",
        reserveError
      );

      return NextResponse.json(
        {
          ok: false,
          error:
            reserveError.message ||
            "No tienes saldo suficiente.",
        },
        { status: 400 }
      );
    }

    if (
      reserveData === false ||
      reserveData === null
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "Saldo insuficiente.",
        },
        { status: 400 }
      );
    }

    /*
     * Crear orden local.
     */
    const { data: insertedOrder, error: insertError } =
      await supabaseAdmin
        .from("topup_orders")
        .insert({
          user_id: user.id,
          username:
            user.user_metadata?.username ??
            user.user_metadata?.user_name ??
            null,
          email: user.email ?? null,

          game: LEAGUE_OF_LEGENDS_ID.name,
          category_id: LEAGUE_OF_LEGENDS_ID.categoryId,

          offer_id: offer.id,
          offer_name: offer.name,

          /*
           * La tabla exige player_id.
           * Guardamos aquí el Riot ID.
           */
          player_id: riotId,

          retail_price: offer.price,
          supplier_price: offer.supplierPrice,
          currency: "USD",

          status: "RESERVED",

          idempotency_key: idempotencyKey,

          supplier_fields: {
            riot_id: riotId,
          },
        })
        .select(
          "id, offer_id, offer_name, retail_price, supplier_price, status, idempotency_key"
        )
        .single();

    if (insertError || !insertedOrder) {
      console.error(
        "[League of Legends] Error creando orden:",
        insertError
      );

      /*
       * En caso de fallo de inserción intentamos devolver
       * el saldo mediante la función de reserva si el proyecto
       * dispone del flujo correspondiente.
       *
       * Como todavía no existe orderId, no llamamos a
       * store_gaming_refund_balance con un UUID inexistente.
       */
      return NextResponse.json(
        {
          ok: false,
          error:
            insertError?.message ||
            "No se pudo crear la orden.",
        },
        { status: 500 }
      );
    }

    orderId = insertedOrder.id;

    /*
     * Pedido real a FazerCards.
     */
    const supplierResponse = await fetch(
      `${FAZERCARDS_API}/topups/order`,
      {
        method: "POST",
        headers: {
          "X-API-Key": FAZERCARDS_API_KEY,
          "Idempotency-Key": idempotencyKey,
          "Content-Type": "application/json",
          Accept: "application/json",
          "User-Agent": "STORE-GAMING/1.0",
        },
        body: JSON.stringify({
          category_id:
            LEAGUE_OF_LEGENDS_ID.categoryId,

          offer_id: offer.id,

          fields: {
            riot_id: riotId,
          },
        }),
        cache: "no-store",
      }
    );

    const supplierText =
      await supplierResponse.text();

    let supplierData: any = null;

    try {
      supplierData = JSON.parse(supplierText);
    } catch {
      supplierData = {
        raw: supplierText.slice(0, 5000),
      };
    }

    /*
     * FazerCards rechazó la orden.
     */
    if (!supplierResponse.ok) {
      console.error(
        "[League of Legends] FazerCards rechazó:",
        supplierData
      );

      await supabaseAdmin
        .from("topup_orders")
        .update({
          status: "REJECTED",
          supplier_response: supplierData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      await refundOrder(orderId);

      return NextResponse.json(
        {
          ok: false,
          error:
            supplierData?.error ||
            supplierData?.message ||
            "FazerCards rechazó la orden.",
          supplier: supplierData,
        },
        { status: 502 }
      );
    }

    const supplierOrderId =
      getSupplierOrderId(supplierData);

    const supplierStatus =
      getSupplierStatus(supplierData);

    /*
     * Guardamos la respuesta del proveedor.
     */
    await supabaseAdmin
      .from("topup_orders")
      .update({
        supplier_order_id:
          supplierOrderId || null,

        supplier_response:
          supplierData,

        status: isCompleted(supplierStatus)
          ? "COMPLETED"
          : isFailed(supplierStatus)
          ? "REJECTED"
          : "SUPPLIER_PENDING",

        updated_at: new Date().toISOString(),

        ...(isCompleted(supplierStatus)
          ? {
              completed_at:
                new Date().toISOString(),
            }
          : {}),
      })
      .eq("id", orderId);

    /*
     * Si FazerCards indica fallo, devolvemos el saldo.
     */
    if (isFailed(supplierStatus)) {
      await refundOrder(orderId);

      return NextResponse.json(
        {
          ok: false,
          error:
            supplierData?.error ||
            supplierData?.message ||
            "FazerCards rechazó la recarga.",
          orderId,
          supplierOrderId,
        },
        { status: 502 }
      );
    }

    /*
     * Si ya está completado, marcamos la orden mediante
     * la función existente del proyecto.
     */
    if (
      supplierOrderId &&
      isCompleted(supplierStatus)
    ) {
      const { error: completeError } =
        await supabaseAdmin.rpc(
          "store_gaming_complete_order",
          {
            p_supplier_order_id:
              supplierOrderId,
          }
        );

      if (completeError) {
        console.error(
          "[League of Legends] Error completando orden:",
          completeError
        );
      }
    }

    return NextResponse.json({
      ok: true,

      order: {
        ...insertedOrder,
        status: isCompleted(supplierStatus)
          ? "COMPLETED"
          : "SUPPLIER_PENDING",
      },

      orderNumber: orderId,

      supplierOrderId:
        supplierOrderId || "",

      supplierStatus:
        supplierStatus || "pending",

      message: isCompleted(supplierStatus)
        ? "Orden completada correctamente."
        : "Orden creada y enviada al proveedor.",
    });
  } catch (error) {
    console.error(
      "[League of Legends] Error general:",
      error
    );

    /*
     * Si ya tenemos una orden local, intentamos dejar
     * registrada la respuesta del error.
     */
    if (orderId) {
      try {
        await supabaseAdmin
          .from("topup_orders")
          .update({
            status: "REJECTED",
            supplier_response: {
              error: getErrorMessage(error),
            },
            updated_at: new Date().toISOString(),
          })
          .eq("id", orderId);

        await refundOrder(orderId);
      } catch (refundError) {
        console.error(
          "[League of Legends] Error procesando rollback:",
          refundError
        );
      }
    }

    return NextResponse.json(
      {
        ok: false,
        error: getErrorMessage(error),
      },
      { status: 500 }
    );
  }
    }
