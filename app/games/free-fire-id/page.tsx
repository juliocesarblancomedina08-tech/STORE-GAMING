"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Offer = {
  amount: string;
  price: number;
};

const offers: Offer[] = [
  { amount: "5 DIAMANTES", price: 0.15 },
  { amount: "12 DIAMANTES", price: 0.20 },
  { amount: "10 DIAMANTES", price: 0.21 },
  { amount: "20 DIAMANTES", price: 0.32 },
  { amount: "25 DIAMANTES", price: 0.37 },
  { amount: "PASE DE SUBIDA DE NIVEL - 6", price: 0.38 },
  { amount: "30 DIAMANTES", price: 0.43 },
  { amount: "50 DIAMANTES", price: 0.52 },
  { amount: "PASE DE SUBIDA DE NIVEL - 20", price: 0.57 },
  { amount: "PASE DE SUBIDA DE NIVEL - 10", price: 0.57 },
  { amount: "PASE DE SUBIDA DE NIVEL - 15", price: 0.57 },
  { amount: "PASE DE SUBIDA DE NIVEL - 25", price: 0.57 },
  { amount: "55 DIAMANTES", price: 0.58 },
  { amount: "70 DIAMANTES", price: 0.61 },
  { amount: "80 DIAMANTES", price: 0.75 },
  { amount: "PASE DE SUBIDA DE NIVEL - 30", price: 0.87 },
  { amount: "100 DIAMANTES", price: 0.96 },
  { amount: "120 DIAMANTES", price: 1.07 },
  { amount: "140 DIAMANTES", price: 1.12 },
  { amount: "130 DIAMANTES", price: 1.18 },
  { amount: "145 DIAMANTES", price: 1.23 },
  { amount: "150 DIAMANTES", price: 1.28 },
  { amount: "190 DIAMANTES", price: 1.61 },
  { amount: "MEMBRESÍA SEMANAL", price: 1.69 },
  { amount: "210 DIAMANTES", price: 1.71 },
  { amount: "200 DIAMANTES", price: 1.71 },
  { amount: "280 DIAMANTES", price: 2.26 },
  { amount: "TARJETA BP", price: 2.49 },
  { amount: "355 DIAMANTES", price: 2.65 },
  { amount: "420 DIAMANTES", price: 3.33 },
  { amount: "500 DIAMANTES", price: 3.92 },
  { amount: "510 DIAMANTES", price: 4.04 },
  { amount: "565 DIAMANTES", price: 4.41 },
  { amount: "MEMBRESÍA MENSUAL", price: 4.88 },
  { amount: "635 DIAMANTES", price: 4.94 },
  { amount: "720 DIAMANTES", price: 5.20 },
  { amount: "800 DIAMANTES", price: 6.12 },
  { amount: "860 DIAMANTES", price: 6.56 },
  { amount: "930 DIAMANTES", price: 7.10 },
  { amount: "1000 DIAMANTES", price: 7.63 },
  { amount: "1050 DIAMANTES", price: 8.06 },
  { amount: "1075 DIAMANTES", price: 8.18 },
  { amount: "1080 DIAMANTES", price: 8.23 },
  { amount: "1450 DIAMANTES", price: 10.33 },
  { amount: "2180 DIAMANTES", price: 15.42 },
  { amount: "2200 DIAMANTES", price: 16.68 },
  { amount: "3640 DIAMANTES", price: 25.62 },
  { amount: "7290 DIAMANTES", price: 50.60 },
  { amount: "36500 DIAMANTES", price: 274.89 },
  { amount: "73100 DIAMANTES", price: 549.66 },
];

const GAME_NAME = "GARENA FREE FIRE (ID)";
const GAME_IMAGE = "/images/free-fire-latam.jpg";

const GAME_NOTE =
  "Región: Indonesia. Recarga de Free Fire. Ingresa tu ID de jugador antes de realizar el pedido. Asegúrate de que tu cuenta de Free Fire esté registrada en la región de Indonesia; los paquetes están restringidos por región. El producto seleccionado se entregará directamente a tu cuenta una vez realizado el pedido.";

export default function FreeFireIdPage() {
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
      setError("Introduzca su ID de jugador.");
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

    const newOrderNumber = `FFID-${Date.now()
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
        ...(Array.isArray(existingOrders) ? existingOrders : []),
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
            <strong>GARENA FREE FIRE</strong>
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
                      💎
                    </div>

                    <div className="offer-info">
                      <strong>{offer.amount}</strong>
                      <span>Garena Free Fire</span>
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
              ID DE JUGADOR
            </label>

            <p className="player-id-description">
              Introduce el ID de jugador de tu cuenta de
              Free Fire (Indonesia).
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
                placeholder="Introduce tu ID de jugador"
                maxLength={20}
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
              <span>ID de jugador</span>
              <strong>{playerId.trim()}</strong>
            </div>

            <div className="confirmation-row">
              <span>Total</span>
              <strong>
                {totalPrice.toFixed(2)}$
              </strong>
            </div>

            <div className="confirmation-warning">
              ⚠️ Verifica que el ID de jugador sea correcto
              y que tu cuenta esté registrada en la región de
              Indonesia.
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
              Los diamantes se entregan directamente a
              tu cuenta.
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
