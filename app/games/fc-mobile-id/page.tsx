"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const offers = [
  {
    name: "40 PUNTOS FC / 39 PLATA",
    price: "0.45$",
  },
  {
    name: "100 PUNTOS FC / 99 PLATA",
    price: "0.97$",
  },
  {
    name: "520 PUNTOS FC / 499 PLATA",
    price: "4.36$",
  },
  {
    name: "1070 PUNTOS FC / 999 PLATA",
    price: "8.67$",
  },
  {
    name: "2200 PUNTOS FC / 1999 PLATA",
    price: "17.83$",
  },
  {
    name: "5750 PUNTOS FC / 4999 PLATA",
    price: "43.17$",
  },
  {
    name: "12000 PUNTOS FC / 9999 PLATA",
    price: "86.30$",
  },
];

const gameNote =
  "Región: Indonesia. Recarga móvil de EA Sports FC. Introduce tu ID de jugador antes de realizar el pedido. Asegúrate de que tu cuenta de EA esté registrada en Indonesia; los códigos están restringidos por región. El producto seleccionado se entregará directamente a tu cuenta una vez realizado el pedido.";

export default function FcMobileIdPage() {
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
      game: "FC MOBILE (ID)",
      offer: selected.name,
      price: selected.price,
      quantity,
      playerId: playerId.trim(),
    });
  }

  const total = selected
    ? (
        parseFloat(selected.price.replace("$", "")) *
        quantity
      ).toFixed(2)
    : "0.00";

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
          <span>STORE GAMING</span>

          <h1>FC MOBILE (ID)</h1>
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
          src="/images/fc-mobile.jpg"
          alt="FC Mobile"
        />

      </section>


      {/* =========================
          TÍTULO
      ========================== */}

      <section className="offers-toggle">

        <div>

          <span>⚽ TOP UP</span>

          <h2>OFERTAS FC MOBILE (ID)</h2>

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
                ⚽
              </div>

              <div className="offer-info">

                <strong>
                  {offer.name}
                </strong>

                <span>
                  FC Mobile (ID)
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
          NOTA
      ========================== */}

      <div className="game-note">

        <div className="game-note-icon">
          !
        </div>

        <div className="game-note-content">

          <strong>
            NOTA
          </strong>

          <p>
            {gameNote}
          </p>

        </div>

      </div>


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


          {/* =========================
              CANTIDAD
          ========================== */}

          <div className="quantity-section">

            <span>
              CANTIDAD
            </span>

            <div className="quantity-control">

              <button
                type="button"
                onClick={decreaseQuantity}
                aria-label="Disminuir cantidad"
              >
                −
              </button>

              <strong>
                {quantity}
              </strong>

              <button
                type="button"
                onClick={increaseQuantity}
                aria-label="Aumentar cantidad"
              >
                +
              </button>

            </div>

          </div>


          {/* =========================
              NOTA DEL PEDIDO
          ========================== */}

          <div className="game-note game-note-order">

            <div className="game-note-icon">
              !
            </div>

            <div className="game-note-content">

              <strong>
                NOTA
              </strong>

              <p>
                {gameNote}
              </p>

            </div>

          </div>


          {/* =========================
              ID DEL JUGADOR
          ========================== */}

          <div className="player-id-input-wrapper">

            <label htmlFor="fc-mobile-player-id">
              ID DEL JUGADOR
            </label>

            <input
              id="fc-mobile-player-id"
              type="text"
              inputMode="numeric"
              placeholder="Introduce tu ID"
              value={playerId}
              onChange={(event) =>
                setPlayerId(event.target.value)
              }
            />

          </div>


          {/* =========================
              TOTAL
          ========================== */}

          <div className="order-total">

            <span>
              TOTAL
            </span>

            <strong>
              {total}$
            </strong>

          </div>


          {/* =========================
              CONTINUAR
          ========================== */}

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
