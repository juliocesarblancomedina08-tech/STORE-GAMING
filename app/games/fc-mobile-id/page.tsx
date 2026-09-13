"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const offers = [
  {
    id: "fc-40",
    name: "40 PUNTOS FC / 39 PLATA",
    display: "40 PUNTOS FC",
    price: 0.45,
    icon: "⚽",
  },
  {
    id: "fc-100",
    name: "100 PUNTOS FC / 99 PLATA",
    display: "100 PUNTOS FC",
    price: 0.97,
    icon: "⚽",
  },
  {
    id: "fc-520",
    name: "520 PUNTOS FC / 499 PLATA",
    display: "520 PUNTOS FC",
    price: 4.36,
    icon: "⚽",
  },
  {
    id: "fc-1070",
    name: "1070 PUNTOS FC / 999 PLATA",
    display: "1070 PUNTOS FC",
    price: 8.67,
    icon: "⚽",
  },
  {
    id: "fc-2200",
    name: "2200 PUNTOS FC / 1999 PLATA",
    display: "2200 PUNTOS FC",
    price: 17.83,
    icon: "⚽",
  },
  {
    id: "fc-5750",
    name: "5750 PUNTOS FC / 4999 PLATA",
    display: "5750 PUNTOS FC",
    price: 43.17,
    icon: "⚽",
  },
  {
    id: "fc-12000",
    name: "12000 PUNTOS FC / 9999 PLATA",
    display: "12000 PUNTOS FC",
    price: 86.30,
    icon: "⚽",
  },
];

const gameNote =
  "Región: Indonesia. Recarga móvil de EA Sports FC. Introduce tu ID de jugador antes de realizar el pedido. Asegúrate de que tu cuenta de EA esté registrada en Indonesia; los códigos están restringidos por región. El producto seleccionado se entregará directamente a tu cuenta una vez realizado el pedido.";

export default function FcMobileIdPage() {
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
    if (!selectedOffer) return;

    const generatedNumber =
      `FC-${Date.now().toString().slice(-8)}`;

    const total =
      selectedOffer.price * quantity;

    const order = {
      id: generatedNumber,
      game: "FC MOBILE (ID)",
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
            FC MOBILE (ID)
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


      <section className="free-fire-main-image">

        <img
          src="/images/fc-mobile.jpg"
          alt="FC Mobile"
        />

        <div className="free-fire-main-overlay" />

        <div className="free-fire-main-text">

          <span>
            ⚡ TOP UP
          </span>

          <h1>
            FC
            <strong>
              MOBILE
            </strong>
          </h1>

          <p>
            Puntos FC y plata
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
                FC MOBILE (ID)
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
                FC MOBILE (ID)
              </span>

              <strong>
                {selectedOffer.name}
              </strong>

            </div>

            <div className="selected-order-price">
              {selectedOffer.price.toFixed(2)}$
            </div>

          </div>


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


          <form
            onSubmit={handleFinishPurchase}
            className="order-form"
          >

            <label
              htmlFor="fc-mobile-player-id"
              className="player-id-label"
            >
              PONGA SU ID
            </label>

            <p className="player-id-description">
              Introduzca el ID de la cuenta
              de FC Mobile donde desea
              recibir la compra.
            </p>


            <div className="player-id-input-wrapper">

              <span>
                🆔
              </span>

              <input
                id="fc-mobile-player-id"
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
                compra de FC Mobile.
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
              FC MOBILE (ID)
            </strong>

            <p>
              Puntos FC y plata directamente
              a tu cuenta.
            </p>

          </div>

        </div>

      </section>


      <footer className="game-service-footer">

        <strong>
          🛒STORE GAMING🎮
        </strong>

        <span>
          FC MOBILE (ID) TOP UP
        </span>

      </footer>

    </main>
  );
      }
