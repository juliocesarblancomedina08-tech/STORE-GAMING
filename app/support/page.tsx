"use client";

import { useRouter } from "next/navigation";

export default function SupportPage() {
  const router = useRouter();

  return (
    <main className="service-page support-page">

      {/* ======================================================
          HEADER
          ====================================================== */}

      <header className="service-header support-header">

        <button
          type="button"
          className="back-button"
          onClick={() => router.push("/home")}
          aria-label="Volver"
        >
          ←
        </button>

        <div className="support-header-title">

          <small>
            STORE GAMING
          </small>

          <h1>
            SOPORTE
          </h1>

        </div>

        <div className="support-header-icon">
          🎧
        </div>

      </header>

      {/* ======================================================
          CONTENIDO
          ====================================================== */}

      <section className="support-content">

        {/* ====================================================
            TARJETA PRINCIPAL
            ==================================================== */}

        <section className="support-main-card">

          <div className="support-card-glow" />

          <div className="support-main-top">

            <div className="support-headset">
              🎧
            </div>

            <div className="support-online">

              <span />

              SOPORTE ACTIVO

            </div>

          </div>

          <div className="support-main-text">

            <small>
              STORE GAMING
            </small>

            <h2>
              ¿NECESITAS
              <span> AYUDA?</span>
            </h2>

            <p>
              Nuestro equipo está disponible
              para ayudarte con tus pedidos,
              recargas y cualquier problema
              relacionado con tu cuenta.
            </p>

          </div>

          <button
            type="button"
            className="support-contact-button"
            onClick={() => {
              window.open(
                "https://t.me/",
                "_blank"
              );
            }}
          >
            <span>
              🎧
            </span>

            <strong>
              CONTACTAR SOPORTE
            </strong>

            <span>
              →
            </span>
          </button>

        </section>

        {/* ====================================================
            AYUDA RÁPIDA
            ==================================================== */}

        <section className="support-section">

          <div className="support-section-title">

            <div>
              <span>
                ?
              </span>

              <strong>
                ¿EN QUÉ PODEMOS AYUDARTE?
              </strong>
            </div>

          </div>

          {/* PEDIDOS */}

          <button
            type="button"
            className="support-option-card"
            onClick={() =>
              router.push("/orders")
            }
          >

            <div className="support-option-icon">
              📦
            </div>

            <div className="support-option-info">

              <strong>
                PROBLEMA CON UN PEDIDO
              </strong>

              <span>
                Consulta tus pedidos y su estado.
              </span>

            </div>

            <div className="support-option-arrow">
              →
            </div>

          </button>

          {/* BALANCE */}

          <button
            type="button"
            className="support-option-card"
            onClick={() =>
              router.push("/balance")
            }
          >

            <div className="support-option-icon">
              💰
            </div>

            <div className="support-option-info">

              <strong>
                BALANCE Y DEPÓSITOS
              </strong>

              <span>
                Consulta tu billetera y movimientos.
              </span>

            </div>

            <div className="support-option-arrow">
              →
            </div>

          </button>

          {/* RECARGAS */}

          <button
            type="button"
            className="support-option-card"
            onClick={() =>
              router.push("/home")
            }
          >

            <div className="support-option-icon">
              🎮
            </div>

            <div className="support-option-info">

              <strong>
                PROBLEMA CON UNA RECARGA
              </strong>

              <span>
                Ayuda relacionada con tus compras.
              </span>

            </div>

            <div className="support-option-arrow">
              →
            </div>

          </button>

        </section>

        {/* ====================================================
            INFORMACIÓN
            ==================================================== */}

        <section className="support-info-card">

          <div className="support-info-icon">
            🔒
          </div>

          <div>

            <strong>
              SOPORTE SEGURO
            </strong>

            <p>
              Nunca compartas tu contraseña ni
              códigos de verificación con ninguna
              persona.
            </p>

          </div>

        </section>

        {/* ====================================================
            REGRESAR
            ==================================================== */}

        <button
          type="button"
          className="support-return-button"
          onClick={() =>
            router.push("/home")
          }
        >
          ← VOLVER A LA TIENDA
        </button>

      </section>

    </main>
  );
      }
