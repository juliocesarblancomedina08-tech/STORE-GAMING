"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const gameNote =
  "Región: Indonesia. Recarga de League of Legends (PC). Introduce tu ID de Riot antes de realizar el pedido (formato: Nombre#ETIQUETA). Asegúrate de que tu cuenta de Riot esté registrada en la región de Indonesia; los códigos están restringidos por región. El producto seleccionado se entregará directamente a tu cuenta una vez realizado el pedido.";

const offers = [
  {
    name: "575 RP",
    price: "3.30$",
  },
  {
    name: "1380 RP",
    price: "7.57$",
  },
  {
    name: "2800 RP",
    price: "15.03$",
  },
  {
    name: "4500 RP",
    price: "23.56$",
  },
  {
    name: "6500 RP",
    price: "33.17$",
  },
  {
    name: "13500 RP",
    price: "64.10$",
  },
];

export default function LeagueOfLegendsIdPage() {
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
      game: "LEAGUE OF LEGENDS (ID)",
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

          <h1>LEAGUE OF LEGENDS (ID)</h1>
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
          src="/images/league-of-legends.jpg"
          alt="League of Legends"
        />

      </section>


      {/* =========================
          TÍTULO
      ========================== */}

      <section className="offers-toggle">

        <div>

          <span>⚔️ TOP UP</span>

          <h2>OFERTAS LEAGUE OF LEGENDS (ID)</h2>

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
                ⚔️
              </div>

              <div className="offer-info">

                <strong>
                  {offer.name}
                </strong>

                <span>
                  League of Legends (ID)
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

        {/* =========================
            NOTA DEL SERVICIO
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
              NOTA ANTES DEL ID
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

            <label htmlFor="league-player-id">
              ID DEL JUGADOR
            </label>

            <input
              id="league-player-id"
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
