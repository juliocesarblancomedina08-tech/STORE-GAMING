
"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type StoreOrder = Record<string, unknown> & {
  id?: string;
  status?: string;
};

type Notification = {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
};

type MenuIconName =
  | "home"
  | "gamepad"
  | "gift"
  | "phone"
  | "coins"
  | "star"
  | "wallet"
  | "chart"
  | "user"
  | "package"
  | "headphones"
  | "settings"
  | "clipboard";

const ADMIN_EMAIL = "juliocesarblancomedina08@gmail.com";

function MenuLineIcon({ name }: { name: MenuIconName }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" {...common}>
      {name === "home" && <>
        <path d="m3 10 9-7 9 7" />
        <path d="M5 9v11h14V9" />
        <path d="M9 20v-7h6v7" />
      </>}

      {name === "gamepad" && <>
        <path d="M6.5 8h11a4.5 4.5 0 0 1 4.3 5.8l-1.1 3.6a2.5 2.5 0 0 1-4.1 1.1L14 16h-4l-2.6 2.5a2.5 2.5 0 0 1-4.1-1.1l-1.1-3.6A4.5 4.5 0 0 1 6.5 8Z" />
        <path d="M7 11v4M5 13h4M16.5 12h.01M18.5 14h.01" />
      </>}

      {name === "gift" && <>
        <rect x="3" y="9" width="18" height="12" rx="2" />
        <path d="M12 9v12M3 13h18" />
        <path d="M12 9H7.5a2.5 2.5 0 1 1 2.5-2.5V9ZM12 9h4.5A2.5 2.5 0 1 0 14 6.5V9Z" />
      </>}

      {name === "phone" && <>
        <rect x="6" y="2" width="12" height="20" rx="2" />
        <path d="M10 5h4M11 18h2" />
      </>}

      {name === "coins" && <>
        <ellipse cx="9" cy="6" rx="6" ry="3" />
        <path d="M3 6v5c0 1.7 2.7 3 6 3 1.1 0 2.1-.2 3-.5M3 11v5c0 1.7 2.7 3 6 3 1.2 0 2.3-.2 3.2-.6" />
        <ellipse cx="16" cy="14" rx="5" ry="2.5" />
        <path d="M11 14v4c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5v-4" />
      </>}

      {name === "star" && <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z" />}

      {name === "wallet" && <>
        <rect x="3" y="5" width="18" height="15" rx="2" />
        <path d="M3 9h18M16 14h5M16 14h.01M6 5V4a2 2 0 0 1 2-2h10" />
      </>}

      {name === "chart" && <>
        <path d="M3 3v18h18" />
        <rect x="7" y="12" width="3" height="6" rx=".5" />
        <rect x="13" y="8" width="3" height="10" rx=".5" />
        <rect x="19" y="5" width="2" height="13" rx=".5" />
      </>}

      {name === "user" && <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>}

      {name === "package" && <>
        <path d="m12 3 9 5-9 5-9-5 9-5ZM3 8v9l9 5 9-5V8M12 13v9M7.5 5.5l9 5" />
      </>}

      {name === "headphones" && <>
        <path d="M3 14v-3a9 9 0 0 1 18 0v3" />
        <rect x="3" y="13" width="5" height="8" rx="2" />
        <rect x="16" y="13" width="5" height="8" rx="2" />
      </>}

      {name === "settings" && <>
        <circle cx="12" cy="12" r="3" />
        <path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.6a8 8 0 0 1-1.7 1l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.7-1l-1.7.6-1.4-2.4 1.4-1.1a7 7 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.7.6a8 8 0 0 1 1.7-1l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.7 1l1.7-.6 1.4 2.4-1.4 1.1a7 7 0 0 1 0 2Z" />
      </>}

      {name === "clipboard" && <>
        <rect x="5" y="4" width="14" height="18" rx="2" />
        <path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h4" />
      </>}
    </svg>
  );
}

const panelStyle: CSSProperties = {
  maxWidth: "1100px",
  margin: "18px auto",
  padding: "20px",
  borderRadius: "20px",
  border: "1px solid rgba(100,160,255,.16)",
  background: "linear-gradient(145deg,rgba(13,24,45,.94),rgba(7,12,24,.96))",
  boxShadow: "0 14px 40px rgba(0,0,0,.25)",
};

const sectionHeading: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  marginBottom: "16px",
};

const sectionTitle: CSSProperties = {
  margin: "5px 0 0",
  color: "#fff",
  fontSize: "19px",
  fontWeight: 900,
  letterSpacing: ".4px",
};

const sectionLabel: CSSProperties = {
  color: "#59a5ff",
  fontSize: "9px",
  fontWeight: 900,
  letterSpacing: "1.7px",
};

const cardGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2,minmax(0,1fr))",
  gap: "11px",
};

const cardStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "11px",
  minWidth: 0,
  minHeight: "68px",
  padding: "13px 12px",
  borderRadius: "13px",
  border: "1px solid rgba(115,165,255,.15)",
  background: "linear-gradient(145deg,rgba(20,34,58,.92),rgba(11,19,34,.94))",
  color: "#fff",
  font: "inherit",
  textAlign: "left",
  cursor: "pointer",
  transition: "all .2s ease",
};

const cardIcon: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "39px",
  height: "39px",
  flexShrink: 0,
  borderRadius: "11px",
  background: "rgba(43,125,255,.15)",
  border: "1px solid rgba(80,150,255,.22)",
  color: "#75b5ff",
  fontSize: "19px",
};

const cardText: CSSProperties = {
  flex: 1,
  minWidth: 0,
  fontSize: "10px",
  lineHeight: 1.5,
  fontWeight: 900,
  letterSpacing: ".3px",
  overflowWrap: "anywhere",
};

const cardArrow: CSSProperties = {
  color: "#65aaff",
  fontSize: "20px",
  fontWeight: 900,
  flexShrink: 0,
};

function getOrderAmount(order: StoreOrder): number {
  const amountFields = [
    "total",
    "total_amount",
    "total_usd",
    "amount",
    "amount_usd",
    "price",
    "price_usd",
    "cost",
    "subtotal",
    "retail_price",
  ];

  for (const field of amountFields) {
    const value = order[field];

    if (value !== null && value !== undefined && value !== "") {
      const amount = Number(value);
      if (Number.isFinite(amount)) return amount;
    }
  }

  return 0;
}

function isCompletedOrder(order: StoreOrder): boolean {
  const status = String(order.status || "").trim().toUpperCase();

  return [
    "COMPLETED",
    "COMPLETE",
    "SUCCESS",
    "SUCCESSFUL",
    "COMPLETADA",
    "COMPLETADO",
  ].includes(status);
}

export default function HomePage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [pendingManualOrders, setPendingManualOrders] = useState(0);

  const [ordersCreated, setOrdersCreated] = useState(0);
  const [deposited, setDeposited] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState("");

  async function loadPendingManualOrders() {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error || !session?.access_token || !session.user) {
        setPendingManualOrders(0);
        return;
      }

      const email = (session.user.email || "").trim().toLowerCase();

      if (email !== ADMIN_EMAIL.toLowerCase()) {
        setPendingManualOrders(0);
        return;
      }

      const response = await fetch("/api/admin/manual-orders", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        cache: "no-store",
      });

      if (!response.ok) {
        console.error("Error consultando órdenes pendientes:", response.status);
        return;
      }

      const result = await response.json();

      if (result.success && result.counts) {
        const pending = Number(result.counts.pending);

        if (Number.isFinite(pending)) {
          setPendingManualOrders(Math.max(0, pending));
        }
      }
    } catch (error) {
      console.error("Error cargando órdenes pendientes:", error);
    }
  }

  async function loadNotifications(userId: string) {
    if (!userId) return;

    setNotificationsLoading(true);

    const { data, error } = await supabase
      .from("notifications")
      .select("id,title,message,type,is_read,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) {
      console.error("Error cargando notificaciones:", error);
      setNotificationsLoading(false);
      return;
    }

    const rows = (data as Notification[]) || [];

    setNotifications(rows);
    setNotificationCount(
      rows.filter((notification) => !notification.is_read).length
    );
    setNotificationsLoading(false);
  }

  async function markNotificationAsRead(notificationId: string) {
    if (!currentUserId) return;

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId)
      .eq("user_id", currentUserId);

    if (error) {
      console.error("Error marcando notificación:", error);
      return;
    }

    setNotifications((current) =>
      current.map((notification) =>
        notification.id === notificationId
          ? { ...notification, is_read: true }
          : notification
      )
    );

    setNotificationCount((count) => Math.max(0, count - 1));
  }

  async function markAllNotificationsAsRead() {
    if (!currentUserId) return;
    if (!notifications.some((notification) => !notification.is_read)) return;

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", currentUserId)
      .eq("is_read", false);

    if (error) {
      console.error("Error marcando notificaciones:", error);
      return;
    }

    setNotifications((current) =>
      current.map((notification) => ({ ...notification, is_read: true }))
    );
    setNotificationCount(0);
  }

  async function loadStatistics(userId: string) {
    const { data: orderData, error: ordersError } = await supabase
      .from("store_gaming_orders")
      .select("*")
      .eq("user_id", userId);

    if (ordersError) {
      console.error("Error cargando órdenes:", ordersError);
      setOrdersCreated(0);
      setTotalSpent(0);
    } else {
      const orders = (orderData || []) as StoreOrder[];

      setOrdersCreated(orders.length);

      const completedOrders = orders.filter(isCompletedOrder);

      const sum = completedOrders.reduce(
        (total, order) => total + getOrderAmount(order),
        0
      );

      setTotalSpent(sum);
    }

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("balance")
      .eq("id", userId)
      .single();

    if (profileError) {
      console.error("Error cargando billetera:", profileError);
      setDeposited(0);
    } else {
      setDeposited(Number(profileData?.balance) || 0);
    }
  }

  useEffect(() => {
    let mounted = true;

    let notificationChannel:
      | ReturnType<typeof supabase.channel>
      | null = null;

    let ordersChannel:
      | ReturnType<typeof supabase.channel>
      | null = null;

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

      const email = session.user.email || "usuario";
      const userId = session.user.id;

      setUsername(email.split("@")[0] || "usuario");
      setCurrentUserId(userId);

      const adminUser =
        email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();

      setIsAdmin(adminUser);

      if (adminUser) {
        await loadPendingManualOrders();
      } else {
        setPendingManualOrders(0);
      }

      await Promise.all([
        loadStatistics(userId),
        loadNotifications(userId),
      ]);

      if (!mounted) return;

      notificationChannel = supabase
        .channel(`notifications-${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          () => {
            void loadNotifications(userId);
          }
        )
        .subscribe();

      ordersChannel = supabase
        .channel(`home-orders-${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "store_gaming_orders",
            filter: `user_id=eq.${userId}`,
          },
          () => {
            void loadStatistics(userId);
          }
        )
        .subscribe();

      setLoading(false);
    }

    void loadUser();

    const manualOrdersInterval = window.setInterval(() => {
      void loadPendingManualOrders();
    }, 15000);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        router.replace("/");
        return;
      }

      const email = session.user.email || "usuario";
      const userId = session.user.id;

      setUsername(email.split("@")[0] || "usuario");
      setCurrentUserId(userId);

      const adminUser =
        email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();

      setIsAdmin(adminUser);

      if (adminUser) {
        void loadPendingManualOrders();
      } else {
        setPendingManualOrders(0);
      }

      void (async () => {
        await Promise.all([
          loadStatistics(userId),
          loadNotifications(userId),
        ]);

        if (mounted) setLoading(false);
      })();
    });

    return () => {
      mounted = false;
      window.clearInterval(manualOrdersInterval);
      subscription.unsubscribe();

      if (notificationChannel) {
        void supabase.removeChannel(notificationChannel);
      }

      if (ordersChannel) {
        void supabase.removeChannel(ordersChannel);
      }
    };
  }, [router]);

  async function logout() {
    setMenuOpen(false);
    await supabase.auth.signOut();
    router.replace("/");
  }

  function goTo(path: string) {
    setMenuOpen(false);
    setNotificationsOpen(false);
    router.push(path);
  }

  if (loading) {
    return (
      <main className="store-loading">
        <div className="loading-emblem">SG</div>
        <div className="loading-logo">STORE GAMING</div>
        <div className="loading-line" />
        <p>PREPARANDO TU EXPERIENCIA GAMING...</p>
      </main>
    );
  }

  return (
    <main className="store-home">
      <div className="home-background-glow" />

      {menuOpen && (
        <>
          <button
            type="button"
            className="menu-backdrop"
            aria-label="Cerrar menú"
            onClick={() => setMenuOpen(false)}
          />

          <aside className="side-menu">
            <div className="side-menu-header">
              <div className="side-menu-brand">
                <div className="brand-emblem">SG</div>
                <div>
                  <small>STORE</small>
                  <strong>GAMING</strong>
                </div>
              </div>

              <button
                type="button"
                className="side-menu-close"
                onClick={() => setMenuOpen(false)}
                aria-label="Cerrar menú"
              >
                ×
              </button>
            </div>

            <div className="side-menu-user">
              <div className="side-user-icon">👤</div>
              <div>
                <small>CUENTA ACTIVA</small>
                <strong>@{username}</strong>
                <span className="user-online">
                  <i /> En línea
                </span>
              </div>
            </div>

            <nav className="side-menu-nav">
              <button
                type="button"
                className="side-menu-item active"
                onClick={() => goTo("/home")}
              >
                <span className="menu-icon"><MenuLineIcon name="home" /></span>
                <span>Hogar</span>
                <span className="menu-arrow">›</span>
              </button>

              <div className="side-menu-section-title">SERVICIOS</div>

              <button type="button" className="side-menu-item" onClick={() => goTo("/top-up")}>
                <span className="menu-icon"><MenuLineIcon name="gamepad" /></span>
                <span>Recargas TOP UP</span>
                <span className="menu-arrow">›</span>
              </button>

              <button type="button" className="side-menu-item" onClick={() => goTo("/gift-cards")}>
                <span className="menu-icon"><MenuLineIcon name="gift" /></span>
                <span>Tarjetas de regalo</span>
                <span className="menu-arrow">›</span>
              </button>

              <button type="button" className="side-menu-item" onClick={() => goTo("/telegram-stars")}>
                <span className="menu-icon"><MenuLineIcon name="star" /></span>
                <span>Estrellas de Telegram</span>
                <span className="menu-arrow">›</span>
              </button>

              <div className="side-menu-section-title">FINANZAS</div>

              <button type="button" className="side-menu-item" onClick={() => goTo("/balance")}>
                <span className="menu-icon"><MenuLineIcon name="wallet" /></span>
                <span>Billetera</span>
                <span className="menu-arrow">›</span>
              </button>

              <button type="button" className="side-menu-item" onClick={() => setMenuOpen(false)}>
                <span className="menu-icon"><MenuLineIcon name="chart" /></span>
                <span>Estadísticas</span>
                <span className="menu-arrow">›</span>
              </button>

              <div className="side-menu-section-title">CUENTA</div>

              <button type="button" className="side-menu-item" onClick={() => goTo("/profile")}>
                <span className="menu-icon"><MenuLineIcon name="user" /></span>
                <span>Mi perfil</span>
                <span className="menu-arrow">›</span>
              </button>

              <button type="button" className="side-menu-item" onClick={() => goTo("/ajustes")}>
                <span className="menu-icon"><MenuLineIcon name="settings" /></span>
                <span>Ajustes</span>
                <span className="menu-arrow">›</span>
              </button>

              <button type="button" className="side-menu-item" onClick={() => goTo("/orders")}>
                <span className="menu-icon"><MenuLineIcon name="package" /></span>
                <span>Mis pedidos</span>
                <span className="menu-arrow">›</span>
              </button>

              <button type="button" className="side-menu-item" onClick={() => goTo("/support")}>
                <span className="menu-icon"><MenuLineIcon name="headphones" /></span>
                <span>Soporte</span>
                <span className="menu-arrow">›</span>
              </button>

              {isAdmin && (
                <>
                  <div className="side-menu-section-title">ADMINISTRACIÓN</div>

                  <button type="button" className="side-menu-item" onClick={() => goTo("/admin")}>
                    <span className="menu-icon"><MenuLineIcon name="settings" /></span>
                    <span>ADM PANEL</span>
                    <span className="menu-arrow">›</span>
                  </button>

                  <button type="button" className="side-menu-item" onClick={() => goTo("/admin/manual-orders")}>
                    <span className="menu-icon"><MenuLineIcon name="clipboard" /></span>
                    <span className="admin-menu-label">ÓRDENES ADM</span>

                    {pendingManualOrders > 0 && (
                      <span className="admin-pending-badge">
                        {pendingManualOrders > 99 ? "99+" : pendingManualOrders}
                      </span>
                    )}

                    <span className="menu-arrow">›</span>
                  </button>
                </>
              )}
            </nav>

            <div className="side-menu-bottom">
              <button type="button" className="side-menu-logout" onClick={logout}>
                <span>↪</span>
                <strong>Cerrar sesión</strong>
              </button>
              <small>STORE GAMING · 2026</small>
            </div>
          </aside>
        </>
      )}

      <div className="home-container">
        <header className="store-header">
          <button
            type="button"
            className="menu-button"
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menú"
          >
            <span /><span /><span />
          </button>

          <div className="header-brand">
            <div className="header-brand-icon">SG</div>
            <div>
              <strong>STORE <span>GAMING</span></strong>
              <small>GAMING DIGITAL STORE</small>
            </div>
          </div>

          <div className="store-header-actions">
            <button
              type="button"
              className={`notification-button ${notificationsOpen ? "notification-active" : ""}`}
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              aria-label="Notificaciones"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                <path d="M10 21h4" />
              </svg>

              {notificationCount > 0 && (
                <span className="notification-badge">
                  {notificationCount > 99 ? "99+" : notificationCount}
                </span>
              )}
            </button>

            {notificationsOpen && (
              <>
                <button
                  type="button"
                  className="notification-dismiss"
                  aria-label="Cerrar notificaciones"
                  onClick={() => setNotificationsOpen(false)}
                />

                <div className="notification-panel">
                  <div className="notification-panel-header">
                    <div>
                      <span>STORE GAMING</span>
                      <strong>NOTIFICACIONES</strong>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNotificationsOpen(false)}
                      aria-label="Cerrar"
                    >
                      ×
                    </button>
                  </div>

                  {notifications.length > 0 && (
                    <div className="notification-tools">
                      <button type="button" onClick={() => void markAllNotificationsAsRead()}>
                        MARCAR TODAS COMO LEÍDAS
                      </button>
                    </div>
                  )}

                  <div className="notification-list">
                    {notificationsLoading ? (
                      <div className="notification-empty">
                        <span>🔔</span>
                        <strong>Cargando notificaciones...</strong>
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="notification-empty">
                        <span>🔔</span>
                        <strong>No tienes notificaciones</strong>
                        <p>Aquí aparecerán las novedades de tus pedidos y movimientos de saldo.</p>
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <button
                          key={notification.id}
                          type="button"
                          className={`notification-item ${notification.is_read ? "notification-read" : "notification-unread"}`}
                          onClick={() => {
                            if (!notification.is_read) {
                              void markNotificationAsRead(notification.id);
                            }
                          }}
                        >
                          <div className="notification-item-icon">
                            {notification.is_read ? "✓" : "🔔"}
                          </div>

                          <div className="notification-item-content">
                            <strong>{notification.title}</strong>
                            <p>{notification.message}</p>
                            <small>
                              {new Date(notification.created_at).toLocaleString("es-ES", {
                                dateStyle: "short",
                                timeStyle: "short",
                              })}
                            </small>
                          </div>

                          {!notification.is_read && <i className="notification-unread-dot" />}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </header>

        <section className="store-hero">
          <div className="hero-background-decoration" />
          <div className="hero-content">
            <div className="hero-badge">
              <span>✦</span> TU PLATAFORMA GAMING
            </div>

            <p className="hero-welcome">BIENVENIDO DE NUEVO</p>

            <h1>
              STORE <span>GAMING</span>
            </h1>

            <div className="hero-user">
              <span className="hero-user-dot" />
              USUARIO: @{username}
            </div>

            <p className="hero-text">
              Tu próxima experiencia gaming comienza aquí. Explora nuestros
              servicios, realiza tus compras y disfruta de tu tienda digital.
            </p>

            <div className="hero-actions">
              <button type="button" onClick={() => goTo("/top-up")}>
                <span>🎮</span> EXPLORAR SERVICIOS <b>→</b>
              </button>
              <button type="button" className="hero-secondary" onClick={() => goTo("/orders")}>
                MIS PEDIDOS
              </button>
            </div>

            <div className="hero-decoration-line">
              <span />
              <small>LEVEL UP YOUR EXPERIENCE</small>
            </div>
          </div>

          <div className="hero-side-decoration">
            <div className="hero-circle">SG</div>
            <span>GAMING</span>
            <small>YOUR DIGITAL STORE</small>
          </div>
        </section>

        <section className="stats-section">
          <div className="section-heading">
            <div>
              <span className="section-label">RESUMEN DE TU CUENTA</span>
              <h2>MI ACTIVIDAD</h2>
            </div>
            <span className="section-heading-icon">◈</span>
          </div>

          <div className="hero-stats">
            <button type="button" className="stat-card wallet-stat" onClick={() => goTo("/balance")}>
              <div className="stat-top">
                <span className="stat-icon">💳</span>
                <span className="stat-link">↗</span>
              </div>
              <span className="stat-label">BILLETERA</span>
              <strong>${deposited.toFixed(2)}</strong>
              <small>Saldo disponible</small>
            </button>

            <button type="button" className="stat-card spending-stat" onClick={() => goTo("/orders")}>
              <div className="stat-top">
                <span className="stat-icon">💸</span>
                <span className="stat-link">↗</span>
              </div>
              <span className="stat-label">GASTO TOTAL</span>
              <strong>${totalSpent.toFixed(2)}</strong>
              <small>Compras completadas</small>
            </button>

            <button type="button" className="stat-card orders-stat" onClick={() => goTo("/orders")}>
              <div className="stat-top">
                <span className="stat-icon">📦</span>
                <span className="stat-link">↗</span>
              </div>
              <span className="stat-label">ÓRDENES</span>
              <strong>{ordersCreated}</strong>
              <small>Pedidos realizados</small>
            </button>
          </div>
        </section>

        <section className="referral-section">
          <div className="referral-content">
            <span className="referral-badge">🎁 PROGRAMA DE REFERIDOS</span>
            <h2>¡INVITA Y GANA!</h2>
            <h3>GANA 0.10 POR CADA AMIGO</h3>
            <p>
              Comparte tu enlace de STORE GAMING. Cuando tu referido complete
              su primera compra válida, recibirás 0.10 de saldo en tu billetera.
            </p>
            <button type="button" onClick={() => goTo("/referidos")}>
              👥 VER MIS REFERIDOS <span>→</span>
            </button>
          </div>
          <div className="referral-decoration">🎁</div>
        </section>

        <section className="services-section">
          <div className="section-heading">
            <div>
              <span className="section-label">DESCUBRE LO QUE TENEMOS PARA TI</span>
              <h2>SERVICIOS</h2>
            </div>
            <span className="section-heading-icon">🎮</span>
          </div>

          <div className="service-grid">
            <button type="button" className="service-card" onClick={() => goTo("/top-up")}>
              <span className="service-card-icon">🎮</span>
              <span className="service-card-content">
                <strong>RECARGAS TOP UP</strong>
                <small>Recarga tus juegos favoritos</small>
              </span>
              <span className="service-arrow">→</span>
            </button>

            <button type="button" className="service-card" onClick={() => goTo("/gift-cards")}>
              <span className="service-card-icon">🎁</span>
              <span className="service-card-content">
                <strong>TARJETAS DE REGALO</strong>
                <small>Productos digitales y tarjetas</small>
              </span>
              <span className="service-arrow">→</span>
            </button>

            <button type="button" className="service-card" onClick={() => goTo("/telegram-stars")}>
              <span className="service-card-icon">⭐</span>
              <span className="service-card-content">
                <strong>ESTRELLAS DE TELEGRAM</strong>
                <small>Disfruta de Telegram Stars</small>
              </span>
              <span className="service-arrow">→</span>
            </button>
          </div>
        </section>

        <section className="account-section">
          <div className="section-heading">
            <div>
              <span className="section-label">ADMINISTRA TU EXPERIENCIA</span>
              <h2>MI CUENTA</h2>
            </div>
            <span className="section-heading-icon">👤</span>
          </div>

          <div className="account-grid">
            <button type="button" className="account-card" onClick={() => goTo("/orders")}>
              <span>📦</span><strong>PEDIDOS</strong><small>Consulta tus compras</small>
              <b>→</b>
            </button>

            <button type="button" className="account-card" onClick={() => goTo("/balance")}>
              <span>💳</span><strong>BILLETERA</strong><small>Gestiona tu saldo</small>
              <b>→</b>
            </button>

            <button type="button" className="account-card" onClick={() => goTo("/transfers")}>
              <span>🔄</span><strong>TRANSFERENCIAS</strong><small>Movimientos de saldo</small>
              <b>→</b>
            </button>

            <button type="button" className="account-card" onClick={() => goTo("/profile")}>
              <span>👤</span><strong>PERFIL</strong><small>Tu información personal</small>
              <b>→</b>
            </button>

            <button type="button" className="account-card" onClick={() => goTo("/ajustes")}>
              <span><MenuLineIcon name="settings" /></span>
              <strong>AJUSTES</strong>
              <small>Configura tu cuenta</small>
              <b>→</b>
            </button>
          </div>
        </section>

        <section className="support-section">
          <div className="support-info">
            <span className="section-label">ESTAMOS PARA AYUDARTE</span>
            <h2>¿NECESITAS AYUDA?</h2>
            <p>Si tienes alguna duda o problema con tu pedido, nuestro soporte está disponible para ayudarte.</p>
          </div>

          <button type="button" onClick={() => goTo("/support")}>
            <span>🎧</span> CONTACTAR SOPORTE <b>→</b>
          </button>
        </section>

        <section className="benefits-section">
          <div className="benefit-card">
            <span>⚡</span>
            <div>
              <strong>ENTREGA RÁPIDA</strong>
              <p>Procesamos tus pedidos rápidamente.</p>
            </div>
          </div>

          <div className="benefit-card">
            <span>🛡️</span>
            <div>
              <strong>COMPRA SEGURA</strong>
              <p>Tu pedido queda registrado en tu cuenta.</p>
            </div>
          </div>
        </section>

        <footer className="store-footer">
          <div className="footer-brand">
            <span className="footer-logo">SG</span>
            <strong>STORE <span>GAMING</span></strong>
          </div>
          <p>TU MEJOR OPCIÓN PARA RECARGAS GAMING</p>
          <div className="footer-line" />
          <small>© 2026 STORE GAMING · TODOS LOS DERECHOS RESERVADOS</small>
        </footer>
      </div>

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        .store-home {
          position: relative;
          min-height: 100vh;
          overflow-x: hidden;
          color: #f5f8ff;
          background:
            radial-gradient(ellipse at 50% 0%, rgba(31,91,190,.18), transparent 42%),
            linear-gradient(180deg, #070d19 0%, #090f1d 48%, #060a13 100%);
          font-family: Arial, Helvetica, sans-serif;
          isolation: isolate;
        }

        .home-background-glow {
          position: absolute;
          z-index: -1;
          top: 0;
          left: 0;
          width: 100%;
          height: 650px;
          pointer-events: none;
          background:
            linear-gradient(rgba(5,9,18,.78),rgba(5,9,18,.94)),
            url('/images/battle-royale-bg.jpg') center 20% / cover no-repeat;
          opacity: .48;
        }

        .home-container {
          position: relative;
          width: 100%;
          max-width: 1160px;
          margin: 0 auto;
          padding: 0 18px 25px;
        }

        .store-loading {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 13px;
          background: #070d19;
          color: #fff;
        }

        .loading-emblem, .brand-emblem, .header-brand-icon, .footer-logo {
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 1000;
          letter-spacing: -1px;
          color: #fff;
          background: linear-gradient(135deg,#4c9cff,#1452b9);
          box-shadow: 0 0 25px rgba(45,130,255,.3);
        }

        .loading-emblem {
          width: 65px;
          height: 65px;
          border-radius: 19px;
          font-size: 24px;
        }

        .loading-logo {
          font-size: 21px;
          font-weight: 1000;
          letter-spacing: 3px;
        }

        .loading-line {
          width: 150px;
          height: 3px;
          border-radius: 10px;
          background: linear-gradient(90deg,transparent,#398cff,transparent);
          animation: loadingPulse 1.3s infinite;
        }

        .store-loading p {
          color: #8daed9;
          font-size: 10px;
          letter-spacing: 2px;
          font-weight: 800;
        }

        @keyframes loadingPulse {
          0%,100% { opacity: .35; transform: scaleX(.7); }
          50% { opacity: 1; transform: scaleX(1); }
        }

        .store-header {
          position: relative;
          z-index: 20;
          min-height: 76px;
          display: flex;
          align-items: center;
          gap: 15px;
          border-bottom: 1px solid rgba(130,170,230,.12);
        }

        .menu-button {
          width: 43px;
          height: 43px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 5px;
          flex-shrink: 0;
          border: 1px solid rgba(110,165,255,.2);
          border-radius: 12px;
          background: rgba(20,40,72,.65);
          cursor: pointer;
        }

        .menu-button span {
          display: block;
          width: 19px;
          height: 2px;
          border-radius: 4px;
          background: #85bdff;
        }

        .header-brand {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .header-brand-icon {
          width: 39px;
          height: 39px;
          border-radius: 12px;
          font-size: 14px;
        }

        .header-brand strong {
          display: block;
          font-size: 14px;
          letter-spacing: 1px;
        }

        .header-brand strong span, .footer-brand strong span {
          color: #60a8ff;
        }

        .header-brand small {
          display: block;
          margin-top: 3px;
          color: #8196b8;
          font-size: 8px;
          letter-spacing: 1.5px;
        }

        .store-header-actions {
          position: relative;
          margin-left: auto;
        }

        .notification-button {
          position: relative;
          width: 43px;
          height: 43px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(110,165,255,.2);
          border-radius: 12px;
          background: rgba(20,40,72,.65);
          color: #b9d7ff;
          cursor: pointer;
        }

        .notification-active {
          border-color: #438eff;
          background: rgba(42,115,225,.2);
        }

        .notification-badge {
          position: absolute;
          top: -6px;
          right: -6px;
          min-width: 19px;
          height: 19px;
          padding: 0 5px;
          display: flex;
          justify-content: center;
          align-items: center;
          border: 2px solid #080e1a;
          border-radius: 20px;
          background: #e53b55;
          color: white;
          font-size: 9px;
          font-weight: 900;
        }

        .notification-dismiss {
          position: fixed;
          inset: 0;
          z-index: 20;
          border: 0;
          background: transparent;
        }

        .notification-panel {
          position: absolute;
          z-index: 30;
          top: 55px;
          right: 0;
          width: min(370px, calc(100vw - 30px));
          max-height: 460px;
          overflow: hidden;
          border: 1px solid rgba(115,165,255,.2);
          border-radius: 17px;
          background: #0b1424;
          box-shadow: 0 20px 55px rgba(0,0,0,.6);
        }

        .notification-panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 15px;
          border-bottom: 1px solid rgba(255,255,255,.08);
        }

        .notification-panel-header span {
          display: block;
          color: #65aaff;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 1.5px;
        }

        .notification-panel-header strong {
          display: block;
          margin-top: 5px;
          color: #fff;
          font-size: 13px;
        }

        .notification-panel-header button {
          width: 30px;
          height: 30px;
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 8px;
          background: rgba(255,255,255,.05);
          color: #fff;
          font-size: 20px;
          cursor: pointer;
        }

        .notification-tools {
          display: flex;
          justify-content: flex-end;
          padding: 10px 13px;
          border-bottom: 1px solid rgba(255,255,255,.06);
        }

        .notification-tools button {
          border: 0;
          background: transparent;
          color: #70b2ff;
          font-size: 10px;
          font-weight: 900;
          cursor: pointer;
        }

        .notification-list {
          max-height: 340px;
          overflow-y: auto;
        }

        .notification-empty {
          padding: 30px 18px;
          text-align: center;
          color: #aabbd3;
        }

        .notification-empty span {
          display: block;
          margin-bottom: 10px;
          font-size: 25px;
        }

        .notification-empty strong {
          color: #fff;
          font-size: 12px;
        }

        .notification-empty p {
          font-size: 11px;
          line-height: 1.6;
        }

        .notification-item {
          width: 100%;
          display: flex;
          align-items: flex-start;
          gap: 11px;
          padding: 13px;
          border: 0;
          border-bottom: 1px solid rgba(255,255,255,.06);
          border-left: 3px solid transparent;
          background: rgba(255,255,255,.015);
          color: #fff;
          text-align: left;
          cursor: pointer;
        }

        .notification-unread {
          border-left-color: #428dff;
          background: rgba(45,115,220,.1);
        }

        .notification-item-icon {
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          border-radius: 10px;
          background: rgba(60,130,255,.13);
          color: #81baff;
        }

        .notification-item-content {
          flex: 1;
          min-width: 0;
        }

        .notification-item-content strong {
          display: block;
          font-size: 12px;
          line-height: 1.5;
          overflow-wrap: anywhere;
        }

        .notification-item-content p {
          margin: 5px 0;
          color: #aebbd0;
          font-size: 11px;
          line-height: 1.6;
          overflow-wrap: anywhere;
        }

        .notification-item-content small {
          color: #71839f;
          font-size: 9px;
        }

        .notification-unread-dot {
          width: 7px;
          height: 7px;
          flex-shrink: 0;
          margin-top: 5px;
          border-radius: 50%;
          background: #4e9aff;
        }

        .store-hero {
          position: relative;
          min-height: 340px;
          display: flex;
          align-items: center;
          overflow: hidden;
          margin: 25px 0 24px;
          padding: clamp(25px,5vw,48px);
          border: 1px solid rgba(75,145,255,.34);
          border-radius: 23px;
          background:
            linear-gradient(90deg,rgba(4,11,25,.97) 0%,rgba(5,16,36,.91) 48%,rgba(5,16,36,.48) 100%),
            url('/bienvenida-store-gaming.png') center / cover no-repeat;
          box-shadow: 0 18px 55px rgba(0,0,0,.28), inset 0 0 45px rgba(40,110,255,.08);
        }

        .hero-background-decoration {
          position: absolute;
          top: -130px;
          right: -80px;
          width: 430px;
          height: 430px;
          border: 1px solid rgba(75,150,255,.13);
          border-radius: 50%;
          box-shadow: 0 0 0 35px rgba(60,130,255,.025), 0 0 0 75px rgba(60,130,255,.02);
        }

        .hero-content {
          position: relative;
          z-index: 2;
          max-width: 650px;
        }

        .hero-badge, .referral-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 13px;
          border: 1px solid rgba(91,160,255,.35);
          border-radius: 30px;
          background: rgba(45,115,220,.13);
          color: #b8d8ff;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 1.5px;
        }

        .hero-badge span {
          color: #70b4ff;
          font-size: 15px;
        }

        .hero-welcome {
          margin: 23px 0 5px;
          color: #b7c8e2;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 3px;
        }

        .hero-content h1 {
          margin: 0;
          color: #fff;
          font-size: clamp(35px,7vw,66px);
          line-height: 1.08;
          font-weight: 1000;
          letter-spacing: -2px;
          text-shadow: 0 5px 25px rgba(0,0,0,.5);
        }

        .hero-content h1 span {
          display: block;
          background: linear-gradient(100deg,#fff 0%,#b4d8ff 40%,#398bff 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          filter: drop-shadow(0 5px 18px rgba(45,125,255,.28));
        }

        .hero-user {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-top: 15px;
          padding: 8px 12px;
          border-left: 3px solid #438fff;
          border-radius: 4px 9px 9px 4px;
          background: rgba(10,30,60,.72);
          color: #d8e9ff;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .5px;
        }

        .hero-user-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #54d99a;
          box-shadow: 0 0 10px rgba(84,217,154,.7);
        }

        .hero-text {
          max-width: 470px;
          margin: 17px 0;
          color: #c2d0e5;
          font-size: 12px;
          line-height: 1.9;
        }

        .hero-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .hero-actions button {
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 0 17px;
          border: 1px solid #438fff;
          border-radius: 10px;
          background: linear-gradient(135deg,#348cff,#1552b9);
          color: #fff;
          font-size: 10px;
          font-weight: 900;
          cursor: pointer;
          box-shadow: 0 7px 22px rgba(30,100,220,.2);
        }

        .hero-actions button b {
          font-size: 16px;
        }

        .hero-actions .hero-secondary {
          border-color: rgba(140,180,240,.25);
          background: rgba(16,34,61,.7);
          color: #d8e8ff;
          box-shadow: none;
        }

        .hero-decoration-line {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 27px;
        }

        .hero-decoration-line span {
          width: 45px;
          height: 2px;
          background: #428dff;
        }

        .hero-decoration-line small {
          color: #718fb8;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 2px;
        }

        .hero-side-decoration {
          position: absolute;
          right: 8%;
          top: 50%;
          display: flex;
          flex-direction: column;
          align-items: center;
          transform: translateY(-50%);
          opacity: .8;
        }

        .hero-circle {
          width: 150px;
          height: 150px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(105,175,255,.35);
          border-radius: 50%;
          background: radial-gradient(circle,rgba(50,130,255,.2),rgba(10,25,50,.25));
          color: rgba(190,220,255,.8);
          font-size: 42px;
          font-weight: 1000;
          box-shadow: 0 0 50px rgba(40,120,255,.13), inset 0 0 30px rgba(40,120,255,.1);
        }

        .hero-side-decoration > span {
          margin-top: 12px;
          color: #b4d7ff;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 4px;
        }

        .hero-side-decoration small {
          margin-top: 5px;
          color: #748cab;
          font-size: 8px;
          letter-spacing: 2px;
        }

        .stats-section, .services-section, .account-section {
          margin: 28px 0;
        }

        .section-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 15px;
        }

        .section-label {
          color: #66aaff;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 1.6px;
        }

        .section-heading h2 {
          margin: 5px 0 0;
          color: #f6f9ff;
          font-size: 20px;
          font-weight: 1000;
          letter-spacing: .5px;
        }

        .section-heading-icon {
          color: #6baeff;
          font-size: 24px;
        }

        .hero-stats {
          display: grid;
          grid-template-columns: repeat(3,minmax(0,1fr));
          gap: 13px;
        }

        .stat-card {
          min-width: 0;
          min-height: 155px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          border: 1px solid rgba(100,160,255,.2);
          border-radius: 17px;
          background: linear-gradient(145deg,rgba(17,35,65,.94),rgba(9,17,32,.96));
          color: #fff;
          text-align: left;
          cursor: pointer;
          transition: transform .2s ease,border-color .2s ease;
        }

        .stat-card:hover, .service-card:hover, .account-card:hover {
          transform: translateY(-3px);
          border-color: rgba(100,170,255,.55);
        }

        .stat-top {
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .stat-icon {
          width: 39px;
          height: 39px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(100,165,255,.2);
          border-radius: 12px;
          background: rgba(55,125,230,.15);
          font-size: 19px;
        }

        .stat-link {
          color: #6daeff;
          font-size: 17px;
        }

        .stat-label {
          margin-top: 13px;
          color: #91a9ca;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 1px;
        }

        .stat-card > strong {
          max-width: 100%;
          margin-top: 5px;
          color: #fff;
          font-size: clamp(17px,3vw,25px);
          font-weight: 1000;
          overflow-wrap: anywhere;
        }

        .stat-card > small {
          margin-top: 5px;
          color: #7389a9;
          font-size: 9px;
        }

        .wallet-stat { border-top: 2px solid #388cff; }
        .spending-stat { border-top: 2px solid #9b81ff; }
        .orders-stat { border-top: 2px solid #32b9d9; }

        .referral-section {
          position: relative;
          min-height: 235px;
          display: flex;
          align-items: center;
          overflow: hidden;
          margin: 28px 0;
          padding: 26px;
          border: 1px solid rgba(78,200,140,.27);
          border-radius: 20px;
          background:
            linear-gradient(90deg,rgba(5,23,21,.96),rgba(5,27,23,.85),rgba(5,25,21,.58)),
            url('/referidos-banner.jpg') center / cover no-repeat;
          box-shadow: 0 12px 35px rgba(0,0,0,.22);
        }

        .referral-content {
          position: relative;
          z-index: 2;
          max-width: 620px;
        }

        .referral-badge {
          border-color: rgba(85,220,150,.3);
          background: rgba(35,160,100,.13);
          color: #9af0bd;
        }

        .referral-content h2 {
          margin: 15px 0 5px;
          color: #fff;
          font-size: clamp(27px,5vw,39px);
          font-weight: 1000;
        }

        .referral-content h3 {
          margin: 0;
          color: #7de6a9;
          font-size: clamp(13px,3vw,18px);
          font-weight: 900;
        }

        .referral-content p {
          max-width: 470px;
          margin: 10px 0 17px;
          color: #c4d8cf;
          font-size: 11px;
          line-height: 1.8;
        }

        .referral-content button {
          min-height: 42px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 0 16px;
          border: 1px solid rgba(120,245,175,.45);
          border-radius: 9px;
          background: linear-gradient(135deg,#22b76b,#117b48);
          color: #fff;
          font-size: 10px;
          font-weight: 900;
          cursor: pointer;
        }

        .referral-decoration {
          position: absolute;
          right: 8%;
          top: 50%;
          transform: translateY(-50%) rotate(-12deg);
          font-size: 100px;
          opacity: .45;
          filter: drop-shadow(0 0 25px rgba(60,220,130,.35));
        }

        .service-grid {
          display: grid;
          grid-template-columns: repeat(2,minmax(0,1fr));
          gap: 12px;
        }

        .service-card {
          min-width: 0;
          min-height: 85px;
          display: flex;
          align-items: center;
          gap: 13px;
          padding: 14px;
          border: 1px solid rgba(100,160,255,.17);
          border-radius: 15px;
          background: linear-gradient(145deg,rgba(18,34,59,.95),rgba(9,17,31,.96));
          color: #fff;
          text-align: left;
          cursor: pointer;
          transition: .2s ease;
        }

        .service-card-icon {
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          border: 1px solid rgba(85,150,255,.2);
          border-radius: 12px;
          background: rgba(55,125,230,.15);
          font-size: 21px;
        }

        .service-card-content {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .service-card-content strong {
          font-size: 10px;
          font-weight: 900;
          overflow-wrap: anywhere;
        }

        .service-card-content small {
          color: #8298b7;
          font-size: 9px;
          line-height: 1.5;
        }

        .service-arrow {
          color: #6eaeff;
          font-size: 20px;
        }

        .account-grid {
          display: grid;
          grid-template-columns: repeat(3,minmax(0,1fr));
          gap: 11px;
        }

        .account-card {
          position: relative;
          min-width: 0;
          min-height: 120px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 7px;
          padding: 14px;
          border: 1px solid rgba(100,160,255,.15);
          border-radius: 14px;
          background: linear-gradient(145deg,rgba(17,31,53,.94),rgba(9,16,29,.96));
          color: #fff;
          text-align: left;
          cursor: pointer;
          transition: .2s ease;
        }

        .account-card > span {
          color: #78b4ff;
          font-size: 21px;
        }

        .account-card > span svg {
          width: 22px;
          height: 22px;
        }

        .account-card strong {
          font-size: 10px;
          font-weight: 900;
        }

        .account-card small {
          color: #8499b6;
          font-size: 9px;
        }

        .account-card > b {
          position: absolute;
          top: 14px;
          right: 13px;
          color: #69aaff;
          font-size: 15px;
        }

        .support-section {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin: 28px 0;
          padding: 22px;
          border: 1px solid rgba(95,155,255,.2);
          border-radius: 17px;
          background: linear-gradient(120deg,rgba(18,36,65,.95),rgba(9,17,31,.96));
        }

        .support-info {
          min-width: 0;
        }

        .support-info h2 {
          margin: 6px 0;
          color: #fff;
          font-size: 18px;
          font-weight: 1000;
        }

        .support-info p {
          max-width: 480px;
          margin: 0;
          color: #9cafc9;
          font-size: 10px;
          line-height: 1.7;
        }

        .support-section > button {
          min-height: 43px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          flex-shrink: 0;
          padding: 0 15px;
          border: 1px solid rgba(110,175,255,.35);
          border-radius: 10px;
          background: linear-gradient(135deg,#348cff,#1552b9);
          color: #fff;
          font-size: 10px;
          font-weight: 900;
          cursor: pointer;
        }

        .benefits-section {
          display: grid;
          grid-template-columns: repeat(2,minmax(0,1fr));
          gap: 12px;
          margin: 27px 0;
        }

        .benefit-card {
          display: flex;
          align-items: center;
          gap: 13px;
          padding: 16px;
          border: 1px solid rgba(100,160,255,.14);
          border-radius: 14px;
          background: rgba(15,29,49,.82);
        }

        .benefit-card > span {
          font-size: 24px;
        }

        .benefit-card strong {
          color: #eaf3ff;
          font-size: 10px;
        }

        .benefit-card p {
          margin: 5px 0 0;
          color: #8297b4;
          font-size: 9px;
          line-height: 1.6;
        }

        .store-footer {
          padding: 30px 10px 18px;
          text-align: center;
          border-top: 1px solid rgba(120,165,225,.12);
        }

        .footer-brand {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 10px;
        }

        .footer-logo {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          font-size: 12px;
        }

        .footer-brand strong {
          color: #fff;
          font-size: 14px;
          letter-spacing: 1.3px;
        }

        .store-footer > p {
          margin: 12px 0;
          color: #8499b8;
          font-size: 9px;
          letter-spacing: 1.5px;
        }

        .footer-line {
          width: 70px;
          height: 2px;
          margin: 15px auto;
          background: linear-gradient(90deg,transparent,#438fff,transparent);
        }

        .store-footer > small {
          color: #60748f;
          font-size: 8px;
          letter-spacing: 1px;
        }

        .menu-backdrop {
          position: fixed;
          inset: 0;
          z-index: 80;
          border: 0;
          background: rgba(0,0,0,.7);
          backdrop-filter: blur(4px);
        }

        .side-menu {
          position: fixed;
          z-index: 90;
          top: 0;
          left: 0;
          bottom: 0;
          width: min(310px,88vw);
          display: flex;
          flex-direction: column;
          padding: 18px 14px;
          border-right: 1px solid rgba(100,160,255,.2);
          background:
            linear-gradient(180deg,rgba(8,18,35,.98),rgba(5,10,20,.99)),
            url('/images/battle-royale-bg.jpg') center / cover no-repeat;
          box-shadow: 20px 0 60px rgba(0,0,0,.5);
          animation: menuSlide .22s ease-out;
        }

        @keyframes menuSlide {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }

        .side-menu-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 5px 4px 17px;
          border-bottom: 1px solid rgba(255,255,255,.08);
        }

        .side-menu-brand {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .brand-emblem {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          font-size: 14px;
        }

        .side-menu-brand small, .side-menu-brand strong {
          display: block;
        }

        .side-menu-brand small {
          color: #84a9d9;
          font-size: 9px;
          letter-spacing: 2px;
        }

        .side-menu-brand strong {
          color: #fff;
          font-size: 15px;
          letter-spacing: 1px;
        }

        .side-menu-close {
          width: 34px;
          height: 34px;
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 9px;
          background: rgba(255,255,255,.05);
          color: #fff;
          font-size: 23px;
          cursor: pointer;
        }

        .side-menu-user {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 17px 0;
          padding: 13px;
          border: 1px solid rgba(90,155,255,.18);
          border-radius: 13px;
          background: rgba(40,90,160,.12);
        }

        .side-user-icon {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          background: rgba(60,135,255,.2);
          font-size: 19px;
        }

        .side-menu-user small, .side-menu-user strong, .user-online {
          display: block;
        }

        .side-menu-user small {
          color: #7899c1;
          font-size: 8px;
          letter-spacing: 1.4px;
        }

        .side-menu-user strong {
          max-width: 190px;
          margin-top: 4px;
          color: #fff;
          font-size: 12px;
          overflow-wrap: anywhere;
        }

        .user-online {
          margin-top: 5px;
          color: #70d9a2;
          font-size: 9px;
        }

        .user-online i {
          display: inline-block;
          width: 6px;
          height: 6px;
          margin-right: 5px;
          border-radius: 50%;
          background: #58d89b;
        }

        .side-menu-nav {
          flex: 1;
          overflow-y: auto;
          padding: 0 2px 10px;
        }

        .side-menu-section-title {
          margin: 17px 10px 8px;
          color: #6d92c1;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 1.8px;
        }

        .side-menu-item {
          width: 100%;
          min-height: 43px;
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 3px 0;
          padding: 0 11px;
          border: 1px solid transparent;
          border-radius: 10px;
          background: transparent;
          color: #b4c5dd;
          font-size: 11px;
          font-weight: 800;
          text-align: left;
          cursor: pointer;
          transition: .18s ease;
        }

        .side-menu-item:hover, .side-menu-item.active {
          border-color: rgba(85,150,255,.22);
          background: linear-gradient(90deg,rgba(50,125,235,.22),rgba(30,75,140,.08));
          color: #fff;
        }

        .side-menu-item.active {
          box-shadow: inset 3px 0 #438fff;
        }

        .menu-icon {
          width: 25px;
          display: flex;
          justify-content: center;
          color: #79b5ff;
        }

        .menu-arrow {
          margin-left: auto;
          color: #6489b9;
          font-size: 19px;
        }

        .admin-menu-label {
          flex: 1;
          font-size: 11px;
          text-align: left;
        }

        .admin-pending-badge {
          min-width: 22px;
          height: 22px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 6px;
          border: 1px solid rgba(255,255,255,.2);
          border-radius: 20px;
          background: linear-gradient(135deg,#f34b5b,#a90d20);
          color: #fff;
          font-size: 10px;
          font-weight: 900;
        }

        .side-menu-bottom {
          padding-top: 12px;
          border-top: 1px solid rgba(255,255,255,.08);
          text-align: center;
        }

        .side-menu-logout {
          width: 100%;
          min-height: 43px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          border: 1px solid rgba(255,90,110,.2);
          border-radius: 10px;
          background: rgba(180,30,55,.12);
          color: #ff8c9b;
          cursor: pointer;
        }

        .side-menu-logout span {
          font-size: 17px;
        }

        .side-menu-logout strong {
          font-size: 11px;
        }

        .side-menu-bottom > small {
          display: block;
          margin-top: 12px;
          color: #536987;
          font-size: 8px;
          letter-spacing: 1px;
        }

        @media (max-width: 700px) {
          .home-container {
            padding: 0 12px 20px;
          }

          .store-header {
            min-height: 65px;
          }

          .header-brand-icon {
            width: 35px;
            height: 35px;
          }

          .header-brand strong {
            font-size: 12px;
          }

          .header-brand small {
            font-size: 7px;
          }

          .store-hero {
            min-height: 340px;
            margin-top: 17px;
            padding: 23px 18px;
            background-position: 62% center;
          }

          .hero-side-decoration {
            right: -35px;
            opacity: .18;
          }

          .hero-side-decoration .hero-circle {
            width: 135px;
            height: 135px;
          }

          .hero-content {
            max-width: 100%;
          }

          .hero-content h1 {
            font-size: clamp(35px,9vw,49px);
          }

          .hero-text {
            max-width: 95%;
          }

          .hero-stats {
            gap: 8px;
          }

          .stat-card {
            min-height: 143px;
            padding: 11px;
          }

          .stat-icon {
            width: 33px;
            height: 33px;
            font-size: 16px;
          }

          .stat-label {
            font-size: 8px;
            letter-spacing: .5px;
          }

          .stat-card > strong {
            font-size: clamp(14px,4vw,20px);
          }

          .referral-section {
            min-height: 245px;
            padding: 20px 17px;
          }

          .referral-decoration {
            right: -15px;
            font-size: 75px;
            opacity: .2;
          }

          .service-grid {
            grid-template-columns: 1fr;
          }

          .account-grid {
            grid-template-columns: repeat(2,minmax(0,1fr));
          }

          .support-section {
            align-items: flex-start;
            flex-direction: column;
            gap: 15px;
            padding: 18px;
          }

          .support-section > button {
            width: 100%;
          }
        }

        @media (max-width: 390px) {
          .home-container {
            padding-right: 9px;
            padding-left: 9px;
          }

          .header-brand {
            gap: 7px;
          }

          .header-brand strong {
            font-size: 10px;
          }

          .header-brand small {
            font-size: 6px;
            letter-spacing: 1px;
          }

          .menu-button, .notification-button {
            width: 39px;
            height: 39px;
          }

          .hero-stats {
            gap: 6px;
          }

          .stat-card {
            padding: 9px 7px;
          }

          .stat-card > strong {
            font-size: 13px;
          }

          .stat-label {
            font-size: 7px;
          }

          .benefits-section {
            grid-template-columns: 1fr;
          }

          .account-card {
            padding: 12px 10px;
          }

          .account-card strong {
            font-size: 9px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: .01ms !important;
            transition-duration: .01ms !important;
          }
        }
      `}</style>
    </main>
  );
}
