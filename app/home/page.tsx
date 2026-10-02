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

  useEffect(() => {
    let mounted = true;

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

      setUsername(name);

      setIsAdmin(
        email.trim().toLowerCase() ===
          ADMIN_EMAIL.toLowerCase()
      );

      await loadStatistics(
        session.user.id
      );

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

        setUsername(name);

        setIsAdmin(
          email.trim().toLowerCase() ===
            ADMIN_EMAIL.toLowerCase()
        );

        await loadStatistics(
          session.user.id
        );
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  /*
   * =========================
   * ESTADÍSTICAS DEL CLIENTE
   * =========================
   */

  async function loadStatistics(
    userId: string
  ) {
    /*
     * =========================
     * ÓRDENES
     * =========================
     */

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

    /*
     * =========================
     * GASTO TOTAL
     * =========================
     *
     * Solo contamos órdenes
     * completadas o confirmadas.
     */

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

    /*
     * =========================
     * DINERO DEPOSITADO
     * =========================
     *
     * Por ahora se mantiene la
     * misma fuente utilizada por
     * el sistema actual: balance
     * de la cuenta.
     */

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

  /*
   * =========================
   * CERRAR SESIÓN
   * =========================
   */

  async function logout() {
    setMenuOpen(false);

    await supabase.auth.signOut();

    router.replace("/");
  }

  /*
   * =========================
   * NAVEGACIÓN
   * =========================
   */

  function goTo(path: string) {
    setMenuOpen(false);
    router.push(path);
  }

  /*
   * =========================
   * LOADING
   * =========================
   */

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
                  className="menu-icon home-icon"
                  aria-hidden="true"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M3 10.5L12 3l9 7.5"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    <path
                      d="M5.5 9.5V21h13V9.5"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    <path
                      d="M9.5 21v-6h5v6"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
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
                  >
                    <path
                      d="M6 7.5h12"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />

                    <path
                      d="M7 7.5l1 13h8l1-13"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    <path
                      d="M9 4h6"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
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


              {/* SERVICIOS */}

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
                  >
                    <path
                      d="M21 4L3.8 10.6c-.9.35-.88.85-.16 1.08l4.4 1.37 1.68 5.1c.21.58.1.81.7.81.46 0 .66-.21.91-.46l2.13-2.07 4.43 3.27c.81.45 1.39.22 1.59-.75L21.8 5.05C22.1 3.85 21.63 3.47 21 4Z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
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
                  className="menu-icon gift-icon"
                  aria-hidden="true"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <rect
                      x="3.5"
                      y="8"
                      width="17"
                      height="12"
                      rx="2"
                      stroke="currentColor"
                      strokeWidth="1.7"
                    />

                    <path
                      d="M3.5 11h17"
                      stroke="currentColor"
                      strokeWidth="1.7"
                    />

                    <path
                      d="M12 8v12"
                      stroke="currentColor"
                      strokeWidth="1.7"
                    />

                    <path
                      d="M12 8H8.5C7.4 8 6.5 7.1 6.5 6s.9-2 2-2c2 0 3.5 2.2 3.5 4Z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />

                    <path
                      d="M12 8h3.5c1.1 0 2-.9 2-2s-.9-2-2-2c-2 0-3.5 2.2-3.5 4Z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />
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
                  >
                    <path
                      d="M13.2 2.8L5 13h5l-1.2 8.2L17.8 11h-5l.4-8.2Z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
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


              {/* FINANZAS */}

              <div className="side-menu-section-title">

                <span />

                FINANZAS

                <span />

              </div>


              {/* BILLETERA */}

              <button
                type="button"
                className="side-menu-item"
                onClick={() =>
                  goTo("/balance")
                }
              >

                <span
                  className="menu-icon"
                  aria-hidden="true"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <rect
                      x="3.5"
                      y="6"
                      width="17"
                      height="13"
                      rx="2.5"
                      stroke="currentColor"
                      strokeWidth="1.7"
                    />

                    <path
                      d="M16 12h4.5"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                    />

                    <circle
                      cx="16"
                      cy="12"
                      r="1.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                  </svg>
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
                  goTo("/statistics")
                }
              >

                <span
                  className="menu-icon"
                  aria-hidden="true"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M4 19V5"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                    />

                    <path
                      d="M4 19h16"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                    />

                    <path
                      d="M7 15l3-4 3 2 5-6"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
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


              {/* CUENTA */}

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
                  >
                    <circle
                      cx="12"
                      cy="8"
                      r="3.5"
                      stroke="currentColor"
                      strokeWidth="1.7"
                    />

                    <path
                      d="M5 20c.8-3.5 3.1-5.5 7-5.5s6.2 2 7 5.5"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                    />
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

{/* =========================
    PANEL DEL ADMINISTRADOR
========================== */}

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
          <circle cx="12" cy="12" r="3" />
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
)
}
