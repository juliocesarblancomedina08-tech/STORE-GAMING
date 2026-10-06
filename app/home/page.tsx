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

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] =
    useState(false);

  const [notifications, setNotifications] =
    useState<Notification[]>([]);

  const [loading, setLoading] = useState(true);

  const [orders, setOrders] =
    useState<StoreOrder[]>([]);

  const [stats, setStats] = useState({
    orders: 0,
    completed: 0,
    pending: 0,
    totalSpent: 0,
  });

  const unreadCount = notifications.filter(
    (notification) =>
      !notification.is_read
  ).length;

  const goTo = (route: string) => {
    setMenuOpen(false);
    router.push(route);
  };

  useEffect(() => {
    let mounted = true;

    const loadNotifications = async (
      userId: string
    ) => {
      const { data, error } = await supabase
        .from("notifications")
        .select(
          "id,title,message,type,is_read,created_at"
        )
        .eq("user_id", userId)
        .order("created_at", {
          ascending: false,
        })
        .limit(50);

      if (error) {
        console.error(
          "Error cargando notificaciones:",
          error
        );
        return;
      }

      if (mounted) {
        setNotifications(data || []);
      }
    };

    const loadUser = async () => {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (!currentUser) {
        router.replace("/login");
        return;
      }

      setUser(currentUser);

      const { data: profileData } =
        await supabase
          .from("profiles")
          .select("*")
          .eq("id", currentUser.id)
          .maybeSingle();

      if (mounted) {
        setProfile(profileData);
      }

      await loadNotifications(
        currentUser.id
      );

      if (mounted) {
        setLoading(false);
      }
    };

    loadUser();

    return () => {
      mounted = false;
    };
  }, [router]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(
        `notifications-home-${user.id}`
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        async () => {
          const { data, error } =
            await supabase
              .from("notifications")
              .select(
                "id,title,message,type,is_read,created_at"
              )
              .eq("user_id", user.id)
              .order("created_at", {
                ascending: false,
              })
              .limit(50);

          if (!error) {
            setNotifications(data || []);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const markNotificationAsRead = async (
    notificationId: string
  ) => {
    const { error } = await supabase
      .from("notifications")
      .update({
        is_read: true,
      })
      .eq("id", notificationId)
      .eq("user_id", user.id);

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
  };

  const markAllNotificationsAsRead =
    async () => {
      if (!user?.id) return;

      const { error } = await supabase
        .from("notifications")
        .update({
          is_read: true,
        })
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (error) {
        console.error(
          "Error marcando todas las notificaciones:",
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
    };

  useEffect(() => {
    if (!user?.id) return;

    const loadStats = async () => {
      const { data, error } =
        await supabase
          .from("topup_orders")
          .select(
            "id,status,retail_price,created_at"
          )
          .eq("user_id", user.id)
          .order("created_at", {
            ascending: false,
          });

      if (error) {
        console.error(
          "Error cargando estadísticas:",
          error
        );
        return;
      }

      const orderList = data || [];

      const completed = orderList.filter(
        (order) =>
          String(
            order.status || ""
          ).toLowerCase() === "completed"
      ).length;

      const pending = orderList.filter(
        (order) =>
          [
            "pending",
            "processing",
            "pending_payment",
          ].includes(
            String(
              order.status || ""
            ).toLowerCase()
          )
      ).length;

      const totalSpent =
        orderList.reduce(
          (sum, order) =>
            sum +
            Number(
              order.retail_price || 0
            ),
          0
        );

      setOrders(orderList);

      setStats({
        orders: orderList.length,
        completed,
        pending,
        totalSpent,
      });
    };

    loadStats();
  }, [user?.id]);

  const logout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  if (loading) {
    return (
      <main className="store-home">
        <div className="store-loading">
          <div className="loading-spinner" />
          <p>
            Cargando STORE GAMING...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="store-home">

      {/* =========================
          HEADER
      ========================== */}

      <header className="store-header">

        <button
          type="button"
          className="mobile-menu-button"
          onClick={() =>
            setMenuOpen(
              (current) => !current
            )
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

        <div className="header-actions">

          <button
            type="button"
            className="notification-button"
            onClick={() =>
              setNotificationOpen(
                (current) => !current
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
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>

            {unreadCount > 0 && (
              <span className="notification-badge">
                {unreadCount > 99
                  ? "99+"
                  : unreadCount}
              </span>
            )}
          </button>

          {notificationOpen && (
            <div className="notification-panel">

              <div className="notification-panel-header">

                <div>
                  <strong>
                    Notificaciones
                  </strong>

                  <span>
                    {unreadCount} sin leer
                  </span>
                </div>

                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={
                      markAllNotificationsAsRead
                    }
                  >
                    Marcar todas
                  </button>
                )}

              </div>

              <div className="notification-panel-list">

                {notifications.length === 0 ? (

                  <div className="notification-empty">
                    <span>🔔</span>

                    <p>
                      No tienes notificaciones
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
                            ? "is-read"
                            : "is-unread"
                        }`}
                        onClick={() =>
                          !notification.is_read &&
                          markNotificationAsRead(
                            notification.id
                          )
                        }
                      >

                        <div className="notification-item-icon">
                          {notification.type ===
                          "BALANCE_ADD"
                            ? "💰"
                            : notification.type ===
                              "BALANCE_SUBTRACT"
                            ? "💳"
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
                              "es-ES"
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
          SIDEBAR
      ========================== */}

      <aside
        className={`store-sidebar ${
          menuOpen ? "open" : ""
        }`}
      >

        <div className="sidebar-header">

          <div className="sidebar-brand">

            <span className="sidebar-brand-icon">
              🎮
            </span>

            <div>
              <strong>
                STORE GAMING
              </strong>

              <small>
                Gaming & Digital Services
              </small>
            </div>

          </div>

          <button
            type="button"
            className="sidebar-close"
            onClick={() =>
              setMenuOpen(false)
            }
            aria-label="Cerrar menú"
          >
            ×
          </button>

        </div>

        <div className="sidebar-user">

          <div className="sidebar-user-avatar">
            {(
              profile?.username ||
              user?.email ||
              "U"
            )
              .charAt(0)
              .toUpperCase()}
          </div>

          <div className="sidebar-user-info">

            <strong>
              {profile?.username ||
                user?.email?.split(
                  "@"
                )[0] ||
                "Usuario"}
            </strong>

            <span>
              {user?.email || ""}
            </span>

          </div>

        </div>

        <nav className="side-menu">

          {/* INICIO */}

          <button
            type="button"
            className="side-menu-item"
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
                <path d="m3 10 9-7 9 7" />
                <path d="M5 9v11h14V9" />
                <path d="M9 20v-6h6v6" />
              </svg>
            </span>

            <span>
              Inicio
            </span>

            <span
              className="menu-arrow"
              aria-hidden="true"
            >
              ›
            </span>
          </button>

          {/* =========================
              SERVICIOS
          ========================== */}

          <div className="side-menu-title">
            SERVICIOS
          </div>

          {/* RECARGAS TOP UP */}

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

          {/* TARJETAS DE REGALO */}

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
              🎁
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

          {/* VENTA DE SALDO MÓVIL */}

          <button
            type="button"
            className="side-menu-item"
            onClick={() =>
              setMenuOpen(false)
            }
            style={{
              position: "relative",
              overflow: "hidden",
              paddingRight: "10px",
            }}
          >
            <span
              className="menu-icon"
              aria-hidden="true"
            >
              📱
            </span>

            <span
              style={{
                flex: 1,
                textAlign: "left",
                fontSize: "13px",
              }}
            >
              Venta de saldo móvil
            </span>

            <span
              style={{
                flexShrink: 0,
                marginLeft: "5px",
                padding: "3px 6px",
                borderRadius: "5px",
                background:
                  "linear-gradient(135deg,#e50914,#9d0000)",
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

          {/* COMPRA Y VENTA DE CRIPTO */}

          <button
            type="button"
            className="side-menu-item"
            onClick={() =>
              setMenuOpen(false)
            }
            style={{
              position: "relative",
              overflow: "hidden",
              paddingRight: "10px",
            }}
          >
            <span
              className="menu-icon"
              aria-hidden="true"
            >
              🪙
            </span>

            <span
              style={{
                flex: 1,
                textAlign: "left",
                fontSize: "13px",
              }}
            >
              Compra y venta de cripto
            </span>

            <span
              style={{
                flexShrink: 0,
                marginLeft: "5px",
                padding: "3px 6px",
                borderRadius: "5px",
                background:
                  "linear-gradient(135deg,#e50914,#9d0000)",
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

          {/* =========================
              FINANZAS
          ========================== */}

          <div className="side-menu-title">
            FINANZAS
          </div>

          {/* BILLETERA */}

          <button
            type="button"
            className="side-menu-item"
            onClick={() =>
              goTo("/wallet")
            }
          >
            <span
              className="menu-icon"
              aria-hidden="true"
            >
              💰
            </span>

            <span>
              Billetera
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

            {/* =========================
                CUENTA
            ========================== */}

            <div className="side-menu-title">
              CUENTA
            </div>

            {/* MI PERFIL */}

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
                👤
              </span>

              <span>
                Mi perfil
              </span>

              <span
                className="menu-arrow"
                aria-hidden="true"
              >
                ›
              </span>
            </button>

            {/* MIS PEDIDOS */}

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
                📦
              </span>

              <span>
                Mis pedidos
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
              className="side-menu-item"
              onClick={() =>
                setMenuOpen(false)
              }
            >
              <span
                className="menu-icon"
                aria-hidden="true"
              >
                🎧
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

            {/* =========================
                ADMINISTRACIÓN
            ========================== */}

            {isAdmin && (
              <>
                <div className="side-menu-title">
                  ADMINISTRACIÓN
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
                    ⚙️
                  </span>

                  <span>
                    Panel administrativo
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

            {/* CERRAR SESIÓN */}

            <button
              type="button"
              className="side-menu-item"
              onClick={handleLogout}
              style={{
                marginTop: "10px",
              }}
            >
              <span
                className="menu-icon"
                aria-hidden="true"
              >
                🚪
              </span>

              <span>
                Cerrar sesión
              </span>

              <span
                className="menu-arrow"
                aria-hidden="true"
              >
                ›
              </span>
            </button>
