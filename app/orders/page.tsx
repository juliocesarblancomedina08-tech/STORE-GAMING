
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
  categoryId?: string;
  product: string;
  displayProduct?: string;
  price: number;
  total?: number;
  playerId: string;
  serverId?: string;
  status: string;
  canonicalStatus: string;
  statusLabel: string;
  statusIcon: string;
  createdAt: string;
  supplierOrderId?: string;
  currency?: string;
  image: string;
};

type Filter =
  | "TODAS"
  | "PENDIENTES"
  | "COMPLETADAS"
  | "CANCELADAS";

/*
 * ============================================================
 * IMÁGENES DE LOS JUEGOS
 * ============================================================
 */

const GAME_IMAGES: Record<string, string> = {
  blood_strike: "/images/blood-strike.jpg",
  free_fire_latam: "/images/free-fire-latam.jpg",
  free_fire: "/images/free-fire-latam.jpg",
  mobile_legends_united_states: "/images/mobile-legends.jpg",
  mobile_legends: "/images/mobile-legends.jpg",
  delta_force: "/images/delta-force.jpg",
  eafc_mobile_id: "/images/fc-mobile.jpg",
  fc_mobile: "/images/fc-mobile.jpg",
  codm_activision_us: "/images/call-of-duty-mobile.jpg",
  call_of_duty_mobile: "/images/call-of-duty-mobile.jpg",
  call_of_duty: "/images/call-of-duty-mobile.jpg",
  cod_mobile: "/images/call-of-duty-mobile.jpg",
  honor_of_kings: "/images/honor-of-kings.jpg",
  honor_of_kings_global: "/images/honor-of-kings.jpg",
  league_of_legends: "/images/league-of-legends.jpg",
  lol: "/images/league-of-legends.jpg",
  modern_warships: "/images/modern-warships.jpg",
  sausage_man: "/images/sausage-man.jpg",
  arena_breakout: "/images/arena-breakout.jpg",
  arena_breakout_global: "/images/arena-breakout.jpg",
  telegram_stars: "/images/telegram-stars.jpg",
};

const DEFAULT_GAME_IMAGE = "/images/battle-royale-bg.jpg";

function getGameImage(categoryId: string, game: string): string {
  const directImage = GAME_IMAGES[categoryId];

  if (directImage) {
    return directImage;
  }

  const normalized = game
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (normalized.includes("blood strike")) {
    return "/images/blood-strike.jpg";
  }

  if (
    normalized.includes("free") &&
    normalized.includes("fire")
  ) {
    return "/images/free-fire-latam.jpg";
  }

  if (normalized.includes("mobile legends")) {
    return "/images/mobile-legends.jpg";
  }

  if (normalized.includes("delta force")) {
    return "/images/delta-force.jpg";
  }

  if (
    normalized.includes("fc mobile") ||
    normalized.includes("eafc mobile") ||
    normalized.includes("ea fc")
  ) {
    return "/images/fc-mobile.jpg";
  }

  if (
    normalized.includes("call of duty") ||
    normalized.includes("cod mobile") ||
    normalized.includes("codm")
  ) {
    return "/images/call-of-duty-mobile.jpg";
  }

  if (normalized.includes("honor of kings")) {
    return "/images/honor-of-kings.jpg";
  }

  if (
    normalized.includes("league of legends") ||
    normalized === "lol"
  ) {
    return "/images/league-of-legends.jpg";
  }

  if (normalized.includes("modern warships")) {
    return "/images/modern-warships.jpg";
  }

  if (normalized.includes("sausage man")) {
    return "/images/sausage-man.jpg";
  }

  if (normalized.includes("arena breakout")) {
    return "/images/arena-breakout.jpg";
  }

  if (
    normalized.includes("telegram") ||
    normalized.includes("stars")
  ) {
    return "/images/telegram-stars.jpg";
  }

  return DEFAULT_GAME_IMAGE;
}

/*
 * ============================================================
 * ESTADOS Y ETIQUETAS
 * ============================================================
 */

function normalizeStatus(status: string | null | undefined): string {
  return String(status || "PENDING").trim().toUpperCase();
}

function getOrderStatusLabel(status: string | null | undefined): string {
  const normalized = normalizeStatus(status);

  const labels: Record<string, string> = {
    RESERVED: "Procesando",
    PENDING: "Pendiente",
    SUPPLIER_PENDING: "Pendiente",
    PROCESSING: "Procesando",
    CONFIRMED: "Confirmado",
    COMPLETED: "Completado",
    REFUND: "Reembolsado",
    REFUNDED: "Reembolsado",
    FAILED: "Fallido",
    CANCELLED: "Cancelado",
    CANCELED: "Cancelado",
  };

  return labels[normalized] || normalized.replaceAll("_", " ");
}

function getOrderStatusIcon(status: string | null | undefined): string {
  const normalized = normalizeStatus(status);

  const icons: Record<string, string> = {
    RESERVED: "🕜",
    PENDING: "🕜",
    SUPPLIER_PENDING: "🕜",
    PROCESSING: "🔄",
    CONFIRMED: "🔎",
    COMPLETED: "✅",
    REFUND: "💸",
    REFUNDED: "💸",
    FAILED: "❌",
    CANCELLED: "🚫",
    CANCELED: "🚫",
  };

  return icons[normalized] || "🕜";
}

export default function OrdersPage() {
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<Filter>("TODAS");
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  /*
   * ============================================================
   * CARGAR Y ACTUALIZAR ÓRDENES
   * ============================================================
   */

  useEffect(() => {
    let mounted = true;
    let loadingOrders = false;

    async function loadOrders() {
      if (loadingOrders || !mounted) return;

      loadingOrders = true;

      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session?.user) {
          if (mounted) {
            setLoading(false);
            router.replace("/login");
          }

          return;
        }

        const { data, error } = await supabase
          .from("topup_orders")
          .select(`
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
          `)
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("ERROR CARGANDO ÓRDENES:", error);

          if (mounted) {
            setLoading(false);
          }

          return;
        }

        const rows = (data || []) as TopupOrderRow[];

        const mappedOrders: Order[] = rows.map((row) => {
          const fields = row.supplier_fields || {};

          const serverIdValue =
            fields.server_id ??
            fields.id_servidor ??
            fields.serverId;

          const realStatus = normalizeStatus(row.status);

          return {
            id: row.id,
            user_id: row.user_id,
            email: row.email || undefined,
            username: row.username || undefined,
            game: row.game,
            categoryId: row.category_id,
            product: row.offer_name,
            displayProduct: row.offer_name,
            price: Number(row.retail_price) || 0,
            total: Number(row.retail_price) || 0,
            playerId: row.player_id,

            serverId:
              serverIdValue !== undefined &&
              serverIdValue !== null
                ? String(serverIdValue)
                : undefined,

            // El estado actual de la base de datos es la referencia.
            status: realStatus,
            canonicalStatus: realStatus,
            statusLabel: getOrderStatusLabel(realStatus),
            statusIcon: getOrderStatusIcon(realStatus),

            createdAt: row.created_at,
            supplierOrderId: row.supplier_order_id || undefined,
            currency: row.currency || "USD",
            image: getGameImage(row.category_id, row.game),
          };
        });

        if (mounted) {
          setOrders(mappedOrders);

          // Actualizar también los detalles si una orden está abierta.
          setSelectedOrder((current) => {
            if (!current) return null;

            return (
              mappedOrders.find((order) => order.id === current.id) ||
              current
            );
          });

          setLoading(false);
        }
      } catch (error) {
        console.error("ERROR INESPERADO CARGANDO ÓRDENES:", error);

        if (mounted) {
          setLoading(false);
        }
      } finally {
        loadingOrders = false;
      }
    }

    loadOrders();

    // Consultar estados nuevos cada 15 segundos.
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        loadOrders();
      }
    }, 15000);

    // Actualizar al volver a la pestaña.
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadOrders();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
    };
  }, [router]);

  /*
   * ============================================================
   * ESTADOS DE LAS ÓRDENES
   * ============================================================
   */

  function getCanonicalStatus(order: Order) {
    return normalizeStatus(order.status);
  }

  function isCompleted(status: string) {
    return normalizeStatus(status) === "COMPLETED";
  }

  function isConfirmed(status: string) {
    return normalizeStatus(status) === "CONFIRMED";
  }

  function isCancelled(status: string) {
    const normalized = normalizeStatus(status);
    return normalized === "CANCELLED" || normalized === "CANCELED";
  }

  function isFailed(status: string) {
    return normalizeStatus(status) === "FAILED";
  }

  function isRefunded(status: string) {
    const normalized = normalizeStatus(status);
    return normalized === "REFUNDED" || normalized === "REFUND";
  }

  function isProcessing(status: string) {
    const normalized = normalizeStatus(status);
    return normalized === "PROCESSING" || normalized === "RESERVED";
  }

  function isPending(status: string) {
    const normalized = normalizeStatus(status);
    return normalized === "PENDING" || normalized === "SUPPLIER_PENDING";
  }

  function isCancelledOrFailed(status: string) {
    return (
      isCancelled(status) ||
      isFailed(status) ||
      isRefunded(status)
    );
  }

  function getStatusClass(order: Order) {
    const status = getCanonicalStatus(order);

    if (status === "COMPLETED") return "status-completed";
    if (isRefunded(status)) return "status-refunded";
    if (isCancelled(status)) return "status-cancelled";
    if (status === "FAILED") return "status-failed";
    if (isProcessing(status)) return "status-processing";
    if (status === "CONFIRMED") return "status-confirmed";

    return "status-pending";
  }

  function getStatusText(order: Order) {
    const status = getCanonicalStatus(order);

    if (isPending(status)) return "PENDIENTE";
    if (isRefunded(status)) return "REEMBOLSADO";

    return (order.statusLabel || getOrderStatusLabel(status)).toUpperCase();
  }

  function getStatusIcon(order: Order) {
    return getOrderStatusIcon(getCanonicalStatus(order));
  }

  function isClockStatus(order: Order) {
    const status = getCanonicalStatus(order);

    return (
      isPending(status) ||
      isProcessing(status) ||
      status === "CONFIRMED"
    );
  }

  function isAnimatedPending(order: Order) {
    return isPending(getCanonicalStatus(order));
  }

  function renderStatusIcon(order: Order) {
    if (isAnimatedPending(order)) {
      return (
        <span className="orders-pending-clock" aria-label="Pendiente">
          <span className="orders-pending-clock-hand orders-pending-clock-hand-hour" />
          <span className="orders-pending-clock-hand orders-pending-clock-hand-minute" />
        </span>
      );
    }

    return getStatusIcon(order);
  }

  /*
   * ============================================================
   * FECHA
   * ============================================================
   */

  function formatDate(date: string) {
    try {
      return new Date(date).toLocaleString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return date;
    }
  }

  /*
   * ============================================================
   * FILTROS
   * ============================================================
   */

  const filteredOrders = useMemo(() => {
    if (filter === "TODAS") {
      return orders;
    }

    if (filter === "PENDIENTES") {
      return orders.filter((order) => {
        const status = getCanonicalStatus(order);

        return (
          isPending(status) ||
          isProcessing(status) ||
          isConfirmed(status)
        );
      });
    }

    if (filter === "COMPLETADAS") {
      return orders.filter((order) =>
        isCompleted(getCanonicalStatus(order))
      );
    }

    if (filter === "CANCELADAS") {
      return orders.filter((order) =>
        isCancelledOrFailed(getCanonicalStatus(order))
      );
    }

    return orders;
  }, [orders, filter]);

  /*
   * ============================================================
   * CONTADORES
   * ============================================================
   */

  const totalOrders = orders.length;

  const totalAmount = orders.reduce(
    (sum, order) =>
      sum +
      (Number(order.total) || Number(order.price) || 0),
    0
  );

  const completedOrders = orders.filter((order) =>
    isCompleted(getCanonicalStatus(order))
  ).length;

  const pendingOrders = orders.filter((order) => {
    const status = getCanonicalStatus(order);

    return (
      isPending(status) ||
      isProcessing(status) ||
      isConfirmed(status)
    );
  }).length;

  const cancelledOrders = orders.filter((order) =>
    isCancelledOrFailed(getCanonicalStatus(order))
  ).length;

  /*
   * ============================================================
   * ABRIR Y CERRAR ORDEN
   * ============================================================
   */

  function openOrder(order: Order) {
    setSelectedOrder(order);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function closeOrder() {
    setSelectedOrder(null);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  /*
   * ============================================================
   * LOADING
   * ============================================================
   */

  if (loading) {
    return (
      <main className="orders-page">
        <div className="orders-loading">
          <div className="orders-loading-spinner">⏳</div>

          <strong>CARGANDO TUS ÓRDENES...</strong>

          <span>Un momento por favor</span>
        </div>
      </main>
    );
  }

  /*
   * ============================================================
   * VISTA EXCLUSIVA DE LA ORDEN
   * ============================================================
   */

  if (selectedOrder) {
    return (
      <main className="orders-page order-detail-page">
        <section className="order-detail-screen">
          <header className="order-detail-screen-header">
            <button
              type="button"
              className="order-detail-back"
              onClick={closeOrder}
              aria-label="Regresar al historial"
            >
              ←
            </button>

            <div className="order-detail-game-image">
              <img
                src={selectedOrder.image}
                alt={selectedOrder.game}
                onError={(event) => {
                  const image = event.currentTarget;

                  if (image.src.endsWith(DEFAULT_GAME_IMAGE)) return;

                  image.src = DEFAULT_GAME_IMAGE;
                }}
              />
            </div>

            <div className="order-detail-heading">
              <strong>DETALLES DE LA COMPRA</strong>

              <span>ORDEN #{selectedOrder.id}</span>
            </div>
          </header>

          <div className="order-detail-hero">
            <div className="order-detail-status">
              <span className={`order-status ${getStatusClass(selectedOrder)}`}>
                <span
                  className={
                    isClockStatus(selectedOrder)
                      ? "order-status-clock"
                      : "order-status-icon"
                  }
                  aria-hidden="true"
                >
                  {renderStatusIcon(selectedOrder)}
                </span>

                <span>{getStatusText(selectedOrder)}</span>
              </span>
            </div>

            <div className="order-detail-content">
              <div className="order-detail-row">
                <span>🎮 Juego</span>
                <strong>{selectedOrder.game}</strong>
              </div>

              <div className="order-detail-row">
                <span>📦 Producto</span>
                <strong>
                  {selectedOrder.displayProduct || selectedOrder.product}
                </strong>
              </div>

              <div className="order-detail-row">
                <span>🆔 ID del jugador</span>
                <strong>{selectedOrder.playerId}</strong>
              </div>

              {selectedOrder.serverId && (
                <div className="order-detail-row">
                  <span>🌐 ID del servidor</span>
                  <strong>{selectedOrder.serverId}</strong>
                </div>
              )}

              <div className="order-detail-row">
                <span>💵 Precio</span>
                <strong>${selectedOrder.price.toFixed(2)}</strong>
              </div>

              <div className="order-detail-row">
                <span>💳 Moneda</span>
                <strong>{selectedOrder.currency || "USD"}</strong>
              </div>

              <div className="order-detail-row">
                <span>📅 Fecha</span>
                <strong>{formatDate(selectedOrder.createdAt)}</strong>
              </div>

              <div className="order-detail-row">
                <span>🔢 Número de orden</span>
                <strong className="order-id-value">
                  {selectedOrder.id}
                </strong>
              </div>

              {selectedOrder.supplierOrderId && (
                <div className="order-detail-row">
                  <span>⚙️ Referencia</span>
                  <strong>{selectedOrder.supplierOrderId}</strong>
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            className="order-detail-return"
            onClick={closeOrder}
          >
            ← REGRESAR A MIS ÓRDENES
          </button>
        </section>
      </main>
    );
  }

  /*
   * ============================================================
   * HISTORIAL NORMAL
   * ============================================================
   */

  return (
    <main className="orders-page">
      <header className="orders-header">
        <button
          type="button"
          className="orders-back-button"
          onClick={() => router.back()}
          aria-label="Volver"
        >
          ←
        </button>

        <div className="orders-header-title">
          <span>🛒</span>
          <strong>MIS ÓRDENES</strong>
        </div>

        <div className="orders-header-space" />
      </header>

      <section className="orders-hero">
        <div className="orders-hero-glow" />

        <div className="orders-hero-content">
          <span className="orders-hero-label">STORE GAMING</span>

          <h1>
            HISTORIAL
            <strong>DE ÓRDENES</strong>
          </h1>

          <p>
            Consulta tus compras,
            productos y el estado
            de cada pedido.
          </p>
        </div>

        <div className="orders-total-box">
          <span>PEDIDOS</span>
          <strong>{totalOrders}</strong>
          <small>REGISTRADOS</small>
        </div>
      </section>

      <section className="orders-stats">
        <div className="orders-stat-card">
          <span className="orders-stat-icon">📦</span>
          <strong>{totalOrders}</strong>
          <small>PEDIDOS</small>
        </div>

        <div className="orders-stat-card">
          <span className="orders-stat-icon">💵</span>
          <strong>${totalAmount.toFixed(2)}</strong>
          <small>TOTAL</small>
        </div>

        <div className="orders-stat-card">
          <span className="orders-stat-icon">✅</span>
          <strong>{completedOrders}</strong>
          <small>COMPLETADOS</small>
        </div>

        <div className="orders-stat-card">
          <span className="orders-stat-icon">❌</span>
          <strong>{cancelledOrders}</strong>
          <small>CANCELADOS</small>
        </div>

        <div className="orders-stat-card">
          <span className="orders-stat-icon">⏳</span>
          <strong>{pendingOrders}</strong>
          <small>PENDIENTES</small>
        </div>
      </section>

      <section className="orders-filters">
        <button
          type="button"
          className={filter === "TODAS" ? "orders-filter active" : "orders-filter"}
          onClick={() => setFilter("TODAS")}
        >
          TODAS
        </button>

        <button
          type="button"
          className={filter === "PENDIENTES" ? "orders-filter active" : "orders-filter"}
          onClick={() => setFilter("PENDIENTES")}
        >
          PENDIENTES
        </button>

        <button
          type="button"
          className={filter === "COMPLETADAS" ? "orders-filter active" : "orders-filter"}
          onClick={() => setFilter("COMPLETADAS")}
        >
          COMPLETADAS
        </button>

        <button
          type="button"
          className={filter === "CANCELADAS" ? "orders-filter active" : "orders-filter"}
          onClick={() => setFilter("CANCELADAS")}
        >
          CANCELADAS
        </button>
      </section>

      <section className="orders-history">
        <div className="orders-section-title">
          <div>
            <span>📋</span>
            <strong>HISTORIAL</strong>
          </div>

          <small>
            {filteredOrders.length}{" "}
            {filteredOrders.length === 1 ? "orden" : "órdenes"}
          </small>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="orders-empty">
            <div className="orders-empty-icon">📭</div>

            <strong>NO HAY ÓRDENES</strong>

            <p>No encontramos órdenes en esta categoría.</p>

            {filter !== "TODAS" && (
              <button
                type="button"
                onClick={() => setFilter("TODAS")}
              >
                VER TODAS LAS ÓRDENES
              </button>
            )}
          </div>
        ) : (
          <div className="orders-list">
            {filteredOrders.map((order) => (
              <button
                key={order.id}
                type="button"
                className="order-card"
                onClick={() => openOrder(order)}
              >
                <div className="order-card-left">
                  <div className="order-game-icon">
                    <img
                      src={order.image}
                      alt={order.game}
                      loading="lazy"
                      onError={(event) => {
                        const image = event.currentTarget;

                        if (image.src.endsWith(DEFAULT_GAME_IMAGE)) return;

                        image.src = DEFAULT_GAME_IMAGE;
                      }}
                    />
                  </div>

                  <div className="order-card-info">
                    <strong>
                      {order.displayProduct || order.product}
                    </strong>

                    <span>{order.game}</span>

                    <small>ID: {order.playerId}</small>

                    <small>{formatDate(order.createdAt)}</small>
                  </div>
                </div>

                <div className="order-card-right">
                  <strong>${order.price.toFixed(2)}</strong>

                  <span className={`order-status ${getStatusClass(order)}`}>
                    <span
                      className={
                        isClockStatus(order)
                          ? "order-status-clock"
                          : "order-status-icon"
                      }
                      aria-hidden="true"
                    >
                      {renderStatusIcon(order)}
                    </span>

                    <span>{getStatusText(order)}</span>
                  </span>

                  <span className="order-card-arrow">›</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="orders-security">
        <div>
          <span>🔒</span>

          <div>
            <strong>TUS ÓRDENES ESTÁN REGISTRADAS</strong>

            <p>
              Guarda el número de orden
              para consultar cualquier
              compra.
            </p>
          </div>
        </div>
      </section>

      <footer className="orders-footer">
        <strong>🛒TIENDA DE JUEGOS🎮</strong>

        <span>TU MEJOR OPCIÓN PARA RECARGAS GAMING</span>
      </footer>

      <style jsx>{`
        .orders-page .order-status.status-pending,
        .order-detail-status .order-status.status-pending,
        .order-card-right .order-status.status-pending {
          color: #ffbf36 !important;
        }

        .orders-pending-clock {
          position: relative;
          display: inline-block;
          width: 17px;
          height: 17px;
          flex: 0 0 17px;
          border: 2px solid currentColor;
          border-radius: 50%;
          box-sizing: border-box;
          vertical-align: middle;
        }

        .orders-pending-clock-hand {
          position: absolute;
          left: 50%;
          bottom: 50%;
          display: block;
          width: 1.5px;
          border-radius: 2px;
          background: currentColor;
          transform-origin: 50% 100%;
        }

        .orders-pending-clock-hand-hour {
          height: 4px;
          animation: orders-pending-clock-spin 3s linear infinite;
        }

        .orders-pending-clock-hand-minute {
          height: 5px;
          animation: orders-pending-clock-spin 1.2s linear infinite;
        }

        @keyframes orders-pending-clock-spin {
          from {
            transform: translateX(-50%) rotate(0deg);
          }

          to {
            transform: translateX(-50%) rotate(360deg);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .orders-pending-clock-hand-hour,
          .orders-pending-clock-hand-minute {
            animation-duration: 8s;
          }
        }
      `}</style>
    </main>
  );
}
