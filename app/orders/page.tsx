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

  useEffect(() => {
    let mounted = true;

    async function loadOrders() {
      try {
        /*
         * =========================
         * COMPROBAR SESIÓN
         * =========================
         */

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

        /*
         * =========================
         * CARGAR ÓRDENES REALES
         * =========================
         *
         * Las órdenes de Free Fire
         * ahora están en:
         *
         * public.topup_orders
         *
         * Nunca utilizamos localStorage
         * para obtener las órdenes.
         */

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

        /*
         * =========================
         * CONVERTIR DATOS
         * =========================
         *
         * Convertimos la estructura
         * de Supabase al formato que
         * ya utiliza este diseño.
         */

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
   * =========================
   * FILTROS
   * =========================
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
   * =========================
   * FUNCIONES DE ESTADO
   * =========================
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

  function isCompletedStatus(
    status: string
  ) {
    const normalized =
      normalizeStatus(
        status
      );

    return (
      normalized ===
        "COMPLETED" ||
      normalized ===
        "COMPLETADA" ||
      normalized ===
        "CONFIRMADO" ||
      normalized ===
        "CONFIRMADA"
    );
  }

  function isCancelledStatus(
    status: string
  ) {
    const normalized =
      normalizeStatus(
        status
      );

    return (
      normalized ===
        "CANCELLED" ||
      normalized ===
        "CANCELED" ||
      normalized ===
        "CANCELADA" ||
      normalized ===
        "FAILED" ||
      normalized ===
        "REFUNDED"
    );
  }

  function isPendingStatus(
    status: string
  ) {
    const normalized =
      normalizeStatus(
        status
      );

    return (
      normalized ===
        "RESERVED" ||
      normalized ===
        "SUPPLIER_PENDING" ||
      normalized ===
        "REFUND_PENDING" ||
      normalized ===
        "PENDING" ||
      normalized ===
        "PROCESSING" ||
      normalized ===
        "PENDIENTE"
    );
  }

  /*
   * =========================
   * CONTADORES
   * =========================
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
   * =========================
   * FECHA
   * =========================
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
   * =========================
   * ICONO DEL JUEGO
   * =========================
   */

  function getGameIcon(
    game: string
  ) {
    const normalized =
      game.toLowerCase();

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
   * =========================
   * CLASE DEL ESTADO
   * =========================
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
   * =========================
   * TEXTO DEL ESTADO
   * =========================
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
   * =========================
   * ABRIR PEDIDO
   * =========================
   *
   * IMPORTANTE:
   * Conservamos la navegación
   * existente hacia:
   *
   * /orders/detail
   *
   * y guardamos solamente la
   * orden seleccionada para que
   * la página de detalles pueda
   * utilizarla.
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

    router.push(
      "/orders/detail"
    );
  }

  /*
   * =========================
   * CARGANDO
   * =========================
   */

  if (loading) {
    return (
      <main className="orders-loading-page">

        <div className="orders-loading-logo">

          <span>
            STORE
          </span>

          <strong>
            🛒
          </strong>

          <span>
            GAMING
          </span>

        </div>

        <div className="orders-loading-line" />

        <p>
          CARGANDO ÓRDENES...
        </p>

      </main>
    );
  }

  return (
    <main className="orders-page">

      {/* HEADER */}

      <header className="orders-header">

        <button
          type="button"
          className="orders-back-button"
          onClick={() =>
            router.push(
              "/home"
            )
          }
          aria-label="Volver"
        >
          <span>
            ←
          </span>
        </button>

        <div className="orders-header-title">

          <div className="orders-brand-mini">

            <span>
              STORE
            </span>

            <b>
              🛒
            </b>

            <strong>
              GAMING
            </strong>

          </div>

          <small>
            MIS ÓRDENES
          </small>

        </div>

        <div
          className="orders-header-icon"
          aria-hidden="true"
        >
          ▣
        </div>

      </header>

      {/* HERO */}

      <section className="orders-hero">

        <div className="orders-hero-glow" />

        <div className="orders-hero-content">

          <span className="orders-hero-label">
            PANEL DE CLIENTE
          </span>

          <h1>
            MIS
            <strong>
              ÓRDENES
            </strong>
          </h1>

          <p>
            Consulta el estado y los
            detalles de todas tus compras.
          </p>

        </div>

        <div className="orders-total-box">

          <span>
            TOTAL
          </span>

          <strong>
            {orders.length}
          </strong>

          <small>
            ÓRDENES
          </small>

        </div>

      </section>

      {/* ESTADÍSTICAS */}

      <section className="orders-stats">

        <button
          type="button"
          className={`orders-stat ${
            filter === "TODAS"
              ? "active"
              : ""
          }`}
          onClick={() =>
            setFilter(
              "TODAS"
            )
          }
        >
          <span>
            ◈
          </span>

          <div>
            <strong>
              {orders.length}
            </strong>

            <small>
              TODAS
            </small>
          </div>
        </button>

        <button
          type="button"
          className={`orders-stat ${
            filter ===
            "PENDIENTES"
              ? "active"
              : ""
          }`}
          onClick={() =>
            setFilter(
              "PENDIENTES"
            )
          }
        >
          <span>
            ◷
          </span>

          <div>
            <strong>
              {pendingCount}
            </strong>

            <small>
              PENDIENTES
            </small>
          </div>
        </button>

        <button
          type="button"
          className={`orders-stat ${
            filter ===
            "COMPLETADAS"
              ? "active"
              : ""
          }`}
          onClick={() =>
            setFilter(
              "COMPLETADAS"
            )
          }
        >
          <span>
            ✓
          </span>

          <div>
            <strong>
              {completedCount}
            </strong>

            <small>
              COMPLETADAS
            </small>
          </div>
        </button>

        <button
          type="button"
          className={`orders-stat ${
            filter ===
            "CANCELADAS"
              ? "active"
              : ""
          }`}
          onClick={() =>
            setFilter(
              "CANCELADAS"
            )
          }
        >
          <span>
            ×
          </span>

          <div>
            <strong>
              {cancelledCount}
            </strong>

            <small>
              CANCELADAS
            </small>
          </div>
        </button>

      </section>

      {/* CONTENIDO */}

      <section className="orders-content">

        <div className="orders-content-header">

          <div>

            <span>
              HISTORIAL
            </span>

            <h2>
              TUS PEDIDOS
            </h2>

          </div>

          <div className="orders-filter-label">
            {filter}
          </div>

        </div>

        {filteredOrders.length ===
        0 ? (

          <div className="orders-empty">

            <div className="orders-empty-icon">
              ▣
            </div>

            <h3>
              NO HAY ÓRDENES
            </h3>

            <p>
              {orders.length ===
              0
                ? "Todavía no has realizado ninguna compra."
                : "No hay órdenes que coincidan con este filtro."}
            </p>

            <button
              type="button"
              className="orders-shop-button"
              onClick={() =>
                router.push(
                  "/home"
                )
              }
            >
              <span>
                VER RECARGAS
              </span>

              <b>
                →
              </b>
            </button>

          </div>

        ) : (

          <div className="orders-list">

            {filteredOrders.map(
              (order) => (

                <article
                  key={
                    order.id
                  }
                  className="order-item-card"
                >

                  <div className="order-item-top">

                    <div className="order-game-icon">
                      {getGameIcon(
                        order.game
                      )}
                    </div>

                    <div className="order-game-info">

                      <span>
                        {order.game}
                      </span>

                      <strong>
                        {order.displayProduct ||
                          order.product}
                      </strong>

                    </div>

                    <div
                      className={getStatusClass(
                        order.status
                      )}
                    >
                      <i />

                      {getStatusText(
                        order.status
                      )}
                    </div>

                  </div>

                  <div className="order-item-divider" />

                  <div className="order-item-details">

                    <div>
                      <span>
                        ORDEN
                      </span>

                      <strong>
                        #{order.id}
                      </strong>
                    </div>

                    <div>
                      <span>
                        ID DEL JUGADOR
                      </span>

                      <strong>
                        {order.playerId}
                      </strong>
                    </div>

                    {order.serverId && (
                      <div>
                        <span>
                          SERVIDOR
                        </span>

                        <strong>
                          {order.serverId}
                        </strong>
                      </div>
                    )}

                    <div>
                      <span>
                        FECHA
                      </span>

                      <strong>
                        {formatDate(
                          order.createdAt
                        )}
                      </strong>
                    </div>

                  </div>

                  <div className="order-item-bottom">

                    <div className="order-price">

                      <span>
                        TOTAL
                      </span>

                      <strong>
                        {Number(
                          order.price
                        ).toFixed(
                          2
                        )}
                        $
                      </strong>

                    </div>

                    <button
                      type="button"
                      className="order-details-button"
                      onClick={() =>
                        openOrder(
                          order
                        )
                      }
                    >
                      <span>
                        VER DETALLES
                      </span>

                      <b>
                        →
                      </b>
                    </button>

                  </div>

                </article>

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
