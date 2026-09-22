"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import { supabase } from "../../../lib/supabase";

type Order = {
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

  supplier_fields:
    | Record<string, unknown>
    | null;

  supplier_response:
    | Record<string, unknown>
    | null;

  refunded_at: string | null;
  completed_at: string | null;
  failed_at: string | null;

  created_at: string;
  updated_at: string;
};

type Filter =
  | "TODAS"
  | "PENDIENTES"
  | "COMPLETADAS"
  | "CANCELADAS";

type ApiResponse = {
  ok?: boolean;
  orders?: Order[];
  totalOrders?: number;
  totalAmount?: number;
  error?: string;
};

const ADMIN_EMAIL =
  "juliocesarblancomedina08@gmail.com";

const GAME_IMAGES: Record<
  string,
  string
> = {
  free_fire_latam:
    "/images/free-fire-latam.jpg",

  mobile_legends_united_states:
    "/images/mobile-legends.jpg",

  delta_force:
    "/images/delta-force.jpg",

  eafc_mobile_id:
    "/images/fc-mobile.jpg",

  call_of_duty_mobile:
    "/images/call-of-duty.jpg",

  telegram_stars:
    "/images/telegram-stars.jpg",
};

const DEFAULT_GAME_IMAGE =
  "/images/battle-royale-bg.jpg";

function getGameImage(
  categoryId: string,
  game: string
) {
  const direct =
    GAME_IMAGES[categoryId];

  if (direct) {
    return direct;
  }

  const normalized =
    game.toLowerCase();

  if (
    normalized.includes("free") &&
    normalized.includes("fire")
  ) {
    return "/images/free-fire-latam.jpg";
  }

  if (
    normalized.includes(
      "mobile legends"
    )
  ) {
    return "/images/mobile-legends.jpg";
  }

  if (
    normalized.includes("delta")
  ) {
    return "/images/delta-force.jpg";
  }

  if (
    normalized.includes("ea") ||
    normalized.includes("fc mobile")
  ) {
    return "/images/fc-mobile.jpg";
  }

  if (
    normalized.includes("call") ||
    normalized.includes("cod")
  ) {
    return "/images/call-of-duty.jpg";
  }

  if (
    normalized.includes("telegram")
  ) {
    return "/images/telegram-stars.jpg";
  }

  return DEFAULT_GAME_IMAGE;
}

export default function AdminOrdersPage() {
  const router = useRouter();

  const [loading, setLoading] =
    useState(true);

  const [
    loadingOrders,
    setLoadingOrders,
  ] = useState(false);

  const [authorized, setAuthorized] =
    useState(false);

  const [orders, setOrders] =
    useState<Order[]>([]);

  const [selectedOrder, setSelectedOrder] =
    useState<Order | null>(null);

  const [filter, setFilter] =
    useState<Filter>("TODAS");

  const [search, setSearch] =
    useState("");

  const [error, setError] =
    useState("");

  useEffect(() => {
    let mounted = true;

    async function verifyAdmin() {
      try {
        const {
          data: { session },
          error: sessionError,
        } =
          await supabase.auth.getSession();

        if (!mounted) {
          return;
        }

        if (
          sessionError ||
          !session?.user
        ) {
          router.replace("/login");
          return;
        }

        const email =
          session.user.email
            ?.trim()
            .toLowerCase() || "";

        if (
          email !==
          ADMIN_EMAIL.toLowerCase()
        ) {
          router.replace("/home");
          return;
        }

        setAuthorized(true);
        setLoading(false);

        await loadOrders(
          session.access_token
        );
      } catch (error) {
        console.error(
          "ERROR VERIFICANDO ADMIN:",
          error
        );

        if (mounted) {
          router.replace("/login");
        }
      }
    }

    verifyAdmin();

    return () => {
      mounted = false;
    };
  }, [router]);

  async function loadOrders(
    accessToken?: string
  ) {
    setLoadingOrders(true);
    setError("");

    try {
      let token =
        accessToken;

      if (!token) {
        const {
          data: { session },
        } =
          await supabase.auth.getSession();

        token =
          session?.access_token;
      }

      if (!token) {
        router.replace("/login");
        return;
      }

      const response =
        await fetch(
          "/api/admin/orders",
          {
            method: "GET",

            headers: {
              Authorization:
                `Bearer ${token}`,
            },

            cache: "no-store",
          }
        );

      const data =
        (await response.json()) as
          ApiResponse;

      if (!response.ok) {
        throw new Error(
          data.error ||
            "No se pudieron cargar las órdenes."
        );
      }

      setOrders(
        data.orders || []
      );
    } catch (error) {
      console.error(
        "ERROR CARGANDO ÓRDENES ADMIN:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar las órdenes."
      );
    } finally {
      setLoadingOrders(false);
    }
  }

  function goBack() {
    router.push("/admin");
  }

  function formatDate(
    value: string | null
  ) {
    if (!value) {
      return "—";
    }

    try {
      return new Date(
        value
      ).toLocaleString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return value;
    }
  }

  function formatMoney(
    value: number | string
  ) {
    return (
      Number(value) || 0
    ).toFixed(2);
  }

  function isCompleted(
    status: string
  ) {
    const normalized =
      status.toUpperCase();

    return (
      normalized ===
        "COMPLETED" ||
      normalized ===
        "COMPLETADA" ||
      normalized ===
        "CONFIRMADO" ||
      normalized ===
        "CONFIRMADA" ||
      normalized ===
        "SUCCESS" ||
      normalized ===
        "SUCCESSFUL"
    );
  }

  function isCancelled(
    status: string
  ) {
    const normalized =
      status.toUpperCase();

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

  function isPending(
    status: string
  ) {
    const normalized =
      status.toUpperCase();

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

  function getStatusText(
    status: string
  ) {
    if (isCompleted(status)) {
      return "COMPLETADA";
    }

    if (isCancelled(status)) {
      if (
        status.toUpperCase() ===
        "REFUNDED"
      ) {
        return "REEMBOLSADA";
      }

      return "CANCELADA";
    }

    if (
      status.toUpperCase() ===
      "SUPPLIER_PENDING"
    ) {
      return "PROCESANDO";
    }

    if (
      status.toUpperCase() ===
      "REFUND_PENDING"
    ) {
      return "REEMBOLSO PENDIENTE";
    }

    return "PENDIENTE";
  }

  function getStatusClass(
    status: string
  ) {
    if (isCompleted(status)) {
      return "status-completed";
    }

    if (isCancelled(status)) {
      return "status-cancelled";
    }

    return "status-pending";
  }

  function getServerId(
    order: Order
  ) {
    const fields =
      order.supplier_fields ||
      {};

    const value =
      fields.server_id ??
      fields.id_servidor ??
      fields.serverId;

    if (
      value === undefined ||
      value === null ||
      value === ""
    ) {
      return null;
    }

    return String(value);
  }

  function getSearchText(
    order: Order
  ) {
    return [
      order.id,
      order.user_id,
      order.email,
      order.username,
      order.game,
      order.category_id,
      order.offer_id,
      order.offer_name,
      order.player_id,
      order.supplier_order_id,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
  }

  const filteredOrders =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return orders.filter(
        (order) => {
          let matchesFilter = true;

          if (
            filter ===
            "PENDIENTES"
          ) {
            matchesFilter =
              isPending(
                order.status
              );
          }

          if (
            filter ===
            "COMPLETADAS"
          ) {
            matchesFilter =
              isCompleted(
                order.status
              );
          }

          if (
            filter ===
            "CANCELADAS"
          ) {
            matchesFilter =
              isCancelled(
                order.status
              );
          }

          if (!matchesFilter) {
            return false;
          }

          if (!query) {
            return true;
          }

          return getSearchText(
            order
          ).includes(query);
        }
      );
    }, [
      orders,
      filter,
      search,
    ]);

  const totalOrders =
    orders.length;

  const totalAmount =
    orders.reduce(
      (total, order) =>
        total +
        (Number(
          order.retail_price
        ) || 0),
      0
    );

  const pendingOrders =
    orders.filter((order) =>
      isPending(order.status)
    ).length;

  const completedOrders =
    orders.filter((order) =>
      isCompleted(order.status)
    ).length;

  const cancelledOrders =
    orders.filter((order) =>
      isCancelled(order.status)
    ).length;

  if (loading) {
    return (
      <main className="admin-page">

        <div className="admin-loading">

          <div className="admin-loading-icon">
            👑
          </div>

          <p>
            VERIFICANDO ACCESO...
          </p>

        </div>

      </main>
    );
  }

  if (!authorized) {
    return null;
  }

  /*
   * =========================================================
   * DETALLE DE ORDEN
   * =========================================================
   */

  if (selectedOrder) {
    const serverId =
      getServerId(
        selectedOrder
      );

    const image =
      getGameImage(
        selectedOrder.category_id,
        selectedOrder.game
      );

    return (
      <main className="admin-page">

        <header className="admin-header">

          <button
            type="button"
            className="admin-back-button"
            onClick={() =>
              setSelectedOrder(null)
            }
          >
            ←
          </button>

          <div className="admin-header-title">

            <div className="admin-header-icon">
              🛒
            </div>

            <div>

              <span>
                STORE GAMING
              </span>

              <h1>
                ORDEN
              </h1>

            </div>

          </div>

          <div />

        </header>

        <section className="admin-order-detail">

          <div className="admin-order-detail-game">

            <img
              src={image}
              alt={
                selectedOrder.game
              }
              onError={(event) => {
                const image =
                  event.currentTarget;

                image.src =
                  DEFAULT_GAME_IMAGE;
              }}
            />

            <div>

              <span>
                ORDEN #{selectedOrder.id}
              </span>

              <strong>
                {selectedOrder.game}
              </strong>

              <small>
                {selectedOrder.offer_name}
              </small>

            </div>

          </div>

          <div className="admin-order-status-box">

            <span>
              ESTADO
            </span>

            <strong
              className={
                getStatusClass(
                  selectedOrder.status
                )
              }
            >
              {getStatusText(
                selectedOrder.status
              )}
            </strong>

          </div>

          <div className="admin-order-detail-section">

            <div className="admin-order-detail-title">
              CLIENTE
            </div>

            <div className="admin-order-detail-row">

              <span>
                👤 Correo
              </span>

              <strong>
                {selectedOrder.email ||
                  "Sin correo"}
              </strong>

            </div>

            <div className="admin-order-detail-row">

              <span>
                🏷️ Usuario
              </span>

              <strong>
                {selectedOrder.username ||
                  "Sin usuario"}
              </strong>

            </div>

            <div className="admin-order-detail-row">

              <span>
                🆔 ID usuario
              </span>

              <strong>
                {selectedOrder.user_id}
              </strong>

            </div>

          </div>

          <div className="admin-order-detail-section">

            <div className="admin-order-detail-title">
              COMPRA
            </div>

            <div className="admin-order-detail-row">

              <span>
                🎮 Juego
              </span>

              <strong>
                {selectedOrder.game}
              </strong>

            </div>

            <div className="admin-order-detail-row">

              <span>
                📦 Producto
              </span>

              <strong>
                {selectedOrder.offer_name}
              </strong>

            </div>

            <div className="admin-order-detail-row">

              <span>
                🆔 ID jugador
              </span>

              <strong>
                {selectedOrder.player_id}
              </strong>

            </div>

            {serverId && (
              <div className="admin-order-detail-row">

                <span>
                  🌐 Servidor
                </span>

                <strong>
                  {serverId}
                </strong>

              </div>
            )}

            <div className="admin-order-detail-row">

              <span>
                💵 Precio cliente
              </span>

              <strong>
                $
                {formatMoney(
                  selectedOrder.retail_price
                )}
              </strong>

            </div>

            <div className="admin-order-detail-row">

              <span>
                ⚙️ Precio proveedor
              </span>

              <strong>
                $
                {formatMoney(
                  selectedOrder.supplier_price
                )}
              </strong>

            </div>

            <div className="admin-order-detail-row">

              <span>
                💳 Moneda
              </span>

              <strong>
                {selectedOrder.currency}
                            <strong>
                {selectedOrder.currency}
              </strong>

            </div>

          </div>

          <div className="admin-order-detail-section">

            <div className="admin-order-detail-title">
              PROVEEDOR
            </div>

            <div className="admin-order-detail-row">

              <span>
                🔢 Orden proveedor
              </span>

              <strong>
                {selectedOrder.supplier_order_id ||
                  "No disponible"}
              </strong>

            </div>

            <div className="admin-order-detail-row">

              <span>
                📅 Creada
              </span>

              <strong>
                {formatDate(
                  selectedOrder.created_at
                )}
              </strong>

            </div>

            <div className="admin-order-detail-row">

              <span>
                🔄 Actualizada
              </span>

              <strong>
                {formatDate(
                  selectedOrder.updated_at
                )}
              </strong>

            </div>

            <div className="admin-order-detail-row">

              <span>
                ✅ Completada
              </span>

              <strong>
                {formatDate(
                  selectedOrder.completed_at
                )}
              </strong>

            </div>

            <div className="admin-order-detail-row">

              <span>
                ❌ Fallida
              </span>

              <strong>
                {formatDate(
                  selectedOrder.failed_at
                )}
              </strong>

            </div>

            <div className="admin-order-detail-row">

              <span>
                💸 Reembolsada
              </span>

              <strong>
                {formatDate(
                  selectedOrder.refunded_at
                )}
              </strong>

            </div>

          </div>

          <div className="admin-order-json-section">

            <div className="admin-order-detail-title">
              DATOS ENVIADOS AL PROVEEDOR
            </div>

            <pre>
              {JSON.stringify(
                selectedOrder.supplier_fields ||
                  {},
                null,
                2
              )}
            </pre>

          </div>

          <div className="admin-order-json-section">

            <div className="admin-order-detail-title">
              RESPUESTA DEL PROVEEDOR
            </div>

            <pre>
              {JSON.stringify(
                selectedOrder.supplier_response ||
                  {},
                null,
                2
              )}
            </pre>

          </div>

          <button
            type="button"
            className="admin-order-return"
            onClick={() =>
              setSelectedOrder(null)
            }
          >
            ← VOLVER A ÓRDENES
          </button>

        </section>

      </main>
    );
  }

  return (
    <main className="admin-page">

      <header className="admin-header">

        <button
          type="button"
          className="admin-back-button"
          onClick={goBack}
        >
          ←
        </button>

        <div className="admin-header-title">

          <div className="admin-header-icon">
            🛒
          </div>

          <div>

            <span>
              STORE GAMING
            </span>

            <h1>
              ÓRDENES
            </h1>

          </div>

        </div>

        <button
          type="button"
          className="admin-logout-button"
          onClick={() =>
            loadOrders()
          }
          disabled={loadingOrders}
          aria-label="Actualizar"
        >
          ↻
        </button>

      </header>

      <section className="admin-order-summary">

        <div>
          <span>📦</span>

          <strong>
            {totalOrders}
          </strong>

          <small>
            ÓRDENES
          </small>
        </div>

        <div>
          <span>💵</span>

          <strong>
            ${totalAmount.toFixed(2)}
          </strong>

          <small>
            VENTAS
          </small>
        </div>

        <div>
          <span>⏳</span>

          <strong>
            {pendingOrders}
          </strong>

          <small>
            PENDIENTES
          </small>
        </div>

        <div>
          <span>✅</span>

          <strong>
            {completedOrders}
          </strong>

          <small>
            COMPLETADAS
          </small>
        </div>

        <div>
          <span>❌</span>

          <strong>
            {cancelledOrders}
          </strong>

          <small>
            CANCELADAS
          </small>
        </div>

      </section>

      <section className="admin-intro">

        <span>
          CONTROL DE PEDIDOS
        </span>

        <h2>
          ÓRDENES
        </h2>

        <p>
          Revisa las compras realizadas
          por todos los clientes.
        </p>

      </section>

      <section className="admin-orders-search">

        <span>
          🔎
        </span>

        <input
          type="text"
          value={search}
          onChange={(event) =>
            setSearch(
              event.target.value
            )
          }
          placeholder="Buscar cliente, orden, juego o ID..."
        />

      </section>

      <section className="admin-orders-filters">

        {(
          [
            "TODAS",
            "PENDIENTES",
            "COMPLETADAS",
            "CANCELADAS",
          ] as Filter[]
        ).map((item) => (
          <button
            key={item}
            type="button"
            className={
              filter === item
                ? "active"
                : ""
            }
            onClick={() =>
              setFilter(item)
            }
          >
            {item}
          </button>
        ))}

      </section>

      {error && (
        <section className="admin-error-card">

          <strong>
            ⚠️ ERROR
          </strong>

          <p>
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              loadOrders()
            }
          >
            REINTENTAR
          </button>

        </section>
      )}

      <section className="admin-orders-list">

        {loadingOrders && (
          <div className="admin-loading-card">

            <div>
              ↻
            </div>

            <span>
              CARGANDO ÓRDENES...
            </span>

          </div>
        )}

        {!loadingOrders &&
          !error &&
          filteredOrders.length === 0 && (
            <div className="admin-empty-card">

              <div>
                📭
              </div>

              <strong>
                NO HAY ÓRDENES
              </strong>

              <span>
                No se encontraron órdenes
                con los filtros actuales.
              </span>

            </div>
          )}

        {!loadingOrders &&
          filteredOrders.map(
            (order) => (
              <button
                key={order.id}
                type="button"
                className="admin-order-card"
                onClick={() =>
                  setSelectedOrder(
                    order
                  )
                }
              >

                <div className="admin-order-image">

                  <img
                    src={getGameImage(
                      order.category_id,
                      order.game
                    )}
                    alt={order.game}
                    loading="lazy"
                    onError={(
                      event
                    ) => {
                      event.currentTarget.src =
                        DEFAULT_GAME_IMAGE;
                    }}
                  />

                </div>

                <div className="admin-order-card-content">

                  <strong>
                    {order.offer_name}
                  </strong>

                  <span>
                    {order.game}
                  </span>

                  <small>
                    👤{" "}
                    {order.email ||
                      "Sin correo"}
                  </small>

                  <small>
                    🆔{" "}
                    {order.player_id}
                  </small>

                  <small>
                    #
                    {order.id}
                  </small>

                </div>

                <div className="admin-order-card-right">

                  <strong>
                    $
                    {formatMoney(
                      order.retail_price
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

                  <b>
                    →
                  </b>

                </div>

              </button>
            )
          )}

      </section>

      <section className="admin-security-card">

        <div className="admin-security-icon">
          🔐
        </div>

        <div>

          <strong>
            ÓRDENES PROTEGIDAS
          </strong>

          <p>
            La información de las compras
            solo está disponible para la
            cuenta administradora.
          </p>

        </div>

      </section>

      <footer className="admin-footer">

        <strong>
          STORE GAMING
        </strong>

        <span>
          CONTROL DE ÓRDENES
        </span>

        <small>
          © 2026 STORE GAMING
        </small>

      </footer>

    </main>
  );
              }
