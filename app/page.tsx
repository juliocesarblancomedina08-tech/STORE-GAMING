"use client";

import { useRouter } from "next/navigation";

export default function WelcomePage() {
  const router = useRouter();

  return (
    <main className="welcome-page">
      <div className="welcome-overlay" />

      <section className="welcome-card">
        <div className="welcome-line" />

        <p className="welcome-small">BIENVENIDO A</p>

        <h1 className="striped-title">
          🛒STORE GAMING🎮
        </h1>

        <p className="welcome-description">
          Tu mejor opción para recargas de juegos y productos digitales.
        </p>

        <div className="welcome-buttons">
          <button
            className="gaming-button primary"
            onClick={() => router.push("/login")}
          >
            INICIAR SESIÓN
          </button>

          <button
            className="gaming-button secondary"
            onClick={() => router.push("/register")}
          >
            REGISTRARSE
          </button>
        </div>

        <div className="welcome-footer">
          RECARGAS • GAMING • TOP UP
        </div>
      </section>
    </main>
  );
}
