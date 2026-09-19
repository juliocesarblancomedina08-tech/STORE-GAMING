"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

import {
  BLOOD_STRIKE,
  type BloodStrikeOffer,
} from "../../../lib/games/blood-strike";

export default function BloodStrikePage() {
  const router = useRouter();

  const [showOffers, setShowOffers] =
    useState(false);

  const [selectedOffer, setSelectedOffer] =
    useState<BloodStrikeOffer | null>(null);

  const [playerId, setPlayerId] =
    useState("");

  const [error, setError] =
    useState("");

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
    offer: BloodStrikeOffer
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
    if (
      !selectedOffer ||
      processing
    ) {
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
        data: {
          session,
        },
      } =
        await supabase.auth.getSession();

      if (!session) {
        router.push("/");
        return;
      }

      /*
       * ============================================================
       * 2. VALIDAR PLAYER ID
       * ============================================================
       */

      const cleanPlayerId =
        playerId.trim();

      if (!cleanPlayerId) {
        setError(
          "Por favor introduzca su Player ID."
        );
        setProcessing(false);
        return;
      }

      if (
        !/^[A-Za-z0-9_-]{4,32}$/.test(
          cleanPlayerId
        )
      ) {
        setError(
          "Introduzca un Player ID válido."
        );
        setProcessing(false);
        return;
      }

      /*
       * ============================================================
       * 3. CREAR CLAVE DE IDEMPOTENCIA
       * ============================================================
       */

      const idempotencyKey =
        crypto.randomUUID();

      /*
       * ============================================================
       * 4. ENVIAR ORDEN AL BACKEND
       * ============================================================
       */

      const response =
        await fetch(
          "/api/topups/blood-strike",
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

      const result =
        await response.json();

      if (
        !response.ok ||
        !result?.ok
      ) {
        throw new Error(
          result?.error ||
            result?.message ||
            "No se pudo crear la orden."
        );
      }

      /*
       * ============================================================
       * 5. GUARDAR RESULTADO
       * ============================================================
       */

      const order =
        result.order || {};

      setOrderNumber(
        order.order_number ||
          ""
      );

      setSupplierOrderId(
        result.supplierOrderId ||
          order.supplier_order_id ||
          ""
      );

      setOrderStatus(
        order.status ||
          result?.supplier?.status ||
          "pending"
      );

      setOrderCreated(true);

      /*
       * ============================================================
       * 6. SUBIR A LA CONFIRMACIÓN
       * ============================================================
       */

      setTimeout(() => {
        document
          .getElementById(
            "success-section"
          )
          ?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
      }, 150);
    } catch (err: any) {
      console.error(
        "BLOOD STRIKE ORDER ERROR:",
        err
      );

      setError(
        err?.message ||
          "Ocurrió un error al crear la orden."
      );
    } finally {
      setProcessing(false);
    }
  }

  function goToOrders() {
    if (orderNumber) {
      router.push(
        `/orders?order=${encodeURIComponent(
          orderNumber
        )}`
      );
      return;
    }

    router.push("/orders");
  }

  return (
    <main className="game-service-page blood-strike-page">
      {/* ============================================================
          CABECERA
      ============================================================ */}

      <header className="game-service-header">

        <button
          type="button"
          className="back-button"
          onClick={() =>
            router.back()
          }
        >
          ←
        </button>

        <div className="game-service-title">

          <h1>
            BLOOD STRIKE
          </h1>

          <span>
            TOP UP
          </span>

        </div>

      </header>

      {/* ============================================================
          IMAGEN DEL JUEGO
      ============================================================ */}

      <section className="game-service-image-section">

        <img
          src={BLOOD_STRIKE.image}
          alt="Blood Strike"
          className="game-service-image"
        />

      </section>

      {/* ============================================================
          TÍTULO DEL SERVICIO
      ============================================================ */}

      <section className="game-service-welcome">

        <h2>
          Bienvenido al servicio TOP UP
          de Blood Strike
        </h2>

        <p>
          Selecciona la oferta que deseas
          comprar y completa tu Player ID.
        </p>

      </section>

      {/* ============================================================
          BOTÓN PARA MOSTRAR OFERTAS
      ============================================================ */}

      <section className="offers-section">

        <button
          type="button"
          className="offers-toggle"
          onClick={() =>
            setShowOffers(
              !showOffers
            )
          }
        >

          <span className="offers-pencil">
            ✎
          </span>

          <span>
            presione para ver ofertas
          </span>

          <span className="offers-arrow">
            {showOffers
              ? "▲"
              : "▼"}
          </span>

        </button>

        {/* ============================================================
            LISTA DE OFERTAS
        ============================================================ */}

        {showOffers && (

          <div className="offers-list">

            {BLOOD_STRIKE.offers.map(
              (
                offer
              ) => {

                const selected =
                  selectedOffer?.id ===
                  offer.id;

                return (
                  <button
                    key={offer.id}
                    type="button"
                    className={`offer-row ${
                      selected
                        ? "selected"
                        : ""
                    }`}
                    onClick={() =>
                      selectOffer(
                        offer
                      )
                    }
                    disabled={
                      processing
                    }
                  >

                    <div className="offer-row-left">

                      <strong>
                        {
                          offer.displayName
                        }
                      </strong>

                    </div>

                    <div className="offer-row-right">

                      <strong>
                        {offer.price.toFixed(
                          2
                        )}$
                      </strong>

                    </div>

                  </button>
                );
              }
            )}

          </div>
        )}

      </section>

      {/* ============================================================
          SECCIÓN DE ORDEN
      ============================================================ */}

      {!orderCreated && (

        <section
          id="order-section"
          className="order-section"
        >

          {/* OFERTA SELECCIONADA */}

          {selectedOffer && (

            <div className="selected-offer-card">

              <div>

                <span>
                  OFERTA SELECCIONADA
                </span>

                <strong>
                  {
                    selectedOffer.displayName
                  }
                </strong>

              </div>

              <strong>
                {selectedOffer.price.toFixed(
                  2
                )}$
              </strong>

            </div>

          )}

          {/* PLAYER ID */}

          <label
            htmlFor="player-id"
            className="player-id-label"
          >
            PONGA SU ID
          </label>

          <input
            id="player-id"
            type="text"
            value={playerId}
            onChange={(event) =>
              setPlayerId(
                event.target.value
              )
            }
            placeholder="Introduzca su Player ID"
            className="player-id-input"
            maxLength={32}
            disabled={
              processing
            }
            autoComplete="off"
          />

          <p className="player-id-description">
            Introduzca el Player ID de la
            cuenta donde desea recibir la
            compra.
          </p>

          {/* ERROR */}

          {error && (

            <div className="order-error">
              ⚠️ {error}
            </div>

          )}

          {/* FINALIZAR */}

          <button
            type="button"
            className="finalize-order-button"
            onClick={
              createOrder
            }
            disabled={
              processing ||
              !selectedOffer ||
              !playerId.trim()
            }
          >

            {processing
              ? "CREANDO ORDEN..."
              : "FINALIZAR COMPRA"}

          </button>

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

          {/* CÍRCULO VERDE */}

          <div className="success-check">

            ✓

          </div>

          <h2>
            orden creada
          </h2>

          <p>
            Tu pedido de Blood Strike
            fue creado correctamente.
          </p>

          {/* NÚMERO DE ORDEN */}

          {orderNumber && (

            <div className="success-order-number">

              <span>
                ORDEN
              </span>

              <strong>
                #{orderNumber}
              </strong>

            </div>

          )}

          {/* OFERTA */}

          {selectedOffer && (

            <div className="success-order-number">

              <span>
                OFERTA
              </span>

              <strong>
                {
                  selectedOffer.displayName
                }
              </strong>

            </div>

          )}

          {/* PLAYER ID */}

          {playerId && (

            <div className="success-order-number">

              <span>
                PLAYER ID
              </span>

              <strong>
                {playerId}
              </strong>

            </div>

          )}

          {/* TOTAL */}

          {selectedOffer && (

            <div className="success-order-number">

              <span>
                TOTAL
              </span>

              <strong>
                {selectedOffer.price.toFixed(
                  2
                )}$
              </strong>

            </div>

          )}

          {/* ID DEL PROVEEDOR */}

          {supplierOrderId && (

            <div className="success-order-number">

              <span>
                REFERENCIA
              </span>

              <strong>
                #{supplierOrderId}
              </strong>

            </div>

          )}

          {/* ESTADO */}

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

          {/* REVISAR ORDEN */}

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
              BLOOD STRIKE
            </strong>

            <p>
              BC, pases y ofertas.
            </p>

          </div>

        </div>

      </section>

      {/* ============================================================
          INFORMACIÓN DE REGIÓN
      ============================================================ */}

      <section className="service-region">

        <span>
          🌎
        </span>

        <div>

          <strong>
            SERVICIO GLOBAL
          </strong>

          <p>
            Recarga de Blood Strike.
            Introduce correctamente tu
            Player ID antes de realizar
            el pedido.
          </p>

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
          BLOOD STRIKE TOP UP
        </span>

      </footer>

    </main>
  );
            }
