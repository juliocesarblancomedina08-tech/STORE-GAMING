"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type Order = {
  id: string;
  game: string;
  product: string;
  displayProduct?: string;
  price: number;
  playerId: string;
  serverId?: string;
  status: string;
  createdAt: string;
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
         * COMPROBAR SESIÓN REAL DE SUPABASE
         *
         * No utilizamos storeGamingAuth para
         * decidir si el usuario está autenticado.
         */

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          if (mounted) {
            router.replace("/login");
          }

          return;
        }

        /*
         * CARGAR ÓRDENES GUARDADAS
         */

        const savedOrders =
          localStorage.getItem(
            "storeGamingOrders"
          );

        if (savedOrders) {
          try {
            const parsed =
              JSON.parse(savedOrders);

            if (
              mounted &&
              Array.isArray(parsed)
            ) {
              setOrders(parsed);
            }
          } catch {
            if (mounted) {
              setOrders([]);
            }
          }
        } else {
          if (mounted) {
            setOrders([]);
          }
        }

        if (mounted) {
          setLoading(false);
        }
      } catch {
        /*
         * Si ocurre un error de sesión,
         * mandamos al login sin tocar
         * ni borrar la sesión manualmente.
         */

        if (mounted) {
          setLoading(false);
          router.replace("/login");
        }
      }
    }

    loadOrders();

    return () => {
      mounted = false;
    };
  }, [router]);

  const filteredOrders = useMemo(() => {
    if (filter === "TODAS") {
      return orders;
    }

    if (filter === "PENDIENTES") {
      return orders.filter(
        (order) =>
          order.status
            .toLowerCase() ===
          "pendiente"
      );
    }

    if (filter === "COMPLETADAS") {
      return orders.filter((order) => {
        const status =
          order.status.toLowerCase();

        return (
          status === "completada" ||
          status === "confirmado" ||
          status === "confirmada"
        );
      });
    }

    if (filter === "CANCELADAS") {
      return orders.filter(
        (order) =>
          order.status
            .toLowerCase() ===
          "cancelada"
      );
    }

    return orders;
  }, [orders, filter]);

  const pendingCount =
    orders.filter(
      (order) =>
        order.status
          .toLowerCase() ===
        "pendiente"
    ).length;

  const completedCount =
    orders.filter((order) => {
      const status =
        order.status.toLowerCase();

      return (
        status === "completada" ||
        status === "confirmado" ||
        status === "confirmada"
      );
    }).length;

  const cancelledCount =
    orders.filter(
      (order) =>
        order.status
          .toLowerCase() ===
        "cancelada"
    ).length;

  function formatDate(date: string) {
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
      ).format(new Date(date));
    } catch {
      return date;
    }
  }

  function getGameIcon(game: string) {
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

  function getStatusClass(
    status: string
  ) {
    const normalized =
      status.toLowerCase();

    if (
      normalized === "completada" ||
      normalized === "confirmado" ||
      normalized === "confirmada"
    ) {
      return "order-status completed";
    }

    if (
      normalized === "cancelada"
    ) {
      return "order-status cancelled";
    }

    return "order-status pending";
  }

  function getStatusText(
    status: string
  ) {
    const normalized =
      status.toLowerCase();

    if (
      normalized === "completada" ||
      normalized === "confirmado" ||
      normalized === "confirmada"
    ) {
      return "COMPLETADA";
    }

    if (
      normalized === "cancelada"
    ) {
      return "CANCELADA";
    }

    return "PENDIENTE";
  }

  function openOrder(order: Order) {
    localStorage.setItem(
      "storeGamingSelectedOrder",
      JSON.stringify(order)
    );

    router.push(
      "/orders/detail"
    );
  }

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
            router.push("/home")
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
            setFilter("TODAS")
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
            filter === "PENDIENTES"
              ? "active"
              : ""
          }`}
          onClick={() =>
            setFilter("PENDIENTES")
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
            filter === "COMPLETADAS"
              ? "active"
              : ""
          }`}
          onClick={() =>
            setFilter("COMPLETADAS")
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
            filter === "CANCELADAS"
              ? "active"
              : ""
          }`}
          onClick={() =>
            setFilter("CANCELADAS")
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

        {filteredOrders.length === 0 ? (

          <div className="orders-empty">

            <div className="orders-empty-icon">
              ▣
            </div>

            <h3>
              NO HAY ÓRDENES
            </h3>

            <p>
              {orders.length === 0
                ? "Todavía no has realizado ninguna compra."
                : "No hay órdenes que coincidan con este filtro."}
            </p>

            <button
              type="button"
              className="orders-shop-button"
              onClick={() =>
                router.push("/home")
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
                  key={order.id}
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
                        ).toFixed(2)}
                        $
                      </strong>

                    </div>

                    <button
                      type="button"
                      className="order-details-button"
                      onClick={() =>
                        openOrder(order)
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
