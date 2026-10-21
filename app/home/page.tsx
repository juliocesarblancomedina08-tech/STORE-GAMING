
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
    <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true" {...common}>
      {name === "home" && (
        <>
          <path d="m3 10 9-7 9 7" />
          <path d="M5 9v11h14V9" />
          <path d="M9 20v-7h6v7" />
        </>
      )}

      {name === "gamepad" && (
        <>
          <path d="M6.5 8h11a4.5 4.5 0 0 1 4.3 5.8l-1.1 3.6a2.5 2.5 0 0 1-4.1 1.1L14 16h-4l-2.6 2.5a2.5 2.5 0 0 1-4.1-1.1l-1.1-3.6A4.5 4.5 0 0 1 6.5 8Z" />
          <path d="M7 11v4M5 13h4" />
          <path d="M16.5 12h.01M18.5 14h.01" />
        </>
      )}

      {name === "gift" && (
        <>
          <rect x="3" y="9" width="18" height="12" rx="2" />
          <path d="M12 9v12M3 13h18" />
          <path d="M12 9H7.5a2.5 2.5 0 1 1 2.5-2.5V9ZM12 9h4.5A2.5 2.5 0 1 0 14 6.5V9Z" />
        </>
      )}

      {name === "phone" && (
        <>
          <rect x="6" y="2" width="12" height="20" rx="2" />
          <path d="M10 5h4M11 18h2" />
        </>
      )}

      {name === "coins" && (
        <>
          <ellipse cx="9" cy="6" rx="6" ry="3" />
          <path d="M3 6v5c0 1.7 2.7 3 6 3 1.1 0 2.1-.2 3-.5" />
          <path d="M3 11v5c0 1.7 2.7 3 6 3 1.2 0 2.3-.2 3.2-.6" />
          <ellipse cx="16" cy="14" rx="5" ry="2.5" />
          <path d="M11 14v4c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5v-4" />
        </>
      )}

      {name === "star" && (
        <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z" />
      )}

      {name === "wallet" && (
        <>
          <rect x="3" y="5" width="18" height="15" rx="2" />
          <path d="M3 9h18" />
          <path d="M16 14h5" />
          <path d="M16 14h.01" />
          <path d="M6 5V4a2 2 0 0 1 2-2h10" />
        </>
      )}

      {name === "chart" && (
        <>
          <path d="M3 3v18h18" />
          <rect x="7" y="12" width="3" height="6" rx=".5" />
          <rect x="13" y="8" width="3" height="10" rx=".5" />
          <rect x="19" y="5" width="2" height="13" rx=".5" />
        </>
      )}

      {name === "user" && (
        <>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21a8 8 0 0 1 16 0" />
        </>
      )}

      {name === "package" && (
        <>
          <path d="m12 3 9 5-9 5-9-5 9-5Z" />
          <path d="M3 8v9l9 5 9-5V8" />
          <path d="M12 13v9M7.5 5.5l9 5" />
        </>
      )}

      {name === "headphones" && (
        <>
          <path d="M3 14v-3a9 9 0 0 1 18 0v3" />
          <rect x="3" y="13" width="5" height="8" rx="2" />
          <rect x="16" y="13" width="5" height="8" rx="2" />
        </>
      )}

      {name === "settings" && (
        <>
          <circle cx="12" cy="12" r="3" />
          <path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.6a8 8 0 0 1-1.7 1l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.7-1l-1.7.6-1.4-2.4 1.4-1.1a7 7 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.7.6a8 8 0 0 1 1.7-1l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.7 1l1.7-.6 1.4 2.4-1.4 1.1a7 7 0 0 1 0 2Z" />
        </>
      )}

      {name === "clipboard" && (
        <>
          <rect x="5" y="4" width="14" height="18" rx="2" />
          <path d="M9 4V3h6v1" />
          <path d="M9 10h6M9 14h6M9 18h4" />
        </>
      )}
    </svg>
  );
}

const panelStyle: CSSProperties = {
  maxWidth: "1100px",
  margin: "14px auto",
  padding: "16px",
  borderRadius: "16px",
  border: "1px solid rgba(255,255,255,.1)",
  background:
    "linear-gradient(rgba(8,10,17,.88),rgba(8,10,17,.93)), url('/images/battle-royale-bg.jpg') center / cover no-repeat",
  boxShadow: "0 10px 30px rgba(0,0,0,.22)",
};

const sectionHeading: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "10px",
  marginBottom: "12px",
};

const sectionTitle: CSSProperties = {
  margin: "3px 0 0",
  color: "#fff",
  fontSize: "17px",
  fontWeight: 900,
};

const sectionLabel: CSSProperties = {
  color: "#ff5964",
  fontSize: "9px",
  fontWeight: 900,
  letterSpacing: "1.2px",
};

const cardGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "9px",
};

const cardStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  minWidth: 0,
  minHeight: "62px",
  padding: "10px 9px",
  borderRadius: "11px",
  border: "1px solid rgba(255,255,255,.1)",
  background: "rgba(15,18,28,.78)",
  color: "#fff",
  font: "inherit",
  textAlign: "left",
  cursor: "pointer",
};

const cardIcon: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "34px",
  height: "34px",
  flexShrink: 0,
  borderRadius: "9px",
  background: "rgba(229,9,20,.16)",
  fontSize: "20px",
};

const cardText: CSSProperties = {
  flex: 1,
  minWidth: 0,
  fontSize: "10px",
  lineHeight: 1.45,
  fontWeight: 900,
  overflowWrap: "anywhere",
};

const cardArrow: CSSProperties = {
  color: "#ff5964",
  fontSize: "17px",
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
  const status = String(order.status || "")
    .trim()
    .toUpperCase();

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

  const [ordersCreated, setOrdersCreated] = useState(0);
  const [deposited, setDeposited] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState("");

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
      setIsAdmin(email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase());

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
      setIsAdmin(email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase());

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
    router.push(path);
  }

  if (loading) {
    return (
      <main className="store-loading">
        <div className="loading-logo">STORE GAMING</div>
        <div className="loading-line" />
        <p>CARGANDO STORE GAMING...</p>
      </main>
    );
  }

  return (
    <main
      className="store-home"
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(rgba(5,7,12,.78),rgba(5,7,12,.91)), url('/images/battle-royale-bg.jpg') center center / cover fixed no-repeat",
      }}
    >
      {menuOpen && (
        <>
          <button
            type="button"
            className="menu-backdrop"
            aria-label="Cerrar menú"
            onClick={() => setMenuOpen(false)}
          />

          <aside
            className="side-menu"
            style={{
              background:
                'linear-gradient(180deg, rgba(0,0,0,.78), rgba(4,4,4,.96)), url("/images/battle-royale-bg.jpg") center / cover no-repeat',
              backgroundAttachment: "fixed",
            }}
          >
            <div className="side-menu-header">
              <div className="side-menu-brand">
                <span className="side-brand-line" />
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
                <small>CUENTA</small>
                <strong>@{username}</strong>
              </div>
            </div>

            <nav className="side-menu-nav" style={{ position: "relative", zIndex: 2 }}>
              <button
                type="button"
                className="side-menu-item active"
                onClick={() => goTo("/home")}
              >
                <span className="menu-icon"><MenuLineIcon name="home" /></span>
                <span>Hogar</span>
                <span className="menu-arrow">›</span>
              </button>

              <div className="side-menu-section-title">
                <span /> SERVICIOS <span />
              </div>

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

              <button type="button" className="side-menu-item" onClick={() => setMenuOpen(false)}>
                <span className="menu-icon"><MenuLineIcon name="phone" /></span>
                <span style={{ flex: 1, textAlign: "left", fontSize: "13px" }}>
                  Venta de saldo móvil
                </span>
                <span
                  style={{
                    flexShrink: 0,
                    marginLeft: "5px",
                    padding: "3px 6px",
                    borderRadius: "5px",
                    background: "linear-gradient(135deg,#e50914,#9d0000)",
                    color: "#fff",
                    fontSize: "7px",
                    fontWeight: 900,
                    letterSpacing: ".3px",
                    lineHeight: 1,
                  }}
                >
                  PRÓXIMAMENTE
                </span>
              </button>

              <button type="button" className="side-menu-item" onClick={() => goTo("/crypto")}>
                <span className="menu-icon"><MenuLineIcon name="coins" /></span>
                <span>Compra y venta de cripto</span>
                <span className="menu-arrow">›</span>
              </button>

              <button type="button" className="side-menu-item" onClick={() => goTo("/telegram-stars")}>
                <span className="menu-icon"><MenuLineIcon name="star" /></span>
                <span>Estrellas de Telegram</span>
                <span className="menu-arrow">›</span>
              </button>

              <div className="side-menu-section-title">
                <span /> FINANZAS <span />
              </div>

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

              <div className="side-menu-section-title">
                <span /> CUENTA <span />
              </div>

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
                  <div className="side-menu-section-title">
                    <span /> ADMINISTRACIÓN <span />
                  </div>

                  <button type="button" className="side-menu-item" onClick={() => goTo("/admin")}>
                    <span className="menu-icon"><MenuLineIcon name="settings" /></span>
                    <span>ADM PANEL</span>
                    <span className="menu-arrow">›</span>
                  </button>

                  <button type="button" className="side-menu-item" onClick={() => goTo("/admin/manual-orders")}>
                    <span className="menu-icon"><MenuLineIcon name="clipboard" /></span>
                    <span>ÓRDENES ADM</span>
                    <span className="menu-arrow">›</span>
                  </button>
                </>
              )}
            </nav>

            <div className="side-menu-bottom">
              <button type="button" className="side-menu-logout" onClick={logout}>
                <span>🚪</span>
                <strong>Cerrar sesión</strong>
              </button>
            </div>
          </aside>
        </>
      )}

      {/* CABECERA Y NOTIFICACIONES */}

      <header className="store-header">
        <button
          type="button"
          className="menu-button"
          onClick={() => setMenuOpen(true)}
          aria-label="Abrir menú"
        >
          <span />
          <span />
          <span />
        </button>

        <div className="store-logo-hidden" aria-hidden="true" />

        <div className="store-header-actions">
          <button
            type="button"
            className="notification-button"
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            aria-label="Notificaciones"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              width="24"
              height="24"
            >
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
            <div
              className="notification-panel"
              style={{
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,.12)",
                borderRadius: "15px",
                background: "linear-gradient(160deg,#10131d,#07090f)",
                boxShadow: "0 18px 50px rgba(0,0,0,.55)",
              }}
            >
              <div
                className="notification-panel-header"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  padding: "15px",
                  borderBottom: "1px solid rgba(255,255,255,.09)",
                  background: "linear-gradient(100deg,rgba(229,9,20,.17),transparent)",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span style={{ color: "#ff5964", fontSize: "9px", fontWeight: 900, letterSpacing: "1.4px" }}>
                    STORE GAMING
                  </span>
                  <strong style={{ color: "#fff", fontSize: "13px", fontWeight: 900 }}>
                    NOTIFICACIONES
                  </strong>
                </div>

                <button
                  type="button"
                  onClick={() => setNotificationsOpen(false)}
                  aria-label="Cerrar notificaciones"
                  style={{
                    width: "30px",
                    height: "30px",
                    border: "1px solid rgba(255,255,255,.12)",
                    borderRadius: "8px",
                    background: "rgba(255,255,255,.05)",
                    color: "#fff",
                    fontSize: "21px",
                    cursor: "pointer",
                  }}
                >
                  ×
                </button>
              </div>

              {notifications.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    padding: "9px 12px",
                    borderBottom: "1px solid rgba(255,255,255,.07)",
                    background: "rgba(255,255,255,.015)",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => void markAllNotificationsAsRead()}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: "#ff5964",
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
                  <div
                    className="notification-empty"
                    style={{ padding: "28px 16px", color: "#c4cad5", textAlign: "center" }}
                  >
                    <div style={{ fontSize: "24px", marginBottom: "8px" }}>🔔</div>
                    <strong>Cargando notificaciones...</strong>
                  </div>
                ) : notifications.length === 0 ? (
                  <div
                    className="notification-empty"
                    style={{ padding: "28px 16px", color: "#c4cad5", textAlign: "center" }}
                  >
                    <div style={{ fontSize: "24px", marginBottom: "8px" }}>🔔</div>
                    <strong style={{ color: "#fff", fontSize: "12px" }}>
                      No tienes notificaciones
                    </strong>
                    <p style={{ fontSize: "11px", lineHeight: 1.6 }}>
                      Aquí aparecerán las novedades de tus pedidos y movimientos de saldo.
                    </p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <button
                      key={notification.id}
                      type="button"
                      className={`notification-item ${
                        notification.is_read
                          ? "notification-read"
                          : "notification-unread"
                      }`}
                      onClick={() => {
                        if (!notification.is_read) {
                          void markNotificationAsRead(notification.id);
                        }
                      }}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "12px",
                        width: "100%",
                        boxSizing: "border-box",
                        padding: "14px 12px",
                        margin: 0,
                        border: "none",
                        borderBottom: "1px solid rgba(255,255,255,.07)",
                        borderLeft: notification.is_read
                          ? "3px solid rgba(255,255,255,.12)"
                          : "3px solid #e50914",
                        borderRadius: 0,
                        background: notification.is_read
                          ? "rgba(15,18,28,.72)"
                          : "linear-gradient(100deg,rgba(229,9,20,.15),rgba(15,18,28,.92))",
                        color: "#fff",
                        textAlign: "left",
                        cursor: "pointer",
                      }}
                    >
                      <div
                        className="notification-item-icon"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "35px",
                          height: "35px",
                          minWidth: "35px",
                          borderRadius: "10px",
                          border: notification.is_read
                            ? "1px solid rgba(255,255,255,.1)"
                            : "1px solid rgba(229,9,20,.3)",
                          background: notification.is_read
                            ? "rgba(255,255,255,.05)"
                            : "rgba(229,9,20,.16)",
                          color: notification.is_read ? "#aab3c5" : "#ff5964",
                          fontSize: "16px",
                        }}
                      >
                        {notification.is_read ? "✓" : "🔔"}
                      </div>

                      <div
                        className="notification-item-content"
                        style={{
                          flex: 1,
                          minWidth: 0,
                          display: "flex",
                          flexDirection: "column",
                          gap: "5px",
                        }}
                      >
                        <strong
                          style={{
                            color: notification.is_read ? "#d1d5df" : "#fff",
                            fontSize: "12px",
                            lineHeight: 1.45,
                            overflowWrap: "anywhere",
                          }}
                        >
                          {notification.title}
                        </strong>

                        <p
                          style={{
                            margin: 0,
                            color: "#b8c0cf",
                            fontSize: "11px",
                            lineHeight: 1.6,
                            whiteSpace: "normal",
                            overflowWrap: "anywhere",
                          }}
                        >
                          {notification.message}
                        </p>

                        <small style={{ color: "#818b9d", fontSize: "9px", marginTop: "2px" }}>
                          {new Date(notification.created_at).toLocaleString(
                            "es-ES",
                            { dateStyle: "short", timeStyle: "short" }
                          )}
                        </small>
                      </div>

                      {!notification.is_read && (
                        <span
                          className="notification-unread-dot"
                          style={{
                            width: "7px",
                            height: "7px",
                            minWidth: "7px",
                            borderRadius: "50%",
                            background: "#ff3948",
                            boxShadow: "0 0 9px rgba(229,9,20,.7)",
                            marginTop: "5px",
                          }}
                        />
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* BIENVENIDA Y ESTADÍSTICAS */}

      <section
        className="store-hero"
        style={{
          ...panelStyle,
          position: "relative",
          overflow: "hidden",
          isolation: "isolate",
          padding: "clamp(18px,4vw,30px)",
          border: "1px solid rgba(65,130,255,.42)",
          background:
            "linear-gradient(90deg,rgba(3,7,20,.91) 0%,rgba(3,8,25,.76) 52%,rgba(3,7,20,.56) 100%), url('/bienvenida-store-gaming.png') center / cover no-repeat",
          boxShadow:
            "0 12px 36px rgba(0,0,0,.38), inset 0 0 35px rgba(25,85,255,.08)",
        }}
      >
        <div
          className="hero-content"
          style={{ position: "relative", zIndex: 1 }}
        >
          <div
            className="hero-badge"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "7px",
              padding: "7px 12px",
              borderRadius: "30px",
              background: "rgba(20,75,210,.2)",
              border: "1px solid rgba(80,145,255,.48)",
              color: "#b9d6ff",
              fontSize: "10px",
              fontWeight: 900,
              letterSpacing: "1.5px",
              marginBottom: "15px",
              boxShadow: "0 0 18px rgba(35,100,255,.13)",
            }}
          >
            <span style={{ color: "#55a5ff", fontSize: "14px" }}>✦</span>
            STORE GAMING
          </div>

          <h1
            className="hero-title"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: "5px",
              margin: 0,
            }}
          >
            <span
              style={{
                color: "#f4f7ff",
                fontSize: "clamp(18px,4vw,27px)",
                fontWeight: 800,
                letterSpacing: "1px",
                textShadow: "0 3px 14px rgba(0,0,0,.8)",
              }}
            >
              ¡BIENVENIDO A
            </span>

            <span
              style={{
                fontSize: "clamp(27px,6vw,43px)",
                fontWeight: 1000,
                lineHeight: 1.12,
                letterSpacing: "-1px",
                background:
                  "linear-gradient(100deg,#ffffff 0%,#b9d7ff 35%,#3987ff 72%,#7b9dff 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                WebkitTextFillColor: "transparent",
                filter: "drop-shadow(0 3px 12px rgba(20,85,255,.35))",
              }}
            >
              STORE GAMING
            </span>

            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "7px",
                marginTop: "8px",
                padding: "6px 10px",
                borderRadius: "7px",
                borderLeft: "3px solid #428cff",
                background: "rgba(3,10,27,.66)",
                color: "#d5e5ff",
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: ".5px",
                overflowWrap: "anywhere",
              }}
            >
              <span style={{ color: "#5ca5ff" }}>●</span>
              USUARIO: @{username}
            </span>
          </h1>

          <p
            className="hero-text"
            style={{
              margin: "15px 0 20px",
              maxWidth: "430px",
              color: "#e1e9f8",
              fontSize: "12px",
              lineHeight: 1.8,
              textShadow: "0 2px 8px rgba(0,0,0,.9)",
            }}
          >
            Tu próxima experiencia gaming comienza aquí.
            Selecciona el servicio que necesitas y disfruta.
          </p>

          <div
            className="hero-stats"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3,minmax(0,1fr))",
              gap: "8px",
            }}
          >
            <button
              type="button"
              onClick={() => goTo("/balance")}
              className="hero-stat-card"
              style={{
                ...cardStyle,
                flexDirection: "column",
                alignItems: "flex-start",
                gap: "7px",
                minHeight: "104px",
                padding: "11px 9px",
                border: "1px solid rgba(91,151,255,.34)",
                background:
                  "linear-gradient(145deg,rgba(14,38,83,.88),rgba(7,12,27,.91))",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,.06)",
                backdropFilter: "blur(8px)",
              }}
            >
              <span style={{ fontSize: "22px" }}>💳</span>
              <span
                style={{
                  color: "#b9cce9",
                  fontSize: "9px",
                  fontWeight: 800,
                  letterSpacing: ".5px",
                }}
              >
                BILLETERA
              </span>
              <b
                style={{
                  color: "#fff",
                  fontSize: "clamp(11px,3vw,16px)",
                  overflowWrap: "anywhere",
                  textShadow: "0 0 12px rgba(65,140,255,.3)",
                }}
              >
                ${deposited.toFixed(2)}
              </b>
            </button>

            <button
              type="button"
              onClick={() => goTo("/orders")}
              className="hero-stat-card"
              style={{
                ...cardStyle,
                flexDirection: "column",
                alignItems: "flex-start",
                gap: "7px",
                minHeight: "104px",
                padding: "11px 9px",
                border: "1px solid rgba(91,151,255,.34)",
                background:
                  "linear-gradient(145deg,rgba(14,38,83,.88),rgba(7,12,27,.91))",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,.06)",
                backdropFilter: "blur(8px)",
              }}
            >
              <span style={{ fontSize: "22px" }}>💸</span>
              <span
                style={{
                  color: "#b9cce9",
                  fontSize: "9px",
                  fontWeight: 800,
                  letterSpacing: ".5px",
                }}
              >
                GASTO TOTAL
              </span>
              <b
                style={{
                  color: "#fff",
                  fontSize: "clamp(11px,3vw,16px)",
                  overflowWrap: "anywhere",
                  textShadow: "0 0 12px rgba(65,140,255,.3)",
                }}
              >
                ${totalSpent.toFixed(2)}
              </b>
            </button>

            <button
              type="button"
              onClick={() => goTo("/orders")}
              className="hero-stat-card"
              style={{
                ...cardStyle,
                flexDirection: "column",
                alignItems: "flex-start",
                gap: "7px",
                minHeight: "104px",
                padding: "11px 9px",
                border: "1px solid rgba(91,151,255,.34)",
                background:
                  "linear-gradient(145deg,rgba(14,38,83,.88),rgba(7,12,27,.91))",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,.06)",
                backdropFilter: "blur(8px)",
              }}
            >
              <span style={{ fontSize: "22px" }}>📦</span>
              <span
                style={{
                  color: "#b9cce9",
                  fontSize: "9px",
                  fontWeight: 800,
                  letterSpacing: ".5px",
                }}
              >
                ÓRDENES
              </span>
              <b
                style={{
                  color: "#fff",
                  fontSize: "clamp(12px,3vw,16px)",
                  textShadow: "0 0 12px rgba(65,140,255,.3)",
                }}
              >
                {ordersCreated}
              </b>
            </button>
          </div>
        </div>
      </section>

      {/* ANUNCIO DE REFERIDOS */}

      <section
        aria-label="Programa de referidos"
        style={{ maxWidth: "1100px", margin: "18px auto", padding: "0 10px" }}
      >
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            minHeight: "210px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: "14px",
            padding: "24px 20px",
            borderRadius: "18px",
            border: "1px solid rgba(255,255,255,.16)",
            background:
              "linear-gradient(90deg,rgba(5,8,16,.82),rgba(5,8,16,.42)), url('/referidos-banner.jpg') center / cover no-repeat",
            boxShadow: "0 12px 30px rgba(0,0,0,.3)",
          }}
        >
          <div style={{ position: "relative", zIndex: 1, maxWidth: "620px" }}>
            <span
              style={{
                display: "inline-block",
                padding: "6px 10px",
                borderRadius: "20px",
                background: "rgba(34,197,94,.16)",
                border: "1px solid rgba(74,222,128,.4)",
                color: "#86efac",
                fontSize: "10px",
                fontWeight: 900,
                letterSpacing: "1px",
                marginBottom: "12px",
              }}
            >
              🎁 PROGRAMA DE REFERIDOS
            </span>

            <h2
              style={{
                margin: "0 0 8px",
                color: "#fff",
                fontSize: "clamp(25px,5vw,36px)",
                fontWeight: 1000,
                lineHeight: 1.15,
                textShadow: "0 2px 12px rgba(0,0,0,.5)",
              }}
            >
              ¡INVITA Y GANA!
            </h2>

            <p style={{ margin: "0 0 8px", color: "#86efac", fontSize: "clamp(14px,3vw,19px)", fontWeight: 900 }}>
              GANA 0.10 POR CADA AMIGO
            </p>

            <p style={{ margin: "0 0 18px", color: "#f3f4f6", fontSize: "12px", lineHeight: 1.7, maxWidth: "480px" }}>
              Comparte tu enlace de STORE GAMING. Cuando tu referido complete su primera compra válida, recibirás 0.10 de saldo en tu billetera.
            </p>

            <button
              type="button"
              onClick={() => goTo("/referidos")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                width: "100%",
                maxWidth: "280px",
                padding: "13px 18px",
                border: "1px solid rgba(134,239,172,.5)",
                borderRadius: "10px",
                background: "linear-gradient(135deg,#22c55e,#15803d)",
                color: "#fff",
                fontSize: "12px",
                fontWeight: 900,
                cursor: "pointer",
                boxShadow: "0 5px 18px rgba(22,163,74,.25)",
              }}
            >
              👥 VER MIS REFERIDOS <span>→</span>
            </button>
          </div>
        </div>
      </section>

      {/* SERVICIOS */}

      <section className="services-section" style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 10px" }}>
        <div style={sectionHeading}>
          <div>
            <span style={sectionLabel}>EXPLORA LA TIENDA</span>
            <h2 style={sectionTitle}>SERVICIOS</h2>
          </div>
          <span style={{ fontSize: "22px" }}>🎮</span>
        </div>

        <div style={cardGrid}>
          <button type="button" className="service-card" style={cardStyle} onClick={() => goTo("/top-up")}>
            <span style={cardIcon}>🎮</span><span style={cardText}>SERVICIOS TOP UP</span><span style={cardArrow}>›</span>
          </button>

          <button type="button" className="service-card" style={cardStyle} onClick={() => goTo("/gift-cards")}>
            <span style={cardIcon}>🎁</span><span style={cardText}>TARJETAS DE REGALO</span><span style={cardArrow}>›</span>
          </button>

          <button type="button" className="service-card" style={cardStyle} onClick={() => goTo("/telegram-stars")}>
            <span style={cardIcon}>⭐</span><span style={cardText}>ESTRELLAS DE TELEGRAM</span><span style={cardArrow}>›</span>
          </button>

          <button type="button" className="service-card" style={cardStyle} onClick={() => goTo("/crypto")}>
            <span style={cardIcon}>🪙</span><span style={cardText}>COMPRA Y VENTA DE CRIPTO</span><span style={cardArrow}>›</span>
          </button>

          <button type="button" className="service-card" style={cardStyle} onClick={() => setMenuOpen(true)}>
            <span style={cardIcon}>📱</span><span style={cardText}>VENTA DE SALDO MÓVIL</span><span style={cardArrow}>›</span>
          </button>
        </div>
      </section>

      {/* MI PERFIL */}

      <section style={{ ...panelStyle, marginTop: "22px" }}>
        <div style={sectionHeading}>
          <div>
            <span style={sectionLabel}>TU CUENTA</span>
            <h2 style={sectionTitle}>MI PERFIL</h2>
          </div>
          <span style={{ fontSize: "22px" }}>👤</span>
        </div>

        <div style={cardGrid}>
          <button type="button" style={cardStyle} onClick={() => goTo("/orders")}>
            <span style={cardIcon}>📦</span><span style={cardText}>PEDIDOS</span><span style={cardArrow}>›</span>
          </button>

          <button type="button" style={cardStyle} onClick={() => goTo("/balance")}>
            <span style={cardIcon}>💳</span><span style={cardText}>BILLETERA</span><span style={cardArrow}>›</span>
          </button>

          <button type="button" style={cardStyle} onClick={() => goTo("/transfers")}>
            <span style={cardIcon}>🔄</span><span style={cardText}>TRANSFERENCIAS</span><span style={cardArrow}>›</span>
          </button>

          <button type="button" style={cardStyle} onClick={() => goTo("/profile")}>
            <span style={cardIcon}>👤</span><span style={cardText}>PERFIL</span><span style={cardArrow}>›</span>
          </button>

          <button type="button" style={cardStyle} onClick={() => goTo("/ajustes")}>
            <span style={cardIcon}><MenuLineIcon name="settings" /></span><span style={cardText}>AJUSTES</span><span style={cardArrow}>›</span>
          </button>
        </div>
      </section>

      {/* SOPORTE */}

      <section style={{ ...panelStyle, marginTop: "14px" }}>
        <div style={sectionHeading}>
          <div>
            <span style={sectionLabel}>¿NECESITAS AYUDA?</span>
            <h2 style={sectionTitle}>SOPORTE</h2>
          </div>
          <span style={{ fontSize: "22px" }}>🎧</span>
        </div>

        <button
          type="button"
          onClick={() => goTo("/support")}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            width: "100%",
            padding: "13px",
            border: "1px solid rgba(255,70,85,.4)",
            borderRadius: "10px",
            background: "linear-gradient(135deg,#e50914,#a5000a)",
            color: "#fff",
            fontSize: "12px",
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          🎧 IR A SOPORTE <span>→</span>
        </button>
      </section>

      {/* BENEFICIOS */}

      <section
        className="benefits-section"
        style={{
          maxWidth: "1100px",
          margin: "20px auto",
          padding: "0 12px",
          display: "grid",
          gridTemplateColumns: "repeat(2,minmax(0,1fr))",
          gap: "9px",
        }}
      >
        <div className="benefit" style={cardStyle}>
          <span style={{ fontSize: "22px" }}>⚡</span>
          <div>
            <strong style={{ fontSize: "10px" }}>ENTREGA RÁPIDA</strong>
            <p style={{ fontSize: "10px", color: "#aab3c5", margin: "4px 0 0" }}>
              Procesamos tus pedidos rápidamente.
            </p>
          </div>
        </div>

        <div className="benefit" style={cardStyle}>
          <span style={{ fontSize: "22px" }}>🛡️</span>
          <div>
            <strong style={{ fontSize: "10px" }}>COMPRA SEGURA</strong>
            <p style={{ fontSize: "10px", color: "#aab3c5", margin: "4px 0 0" }}>
              Tu pedido queda registrado.
            </p>
          </div>
        </div>
      </section>

      {/* PIE DE PÁGINA */}

      <footer
        className="store-footer"
        style={{ padding: "22px 12px", textAlign: "center", color: "#aab3c5" }}
      >
        <div className="footer-brand" style={{ color: "#fff", fontWeight: 900 }}>
          🛒 STORE GAMING 🎮
        </div>
        <p style={{ fontSize: "10px" }}>TU MEJOR OPCIÓN PARA RECARGAS GAMING</p>
        <small>© 2026 STORE GAMING</small>
      </footer>
    </main>
  );
}
