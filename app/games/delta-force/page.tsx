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
    id: "delta_force_1",
    name: "Delta Force - Oferta 1",
    price: 1.0,
  },
  {
    id: "delta_force_2",
    name: "Delta Force - Oferta 2",
    price: 2.0,
  },
  {
    id: "delta_force_3",
    name: "Delta Force - Oferta 3",
    price: 5.0,
  },
  {
    id: "delta_force_4",
    name: "Delta Force - Oferta 4",
    price: 10.0,
  },
  {
    id: "delta_force_5",
    name: "Delta Force - Oferta 5",
    price: 20.0,
  },
];

export default function DeltaForcePage() {
  const router = useRouter();

  const [showOffers, setShowOffers] = useState(true);
  const [selectedOffer, setSelectedOffer] =
    useState<Offer | null>(null);

  const [playerId, setPlayerId] = useState("");
  const [error, setError] = useState("");

  const [showConfirmation, setShowConfirmation] =
    useState(false);

  const [orderCreated, setOrderCreated] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [supplierOrderId, setSupplierOrderId] = useState("");
  const [orderStatus, setOrderStatus] = useState("");

  const [processing, setProcessing] = useState(false);

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
        "/api/topups/delta-force",
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
        "ERROR CREANDO ORDEN DELTA FORCE:",
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
          <strong>Delta Force</strong>
          <span>Global</span>
        </div>

        <div className="special-forces-header-spacer" />
      </header>

      <section className="special-forces-hero">
        <div className="special-forces-banner">
          <img
            src="/images/delta-force.jpg"
            alt="Delta Force"
          />

          <div className="special-forces-banner-overlay">
            <span>DELTA FORCE</span>

            <h1>Delta Force</h1>

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
            <h2>Recarga Delta Force</h2>

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

            <p>Delta Force · Global</p>
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
                  onClick={() => selectOffer(offer)}
                >
                  <div className="special-forces-offer-left">
                    <div className="special-forces-icon">
                      🎖️
                    </div>

                    <div className="special-forces-offer-name">
                      <strong>{offer.name}</strong>

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

              <h3>Selecciona una oferta</h3>

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
                    <span>OFERTA SELECCIONADA</span>

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
                  <h2>Datos del jugador</h2>

                  <p>
                    Introduce el ID donde deseas recibir
                    la recarga.
                  </p>
                </div>

                <label>
                  <span>ID del jugador</span>

                  <input
                    type="text"
                    inputMode="numeric"
                    value={playerId}
                    onChange={(event) =>
                      setPlayerId(event.target.value)
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

                <h2>Confirmar compra</h2>

                <p>
                  Revisa los datos antes de confirmar tu
                  pedido.
                </p>

                <div className="special-forces-confirmation-card">
                  <div>
                    <span>PRODUCTO</span>

                    <strong>
                      {selectedOffer.name}
                    </strong>
                  </div>

                  <div>
                    <span>ID DEL JUGADOR</span>

                    <strong>{playerId}</strong>
                  </div>

                  <div className="total">
                    <span>TOTAL</span>

                    <strong>
                      $
                      {selectedOffer.price.toFixed(2)}{" "}
                      USD
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

              <h2>¡Orden creada!</h2>

              <p>
                Tu solicitud de recarga fue recibida
                correctamente.
              </p>

              <div className="special-forces-success-card">
                {orderNumber && (
                  <div>
                    <span>NÚMERO DE ORDEN</span>

                    <strong>{orderNumber}</strong>
                  </div>
                )}

                {supplierOrderId && (
                  <div>
                    <span>ID DEL PROVEEDOR</span>

                    <strong>
                      {supplierOrderId}
                    </strong>
                  </div>
                )}

                <div>
                  <span>PRODUCTO</span>

                  <strong>
                    {selectedOffer?.name}
                  </strong>
                </div>

                <div>
                  <span>ID DEL JUGADOR</span>

                  <strong>{playerId}</strong>
                </div>

                <div>
                  <span>ESTADO</span>

                  <strong>{orderStatus}</strong>
                </div>

                <div>
                  <span>TOTAL</span>

                  <strong>
                    $
                    {selectedOffer?.price.toFixed(2)}{" "}
                    USD
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
          <h2>Servicio rápido y seguro</h2>

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
          <p>🛒 STORE GAMING 🎮</p>

          <span>Delta Force · Global</span>
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
          background: linear-gradient(
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
          border: 1px solid
            rgba(255, 255, 255, 0.08);
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
          border: 1px solid
            rgba(255, 170, 0, 0.16);
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

        .special-forces-empty {
          padding: 30px 20px;
          border-radius: 18px;
          text-align: center;
          color: #999;
          border: 1px dashed rgba(255, 255, 255, 0.12);
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
