"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const offers = [
  {
    id: "cod-88",
    name: "88 CP",
    display: "88 CP",
    price: 1.1,
    icon: "🪙",
  },
  {
    id: "cod-460",
    name: "460 CP",
    display: "460 CP",
    price: 5.13,
    icon: "🪙",
  },
  {
    id: "cod-960",
    name: "960 CP",
    display: "960 CP",
    price: 10.15,
    icon: "🪙",
  },
  {
    id: "cod-2600",
    name: "2600 CP",
    display: "2600 CP",
    price: 25.3,
    icon: "🪙",
  },
  {
    id: "cod-5400",
    name: "5400 CP",
    display: "5400 CP",
    price: 50.4,
    icon: "🪙",
  },
];

export default function CallOfDutyPage() {
  const router = useRouter();

  const [showOffers, setShowOffers] = useState(false);
  const [selectedOffer, setSelectedOffer] =
    useState<(typeof offers)[number] | null>(null);

  const [playerId, setPlayerId] = useState("");
  const [error, setError] = useState("");
  const [showConfirmation, setShowConfirmation] =
    useState(false);

  const [orderCreated, setOrderCreated] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");

  function selectOffer(
    offer: (typeof offers)[number]
  ) {
    setSelectedOffer(offer);
    setPlayerId("");
    setError("");
    setShowConfirmation(false);
    setOrderCreated(false);

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

    const cleanId = playerId.trim();

    if (!cleanId) {
      setError("Ponga el ID de su cuenta.");
      return;
    }

    if (cleanId.length < 4) {
      setError("El ID parece demasiado corto.");
      return;
    }

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

  function createOrder() {
    if (!selectedOffer) {
      return;
    }

    const generatedNumber =
      `COD-${Date.now().toString().slice(-8)}`;

    const order = {
      id: generatedNumber,
      game: "CALL OF DUTY MOBILE",
      product: selectedOffer.name,
      displayProduct: selectedOffer.display,
      price: selectedOffer.price,
      playerId: playerId.trim(),
      status: "Pendiente",
      createdAt: new Date().toISOString(),
    };

    const existingOrders =
      localStorage.getItem("storeGamingOrders");

    let orders: any[] = [];

    if (existingOrders) {
      try {
        const parsed = JSON.parse(existingOrders);

        if (Array.isArray(parsed)) {
          orders = parsed;
        }
      } catch {
        orders = [];
      }
    }

    orders.unshift(order);

    localStorage.setItem(
      "storeGamingOrders",
      JSON.stringify(orders)
    );

    localStorage.setItem(
      "storeGamingLastOrder",
      JSON.stringify(order)
    );

    setOrderNumber(generatedNumber);
    setOrderCreated(true);

    setTimeout(() => {
      document
        .getElementById("success-section")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 100);
  }

  function goToOrders() {
    router.push("/orders");
  }

  return (
    <main className="game-service-page call-of-duty-page">

      <header className="game-service-header">

        <button
          type="button"
          className="game-back-button"
          onClick={() => router.push("/home")}
        >
          ←
        </button>

        <div className="game-header-title">
          <span>STORE GAMING</span>
          <strong>CALL OF DUTY MOBILE</strong>
        </div>

      </header>

      <section className="free-fire-main-image">

        <img
          src="/images/call-of-duty-mobile.jpg"
          alt="Call of Duty Mobile"
        />

        <div className="free-fire-main-overlay" />

        <div className="free-fire-main-text">

          <span>⚡ TOP UP</span>

          <h1>
            CALL OF DUTY
            <strong>MOBILE</strong>
          </h1>

          <p>CP para Call of Duty Mobile</p>

        </div>

      </section>

      <button
        type="button"
        className="offers-toggle"
        onClick={() =>
          setShowOffers((current) => !current)
        }
      >

        <span className="offers-toggle-text">
          ✎
          <strong>PRESIONE PARA VER OFERTAS</strong>
        </span>

        <span className="offers-toggle-pencil">
          ✎
        </span>

      </button>

      {showOffers && (
        <section className="offers-section">

          <div className="offers-heading">

            <div>
              <span>CALL OF DUTY MOBILE</span>
              <h2>ELIGE TU OFERTA</h2>
            </div>

          </div>

          <div className="offers-list">

            {offers.map((offer) => {

              const selected =
                selectedOffer?.id === offer.id;

              return (
                <button
                  key={offer.id}
                  type="button"
                  className={`offer-card ${
                    selected ? "selected" : ""
                  }`}
                  onClick={() => selectOffer(offer)}
                >

                  <div className="offer-left">

                    <div className="diamond-icon">
                      {offer.icon}
                    </div>

                    <div className="offer-info">

                      <strong>
                        {offer.display}
                      </strong>

                      <span>
                        {offer.name}
                      </span>

                    </div>

                  </div>

                  <div className="offer-right">

                    <strong>
                      {offer.price.toFixed(2)}$
                    </strong>

                    <span>
                      SELECCIONAR →
                    </span>

                  </div>

                </button>
              );
            })}

          </div>

        </section>
      )}

      {selectedOffer && (
        <section
          id="order-section"
          className="order-section"
        >

          <div className="section-title">

            <span>01</span>

            <div>
              <small>TU SELECCIÓN</small>
              <h2>DATOS DEL PEDIDO</h2>
            </div>

          </div>

          <div className="selected-order-card">

            <div className="selected-order-icon">
              {selectedOffer.icon}
            </div>

            <div className="selected-order-info">

              <span>
                CALL OF DUTY MOBILE
              </span>

              <strong>
                {selectedOffer.name}
              </strong>

            </div>

            <div className="selected-order-price">
              {selectedOffer.price.toFixed(2)}$
            </div>

          </div>

          <form
            onSubmit={handleFinishPurchase}
            className="order-form"
          >

            <label
              htmlFor="call-of-duty-player-id"
              className="player-id-label"
            >
              PONGA SU ID
            </label>

            <p className="player-id-description">
              Introduzca el ID de la cuenta donde desea
              recibir la compra.
            </p>

            <div className="player-id-input-wrapper">

              <span>🆔</span>

              <input
                id="call-of-duty-player-id"
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

            {error && (
              <div className="order-error">
                {error}
              </div>
            )}

            <div className="order-total-preview">

              <span>PRECIO</span>

              <strong>
                {selectedOffer.price.toFixed(2)}$
              </strong>

            </div>

            <button
              type="submit"
              className="finish-order-button"
            >

              <span>
                FINALIZAR COMPRA
              </span>

              <b>→</b>

            </button>

          </form>

        </section>
      )}

      {showConfirmation &&
        selectedOffer &&
        !orderCreated && (
          <section
            id="confirmation-section"
            className="confirmation-section"
          >

            <div className="section-title">

              <span>02</span>

              <div>
                <small>CONFIRMAR</small>
                <h2>REVISE SU ORDEN</h2>
              </div>

            </div>

            <div className="confirmation-card">

              <h3>
                Usted va a realizar una compra de Call of
                Duty Mobile CP
              </h3>

              <div className="confirmation-row">

                <span>PRODUCTO</span>

                <strong>
                  {selectedOffer.name}
                </strong>

              </div>

              <div className="confirmation-row">

                <span>PRECIO A GASTAR</span>

                <strong>
                  {selectedOffer.price.toFixed(2)}$
                </strong>

              </div>

              <div className="confirmation-row">

                <span>ID DEL JUGADOR</span>

                <strong>
                  {playerId}
                </strong>

              </div>

              <p className="confirmation-warning">
                Revise cuidadosamente los datos antes de
                finalizar la compra.
              </p>

              <button
                type="button"
                className="confirm-final-button"
                onClick={createOrder}
              >
                FINALIZAR
              </button>

            </div>

          </section>
        )}

      {orderCreated && (
        <section
          id="success-section"
          className="order-success-section"
        >

          <div className="success-circle">
            ✓
          </div>

          <h2>
            ORDEN CREADA
          </h2>

          <p>
            Su orden ha sido creada correctamente.
          </p>

          <div className="success-order-number">

            <span>
              NÚMERO DE ORDEN
            </span>

            <strong>
              #{orderNumber}
            </strong>

          </div>

          <button
            type="button"
            className="view-orders-button"
            onClick={goToOrders}
          >
            VER MIS ÓRDENES
            <span>→</span>
          </button>

        </section>
      )}

      <section className="service-info">

        <div className="service-info-item">

          <span>⚡</span>

          <div>
            <strong>ENTREGA RÁPIDA</strong>

            <p>
              Procesamos tus pedidos rápidamente.
            </p>
          </div>

        </div>

        <div className="service-info-item">

          <span>🔒</span>

          <div>
            <strong>COMPRA SEGURA</strong>

            <p>
              Tu pedido queda registrado.
            </p>
          </div>

        </div>

        <div className="service-info-item">

          <span>🎮</span>

          <div>
            <strong>CALL OF DUTY MOBILE</strong>

            <p>
              CP para Call of Duty Mobile.
            </p>
          </div>

        </div>

      </section>

      <footer className="game-service-footer">

        <strong>
          🛒STORE GAMING🎮
        </strong>

        <span>
          CALL OF DUTY MOBILE TOP UP
        </span>

      </footer>

    </main>
  );
    }
