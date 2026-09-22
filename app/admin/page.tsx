"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

const ADMIN_EMAIL =
  "juliocesarblancomedina08@gmail.com";

export default function AdminPage() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [adminEmail, setAdminEmail] = useState("");

  useEffect(() => {
    checkAdmin();
  }, []);

  async function checkAdmin() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.email) {
        router.replace("/login");
        return;
      }

      const userEmail = user.email
        .trim()
        .toLowerCase();

      if (
        userEmail !==
        ADMIN_EMAIL.toLowerCase()
      ) {
        router.replace("/home");
        return;
      }

      setAdminEmail(user.email);
      setChecking(false);
    } catch {
      router.replace("/login");
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();

    router.replace("/login");
  }

  if (checking) {
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

  return (
    <main className="admin-page">

      {/* ENCABEZADO */}

      <header className="admin-header">

        <div className="admin-header-left">

          <div className="admin-crown">
            👑
          </div>

          <div>
            <p className="admin-small-title">
              STORE GAMING
            </p>

            <h1>
              ADMINISTRACIÓN
            </h1>
          </div>

        </div>

        <button
          type="button"
          className="admin-logout-button"
          onClick={handleLogout}
        >
          🚪
        </button>

      </header>

      {/* INFORMACIÓN DEL ADMINISTRADOR */}

      <section className="admin-profile-card">

        <div className="admin-profile-icon">
          👤
        </div>

        <div className="admin-profile-info">

          <span>
            ADMINISTRADOR
          </span>

          <strong>
            {adminEmail}
          </strong>

        </div>

        <div className="admin-status">
          <span />
          ACTIVO
        </div>

      </section>

      {/* OPCIONES */}

      <section className="admin-section">

        <div className="admin-section-title">

          <span>
            PANEL
          </span>

          <h2>
            CENTRO DE ADMINISTRACIÓN
          </h2>

        </div>

        <div className="admin-menu">

          {/* SOPORTE */}

          <button
            type="button"
            className="admin-menu-card"
            onClick={() =>
              router.push(
                "/admin/support"
              )
            }
          >

            <div className="admin-menu-icon">
              🆘
            </div>

            <div className="admin-menu-content">

              <strong>
                SOPORTE
              </strong>

              <span>
                Consultas y mensajes de clientes
              </span>

            </div>

            <b className="admin-menu-arrow">
              →
            </b>

          </button>

          {/* PEDIDOS */}

          <button
            type="button"
            className="admin-menu-card"
            onClick={() =>
              router.push("/orders")
            }
          >

            <div className="admin-menu-icon">
              🛒
            </div>

            <div className="admin-menu-content">

              <strong>
                PEDIDOS
              </strong>

              <span>
                Ver y gestionar pedidos
              </span>

            </div>

            <b className="admin-menu-arrow">
              →
            </b>

          </button>

        </div>

      </section>

      {/* INFORMACIÓN */}

      <section className="admin-info-card">

        <div className="admin-info-icon">
          🔐
        </div>

        <div>

          <strong>
            ACCESO PROTEGIDO
          </strong>

          <p>
            Este panel solamente está disponible
            para la cuenta administradora autorizada.
          </p>

        </div>

      </section>

      {/* PIE */}

      <footer className="admin-footer">
        STORE GAMING • PANEL DE ADMINISTRACIÓN
      </footer>

    </main>
  );
      }
