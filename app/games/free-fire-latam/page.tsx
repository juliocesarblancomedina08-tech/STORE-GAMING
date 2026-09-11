"use client";

import { useRouter } from "next/navigation";

const offers = [
  {
    id: "ff-110",
    name: "110 Diamonds",
    diamonds: "110💎",
    price: 0.78,
    type: "diamonds",
  },
  {
    id: "ff-341",
    name: "341 Diamonds",
    diamonds: "341💎",
    price: 2.2,
    type: "diamonds",
  },
  {
    id: "ff-572",
    name: "572 Diamonds",
    diamonds: "572💎",
    price: 3.67,
    type: "diamonds",
  },
  {
    id: "ff-1166",
    name: "1166 Diamonds",
    diamonds: "1166💎",
    price: 6.73,
    type: "diamonds",
  },
  {
    id: "ff-2398",
    name: "2398 Diamonds",
    diamonds: "2398💎",
    price: 13.27,
    type: "diamonds",
  },
  {
    id: "ff-6160",
    name: "6160 Diamonds",
    diamonds: "6160💎",
    price: 33.7,
    type: "diamonds",
  },
  {
    id: "ff-elite-pass",
    name: "Pase Elite",
    diamonds: "PASE ELITE",
    price: 4,
    type: "pass",
  },
  {
    id: "ff-weekly-membership",
    name: "Membresía semanal",
    diamonds: "MEMBRESÍA SEMANAL",
    price: 2.3,
    type: "membership",
  },
  {
    id: "ff-monthly-membership",
    name: "Membresía mensual",
    diamonds: "MEMBRESÍA MENSUAL",
    price: 10.72,
    type: "membership",
  },
];

export default function FreeFireLatamPage() {
  const router = useRouter();

  function selectOffer(offer: (typeof offers)[number]) {
    router.push(
      `/games/free-fire-latam/select?offer=${encodeURIComponent(
        JSON.stringify(offer)
      )}`
    );
  }

  return (
    <main className="game-service-page">
      <header className="game-service-header">
        <button
          type="button"
          className="game-back-button"
          onClick={() => router.push("/home")}
        >
          ←
        </button>

        <div className="game-header-title">
          <span>STORE GAMING</span>
          <strong>FREE FIRE LATAM</strong>
        </div>

        <button
          type="button"
          className="game-cart-button"
          onClick={() => router.push("/cart")}
        >
          🛒
        </button>
      </header>

      <section className="free-fire-hero">
        <img
          src="/images/free-fire-latam.jpg"
          alt="Free Fire LATAM"
          className="free-fire-image"
        />

        <div className="free-fire-hero-overlay" />

        <div className="free-fire-hero-content">
          <span className="service-badge">
            ⚡ TOP UP
          </span>

          <h1>
            Bienvenido al servicio
            <br />
            <strong>
              TOP UP DE FREE FIRE LATAM
            </strong>
          </h1>

          <p>
            Selecciona el producto que deseas
            comprar.
          </p>
        </div>
      </section>

      <section className="offers-section">
        <div className="offers-heading">
          <div>
            <span>FREE FIRE LATAM</span>
            <h2>ELIGE TU OFERTA</h2>
          </div>

          <div className="offers-decoration">
            <i />
            <i />
            <i />
          </div>
        </div>

        <div className="offers-list">
          {offers.map((offer) => (
            <button
              key={offer.id}
              type="button"
              className="offer-card"
              onClick={() =>
                selectOffer(offer)
              }
            >
              <div className="offer-left">
                <div className="diamond-icon">
                  {offer.type === "diamonds"
                    ? "💎"
                    : offer.type === "pass"
                    ? "🎟️"
                    : "⭐"}
                </div>

                <div className="offer-info">
                  <strong>
                    {offer.diamonds}
                  </strong>

                  <span>
                    {offer.type === "diamonds"
                      ? "DIAMANTES"
                      : offer.type === "pass"
                      ? "FREE FIRE"
                      : "FREE FIRE"}
                  </span>
                </div>
              </div>

              <div className="offer-right">
                <strong>
                  {offer.price.toFixed(2)}$
                </strong>

                <span>
                  COMPRAR →
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="service-info">
        <div className="service-info-item">
          <span>⚡</span>

          <div>
            <strong>
              ENTREGA RÁPIDA
            </strong>

            <p>
              Procesamos tu pedido rápidamente.
            </p>
          </div>
        </div>

        <div className="service-info-item">
          <span>🔒</span>

          <div>
            <strong>
              COMPRA SEGURA
            </strong>

            <p>
              Tu pedido queda registrado.
            </p>
          </div>
        </div>

        <div className="service-info-item">
          <span>🎮</span>

          <div>
            <strong>
              FREE FIRE LATAM
            </strong>

            <p>
              Recargas y productos para tu
              cuenta.
            </p>
          </div>
        </div>
      </section>

      <footer className="game-service-footer">
        <strong>
          🛒STORE GAMING🎮
        </strong>

        <span>
          FREE FIRE LATAM TOP UP
        </span>
      </footer>
    </main>
  );
          }
