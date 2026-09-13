"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Offer = {
  amount: string;
  price: number;
};

const offers: Offer[] = [
  { amount: "61 caramelos", price: 0.50 },
  { amount: "186 caramelos", price: 1.29 },
  { amount: "318 caramelos", price: 2.08 },
  { amount: "686 caramelos", price: 4.06 },
  { amount: "1378 caramelos", price: 7.62 },
  { amount: "2118 caramelos", price: 11.58 },
  { amount: "3548 caramelos", price: 19.90 },
  { amount: "7108 caramelos", price: 39.71 },
];

const GAME_NAME = "SAUSAGE MAN";
const GAME_IMAGE = "/images/sausage-man.jpg";

const GAME_NOTE =
  "Recarga de Sausage Man. Introduce tu ID de personaje antes de realizar el pedido. El producto seleccionado se entregará directamente a tu cuenta una vez realizado el pedido.";

export default function SausageManPage() {
  const router = useRouter();

  const [showOffers, setShowOffers] = useState(true);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [playerId, setPlayerId] = useState("");
  const [quantity, setQuantity] = useState(1);

  const [error, setError] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [orderCreated, setOrderCreated] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const selectOffer = (offer: Offer) => {
    setSelectedOffer(offer);
    setError("");
    setShowConfirmation(false);
    setOrderCreated(false);
    setQuantity(1);

    setTimeout(() => {
      document
        .getElementById("order-section")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 100);
  };

  const increaseQuantity = () => {
    setQuantity((current) => Math.min(current + 1, 99));
  };

  const decreaseQuantity = () => {
    setQuantity((current) => Math.max(current - 1, 1));
  };

  const handleFinishPurchase = () => {
    const cleanId = playerId.trim();

    if (!selectedOffer) {
      setError("Seleccione un producto.");
      return;
    }

    if (!cleanId) {
      setError("Introduzca su ID de personaje.");
      return;
    }

    setError("");
    setShowConfirmation(true);

    setTimeout(() => {
      document
        .getElementById("confirmation-section")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 100);
  };

  const createOrder = () => {
    if (!selectedOffer) return;

    const total = Number(
      (selectedOffer.price * quantity).toFixed(2)
    );

    const newOrderNumber = `SM-${Date.now()
      .toString()
      .slice(-8)}`;

    const newOrder = {
      id: newOrderNumber,
      orderNumber: newOrderNumber,
      game: GAME_NAME,
      gameImage: GAME_IMAGE,
      product: selectedOffer.amount,
      price: selectedOffer.price,
      quantity,
      total,
      playerId: playerId.trim(),
      status: "Pendiente",
      createdAt: new Date().toISOString(),
    };

    try {
      const existingOrdersRaw =
        localStorage.getItem("storeGamingOrders");

      const existingOrders = existingOrdersRaw
        ? JSON.parse(existingOrdersRaw)
        : [];

      const updatedOrders = [
        newOrder,
        ...(Array.isArray(existingOrders)
          ? existingOrders
          : []),
      ];

      localStorage.setItem(
        "storeGamingOrders",
        JSON.stringify(updatedOrders)
      );

      localStorage.setItem(
        "storeGamingLastOrder",
        JSON.stringify(newOrder)
      );
    } catch (storageError) {
      console.error(
        "Error guardando el pedido:",
        storageError
      );
    }

    setOrderNumber(newOrderNumber);
    setOrderCreated(true);
    setShowConfirmation(false);

    setTimeout(() => {
      document
        .getElementById("order-success-section")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 100);
  };

  const goToOrders = () => {
    router.push("/orders");
  };

  const totalPrice = selectedOffer
    ? Number(
        (selectedOffer.price * quantity).toFixed(2)
      )
    : 0;

  return (
    <main className="game-service-page">
      {/* HEADER */}
      <header className="game-service-header">
        <button
          className="game-back-button"
          onClick={() => router.push("/top-up")}
          aria-label="Volver"
        >
          ←
        </button>

        <div className="game-header-title">
          {GAME_NAME}
        </div>

        <button
          className="game-cart-button"
          onClick={() => router.push("/orders")}
          aria-label="Pedidos"
        >
          🛒
        </button>
      </header>

      {/* GAME IMAGE */}
      <section className="free-fire-main-image">
        <img
          src={GAME_IMAGE}
          alt={GAME_NAME}
        />

        <div className="free-fire-main-overlay">
          <div className="free-fire-main-text">
            <span>RECARGA</span>
            <strong>SAUSAGE MAN</strong>
          </div>
        </div>
      </section>

      {/* OFFERS TOGGLE */}
      <button
        className="offers-toggle"
        onClick={() => setShowOffers((value) => !value)}
      >
        <span className="offers-toggle-text">
          OFERTAS DISPONIBLES
        </span>

        <span className="offers-toggle-pencil">
          {showOffers ? "⌃" : "⌄"}
        </span>
      </button>

      {/* OFFERS */}
      {showOffers && (
        <section className="offers-section">
          <h2 className="offers-heading">
            SELECCIONA TU RECARGA
          </h2>

          <div className="offers-list">
            {offers.map((offer) => {
              const isSelected =
                selectedOffer?.amount === offer.amount;

              return (
                <button
                  key={`${offer.amount}-${offer.price}`}
                  type="button"
                  className={`offer-card ${
                    isSelected ? "selected" : ""
                  }`}
                  onClick={() => selectOffer(offer)}
                >
                  <div className="offer-left">
                    <div className="diamond-icon">
                      🌭
                    </div>

                    <div className="offer-info">
                      <strong>{offer.amount}</strong>
                      <span>Sausage Man</span>
                    </div>
                  </div>

                  <div className="offer-right">
                    <strong>
                      {offer.price.toFixed(2)}$
                    </strong>

                    <span>Comprar</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* INFORMATION NOTE */}
      <section className="game-note">
        <div className="game-note-icon">!</div>

        <div className="game-note-content">
          {GAME_NOTE}
        </div>
      </section>

      {/* ORDER SECTION */}
      {selectedOffer && !orderCreated && (
        <section
          id="order-section"
          className="order-section"
        >
          <h2 className="section-title">
            COMPLETA TU PEDIDO
          </h2>

          <div className="selected-order-card">
            <div className="selected-order-icon">
              <img
                src={GAME_IMAGE}
                alt=""
              />
            </div>

            <div className="selected-order-info">
              <strong>{selectedOffer.amount}</strong>
              <span>{GAME_NAME}</span>
            </div>

            <div className="selected-order-price">
              {selectedOffer.price.toFixed(2)}$
            </div>
          </div>

          <div className="game-note game-note-order">
            <div className="game-note-icon">!</div>

            <div className="game-note-content">
              {GAME_NOTE}
            </div>
          </div>

          {/* QUANTITY */}
          <div className="quantity-section">
            <span>CANTIDAD</span>

            <div className="quantity-control">
              <button
                type="button"
                onClick={decreaseQuantity}
                disabled={quantity <= 1}
              >
                −
              </button>

              <strong>{quantity}</strong>

              <button
                type="button"
                onClick={increaseQuantity}
                disabled={quantity >= 99}
              >
                +
              </button>
            </div>
          </div>

          {/* PLAYER ID */}
          <div className="order-form">
            <label className="player-id-label">
              ID DE PERSONAJE
            </label>

            <p className="player-id-description">
              Introduce el ID de personaje de tu cuenta
              de Sausage Man.
            </p>

            <div className="player-id-input-wrapper">
              <input
                type="text"
                inputMode="numeric"
                value={playerId}
                onChange={(event) => {
                  const value =
                    event.target.value.replace(/\D/g, "");

                  setPlayerId(value);
                  setError("");
                }}
                placeholder="Introduce tu ID de personaje"
                maxLength={30}
                autoComplete="off"
              />
            </div>

            {error && (
              <div className="order-error">
                {error}
              </div>
            )}

            {/* TOTAL */}
            <div className="order-total-preview">
              <span>TOTAL</span>

              <strong>
                {totalPrice.toFixed(2)}$
              </strong>
            </div>

            <button
              type="button"
              className="finish-order-button"
              onClick={handleFinishPurchase}
            >
              CONTINUAR
            </button>
          </div>
        </section>
      )}

      {/* CONFIRMATION */}
      {showConfirmation && selectedOffer && (
        <section
          id="confirmation-section"
          className="confirmation-section"
        >
          <h2 className="section-title">
            CONFIRMA TU PEDIDO
          </h2>

          <div className="confirmation-card">
            <div className="confirmation-row">
              <span>Juego</span>
              <strong>{GAME_NAME}</strong>
            </div>

            <div className="confirmation-row">
              <span>Producto</span>
              <strong>{selectedOffer.amount}</strong>
            </div>

            <div className="confirmation-row">
              <span>Cantidad</span>
              <strong>{quantity}</strong>
            </div>

            <div className="confirmation-row">
              <span>ID de personaje</span>
              <strong>{playerId.trim()}</strong>
            </div>

            <div className="confirmation-row">
              <span>Total</span>
              <strong>
                {totalPrice.toFixed(2)}$
              </strong>
            </div>

            <div className="confirmation-warning">
              ⚠️ Verifica que tu ID de personaje sea
              correcto antes de confirmar el pedido.
            </div>

            <button
              type="button"
              className="confirm-final-button"
              onClick={createOrder}
            >
              CONFIRMAR PEDIDO
            </button>
          </div>
        </section>
      )}

      {/* SUCCESS */}
      {orderCreated && (
        <section
          id="order-success-section"
          className="order-success-section"
        >
          <div className="success-circle">
            ✓
          </div>

          <h2>PEDIDO CREADO</h2>

          <p>
            Tu pedido fue registrado correctamente.
          </p>

          <div className="success-order-number">
            <span>NÚMERO DE PEDIDO</span>
            <strong>{orderNumber}</strong>
          </div>

          <button
            type="button"
            className="view-orders-button"
            onClick={goToOrders}
          >
            VER MIS PEDIDOS
          </button>
        </section>
      )}

      {/* SERVICE INFO */}
      <section className="service-info">
        <div className="service-info-item">
          <span>⚡</span>

          <div>
            <strong>ENTREGA DIRECTA</strong>
            <p>
              El producto se entrega directamente en tu
              cuenta.
            </p>
          </div>
        </div>

        <div className="service-info-item">
          <span>🔒</span>

          <div>
            <strong>COMPRA SEGURA</strong>
            <p>
              Procesamos tus pedidos de forma segura.
            </p>
          </div>
        </div>

        <div className="service-info-item">
          <span>🎧</span>

          <div>
            <strong>SOPORTE</strong>
            <p>
              Si tienes algún problema, puedes contactar
              con soporte.
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="game-service-footer">
        <strong>STORE GAMING</strong>
        <span>© {new Date().getFullYear()}</span>
      </footer>
    </main>
  );
}
