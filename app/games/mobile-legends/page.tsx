"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

const gameNote =
  "Región: Recarga de Mobile Legends en EE. UU. Ingresa tu ID de jugador y tu ID de servidor antes de realizar el pedido. Los diamantes se entregarán directamente a tu cuenta una vez realizado el pedido.";

const offers = [
  {
    id: "51_5_diamonds",
    name: "51 + 5 Diamantes",
    display: "51 + 5💎",
    price: 0.97,
    icon: "💎",
  },
  {
    id: "weekly_diamond_pass",
    name: "Pase Semanal de Diamantes",
    display: "PASE SEMANAL",
    price: 1.85,
    icon: "🎟️",
  },
  {
    id: "253_25_diamonds",
    name: "253 + 25 Diamantes",
    display: "253 + 25💎",
    price: 4.45,
    icon: "💎",
  },
  {
    id: "505_66_diamonds",
    name: "505 + 66 Diamantes",
    display: "505 + 66💎",
    price: 8.8,
    icon: "💎",
  },
  {
    id: "1010_182_diamonds",
    name: "1010 + 182 Diamantes",
    display: "1010 + 182💎",
    price: 17.45,
    icon: "💎",
  },
];

export default function MobileLegendsPage() {
  const router = useRouter();

  const [showOffers, setShowOffers] = useState(false);

  const [selectedOffer, setSelectedOffer] =
    useState<(typeof offers)[number] | null>(null);

  const [playerId, setPlayerId] = useState("");
  const [serverId, setServerId] = useState("");

  const [error, setError] = useState("");
  const [showConfirmation, setShowConfirmation] =
    useState(false);

  const [orderCreated, setOrderCreated] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [supplierOrderId, setSupplierOrderId] =
    useState("");
  const [orderStatus, setOrderStatus] = useState("");

  const [processing, setProcessing] = useState(false);

  function selectOffer(
    offer: (typeof offers)[number]
  ) {
    setSelectedOffer(offer);
    setPlayerId("");
    setServerId("");
    setError("");
    setShowConfirmation(false);
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

  function handleFinishPurchase(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    if (!selectedOffer) {
      setError("Seleccione una oferta.");
      return;
    }

    const cleanPlayerId = playerId.trim();
    const cleanServerId = serverId.trim();

    if (!cleanPlayerId) {
      setError("Ponga el ID de su cuenta.");
      return;
    }

    if (cleanPlayerId.length < 4) {
      setError(
        "El ID del jugador parece demasiado corto."
      );
      return;
    }

    if (!cleanServerId) {
      setError("Ponga el ID del servidor.");
      return;
    }

    if (cleanServerId.length < 2) {
      setError(
        "El ID del servidor parece demasiado corto."
      );
      return;
    }

    setPlayerId(cleanPlayerId);
    setServerId(cleanServerId);
    setShowConfirmation(true);

    setTimeout(() => {
      document
        .getElementById("confirmation-section")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 100);
  }

  async function createOrder() {
    if (!selectedOffer || processing) {
      return;
    }

    setError("");
    setProcessing(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setError(
          "Su sesión ha expirado. Inicie sesión nuevamente."
        );
        setProcessing(false);
        return;
      }

      const cleanPlayerId = playerId.trim();
      const cleanServerId = serverId.trim();

      if (!cleanPlayerId || !cleanServerId) {
        setError(
          "Debe introducir el ID del jugador y el ID del servidor."
        );
        setProcessing(false);
        return;
      }

      const idempotencyKey =
        crypto.randomUUID();

      const response = await fetch(
        "/api/topups/mobile-legends",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization:
              `Bearer ${session.access_token}`,
          },

          body: JSON.stringify({
            offerId: selectedOffer.id,
            playerId: cleanPlayerId,
            serverId: cleanServerId,
            idempotencyKey,
          }),
        }
      );

      const data = await response
        .json()
        .catch(() => null);

      if (!response.ok || !data?.ok) {
        setError(
          data?.error ||
            "No fue posible crear la orden. Intente nuevamente."
        );

        setProcessing(false);
        return;
      }

      setOrderNumber(
        data.orderNumber || ""
      );

      setSupplierOrderId(
        data.supplierOrderId || ""
      );

      setOrderStatus(
        data.status || ""
      );

      setShowConfirmation(false);
      setOrderCreated(true);
      setProcessing(false);

      setTimeout(() => {
        document
          .getElementById("success-section")
          ?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
      }, 100);
    } catch {
      setError(
        "No se pudo conectar con el servidor. Intente nuevamente."
      );

      setProcessing(false);
    }
  }

  function goToOrders() {
    router.push("/orders");
  }

  return (
    <main className="mobile-legends-page">

      <header className="mobile-legends-header">

        <button
          type="button"
          className="mobile-legends-back-button"
          onClick={() => router.push("/top-up")}
          aria-label="Volver"
        >
          ←
        </button>

        <div className="mobile-legends-header-title">
          <span>STORE GAMING</span>

          <strong>
            MOBILE LEGENDS
          </strong>
        </div>

        <button
          type="button"
          className="mobile-legends-orders-button"
          onClick={() => router.push("/orders")}
          aria-label="Pedidos"
        >
          ☰
        </button>

      </header>

      <section className="mobile-legends-banner">

        <img
          src="/images/mobile-legends.jpg"
          alt="Mobile Legends"
        />

        <div className="mobile-legends-banner-overlay" />

        <div className="mobile-legends-banner-text">

          <small>
            TOP UP
          </small>

          <h1>
            MOBILE
          </h1>

          <strong>
            LEGENDS
          </strong>

          <p>
            DIAMANTES · EE. UU.
          </p>

        </div>

      </section>

      <button
        type="button"
        className="mobile-legends-offers-toggle"
        onClick={() =>
          setShowOffers(
            (current) => !current
          )
        }
      >

        <span>
          {showOffers
            ? "OCULTAR OFERTAS"
            : "PRESIONE PARA VER OFERTAS"}
        </span>

        <b>
          ✎
        </b>

      </button>

      {showOffers && (
        <section className="mobile-legends-offers-section">

          <div className="mobile-legends-offers-heading">

            <span>
              OFERTAS DISPONIBLES
            </span>

            <small>
              MOBILE LEGENDS · ESTADOS UNIDOS
            </small>

          </div>

          <div className="mobile-legends-offers-list">

            {offers.map((offer) => {

              const selected =
                selectedOffer?.id ===
                offer.id;

              return (
                <button
                  key={offer.id}
                  type="button"
                  className={`mobile-legends-offer ${
                    selected
                      ? "selected"
                      : ""
                  }`}
                  onClick={() =>
                    selectOffer(offer)
                  }
                >

                  <div className="mobile-legends-offer-left">

                    <div className="mobile-legends-offer-icon">
                      {offer.icon}
                    </div>

                    <div>
                      <strong>
                        {offer.display}
                      </strong>

                      <span>
                        {offer.name}
                      </span>
                    </div>

                  </div>

                  <div className="mobile-legends-offer-right">

                    <strong>
                      {offer.price.toFixed(2)}$
                    </strong>

                    <span>
                      →
                    </span>

                  </div>

                </button>
              );
            })}

          </div>

        </section>
      )}

      <section className="mobile-legends-note">

        <div className="mobile-legends-note-icon">
          ⓘ
        </div>

        <div>
          <strong>
            INFORMACIÓN DEL SERVICIO
          </strong>

          <p>
            {gameNote}
          </p>
        </div>

      </section>

      {selectedOffer && !orderCreated && (
        <section
          id="order-section"
          className="mobile-legends-order-section"
        >

          <div className="mobile-legends-section-title">

            <span>
              01
            </span>

            <div>
              <small>
                TU SELECCIÓN
              </small>

              <h2>
                DATOS DEL PEDIDO
              </h2>
            </div>

          </div>

          <div className="mobile-legends-selected-offer">

            <div className="mobile-legends-selected-icon">
              {selectedOffer.icon}
            </div>

            <div className="mobile-legends-selected-info">

              <span>
                MOBILE LEGENDS
              </span>

              <strong>
                {selectedOffer.name}
              </strong>

            </div>

            <div className="mobile-legends-selected-price">
              {selectedOffer.price.toFixed(2)}$
            </div>

          </div>

          <div className="mobile-legends-warning">

            <div>
              ⚠
            </div>

            <section>

              <strong>
                ANTES DE CONTINUAR
              </strong>

              <p>
                Verifique cuidadosamente
                su ID de jugador y su ID de
                servidor antes de continuar.
                Los diamantes se enviarán
                directamente a la cuenta
                indicada.
              </p>

            </section>

          </div>

          <form
            onSubmit={handleFinishPurchase}
            className="mobile-legends-order-form"
          >

            <label>
              ID DE JUGADOR
            </label>

            <p>
              Introduzca el ID de la cuenta
              donde desea recibir los
              diamantes.
            </p>

            <div className="mobile-legends-input-wrapper">

              <span>
                🆔
              </span>

              <input
                id="mobile-legends-player-id"
                type="text"
                inputMode="numeric"
                value={playerId}
                onChange={(event) =>
                  setPlayerId(
                    event.target.value.replace(
                      /[^0-9]/g,
                      ""
                    )
                  )
                }
                placeholder="Introduzca su ID"
                autoComplete="off"
                maxLength={20}
              />

            </div>

            <label className="mobile-legends-server-label">
              ID DEL SERVIDOR
            </label>

            <p>
              Introduzca el ID del servidor
              asociado a su cuenta.
            </p>

            <div className="mobile-legends-input-wrapper">

              <span>
                🌐
              </span>

              <input
                id="mobile-legends-server-id"
                type="text"
                inputMode="numeric"
                value={serverId}
                onChange={(event) =>
                  setServerId(
                    event.target.value.replace(
                      /[^0-9]/g,
                      ""
                    )
                  )
                }
                placeholder="Introduzca el servidor"
                autoComplete="off"
                maxLength={10}
              />

            </div>

            {error && (
              <div className="mobile-legends-error">
                {error}
              </div>
            )}

            <div className="mobile-legends-total">

              <span>
                PRECIO
              </span>

              <strong>
                {selectedOffer.price.toFixed(2)}$
              </strong>

            </div>

            <button
              type="submit"
              className="mobile-legends-create-button"
              disabled={processing}
            >

              <span>
                CONTINUAR
              </span>

              <b>
                →
              </b>

            </button>

          </form>

        </section>
      )}

      {showConfirmation &&
        selectedOffer &&
        !orderCreated && (
          <section
            id="confirmation-section"
            className="mobile-legends-confirmation-section"
          >

            <div className="mobile-legends-section-title">

              <span>
                02
              </span>

              <div>

                <small>
                  CONFIRMAR
                </small>

                <h2>
                  REVISE SU ORDEN
                </h2>

              </div>

            </div>

            <div className="mobile-legends-confirmation-card">

              <h3>
                Usted va a realizar una
                compra de Mobile Legends
              </h3>

              <div className="mobile-legends-confirmation-row">

                <span>
                  PRODUCTO
                </span>

                <strong>
                  {selectedOffer.name}
                </strong>

              </div>

              <div className="mobile-legends-confirmation-row">

                <span>
                  PRECIO A GASTAR
                </span>

                <strong>
                  {selectedOffer.price.toFixed(2)}$
                </strong>

              </div>

              <div className="mobile-legends-confirmation-row">

                <span>
                  ID DEL JUGADOR
                </span>

                <strong>
                  {playerId}
                </strong>

              </div>

              <div className="mobile-legends-confirmation-row">

                <span>
                  ID DEL SERVIDOR
                </span>

                <strong>
                  {serverId}
                </strong>

              </div>

              <p className="mobile-legends-confirmation-warning">
                Revise cuidadosamente los
                datos antes de finalizar la
                compra.
              </p>

              <button
                type="button"
                className="mobile-legends-confirm-button"
                onClick={createOrder}
                disabled={processing}
              >
                {processing
                  ? "PROCESANDO..."
                  : "FINALIZAR"}
              </button>

            </div>

          </section>
        )}

      {orderCreated && (
        <section
          id="success-section"
          className="mobile-legends-success-section"
        >

          <div className="mobile-legends-success-icon">
            ✓
          </div>

          <h2>
            ORDEN CREADA
          </h2>

          <p>
            Su orden ha sido creada
            correctamente y está siendo
            procesada.
          </p>

          <div className="mobile-legends-order-number">

            <span>
              NÚMERO DE ORDEN
            </span>

            <strong>
              #{orderNumber}
            </strong>

          </div>

          {supplierOrderId && (
            <div className="mobile-legends-order-number">

              <span>
                REFERENCIA DEL PROVEEDOR
              </span>

              <strong>
                {supplierOrderId}
              </strong>

            </div>
          )}

          {orderStatus && (
            <div className="mobile-legends-order-number">

              <span>
                ESTADO
              </span>

              <strong>
                {orderStatus}
              </strong>

            </div>
          )}

          <button
            type="button"
            className="mobile-legends-review-button"
            onClick={goToOrders}
          >

            REVISAR ORDEN

            <span>
              →
            </span>

          </button>

          <button
            type="button"
            className="mobile-legends-store-button"
            onClick={() =>
              router.push("/top-up")
            }
          >
            VOLVER A LA TIENDA
          </button>

        </section>
      )}

      <section className="mobile-legends-service-info">

        <div>

          <span>
            01
          </span>

          <section>
            <strong>
              ENTREGA
            </strong>

            <small>
              DIRECTA A SU CUENTA
            </small>
          </section>

        </div>

        <div>

          <span>
            02
          </span>

          <section>
            <strong>
              REGIÓN
            </strong>

            <small>
              ESTADOS UNIDOS
            </small>
          </section>

        </div>

        <div>

          <span>
            03
          </span>

          <section>
            <strong>
              PROCESO
            </strong>

            <small>
              AUTOMÁTICO
            </small>
          </section>

        </div>

      </section>

      <footer className="mobile-legends-footer">

        <strong>
          🛒STORE GAMING🎮
        </strong>

        <span>
          MOBILE LEGENDS · DIAMANTES
        </span>

      </footer>

      <style jsx>{`

        .mobile-legends-page {
          min-height: 100vh;

          background:
            linear-gradient(
              180deg,
              rgba(0, 0, 0, 0.45),
              rgba(0, 0, 0, 0.94)
            ),
            url("/images/battle-royale-bg.jpg")
              center / cover fixed;

          color: #fff;

          padding-bottom: 35px;
        }

        .mobile-legends-header {
          position: sticky;
          top: 0;
          z-index: 20;

          height: 62px;
          padding: 0 13px;

          display: grid;
          grid-template-columns: 45px 1fr 45px;
          align-items: center;

          background: rgba(5, 5, 5, 0.94);

          border-bottom: 1px solid
            rgba(255, 255, 255, 0.08);

          backdrop-filter: blur(12px);
        }

        .mobile-legends-back-button,
        .mobile-legends-orders-button {
          width: 40px;
          height: 40px;

          display: flex;
          align-items: center;
          justify-content: center;

          border: 0;
          border-radius: 11px;

          background: rgba(255, 255, 255, 0.08);
          color: #fff;

          font-size: 23px;

          cursor: pointer;
        }

                .mobile-legends-orders-button {
          font-size: 21px;
        }

        .mobile-legends-header-title {
          display: flex;
          flex-direction: column;
          align-items: center;

          line-height: 1;
        }

        .mobile-legends-header-title span {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1.8px;
        }

        .mobile-legends-header-title strong {
          margin-top: 4px;

          color: #d71920;

          font-size: 16px;
          font-weight: 900;

          letter-spacing: 1.5px;
        }

        .mobile-legends-banner {
          position: relative;

          width: 100%;
          height: 245px;

          overflow: hidden;

          background: #080808;
        }

        .mobile-legends-banner img {
          width: 100%;
          height: 100%;

          display: block;

          object-fit: cover;
        }

        .mobile-legends-banner-overlay {
          position: absolute;
          inset: 0;

          background:
            linear-gradient(
              90deg,
              rgba(0, 0, 0, 0.9),
              rgba(0, 0, 0, 0.25),
              rgba(0, 0, 0, 0.7)
            ),
            linear-gradient(
              0deg,
              rgba(0, 0, 0, 0.9),
              transparent 55%
            );
        }

        .mobile-legends-banner-text {
          position: absolute;

          left: 20px;
          bottom: 21px;
        }

        .mobile-legends-banner-text small {
          color: #d71920;

          font-size: 11px;
          font-weight: 900;

          letter-spacing: 2px;
        }

        .mobile-legends-banner-text h1 {
          margin: 5px 0 0;

          font-size: 29px;
          line-height: 1;

          font-weight: 950;
          letter-spacing: 1px;
        }

        .mobile-legends-banner-text strong {
          display: block;

          margin-top: 3px;

          font-size: 21px;

          letter-spacing: 4px;
        }

        .mobile-legends-banner-text p {
          margin: 9px 0 0;

          color: #cfcfcf;

          font-size: 10px;
          font-weight: 700;

          letter-spacing: 1px;
        }

        .mobile-legends-offers-toggle {
          width: calc(100% - 24px);

          margin: 14px 12px 0;
          padding: 16px;

          display: flex;
          align-items: center;
          justify-content: space-between;

          border: 1px solid
            rgba(255, 255, 255, 0.12);

          border-radius: 13px;

          background: rgba(0, 0, 0, 0.78);

          color: #fff;

          cursor: pointer;
        }

        .mobile-legends-offers-toggle span {
          font-size: 12px;
          font-weight: 900;

          letter-spacing: 0.7px;
        }

        .mobile-legends-offers-toggle b {
          color: #d71920;

          font-size: 21px;
        }

        .mobile-legends-offers-section {
          margin: 12px;
          padding: 16px;

          border-radius: 15px;

          background: rgba(0, 0, 0, 0.78);

          border: 1px solid
            rgba(255, 255, 255, 0.08);
        }

        .mobile-legends-offers-heading {
          display: flex;
          flex-direction: column;

          gap: 4px;

          margin-bottom: 12px;
        }

        .mobile-legends-offers-heading span {
          font-size: 14px;
          font-weight: 900;
        }

        .mobile-legends-offers-heading small {
          color: #888;
          font-size: 10px;
        }

        .mobile-legends-offers-list {
          display: flex;
          flex-direction: column;

          gap: 9px;
        }

        .mobile-legends-offer {
          width: 100%;

          padding: 12px;

          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 10px;

          border: 1px solid
            rgba(255, 255, 255, 0.08);

          border-radius: 12px;

          background: rgba(255, 255, 255, 0.045);

          color: #fff;

          text-align: left;

          cursor: pointer;

          transition:
            transform 0.15s ease,
            border-color 0.15s ease,
            background 0.15s ease;
        }

        .mobile-legends-offer:active {
          transform: scale(0.985);
        }

        .mobile-legends-offer.selected {
          border-color: #d71920;

          background:
            rgba(215, 25, 32, 0.13);
        }

        .mobile-legends-offer-left {
          display: flex;
          align-items: center;

          min-width: 0;

          gap: 11px;
        }

        .mobile-legends-offer-icon {
          width: 43px;
          height: 43px;

          flex: 0 0 43px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 11px;

          background:
            rgba(255, 255, 255, 0.08);

          font-size: 21px;
        }

        .mobile-legends-offer-left > div:last-child {
          min-width: 0;
        }

        .mobile-legends-offer-left strong {
          display: block;

          overflow: hidden;

          text-overflow: ellipsis;
          white-space: nowrap;

          font-size: 14px;
        }

        .mobile-legends-offer-left span {
          display: block;

          margin-top: 3px;

          overflow: hidden;

          text-overflow: ellipsis;
          white-space: nowrap;

          color: #888;

          font-size: 10px;
        }

        .mobile-legends-offer-right {
          flex: 0 0 auto;

          display: flex;
          align-items: center;

          gap: 9px;
        }

        .mobile-legends-offer-right strong {
          font-size: 14px;
        }

        .mobile-legends-offer-right span {
          color: #d71920;

          font-size: 20px;
        }

        .mobile-legends-note {
          margin: 13px 12px 0;
          padding: 14px;

          display: flex;
          gap: 11px;

          border-radius: 13px;

          background: rgba(0, 0, 0, 0.76);

          border: 1px solid
            rgba(255, 255, 255, 0.08);
        }

        .mobile-legends-note-icon {
          flex: 0 0 30px;

          width: 30px;
          height: 30px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 50%;

          background:
            rgba(215, 25, 32, 0.16);

          color: #d71920;

          font-size: 17px;
          font-weight: 900;
        }

        .mobile-legends-note strong {
          display: block;

          font-size: 11px;

          letter-spacing: 0.6px;
        }

        .mobile-legends-note p {
          margin: 6px 0 0;

          color: #aaa;

          font-size: 11px;
          line-height: 1.55;
        }

        .mobile-legends-order-section {
          margin: 15px 12px 0;
          padding: 17px;

          border-radius: 16px;

          background: rgba(0, 0, 0, 0.82);

          border: 1px solid
            rgba(255, 255, 255, 0.09);
        }

        .mobile-legends-section-title {
          display: flex;
          align-items: center;

          gap: 11px;

          margin-bottom: 14px;
        }

        .mobile-legends-section-title > span {
          color: #d71920;

          font-size: 12px;
          font-weight: 900;
        }

        .mobile-legends-section-title small {
          display: block;

          color: #888;

          font-size: 9px;

          letter-spacing: 1px;
        }

        .mobile-legends-section-title h2 {
          margin: 3px 0 0;

          font-size: 18px;

          line-height: 1;
        }

        .mobile-legends-selected-offer {
          padding: 13px;

          display: flex;
          align-items: center;

          gap: 11px;

          border-radius: 12px;

          background:
            rgba(255, 255, 255, 0.055);

          border: 1px solid
            rgba(255, 255, 255, 0.08);
        }

        .mobile-legends-selected-icon {
          width: 43px;
          height: 43px;

          flex: 0 0 43px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 11px;

          background:
            rgba(215, 25, 32, 0.15);

          font-size: 21px;
        }

        .mobile-legends-selected-info {
          flex: 1;
          min-width: 0;
        }

        .mobile-legends-selected-info span {
          display: block;

          color: #888;

          font-size: 9px;

          letter-spacing: 0.7px;
        }

        .mobile-legends-selected-info strong {
          display: block;

          margin-top: 3px;

          font-size: 14px;
        }

        .mobile-legends-selected-price {
          flex: 0 0 auto;

          font-size: 15px;
          font-weight: 900;
        }

        .mobile-legends-warning {
          margin-top: 12px;
          padding: 13px;

          display: flex;

          gap: 10px;

          border-radius: 11px;

          background:
            rgba(215, 25, 32, 0.08);

          border: 1px solid
            rgba(215, 25, 32, 0.25);
        }

        .mobile-legends-warning > div {
          color: #d71920;

          font-size: 18px;
        }

        .mobile-legends-warning strong {
          font-size: 10px;
        }

        .mobile-legends-warning p {
          margin: 5px 0 0;

          color: #aaa;

          font-size: 10px;

          line-height: 1.5;
        }

        .mobile-legends-order-form {
          margin-top: 17px;
        }

        .mobile-legends-order-form > label {
          display: block;

          font-size: 12px;

          font-weight: 900;

          letter-spacing: 0.7px;
        }

        .mobile-legends-order-form > p {
          margin: 5px 0 10px;

          color: #888;

          font-size: 10px;

          line-height: 1.5;
        }

        .mobile-legends-server-label {
          margin-top: 16px;
        }

        .mobile-legends-input-wrapper {
          height: 50px;

          padding: 0 13px;

          display: flex;
          align-items: center;

          gap: 9px;

          border: 1px solid
            rgba(255, 255, 255, 0.11);

          border-radius: 11px;

          background:
            rgba(255, 255, 255, 0.055);
        }

        .mobile-legends-input-wrapper > span {
          font-size: 17px;
        }

        .mobile-legends-input-wrapper input {
          width: 100%;
          height: 100%;

          border: 0;
          outline: 0;

          background: transparent;

          color: #fff;

          font-size: 14px;
        }

        .mobile-legends-input-wrapper input::placeholder {
          color: #666;
        }

        .mobile-legends-error {
          margin-top: 9px;

          padding: 10px;

          border-radius: 9px;

          background:
            rgba(215, 25, 32, 0.12);

          border: 1px solid
            rgba(215, 25, 32, 0.3);

          color: #ff7777;

          font-size: 10px;

          line-height: 1.4;
        }

        .mobile-legends-total {
          margin-top: 13px;

          padding: 13px;

          display: flex;
          align-items: center;
          justify-content: space-between;

          border-radius: 10px;

          background:
            rgba(255, 255, 255, 0.055);
        }

        .mobile-legends-total span {
          color: #888;

          font-size: 10px;
          font-weight: 800;
        }

        .mobile-legends-total strong {
          font-size: 17px;
        }

        .mobile-legends-create-button {
          width: 100%;
          height: 51px;

          margin-top: 11px;

          padding: 0 15px;

          display: flex;
          align-items: center;
          justify-content: space-between;

          border: 0;
          border-radius: 11px;

          background: #d71920;

          color: #fff;

          font-size: 12px;
          font-weight: 900;

          letter-spacing: 0.6px;

          cursor: pointer;
        }

        .mobile-legends-create-button b {
          font-size: 21px;
        }

        .mobile-legends-create-button:disabled {
          opacity: 0.55;

          cursor: wait;
        }

        .mobile-legends-confirmation-section {
          margin: 15px 12px 0;

          padding: 17px;

          border-radius: 16px;

          background:
            rgba(0, 0, 0, 0.82);

          border: 1px solid
            rgba(255, 255, 255, 0.09);
        }

        .mobile-legends-confirmation-card {
          padding: 15px;

          border-radius: 13px;

          background:
            rgba(255, 255, 255, 0.045);

          border: 1px solid
            rgba(255, 255, 255, 0.08);
        }

        .mobile-legends-confirmation-card h3 {
          margin: 0 0 14px;

          font-size: 14px;

          line-height: 1.4;
        }

        .mobile-legends-confirmation-row {
          padding: 11px 0;

          display: flex;
          justify-content: space-between;

          gap: 12px;

          border-bottom: 1px solid
            rgba(255, 255, 255, 0.07);
        }

        .mobile-legends-confirmation-row span {
          color: #888;

          font-size: 9px;

          font-weight: 800;
        }

        .mobile-legends-confirmation-row strong {
          max-width: 60%;

          font-size: 11px;

          text-align: right;

          word-break: break-word;
        }

        .mobile-legends-confirmation-warning {
          margin: 13px 0;

          color: #aaa;

          font-size: 10px;

          line-height: 1.5;

          text-align: center;
        }

        .mobile-legends-confirm-button {
          width: 100%;
          height: 50px;

          border: 0;
          border-radius: 11px;

          background: #d71920;

          color: #fff;

          font-size: 12px;
          font-weight: 900;

          cursor: pointer;
        }

        .mobile-legends-confirm-button:disabled {
          opacity: 0.55;

          cursor: wait;
        }

        .mobile-legends-success-section {
          margin: 15px 12px 0;

          padding: 23px 16px;

          border-radius: 16px;

          background:
            rgba(0, 0, 0, 0.86);

          border: 1px solid
            rgba(50, 255, 100, 0.2);

          text-align: center;
        }

        .mobile-legends-success-icon {
          width: 58px;
          height: 58px;

          margin: 0 auto 10px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 50%;

          background: #19a957;

          color: #fff;

          font-size: 31px;
          font-weight: 900;
        }

        .mobile-legends-success-section h2 {
          margin: 0;

          font-size: 21px;
        }

        .mobile-legends-success-section > p {
          margin: 8px 0 13px;

          color: #aaa;

          font-size: 11px;

          line-height: 1.5;
        }

        .mobile-legends-order-number {
          margin-top: 9px;

          padding: 11px;

          border-radius: 10px;

          background:
            rgba(255, 255, 255, 0.055);

          text-align: left;
        }

        .mobile-legends-order-number span {
          display: block;

          color: #888;

          font-size: 9px;
        }

        .mobile-legends-order-number strong {
          display: block;

          margin-top: 4px;

          font-size: 14px;

          word-break: break-word;
        }

        .mobile-legends-review-button,
        .mobile-legends-store-button {
          width: 100%;
          height: 48px;

          margin-top: 11px;

          border: 0;
          border-radius: 10px;

          color: #fff;

          font-size: 11px;
          font-weight: 900;

          cursor: pointer;
        }

        .mobile-legends-review-button {
          display: flex;
          align-items: center;
          justify-content: space-between;

          padding: 0 15px;

          background: #19a957;
        }

        .mobile-legends-review-button span {
          font-size: 20px;
        }

        .mobile-legends-store-button {
          background:
            rgba(255, 255, 255, 0.1);
        }

        .mobile-legends-service-info {
          margin: 17px 12px 0;

          display: flex;
          flex-direction: column;

          border-radius: 14px;

          overflow: hidden;

          background:
            rgba(0, 0, 0, 0.76);

          border: 1px solid
            rgba(255, 255, 255, 0.08);
        }

        .mobile-legends-service-info > div {
          padding: 13px;

          display: flex;
          align-items: center;

          gap: 13px;

          border-bottom: 1px solid
            rgba(255, 255, 255, 0.06);
        }

        .mobile-legends-service-info > div:last-child {
          border-bottom: 0;
        }

        .mobile-legends-service-info > div > span {
          color: #d71920;

          font-size: 10px;

          font-weight: 900;
        }

        .mobile-legends-service-info section {
          display: flex;
          flex-direction: column;

          gap: 2px;
        }

        .mobile-legends-service-info strong {
          font-size: 10px;
        }

        .mobile-legends-service-info small {
          color: #777;

          font-size: 9px;
        }

        .mobile-legends-footer {
          padding: 25px 12px 5px;

          display: flex;
          flex-direction: column;
          align-items: center;

          gap: 5px;

          color: #777;

          text-align: center;
        }

        .mobile-legends-footer strong {
          color: #fff;

          font-size: 12px;
        }

        .mobile-legends-footer span {
          font-size: 9px;
        }

        @media (max-width: 480px) {

          .mobile-legends-banner {
            height: 205px;
          }

          .mobile-legends-banner-text h1 {
            font-size: 25px;
          }

          .mobile-legends-banner-text strong {
            font-size: 19px;
          }

          .mobile-legends-offer {
            padding: 11px;
          }

          .mobile-legends-selected-offer {
            align-items: flex-start;
          }

          .mobile-legends-selected-price {
            font-size: 14px;
          }

          .mobile-legends-confirmation-row {
            align-items: flex-start;
            flex-direction: column;
            gap: 4px;
          }

          .mobile-legends-confirmation-row strong {
            max-width: 100%;
            text-align: left;
          }

        }

      `}</style>

    </main>
  );
}
