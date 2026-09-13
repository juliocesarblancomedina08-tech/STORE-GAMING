"use client";

import {
  FormEvent,
  Suspense,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Offer = {
  id: string;
  name: string;
  diamonds: string;
  price: number;
  type: string;
};

const offers: Offer[] = [
  {
    id: "fc-40",
    name: "40 PUNTOS FC / 39 PLATA",
    diamonds: "40 PUNTOS FC / 39 PLATA ⚽",
    price: 0.45,
    type: "points",
  },
  {
    id: "fc-100",
    name: "100 PUNTOS FC / 99 PLATA",
    diamonds: "100 PUNTOS FC / 99 PLATA ⚽",
    price: 0.97,
    type: "points",
  },
  {
    id: "fc-520",
    name: "520 PUNTOS FC / 499 PLATA",
    diamonds: "520 PUNTOS FC / 499 PLATA ⚽",
    price: 4.36,
    type: "points",
  },
  {
    id: "fc-1070",
    name: "1070 PUNTOS FC / 999 PLATA",
    diamonds: "1070 PUNTOS FC / 999 PLATA ⚽",
    price: 8.67,
    type: "points",
  },
  {
    id: "fc-2200",
    name: "2200 PUNTOS FC / 1999 PLATA",
    diamonds: "2200 PUNTOS FC / 1999 PLATA ⚽",
    price: 17.83,
    type: "points",
  },
  {
    id: "fc-5750",
    name: "5750 PUNTOS FC / 4999 PLATA",
    diamonds: "5750 PUNTOS FC / 4999 PLATA ⚽",
    price: 43.17,
    type: "points",
  },
  {
    id: "fc-12000",
    name: "12000 PUNTOS FC / 9999 PLATA",
    diamonds: "12000 PUNTOS FC / 9999 PLATA ⚽",
    price: 86.30,
    type: "points",
  },
];

function FCMobileSelectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [playerId, setPlayerId] = useState("");
  const [error, setError] = useState("");

  const offerParam = searchParams.get("offer");

  let offer: Offer = offers[0];

  if (offerParam) {
    try {
      const decoded = JSON.parse(
        decodeURIComponent(offerParam)
      );

      if (
        decoded &&
        typeof decoded.name === "string" &&
        typeof decoded.price === "number"
      ) {
        offer = {
          ...offers[0],
          ...decoded,
        };
      }
    } catch {
      // Mantener oferta predeterminada.
    }
  }

  function handleContinue(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    const cleanId = playerId.trim();

    if (!cleanId) {
      setError("Ponga el ID de su cuenta.");
      return;
    }

    if (cleanId.length < 4) {
      setError("El ID parece demasiado corto.");
      return;
    }

    const orderData = {
      game: "FC MOBILE (ID)",
      gameSlug: "fc-mobile-id",
      offerId: offer.id,
      product: offer.name,
      displayProduct: offer.diamonds,
      price: offer.price,
      playerId: cleanId,
      quantity: 1,
    };

    sessionStorage.setItem(
      "storeGamingPendingOrder",
      JSON.stringify(orderData)
    );

    router.push(
      "/games/fc-mobile-id/confirm"
    );
  }

  return (
    <main className="select-page">

      <header className="select-header">

        <button
          type="button"
          className="select-back"
          onClick={() =>
            router.push("/games/fc-mobile-id")
          }
          aria-label="Volver"
        >
          ←
        </button>

        <div className="select-header-title">
          <span>FC MOBILE (ID)</span>
          <strong>REALIZAR ORDEN</strong>
        </div>

        <button
          type="button"
          className="select-cart"
          onClick={() =>
            router.push("/cart")
          }
          aria-label="Carrito"
        >
          🛒
        </button>

      </header>


      <section className="select-content">

        <div className="select-game-image">

          <img
            src="/images/fc-mobile.jpg"
            alt="FC Mobile Indonesia"
          />

          <div className="select-image-overlay" />

          <div className="select-image-text">
            <span>TOP UP</span>
            <strong>FC MOBILE</strong>
          </div>

        </div>


        <div className="selected-offer">

          <span className="selected-label">
            OFERTA SELECCIONADA
          </span>

          <div className="selected-diamonds">
            ⚽ {offer.diamonds}
          </div>

          <div className="selected-product">
            {offer.name}
          </div>

          <div className="selected-price">
            {offer.price.toFixed(2)}$
          </div>

        </div>


        <form
          onSubmit={handleContinue}
          className="order-form"
        >

          <label
            htmlFor="player-id"
            className="player-id-label"
          >
            PONGA SU ID
          </label>

          <p className="player-id-description">
            Escriba el ID de jugador de FC Mobile
            donde desea recibir la recarga.
          </p>


          <div className="player-id-input-wrapper">

            <span>🆔</span>

            <input
              id="player-id"
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
              placeholder="Ejemplo: 123456789"
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
              TOTAL A PAGAR
            </span>

            <strong>
              {offer.price.toFixed(2)}$
            </strong>

          </div>


          <button
            type="submit"
            className="finish-order-button"
          >
            <span>
              FINALIZAR ORDEN
            </span>

            <b>
              →
            </b>

          </button>

        </form>


        <button
          type="button"
          className="continue-shopping"
          onClick={() =>
            router.push("/games/fc-mobile-id")
          }
        >
          ← CAMBIAR OFERTA
        </button>


        <div className="select-security">

          <div>

            <span>
              🔒
            </span>

            <p>

              <strong>
                COMPRA SEGURA
              </strong>

              <small>
                Revisa los datos antes de crear
                tu orden.
              </small>

            </p>

          </div>


          <div>

            <span>
              🎮
            </span>

            <p>

              <strong>
                TOP UP DIRECTO
              </strong>

              <small>
                La recarga será enviada al ID
                indicado.
              </small>

            </p>

          </div>

        </div>

      </section>

    </main>
  );
}


export default function FCMobileSelectPage() {
  return (
    <Suspense
      fallback={
        <main className="select-page">

          <div
            style={{
              minHeight: "100vh",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              fontSize: "16px",
              fontWeight: 800,
            }}
          >
            CARGANDO...
          </div>

        </main>
      }
    >
      <FCMobileSelectContent />
    </Suspense>
  );
}
