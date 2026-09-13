"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

const offers = [
  {
    id: "ff-110",
    name: "110 Diamonds",
    display: "110💎",
    price: 0.78,
    icon: "💎",
  },
  {
    id: "ff-341",
    name: "341 Diamonds",
    display: "341💎",
    price: 2.2,
    icon: "💎",
  },
  {
    id: "ff-572",
    name: "572 Diamonds",
    display: "572💎",
    price: 3.67,
    icon: "💎",
  },
  {
    id: "ff-1166",
    name: "1166 Diamonds",
    display: "1166💎",
    price: 6.73,
    icon: "💎",
  },
  {
    id: "ff-2398",
    name: "2398 Diamonds",
    display: "2398💎",
    price: 13.27,
    icon: "💎",
  },
  {
    id: "ff-6160",
    name: "6160 Diamonds",
    display: "6160💎",
    price: 33.7,
    icon: "💎",
  },
  {
    id: "ff-elite-pass",
    name: "Pase Elite",
    display: "PASE ELITE",
    price: 4,
    icon: "🎟️",
  },
  {
    id: "ff-weekly-membership",
    name: "Membresía semanal",
    display: "MEMBRESÍA SEMANAL",
    price: 2.3,
    icon: "⭐",
  },
  {
    id: "ff-monthly-membership",
    name: "Membresía mensual",
    display: "MEMBRESÍA MENSUAL",
    price: 10.72,
    icon: "⭐",
  },
];

const gameNote =
  "Región: LATAM Y N.A. Recarga automática de Free Fire. Los diamantes se entregan automáticamente después de realizar el pedido.";

export default function FreeFireLatamPage() {
  const router = useRouter();

  const [showOffers, setShowOffers] =
    useState(false);

  const [selectedOffer, setSelectedOffer] =
    useState<(typeof offers)[number] | null>(
      null
    );

  const [playerId, setPlayerId] =
    useState("");

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
        .getElementById(
          "confirmation-section"
        )
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 100);
  }

  async function createOrder() {
    if (!selectedOffer) {
      return;
    }

    /*
     * =========================
     * USUARIO AUTENTICADO
     * =========================
     */

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (
      sessionError ||
      !session?.user
    ) {
      setError(
        "Su sesión ha expirado. Inicie sesión nuevamente."
      );

      router.replace("/");

      return;
    }

    const user = session.user;

    const userEmail =
      user.email || "";

    const username =
      userEmail.split("@")[0] ||
      "usuario";

    /*
     * =========================
     * NÚMERO DE ORDEN
     * =========================
     */

    const generatedNumber =
      `FF-${Date.now()
        .toString()
        .slice(-8)}`;

    /*
     * =========================
     * CREAR ORDEN
     * =========================
     *
     * IMPORTANTE:
     * La orden queda asociada
     * al usuario autenticado.
     */

    const order = {
      id: generatedNumber,

      user_id: user.id,

      email: userEmail,

      username: username,

      game: "FREE FIRE LATAM",

      product:
        selectedOffer.name,

      displayProduct:
        selectedOffer.display,

      price:
        selectedOffer.price,

      playerId:
        playerId.trim(),

      status:
        "Pendiente",

      createdAt:
        new Date().toISOString(),
    };

    /*
     * =========================
     * GUARDAR ÓRDENES
     * =========================
     */

    const existingOrders =
      localStorage.getItem(
        "storeGamingOrders"
      );

    let orders: any[] = [];

    if (existingOrders) {
      try {
        const parsed =
          JSON.parse(existingOrders);

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

    /*
     * ÚLTIMA ORDEN
     */

    localStorage.setItem(
      "storeGamingLastOrder",
      JSON.stringify(order)
    );

    /*
     * =========================
     * MOSTRAR ÉXITO
     * =========================
     */

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

  return (
    <main className="game-service-page free-fire-page">

      <header className="game-service-header">

        <button
          type="button"
          className="game-back-button"
          onClick={() =>
            router.push("/home")
          }
        >
          ←
        </button>

        <div className="game-header-title">

          <span>
            STORE GAMING
          </span>

          <strong>
            FREE FIRE LATAM
          </strong>

        </div>

        <button
          type="button"
          className="game-cart-button"
          onClick={() =>
            router.push("/cart")
          }
        >
          🛒
        </button>

      </header>


      {/* =========================
          IMAGEN PRINCIPAL
      ========================== */}

      <section className="free-fire-main-image">

        <img
          src="/images/free-fire-latam.jpg"
          alt="Free Fire LATAM"
        />

        <div className="free-fire-main-overlay" />

        <div className="free-fire-main-text">

          <span>
            ⚡ TOP UP
          </span>

          <h1>
            FREE FIRE
            <strong>
              LATAM
            </strong>
          </h1>

          <p>
            Diamantes, pases y membresías
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
                FREE FIRE LATAM
              </span>

              <h2>
                ELIGE TU OFERTA
              </h2>

            </div>

          </div>


          <div className="offers-list">

            {offers.map((offer) => {

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
                FREE FIRE LATAM
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
              NOTA AL SELECCIONAR OFERTA
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


          <form
            onSubmit={
              handleFinishPurchase
            }
            className="order-form"
          >

            <label
              htmlFor="free-fire-player-id"
              className="player-id-label"
            >
              PONGA SU ID
            </label>

            <p className="player-id-description">
              Introduzca el ID de la cuenta
              donde desea recibir la compra.
            </p>

            <div className="player-id-input-wrapper">

              <span>
                🆔
              </span>

              <input
                id="free-fire-player-id"
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
                PRECIO
              </span>

              <strong>

                {selectedOffer.price.toFixed(
                  2
                )}
                $

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
                compra de Free Fire
                Diamonds
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
                  {selectedOffer.price.toFixed(
                    2
                  )}
                  $
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
              FREE FIRE LATAM
            </strong>

            <p>
              Diamantes, pases y
              membresías.
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
          FREE FIRE LATAM TOP UP
        </span>

      </footer>

    </main>
  );
        }
