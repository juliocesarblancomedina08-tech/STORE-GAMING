"use client";

import { useState } from "react";
import { deltaForceGame } from "../../../lib/game/delta-forces";

type Offer = (typeof deltaForceGame.offers)[number];

type Step = "form" | "confirm" | "success";

export default function DeltaForcePage() {
  const [playerId, setPlayerId] = useState("");
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [step, setStep] = useState<Step>("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [orderId, setOrderId] = useState("");

  const offers = deltaForceGame.offers.filter(
    (offer) => Number(offer.price) > 0
  );

  const validatePlayerId = () => {
    const value = playerId.trim();

    if (!value) {
      setError("Introduce tu Player ID.");
      return false;
    }

    if (!/^[0-9]+$/.test(value)) {
      setError("El Player ID solo puede contener números.");
      return false;
    }

    if (value.length < 3 || value.length > 20) {
      setError("El Player ID debe tener entre 3 y 20 números.");
      return false;
    }

    return true;
  };

  const handleContinue = () => {
    setError("");

    if (!validatePlayerId()) {
      return;
    }

    if (!selectedOffer) {
      setError("Selecciona una oferta.");
      return;
    }

    setStep("confirm");
  };

  const handleConfirm = async () => {
    setError("");

    if (!selectedOffer) {
      setError("Selecciona una oferta.");
      return;
    }

    if (!validatePlayerId()) {
      return;
    }

    setLoading(true);

    try {
      const idempotencyKey =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`;

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

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            "No se pudo procesar el pedido."
        );
      }

      setOrderId(
        data?.data?.orderId ||
          data?.orderId ||
          data?.data?.id ||
          ""
      );

      setStep("success");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error al procesar el pedido."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setError("");
    setStep("form");
  };

  const handleNewOrder = () => {
    setPlayerId("");
    setSelectedOffer(null);
    setError("");
    setOrderId("");
    setStep("form");
  };

  return (
    <main className="special-forces-page">
      <div className="special-forces-background" />

      <div className="special-forces-container">
        {/* HEADER */}
        <header className="special-forces-header">
          <a href="/top-up" className="special-forces-back">
            ← Volver
          </a>

          <div className="special-forces-brand">
            <span>STORE GAMING</span>
            <strong>🎮</strong>
          </div>
        </header>

        {/* BANNER */}
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

              <p>
                Recarga Delta Coins de forma rápida y segura.
              </p>
            </div>
          </div>
        </section>

        {/* FORMULARIO */}
        {step === "form" && (
          <>
            {/* INFORMACIÓN */}
            <section className="special-forces-card">
              <div className="special-forces-info">
                <div className="special-forces-info-icon">
                  🎮
                </div>

                <div>
                  <h2>{deltaForceGame.name}</h2>

                  <p>
                    Recarga directamente a tu cuenta.
                  </p>
                </div>
              </div>

              <div className="special-forces-note">
                <span>ℹ️</span>

                <p>
                  {deltaForceGame.note}
                </p>
              </div>
            </section>

            {/* PLAYER ID */}
            <section className="special-forces-section">
              <div className="special-forces-section-header">
                <div>
                  <span className="special-forces-step">
                    01
                  </span>

                  <div>
                    <h2>
                      {deltaForceGame.playerField.label}
                    </h2>

                    <p>
                      Introduce el ID de tu cuenta de Delta
                      Force.
                    </p>
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
                  maxLength={20}
                  value={playerId}
                  onChange={(event) => {
                    setPlayerId(event.target.value);
                    setError("");
                  }}
                  placeholder="Ejemplo: 123456789"
                />

                <small>
                  Introduce únicamente los números de tu
                  Player ID.
                </small>
              </div>
            </section>

            {/* OFERTAS */}
            <section className="special-forces-section">
              <div className="special-forces-section-header">
                <div>
                  <span className="special-forces-step">
                    02
                  </span>

                  <div>
                    <h2>Selecciona tu recarga</h2>

                    <p>
                      Elige la cantidad de Delta Coins que
                      deseas.
                    </p>
                  </div>
                </div>
              </div>

              <div className="special-forces-offers">
                {offers.map((offer) => {
                  const isSelected =
                    selectedOffer?.id === offer.id;

                  return (
                    <button
                      key={offer.id}
                      type="button"
                      className={`special-forces-offer ${
                        isSelected ? "selected" : ""
                      }`}
                      onClick={() => {
                        setSelectedOffer(offer);
                        setError("");
                      }}
                    >
                      <div className="special-forces-offer-icon">
                        {offer.icon}
                      </div>

                      <div className="special-forces-offer-info">
                        <strong>{offer.display}</strong>

                        <span>{offer.name}</span>
                      </div>

                      <div className="special-forces-offer-price">
                        ${Number(offer.price).toFixed(2)}

                        <small>USDT</small>
                      </div>

                      {isSelected && (
                        <div className="special-forces-selected-check">
                          ✓
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* OFERTA SELECCIONADA */}
            {selectedOffer && (
              <section className="special-forces-selected">
                <div>
                  <span>Oferta seleccionada</span>

                  <strong>
                    {selectedOffer.icon}{" "}
                    {selectedOffer.name}
                  </strong>
                </div>

                <div className="special-forces-selected-price">
                  $
                  {Number(selectedOffer.price).toFixed(2)}{" "}
                  USDT
                </div>
              </section>
            )}

            {/* ERROR */}
            {error && (
              <div className="special-forces-error">
                ⚠️ {error}
              </div>
            )}

            {/* CONTINUAR */}
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

        {/* CONFIRMACIÓN */}
        {step === "confirm" && selectedOffer && (
          <section className="special-forces-confirmation">
            <div className="special-forces-confirmation-header">
              <span>03</span>

              <div>
                <h2>Confirma tu pedido</h2>

                <p>
                  Revisa los datos antes de realizar la
                  recarga.
                </p>
              </div>
            </div>

            <div className="special-forces-confirm-card">
              <div className="special-forces-confirm-row">
                <span>Juego</span>

                <strong>
                  {deltaForceGame.name}
                </strong>
              </div>

              <div className="special-forces-confirm-row">
                <span>Player ID</span>

                <strong>{playerId}</strong>
              </div>

              <div className="special-forces-confirm-row">
                <span>Producto</span>

                <strong>
                  {selectedOffer.icon}{" "}
                  {selectedOffer.name}
                </strong>
              </div>

              <div className="special-forces-confirm-total">
                <span>Total</span>

                <strong>
                  $
                  {Number(
                    selectedOffer.price
                  ).toFixed(2)}{" "}
                  USDT
                </strong>
              </div>
            </div>

            <div className="special-forces-warning">
              <span>⚠️</span>

              <p>
                Verifica que el Player ID sea correcto
                antes de confirmar el pedido.
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
                onClick={handleConfirm}
                disabled={loading}
              >
                {loading
                  ? "PROCESANDO..."
                  : "CONFIRMAR PEDIDO ✓"}
              </button>
            </div>
          </section>
        )}

        {/* ÉXITO */}
        {step === "success" && (
          <section className="special-forces-success">
            <div className="special-forces-success-icon">
              ✓
            </div>

            <h2>¡Pedido realizado!</h2>

            <p>
              Tu pedido de Delta Force fue enviado
              correctamente.
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

              <div>
                <span>Producto</span>

                <strong>
                  {selectedOffer?.display || "-"}
                </strong>
              </div>

              <div>
                <span>Total</span>

                <strong>
                  $
                  {selectedOffer
                    ? Number(
                        selectedOffer.price
                      ).toFixed(2)
                    : "0.00"}{" "}
                  USDT
                </strong>
              </div>
            </div>

            <p className="special-forces-success-note">
              La recarga será procesada y entregada
              directamente en tu cuenta.
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

        {/* SERVICIOS */}
        <section className="special-forces-services">
          <div className="special-forces-section-header">
            <div>
              <span>⚡</span>

              <div>
                <h2>Servicio rápido y seguro</h2>

                <p>
                  Disfruta tu recarga sin complicaciones.
                </p>
              </div>
            </div>
          </div>

          <div className="special-forces-service-grid">
            <div className="special-forces-service">
              <span>⚡</span>

              <strong>Rápido</strong>

              <p>
                Procesamos tu pedido rápidamente.
              </p>
            </div>

            <div className="special-forces-service">
              <span>🔒</span>

              <strong>Seguro</strong>

              <p>
                Compra mediante un proceso protegido.
              </p>
            </div>

            <div className="special-forces-service">
              <span>🎮</span>

              <strong>Directo</strong>

              <p>
                La recarga llega directamente a tu
                cuenta.
              </p>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="special-forces-footer">
          <strong>🛒 STORE GAMING 🎮</strong>

          <span>
            Recargas digitales rápidas y seguras.
          </span>
        </footer>
      </div>
    </main>
  );
        }
