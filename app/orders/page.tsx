"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type TopupOrderRow = {
  id: string;
  user_id: string;
  username: string | null;
  email: string | null;
  game: string;
  category_id: string;
  offer_id: string;
  offer_name: string;
  player_id: string;
  retail_price: number | string;
  supplier_price: number | string;
  currency: string;
  status: string;
  supplier_order_id: string | null;
  supplier_fields: Record<string, unknown> | null;
  supplier_response: Record<string, unknown> | null;
  refunded_at: string | null;
  completed_at: string | null;
  failed_at: string | null;
  created_at: string;
  updated_at: string;
};

type Order = {
  id: string;
  user_id?: string;
  email?: string;
  username?: string;
  game: string;
  product: string;
  displayProduct?: string;
  price: number;
  total?: number;
  playerId: string;
  serverId?: string;
  status: string;
  createdAt: string;
  supplierOrderId?: string;
  currency?: string;
};

type Filter =
  | "TODAS"
  | "PENDIENTES"
  | "COMPLETADAS"
  | "CANCELADAS";

export default function OrdersPage() {
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] =
    useState<Filter>("TODAS");

  const [loading, setLoading] =
    useState(true);

  /*
   * ============================================================
   * CARGAR ÓRDENES
   * ============================================================
   */

  useEffect(() => {
    let mounted = true;

    async function loadOrders() {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (
          sessionError ||
          !session?.user
        ) {
          if (mounted) {
            setLoading(false);
            router.replace("/login");
          }

          return;
        }

        const userId =
          session.user.id;

        const {
          data,
          error,
        } = await supabase
          .from("topup_orders")
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
              refunded_at,
              completed_at,
              failed_at,
              created_at,
              updated_at
            `
          )
          .eq(
            "user_id",
            userId
          )
          .order(
            "created_at",
            {
              ascending: false,
            }
          );

        if (error) {
          console.error(
            "ERROR CARGANDO ÓRDENES:",
            error
          );

          if (mounted) {
            setOrders([]);
            setLoading(false);
          }

          return;
        }

        const mappedOrders: Order[] =
          (
            (data ||
              []) as TopupOrderRow[]
          ).map(
            (order) => ({
              id: order.id,

              user_id:
                order.user_id,

              email:
                order.email ||
                undefined,

              username:
                order.username ||
                undefined,

              game:
                order.game,

              product:
                order.offer_name,

              displayProduct:
                order.offer_name,

              price:
                Number(
                  order.retail_price
                ),

              total:
                Number(
                  order.retail_price
                ),

              playerId:
                order.player_id,

              status:
                order.status,

              createdAt:
                order.created_at,

              supplierOrderId:
                order.supplier_order_id ||
                undefined,

              currency:
                order.currency,
            })
          );

        if (mounted) {
          setOrders(
            mappedOrders
          );

          setLoading(false);
        }
      } catch (error) {
        console.error(
          "ERROR CARGANDO ÓRDENES:",
          error
        );

        if (mounted) {
          setOrders([]);
          setLoading(false);
        }
      }
    }

    loadOrders();

    return () => {
      mounted = false;
    };
  }, [router]);

  /*
   * ============================================================
   * NORMALIZAR ESTADO
   * ============================================================
   */

  function normalizeStatus(
    status: string
  ) {
    return (
      status
        ?.toString()
        .trim()
        .toUpperCase() || ""
    );
  }

  /*
   * ============================================================
   * ESTADO COMPLETADO
   * ============================================================
   */

  function isCompletedStatus(
    status: string
  ) {
    const normalized =
      normalizeStatus(
        status
      );

    return (
      normalized === "COMPLETED" ||
      normalized === "COMPLETADA" ||
      normalized === "CONFIRMADO" ||
      normalized === "CONFIRMADA"
    );
  }

  /*
   * ============================================================
   * ESTADO CANCELADO
   * ============================================================
   */

  function isCancelledStatus(
    status: string
  ) {
    const normalized =
      normalizeStatus(
        status
      );

    return (
      normalized === "CANCELLED" ||
      normalized === "CANCELED" ||
      normalized === "CANCELADA" ||
      normalized === "FAILED" ||
      normalized === "REFUNDED"
    );
  }

  /*
   * ============================================================
   * ESTADO PENDIENTE
   * ============================================================
   */

  function isPendingStatus(
    status: string
  ) {
    const normalized =
      normalizeStatus(
        status
      );

    return (
      normalized === "RESERVED" ||
      normalized === "SUPPLIER_PENDING" ||
      normalized === "REFUND_PENDING" ||
      normalized === "PENDING" ||
      normalized === "PROCESSING" ||
      normalized === "PENDIENTE"
    );
  }

  /*
   * ============================================================
   * FILTRAR ÓRDENES
   * ============================================================
   */

  const filteredOrders =
    useMemo(() => {
      if (
        filter === "TODAS"
      ) {
        return orders;
      }

      if (
        filter === "PENDIENTES"
      ) {
        return orders.filter(
          (order) =>
            isPendingStatus(
              order.status
            )
        );
      }

      if (
        filter === "COMPLETADAS"
      ) {
        return orders.filter(
          (order) =>
            isCompletedStatus(
              order.status
            )
        );
      }

      if (
        filter === "CANCELADAS"
      ) {
        return orders.filter(
          (order) =>
            isCancelledStatus(
              order.status
            )
        );
      }

      return orders;
    }, [
      orders,
      filter,
    ]);

  /*
   * ============================================================
   * CONTADORES
   * ============================================================
   */

  const pendingCount =
    orders.filter(
      (order) =>
        isPendingStatus(
          order.status
        )
    ).length;

  const completedCount =
    orders.filter(
      (order) =>
        isCompletedStatus(
          order.status
        )
    ).length;

  const cancelledCount =
    orders.filter(
      (order) =>
        isCancelledStatus(
          order.status
        )
    ).length;

  /*
   * ============================================================
   * FECHA
   * ============================================================
   */

  function formatDate(
    date: string
  ) {
    try {
      return new Intl.DateTimeFormat(
        "es",
        {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }
      ).format(
        new Date(date)
      );
    } catch {
      return date;
    }
  }

  /*
   * ============================================================
   * ICONO DEL JUEGO
   * ============================================================
   */

  function getGameIcon(
    game: string
  ) {
    const normalized =
      game
        .toLowerCase();

    if (
      normalized.includes(
        "free fire"
      )
    ) {
      return "💎";
    }

    if (
      normalized.includes(
        "call of duty"
      )
    ) {
      return "🪙";
    }

    if (
      normalized.includes(
        "mobile legends"
      )
    ) {
      return "💎";
    }

    if (
      normalized.includes(
        "blood strike"
      )
    ) {
      return "🪙";
    }

    return "🎮";
  }

  /*
   * ============================================================
   * CLASE DEL ESTADO
   * ============================================================
   */

  function getStatusClass(
    status: string
  ) {
    if (
      isCompletedStatus(
        status
      )
    ) {
      return "order-status completed";
    }

    if (
      isCancelledStatus(
        status
      )
    ) {
      return "order-status cancelled";
    }

    return "order-status pending";
  }

  /*
   * ============================================================
   * TEXTO DEL ESTADO
   * ============================================================
   */

  function getStatusText(
    status: string
  ) {
    if (
      isCompletedStatus(
        status
      )
    ) {
      return "COMPLETADA";
    }

    if (
      isCancelledStatus(
        status
      )
    ) {
      return "CANCELADA";
    }

    return "PENDIENTE";
  }

  /*
   * ============================================================
   * ABRIR PEDIDO
   * ============================================================
   */

  function openOrder(
    order: Order
  ) {
    localStorage.setItem(
      "storeGamingSelectedOrder",
      JSON.stringify(
        order
      )
    );

    /*
     * La página /orders/detail
     * solamente debe utilizarse si
     * existe realmente en el proyecto.
     */

    router.push(
      "/orders/detail"
    );
  }

  /*
   * ============================================================
   * PANTALLA DE CARGA
   * ============================================================
   */

  if (loading) {
    return (
      <main className="orders-page">

        <section className="orders-loading">

          <div className="orders-loading-spinner">
            ⏳
          </div>

          <h1>
            CARGANDO ÓRDENES
          </h1>

          <p>
            Espere un momento...
          </p>

        </section>

      </main>
    );
  }

  /*
   * ============================================================
   * PÁGINA
   * ============================================================
   */

  return (
    <main className="orders-page">

      {/* HEADER */}

      <header className="orders-header">

        <button
          type="button"
          className="orders-back-button"
          onClick={() =>
            router.push("/")
          }
        >
          ←
        </button>

        <div className="orders-header-title">

          <strong>
            🛒STORE GAMING🎮
          </strong>

          <span>
            MIS ÓRDENES
          </span>

        </div>

      </header>

      {/* HERO */}

      <section className="orders-hero">

        <div className="orders-hero-content">

          <span className="orders-hero-icon">
            📦
          </span>

          <div>

            <h1>
              MIS ÓRDENES
            </h1>

            <p>
              Consulta el estado de
              todas tus compras.
            </p>

          </div>

        </div>

      </section>

      {/* ESTADÍSTICAS */}

      <section className="orders-stats">

        <button
          type="button"
          className={
            filter === "TODAS"
              ? "order-stat active"
              : "order-stat"
          }
          onClick={() =>
            setFilter("TODAS")
          }
        >
          <strong>
            {orders.length}
          </strong>

          <span>
            TODAS
          </span>
        </button>

        <button
          type="button"
          className={
            filter === "PENDIENTES"
              ? "order-stat active"
              : "order-stat"
          }
          onClick={() =>
            setFilter(
              "PENDIENTES"
            )
          }
        >
          <strong>
            {pendingCount}
          </strong>

          <span>
            PENDIENTES
          </span>
        </button>

        <button
          type="button"
          className={
            filter === "COMPLETADAS"
              ? "order-stat active"
              : "order-stat"
          }
          onClick={() =>
            setFilter(
              "COMPLETADAS"
            )
          }
        >
          <strong>
            {completedCount}
          </strong>

          <span>
            COMPLETADAS
          </span>
        </button>

        <button
          type="button"
          className={
            filter === "CANCELADAS"
              ? "order-stat active"
              : "order-stat"
          }
          onClick={() =>
            setFilter(
              "CANCELADAS"
            )
          }
        >
          <strong>
            {cancelledCount}
          </strong>

          <span>
            CANCELADAS
          </span>
        </button>

      </section>

      {/* HISTORIAL */}

      <section className="orders-history">

        <div className="orders-section-title">

          <h2>
            HISTORIAL DE PEDIDOS
          </h2>

          <span>
            {filteredOrders.length} pedido
            {filteredOrders.length === 1
              ? ""
              : "s"}
          </span>

        </div>

        {filteredOrders.length === 0 ? (

          <div className="orders-empty">

            <span>
              📦
            </span>

            <h3>
              NO HAY PEDIDOS
            </h3>

            <p>
              No tienes órdenes en esta
              categoría todavía.
            </p>

          </div>

        ) : (

          <div className="orders-list">

            {filteredOrders.map(
              (order) => (

                <button
                  type="button"
                  key={order.id}
                  className="order-card"
                  onClick={() =>
                    openOrder(
                      order
                    )
                  }
                >

                  <div className="order-card-icon">

                    {getGameIcon(
                      order.game
                    )}

                  </div>

                  <div className="order-card-main">

                    <strong>
                      {order.game}
                    </strong>

                    <span>
                      {order.displayProduct ||
                        order.product}
                    </span>

                    <small>
                      ID:{" "}
                      {order.playerId}
                    </small>

                    <small>
                      {formatDate(
                        order.createdAt
                      )}
                    </small>

                  </div>

                  <div className="order-card-right">

                    <strong>
                      $
                      {order.price.toFixed(
                        2
                      )}
                    </strong>

                    <span
                      className={getStatusClass(
                        order.status
                      )}
                    >
                      {getStatusText(
                        order.status
                      )}
                    </span>

                  </div>

                </button>

              )
            )}

          </div>

        )}

      </section>

      {/* SEGURIDAD */}

      <section className="orders-security">

        <div>

          <span>
            🔒
          </span>

          <div>

            <strong>
              TUS ÓRDENES ESTÁN REGISTRADAS
            </strong>

            <p>
              Guarda el número de orden
              para consultar cualquier compra.
            </p>

          </div>

        </div>

      </section>

      {/* FOOTER */}

      <footer className="orders-footer">

        <strong>
          🛒STORE GAMING🎮
        </strong>

        <span>
          TU MEJOR OPCIÓN PARA RECARGAS GAMING
        </span>

      </footer>

    </main>
  );
              }
