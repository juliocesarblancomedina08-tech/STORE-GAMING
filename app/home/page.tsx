"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Game = {
  name: string;
  description: string;
  image: string;
  route: string;
  tag: string;
};

const games: Game[] = [
  {
    name: "FREE FIRE LATAM",
    description: "Diamantes para tu cuenta.",
    image: "/images/free-fire-latam.jpg",
    route: "/games/free-fire-latam",
    tag: "DIAMANTES",
  },
  {
    name: "CALL OF DUTY MOBILE",
    description: "CP para Call of Duty Mobile.",
    image: "/images/call-of-duty-mobile.jpg",
    route: "/games/call-of-duty",
    tag: "CP",
  },
  {
    name: "MOBILE LEGENDS",
    description: "Diamantes para Mobile Legends.",
    image: "/images/mobile-legends.jpg",
    route: "/games/mobile-legends",
    tag: "DIAMANTES",
  },
  {
    name: "BLOOD STRIKE",
    description: "Recargas para tu cuenta.",
    image: "/images/blood-strike.jpg",
    route: "/games/blood-strike",
    tag: "RECARGAS",
  },
];

export default function HomePage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = localStorage.getItem("storeGamingAuth");

    if (!auth) {
      router.replace("/");
      return;
    }

    try {
      const account = JSON.parse(auth);

      if (!account?.username) {
        localStorage.removeItem("storeGamingAuth");
        router.replace("/");
        return;
      }

      setUsername(account.username);
      setLoading(false);
    } catch {
      localStorage.removeItem("storeGamingAuth");
      router.replace("/");
    }
  }, [router]);

  function logout() {
    localStorage.removeItem("storeGamingAuth");
    router.replace("/");
  }

  function openMenu() {
    // El menú lateral lo construiremos en el siguiente paso.
    // Por ahora el botón ya está preparado.
  }

  if (loading) {
    return (
      <main className="store-loading">
        <div className="loading-logo">🛒🎮</div>

        <div className="loading-line" />

        <p>CARGANDO STORE GAMING...</p>
      </main>
    );
  }

  return (
    <main className="store-home">
      <header className="store-header">
        {/* MENÚ ☰ */}
        <button
          type="button"
          className="menu-button"
          onClick={openMenu}
          aria-label="Abrir menú"
        >
          <span />
          <span />
          <span />
        </button>

        {/* LOGO */}
        <button
          type="button"
          className="store-logo"
          onClick={() => router.push("/home")}
        >
          <span className="store-logo-cart">🛒</span>

          <span className="store-logo-text">
            <strong>STORE</strong>
            <b>GAMING</b>
          </span>
        </button>

        {/* USUARIO */}
        <div className="store-header-actions">
          <button
            type="button"
            className="user-button"
            onClick={logout}
            aria-label="Cerrar sesión"
          >
            👤
          </button>
        </div>
      </header>

      <section className="store-hero">
        <div className="hero-glow" />

        <div className="hero-content">
          <div className="hero-badge">
            ⚡ TOP UP GAMING
          </div>

          <h1 className="hero-title">
            TU MUNDO
            <br />
            <span>GAMING</span>
          </h1>

          <p className="hero-text">
            Hola <strong>@{username}</strong>. Compra tus
            recargas de forma rápida y sencilla.
          </p>

          <div className="hero-stats">
            <div>
              <strong>⚡</strong>
              <span>RÁPIDO</span>
            </div>

            <div>
              <strong>🔒</strong>
              <span>SEGURO</span>
            </div>

            <div>
              <strong>🎮</strong>
              <span>GAMING</span>
            </div>
          </div>
        </div>
      </section>

      <section className="games-section">
        <div className="catalog-header">
          <div>
            <span>STORE GAMING</span>

            <h2>ELIGE TU JUEGO</h2>
          </div>

          <div className="catalog-decoration">
            <i />
            <i />
            <i />
          </div>
        </div>

        <div className="games-grid">
          {games.map((game) => (
            <button
              key={game.name}
              type="button"
              className="game-card"
              onClick={() => router.push(game.route)}
            >
              <div className="game-image-container">
                <img
                  src={game.image}
                  alt={game.name}
                  className="game-image"
                />

                <div className="game-image-dark" />

                <div className="game-tag">
                  {game.tag}
                </div>

                <div className="game-open">
                  VER →
                </div>
              </div>

              <div className="game-info">
                <h3>{game.name}</h3>

                <p>{game.description}</p>

                <div className="game-bottom">
                  <span>TOP UP</span>

                  <strong>→</strong>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="benefits-section">
        <div className="benefit">
          <span>⚡</span>

          <div>
            <strong>ENTREGA RÁPIDA</strong>

            <p>
              Procesamos tus pedidos rápidamente.
            </p>
          </div>
        </div>

        <div className="benefit">
          <span>🛡️</span>

          <div>
            <strong>COMPRA SEGURA</strong>

            <p>
              Tu pedido queda registrado.
            </p>
          </div>
        </div>

        <div className="benefit">
          <span>🎮</span>

          <div>
            <strong>TOP UP GAMING</strong>

            <p>
              Recargas para tus juegos favoritos.
            </p>
          </div>
        </div>
      </section>

      <footer className="store-footer">
        <div className="footer-brand">
          🛒STORE GAMING🎮
        </div>

        <p>
          TU MEJOR OPCIÓN PARA RECARGAS GAMING
        </p>

        <small>
          © 2026 STORE GAMING
        </small>
      </footer>
    </main>
  );
                  }
