"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const gameNote =
  "Recarga Honor of Kings. Introduce tu ID de jugador antes de realizar el pedido. El producto seleccionado se entregará directamente en tu cuenta una vez realizado el pedido";

const offers = [
  {
    name: "16 FICHAS",
    price: "0.27$",
  },
  {
    name: "BOLSA DE LA SUERTE CON DOBLE FICHA",
    price: "0.36$",
  },
  {
    name: "PAQUETE DE VALOR DE PUNTOS DE HONOR",
    price: "0.36$",
  },
  {
    name: "PAQUETE DE REEMBOLSO POR COMPRA ESTÁNDAR",
    price: "0.43$",
  },
  {
    name: "80 FICHAS",
    price: "0.95$",
  },
  {
    name: "TARJETA SEMANAL",
    price: "1.07$",
  },
  {
    name: "PAQUETE DE REEMBOLSO POR COMPRA PREMIUM",
    price: "1.29$",
  },
  {
    name: "240 FICHAS",
    price: "2.63$",
  },
  {
    name: "TARJETA SEMANAL PLUS",
    price: "2.95$",
  },
  {
    name: "400 FICHAS",
    price: "4.32$",
  },
  {
    name: "560 FICHAS",
    price: "6.01$",
  },
  {
    name: "830 FICHAS",
    price: "8.54$",
  },
  {
    name: "1245 FICHAS",
    price: "12.76$",
  },
  {
    name: "2508 TOKENS",
    price: "25.44$",
  },
  {
    name: "4180 TOKENS",
    price: "42.33$",
  },
  {
    name: "8360 TOKENS",
    price: "84.57$",
  },
];

export default function HonorOfKingsPage() {
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
      game: "HONOR OF KINGS",
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
            HONOR OF KINGS
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
          src="/images/honor-of-kings.jpg"
          alt="Honor of Kings"
        />

      </section>


      {/* =========================
          TÍTULO
      ========================== */}

      <section className="offers-toggle">

        <div>

          <span>
            ⚔️ TOP UP
          </span>

          <h2>
            OFERTAS HONOR OF KINGS
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
                ⚔️
              </div>

              <div className="offer-info">

                <strong>
                  {offer.name}
                </strong>

                <span>
                  Honor of Kings
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

            <label htmlFor="honor-of-kings-player-id">
              ID DEL JUGADOR
            </label>

            <input
              id="honor-of-kings-player-id"
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
