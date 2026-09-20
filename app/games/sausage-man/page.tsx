"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

/*
 * ============================================================
 * SAUSAGE MAN — OFERTAS REALES FAZERCARDS
 * ============================================================
 */

const offers = [
  {
    id: "sausage-61",
    supplierOfferId: "61_candies",
    name: "61 Candies",
    display: "61 🍬",
    price: 0.54,
    icon: "🍬",
  },
  {
    id: "sausage-186",
    supplierOfferId: "186_candies",
    name: "186 Candies",
    display: "186 🍬",
    price: 1.32,
    icon: "🍬",
  },
  {
    id: "sausage-318",
    supplierOfferId: "318_candies",
    name: "318 Candies",
    display: "318 🍬",
    price: 2.1,
    icon: "🍬",
  },
  {
    id: "sausage-686",
    supplierOfferId: "686_candies",
    name: "686 Candies",
    display: "686 🍬",
    price: 4.06,
    icon: "🍬",
  },
  {
    id: "sausage-1378",
    supplierOfferId: "1378_candies",
    name: "1378 Caramelos",
    display: "1378 🍬",
    price: 7.57,
    icon: "🍬",
  },
  {
    id: "sausage-2118",
    supplierOfferId: "2118_caramelos",
    name: "2118 Caramelos",
    display: "2118 🍬",
    price: 11.46,
    icon: "🍬",
  },
  {
    id: "sausage-3548",
    supplierOfferId: "3548_caramelos",
    name: "3548 Caramelos",
    display: "3548 🍬",
    price: 19.67,
    icon: "🍬",
  },
  {
    id: "sausage-7108",
    supplierOfferId: "7108_caramelos",
    name: "7108 Caramelos",
    display: "7108 🍬",
    price: 39.18,
    icon: "🍬",
  },
] as const;

const GAME_NAME = "SAUSAGE MAN";

const GAME_IMAGE = "/images/sausage-man.jpg";

const gameNote =
  "Recarga de Sausage Man. Introduce tu ID de personaje antes de realizar el pedido. El producto seleccionado se entrega directamente a tu cuenta después de realizar el pedido.";

export default function SausageManPage() {
  const router = useRouter();

  /*
   * ============================================================
   * ESTADOS
   * ============================================================
   */

  const [showOffers, setShowOffers] = useState(false);

  const [selectedOffer, setSelectedOffer] =
    useState<(typeof offers)[number] | null>(null);

  const [playerId, setPlayerId] = useState("");

  const [error, setError] = useState("");

  const [processing, setProcessing] = useState(false);

  const [orderCreated, setOrderCreated] = useState(false);

  const [orderNumber, setOrderNumber] = useState("");

  const [supplierOrderId, setSupplierOrderId] =
    useState("");

  const [orderStatus, setOrderStatus] =
    useState("");

  /*
   * ============================================================
   * SELECCIONAR OFERTA
   * ============================================================
   */

  function selectOffer(
    offer: (typeof offers)[number]
  ) {
    setSelectedOffer(offer);
    setPlayerId("");
    setError("");
    setOrderCreated(false);
    setOrderNumber("");
    setSupplierOrderId("");
    setOrderStatus("");

    setTimeout(() => {
      document
        .getElementById("order-section")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 100);
  }

  /*
   * ============================================================
   * CREAR ORDEN
   * ============================================================
   */

  async function createOrder() {
    if (!selectedOffer || processing) {
      return;
    }

    setError("");
    setProcessing(true);

    try {
      /*
       * ========================================================
       * 1. COMPROBAR SESIÓN
       * ========================================================
       */

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error(
          "ERROR OBTENIENDO SESIÓN:",
          sessionError
        );

        setError(
          "No se pudo comprobar tu sesión."
        );

        return;
      }

      if (!session) {
        setError(
          "Tu sesión ha expirado. Inicia sesión nuevamente."
        );

        router.push("/login");

        return;
      }

      /*
       * ========================================================
       * 2. LIMPIAR ID
       * ========================================================
       */

      const cleanPlayerId = playerId.trim();

      if (!cleanPlayerId) {
        setError(
          "Introduzca su ID de personaje."
        );

        return;
      }

      /*
       * ========================================================
       * 3. IDEMPOTENCY KEY
       * ========================================================
       */

      const idempotencyKey =
        crypto.randomUUID();

      /*
       * ========================================================
       * 4. ENVIAR PEDIDO A NUESTRA API
       * ========================================================
       */

      const response = await fetch(
        "/api/topups/sausage-man",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Authorization:
              `Bearer ${session.access_token}`,
          },

          body: JSON.stringify({
            offerId:
              selectedOffer.supplierOfferId,

            offerName:
              selectedOffer.name,

            retailPrice:
              selectedOffer.price,

            playerId:
              cleanPlayerId,

            idempotencyKey,
          }),
        }
      );

      /*
       * ========================================================
       * 5. LEER RESPUESTA
       * ========================================================
       */

      let result: any = null;

      try {
        result = await response.json();
      } catch {
        result = null;
      }

      if (!response.ok) {
        console.error(
          "ERROR API SAUSAGE MAN:",
          result
        );

        setError(
          result?.error ||
            result?.message ||
            "No se pudo crear la orden."
        );

        return;
      }

      if (!result?.ok) {
        console.error(
          "RESPUESTA API NO OK:",
          result
        );

        setError(
          result?.error ||
            result?.message ||
            "La orden no pudo ser creada."
        );

        return;
      }

      /*
       * ========================================================
       * 6. OBTENER DATOS DE LA ORDEN
       * ========================================================
       */

      const apiOrder =
        result.order || {};

      const generatedOrderNumber =
        result.orderNumber ||
        apiOrder.orderNumber ||
        apiOrder.order_number ||
        result.id ||
        apiOrder.id ||
        `SM-${Date.now()}`;

      const generatedSupplierOrderId =
        result.supplierOrderId ||
        apiOrder.supplierOrderId ||
        apiOrder.supplier_order_id ||
        "";

      const generatedStatus =
        result.status ||
        apiOrder.status ||
        "SUPPLIER_PENDING";

      /*
       * ========================================================
       * 7. GUARDAR ESTADO
       * ========================================================
       */

      setOrderNumber(
        String(generatedOrderNumber)
      );

      setSupplierOrderId(
        String(generatedSupplierOrderId)
      );

      setOrderStatus(
        String(generatedStatus)
      );

      /*
       * ========================================================
       * 8. GUARDAR ORDEN LOCALMENTE
       * ========================================================
       */

      const localOrder = {
        orderNumber:
          String(generatedOrderNumber),

        supplierOrderId:
          String(generatedSupplierOrderId),

        status:
          String(generatedStatus),

        game:
          GAME_NAME,

        offerId:
          selectedOffer.id,

        supplierOfferId:
          selectedOffer.supplierOfferId,

        offerName:
          selectedOffer.name,

        playerId:
          cleanPlayerId,

        price:
          selectedOffer.price,

        createdAt:
          new Date().toISOString(),
      };

      try {
        const existingOrders =
          JSON.parse(
            localStorage.getItem(
              "storeGamingOrders"
            ) || "[]"
          );

        const updatedOrders = [
          localOrder,
          ...existingOrders,
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
            localOrder
          )
        );
      } catch (storageError) {
        console.error(
          "ERROR GUARDANDO ORDEN LOCAL:",
          storageError
        );
      }

      /*
       * ========================================================
       * 9. MOSTRAR ÉXITO
       * ========================================================
       */

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
    } catch (err) {
      console.error(
        "ERROR CREANDO TOPUP SAUSAGE MAN:",
        err
      );

      setError(
        "No se pudo conectar con el servidor. Si la compra pudo haber sido enviada, no vuelva a intentarla hasta revisar el estado de la orden."
      );
    } finally {
      setProcessing(false);
    }
  }

  /*
   * ============================================================
   * FINALIZAR COMPRA
   * ============================================================
   */

  function handleFinishPurchase(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    if (processing) {
      return;
    }

    if (!selectedOffer) {
      setError(
        "Seleccione una oferta."
      );

      return;
    }

    const cleanId =
      playerId.trim();

    if (!cleanId) {
      setError(
        "Introduzca su ID de personaje."
      );

      return;
    }

    if (
      !/^[0-9]+$/.test(
        cleanId
      )
    ) {
      setError(
        "El ID de personaje solo puede contener números."
      );

      return;
    }

    if (
      cleanId.length < 4 ||
      cleanId.length > 30
    ) {
      setError(
        "El ID de personaje parece no tener un formato válido."
      );

      return;
    }

    createOrder();
  }

  /*
   * ============================================================
   * IR A ÓRDENES
   * ============================================================
   */

  function goToOrders() {
    router.push("/orders");
  }

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <main className="game-service-page">

      {/* ========================================================
          HEADER
      ======================================================== */}

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
            SAUSAGE MAN
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

      {/* ========================================================
          IMAGEN PRINCIPAL
      ======================================================== */}

      <section className="free-fire-main-image">

        <img
          src={GAME_IMAGE}
          alt="Sausage Man"
        />

        <div className="free-fire-main-overlay" />

        <div className="free-fire-main-text">

          <span>
            ⚡ TOP UP
          </span>

          <h1>
            SAUSAGE
            <strong>
              MAN
            </strong>
          </h1>

          <p>
            Caramelos para tu cuenta
          </p>

        </div>

      </section>

      {/* ========================================================
          BOTÓN OFERTAS
      ======================================================== */}

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

      {/* ========================================================
          OFERTAS
      ======================================================== */}

      {showOffers && (
        <section className="offers-section">

          <div className="offers-heading">

            <div>

              <span>
                SAUSAGE MAN
              </span>

              <h2>
                ELIGE TU OFERTA
              </h2>

            </div>

          </div>

          <div className="offers-list">

            {offers.map(
              (offer) => {

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
                      selectOffer(
                        offer
                      )
                    }
                  >

                    <div className="offer-card-left">

                      <span className="offer-icon">
                        {offer.icon}
                      </span>

                      <div className="offer-info">

                        <strong>
                          {offer.display}
                        </strong>

                        <span>
                          {offer.name}
                        </span>

                      </div>

                    </div>

                    <div className="offer-card-right">

                      <strong>
                        ${offer.price.toFixed(2)}
                      </strong>

                      <span>
                        USD
                      </span>

                    </div>

                  </button>
                );
              }
            )}

          </div>

        </section>
      )}

      {/* ========================================================
          NOTA DEL SERVICIO
      ======================================================== */}

      <section className="game-note">

        <div className="game-note-icon">
          ℹ️
        </div>

        <div>
          <strong>
            INFORMACIÓN DEL SERVICIO
          </strong>

          <p>
            {gameNote}
          </p>
        </div>

      </section>

      {/* ========================================================
          FORMULARIO DE ORDEN
      ======================================================== */}

      {selectedOffer && !orderCreated && (
        <section
          id="order-section"
          className="order-section"
        >

          <div className="selected-order-card">

            <div className="selected-order-icon">
              {selectedOffer.icon}
            </div>

            <div className="selected-order-info">

              <span>
                OFERTA SELECCIONADA
              </span>

              <strong>
                {selectedOffer.name}
              </strong>

            </div>

            <div className="selected-order-price">

              <strong>
                ${selectedOffer.price.toFixed(2)}
              </strong>

              <span>
                USD
              </span>

            </div>

          </div>

          <form
            className="order-form"
            onSubmit={
              handleFinishPurchase
            }
          >

            <div className="player-id-field">

              <label
                htmlFor="player-id"
                className="player-id-label"
              >
                ID DE PERSONAJE
              </label>

              <p className="player-id-description">
                Introduce el ID de personaje
                de tu cuenta de Sausage Man.
              </p>

              <div className="player-id-input-wrapper">

                <span>
                  🎮
                </span>

                <input
                  id="player-id"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={playerId}
                  onChange={(event) => {
                    const value =
                      event.target.value
                        .replace(
                          /[^0-9]/g,
                          ""
                        );

                    setPlayerId(value);
                    setError("");
                  }}
                  placeholder="Introduce tu ID de personaje"
                  maxLength={30}
                  autoComplete="off"
                  disabled={processing}
                />

              </div>

            </div>

            {error && (
              <div className="order-error">
                {error}
              </div>
            )}

            <div className="order-total-preview">

              <span>
                TOTAL
              </span>

              <strong>
                ${selectedOffer.price.toFixed(2)}
              </strong>

            </div>

            <button
              type="submit"
              className="finish-order-button"
              disabled={processing}
            >

              {processing ? (
                <>
                  <span>
                    ⏳
                  </span>

                  PROCESANDO...
                </>
              ) : (
                <>
                  FINALIZAR COMPRA
                  <span>
                    →
                  </span>
                </>
              )}

            </button>

          </form>

        </section>
      )}

            {/* ========================================================
          ORDEN CREADA
      ======================================================== */}

      {orderCreated && (
        <section
          id="success-section"
          className="order-success-section"
        >

          <div className="success-circle">
            ✓
          </div>

          <h2>
            orden creada
          </h2>

          <p className="success-message">
            Tu pedido fue creado correctamente.
          </p>

          <div className="success-order-number">

            <span>
              Número de orden
            </span>

            <strong>
              {orderNumber}
            </strong>

          </div>

          <div className="success-order-info">

            <div>

              <span>
                Servicio
              </span>

              <strong>
                {GAME_NAME}
              </strong>

            </div>

            <div>

              <span>
                Oferta
              </span>

              <strong>
                {selectedOffer?.name ||
                  "Sausage Man"}
              </strong>

            </div>

            <div>

              <span>
                ID de personaje
              </span>

              <strong>
                {playerId}
              </strong>

            </div>

            <div>

              <span>
                Total
              </span>

              <strong>
                $
                {selectedOffer?.price.toFixed(
                  2
                ) || "0.00"}
              </strong>

            </div>

            {supplierOrderId && (
              <div>

                <span>
                  Orden del proveedor
                </span>

                <strong>
                  {supplierOrderId}
                </strong>

              </div>
            )}

            <div>

              <span>
                Estado
              </span>

              <strong>
                {orderStatus}
              </strong>

            </div>

          </div>

          <button
            type="button"
            className="view-orders-button"
            onClick={goToOrders}
          >
            revisar orden
          </button>

          <button
            type="button"
            className="back-to-game-button"
            onClick={() => {

              setOrderCreated(false);

              setSelectedOffer(null);

              setPlayerId("");

              setOrderNumber("");

              setSupplierOrderId("");

              setOrderStatus("");

              setError("");

            }}
          >
            realizar otra compra
          </button>

        </section>
      )}

      {/* ========================================================
          INFORMACIÓN DEL SERVICIO
      ======================================================== */}

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
              SAUSAGE MAN
            </strong>

            <p>
              Caramelos directamente
              a tu cuenta.
            </p>

          </div>

        </div>

      </section>

      {/* ========================================================
          FOOTER
      ======================================================== */}

      <footer className="game-service-footer">

        <strong>
          🛒STORE GAMING🎮
        </strong>

        <span>
          SAUSAGE MAN TOP UP
        </span>

      </footer>

    </main>
  );
}
