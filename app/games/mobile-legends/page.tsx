"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const gameNote =
  "Región: Recarga de Mobile Legends en EE. UU. Ingresa tu ID de jugador y tu ID de servidor antes de realizar el pedido. Los diamantes se entregarán directamente a tu cuenta una vez realizado el pedido.";

const offers = [
  {
    id: "ml-56",
    name: "56 Diamonds",
    display: "56💎",
    price: 0.97,
    icon: "💎",
  },
  {
    id: "ml-278",
    name: "278 Diamonds",
    display: "278💎",
    price: 4.45,
    icon: "💎",
  },
  {
    id: "ml-571",
    name: "571 Diamonds",
    display: "571💎",
    price: 8.8,
    icon: "💎",
  },
  {
    id: "ml-1192",
    name: "1192 Diamonds",
    display: "1192💎",
    price: 17.45,
    icon: "💎",
  },
  {
    id: "ml-1788",
    name: "1788 Diamonds",
    display: "1788💎",
    price: 26.15,
    icon: "💎",
  },
  {
    id: "ml-weekly-pass",
    name: "Pase semanal",
    display: "PASE SEMANAL",
    price: 1.85,
    icon: "🎟️",
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

  function selectOffer(
    offer: (typeof offers)[number]
  ) {
    setSelectedOffer(offer);
    setPlayerId("");
    setServerId("");
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

    const cleanPlayerId = playerId.trim();
    const cleanServerId = serverId.trim();

    if (!cleanPlayerId) {
      setError("Ponga el ID de su cuenta.");
      return;
    }

    if (cleanPlayerId.length < 4) {
      setError("El ID del jugador parece demasiado corto.");
      return;
    }

    if (!cleanServerId) {
      setError("Ponga el ID del servidor.");
      return;
    }

    if (cleanServerId.length < 2) {
      setError("El ID del servidor parece demasiado corto.");
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
      `ML-${Date.now().toString().slice(-8)}`;

    const order = {
      id: generatedNumber,
      game: "MOBILE LEGENDS",
      product: selectedOffer.name,
      displayProduct: selectedOffer.display,
      price: selectedOffer.price,
      playerId: playerId.trim(),
      serverId: serverId.trim(),
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
    <main className="game-service-page mobile-legends-page">

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

          <strong>
            MOBILE LEGENDS
          </strong>
        </div>

      </header>

      <section className="free-fire-main-image">

        <img
          src="/images/mobile-legends.jpg"
          alt="Mobile Legends"
        />

        <div className="free-fire-main-overlay" />

        <div className="free-fire-main-text">

          <span>⚡ TOP UP</span>

          <h1>
            MOBILE
            <strong>LEGENDS</strong>
          </h1>

          <p>
            Diamantes y pase semanal
          </p>

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

          <strong>
            PRESIONE PARA VER OFERTAS
          </strong>

        </span>

        <span className="offers-toggle-pencil">
          ✎
        </span>

      </button>

      {showOffers && (
        <section className="offers-section">

          <div className="offers-heading">

            <div>

              <span>
                MOBILE LEGENDS
              </span>

              <h2>
                ELIGE TU OFERTA
              </h2>

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

          {/* NOTA DEL JUEGO */}
          <div className="game-note">

            <div className="game-note-icon">
              !
            </div>

            <div className="game-note-content">

              <strong>
                NOTA
              </strong>

              <p>
                {gameNote}
              </p>

            </div>

          </div>

        </section>
      )}

      {selectedOffer && (
        <section
          id="order-section"
          className="order-section"
        >

          <div className="section-title">

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

          <div className="selected-order-card">

            <div className="selected-order-icon">
              {selectedOffer.icon}
            </div>

            <div className="selected-order-info">

              <span>
                MOBILE LEGENDS
              </span>

              <strong>
                {selectedOffer.name}
              </strong>

            </div>

            <div className="selected-order-price">
              {selectedOffer.price.toFixed(2)}$
            </div>

          </div>

          {/* NOTA SOBRE EL PEDIDO */}
          <div className="game-note game-note-order">

            <div className="game-note-icon">
              !
            </div>

            <div className="game-note-content">

              <strong>
                NOTA
              </strong>

              <p>
                {gameNote}
              </p>

            </div>

          </div>

          <form
            onSubmit={handleFinishPurchase}
            className="order-form"
          >

            <label
              htmlFor="mobile-legends-player-id"
              className="player-id-label"
            >
              PONGA SU ID
            </label>

            <p className="player-id-description">
              Introduzca el ID de la cuenta donde desea
              recibir la compra.
            </p>

            <div className="player-id-input-wrapper">

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

            <label
              htmlFor="mobile-legends-server-id"
              className="player-id-label"
            >
              ID DEL SERVIDOR
            </label>

            <p className="player-id-description">
              Introduzca el ID del servidor de su cuenta.
            </p>

            <div className="player-id-input-wrapper">

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
              <div className="order-error">
                {error}
              </div>
            )}

            <div className="order-total-preview">

              <span>
                PRECIO
              </span>

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
            className="confirmation-section"
          >

            <div className="section-title">

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

            <div className="confirmation-card">

              <h3>
                Usted va a realizar una compra de Mobile
                Legends
              </h3>

              <div className="confirmation-row">

                <span>
                  PRODUCTO
                </span>

                <strong>
                  {selectedOffer.name}
                </strong>

              </div>

              <div className="confirmation-row">

                <span>
                  PRECIO A GASTAR
                </span>

                <strong>
                  {selectedOffer.price.toFixed(2)}$
                </strong>

              </div>

              <div className="confirmation-row">

                <span>
                  ID DEL JUGADOR
                </span>

                <strong>
                  {playerId}
                </strong>

              </div>

              <div className="confirmation-row">

                <span>
                  ID DEL SERVIDOR
                </span>

                <strong>
                  {serverId}
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

            <span>
              →
            </span>

          </button>

        </section>
      )}

      <section className="service-info">

        <div className="service-info-item">

          <span>
            ⚡
          </span>

          <div>

            <strong>
              ENTREGA RÁPIDA
            </strong>

            <p>
              Procesamos tus pedidos rápidamente.
            </p>

          </div>

        </div>

        <div className="service-info-item">

          <span>
            🔒
          </span>

          <div>

            <strong>
              COMPRA SEGURA
            </strong>

            <p>
              Tu pedido queda registrado.
            </p>

          </div>

        </div>

        <div className="service-info-item">

          <span>
            🎮
          </span>

          <div>

            <strong>
              MOBILE LEGENDS
            </strong>

            <p>
              Diamantes y pase semanal.
            </p>

          </div>

        </div>

      </section>

      <footer className="game-service-footer">

        <strong>
          🛒STORE GAMING🎮
        </strong>

        <span>
          MOBILE LEGENDS TOP UP
        </span>

      </footer>

    </main>
  );
}
