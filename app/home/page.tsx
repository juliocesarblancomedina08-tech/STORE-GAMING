"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type StoreOrder = Record<string, unknown> & {
  id?: string;
  status?: string;
  created_at?: string;
};

type Notification = {
  id: string;
  title?: string;
  message?: string;
  body?: string;
  read?: boolean;
  is_read?: boolean;
  created_at?: string;
  type?: string;
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
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  const paths: Record<MenuIconName, React.ReactNode> = {
    home: (
      <>
        <path d="m3 10 9-7 9 7" />
        <path d="M5 9v12h14V9" />
        <path d="M9 21v-7h6v7" />
      </>
    ),
    gamepad: (
      <>
        <path d="M6 9h12a4 4 0 0 1 3.8 5.2l-1 3a2.5 2.5 0 0 1-4.1 1l-2.2-2H9.5l-2.2 2a2.5 2.5 0 0 1-4.1-1l-1-3A4 4 0 0 1 6 9Z" />
        <path d="M7 12v4M5 14h4" />
        <path d="M16 13h.01M18 15h.01" />
      </>
    ),
    gift: (
      <>
        <rect x="3" y="9" width="18" height="12" rx="2" />
        <path d="M12 9v12M3 13h18M12 9H7.5a2.5 2.5 0 1 1 2.5-2.5V9Zm0 0h4.5a2.5 2.5 0 1 0-2.5-2.5V9Z" />
      </>
    ),
    phone: (
      <>
        <rect x="6" y="2" width="12" height="20" rx="2" />
        <path d="M10 18h4" />
      </>
    ),
    coins: (
      <>
        <ellipse cx="9" cy="6" rx="6" ry="3" />
        <path d="M3 6v5c0 1.7 2.7 3 6 3 1.2 0 2.3-.2 3.2-.5" />
        <path d="M3 11v5c0 1.7 2.7 3 6 3 1.2 0 2.3-.2 3.2-.5" />
        <ellipse cx="17" cy="15" rx="4" ry="2" />
        <path d="M13 15v4c0 1.1 1.8 2 4 2s4-.9 4-2v-4" />
      </>
    ),
    star: (
      <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z" />
    ),
    wallet: (
      <>
        <rect x="3" y="5" width="18" height="15" rx="2" />
        <path d="M3 8h18M16 14h2" />
        <path d="M6 5V3h12v2" />
      </>
    ),
    chart: (
      <>
        <path d="M3 3v18h18" />
        <path d="m7 14 4-4 4 3 5-7" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
    package: (
      <>
        <path d="m12 3 9 5-9 5-9-5 9-5Z" />
        <path d="M3 8v9l9 5 9-5V8M12 13v9" />
      </>
    ),
    headphones: (
      <>
        <path d="M3 13v-2a9 9 0 0 1 18 0v2" />
        <rect x="3" y="12" width="4" height="7" rx="2" />
        <rect x="17" y="12" width="4" height="7" rx="2" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.6a8 8 0 0 1-1.8 1l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.8-1l-1.7.6-1.4-2.4 1.4-1.1a7 7 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.7.6a8 8 0 0 1 1.8-1l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.8 1l1.7-.6 1.4 2.4-1.4 1.1a7 7 0 0 1 0 2Z" />
      </>
    ),
    clipboard: (
      <>
        <rect x="5" y="4" width="14" height="17" rx="2" />
        <path d="M9 4V2h6v2M9 10h6M9 14h6M9 18h4" />
      </>
    ),
  };

  return <svg {...common}>{paths[name]}</svg>;
}

const panelStyle: CSSProperties = {
  background: "rgba(13, 16, 25, 0.92)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: 18,
  boxShadow: "0 12px 32px rgba(0,0,0,0.22)",
};

const cardStyle: CSSProperties = {
  ...panelStyle,
  padding: 16,
  minWidth: 0,
};

function getOrderAmount(order: StoreOrder): number {
  const possibleFields = [
    "total",
    "total_amount",
    "total_usd",
    "amount",
    "amount_usd",
    "price",
    "price_usd",
    "cost",
    "subtotal",
  ];

  for (const field of possibleFields) {
    const value = Number(order[field]);
    if (Number.isFinite(value) && value > 0) {
      return value;
    }
  }

  return 0;
}

function isCompletedOrder(order: StoreOrder): boolean {
  const status = String(order.status || "").trim().toLowerCase();

  return [
    "completed",
    "complete",
    "completado",
    "completada",
    "success",
    "successful",
    "delivered",
    "entregado",
    "entregada",
  ].includes(status);
}

export default function HomePage() {
  const router = useRouter();

  const [username, setUsername] = useState("Jugador");
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

  // NUEVO: cantidad de órdenes manuales pendientes de revisión del administrador.
  const [pendingManualOrders, setPendingManualOrders] = useState(0);

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

      if (
        (session.user.email || "").trim().toLowerCase() !==
        ADMIN_EMAIL.toLowerCase()
      ) {
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
        console.error(
          "Error consultando órdenes pendientes:",
          response.status,
        );
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

    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        console.error("Error cargando notificaciones:", error);
        return;
      }

      const list = (data || []) as Notification[];
      setNotifications(list);

      const unread = list.filter(
        (item) => item.read !== true && item.is_read !== true,
      ).length;

      setNotificationCount(unread);
    } catch (error) {
      console.error("Error cargando notificaciones:", error);
    } finally {
      setNotificationsLoading(false);
    }
  }

  async function markNotificationAsRead(notificationId: string) {
    try {
      const notification = notifications.find(
        (item) => item.id === notificationId,
      );

      if (!notification) return;

      const { error } = await supabase
        .from("notifications")
        .update({ read: true, is_read: true })
        .eq("id", notificationId);

      if (error) {
        console.error("Error marcando notificación:", error);
        return;
      }

      setNotifications((previous) =>
        previous.map((item) =>
          item.id === notificationId
            ? { ...item, read: true, is_read: true }
            : item,
        ),
      );

      setNotificationCount((previous) => Math.max(0, previous - 1));
    } catch (error) {
      console.error("Error marcando notificación:", error);
    }
  }

  async function markAllNotificationsAsRead() {
    if (!currentUserId) return;

    try {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true, is_read: true })
        .eq("user_id", currentUserId);

      if (error) {
        console.error("Error marcando todas las notificaciones:", error);
        return;
      }

      setNotifications((previous) =>
        previous.map((item) => ({
          ...item,
          read: true,
          is_read: true,
        })),
      );

      setNotificationCount(0);
    } catch (error) {
      console.error("Error marcando todas las notificaciones:", error);
    }
  }

  async function loadStatistics(userId: string) {
    if (!userId) return;

    try {
      const { data: orders, error: ordersError } = await supabase
        .from("store_gaming_orders")
        .select("*")
        .eq("user_id", userId);

      if (ordersError) {
        console.error("Error cargando órdenes:", ordersError);
      } else {
        const orderList = (orders || []) as StoreOrder[];

        setOrdersCreated(orderList.length);

        const completedTotal = orderList
          .filter(isCompletedOrder)
          .reduce((sum, order) => sum + getOrderAmount(order), 0);

        setTotalSpent(completedTotal);
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("balance")
        .eq("id", userId)
        .maybeSingle();

      if (profileError) {
        console.error("Error cargando balance:", profileError);
      } else {
        setDeposited(Number(profile?.balance || 0));
      }
    } catch (error) {
      console.error("Error cargando estadísticas:", error);
    }
  }

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (error || !user) {
          if (mounted) {
            setLoading(false);
            router.replace("/login");
          }
          return;
        }

        if (!mounted) return;

        const email = user.email || "";
        const displayName =
          user.user_metadata?.username ||
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          email.split("@")[0] ||
          "Jugador";

        setUsername(String(displayName));
        setCurrentUserId(user.id);

        const adminUser =
          email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();

        setIsAdmin(adminUser);

        if (adminUser) {
          await loadPendingManualOrders();
        } else {
          setPendingManualOrders(0);
        }

        await Promise.all([
          loadStatistics(user.id),
          loadNotifications(user.id),
        ]);
      } catch (error) {
        console.error("Error cargando usuario:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadUser();

    const manualOrdersInterval = window.setInterval(() => {
      void loadPendingManualOrders();
    }, 15000);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;

      if (!user) {
        setCurrentUserId("");
        setIsAdmin(false);
        setPendingManualOrders(0);
        router.replace("/login");
        return;
      }

      const email = user.email || "";
      const adminUser =
        email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();

      setCurrentUserId(user.id);
      setIsAdmin(adminUser);

      if (adminUser) {
        void loadPendingManualOrders();
      } else {
        setPendingManualOrders(0);
      }

      void loadStatistics(user.id);
      void loadNotifications(user.id);
    });

    const notificationChannel = supabase
      .channel("notifications-home")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
        },
        (payload) => {
          const changed = (payload.new || payload.old) as
            | Notification
            | undefined;

          if (changed?.user_id && changed.user_id !== currentUserId) {
            return;
          }

          if (currentUserId) {
            void loadNotifications(currentUserId);
          }
        },
      )
      .subscribe();

    const ordersChannel = supabase
      .channel("home-orders")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "store_gaming_orders",
        },
        () => {
          if (currentUserId) {
            void loadStatistics(currentUserId);
          }
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      window.clearInterval(manualOrdersInterval);
      subscription.unsubscribe();
      void supabase.removeChannel(notificationChannel);
      void supabase.removeChannel(ordersChannel);
    };
  }, [router]);
    function goTo(path: string) {
    setMenuOpen(false);
    setNotificationsOpen(false);
    router.push(path);
  }

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#080a10",
          color: "#ffffff",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 42,
              height: 42,
              margin: "0 auto 16px",
              border: "4px solid rgba(255,255,255,.12)",
              borderTopColor: "#ff3347",
              borderRadius: "50%",
              animation: "sg-spin 0.8s linear infinite",
            }}
          />
          <p style={{ color: "#c7cbd5" }}>Cargando STORE GAMING...</p>
          <style>{`
            @keyframes sg-spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(ellipse at top right, rgba(115,10,25,.24), transparent 38%), #080a10",
        color: "#ffffff",
        fontFamily: "Arial, sans-serif",
        overflowX: "hidden",
      }}
    >
      <style>{`
        * { box-sizing: border-box; }
        button { font-family: inherit; }
        .sg-layout {
          width: 100%;
          max-width: 1440px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 255px minmax(0, 1fr);
          min-height: 100vh;
        }
        .sg-sidebar {
          padding: 22px 15px;
          background: rgba(9,11,17,.94);
          border-right: 1px solid rgba(255,255,255,.08);
        }
        .sg-content {
          padding: 24px;
          min-width: 0;
        }
        .sg-menu-item {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          border-radius: 11px;
          border: 1px solid transparent;
          background: transparent;
          color: #c6c9d2;
          cursor: pointer;
          text-align: left;
          transition: .2s ease;
          margin: 3px 0;
        }
        .sg-menu-item:hover {
          background: rgba(255,255,255,.055);
          border-color: rgba(255,255,255,.08);
          color: #fff;
        }
        .sg-menu-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .sg-section-label {
          margin: 22px 10px 8px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.6px;
          color: #717785;
        }
        .sg-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }
        .sg-service {
          display: flex;
          flex-direction: column;
          gap: 10px;
          min-height: 130px;
          padding: 17px;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,.09);
          background: linear-gradient(145deg, rgba(24,28,40,.95), rgba(13,15,23,.95));
          color: #fff;
          text-align: left;
          cursor: pointer;
          transition: transform .2s ease, border-color .2s ease;
        }
        .sg-service:hover {
          transform: translateY(-2px);
          border-color: rgba(255,52,71,.6);
        }
        .sg-service-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 42px;
          height: 42px;
          border-radius: 12px;
          background: rgba(255,48,68,.12);
          color: #ff4053;
        }
        .sg-stat {
          padding: 18px;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(18,21,31,.88);
          min-width: 0;
        }
        .sg-stat-label {
          color: #9298a7;
          font-size: 12px;
          margin-bottom: 10px;
        }
        .sg-stat-value {
          font-size: 24px;
          font-weight: 900;
          overflow-wrap: anywhere;
        }
        .sg-primary {
          border: 1px solid rgba(255,255,255,.15);
          border-radius: 11px;
          padding: 11px 15px;
          color: white;
          background: linear-gradient(135deg, #ff3449, #b80e25);
          font-weight: 800;
          cursor: pointer;
        }
        .sg-icon-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 42px;
          height: 42px;
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 12px;
          background: rgba(255,255,255,.04);
          color: white;
          cursor: pointer;
          position: relative;
        }
        .sg-notification {
          padding: 12px;
          border-bottom: 1px solid rgba(255,255,255,.07);
          cursor: pointer;
        }
        .sg-notification:hover {
          background: rgba(255,255,255,.04);
        }
        @media (max-width: 850px) {
          .sg-layout { grid-template-columns: 1fr; }
          .sg-sidebar {
            position: fixed;
            z-index: 50;
            top: 0;
            bottom: 0;
            left: 0;
            width: 275px;
            overflow-y: auto;
            transform: translateX(-110%);
            transition: transform .25s ease;
            box-shadow: 15px 0 40px rgba(0,0,0,.35);
          }
          .sg-sidebar.open { transform: translateX(0); }
          .sg-content { padding: 16px; }
          .sg-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .sg-stats { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 420px) {
          .sg-grid { gap: 9px; }
          .sg-service { padding: 12px; min-height: 120px; }
          .sg-stat-value { font-size: 21px; }
        }
      `}</style>

      <div className="sg-layout">
        {/* Menú lateral */}
        <aside className={`sg-sidebar ${menuOpen ? "open" : ""}`}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 11,
              padding: "5px 9px 25px",
            }}
          >
            <div
              style={{
                width: 43,
                height: 43,
                borderRadius: 13,
                background: "linear-gradient(135deg,#ff3449,#a90820)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
                fontWeight: 1000,
                boxShadow: "0 0 22px rgba(255,45,65,.25)",
              }}
            >
              SG
            </div>
            <div>
              <div
                style={{
                  fontWeight: 1000,
                  letterSpacing: 1,
                  fontSize: 17,
                }}
              >
                STORE <span style={{ color: "#ff4053" }}>GAMING</span>
              </div>
              <div
                style={{
                  color: "#858b99",
                  fontSize: 10,
                  letterSpacing: 1.6,
                  marginTop: 4,
                }}
              >
                TU MUNDO GAMER
              </div>
            </div>
          </div>

          <button
            type="button"
            className="sg-menu-item"
            onClick={() => goTo("/home")}
          >
            <span className="sg-menu-icon">
              <MenuLineIcon name="home" />
            </span>
            <span>Inicio</span>
          </button>

          <div className="sg-section-label">SERVICIOS</div>

          <button
            type="button"
            className="sg-menu-item"
            onClick={() => goTo("/gift-cards")}
          >
            <span className="sg-menu-icon">
              <MenuLineIcon name="gift" />
            </span>
            <span>Gift Cards</span>
          </button>

          <button
            type="button"
            className="sg-menu-item"
            onClick={() => goTo("/topup")}
          >
            <span className="sg-menu-icon">
              <MenuLineIcon name="gamepad" />
            </span>
            <span>Recargas gamer</span>
          </button>

          <button
            type="button"
            className="sg-menu-item"
            onClick={() => goTo("/mobile-balance")}
          >
            <span className="sg-menu-icon">
              <MenuLineIcon name="phone" />
            </span>
            <span>Venta de saldo</span>
          </button>

          <button
            type="button"
            className="sg-menu-item"
            onClick={() => goTo("/crypto")}
          >
            <span className="sg-menu-icon">
              <MenuLineIcon name="coins" />
            </span>
            <span>Compra y venta de cripto</span>
          </button>

          <div className="sg-section-label">FINANZAS</div>

          <button
            type="button"
            className="sg-menu-item"
            onClick={() => goTo("/wallet")}
          >
            <span className="sg-menu-icon">
              <MenuLineIcon name="wallet" />
            </span>
            <span>Mi saldo</span>
          </button>

          <button
            type="button"
            className="sg-menu-item"
            onClick={() => goTo("/orders")}
          >
            <span className="sg-menu-icon">
              <MenuLineIcon name="package" />
            </span>
            <span>Mis órdenes</span>
          </button>

          {isAdmin && (
            <>
              <div className="sg-section-label">ADMINISTRACIÓN</div>

              {/* Botón de órdenes administrativas con contador rojo */}
              <button
                type="button"
                className="sg-menu-item"
                onClick={() => goTo("/admin/manual-orders")}
                aria-label={`Órdenes administrativas: ${pendingManualOrders} pendientes`}
              >
                <span className="sg-menu-icon">
                  <MenuLineIcon name="clipboard" />
                </span>

                <span
                  style={{
                    flex: 1,
                    textAlign: "left",
                    fontSize: 13,
                    fontWeight: 800,
                  }}
                >
                  ÓRDENES ADM
                </span>

                {pendingManualOrders > 0 && (
                  <span
                    aria-label={`${pendingManualOrders} órdenes pendientes`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minWidth: 22,
                      height: 22,
                      padding: "0 6px",
                      boxSizing: "border-box",
                      borderRadius: 999,
                      background:
                        "linear-gradient(135deg, #ff3545, #b00012)",
                      color: "#ffffff",
                      fontSize: 11,
                      fontWeight: 900,
                      lineHeight: 1,
                      boxShadow: "0 0 12px rgba(255,40,60,.45)",
                      border: "1px solid rgba(255,255,255,.22)",
                      flexShrink: 0,
                    }}
                  >
                    {pendingManualOrders > 99
                      ? "99+"
                      : pendingManualOrders}
                  </span>
                )}

                <span
                  style={{
                    color: "#7d8492",
                    fontSize: 20,
                    marginLeft: 2,
                  }}
                >
                  ›
                </span>
              </button>

              <button
                type="button"
                className="sg-menu-item"
                onClick={() => goTo("/admin/orders")}
              >
                <span className="sg-menu-icon">
                  <MenuLineIcon name="package" />
                </span>
                <span>Órdenes</span>
              </button>

              <button
                type="button"
                className="sg-menu-item"
                onClick={() => goTo("/admin/clients")}
              >
                <span className="sg-menu-icon">
                  <MenuLineIcon name="user" />
                </span>
                <span>Clientes</span>
              </button>

              <button
                type="button"
                className="sg-menu-item"
                onClick={() => goTo("/admin/balances")}
              >
                <span className="sg-menu-icon">
                  <MenuLineIcon name="wallet" />
                </span>
                <span>Balances</span>
              </button>

              <button
                type="button"
                className="sg-menu-item"
                onClick={() => goTo("/admin/support")}
              >
                <span className="sg-menu-icon">
                  <MenuLineIcon name="headphones" />
                </span>
                <span>Soporte</span>
              </button>
            </>
          )}

          <div className="sg-section-label">CUENTA</div>

          <button
            type="button"
            className="sg-menu-item"
            onClick={() => goTo("/profile")}
          >
            <span className="sg-menu-icon">
              <MenuLineIcon name="user" />
            </span>
            <span>Mi perfil</span>
          </button>

          <button
            type="button"
            className="sg-menu-item"
            onClick={() => goTo("/settings")}
          >
            <span className="sg-menu-icon">
              <MenuLineIcon name="settings" />
            </span>
            <span>Ajustes</span>
          </button>

          <button
            type="button"
            className="sg-menu-item"
            onClick={() => goTo("/support")}
          >
            <span className="sg-menu-icon">
              <MenuLineIcon name="headphones" />
            </span>
            <span>Centro de soporte</span>
          </button>

          <div
            style={{
              margin: "28px 8px 0",
              padding: 13,
              borderRadius: 12,
              background: "rgba(255,255,255,.035)",
              border: "1px solid rgba(255,255,255,.07)",
            }}
          >
            <div
              style={{
                color: "#858b99",
                fontSize: 10,
                letterSpacing: 1,
              }}
            >
              SESIÓN ACTIVA
            </div>
            <div
              style={{
                marginTop: 7,
                fontWeight: 800,
                fontSize: 13,
                overflowWrap: "anywhere",
              }}
            >
              {username}
            </div>
          </div>
        </aside>

        {/* Contenido principal */}
        <section className="sg-content">
          <header
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 25,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                minWidth: 0,
              }}
            >
              <button
                type="button"
                className="sg-icon-button"
                onClick={() => setMenuOpen((value) => !value)}
                aria-label="Abrir menú"
                style={{ flexShrink: 0 }}
              >
                <span style={{ fontSize: 22 }}>☰</span>
              </button>

              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    color: "#9298a7",
                    fontSize: 11,
                    letterSpacing: 1.5,
                    marginBottom: 5,
                  }}
                >
                  PANEL PRINCIPAL
                </div>
                <h1
                  style={{
                    fontSize: 21,
                    margin: 0,
                    fontWeight: 1000,
                    overflowWrap: "anywhere",
                  }}
                >
                  STORE <span style={{ color: "#ff4053" }}>GAMING</span>
                </h1>
              </div>
            </div>

            <div style={{ position: "relative", flexShrink: 0 }}>
              <button
                type="button"
                className="sg-icon-button"
                onClick={() => {
                  setNotificationsOpen((value) => !value);
                  if (!notificationsOpen && currentUserId) {
                    void loadNotifications(currentUserId);
                  }
                }}
                aria-label="Notificaciones"
              >
                <span style={{ fontSize: 19 }}>♢</span>

                {notificationCount > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: -5,
                      right: -5,
                      minWidth: 19,
                      height: 19,
                      borderRadius: 99,
                      padding: "0 4px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "#ff3449",
                      color: "#fff",
                      fontSize: 10,
                      fontWeight: 900,
                      border: "2px solid #080a10",
                    }}
                  >
                    {notificationCount > 99 ? "99+" : notificationCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: 52,
                    right: 0,
                    width: "min(340px, calc(100vw - 35px))",
                    maxHeight: 430,
                    overflowY: "auto",
                    zIndex: 100,
                    ...panelStyle,
                    background: "#11141e",
                    boxShadow: "0 20px 50px rgba(0,0,0,.5)",
                  }}
                >
                  <div
                    style={{
                      padding: 15,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                      borderBottom: "1px solid rgba(255,255,255,.08)",
                    }}
                  >
                    <strong>Notificaciones</strong>
                    <button
                      type="button"
                      onClick={() => void markAllNotificationsAsRead()}
                      style={{
                        color: "#ff5969",
                        background: "transparent",
                        border: 0,
                        cursor: "pointer",
                        fontSize: 11,
                        fontWeight: 800,
                      }}
                    >
                      Marcar todas leídas
                    </button>
                  </div>

                  {notificationsLoading ? (
                    <p
                      style={{
                        color: "#9298a7",
                        padding: 15,
                        fontSize: 13,
                      }}
                    >
                      Cargando notificaciones...
                    </p>
                  ) : notifications.length === 0 ? (
                    <p
                      style={{
                        color: "#9298a7",
                        padding: 15,
                        fontSize: 13,
                      }}
                    >
                      No tienes notificaciones todavía.
                    </p>
                  ) : (
                    notifications.map((notification) => {
                      const isRead =
                        notification.read === true ||
                        notification.is_read === true;

                      return (
                        <div
                          key={notification.id}
                          className="sg-notification"
                          onClick={() =>
                            !isRead &&
                            void markNotificationAsRead(notification.id)
                          }
                          style={{
                            background: isRead
                              ? "transparent"
                              : "rgba(255,52,73,.07)",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 9,
                            }}
                          >
                            <span
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: 99,
                                background: isRead ? "#505664" : "#ff4053",
                                marginTop: 5,
                                flexShrink: 0,
                              }}
                            />
                            <div style={{ minWidth: 0 }}>
                              <div
                                style={{
                                  fontWeight: 800,
                                  fontSize: 13,
                                  marginBottom: 5,
                                }}
                              >
                                {notification.title || "Notificación"}
                              </div>
                              <div
                                style={{
                                  color: "#a8adba",
                                  fontSize: 12,
                                  lineHeight: 1.5,
                                  overflowWrap: "anywhere",
                                }}
                              >
                                {notification.message ||
                                  notification.body ||
                                  "Tienes una nueva notificación."}
                              </div>
                              {notification.created_at && (
                                <div
                                  style={{
                                    color: "#777e8c",
                                    fontSize: 10,
                                    marginTop: 7,
                                  }}
                                >
                                  {new Date(
                                    notification.created_at,
                                  ).toLocaleString()}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </header>

          {/* Bienvenida */}
          <div
            style={{
              ...panelStyle,
              padding: "25px 22px",
              marginBottom: 18,
              position: "relative",
              overflow: "hidden",
              background:
                "radial-gradient(ellipse at 100% 0%, rgba(255,43,65,.23), transparent 45%), linear-gradient(130deg,#151722,#0e1018)",
            }}
          >
            <div
              style={{
                position: "absolute",
                right: -35,
                top: -55,
                width: 170,
                height: 170,
                borderRadius: "50%",
                border: "1px solid rgba(255,60,80,.13)",
                boxShadow: "0 0 0 22px rgba(255,60,80,.025), 0 0 0 45px rgba(255,60,80,.02)",
                pointerEvents: "none",
              }}
            />

            <div
              style={{
                color: "#ff596b",
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: 2,
                marginBottom: 10,
              }}
            >
              BIENVENIDO A TU TIENDA GAMER
            </div>

            <h2
              style={{
                fontSize: "clamp(25px, 4vw, 36px)",
                lineHeight: 1.15,
                fontWeight: 1000,
                margin: "0 0 12px",
                overflowWrap: "anywhere",
              }}
            >
              ¡Hola, <span style={{ color: "#ff4053" }}>{username}</span>!
            </h2>

            <p
              style={{
                color: "#aeb3c0",
                lineHeight: 1.65,
                fontSize: 13,
                maxWidth: 550,
                margin: "0 0 20px",
              }}
            >
              Tu centro de recargas, tarjetas digitales y servicios gamer.
              Accede a tus productos y consulta tus órdenes desde un solo lugar.
            </p>

            <button
              type="button"
              className="sg-primary"
              onClick={() => goTo("/orders")}
            >
              VER MIS ÓRDENES
            </button>
          </div>

          {/* Estadísticas */}
          <div
            className="sg-stats"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3,minmax(0,1fr))",
              gap: 13,
              marginBottom: 27,
            }}
          >
            <div className="sg-stat">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 8,
                  alignItems: "center",
                  marginBottom: 13,
                }}
              >
                <span className="sg-stat-label" style={{ margin: 0 }}>
                  Órdenes creadas
                </span>
                <span style={{ color: "#ff4053" }}>
                  <MenuLineIcon name="package" />
                </span>
              </div>
              <div className="sg-stat-value">{ordersCreated}</div>
            </div>

            <div className="sg-stat">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 8,
                  alignItems: "center",
                  marginBottom: 13,
                }}
              >
                <span className="sg-stat-label" style={{ margin: 0 }}>
                  Saldo disponible
                </span>
                <span style={{ color: "#ff4053" }}>
                  <MenuLineIcon name="wallet" />
                </span>
              </div>
              <div className="sg-stat-value">
                ${deposited.toFixed(2)}
              </div>
            </div>

            <div className="sg-stat">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 8,
                  alignItems: "center",
                  marginBottom: 13,
                }}
              >
                <span className="sg-stat-label" style={{ margin: 0 }}>
                  Compras completadas
                </span>
                <span style={{ color: "#ff4053" }}>
                  <MenuLineIcon name="chart" />
                </span>
              </div>
              <div className="sg-stat-value">
                ${totalSpent.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Banner de referidos */}
          <button
            type="button"
            onClick={() => goTo("/referrals")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 15,
              width: "100%",
              textAlign: "left",
              padding: "21px 20px",
              marginBottom: 28,
              borderRadius: 17,
              border: "1px solid rgba(255,76,96,.35)",
              color: "#fff",
              background:
                "linear-gradient(115deg,rgba(117,13,32,.8),rgba(30,15,25,.95) 65%,rgba(21,22,33,.95))",
              cursor: "pointer",
            }}
          >
            <div>
              <div
                style={{
                  color: "#ff6877",
                  fontSize: 10,
                  fontWeight: 900,
                  letterSpacing: 1.8,
                  marginBottom: 7,
                }}
              >
                PROGRAMA DE REFERIDOS
              </div>
              <div
                style={{
                  fontSize: 21,
                  fontWeight: 1000,
                  marginBottom: 6,
                }}
              >
                Invita y gana
              </div>
              <div
                style={{
                  color: "#c5b9bf",
                  fontSize: 12,
                  lineHeight: 1.5,
                }}
              >
                Invita a otros usuarios y consulta tus recompensas.
              </div>
            </div>
            <div
              style={{
                color: "#ff596b",
                fontSize: 28,
                fontWeight: 900,
                flexShrink: 0,
              }}
            >
              ›
            </div>
          </button>

          {/* Servicios */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              gap: 10,
              marginBottom: 15,
            }}
          >
            <div>
              <div
                style={{
                  color: "#ff596b",
                  fontSize: 10,
                  fontWeight: 900,
                  letterSpacing: 1.8,
                  marginBottom: 6,
                }}
              >
                EXPLORA LA TIENDA
              </div>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 1000 }}>
                Nuestros servicios
              </h2>
            </div>
          </div>

          <div className="sg-grid">
            <button
              type="button"
              className="sg-service"
              onClick={() => goTo("/gift-cards")}
            >
              <span className="sg-service-icon">
                <MenuLineIcon name="gift" />
              </span>
              <span style={{ fontWeight: 900, fontSize: 14 }}>
                Gift Cards
              </span>
              <span style={{ color: "#9298a7", fontSize: 11 }}>
                Tarjetas y códigos digitales
              </span>
            </button>

            <button
              type="button"
              className="sg-service"
              onClick={() => goTo("/topup")}
            >
              <span className="sg-service-icon">
                <MenuLineIcon name="gamepad" />
              </span>
              <span style={{ fontWeight: 900, fontSize: 14 }}>
                Recargas gamer
              </span>
              <span style={{ color: "#9298a7", fontSize: 11 }}>
                Diamantes y monedas para juegos
              </span>
            </button>

            <button
              type="button"
              className="sg-service"
              onClick={() => goTo("/mobile-balance")}
            >
              <span className="sg-service-icon">
                <MenuLineIcon name="phone" />
              </span>
              <span style={{ fontWeight: 900, fontSize: 14 }}>
                Saldo móvil
              </span>
              <span style={{ color: "#9298a7", fontSize: 11 }}>
                Compra y venta de saldo
              </span>
            </button>

            <button
              type="button"
              className="sg-service"
              onClick={() => goTo("/crypto")}
            >
              <span className="sg-service-icon">
                <MenuLineIcon name="coins" />
              </span>
              <span style={{ fontWeight: 900, fontSize: 14 }}>
                Criptomonedas
              </span>
              <span style={{ color: "#9298a7", fontSize: 11 }}>
                Compra y venta de cripto
              </span>
            </button>

            <button
              type="button"
              className="sg-service"
              onClick={() => goTo("/subscriptions")}
            >
              <span className="sg-service-icon">
                <MenuLineIcon name="star" />
              </span>
              <span style={{ fontWeight: 900, fontSize: 14 }}>
                Suscripciones
              </span>
              <span style={{ color: "#9298a7", fontSize: 11 }}>
                Aplicaciones y servicios digitales
              </span>
            </button>

            <button
              type="button"
              className="sg-service"
              onClick={() => goTo("/support")}
            >
              <span className="sg-service-icon">
                <MenuLineIcon name="headphones" />
              </span>
              <span style={{ fontWeight: 900, fontSize: 14 }}>
                Soporte
              </span>
              <span style={{ color: "#9298a7", fontSize: 11 }}>
                Ayuda con tus compras y órdenes
              </span>
            </button>
          </div>

          {/* Accesos rápidos */}
          <div
            style={{
              marginTop: 28,
              ...panelStyle,
              padding: 18,
            }}
          >
            <h3
              style={{
                margin: "0 0 14px",
                fontSize: 16,
                fontWeight: 900,
              }}
            >
              Accesos rápidos
            </h3>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <button
                type="button"
                className="sg-primary"
                onClick={() => goTo("/orders")}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <MenuLineIcon name="package" />
                  Mis órdenes
                </span>
              </button>

              <button
                type="button"
                onClick={() => goTo("/wallet")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "11px 15px",
                  border: "1px solid rgba(255,255,255,.12)",
                  borderRadius: 11,
                  color: "#fff",
                  background: "rgba(255,255,255,.045)",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                <MenuLineIcon name="wallet" />
                Mi saldo
              </button>

              <button
                type="button"
                onClick={() => goTo("/profile")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "11px 15px",
                  border: "1px solid rgba(255,255,255,.12)",
                  borderRadius: 11,
                  color: "#fff",
                  background: "rgba(255,255,255,.045)",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                <MenuLineIcon name="user" />
                Mi perfil
              </button>
            </div>
          </div>

          <footer
            style={{
              marginTop: 30,
              padding: "20px 5px 5px",
              borderTop: "1px solid rgba(255,255,255,.07)",
              color: "#747b89",
              fontSize: 11,
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <span>
              © {new Date().getFullYear()} STORE GAMING
            </span>
            <span>Tu tienda digital gamer</span>
          </footer>
        </section>
      </div>

      {menuOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setMenuOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 40,
            border: 0,
            background: "rgba(0,0,0,.55)",
            cursor: "pointer",
          }}
          className="sg-mobile-overlay"
        />
      )}

      <style>{`
        @media (min-width: 851px) {
          .sg-mobile-overlay { display: none; }
        }
      `}</style>
    </main>
  );
                  }
