"use client";

import { FormEvent, useMemo, useState } from "react";
import { deltaForceGame } from "../../../lib/delta-force";

type Offer = (typeof deltaForceGame.offers)[number];

type OrderResponse = {
  success?: boolean;
  message?: string;
  error?: string;
  data?: {
    orderId?: string;
    status?: string;
  };
};

export default function DeltaForcePage() {
  const [playerId, setPlayerId] = useState("");
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"form" | "confirm" | "success">("form");
  const [orderId, setOrderId] = useState("");

  const availableOffers = useMemo(
    () => deltaForceGame.offers.filter((offer) => offer.price > 0),
    []
  );

  function validatePlayerId() {
    const value = playerId.trim();

    if (!value) {
      setError("Introduce tu Player ID.");
      return false;
    }

    if (!/^\d+$/.test(value)) {
      setError("El Player ID debe contener solamente números.");
      return false;
    }

    if (value.length < 3 || value.length > 20) {
      setError("El Player ID debe tener entre 3 y 20 números.");
      return false;
    }

    return true;
  }

  function handleSelectOffer(offer: Offer) {
    setSelectedOffer(offer);
    setError("");
  }

  function handleContinue() {
    setError("");

    if (!validatePlayerId()) {
      return;
    }

    if (!selectedOffer) {
      setError("Selecciona una oferta.");
      return;
    }

    setStep("confirm");
  }

  async function handleConfirm(event?: FormEvent) {
    event?.preventDefault();

    if (!selectedOffer) {
      setError("Selecciona una oferta.");
      return;
    }

    if (!validatePlayerId()) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const idempotencyKey =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      const response = await fetch("/api/topups/delta-force", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          offerId: selectedOffer.id,
          playerId: playerId.trim(),
          idempotencyKey,
        }),
      });

      const result: OrderResponse = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            result.message ||
            "No se pudo procesar la recarga."
        );
      }

      setOrderId(result.data?.orderId || "");
      setStep("success");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error al procesar la recarga."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleBack() {
    setError("");
    setStep("form");
  }

  function handleNewOrder() {
    setPlayerId("");
    setSelectedOffer(null);
    setError("");
    setOrderId("");
    setStep("form");
  }

  return (
    <main className="special-forces-page">
      <div className="special-forces-background" />

      <div className="special-forces-container">
        <header className="special-forces-header">
          <a href="/top-up" className="special-forces-back">
            ← Volver
          </a>

          <div className="special-forces-brand">
            <span>STORE GAMING</span>
            <strong>🎮</strong>
          </div>
        </header>

        <section className="special-forces-hero">
          <div className="special-forces-banner">
            <img
              src={deltaForceGame.image}
              alt={deltaForceGame.name}
              className="special-forces-banner-image"
            />

            <div className="special-forces-banner-overlay">
              <span>RECARGAS GAMING</span>
              <h1>DELTA FORCE</h1>
              <p>Recarga Delta Coins de forma rápida y segura.</p>
            </div>
          </div>
        </section>

        {step === "form" && (
          <>
            <section className="special-forces-card">
              <div className="special-forces-info">
                <div className="special-forces-info-icon">🎮</div>

                <div>
                  <h2>{deltaForceGame.name}</h2>
                  <p>Recarga directamente a tu cuenta.</p>
                </div>
              </div>

              <div className="special-forces-note">
                <span>ℹ️</span>
                <p>{deltaForceGame.note}</p>
              </div>
            </section>

            <section className="special-forces-section">
              <div className="special-forces-section-header">
                <div>
                  <span className="special-forces-step">01</span>
                  <div>
                    <h2>{deltaForceGame.playerField.label}</h2>
                    <p>Introduce el ID de tu cuenta de Delta Force.</p>
                  </div>
                </div>
              </div>

              <div className="special-forces-input-group">
                <label htmlFor="playerId">
                  {deltaForceGame.playerField.label}
                </label>

                <input
                  id="playerId"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={playerId}
                  onChange={(event) => {
                    setPlayerId(event.target.value);
                    setError("");
                  }}
                  placeholder="Ejemplo: 123456789"
                  maxLength={20}
                />

                <small>
                  Introduce únicamente los números de tu Player ID.
                </small>
              </div>
            </section>

            <section className="special-forces-section">
              <div className="special-forces-section-header">
                <div>
                  <span className="special-forces-step">02</span>
                  <div>
                    <h2>Selecciona tu recarga</h2>
                    <p>Elige la cantidad de Delta Coins que deseas.</p>
                  </div>
                </div>
              </div>

              <div className="special-forces-offers">
                {availableOffers.map((offer) => {
                  const selected = selectedOffer?.id === offer.id;

                  return (
                    <button
                      key={offer.id}
                      type="button"
                      className={`special-forces-offer ${
                        selected ? "selected" : ""
                      }`}
                      onClick={() => handleSelectOffer(offer)}
                    >
                      <div className="special-forces-offer-icon">
                        {offer.icon}
                      </div>

                      <div className="special-forces-offer-info">
                        <strong>{offer.display}</strong>
                        <span>{offer.name}</span>
                      </div>

                      <div className="special-forces-offer-price">
                        ${offer.price.toFixed(2)}
                        <small>USDT</small>
                      </div>

                      {selected && (
                        <div className="special-forces-selected-check">
                          ✓
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>

            {selectedOffer && (
              <section className="special-forces-selected">
                <div>
                  <span>Oferta seleccionada</span>
                  <strong>
                    {selectedOffer.icon} {selectedOffer.name}
                  </strong>
                </div>

                <div className="special-forces-selected-price">
                  ${selectedOffer.price.toFixed(2)} USDT
                </div>
              </section>
            )}

            {error && (
              <div className="special-forces-error">
                ⚠️ {error}
              </div>
            )}

            <button
              type="button"
              className="special-forces-primary-button"
              onClick={handleContinue}
              disabled={!selectedOffer}
            >
              CONTINUAR
              <span>→</span>
            </button>
          </>
        )}

        {step === "confirm" && selectedOffer && (
          <section className="special-forces-confirmation">
            <div className="special-forces-confirmation-header">
              <span>03</span>
              <div>
                <h2>Confirma tu pedido</h2>
                <p>Revisa los datos antes de realizar la recarga.</p>
              </div>
            </div>

            <div className="special-forces-confirm-card">
              <div className="special-forces-confirm-row">
                <span>Juego</span>
                <strong>{deltaForceGame.name}</strong>
              </div>

              <div className="special-forces-confirm-row">
                <span>Player ID</span>
                <strong>{playerId}</strong>
              </div>

              <div className="special-forces-confirm-row">
                <span>Producto</span>
                <strong>
                  {selectedOffer.icon} {selectedOffer.name}
                </strong>
              </div>

              <div className="special-forces-confirm-total">
                <span>Total</span>
                <strong>
                  ${selectedOffer.price.toFixed(2)} USDT
                </strong>
              </div>
            </div>

            <div className="special-forces-warning">
              <span>⚠️</span>
              <p>
                Verifica que el Player ID sea correcto. Las recargas enviadas
                al ID indicado no podrán redirigirse a otra cuenta.
              </p>
            </div>

            {error && (
              <div className="special-forces-error">
                ⚠️ {error}
              </div>
            )}

            <div className="special-forces-confirm-buttons">
              <button
                type="button"
                className="special-forces-secondary-button"
                onClick={handleBack}
                disabled={loading}
              >
                ← CAMBIAR
              </button>

              <button
                type="button"
                className="special-forces-primary-button"
                onClick={() => handleConfirm()}
                disabled={loading}
              >
                {loading ? "PROCESANDO..." : "CONFIRMAR PEDIDO ✓"}
              </button>
            </div>
          </section>
        )}

        {step === "success" && (
          <section className="special-forces-success">
            <div className="special-forces-success-icon">✓</div>

            <h2>¡Pedido realizado!</h2>

            <p>
              Tu pedido de Delta Force fue enviado correctamente.
            </p>

            {orderId && (
              <div className="special-forces-order-id">
                <span>Número de pedido</span>
                <strong>{orderId}</strong>
              </div>
            )}

            <div className="special-forces-success-details">
              <div>
                <span>Player ID</span>
                <strong>{playerId}</strong>
              </div>

              {selectedOffer && (
                <>
                  <div>
                    <span>Producto</span>
                    <strong>{selectedOffer.display}</strong>
                  </div>

                  <div>
                    <span>Total</span>
                    <strong>
                      ${selectedOffer.price.toFixed(2)} USDT
                    </strong>
                  </div>
                </>
              )}
            </div>

            <p className="special-forces-success-note">
              La recarga será procesada y entregada directamente en tu cuenta.
            </p>

            <button
              type="button"
              className="special-forces-primary-button"
              onClick={handleNewOrder}
            >
              HACER OTRA RECARGA
            </button>
          </section>
        )}

        <section className="special-forces-services">
          <div className="special-forces-section-header">
            <div>
              <span>⚡</span>
              <div>
                <h2>Servicio rápido y seguro</h2>
                <p>Disfruta tu recarga sin complicaciones.</p>
              </div>
            </div>
          </div>

          <div className="special-forces-service-grid">
            <div className="special-forces-service">
              <span>⚡</span>
              <strong>Rápido</strong>
              <p>Procesamos tu pedido rápidamente.</p>
            </div>

            <div className="special-forces-service">
              <span>🔒</span>
              <strong>Seguro</strong>
              <p>Compra mediante un proceso protegido.</p>
            </div>

            <div className="special-forces-service">
              <span>🎮</span>
              <strong>Directo</strong>
              <p>La recarga llega directamente a tu cuenta.</p>
            </div>
          </div>
        </section>

        <footer className="special-forces-footer">
          <strong>🛒 STORE GAMING 🎮</strong>
          <span>Recargas digitales rápidas y seguras.</span>
        </footer>
      </div>

      <style jsx>{`
        .special-forces-page {
          min-height: 100vh;
          position: relative;
          overflow-x: hidden;
          background: #05070b;
          color: #ffffff;
        }

        .special-forces-background {
          position: fixed;
          inset: 0;
          z-index: 0;
          background:
            linear-gradient(
              180deg,
              rgba(5, 7, 11, 0.35),
              rgba(5, 7, 11, 0.97)
            ),
            url("/images/delta-force.jpg") center top / cover no-repeat;
          filter: saturate(1.1);
        }

        .special-forces-container {
          width: min(1100px, calc(100% - 30px));
          margin: 0 auto;
          position: relative;
          z-index: 1;
          padding-bottom: 50px;
        }

        .special-forces-header {
          min-height: 70px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
        }

        .special-forces-back {
          color: #fff;
          text-decoration: none;
          font-weight: 800;
          font-size: 14px;
          padding: 10px 14px;
          border-radius: 10px;
          background: rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.12);
        }

        .special-forces-brand {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 900;
          font-size: 14px;
        }

        .special-forces-brand strong {
          font-size: 20px;
        }

        .special-forces-hero {
          margin-bottom: 25px;
        }

        .special-forces-banner {
          height: 310px;
          border-radius: 22px;
          overflow: hidden;
          position: relative;
          border: 1px solid rgba(255, 255, 255, 0.14);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        }

        .special-forces-banner-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .special-forces-banner::after {
          content: "";
          position: absolute;
          inset: 0;
          background:
            linear-gradient(
              90deg,
              rgba(0, 0, 0, 0.9),
              rgba(0, 0, 0, 0.2)
            ),
            linear-gradient(
              0deg,
              rgba(0, 0, 0, 0.7),
              transparent 60%
            );
        }

        .special-forces-banner-overlay {
          position: absolute;
          z-index: 2;
          left: 35px;
          bottom: 35px;
          max-width: 650px;
        }

        .special-forces-banner-overlay span {
          display: inline-block;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 2px;
          margin-bottom: 8px;
          color: #ff4747;
        }

        .special-forces-banner-overlay h1 {
          margin: 0;
          font-size: clamp(35px, 7vw, 70px);
          line-height: 0.95;
          font-weight: 950;
          letter-spacing: -2px;
          text-shadow: 0 5px 25px rgba(0, 0, 0, 0.8);
        }

        .special-forces-banner-overlay p {
          margin: 12px 0 0;
          color: rgba(255, 255, 255, 0.85);
          font-weight: 600;
        }

        .special-forces-card,
        .special-forces-section,
        .special-forces-confirmation,
        .special-forces-success,
        .special-forces-services {
          margin-bottom: 22px;
          padding: 25px;
          border-radius: 20px;
          background: rgba(10, 13, 19, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 15px 40px rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(14px);
        }

        .special-forces-info {
          display: flex;
          align-items: center;
          gap: 15px;
          margin-bottom: 20px;
        }

        .special-forces-info-icon {
          width: 54px;
          height: 54px;
          display: grid;
          place-items: center;
          border-radius: 15px;
          background: rgba(255, 70, 70, 0.12);
          font-size: 28px;
        }

        .special-forces-info h2 {
          margin: 0 0 5px;
          font-size: 23px;
        }

        .special-forces-info p {
          margin: 0;
          color: #9ea6b3;
        }

        .special-forces-note {
          display: flex;
          gap: 12px;
          padding: 15px;
          border-radius: 13px;
          background: rgba(255, 193, 7, 0.08);
          border: 1px solid rgba(255, 193, 7, 0.18);
        }

        .special-forces-note span {
          flex-shrink: 0;
        }

        .special-forces-note p {
          margin: 0;
          color: #d9dde4;
          white-space: pre-line;
          line-height: 1.6;
          font-size: 13px;
        }

        .special-forces-section-header {
          margin-bottom: 22px;
        }

        .special-forces-section-header > div {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .special-forces-section-header h2 {
          margin: 0 0 5px;
          font-size: 20px;
        }

        .special-forces-section-header p {
          margin: 0;
          color: #8f98a7;
          font-size: 13px;
        }

        .special-forces-step {
          width: 42px;
          height: 42px;
          flex-shrink: 0;
          display: grid;
          place-items: center;
          border-radius: 12px;
          background: #ff3d3d;
          font-size: 13px;
          font-weight: 900;
        }

        .special-forces-input-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 800;
          font-size: 14px;
        }

                .special-forces-input-group input:focus {
          border-color: #ff4747;
          box-shadow: 0 0 0 3px rgba(255, 71, 71, 0.1);
        }

        .special-forces-input-group small {
          display: block;
          margin-top: 8px;
          color: #7f8998;
          font-size: 12px;
        }

        .special-forces-offers {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .special-forces-offer {
          position: relative;
          display: flex;
          align-items: center;
          gap: 13px;
          min-height: 82px;
          padding: 13px;
          text-align: left;
          color: #fff;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 15px;
          cursor: pointer;
          transition:
            transform 0.18s ease,
            border-color 0.18s ease,
            background 0.18s ease;
        }

        .special-forces-offer:hover {
          transform: translateY(-2px);
          border-color: rgba(255, 71, 71, 0.5);
        }

        .special-forces-offer.selected {
          background: rgba(255, 61, 61, 0.1);
          border-color: #ff4747;
          box-shadow: 0 0 0 1px rgba(255, 71, 71, 0.2);
        }

        .special-forces-offer-icon {
          width: 45px;
          height: 45px;
          flex-shrink: 0;
          display: grid;
          place-items: center;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.07);
          font-size: 22px;
        }

        .special-forces-offer-info {
          min-width: 0;
          flex: 1;
        }

        .special-forces-offer-info strong {
          display: block;
          font-size: 16px;
          margin-bottom: 4px;
        }

        .special-forces-offer-info span {
          display: block;
          color: #8e97a6;
          font-size: 11px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .special-forces-offer-price {
          flex-shrink: 0;
          font-weight: 900;
          font-size: 15px;
          text-align: right;
        }

        .special-forces-offer-price small {
          display: block;
          margin-top: 3px;
          color: #8d96a5;
          font-size: 9px;
        }

        .special-forces-selected-check {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 22px;
          height: 22px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: #ff4747;
          color: white;
          font-size: 12px;
          font-weight: 900;
        }

        .special-forces-selected {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 18px;
          padding: 17px 20px;
          border-radius: 15px;
          background: rgba(255, 71, 71, 0.08);
          border: 1px solid rgba(255, 71, 71, 0.25);
        }

        .special-forces-selected > div:first-child span {
          display: block;
          color: #8992a0;
          font-size: 11px;
          margin-bottom: 4px;
        }

        .special-forces-selected > div:first-child strong {
          font-size: 15px;
        }

        .special-forces-selected-price {
          font-size: 21px;
          font-weight: 950;
          white-space: nowrap;
        }

        .special-forces-error {
          margin: 15px 0;
          padding: 14px 16px;
          border-radius: 12px;
          background: rgba(255, 60, 60, 0.1);
          border: 1px solid rgba(255, 60, 60, 0.3);
          color: #ff9b9b;
          font-size: 13px;
          font-weight: 700;
        }

        .special-forces-primary-button,
        .special-forces-secondary-button {
          min-height: 52px;
          padding: 0 22px;
          border-radius: 12px;
          border: none;
          font-size: 13px;
          font-weight: 950;
          cursor: pointer;
          transition: transform 0.18s ease, opacity 0.18s ease;
        }

        .special-forces-primary-button {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          background: #ff3d3d;
          color: #fff;
          box-shadow: 0 10px 30px rgba(255, 61, 61, 0.18);
        }

        .special-forces-primary-button:hover:not(:disabled),
        .special-forces-secondary-button:hover:not(:disabled) {
          transform: translateY(-2px);
        }

        .special-forces-primary-button:disabled,
        .special-forces-secondary-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .special-forces-confirmation-header {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 25px;
        }

        .special-forces-confirmation-header > span {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          background: #ff3d3d;
          font-weight: 900;
        }

        .special-forces-confirmation-header h2 {
          margin: 0 0 5px;
          font-size: 21px;
        }

        .special-forces-confirmation-header p {
          margin: 0;
          color: #8d96a4;
          font-size: 13px;
        }

        .special-forces-confirm-card {
          overflow: hidden;
          border-radius: 15px;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .special-forces-confirm-row {
          display: flex;
          justify-content: space-between;
          gap: 15px;
          padding: 16px;
          background: rgba(0, 0, 0, 0.25);
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .special-forces-confirm-row span {
          color: #8b94a2;
          font-size: 13px;
        }

        .special-forces-confirm-row strong {
          text-align: right;
          font-size: 13px;
        }

        .special-forces-confirm-total {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 19px 16px;
          background: rgba(255, 61, 61, 0.08);
        }

        .special-forces-confirm-total strong {
          color: #ff6969;
          font-size: 22px;
        }

        .special-forces-warning {
          display: flex;
          gap: 12px;
          margin: 18px 0;
          padding: 14px;
          border-radius: 12px;
          background: rgba(255, 193, 7, 0.08);
          border: 1px solid rgba(255, 193, 7, 0.16);
        }

        .special-forces-warning p {
          margin: 0;
          color: #c7cbd2;
          line-height: 1.5;
          font-size: 12px;
        }

        .special-forces-confirm-buttons {
          display: grid;
          grid-template-columns: 0.7fr 1.3fr;
          gap: 10px;
        }

        .special-forces-secondary-button {
          background: rgba(255, 255, 255, 0.08);
          color: #fff;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .special-forces-confirm-buttons
          .special-forces-primary-button {
          width: 100%;
        }

        .special-forces-success {
          text-align: center;
          padding: 45px 25px;
        }

        .special-forces-success-icon {
          width: 76px;
          height: 76px;
          display: grid;
          place-items: center;
          margin: 0 auto 20px;
          border-radius: 50%;
          background: rgba(54, 211, 153, 0.12);
          border: 2px solid #36d399;
          color: #36d399;
          font-size: 38px;
          font-weight: 900;
        }

        .special-forces-success h2 {
          margin: 0 0 10px;
          font-size: 30px;
        }

        .special-forces-success > p {
          margin: 0 auto 25px;
          color: #9aa3b0;
          max-width: 500px;
        }

        .special-forces-order-id {
          display: inline-flex;
          flex-direction: column;
          gap: 5px;
          padding: 13px 22px;
          margin-bottom: 22px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.06);
        }

        .special-forces-order-id span {
          color: #858e9d;
          font-size: 11px;
        }

        .special-forces-order-id strong {
          font-size: 14px;
        }

        .special-forces-success-details {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-bottom: 20px;
        }

        .special-forces-success-details > div {
          padding: 15px;
          border-radius: 12px;
          background: rgba(0, 0, 0, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.07);
        }

        .special-forces-success-details span {
          display: block;
          color: #858e9d;
          font-size: 10px;
          margin-bottom: 5px;
        }

        .special-forces-success-details strong {
          display: block;
          font-size: 13px;
          overflow-wrap: anywhere;
        }

        .special-forces-success-note {
          font-size: 12px !important;
          color: #7f8998 !important;
        }

        .special-forces-success
          .special-forces-primary-button {
          max-width: 400px;
          margin: 0 auto;
        }

        .special-forces-service-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }

        .special-forces-service {
          padding: 20px;
          border-radius: 15px;
          background: rgba(0, 0, 0, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.07);
        }

        .special-forces-service > span {
          display: block;
          margin-bottom: 10px;
          font-size: 25px;
        }

        .special-forces-service strong {
          display: block;
          margin-bottom: 5px;
        }

        .special-forces-service p {
          margin: 0;
          color: #838d9b;
          font-size: 12px;
          line-height: 1.5;
        }

        .special-forces-footer {
          display: flex;
          justify-content: space-between;
          gap: 15px;
          padding: 20px 5px;
          color: #78818e;
          font-size: 12px;
        }

        .special-forces-footer strong {
          color: #b9bec7;
        }

        @media (max-width: 700px) {
          .special-forces-container {
            width: min(100% - 20px, 1100px);
          }

          .special-forces-header {
            min-height: 60px;
          }

          .special-forces-banner {
            height: 240px;
            border-radius: 17px;
          }

          .special-forces-banner-overlay {
            left: 22px;
            right: 20px;
            bottom: 23px;
          }

          .special-forces-banner-overlay h1 {
            font-size: 42px;
          }

          .special-forces-card,
          .special-forces-section,
          .special-forces-confirmation,
          .special-forces-success,
          .special-forces-services {
            padding: 18px;
            border-radius: 16px;
          }

          .special-forces-offers {
            grid-template-columns: 1fr;
          }

          .special-forces-selected {
            align-items: flex-start;
            flex-direction: column;
            gap: 10px;
          }

          .special-forces-selected-price {
            font-size: 20px;
          }

          .special-forces-confirm-buttons {
            grid-template-columns: 1fr;
          }

          .special-forces-success-details {
            grid-template-columns: 1fr;
          }

          .special-forces-service-grid {
            grid-template-columns: 1fr;
          }

          .special-forces-footer {
            flex-direction: column;
            text-align: center;
          }
        }

        @media (max-width: 420px) {
          .special-forces-brand span {
            display: none;
          }

          .special-forces-banner-overlay h1 {
            font-size: 34px;
          }

          .special-forces-banner-overlay p {
            font-size: 12px;
          }

          .special-forces-offer {
            min-height: 75px;
          }

          .special-forces-offer-icon {
            width: 40px;
            height: 40px;
          }

          .special-forces-offer-info strong {
            font-size: 14px;
          }

          .special-forces-offer-price {
            font-size: 14px;
          }
        }
