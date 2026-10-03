"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

const ADMIN_EMAIL = "juliocesarblancomedina08@gmail.com";

type AdminService = {
  name: string;
  description: string;
  icon: string;
  route: string;
};

const adminServices: AdminService[] = [
  {
    name: "SOPORTE",
    description: "Revisar y responder consultas de clientes.",
    icon: "🆘",
    route: "/admin/support",
  },
  {
    name: "BALANCES",
    description: "Revisar el balance disponible de los clientes.",
    icon: "💰",
    route: "/admin/balances",
  },
  {
    name: "ÓRDENES",
    description: "Revisar pedidos y detectar órdenes atascadas.",
    icon: "🛒",
    route: "/admin/orders",
  },
  {
    name: "CLIENTES",
    description: "Ver los usuarios y correos registrados.",
    icon: "👥",
    route: "/admin/clients",
  },
  {
    name: "MOVIMIENTOS",
    description: "Revisar depósitos, gastos y movimientos.",
    icon: "💳",
    route: "/admin/movements",
  },
  {
    name: "PRODUCTOS NO ACREDITADOS",
    description: "Revisar productos pagados que no fueron acreditados.",
    icon: "⚠️",
    route: "/admin/uncredited",
  },
];

export default function AdminPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [email, setEmail] = useState("");

  useEffect(() => {
    let mounted = true;

    async function verifyAdmin() {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (error || !session?.user) {
          router.replace("/login");
          return;
        }

        const userEmail =
          session.user.email?.trim().toLowerCase() || "";

        if (userEmail !== ADMIN_EMAIL.toLowerCase()) {
          router.replace("/home");
          return;
        }

        setEmail(session.user.email || ADMIN_EMAIL);
        setAuthorized(true);
        setLoading(false);
      } catch {
        if (mounted) router.replace("/login");
      }
    }

    verifyAdmin();

    return () => {
      mounted = false;
    };
  }, [router]);

  function openService(route: string) {
    router.push(route);
  }

  function goHome() {
    router.push("/home");
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  if (loading) {
    return (
      <main className="admin-page">
        <div className="admin-loading">
          <div className="admin-loading-icon">👑</div>
          <div className="admin-loading-line" />
          <p>VERIFICANDO ACCESO...</p>
          <span>STORE GAMING · SEGURIDAD</span>
        </div>
        <AdminStyles />
      </main>
    );
  }

  if (!authorized) return null;

  return (
    <main className="admin-page">
      <div className="admin-background-glow" />

      <div className="admin-shell">
        <header className="admin-header">
          <button
            type="button"
            className="admin-header-button"
            onClick={goHome}
            aria-label="Volver a la tienda"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          <div className="admin-brand">
            <div className="admin-brand-mark">
              <span>SG</span>
              <i />
            </div>

            <div className="admin-brand-text">
              <span className="admin-brand-name">
                STORE <b>GAMING</b>
              </span>
              <span className="admin-brand-subtitle">
                CONTROL CENTER
              </span>
            </div>
          </div>

          <button
            type="button"
            className="admin-header-button admin-logout"
            onClick={logout}
            aria-label="Cerrar sesión"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <path d="M10 17l5-5-5-5" />
              <path d="M15 12H3" />
              <path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" />
            </svg>
          </button>
        </header>

        <section className="admin-account-card">
          <div className="admin-account-avatar">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              aria-hidden="true"
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21a8 8 0 0 1 16 0" />
            </svg>
            <span className="admin-avatar-status" />
          </div>

          <div className="admin-account-info">
            <span className="admin-overline">
              SESIÓN ADMINISTRADORA
            </span>
            <strong>{email}</strong>
            <span className="admin-account-caption">
              Acceso de administración
            </span>
          </div>

          <div className="admin-account-status">
            <span />
            ACTIVO
          </div>
        </section>

        <section className="admin-intro">
          <div className="admin-section-label">
            <span />
            CENTRO DE CONTROL
          </div>

          <h1>
            ADMIN<span>ISTRACIÓN</span>
          </h1>

          <p>
            Gestiona los servicios de tu tienda desde un solo lugar.
          </p>

          <div className="admin-intro-line">
            <span />
          </div>
        </section>

        <section className="admin-services-section">
          <div className="admin-services-heading">
            <div>
              <h2>Servicios disponibles</h2>
              <p>Selecciona un módulo para continuar.</p>
            </div>

            <span className="admin-service-count">
              0{adminServices.length} MÓDULOS
            </span>
          </div>

          <div className="admin-services">
            {adminServices.map((service, index) => (
              <button
                key={service.route}
                type="button"
                className="admin-service-card"
                onClick={() => openService(service.route)}
                style={{ animationDelay: `${index * 55}ms` }}
              >
                <div className="admin-service-index">
                  {String(index + 1).padStart(2, "0")}
                </div>

                <div className="admin-service-icon">
                  {service.icon}
                </div>

                <div className="admin-service-content">
                  <strong>{service.name}</strong>
                  <span>{service.description}</span>
                </div>

                <div className="admin-service-arrow">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    aria-hidden="true"
                  >
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="admin-security-card">
          <div className="admin-security-icon">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              aria-hidden="true"
            >
              <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>

          <div className="admin-security-content">
            <strong>PANEL PROTEGIDO</strong>
            <p>
              Este apartado está disponible únicamente para la cuenta
              administradora autorizada.
            </p>
          </div>

          <span className="admin-security-badge">SEGURO</span>
        </section>

        <footer className="admin-footer">
          <div className="admin-footer-brand">
            STORE <b>GAMING</b>
          </div>

          <span>PANEL DE ADMINISTRACIÓN</span>

          <small>
            © 2026 STORE GAMING · TODOS LOS DERECHOS RESERVADOS
          </small>
        </footer>
      </div>

      <AdminStyles />
    </main>
  );
}

function AdminStyles() {
  return (
    <style jsx global>{`
      .admin-page {
        --admin-red: #ff3047;
        --admin-bg: #08090c;
        --admin-panel: rgba(18, 20, 26, 0.94);
        --admin-border: rgba(255, 255, 255, 0.075);
        position: relative;
        isolation: isolate;
        min-height: 100dvh;
        overflow: hidden;
        padding: 22px 16px 28px;
        color: #f5f6fa;
        background:
          radial-gradient(
            ellipse at 50% -12%,
            rgba(255, 48, 71, 0.14),
            transparent 43%
          ),
          var(--admin-bg);
        font-family: Arial, Helvetica, sans-serif;
      }

      .admin-page *,
      .admin-page *::before,
      .admin-page *::after {
        box-sizing: border-box;
      }

      .admin-background-glow {
        position: absolute;
        z-index: -1;
        top: 220px;
        left: 50%;
        width: 600px;
        height: 600px;
        transform: translateX(-50%);
        pointer-events: none;
        background: radial-gradient(
          circle,
          rgba(255, 35, 58, 0.045),
          transparent 68%
        );
      }

      .admin-shell {
        width: 100%;
        max-width: 780px;
        margin: 0 auto;
      }

      .admin-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        min-height: 62px;
        padding-bottom: 19px;
        border-bottom: 1px solid var(--admin-border);
      }

      .admin-header-button {
        display: inline-flex;
        flex: 0 0 42px;
        align-items: center;
        justify-content: center;
        width: 42px;
        height: 42px;
        padding: 0;
        color: #e6e7ed;
        background: #15171d;
        border: 1px solid #292b33;
        border-radius: 12px;
        cursor: pointer;
        transition: 0.2s ease;
        -webkit-tap-highlight-color: transparent;
      }

      .admin-header-button svg {
        width: 21px;
        height: 21px;
      }

      .admin-header-button:hover {
        background: #20222a;
        border-color: #494b55;
      }

      .admin-header-button:active {
        transform: scale(0.95);
      }

      .admin-logout:hover {
        color: #ff5265;
        border-color: rgba(255, 48, 71, 0.5);
        background: rgba(255, 48, 71, 0.08);
      }

      .admin-brand {
        display: flex;
        flex: 1;
        align-items: center;
        justify-content: center;
        gap: 11px;
        min-width: 0;
      }

      .admin-brand-mark {
        position: relative;
        display: flex;
        flex: 0 0 42px;
        align-items: center;
        justify-content: center;
        width: 42px;
        height: 42px;
        color: white;
        background: linear-gradient(145deg, #ff4258, #b70d26);
        border-radius: 12px;
        box-shadow: 0 5px 22px rgba(255, 35, 58, 0.17);
        transform: skew(-3deg);
      }

      .admin-brand-mark span {
        font-size: 15px;
        font-weight: 950;
        letter-spacing: -1px;
      }

      .admin-brand-mark i {
        position: absolute;
        right: 5px;
        bottom: 5px;
        width: 5px;
        height: 5px;
        background: white;
        border-radius: 50%;
      }

      .admin-brand-text {
        display: flex;
        flex-direction: column;
        gap: 4px;
        min-width: 0;
      }

      .admin-brand-name {
        color: #f4f4f7;
        font-size: 14px;
        font-weight: 900;
        letter-spacing: 0.35px;
        white-space: nowrap;
      }

      .admin-brand-name b,
      .admin-footer-brand b {
        color: var(--admin-red);
      }

      .admin-brand-subtitle {
        color: #777b87;
        font-size: 9px;
        font-weight: 800;
        letter-spacing: 2px;
      }

      .admin-account-card {
        display: flex;
        align-items: center;
        gap: 13px;
        margin-top: 25px;
        padding: 16px;
        background:
          linear-gradient(
            110deg,
            rgba(255, 48, 71, 0.055),
            transparent 48%
          ),
          var(--admin-panel);
        border: 1px solid var(--admin-border);
        border-radius: 16px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.13);
      }

      .admin-account-avatar {
        position: relative;
        display: flex;
        flex: 0 0 46px;
        align-items: center;
        justify-content: center;
        width: 46px;
        height: 46px;
        color: #ff6475;
        background: rgba(255, 48, 71, 0.09);
        border: 1px solid rgba(255, 48, 71, 0.18);
        border-radius: 13px;
      }

      .admin-account-avatar svg {
        width: 24px;
        height: 24px;
      }

      .admin-avatar-status {
        position: absolute;
        right: -3px;
        bottom: -3px;
        width: 11px;
        height: 11px;
        background: #42d995;
        border: 2px solid #12141a;
        border-radius: 50%;
      }

      .admin-account-info {
        display: flex;
        flex: 1;
        flex-direction: column;
        gap: 5px;
        min-width: 0;
      }

      .admin-overline {
        color: #9296a2;
        font-size: 9px;
        font-weight: 800;
        letter-spacing: 1.4px;
      }

      .admin-account-info strong {
        overflow-wrap: anywhere;
        color: #f0f1f5;
        font-size: 12px;
        font-weight: 700;
      }

      .admin-account-caption {
        color: #777c88;
        font-size: 10px;
      }

      .admin-account-status {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        flex-shrink: 0;
        padding: 7px 9px;
        color: #58dfa0;
        background: rgba(52, 211, 153, 0.07);
        border: 1px solid rgba(52, 211, 153, 0.15);
        border-radius: 7px;
        font-size: 9px;
        font-weight: 900;
        letter-spacing: 0.5px;
      }

      .admin-account-status span {
        width: 6px;
        height: 6px;
        background: #42d995;
        border-radius: 50%;
        box-shadow: 0 0 8px rgba(66, 217, 149, 0.4);
      }

      .admin-intro {
        padding: 38px 2px 25px;
      }

      .admin-section-label {
        display: flex;
        align-items: center;
        gap: 9px;
        margin-bottom: 13px;
        color: #a0a3ad;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 2.2px;
      }

      .admin-section-label span {
        width: 19px;
        height: 2px;
        background: var(--admin-red);
        box-shadow: 0 0 10px rgba(255, 48, 71, 0.35);
      }

      .admin-intro h1 {
        margin: 0;
        color: #f7f7fa;
        font-size: clamp(27px, 6vw, 38px);
        font-weight: 950;
        line-height: 1.1;
        letter-spacing: -1.3px;
      }

      .admin-intro h1 span {
        color: var(--admin-red);
      }

      .admin-intro > p {
        max-width: 450px;
        margin: 12px 0 0;
        color: #999daa;
        font-size: 13px;
        line-height: 1.65;
      }

      .admin-intro-line {
        width: 100%;
        height: 1px;
        margin-top: 25px;
        background: linear-gradient(
          90deg,
          rgba(255, 48, 71, 0.55),
          rgba(255, 255, 255, 0.07) 45%,
          transparent
        );
      }

      .admin-intro-line span {
        display: block;
        width: 56px;
        height: 2px;
        background: var(--admin-red);
      }

      .admin-services-heading {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 15px;
      }

      .admin-services-heading h2 {
        margin: 0;
        color: #f0f1f5;
        font-size: 15px;
        font-weight: 850;
      }

      .admin-services-heading p {
        margin: 6px 0 0;
        color: #858996;
        font-size: 11px;
      }

      .admin-service-count {
        flex-shrink: 0;
        padding: 6px 8px;
        color: #b8bbc5;
        background: #15171d;
        border: 1px solid #292b33;
        border-radius: 6px;
        font-size: 9px;
        font-weight: 800;
        letter-spacing: 0.7px;
      }

      .admin-services {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }

      .admin-service-card {
        position: relative;
        display: flex;
        align-items: flex-start;
        gap: 12px;
        width: 100%;
        min-width: 0;
        min-height: 135px;
        padding: 17px 14px;
        overflow: hidden;
        color: #f5f6fa;
        text-align: left;
        background: linear-gradient(
          145deg,
          rgba(25, 27, 34, 0.98),
          rgba(15, 16, 21, 0.98)
        );
        border: 1px solid rgba(255, 255, 255, 0.075);
        border-radius: 14px;
        cursor: pointer;
        animation: adminCardIn 0.4s ease both;
        transition:
          transform 0.2s ease,
          border-color 0.2s ease,
          background 0.2s ease,
          box-shadow 0.2s ease;
        -webkit-tap-highlight-color: transparent;
      }

      .admin-service-card::before {
        position: absolute;
        top: 0;
        left: 0;
        width: 3px;
        height: 0;
        content: "";
        background: var(--admin-red);
        transition: height 0.22s ease;
      }

      .admin-service-card::after {
        position: absolute;
        top: -42px;
        right: -42px;
        width: 90px;
        height: 90px;
        content: "";
        pointer-events: none;
        background: radial-gradient(
          circle,
          rgba(255, 48, 71, 0.075),
          transparent 70%
        );
        opacity: 0;
        transition: opacity 0.2s ease;
      }

      .admin-service-card:hover {
        transform: translateY(-3px);
        background: linear-gradient(
          145deg,
          rgba(31, 27, 34, 0.99),
          rgba(18, 17, 23, 0.99)
        );
        border-color: rgba(255, 48, 71, 0.34);
        box-shadow: 0 10px 26px rgba(0, 0, 0, 0.22);
      }

      .admin-service-card:hover::before {
        height: 100%;
      }

      .admin-service-card:hover::after {
        opacity: 1;
      }

      .admin-service-card:active {
        transform: scale(0.985);
      }

      .admin-service-card:focus-visible,
      .admin-header-button:focus-visible {
        outline: 2px solid var(--admin-red);
        outline-offset: 3px;
      }

      .admin-service-index {
        position: absolute;
        top: 10px;
        right: 12px;
        color: #535762;
        font-size: 9px;
        font-weight: 800;
        letter-spacing: 1px;
      }

      .admin-service-icon {
        display: flex;
        flex: 0 0 42px;
        align-items: center;
        justify-content: center;
        width: 42px;
        height: 42px;
        margin-top: 2px;
        background: rgba(255, 255, 255, 0.045);
        border: 1px solid rgba(255, 255, 255, 0.055);
        border-radius: 11px;
        font-size: 21px;
        transition:
          background 0.2s ease,
          border-color 0.2s ease,
          transform 0.2s ease;
      }

      .admin-service-card:hover .admin-service-icon {
        background: rgba(255, 48, 71, 0.09);
        border-color: rgba(255, 48, 71, 0.16);
        transform: translateY(-1px);
      }

      .admin-service-content {
        display: flex;
        flex: 1;
        min-width: 0;
        flex-direction: column;
        gap: 6px;
      }

      .admin-service-title {
        margin: 0;
        color: #ffffff;
        font-size: 15px;
        font-weight: 800;
        line-height: 1.35;
        letter-spacing: -0.2px;
      }

      .admin-service-description {
        margin: 0;
        color: #92929d;
        font-size: 12px;
        line-height: 1.6;
      }

      .admin-service-arrow {
        display: flex;
        flex: 0 0 28px;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        margin-top: 6px;
        color: #777783;
        font-size: 24px;
        line-height: 1;
        transition:
          color 0.2s ease,
          transform 0.2s ease;
      }

      .admin-service-card:hover .admin-service-arrow {
        color: #ff3047;
        transform: translateX(3px);
      }

      .admin-security-notice {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        margin-top: 24px;
        padding: 16px;
        background: rgba(255, 255, 255, 0.025);
        border: 1px solid rgba(255, 255, 255, 0.065);
        border-radius: 14px;
      }

      .admin-security-icon {
        flex: 0 0 auto;
        font-size: 19px;
      }

      .admin-security-text {
        margin: 0;
        color: #9b9ba5;
        font-size: 12px;
        line-height: 1.7;
      }

      .admin-security-text strong {
        color: #e6e6eb;
        font-weight: 750;
      }

      .admin-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-top: 28px;
        padding-top: 18px;
        border-top: 1px solid rgba(255, 255, 255, 0.07);
        color: #71717c;
        font-size: 11px;
      }

      .admin-footer-brand {
        color: #b8b8c2;
        font-weight: 800;
        letter-spacing: 0.5px;
      }

      .admin-footer-brand span {
        color: #ff3047;
      }

      .admin-footer-version {
        color: #777783;
      }

      @keyframes adminFadeUp {
        from {
          opacity: 0;
          transform: translateY(12px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @media (max-width: 640px) {
        .admin-page {
          padding: 18px 14px 32px;
        }

        .admin-header {
          align-items: flex-start;
          margin-bottom: 26px;
        }

        .admin-brand {
          gap: 9px;
        }

        .admin-brand-icon {
          width: 38px;
          height: 38px;
          font-size: 19px;
        }

        .admin-brand-title {
          font-size: 15px;
        }

        .admin-brand-subtitle {
          font-size: 10px;
        }

        .admin-status {
          gap: 6px;
          padding: 7px 9px;
          font-size: 10px;
        }

        .admin-status-dot {
          width: 6px;
          height: 6px;
        }

        .admin-intro {
          margin-bottom: 22px;
        }

        .admin-intro h1 {
          font-size: clamp(27px, 7vw, 34px);
        }

        .admin-intro p {
          font-size: 13px;
        }

        .admin-services-grid {
          grid-template-columns: 1fr;
          gap: 11px;
        }

        .admin-service-card {
          min-height: 104px;
          padding: 17px 14px;
          gap: 12px;
          border-radius: 15px;
        }

        .admin-service-icon {
          flex-basis: 38px;
          width: 38px;
          height: 38px;
          border-radius: 10px;
          font-size: 19px;
        }

        .admin-service-title {
          font-size: 14px;
        }

        .admin-service-description {
          font-size: 11px;
        }

        .admin-security-notice {
          margin-top: 20px;
          padding: 14px;
        }

        .admin-footer {
          align-items: flex-start;
          flex-direction: column;
          gap: 8px;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .admin-service-card,
        .admin-service-icon,
        .admin-service-arrow {
          animation: none !important;
          transition: none !important;
        }
      }
    `}</style>
  );
}
