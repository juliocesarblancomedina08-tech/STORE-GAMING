"use client";

import { useRouter } from "next/navigation";

const offers = [
  {
    diamonds: "110💎",
    price: "0.78$",
  },
  {
    diamonds: "341💎",
    price: "2.20$",
  },
  {
    diamonds: "572💎",
    price: "3.67$",
  },
  {
    diamonds: "1166💎",
    price: "6.73$",
  },
  {
    diamonds: "2398💎",
    price: "13.27$",
  },
  {
    diamonds: "6160💎",
    price: "33.70$",
  },
];

export default function FreeFireLatamPage() {
  const router = useRouter();

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
            <strong>TOP UP DE FREE FIRE LATAM</strong>
          </h1>

          <p>
            Selecciona la cantidad de diamantes que
            deseas recargar.
          </p>
        </div>
      </section>

      <section className="offers-section">
        <div className="offers-heading">
          <div>
            <span>FREE FIRE LATAM</span>
            <h2>ELIGE TU RECARGA</h2>
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
              key={offer.diamonds}
              type="button"
              className="offer-card"
              onClick={() =>
                router.push(
                  `/games/free-fire-latam/select?diamonds=${encodeURIComponent(
                    offer.diamonds
                  )}&price=${encodeURIComponent(
                    offer.price
                  )}`
                )
              }
            >
              <div className="offer-left">
                <div className="diamond-icon">
                  💎
                </div>

                <div className="offer-info">
                  <strong>{offer.diamonds}</strong>
                  <span>DIAMANTES</span>
                </div>
              </div>

              <div className="offer-right">
                <strong>{offer.price}</strong>
                <span>COMPRAR →</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="service-info">
        <div className="service-info-item">
          <span>⚡</span>
          <div>
            <strong>ENTREGA RÁPIDA</strong>
            <p>
              Tu recarga será procesada después de
              confirmar tu pedido.
            </p>
          </div>
        </div>

        <div className="service-info-item">
          <span>🔒</span>
          <div>
            <strong>COMPRA SEGURA</strong>
            <p>
              Tu pedido queda registrado en STORE
              GAMING.
            </p>
          </div>
        </div>

        <div className="service-info-item">
          <span>🎮</span>
          <div>
            <strong>FREE FIRE LATAM</strong>
            <p>
              Selecciona tus diamantes y continúa con
              tu pedido.
            </p>
          </div>
        </div>
      </section>

      <footer className="game-service-footer">
        <strong>🛒STORE GAMING🎮</strong>
        <span>FREE FIRE LATAM TOP UP</span>
      </footer>
    </main>
  );
        }
