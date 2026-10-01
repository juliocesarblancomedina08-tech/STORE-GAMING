"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import {
  SAUSAGE_MAN,
  SausageManOffer,
} from "../../../lib/games/sausage-man";

export default function SausageManPage() {
  const router = useRouter();

  const [showOffers, setShowOffers] = useState(true);
  const [selectedOffer, setSelectedOffer] =
    useState<SausageManOffer | null>(null);

  const [characterId, setCharacterId] = useState("");
  const [error, setError] = useState("");

  const [orderCreated, setOrderCreated] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [supplierOrderId, setSupplierOrderId] = useState("");
  const [orderStatus, setOrderStatus] = useState("");

  const [processing, setProcessing] = useState(false);

  function selectOffer(offer: SausageManOffer) {
    setSelectedOffer(offer);
    setCharacterId("");
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
    }, 100);
  }

  async function createOrder() {
    if (!selectedOffer) {
      setError("Seleccione una oferta.");
      return;
    }

    const cleanCharacterId = characterId.trim();

    if (!/^\d{4,20}$/.test(cleanCharacterId)) {
      setError(
        "Ingrese un ID de personaje válido de entre 4 y 20 dígitos."
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
        "/api/topups/sausage-man",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            offerId: selectedOffer.id,
            offerName: selectedOffer.name,
            characterId: cleanCharacterId,
            retailPrice: selectedOffer.price,
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
    <main className="sausage-man-page">
      <style jsx>{`
        .sausage-man-page {
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
          font-family: Arial, Helvetica, sans-serif;
        }

        .sausage-header {
          position: sticky;
          top: 0;
          z-index: 20;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 13px 16px;
          background: rgba(5, 5, 5, 0.95);
          border-bottom: 1px solid
            rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(12px);
        }

        .sausage-title {
          margin: 0;
          font-size: 20px;
          font-weight: 900;
          letter-spacing: 0.3px;
        }

        .sausage-back {
          border: 0;
          border-radius: 10px;
          padding: 9px 12px;
          color: #fff;
          background: rgba(255, 255, 255, 0.08);
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
        }

        .sausage-container {
          width: min(720px, 100%);
          margin: 0 auto;
          padding: 18px 14px 0;
        }

        .sausage-banner {
          position: relative;
          width: 100%;
          height: 210px;
          overflow: hidden;
          border-radius: 18px;
          background: #111;
          border: 1px solid
            rgba(255, 255, 255, 0.1);
          box-shadow:
            0 12px 35px
            rgba(0, 0, 0, 0.5);
        }

        .sausage-banner img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
        }

        .sausage-banner-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: flex-end;
          padding: 18px;
          background:
            linear-gradient(
              transparent 30%,
              rgba(0, 0, 0, 0.85)
            );
        }

        .sausage-banner-text span {
          display: block;
          color: #ff3030;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 1.5px;
        }

        .sausage-banner-text strong {
          display: block;
          margin-top: 3px;
          font-size: 22px;
          font-weight: 900;
        }

        .sausage-note {
          margin-top: 14px;
          padding: 14px;
          border-radius: 14px;
          background: rgba(0, 0, 0, 0.78);
          border: 1px solid
            rgba(255, 255, 255, 0.08);
          color: #ddd;
          font-size: 13px;
          line-height: 1.55;
        }

        .sausage-note strong {
          color: #fff;
        }

        .sausage-toggle {
          width: 100%;
          margin-top: 16px;
          padding: 15px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          border: 1px solid
            rgba(255, 255, 255, 0.1);
          border-radius: 14px;
          background: rgba(10, 10, 10, 0.9);
          color: #fff;
          font-size: 15px;
          font-weight: 900;
          cursor: pointer;
        }

        .sausage-arrow {
          color: #ff3030;
          font-size: 20px;
        }

        .sausage-offers {
          margin-top: 10px;
        }

        .sausage-heading {
          margin: 0 0 10px;
          padding: 0 3px;
          font-size: 17px;
          font-weight: 900;
        }

        .sausage-list {
          display: flex;
          flex-direction: column;
          gap: 9px;
        }

        .sausage-offer {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 13px;
          border: 1px solid
            rgba(255, 255, 255, 0.09);
          border-radius: 13px;
          background: rgba(5, 5, 5, 0.88);
          color: #fff;
          cursor: pointer;
          text-align: left;
          transition:
            transform 0.15s ease,
            border-color 0.15s ease,
            background 0.15s ease;
        }

        .sausage-offer:hover {
          transform: translateY(-1px);
          border-color: rgba(255, 48, 48, 0.65);
        }

        .sausage-offer.selected {
          border-color: #ff3030;
          background: rgba(90, 0, 0, 0.42);
          box-shadow:
            0 0 0 1px
            rgba(255, 48, 48, 0.2);
        }

        .sausage-offer-left {
          display: flex;
          align-items: center;
          gap: 11px;
          min-width: 0;
        }

        .sausage-icon {
          width: 40px;
          height: 40px;
          flex: 0 0 40px;
          display: grid;
          place-items: center;
          border-radius: 10px;
          background:
            linear-gradient(
              145deg,
              rgba(255, 48, 48, 0.25),
              rgba(255, 255, 255, 0.06)
            );
          border: 1px solid
            rgba(255, 48, 48, 0.18);
          font-size: 19px;
        }

        .sausage-offer-name {
          font-size: 14px;
          font-weight: 900;
          line-height: 1.3;
        }

        .sausage-offer-description {
          margin-top: 3px;
          color: #aaa;
          font-size: 11px;
        }

        .sausage-offer-price {
          flex-shrink: 0;
          color: #fff;
          font-size: 15px;
          font-weight: 900;
        }

        .sausage-order {
          margin-top: 16px;
          padding: 16px;
          border-radius: 15px;
          background: rgba(0, 0, 0, 0.82);
          border: 1px solid
            rgba(255, 255, 255, 0.1);
        }

        .sausage-section-title {
          margin: 0 0 12px;
          font-size: 17px;
          font-weight: 900;
        }

        .sausage-selected {
          margin-bottom: 14px;
          padding: 12px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid
            rgba(255, 255, 255, 0.08);
        }

        .sausage-selected-label {
          color: #999;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.6px;
        }

        .sausage-selected-row {
          margin-top: 5px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .sausage-selected-name {
          font-size: 14px;
          font-weight: 900;
        }

        .sausage-selected-price {
          color: #ff4b4b;
          font-weight: 900;
        }

        .sausage-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .sausage-label {
          color: #bbb;
          font-size: 12px;
          font-weight: 800;
        }

        .sausage-input {
          width: 100%;
          box-sizing: border-box;
          margin-top: 6px;
          padding: 13px 14px;
          border-radius: 11px;
          border: 1px solid
            rgba(255, 255, 255, 0.12);
          outline: none;
          background: rgba(255, 255, 255, 0.06);
          color: #fff;
          font-size: 15px;
        }

        .sausage-input:focus {
          border-color: #ff3030;
          box-shadow:
            0 0 0 2px
            rgba(255, 48, 48, 0.12);
        }

        .sausage-input::placeholder {
          color: #777;
        }

        .sausage-error {
          padding: 11px 12px;
          border-radius: 10px;
          border: 1px solid
            rgba(255, 50, 50, 0.35);
          background: rgba(110, 0, 0, 0.3);
          color: #ff6868;
          font-size: 13px;
          font-weight: 800;
        }

        .sausage-create {
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

        .sausage-create:hover {
          transform: translateY(-1px);
        }

        .sausage-create:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          transform: none;
        }

        .sausage-success {
          margin-top: 16px;
          padding: 18px 16px;
          border-radius: 15px;
          background: rgba(0, 45, 20, 0.82);
          border: 1px solid
            rgba(57, 255, 130, 0.25);
          text-align: center;
        }

        .sausage-success-icon {
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

        .sausage-success-title {
          margin: 0;
          font-size: 20px;
          font-weight: 900;
        }

        .sausage-success-text {
          margin: 8px 0 0;
          color: #c9e8d5;
          font-size: 13px;
          line-height: 1.5;
        }

        .sausage-order-number {
          margin-top: 10px;
          padding: 11px;
          border-radius: 10px;
          background: rgba(0, 0, 0, 0.35);
          font-weight: 900;
          word-break: break-word;
        }

        .sausage-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 9px;
          margin-top: 13px;
        }

        .sausage-action {
          padding: 12px 10px;
          border: 0;
          border-radius: 10px;
          color: #fff;
          background: rgba(255, 255, 255, 0.1);
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
        }

        .sausage-action:hover {
          background: rgba(255, 255, 255, 0.16);
        }

        .sausage-service {
          margin-top: 16px;
          padding: 15px;
          border-radius: 14px;
          background: rgba(0, 0, 0, 0.72);
          border: 1px solid
            rgba(255, 255, 255, 0.08);
        }

        .sausage-service-title {
          margin: 0 0 9px;
          font-size: 14px;
          font-weight: 900;
        }

        .sausage-service-list {
          margin: 0;
          padding-left: 18px;
          color: #bbb;
          font-size: 12px;
          line-height: 1.7;
        }

        .sausage-footer {
          padding: 24px 14px 0;
          text-align: center;
          color: #777;
          font-size: 11px;
        }

        .sausage-footer strong {
          color: #aaa;
        }

        @media (max-width: 480px) {
          .sausage-header {
            padding: 12px;
          }

          .sausage-title {
            font-size: 17px;
          }

          .sausage-container {
            padding: 12px 10px 0;
          }

          .sausage-banner {
            height: 175px;
            border-radius: 15px;
          }

          .sausage-banner-text strong {
            font-size: 18px;
          }

          .sausage-offer {
            padding: 11px;
          }

          .sausage-offer-name {
            font-size: 13px;
          }

          .sausage-offer-description {
            font-size: 10px;
          }

          .sausage-offer-price {
            font-size: 14px;
          }

          .sausage-actions {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <header className="sausage-header">
        <button
          type="button"
          className="sausage-back"
          onClick={() => router.push("/top-up")}
        >
          ← Volver
        </button>

        <h1 className="sausage-title">
          SAUSAGE MAN
        </h1>

        <button
          type="button"
          className="sausage-back"
          onClick={() => router.push("/orders")}
          aria-label="Pedidos"
        >
          🛒
        </button>
      </header>

      <div className="sausage-container">
        <section className="sausage-banner">
          <img
            src="/images/sausage-man.jpg"
            alt="Sausage Man"
          />

          <div className="sausage-banner-overlay">
            <div className="sausage-banner-text">
              <span>RECARGA</span>
              <strong>SAUSAGE MAN</strong>
            </div>
          </div>
        </section>

        <section className="sausage-note">
          <strong>
            📌 Información del servicio
          </strong>

          <br />

          Recarga de Sausage Man.

          <br />

          Introduce tu ID de personaje antes de
          realizar el pedido.

          <br />

          El producto seleccionado se entrega
          directamente a tu cuenta después de
          realizar el pedido.
        </section>

        <button
          type="button"
          className="sausage-toggle"
          onClick={() =>
            setShowOffers((value) => !value)
          }
        >
          <span>
            ✏️ PRESIONE PARA VER OFERTAS
          </span>

          <span className="sausage-arrow">
            {showOffers ? "⌃" : "⌄"}
          </span>
        </button>

        {showOffers && (
          <section className="sausage-offers">
            <h2 className="sausage-heading">
              SELECCIONA TU RECARGA
            </h2>

            <div className="sausage-list">
              {SAUSAGE_MAN.offers.map(
                (offer) => (
                  <button
                    type="button"
                    key={offer.id}
                    className={`sausage-offer ${
                      selectedOffer?.id === offer.id
                        ? "selected"
                        : ""
                    }`}
                    onClick={() =>
                      selectOffer(offer)
                    }
                  >
                    <div className="sausage-offer-left">
                      <div className="sausage-icon">
                        {offer.icon}
                      </div>

                      <div>
                        <div className="sausage-offer-name">
                          {offer.name}
                        </div>

                        <div className="sausage-offer-description">
                          Sausage Man
                        </div>
                      </div>
                    </div>

                    <div className="sausage-offer-price">
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

        {selectedOffer && !orderCreated && (
          <section
            id="order-section"
            className="sausage-order"
          >
            <h2 className="sausage-section-title">
              COMPLETA TU PEDIDO
            </h2>

            <div className="sausage-selected">
              <div className="sausage-selected-label">
                Oferta seleccionada
              </div>

              <div className="sausage-selected-row">
                <div className="sausage-selected-name">
                  {selectedOffer.name}
                </div>

                <div className="sausage-selected-price">
                  $
                  {Number(
                    selectedOffer.price
                  ).toFixed(2)}
                </div>
              </div>
            </div>

            <form
              className="sausage-form"
              onSubmit={handleSubmit}
            >
              <label className="sausage-label">
                ID DE PERSONAJE

                <input
  className="sausage-input"
  type="text"
  inputMode="numeric"
  value={characterId}
  onChange={(event) => {
    setCharacterId(
      event.target.value.replace(
        /\D/g,
        ""
      )
    );
    setError("");
  }}
  placeholder="Ingrese su ID de personaje"
  maxLength={20}
  autoComplete="off"
  disabled={processing}
/>

{error && (
  <div className="sausage-error">
    {error}
  </div>
)}

<button
  type="submit"
  className="sausage-create"
  disabled={processing}
>
  {processing
    ? "PROCESANDO PEDIDO..."
    : "CREAR PEDIDO"}
</button>
</form>
</section>
)}

{orderCreated && (
  <section
    id="success-section"
    className="sausage-success"
  >
    <div className="sausage-success-icon">
      ✓
    </div>

    <h2 className="sausage-success-title">
      ¡ORDEN CREADA!
    </h2>

    <p className="sausage-success-text">
      Tu pedido fue registrado correctamente.
      El proveedor procesará la recarga.
    </p>

    {orderNumber && (
      <div className="sausage-order-number">
        🧾 Orden: {orderNumber}
      </div>
    )}

    {supplierOrderId && (
      <div className="sausage-order-number">
        Proveedor: {supplierOrderId}
      </div>
    )}

    {orderStatus && (
      <div className="sausage-order-number">
        Estado: {orderStatus}
      </div>
    )}

    <div className="sausage-actions">
      <button
        type="button"
        className="sausage-action"
        onClick={() =>
          router.push("/orders")
        }
      >
        📋 Revisar orden
      </button>

      <button
        type="button"
        className="sausage-action"
        onClick={() =>
          router.push("/top-up")
        }
      >
        🛒 Volver a la tienda
      </button>
    </div>
  </section>
)}

<section className="sausage-service">
  <h3 className="sausage-service-title">
    ⚡ SERVICIO DE RECARGA
  </h3>

  <ul className="sausage-service-list">
    <li>
      Entrega directa a la cuenta.
    </li>

    <li>
      Necesitas introducir tu ID de
      personaje.
    </li>

    <li>
      El producto seleccionado se procesa
      directamente con el proveedor.
    </li>

    <li>
      Si tienes algún problema, contacta
      con soporte.
    </li>
  </ul>
</section>

<footer className="sausage-footer">
  <strong>🛒STORE GAMING🎮</strong>
  <br />
  Sausage Man
</footer>
</div>
</main>
);
        }
