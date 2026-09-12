"use client";

import { useRouter } from "next/navigation";

type GiftCard = {
  name: string;
  image: string;
  route: string;
};

const giftCards: GiftCard[] = [
  {
    name: "GARENA FREE FIRE (GLOBAL)",
    image: "",
    route: "/gift-cards/garena-free-fire-global",
  },
  {
    name: "ROBLOX (GLOBAL)",
    image: "",
    route: "/gift-cards/roblox-global",
  },
  {
    name: "ROBLOX (RU)",
    image: "",
    route: "/gift-cards/roblox-ru",
  },
  {
    name: "ROBLOX (EE.UU)",
    image: "",
    route: "/gift-cards/roblox-eeuu",
  },
  {
    name: "ROBLOX (ID)",
    image: "",
    route: "/gift-cards/roblox-id",
  },
  {
    name: "ARENA BREAKOUT",
    image: "",
    route: "/gift-cards/arena-breakout",
  },
  {
    name: "FORTNITE (AE)",
    image: "",
    route: "/gift-cards/fortnite-ae",
  },
  {
    name: "FORTNITE (SUIZA)",
    image: "",
    route: "/gift-cards/fortnite-suiza",
  },
  {
    name: "FORTNITE (EE.UU)",
    image: "",
    route: "/gift-cards/fortnite-eeuu",
  },
  {
    name: "FORTNITE (DE)",
    image: "",
    route: "/gift-cards/fortnite-de",
  },
  {
    name: "FORTNITE (UE)",
    image: "",
    route: "/gift-cards/fortnite-ue",
  },
  {
    name: "GOOGLE PLAY (EE.UU)",
    image: "",
    route: "/gift-cards/google-play-eeuu",
  },
  {
    name: "GOOGLE PLAY (BRASIL)",
    image: "",
    route: "/gift-cards/google-play-brasil",
  },
  {
    name: "GOOGLE PLAY (ES)",
    image: "",
    route: "/gift-cards/google-play-es",
  },
  {
    name: "GOOGLE PLAY (AE)",
    image: "",
    route: "/gift-cards/google-play-ae",
  },
  {
    name: "GOOGLE PLAY (ID)",
    image: "",
    route: "/gift-cards/google-play-id",
  },
  {
    name: "LEAGUE OF LEGENDS (EE.UU)",
    image: "",
    route: "/gift-cards/league-of-legends-eeuu",
  },
  {
    name: "LEAGUE OF LEGENDS (RU)",
    image: "",
    route: "/gift-cards/league-of-legends-ru",
  },
  {
    name: "RAZER GOLD (EE.UU)",
    image: "",
    route: "/gift-cards/razer-gold-eeuu",
  },
  {
    name: "RAZER GOLD (GLOBAL)",
    image: "",
    route: "/gift-cards/razer-gold-global",
  },
  {
    name: "RAZER GOLD (ID)",
    image: "",
    route: "/gift-cards/razer-gold-id",
  },
  {
    name: "RAZER GOLD (MX)",
    image: "",
    route: "/gift-cards/razer-gold-mx",
  },
];

export default function GiftCardsPage() {
  const router = useRouter();

  return (
    <main className="gift-cards-page">

      <header className="gift-cards-header">

        <button
          type="button"
          className="gift-cards-back-button"
          onClick={() => router.push("/home")}
          aria-label="Volver"
        >
          ←
        </button>

        <h1>
          TARJETAS DE REGALO Y CODIGOS
        </h1>

      </header>


      <section className="gift-cards-grid">

        {giftCards.map((card) => (

          <button
            key={card.name}
            type="button"
            className="gift-card"
            onClick={() => router.push(card.route)}
          >

            <div className="gift-card-image">

              {card.image ? (
                <img
                  src={card.image}
                  alt={card.name}
                />
              ) : (
                <div className="gift-card-image-placeholder">
                  🎁
                </div>
              )}

            </div>


            <div className="gift-card-name">
              {card.name}
            </div>

          </button>

        ))}

      </section>

    </main>
  );
            }
