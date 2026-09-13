"use client";

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
    name: "CALL OF DUTY MOBILE (EE.UU)",
    description: "CP para Call of Duty Mobile.",
    image: "/images/call-of-duty-mobile.jpg",
    route: "/games/call-of-duty",
    tag: "CP",
  },

  {
    name: "MOBILE LEGENDS (EE.UU)",
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

  {
    name: "ARENA BREAKOUT",
    description: "Recargas para tu cuenta.",
    image: "/images/arena-breakout.jpg",
    route: "/games/arena-breakout",
    tag: "RECARGAS",
  },

  {
    name: "DELTA FORCE",
    description: "Recargas para tu cuenta.",
    image: "/images/delta-force.jpg",
    route: "/games/delta-force",
    tag: "RECARGAS",
  },

  {
    name: "FC MOBILE (ID)",
    description: "Recargas para FC Mobile.",
    image: "/images/fc-mobile.jpg",
    route: "/games/fc-mobile-id",
    tag: "RECARGAS",
  },

  {
    name: "HONOR OF KINGS",
    description: "Recargas para tu cuenta.",
    image: "/images/honor-of-kings.jpg",
    route: "/games/honor-of-kings",
    tag: "DIAMANTES",
  },

  {
    name: "LEAGUE OF LEGENDS (ID)",
    description: "Recargas para League of Legends.",
    image: "/images/league-of-legends.jpg",
    route: "/games/league-of-legends-id",
    tag: "RECARGAS",
  },

  {
    name: "GARENA FREE FIRE (ID)",
    description: "Diamantes para tu cuenta.",
    image: "/images/free-fire-latam.jpg",
    route: "/games/free-fire-id",
    tag: "DIAMANTES",
  },

  {
    name: "MODERN WARSHIPS NAVAL BATTLES",
    description: "Recargas para tu cuenta.",
    image: "/images/modern-warships.jpg",
    route: "/games/modern-warships",
    tag: "RECARGAS",
  },

  {
    name: "SAUSAGE MAN",
    description: "Recargas para tu cuenta.",
    image: "/images/sausage-man.jpg",
    route: "/games/sausage-man",
    tag: "RECARGAS",
  },
];


export default function TopUpPage() {

  const router = useRouter();


  return (
    <main className="top-up-page">

      {/* =========================
          HEADER
      ========================== */}

      <header className="top-up-header">

        <button
          type="button"
          className="top-up-back-button"
          onClick={() => router.push("/home")}
          aria-label="Volver al inicio"
        >
          ←
        </button>


        <div className="top-up-header-title">

          <span>
            STORE GAMING
          </span>

          <h1>
            RECARGAS TOP UP
          </h1>

        </div>

      </header>


      {/* =========================
          CATÁLOGO
      ========================== */}

      <section className="top-up-games-section">

        <div className="top-up-catalog-header">

          <div>

            <span>
              GAMING SERVICES
            </span>

            <h2>
              ELIGE TU JUEGO
            </h2>

          </div>


          <div className="top-up-catalog-decoration">

            <i />
            <i />
            <i />

          </div>

        </div>


        <div className="top-up-games-grid">

          {games.map((game) => (

            <button
              key={game.name}
              type="button"
              className="top-up-game-card"
              onClick={() => router.push(game.route)}
            >

              {/* IMAGEN */}

              <div className="top-up-game-image-container">

                {game.image ? (
                  <img
                    src={game.image}
                    alt={game.name}
                    className="top-up-game-image"
                  />
                ) : (
                  <div className="top-up-game-image-placeholder">
                    🎮
                  </div>
                )}


                <div className="top-up-game-image-dark" />


                <div className="top-up-game-tag">

                  {game.tag}

                </div>


                <div className="top-up-game-open">

                  VER OFERTAS →

                </div>

              </div>


              {/* INFORMACIÓN */}

              <div className="top-up-game-info">

                <h3>
                  {game.name}
                </h3>


                <p>
                  {game.description}
                </p>


                <div className="top-up-game-bottom">

                  <span>
                    TOP UP
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
          FOOTER
      ========================== */}

      <footer className="top-up-footer">

        <strong>
          STORE GAMING
        </strong>

        <span>
          RECARGAS GAMING RÁPIDAS Y SEGURAS
        </span>

      </footer>

    </main>
  );
    }
