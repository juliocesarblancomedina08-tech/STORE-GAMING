"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Offer = {
  id: string;
  name: string;
  price: number;
};

const OFFERS: Offer[] = [
  {
    id: "special_forces_1",
    name: "Special Forces - Oferta 1",
    price: 1.00,
  },
  {
    id: "special_forces_2",
    name: "Special Forces - Oferta 2",
    price: 2.00,
  },
  {
    id: "special_forces_3",
    name: "Special Forces - Oferta 3",
    price: 5.00,
  },
  {
    id: "special_forces_4",
    name: "Special Forces - Oferta 4",
    price: 10.00,
  },
  {
    id: "special_forces_5",
    name: "Special Forces - Oferta 5",
    price: 20.00,
  },
];

export default function SpecialForcesPage() {
  const router = useRouter();

  const [showOffers, setShowOffers] = useState(true);
  const [selectedOffer, setSelectedOffer] =
    useState<Offer | null>(null);

  const [playerId, setPlayerId] = useState("");
  const [error, setError] = useState("");

  const [showConfirmation, setShowConfirmation] =
    useState(false);

  const [orderCreated, setOrderCreated] =
    useState(false);

  const [orderNumber, setOrderNumber] =
    useState("");

  const [supplierOrderId, setSupplierOrderId] =
    useState("");

  const [orderStatus, setOrderStatus] =
    useState("");

  const [processing, setProcessing] =
    useState(false);

  function selectOffer(offer: Offer) {
    setSelectedOffer(offer);
    setError("");
    setShowConfirmation(false);
    setOrderCreated(false);

    setTimeout(() => {
      document
        .getElementById("order-section")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
    }, 50);
  }

  function handleFinishPurchase(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!selectedOffer) {
      setError("Selecciona una oferta primero.");
      return;
    }

    const cleanPlayerId = playerId.trim();

    if (!/^\d+$/.test(cleanPlayerId)) {
      setError(
        "El ID del jugador debe contener solamente números."
      );
      return;
    }

    if (
      cleanPlayerId.length < 3 ||
      cleanPlayerId.length > 20
    ) {
      setError(
        "El ID del jugador debe tener entre 3 y 20 números."
      );
      return;
    }

    setError("");
    setShowConfirmation(true);
  }

  async function createOrder() {
    if (!selectedOffer) return;

    try {
      setProcessing(true);
      setError("");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setError(
          "Tu sesión ha expirado. Inicia sesión nuevamente."
        );
        setProcessing(false);
        return;
      }

      const idempotencyKey =
        typeof crypto !== "undefined" &&
        typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()
              .toString(36)
              .slice(2)}`;

      const response = await fetch(
        "/api/topups/special-forces",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            offerId: selectedOffer.id,
            playerId: playerId.trim(),
            idempotencyKey,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            "No se pudo crear la orden."
        );
      }

      setOrderNumber(
        data?.orderNumber ||
          data?.order?.order_number ||
          data?.order?.id ||
          ""
      );

      setSupplierOrderId(
        data?.supplierOrderId ||
          data?.supplier_order_id ||
          data?.order?.supplier_order_id ||
          ""
      );

      setOrderStatus(
        data?.status ||
          data?.order?.status ||
          "PENDING"
      );

      setOrderCreated(true);
      setShowConfirmation(false);
    } catch (err) {
      console.error(
        "ERROR CREANDO ORDEN SPECIAL FORCES:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error creando la orden."
      );
    } finally {
      setProcessing(false);
    }
  }

  function resetPurchase() {
    setSelectedOffer(null);
    setPlayerId("");
    setError("");
    setShowConfirmation(false);
    setOrderCreated(false);
    setOrderNumber("");
    setSupplierOrderId("");
    setOrderStatus("");
  }

  function goToOrders() {
    router.push("/orders");
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
          <strong>Special Forces</strong>
          <span>Global</span>
        </div>

        <div className="special-forces-header-spacer" />
      </header>

      <section className="special-forces-hero">
        <div className="special-forces-banner">
          <img
            src="/images/special-forces.jpg"
            alt="Special Forces"
          />

          <div className="special-forces-banner-overlay">
            <span>SPECIAL FORCES</span>

            <h1>Special Forces</h1>

            <p>
              Recarga tu cuenta de forma rápida y segura.
            </p>
          </div>
        </div>
      </section>

      <section className="special-forces-content">
        <div className="special-forces-info">
          <div className="special-forces-info-icon">
            🎮
          </div>

          <div>
            <h2>Recarga Special Forces</h2>

            <p>
              Selecciona una oferta, introduce tu ID de
              jugador y completa tu compra utilizando tu
              saldo disponible.
            </p>
          </div>
        </div>

        <div className="special-forces-note">
          <strong>⚠️ IMPORTANTE</strong>

          <p>
            Verifica cuidadosamente tu ID de jugador antes
            de confirmar la compra. Los datos incorrectos
            pueden impedir que la recarga sea procesada.
          </p>
        </div>

        <div className="special-forces-section-header">
          <div>
            <h2>Ofertas disponibles</h2>

            <p>
              Special Forces · Global
            </p>
          </div>

          <button
            type="button"
            className="special-forces-toggle"
            onClick={() =>
              setShowOffers((value) => !value)
            }
          >
            {showOffers ? "Ocultar" : "Mostrar"}
          </button>
        </div>

        {showOffers && (
          <div className="special-forces-offers">
            {OFFERS.map((offer) => {
              const selected =
                selectedOffer?.id === offer.id;

              return (
                <button
                  type="button"
                  key={offer.id}
                  className={`special-forces-offer ${
                    selected ? "selected" : ""
                  }`}
                  onClick={() =>
                    selectOffer(offer)
                  }
                >
                  <div className="special-forces-offer-left">
                    <div className="special-forces-icon">
                      🎖️
                    </div>

                    <div className="special-forces-offer-name">
                      <strong>
                        {offer.name}
                      </strong>

                      <small>
                        Recarga instantánea
                      </small>
                    </div>
                  </div>

                  <div className="special-forces-price">
                    <span>
                      ${offer.price.toFixed(2)}
                    </span>

                    <small>USD</small>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <section
          id="order-section"
          className="special-forces-order"
        >
          {!selectedOffer && !orderCreated && (
            <div className="special-forces-empty">
              <div className="special-forces-empty-icon">
                🎮
              </div>

              <h3>
                Selecciona una oferta
              </h3>

              <p>
                Elige uno de los paquetes disponibles
                para continuar con tu recarga.
              </p>
            </div>
          )}

          {selectedOffer &&
            !orderCreated &&
            !showConfirmation && (
              <form
                className="special-forces-form"
                onSubmit={handleFinishPurchase}
              >
                <div className="special-forces-selected">
                  <div>
                    <span>
                      OFERTA SELECCIONADA
                    </span>

                    <strong>
                      {selectedOffer.name}
                    </strong>
                  </div>

                  <div className="special-forces-selected-price">
                    ${selectedOffer.price.toFixed(2)}
                    <small> USD</small>
                  </div>
                </div>

                <div className="special-forces-form-title">
                  <h2>
                    Datos del jugador
                  </h2>

                  <p>
                    Introduce el ID donde deseas
                    recibir la recarga.
                  </p>
                </div>

                <label>
                  <span>
                    ID del jugador
                  </span>

                  <input
                    type="text"
                    inputMode="numeric"
                    value={playerId}
                    onChange={(event) =>
                      setPlayerId(
                        event.target.value
                      )
                    }
                    placeholder="Ej: 123456789"
                    autoComplete="off"
                  />
                </label>

                <div className="special-forces-help">
                  <span>💡</span>

                  <p>
                    Comprueba tu ID directamente dentro
                    del juego antes de realizar el pedido.
                  </p>
                </div>

                {error && (
                  <div className="special-forces-error">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  className="special-forces-submit"
                >
                  Continuar
                </button>
              </form>
            )}

          {showConfirmation &&
            selectedOffer &&
            !orderCreated && (
              <div className="special-forces-confirmation">
                <div className="special-forces-confirmation-icon">
                  🛒
                </div>

                <h2>
                  Confirmar compra
                </h2>

                <p>
                  Revisa los datos antes de confirmar
                  tu pedido.
                </p>

                <div className="special-forces-confirmation-card">
                  <div>
                    <span>
                      PRODUCTO
                    </span>

                    <strong>
                      {selectedOffer.name}
                    </strong>
                  </div>

                  <div>
                    <span>
                      ID DEL JUGADOR
                    </span>

                    <strong>
                      {playerId}
                    </strong>
                  </div>

                  <div className="total">
                    <span>
                      TOTAL
                    </span>

                    <strong>
                      ${selectedOffer.price.toFixed(2)} USD
                    </strong>
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
                    className="special-forces-cancel"
                    onClick={() =>
                      setShowConfirmation(false)
                    }
                    disabled={processing}
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    className="special-forces-confirm"
                    onClick={createOrder}
                    disabled={processing}
                  >
                    {processing
                      ? "Procesando..."
                      : "Confirmar compra"}
                  </button>
                </div>
              </div>
            )}

          {orderCreated && (
            <div className="special-forces-success">
              <div className="special-forces-success-icon">
                ✓
              </div>

              <h2>
                ¡Orden creada!
              </h2>

              <p>
                Tu solicitud de recarga fue recibida
                correctamente.
              </p>

              <div className="special-forces-success-card">
                {orderNumber && (
                  <div>
                    <span>
                      NÚMERO DE ORDEN
                    </span>

                    <strong>
                      {orderNumber}
                    </strong>
                  </div>
                )}

                {supplierOrderId && (
                  <div>
                    <span>
                      ID DEL PROVEEDOR
                    </span>

                    <strong>
                      {supplierOrderId}
                    </strong>
                  </div>
                )}

                <div>
                  <span>
                    PRODUCTO
                  </span>

                  <strong>
                    {selectedOffer?.name}
                  </strong>
                </div>

                <div>
                  <span>
                    ID DEL JUGADOR
                  </span>

                  <strong>
                    {playerId}
                  </strong>
                </div>

                <div>
                  <span>
                    ESTADO
                  </span>

                  <strong>
                    {orderStatus}
                  </strong>
                </div>

                <div>
                  <span>
                    TOTAL
                  </span>

                  <strong>
                    $
                    {selectedOffer?.price.toFixed(2)} USD
                  </strong>
                </div>
              </div>

              <div className="special-forces-success-actions">
                <button
                  type="button"
                  className="special-forces-new-button"
                  onClick={resetPurchase}
                >
                  Nueva compra
                </button>

                <button
                  type="button"
                  className="special-forces-orders-button"
                  onClick={goToOrders}
                >
                  Ver mis órdenes
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="special-forces-service">
          <h2>
            Servicio rápido y seguro
          </h2>

          <div className="special-forces-service-grid">
            <div>
              <span>⚡</span>
              <strong>Rápido</strong>
              <p>Procesamiento automático</p>
            </div>

            <div>
              <span>🔒</span>
              <strong>Seguro</strong>
              <p>Compra protegida</p>
            </div>

            <div>
              <span>💳</span>
              <strong>Saldo</strong>
              <p>Pago desde tu cuenta</p>
            </div>

            <div>
              <span>🎮</span>
              <strong>Global</strong>
              <p>Servicio internacional</p>
            </div>
          </div>
        </section>

        <footer className="special-forces-footer">
          <p>
            🛒 STORE GAMING 🎮
          </p>

          <span>
            Special Forces · Global
          </span>
        </footer>
      </section>

      <style jsx>{`
        .special-forces-page {
          min-height: 100vh;
          background: #080808;
          color: #fff;
        }

        .special-forces-header {
          position: sticky;
          top: 0;
          z-index: 20;
          height: 64px;
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 0 20px;
          background: rgba(8, 8, 8, 0.94);
          backdrop-filter: blur(14px);
          border-bottom: 1px solid
            rgba(255, 255, 255, 0.08);
        }

        .special-forces-back {
          border: 0;
          background: transparent;
          color: #aaa;
          cursor: pointer;
          font-size: 14px;
        }

        .special-forces-back:hover {
          color: #fff;
        }

        .special-forces-header-title {
          display: flex;
          flex-direction: column;
        }

        .special-forces-header-title strong {
          font-size: 15px;
        }

        .special-forces-header-title span {
          color: #777;
          font-size: 11px;
        }

        .special-forces-header-spacer {
          flex: 1;
        }

        .special-forces-hero {
          width: 100%;
          max-width: 1100px;
          margin: 0 auto;
          padding: 20px 18px;
          box-sizing: border-box;
        }

        .special-forces-banner {
          position: relative;
          overflow: hidden;
          height: 310px;
          border-radius: 22px;
          background: #111;
        }

        .special-forces-banner img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .special-forces-banner-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          padding: 25px;
          background:
            linear-gradient(
              transparent 25%,
              rgba(0, 0, 0, 0.9)
            );
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
          font-size: clamp(30px, 5vw, 52px);
          font-weight: 900;
          line-height: 1;
        }

        .special-forces-banner-overlay p {
          margin: 8px 0 0;
          color: #ddd;
          font-size: 15px;
        }

        .special-forces-content {
          width: 100%;
          max-width: 1000px;
          margin: 0 auto;
          padding: 0 18px;
          box-sizing: border-box;
        }

        .special-forces-info {
  display: flex;
  align-items: flex-start;
  gap: 15px;
  padding: 18px;
  border-radius: 18px;
  background: #121212;
  border: 1px solid rgba(255, 255, 255, 0.08);
  margin-bottom: 15px;
}

.special-forces-info-icon {
  width: 45px;
  height: 45px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 13px;
  background: rgba(255, 60, 60, 0.1);
  font-size: 22px;
  flex-shrink: 0;
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
  align-items: center;
  justify-content: space-between;
  gap: 15px;
  margin-bottom: 15px;
}

.special-forces-section-header h2 {
  margin: 0;
  font-size: 23px;
}

.special-forces-section-header p {
  color: #888;
  margin: 5px 0 0;
  font-size: 13px;
}

.special-forces-toggle {
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: #171717;
  color: #fff;
  padding: 10px 14px;
  border-radius: 11px;
  cursor: pointer;
}

.special-forces-offers {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.special-forces-offer {
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 15px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  background: #121212;
  color: #fff;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    transform 0.2s ease,
    background 0.2s ease;
}

.special-forces-offer:hover {
  transform: translateY(-2px);
  background: #171717;
  border-color: rgba(255, 70, 70, 0.35);
}

.special-forces-offer.selected {
  border-color: #ff3e3e;
  background: rgba(255, 50, 50, 0.08);
}

.special-forces-offer-left {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 11px;
}

.special-forces-icon {
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: rgba(255, 70, 70, 0.1);
  font-size: 20px;
  flex-shrink: 0;
}

.special-forces-offer-name {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.special-forces-offer-name strong {
  font-size: 14px;
  line-height: 1.25;
}

.special-forces-offer-name small {
  color: #777;
  font-size: 10px;
}

.special-forces-price {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  flex-shrink: 0;
}

.special-forces-price span {
  color: #4cff9a;
  font-size: 16px;
  font-weight: 900;
}

.special-forces-price small {
  color: #777;
  font-size: 10px;
  margin-top: 2px;
}

.special-forces-order {
  margin-top: 25px;
}

.special-forces-empty,
.special-forces-form,
.special-forces-confirmation,
.special-forces-success {
  background: #111;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  padding: 24px;
}

.special-forces-empty {
  text-align: center;
  padding: 45px 20px;
}

.special-forces-empty-icon {
  font-size: 42px;
  margin-bottom: 12px;
}

.special-forces-empty h3 {
  margin: 0;
  font-size: 20px;
}

.special-forces-empty p {
  color: #888;
  margin: 8px auto 0;
  max-width: 450px;
  line-height: 1.5;
}

.special-forces-selected {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
  padding: 17px;
  margin-bottom: 20px;
  border-radius: 16px;
  background: rgba(255, 50, 50, 0.07);
  border: 1px solid rgba(255, 60, 60, 0.18);
}

.special-forces-selected > div:first-child {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.special-forces-selected span {
  color: #888;
  font-size: 11px;
  margin-bottom: 5px;
}

.special-forces-selected strong {
  font-size: 14px;
}

.special-forces-selected-price {
  color: #4cff9a;
  font-size: 20px;
  font-weight: 900;
  white-space: nowrap;
}

.special-forces-selected-price small {
  color: #777;
  font-size: 10px;
}

.special-forces-form {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.special-forces-form-title h2,
.special-forces-confirmation h2,
.special-forces-success h2 {
  margin: 0;
  font-size: 23px;
}

.special-forces-form-title p,
.special-forces-confirmation > p,
.special-forces-success > p {
  color: #888;
  font-size: 14px;
  line-height: 1.5;
  margin: 7px 0 20px;
}

.special-forces-form label {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.special-forces-form label > span {
  font-size: 13px;
  font-weight: 700;
  color: #ddd;
}

.special-forces-form input {
  width: 100%;
  box-sizing: border-box;
  height: 50px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  outline: none;
  background: #181818;
  color: #fff;
  padding: 0 15px;
  font-size: 16px;
}

.special-forces-form input:focus {
  border-color: #ff4141;
  box-shadow: 0 0 0 3px rgba(255, 65, 65, 0.08);
}

.special-forces-help {
  display: flex;
  gap: 9px;
  padding: 12px;
  border-radius: 11px;
  background: rgba(255, 255, 255, 0.035);
}

.special-forces-help p {
  margin: 0;
  color: #999;
  font-size: 12px;
  line-height: 1.5;
}

.special-forces-error {
  padding: 12px 14px;
  border-radius: 10px;
  background: rgba(255, 45, 45, 0.08);
  border: 1px solid rgba(255, 60, 60, 0.2);
  color: #ff7b7b;
  font-size: 13px;
}

.special-forces-submit,
.special-forces-confirm,
.special-forces-orders-button {
  height: 52px;
  border: 0;
  border-radius: 12px;
  background: #ff3838;
  color: #fff;
  font-weight: 900;
  cursor: pointer;
  padding: 0 18px;
}

.special-forces-submit:hover,
.special-forces-confirm:hover,
.special-forces-orders-button:hover {
  background: #ff4f4f;
}

.special-forces-confirmation {
  text-align: center;
}

.special-forces-confirmation-icon,
.special-forces-success-icon {
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 14px;
  border-radius: 50%;
  font-size: 27px;
  background: rgba(255, 55, 55, 0.1);
}

.special-forces-confirmation-card,
.special-forces-success-card {
  text-align: left;
  border-radius: 15px;
  background: #181818;
  border: 1px solid rgba(255, 255, 255, 0.07);
  padding: 15px;
}

.special-forces-confirmation-card > div,
.special-forces-success-card > div {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 11px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.special-forces-confirmation-card > div:last-child,
.special-forces-success-card > div:last-child {
  border-bottom: 0;
}

.special-forces-confirmation-card span,
.special-forces-success-card span {
  color: #777;
  font-size: 11px;
}

.special-forces-confirmation-card strong,
.special-forces-success-card strong {
  font-size: 14px;
  word-break: break-word;
}

.special-forces-confirmation-card .total {
  margin-top: 4px;
  padding-top: 15px;
}

.special-forces-confirmation-card .total strong {
  color: #4cff9a;
  font-size: 20px;
}

.special-forces-confirmation-actions,
.special-forces-success-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 15px;
}

.special-forces-cancel,
.special-forces-new-button {
  height: 52px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  background: #181818;
  color: #fff;
  font-weight: 800;
  cursor: pointer;
}

.special-forces-confirm:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.special-forces-success {
  text-align: center;
}

.special-forces-success-icon {
  background: rgba(60, 255, 145, 0.1);
  color: #4cff9a;
}

.special-forces-success-card {
  text-align: left;
}

.special-forces-service {
  margin-top: 30px;
  padding: 22px;
  border-radius: 20px;
  background: #111;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.special-forces-service h2 {
  margin: 0 0 15px;
  font-size: 19px;
}

.special-forces-service-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.special-forces-service-grid > div {
  padding: 15px;
  border-radius: 14px;
  background: #171717;
  text-align: center;
}

.special-forces-service-grid span {
  display: block;
  font-size: 22px;
  margin-bottom: 7px;
}

.special-forces-service-grid strong {
  display: block;
  font-size: 12px;
}

.special-forces-service-grid p {
  margin: 4px 0 0;
  color: #777;
  font-size: 11px;
}

.special-forces-footer {
  text-align: center;
  padding: 35px 20px 10px;
  color: #777;
}

.special-forces-footer p {
  margin: 0;
  font-weight: 800;
  color: #aaa;
}

.special-forces-footer span {
  display: block;
  margin-top: 5px;
  font-size: 12px;
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
