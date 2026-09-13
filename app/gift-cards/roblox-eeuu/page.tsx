"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type GiftCardOffer = {
  id: number;
  amount: number;
  price: number;
};

const offers: GiftCardOffer[] = [
  { id: 1, amount: 3, price: 3.18 },
  { id: 2, amount: 4, price: 4.19 },
  { id: 3, amount: 5, price: 5.18 },
  { id: 4, amount: 10, price: 9.42 },
  { id: 5, amount: 15, price: 14.27 },
  { id: 6, amount: 20, price: 18.98 },
  { id: 7, amount: 25, price: 23.68 },
  { id: 8, amount: 30, price: 28.52 },
  { id: 9, amount: 50, price: 46.49 },
  { id: 10, amount: 75, price: 70.75 },
  { id: 11, amount: 100, price: 94.28 },
  { id: 12, amount: 200, price: 188.40 },
];

const productNote =
  "Región: EE. UU. Tarjetas de regalo de Roblox. Los códigos se pueden guardar de forma segura y canjear posteriormente.";

export default function RobloxEeuuGiftCardPage() {
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
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
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
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 100);
  };

  const createOrder = () => {
    if (!selectedOffer) return;

    const newOrderNumber = `GC-${Date.now()
      .toString()
      .slice(-8)}`;

    const total = selectedOffer.price * quantity;

    const newOrder = {
      id: newOrderNumber,
      orderNumber: newOrderNumber,
      type: "GIFT CARD",
      game: "ROBLOX (EE.UU)",
      offer: `${selectedOffer.amount} USD`,
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

      const updatedOrders = [
        newOrder,
        ...existingOrders,
      ];

      localStorage.setItem(
        "storeGamingOrders",
        JSON.stringify(updatedOrders)
      );

      localStorage.setItem(
        "storeGamingLastOrder",
        JSON.stringify(newOrder)
      );
    } catch (error) {
      console.error(
        "Error guardando el pedido:",
        error
      );
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
            ROBLOX <span>(EE.UU)</span>
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
          <div className="order-success-icon">
            ✓
          </div>

          <h2>¡PEDIDO CREADO!</h2>

          <p className="order-success-message">
            Tu pedido ha sido registrado correctamente.
          </p>

          <div className="selected-order-card">
            <div className="selected-order-game">
              ROBLOX (EE.UU)
            </div>

            <div className="selected-order-offer">
              {selectedOffer.amount} USD
            </div>

            <div className="selected-order-quantity">
              Cantidad: {quantity}
            </div>

            <div className="selected-order-price">
              Precio unitario: $
              {selectedOffer.price.toFixed(2)}
            </div>

            <div className="selected-order-total">
              Total: ${total.toFixed(2)}
            </div>

            <div className="selected-order-number">
              Pedido: {orderNumber}
            </div>
          </div>

          <div className="game-note">
            <div className="game-note-icon">
              !
            </div>

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
          ROBLOX <span>(EE.UU)</span>
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
          src="/images/gift-cards/gift-roblox-eeuu.jpg"
          alt="Roblox EE.UU"
          className="free-fire-main-image"
        />

        <h2>ROBLOX (EE.UU)</h2>
      </section>

      <section className="gift-card-main-note">
        <div className="game-note">
          <div className="game-note-icon">
            !
          </div>

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
          SELECCIONA TU TARJETA
        </button>

        <div className="offers-list">
          {offers.map((offer) => (
            <button
              key={offer.id}
              type="button"
              className={`offer-card ${
                selectedOffer?.id === offer.id
                  ? "selected"
                  : ""
              }`}
              onClick={() => selectOffer(offer)}
            >
              <div className="diamond-icon">
                $
              </div>

              <div className="offer-info">
                <strong>
                  {offer.amount} USD
                </strong>
              </div>

              <div className="offer-right">
                <strong>
                  ${offer.price.toFixed(2)}
                </strong>
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
            <div className="game-note-icon">
              !
            </div>

            <div className="game-note-content">
              {productNote}
            </div>
          </div>

          <div className="selected-order-card">
            <div className="selected-order-game">
              ROBLOX (EE.UU)
            </div>

            <div className="selected-order-offer">
              {selectedOffer.amount} USD
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
            {(
              selectedOffer.price * quantity
            ).toFixed(2)}
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
              <strong>ROBLOX (EE.UU)</strong>
            </div>

            <div className="confirmation-row">
              <span>Tarjeta</span>
              <strong>
                {selectedOffer.amount} USD
              </strong>
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
                ${(
                  selectedOffer.price * quantity
                ).toFixed(2)}
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
        <span>
          Tarjetas de regalo Roblox (EE.UU)
        </span>
      </footer>
    </main>
  );
}
