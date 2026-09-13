"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const offers = [
  {
    name: "60 BONOS",
    price: "0.82$",
  },
  {
    name: "PASE MENSUAL",
    price: "1.00$",
  },
  {
    name: "PASE MENSUAL PREMIUM",
    price: "3.65$",
  },
  {
    name: "335 BONOS",
    price: "4.10$",
  },
  {
    name: "675 BONOS",
    price: "8.08$",
  },
  {
    name: "1690 BONOS",
    price: "20.05$",
  },
  {
    name: "3400 BONOS",
    price: "40.05$",
  },
  {
    name: "6820 BONOS",
    price: "79.97$",
  },
];

export default function ArenaBreakoutPage() {
  const router = useRouter();

  const [selectedOffer, setSelectedOffer] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [playerId, setPlayerId] = useState("");

  const selected =
    selectedOffer !== null ? offers[selectedOffer] : null;

  function decreaseQuantity() {
    setQuantity((current) => Math.max(1, current - 1));
  }

  function increaseQuantity() {
    setQuantity((current) => current + 1);
  }

  function selectOffer(index: number) {
    setSelectedOffer(index);
    setQuantity(1);
  }

  function continueOrder() {
    if (!selected) return;

    if (!playerId.trim()) {
      return;
    }

    console.log({
      game: "ARENA BREAKOUT",
      offer: selected.name,
      price: selected.price,
      quantity,
      playerId: playerId.trim(),
    });
  }

  return (
    <main className="game-service-page">

      {/* =========================
          HEADER
      ========================== */}

      <header className="game-service-header">

        <button
          type="button"
          className="game-back-button"
          onClick={() => router.push("/top-up")}
          aria-label="Volver"
        >
          ←
        </button>


        <div className="game-header-title">

          <span>
            STORE GAMING
          </span>

          <h1>
            ARENA BREAKOUT
          </h1>

        </div>


        <button
          type="button"
          className="game-cart-button"
          aria-label="Carrito"
        >
          🛒
        </button>

      </header>


      {/* =========================
          IMAGEN DEL JUEGO
      ========================== */}

      <section className="free-fire-main-image">

        <img
          src="/images/arena-breakout.jpg"
          alt="Arena Breakout"
        />

      </section>


      {/* =========================
          TÍTULO
      ========================== */}

      <section className="offers-toggle">

        <div>

          <span>
            🎮 TOP UP
          </span>

          <h2>
            OFERTAS ARENA BREAKOUT
          </h2>

        </div>

      </section>


      {/* =========================
          OFERTAS
      ========================== */}

      <section className="offers-section">

        <div className="offers-list">

          {offers.map((offer, index) => (

            <button
              key={offer.name}
              type="button"
              className={
                selectedOffer === index
                  ? "offer-card selected"
                  : "offer-card"
              }
              onClick={() => selectOffer(index)}
            >

              <div className="diamond-icon">
                🎮
              </div>


              <div className="offer-info">

                <strong>
                  {offer.name}
                </strong>

                <span>
                  Arena Breakout
                </span>

              </div>


              <div className="offer-right">

                <strong>
                  {offer.price}
                </strong>

                <span>
                  →
                </span>

              </div>

            </button>

          ))}

        </div>

      </section>


      {/* =========================
          PEDIDO
      ========================== */}

      {selected && (

        <section className="order-section">

          <div className="selected-order-card">

            <div>

              <span>
                OFERTA SELECCIONADA
              </span>

              <strong>
                {selected.name}
              </strong>

            </div>


            <div className="selected-order-price">

              <strong>
                {selected.price}
              </strong>

            </div>

          </div>


          {/* CANTIDAD */}

          <div className="quantity-section">

            <span>
              CANTIDAD
            </span>


            <div className="quantity-control">

              <button
                type="button"
                onClick={decreaseQuantity}
              >
                −
              </button>

              <strong>
                {quantity}
              </strong>

              <button
                type="button"
                onClick={increaseQuantity}
              >
                +
              </button>

            </div>

          </div>


          {/* ID */}

          <div className="player-id-input-wrapper">

            <label htmlFor="arena-player-id">
              ID DEL JUGADOR
            </label>

            <input
              id="arena-player-id"
              type="text"
              inputMode="numeric"
              placeholder="Introduce tu ID"
              value={playerId}
              onChange={(event) =>
                setPlayerId(event.target.value)
              }
            />

          </div>


          {/* TOTAL */}

          <div className="order-total">

            <span>
              TOTAL
            </span>

            <strong>
              {(
                parseFloat(selected.price.replace("$", "")) *
                quantity
              ).toFixed(2)}
              $
            </strong>

          </div>


          <button
            type="button"
            className="finish-order-button"
            onClick={continueOrder}
            disabled={!playerId.trim()}
          >
            CONTINUAR →
          </button>

        </section>

      )}

    </main>
  );
}
