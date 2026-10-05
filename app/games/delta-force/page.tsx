"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Offer = {
  id: string;
  name: string;
  price: number;
};

const OFFERS: Offer[] = [
  {
    id: "delta_force_1",
    name: "Delta Force Pack 1",
    price: 1,
  },
  {
    id: "delta_force_2",
    name: "Delta Force Pack 2",
    price: 2,
  },
  {
    id: "delta_force_5",
    name: "Delta Force Pack 5",
    price: 5,
  },
  {
    id: "delta_force_10",
    name: "Delta Force Pack 10",
    price: 10,
  },
  {
    id: "delta_force_20",
    name: "Delta Force Pack 20",
    price: 20,
  },
];

export default function DeltaForcePage() {
  const router = useRouter();

  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [playerId, setPlayerId] = useState("");
  const [step, setStep] = useState<"form" | "confirmation" | "success">(
    "form"
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [orderReference, setOrderReference] = useState("");

  const formattedPlayerId = useMemo(() => {
    return playerId.trim();
  }, [playerId]);

  function selectOffer(offer: Offer) {
    setSelectedOffer(offer);
    setError("");
    setStep("form");
  }

  function validateForm() {
    if (!selectedOffer) {
      return "Selecciona una oferta.";
    }

    const cleanPlayerId = formattedPlayerId;

    if (!cleanPlayerId) {
      return "Introduce tu ID de jugador.";
    }

    if (!/^\d+$/.test(cleanPlayerId)) {
      return "El ID de jugador debe contener solamente números.";
    }

    if (cleanPlayerId.length < 3 || cleanPlayerId.length > 20) {
      return "El ID de jugador debe tener entre 3 y 20 números.";
    }

    return "";
  }

  function handleContinue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setStep("confirmation");
  }

  async function handleConfirm() {
    if (!selectedOffer) {
      setError("Selecciona una oferta.");
      return;
    }

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      setStep("form");
      return;
    }

    try {
      setLoading(true);
      setError("");

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
          playerId: formattedPlayerId,
          idempotencyKey,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            "No se pudo procesar la recarga."
        );
      }

      setOrderReference(
        data?.orderReference ||
          data?.reference ||
          data?.order?.reference ||
          data?.supplierOrderId ||
          idempotencyKey
      );

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

  function resetOrder() {
    setSelectedOffer(null);
    setPlayerId("");
    setError("");
    setOrderReference("");
    setStep("form");
  }

  return (
    <main className="special-forces-page">
      <header className="special-forces-header">
        <button
          type="button"
          className="special-forces-back"
          onClick={() => router.push("/top-up")}
        >
          ← Volver
        </button>

        <div className="special-forces-header-title">
          <strong>Delta Force</strong>
          <span>Recargas</span>
        </div>
      </header>

      <section className="special-forces-hero">
        <div className="special-forces-banner">
          <img
            src="/images/delta-force.jpg"
            alt="Delta Force"
          />

          <div className="special-forces-banner-overlay">
            <span>RECARGAS</span>
            <h1>DELTA FORCE</h1>
          </div>
        </div>
      </section>

      <section className="special-forces-content">
        <div className="special-forces-info">
          <h2>Recarga Delta Force</h2>

          <p>
            Selecciona el paquete que deseas comprar e introduce
            correctamente tu ID de jugador.
          </p>
        </div>

        <div className="special-forces-note">
          <strong>⚠️ IMPORTANTE</strong>

          <p>
            Comprueba tu ID de jugador antes de confirmar el pedido.
            Una vez procesada la recarga, no podremos modificar los
            datos introducidos.
          </p>
        </div>

        {step === "form" && (
          <>
            <div className="special-forces-section-header">
              <h2>Selecciona una oferta</h2>
              <span>Pago en USD</span>
            </div>

            <div className="special-forces-offers">
              {OFFERS.map((offer) => (
                <button
                  key={offer.id}
                  type="button"
                  className={`special-forces-offer ${
                    selectedOffer?.id === offer.id ? "selected" : ""
                  }`}
                  onClick={() => selectOffer(offer)}
                >
                  <div className="special-forces-offer-name">
                    {offer.name}
                  </div>

                  <div className="special-forces-offer-bottom">
                    <span className="special-forces-offer-price">
                      ${offer.price.toFixed(2)}
                    </span>

                    <span className="special-forces-offer-action">
                      +
                    </span>
                  </div>
                </button>
              ))}
            </div>

            <div className="special-forces-order">
              <form
                className="special-forces-form"
                onSubmit={handleContinue}
              >
                <h2>Datos del jugador</h2>

                <div className="special-forces-form-subtitle">
                  Introduce los datos necesarios para realizar la
                  recarga.
                </div>

                {selectedOffer && (
                  <div className="special-forces-selected">
                    <div>
                      <div className="special-forces-selected-label">
                        Oferta seleccionada
                      </div>

                      <div className="special-forces-selected-name">
                        {selectedOffer.name}
                      </div>
                    </div>

                    <div className="special-forces-selected-price">
                      ${selectedOffer.price.toFixed(2)}
                    </div>
                  </div>
                )}

                <div className="special-forces-field">
                  <label htmlFor="playerId">
                    ID de jugador
                  </label>

                  <input
                    id="playerId"
                    className="special-forces-input"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="Ejemplo: 123456789"
                    value={playerId}
                    onChange={(event) => {
                      setPlayerId(
                        event.target.value.replace(/\D/g, "")
                      );
                      setError("");
                    }}
                  />

                  <div className="special-forces-help">
                    Introduce solamente números.
                  </div>
                </div>

                {error && (
                  <div className="special-forces-error">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  className="special-forces-primary-btn"
                  disabled={!selectedOffer}
                >
                  Continuar
                </button>
              </form>
            </div>
          </>
        )}

        {step === "confirmation" && selectedOffer && (
          <div className="special-forces-confirmation">
            <h2>Confirmar pedido</h2>

            <div className="special-forces-confirmation-card">
              <div className="special-forces-confirmation-row">
                <span>Juego</span>
                <span>Delta Force</span>
              </div>

              <div className="special-forces-confirmation-row">
                <span>Oferta</span>
                <span>{selectedOffer.name}</span>
              </div>

              <div className="special-forces-confirmation-row">
                <span>ID de jugador</span>
                <span>{formattedPlayerId}</span>
              </div>

              <div className="special-forces-confirmation-row">
                <span>Total</span>
                <span className="special-forces-confirmation-price">
                  ${selectedOffer.price.toFixed(2)}
                </span>
              </div>
            </div>

            {error && (
              <div className="special-forces-error">
                {error}
              </div>
            )}

            <div className="special-forces-confirmation-actions">
              <button
                type="button"
                className="special-forces-secondary-btn"
                onClick={() => {
                  setError("");
                  setStep("form");
                }}
                disabled={loading}
              >
                ← Editar
              </button>

              <button
                type="button"
                className="special-forces-primary-btn"
                onClick={handleConfirm}
                disabled={loading}
              >
                {loading ? "Procesando..." : "Confirmar compra"}
              </button>
            </div>
          </div>
        )}

        {step === "success" && (
          <div className="special-forces-success">
            <div className="special-forces-success-icon">
              ✓
            </div>

            <h2>¡Pedido realizado!</h2>

            <p>
              Tu pedido de Delta Force fue enviado correctamente.
              Puedes consultar el estado de la operación desde tu
              cuenta.
            </p>

            {orderReference && (
              <div className="special-forces-success-reference">
                Referencia:{" "}
                <strong>{orderReference}</strong>
              </div>
            )}

            <div className="special-forces-success-actions">
              <button
                type="button"
                className="special-forces-primary-btn"
                onClick={resetOrder}
              >
                Realizar otra recarga
              </button>

              <button
                type="button"
                className="special-forces-secondary-btn"
                onClick={() => router.push("/home")}
              >
                Ir al inicio
              </button>
            </div>
          </div>
        )}

        <div className="special-forces-service-grid">
          <div className="special-forces-service">
            <div className="special-forces-service-icon">
              ⚡
            </div>

            <strong>Entrega rápida</strong>

            <span>
              Procesamos tu pedido rápidamente.
            </span>
          </div>

          <div className="special-forces-service">
            <div className="special-forces-service-icon">
              🔒
            </div>

            <strong>Pago seguro</strong>

            <span>
              Tu saldo se procesa de forma segura.
            </span>
          </div>

          <div className="special-forces-service">
            <div className="special-forces-service-icon">
              🎮
            </div>

            <strong>Servicio gaming</strong>

            <span>
              Recargas para tus juegos favoritos.
            </span>
          </div>
        </div>
      </section>

      <footer className="special-forces-footer">
        STORE GAMING • Delta Force
      </footer>

      <style jsx>{`
        .special-forces-page {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at top,
              rgba(255, 176, 0, 0.08),
              transparent 35%
            ),
            #090909;
          color: #fff;
        }

        .special-forces-header {
          height: 64px;
          padding: 0 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(8, 8, 8, 0.92);
        }

        .special-forces-back {
          border: 0;
          background: transparent;
          color: #aaa;
          cursor: pointer;
          font-size: 13px;
          font-weight: 700;
        }

        .special-forces-back:hover {
          color: #fff;
        }

        .special-forces-header-title {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .special-forces-header-title strong {
          font-size: 15px;
        }

        .special-forces-header-title span {
          color: #777;
          font-size: 12px;
        }

        .special-forces-hero {
          max-width: 1180px;
          margin: 0 auto;
          padding: 24px 20px 0;
        }

        .special-forces-banner {
          position: relative;
          height: 330px;
          overflow: hidden;
          border-radius: 22px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: #111;
        }

        .special-forces-banner img {
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
              rgba(0, 0, 0, 0.82),
              rgba(0, 0, 0, 0.2)
            ),
            linear-gradient(
              0deg,
              rgba(0, 0, 0, 0.75),
              transparent 60%
            );
        }

        .special-forces-banner-overlay {
          position: absolute;
          z-index: 2;
          inset: 0;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 35px;
        }

        .special-forces-banner-overlay span {
          display: inline-block;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 1.5px;
          color: #ff4747;
          margin-bottom: 5px;
        }

        .special-forces-banner-overlay h1 {
          margin: 0;
          font-size: clamp(28px, 5vw, 52px);
          font-weight: 900;
          line-height: 1;
          text-shadow: 0 4px 20px rgba(0, 0, 0, 0.7);
        }

        .special-forces-content {
          max-width: 1180px;
          margin: 0 auto;
          padding: 28px 20px 0;
        }

        .special-forces-info {
          padding: 20px;
          margin-bottom: 18px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.035);
          border: 1px solid rgba(255, 255, 255, 0.07);
        }

        .special-forces-info h2 {
          margin: 0;
          font-size: 18px;
        }

        .special-forces-info p {
          margin: 6px 0 0;
          color: #aaa;
          line-height: 1.5;
          font-size: 14px;
        }

        .special-forces-note {
          background: rgba(255, 170, 0, 0.06);
          border: 1px solid rgba(255, 170, 0, 0.16);
          border-radius: 17px;
          padding: 17px;
          margin-bottom: 28px;
        }

        .special-forces-note strong {
          color: #ffc44d;
        }

        .special-forces-note p {
          color: #bdbdbd;
          font-size: 13px;
          line-height: 1.5;
          margin: 7px 0 0;
        }

        .special-forces-section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
          margin-bottom: 15px;
        }

        .special-forces-section-header h2 {
          margin: 0;
          font-size: 20px;
        }

        .special-forces-section-header span {
          color: #777;
          font-size: 12px;
        }

        .special-forces-offers {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .special-forces-offer {
          width: 100%;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.035);
          border-radius: 18px;
          padding: 16px;
          text-align: left;
          cursor: pointer;
          color: white;
          transition: 0.2s ease;
        }

        .special-forces-offer:hover {
          transform: translateY(-2px);
          border-color: rgba(255, 170, 0, 0.45);
          background: rgba(255, 170, 0, 0.07);
        }

        .special-forces-offer.selected {
          border-color: #ffb000;
          background: rgba(255, 176, 0, 0.1);
          box-shadow: 0 0 0 1px rgba(255, 176, 0, 0.15);
        }

        .special-forces-offer-name {
          font-size: 14px;
          font-weight: 800;
          line-height: 1.35;
          min-height: 38px;
        }

        .special-forces-offer-bottom {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          margin-top: 15px;
        }

        .special-forces-offer-price {
          font-size: 20px;
          font-weight: 900;
          color: #ffc44d;
        }

        .special-forces-offer-action {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #ffb000;
          color: #111;
          font-weight: 900;
        }

        .special-forces-order {
          margin-top: 30px;
        }

        .special-forces-form {
          background: rgba(255, 255, 255, 0.035);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 20px;
          padding: 22px;
        }

        .special-forces-form h2 {
          margin: 0 0 6px;
          font-size: 20px;
        }

        .special-forces-form-subtitle {
          color: #888;
          font-size: 13px;
          margin-bottom: 20px;
        }

        .special-forces-selected {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
          padding: 15px;
          margin-bottom: 20px;
          border-radius: 15px;
          background: rgba(255, 176, 0, 0.08);
          border: 1px solid rgba(255, 176, 0, 0.15);
        }

        .special-forces-selected-label {
          color: #888;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.8px;
        }

        .special-forces-selected-name {
          margin-top: 4px;
          font-size: 14px;
          font-weight: 800;
        }

        .special-forces-selected-price {
  font-size: 22px;
  font-weight: 900;
  color: #ffc44d;
  white-space: nowrap;
}

.special-forces-field {
  margin-bottom: 17px;
}

.special-forces-field label {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 700;
}

.special-forces-input {
  width: 100%;
  box-sizing: border-box;
  padding: 14px 15px;
  border-radius: 13px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.25);
  color: white;
  outline: none;
  font-size: 14px;
}

.special-forces-input:focus {
  border-color: #ffb000;
  box-shadow: 0 0 0 3px rgba(255, 176, 0, 0.08);
}

.special-forces-help {
  margin-top: 7px;
  color: #777;
  font-size: 11px;
}

.special-forces-error {
  padding: 12px 14px;
  border-radius: 12px;
  margin-bottom: 15px;
  background: rgba(255, 65, 65, 0.08);
  border: 1px solid rgba(255, 65, 65, 0.2);
  color: #ff8d8d;
  font-size: 13px;
}

.special-forces-primary-btn {
  width: 100%;
  border: 0;
  border-radius: 14px;
  padding: 15px 18px;
  background: #ffb000;
  color: #111;
  font-size: 14px;
  font-weight: 900;
  cursor: pointer;
  transition: 0.2s ease;
}

.special-forces-primary-btn:hover {
  filter: brightness(1.08);
  transform: translateY(-1px);
}

.special-forces-primary-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  transform: none;
}

.special-forces-confirmation {
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  padding: 22px;
}

.special-forces-confirmation h2 {
  margin: 0 0 18px;
  font-size: 21px;
}

.special-forces-confirmation-card {
  display: grid;
  gap: 11px;
  margin-bottom: 20px;
}

.special-forces-confirmation-row {
  display: flex;
  justify-content: space-between;
  gap: 15px;
  padding: 12px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  font-size: 13px;
}

.special-forces-confirmation-row span:first-child {
  color: #888;
}

.special-forces-confirmation-row span:last-child {
  font-weight: 800;
  text-align: right;
}

.special-forces-confirmation-price {
  color: #ffc44d;
  font-size: 18px;
}

.special-forces-confirmation-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.special-forces-secondary-btn {
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  padding: 14px 18px;
  background: rgba(255, 255, 255, 0.04);
  color: white;
  font-size: 14px;
  font-weight: 800;
  cursor: pointer;
}

.special-forces-secondary-btn:hover {
  background: rgba(255, 255, 255, 0.08);
}

.special-forces-success {
  text-align: center;
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 22px;
  padding: 28px;
}

.special-forces-success-icon {
  width: 70px;
  height: 70px;
  margin: 0 auto 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(57, 211, 83, 0.12);
  border: 1px solid rgba(57, 211, 83, 0.25);
  color: #54e56b;
  font-size: 34px;
  font-weight: 900;
}

.special-forces-success h2 {
  margin: 0 0 8px;
  font-size: 24px;
}

.special-forces-success p {
  margin: 0 auto;
  max-width: 520px;
  color: #999;
  font-size: 14px;
  line-height: 1.6;
}

.special-forces-success-reference {
  margin: 20px 0;
  padding: 13px;
  border-radius: 13px;
  background: rgba(255, 255, 255, 0.04);
  color: #ccc;
  font-size: 13px;
}

.special-forces-success-reference strong {
  color: white;
}

.special-forces-success-actions {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
  max-width: 420px;
  margin: 0 auto;
}

.special-forces-service-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-top: 35px;
}

.special-forces-service {
  padding: 20px;
  border-radius: 17px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.07);
  text-align: center;
}

.special-forces-service-icon {
  font-size: 28px;
  margin-bottom: 9px;
}

.special-forces-service strong {
  display: block;
  font-size: 13px;
}

.special-forces-service span {
  display: block;
  margin-top: 5px;
  color: #777;
  font-size: 11px;
  line-height: 1.4;
}

.special-forces-footer {
  text-align: center;
  padding: 35px 15px;
  color: #666;
  font-size: 11px;
}

@media (max-width: 760px) {
  .special-forces-banner {
    height: 250px;
  }

  .special-forces-offers {
    grid-template-columns: 1fr;
  }

  .special-forces-service-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 520px) {
  .special-forces-header {
    padding: 0 14px;
  }

  .special-forces-hero,
  .special-forces-content {
    padding-left: 12px;
    padding-right: 12px;
  }

  .special-forces-banner {
    height: 220px;
    border-radius: 17px;
  }

  .special-forces-banner-overlay {
    padding: 15px;
  }

  .special-forces-banner-overlay h1 {
    font-size: 30px;
  }

  .special-forces-info {
    padding: 14px;
  }

  .special-forces-offer {
    padding: 13px;
  }

  .special-forces-selected {
    align-items: flex-start;
    flex-direction: column;
  }

  .special-forces-selected-price {
    align-self: flex-end;
  }

  .special-forces-form,
  .special-forces-confirmation,
  .special-forces-success {
    padding: 18px;
  }

  .special-forces-confirmation-actions,
  .special-forces-success-actions {
    grid-template-columns: 1fr;
  }

  .special-forces-service {
    padding: 17px;
  }
}
