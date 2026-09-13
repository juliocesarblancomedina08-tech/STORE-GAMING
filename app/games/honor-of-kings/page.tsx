"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const offers = [
  {
    id: "hok-16",
    name: "16 FICHAS",
    display: "16 FICHAS",
    price: 0.27,
    icon: "🪙",
  },
  {
    id: "hok-lucky-double",
    name: "BOLSA DE LA SUERTE CON DOBLE FICHA",
    display: "BOLSA DE LA SUERTE",
    price: 0.36,
    icon: "🎁",
  },
  {
    id: "hok-honor-value",
    name: "PAQUETE DE VALOR DE PUNTOS DE HONOR",
    display: "PAQUETE DE HONOR",
    price: 0.36,
    icon: "🏆",
  },
  {
    id: "hok-standard-refund",
    name: "PAQUETE DE REEMBOLSO POR COMPRA ESTÁNDAR",
    display: "REEMBOLSO ESTÁNDAR",
    price: 0.43,
    icon: "🎁",
  },
  {
    id: "hok-80",
    name: "80 FICHAS",
    display: "80 FICHAS",
    price: 0.95,
    icon: "🪙",
  },
  {
    id: "hok-weekly",
    name: "TARJETA SEMANAL",
    display: "TARJETA SEMANAL",
    price: 1.07,
    icon: "🎟️",
  },
  {
    id: "hok-premium-refund",
    name: "PAQUETE DE REEMBOLSO POR COMPRA PREMIUM",
    display: "REEMBOLSO PREMIUM",
    price: 1.29,
    icon: "🎁",
  },
  {
    id: "hok-240",
    name: "240 FICHAS",
    display: "240 FICHAS",
    price: 2.63,
    icon: "🪙",
  },
  {
    id: "hok-weekly-plus",
    name: "TARJETA SEMANAL PLUS",
    display: "TARJETA SEMANAL PLUS",
    price: 2.95,
    icon: "🎟️",
  },
  {
    id: "hok-400",
    name: "400 FICHAS",
    display: "400 FICHAS",
    price: 4.32,
    icon: "🪙",
  },
  {
    id: "hok-560",
    name: "560 FICHAS",
    display: "560 FICHAS",
    price: 6.01,
    icon: "🪙",
  },
  {
    id: "hok-830",
    name: "830 FICHAS",
    display: "830 FICHAS",
    price: 8.54,
    icon: "🪙",
  },
  {
    id: "hok-1245",
    name: "1245 FICHAS",
    display: "1245 FICHAS",
    price: 12.76,
    icon: "🪙",
  },
  {
    id: "hok-2508",
    name: "2508 TOKENS",
    display: "2508 TOKENS",
    price: 25.44,
    icon: "🪙",
  },
  {
    id: "hok-4180",
    name: "4180 TOKENS",
    display: "4180 TOKENS",
    price: 42.33,
    icon: "🪙",
  },
  {
    id: "hok-8360",
    name: "8360 TOKENS",
    display: "8360 TOKENS",
    price: 84.57,
    icon: "🪙",
  },
];

const gameNote =
  "Recarga Honor of Kings. Introduce tu ID de jugador antes de realizar el pedido. El producto seleccionado se entregará directamente en tu cuenta una vez realizado el pedido.";

export default function HonorOfKingsPage() {
  const router = useRouter();

  const [showOffers, setShowOffers] = useState(false);

  const [selectedOffer, setSelectedOffer] =
    useState<(typeof offers)[number] | null>(null);

  const [playerId, setPlayerId] = useState("");

  const [quantity, setQuantity] = useState(1);

  const [error, setError] = useState("");

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
      `HOK-${Date.now().toString().slice(-8)}`;

    const total =
      selectedOffer.price * quantity;

    const order = {
      id: generatedNumber,
      game: "HONOR OF KINGS",
      product: selectedOffer.name,
      displayProduct: selectedOffer.display,
      price: total,
      unitPrice: selectedOffer.price,
      quantity,
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

  const total = selectedOffer
    ? selectedOffer.price * quantity
    : 0;

  return (
    <main className="game-service-page">

      <header className="game-service-header">

        <button
          type="button"
          className="game-back-button"
          onClick={() => router.push("/top-up")}
        >
          ←
        </button>

        <div className="game-header-title">

          <span>
            STORE GAMING
          </span>

          <strong>
            HONOR OF KINGS
          </strong>

        </div>

        <button
          type="button"
          className="game-cart-button"
          onClick={() => router.push("/cart")}
        >
          🛒
        </button>

      </header>


      {/* =========================
          IMAGEN PRINCIPAL
      ========================== */}

      <section className="free-fire-main-image">

        <img
          src="/images/honor-of-kings.jpg"
          alt="Honor of Kings"
        />

        <div className="free-fire-main-overlay" />

        <div className="free-fire-main-text">

          <span>
            ⚡ TOP UP
          </span>

          <h1>
            HONOR
            <strong>
              OF KINGS
            </strong>
          </h1>

          <p>
            Fichas, tokens y tarjetas
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


      {/* =========================
          OFERTAS
      ========================== */}

      {showOffers && (

        <section className="offers-section">

          <div className="offers-heading">

            <div>

              <span>
                HONOR OF KINGS
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
                    selected
                      ? "selected"
                      : ""
                  }`}
                  onClick={() =>
                    selectOffer(offer)
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
                HONOR OF KINGS
              </span>

              <strong>
                {selectedOffer.name}
              </strong>

            </div>

            <div className="selected-order-price">
              {selectedOffer.price.toFixed(2)}$
            </div>

          </div>


          {/* =========================
              NOTA
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
                onClick={decreaseQuantity}
              >
                −
              </button>

              <strong>
                {quantity}
              </strong>

              <button
                type="button"
                onClick={increaseQuantity}
              >
                +
              </button>

            </div>

          </div>


          {/* =========================
              ID
          ========================== */}

          <form
            onSubmit={handleFinishPurchase}
            className="order-form"
          >

            <label
              htmlFor="honor-player-id"
              className="player-id-label"
            >
              PONGA SU ID
            </label>

            <p className="player-id-description">
              Introduzca el ID de la cuenta
              de Honor of Kings donde desea
              recibir la compra.
            </p>


            <div className="player-id-input-wrapper">

              <span>
                🆔
              </span>

              <input
                id="honor-player-id"
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
                Usted va a realizar una
                compra de Honor of Kings.
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
                  {selectedOffer.price.toFixed(2)}$
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
                onClick={createOrder}
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
            onClick={goToOrders}
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
              HONOR OF KINGS
            </strong>

            <p>
              Fichas, tokens y tarjetas
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
          HONOR OF KINGS TOP UP
        </span>

      </footer>

    </main>
  );
    }
