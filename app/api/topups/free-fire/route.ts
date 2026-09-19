"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

import {
  FREE_FIRE_LATAM,
  type FreeFireLatamOffer,
} from "../../../lib/games/free-fire-latam";

export default function FreeFireLatamPage() {
  const router = useRouter();

  const [showOffers, setShowOffers] = useState(false);

  const [selectedOffer, setSelectedOffer] =
    useState<FreeFireLatamOffer | null>(null);

  const [playerId, setPlayerId] = useState("");

  const [error, setError] = useState("");

  const [orderCreated, setOrderCreated] =
    useState(false);

  const [orderNumber, setOrderNumber] =
    useState("");

  const [supplierOrderId, setSupplierOrderId] =
    useState("");

  const [orderStatus, setOrderStatus] =
    useState("");

  const [processing, setProcessing] =
    useState(false);

  function selectOffer(
    offer: FreeFireLatamOffer
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

  async function createOrder() {
    if (!selectedOffer || processing) {
      return;
    }

    setError("");
    setProcessing(true);

    try {
      /*
       * ============================================================
       * 1. COMPROBAR SESIÓN
       * ============================================================
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

      /*
       * ============================================================
       * 2. LIMPIAR ID
       * ============================================================
       */

      const cleanPlayerId =
        playerId
          .trim()
          .replace(/\s+/g, "");

      if (!cleanPlayerId) {
        setError(
          "Ponga el ID de su cuenta."
        );
        return;
      }

      if (
        !/^[0-9]+$/.test(
          cleanPlayerId
        )
      ) {
        setError(
          "El ID debe contener solamente números."
        );
        return;
      }

      if (
        cleanPlayerId.length < 4 ||
        cleanPlayerId.length > 20
      ) {
        setError(
          "El ID parece no tener un formato válido."
        );
        return;
      }

      /*
       * ============================================================
       * 3. CLAVE DE IDEMPOTENCIA
       * ============================================================
       */

      const idempotencyKey =
        crypto.randomUUID();

      /*
       * ============================================================
       * 4. ENVIAR PEDIDO AL SERVIDOR
       * ============================================================
       *
       * IMPORTANTE:
       *
       * Enviamos el ID INTERNO de la oferta:
       *
       * ff-110
       * ff-341
       * ff-572
       * etc.
       *
       * El servidor es quien obtiene:
       *
       * supplierOfferId
       *
       * y lo envía al reseller.
       *
       * De esta manera el navegador no controla
       * directamente la oferta del proveedor.
       */

      const response =
        await fetch(
          "/api/topups/free-fire",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${session.access_token}`,
            },

            body: JSON.stringify({
              offerId:
                selectedOffer.id,

              playerId:
                cleanPlayerId,

              idempotencyKey,
            }),
          }
        );

      /*
       * ============================================================
       * 5. LEER RESPUESTA
       * ============================================================
       */

      let result: any = {};

      try {
        result =
          await response.json();
      } catch {
        result = {};
      }

      /*
       * ============================================================
       * 6. ERROR DEL SERVIDOR
       * ============================================================
       */

      if (
        !response.ok ||
        !result.ok
      ) {
        setError(
          result.error ||
            "No se pudo crear la orden."
        );

        return;
      }

      /*
       * ============================================================
       * 7. OBTENER PEDIDO
       * ============================================================
       */

      const order =
        result.order || {};

      setOrderNumber(
        result.orderNumber ||
          order.order_number ||
          order.id ||
          result.id ||
          ""
      );

      setSupplierOrderId(
        result.supplierOrderId ||
          order.supplier_order_id ||
          ""
      );

      setOrderStatus(
        result.status ||
          order.status ||
          order.supplier_status ||
          "processing"
      );

      /*
       * ============================================================
       * 8. MOSTRAR ORDEN CREADA
       * ============================================================
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
        "ERROR CREANDO TOPUP:",
        err
      );

      setError(
        "No se pudo conectar con el servidor. Si la compra fue enviada, no vuelva a intentarla hasta revisar el estado de la orden."
      );
    } finally {
      setProcessing(false);
    }
  }

  function handleFinishPurchase(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

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
      playerId
        .trim()
        .replace(/\s+/g, "");

    if (!cleanId) {
      setError(
        "Ponga el ID de su cuenta."
      );
      return;
    }

    if (
      !/^[0-9]+$/.test(
        cleanId
      )
    ) {
      setError(
        "El ID debe contener solamente números."
      );
      return;
    }

    if (
      cleanId.length < 4 ||
      cleanId.length > 20
    ) {
      setError(
        "El ID parece no tener un formato válido."
      );
      return;
    }

    setError("");

    createOrder();
  }

  function goToOrders() {
    router.push("/orders");
  }

  return (
    <main className="game-service-page free-fire-page">

      {/* ============================================================
          HEADER
      ============================================================ */}

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

      {/* ============================================================
          IMAGEN PRINCIPAL
      ============================================================ */}

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

      {/* ============================================================
          BOTÓN PARA MOSTRAR OFERTAS
      ============================================================ */}

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

      {/* ============================================================
          OFERTAS
      ============================================================ */}

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

            {FREE_FIRE_LATAM.offers.map(
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
              }
            )}

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
                {FREE_FIRE_LATAM.note}
              </p>

            </div>

          </div>

        </section>

      )}

      {/* ============================================================
          DATOS DEL PEDIDO
      ============================================================ */}

      {selectedOffer && !orderCreated && (

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

          {/* OFERTA SELECCIONADA */}

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

          {/* NOTA */}

          <div className="game-note game-note-order">

            <div className="game-note-icon">
              !
            </div>

            <div className="game-note-content">

              <strong>
                NOTA
              </strong>

              <p>
                {FREE_FIRE_LATAM.note}
              </p>

            </div>

          </div>

          {/* FORMULARIO */}

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
                disabled={processing}
              />

            </div>

            {/* ERROR */}

            {error && (

              <div className="order-error">
                {error}
              </div>

            )}

            {/* PRECIO */}

            <div className="order-total-preview">

              <span>
                PRECIO
              </span>

              <strong>
                {selectedOffer.price.toFixed(2)}$
              </strong>

            </div>

            {/* FINALIZAR COMPRA */}

            <button
              type="submit"
              className="finish-order-button"
              disabled={processing}
            >

              <span>
                {processing
                  ? "PROCESANDO COMPRA..."
                  : "FINALIZAR COMPRA"}
              </span>

              <b>
                →
              </b>

            </button>

          </form>

        </section>

      )}

      {/* ============================================================
          ORDEN CREADA
      ============================================================ */}

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
            correctamente y está siendo
            procesada.
          </p>

          <div className="success-order-number">

            <span>
              NÚMERO DE ORDEN
            </span>

            <strong>
              #{orderNumber}
            </strong>

          </div>

          {supplierOrderId && (

            <div className="success-order-number">

              <span>
                ID DE ORDEN DEL PROVEEDOR
              </span>

              <strong>
                #{supplierOrderId}
              </strong>

            </div>

          )}

          {orderStatus && (

            <div className="success-order-number">

              <span>
                ESTADO
              </span>

              <strong>
                {orderStatus}
              </strong>

            </div>

          )}

          <button
            type="button"
            className="view-orders-button"
            onClick={
              goToOrders
            }
          >

            REVISAR ORDEN

            <span>
              →
            </span>

          </button>

        </section>

      )}

      {/* ============================================================
          INFORMACIÓN DEL SERVICIO
      ============================================================ */}

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

      {/* ============================================================
          FOOTER
      ============================================================ */}

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
