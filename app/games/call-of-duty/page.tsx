"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import {
  CALL_OF_DUTY,
  type CallOfDutyOffer,
} from "../../../lib/games/call-of-duty";

const CATEGORY_ID = CALL_OF_DUTY.categoryId;
const gameNote = CALL_OF_DUTY.note;
const offers = CALL_OF_DUTY.offers;

export default function CallOfDutyPage() {
  const router = useRouter();

  const [showOffers, setShowOffers] = useState(false);
  const [selectedOffer, setSelectedOffer] =
    useState<CallOfDutyOffer | null>(null);

  const [userId, setUserId] = useState("");
  const [error, setError] = useState("");

  const [orderCreated, setOrderCreated] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [supplierOrderId, setSupplierOrderId] = useState("");
  const [orderStatus, setOrderStatus] = useState("");

  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/");
      }
    }

    checkSession();
  }, [router]);

  function selectOffer(offer: CallOfDutyOffer) {
    setSelectedOffer(offer);
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

  function handleUserIdChange(value: string) {
    const clean = value
      .replace(/\s+/g, "")
      .slice(0, 32);

    setUserId(clean);
    setError("");
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!selectedOffer) {
      setError(
        "Seleccione una oferta antes de continuar."
      );
      return;
    }

    const cleanUserId = userId.trim();

    if (!cleanUserId) {
      setError(
        "Introduzca su ID de usuario de Activision."
      );
      return;
    }

    if (cleanUserId.length < 4) {
      setError(
        "El ID de usuario debe tener al menos 4 caracteres."
      );
      return;
    }

    if (
      !/^[A-Za-z0-9_-]{4,32}$/.test(
        cleanUserId
      )
    ) {
      setError(
        "El ID de usuario de Activision no tiene un formato válido."
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
        router.replace("/");
        return;
      }

      const idempotencyKey =
        crypto.randomUUID();

      const response = await fetch(
        "/api/topups/call-of-duty",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Authorization:
              `Bearer ${session.access_token}`,
          },

          body: JSON.stringify({
            offerId: selectedOffer.id,
            userId: cleanUserId,
            idempotencyKey,
          }),
        }
      );

      const result = await response
        .json()
        .catch(() => null);

      if (!response.ok || !result?.ok) {
        throw new Error(
          result?.error ||
            result?.message ||
            "No fue posible crear la orden."
        );
      }

      setOrderNumber(
        result?.order?.order_number ||
          result?.order_number ||
          result?.orderId ||
          `COD-${Date.now()}`
      );

      setSupplierOrderId(
        result?.order?.supplier_order_id ||
          result?.supplierOrderId ||
          result?.supplier_order_id ||
          ""
      );

      setOrderStatus(
        result?.order?.status ||
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
    } catch (err: any) {
      setError(
        err?.message ||
          "Ocurrió un error al crear la orden. Inténtelo nuevamente."
      );
    } finally {
      setProcessing(false);
    }
  }

  return (
    <main className="call-of-duty-page">
      <header className="call-of-duty-header">
        <button
          type="button"
          className="call-of-duty-back-button"
          onClick={() => router.back()}
          aria-label="Volver"
        >
          ←
        </button>

        <div className="call-of-duty-header-title">
          <span>CALL OF DUTY</span>
          <strong>MOBILE</strong>
        </div>

        <button
          type="button"
          className="call-of-duty-orders-button"
          onClick={() => router.push("/orders")}
          aria-label="Pedidos"
        >
          ☰
        </button>
      </header>

      <section className="call-of-duty-banner">
        <img
          src="/images/call-of-duty-mobile.jpg"
          alt="Call of Duty Mobile"
        />

        <div className="call-of-duty-banner-overlay" />

        <div className="call-of-duty-banner-text">
          <small>TOP UP</small>

          <h1>CALL OF DUTY</h1>

          <strong>MOBILE</strong>

          <p>ACTIVISION · EE. UU.</p>
        </div>
      </section>

      <button
        type="button"
        className="call-of-duty-offers-toggle"
        onClick={() =>
          setShowOffers((value) => !value)
        }
      >
        <span>
          {showOffers
            ? "OCULTAR OFERTAS"
            : "PRESIONE PARA VER OFERTAS"}
        </span>

        <b>✎</b>
      </button>

      {showOffers && (
        <section className="call-of-duty-offers-section">
          <div className="call-of-duty-offers-heading">
            <span>OFERTAS DISPONIBLES</span>

            <small>
              CALL OF DUTY MOBILE · ACTIVISION EE. UU.
            </small>
          </div>

          <div className="call-of-duty-offers-list">
            {offers.map((offer) => (
              <button
                type="button"
                key={offer.id}
                className={`call-of-duty-offer ${
                  selectedOffer?.id === offer.id
                    ? "selected"
                    : ""
                }`}
                onClick={() =>
                  selectOffer(offer)
                }
              >
                <div className="call-of-duty-offer-left">
                  <div className="call-of-duty-offer-icon">
                    {offer.icon}
                  </div>

                  <div>
                    <strong>
                      {offer.displayName}
                    </strong>

                    <span>{offer.name}</span>
                  </div>
                </div>

                <div className="call-of-duty-offer-right">
                  <strong>
                    {offer.price.toFixed(2)}$
                  </strong>

                  <span>→</span>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="call-of-duty-note">
        <div className="call-of-duty-note-icon">
          ⓘ
        </div>

        <div>
          <strong>INFORMACIÓN DEL SERVICIO</strong>

          <p>{gameNote}</p>
        </div>
      </section>

      {selectedOffer && !orderCreated && (
        <section
          id="order-section"
          className="call-of-duty-order-section"
        >
          <div className="call-of-duty-section-title">
            <span>01</span>

            <div>
              <small>TU SELECCIÓN</small>
              <h2>DATOS DEL PEDIDO</h2>
            </div>
          </div>

          <div className="call-of-duty-selected-offer">
            <div className="call-of-duty-selected-icon">
              {selectedOffer.icon}
            </div>

            <div className="call-of-duty-selected-info">
              <span>CALL OF DUTY MOBILE</span>

              <strong>
                {selectedOffer.displayName}
              </strong>
            </div>

            <div className="call-of-duty-selected-price">
              {selectedOffer.price.toFixed(2)}$
            </div>
          </div>

          <div className="call-of-duty-warning">
            <div>⚠</div>

            <section>
              <strong>ANTES DE CONTINUAR</strong>

              <p>
                Verifique que su cuenta de
                Activision pertenece a la región
                de Estados Unidos. Esta oferta
                no corresponde a Call of Duty
                Mobile Garena.
              </p>
            </section>
          </div>

          <form
            className="call-of-duty-order-form"
            onSubmit={handleSubmit}
          >
            <label>ID DE USUARIO</label>

            <p>
              Introduzca el ID de usuario de
              Activision donde desea recibir
              los CP.
            </p>

            <div className="call-of-duty-input-wrapper">
              <span>🆔</span>

              <input
                type="text"
                value={userId}
                onChange={(event) =>
                  handleUserIdChange(
                    event.target.value
                  )
                }
                placeholder={
                  CALL_OF_DUTY.playerField
                    .placeholder
                }
                autoComplete="off"
                maxLength={32}
              />
            </div>

            {error && (
              <div className="call-of-duty-error">
                {error}
              </div>
            )}

            <div className="call-of-duty-total">
              <span>PRECIO</span>

              <strong>
                {selectedOffer.price.toFixed(2)}$
              </strong>
            </div>

            <button
              type="submit"
              className="call-of-duty-create-order-button"
              disabled={processing}
            >
              <span>
                {processing
                  ? "PROCESANDO COMPRA..."
                  : "FINALIZAR COMPRA"}
              </span>

              <b>→</b>
            </button>
          </form>
        </section>
      )}

      {orderCreated && (
        <section
          id="success-section"
          className="call-of-duty-success-section"
        >
          <div className="call-of-duty-success-icon">
            ✓
          </div>

          <h2>ORDEN CREADA</h2>

          <p>
            Su orden ha sido creada
            correctamente y está siendo
            procesada.
          </p>

          <div className="call-of-duty-order-number">
            <span>NÚMERO DE ORDEN</span>

            <strong>#{orderNumber}</strong>
          </div>

          {supplierOrderId && (
            <div className="call-of-duty-order-number">
              <span>
                REFERENCIA DEL PROVEEDOR
              </span>

              <strong>
                {supplierOrderId}
              </strong>
            </div>
          )}

          <div className="call-of-duty-order-number">
            <span>ESTADO</span>

            <strong>
              {orderStatus || "PENDIENTE"}
            </strong>
          </div>

          <button
            type="button"
            className="call-of-duty-review-button"
            onClick={() =>
              router.push("/orders")
            }
          >
            REVISAR ORDEN
            <span>→</span>
          </button>

          <button
            type="button"
            className="call-of-duty-store-button"
            onClick={() =>
              router.push("/top-up")
            }
          >
            VOLVER A LA TIENDA
          </button>
        </section>
      )}

      <section className="call-of-duty-service-info">
        <div>
          <span>01</span>

          <section>
            <strong>ENTREGA</strong>
            <small>DIRECTA A SU CUENTA</small>
          </section>
        </div>

        <div>
          <span>02</span>

          <section>
            <strong>REGIÓN</strong>
            <small>ACTIVISION · EE. UU.</small>
          </section>
        </div>

        <div>
          <span>03</span>

          <section>
            <strong>PROCESO</strong>
            <small>AUTOMÁTICO</small>
          </section>
        </div>
      </section>

      <footer className="call-of-duty-footer">
        <strong>🛒STORE GAMING🎮</strong>

        <span>
          CALL OF DUTY MOBILE · ACTIVISION
        </span>
      </footer>

      <style jsx>{`
        .call-of-duty-page {
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

        .call-of-duty-header {
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

        .call-of-duty-back-button,
        .call-of-duty-orders-button {
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

        .call-of-duty-orders-button {
          font-size: 21px;
        }

        .call-of-duty-header-title {
          display: flex;
          flex-direction: column;
          align-items: center;
          line-height: 1;
        }

        .call-of-duty-header-title span {
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 1.8px;
        }

        .call-of-duty-header-title strong {
          margin-top: 4px;

          color: #d71920;
          font-size: 17px;
          font-weight: 900;
          letter-spacing: 2px;
        }

        .call-of-duty-banner {
          position: relative;
          width: 100%;
          height: 245px;
          overflow: hidden;
          background: #080808;
        }

        .call-of-duty-banner img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
        }

        .call-of-duty-banner-overlay {
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
              rgba(0, 0, 0, 0.88),
              transparent 55%
            );
        }

        .call-of-duty-banner-text {
          position: absolute;
          left: 20px;
          bottom: 21px;
        }

        .call-of-duty-banner-text small {
          color: #d71920;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 2px;
        }

        .call-of-duty-banner-text h1 {
          margin: 5px 0 0;

          font-size: 28px;
          line-height: 1;
          font-weight: 950;
          letter-spacing: 1px;
        }

        .call-of-duty-banner-text strong {
          display: block;

          margin-top: 3px;

          color: #fff;
          font-size: 21px;
          letter-spacing: 5px;
        }

        .call-of-duty-banner-text p {
          margin: 9px 0 0;

          color: #cfcfcf;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 1px;
        }

        .call-of-duty-offers-toggle {
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

        .call-of-duty-offers-toggle span {
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.7px;
        }

        .call-of-duty-offers-toggle b {
          color: #d71920;
          font-size: 21px;
        }

        .call-of-duty-offers-section {
          margin: 12px;
          padding: 16px;

          border-radius: 15px;

          background: rgba(0, 0, 0, 0.78);
          border: 1px solid
            rgba(255, 255, 255, 0.08);
        }

        .call-of-duty-offers-heading {
          display: flex;
          flex-direction: column;
          gap: 4px;

          margin-bottom: 12px;
        }

        .call-of-duty-offers-heading span {
          font-size: 14px;
          font-weight: 900;
        }

        .call-of-duty-offers-heading small {
          color: #888;
          font-size: 10px;
        }

        .call-of-duty-offers-list {
          display: flex;
          flex-direction: column;
          gap: 9px;
        }

        .call-of-duty-offer {
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

        .call-of-duty-offer:active {
          transform: scale(0.985);
        }

        .call-of-duty-offer.selected {
          border-color: #d71920;
          background: rgba(215, 25, 32, 0.13);
        }

        .call-of-duty-offer-left {
          display: flex;
          align-items: center;
          min-width: 0;
          gap: 11px;
        }

        .call-of-duty-offer-icon {
          width: 43px;
          height: 43px;

          flex: 0 0 43px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 11px;

          background: rgba(255, 255, 255, 0.08);

          font-size: 21px;
        }

        .call-of-duty-offer-left > div:last-child {
          min-width: 0;
        }

        .call-of-duty-offer-left strong {
          display: block;

          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;

          font-size: 14px;
        }

        .call-of-duty-offer-left span {
          display: block;

          margin-top: 3px;

          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;

          color: #888;
          font-size: 10px;
        }

        .call-of-duty-offer-right {
          flex: 0 0 auto;

          display: flex;
          align-items: center;
          gap: 9px;
        }

        .call-of-duty-offer-right strong {
          color: #fff;
          font-size: 14px;
        }

        .call-of-duty-offer-right span {
          color: #d71920;
          font-size: 20px;
        }

        .call-of-duty-note {
          margin: 13px 12px 0;
          padding: 14px;

                    display: flex;
          gap: 11px;

          border-radius: 13px;

          background: rgba(0, 0, 0, 0.76);
          border: 1px solid
            rgba(255, 255, 255, 0.08);
        }

        .call-of-duty-note-icon {
          flex: 0 0 30px;

          width: 30px;
          height: 30px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 50%;

          background: rgba(215, 25, 32, 0.16);
          color: #d71920;

          font-size: 17px;
          font-weight: 900;
        }

        .call-of-duty-note strong {
          display: block;

          font-size: 11px;
          letter-spacing: 0.6px;
        }

        .call-of-duty-note p {
          margin: 6px 0 0;

          color: #aaa;
          font-size: 11px;
          line-height: 1.55;
        }

        .call-of-duty-order-section {
          margin: 15px 12px 0;
          padding: 17px;

          border-radius: 16px;

          background: rgba(0, 0, 0, 0.82);
          border: 1px solid
            rgba(255, 255, 255, 0.09);
        }

        .call-of-duty-section-title {
          display: flex;
          align-items: center;
          gap: 11px;
          margin-bottom: 14px;
        }

        .call-of-duty-section-title > span {
          color: #d71920;
          font-size: 12px;
          font-weight: 900;
        }

        .call-of-duty-section-title small {
          display: block;

          color: #888;
          font-size: 9px;
          letter-spacing: 1px;
        }

        .call-of-duty-section-title h2 {
          margin: 3px 0 0;

          font-size: 18px;
          line-height: 1;
        }

        .call-of-duty-selected-offer {
          padding: 13px;

          display: flex;
          align-items: center;
          gap: 11px;

          border-radius: 12px;

          background: rgba(255, 255, 255, 0.055);
          border: 1px solid
            rgba(255, 255, 255, 0.08);
        }

        .call-of-duty-selected-icon {
          width: 43px;
          height: 43px;

          flex: 0 0 43px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 11px;

          background: rgba(215, 25, 32, 0.15);

          font-size: 21px;
        }

        .call-of-duty-selected-info {
          flex: 1;
          min-width: 0;
        }

        .call-of-duty-selected-info span {
          display: block;

          color: #888;
          font-size: 9px;
          letter-spacing: 0.7px;
        }

        .call-of-duty-selected-info strong {
          display: block;

          margin-top: 3px;

          font-size: 14px;
        }

        .call-of-duty-selected-price {
          flex: 0 0 auto;

          color: #fff;
          font-size: 15px;
          font-weight: 900;
        }

        .call-of-duty-warning {
          margin-top: 12px;
          padding: 13px;

          display: flex;
          gap: 10px;

          border-radius: 11px;

          background: rgba(215, 25, 32, 0.08);
          border: 1px solid
            rgba(215, 25, 32, 0.25);
        }

        .call-of-duty-warning > div {
          color: #d71920;
          font-size: 18px;
        }

        .call-of-duty-warning strong {
          font-size: 10px;
        }

        .call-of-duty-warning p {
          margin: 5px 0 0;

          color: #aaa;
          font-size: 10px;
          line-height: 1.5;
        }

        .call-of-duty-order-form {
          margin-top: 17px;
        }

        .call-of-duty-order-form > label {
          display: block;

          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.7px;
        }

        .call-of-duty-order-form > p {
          margin: 5px 0 10px;

          color: #888;
          font-size: 10px;
          line-height: 1.5;
        }

        .call-of-duty-input-wrapper {
          height: 50px;
          padding: 0 13px;

          display: flex;
          align-items: center;
          gap: 9px;

          border: 1px solid
            rgba(255, 255, 255, 0.11);
          border-radius: 11px;

          background: rgba(255, 255, 255, 0.055);
        }

        .call-of-duty-input-wrapper > span {
          font-size: 17px;
        }

        .call-of-duty-input-wrapper input {
          width: 100%;
          height: 100%;

          border: 0;
          outline: 0;

          background: transparent;
          color: #fff;

          font-size: 14px;
        }

        .call-of-duty-input-wrapper input::placeholder {
          color: #666;
        }

        .call-of-duty-error {
          margin-top: 9px;
          padding: 10px;

          border-radius: 9px;

          background: rgba(215, 25, 32, 0.12);
          border: 1px solid
            rgba(215, 25, 32, 0.3);

          color: #ff7777;
          font-size: 10px;
          line-height: 1.4;
        }

        .call-of-duty-total {
          margin-top: 13px;
          padding: 13px;

          display: flex;
          align-items: center;
          justify-content: space-between;

          border-radius: 10px;

          background: rgba(255, 255, 255, 0.055);
        }

        .call-of-duty-total span {
          color: #888;
          font-size: 10px;
          font-weight: 800;
        }

        .call-of-duty-total strong {
          font-size: 17px;
        }

        .call-of-duty-create-order-button {
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

        .call-of-duty-create-order-button b {
          font-size: 21px;
        }

        .call-of-duty-create-order-button:disabled {
          opacity: 0.55;
          cursor: wait;
        }

        .call-of-duty-success-section {
          margin: 15px 12px 0;
          padding: 23px 16px;

          border-radius: 16px;

          background: rgba(0, 0, 0, 0.86);
          border: 1px solid
            rgba(50, 255, 100, 0.2);

          text-align: center;
        }

        .call-of-duty-success-icon {
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

        .call-of-duty-success-section h2 {
          margin: 0;

          font-size: 21px;
        }

        .call-of-duty-success-section > p {
          margin: 8px 0 13px;

          color: #aaa;
          font-size: 11px;
          line-height: 1.5;
        }

        .call-of-duty-order-number {
          margin-top: 9px;
          padding: 11px;

          border-radius: 10px;

          background: rgba(255, 255, 255, 0.055);
          text-align: left;
        }

        .call-of-duty-order-number span {
          display: block;

          color: #888;
          font-size: 9px;
        }

        .call-of-duty-order-number strong {
          display: block;

          margin-top: 4px;

          font-size: 14px;
          word-break: break-word;
        }

        .call-of-duty-review-button,
        .call-of-duty-store-button {
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

        .call-of-duty-review-button {
          display: flex;
          align-items: center;
          justify-content: space-between;

          padding: 0 15px;

          background: #19a957;
        }

        .call-of-duty-review-button span {
          font-size: 20px;
        }

        .call-of-duty-store-button {
          background: rgba(255, 255, 255, 0.1);
        }

        .call-of-duty-service-info {
          margin: 17px 12px 0;

          display: flex;
          flex-direction: column;

          border-radius: 14px;
          overflow: hidden;

          background: rgba(0, 0, 0, 0.76);
          border: 1px solid
            rgba(255, 255, 255, 0.08);
        }

        .call-of-duty-service-info > div {
          padding: 13px;

          display: flex;
          align-items: center;
          gap: 13px;

          border-bottom: 1px solid
            rgba(255, 255, 255, 0.06);
        }

        .call-of-duty-service-info > div:last-child {
          border-bottom: 0;
        }

        .call-of-duty-service-info > div > span {
          color: #d71920;

          font-size: 10px;
          font-weight: 900;
        }

        .call-of-duty-service-info section {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .call-of-duty-service-info strong {
          font-size: 10px;
        }

        .call-of-duty-service-info small {
          color: #777;
          font-size: 9px;
        }

        .call-of-duty-footer {
          padding: 25px 12px 5px;

          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 5px;

          color: #777;

          text-align: center;
        }

        .call-of-duty-footer strong {
          color: #fff;
          font-size: 12px;
        }

        .call-of-duty-footer span {
          font-size: 9px;
        }

        @media (max-width: 480px) {
          .call-of-duty-banner {
            height: 205px;
          }

          .call-of-duty-banner-text h1 {
            font-size: 25px;
          }

          .call-of-duty-banner-text strong {
            font-size: 19px;
          }

          .call-of-duty-offer {
            padding: 11px;
          }

          .call-of-duty-selected-offer {
            align-items: flex-start;
          }

          .call-of-duty-selected-price {
            font-size: 14px;
          }
        }
      `}</style>
    </main>
  );
}
