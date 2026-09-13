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
];

export default function HomePage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

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

      const email = session.user.email || "usuario";
      const name = email.split("@")[0] || "usuario";

      setUsername(name);
      setLoading(false);
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session?.user) {
          router.replace("/");
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
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
            onClick={() => setMenuOpen(false)}
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
                onClick={() => setMenuOpen(false)}
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

              {/* PRINCIPAL */}

              <button
                type="button"
                className="side-menu-item active"
                onClick={() => goTo("/home")}
              >

                <span className="menu-icon home-icon">
                  ⌂
                </span>

                <span>
                  Hogar
                </span>

              </button>


              <button
                type="button"
                className="side-menu-item"
                onClick={() => goTo("/orders")}
              >

                <span className="menu-icon">
                  ▣
                </span>

                <span>
                  Órdenes
                </span>

              </button>


              {/* SERVICIOS */}

              <div className="side-menu-section-title">

                <span />

                SERVICIOS

                <span />

              </div>


              <button
                type="button"
                className="side-menu-item"
                onClick={() => goTo("/telegram-stars")}
              >

                <span className="menu-icon">
                  ☆
                </span>

                <span>
                  Estrellas de Telegram
                </span>

              </button>


              <button
                type="button"
                className="side-menu-item"
                onClick={() => goTo("/gift-cards")}
              >

                <span className="menu-icon gift-icon">
                  ▱
                </span>

                <span>
                  Tarjetas de regalo
                </span>

              </button>


              <button
                type="button"
                className="side-menu-item"
                onClick={() => goTo("/top-up")}
              >

                <span className="menu-icon">
                  ◇
                </span>

                <span>
                  Recargas TOP UP
                </span>

              </button>


              {/* FINANZAS */}

              <div className="side-menu-section-title">

                <span />

                FINANZAS

                <span />

              </div>


              <button
                type="button"
                className="side-menu-item"
                onClick={() => goTo("/balance")}
              >

                <span className="menu-icon">
                  ◉
                </span>

                <span>
                  Billetera
                </span>

              </button>


              <button
                type="button"
                className="side-menu-item"
                onClick={() => goTo("/statistics")}
              >

                <span className="menu-icon">
                  ▥
                </span>

                <span>
                  Estadísticas
                </span>

              </button>


              <button
                type="button"
                className="side-menu-item"
                onClick={() => goTo("/profile")}
              >

                <span className="menu-icon">
                  ♙
                </span>

                <span>
                  Perfil
                </span>

              </button>


              {/* SOPORTE */}

              <button
                type="button"
                className="side-menu-item support-item"
                onClick={() => goTo("/support")}
              >

                <span className="support-headset-icon">

                  <span className="support-head" />

                  <span className="support-headset" />

                  <span className="support-mic" />

                </span>

                <span>
                  Soporte
                </span>

              </button>

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
          onClick={() => setMenuOpen(true)}
          aria-label="Abrir menú"
        >

          <span />
          <span />
          <span />

        </button>


        <button
          type="button"
          className="store-logo"
          onClick={() => router.push("/home")}
          aria-label="STORE GAMING"
        >

          <span className="store-logo-text">

            <strong>
              STORE
            </strong>

            <span
              className="store-logo-cart"
              aria-hidden="true"
            >
              🛒
            </span>

            <b>
              GAMING
            </b>

          </span>

        </button>


        <div className="store-header-actions">
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

            HOLA

            <br />

            <span>
              @{username}
            </span>

          </h1>


          <p className="hero-text">

            Bienvenido a STORE GAMING.
            Selecciona un servicio para
            comenzar.

          </p>


          <div className="hero-stats">

            <div>

              <strong>
                ⚡
              </strong>

              <span>
                RÁPIDO
              </span>

            </div>


            <div>

              <strong>
                🔒
              </strong>

              <span>
                SEGURO
              </span>

            </div>


            <div>

              <strong>
                🎮
              </strong>

              <span>
                GAMING
              </span>

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
              onClick={() => router.push(service.route)}
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
