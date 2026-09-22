"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

const ADMIN_EMAIL =
  "juliocesarblancomedina08@gmail.com";

type AdminService = {
  name: string;
  description: string;
  icon: string;
  route: string;
};

const adminServices: AdminService[] = [
  {
    name: "SOPORTE",
    description:
      "Revisar y responder consultas de clientes.",
    icon: "🆘",
    route: "/admin/support",
  },
  {
    name: "BALANCES",
    description:
      "Revisar el balance disponible de los clientes.",
    icon: "💰",
    route: "/admin/balances",
  },
  {
    name: "ÓRDENES",
    description:
      "Revisar pedidos y detectar órdenes atascadas.",
    icon: "🛒",
    route: "/admin/orders",
  },
  {
    name: "CLIENTES",
    description:
      "Ver los usuarios y correos registrados.",
    icon: "👥",
    route: "/admin/clients",
  },
  {
    name: "MOVIMIENTOS",
    description:
      "Revisar depósitos, gastos y movimientos.",
    icon: "💳",
    route: "/admin/movements",
  },
  {
    name: "PRODUCTOS NO ACREDITADOS",
    description:
      "Revisar productos pagados que no fueron acreditados.",
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
          session.user.email
            ?.trim()
            .toLowerCase() || "";

        if (
          userEmail !==
          ADMIN_EMAIL.toLowerCase()
        ) {
          router.replace("/home");
          return;
        }

        setEmail(
          session.user.email ||
            ADMIN_EMAIL
        );

        setAuthorized(true);
        setLoading(false);
      } catch {
        router.replace("/login");
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

          <div className="admin-loading-icon">
            👑
          </div>

          <p>
            VERIFICANDO ACCESO...
          </p>

        </div>

      </main>
    );
  }

  if (!authorized) {
    return null;
  }

  return (
    <main className="admin-page">

      {/* =========================
          ENCABEZADO
      ========================== */}

      <header className="admin-header">

        <button
          type="button"
          className="admin-back-button"
          onClick={goHome}
          aria-label="Volver"
        >
          ←
        </button>

        <div className="admin-header-title">

          <div className="admin-header-icon">
            👑
          </div>

          <div>

            <span>
              STORE GAMING
            </span>

            <h1>
              ADM PANEL
            </h1>

          </div>

        </div>

        <button
          type="button"
          className="admin-logout-button"
          onClick={logout}
          aria-label="Cerrar sesión"
        >
          ⇥
        </button>

      </header>

      {/* =========================
          ADMINISTRADOR
      ========================== */}

      <section className="admin-account-card">

        <div className="admin-account-icon">
          👤
        </div>

        <div className="admin-account-info">

          <span>
            ADMINISTRADOR
          </span>

          <strong>
            {email}
          </strong>

        </div>

        <div className="admin-account-status">

          <span />

          ACTIVO

        </div>

      </section>

      {/* =========================
          TÍTULO
      ========================== */}

      <section className="admin-intro">

        <span>
          CENTRO DE CONTROL
        </span>

        <h2>
          ADMINISTRACIÓN
        </h2>

        <p>
          Selecciona un servicio para
          administrar STORE GAMING.
        </p>

      </section>

      {/* =========================
          SERVICIOS
      ========================== */}

      <section className="admin-services">

        {adminServices.map(
          (service) => (
            <button
              key={service.route}
              type="button"
              className="admin-service-card"
              onClick={() =>
                openService(
                  service.route
                )
              }
            >

              <div className="admin-service-icon">
                {service.icon}
              </div>

              <div className="admin-service-content">

                <strong>
                  {service.name}
                </strong>

                <span>
                  {service.description}
                </span>

              </div>

              <b className="admin-service-arrow">
                →
              </b>

            </button>
          )
        )}

      </section>

      {/* =========================
          INFORMACIÓN
      ========================== */}

      <section className="admin-security-card">

        <div className="admin-security-icon">
          🔐
        </div>

        <div>

          <strong>
            PANEL PROTEGIDO
          </strong>

          <p>
            Este apartado está disponible
            únicamente para la cuenta
            administradora autorizada.
          </p>

        </div>

      </section>

      {/* =========================
          FOOTER
      ========================== */}

      <footer className="admin-footer">

        <strong>
          STORE GAMING
        </strong>

        <span>
          PANEL DE ADMINISTRACIÓN
        </span>

        <small>
          © 2026 STORE GAMING
        </small>

      </footer>

    </main>
  );
}
