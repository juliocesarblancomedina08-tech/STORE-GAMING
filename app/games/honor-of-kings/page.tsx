"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import {
  HONOR_OF_KINGS,
  HonorOfKingsOffer,
} from "../../../lib/games/honor-of-kings";

export default function HonorOfKingsPage() {
  const router = useRouter();

  const [showOffers, setShowOffers] = useState(false);
  const [selectedOffer, setSelectedOffer] =
    useState<HonorOfKingsOffer | null>(null);

  const [playerId, setPlayerId] = useState("");
  const [error, setError] = useState("");

  const [orderCreated, setOrderCreated] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [supplierOrderId, setSupplierOrderId] = useState("");
  const [orderStatus, setOrderStatus] = useState("");
  const [processing, setProcessing] = useState(false);

  function selectOffer(offer: HonorOfKingsOffer) {
    setSelectedOffer(offer);
    setPlayerId("");
    setError("");
    setOrderCreated(false);
    setOrderNumber("");
    setSupplierOrderId("");
    setOrderStatus("");

    setTimeout(() => {
      document
        .getElementById("order-section")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 50);
  }

  async function createOrder() {
    if (!selectedOffer) {
      setError("Seleccione una oferta.");
      return;
    }

    const cleanPlayerId = playerId.trim();

    if (!/^\d{4,20}$/.test(cleanPlayerId)) {
      setError(
        "Ingrese un Player ID válido de entre 4 y 20 dígitos."
      );
      return;
    }

    setProcessing(true);
    setError("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setError(
          "Su sesión ha expirado. Inicie sesión nuevamente."
        );
        return;
      }

      const idempotencyKey = crypto.randomUUID();

      const response = await fetch(
        "/api/topups/honor-of-kings",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            offerId: selectedOffer.id,
            offerName: selectedOffer.name,
            playerId: cleanPlayerId,
            retailPrice: selectedOffer.price,
            quantity: 1,
            idempotencyKey,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result?.error ||
            result?.message ||
            "No se pudo crear la orden."
        );
      }

      const order = result?.order || {};

      setOrderNumber(
        order?.order_number ||
          result?.orderNumber ||
          result?.id ||
          ""
      );

      setSupplierOrderId(
        order?.supplier_order_id ||
          result?.supplierOrderId ||
          order?.supplier_order_id ||
          ""
      );

      setOrderStatus(
        order?.status ||
          result?.status ||
          "SUPPLIER_PENDING"
      );

      setOrderCreated(true);

      setTimeout(() => {
        document
          .getElementById("success-section")
          ?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
      }, 100);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo crear la orden."
      );
    } finally {
      setProcessing(false);
    }
  }

  function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    void createOrder();
  }

  return (
    <main className="honor-of-kings-page">
      <style jsx>{`
        .honor-of-kings-page {
          min-height: 100vh;
          padding-bottom: 40px;
          color: #fff;

          background:
            linear-gradient(
              rgba(0, 0, 0, 0.72),
              rgba(0, 0, 0, 0.88)
            ),
            url("/images/battle-royale-bg.jpg")
              center / cover fixed;

          font-family:
            Arial,
            Helvetica,
            sans-serif;
        }

        .hok-header {
          position: sticky;
          top: 0;
          z-index: 20;

          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 12px;

          padding: 13px 16px;

          background: rgba(5, 5, 5, 0.95);

          border-bottom:
            1px solid rgba(255, 255, 255, 0.08);

          backdrop-filter: blur(12px);
        }

        .hok-title {
          margin: 0;

          font-size: 20px;
          font-weight: 900;
          letter-spacing: 0.3px;
        }

        .hok-back {
          border: 0;
          border-radius: 10px;

          padding: 9px 12px;

          color: #fff;
          background:
            rgba(255, 255, 255, 0.08);

          font-size: 13px;
          font-weight: 800;

          cursor: pointer;
        }

        .hok-container {
          width: min(720px, 100%);
          margin: 0 auto;
          padding: 18px 14px 0;
        }

        .hok-banner {
          width: 100%;
          height: 210px;

          overflow: hidden;

          border-radius: 18px;

          background: #111;

          border:
            1px solid rgba(255, 255, 255, 0.1);

          box-shadow:
            0 12px 35px rgba(0, 0, 0, 0.5);
        }

        .hok-banner img {
          width: 100%;
          height: 100%;

          display: block;

          object-fit: cover;
        }

        .hok-note {
          margin-top: 14px;
          padding: 14px;

          border-radius: 14px;

          background:
            rgba(0, 0, 0, 0.78);

          border:
            1px solid rgba(255, 255, 255, 0.08);

          color: #ddd;

          font-size: 13px;
          line-height: 1.55;
        }

        .hok-note strong {
          color: #fff;
        }

        .hok-offers-toggle {
          width: 100%;

          margin-top: 16px;
          padding: 15px 16px;

          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 12px;

          border:
            1px solid rgba(255, 255, 255, 0.1);

          border-radius: 14px;

          background:
            rgba(10, 10, 10, 0.9);

          color: #fff;

          font-size: 15px;
          font-weight: 900;

          cursor: pointer;
        }

        .hok-toggle-arrow {
          color: #ff3030;
          font-size: 20px;
        }

        .hok-offers {
          margin-top: 10px;
        }

        .hok-offers-list {
          display: flex;
          flex-direction: column;
          gap: 9px;
        }

        .hok-offer {
          width: 100%;

          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 12px;

          padding: 13px;

          border:
            1px solid rgba(255, 255, 255, 0.09);

          border-radius: 13px;

          background:
            rgba(5, 5, 5, 0.88);

          color: #fff;

          cursor: pointer;

          text-align: left;

          transition:
            transform 0.15s ease,
            border-color 0.15s ease,
            background 0.15s ease;
        }

        .hok-offer:hover {
          transform: translateY(-1px);

          border-color:
            rgba(255, 48, 48, 0.65);
        }

        .hok-offer.selected {
          border-color: #ff3030;

          background:
            rgba(90, 0, 0, 0.42);

          box-shadow:
            0 0 0 1px
            rgba(255, 48, 48, 0.2);
        }

        .hok-offer-left {
          display: flex;
          align-items: center;

          gap: 11px;

          min-width: 0;
        }

        .hok-icon {
          width: 38px;
          height: 38px;

          flex: 0 0 38px;

          display: grid;
          place-items: center;

          border-radius: 10px;

          background:
            rgba(255, 255, 255, 0.08);

          font-size: 19px;
        }

        .hok-offer-name {
          font-size: 14px;
          font-weight: 900;
          line-height: 1.3;
        }

        .hok-offer-price {
          flex-shrink: 0;

          font-size: 15px;
          font-weight: 900;
        }

        .hok-order {
          margin-top: 16px;
          padding: 16px;

          border-radius: 15px;

          background:
            rgba(0, 0, 0, 0.82);

          border:
            1px solid rgba(255, 255, 255, 0.1);
        }

        .hok-section-title {
          margin: 0 0 12px;

          font-size: 17px;
          font-weight: 900;
        }

        .hok-selected {
          margin-bottom: 14px;
          padding: 12px;

          border-radius: 12px;

          background:
            rgba(255, 255, 255, 0.06);

          border:
            1px solid rgba(255, 255, 255, 0.08);
        }

        .hok-selected-label {
          color: #999;

          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.6px;
        }

        .hok-selected-row {
          margin-top: 5px;

          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 12px;
        }

        .hok-selected-name {
          font-size: 14px;
          font-weight: 900;
        }

        .hok-selected-price {
          color: #ff4b4b;
          font-weight: 900;
        }

        .hok-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .hok-label {
          color: #bbb;

          font-size: 12px;
          font-weight: 800;
        }

        .hok-input {
          width: 100%;
          box-sizing: border-box;

          margin-top: 6px;
          padding: 13px 14px;

          border-radius: 11px;

          border:
            1px solid rgba(255, 255, 255, 0.12);

          outline: none;

          background:
            rgba(255, 255, 255, 0.06);

          color: #fff;

          font-size: 15px;
        }

        .hok-input:focus {
          border-color: #ff3030;

          box-shadow:
            0 0 0 2px
            rgba(255, 48, 48, 0.12);
        }

        .hok-input::placeholder {
          color: #777;
        }

        .hok-error {
          padding: 11px 12px;

          border-radius: 10px;

          border:
            1px solid rgba(255, 50, 50, 0.35);

          background:
            rgba(110, 0, 0, 0.3);

          color: #ff6868;

          font-size: 13px;
          font-weight: 800;
        }

        .hok-create {
          width: 100%;

          padding: 14px;

          border: 0;
          border-radius: 12px;

          background: #e52525;

          color: #fff;

          font-size: 15px;
          font-weight: 900;

          cursor: pointer;

          transition:
            transform 0.15s ease,
            opacity 0.15s ease;
        }

        .hok-create:hover {
          transform: translateY(-1px);
        }

        .hok-create:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          transform: none;
        }

        .hok-success {
          margin-top: 16px;
          padding: 18px 16px;

          border-radius: 15px;

          background:
            rgba(0, 45, 20, 0.82);

          border:
            1px solid rgba(57, 255, 130, 0.25);

          text-align: center;
        }

        .hok-success-icon {
          width: 54px;
          height: 54px;

          margin: 0 auto 10px;

          display: grid;
          place-items: center;

          border-radius: 50%;

          background: #18a957;

          color: #fff;

          font-size: 27px;
          font-weight: 900;
        }

        .hok-success-title {
          margin: 0;

          font-size: 20px;
          font-weight: 900;
        }

        .hok-success-text {
          margin: 8px 0 0;

          color: #c9e8d5;

          font-size: 13px;
          line-height: 1.5;
        }

        .hok-order-number {
          margin-top: 12px;
          padding: 11px;

          border-radius: 10px;

          background:
            rgba(0, 0, 0, 0.35);

          font-weight: 900;

          word-break: break-word;
        }

        .hok-actions {
          display: grid;

          grid-template-columns: 1fr 1fr;

          gap: 9px;

          margin-top: 13px;
        }

        .hok-action {
          padding: 12px 10px;

          border: 0;
          border-radius: 10px;

          color: #fff;

          background:
            rgba(255, 255, 255, 0.1);

          font-size: 13px;
          font-weight: 900;

          cursor: pointer;
        }

        .hok-service {
          margin-top: 16px;
          padding: 15px;

          border-radius: 14px;

          background:
            rgba(0, 0, 0, 0.72);

          border:
            1px solid rgba(255, 255, 255, 0.08);
        }

        .hok-service-title {
          margin: 0 0 9px;

          font-size: 14px;
          font-weight: 900;
        }

        .hok-service-list {
          margin: 0;
          padding-left: 18px;

          color: #bbb;

          font-size: 12px;
          line-height: 1.7;
        }

        .hok-footer {
          padding: 24px 14px 0;

          text-align: center;

          color: #777;

          font-size: 11px;
        }

        @media (max-width: 480px) {
          .hok-header {
            padding: 12px;
          }

          .hok-title {
            font-size: 17px;
          }

          .hok-container {
            padding: 12px 10px 0;
          }

          .hok-banner {
            height: 175px;
            border-radius: 15px;
          }

          .hok-offer {
            padding: 11px;
          }

          .hok-offer-name {
            font-size: 13px;
          }

          .hok-offer-price {
            font-size: 14px;
          }

          .hok-actions {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <header className="hok-header">
        <h1 className="hok-title">
          Honor of Kings
        </h1>

        <button
          type="button"
          className="hok-back"
          onClick={() => router.push("/")}
        >
          ← Tienda
        </button>
      </header>

      <div className="hok-container">
        <div className="hok-banner">
          <img
            src={HONOR_OF_KINGS.image}
            alt="Honor of Kings"
          />
        </div>

        <div className="hok-note">
          <strong>
            📌 Información del servicio
          </strong>

          <br />

          {HONOR_OF_KINGS.note}
        </div>

        <button
          type="button"
          className="hok-offers-toggle"
          onClick={() =>
            setShowOffers((value) => !value)
          }
        >
          <span>
            ✏️ Presione para ver ofertas
          </span>

          <span className="hok-toggle-arrow">
            {showOffers ? "▲" : "▼"}
          </span>
        </button>

        {showOffers && (
          <section className="hok-offers">
            <div className="hok-offers-list">
              {HONOR_OF_KINGS.offers.map(
                (offer) => (
                  <button
                    type="button"
                    key={offer.id}
                    className={`hok-offer ${
                      selectedOffer?.id === offer.id
                        ? "selected"
                        : ""
                    }`}
                    onClick={() =>
                      selectOffer(offer)
                    }
                  >
                    <div className="hok-offer-left">
                      <div className="hok-icon">
                        {offer.icon}
                      </div>

                      <div className="hok-offer-name">
                        {offer.name}
                      </div>
                    </div>

                    <div className="hok-offer-price">
                      $
                      {Number(
                        offer.price
                      ).toFixed(2)}
                    </div>
                  </button>
                )
              )}
            </div>
          </section>
        )}

        {selectedOffer && (
          <section
            id="order-section"
            className="hok-order"
          >
            <h2 className="hok-section-title">
              Crear pedido
            </h2>

            <div className="hok-selected">
              <div className="hok-selected-label">
                Oferta seleccionada
              </div>

              <div className="hok-selected-row">
                <div className="hok-selected-name">
                  {selectedOffer.name}
                </div>

                <div className="hok-selected-price">
                  $
                  {Number(
                    selectedOffer.price
                  ).toFixed(2)}
                </div>
              </div>
            </div>

            <form
              className="hok-form"
              onSubmit={handleSubmit}
            >
              <label className="hok-label">
                Player ID

                <input
                  className="hok-input"
                  type="text"
                  inputMode="numeric"
                  value={playerId}
                  onChange={(event) =>
                    setPlayerId(
                      event.target.value.replace(
                        /\D/g,
                        ""
                      )
                    )
                  }
                  placeholder="Ingrese su Player ID"
                  maxLength={20}
                  disabled={processing}
                />
              </label>

              {error && (
                <div className="hok-error">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="hok-create"
                disabled={processing}
              >
                {processing
                  ? "Procesando pedido..."
                  : "Crear pedido"}
              </button>
            </form>
          </section>
        )}

        {orderCreated && (
          <section
            id="success-section"
            className="hok-success"
          >
            <div className="hok-success-icon">
              ✓
            </div>

            <h2 className="hok-success-title">
              ¡Orden creada!
            </h2>

            <p className="hok-success-text">
              Tu pedido fue registrado
              correctamente.
              El proveedor procesará
              la recarga.
            </p>

            {orderNumber && (
              <div className="hok-order-number">
                🧾 Orden: {orderNumber}
              </div>
            )}

            {supplierOrderId && (
              <div className="hok-order-number">
                Proveedor: {supplierOrderId}
              </div>
            )}

            {orderStatus && (
              <div className="hok-order-number">
                Estado: {orderStatus}
              </div>
            )}

            <div className="hok-actions">
              <button
                type="button"
                className="hok-action"
                onClick={() =>
                  router.push("/orders")
                }
              >
                📋 Revisar orden
              </button>

              <button
  type="button"
  className="hok-action"
  onClick={() =>
    router.push("/")
  }
>
  🛒 Volver a la tienda
</button>
</div>
</section>
)}

<section className="hok-service">
  <h3 className="hok-service-title">
    ⚡ Servicio de recarga
  </h3>

  <ul className="hok-service-list">
    <li>
      Entrega directa a la cuenta.
    </li>

    <li>
      Necesitas introducir tu Player ID.
    </li>

    <li>
      Pedido procesado mediante FazerCards.
    </li>

    <li>
      Revisa tu ID antes de confirmar el pedido.
    </li>
  </ul>
</section>

<footer className="hok-footer">
  🛒STORE GAMING🎮
  <br />
  Honor of Kings
</footer>
</div>
</main>
);
}
