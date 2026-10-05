"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

type Service = {
  title: string;
  description: string;
  icon: string;
  path?: string;
  comingSoon?: boolean;
};

type StoreOrder = {
  id: string;
  status: string;
  retail_price: number | null;
  created_at: string;
};

type Notification = {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
};

const ADMIN_EMAIL = "juliocesarblancomedina@gmail.com";

const services: Service[] = [
  {
    title: "Recargar juegos",
    description:
      "Compra diamantes, monedas y otros productos para tus juegos favoritos.",
    icon: "🎮",
    path: "/top-up",
  },
  {
    title: "Tarjetas de regalo",
    description:
      "Compra códigos digitales para diferentes plataformas y juegos.",
    icon: "🎁",
    path: "/gift-cards",
  },
  {
    title: "Venta de saldo móvil",
    description:
      "Próximamente podrás realizar operaciones de saldo móvil de forma rápida y segura.",
    icon: "📱",
    comingSoon: true,
  },
  {
    title: "Compra y venta de cripto",
    description:
      "Próximamente podrás comprar y vender criptomonedas de forma rápida y segura.",
    icon: "🪙",
    comingSoon: true,
  },
];

export default function HomePage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  const [isAdmin, setIsAdmin] = useState(false);

  const [ordersCreated, setOrdersCreated] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState("");

  const loadNotifications = async (userId: string) => {
    if (!userId) return;

    setNotificationsLoading(true);

    try {
      const { data, error } = await supabase
        .from("notifications")
        .select(
          "id,title,message,type,is_read,created_at"
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Error cargando notificaciones:", error);
        return;
      }

      const notificationData = (data || []) as Notification[];

      setNotifications(notificationData);

      setNotificationCount(
        notificationData.filter(
          (item) => !item.is_read
        ).length
      );
    } catch (error) {
      console.error(
        "Error inesperado cargando notificaciones:",
        error
      );
    } finally {
      setNotificationsLoading(false);
    }
  };

  const markNotificationAsRead = async (
    notificationId: string
  ) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId);

      if (error) {
        console.error(
          "Error marcando notificación:",
          error
        );
        return;
      }

      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === notificationId
            ? {
                ...notification,
                is_read: true,
              }
            : notification
        )
      );

      setNotificationCount((prev) =>
        Math.max(0, prev - 1)
      );
    } catch (error) {
      console.error(
        "Error inesperado:",
        error
      );
    }
  };

  const markAllNotificationsAsRead = async () => {
    if (!currentUserId) return;

    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", currentUserId)
        .eq("is_read", false);

      if (error) {
        console.error(
          "Error marcando todas las notificaciones:",
          error
        );
        return;
      }

      setNotifications((prev) =>
        prev.map((notification) => ({
          ...notification,
          is_read: true,
        }))
      );

      setNotificationCount(0);
    } catch (error) {
      console.error(
        "Error inesperado:",
        error
      );
    }
  };

  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!mounted) return;

        if (!user) {
          router.push("/login");
          return;
        }

        const email = user.email || "";

        setCurrentUserId(user.id);

        setUsername(
          user.user_metadata?.username ||
            user.user_metadata?.name ||
            email.split("@")[0]
        );

        setIsAdmin(
          email.toLowerCase() ===
            ADMIN_EMAIL.toLowerCase()
        );

        await loadNotifications(user.id);
      } catch (error) {
        console.error(
          "Error obteniendo usuario:",
          error
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadUser();

    return () => {
      mounted = false;
    };
  }, [router]);

  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel(
        `notifications-${currentUserId}`
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${currentUserId}`,
        },
        (payload) => {
          const newNotification =
            payload.new as Notification;

          setNotifications((prev) => [
            newNotification,
            ...prev,
          ]);

          if (!newNotification.is_read) {
            setNotificationCount(
              (prev) => prev + 1
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  const loadStatistics = async () => {
    if (!currentUserId) return;

    try {
      const { data, error } = await supabase
        .from("topup_orders")
        .select(
          "id,status,retail_price,created_at"
        )
        .eq("user_id", currentUserId);

      if (error) {
        console.error(
          "Error cargando estadísticas:",
          error
        );
        return;
      }

      const orders = (data || []) as StoreOrder[];

      setOrdersCreated(orders.length);

      const completedOrders = orders.filter(
        (order) =>
          order.status === "completed" ||
          order.status === "success" ||
          order.status === "delivered"
      );

      const spent = completedOrders.reduce(
        (total, order) =>
          total +
          Number(order.retail_price || 0),
        0
      );

      setTotalSpent(spent);
    } catch (error) {
      console.error(
        "Error inesperado:",
        error
      );
    }
  };

  useEffect(() => {
    if (currentUserId) {
      loadStatistics();
    }
  }, [currentUserId]);

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      router.push("/login");
    } catch (error) {
      console.error(
        "Error cerrando sesión:",
        error
      );
    }
  };

  const goTo = (path: string) => {
    setMenuOpen(false);
    router.push(path);
  };

  if (loading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div className="store-loading">
          <div className="store-spinner" />
          <p>
            Cargando STORE GAMING...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="store-home-page">

      {/* =========================
          SIDEBAR
      ========================== */}

      {menuOpen && (
        <div
          className="side-menu-overlay"
          onClick={() =>
            setMenuOpen(false)
          }
        />
      )}

      <aside
        className={`side-menu ${
          menuOpen
            ? "side-menu-open"
            : ""
        }`}
      >
        <div className="side-menu-header">

          <div>
            <div className="side-menu-title">
              STORE GAMING
            </div>

            <div className="side-menu-subtitle">
              Panel principal
            </div>
          </div>

          <button
            type="button"
            className="side-menu-close"
            onClick={() =>
              setMenuOpen(false)
            }
          >
            ✕
          </button>
        </div>

        <div className="side-menu-content">

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
              🏠
            </span>

            <span className="menu-text">
              Inicio
            </span>
          </button>

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
              🎮
            </span>

            <span className="menu-text">
              Recargar juegos
            </span>
          </button>

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

            <span className="menu-text">
              Tarjetas de regalo
            </span>
          </button>

          {/* =========================
              ESTADÍSTICAS
          ========================== */}

          <div className="side-menu-section-title">
            ESTADÍSTICAS
          </div>

          <div className="side-menu-stats">

            <div className="side-stat-card">

              <span className="side-stat-icon">
                🛒
              </span>

              <div>
                <strong>
                  {ordersCreated}
                </strong>

                <small>
                  Pedidos
                </small>
              </div>

            </div>

            <div className="side-stat-card">

              <span className="side-stat-icon">
                💰
              </span>

              <div>
                <strong>
                  $
                  {Number(
                    totalSpent
                  ).toFixed(2)}
                </strong>

                <small>
                  Gastado
                </small>
              </div>

            </div>

          </div>

          {/* =========================
              CUENTA
          ========================== */}

          <div className="side-menu-section-title">
            CUENTA
          </div>

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

            <span className="menu-text">
              Perfil
            </span>
          </button>

          <button
            type="button"
            className="side-menu-item"
            onClick={() =>
              goTo("/support")
            }
          >
            <span
              className="menu-icon"
              aria-hidden="true"
            >
              💬
            </span>

            <span className="menu-text">
              Soporte
            </span>
          </button>

          {/* =========================
              ADMINISTRACIÓN
          ========================== */}

          {isAdmin && (
            <>
              <div className="side-menu-section-title">
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

                <span className="menu-text">
                  Panel de administración
                </span>
              </button>
            </>
          )}

          {/* =========================
              CERRAR SESIÓN
          ========================== */}

          <button
            type="button"
            className="side-menu-item side-menu-logout"
            onClick={logout}
          >
            <span
              className="menu-icon"
              aria-hidden="true"
            >
              🚪
            </span>

            <span className="menu-text">
              Cerrar sesión
            </span>
          </button>

        </div>
      </aside>

      {/* =========================
          HEADER
      ========================== */}

      <header className="store-header">

        <button
          type="button"
          className="menu-toggle"
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

        <div className="header-actions">

          <div className="notification-wrapper">

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
              🔔

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
                    <strong>
                      Notificaciones
                    </strong>

                    <span>
                      {notificationCount >
                      0
                        ? `${notificationCount} sin leer`
                        : "Todo leído"}
                    </span>
                  </div>

                  {notificationCount >
                    0 && (
                    <button
                      type="button"
                      onClick={
                        markAllNotificationsAsRead
                      }
                    >
                      Marcar todo
                    </button>
                  )}

                </div>

                <div className="notification-panel-content">

                  {notificationsLoading ? (
                    <div className="notification-empty">
                      Cargando...
                    </div>
                  ) : notifications.length ===
                    0 ? (
                    <div className="notification-empty">

                      <div
                        style={{
                          fontSize: "32px",
                          marginBottom: "8px",
                        }}
                      >
                        🔔
                      </div>

                      <strong>
                        No tienes notificaciones
                      </strong>

                      <span>
                        Aquí aparecerán tus
                        avisos importantes.
                      </span>

                    </div>
                  ) : (
                    notifications.map(
                      (notification) => (
                        <button
                          key={
                            notification.id
                          }
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
                              {
                                notification.title
                              }
                            </strong>

                            <span>
                              {
                                notification.message
                              }
                            </span>

                            <small>
                              {new Date(
                                notification.created_at
                              ).toLocaleString(
                                "es-ES",
                                {
                                  day: "2-digit",
                                  month:
                                    "2-digit",
                                  year:
                                    "numeric",
                                  hour:
                                    "2-digit",
                                  minute:
                                    "2-digit",
                                }
                              )}
                            </small>

                          </div>

                          {!notification.is_read && (
                            <span className="notification-dot" />
                          )}

                        </button>
                      )
                    )
                  )}

                </div>
              </div>
            )}

          </div>
        </div>
      </header>

      {/* =========================
          HERO
      ========================== */}

      <section className="store-hero">

  <div className="store-hero-content">

    <span className="store-hero-badge">
      🎮 TU TIENDA GAMING
    </span>

    <h1>
      ¡Hola, {username}! 👋
    </h1>

    <p>
      Bienvenido a STORE GAMING.
      <br />
      Recarga tus juegos de forma
      rápida, segura y sencilla.
    </p>

    <div className="store-hero-actions">

      <button
        type="button"
        className="store-primary-button"
        onClick={() =>
          goTo("/top-up")
        }
      >
        🎮 Recargar juegos
      </button>

      <button
        type="button"
        className="store-secondary-button"
        onClick={() =>
          goTo("/gift-cards")
        }
      >
        🎁 Ver tarjetas
      </button>

    </div>

  </div>

</section>

{/* =========================
    SERVICIOS
========================== */}

<section className="store-section">

  <div className="store-section-heading">

    <span className="store-section-label">
      NUESTROS SERVICIOS
    </span>

    <h2>
      Todo lo que necesitas
    </h2>

    <p>
      Encuentra tus productos digitales
      favoritos en un solo lugar.
    </p>

  </div>

  <div className="services-grid">

    {services.map((service) => {

      const cardContent = (
        <>
          <div className="service-icon">
            {service.icon}
          </div>

          <div className="service-content">

            <h3>
              {service.title}
            </h3>

            <p>
              {service.description}
            </p>

            {!service.comingSoon && (
              <span className="service-link">
                Ver servicio →
              </span>
            )}

          </div>

          {service.comingSoon && (
            <div
              style={{
                position: "absolute",
                top: "18px",
                right: "-45px",
                background: "#ff2d2d",
                color: "#fff",
                fontSize: "11px",
                fontWeight: 900,
                padding: "7px 48px",
                transform: "rotate(38deg)",
                letterSpacing: "0.7px",
                boxShadow:
                  "0 3px 12px rgba(0,0,0,.3)",
              }}
            >
              PRÓXIMAMENTE
            </div>
          )}

        </>
      );

      if (service.comingSoon) {
        return (
          <div
            key={service.title}
            className="service-card finance-service-card"
            style={{
              position: "relative",
              overflow: "hidden",
            }}
          >
            {cardContent}
          </div>
        );
      }

      return (
        <button
          type="button"
          key={service.title}
          className="service-card"
          onClick={() => {
            if (service.path) {
              goTo(service.path);
            }
          }}
        >
          {cardContent}
        </button>
      );

    })}

  </div>

</section>

{/* =========================
    BENEFICIOS
========================== */}

<section className="store-benefits">

  <div className="store-section-heading">

    <span className="store-section-label">
      ¿POR QUÉ STORE GAMING?
    </span>

    <h2>
      Compra con confianza
    </h2>

  </div>

  <div className="benefits-grid">

    <div className="benefit-card">

      <div className="benefit-icon">
        ⚡
      </div>

      <h3>
        Entrega rápida
      </h3>

      <p>
        Recibe tus productos digitales
        rápidamente después de completar
        tu compra.
      </p>

    </div>

    <div className="benefit-card">

      <div className="benefit-icon">
        🔒
      </div>

      <h3>
        Compra segura
      </h3>

      <p>
        Protegemos tus datos y procesamos
        tus compras de forma segura.
      </p>

    </div>

    <div className="benefit-card">

      <div className="benefit-icon">
        💬
      </div>

      <h3>
        Soporte
      </h3>

      <p>
        Estamos disponibles para ayudarte
        cuando necesites asistencia.
      </p>

    </div>

    <div className="benefit-card">

      <div className="benefit-icon">
        🎮
      </div>

      <h3>
        Variedad
      </h3>

      <p>
        Encuentra productos para tus juegos
        favoritos en un solo lugar.
      </p>

    </div>

  </div>

</section>

{/* =========================
    FOOTER
========================== */}

<footer className="store-footer">

  <div className="store-footer-main">

    <div>

      <h3>
        STORE GAMING
      </h3>

      <p>
        Tu tienda de productos digitales
        para gaming.
      </p>

    </div>

    <div>

      <h4>
        Servicios
      </h4>

      <button
        type="button"
        onClick={() =>
          goTo("/top-up")
        }
      >
        Recargar juegos
      </button>

      <button
        type="button"
        onClick={() =>
          goTo("/gift-cards")
        }
      >
        Tarjetas de regalo
      </button>

    </div>

    <div>

      <h4>
        Ayuda
      </h4>

      <button
        type="button"
        onClick={() =>
          goTo("/support")
        }
      >
        Soporte
      </button>

      <button
        type="button"
        onClick={() =>
          goTo("/profile")
        }
      >
        Mi perfil
      </button>

    </div>

  </div>

  <div className="store-footer-bottom">

    <span>
      © {new Date().getFullYear()} STORE GAMING
    </span>

    <span>
      Todos los derechos reservados.
    </span>

  </div>

</footer>

</main>
);
}
