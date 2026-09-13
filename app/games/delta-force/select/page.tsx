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
    id: "delta-18",
    name: "18 MONEDAS DELTA",
    diamonds: "18🪙",
    price: 0.32,
    type: "coins",
  },
  {
    id: "delta-30",
    name: "30 MONEDAS DELTA",
    diamonds: "30🪙",
    price: 0.48,
    type: "coins",
  },
  {
    id: "delta-60",
    name: "60 MONEDAS DELTA",
    diamonds: "60🪙",
    price: 0.87,
    type: "coins",
  },
  {
    id: "delta-320",
    name: "320 MONEDAS DELTA",
    diamonds: "320🪙",
    price: 3.93,
    type: "coins",
  },
  {
    id: "delta-season",
    name: "PASE DE TEMPORADA",
    diamonds: "PASE 🎟️",
    price: 4.40,
    type: "pass",
  },
  {
    id: "delta-special",
    name: "PASE DE TEMPORADA ESPECIAL",
    diamonds: "PASE ESPECIAL 🎟️",
    price: 4.38,
    type: "pass",
  },
  {
    id: "delta-460",
    name: "460 MONEDAS DELTA",
    diamonds: "460🪙",
    price: 5.65,
    type: "coins",
  },
  {
    id: "delta-deluxe",
    name: "PASE DE TEMPORADA DELTA FORCE DELUXE",
    diamonds: "DELUXE 🎟️",
    price: 6.00,
    type: "pass",
  },
  {
    id: "delta-750",
    name: "750 MONEDAS DELTA",
    diamonds: "750🪙",
    price: 7.76,
    type: "coins",
  },
  {
    id: "delta-1480",
    name: "1480 MONEDAS DELTA",
    diamonds: "1480🪙",
    price: 15.40,
    type: "coins",
  },
  {
    id: "delta-1980",
    name: "1980 MONEDAS DELTA",
    diamonds: "1980🪙",
    price: 19.22,
    type: "coins",
  },
  {
    id: "delta-3950",
    name: "3950 MONEDAS DELTA",
    diamonds: "3950🪙",
    price: 38.34,
    type: "coins",
  },
  {
    id: "delta-8100",
    name: "8100 MONEDAS DELTA",
    diamonds: "8100🪙",
    price: 76.60,
    type: "coins",
  },
  {
    id: "delta-16200",
    name: "16200 MONEDAS DELTA",
    diamonds: "16200🪙",
    price: 158.00,
    type: "coins",
  },
];

function DeltaForceSelectContent() {
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
      game: "DELTA FORCE",
      gameSlug: "delta-force",
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
      "/games/delta-force/confirm"
    );
  }

  return (
    <main className="select-page">

      <header className="select-header">

        <button
          type="button"
          className="select-back"
          onClick={() =>
            router.push("/games/delta-force")
          }
          aria-label="Volver"
        >
          ←
        </button>

        <div className="select-header-title">
          <span>DELTA FORCE</span>
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
            src="/images/delta-force.jpg"
            alt="Delta Force"
          />

          <div className="select-image-overlay" />

          <div className="select-image-text">
            <span>TOP UP</span>
            <strong>DELTA FORCE</strong>
          </div>

        </div>


        <div className="selected-offer">

          <span className="selected-label">
            OFERTA SELECCIONADA
          </span>

          <div className="selected-diamonds">

            {offer.type === "pass"
              ? "🎟️"
              : "🪙"}{" "}

            {offer.diamonds}

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
            Escriba el ID de la cuenta de Delta Force
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
            router.push("/games/delta-force")
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


export default function DeltaForceSelectPage() {
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
      <DeltaForceSelectContent />
    </Suspense>
  );
  }
