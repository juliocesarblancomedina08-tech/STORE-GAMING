"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const gameNote =
  "Región: Global. Recarga automática de Arena Breakout. La moneda se entrega directamente a tu cuenta una vez realizada la orden";

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

  const [selectedOffer, setSelectedOffer] =
    useState<number | null>(null);

  const [quantity, setQuantity] = useState(1);

  const [playerId, setPlayerId] = useState("");

  const selected =
    selectedOffer !== null
      ? offers[selectedOffer]
      : null;

  function decreaseQuantity() {
    setQuantity((current) =>
      Math.max(1, current - 1)
    );
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

  const total = selected
    ? (
        parseFloat(
          selected.price.replace("$", "")
        ) * quantity
      ).toFixed(2)
    : "0.00";

  return (
    <main className="arena-breakout-page">

      {/* =====================================================
          HEADER
          ===================================================== */}

      <header className="arena-breakout-header">

        <button
          type="button"
          className="arena-breakout-back-button"
          onClick={() => router.push("/top-up")}
          aria-label="Volver"
        >
          ←
        </button>

        <div className="arena-breakout-header-title">

          <span>
            STORE GAMING
          </span>

          <h1>
            ARENA BREAKOUT
          </h1>

        </div>

        <button
          type="button"
          className="arena-breakout-orders-button"
          onClick={() => router.push("/orders")}
          aria-label="Mis órdenes"
        >
          ☰
        </button>

      </header>


      {/* =====================================================
          CONTENIDO
          ===================================================== */}

      <div className="arena-breakout-content">

        {/* ===================================================
            BANNER
            =================================================== */}

        <section className="arena-breakout-banner">

          <img
            src="/images/arena-breakout.jpg"
            alt="Arena Breakout"
          />

          <div className="arena-breakout-banner-overlay">

            <div className="arena-breakout-banner-text">

              <span>
                🎮 TOP UP
              </span>

              <strong>
                ARENA BREAKOUT
              </strong>

            </div>

          </div>

        </section>


        {/* ===================================================
            NOTA PRINCIPAL
            =================================================== */}

        <div className="arena-breakout-note">

          <div className="arena-breakout-note-icon">
            !
          </div>

          <div className="arena-breakout-note-content">

            <strong>
              INFORMACIÓN
            </strong>

            <p>
              {gameNote}
            </p>

          </div>

        </div>


        {/* ===================================================
            TÍTULO OFERTAS
            =================================================== */}

        <section className="arena-breakout-offers-toggle">

          <div>

            <span>
              SELECCIONA UNA OFERTA
            </span>

            <h2>
              OFERTAS DISPONIBLES
            </h2>

          </div>

          <span className="arena-breakout-offers-arrow">
            ↓
          </span>

        </section>


        {/* ===================================================
            OFERTAS
            =================================================== */}

        <section className="arena-breakout-offers-section">

          <div className="arena-breakout-offers-list">

            {offers.map((offer, index) => (

              <button
                key={offer.name}
                type="button"
                className={
                  selectedOffer === index
                    ? "arena-breakout-offer selected"
                    : "arena-breakout-offer"
                }
                onClick={() =>
                  selectOffer(index)
                }
              >

                <div className="arena-breakout-offer-left">

                  <div className="arena-breakout-offer-icon">
                    🎮
                  </div>

                  <div>

                    <div className="arena-breakout-offer-name">
                      {offer.name}
                    </div>

                    <div className="arena-breakout-offer-description">
                      Arena Breakout
                    </div>

                  </div>

                </div>

                <div className="arena-breakout-offer-right">

                  <div className="arena-breakout-offer-price">
                    {offer.price}
                  </div>

                  <span>
                    →
                  </span>

                </div>

              </button>

            ))}

          </div>

        </section>


        {/* ===================================================
            PEDIDO
            =================================================== */}

        {selected && (

          <section className="arena-breakout-order-section">

            {/* ===============================================
                OFERTA SELECCIONADA
                =============================================== */}

            <div className="arena-breakout-selected-offer">

              <div>

                <span>
                  OFERTA SELECCIONADA
                </span>

                <strong>
                  {selected.name}
                </strong>

              </div>

              <strong>
                {selected.price}
              </strong>

            </div>


            {/* ===============================================
                CANTIDAD
                =============================================== */}

            <div className="arena-breakout-quantity-section">

              <span>
                CANTIDAD
              </span>

              <div className="arena-breakout-quantity-control">

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


            {/* ===============================================
                NOTA DEL PEDIDO
                =============================================== */}

            <div className="arena-breakout-order-note">

              <div className="arena-breakout-note-icon">
                !
              </div>

              <div className="arena-breakout-note-content">

                <strong>
                  NOTA
                </strong>

                <p>
                  {gameNote}
                </p>

              </div>

            </div>


            {/* ===============================================
                ID DEL JUGADOR
                =============================================== */}

            <div className="arena-breakout-order-form">

              <label htmlFor="arena-player-id">
                ID DEL JUGADOR
              </label>

              <div className="arena-breakout-input-wrapper">

                <input
                  id="arena-player-id"
                  type="text"
                  inputMode="numeric"
                  placeholder="Introduce tu ID"
                  value={playerId}
                  onChange={(event) =>
                    setPlayerId(
                      event.target.value
                    )
                  }
                />

              </div>

            </div>


            {/* ===============================================
                TOTAL
                =============================================== */}

            <div className="arena-breakout-total">

              <span>
                TOTAL
              </span>

              <strong>
                {total}$
              </strong>

            </div>


            {/* ===============================================
                CONTINUAR
                =============================================== */}

            <button
              type="button"
              className="arena-breakout-create-order-button"
              onClick={continueOrder}
              disabled={!playerId.trim()}
            >
              CONTINUAR →
            </button>

          </section>

        )}

      </div>


      {/* =====================================================
          INFORMACIÓN DEL SERVICIO
          ===================================================== */}

      <section className="arena-breakout-service-info">

        <div className="arena-breakout-service-info-title">
          INFORMACIÓN DEL SERVICIO
        </div>

        <p className="arena-breakout-service-info-text">
          Introduce correctamente tu ID de jugador.
          La recarga se procesa directamente en tu
          cuenta de Arena Breakout.
        </p>

      </section>


      {/* =====================================================
          FOOTER
          ===================================================== */}

      <footer className="arena-breakout-footer">

        🛒 STORE GAMING 🎮
        <br />

        Recargas gaming rápidas y seguras

      </footer>


      {/* =====================================================
          ESTILOS
          ===================================================== */}

      <style jsx>{`

        .arena-breakout-page {
          position: relative;
          width: 100%;
          min-height: 100vh;
          min-height: 100dvh;
          padding-bottom: 30px;
          overflow-x: hidden;
          background:
            linear-gradient(
              180deg,
              rgba(0, 0, 0, 0.58),
              rgba(0, 0, 0, 0.97)
            ),
            url("/images/battle-royale-bg.jpg")
              center / cover
              no-repeat;
          color: #fff;
        }


        /* =====================================================
           HEADER
           ===================================================== */

        .arena-breakout-header {
          position: sticky;
          top: 0;
          z-index: 30;

          width: 100%;
          min-height: 68px;

          display: flex;
          align-items: center;

          padding: 10px 12px;

          background:
            rgba(5, 5, 5, 0.94);

          border-bottom:
            1px solid
            rgba(255, 255, 255, 0.08);

          backdrop-filter:
            blur(14px);
        }


        .arena-breakout-back-button,
        .arena-breakout-orders-button {
          width: 43px;
          height: 43px;
          flex: 0 0 43px;

          display: flex;
          align-items: center;
          justify-content: center;

          border: 1px solid
            rgba(255, 255, 255, 0.1);

          border-radius: 13px;

          background:
            rgba(18, 18, 18, 0.94);

          color: #fff;

          font-size: 21px;
          font-weight: 950;

          cursor: pointer;

          -webkit-tap-highlight-color:
            transparent;

          touch-action: manipulation;
        }


        .arena-breakout-back-button:active,
        .arena-breakout-orders-button:active {
          transform: scale(0.96);
        }


        .arena-breakout-header-title {
          flex: 1;

          min-width: 0;

          display: flex;
          flex-direction: column;

          align-items: center;
          justify-content: center;

          padding: 0 8px;

          text-align: center;
        }


        .arena-breakout-header-title span {
          color: rgba(255, 255, 255, 0.55);

          font-size: 8px;
          font-weight: 950;

          letter-spacing: 1.8px;
        }


        .arena-breakout-header-title h1 {
          margin: 2px 0 0;

          color: #fff;

          font-size: 14px;
          font-weight: 950;

          letter-spacing: 0.5px;
        }


        /* =====================================================
           CONTENT
           ===================================================== */

        .arena-breakout-content {
          position: relative;
          z-index: 2;

          width: 100%;
          max-width: 620px;

          margin: 0 auto;

          padding: 12px 13px 0;
        }


        /* =====================================================
           BANNER
           ===================================================== */

        .arena-breakout-banner {
          position: relative;

          width: 100%;
          height: 190px;

          overflow: hidden;

          border-radius: 18px;

          background: #080808;

          border: 1px solid
            rgba(255, 255, 255, 0.08);

          box-shadow:
            0 18px 40px
            rgba(0, 0, 0, 0.5);
        }


        .arena-breakout-banner img {
          width: 100%;
          height: 100%;

          display: block;

          object-fit: cover;
        }


        .arena-breakout-banner-overlay {
          position: absolute;
          inset: 0;

          display: flex;
          align-items: flex-end;

          padding: 18px;

          background:
            linear-gradient(
              180deg,
              rgba(0, 0, 0, 0.05),
              rgba(0, 0, 0, 0.82)
            );
        }


        .arena-breakout-banner-text {
          display: flex;
          flex-direction: column;
        }


        .arena-breakout-banner-text span {
          color: rgba(255, 255, 255, 0.7);

          font-size: 10px;
          font-weight: 900;

          letter-spacing: 1.2px;
        }


        .arena-breakout-banner-text strong {
          margin-top: 3px;

          color: #fff;

          font-size: 25px;
          font-weight: 1000;

          letter-spacing: 0.4px;
        }


        /* =====================================================
           NOTAS
           ===================================================== */

        .arena-breakout-note,
        .arena-breakout-order-note {
          display: flex;
          align-items: flex-start;

          gap: 11px;

          margin-top: 14px;

          padding: 13px;

          border-radius: 14px;

          background:
            rgba(12, 12, 12, 0.92);

          border: 1px solid
            rgba(255, 255, 255, 0.08);
        }


        .arena-breakout-note-icon {
          width: 31px;
          height: 31px;
          flex: 0 0 31px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 10px;

          background:
            rgba(229, 9, 20, 0.13);

          border: 1px solid
            rgba(229, 9, 20, 0.25);

          color: #ff3039;

          font-size: 15px;
          font-weight: 1000;
        }


        .arena-breakout-note-content {
          min-width: 0;
        }


        .arena-breakout-note-content strong {
          display: block;

          color: #fff;

          font-size: 11px;
          font-weight: 950;
        }


        .arena-breakout-note-content p {
          margin: 4px 0 0;

          color:
            rgba(255, 255, 255, 0.6);

          font-size: 10px;
          line-height: 1.5;
        }


        /* =====================================================
           OFERTAS HEADER
           ===================================================== */

        .arena-breakout-offers-toggle {
          margin-top: 20px;

          padding: 15px;

          display: flex;
          align-items: center;
          justify-content: space-between;

          border-radius: 16px;

          background:
            linear-gradient(
              145deg,
              rgba(25, 25, 25, 0.96),
              rgba(7, 7, 7, 0.96)
            );

          border: 1px solid
            rgba(255, 255, 255, 0.09);

          box-shadow:
            0 12px 28px
            rgba(0, 0, 0, 0.38);
        }


        .arena-breakout-offers-toggle span:first-child {
          color:
            rgba(255, 255, 255, 0.52);

          font-size: 9px;
          font-weight: 900;

          letter-spacing: 1px;
        }


        .arena-breakout-offers-toggle h2 {
          margin: 4px 0 0;

          color: #fff;

          font-size: 16px;
          font-weight: 950;
        }


        .arena-breakout-offers-arrow {
          width: 36px;
          height: 36px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 11px;

          background:
            rgba(229, 9, 20, 0.1);

          border: 1px solid
            rgba(229, 9, 20, 0.2);

          color: #ff3039;

          font-size: 17px;
          font-weight: 950;
        }


        /* =====================================================
           OFERTAS
           ===================================================== */

        .arena-breakout-offers-section {
          margin-top: 10px;
        }


        .arena-breakout-offers-list {
          display: flex;
          flex-direction: column;

          gap: 8px;
        }


        .arena-breakout-offer {
          width: 100%;
          min-height: 68px;

          display: flex;
          align-items: center;
          justify-content: space-between;

          padding: 10px 12px;

          border-radius: 14px;

          background:
            linear-gradient(
              145deg,
              rgba(23, 23, 23, 0.97),
              rgba(7, 7, 7, 0.97)
            );

          border: 1px solid
            rgba(255, 255, 255, 0.08);

          color: #fff;

          text-align: left;

          cursor: pointer;

          -webkit-tap-highlight-color:
            transparent;

          touch-action: manipulation;

          transition:
            transform 0.15s ease,
            border-color 0.15s ease,
            background 0.15s ease;
        }


        .arena-breakout-offer:hover {
          border-color:
            rgba(229, 9, 20, 0.4);
        }


        .arena-breakout-offer:active {
          transform: scale(0.985);
        }


                .arena-breakout-offer.selected {
          border-color:
            rgba(229, 9, 20, 0.65);

          background:
            linear-gradient(
              145deg,
              rgba(38, 14, 16, 0.98),
              rgba(10, 7, 7, 0.98)
            );

          box-shadow:
            0 0 0 1px
            rgba(229, 9, 20, 0.12),
            0 12px 28px
            rgba(0, 0, 0, 0.35);
        }


        .arena-breakout-offer-left {
          min-width: 0;

          display: flex;
          align-items: center;

          gap: 11px;
        }


        .arena-breakout-offer-icon {
          width: 39px;
          height: 39px;
          flex: 0 0 39px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 11px;

          background:
            rgba(229, 9, 20, 0.1);

          border: 1px solid
            rgba(229, 9, 20, 0.2);

          font-size: 18px;
        }


        .arena-breakout-offer-name {
          color: #fff;

          font-size: 12px;
          font-weight: 950;
        }


        .arena-breakout-offer-description {
          margin-top: 3px;

          color:
            rgba(255, 255, 255, 0.48);

          font-size: 9px;
          font-weight: 700;
        }


        .arena-breakout-offer-right {
          flex: 0 0 auto;

          display: flex;
          align-items: center;

          gap: 10px;
        }


        .arena-breakout-offer-price {
          color: #fff;

          font-size: 15px;
          font-weight: 1000;
        }


        .arena-breakout-offer-right span {
          color: #e50914;

          font-size: 20px;
          font-weight: 900;
        }


        /* =====================================================
           PEDIDO
           ===================================================== */

        .arena-breakout-order-section {
          margin-top: 18px;

          padding: 14px;

          border-radius: 18px;

          background:
            linear-gradient(
              145deg,
              rgba(22, 22, 22, 0.98),
              rgba(6, 6, 6, 0.98)
            );

          border: 1px solid
            rgba(255, 255, 255, 0.1);

          box-shadow:
            0 18px 42px
            rgba(0, 0, 0, 0.45);
        }


        .arena-breakout-selected-offer {
          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 12px;

          padding: 14px;

          border-radius: 13px;

          background:
            rgba(255, 255, 255, 0.04);

          border: 1px solid
            rgba(255, 255, 255, 0.07);
        }


        .arena-breakout-selected-offer span {
          display: block;

          color:
            rgba(255, 255, 255, 0.45);

          font-size: 8px;
          font-weight: 900;

          letter-spacing: 1px;
        }


        .arena-breakout-selected-offer div strong {
          display: block;

          margin-top: 4px;

          color: #fff;

          font-size: 14px;
          font-weight: 950;
        }


        .arena-breakout-selected-offer > strong {
          color: #fff;

          font-size: 18px;
          font-weight: 1000;
        }


        /* =====================================================
           CANTIDAD
           ===================================================== */

        .arena-breakout-quantity-section {
          margin-top: 15px;

          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 12px;
        }


        .arena-breakout-quantity-section > span {
          color:
            rgba(255, 255, 255, 0.58);

          font-size: 10px;
          font-weight: 900;
        }


        .arena-breakout-quantity-control {
          height: 42px;

          display: flex;
          align-items: center;

          overflow: hidden;

          border-radius: 12px;

          background:
            rgba(255, 255, 255, 0.05);

          border: 1px solid
            rgba(255, 255, 255, 0.1);
        }


        .arena-breakout-quantity-control button {
          width: 42px;
          height: 42px;

          border: 0;

          background: transparent;

          color: #fff;

          font-size: 21px;
          font-weight: 900;

          cursor: pointer;

          -webkit-tap-highlight-color:
            transparent;
        }


        .arena-breakout-quantity-control button:active {
          background:
            rgba(255, 255, 255, 0.08);
        }


        .arena-breakout-quantity-control strong {
          min-width: 34px;

          color: #fff;

          text-align: center;

          font-size: 14px;
          font-weight: 950;
        }


        /* =====================================================
           NOTA DEL PEDIDO
           ===================================================== */

        .arena-breakout-order-note {
          margin-top: 15px;
        }


        /* =====================================================
           FORMULARIO
           ===================================================== */

        .arena-breakout-order-form {
          margin-top: 16px;
        }


        .arena-breakout-order-form label {
          display: block;

          margin-bottom: 7px;

          color:
            rgba(255, 255, 255, 0.65);

          font-size: 10px;
          font-weight: 900;

          letter-spacing: 0.4px;
        }


        .arena-breakout-input-wrapper {
          width: 100%;
          height: 52px;

          display: flex;
          align-items: center;

          padding: 0 13px;

          border-radius: 13px;

          background:
            rgba(255, 255, 255, 0.045);

          border: 1px solid
            rgba(255, 255, 255, 0.1);

          transition:
            border-color 0.15s ease,
            box-shadow 0.15s ease;
        }


        .arena-breakout-input-wrapper:focus-within {
          border-color:
            rgba(229, 9, 20, 0.7);

          box-shadow:
            0 0 0 3px
            rgba(229, 9, 20, 0.08);
        }


        .arena-breakout-input-wrapper input {
          width: 100%;
          height: 100%;

          border: 0;
          outline: 0;

          background: transparent;

          color: #fff;

          font-size: 14px;
          font-weight: 700;
        }


        .arena-breakout-input-wrapper input::placeholder {
          color:
            rgba(255, 255, 255, 0.3);
        }


        /* =====================================================
           TOTAL
           ===================================================== */

        .arena-breakout-total {
          margin-top: 10px;

          padding: 13px;

          display: flex;
          align-items: center;
          justify-content: space-between;

          border-radius: 12px;

          background:
            rgba(255, 255, 255, 0.04);
        }


        .arena-breakout-total span {
          color:
            rgba(255, 255, 255, 0.5);

          font-size: 10px;
          font-weight: 900;
        }


        .arena-breakout-total strong {
          color: #fff;

          font-size: 20px;
          font-weight: 1000;
        }


        /* =====================================================
           BOTÓN CREAR / CONTINUAR
           ===================================================== */

        .arena-breakout-create-order-button {
          width: 100%;
          min-height: 52px;

          margin-top: 12px;

          border: 0;
          border-radius: 13px;

          background: #fff;
          color: #080808;

          font-size: 15px;
          font-weight: 950;

          cursor: pointer;

          -webkit-tap-highlight-color:
            transparent;

          touch-action: manipulation;

          transition:
            transform 0.15s ease,
            opacity 0.15s ease;
        }


        .arena-breakout-create-order-button:active {
          transform: scale(0.98);
        }


        .arena-breakout-create-order-button:disabled {
          opacity: 0.45;

          cursor: not-allowed;
        }


        /* =====================================================
           INFORMACIÓN DEL SERVICIO
           ===================================================== */

        .arena-breakout-service-info {
          position: relative;
          z-index: 2;

          width: calc(100% - 26px);
          max-width: 594px;

          margin: 18px auto 0;

          padding: 15px;

          border-radius: 15px;

          background:
            rgba(10, 10, 10, 0.9);

          border: 1px solid
            rgba(255, 255, 255, 0.08);
        }


        .arena-breakout-service-info-title {
          color: #fff;

          font-size: 13px;
          font-weight: 950;
        }


        .arena-breakout-service-info-text {
          margin: 6px 0 0;

          color:
            rgba(255, 255, 255, 0.55);

          font-size: 10px;
          line-height: 1.5;
        }


        /* =====================================================
           FOOTER
           ===================================================== */

        .arena-breakout-footer {
          position: relative;
          z-index: 2;

          padding: 20px 12px 25px;

          text-align: center;

          color:
            rgba(255, 255, 255, 0.5);

          font-size: 11px;
          font-weight: 800;

          line-height: 1.6;
        }


        /* =====================================================
           MÓVILES PEQUEÑOS
           ===================================================== */

        @media (max-width: 420px) {

          .arena-breakout-content {
            padding-left: 11px;
            padding-right: 11px;
          }

          .arena-breakout-banner {
            height: 180px;
          }

          .arena-breakout-banner-text strong {
            font-size: 22px;
          }

          .arena-breakout-offer {
            padding: 9px 10px;
          }

          .arena-breakout-offer-price {
            font-size: 14px;
          }

          .arena-breakout-order-section {
            padding: 12px;
          }

        }

      `}</style>

    </main>
  );
}
