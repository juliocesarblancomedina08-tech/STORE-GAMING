"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import {
  FC_MOBILE_ID,
  type FcMobileIdOffer,
} from "../../../lib/games/fc-mobile-id";

export default function FcMobileIdPage() {
  const router = useRouter();

  const [showOffers, setShowOffers] = useState(false);

  const [selectedOffer, setSelectedOffer] =
    useState<FcMobileIdOffer | null>(null);

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

  function selectOffer(offer: FcMobileIdOffer) {
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
       * 2. LIMPIAR PLAYER ID
       * ============================================================
       */

      const cleanPlayerId =
        playerId.trim();

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
       * 3. IDEMPOTENCIA
       * ============================================================
       */

      const idempotencyKey =
        crypto.randomUUID();

      /*
       * ============================================================
       * 4. ENVIAR PEDIDO
       * ============================================================
       */

      const response =
        await fetch(
          "/api/topups/fc-mobile-id",
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

              offerName:
                selectedOffer.name,

              playerId:
                cleanPlayerId,

              retailPrice:
                selectedOffer.price,

              quantity: 1,

              idempotencyKey,
            }),
          }
        );

      const result =
        await response.json();

      /*
       * ============================================================
       * 5. ERROR
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
       * 6. GUARDAR INFORMACIÓN
       * ============================================================
       */

      setOrderNumber(
        result.order?.order_number ||
          result.orderNumber ||
          result.id ||
          ""
      );

      setSupplierOrderId(
        result.order?.supplier_order_id ||
          result.supplierOrderId ||
          ""
      );

      setOrderStatus(
        result.order?.status ||
          result.status ||
          "PENDING"
      );

      /*
       * ============================================================
       * 7. MOSTRAR ORDEN CREADA
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
        "ERROR CREANDO TOP UP FC MOBILE:",
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
      playerId.trim();

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

    createOrder();
  }

  function goToOrders() {
    router.push("/orders");
  }

  return (
    <main className="game-service-page fc-mobile-page">

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
            EAFC MOBILE
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

      <section className="free-fire-main-image fc-mobile-main-image">

        <img
          src={FC_MOBILE_ID.image}
          alt="EAFC Mobile"
        />

        <div className="free-fire-main-overlay" />

        <div className="free-fire-main-text">

          <span>
            ⚡ TOP UP
          </span>

          <h1>
            EAFC
            <strong>
              MOBILE
            </strong>
          </h1>

          <p>
            FC Points y Plata
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
                EAFC MOBILE
              </span>

              <h2>
                ELIGE TU OFERTA
              </h2>

            </div>

          </div>

          <div className="offers-list">

            {FC_MOBILE_ID.offers.map(
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
                {FC_MOBILE_ID.note}
              </p>

            </div>

          </div>

        </section>

      )}

      {/* ============================================================
          DATOS DEL PEDIDO
      ============================================================ */}

      {selectedOffer &&
        !orderCreated && (

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

          {/* ========================================================
              OFERTA SELECCIONADA
          ======================================================== */}

          <div className="selected-order-card">

            <div className="selected-order-icon">
              {selectedOffer.icon}
            </div>

            <div className="selected-order-info">

              <span>
                EAFC MOBILE
              </span>

              <strong>
                {selectedOffer.name}
              </strong>

            </div>

            <div className="selected-order-price">
              {selectedOffer.price.toFixed(2)}$
            </div>

          </div>

          {/* ========================================================
              NOTA
          ======================================================== */}

          <div className="game-note game-note-order">

            <div className="game-note-icon">
              !
            </div>

            <div className="game-note-content">

              <strong>
                NOTA
              </strong>

              <p>
                {FC_MOBILE_ID.note}
              </p>

            </div>

          </div>

          {/* ========================================================
              FORMULARIO
          ======================================================== */}

          <form
            onSubmit={
              handleFinishPurchase
            }
            className="order-form"
          >

            <label
              htmlFor="fc-mobile-player-id"
              className="player-id-label"
            >
              ID DEL JUGADOR
            </label>

            <p className="player-id-description">
              Introduzca el ID de la cuenta
              donde desea recibir la compra.
            </p>

            {/* ======================================================
                CAMPO ID
            ====================================================== */}

            <div className="player-id-input-wrapper">

              <span>
                🆔
              </span>

              <input
                id="fc-mobile-player-id"
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

            {/* ======================================================
                ERROR
            ====================================================== */}

            {error && (

              <div className="order-error">
                {error}
              </div>

            )}

            {/* ======================================================
                PRECIO
            ====================================================== */}

            <div className="order-total-preview">

              <span>
                PRECIO
              </span>

              <strong>
                {selectedOffer.price.toFixed(2)}$
              </strong>

            </div>

            {/* ======================================================
                FINALIZAR COMPRA
            ====================================================== */}

            <button
              type="submit"
              className="finish-order-button fc-mobile-finish-button"
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
            ⚽
          </span>

          <div>

            <strong>
              EAFC MOBILE
            </strong>

            <p>
              FC Points y Plata.
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
          EAFC MOBILE TOP UP
        </span>

      </footer>

    </main>
  );
}
