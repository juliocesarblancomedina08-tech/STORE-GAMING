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

type SausageOffer = {
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

  if (
    lower.includes("pass") ||
    lower.includes("membership") ||
    lower.includes("member")
  ) {
    return "🎟️";
  }

  return "🪙";
}

function getDisplay(name: string) {
  const match = name.match(/^(\d+)/);

  if (match) {
    return `${match[1]} 🪙`;
  }

  return name;
}

export default function SausageManPage() {
  const router = useRouter();

  const [offers, setOffers] = useState<SausageOffer[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(true);
  const [offersOpen, setOffersOpen] = useState(false);

  const [selectedOffer, setSelectedOffer] =
    useState<SausageOffer | null>(null);

  const [characterId, setCharacterId] = useState("");
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
          "/api/fazercards/topups?category_id=sausage_man",
          {
            cache: "no-store",
          }
        );

        const data = await response.json();

        if (!response.ok || !data?.ok) {
          throw new Error(
            data?.error ||
              "No se pudo cargar el catálogo."
          );
        }

        const supplierOffers: SupplierOffer[] =
          Array.isArray(data.offers)
            ? data.offers
            : [];

        const normalized: SausageOffer[] =
          supplierOffers.map((offer) => {
            const supplierPrice =
              Number(offer.price_usd);

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
          });

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

  function handleSelectOffer(
    offer: SausageOffer
  ) {
    if (
      !offer.supplierPrice ||
      offer.supplierPrice <= 0
    ) {
      setError(
        "Esta oferta todavía no tiene un precio disponible."
      );
      return;
    }

    setSelectedOffer(offer);
    setError("");
    setOrderCreated(false);
    setOrderNumber("");

    setTimeout(() => {
      document
        .getElementById("sausage-order-form")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 100);
  }

  async function createOrder() {
    if (!selectedOffer) {
      setError("Selecciona una oferta.");
      return;
    }

    const cleanCharacterId =
      characterId.trim();

    if (!cleanCharacterId) {
      setError(
        "Introduce tu ID de personaje."
      );
      return;
    }

    if (!/^[0-9]+$/.test(cleanCharacterId)) {
      setError(
        "El ID de personaje solo puede contener números."
      );
      return;
    }

    if (cleanCharacterId.length < 4) {
      setError(
        "El ID de personaje debe tener al menos 4 números."
      );
      return;
    }

    if (cleanCharacterId.length > 20) {
      setError(
        "El ID de personaje no puede superar 20 números."
      );
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
        "/api/topups/sausage-man",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            offerId:
              selectedOffer.supplierOfferId,
            offerName: selectedOffer.name,
            characterId: cleanCharacterId,
            retailPrice: selectedOffer.price,
            idempotencyKey:
              crypto.randomUUID(),
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

      setOrderNumber(
        String(createdOrderNumber)
      );

      setOrderCreated(true);
      setSelectedOffer(null);
      setCharacterId("");

      try {
        localStorage.setItem(
          "last_sausage_man_order",
          JSON.stringify({
            orderNumber:
              createdOrderNumber,
            offerId:
              selectedOffer.supplierOfferId,
            offerName:
              selectedOffer.name,
            characterId:
              cleanCharacterId,
            retailPrice:
              selectedOffer.price,
            createdAt:
              new Date().toISOString(),
          })
        );
      } catch {
        // No bloquear el pedido.
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
    <main className="sausage-man-page">
      <header className="sausage-header">
        <button
          type="button"
          className="sausage-back-button"
          onClick={() => router.push("/top-up")}
        >
          ←
        </button>

        <h1>Sausage Man</h1>

        <div className="sausage-header-space" />
      </header>

      <section className="sausage-content">
        <div className="sausage-banner">
          <img
            src="/images/sausage-man.jpg"
            alt="Sausage Man"
          />
        </div>

        <div className="sausage-note">
          <strong>
            🌎 Región Global
          </strong>

          <p>
            Recarga de Sausage Man. Introduce
            tu ID de personaje antes de realizar
            el pedido.
          </p>

          <p>
            El producto seleccionado se entrega
            directamente a tu cuenta después de
            realizar el pedido.
          </p>
        </div>

        <button
          type="button"
          className="sausage-offers-toggle"
          onClick={() => {
            setOffersOpen(
              (value) => !value
            );
            setError("");
          }}
        >
          <span>
            ✏️ Presione para ver ofertas
          </span>

          <span className="sausage-offers-arrow">
            {offersOpen ? "▲" : "▼"}
          </span>
        </button>

        {offersOpen && (
          <section className="sausage-offers-section">
            {loadingOffers ? (
              <div className="sausage-loading">
                Cargando ofertas...
              </div>
            ) : error &&
              offers.length === 0 ? (
              <div className="sausage-error">
                {error}
              </div>
            ) : offers.length === 0 ? (
              <div className="sausage-error">
                No hay ofertas disponibles.
              </div>
            ) : (
              <div className="sausage-offers-list">
                {offers.map((offer) => {
                  const unavailable =
                    !offer.supplierPrice ||
                    offer.supplierPrice <= 0;

                  const selected =
                    selectedOffer?.supplierOfferId ===
                    offer.supplierOfferId;

                  return (
                    <button
                      key={
                        offer.supplierOfferId
                      }
                      type="button"
                      className={`sausage-offer ${
                        selected
                          ? "selected"
                          : ""
                      } ${
                        unavailable
                          ? "unavailable"
                          : ""
                      }`}
                      disabled={
                        unavailable
                      }
                      onClick={() =>
                        handleSelectOffer(
                          offer
                        )
                      }
                    >
                      <div className="sausage-offer-left">
                        <span className="sausage-offer-icon">
                          {offer.icon}
                        </span>

                        <div>
                          <strong>
                            {offer.display}
                          </strong>

                          <small>
                            {offer.name}
                          </small>
                        </div>
                      </div>

                      <div className="sausage-offer-price">
                        {unavailable
                          ? "NO DISPONIBLE"
                          : `${offer.price.toFixed(
                              4
                            )}$`}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {selectedOffer &&
          !orderCreated && (
            <section
              id="sausage-order-form"
              className="sausage-order-section"
            >
              <div className="sausage-selected-offer">
                <span>
                  {selectedOffer.icon}
                </span>

                <div>
                  <strong>
                    {selectedOffer.name}
                  </strong>

                  <span>
                    {selectedOffer.price.toFixed(
                      4
                    )}
                    $
                  </span>
                </div>
              </div>

              <form
                onSubmit={handleSubmit}
              >
                <label htmlFor="sausage-character-id">
                  ID del personaje
                </label>

                <input
                  id="sausage-character-id"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="Introduzca su ID de personaje"
                  value={characterId}
                  onChange={(event) => {
                    setCharacterId(
                      event.target.value
                    );
                    setError("");
                  }}
                  disabled={processing}
                />

                {error && (
                  <div className="sausage-form-error">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  className="sausage-create-order-button"
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
          <section className="sausage-success-section">
            <div className="sausage-success-icon">
              ✓
            </div>

            <h2>
              Orden creada
            </h2>

            <p>
              Tu pedido de Sausage Man fue
              creado correctamente.
            </p>

            {orderNumber && (
              <div className="sausage-order-number">
                <span>
                  Número de orden
                </span>

                <strong>
                  {orderNumber}
                </strong>
              </div>
            )}

            <button
              type="button"
              className="sausage-review-button"
              onClick={() =>
                router.push("/orders")
              }
            >
              Revisar orden
            </button>

            <button
              type="button"
              className="sausage-store-button"
              onClick={() =>
                router.push("/top-up")
              }
            >
              Volver a la tienda
            </button>
          </section>
        )}
      </section>

      <footer className="sausage-footer">
        🛒 STORE GAMING 🎮
      </footer>

      <style jsx>{`
        .sausage-man-page {
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

        .sausage-header {
          position: sticky;
          top: 0;
          z-index: 20;
          display: flex;
          align-items: center;
          justify-content: space-between;
          min-height: 58px;
          padding: 8px 12px;
          background: rgba(0, 0, 0, 0.88);
          border-bottom: 1px solid
            rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
        }

        .sausage-header h1 {
          margin: 0;
          font-size: 19px;
          font-weight: 800;
          text-align: center;
        }

        .sausage-back-button {
          width: 40px;
          height: 40px;
          border: 0;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.08);
          color: #fff;
          font-size: 25px;
          cursor: pointer;
        }

        .sausage-header-space {
          width: 40px;
        }

        .sausage-content {
          width: min(100%, 680px);
          margin: 0 auto;
          padding: 0 12px 30px;
        }

        .sausage-banner {
          width: calc(100% + 24px);
          margin-left: -12px;
          overflow: hidden;
        }

        .sausage-banner img {
          display: block;
          width: 100%;
          height: 210px;
          object-fit: cover;
        }

        .sausage-note {
          margin-top: 14px;
          padding: 14px;
          border-radius: 14px;
          background: rgba(0, 0, 0, 0.68);
          border: 1px solid
            rgba(255, 255, 255, 0.1);
        }

        .sausage-note strong {
          color: #fff;
          font-size: 15px;
        }

        .sausage-note p {
          margin: 7px 0 0;
          color: #d8d8d8;
          font-size: 13px;
          line-height: 1.5;
        }

        .sausage-offers-toggle {
          width: 100%;
          margin-top: 14px;
          padding: 15px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border: 1px solid
            rgba(255, 255, 255, 0.12);
          border-radius: 13px;
          background: rgba(0, 0, 0, 0.78);
          color: #fff;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
        }

        .sausage-offers-arrow {
          font-size: 12px;
        }

        .sausage-offers-section {
          margin-top: 10px;
        }

        .sausage-offers-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .sausage-offer {
          width: 100%;
          min-height: 65px;
          padding: 10px 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          border: 1px solid
            rgba(255, 255, 255, 0.1);
          border-radius: 13px;
          background: rgba(0, 0, 0, 0.78);
          color: #fff;
          text-align: left;
          cursor: pointer;
          transition: 0.15s ease;
        }

        .sausage-offer:active {
          transform: scale(0.98);
        }

        .sausage-offer.selected {
          border-color: rgba(255, 50, 50, 0.8);
          background: rgba(120, 0, 0, 0.3);
        }

        .sausage-offer.unavailable {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .sausage-offer-left {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        .sausage-offer-icon {
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

        .sausage-offer-left strong {
          display: block;
          font-size: 14px;
        }

        .sausage-offer-left small {
          display: block;
          margin-top: 3px;
          color: #aaa;
          font-size: 11px;
        }

        .sausage-offer-price {
          flex-shrink: 0;
          color: #fff;
          font-size: 14px;
          font-weight: 900;
        }

        .sausage-loading,
        .sausage-error {
          padding: 18px;
          border-radius: 13px;
          background: rgba(0, 0, 0, 0.78);
          text-align: center;
          font-size: 14px;
        }

        .sausage-error {
          color: #ff8e8e;
          border: 1px solid
            rgba(255, 70, 70, 0.35);
        }

        .sausage-order-section {
          margin-top: 16px;
          padding: 16px;
          border-radius: 15px;
          background: rgba(0, 0, 0, 0.82);
          border: 1px solid
            rgba(255, 255, 255, 0.1);
        }

        .sausage-selected-offer {
          display: flex;
          align-items: center;
          gap: 11px;
          margin-bottom: 15px;
          padding: 12px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.06);
        }

        .sausage-selected-offer > span {
          font-size: 25px;
        }

        .sausage-selected-offer div {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

                .sausage-selected-offer strong {
          font-size: 14px;
        }

        .sausage-selected-offer div span {
          font-weight: 900;
          white-space: nowrap;
        }

        .sausage-order-section {
          margin-top: 16px;
          padding: 16px;
          border-radius: 15px;
          background: rgba(0, 0, 0, 0.82);
          border: 1px solid
            rgba(255, 255, 255, 0.1);
        }

        .sausage-order-section form {
          display: flex;
          flex-direction: column;
        }

        .sausage-order-section label {
          margin-bottom: 7px;
          font-size: 13px;
          font-weight: 800;
        }

        .sausage-order-section input {
          width: 100%;
          box-sizing: border-box;
          padding: 13px;
          border: 1px solid
            rgba(255, 255, 255, 0.16);
          border-radius: 11px;
          outline: none;
          background: rgba(255, 255, 255, 0.07);
          color: #fff;
          font-size: 15px;
        }

        .sausage-order-section input::placeholder {
          color: #888;
        }

        .sausage-form-error {
          margin-top: 8px;
          padding: 9px;
          border-radius: 9px;
          background: rgba(150, 0, 0, 0.25);
          color: #ff9b9b;
          font-size: 12px;
        }

        .sausage-create-order-button,
        .sausage-review-button,
        .sausage-store-button {
          width: 100%;
          margin-top: 12px;
          padding: 13px;
          border: 0;
          border-radius: 11px;
          font-weight: 900;
          cursor: pointer;
        }

        .sausage-create-order-button {
          background: #d71920;
          color: #fff;
        }

        .sausage-create-order-button:disabled {
          opacity: 0.6;
          cursor: wait;
        }

        .sausage-success-section {
          margin-top: 18px;
          padding: 22px 16px;
          border-radius: 16px;
          background: rgba(0, 0, 0, 0.84);
          border: 1px solid
            rgba(50, 255, 100, 0.2);
          text-align: center;
        }

        .sausage-success-icon {
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

        .sausage-success-section h2 {
          margin: 0;
          font-size: 21px;
        }

        .sausage-success-section p {
          margin: 8px 0;
          color: #cfcfcf;
          font-size: 13px;
        }

        .sausage-order-number {
          margin-top: 13px;
          padding: 12px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.06);
        }

        .sausage-order-number span {
          display: block;
          color: #999;
          font-size: 11px;
        }

        .sausage-order-number strong {
          display: block;
          margin-top: 4px;
          font-size: 16px;
          word-break: break-word;
        }

        .sausage-review-button {
          background: #19a957;
          color: #fff;
        }

        .sausage-store-button {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
        }

        .sausage-footer {
          padding: 25px 12px 5px;
          color: #888;
          font-size: 12px;
          text-align: center;
        }

        @media (max-width: 480px) {
          .sausage-banner img {
            height: 185px;
          }

          .sausage-selected-offer div {
            flex-direction: column;
            align-items: flex-start;
          }

          .sausage-offer-price {
            font-size: 13px;
          }
        }
      `}</style>
    </main>
  );
}
