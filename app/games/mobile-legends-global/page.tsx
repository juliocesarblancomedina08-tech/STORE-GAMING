"use client";

import {
  FormEvent,
  useState,
} from "react";

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

const offers: Offer[] = [
  {
    id: "51_5_diamonds",
    name: "51 + 5 Diamantes",
    price: 1.02,
  },
  {
    id: "weekly_diamond_pass",
    name: "Pase semanal de diamantes",
    price: 1.89,
  },
  {
    id: "253_25_diamonds",
    name: "253 + 25 Diamantes",
    price: 4.49,
  },
  {
    id: "505_66_diamantes",
    name: "505 + 66 Diamantes",
    price: 8.85,
  },
  {
    id: "1010_182_diamantes",
    name: "1010 + 182 Diamantes",
    price: 17.49,
  },
  {
    id: "1515_273_diamantes",
    name: "1515 + 273 Diamantes",
    price: 26.14,
  },
  {
    id: "2525_480_diamantes",
    name: "2525 + 480 Diamantes",
    price: 43.47,
  },
  {
    id: "3030_576_diamantes",
    name: "3030 + 576 Diamantes",
    price: 52.14,
  },
  {
    id: "4008_802_diamantes",
    name: "4008 + 802 Diamantes",
    price: 69.47,
  },
  {
    id: "5010_1002_diamantes",
    name: "5010 + 1002 Diamantes",
    price: 86.80,
  },
];

export default function MobileLegendsGlobalPage() {
  const router = useRouter();

  const [showOffers, setShowOffers] =
    useState(false);

  const [selectedOffer, setSelectedOffer] =
    useState<Offer | null>(null);

  const [playerId, setPlayerId] =
    useState("");

  const [serverId, setServerId] =
    useState("");

  const [error, setError] =
    useState("");

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

    const cleanPlayerId =
      playerId.trim();

    const cleanServerId =
      serverId.trim();

    if (!selectedOffer) {
      setError(
        "Seleccione una oferta."
      );
      return;
    }

    if (!cleanPlayerId) {
      setError(
        "Introduzca el ID del jugador."
      );
      return;
    }

    if (
      !/^[0-9]+$/.test(
        cleanPlayerId
      )
    ) {
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
        "El ID del jugador no es válido."
      );
      return;
    }

    if (!cleanServerId) {
      setError(
        "Introduzca el ID del servidor."
      );
      return;
    }

    if (
      !/^[0-9]+$/.test(
        cleanServerId
      )
    ) {
      setError(
        "El ID del servidor debe contener solamente números."
      );
      return;
    }

    if (
      cleanServerId.length > 20
    ) {
      setError(
        "El ID del servidor no es válido."
      );
      return;
    }

    setPlayerId(cleanPlayerId);
    setServerId(cleanServerId);
    setShowConfirmation(true);
  }

  async function createOrder() {
    if (!selectedOffer) {
      setError(
        "Seleccione una oferta."
      );
      return;
    }

    setProcessing(true);
    setError("");

    try {
      const {
        data: {
          session,
        },
      } =
        await supabase.auth.getSession();

      if (!session?.access_token) {
        setError(
          "Su sesión ha expirado. Inicie sesión nuevamente."
        );
        return;
      }

      const idempotencyKey =
        crypto.randomUUID();

      const response =
        await fetch(
          "/api/topups/mobile-legends-global",
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
                playerId.trim(),

              serverId:
                serverId.trim(),

              idempotencyKey,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok || !data?.ok) {
        throw new Error(
          data?.error ||
            "No se pudo crear la orden."
        );
      }

      setOrderNumber(
        data.orderNumber || ""
      );

      setSupplierOrderId(
        data.supplierOrderId || ""
      );

      setOrderStatus(
        data.status ||
          "SUPPLIER_PENDING"
      );

      setOrderCreated(true);
      setShowConfirmation(false);

      setTimeout(() => {
        document
          .getElementById("success-section")
          ?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
      }, 100);
    } catch (err) {
      console.error(
        "ERROR CREANDO ORDEN LEGENDS MOBILE GLOBAL:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "No se pudo crear la orden."
      );
    } finally {
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
          onClick={() =>
            router.push("/top-up")
          }
          aria-label="Volver a recargas"
        >
          ←
        </button>

        <div className="mobile-legends-header-title">
          <span>
            Legends Mobile
          </span>

          <small>
            Global
          </small>
        </div>

        <button
          type="button"
          className="mobile-legends-orders-button"
          onClick={goToOrders}
          aria-label="Ver pedidos"
        >
          📋
        </button>

      </header>

      <section className="mobile-legends-content">

        <div className="mobile-legends-banner">

          <img
            src="/images/mobile-legends.jpg"
            alt="Legends Mobile Global"
          />

          <div className="mobile-legends-banner-overlay">

            <div className="mobile-legends-banner-text">

              <strong>
                LEGENDS MOBILE
              </strong>

              <span>
                Global
              </span>

            </div>

          </div>

        </div>

        <div className="mobile-legends-note">

          <span>
            ℹ️
          </span>

          <p>
            Introduzca correctamente su
            ID de jugador y su ID de
            servidor antes de realizar
            la compra.
          </p>

        </div>

        <button
          type="button"
          className="mobile-legends-offers-toggle"
          onClick={() =>
            setShowOffers(
              (value) => !value
            )
          }
        >
          <span>
            {showOffers
              ? "Ocultar ofertas"
              : "Presione para ver ofertas"}
          </span>

          <span className="mobile-legends-offers-arrow">
            {showOffers
              ? "▲"
              : "▼"}
          </span>

        </button>

        {showOffers && (
          <section className="mobile-legends-offers-section">

            <div className="mobile-legends-offers-list">

              {offers.map(
                (offer) => (

                  <button
                    type="button"
                    key={offer.id}
                    className={`mobile-legends-offer ${
                      selectedOffer?.id ===
                      offer.id
                        ? "selected"
                        : ""
                    }`}
                    onClick={() =>
                      selectOffer(
                        offer
                      )
                    }
                  >

                    <div className="mobile-legends-offer-left">

                      <div className="mobile-legends-offer-icon">
                        💎
                      </div>

                      <div>

                        <strong>
                          {offer.name}
                        </strong>

                        <span>
                          Legends Mobile Global
                        </span>

                      </div>

                    </div>

                    <div className="mobile-legends-offer-price">
                      $
                      {offer.price.toFixed(
                        2
                      )}
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
            className="mobile-legends-order-section"
          >

            <div className="mobile-legends-selected-offer">

              <span>
                Oferta seleccionada
              </span>

              <strong>
                {selectedOffer.name}
              </strong>

              <b>
                $
                {selectedOffer.price.toFixed(
                  2
                )}
              </b>

            </div>

            {error && (
              <div className="mobile-legends-warning">
                ⚠️ {error}
              </div>
            )}

            {!showConfirmation &&
              !orderCreated && (

                <form
                  className="mobile-legends-order-form"
                  onSubmit={
                    handleFinishPurchase
                  }
                >

                  <label>
                    ID del jugador
                  </label>

                  <div className="mobile-legends-input-wrapper">

                    <span>
                      👤
                    </span>

                    <input
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
                      placeholder="Ej: 123456789"
                      maxLength={20}
                    />

                  </div>

                  <label>
                    ID del servidor
                  </label>

                  <div className="mobile-legends-input-wrapper">

                    <span>
                      🌐
                    </span>

                    <input
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
                      placeholder="Ej: 1234"
                      maxLength={20}
                    />

                  </div>

                  <button
                    type="submit"
                    className="mobile-legends-create-order-button"
                  >
                    CONTINUAR
                  </button>

                </form>
              )}

            {showConfirmation &&
              !orderCreated && (

                <section className="mobile-legends-confirmation-section">

                  <div className="mobile-legends-confirmation-card">

                    <h3>
                      Confirmar pedido
                    </h3>

                    <div className="mobile-legends-confirmation-row">

                      <span>
                        Oferta
                      </span>

                      <strong>
                        {selectedOffer.name}
                      </strong>

                    </div>

                    <div className="mobile-legends-confirmation-row">

                      <span>
                        ID del jugador
                      </span>

                      <strong>
                        {playerId}
                      </strong>

                    </div>

                    <div className="mobile-legends-confirmation-row">

                      <span>
                        ID del servidor
                      </span>

                      <strong>
                        {serverId}
                      </strong>

                    </div>

                    <div className="mobile-legends-confirmation-total">

                      <span>
                        Total
                      </span>

                      <strong>
                        $
                        {selectedOffer.price.toFixed(
                          2
                        )}
                      </strong>

                    </div>

                    <button
                      type="button"
                      className="mobile-legends-confirm-button"
                      onClick={
                        createOrder
                      }
                      disabled={
                        processing
                      }
                    >
                      {processing
                        ? "CREANDO PEDIDO..."
                        : "CONFIRMAR PEDIDO"}
                    </button>

                    <button
                      type="button"
                      className="mobile-legends-cancel-button"
                      onClick={() =>
                        setShowConfirmation(
                          false
                        )
                      }
                      disabled={
                        processing
                      }
                    >
                      CANCELAR
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
                  Orden creada
                </h2>

                <p>
                  Tu pedido fue enviado
                  correctamente.
                </p>

                <div className="mobile-legends-order-number">

                  <span>
                    Número de orden
                  </span>

                  <strong>
                    {orderNumber}
                  </strong>

                </div>

                {supplierOrderId && (
                  <div className="mobile-legends-order-number">

                    <span>
                      Orden del proveedor
                    </span>

                    <strong>
                      {supplierOrderId}
                    </strong>

                  </div>
                )}

                <div className="mobile-legends-order-number">

                  <span>
                    Estado
                  </span>

                  <strong>
                    {orderStatus}
                  </strong>

                </div>

                <button
                  type="button"
                  className="mobile-legends-review-button"
                  onClick={
                    goToOrders
                  }
                >
                  REVISAR ORDEN
                </button>

                <button
                  type="button"
                  className="mobile-legends-store-button"
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

          </section>
        )}

        <section className="mobile-legends-service-info">

          <h3>
            Información del servicio
          </h3>

          <p>
            La recarga se realiza
            directamente utilizando el
            ID del jugador y el ID del
            servidor proporcionados.
          </p>

          <p>
            Verifique cuidadosamente
            ambos datos antes de confirmar
            el pedido.
          </p>

        </section>

      </section>

      <footer className="mobile-legends-footer">
        STORE GAMING
      </footer>

      <style jsx>{`

        .mobile-legends-page {
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

        .mobile-legends-header {
          position: sticky;
          top: 0;
          z-index: 20;
          height: 64px;
          display: grid;
          grid-template-columns: 48px 1fr 48px;
          align-items: center;
          padding: 0 10px;
          background: rgba(0, 0, 0, 0.92);
          border-bottom: 1px solid
            rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(12px);
        }

        .mobile-legends-back-button,
        .mobile-legends-orders-button {
          width: 42px;
          height: 42px;
          border: 0;
          border-radius: 12px;
          background: rgba(
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

        .mobile-legends-header-title {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
        }

        .mobile-legends-header-title span {
          font-size: 17px;
          font-weight: 900;
        }

        .mobile-legends-header-title small {
          margin-top: 2px;
          color: #aaa;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .mobile-legends-content {
          width: 100%;
          max-width: 560px;
          margin: 0 auto;
          padding: 0 12px;
        }

        .mobile-legends-banner {
          position: relative;
          width: calc(100% + 24px);
          margin-left: -12px;
          overflow: hidden;
        }

        .mobile-legends-banner img {
          display: block;
          width: 100%;
          height: 230px;
          object-fit: cover;
        }

        .mobile-legends-banner-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-end;
  padding: 20px;
  background:
    linear-gradient(
      transparent 30%,
      rgba(0, 0, 0, 0.85) 100%
    );
}

.mobile-legends-banner-content {
  color: #fff;
}

.mobile-legends-banner-content h1 {
  margin: 0 0 6px;
  font-size: 32px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.mobile-legends-banner-content p {
  margin: 0;
  font-size: 16px;
  color: #ddd;
}

.mobile-legends-offers {
  margin-top: 28px;
}

.mobile-legends-offers h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 800;
}

.mobile-legends-offers-subtitle {
  margin-top: 6px;
  color: #999;
  font-size: 14px;
}

.mobile-legends-offers-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-top: 18px;
}

.mobile-legends-offer-card {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 18px;
  background: #151515;
  cursor: pointer;
  transition: 0.2s ease;
}

.mobile-legends-offer-card:hover {
  transform: translateY(-2px);
  border-color: #e31b23;
}

.mobile-legends-offer-card.selected {
  border-color: #e31b23;
  box-shadow: 0 0 0 1px #e31b23;
}

.mobile-legends-offer-name {
  font-size: 16px;
  font-weight: 700;
  color: #fff;
}

.mobile-legends-offer-price {
  margin-top: 8px;
  font-size: 20px;
  font-weight: 800;
  color: #fff;
}

.mobile-legends-order-section {
  margin-top: 30px;
  padding: 24px;
  border-radius: 18px;
  background: #151515;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.mobile-legends-order-section h2 {
  margin: 0 0 18px;
  font-size: 23px;
}

.mobile-legends-form {
  display: grid;
  gap: 15px;
}

.mobile-legends-form label {
  display: block;
  margin-bottom: 7px;
  font-size: 14px;
  font-weight: 700;
  color: #ddd;
}

.mobile-legends-form input {
  width: 100%;
  box-sizing: border-box;
  padding: 13px 14px;
  border: 1px solid #333;
  border-radius: 10px;
  background: #0d0d0d;
  color: #fff;
  outline: none;
}

.mobile-legends-form input:focus {
  border-color: #e31b23;
}

.mobile-legends-selected-offer {
  padding: 14px;
  border-radius: 12px;
  background: #0d0d0d;
  border: 1px solid #292929;
}

.mobile-legends-selected-offer strong {
  color: #fff;
}

.mobile-legends-selected-offer span {
  display: block;
  margin-top: 5px;
  color: #e31b23;
  font-weight: 800;
}

.mobile-legends-error {
  padding: 12px 14px;
  border-radius: 10px;
  background: rgba(220, 38, 38, 0.12);
  border: 1px solid rgba(220, 38, 38, 0.4);
  color: #ff7777;
  font-size: 14px;
}

.mobile-legends-button {
  width: 100%;
  border: 0;
  border-radius: 11px;
  padding: 14px 18px;
  background: #e31b23;
  color: #fff;
  font-size: 15px;
  font-weight: 800;
  cursor: pointer;
  transition: 0.2s ease;
}

.mobile-legends-button:hover {
  background: #ff252d;
  transform: translateY(-1px);
}

.mobile-legends-button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  transform: none;
}

.mobile-legends-confirmation {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.75);
}

.mobile-legends-confirmation-card {
  width: 100%;
  max-width: 440px;
  padding: 25px;
  border-radius: 18px;
  background: #171717;
  border: 1px solid #333;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.mobile-legends-confirmation-card h2 {
  margin: 0 0 12px;
  font-size: 23px;
}

.mobile-legends-confirmation-card p {
  margin: 8px 0;
  color: #bbb;
  line-height: 1.5;
}

.mobile-legends-confirmation-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.mobile-legends-secondary-button {
  flex: 1;
  border: 1px solid #333;
  border-radius: 11px;
  padding: 13px;
  background: #222;
  color: #fff;
  font-weight: 700;
  cursor: pointer;
}

.mobile-legends-secondary-button:hover {
  background: #2b2b2b;
}

.mobile-legends-success {
  text-align: center;
  padding: 30px 20px;
}

.mobile-legends-success-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.mobile-legends-success h2 {
  margin: 0 0 10px;
  font-size: 25px;
}

.mobile-legends-success p {
  color: #aaa;
  line-height: 1.5;
}

.mobile-legends-info {
  margin-top: 30px;
  padding: 22px;
  border-radius: 16px;
  background: #151515;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.mobile-legends-info h3 {
  margin: 0 0 12px;
  font-size: 19px;
}

.mobile-legends-info p {
  margin: 8px 0;
  color: #aaa;
  line-height: 1.5;
}

.mobile-legends-footer {
  margin-top: 35px;
  padding: 25px 0;
  text-align: center;
  color: #777;
  font-size: 13px;
}

@media (max-width: 700px) {
  .mobile-legends-banner-overlay {
    padding: 16px;
  }

  .mobile-legends-banner-content h1 {
    font-size: 25px;
  }

  .mobile-legends-banner-content p {
    font-size: 14px;
  }

  .mobile-legends-offers-grid {
    grid-template-columns: 1fr;
  }

  .mobile-legends-order-section {
    padding: 18px;
  }

  .mobile-legends-confirmation-actions {
    flex-direction: column;
  }
}
