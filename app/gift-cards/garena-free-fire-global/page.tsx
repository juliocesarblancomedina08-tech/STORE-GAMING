"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type GiftCardOffer = {
  id: string;
  diamonds: number;
  price: number;
  stock?: number;
};

const offers: GiftCardOffer[] = [
  {
    id: "ff-global-1",
    diamonds: 110,
    price: 1.0,
    stock: 100,
  },
  {
    id: "ff-global-2",
    diamonds: 231,
    price: 2.0,
  },
  {
    id: "ff-global-5",
    diamonds: 583,
    price: 5.0,
  },
  {
    id: "ff-global-10",
    diamonds: 1188,
    price: 10.0,
  },
  {
    id: "ff-global-20",
    diamonds: 2420,
    price: 20.0,
  },
];

export default function GarenaFreeFireGlobalGiftCardPage() {
  const router = useRouter();

  const [selectedOffer, setSelectedOffer] =
    useState<GiftCardOffer | null>(null);

  const [quantity, setQuantity] = useState(1);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [orderCreated, setOrderCreated] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");

  const selectOffer = (offer: GiftCardOffer) => {
    setSelectedOffer(offer);
    setQuantity(1);
    setShowConfirmation(false);

    setTimeout(() => {
      document
        .getElementById("gift-card-order")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 100);
  };

  const increaseQuantity = () => {
    if (!selectedOffer) return;

    const maxStock = selectedOffer.stock ?? 99;

    if (quantity < maxStock) {
      setQuantity((current) => current + 1);
    }
  };

  const decreaseQuantity = () => {
    setQuantity((current) => Math.max(1, current - 1));
  };

  const total = selectedOffer
    ? selectedOffer.price * quantity
    : 0;

  const continueOrder = () => {
    if (!selectedOffer) return;

    setShowConfirmation(true);

    setTimeout(() => {
      document
        .getElementById("gift-card-confirmation")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 100);
  };

  const createOrder = () => {
    if (!selectedOffer) return;

    const orderId = `GC-${Date.now()
      .toString()
      .slice(-8)}`;

    const newOrder = {
      id: orderId,
      type: "GIFT CARD",
      game: "GARENA FREE FIRE (GLOBAL)",
      diamonds: selectedOffer.diamonds,
      price: selectedOffer.price,
      quantity,
      total,
      status: "PENDIENTE",
      createdAt: new Date().toISOString(),
    };

    try {
      const existingOrders = JSON.parse(
        localStorage.getItem("storeGamingOrders") || "[]"
      );

      localStorage.setItem(
        "storeGamingOrders",
        JSON.stringify([
          ...existingOrders,
          newOrder,
        ])
      );

      localStorage.setItem(
        "storeGamingLastOrder",
        JSON.stringify(newOrder)
      );
    } catch (error) {
      console.error(
        "Error guardando el pedido:",
        error
      );
    }

    setOrderNumber(orderId);
    setShowConfirmation(false);
    setOrderCreated(true);

    setTimeout(() => {
      document
        .getElementById("gift-card-success")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 100);
  };

  if (orderCreated && selectedOffer) {
    return (
      <main className="game-service-page gift-card-service-page">
        <header className="game-service-header">
          <button
            className="game-back-button"
            onClick={() => router.push("/gift-cards")}
            aria-label="Volver"
          >
            ←
          </button>

          <div className="game-header-title">
            <span>STORE</span>
            <strong>GIFT CARD</strong>
          </div>

          <button
            className="game-cart-button"
            onClick={() => router.push("/orders")}
            aria-label="Pedidos"
          >
            🛒
          </button>
        </header>

        <section
          id="gift-card-success"
          className="order-success-section gift-card-success-section"
        >
          <div className="order-success-icon">
            ✓
          </div>

          <h1>PEDIDO CREADO</h1>

          <p className="order-success-message">
            Tu pedido de tarjeta de regalo fue
            creado correctamente.
          </p>

          <div className="selected-order-card">
            <div className="selected-order-game">
              GARENA FREE FIRE (GLOBAL)
            </div>

            <div className="selected-order-offer">
              {selectedOffer.diamonds} 💎
            </div>

            <div className="selected-order-quantity">
              Cantidad:{" "}
              <strong>{quantity}</strong>
            </div>

            <div className="selected-order-price">
              Precio unitario:{" "}
              <strong>
                ${selectedOffer.price.toFixed(2)}
              </strong>
            </div>

            <div className="selected-order-total">
              Total:{" "}
              <strong>
                ${total.toFixed(2)}
              </strong>
            </div>

            <div className="selected-order-number">
              Pedido:{" "}
              <strong>{orderNumber}</strong>
            </div>
          </div>

          <div className="game-note">
            <div className="game-note-icon">
              !
            </div>

            <div className="game-note-content">
              <strong>IMPORTANTE</strong>

              <p>
                Las tarjetas de regalo son códigos
                digitales. Una vez confirmado y
                procesado el pedido, el código será
                entregado según el método de entrega
                disponible.
              </p>
            </div>
          </div>

          <button
            className="finish-order-button"
            onClick={() => router.push("/orders")}
          >
            VER MIS PEDIDOS
          </button>

          <button
            className="game-back-button-bottom"
            onClick={() =>
              router.push("/gift-cards")
            }
          >
            VOLVER A TARJETAS
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="game-service-page gift-card-service-page">
      <header className="game-service-header">
        <button
          className="game-back-button"
          onClick={() => router.push("/gift-cards")}
          aria-label="Volver"
        >
          ←
        </button>

        <div className="game-header-title">
          <span>STORE</span>
          <strong>GIFT CARD</strong>
        </div>

        <button
          className="game-cart-button"
          onClick={() => router.push("/orders")}
          aria-label="Pedidos"
        >
          🛒
        </button>
      </header>

      <section className="game-service-hero">
        <div className="free-fire-main-image">
          <img
            src="/images/gift-cards/gift-garena-free-fire-global.jpg"
            alt="Garena Free Fire Global"
          />
        </div>

        <h1>
          GARENA FREE FIRE (GLOBAL)
        </h1>

        <p>
          Compra tarjetas de regalo de Garena
          Free Fire Global.
        </p>
      </section>

      <section className="game-note gift-card-main-note">
        <div className="game-note-icon">
          !
        </div>

        <div className="game-note-content">
          <strong>
            INFORMACIÓN DEL PRODUCTO
          </strong>

          <p>
            Tarjetas de regalo digitales de
            Garena Free Fire Global.
            Selecciona la cantidad de diamantes
            que deseas comprar.
          </p>

          <p>
            Los productos están sujetos a
            disponibilidad.
          </p>
        </div>
      </section>

      <section className="offers-section">
        <div className="offers-toggle">
          <span>🎁</span>

          <strong>
            SELECCIONA TU TARJETA
          </strong>
        </div>

        <div className="offers-list">
          {offers.map((offer) => (
            <button
              key={offer.id}
              className={`offer-card ${
                selectedOffer?.id === offer.id
                  ? "selected"
                  : ""
              }`}
              onClick={() =>
                selectOffer(offer)
              }
            >
              <div className="diamond-icon">
                💎
              </div>

              <div className="offer-info">
                <strong>
                  {offer.diamonds} 💎
                </strong>

                {offer.stock !== undefined && (
                  <small>
                    {offer.stock} unidades en
                    stock
                  </small>
                )}
              </div>

              <div className="offer-right">
                <strong>
                  ${offer.price.toFixed(2)}
                </strong>

                <span>
                  {selectedOffer?.id ===
                  offer.id
                    ? "✓"
                    : "›"}
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {selectedOffer && (
        <section
          id="gift-card-order"
          className="order-section gift-card-order-section"
        >
          <div className="game-note game-note-order">
            <div className="game-note-icon">
              !
            </div>

            <div className="game-note-content">
              <strong>
                PRODUCTO SELECCIONADO
              </strong>

              <p>
                Has seleccionado{" "}
                <strong>
                  {selectedOffer.diamonds} 💎
                </strong>
                .
              </p>

              <p>
                Esta tarjeta corresponde a
                Garena Free Fire Global.
              </p>
            </div>
          </div>

          <div className="selected-order-card">
            <div className="selected-order-game">
              GARENA FREE FIRE (GLOBAL)
            </div>

            <div className="selected-order-offer">
              {selectedOffer.diamonds} 💎
            </div>

            <div className="quantity-control">
              <button
                type="button"
                onClick={decreaseQuantity}
                disabled={quantity <= 1}
              >
                −
              </button>

              <span>{quantity}</span>

              <button
                type="button"
                onClick={increaseQuantity}
                disabled={
                  selectedOffer.stock !==
                    undefined &&
                  quantity >=
                    selectedOffer.stock
                }
              >
                +
              </button>
            </div>

            <div className="selected-order-price">
              Precio unitario:{" "}
              <strong>
                $
                {selectedOffer.price.toFixed(
                  2
                )}
              </strong>
            </div>

            <div className="selected-order-total">
              Total:{" "}
              <strong>
                ${total.toFixed(2)}
              </strong>
            </div>
          </div>

          <button
            className="finish-order-button"
            onClick={continueOrder}
          >
            CONTINUAR
          </button>
        </section>
      )}

      {showConfirmation && selectedOffer && (
        <section
          id="gift-card-confirmation"
          className="confirmation-section gift-card-confirmation-section"
        >
          <div className="game-note">
            <div className="game-note-icon">
              !
            </div>

            <div className="game-note-content">
              <strong>
                REVISA TU PEDIDO
              </strong>

              <p>
                Verifica que la cantidad de
                diamantes y el número de tarjetas
                sean correctos antes de continuar.
              </p>
            </div>
          </div>

          <div className="selected-order-card confirmation-card">
            <h2>CONFIRMACIÓN</h2>

            <div className="confirmation-row">
              <span>Producto</span>

              <strong>
                GARENA FREE FIRE (GLOBAL)
              </strong>
            </div>

            <div className="confirmation-row">
              <span>Diamantes</span>

              <strong>
                {selectedOffer.diamonds} 💎
              </strong>
            </div>

            <div className="confirmation-row">
              <span>Cantidad</span>

              <strong>
                {quantity}
              </strong>
            </div>

            <div className="confirmation-row">
              <span>Precio unitario</span>

              <strong>
                ${selectedOffer.price.toFixed(
                  2
                )}
              </strong>
            </div>

            <div className="confirmation-row confirmation-total">
              <span>TOTAL</span>

              <strong>
                ${total.toFixed(2)}
              </strong>
            </div>
          </div>

          <button
            className="confirm-final-button"
            onClick={createOrder}
          >
            CONFIRMAR PEDIDO
          </button>

          <button
            className="game-back-button-bottom"
            onClick={() =>
              setShowConfirmation(false)
            }
          >
            ← VOLVER
          </button>
        </section>
      )}

      <footer className="game-service-footer gift-card-footer">
        <p>STORE GAMING</p>

        <span>
          Tarjetas digitales · Entrega rápida
        </span>
      </footer>
    </main>
  );
    }
