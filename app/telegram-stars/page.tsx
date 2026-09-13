"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Offer = {
  name: string;
  price: string;
};

const starsOffers: Offer[] = [
  { name: "50⭐", price: "0.80$" },
  { name: "100⭐", price: "1.57$" },
  { name: "200⭐", price: "3.10$" },
  { name: "250⭐", price: "3.88$" },
  { name: "500⭐", price: "7.74$" },
  { name: "750⭐", price: "11.57$" },
  { name: "1000⭐", price: "15.42$" },
  { name: "1500⭐", price: "23.12$" },
  { name: "2000⭐", price: "30.90$" },
  { name: "3000⭐", price: "46.20$" },
  { name: "5000⭐", price: "77.00$" },
  { name: "10000⭐", price: "154.00$" },
];

const premiumOffers: Offer[] = [
  {
    name: "3 MESES",
    price: "12.40$",
  },
  {
    name: "6 MESES",
    price: "16.60$",
  },
  {
    name: "1 AÑO",
    price: "30.00$",
  },
];

export default function TelegramStarsPage() {
  const router = useRouter();

  const [section, setSection] = useState<
    "stars" | "premium"
  >("stars");

  const [selectedOffer, setSelectedOffer] =
    useState<Offer | null>(null);

  const [telegramUsername, setTelegramUsername] =
    useState("");

  const [showConfirmation, setShowConfirmation] =
    useState(false);

  const [orderCreated, setOrderCreated] =
    useState(false);

  const [orderNumber, setOrderNumber] =
    useState("");

  const offers =
    section === "stars"
      ? starsOffers
      : premiumOffers;


  /*
   * =========================
   * SELECCIONAR OFERTA
   * =========================
   */

  function selectOffer(offer: Offer) {
    setSelectedOffer(offer);
    setTelegramUsername("");
    setShowConfirmation(false);
    setOrderCreated(false);

    setTimeout(() => {
      document
        .getElementById("telegram-order-section")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 50);
  }


  /*
   * =========================
   * VALIDAR USUARIO TELEGRAM
   * =========================
   */

  function isValidTelegramUsername(
    username: string
  ) {
    const clean = username.trim();

    if (!clean) {
      return false;
    }

    if (!clean.startsWith("@")) {
      return false;
    }

    const usernameWithoutAt =
      clean.substring(1);

    return /^[A-Za-z0-9_]{5,32}$/.test(
      usernameWithoutAt
    );
  }


  /*
   * =========================
   * CONTINUAR
   * =========================
   */

  function finishOrder() {
    const username =
      telegramUsername.trim();

    if (!isValidTelegramUsername(username)) {
      alert(
        "Introduce un @usuario de Telegram válido. Ejemplo: @usuario"
      );
      return;
    }

    if (!selectedOffer) {
      return;
    }

    setTelegramUsername(
      username.startsWith("@")
        ? username
        : `@${username}`
    );

    setShowConfirmation(true);

    setTimeout(() => {
      document
        .getElementById(
          "telegram-confirmation-section"
        )
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 50);
  }


  /*
   * =========================
   * CREAR ORDEN
   * =========================
   */

  function createOrder() {
    if (!selectedOffer) {
      return;
    }

    const cleanUsername =
      telegramUsername.trim();

    const newOrderNumber =
      `TG-${Date.now()
        .toString()
        .slice(-8)}`;

    const newOrder = {
      id: Date.now().toString(),

      orderNumber: newOrderNumber,

      type:
        section === "stars"
          ? "TELEGRAM STARS"
          : "TELEGRAM PREMIUM",

      game: "TELEGRAM",

      product:
        section === "stars"
          ? selectedOffer.name
          : `Telegram Premium - ${selectedOffer.name}`,

      displayProduct:
        section === "stars"
          ? `${selectedOffer.name} Telegram`
          : `Telegram Premium ${selectedOffer.name}`,

      price: Number(
        selectedOffer.price
          .replace("$", "")
      ),

      total: Number(
        selectedOffer.price
          .replace("$", "")
      ),

      telegramUsername:
        cleanUsername,

      username:
        cleanUsername,

      status: "PENDIENTE",

      date: new Date().toISOString(),

      createdAt:
        new Date().toISOString(),
    };


    /*
     * GUARDAR PEDIDO
     */

    try {
      const saved =
        localStorage.getItem(
          "storeGamingOrders"
        );

      const orders = saved
        ? JSON.parse(saved)
        : [];

      const updatedOrders = [
        newOrder,
        ...(Array.isArray(orders)
          ? orders
          : []),
      ];

      localStorage.setItem(
        "storeGamingOrders",
        JSON.stringify(
          updatedOrders
        )
      );

      localStorage.setItem(
        "storeGamingLastOrder",
        JSON.stringify(
          newOrder
        )
      );
    } catch {
      console.error(
        "No se pudo guardar la orden."
      );
    }


    setOrderNumber(
      newOrderNumber
    );

    setShowConfirmation(false);
    setOrderCreated(true);

    setTimeout(() => {
      document
        .getElementById(
          "telegram-success-section"
        )
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 50);
  }


  /*
   * =========================
   * VOLVER A OFERTAS
   * =========================
   */

  function resetOrder() {
    setSelectedOffer(null);
    setTelegramUsername("");
    setShowConfirmation(false);
    setOrderCreated(false);
    setOrderNumber("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }


  return (
    <main className="telegram-stars-page">


      {/* =========================
          HEADER
      ========================== */}

      <header className="telegram-stars-header">

        <button
          className="back-button"
          onClick={() =>
            router.push("/home")
          }
        >
          ← Volver
        </button>

        <h1 className="telegram-stars-title">
          TELEGRAM STARS
        </h1>

        <button
          className="telegram-cart-button"
          onClick={() =>
            router.push("/cart")
          }
          aria-label="Carrito"
        >
          🛒
        </button>

      </header>


      {/* =========================
          TABS
      ========================== */}

      {!orderCreated && (

        <div className="telegram-tabs">

          <button
            className={
              section === "stars"
                ? "telegram-tab active"
                : "telegram-tab"
            }
            onClick={() => {
              setSection("stars");
              setSelectedOffer(null);
              setShowConfirmation(false);
            }}
          >
            ⭐ Estrellas Telegram
          </button>


          <button
            className={
              section === "premium"
                ? "telegram-tab active"
                : "telegram-tab"
            }
            onClick={() => {
              setSection("premium");
              setSelectedOffer(null);
              setShowConfirmation(false);
            }}
          >
            ⭐ Telegram Premium
          </button>

        </div>

      )}


      {/* =========================
          OFERTAS
      ========================== */}

      {!selectedOffer &&
        !orderCreated && (

        <section className="telegram-offers">

          {offers.map((offer) => (

            <button
              key={offer.name}
              type="button"
              className="telegram-offer-card"
              onClick={() =>
                selectOffer(offer)
              }
            >

              <span className="offer-price">
                {offer.price}
              </span>


              <h2>

                {section === "stars"
                  ? offer.name
                  : "Telegram Premium"}

              </h2>


              {section === "premium" && (

                <p>
                  {offer.name}
                </p>

              )}


              <span className="telegram-offer-arrow">
                →
              </span>

            </button>

          ))}

        </section>

      )}


      {/* =========================
          PEDIDO
      ========================== */}

      {selectedOffer &&
        !showConfirmation &&
        !orderCreated && (

        <section
          id="telegram-order-section"
          className="telegram-order-section"
        >

          <div className="telegram-selected-order">

            <span className="telegram-order-icon">
              {section === "stars"
                ? "⭐"
                : "👑"}
            </span>


            <div>

              <small>
                OFERTA SELECCIONADA
              </small>

              <h2>

                {section === "stars"
                  ? selectedOffer.name
                  : `Telegram Premium ${selectedOffer.name}`}

              </h2>

              <strong>
                {selectedOffer.price}
              </strong>

            </div>

          </div>


          {/* USUARIO */}

          <div className="telegram-username-box">

            <label htmlFor="telegram-username">
              @USUARIO DE TELEGRAM
            </label>

            <p>
              Introduce el @usuario que recibirá
              {section === "stars"
                ? " las estrellas."
                : " Telegram Premium."}
            </p>


            <div className="telegram-username-input-wrapper">

              <span>
                @
              </span>

              <input
                id="telegram-username"
                type="text"
                value={
                  telegramUsername
                    .replace(/^@/, "")
                }
                onChange={(event) => {
                  const value =
                    event.target.value
                      .replace(/\s/g, "");

                  setTelegramUsername(
                    value
                      ? `@${value}`
                      : ""
                  );
                }}
                placeholder="usuario"
                autoComplete="off"
                maxLength={33}
              />

            </div>


            <small className="telegram-username-help">
              Ejemplo: @usuario
            </small>

          </div>


          <button
            type="button"
            className="finish-order-button"
            onClick={finishOrder}
          >
            CONTINUAR
          </button>


          <button
            type="button"
            className="secondary-button"
            onClick={resetOrder}
          >
            ← CAMBIAR OFERTA
          </button>

        </section>

      )}


      {/* =========================
          CONFIRMACIÓN
      ========================== */}

      {showConfirmation &&
        selectedOffer &&
        !orderCreated && (

        <section
          id="telegram-confirmation-section"
          className="confirmation-section"
        >

          <div className="confirmation-card">

            <div className="confirmation-header">
              <span>
                🔎
              </span>

              <h2>
                CONFIRMA TU PEDIDO
              </h2>
            </div>


            <div className="confirmation-row">

              <span>
                Servicio
              </span>

              <strong>
                {section === "stars"
                  ? "Telegram Stars"
                  : "Telegram Premium"}
              </strong>

            </div>


            <div className="confirmation-row">

              <span>
                Producto
              </span>

              <strong>
                {section === "stars"
                  ? selectedOffer.name
                  : selectedOffer.name}
              </strong>

            </div>


            <div className="confirmation-row">

              <span>
                Usuario
              </span>

              <strong>
                {telegramUsername}
              </strong>

            </div>


            <div className="confirmation-row">

              <span>
                Precio
              </span>

              <strong>
                {selectedOffer.price}
              </strong>

            </div>


            <button
              type="button"
              className="confirm-final-button"
              onClick={createOrder}
            >
              CONFIRMAR PEDIDO
            </button>


            <button
              type="button"
              className="secondary-button"
              onClick={() =>
                setShowConfirmation(false)
              }
            >
              ← VOLVER
            </button>

          </div>

        </section>

      )}


      {/* =========================
          PEDIDO CREADO
      ========================== */}

      {orderCreated && (

        <section
          id="telegram-success-section"
          className="order-success-section"
        >

          <div className="success-icon">
            ✓
          </div>


          <h2>
            ¡PEDIDO CREADO!
          </h2>


          <p>
            Tu pedido ha sido registrado
            correctamente.
          </p>


          <div className="success-order-number">

            <span>
              NÚMERO DE PEDIDO
            </span>

            <strong>
              {orderNumber}
            </strong>

          </div>


          <div className="success-order-details">

            <div>
              <span>
                Servicio
              </span>

              <strong>
                {section === "stars"
                  ? "Telegram Stars"
                  : "Telegram Premium"}
              </strong>
            </div>


            <div>
              <span>
                Producto
              </span>

              <strong>
                {selectedOffer?.name}
              </strong>
            </div>


            <div>
              <span>
                Usuario
              </span>

              <strong>
                {telegramUsername}
              </strong>
            </div>


            <div>
              <span>
                Total
              </span>

              <strong>
                {selectedOffer?.price}
              </strong>
            </div>

          </div>


          <button
            type="button"
            className="finish-order-button"
            onClick={() =>
              router.push("/orders")
            }
          >
            VER MIS PEDIDOS
          </button>


          <button
            type="button"
            className="secondary-button"
            onClick={resetOrder}
          >
            HACER OTRO PEDIDO
          </button>

        </section>

      )}


      {/* =========================
          FOOTER
      ========================== */}

      <footer className="telegram-stars-footer">

        <strong>
          STORE GAMING
        </strong>

        <span>
          Telegram Stars & Premium
        </span>

      </footer>


    </main>
  );
}
