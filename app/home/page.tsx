"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Game = {
  name: string;
  description: string;
  image: string;
  route: string;
};

const games: Game[] = [
  {
    name: "FREE FIRE LATAM",
    description: "Diamantes para tu cuenta de Free Fire.",
    image: "/images/free-fire-latam.jpg",
    route: "/games/free-fire-latam",
  },
  {
    name: "CALL OF DUTY MOBILE",
    description: "CP para Call of Duty Mobile.",
    image: "/images/call-of-duty-mobile.jpg",
    route: "/games/call-of-duty",
  },
  {
    name: "MOBILE LEGENDS",
    description: "Diamantes para Mobile Legends.",
    image: "/images/mobile-legends.jpg",
    route: "/games/mobile-legends",
  },
  {
    name: "BLOOD STRIKE",
    description: "Recargas para Blood Strike.",
    image: "/images/blood-strike.jpg",
    route: "/games/blood-strike",
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
        <div className="store-brand">
          <div className="store-brand-icon">🛒</div>

          <div>
            <div className="store-brand-title">
              STORE <span>GAMING</span>
            </div>

            <div className="store-brand-subtitle">
              RECARGAS • TOP UP
            </div>
          </div>
        </div>

        <div className="store-actions">
          <button
            type="button"
            className="cart-button"
            onClick={() => router.push("/cart")}
            aria-label="Carrito"
          >
            <span className="cart-icon">🛒</span>
            <span className="cart-badge">0</span>
          </button>

          <button
            type="button"
            className="profile-button"
            onClick={logout}
            title="Cerrar sesión"
          >
            <span>👤</span>
          </button>
        </div>
      </header>

      <section className="store-welcome">
        <div>
          <p className="store-kicker">BIENVENIDO</p>

          <h1>
            Hola, <span>@{username}</span>
          </h1>

          <p>
            Elige tu juego y encuentra las mejores recargas
            para tu cuenta.
          </p>
        </div>
      </section>

      <section className="games-section">
        <div className="section-heading">
          <div>
            <p className="section-kicker">CATÁLOGO</p>
            <h2>Elige tu juego</h2>
          </div>

          <div className="heading-line" />
        </div>

        <div className="games-grid">
          {games.map((game) => (
            <button
              key={game.name}
              type="button"
              className="game-card"
              onClick={() => router.push(game.route)}
            >
              <div className="game-image-wrapper">
                <img
                  src={game.image}
                  alt={game.name}
                  className="game-image"
                />

                <div className="game-image-overlay" />

                <div className="game-card-label">
                  TOP UP
                </div>
              </div>

              <div className="game-card-content">
                <h3>{game.name}</h3>

                <p>{game.description}</p>

                <span className="game-card-action">
                  VER RECARGAS →
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      <footer className="store-footer">
        <div className="footer-line" />

        <p>🛒STORE GAMING🎮</p>

        <span>
          RECARGAS GAMING • SERVICIO TOP UP
        </span>
      </footer>
    </main>
  );
}
