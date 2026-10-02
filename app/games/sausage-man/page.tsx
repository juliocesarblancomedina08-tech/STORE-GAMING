"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { SAUSAGE_MAN, SausageManOffer } from "../../../lib/games/sausage-man";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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

  useEffect(() => {
    if (orderCreated) {
      document
        .getElementById("success-section")
        ?.scrollIntoView({ behavior: "smooth" });
    }
  }, [orderCreated]);

  function handleSelectOffer(offer: SausageManOffer) {
    setSelectedOffer(offer);
    setError("");
    setOrderCreated(false);

    setTimeout(() => {
      document
        .getElementById("order-section")
        ?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  }

  async function createOrder() {
    if (!selectedOffer) {
      setError("Seleccione una oferta.");
      return;
    }

    const cleanCharacterId = characterId.trim();

    if (!/^\d{4,20}$/.test(cleanCharacterId)) {
      setError(
        "El ID de personaje debe contener entre 4 y 20 números."
      );
      return;
    }

    setProcessing(true);
    setError("");
    setOrderCreated(false);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setError("Debes iniciar sesión para realizar una compra.");
        return;
      }

      const idempotencyKey = crypto.randomUUID();

      const response = await fetch("/api/topups/sausage-man", {
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
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "No se pudo crear la orden."
        );
      }

      setOrderNumber(
        data.orderNumber ||
          data.order?.id ||
          data.id ||
          "Pendiente"
      );

      setSupplierOrderId(
        data.supplierOrderId ||
          data.order?.supplier_order_id ||
          ""
      );

      setOrderStatus(
        data.orderStatus ||
          data.order?.status ||
          "PENDING"
      );

      setOrderCreated(true);

      localStorage.setItem(
        "last_sausage_man_order",
        JSON.stringify({
          orderNumber:
            data.orderNumber ||
            data.order?.id ||
            data.id ||
            "",
          supplierOrderId:
            data.supplierOrderId ||
            data.order?.supplier_order_id ||
            "",
          status:
            data.orderStatus ||
            data.order?.status ||
            "PENDING",
        })
      );

      setSelectedOffer(null);
      setCharacterId("");
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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void createOrder();
  }

  return (
    <main className="sausage-man-page">
      <div className="sausage-man-overlay" />

      <header className="sausage-man-header">
        <button
          className="sausage-man-back"
          onClick={() => router.back()}
        >
          ← Volver
        </button>

        <div className="sausage-man-header-title">
          🛒 STORE GAMING 🎮
        </div>

        <button
          className="sausage-man-cart"
          onClick={() => router.push("/orders")}
        >
          🧾
        </button>
      </header>

      <section className="sausage-man-content">
        <div className="sausage-man-banner">
          <img
            src={SAUSAGE_MAN.image}
            alt="Sausage Man"
          />

          <div className="sausage-man-banner-overlay">
            <span>RECARGA</span>
            <h1>SAUSAGE MAN</h1>
          </div>
        </div>

        <div className="sausage-man-note">
          <strong>⚡ Recarga automática</strong>
          <p>
            Selecciona el paquete que deseas comprar e
            introduce tu ID de personaje.
          </p>
        </div>

        <section className="sausage-man-offers-section">
          <button
            className="sausage-man-offers-header"
            onClick={() => setShowOffers(!showOffers)}
          >
            <span>
              ✏️ Presione para ver ofertas
            </span>

            <span className="sausage-man-arrow">
              {showOffers ? "▲" : "▼"}
            </span>
          </button>

          {showOffers && (
            <div className="sausage-man-offers">
              {SAUSAGE_MAN.offers.map(
                (offer: SausageManOffer) => (
                  <button
                    key={offer.id}
                    className={`sausage-man-offer ${
                      selectedOffer?.id === offer.id
                        ? "selected"
                        : ""
                    }`}
                    onClick={() =>
                      handleSelectOffer(offer)
                    }
                  >
                    <div className="sausage-man-offer-left">
                      <div className="sausage-man-offer-icon">
                        {offer.icon || "🎁"}
                      </div>

                      <div>
                        <div className="sausage-man-offer-name">
                          {offer.name}
                        </div>

                        <div className="sausage-man-offer-description">
                          Recarga Sausage Man
                        </div>
                      </div>
                    </div>

                    <div className="sausage-man-offer-price">
                      ${Number(offer.price).toFixed(2)}
                    </div>
                  </button>
                )
              )}
            </div>
          )}
        </section>

        {selectedOffer && (
          <section
            id="order-section"
            className="sausage-man-order-section"
          >
            <div className="sausage-man-selected">
              <div className="sausage-man-selected-icon">
                {selectedOffer.icon || "🎁"}
              </div>

              <div className="sausage-man-selected-info">
                <span>Oferta seleccionada</span>
                <strong>{selectedOffer.name}</strong>
              </div>

              <div className="sausage-man-selected-price">
                ${Number(selectedOffer.price).toFixed(2)}
              </div>
            </div>

            <form
              className="sausage-man-form"
              onSubmit={handleSubmit}
            >
              <label htmlFor="characterId">
                ID de personaje
              </label>

              <input
                id="characterId"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="Introduzca su ID"
                value={characterId}
                onChange={(event) =>
                  setCharacterId(
                    event.target.value.replace(/\D/g, "")
                  )
                }
                maxLength={20}
              />

              <small>
                Introduce el ID de tu cuenta de Sausage Man.
              </small>

              {error && (
                <div className="sausage-man-error">
                  ❌ {error}
                </div>
              )}

              <button
                type="submit"
                className="sausage-man-buy-button"
                disabled={processing}
              >
                {processing
                  ? "PROCESANDO..."
                  : `COMPRAR • $${Number(
                      selectedOffer.price
                    ).toFixed(2)}`}
              </button>
            </form>
          </section>
        )}

        {orderCreated && (
          <section
            id="success-section"
            className="sausage-man-success"
          >
            <div className="sausage-man-success-icon">
              ✓
            </div>

            <h2>ORDEN CREADA</h2>

            <p>
              Tu pedido fue enviado correctamente.
            </p>

            <div className="sausage-man-order-info">
              <div>
                <span>Número de orden</span>
                <strong>{orderNumber}</strong>
              </div>

              {supplierOrderId && (
                <div>
                  <span>Orden del proveedor</span>
                  <strong>{supplierOrderId}</strong>
                </div>
              )}

              <div>
                <span>Estado</span>
                <strong>{orderStatus}</strong>
              </div>
            </div>

            <div className="sausage-man-success-buttons">
              <button
                onClick={() => router.push("/orders")}
              >
                REVISAR ORDEN
              </button>

              <button
                onClick={() => router.push("/top-up")}
              >
                VOLVER A LA TIENDA
              </button>
            </div>
          </section>
        )}

        <section className="sausage-man-service">
          <h2>🛒 SERVICIO SAUSAGE MAN</h2>

          <p>
            Selecciona una oferta, introduce correctamente
            tu ID de personaje y realiza tu pedido.
          </p>

          <div className="sausage-man-service-grid">
            <div>
              <span>⚡</span>
              <strong>Entrega automática</strong>
            </div>

            <div>
              <span>🔒</span>
              <strong>Compra segura</strong>
            </div>

            <div>
              <span>🎮</span>
              <strong>Recarga directa</strong>
            </div>
          </div>
        </section>
      </section>

      <footer className="sausage-man-footer">
        🛒 STORE GAMING 🎮
        <br />
        Recargas digitales para tus juegos favoritos.
      </footer>

      <style jsx>{`
        .sausage-man-page {
          min-height: 100vh;
          position: relative;
          overflow-x: hidden;
          color: #fff;
          background:
            linear-gradient(
              rgba(0, 0, 0, 0.78),
              rgba(0, 0, 0, 0.9)
            ),
            url("/images/battle-royale-bg.jpg")
              center / cover fixed;
          font-family: Arial, Helvetica, sans-serif;
        }

        .sausage-man-overlay {
          position: fixed;
          inset: 0;
          pointer-events: none;
          background:
            radial-gradient(
              circle at top,
              rgba(255, 0, 0, 0.12),
              transparent 45%
            );
          z-index: 0;
        }

        .sausage-man-header {
          position: sticky;
          top: 0;
          z-index: 20;
          height: 62px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 0 14px;
          background: rgba(8, 8, 8, 0.96);
          border-bottom: 1px solid rgba(255, 0, 0, 0.35);
          backdrop-filter: blur(10px);
        }

        .sausage-man-back,
        .sausage-man-cart {
          border: 0;
          color: #fff;
          background: transparent;
          font-size: 14px;
          cursor: pointer;
          min-width: 55px;
        }

        .sausage-man-cart {
          font-size: 21px;
        }

        .sausage-man-header-title {
          font-weight: 900;
          font-size: 15px;
          text-align: center;
          white-space: nowrap;
        }

        .sausage-man-content {
          position: relative;
          z-index: 2;
          width: min(720px, 100%);
          margin: 0 auto;
          padding-bottom: 35px;
        }

        .sausage-man-banner {
          position: relative;
          width: 100%;
          height: 245px;
          overflow: hidden;
        }

        .sausage-man-banner img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .sausage-man-banner::after {
          content: "";
          position: absolute;
          inset: 0;
          background:
            linear-gradient(
              to top,
              rgba(0, 0, 0, 0.95),
              rgba(0, 0, 0, 0.05)
            );
        }

        .sausage-man-banner-overlay {
          position: absolute;
          z-index: 2;
          left: 20px;
          bottom: 20px;
        }

        .sausage-man-banner-overlay span {
          font-size: 12px;
          font-weight: 800;
          color: #ff2a2a;
          letter-spacing: 2px;
        }

        .sausage-man-banner-overlay h1 {
          margin: 4px 0 0;
          font-size: 30px;
          font-weight: 1000;
          text-shadow: 0 3px 12px #000;
        }

        .sausage-man-note {
          margin: 15px;
          padding: 15px;
          border-radius: 13px;
          background: rgba(20, 20, 20, 0.92);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .sausage-man-note strong {
          color: #ff3030;
        }

        .sausage-man-note p {
          margin: 7px 0 0;
          color: #c9c9c9;
          font-size: 13px;
          line-height: 1.5;
        }

        .sausage-man-offers-section,
        .sausage-man-order-section,
        .sausage-man-success,
        .sausage-man-service {
          margin: 15px;
        }

        .sausage-man-offers-header {
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 17px;
          border: 1px solid rgba(255, 0, 0, 0.35);
          border-radius: 13px;
          background: rgba(18, 18, 18, 0.95);
          color: #fff;
          font-weight: 800;
          cursor: pointer;
        }

        .sausage-man-arrow {
          color: #ff2929;
        }

        .sausage-man-offers {
          margin-top: 8px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .sausage-man-offer {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 13px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          background: rgba(17, 17, 17, 0.95);
          color: #fff;
          cursor: pointer;
          text-align: left;
          transition: 0.2s;
        }

        .sausage-man-offer:hover,
        .sausage-man-offer.selected {
          border-color: #ff2525;
          background: rgba(40, 10, 10, 0.96);
          transform: translateY(-1px);
        }

        .sausage-man-offer-left {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }

        .sausage-man-offer-icon {
          width: 42px;
          height: 42px;
          flex: 0 0 42px;
          display: grid;
          place-items: center;
          border-radius: 10px;
          background: rgba(255, 0, 0, 0.12);
          font-size: 22px;
        }

        .sausage-man-offer-name {
          font-size: 14px;
          font-weight: 900;
        }

        .sausage-man-offer-description {
          margin-top: 3px;
          font-size: 11px;
          color: #999;
        }

        .sausage-man-offer-price {
          flex-shrink: 0;
          color: #fff;
          font-size: 15px;
          font-weight: 900;
        }

        .sausage-man-order-section {
          padding: 15px;
          border: 1px solid rgba(255, 0, 0, 0.3);
          border-radius: 15px;
          background: rgba(12, 12, 12, 0.97);
        }

        .sausage-man-selected {
          display: flex;
          align-items: center;
          gap: 12px;
          padding-bottom: 15px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .sausage-man-selected-icon {
          width: 48px;
          height: 48px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          background: rgba(255, 0, 0, 0.13);
          font-size: 24px;
        }

        .sausage-man-selected-info {
          flex: 1;
        }

        .sausage-man-selected-info span {
          display: block;
          color: #888;
          font-size: 11px;
        }

        .sausage-man-selected-info strong {
          display: block;
          margin-top: 4px;
          font-size: 14px;
        }

        .sausage-man-selected-price {
          font-size: 18px;
          font-weight: 1000;
        }

        .sausage-man-form {
          padding-top: 16px;
        }

        .sausage-man-form label {
          display: block;
          margin-bottom: 8px;
          font-size: 13px;
          font-weight: 800;
        }

        .sausage-man-form input {
          width: 100%;
          box-sizing: border-box;
          padding: 14px;
          border-radius: 10px;
          border: 1px solid #444;
          outline: none;
          background: #090909;
          color: #fff;
          font-size: 16px;
        }

        .sausage-man-form input:focus {
          border-color: #ff2525;
        }

        .sausage-man-form small {
          display: block;
          margin-top: 7px;
          color: #777;
          font-size: 11px;
        }

        .sausage-man-error {
          margin-top: 12px;
          padding: 11px;
          border-radius: 9px;
          background: rgba(255, 0, 0, 0.1);
          border: 1px solid rgba(255, 0, 0, 0.35);
          color: #ff5252;
          font-size: 12px;
        }

        .sausage-man-buy-button {
          width: 100%;
          margin-top: 15px;
          padding: 15px;
          border: 0;
          border-radius: 11px;
          background: #e50909;
          color: #fff;
          font-size: 14px;
          font-weight: 1000;
          cursor: pointer;
        }

        .sausage-man-buy-button:hover {
          background: #ff2020;
        }

        .sausage-man-buy-button:disabled {
          opacity: 0.6;
          cursor: wait;
        }

        .sausage-man-success {
          padding: 25px 18px;
          text-align: center;
          border: 1px solid rgba(0, 255, 100, 0.28);
          border-radius: 15px;
          background: rgba(8, 20, 12, 0.96);
        }

        .sausage-man-success-icon {
          width: 65px;
          height: 65px;
          margin: 0 auto 12px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: #20b85a;
          color: #fff;
          font-size: 36px;
          font-weight: 900;
        }

        .sausage-man-success h2 {
          margin: 0;
          font-size: 22px;
        }

                .sausage-man-success p {
          color: #aaa;
          font-size: 13px;
        }

        .sausage-man-order-info {
          margin-top: 18px;
          display: flex;
          flex-direction: column;
          gap: 9px;
        }

        .sausage-man-order-info div {
          padding: 12px;
          border-radius: 9px;
          background: rgba(255, 255, 255, 0.05);
        }

        .sausage-man-order-info span {
          display: block;
          color: #888;
          font-size: 11px;
        }

        .sausage-man-order-info strong {
          display: block;
          margin-top: 4px;
          font-size: 13px;
          word-break: break-word;
        }

        .sausage-man-success-buttons {
          display: flex;
          flex-direction: column;
          gap: 9px;
          margin-top: 18px;
        }

        .sausage-man-success-buttons button {
          width: 100%;
          padding: 13px;
          border: 0;
          border-radius: 10px;
          background: #e50909;
          color: #fff;
          font-weight: 900;
          cursor: pointer;
        }

        .sausage-man-success-buttons button:last-child {
          background: #222;
        }

        .sausage-man-service {
          padding: 18px;
          border-radius: 14px;
          background: rgba(15, 15, 15, 0.94);
          border: 1px solid rgba(255, 255, 255, 0.07);
        }

        .sausage-man-service h2 {
          margin: 0;
          font-size: 17px;
        }

        .sausage-man-service p {
          color: #999;
          font-size: 12px;
          line-height: 1.5;
        }

        .sausage-man-service-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-top: 14px;
        }

        .sausage-man-service-grid div {
          padding: 12px 7px;
          text-align: center;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.04);
        }

        .sausage-man-service-grid span {
          display: block;
          font-size: 20px;
        }

        .sausage-man-service-grid strong {
          display: block;
          margin-top: 5px;
          font-size: 9px;
        }

        .sausage-man-footer {
          position: relative;
          z-index: 2;
          padding: 25px 15px;
          text-align: center;
          color: #777;
          font-size: 11px;
          line-height: 1.6;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }

        @media (max-width: 480px) {
          .sausage-man-header-title {
            font-size: 13px;
          }

          .sausage-man-banner {
            height: 215px;
          }

          .sausage-man-banner-overlay h1 {
            font-size: 25px;
          }

          .sausage-man-service-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
