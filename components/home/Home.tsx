"use client";

import { useRouter } from "next/navigation";
import GameCard from "./GameCard";
import StoreHeader from "../layout/StoreHeader";
import BottomMenu from "../layout/BottomMenu";

const games = [
  {
    name: "Free Fire LATAM",
    image: "/images/free-fire-latam.jpg",
    description:
      "Diamantes, pases y membresías",
    path: "/games/free-fire-latam",
    badge: "TOP UP",
  },
  {
    name: "Blood Strike",
    image: "/images/blood-strike.jpg",
    description:
      "Gold y pases",
    path: "/games/blood-strike",
    badge: "TOP UP",
  },
];

export default function Home() {
  const router = useRouter();

  function openMenu() {
    router.push("/menu");
  }

  return (
    <div className="home-page">
      <StoreHeader
        onMenu={openMenu}
      />

      <section className="store-hero">
        <div className="hero-content">
          <span className="hero-kicker">
            BIENVENIDO
          </span>

          <h1>
            🛒STORE GAMING🎮
          </h1>

          <p>
            Recarga tus juegos favoritos
            de forma rápida y segura.
          </p>
        </div>
      </section>

      <section className="games-section">
        <div className="section-heading">
          <span>🎮 SERVICIOS</span>

          <h2>
            ELIGE TU JUEGO
          </h2>
        </div>

        <div className="games-grid">
          {games.map((game) => (
            <GameCard
              key={game.path}
              {...game}
            />
          ))}
        </div>
      </section>

      <BottomMenu />
    </div>
  );
}
