"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type GiftCardOffer = {
  id: number;
  robux: number;
  price: number;
};

const offers: GiftCardOffer[] = [
  { id: 1, robux: 50, price: 1.02 },
  { id: 2, robux: 100, price: 1.73 },
  { id: 3, robux: 199, price: 2.74 },
  { id: 4, robux: 200, price: 3.03 },
  { id: 5, robux: 215, price: 3.18 },
  { id: 6, robux: 255, price: 3.52 },
  { id: 7, robux: 260, price: 3.84 },
  { id: 8, robux: 285, price: 4.19 },
  { id: 9, robux: 300, price: 4.45 },
  { id: 10, robux: 345, price: 4.97 },
  { id: 11, robux: 380, price: 5.14 },
  { id: 12, robux: 355, price: 5.18 },
  { id: 13, robux: 395, price: 5.33 },
  { id: 14, robux: 400, price: 5.90 },
  { id: 15, robux: 500, price: 7.26 },
  { id: 16, robux: 520, price: 7.83 },
  { id: 17, robux: 800, price: 9.28 },
  { id: 18, robux: 715, price: 9.42 },
  { id: 19, robux: 1000, price: 11.51 },
  { id: 20, robux: 1200, price: 15.45 },
  { id: 21, robux: 2000, price: 22.04 },
  { id: 22, robux: 1785, price: 23.68 },
  { id: 23, robux: 2500, price: 29.76 },
  { id: 24, robux: 3000, price: 37.05 },
  { id: 25, robux: 4500, price: 48.35 },
  { id: 26, robux: 10000, price: 99.55 },
];

const productNote =
  "Región: RU. Tarjetas de regalo de Roblox. Las tarjetas de regalo se convierten automáticamente en Robux y saldo en moneda local después de su canje";

export default function RobloxRuGiftCardPage() {
  const router = useRouter();

  const [selectedOffer, setSelectedOffer] =
    useState<GiftCardOffer | null>(null);

  const [quantity, setQuantity] = useState(1);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [orderCreated, setOrderCreated] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");

  const selectOffer = (offer: GiftCardOffer) => {
    setSelectedOffer(offer);
    setQuantity(1);
    setShowConfirmation(false);

    setTimeout(() => {
      document
        .getElementById("gift-card-order")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const increaseQuantity = () => {
    setQuantity((current) => current + 1);
  };

  const decreaseQuantity = () => {
    setQuantity((current) => Math.max(1, current - 1));
  };

  const continueOrder = () => {
    if (!selectedOffer) return;

    setShowConfirmation(true);

    setTimeout(() => {
      document
        .getElementById("gift-card-confirmation")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const createOrder = () => {
    if (!selectedOffer) return;

    const newOrderNumber = `GC-${Date.now().toString().slice(-8)}`;

    const total = selectedOffer.price * quantity;

    const newOrder = {
      id: newOrderNumber,
      orderNumber: newOrderNumber,
      type: "GIFT CARD",
      game: "ROBLOX (RU)",
      offer: `${selectedOffer.robux} Robux`,
      quantity,
      price: selectedOffer.price,
      total,
      status: "PENDIENTE",
      createdAt: new Date().toISOString(),
    };

    try {
      const existingOrders = JSON.parse(
        localStorage.getItem("storeGamingOrders") || "[]"
      );

      const updatedOrders = [newOrder, ...existingOrders];

      localStorage.setItem(
        "storeGamingOrders",
        JSON.stringify(updatedOrders)
      );

      localStorage.setItem(
        "storeGamingLastOrder",
        JSON.stringify(newOrder)
      );
    } catch (error) {
      console.error("Error guardando el pedido:", error);
    }

    setOrderNumber(newOrderNumber);
    setOrderCreated(true);

    setTimeout(() => {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }, 100);
  };

  if (orderCreated && selectedOffer) {
    const total = selectedOffer.price * quantity;

    return (
      <main className="game-service-page gift-card-service-page">
        <header className="game-service-header">
          <button
            className="game-back-button"
            onClick={() => router.push("/gift-cards")}
            aria-label="Volver"
          >
            ←
          </button>

          <h1 className="game-header-title">
            ROBLOX <span>(RU)</span>
          </h1>

          <button
            className="game-cart-button"
            onClick={() => router.push("/cart")}
            aria-label="Carrito"
          >
            🛒
          </button>
        </header>

        <section className="order-success-section gift-card-success-section">
          <div className="order-success-icon">✓</div>

          <h2>¡PEDIDO CREADO!</h2>

          <p className="order-success-message">
            Tu pedido ha sido registrado correctamente.
          </p>

          <div className="selected-order-card">
            <div className="selected-order-game">
              ROBLOX (RU)
            </div>

            <div className="selected-order-offer">
              {selectedOffer.robux} Robux
            </div>

            <div className="selected-order-quantity">
              Cantidad: {quantity}
            </div>

            <div className="selected-order-price">
              Precio unitario: ${selectedOffer.price.toFixed(2)}
            </div>

            <div className="selected-order-total">
              Total: ${total.toFixed(2)}
            </div>

            <div className="selected-order-number">
              Pedido: {orderNumber}
            </div>
          </div>

          <div className="game-note">
            <div className="game-note-icon">!</div>

            <div className="game-note-content">
              {productNote}
            </div>
          </div>

          <button
            className="finish-order-button"
            onClick={() => router.push("/orders")}
          >
            VER MIS PEDIDOS
          </button>

          <button
            className="game-back-button-bottom"
            onClick={() => router.push("/gift-cards")}
          >
            VOLVER A TARJETAS DE REGALO
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="game-service-page gift-card-service-page">
      <header className="game-service-header">
        <button
          className="game-back-button"
          onClick={() => router.push("/gift-cards")}
          aria-label="Volver"
        >
          ←
        </button>

        <h1 className="game-header-title">
          ROBLOX <span>(RU)</span>
        </h1>

        <button
          className="game-cart-button"
          onClick={() => router.push("/cart")}
          aria-label="Carrito"
        >
          🛒
        </button>
      </header>

      <section className="game-service-hero">
        <img
          src="/images/gift-cards/gift-roblox-ru.jpg"
          alt="Roblox RU"
          className="free-fire-main-image"
        />

        <h2>ROBLOX (RU)</h2>
      </section>

      <section className="gift-card-main-note">
        <div className="game-note">
          <div className="game-note-icon">!</div>

          <div className="game-note-content">
            {productNote}
          </div>
        </div>
      </section>

      <section className="offers-section">
        <button
          className="offers-toggle"
          type="button"
        >
          SELECCIONA TU CANTIDAD DE ROBUX
        </button>

        <div className="offers-list">
          {offers.map((offer) => (
            <button
              key={offer.id}
              type="button"
              className={`offer-card ${
                selectedOffer?.id === offer.id ? "selected" : ""
              }`}
              onClick={() => selectOffer(offer)}
            >
              <div className="diamond-icon">R$</div>

              <div className="offer-info">
                <strong>{offer.robux} Robux</strong>
              </div>

              <div className="offer-right">
                <strong>${offer.price.toFixed(2)}</strong>
              </div>
            </button>
          ))}
        </div>
      </section>

      {selectedOffer && (
        <section
          id="gift-card-order"
          className="order-section gift-card-order-section"
        >
          <div className="game-note game-note-order">
            <div className="game-note-icon">!</div>

            <div className="game-note-content">
              {productNote}
            </div>
          </div>

          <div className="selected-order-card">
            <div className="selected-order-game">
              ROBLOX (RU)
            </div>

            <div className="selected-order-offer">
              {selectedOffer.robux} Robux
            </div>

            <div className="selected-order-price">
              ${selectedOffer.price.toFixed(2)}
            </div>
          </div>

          <div className="quantity-control">
            <button
              type="button"
              onClick={decreaseQuantity}
              aria-label="Disminuir cantidad"
            >
              −
            </button>

            <span>{quantity}</span>

            <button
              type="button"
              onClick={increaseQuantity}
              aria-label="Aumentar cantidad"
            >
              +
            </button>
          </div>

          <div className="selected-order-total">
            Total: $
            {(selectedOffer.price * quantity).toFixed(2)}
          </div>

          <button
            className="finish-order-button"
            type="button"
            onClick={continueOrder}
          >
            CONTINUAR
          </button>
        </section>
      )}

      {showConfirmation && selectedOffer && (
        <section
          id="gift-card-confirmation"
          className="confirmation-section gift-card-confirmation-section"
        >
          <div className="confirmation-card">
            <h2>CONFIRMAR PEDIDO</h2>

            <div className="confirmation-row">
              <span>Producto</span>
              <strong>ROBLOX (RU)</strong>
            </div>

            <div className="confirmation-row">
              <span>Robux</span>
              <strong>{selectedOffer.robux}</strong>
            </div>

            <div className="confirmation-row">
              <span>Cantidad</span>
              <strong>{quantity}</strong>
            </div>

            <div className="confirmation-row">
              <span>Precio unitario</span>
              <strong>
                ${selectedOffer.price.toFixed(2)}
              </strong>
            </div>

            <div className="confirmation-total">
              <span>TOTAL</span>

              <strong>
                ${(selectedOffer.price * quantity).toFixed(2)}
              </strong>
            </div>

            <button
              className="confirm-final-button"
              type="button"
              onClick={createOrder}
            >
              CONFIRMAR PEDIDO
            </button>
          </div>
        </section>
      )}

      <footer className="game-service-footer gift-card-footer">
        <p>STORE GAMING</p>
        <span>Tarjetas de regalo Roblox (RU)</span>
      </footer>
    </main>
  );
  }
