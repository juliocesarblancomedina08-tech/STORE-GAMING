"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function WelcomePage() {
  const router = useRouter();

  useEffect(() => {
    const auth = localStorage.getItem("storeGamingAuth");

    if (!auth) {
      return;
    }

    try {
      const account = JSON.parse(auth);

      if (account?.username) {
        router.replace("/home");
      }
    } catch {
      localStorage.removeItem("storeGamingAuth");
    }
  }, [router]);

  return (
    <main className="welcome-page">
      {/* FONDO BATTLE ROYALE */}
      <div className="welcome-overlay" />

      {/* CARTEL CENTRAL */}
      <section className="welcome-card">
        <div className="welcome-line" />

        <p className="welcome-small">
          BIENVENIDO A
        </p>

        <h1 className="striped-title">
          <span className="store-word">STORE</span>
          <span className="gaming-word">GAMING</span>
        </h1>

        <div className="title-decoration">
          <span />
          <b>🛒</b>
          <span />
        </div>

        <p className="welcome-description">
          Tu mejor opción para
          <strong> recargas gaming</strong>
          <br />
          y productos digitales.
        </p>

        <div className="welcome-buttons">
          <button
            type="button"
            className="gaming-button primary"
            onClick={() => router.push("/login")}
          >
            <span>INICIAR SESIÓN</span>
            <b>→</b>
          </button>

          <button
            type="button"
            className="gaming-button secondary"
            onClick={() => router.push("/register")}
          >
            <span>REGISTRARSE</span>
            <b>+</b>
          </button>
        </div>

        <div className="welcome-footer">
          <span>⚡</span>
          RECARGAS
          <i />
          GAMING
          <i />
          TOP UP
          <span>⚡</span>
        </div>
      </section>
    </main>
  );
      }
