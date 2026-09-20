"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import {
  FC_MOBILE_ID,
  FcMobileIdOffer,
} from "@/lib/games/fc-mobile-id";

export default function FcMobileIdPage() {
  const router = useRouter();

  const offers = FC_MOBILE_ID.offers;
  const gameNote = FC_MOBILE_ID.note;

  const [showOffers, setShowOffers] = useState(false);
  const [selectedOffer, setSelectedOffer] =
    useState<FcMobileIdOffer | null>(null);

  const [playerId, setPlayerId] = useState("");
  const [quantity, setQuantity] = useState(1);

  const [error, setError] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);

  const [orderCreated, setOrderCreated] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");

  function selectOffer(offer: FcMobileIdOffer) {
    setSelectedOffer(offer);
    setQuantity(1);
    setError("");
    setShowConfirmation(false);
    setOrderCreated(false);
  }

  function decreaseQuantity() {
    setQuantity((current) => Math.max(1, current - 1));
  }

  function increaseQuantity() {
    setQuantity((current) => Math.min(10, current + 1));
  }

  function handleFinishPurchase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    if (!selectedOffer) {
      setError("Seleccione una oferta.");
      return;
    }

    if (!playerId.trim()) {
      setError("Introduzca el ID del jugador.");
      return;
    }

    if (!/^\d+$/.test(playerId.trim())) {
      setError("El ID del jugador debe contener solamente números.");
      return;
    }

    if (playerId.trim().length < 4) {
      setError("El ID del jugador no es válido.");
      return;
    }

    setShowConfirmation(true);
  }

  async function createOrder() {
    if (!selectedOffer) {
      setError("Seleccione una oferta.");
      return;
    }

    try {
      setError("");

      const idempotencyKey = `fc-mobile-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`;

      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("supabase_access_token")
          : null;

      if (!token) {
        setError(
          "Su sesión no está disponible. Inicie sesión nuevamente."
        );
        return;
      }

      const response = await fetch(
        "/api/topups/fc-mobile-id",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            offerId: selectedOffer.supplierOfferId,
            offerName: selectedOffer.name,
            playerId: playerId.trim(),
            retailPrice: selectedOffer.price,
            quantity,
            idempotencyKey,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "No se pudo crear la orden."
        );
      }

      const generatedOrderNumber =
        data.orderId ||
        `FC-${Date.now().toString().slice(-8)}`;

      const order = {
        id: generatedOrderNumber,
        orderNumber: generatedOrderNumber,

        game: FC_MOBILE_ID.game,
        categoryId: FC_MOBILE_ID.categoryId,

        offerId: selectedOffer.id,
        supplierOfferId: selectedOffer.supplierOfferId,

        offerName: selectedOffer.name,
        offerDisplay: selectedOffer.display,

        price: selectedOffer.price,
        supplierPrice: selectedOffer.supplierPrice,

        quantity,

        playerId: playerId.trim(),

        status: data.status || "SUPPLIER_PENDING",

        supplierOrderId:
          data.supplierOrderId || null,

        createdAt: new Date().toISOString(),
      };

      const existingOrders =
        JSON.parse(
          localStorage.getItem("orders") || "[]"
        );

      existingOrders.unshift(order);

      localStorage.setItem(
        "orders",
        JSON.stringify(existingOrders)
      );

      setOrderNumber(generatedOrderNumber);
      setShowConfirmation(false);
      setOrderCreated(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo crear la orden."
      );
    }
  }

  function goToOrders() {
    router.push("/orders");
  }

  const totalPrice = selectedOffer
    ? selectedOffer.price * quantity
    : 0;

  return (
    <main className="game-service-page">
      <header className="game-service-header">
        <button
          type="button"
          className="game-back-button"
          onClick={() => router.push("/top-up")}
        >
          ←
        </button>

        <h1 className="game-header-title">
          EAFC MOBILE
        </h1>

        <button
          type="button"
          className="game-cart-button"
          onClick={() => router.push("/cart")}
        >
          🛒
        </button>
      </header>

      <section className="free-fire-main-image">
        <img
          src={FC_MOBILE_ID.image}
          alt={FC_MOBILE_ID.game}
        />

        <div className="free-fire-main-overlay">
          <div className="free-fire-main-text">
            Bienvenido al servicio TOP UP de EAFC Mobile
          </div>
        </div>
      </section>

      <button
        type="button"
        className="offers-toggle"
        onClick={() => setShowOffers((value) => !value)}
      >
        <span className="offers-toggle-pencil">
          ✎
        </span>

        <span className="offers-toggle-text">
          presione para ver ofertas
        </span>
      </button>

      {showOffers && (
        <section className="offers-section">
          <h2 className="offers-heading">
            OFERTAS DISPONIBLES
          </h2>

          <div className="offers-list">
            {offers.map((offer) => {
              const isSelected =
                selectedOffer?.id === offer.id;

              return (
                <button
                  type="button"
                  key={offer.id}
                  className={`offer-card ${
                    isSelected ? "selected" : ""
                  }`}
                  onClick={() => selectOffer(offer)}
                >
                  <div className="offer-left">
                    <div className="diamond-icon">
                      {offer.icon}
                    </div>

                    <div className="offer-info">
                      <strong>
                        {offer.display}
                      </strong>

                      <span>
                        {offer.name}
                      </span>
                    </div>
                  </div>

                  <div className="offer-right">
                    {offer.price.toFixed(2)}$
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <div className="game-note">
        {gameNote}
      </div>

      {selectedOffer && !orderCreated && (
        <section className="order-section">
          <h2 className="section-title">
            SU ORDEN
          </h2>

          <div className="selected-order-card">
            <div className="selected-order-icon">
              {selectedOffer.icon}
            </div>

            <div className="selected-order-info">
              <strong>
                {selectedOffer.display}
              </strong>

              <span>
                {selectedOffer.name}
              </span>
            </div>

            <div className="selected-order-price">
              {selectedOffer.price.toFixed(2)}$
            </div>
          </div>

          <div className="game-note-order">
            {gameNote}
          </div>

          <div className="quantity-section">
            <div className="section-title">
              CANTIDAD
            </div>

            <div className="quantity-control">
              <button
                type="button"
                onClick={decreaseQuantity}
              >
                −
              </button>

              <span>{quantity}</span>

              <button
                type="button"
                onClick={increaseQuantity}
              >
                +
              </button>
            </div>
          </div>

          <form
            className="order-form"
            onSubmit={handleFinishPurchase}
          >
            <label
              htmlFor="player-id"
              className="player-id-label"
            >
              {FC_MOBILE_ID.playerField.label}
            </label>

            <div className="player-id-description">
              {FC_MOBILE_ID.playerField.description}
            </div>

            <div className="player-id-input-wrapper">
              <input
                id="player-id"
                type="text"
                inputMode="numeric"
                value={playerId}
                onChange={(event) =>
                  setPlayerId(event.target.value)
                }
                placeholder={
                  FC_MOBILE_ID.playerField.placeholder
                }
                autoComplete="off"
              />
            </div>

            {error && (
              <div className="order-error">
                {error}
              </div>
            )}

            <div className="order-total-preview">
              <span>
                TOTAL
              </span>

              <strong>
                {totalPrice.toFixed(2)}$
              </strong>
            </div>

            <button
              type="submit"
              className="finish-order-button"
            >
              FINALIZAR COMPRA
            </button>
          </form>
        </section>
      )}

      {showConfirmation && selectedOffer && (
        <section className="confirmation-section">
          <div className="confirmation-card">
            <h2>
              CONFIRMAR ORDEN
            </h2>

            <div className="confirmation-row">
              <span>
                Producto
              </span>

              <strong>
                {selectedOffer.display}
              </strong>
            </div>

            <div className="confirmation-row">
              <span>
                ID del jugador
              </span>

              <strong>
                {playerId}
              </strong>
            </div>

            <div className="confirmation-row">
              <span>
                Cantidad
              </span>

              <strong>
                {quantity}
              </strong>
            </div>

            <div className="confirmation-row">
              <span>
                Total
              </span>

              <strong>
                {totalPrice.toFixed(2)}$
              </strong>
            </div>

            <div className="confirmation-warning">
              Verifique que el ID del jugador sea
              correcto antes de continuar.
            </div>

            {error && (
              <div className="order-error">
                {error}
              </div>
            )}

            <button
              type="button"
              className="confirm-final-button"
              onClick={createOrder}
            >
              CONFIRMAR Y COMPRAR
            </button>
          </div>
        </section>
      )}

      {orderCreated && (
        <section className="order-success-section">
          <div className="success-circle">
            ✓
          </div>

          <h2>
            ORDEN CREADA
          </h2>

          <div className="success-order-number">
            Orden #{orderNumber}
          </div>

          <button
            type="button"
            className="view-orders-button"
            onClick={goToOrders}
          >
            REVISAR ORDEN
          </button>
        </section>
      )}

      <footer className="game-service-footer">
        <div className="service-info">
          <div className="service-info-item">
            ⚡ Recarga automática
          </div>

          <div className="service-info-item">
            🔒 Compra segura
          </div>

          <div className="service-info-item">
            🎮 EAFC Mobile
          </div>
        </div>6
      </footer>
    </main>
  );
        }
