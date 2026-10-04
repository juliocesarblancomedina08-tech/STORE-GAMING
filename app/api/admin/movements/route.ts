import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { isAdminUser } from "../../../../lib/admin";

export const dynamic = "force-dynamic";

function getBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization") || "";

  if (!authorization.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  return authorization.slice(7).trim() || null;
}

function jsonError(message: string, status: number) {
  return NextResponse.json(
    {
      ok: false,
      error: message,
    },
    { status }
  );
}

export async function GET(request: NextRequest) {
  try {
    const token = getBearerToken(request);

    if (!token) {
      return jsonError("No autorizado.", 401);
    }

    const authorized = await isAdminUser(token);

    if (!authorized) {
      return jsonError("Acceso denegado.", 403);
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    /*
     * ============================================================
     * LISTA DE USUARIOS
     * ============================================================
     */
    if (!userId) {
      const { data, error } = await supabaseAdmin
        .from("profiles")
        .select("id,email,balance")
        .order("email", {
          ascending: true,
        });

      if (error) {
        console.error("ERROR CARGANDO USUARIOS:", error);

        return jsonError(
          "No se pudieron cargar los usuarios.",
          500
        );
      }

      return NextResponse.json({
        ok: true,
        users: (data || []).map((user) => ({
          id: user.id,
          email: user.email || "Sin correo",
          balance: Number(user.balance) || 0,
        })),
      });
    }

    /*
     * ============================================================
     * DATOS DEL USUARIO
     * ============================================================
     */

    const { data: profile, error: profileError } =
      await supabaseAdmin
        .from("profiles")
        .select("id,email,balance")
        .eq("id", userId)
        .maybeSingle();

    if (profileError) {
      console.error(
        "ERROR CARGANDO PERFIL:",
        profileError
      );

      return jsonError(
        "No se pudo cargar el usuario.",
        500
      );
    }

    if (!profile) {
      return jsonError(
        "No se encontró el usuario.",
        404
      );
    }

    /*
     * ============================================================
     * MOVIMIENTOS DE SALDO
     * ============================================================
     */

    const {
      data: transactions,
      error: transactionsError,
    } = await supabaseAdmin
      .from("transactions")
      .select("*")
      .eq("user_id", userId);

    if (transactionsError) {
      console.error(
        "ERROR CARGANDO TRANSACTIONS:",
        transactionsError
      );

      return jsonError(
        "No se pudieron cargar los movimientos de saldo.",
        500
      );
    }

    /*
     * ============================================================
     * COMPRAS
     * ============================================================
     */

    const {
      data: orders,
      error: ordersError,
    } = await supabaseAdmin
      .from("topup_orders")
      .select(`
        id,
        user_id,
        game,
        offer_name,
        retail_price,
        currency,
        status,
        refunded_at,
        completed_at,
        created_at,
        updated_at
      `)
      .eq("user_id", userId)
      .order("created_at", {
        ascending: false,
      });

    if (ordersError) {
      console.error(
        "ERROR CARGANDO TOPUP ORDERS:",
        ordersError
      );

      return jsonError(
        "No se pudieron cargar las compras.",
        500
      );
    }

    /*
     * ============================================================
     * CONSTRUIR MOVIMIENTOS
     * ============================================================
     */

    type Movement = {
      id: string;
      kind: "ADD" | "SUBTRACT" | "PURCHASE";
      amount: number;
      description: string;
      product: string;
      date: string | null;
      status?: string;
    };

    const movements: Movement[] = [];

    /*
     * ADMIN_ADD / ADMIN_SUBTRACT
     */

    for (const transaction of transactions || []) {
      const amount = Number(transaction.amount) || 0;

      if (amount <= 0) {
        continue;
      }

      const type = String(transaction.type || "");

      if (type === "ADMIN_ADD") {
        movements.push({
          id: `transaction-${transaction.id}`,
          kind: "ADD",
          amount,
          description:
            transaction.description ||
            "Ingreso de saldo",
          product: "",
          date:
            transaction.created_at ||
            transaction.updated_at ||
            null,
        });
      }

      if (type === "ADMIN_SUBTRACT") {
        movements.push({
          id: `transaction-${transaction.id}`,
          kind: "SUBTRACT",
          amount,
          description:
            transaction.description ||
            "Retiro/Ajuste de saldo",
          product: "",
          date:
            transaction.created_at ||
            transaction.updated_at ||
            null,
        });
      }
    }

    /*
     * COMPRAS
     *
     * Solo contamos órdenes que realmente representan
     * una compra realizada.
     */
    for (const order of orders || []) {
      const amount = Number(order.retail_price) || 0;

      if (amount <= 0) {
        continue;
      }

      const status = String(
        order.status || ""
      ).toLowerCase();

      /*
       * No mostramos órdenes fallidas/canceladas.
       */
      if (
        status === "failed" ||
        status === "cancelled" ||
        status === "canceled"
      ) {
        continue;
      }

      /*
       * Si la orden fue reembolsada no la contamos como gasto.
       */
      if (order.refunded_at) {
        continue;
      }

      movements.push({
        id: `order-${order.id}`,
        kind: "PURCHASE",
        amount,
        description: "Compra",
        product:
          order.offer_name ||
          order.game ||
          "Producto",
        date:
          order.created_at ||
          order.completed_at ||
          null,
        status: order.status || "",
      });
    }

    /*
     * ============================================================
     * ORDENAR MÁS RECIENTE PRIMERO
     * ============================================================
     */

    movements.sort((a, b) => {
      const dateA = a.date
        ? new Date(a.date).getTime()
        : 0;

      const dateB = b.date
        ? new Date(b.date).getTime()
        : 0;

      return dateB - dateA;
    });

    /*
     * ============================================================
     * TOTALES
     * ============================================================
     */

    const totalAdded = movements
      .filter((movement) => movement.kind === "ADD")
      .reduce(
        (total, movement) =>
          total + movement.amount,
        0
      );

    const totalSpent = movements
      .filter(
        (movement) =>
          movement.kind === "PURCHASE" ||
          movement.kind === "SUBTRACT"
      )
      .reduce(
        (total, movement) =>
          total + movement.amount,
        0
      );

    /*
     * El balance guardado en profiles es el saldo
     * confirmado por el sistema.
     */
    const currentBalance =
      Number(profile.balance) || 0;

    return NextResponse.json({
      ok: true,

      user: {
        id: profile.id,
        email: profile.email || "Sin correo",
        balance: currentBalance,
      },

      summary: {
        added: totalAdded,
        spent: totalSpent,
        balance: currentBalance,
      },

      movements,
    });
  } catch (error) {
    console.error(
      "ERROR API ADMIN MOVEMENTS:",
      error
    );

    return jsonError(
      "Error interno del servidor.",
      500
    );
  }
}
