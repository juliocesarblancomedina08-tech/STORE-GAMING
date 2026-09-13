"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type GiftCardOffer = {
  id: string;
  robux: number;
  price: number;
  stock?: number;
};

const offers: GiftCardOffer[] = [
  {
    id: "roblox-global-50",
    robux: 50,
    price: 1.02,
    stock: 100,
  },
  {
    id: "roblox-global-100",
    robux: 100,
    price: 1.73,
  },
  {
    id: "roblox-global-800",
    robux: 800,
    price: 9.22,
  },
  {
    id: "roblox-global-1000",
    robux: 1000,
    price: 11.51,
  },
  {
    id: "roblox-global-2000",
    robux: 2000,
    price: 22.04,
  },
  {
    id: "roblox-global-2500",
    robux: 2500,
    price: 29.76,
  },
  {
    id: "roblox-global-3000",
    robux: 3000,
    price: 37.05,
  },
  {
    id: "roblox-global-4500",
    robux: 4500,
    price: 48.35,
  },
  {
    id: "roblox-global-10000",
    robux: 10000,
    price: 99.55,
  },
];

const productNote =
  "Región: Global. Tarjetas de regalo Robux de Roblox. Los códigos se pueden canjear en todo el mundo y se almacenan de forma segura para su uso posterior.";

export default function RobloxGlobalGiftCardPage() {
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
      game: "ROBLOX (GLOBAL)",
      robux: selectedOffer.robux,
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
              ROBLOX (GLOBAL)
            </div>

            <div className="selected-order-offer">
              {selectedOffer.robux} ROBUX
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

              <p>{productNote}</p>
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
            src="/images/gift-cards/gift-roblox-global.jpg"
            alt="Roblox Global Gift Card"
          />
        </div>

        <h1>ROBLOX (GLOBAL)</h1>

        <p>
          Compra tarjetas de regalo Robux de
          Roblox Global.
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

          <p>{productNote}</p>
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
                🪙
              </div>

              <div className="offer-info">
                <strong>
                  {offer.robux} ROBUX
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
                  {selectedOffer.robux} ROBUX
                </strong>
                .
              </p>

              <p>
                Tarjeta de regalo Roblox
                Global.
              </p>
            </div>
          </div>

          <div className="selected-order-card">
            <div className="selected-order-game">
              ROBLOX (GLOBAL)
            </div>

            <div className="selected-order-offer">
              {selectedOffer.robux} ROBUX
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
                Robux y el número de tarjetas
                sean correctos antes de continuar.
              </p>
            </div>
          </div>

          <div className="selected-order-card confirmation-card">
            <h2>CONFIRMACIÓN</h2>

            <div className="confirmation-row">
              <span>Producto</span>

              <strong>
                ROBLOX (GLOBAL)
              </strong>
            </div>

            <div className="confirmation-row">
              <span>Robux</span>

              <strong>
                {selectedOffer.robux} ROBUX
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
                $
                {selectedOffer.price.toFixed(
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
