"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const offers = [
  {
    name: "CUENTA PREMIUM - 7 DÍAS",
    price: "2.59$",
  },
  {
    name: "500.000 DÓLARES",
    price: "2.71$",
  },
  {
    name: "500 DE ORO",
    price: "4.48$",
  },
  {
    name: "1.500.000 DÓLARES",
    price: "4.48$",
  },
  {
    name: "140 ARTCOINS",
    price: "5.09$",
  },
  {
    name: "CUENTA PREMIUM - 30 DÍAS",
    price: "8.51$",
  },
  {
    name: "1200 DE ORO",
    price: "8.93$",
  },
];

export default function ModernWarshipsPage() {
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
      game: "MODERN WARSHIPS NAVAL BATTLES",
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

          <h1>MODERN WARSHIPS</h1>
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
          src="/images/modern-warships.jpg"
          alt="Modern Warships Naval Battles"
        />

      </section>


      {/* =========================
          TÍTULO
      ========================== */}

      <section className="offers-toggle">

        <div>

          <span>⚓ TOP UP</span>

          <h2>
            OFERTAS MODERN WARSHIPS
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
                ⚓
              </div>

              <div className="offer-info">

                <strong>
                  {offer.name}
                </strong>

                <span>
                  Modern Warships
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
              ID DEL JUGADOR
          ========================== */}

          <div className="player-id-input-wrapper">

            <label htmlFor="modern-warships-player-id">
              ID DEL JUGADOR
            </label>

            <input
              id="modern-warships-player-id"
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
