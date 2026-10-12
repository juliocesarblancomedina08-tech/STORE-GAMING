
"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

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

const ADMIN_EMAIL = "juliocesarblancomedina08@gmail.com";

const panelStyle: CSSProperties = {
  maxWidth: "1100px",
  margin: "14px auto",
  padding: "16px",
  borderRadius: "16px",
  border: "1px solid rgba(255,255,255,.10)",
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
  border: "1px solid rgba(255,255,255,.10)",
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
  width: "31px",
  height: "31px",
  flexShrink: 0,
  borderRadius: "9px",
  background: "rgba(229,9,20,.15)",
  fontSize: "18px",
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
    let orders: StoreOrder[] = [];

    try {
      const savedOrders = localStorage.getItem("storeGamingOrders");
      if (savedOrders) {
        const parsedOrders = JSON.parse(savedOrders);
        if (Array.isArray(parsedOrders)) orders = parsedOrders;
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

    const spent = orders
      .filter((order) =>
        completedStatuses.includes(String(order.status || ""))
      )
      .reduce(
        (sum, order) =>
          sum + (Number(order.total) || Number(order.price) || 0),
        0
      );

    setTotalSpent(spent);

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("balance")
        .eq("id", userId)
        .single();

      setDeposited(!error && data ? Number(data.balance) || 0 : 0);
    } catch {
      setDeposited(0);
    }
  }

  useEffect(() => {
    let mounted = true;
    let notificationChannel: ReturnType<typeof supabase.channel> | null = null;

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

      await loadStatistics(userId);
      await loadNotifications(userId);

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
        await loadStatistics(userId);
        await loadNotifications(userId);
        if (mounted) setLoading(false);
      })();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();

      if (notificationChannel) {
        void supabase.removeChannel(notificationChannel);
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
      {/* MENÚ LATERAL */}

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
              <div className="side-user-icon">@</div>
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
                <span className="menu-icon">🏠</span>
                <span>Hogar</span>
                <span className="menu-arrow">›</span>
              </button>

              <div className="side-menu-section-title">
                <span /> SERVICIOS <span />
              </div>

              <button type="button" className="side-menu-item" onClick={() => goTo("/top-up")}>
                <span className="menu-icon">🎮</span>
                <span>Recargas TOP UP</span>
                <span className="menu-arrow">›</span>
              </button>

              <button type="button" className="side-menu-item" onClick={() => goTo("/gift-cards")}>
                <span className="menu-icon">🎁</span>
                <span>Tarjetas de regalo</span>
                <span className="menu-arrow">›</span>
              </button>

              <button
                type="button"
                className="side-menu-item"
                onClick={() => setMenuOpen(false)}
              >
                <span className="menu-icon">📱</span>
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
                <span className="menu-icon">🪙</span>
                <span>Compra y venta de cripto</span>
                <span className="menu-arrow">›</span>
              </button>

              <button type="button" className="side-menu-item" onClick={() => goTo("/telegram-stars")}>
                <span className="menu-icon">⭐</span>
                <span>Estrellas de Telegram</span>
                <span className="menu-arrow">›</span>
              </button>

              <div className="side-menu-section-title">
                <span /> FINANZAS <span />
              </div>

              <button type="button" className="side-menu-item" onClick={() => goTo("/balance")}>
                <span className="menu-icon">💳</span>
                <span>Billetera</span>
                <span className="menu-arrow">›</span>
              </button>

              <button type="button" className="side-menu-item" onClick={() => setMenuOpen(false)}>
                <span className="menu-icon">📊</span>
                <span>Estadísticas</span>
                <span className="menu-arrow">›</span>
              </button>

              <div className="side-menu-section-title">
                <span /> CUENTA <span />
              </div>

              <button type="button" className="side-menu-item" onClick={() => goTo("/profile")}>
                <span className="menu-icon">👤</span>
                <span>Mi perfil</span>
                <span className="menu-arrow">›</span>
              </button>

              <button type="button" className="side-menu-item" onClick={() => goTo("/orders")}>
                <span className="menu-icon">📦</span>
                <span>Mis pedidos</span>
                <span className="menu-arrow">›</span>
              </button>

              <button type="button" className="side-menu-item" onClick={() => goTo("/support")}>
                <span className="menu-icon">🎧</span>
                <span>Soporte</span>
                <span className="menu-arrow">›</span>
              </button>

              {/* AMBAS OPCIONES SOLO SON VISIBLES PARA EL ADMIN */}

              {isAdmin && (
                <>
                  <div className="side-menu-section-title">
                    <span /> ADMINISTRACIÓN <span />
                  </div>

                  <button type="button" className="side-menu-item" onClick={() => goTo("/admin")}>
                    <span className="menu-icon">⚙️</span>
                    <span>ADM PANEL</span>
                    <span className="menu-arrow">›</span>
                  </button>

                  <button
                    type="button"
                    className="side-menu-item"
                    onClick={() => goTo("/admin/manual-orders")}
                  >
                    <span className="menu-icon">🧾</span>
                    <span>ÓRDENES ADM</span>
                    <span className="menu-arrow">›</span>
                  </button>
                </>
              )}
            </nav>

            <div className="side-menu-bottom">
              <button type="button" className="side-menu-logout" onClick={logout}>
                <span>⇥</span>
                <strong>Cerrar sesión</strong>
              </button>
            </div>
          </aside>
        </>
      )}

      {/* CABECERA: MENÚ A LA IZQUIERDA Y CAMPANA A LA DERECHA */}

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
            <div className="notification-panel">
              <div className="notification-panel-header">
                <div>
                  <span>STORE GAMING</span>
                  <strong>NOTIFICACIONES</strong>
                </div>
                <button
                  type="button"
                  onClick={() => setNotificationsOpen(false)}
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
                    borderBottom: "1px solid rgba(255,255,255,.07)",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => void markAllNotificationsAsRead()}
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
                    <div className="notification-empty-icon">🔔</div>
                    <strong>Cargando notificaciones...</strong>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="notification-empty">
                    <div className="notification-empty-icon">🔔</div>
                    <strong>No tienes notificaciones</strong>
                    <p>
                      Aquí aparecerán las novedades de tus pedidos y
                      movimientos de saldo.
                    </p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <button
                      key={notification.id}
                      type="button"
                      className={`notification-item ${
                        notification.is_read ? "notification-read" : "notification-unread"
                      }`}
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
                      {!notification.is_read && (
                        <span className="notification-unread-dot" />
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* BIENVENIDA */}

      <section className="store-hero" style={panelStyle}>
        <div className="hero-content">
          <div
            className="hero-badge"
            style={{
              display: "inline-block",
              padding: "6px 11px",
              borderRadius: "20px",
              background: "rgba(229,9,20,.16)",
              color: "#ff6570",
              fontSize: "10px",
              fontWeight: 900,
              letterSpacing: "1px",
              marginBottom: "12px",
            }}
          >
            ⚡ STORE GAMING
          </div>

          <h1
            className="hero-title"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "5px",
              margin: 0,
            }}
          >
            <span style={{ fontSize: "clamp(19px,4vw,28px)", fontWeight: 900 }}>
              BIENVENIDO A
            </span>
            <span
              style={{
                color: "#ff3948",
                fontSize: "clamp(25px,5vw,38px)",
                fontWeight: 1000,
              }}
            >
              STORE GAMING
            </span>
            <span style={{ color: "#b5bdca", fontSize: "11px", fontWeight: 700 }}>
              USUARIO: @{username}
            </span>
          </h1>

          <p
            className="hero-text"
            style={{
              margin: "12px 0 17px",
              color: "#e0e4ed",
              fontSize: "12px",
              lineHeight: 1.6,
            }}
          >
            Seleccione la opción o servicio que desee utilizar.
          </p>

          <div
            className="hero-stats"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3,minmax(0,1fr))",
              gap: "8px",
            }}
          >
            <div className="hero-stat-card" style={{ ...cardStyle, cursor: "default", flexDirection: "column", alignItems: "flex-start", gap: "5px", minHeight: "auto" }}>
              <span style={{ color: "#aab3c5", fontSize: "9px", fontWeight: 800 }}>BILLETERA</span>
              <b style={{ fontSize: "clamp(12px,3vw,16px)", overflowWrap: "anywhere" }}>${deposited.toFixed(2)}</b>
            </div>

            <div className="hero-stat-card" style={{ ...cardStyle, cursor: "default", flexDirection: "column", alignItems: "flex-start", gap: "5px", minHeight: "auto" }}>
              <span style={{ color: "#aab3c5", fontSize: "9px", fontWeight: 800 }}>GASTO TOTAL</span>
              <b style={{ fontSize: "clamp(12px,3vw,16px)", overflowWrap: "anywhere" }}>${totalSpent.toFixed(2)}</b>
            </div>

            <div className="hero-stat-card" style={{ ...cardStyle, cursor: "default", flexDirection: "column", alignItems: "flex-start", gap: "5px", minHeight: "auto" }}>
              <span style={{ color: "#aab3c5", fontSize: "9px", fontWeight: 800 }}>PEDIDOS</span>
              <b style={{ fontSize: "clamp(12px,3vw,16px)" }}>{ordersCreated}</b>
            </div>
          </div>
        </div>
      </section>

      {/* SERVICIOS: DOS POR FILA */}

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
            <span style={cardIcon}>🎮</span>
            <span style={cardText}>SERVICIOS TOP UP</span>
            <span style={cardArrow}>›</span>
          </button>

          <button type="button" className="service-card" style={cardStyle} onClick={() => goTo("/gift-cards")}>
            <span style={cardIcon}>🎁</span>
            <span style={cardText}>TARJETAS DE REGALO</span>
            <span style={cardArrow}>›</span>
          </button>

          <button type="button" className="service-card" style={cardStyle} onClick={() => goTo("/telegram-stars")}>
            <span style={cardIcon}>⭐</span>
            <span style={cardText}>ESTRELLAS DE TELEGRAM</span>
            <span style={cardArrow}>›</span>
          </button>

          <button type="button" className="service-card" style={cardStyle} onClick={() => goTo("/crypto")}>
            <span style={cardIcon}>🪙</span>
            <span style={cardText}>COMPRA Y VENTA DE CRIPTO</span>
            <span style={cardArrow}>›</span>
          </button>

          <button
            type="button"
            className="service-card"
            style={cardStyle}
            onClick={() => setMenuOpen(true)}
          >
            <span style={cardIcon}>📱</span>
            <span style={cardText}>VENTA DE SALDO MÓVIL</span>
            <span style={cardArrow}>›</span>
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
            <span style={cardIcon}>📦</span>
            <span style={cardText}>PEDIDOS</span>
            <span style={cardArrow}>›</span>
          </button>

          <button type="button" style={cardStyle} onClick={() => goTo("/balance")}>
            <span style={cardIcon}>💳</span>
            <span style={cardText}>BILLETERA</span>
            <span style={cardArrow}>›</span>
          </button>

          <button type="button" style={cardStyle} onClick={() => goTo("/transfers")}>
            <span style={cardIcon}>🔄</span>
            <span style={cardText}>TRANSFERENCIAS</span>
            <span style={cardArrow}>›</span>
          </button>

          <button type="button" style={cardStyle} onClick={() => goTo("/profile")}>
            <span style={cardIcon}>👤</span>
            <span style={cardText}>PERFIL</span>
            <span style={cardArrow}>›</span>
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
          <span>⚡</span>
          <div>
            <strong style={{ fontSize: "10px" }}>ENTREGA RÁPIDA</strong>
            <p style={{ fontSize: "10px", color: "#aab3c5", margin: "4px 0 0" }}>
              Procesamos tus pedidos rápidamente.
            </p>
          </div>
        </div>

        <div className="benefit" style={cardStyle}>
          <span>🛡️</span>
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
        style={{
          padding: "22px 12px",
          textAlign: "center",
          color: "#aab3c5",
        }}
      >
        <div className="footer-brand" style={{ color: "#fff", fontWeight: 900 }}>
          STORE GAMING
        </div>
        <p style={{ fontSize: "10px" }}>TU MEJOR OPCIÓN PARA RECARGAS GAMING</p>
        <small>© 2026 STORE GAMING</small>
      </footer>
    </main>
  );
}
