"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type GiftCardOffer = {
  id: number;
  cp: number;
  price: number;
};

const offers: GiftCardOffer[] = [
  { id: 1, cp: 60, price: 1.00 },
  { id: 2, cp: 310, price: 4.38 },
  { id: 3, cp: 630, price: 8.60 },
  { id: 4, cp: 1580, price: 21.27 },
  { id: 5, cp: 3200, price: 42.38 },
  { id: 6, cp: 6500, price: 84.62 },
];

const productNote =
  "Región: Global Arena. Tarjetas de regalo Breakout para Midasbuy.com. Los códigos se pueden guardar de forma segura y canjear posteriormente.";

export default function ArenaBreakoutGiftCardPage() {
  const router = useRouter();

  const [selectedOffer, setSelectedOffer] =
    useState<GiftCardOffer | null>(null);

  const [quantity, setQuantity] = useState(1);
  const [showConfirmation, setShowConfirmation] =
    useState(false);
  const [orderCreated, setOrderCreated] =
    useState(false);
  const [orderNumber, setOrderNumber] =
    useState("");

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
    setQuantity((current) =>
      Math.max(1, current - 1)
    );
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

    const total =
      selectedOffer.price * quantity;

    const newOrder = {
      id: newOrderNumber,
      orderNumber: newOrderNumber,
      type: "GIFT CARD",
      game: "ARENA BREAKOUT",
      offer: `${selectedOffer.cp} CP`,
      quantity,
      price: selectedOffer.price,
      total,
      status: "PENDIENTE",
      createdAt: new Date().toISOString(),
    };

    try {
      const existingOrders = JSON.parse(
        localStorage.getItem(
          "storeGamingOrders"
        ) || "[]"
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
    const total =
      selectedOffer.price * quantity;

    return (
      <main className="game-service-page gift-card-service-page">
        <header className="game-service-header">
          <button
            className="game-back-button"
            onClick={() =>
              router.push("/gift-cards")
            }
            aria-label="Volver"
          >
            ←
          </button>

          <h1 className="game-header-title">
            ARENA BREAKOUT
          </h1>

          <button
            className="game-cart-button"
            onClick={() =>
              router.push("/cart")
            }
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
            Tu pedido ha sido registrado
            correctamente.
          </p>

          <div className="selected-order-card">
            <div className="selected-order-game">
              ARENA BREAKOUT
            </div>

            <div className="selected-order-offer">
              {selectedOffer.cp} CP
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
            onClick={() =>
              router.push("/orders")
            }
          >
            VER MIS PEDIDOS
          </button>

          <button
            className="game-back-button-bottom"
            onClick={() =>
              router.push("/gift-cards")
            }
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
          onClick={() =>
            router.push("/gift-cards")
          }
          aria-label="Volver"
        >
          ←
        </button>

        <h1 className="game-header-title">
          ARENA BREAKOUT
        </h1>

        <button
          className="game-cart-button"
          onClick={() =>
            router.push("/cart")
          }
          aria-label="Carrito"
        >
          🛒
        </button>
      </header>

      <section className="game-service-hero">
        <img
          src="/images/gift-cards/gift-arena-breakout.jpg"
          alt="Arena Breakout"
          className="free-fire-main-image"
        />

        <h2>ARENA BREAKOUT</h2>
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
              onClick={() =>
                selectOffer(offer)
              }
            >
              <div className="diamond-icon">
                CP
              </div>

              <div className="offer-info">
                <strong>
                  {offer.cp} CP
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
              ARENA BREAKOUT
            </div>

            <div className="selected-order-offer">
              {selectedOffer.cp} CP
            </div>

            <div className="selected-order-price">
              $
              {selectedOffer.price.toFixed(2)}
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
              selectedOffer.price *
              quantity
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
              <strong>
                ARENA BREAKOUT
              </strong>
            </div>

            <div className="confirmation-row">
              <span>Tarjeta</span>
              <strong>
                {selectedOffer.cp} CP
              </strong>
            </div>

            <div className="confirmation-row">
              <span>Cantidad</span>
              <strong>{quantity}</strong>
            </div>

            <div className="confirmation-row">
              <span>Precio unitario</span>
              <strong>
                $
                {selectedOffer.price.toFixed(2)}
              </strong>
            </div>

            <div className="confirmation-total">
              <span>TOTAL</span>

              <strong>
                $
                {(
                  selectedOffer.price *
                  quantity
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
          Tarjetas de regalo Arena Breakout
        </span>
      </footer>
    </main>
  );
}
