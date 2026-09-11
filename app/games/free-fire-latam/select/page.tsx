"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function FreeFireSelectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const diamonds =
    searchParams.get("diamonds") || "110💎";

  const priceText =
    searchParams.get("price") || "0.78$";

  const basePrice = Number(
    priceText.replace("$", "")
  ) || 0.78;

  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const total = useMemo(() => {
    return basePrice * quantity;
  }, [basePrice, quantity]);

  function decreaseQuantity() {
    setQuantity((current) =>
      Math.max(1, current - 1)
    );
  }

  function increaseQuantity() {
    setQuantity((current) => current + 1);
  }

  function addToCart() {
    const existingCart = localStorage.getItem(
      "storeGamingCart"
    );

    let cart: any[] = [];

    if (existingCart) {
      try {
        const parsed = JSON.parse(existingCart);

        if (Array.isArray(parsed)) {
          cart = parsed;
        }
      } catch {
        cart = [];
      }
    }

    const newItem = {
      id: `free-fire-${diamonds.replace(
        /[^0-9]/g,
        ""
      )}`,
      game: "FREE FIRE LATAM",
      diamonds,
      price: basePrice,
      quantity,
      total,
      image: "/images/free-fire-latam.jpg",
    };

    const existingIndex = cart.findIndex(
      (item) =>
        item.id === newItem.id
    );

    if (existingIndex !== -1) {
      cart[existingIndex] = {
        ...cart[existingIndex],
        quantity:
          cart[existingIndex].quantity +
          quantity,
        total:
          (cart[existingIndex].quantity +
            quantity) *
          basePrice,
      };
    } else {
      cart.push(newItem);
    }

    localStorage.setItem(
      "storeGamingCart",
      JSON.stringify(cart)
    );

    setAdded(true);

    setTimeout(() => {
      setAdded(false);
    }, 2500);
  }

  return (
    <main className="select-page">
      <header className="select-header">
        <button
          type="button"
          className="select-back"
          onClick={() =>
            router.push(
              "/games/free-fire-latam"
            )
          }
        >
          ←
        </button>

        <div className="select-header-title">
          <span>FREE FIRE LATAM</span>
          <strong>RECARGA</strong>
        </div>

        <button
          type="button"
          className="select-cart"
          onClick={() =>
            router.push("/cart")
          }
        >
          🛒
        </button>
      </header>

      <section className="select-content">
        <div className="select-game-image">
          <img
            src="/images/free-fire-latam.jpg"
            alt="Free Fire LATAM"
          />

          <div className="select-image-overlay" />

          <div className="select-image-text">
            <span>TOP UP</span>
            <strong>
              FREE FIRE
            </strong>
          </div>
        </div>

        <div className="selected-offer">
          <span className="selected-label">
            OFERTA SELECCIONADA
          </span>

          <div className="selected-diamonds">
            💎 {diamonds}
          </div>

          <div className="selected-price">
            {priceText}
          </div>
        </div>

        <div className="quantity-section">
          <span className="quantity-label">
            CANTIDAD
          </span>

          <div className="quantity-control">
            <button
              type="button"
              onClick={decreaseQuantity}
              aria-label="Disminuir cantidad"
            >
              −
            </button>

            <strong>
              {quantity}
            </strong>

            <button
              type="button"
              onClick={increaseQuantity}
              aria-label="Aumentar cantidad"
            >
              +
            </button>
          </div>
        </div>

        <div className="total-box">
          <span>TOTAL</span>

          <strong>
            {total.toFixed(2)}$
          </strong>
        </div>

        <button
          type="button"
          className="add-cart-button"
          onClick={addToCart}
        >
          <span>🛒</span>
          AGREGAR AL CARRITO
          <b>→</b>
        </button>

        <button
          type="button"
          className="continue-shopping"
          onClick={() =>
            router.push(
              "/games/free-fire-latam"
            )
          }
        >
          ← SEGUIR COMPRANDO
        </button>

        <div className="select-security">
          <div>
            <span>🔒</span>
            <p>
              <strong>COMPRA SEGURA</strong>
              <small>
                Tu pedido queda guardado en tu
                carrito.
              </small>
            </p>
          </div>

          <div>
            <span>⚡</span>
            <p>
              <strong>PROCESO RÁPIDO</strong>
              <small>
                Continúa con tu pedido cuando
                estés listo.
              </small>
            </p>
          </div>
        </div>
      </section>

      {added && (
        <div className="cart-toast">
          <div className="cart-toast-check">
            ✓
          </div>

          <div>
            <strong>
              Su pedido ha sido añadido al carrito
            </strong>

            <span>
              {diamonds} × {quantity}
            </span>
          </div>

          <button
            type="button"
            onClick={() =>
              router.push("/cart")
            }
          >
            VER
          </button>
        </div>
      )}
    </main>
  );
          }
