"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const offers = [
  {
    id: "delta-18",
    name: "18 MONEDAS DELTA",
    display: "18🪙",
    price: 0.32,
    icon: "🪙",
  },
  {
    id: "delta-30",
    name: "30 MONEDAS DELTA",
    display: "30🪙",
    price: 0.48,
    icon: "🪙",
  },
  {
    id: "delta-60",
    name: "60 MONEDAS DELTA",
    display: "60🪙",
    price: 0.87,
    icon: "🪙",
  },
  {
    id: "delta-320",
    name: "320 MONEDAS DELTA",
    display: "320🪙",
    price: 3.93,
    icon: "🪙",
  },
  {
    id: "delta-season",
    name: "PASE DE TEMPORADA",
    display: "PASE 🎟️",
    price: 4.40,
    icon: "🎟️",
  },
  {
    id: "delta-special",
    name: "PASE DE TEMPORADA ESPECIAL",
    display: "PASE ESPECIAL 🎟️",
    price: 4.38,
    icon: "🎟️",
  },
  {
    id: "delta-460",
    name: "460 MONEDAS DELTA",
    display: "460🪙",
    price: 5.65,
    icon: "🪙",
  },
  {
    id: "delta-deluxe",
    name: "PASE DE TEMPORADA DELTA FORCE DELUXE",
    display: "DELUXE 🎟️",
    price: 6.00,
    icon: "🎟️",
  },
  {
    id: "delta-750",
    name: "750 MONEDAS DELTA",
    display: "750🪙",
    price: 7.76,
    icon: "🪙",
  },
  {
    id: "delta-1480",
    name: "1480 MONEDAS DELTA",
    display: "1480🪙",
    price: 15.40,
    icon: "🪙",
  },
  {
    id: "delta-1980",
    name: "1980 MONEDAS DELTA",
    display: "1980🪙",
    price: 19.22,
    icon: "🪙",
  },
  {
    id: "delta-3950",
    name: "3950 MONEDAS DELTA",
    display: "3950🪙",
    price: 38.34,
    icon: "🪙",
  },
  {
    id: "delta-8100",
    name: "8100 MONEDAS DELTA",
    display: "8100🪙",
    price: 76.60,
    icon: "🪙",
  },
  {
    id: "delta-16200",
    name: "16200 MONEDAS DELTA",
    display: "16200🪙",
    price: 158.00,
    icon: "🪙",
  },
];

const gameNote =
  "Región: Recarga Global Delta Force. La moneda se deposita directamente en su cuenta una vez realizada la orden.";

export default function DeltaForcePage() {
  const router = useRouter();

  const [showOffers, setShowOffers] =
    useState(false);

  const [selectedOffer, setSelectedOffer] =
    useState<(typeof offers)[number] | null>(
      null
    );

  const [playerId, setPlayerId] =
    useState("");

  const [quantity, setQuantity] =
    useState(1);

  const [error, setError] =
    useState("");

  const [showConfirmation, setShowConfirmation] =
    useState(false);

  const [orderCreated, setOrderCreated] =
    useState(false);

  const [orderNumber, setOrderNumber] =
    useState("");

  function selectOffer(
    offer: (typeof offers)[number]
  ) {
    setSelectedOffer(offer);
    setPlayerId("");
    setQuantity(1);
    setError("");
    setShowConfirmation(false);
    setOrderCreated(false);
    setOrderNumber("");

    setTimeout(() => {
      document
        .getElementById("order-section")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 100);
  }

  function decreaseQuantity() {
    setQuantity((current) =>
      Math.max(1, current - 1)
    );
  }

  function increaseQuantity() {
    setQuantity((current) =>
      current + 1
    );
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

    const cleanId =
      playerId.trim();

    if (!cleanId) {
      setError(
        "Ponga el ID de su cuenta."
      );
      return;
    }

    if (cleanId.length < 4) {
      setError(
        "El ID parece demasiado corto."
      );
      return;
    }

    setShowConfirmation(true);

    setTimeout(() => {
      document
        .getElementById(
          "confirmation-section"
        )
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
      `DF-${Date.now()
        .toString()
        .slice(-8)}`;

    const total =
      selectedOffer.price *
      quantity;

    const order = {
      id: generatedNumber,
      game: "DELTA FORCE",
      product: selectedOffer.name,
      displayProduct:
        selectedOffer.display,
      price: total,
      unitPrice:
        selectedOffer.price,
      quantity,
      playerId:
        playerId.trim(),
      status: "Pendiente",
      createdAt:
        new Date().toISOString(),
    };

    const existingOrders =
      localStorage.getItem(
        "storeGamingOrders"
      );

    let orders: any[] = [];

    if (existingOrders) {
      try {
        const parsed =
          JSON.parse(
            existingOrders
          );

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

    setOrderNumber(
      generatedNumber
    );

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
  }

  function goToOrders() {
    router.push("/orders");
  }

  const total = selectedOffer
    ? selectedOffer.price *
      quantity
    : 0;

  return (
    <main className="game-service-page">

      {/* =========================
          HEADER
      ========================== */}

      <header className="game-service-header">

        <button
          type="button"
          className="game-back-button"
          onClick={() =>
            router.push("/top-up")
          }
          aria-label="Volver"
        >
          ←
        </button>

        <div className="game-header-title">

          <span>
            STORE GAMING
          </span>

          <strong>
            DELTA FORCE
          </strong>

        </div>

        <button
          type="button"
          className="game-cart-button"
          onClick={() =>
            router.push("/cart")
          }
          aria-label="Carrito"
        >
          🛒
        </button>

      </header>


      {/* =========================
          IMAGEN PRINCIPAL
      ========================== */}

      <section className="free-fire-main-image">

        <img
          src="/images/delta-force.jpg"
          alt="Delta Force"
        />

        <div className="free-fire-main-overlay" />

        <div className="free-fire-main-text">

          <span>
            ⚡ TOP UP
          </span>

          <h1>
            DELTA
            <strong>
              FORCE
            </strong>
          </h1>

          <p>
            Monedas y pases
          </p>

        </div>

      </section>


      {/* =========================
          BOTÓN PARA MOSTRAR OFERTAS
      ========================== */}

      <button
        type="button"
        className="offers-toggle"
        onClick={() =>
          setShowOffers(
            (current) => !current
          )
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


      {/* =========================
          OFERTAS
      ========================== */}

      {showOffers && (

        <section className="offers-section">

          <div className="offers-heading">

            <div>

              <span>
                DELTA FORCE
              </span>

              <h2>
                ELIGE TU OFERTA
              </h2>

            </div>

          </div>


          <div className="offers-list">

            {offers.map(
              (offer) => {

                const selected =
                  selectedOffer?.id ===
                  offer.id;

                return (

                  <button
                    key={offer.id}
                    type="button"
                    className={`offer-card ${
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
                        {offer.price.toFixed(
                          2
                        )}
                        $
                      </strong>

                      <span>
                        SELECCIONAR →
                      </span>

                    </div>

                  </button>

                );
              }
            )}

          </div>


          {/* =========================
              NOTA
          ========================== */}

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


      {/* =========================
          DATOS DEL PEDIDO
      ========================== */}

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
                DELTA FORCE
              </span>

              <strong>
                {selectedOffer.name}
              </strong>

            </div>

            <div className="selected-order-price">
              {selectedOffer.price.toFixed(
                2
              )}
              $
            </div>

          </div>


          {/* =========================
              NOTA AL SELECCIONAR
          ========================== */}

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


          {/* =========================
              CANTIDAD
          ========================== */}

          <div className="quantity-section">

            <span>
              CANTIDAD
            </span>

            <div className="quantity-control">

              <button
                type="button"
                onClick={
                  decreaseQuantity
                }
                aria-label="Disminuir cantidad"
              >
                −
              </button>

              <strong>
                {quantity}
              </strong>

              <button
                type="button"
                onClick={
                  increaseQuantity
                }
                aria-label="Aumentar cantidad"
              >
                +
              </button>

            </div>

          </div>


          {/* =========================
              FORMULARIO
          ========================== */}

          <form
            onSubmit={
              handleFinishPurchase
            }
            className="order-form"
          >

            <label
              htmlFor="delta-force-player-id"
              className="player-id-label"
            >
              PONGA SU ID
            </label>

            <p className="player-id-description">
              Introduzca el ID de la cuenta
              de Delta Force donde desea
              recibir la compra.
            </p>


            <div className="player-id-input-wrapper">

              <span>
                🆔
              </span>

              <input
                id="delta-force-player-id"
                type="text"
                inputMode="numeric"
                value={playerId}
                onChange={(
                  event
                ) =>
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

              <span>
                PRECIO TOTAL
              </span>

              <strong>
                {total.toFixed(2)}$
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


      {/* =========================
          CONFIRMACIÓN
      ========================== */}

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
                Usted va a realizar
                una compra de Delta
                Force.
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
                  CANTIDAD
                </span>

                <strong>
                  {quantity}
                </strong>

              </div>


              <div className="confirmation-row">

                <span>
                  PRECIO UNITARIO
                </span>

                <strong>
                  {selectedOffer.price.toFixed(
                    2
                  )}
                  $
                </strong>

              </div>


              <div className="confirmation-row">

                <span>
                  PRECIO TOTAL
                </span>

                <strong>
                  {total.toFixed(2)}$
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


              <p className="confirmation-warning">
                Revise cuidadosamente los
                datos antes de finalizar la
                compra.
              </p>


              <button
                type="button"
                className="confirm-final-button"
                onClick={
                  createOrder
                }
              >
                FINALIZAR
              </button>

            </div>

          </section>

        )}


      {/* =========================
          ORDEN CREADA
      ========================== */}

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
            Su orden ha sido creada
            correctamente.
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
            onClick={
              goToOrders
            }
          >
            VER MIS ÓRDENES

            <span>
              →
            </span>

          </button>

        </section>

      )}


      {/* =========================
          INFORMACIÓN DEL SERVICIO
      ========================== */}

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
              Procesamos tus pedidos
              rápidamente.
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
              Tu pedido queda
              registrado.
            </p>

          </div>

        </div>


        <div className="service-info-item">

          <span>
            🎮
          </span>

          <div>

            <strong>
              DELTA FORCE
            </strong>

            <p>
              Monedas y pases
              directamente a tu cuenta.
            </p>

          </div>

        </div>

      </section>


      {/* =========================
          FOOTER
      ========================== */}

      <footer className="game-service-footer">

        <strong>
          🛒STORE GAMING🎮
        </strong>

        <span>
          DELTA FORCE TOP UP
        </span>

      </footer>

    </main>
  );
    }
