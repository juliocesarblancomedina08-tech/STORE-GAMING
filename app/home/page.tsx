"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type Service = {
  name: string;
  description: string;
  icon: string;
  route: string;
  tag: string;
};

type StoreOrder = {
  id?: string;
  game?: string;
  product?: string;
  displayProduct?: string;
  price?: number | string;
  total?: number | string;
  playerId?: string;
  serverId?: string;
  status?: string;
  createdAt?: string;
  date?: string;
};

type Notification = {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
};

const ADMIN_EMAIL =
  "juliocesarblancomedina08@gmail.com";

const services: Service[] = [
  {
    name: "RECARGAS TOP UP",
    description: "Recarga tus juegos favoritos.",
    icon: "🎮",
    route: "/top-up",
    tag: "TOP UP",
  },
  {
    name: "ESTRELLAS DE TELEGRAM",
    description: "Compra estrellas de Telegram.",
    icon: "⭐",
    route: "/telegram-stars",
    tag: "TELEGRAM",
  },
  {
    name: "TARJETAS DE REGALO",
    description: "Tarjetas de regalo y códigos.",
    icon: "🎁",
    route: "/gift-cards",
    tag: "CÓDIGOS",
  },
  {
    name: "PERFIL",
    description: "Administra los datos de tu cuenta.",
    icon: "👤",
    route: "/profile",
    tag: "CUENTA",
  },
  {
    name: "SOPORTE",
    description: "Obtén ayuda con tus pedidos.",
    icon: "🎧",
    route: "/support",
    tag: "AYUDA",
  },
];

export default function HomePage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [ordersCreated, setOrdersCreated] = useState(0);
  const [deposited, setDeposited] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);

  /* =========================
     NOTIFICACIONES
  ========================== */

  const [notificationsOpen, setNotificationsOpen] =
    useState(false);

  const [notificationCount, setNotificationCount] =
    useState(0);

  const [notifications, setNotifications] =
    useState<Notification[]>([]);

  const [notificationsLoading, setNotificationsLoading] =
    useState(false);

  const [currentUserId, setCurrentUserId] =
    useState("");

  /* =========================
     CARGAR NOTIFICACIONES
  ========================== */

  async function loadNotifications(userId: string) {
    if (!userId) return;

    setNotificationsLoading(true);

    const {
      data,
      error,
    } = await supabase
      .from("notifications")
      .select(
        "id,title,message,type,is_read,created_at"
      )
      .eq("user_id", userId)
      .order("created_at", {
        ascending: false,
      })
      .limit(30);

    if (error) {
      console.error(
        "Error cargando notificaciones:",
        error
      );

      setNotificationsLoading(false);
      return;
    }

    const rows =
      (data as Notification[]) || [];

    setNotifications(rows);

    setNotificationCount(
      rows.filter(
        (notification) =>
          !notification.is_read
      ).length
    );

    setNotificationsLoading(false);
  }

  /* =========================
     MARCAR UNA COMO LEÍDA
  ========================== */

  async function markNotificationAsRead(
    notificationId: string
  ) {
    if (!currentUserId) return;

    const {
      error,
    } = await supabase
      .from("notifications")
      .update({
        is_read: true,
      })
      .eq("id", notificationId)
      .eq("user_id", currentUserId);

    if (error) {
      console.error(
        "Error marcando notificación:",
        error
      );

      return;
    }

    setNotifications((current) =>
      current.map((notification) =>
        notification.id === notificationId
          ? {
              ...notification,
              is_read: true,
            }
          : notification
      )
    );

    setNotificationCount((count) =>
      Math.max(0, count - 1)
    );
  }

  /* =========================
     MARCAR TODAS COMO LEÍDAS
  ========================== */

  async function markAllNotificationsAsRead() {
    if (!currentUserId) return;

    const hasUnread =
      notifications.some(
        (notification) =>
          !notification.is_read
      );

    if (!hasUnread) return;

    const {
      error,
    } = await supabase
      .from("notifications")
      .update({
        is_read: true,
      })
      .eq("user_id", currentUserId)
      .eq("is_read", false);

    if (error) {
      console.error(
        "Error marcando notificaciones:",
        error
      );

      return;
    }

    setNotifications((current) =>
      current.map((notification) => ({
        ...notification,
        is_read: true,
      }))
    );

    setNotificationCount(0);
  }

  /* =========================
     AUTENTICACIÓN
  ========================== */

  useEffect(() => {
    let mounted = true;

    let notificationChannel:
      ReturnType<
        typeof supabase.channel
      > | null = null;

    async function loadUser() {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error || !session?.user) {
        router.replace("/");
        return;
      }

      const email =
        session.user.email || "usuario";

      const name =
        email.split("@")[0] || "usuario";

      const userId =
        session.user.id;

      setUsername(name);
      setCurrentUserId(userId);

      setIsAdmin(
        email.trim().toLowerCase() ===
          ADMIN_EMAIL.toLowerCase()
      );

      await loadStatistics(userId);
      await loadNotifications(userId);

      /*
       * NOTIFICACIONES EN TIEMPO REAL
       */

      notificationChannel =
        supabase
          .channel(
            `notifications-${userId}`
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "notifications",
              filter: `user_id=eq.${userId}`,
            },
            () => {
              loadNotifications(userId);
            }
          )
          .subscribe();

      if (mounted) {
        setLoading(false);
      }
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!session?.user) {
          router.replace("/");
          return;
        }

        const email =
          session.user.email || "usuario";

        const name =
          email.split("@")[0] || "usuario";

        const userId =
          session.user.id;

        setUsername(name);
        setCurrentUserId(userId);

        setIsAdmin(
          email.trim().toLowerCase() ===
            ADMIN_EMAIL.toLowerCase()
        );

        await loadStatistics(userId);
        await loadNotifications(userId);
      }
    );

    return () => {
      mounted = false;

      subscription.unsubscribe();

      if (notificationChannel) {
        supabase.removeChannel(
          notificationChannel
        );
      }
    };
  }, [router]);

  /* =========================
     ESTADÍSTICAS
  ========================== */

  async function loadStatistics(
    userId: string
  ) {
    let orders: StoreOrder[] = [];

    try {
      const savedOrders =
        localStorage.getItem(
          "storeGamingOrders"
        );

      if (savedOrders) {
        const parsedOrders =
          JSON.parse(savedOrders);

        if (Array.isArray(parsedOrders)) {
          orders = parsedOrders;
        }
      }
    } catch {
      orders = [];
    }

    setOrdersCreated(orders.length);

    const completedStatuses = [
      "COMPLETADA",
      "COMPLETADO",
      "CONFIRMADA",
      "CONFIRMADO",
      "completada",
      "completado",
      "confirmada",
      "confirmado",
    ];

    const completedOrders =
      orders.filter((order) =>
        completedStatuses.includes(
          String(order.status || "")
        )
      );

    const spent =
      completedOrders.reduce(
        (sum, order) => {
          const value =
            Number(order.total) ||
            Number(order.price) ||
            0;

          return sum + value;
        },
        0
      );

    setTotalSpent(spent);

    try {
      const {
        data,
        error,
      } = await supabase
        .from("profiles")
        .select("balance")
        .eq("id", userId)
        .single();

      if (!error && data) {
        const balance =
          Number(data.balance) || 0;

        setDeposited(balance);
      } else {
        setDeposited(0);
      }
    } catch {
      setDeposited(0);
    }
  }

  /* =========================
     LOGOUT
  ========================== */

  async function logout() {
    setMenuOpen(false);

    await supabase.auth.signOut();

    router.replace("/");
  }

  function goTo(path: string) {
    setMenuOpen(false);
    router.push(path);
  }

  /* =========================
     LOADING
  ========================== */

  if (loading) {
    return (
      <main className="store-loading">
        <div className="loading-logo">
          STORE GAMING
        </div>

        <div className="loading-line" />

        <p>
          CARGANDO STORE GAMING...
        </p>
      </main>
    );
  }

  return (
    <main className="store-home">

      {/* =========================
          MENÚ LATERAL
      ========================== */}

      {menuOpen && (
        <>
          <button
            type="button"
            className="menu-backdrop"
            aria-label="Cerrar menú"
            onClick={() =>
              setMenuOpen(false)
            }
          />

          <aside className="side-menu">

            <div className="side-menu-header">

              <div className="side-menu-brand">

                <span className="side-brand-line" />

                <div>
                  <small>
                    STORE
                  </small>

                  <strong>
                    GAMING
                  </strong>
                </div>

              </div>

              <button
                type="button"
                className="side-menu-close"
                onClick={() =>
                  setMenuOpen(false)
                }
                aria-label="Cerrar menú"
              >
                ×
              </button>

            </div>

            <div className="side-menu-user">

              <div className="side-user-icon">
                @
              </div>

              <div>
                <small>
                  CUENTA
                </small>

                <strong>
                  @{username}
                </strong>
              </div>

            </div>

            <nav className="side-menu-nav">

              {/* HOGAR */}

              <button
                type="button"
                className="side-menu-item active"
                onClick={() =>
                  goTo("/home")
                }
              >
                <span
                  className="menu-icon"
                  aria-hidden="true"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 10.5 12 3l9 7.5" />
                    <path d="M5 9.5V21h14V9.5" />
                    <path d="M9 21v-6h6v6" />
                  </svg>
                </span>

                <span>
                  Hogar
                </span>

                <span
                  className="menu-arrow"
                  aria-hidden="true"
                >
                  ›
                </span>
              </button>

              {/* ÓRDENES */}

              <button
                type="button"
                className="side-menu-item"
                onClick={() =>
                  goTo("/orders")
                }
              >
                <span
                  className="menu-icon"
                  aria-hidden="true"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M6 4h12" />
                    <path d="M7 4v17h10V4" />
                    <path d="M9 8h6" />
                    <path d="M9 12h6" />
                    <path d="M9 16h4" />
                  </svg>
                </span>

                <span>
                  Órdenes
                </span>

                <span
                  className="menu-arrow"
                  aria-hidden="true"
                >
                  ›
                </span>
              </button>

              <div className="side-menu-section-title">
                <span />
                SERVICIOS
                <span />
              </div>

              {/* TELEGRAM */}

              <button
                type="button"
                className="side-menu-item"
                onClick={() =>
                  goTo("/telegram-stars")
                }
              >
                <span
                  className="menu-icon"
                  aria-hidden="true"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 3 3.7 10.1c-.8.3-.8 1.4 0 1.7l4.4 1.7 1.7 5.3c.2.7 1.1.9 1.6.3l2.5-3.1 4.6 3.4c.6.5 1.5.1 1.7-.6L21 3Z" />
                    <path d="m8.1 13.5 9.5-7.2" />
                  </svg>
                </span>

                <span>
                  Estrellas de Telegram
                </span>

                <span
                  className="menu-arrow"
                  aria-hidden="true"
                >
                  ›
                </span>
              </button>

              {/* TARJETAS */}

              <button
                type="button"
                className="side-menu-item"
                onClick={() =>
                  goTo("/gift-cards")
                }
              >
                <span
                  className="menu-icon"
                  aria-hidden="true"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect
                      x="3"
                      y="6"
                      width="18"
                      height="13"
                      rx="2"
                    />
                    <path d="M3 10h18" />
                    <path d="M12 6v13" />
                    <path d="M8.5 6c-1.4 0-2.5-.9-2.5-2s1.1-2 2.5-2c2 0 3.5 4 3.5 4" />
                    <path d="M15.5 6c1.4 0 2.5-.9 2.5-2s1.1-2 2.5-2c2 0 3.5 4 3.5 4" />
                  </svg>
                </span>

                <span>
                  Tarjetas de regalo
                </span>

                <span
                  className="menu-arrow"
                  aria-hidden="true"
                >
                  ›
                </span>
              </button>

              {/* TOP UP */}

              <button
                type="button"
                className="side-menu-item"
                onClick={() =>
                  goTo("/top-up")
                }
              >
                <span
                  className="menu-icon"
                  aria-hidden="true"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M13 2 5 13h6l-1 9 8-11h-6l1-9Z" />
                  </svg>
                </span>

                <span>
                  Recargas TOP UP
                </span>

                <span
                  className="menu-arrow"
                  aria-hidden="true"
                >
                  ›
                </span>
              </button>

              {/* ESTADÍSTICAS */}

              <button
                type="button"
                className="side-menu-item"
                onClick={() =>
                  setMenuOpen(false)
                }
              >
                <span
                  className="menu-icon"
                  aria-hidden="true"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 19V5" />
                    <path d="M4 19h17" />
                    <path d="m7 15 4-4 3 2 5-6" />
                  </svg>
                </span>

                <span>
                  Estadísticas
                </span>

                <span
                  className="menu-arrow"
                  aria-hidden="true"
                >
                  ›
                </span>
              </button>

              <div className="side-menu-section-title">
                <span />
                CUENTA
                <span />
              </div>

              {/* PERFIL */}

              <button
                type="button"
                className="side-menu-item"
                onClick={() =>
                  goTo("/profile")
                }
              >
                <span
                  className="menu-icon"
                  aria-hidden="true"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle
                      cx="12"
                      cy="8"
                      r="3.5"
                    />
                    <path d="M5 21c.7-4 3.1-6 7-6s6.3 2 7 6" />
                  </svg>
                </span>

                <span>
                  Perfil
                </span>

                <span
                  className="menu-arrow"
                  aria-hidden="true"
                >
                  ›
                </span>
              </button>

              {/* SOPORTE */}

              <button
                type="button"
                className="side-menu-item support-item"
                onClick={() =>
                  goTo("/support")
                }
              >
                <span
                  className="menu-icon"
                  aria-hidden="true"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 13a8 8 0 0 1 16 0" />
                    <path d="M4 13v4a2 2 0 0 0 2 2h1v-6H6a2 2 0 0 0-2 2Z" />
                    <path d="M20 13v4a2 2 0 0 1-2 2h-1v-6h1a2 2 0 0 1 2 2Z" />
                    <path d="M15 19c-.5 1-1.4 1.5-3 1.5" />
                  </svg>
                </span>

                <span>
                  Soporte
                </span>

                <span
                  className="menu-arrow"
                  aria-hidden="true"
                >
                  ›
                </span>
              </button>

              {/* ADMINISTRACIÓN */}

              {isAdmin && (
                <>
                  <div className="side-menu-section-title">
                    <span />
                    ADMINISTRACIÓN
                    <span />
                  </div>

                  <button
                    type="button"
                    className="side-menu-item"
                    onClick={() =>
                      goTo("/admin")
                    }
                  >
                    <span
                      className="menu-icon"
                      aria-hidden="true"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle
                          cx="12"
                          cy="12"
                          r="3"
                        />
                        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.7 1.7-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V20h-2.4v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1-1.7-1.7.1-.1A1.7 1.7 0 0 0 8.4 15a1.7 1.7 0 0 0-1.5-1H6.7v-2.4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9L8 8.6l1.7-1.7.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5v-.2h2.4v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.7 1.7-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.2V14h-.2a1.7 1.7 0 0 0-1.5 1Z" />
                      </svg>
                    </span>

                    <span>
                      ADM PANEL
                    </span>

                    <span
                      className="menu-arrow"
                      aria-hidden="true"
                    >
                      ›
                    </span>
                  </button>
                </>
              )}

            </nav>

            <div className="side-menu-bottom">
              <button
                type="button"
                className="side-menu-logout"
                onClick={logout}
              >
                <span>
                  ⇥
                </span>

                <strong>
                  Cerrar sesión
                </strong>
              </button>
            </div>

          </aside>
        </>
      )}

      {/* =========================
          HEADER
      ========================== */}

      <header className="store-header">

        <button
          type="button"
          className="menu-button"
          onClick={() =>
            setMenuOpen(true)
          }
          aria-label="Abrir menú"
        >
          <span />
          <span />
          <span />
        </button>

        <div
          className="store-logo-hidden"
          aria-hidden="true"
        />

        <div className="store-header-actions">

          <button
            type="button"
            className="notification-button"
            onClick={() =>
              setNotificationsOpen(
                !notificationsOpen
              )
            }
            aria-label="Notificaciones"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
              <path d="M10 21h4" />
            </svg>

            {notificationCount > 0 && (
              <span className="notification-badge">
                {notificationCount > 99
                  ? "99+"
                  : notificationCount}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div className="notification-panel">

              <div className="notification-panel-header">

                <div>
                  <span>
                    STORE GAMING
                  </span>

                  <strong>
                    NOTIFICACIONES
                  </strong>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setNotificationsOpen(false)
                  }
                  aria-label="Cerrar notificaciones"
                >
                  ×
                </button>

              </div>

              {notifications.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    padding: "8px 12px",
                    borderBottom:
                      "1px solid rgba(255,255,255,.07)",
                  }}
                >
                  <button
                    type="button"
                    onClick={
                      markAllNotificationsAsRead
                    }
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "#e50914",
                      fontSize: "11px",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    Marcar todas como leídas
                  </button>
                </div>
              )}

              <div className="notification-list">

                {notificationsLoading ? (

                  <div className="notification-empty">

                    <div className="notification-empty-icon">
                      🔔
                    </div>

                    <strong>
                      Cargando notificaciones...
                    </strong>

                  </div>

                ) : notifications.length === 0 ? (

                  <div className="notification-empty">

                    <div className="notification-empty-icon">
                      🔔
                    </div>

                    <strong>
                      No tienes notificaciones
                    </strong>

                    <p>
                      Aquí aparecerán las
                      novedades de tus pedidos
                      y movimientos de saldo.
                    </p>

                  </div>

                ) : (

                  notifications.map(
                    (notification) => (
                      <button
                        key={notification.id}
                        type="button"
                        className={`notification-item ${
                          notification.is_read
                            ? "notification-read"
                            : "notification-unread"
                        }`}
                        onClick={() => {
                          if (
                            !notification.is_read
                          ) {
                            markNotificationAsRead(
                              notification.id
                            );
                          }
                        }}
                      >

                        <div className="notification-item-icon">
                          {notification.is_read
                            ? "✓"
                            : "🔔"}
                        </div>

                        <div className="notification-item-content">

                          <strong>
                            {notification.title}
                          </strong>

                          <p>
                            {notification.message}
                          </p>

                          <small>
                            {new Date(
                              notification.created_at
                            ).toLocaleString(
                              "es-ES",
                              {
                                dateStyle: "short",
                                timeStyle: "short",
                              }
                            )}
                          </small>

                        </div>

                        {!notification.is_read && (
                          <span className="notification-unread-dot" />
                        )}

                      </button>
                    )
                  )

                )}

              </div>

            </div>
          )}

        </div>

      </header>

      {/* =========================
          BIENVENIDA
      ========================== */}

      <section className="store-hero">

        <div className="hero-glow" />

        <div className="hero-content">

          <div className="hero-badge">
            ⚡ STORE GAMING
          </div>

          <h1 className="hero-title">

            <span className="hero-greeting">
              BIENVENIDO A
            </span>

            <span className="hero-store-name">
              STORE GAMING
            </span>

            <span className="hero-username">
              USUARIO: @{username}
            </span>

          </h1>

          <p className="hero-text">
            Nos alegra tenerte aquí.
            Selecciona un servicio para
            comenzar.
          </p>

          <div className="hero-stats">

            <div className="hero-stat-card">

              <strong className="hero-stat-icon">
                $
              </strong>

              <span className="hero-stat-label">
                DEPOSITADO
              </span>

              <b className="hero-stat-value">
                ${deposited.toFixed(2)}
              </b>

            </div>

            <div className="hero-stat-card">

              <strong className="hero-stat-icon">
                💳
              </strong>

              <span className="hero-stat-label">
                GASTO TOTAL
              </span>

              <b className="hero-stat-value">
                ${totalSpent.toFixed(2)}
              </b>

            </div>

            <div className="hero-stat-card">

              <strong className="hero-stat-icon">
                ▣
              </strong>

              <span className="hero-stat-label">
                ÓRDENES
              </span>

              <b className="hero-stat-value">
                {ordersCreated}
              </b>

            </div>

          </div>

        </div>

      </section>

      {/* =========================
          SERVICIOS
      ========================== */}

      <section className="services-section">

        <div className="catalog-header">

          <div>

            <span>
              STORE GAMING
            </span>

            <h2>
              SERVICIOS
            </h2>

          </div>

          <div className="catalog-decoration">
            <i />
            <i />
            <i />
          </div>

        </div>

        <div className="services-grid">

          {services.map((service) => (

            <button
              key={service.name}
              type="button"
              className="service-card"
              onClick={() =>
                router.push(
                  service.route
                )
              }
            >

              <div className="service-card-icon">
                {service.icon}
              </div>

              <div className="service-card-tag">
                {service.tag}
              </div>

              <div className="service-card-info">

                <h3>
                  {service.name}
                </h3>

                <p>
                  {service.description}
                </p>

                <div className="service-card-bottom">

                  <span>
                    ENTRAR
                  </span>

                  <strong>
                    →
                  </strong>

                </div>

              </div>

            </button>

          ))}

          {/* VENTA DE SALDO MÓVIL */}

          <div
            className="service-card"
            style={{
              position: "relative",
              overflow: "hidden",
              cursor: "default",
            }}
          >

            <div
              style={{
                position: "absolute",
                top: "12px",
                right: "-38px",
                background:
                  "linear-gradient(135deg,#e50914,#9d0000)",
                color: "#fff",
                padding: "5px 45px",
                fontSize: "11px",
                fontWeight: 800,
                transform: "rotate(45deg)",
                zIndex: 2,
                boxShadow:
                  "0 0 12px rgba(229,9,20,.35)",
              }}
            >
              PRÓXIMAMENTE
            </div>

            <div className="service-card-icon">
              📱
            </div>

            <div className="service-card-tag">
              SERVICIOS
            </div>

            <div className="service-card-info">

              <h3>
                Venta de saldo móvil
              </h3>

              <p>
                Compra y venta de saldo móvil
                de forma rápida y segura.
              </p>

              <div className="service-card-bottom">

                <span>
                  PRÓXIMAMENTE
                </span>

                <strong>
                  🔒
                </strong>

              </div>

            </div>

          </div>

          {/* COMPRA Y VENTA DE CRIPTO */}

          <div
            className="service-card"
            style={{
              position: "relative",
              overflow: "hidden",
              cursor: "default",
            }}
          >

            <div
              style={{
                position: "absolute",
                top: "12px",
                right: "-38px",
                background:
                  "linear-gradient(135deg,#e50914,#9d0000)",
                color: "#fff",
                padding: "5px 45px",
                fontSize: "11px",
                fontWeight: 800,
                transform: "rotate(45deg)",
                zIndex: 2,
                boxShadow:
                  "0 0 12px rgba(229,9,20,.35)",
              }}
            >
              PRÓXIMAMENTE
            </div>

            <div className="service-card-icon">
              🪙
            </div>

            <div className="service-card-tag">
              CRIPTO
            </div>

            <div className="service-card-info">

              <h3>
                Compra y venta de cripto
              </h3>

              <p>
                Compra y venta de
                criptomonedas de forma
                rápida y segura.
              </p>

              <div className="service-card-bottom">

                <span>
                  PRÓXIMAMENTE
                </span>

                <strong>
                  🔒
                </strong>

              </div>

            </div>

          </div>

        </div>

      </section>

      {/* =========================
          BENEFICIOS
      ========================== */}

      <section className="benefits-section">

        <div className="benefit">

          <span>
            ⚡
          </span>

          <div>

            <strong>
              ENTREGA RÁPIDA
            </strong>

            <p>
              Procesamos tus pedidos
              rápidamente.
            </p>

          </div>

        </div>

        <div className="benefit">

          <span>
            🛡️
          </span>

          <div>

            <strong>
              COMPRA SEGURA
            </strong>

            <p>
              Tu pedido queda registrado.
            </p>

          </div>

        </div>

        <div className="benefit">

          <span>
            🎮
          </span>

          <div>

            <strong>
              SERVICIOS GAMING
            </strong>

            <p>
              Todo lo que necesitas
              en un solo lugar.
            </p>

          </div>

        </div>

      </section>

      {/* =========================
          FOOTER
      ========================== */}

      <footer className="store-footer">

        <div className="footer-brand">
          STORE GAMING
        </div>

        <p>
          TU MEJOR OPCIÓN PARA
          RECARGAS GAMING
        </p>

        <small>
          © 2026 STORE GAMING
        </small>

      </footer>

    </main>
  );
                } 
