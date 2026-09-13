"use client";

import { useRouter } from "next/navigation";

type GiftCard = {
  name: string;
  route: string;
  image: string;
  region: string;
};

const giftCards: GiftCard[] = [
  {
    name: "GARENA FREE FIRE (GLOBAL)",
    route: "/gift-cards/garena-free-fire-global",
    image: "/images/gift-cards/gift-garena-free-fire-global.jpg",
    region: "GLOBAL",
  },
  {
    name: "ROBLOX (GLOBAL)",
    route: "/gift-cards/roblox-global",
    image: "/images/gift-cards/gift-roblox-global.jpg",
    region: "GLOBAL",
  },
  {
    name: "ROBLOX (RU)",
    route: "/gift-cards/roblox-ru",
    image: "/images/gift-cards/gift-roblox-ru.jpg",
    region: "RUSIA",
  },
  {
    name: "ROBLOX (EE.UU)",
    route: "/gift-cards/roblox-eeuu",
    image: "/images/gift-cards/gift-roblox-eeuu.jpg",
    region: "EE.UU",
  },
  {
    name: "ROBLOX (ID)",
    route: "/gift-cards/roblox-id",
    image: "/images/gift-cards/gift-roblox-id.jpg",
    region: "INDONESIA",
  },
  {
    name: "ARENA BREAKOUT",
    route: "/gift-cards/arena-breakout",
    image: "/images/gift-cards/gift-arena-breakout.jpg",
    region: "GLOBAL",
  },
  {
    name: "FORTNITE (AE)",
    route: "/gift-cards/fortnite-ae",
    image: "/images/gift-cards/gift-fortnite-ae.jpg",
    region: "EMIRATOS ÁRABES",
  },
  {
    name: "FORTNITE (SUIZA)",
    route: "/gift-cards/fortnite-suiza",
    image: "/images/gift-cards/gift-fortnite-suiza.jpg",
    region: "SUIZA",
  },
  {
    name: "FORTNITE (EE.UU)",
    route: "/gift-cards/fortnite-eeuu",
    image: "/images/gift-cards/gift-fortnite-eeuu.jpg",
    region: "EE.UU",
  },
  {
    name: "FORTNITE (DE)",
    route: "/gift-cards/fortnite-de",
    image: "/images/gift-cards/gift-fortnite-de.jpg",
    region: "ALEMANIA",
  },
  {
    name: "FORTNITE (UE)",
    route: "/gift-cards/fortnite-ue",
    image: "/images/gift-cards/gift-fortnite-ue.jpg",
    region: "EUROPA",
  },
  {
    name: "GOOGLE PLAY (EE.UU)",
    route: "/gift-cards/google-play-eeuu",
    image: "/images/gift-cards/gift-google-play-eeuu.jpg",
    region: "EE.UU",
  },
  {
    name: "GOOGLE PLAY (BRASIL)",
    route: "/gift-cards/google-play-brasil",
    image: "/images/gift-cards/gift-google-play-brasil.jpg",
    region: "BRASIL",
  },
  {
    name: "GOOGLE PLAY (ES)",
    route: "/gift-cards/google-play-es",
    image: "/images/gift-cards/gift-google-play-es.jpg",
    region: "ESPAÑA",
  },
  {
    name: "GOOGLE PLAY (AE)",
    route: "/gift-cards/google-play-ae",
    image: "/images/gift-cards/gift-google-play-ae.jpg",
    region: "EMIRATOS ÁRABES",
  },
  {
    name: "GOOGLE PLAY (ID)",
    route: "/gift-cards/google-play-id",
    image: "/images/gift-cards/gift-google-play-id.jpg",
    region: "INDONESIA",
  },
  {
    name: "LEAGUE OF LEGENDS (EE.UU)",
    route: "/gift-cards/league-of-legends-eeuu",
    image: "/images/gift-cards/gift-league-of-legends-eeuu.jpg",
    region: "EE.UU",
  },
  {
    name: "LEAGUE OF LEGENDS (RU)",
    route: "/gift-cards/league-of-legends-ru",
    image: "/images/gift-cards/gift-league-of-legends-ru.jpg",
    region: "RUSIA",
  },
  {
    name: "RAZER GOLD (EE.UU)",
    route: "/gift-cards/razer-gold-eeuu",
    image: "/images/gift-cards/gift-razer-gold-eeuu.jpg",
    region: "EE.UU",
  },
  {
    name: "RAZER GOLD (GLOBAL)",
    route: "/gift-cards/razer-gold-global",
    image: "/images/gift-cards/gift-razer-gold-global.jpg",
    region: "GLOBAL",
  },
  {
    name: "RAZER GOLD (ID)",
    route: "/gift-cards/razer-gold-id",
    image: "/images/gift-cards/gift-razer-gold-id.jpg",
    region: "INDONESIA",
  },
  {
    name: "RAZER GOLD (MX)",
    route: "/gift-cards/razer-gold-mx",
    image: "/images/gift-cards/gift-razer-gold-mx.jpg",
    region: "MÉXICO",
  },
];

export default function GiftCardsPage() {
  const router = useRouter();

  return (
    <main className="gift-cards-page">
      {/* HEADER */}
      <header className="gift-cards-header">
        <button
          className="gift-cards-back-button"
          onClick={() => router.push("/home")}
          aria-label="Volver"
        >
          ←
        </button>

        <div className="gift-cards-header-title">
          <span>🎁</span>
          <strong>TARJETAS DE REGALO</strong>
        </div>

        <button
          className="gift-cards-cart-button"
          onClick={() => router.push("/orders")}
          aria-label="Pedidos"
        >
          🛒
        </button>
      </header>

      {/* TITLE */}
      <section className="gift-cards-title-section">
        <span className="gift-cards-title-decoration">
          ✦
        </span>

        <h1>
          TARJETAS DE REGALO
          <br />
          <span>Y CÓDIGOS</span>
        </h1>

        <p>
          Compra tarjetas y códigos digitales para tus
          juegos y plataformas favoritas.
        </p>
      </section>

      {/* CATALOG */}
      <section className="gift-cards-catalog">
        <div className="gift-cards-catalog-heading">
          <span>PRODUCTOS DISPONIBLES</span>
          <strong>{giftCards.length}</strong>
        </div>

        <div className="gift-cards-grid">
          {giftCards.map((card) => (
            <button
              key={card.route}
              type="button"
              className="gift-card-item"
              onClick={() => router.push(card.route)}
            >
              <div className="gift-card-image-container">
                <img
                  src={card.image}
                  alt={card.name}
                  className="gift-card-image"
                  loading="lazy"
                />

                <div className="gift-card-region">
                  {card.region}
                </div>
              </div>

              <div className="gift-card-info">
                <h2>{card.name}</h2>

                <div className="gift-card-open">
                  <span>VER OPCIONES</span>
                  <span>→</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* INFO */}
      <section className="gift-cards-info">
        <div className="gift-cards-info-item">
          <span>🎁</span>

          <div>
            <strong>CÓDIGOS DIGITALES</strong>
            <p>
              Recibe tu código después de completar tu
              pedido.
            </p>
          </div>
        </div>

        <div className="gift-cards-info-item">
          <span>🔒</span>

          <div>
            <strong>COMPRA SEGURA</strong>
            <p>
              Revisa siempre la región antes de comprar.
            </p>
          </div>
        </div>

        <div className="gift-cards-info-item">
          <span>🌎</span>

          <div>
            <strong>REGIONES</strong>
            <p>
              Cada tarjeta está limitada a la región
              indicada.
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="gift-cards-footer">
        <strong>STORE GAMING</strong>
        <span>🎁 TARJETAS DE REGALO</span>
      </footer>
    </main>
  );
    }
