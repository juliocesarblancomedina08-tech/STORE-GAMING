"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import {
  BLOOD_STRIKE,
  type BloodStrikeOffer,
} from "../../../lib/games/blood-strike";

export default function BloodStrikePage() {
  const router = useRouter();

  const [showOffers, setShowOffers] =
    useState(false);

  const [selectedOffer, setSelectedOffer] =
    useState<BloodStrikeOffer | null>(null);

  const [playerId, setPlayerId] =
    useState("");

  const [error, setError] =
    useState("");

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

  function selectOffer(
    offer: BloodStrikeOffer
  ) {
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
    }, 100);
  }

  async function createOrder() {
    if (
      !selectedOffer ||
      processing
    ) {
      return;
    }

    setError("");
    setProcessing(true);

    try {
      /*
       * ============================================================
       * 1. COMPROBAR SESIÓN
       * ============================================================
       */

      const {
        data: { session },
        error: sessionError,
      } =
        await supabase.auth.getSession();

      if (
        sessionError ||
        !session?.user
      ) {
        setError(
          "Su sesión ha expirado. Inicie sesión nuevamente."
        );

        router.replace("/");
        return;
      }

      /*
       * ============================================================
       * 2. LIMPIAR PLAYER ID
       * ============================================================
       */

      const cleanPlayerId =
        playerId
          .trim()
          .replace(/\s+/g, "");

      if (!cleanPlayerId) {
        setError(
          "Ponga el ID de su cuenta."
        );
        return;
      }

      if (
        !/^[A-Za-z0-9_-]+$/.test(
          cleanPlayerId
        )
      ) {
        setError(
          "El ID solamente puede contener letras, números, guion o guion bajo."
        );
        return;
      }

      if (
        cleanPlayerId.length < 4 ||
        cleanPlayerId.length > 32
      ) {
        setError(
          "El ID parece no tener un formato válido."
        );
        return;
      }

      /*
       * ============================================================
       * 3. IDEMPOTENCIA
       * ============================================================
       */

      const idempotencyKey =
        crypto.randomUUID();

      /*
       * ============================================================
       * 4. ENVIAR PEDIDO
       * ============================================================
       */

      const response =
        await fetch(
          "/api/topups/blood-strike",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${session.access_token}`,
            },

            body: JSON.stringify({
              offerId:
                selectedOffer.id,

              playerId:
                cleanPlayerId,

              idempotencyKey,
            }),
          }
        );

      const result =
        await response.json();

      /*
       * ============================================================
       * 5. ERROR
       * ============================================================
       */

      if (
        !response.ok ||
        !result.ok
      ) {
        setError(
          result.error ||
            "No se pudo crear la orden."
        );

        return;
      }

      /*
       * ============================================================
       * 6. GUARDAR INFORMACIÓN
       * ============================================================
       */

      setOrderNumber(
        result.order?.order_number ||
          result.orderNumber ||
          result.order?.id ||
          result.id ||
          ""
      );

      setSupplierOrderId(
        result.order?.supplier_order_id ||
          result.supplierOrderId ||
          ""
      );

      setOrderStatus(
        result.order?.status ||
          result.status ||
          "SUPPLIER_PENDING"
      );

      /*
       * ============================================================
       * 7. MOSTRAR ORDEN CREADA
       * ============================================================
       */

      setOrderCreated(true);

      setTimeout(() => {
        document
          .getElementById(
            "success-section"
          )
          ?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
      }, 100);
    } catch (err) {
      console.error(
        "ERROR CREANDO TOPUP BLOOD STRIKE:",
        err
      );

      setError(
        "No se pudo conectar con el servidor. Si la compra fue enviada, no vuelva a intentarla hasta revisar el estado de la orden."
      );
    } finally {
      setProcessing(false);
    }
  }

  function handleFinishPurchase(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (processing) {
      return;
    }

    if (!selectedOffer) {
      setError(
        "Seleccione una oferta."
      );
      return;
    }

    const cleanId =
      playerId
        .trim()
        .replace(/\s+/g, "");

    if (!cleanId) {
      setError(
        "Ponga el ID de su cuenta."
      );
      return;
    }

    if (
      !/^[A-Za-z0-9_-]+$/.test(
        cleanId
      )
    ) {
      setError(
        "El ID solamente puede contener letras, números, guion o guion bajo."
      );
      return;
    }

    if (
      cleanId.length < 4 ||
      cleanId.length > 32
    ) {
      setError(
        "El ID parece no tener un formato válido."
      );
      return;
    }

    createOrder();
  }

  function goToOrders() {
    router.push("/orders");
  }

  return (
    <main className="blood-strike-page">
      {/* ============================================================
          HEADER
      ============================================================ */}

      <header className="blood-strike-header">
        <button
          type="button"
          className="blood-strike-back-button"
          onClick={() =>
            router.push("/top-up")
          }
        >
          ←
        </button>

        <div className="blood-strike-header-title">
          <span>
            Blood Strike
          </span>

          <small>
            Top Up
          </small>
        </div>

        <button
          type="button"
          className="blood-strike-orders-button"
          onClick={goToOrders}
          aria-label="Ver pedidos"
        >
          📋
        </button>
      </header>

      {/* ============================================================
          BANNER
      ============================================================ */}

      <section className="blood-strike-banner">
        <img
          src={BLOOD_STRIKE.image}
          alt="Blood Strike"
        />

        <div className="blood-strike-banner-overlay">
          <div className="blood-strike-banner-text">
            <strong>
              BLOOD STRIKE
            </strong>

            <span>
              BC, pases y ofertas
            </span>
          </div>
        </div>
      </section>

      <section className="blood-strike-content">
        {/* ==========================================================
            NOTA
        ========================================================== */}

        <div className="blood-strike-note">
          <span>ℹ️</span>

          <p>
            {BLOOD_STRIKE.note}
          </p>
        </div>

        {/* ==========================================================
            MOSTRAR OFERTAS
        ========================================================== */}

        <button
          type="button"
          className="blood-strike-offers-toggle"
          onClick={() =>
            setShowOffers(
              (current) => !current
            )
          }
        >
          <span>
            {showOffers
              ? "Ocultar ofertas"
              : "Presione para ver ofertas"}
          </span>

          <span className="blood-strike-offers-arrow">
            {showOffers
              ? "▲"
              : "▼"}
          </span>
        </button>

        {/* ==========================================================
            OFERTAS
        ========================================================== */}

        {showOffers && (
          <section className="blood-strike-offers-section">
            <div className="blood-strike-offers-list">
              {BLOOD_STRIKE.offers.map(
                (offer) => {
                  const selected =
                    selectedOffer?.id ===
                    offer.id;

                  const offerName =
                    offer.displayName
                      .toLowerCase();

                  const icon =
                    offerName.includes(
                      "pass"
                    ) ||
                    offerName.includes(
                      "chest"
                    ) ||
                    offerName.includes(
                      "bag"
                    )
                      ? "🎟️"
                      : "🪙";

                  return (
                    <button
                      key={offer.id}
                      type="button"
                      className={`blood-strike-offer ${
                        selected
                          ? "selected"
                          : ""
                      }`}
                      onClick={() =>
                        selectOffer(
                          offer
                        )
                      }
                    >
                      <div className="blood-strike-offer-left">
                        <div className="blood-strike-offer-icon">
                          {icon}
                        </div>

                        <div>
                          <strong>
                            {
                              offer.displayName
                            }
                          </strong>

                          <span>
                            {offer.name}
                          </span>
                        </div>
                      </div>

                      <div className="blood-strike-offer-price">
                        $
                        {offer.price.toFixed(
                          2
                        )}
                      </div>
                    </button>
                  );
                }
              )}
            </div>
          </section>
        )}

        {/* ==========================================================
            PEDIDO
        ========================================================== */}

        {selectedOffer &&
          !orderCreated && (
            <section
              id="order-section"
              className="blood-strike-order-section"
            >
              <div className="blood-strike-selected-offer">
                <span>
                  Oferta seleccionada
                </span>

                <strong>
                  {
                    selectedOffer.displayName
                  }
                </strong>

                <b>
                  $
                  {selectedOffer.price.toFixed(
                    2
                  )}
                </b>
              </div>

              <div className="blood-strike-order-note">
                <span>ℹ️</span>

                <p>
                  {BLOOD_STRIKE.note}
                </p>
              </div>

              <form
                className="blood-strike-order-form"
                onSubmit={
                  handleFinishPurchase
                }
              >
                <label>
                  ID DEL JUGADOR
                </label>

                <p className="blood-strike-input-description">
                  Introduzca el Player ID
                  de la cuenta donde desea
                  recibir la compra.
                </p>

                <div className="blood-strike-input-wrapper">
                  <span>
                    🆔
                  </span>

                  <input
                    type="text"
                    value={playerId}
                    onChange={(
                      event
                    ) =>
                      setPlayerId(
                        event.target.value.replace(
                          /[^A-Za-z0-9_-]/g,
                          ""
                        )
                      )
                    }
                    placeholder="Introduzca su Player ID"
                    autoComplete="off"
                    maxLength={32}
                    disabled={
                      processing
                    }
                  />
                </div>

                {error && (
                  <div className="blood-strike-error">
                    ⚠️ {error}
                  </div>
                )}

                <div className="blood-strike-total">
                  <span>
                    PRECIO
                  </span>

                  <strong>
                    $
                    {selectedOffer.price.toFixed(
                      2
                    )}
                  </strong>
                </div>

                <button
                  type="submit"
                  className="blood-strike-create-order-button"
                  disabled={
                    processing
                  }
                >
                  {processing
                    ? "PROCESANDO COMPRA..."
                    : "FINALIZAR COMPRA"}
                </button>
              </form>
            </section>
          )}

        {/* ==========================================================
            ORDEN CREADA
        ========================================================== */}

        {orderCreated && (
          <section
            id="success-section"
            className="blood-strike-success-section"
          >
            <div className="blood-strike-success-icon">
              ✓
            </div>

            <h2>
              Orden creada
            </h2>

            <p>
              Su orden ha sido creada
              correctamente y está siendo
              procesada.
            </p>

            <div className="blood-strike-order-number">
              <span>
                Número de orden
              </span>

              <strong>
                #{orderNumber}
              </strong>
            </div>

            {supplierOrderId && (
              <div className="blood-strike-order-number">
                <span>
                  ID de orden del proveedor
                </span>

                <strong>
                  #{supplierOrderId}
                </strong>
              </div>
            )}

            {orderStatus && (
              <div className="blood-strike-order-number">
                <span>
                  Estado
                </span>

                <strong>
                  {orderStatus}
                </strong>
              </div>
            )}

            <button
              type="button"
              className="blood-strike-review-button"
              onClick={
                goToOrders
              }
            >
              REVISAR ORDEN
            </button>

            <button
              type="button"
              className="blood-strike-store-button"
              onClick={() =>
                router.push(
                  "/top-up"
                )
              }
            >
              VOLVER A LA TIENDA
            </button>
          </section>
        )}

        {/* ==========================================================
            INFORMACIÓN
        ========================================================== */}

        <section className="blood-strike-service-info">
          <h3>
            Información del servicio
          </h3>

          <p>
            Introduzca correctamente
            su Player ID antes de
            realizar la compra.
          </p>

          <p>
            Compruebe los datos antes de
            confirmar el pedido.
          </p>

          <p>
            La orden queda registrada
            para poder revisar su estado.
          </p>
        </section>
      </section>

      {/* ============================================================
          FOOTER
      ============================================================ */}

      <footer className="blood-strike-footer">
        🛒STORE GAMING🎮
      </footer>

      <style jsx>{`
        .blood-strike-page {
          min-height: 100vh;

          background:
            linear-gradient(
              rgba(0, 0, 0, 0.78),
              rgba(0, 0, 0, 0.9)
            ),
            url("/images/battle-royale-bg.jpg")
              center / cover fixed;

          color: #fff;

          padding-bottom: 30px;
        }

        .blood-strike-header {
          position: sticky;
          top: 0;
          z-index: 20;

          height: 64px;

          display: grid;

          grid-template-columns:
            48px
            1fr
            48px;

          align-items: center;

          padding: 0 10px;

          background:
            rgba(0, 0, 0, 0.92);

          border-bottom:
            1px solid
            rgba(255, 255, 255, 0.08);

          backdrop-filter: blur(12px);
        }

        .blood-strike-back-button,
        .blood-strike-orders-button {
          width: 42px;
          height: 42px;

          border: 0;

          border-radius: 12px;

          background:
            rgba(
              255,
              255,
              255,
              0.08
            );

          color: #fff;

          font-size: 21px;

          display: flex;
          align-items: center;
          justify-content: center;

          cursor: pointer;
        }

        .blood-strike-header-title {
          display: flex;

          flex-direction: column;

          align-items: center;
          justify-content: center;

          text-align: center;
        }

        .blood-strike-header-title span {
          font-size: 17px;

          font-weight: 900;
        }

        .blood-strike-header-title small {
          margin-top: 2px;

          color: #aaa;

          font-size: 10px;

          text-transform: uppercase;

          letter-spacing: 1px;
        }

        .blood-strike-banner {
          position: relative;

          width: 100%;

          overflow: hidden;
        }

        .blood-strike-banner img {
          display: block;

          width: 100%;

          height: 230px;

          object-fit: cover;
        }

        .blood-strike-banner-overlay {
          position: absolute;

          inset: 0;

          display: flex;

          align-items: flex-end;

          padding: 20px;

          background:
            linear-gradient(
              transparent 30%,
              rgba(0, 0, 0, 0.88)
            );
        }

                .blood-strike-banner-text {
          display: flex;
          flex-direction: column;
        }

        .blood-strike-banner-text strong {
          font-size: 25px;
          font-weight: 1000;
          letter-spacing: 1px;
        }

        .blood-strike-banner-text span {
          margin-top: 3px;
          font-size: 13px;
          font-weight: 700;
          opacity: 0.95;
        }

        .blood-strike-content {
          position: relative;
          z-index: 2;
          width: 100%;
          max-width: 650px;
          margin: 0 auto;
          padding: 18px 14px 30px;
        }

        .blood-strike-note {
          margin: 0 0 16px;
          padding: 12px 14px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #fff;
          text-align: center;
          font-size: 13px;
          font-weight: 700;
          line-height: 1.45;
        }

        .blood-strike-offers-toggle {
          width: 100%;
          min-height: 52px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 16px;
          border: 1px solid rgba(255, 255, 255, 0.16);
          border-radius: 14px;
          background: rgba(15, 15, 15, 0.92);
          color: #fff;
          font-size: 16px;
          font-weight: 900;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }

        .blood-strike-offers-arrow {
          font-size: 18px;
          transition: transform 0.2s ease;
        }

        .blood-strike-offers-toggle.open
          .blood-strike-offers-arrow {
          transform: rotate(180deg);
        }

        .blood-strike-offers-section {
          margin-top: 12px;
        }

        .blood-strike-offers-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .blood-strike-offer {
          width: 100%;
          min-height: 66px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 12px;
          border: 1px solid rgba(255, 255, 255, 0.13);
          border-radius: 14px;
          background: rgba(12, 12, 12, 0.94);
          color: #fff;
          cursor: pointer;
          transition:
            transform 0.15s ease,
            border-color 0.15s ease,
            background 0.15s ease;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }

        .blood-strike-offer:active {
          transform: scale(0.98);
        }

        .blood-strike-offer:hover {
          border-color: rgba(255, 255, 255, 0.3);
          background: rgba(25, 25, 25, 0.96);
        }

        .blood-strike-offer-left {
          display: flex;
          align-items: center;
          gap: 11px;
          min-width: 0;
        }

        .blood-strike-offer-icon {
          width: 42px;
          height: 42px;
          flex: 0 0 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 11px;
          background: rgba(255, 255, 255, 0.08);
          font-size: 21px;
        }

        .blood-strike-offer-name {
          color: #fff;
          font-size: 14px;
          font-weight: 850;
          line-height: 1.25;
        }

        .blood-strike-offer-description {
          margin-top: 3px;
          color: rgba(255, 255, 255, 0.62);
          font-size: 11px;
          font-weight: 600;
        }

        .blood-strike-offer-price {
          flex-shrink: 0;
          color: #fff;
          font-size: 16px;
          font-weight: 950;
          white-space: nowrap;
        }

        .blood-strike-order-section {
          margin-top: 18px;
        }

        .blood-strike-selected-offer {
          padding: 14px;
          border-radius: 15px;
          background: rgba(12, 12, 12, 0.94);
          border: 1px solid rgba(255, 255, 255, 0.14);
        }

        .blood-strike-selected-title {
          color: rgba(255, 255, 255, 0.62);
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.7px;
        }

        .blood-strike-selected-name {
          margin-top: 5px;
          color: #fff;
          font-size: 17px;
          font-weight: 950;
        }

        .blood-strike-order-note {
          margin-top: 14px;
          padding: 11px 12px;
          border-radius: 11px;
          background: rgba(255, 255, 255, 0.06);
          color: rgba(255, 255, 255, 0.78);
          font-size: 12px;
          font-weight: 650;
          line-height: 1.45;
        }

        .blood-strike-order-form {
          margin-top: 14px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .blood-strike-input-description {
          color: rgba(255, 255, 255, 0.78);
          font-size: 13px;
          font-weight: 750;
        }

        .blood-strike-input-wrapper {
          width: 100%;
        }

        .blood-strike-input {
          width: 100%;
          height: 50px;
          padding: 0 14px;
          border: 1px solid rgba(255, 255, 255, 0.16);
          border-radius: 12px;
          outline: none;
          background: rgba(0, 0, 0, 0.72);
          color: #fff;
          font-size: 16px;
          font-weight: 700;
          box-sizing: border-box;
        }

        .blood-strike-input:focus {
          border-color: rgba(255, 255, 255, 0.42);
        }

        .blood-strike-input::placeholder {
          color: rgba(255, 255, 255, 0.4);
        }

        .blood-strike-error {
          padding: 11px 12px;
          border-radius: 11px;
          background: rgba(120, 0, 0, 0.35);
          border: 1px solid rgba(255, 70, 70, 0.35);
          color: #ffb2b2;
          font-size: 12px;
          font-weight: 700;
          line-height: 1.4;
        }

        .blood-strike-total {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 0 2px;
          color: #fff;
          font-size: 15px;
          font-weight: 850;
        }

        .blood-strike-total strong {
          font-size: 18px;
          font-weight: 950;
        }

        .blood-strike-create-order-button {
          width: 100%;
          min-height: 52px;
          border: 0;
          border-radius: 13px;
          background: #fff;
          color: #080808;
          font-size: 15px;
          font-weight: 950;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
          transition:
            transform 0.15s ease,
            opacity 0.15s ease;
        }

        .blood-strike-create-order-button:active {
          transform: scale(0.98);
        }

        .blood-strike-create-order-button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .blood-strike-success-section {
          margin-top: 18px;
          padding: 20px 14px;
          border-radius: 16px;
          background: rgba(10, 10, 10, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.14);
          text-align: center;
        }

        .blood-strike-success-icon {
          width: 58px;
          height: 58px;
          margin: 0 auto 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #20c56a;
          color: #fff;
          font-size: 28px;
          font-weight: 1000;
        }

        .blood-strike-success-title {
          color: #fff;
          font-size: 20px;
          font-weight: 950;
        }

        .blood-strike-success-text {
          margin-top: 7px;
          color: rgba(255, 255, 255, 0.68);
          font-size: 12px;
          line-height: 1.45;
        }

        .blood-strike-order-number {
          margin-top: 13px;
          color: #fff;
          font-size: 14px;
          font-weight: 900;
        }

        .blood-strike-review-button,
        .blood-strike-store-button {
          width: 100%;
          min-height: 49px;
          margin-top: 10px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 900;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }

        .blood-strike-review-button {
          border: 0;
          background: #fff;
          color: #080808;
        }

        .blood-strike-store-button {
          border: 1px solid rgba(255, 255, 255, 0.18);
          background: rgba(255, 255, 255, 0.06);
          color: #fff;
        }

        .blood-strike-service-info {
          margin-top: 20px;
          padding: 14px;
          border-radius: 14px;
          background: rgba(10, 10, 10, 0.86);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .blood-strike-service-info-title {
          color: #fff;
          font-size: 14px;
          font-weight: 900;
        }

        .blood-strike-service-info-text {
          margin-top: 7px;
          color: rgba(255, 255, 255, 0.65);
          font-size: 12px;
          line-height: 1.5;
        }

        .blood-strike-footer {
          position: relative;
          z-index: 2;
          padding: 18px 12px 25px;
          text-align: center;
          color: rgba(255, 255, 255, 0.58);
          font-size: 12px;
          font-weight: 800;
        }

        @media (max-width: 420px) {
          .blood-strike-banner-text strong {
            font-size: 22px;
          }

          .blood-strike-content {
            padding-left: 11px;
            padding-right: 11px;
          }

          .blood-strike-offer {
            padding: 9px 10px;
          }

          .blood-strike-offer-price {
            font-size: 15px;
          }
        }
      `}</style>
    </main>
  );
}
