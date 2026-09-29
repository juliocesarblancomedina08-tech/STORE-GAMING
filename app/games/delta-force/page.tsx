"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type SupplierOffer = {
  offer_id: string;
  name: string;
  price_usd: string | number;
};

type DeltaOffer = {
  id: string;
  supplierOfferId: string;
  name: string;
  display: string;
  price: number;
  supplierPrice: number;
  icon: string;
};

const STORE_MARGIN = 0.2;

function getIcon(name: string) {
  const lower = name.toLowerCase();

  if (lower.includes("pass") || lower.includes("deluxe")) {
    return "🎟️";
  }

  return "🪙";
}

function getDisplay(name: string) {
  const lower = name.toLowerCase();

  if (lower.includes("season pass operations")) {
    return "PASE OPERACIONES 🎟️";
  }

  if (lower.includes("season pass warfare")) {
    return "PASE WARFARE 🎟️";
  }

  if (lower.includes("season pass delta force deluxe")) {
    return "DELUXE 🎟️";
  }

  const match = name.match(/^(\d+)\s+Delta/i);

  if (match) {
    return `${match[1]}🪙`;
  }

  return name;
}

export default function DeltaForcePage() {
  const router = useRouter();

  const [offers, setOffers] = useState<DeltaOffer[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(true);
  const [offersOpen, setOffersOpen] = useState(false);

  const [selectedOffer, setSelectedOffer] =
    useState<DeltaOffer | null>(null);

  const [playerId, setPlayerId] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  const [orderCreated, setOrderCreated] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadOffers() {
      try {
        setLoadingOffers(true);
        setError("");

        const response = await fetch(
          "/api/fazercards/topups?category_id=delta_force",
          {
            cache: "no-store",
          }
        );

        const data = await response.json();

        if (!response.ok || !data?.ok) {
          throw new Error(
            data?.error || "No se pudo cargar el catálogo."
          );
        }

        const supplierOffers: SupplierOffer[] = Array.isArray(
          data.offers
        )
          ? data.offers
          : [];

        const normalized: DeltaOffer[] = supplierOffers.map(
          (offer) => {
            const supplierPrice = Number(offer.price_usd);

            return {
              id: offer.offer_id,
              supplierOfferId: offer.offer_id,
              name: offer.name,
              display: getDisplay(offer.name),
              supplierPrice,
              price:
                Math.round(
                  (supplierPrice + STORE_MARGIN) * 10000
                ) / 10000,
              icon: getIcon(offer.name),
            };
          }
        );

        if (!cancelled) {
          setOffers(normalized);
        }
      } catch (err) {
        console.error(err);

        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "No se pudo cargar el catálogo."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingOffers(false);
        }
      }
    }

    loadOffers();

    return () => {
      cancelled = true;
    };
  }, []);

  function handleSelectOffer(offer: DeltaOffer) {
    if (!offer.supplierPrice || offer.supplierPrice <= 0) {
      setError(
        "Esta oferta todavía no tiene un precio disponible."
      );
      return;
    }

    setSelectedOffer(offer);
    setError("");
    setOrderCreated(false);
    setOrderNumber("");
  }

  async function createOrder() {
    if (!selectedOffer) {
      setError("Selecciona una oferta.");
      return;
    }

    const cleanPlayerId = playerId.trim();

    if (!cleanPlayerId) {
      setError("Introduce tu Player ID.");
      return;
    }

    if (!/^[0-9]+$/.test(cleanPlayerId)) {
      setError("El Player ID solo puede contener números.");
      return;
    }

    if (cleanPlayerId.length < 4) {
      setError("El Player ID debe tener al menos 4 números.");
      return;
    }

    if (cleanPlayerId.length > 32) {
      setError("El Player ID no puede superar 32 números.");
      return;
    }

    if (
      !selectedOffer.supplierPrice ||
      selectedOffer.supplierPrice <= 0
    ) {
      setError(
        "Esta oferta todavía no tiene un precio disponible."
      );
      return;
    }

    try {
      setProcessing(true);
      setError("");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        router.push("/login");
        return;
      }

      const response = await fetch(
        "/api/topups/delta-force",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            offerId: selectedOffer.supplierOfferId,
            offerName: selectedOffer.name,
            playerId: cleanPlayerId,
            retailPrice: selectedOffer.price,
            idempotencyKey: crypto.randomUUID(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            "No se pudo crear el pedido."
        );
      }

      const createdOrderNumber =
        data.orderNumber ||
        data.order_number ||
        data.order?.order_number ||
        data.order?.id ||
        "";

      setOrderNumber(String(createdOrderNumber));
      setOrderCreated(true);
      setSelectedOffer(null);
      setPlayerId("");

      try {
        localStorage.setItem(
          "last_delta_force_order",
          JSON.stringify({
            orderNumber: createdOrderNumber,
            offerId: selectedOffer.supplierOfferId,
            offerName: selectedOffer.name,
            playerId: cleanPlayerId,
            retailPrice: selectedOffer.price,
            createdAt: new Date().toISOString(),
          })
        );
      } catch {
        // No bloquear el pedido si localStorage no está disponible.
      }
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "No se pudo crear el pedido."
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
    <main className="delta-force-page">
      <header className="delta-force-header">
        <button
          type="button"
          className="delta-back-button"
          onClick={() => router.push("/top-up")}
        >
          ←
        </button>

        <h1>Delta Force</h1>

        <div className="delta-header-space" />
      </header>

      <section className="delta-force-content">
        <div className="delta-force-banner">
          <img
            src="/images/delta-force.jpg"
            alt="Delta Force"
          />
        </div>

        <div className="delta-force-note">
          <strong>🌎 Región Global</strong>

          <p>
            Recarga de Delta Force. La moneda se entrega
            directamente a tu cuenta después de realizar el pedido.
          </p>
        </div>

        <button
          type="button"
          className="delta-offers-toggle"
          onClick={() => {
            setOffersOpen((value) => !value);
            setError("");
          }}
        >
          <span>✏️ Presione para ver ofertas</span>

          <span className="delta-offers-arrow">
            {offersOpen ? "▲" : "▼"}
          </span>
        </button>

        {offersOpen && (
          <section className="delta-offers-section">
            {loadingOffers ? (
              <div className="delta-loading">
                Cargando ofertas...
              </div>
            ) : error && offers.length === 0 ? (
              <div className="delta-error">
                {error}
              </div>
            ) : offers.length === 0 ? (
              <div className="delta-error">
                No hay ofertas disponibles.
              </div>
            ) : (
              <div className="delta-offers-list">
                {offers.map((offer) => {
                  const unavailable =
                    !offer.supplierPrice ||
                    offer.supplierPrice <= 0;

                  const selected =
                    selectedOffer?.supplierOfferId ===
                    offer.supplierOfferId;

                  return (
                    <button
                      key={offer.supplierOfferId}
                      type="button"
                      className={`delta-offer ${
                        selected ? "selected" : ""
                      } ${
                        unavailable ? "unavailable" : ""
                      }`}
                      disabled={unavailable}
                      onClick={() =>
                        handleSelectOffer(offer)
                      }
                    >
                      <div className="delta-offer-left">
                        <span className="delta-offer-icon">
                          {offer.icon}
                        </span>

                        <div>
                          <strong>{offer.display}</strong>

                          <small>
                            {offer.name}
                          </small>
                        </div>
                      </div>

                      <div className="delta-offer-price">
                        {unavailable
                          ? "NO DISPONIBLE"
                          : `${offer.price.toFixed(4)}$`}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {selectedOffer && !orderCreated && (
          <section
            id="delta-order-form"
            className="delta-order-section"
          >
            <div className="delta-selected-offer">
              <span>
                {selectedOffer.icon}
              </span>

              <div>
                <strong>
                  {selectedOffer.name}
                </strong>

                <span>
                  {selectedOffer.price.toFixed(4)}$
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <label htmlFor="delta-player-id">
                ID del jugador
              </label>

              <input
                id="delta-player-id"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="Introduzca su Player ID"
                value={playerId}
                onChange={(event) =>
                  setPlayerId(event.target.value)
                }
                disabled={processing}
              />

              {error && (
                <div className="delta-form-error">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="delta-create-order-button"
                disabled={processing}
              >
                {processing
                  ? "FINALIZANDO ORDEN..."
                  : "FINALIZAR ORDEN"}
              </button>
            </form>
          </section>
        )}

        {orderCreated && (
          <section className="delta-success-section">
            <div className="delta-success-icon">
              ✓
            </div>

            <h2>Orden creada</h2>

            <p>
              Tu pedido de Delta Force fue creado
              correctamente.
            </p>

            {orderNumber && (
              <div className="delta-order-number">
                <span>Número de orden</span>
                <strong>{orderNumber}</strong>
              </div>
            )}

            <button
              type="button"
              className="delta-review-button"
              onClick={() => router.push("/orders")}
            >
              Revisar orden
            </button>

            <button
              type="button"
              className="delta-store-button"
              onClick={() => router.push("/top-up")}
            >
              Volver a la tienda
            </button>
          </section>
        )}
      </section>

      <footer className="delta-force-footer">
        🛒 STORE GAMING 🎮
      </footer>

      <style jsx>{`
        .delta-force-page {
          min-height: 100vh;
          color: #fff;
          background:
            linear-gradient(
              rgba(0, 0, 0, 0.72),
              rgba(0, 0, 0, 0.86)
            ),
            url("/images/battle-royale-bg.jpg")
              center / cover fixed;
          padding-bottom: 30px;
        }

        .delta-force-header {
          position: sticky;
          top: 0;
          z-index: 20;
          display: flex;
          align-items: center;
          justify-content: space-between;
          min-height: 58px;
          padding: 8px 12px;
          background: rgba(0, 0, 0, 0.88);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
        }

        .delta-force-header h1 {
          margin: 0;
          font-size: 19px;
          font-weight: 800;
          text-align: center;
        }

        .delta-back-button {
          width: 40px;
          height: 40px;
          border: 0;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.08);
          color: #fff;
          font-size: 25px;
          cursor: pointer;
        }

        .delta-header-space {
          width: 40px;
        }

        .delta-force-content {
          width: min(100%, 680px);
          margin: 0 auto;
          padding: 0 12px 30px;
        }

        .delta-force-banner {
          width: calc(100% + 24px);
          margin-left: -12px;
          overflow: hidden;
        }

        .delta-force-banner img {
          display: block;
          width: 100%;
          height: 210px;
          object-fit: cover;
        }

        .delta-force-note {
          margin-top: 14px;
          padding: 14px;
          border-radius: 14px;
          background: rgba(0, 0, 0, 0.68);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .delta-force-note strong {
          color: #fff;
          font-size: 15px;
        }

        .delta-force-note p {
          margin: 7px 0 0;
          color: #d8d8d8;
          font-size: 13px;
          line-height: 1.5;
        }

        .delta-offers-toggle {
          width: 100%;
          margin-top: 14px;
          padding: 15px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 13px;
          background: rgba(0, 0, 0, 0.78);
          color: #fff;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
        }

        .delta-offers-arrow {
          font-size: 12px;
        }

        .delta-offers-section {
          margin-top: 10px;
        }

        .delta-offers-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .delta-offer {
          width: 100%;
          min-height: 65px;
          padding: 10px 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 13px;
          background: rgba(0, 0, 0, 0.78);
          color: #fff;
          text-align: left;
          cursor: pointer;
          transition: 0.15s ease;
        }

        .delta-offer:active {
          transform: scale(0.98);
        }

        .delta-offer.selected {
          border-color: rgba(255, 50, 50, 0.8);
          background: rgba(120, 0, 0, 0.3);
        }

        .delta-offer.unavailable {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .delta-offer-left {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        .delta-offer-icon {
          width: 38px;
          height: 38px;
          flex: 0 0 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.08);
          font-size: 21px;
        }

        .delta-offer-left strong {
          display: block;
          font-size: 14px;
        }

        .delta-offer-left small {
          display: block;
          margin-top: 3px;
          color: #aaa;
          font-size: 11px;
        }

        .delta-offer-price {
          flex-shrink: 0;
          color: #fff;
          font-size: 14px;
          font-weight: 900;
        }

        .delta-loading,
        .delta-error {
          padding: 18px;
          border-radius: 13px;
          background: rgba(0, 0, 0, 0.78);
          text-align: center;
          font-size: 14px;
        }

        .delta-error {
          color: #ff8e8e;
          border: 1px solid rgba(255, 70, 70, 0.35);
        }

        .delta-order-section {
          margin-top: 16px;
          padding: 16px;
          border-radius: 15px;
          background: rgba(0, 0, 0, 0.82);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .delta-selected-offer {
          display: flex;
          align-items: center;
          gap: 11px;
          margin-bottom: 15px;
          padding: 12px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.06);
        }

        .delta-selected-offer > span {
          font-size: 25px;
        }

        .delta-selected-offer div {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .delta-selected-offer strong {
          font-size: 14px;
        }

        .delta-selected-offer div span {
          font-weight: 900;
          white-space: nowrap;
        }

        .delta-order-section form {
          display: flex;
          flex-direction: column;
        }

        .delta-order-section label {
          margin-bottom: 7px;
          font-size: 13px;
          font-weight: 800;
        }

        .delta-order-section input {
          width: 100%;
          box-sizing: border-box;
          padding: 13px;
          border: 1px solid rgba(255, 255, 255, 0.16);
          border-radius: 11px;
          outline: none;
          background: rgba(255, 255, 255, 0.07);
          color: #fff;
          font-size: 15px;
        }

        .delta-order-section input::placeholder {
          color: #888;
        }

        .delta-form-error {
          margin-top: 8px;
          padding: 9px;
          border-radius: 9px;
          background: rgba(150, 0, 0, 0.25);
          color: #ff9b9b;
          font-size: 12px;
        }

        .delta-create-order-button,
        .delta-review-button,
        .delta-store-button {
          width: 100%;
          margin-top: 12px;
          padding: 13px;
          border: 0;
          border-radius: 11px;
          font-weight: 900;
          cursor: pointer;
        }

                .delta-create-order-button {
          background: #d71920;
          color: #fff;
        }

        .delta-create-order-button:disabled {
          opacity: 0.6;
          cursor: wait;
        }

        .delta-success-section {
          margin-top: 18px;
          padding: 22px 16px;
          border-radius: 16px;
          background: rgba(0, 0, 0, 0.84);
          border: 1px solid rgba(50, 255, 100, 0.2);
          text-align: center;
        }

        .delta-success-icon {
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

        .delta-success-section h2 {
          margin: 0;
          font-size: 21px;
        }

        .delta-success-section p {
          margin: 8px 0;
          color: #cfcfcf;
          font-size: 13px;
        }

        .delta-order-number {
          margin-top: 13px;
          padding: 12px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.06);
        }

        .delta-order-number span {
          display: block;
          color: #999;
          font-size: 11px;
        }

        .delta-order-number strong {
          display: block;
          margin-top: 4px;
          font-size: 16px;
        }

        .delta-review-button {
          background: #19a957;
          color: #fff;
        }

        .delta-store-button {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
        }

        .delta-force-footer {
          padding: 25px 12px 5px;
          color: #888;
          font-size: 12px;
          text-align: center;
        }

        @media (max-width: 480px) {
          .delta-force-banner img {
            height: 185px;
          }

          .delta-selected-offer div {
            flex-direction: column;
            align-items: flex-start;
          }

          .delta-offer-price {
            font-size: 13px;
          }
        }
      `}</style>
    </main>
  );
}
