"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const offers = [
  { name: "5 DIAMANTES", price: "0.15$" },
  { name: "12 DIAMANTES", price: "0.20$" },
  { name: "10 DIAMANTES", price: "0.21$" },
  { name: "20 DIAMANTES", price: "0.32$" },
  { name: "25 DIAMANTES", price: "0.37$" },
  { name: "PASE DE SUBIDA DE NIVEL - 6", price: "0.38$" },
  { name: "30 DIAMANTES", price: "0.43$" },
  { name: "50 DIAMANTES", price: "0.52$" },
  { name: "PASE DE SUBIDA DE NIVEL - 20", price: "0.57$" },
  { name: "PASE DE SUBIDA DE NIVEL - 10", price: "0.57$" },
  { name: "PASE DE SUBIDA DE NIVEL - 15", price: "0.57$" },
  { name: "PASE DE SUBIDA DE NIVEL - 25", price: "0.57$" },
  { name: "55 DIAMANTES", price: "0.58$" },
  { name: "70 DIAMANTES", price: "0.61$" },
  { name: "80 DIAMANTES", price: "0.75$" },
  { name: "PASE DE SUBIDA DE NIVEL - 30", price: "0.87$" },
  { name: "100 DIAMANTES", price: "0.96$" },
  { name: "120 DIAMANTES", price: "1.07$" },
  { name: "140 DIAMANTES", price: "1.12$" },
  { name: "130 DIAMANTES", price: "1.18$" },
  { name: "145 DIAMANTES", price: "1.23$" },
  { name: "150 DIAMANTES", price: "1.28$" },
  { name: "190 DIAMANTES", price: "1.61$" },
  { name: "MEMBRESÍA SEMANAL", price: "1.69$" },
  { name: "210 DIAMANTES", price: "1.71$" },
  { name: "200 DIAMANTES", price: "1.71$" },
  { name: "280 DIAMANTES", price: "2.26$" },
  { name: "TARJETA BP", price: "2.49$" },
  { name: "355 DIAMANTES", price: "2.65$" },
  { name: "420 DIAMANTES", price: "3.33$" },
  { name: "500 DIAMANTES", price: "3.92$" },
  { name: "510 DIAMANTES", price: "4.04$" },
  { name: "565 DIAMANTES", price: "4.41$" },
  { name: "MEMBRESÍA MENSUAL", price: "4.88$" },
  { name: "635 DIAMANTES", price: "4.94$" },
  { name: "720 DIAMANTES", price: "5.20$" },
  { name: "800 DIAMANTES", price: "6.12$" },
  { name: "860 DIAMANTES", price: "6.56$" },
  { name: "930 DIAMANTES", price: "7.10$" },
  { name: "1000 DIAMANTES", price: "7.63$" },
  { name: "1050 DIAMANTES", price: "8.06$" },
  { name: "1075 DIAMANTES", price: "8.18$" },
  { name: "1080 DIAMANTES", price: "8.23$" },
  { name: "1450 DIAMANTES", price: "10.33$" },
  { name: "2180 DIAMANTES", price: "15.42$" },
  { name: "2200 DIAMANTES", price: "16.68$" },
  { name: "3640 DIAMANTES", price: "25.62$" },
  { name: "7290 DIAMANTES", price: "50.60$" },
  { name: "36500 DIAMANTES", price: "274.89$" },
  { name: "73100 DIAMANTES", price: "549.66$" },
];

export default function FreeFireIdPage() {
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
      game: "GARENA FREE FIRE (ID)",
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

          <span>
            STORE GAMING
          </span>

          <h1>
            GARENA FREE FIRE (ID)
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
          src="/images/free-fire-latam.jpg"
          alt="Garena Free Fire"
        />

      </section>


      {/* =========================
          TÍTULO
      ========================== */}

      <section className="offers-toggle">

        <div>

          <span>
            🔥 TOP UP
          </span>

          <h2>
            OFERTAS GARENA FREE FIRE (ID)
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
              key={`${offer.name}-${index}`}
              type="button"
              className={
                selectedOffer === index
                  ? "offer-card selected"
                  : "offer-card"
              }
              onClick={() => selectOffer(index)}
            >

              <div className="diamond-icon">
                💎
              </div>

              <div className="offer-info">

                <strong>
                  {offer.name}
                </strong>

                <span>
                  Garena Free Fire (ID)
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

            <label htmlFor="free-fire-id-player-id">
              ID DEL JUGADOR
            </label>

            <input
              id="free-fire-id-player-id"
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
