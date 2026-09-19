"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import { supabase } from "../../../lib/supabase";

import {
  BLOOD_STRIKE,
  BloodStrikeOffer,
} from "../../../lib/games/blood-strike";

export default function BloodStrikePage() {
  const router = useRouter();

  const [offers, setOffers] = useState<BloodStrikeOffer[]>(
    BLOOD_STRIKE.offers
  );

  const [selectedOffer, setSelectedOffer] =
    useState<BloodStrikeOffer | null>(null);

  const [playerId, setPlayerId] = useState("");

  const [error, setError] = useState("");

  const [offersOpen, setOffersOpen] = useState(true);

  const [orderCreated, setOrderCreated] = useState(false);

  const [orderNumber, setOrderNumber] = useState("");

  const [supplierOrderId, setSupplierOrderId] =
    useState("");

  const [orderStatus, setOrderStatus] =
    useState("processing");

  const [processing, setProcessing] = useState(false);

  /*
  |--------------------------------------------------------------------------
  | CARGAR OFERTAS
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    setOffers(BLOOD_STRIKE.offers);
  }, []);

  /*
  |--------------------------------------------------------------------------
  | SELECCIONAR OFERTA
  |--------------------------------------------------------------------------
  */

  const selectOffer = (offer: BloodStrikeOffer) => {
    setSelectedOffer(offer);
    setError("");
    setOrderCreated(false);
  };

  /*
  |--------------------------------------------------------------------------
  | CREAR ORDEN
  |--------------------------------------------------------------------------
  */

  const createOrder = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");

    if (!selectedOffer) {
      setError("Seleccione una oferta.");
      return;
    }

    const cleanPlayerId = playerId.trim();

    if (!cleanPlayerId) {
      setError("Introduzca su ID de jugador.");
      return;
    }

    /*
     * Blood Strike puede utilizar IDs alfanuméricos.
     * Permitimos únicamente caracteres seguros.
     */
    if (
      cleanPlayerId.length < 4 ||
      cleanPlayerId.length > 32 ||
      !/^[A-Za-z0-9_-]+$/.test(cleanPlayerId)
    ) {
      setError(
        "El ID debe tener entre 4 y 32 caracteres."
      );
      return;
    }

    setProcessing(true);

    try {
      /*
       * Comprobar sesión antes de crear la orden.
       */
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setError(
          "Su sesión ha expirado. Inicie sesión nuevamente."
        );

        setProcessing(false);

        router.push("/");

        return;
      }

      /*
       * Idempotency key.
       *
       * Evita crear dos órdenes si el usuario toca
       * varias veces el botón.
       */
      const idempotencyKey =
        crypto.randomUUID();

      const response = await fetch(
        "/api/topups/blood-strike",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },

          body: JSON.stringify({
            offerId: selectedOffer.id,
            playerId: cleanPlayerId,
            idempotencyKey,
          }),
        }
      );

      let result: any = null;

      try {
        result = await response.json();
      } catch {
        result = null;
      }

      if (!response.ok || !result?.ok) {
        throw new Error(
          result?.error ||
            result?.message ||
            "No se pudo crear la orden."
        );
      }

      /*
       * La API puede devolver la información
       * dentro de result.order.
       */
      const order = result.order || {};

      const createdOrderNumber =
        result.orderNumber ||
        order.order_number ||
        order.orderNumber ||
        order.id ||
        result.id ||
        "";

      const createdSupplierOrderId =
        result.supplierOrderId ||
        order.supplier_order_id ||
        order.supplierOrderId ||
        "";

      const createdStatus =
        result.status ||
        order.status ||
        order.supplier_status ||
        "processing";

      setOrderNumber(
        String(createdOrderNumber)
      );

      setSupplierOrderId(
        String(createdSupplierOrderId || "")
      );

      setOrderStatus(
        String(createdStatus)
      );

      setOrderCreated(true);

      /*
       * Ocultamos el teclado / limpiamos el formulario
       * después de crear correctamente.
       */
      setPlayerId("");
    } catch (err) {
      console.error(
        "Blood Strike order error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "No se pudo crear la orden."
      );
    } finally {
      setProcessing(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | REVISAR ORDEN
  |--------------------------------------------------------------------------
  */

  const reviewOrder = () => {
    if (!orderNumber) {
      return;
    }

    router.push(
      `/orders?order=${encodeURIComponent(
        orderNumber
      )}`
    );
  };

  /*
  |--------------------------------------------------------------------------
  | VOLVER
  |--------------------------------------------------------------------------
  */

  const goBack = () => {
    router.back();
  };

  return (
    <main className="game-page">
      {/* =========================================================
          HEADER
      ========================================================= */}

      <header className="game-header">
        <button
          type="button"
          className="game-back-button"
          onClick={goBack}
          aria-label="Volver"
        >
          ←
        </button>

        <div className="game-header-title">
          <span>🛒</span>
          <strong>STORE GAMING</strong>
          <span>🎮</span>
        </div>

        <button
          type="button"
          className="game-cart-button"
          onClick={() => router.push("/orders")}
          aria-label="Pedidos"
        >
          🛒
        </button>
      </header>

      {/* =========================================================
          CONTENIDO
      ========================================================= */}

      <section className="game-service-page">
        <div className="game-service-card">
          {/* =====================================================
              TÍTULO
          ===================================================== */}

          <div className="game-service-heading">
            <h1>
              Bienvenido al servicio TOP UP
              de Blood Strike
            </h1>

            <p>
              Recarga Gold y pases de Blood Strike
              de forma rápida y segura.
            </p>
          </div>

          {/* =====================================================
              IMAGEN DEL JUEGO
          ===================================================== */}

          <div className="game-image-container">
            <img
              src={BLOOD_STRIKE.image}
              alt="Blood Strike"
              className="game-main-image"
            />
          </div>

          {/* =====================================================
              OFERTAS
          ===================================================== */}

          <button
            type="button"
            className="offers-toggle"
            onClick={() =>
              setOffersOpen((value) => !value)
            }
          >
            <span className="offers-toggle-icon">
              ✏️
            </span>

            <span>
              presione para ver ofertas
            </span>

            <span className="offers-toggle-arrow">
              {offersOpen ? "▲" : "▼"}
            </span>
          </button>

          {offersOpen && (
            <div className="game-offers-list">
              {offers.map((offer) => {
                const selected =
                  selectedOffer?.id === offer.id;

                return (
                  <button
                    key={offer.id}
                    type="button"
                    className={`game-offer-row ${
                      selected
                        ? "selected"
                        : ""
                    }`}
                    onClick={() =>
                      selectOffer(offer)
                    }
                  >
                    <div className="game-offer-info">
                      <span className="game-offer-name">
                        {offer.name}
                      </span>

                      {selected && (
                        <span className="game-offer-selected">
                          ✓
                        </span>
                      )}
                    </div>

                    <span className="game-offer-price">
                      {offer.price.toFixed(2)}$
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* =====================================================
              NOTA
          ===================================================== */}

          <div className="game-service-note">
            <span>⚡</span>

            <p>
              Recarga Global de Blood Strike.
              Los Gold y pases se entregan
              automáticamente después de realizar
              el pedido.
            </p>
          </div>

          {/* =====================================================
              FORMULARIO
          ===================================================== */}

          {!orderCreated && (
            <form
              className="game-order-form"
              onSubmit={createOrder}
            >
              <div className="game-selected-offer">
                <span>
                  Oferta seleccionada
                </span>

                <strong>
                  {selectedOffer
                    ? selectedOffer.displayName
                    : "Ninguna"}
                </strong>

                {selectedOffer && (
                  <span className="game-selected-price">
                    {selectedOffer.price.toFixed(
                      2
                    )}
                    $
                  </span>
                )}
              </div>

              <label
                htmlFor="blood-strike-player-id"
                className="game-player-label"
              >
                {BLOOD_STRIKE.playerField.label}
              </label>

              <input
                id="blood-strike-player-id"
                type="text"
                inputMode="text"
                autoComplete="off"
                value={playerId}
                onChange={(event) =>
                  setPlayerId(
                    event.target.value
                  )
                }
                placeholder={
                  BLOOD_STRIKE.playerField
                    .placeholder
                }
                className="game-player-input"
                maxLength={32}
              />

              <p className="game-player-description">
                {BLOOD_STRIKE.playerField.description}
              </p>

              {error && (
                <div className="game-error">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="game-finish-button"
                disabled={
                  processing ||
                  !selectedOffer ||
                  !playerId.trim()
                }
              >
                {processing
                  ? "PROCESANDO..."
                  : "FINALIZAR COMPRA"}
              </button>
            </form>
          )}

          {/* =====================================================
              ORDEN CREADA
          ===================================================== */}

          {orderCreated && (
            <section className="game-order-success">
              <div className="game-success-circle">
                ✓
              </div>

              <h2>orden creada</h2>

              <p>
                Su pedido fue creado
                correctamente.
              </p>

              {orderNumber && (
                <div className="game-order-number">
                  <span>
                    Número de orden
                  </span>

                  <strong>
                    {orderNumber}
                  </strong>
                </div>
              )}

              {supplierOrderId && (
                <div className="game-supplier-order">
                  <span>
                    Orden del proveedor
                  </span>

                  <strong>
                    {supplierOrderId}
                  </strong>
                </div>
              )}

              <div className="game-order-status">
                <span>
                  Estado
                </span>

                <strong>
                  {orderStatus}
                </strong>
              </div>

              <button
                type="button"
                className="game-review-order-button"
                onClick={reviewOrder}
              >
                REVISAR ORDEN
              </button>

              <button
                type="button"
                className="game-new-order-button"
                onClick={() => {
                  setOrderCreated(false);
                  setSelectedOffer(null);
                  setOrderNumber("");
                  setSupplierOrderId("");
                  setOrderStatus(
                    "processing"
                  );
                  setError("");
                }}
              >
                REALIZAR OTRA COMPRA
              </button>
            </section>
          )}

          {/* =====================================================
              INFORMACIÓN DEL SERVICIO
          ===================================================== */}

          <section className="game-service-info">
            <h2>
              Información del servicio
            </h2>

            <div className="game-info-row">
              <span>⚡</span>

              <div>
                <strong>
                  Entrega rápida
                </strong>

                <p>
                  La recarga se procesa
                  automáticamente.
                </p>
              </div>
            </div>

            <div className="game-info-row">
              <span>🔒</span>

              <div>
                <strong>
                  Compra segura
                </strong>

                <p>
                  Tu pedido queda registrado
                  en STORE GAMING.
                </p>
              </div>
            </div>

            <div className="game-info-row">
              <span>🎮</span>

              <div>
                <strong>
                  Blood Strike
                </strong>

                <p>
                  Gold y pases disponibles
                  para recarga.
                </p>
              </div>
            </div>
          </section>
        </div>
      </section>

      {/* =========================================================
          FOOTER
      ========================================================= */}

      <footer className="game-footer">
        <span>🛒</span>

        <strong>
          STORE GAMING
        </strong>

        <span>🎮</span>
      </footer>
    </main>
  );
      }
