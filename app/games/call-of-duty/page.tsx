"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import {
  CALL_OF_DUTY,
  type CallOfDutyOffer,
} from "../../../lib/games/call-of-duty";

const CATEGORY_ID =
  CALL_OF_DUTY.categoryId;

const gameNote =
  CALL_OF_DUTY.note;

const offers =
  CALL_OF_DUTY.offers;

export default function CallOfDutyPage() {
  const router = useRouter();

  const [showOffers, setShowOffers] =
    useState(false);

  const [selectedOffer, setSelectedOffer] =
    useState<CallOfDutyOffer | null>(null);

  const [userId, setUserId] =
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

  useEffect(() => {
    async function checkSession() {
      const {
        data: { session },
      } =
        await supabase.auth.getSession();

      if (!session) {
        router.replace("/");
      }
    }

    checkSession();
  }, [router]);

  function selectOffer(
    offer: CallOfDutyOffer
  ) {
    setSelectedOffer(offer);

    setError("");

    setOrderCreated(false);

    setOrderNumber("");

    setSupplierOrderId("");

    setOrderStatus("");

    setTimeout(() => {
      document
        .getElementById(
          "order-section"
        )
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 50);
  }

  function handleUserIdChange(
    value: string
  ) {
    const clean =
      value
        .replace(/\s+/g, "")
        .slice(0, 32);

    setUserId(clean);

    setError("");
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!selectedOffer) {
      setError(
        "Seleccione una oferta antes de continuar."
      );

      return;
    }

    const cleanUserId =
      userId.trim();

    if (!cleanUserId) {
      setError(
        "Introduzca su ID de usuario de Activision."
      );

      return;
    }

    if (
      cleanUserId.length < 4
    ) {
      setError(
        "El ID de usuario debe tener al menos 4 caracteres."
      );

      return;
    }

    if (
      !/^[A-Za-z0-9_-]{4,32}$/.test(
        cleanUserId
      )
    ) {
      setError(
        "El ID de usuario de Activision no tiene un formato válido."
      );

      return;
    }

    setProcessing(true);

    setError("");

    try {
      const {
        data: { session },
      } =
        await supabase.auth.getSession();

      if (
        !session?.access_token
      ) {
        router.replace("/");

        return;
      }

      const idempotencyKey =
        crypto.randomUUID();

      const response =
        await fetch(
          "/api/topups/call-of-duty",
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

              userId:
                cleanUserId,

              idempotencyKey,
            }),
          }
        );

      const result =
        await response
          .json()
          .catch(() => null);

      if (
        !response.ok ||
        !result?.ok
      ) {
        throw new Error(
          result?.error ||
            result?.message ||
            "No fue posible crear la orden."
        );
      }

      setOrderNumber(
        result?.order
          ?.order_number ||
          result?.order_number ||
          result?.orderId ||
          `COD-${Date.now()}`
      );

      setSupplierOrderId(
        result?.order
          ?.supplier_order_id ||
          result?.supplierOrderId ||
          result?.supplier_order_id ||
          ""
      );

      setOrderStatus(
        result?.order?.status ||
          result?.status ||
          "SUPPLIER_PENDING"
      );

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
    } catch (err: any) {
      setError(
        err?.message ||
          "Ocurrió un error al crear la orden. Inténtelo nuevamente."
      );
    } finally {
      setProcessing(false);
    }
  }

  return (
    <main className="game-service-page call-of-duty-page">
      <header className="game-service-header">
        <button
          type="button"
          className="game-back-button"
          onClick={() =>
            router.back()
          }
          aria-label="Volver"
        >
          ←
        </button>

        <div className="game-header-title">
          <span>
            CALL OF DUTY
          </span>

          <strong>
            MOBILE
          </strong>
        </div>

        <button
          type="button"
          className="game-cart-button"
          onClick={() =>
            router.push("/orders")
          }
          aria-label="Pedidos"
        >
          🛒
        </button>
      </header>

      <section className="free-fire-main-image call-of-duty-main-image">
        <div className="free-fire-main-overlay" />

        <div className="free-fire-main-text">
          <small>
            TOP UP
          </small>

          <h1>
            CALL OF DUTY
          </h1>

          <strong>
            MOBILE
          </strong>

          <p>
            ACTIVISION · EE. UU.
          </p>
        </div>
      </section>

      <button
        type="button"
        className="offers-toggle"
        onClick={() =>
          setShowOffers(
            (value) => !value
          )
        }
      >
        <span className="offers-toggle-text">
          {showOffers
            ? "OCULTAR OFERTAS"
            : "PRESIONE PARA VER OFERTAS"}
        </span>

        <span className="offers-toggle-pencil">
          ✎
        </span>
      </button>

      {showOffers && (
        <section className="offers-section">
          <div className="offers-heading">
            <span>
              OFERTAS DISPONIBLES
            </span>

            <small>
              CALL OF DUTY MOBILE ·
              ACTIVISION EE. UU.
            </small>
          </div>

          <div className="offers-list">
            {offers.map(
              (offer) => (
                <button
                  type="button"
                  key={offer.id}
                  className={`offer-card ${
                    selectedOffer?.id ===
                    offer.id
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
                        {offer.displayName}
                      </strong>

                      <span>
                        {offer.name}
                      </span>
                    </div>
                  </div>

                  <div className="offer-right">
                    <strong>
                      {offer.price.toFixed(
                        2
                      )}
                      $
                    </strong>

                    <span>
                      →
                    </span>
                  </div>
                </button>
              )
            )}
          </div>
        </section>
      )}

      <section className="game-note">
        <div className="game-note-icon">
          ⓘ
        </div>

        <div className="game-note-content">
          <strong>
            INFORMACIÓN DEL SERVICIO
          </strong>

          <p>
            {gameNote}
          </p>
        </div>
      </section>

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

            <div className="selected-order-card">
              <div className="selected-order-icon">
                {selectedOffer.icon}
              </div>

              <div className="selected-order-info">
                <span>
                  CALL OF DUTY MOBILE
                </span>

                <strong>
                  {
                    selectedOffer.displayName
                  }
                </strong>
              </div>

              <div className="selected-order-price">
                {selectedOffer.price.toFixed(
                  2
                )}
                $
              </div>
            </div>

            <div className="game-note game-note-order">
              <div className="game-note-icon">
                ⚠
              </div>

              <div className="game-note-content">
                <strong>
                  ANTES DE CONTINUAR
                </strong>

                <p>
                  Verifique que su
                  cuenta de Activision
                  pertenece a la región
                  de Estados Unidos.
                  Esta oferta no
                  corresponde a Call of
                  Duty Mobile Garena.
                </p>
              </div>
            </div>

            <form
              className="order-form"
              onSubmit={
                handleSubmit
              }
            >
              <label className="player-id-label">
                ID DE USUARIO
              </label>

              <p className="player-id-description">
                Introduzca el ID de
                usuario de Activision
                donde desea recibir
                los CP.
              </p>

              <div className="player-id-input-wrapper">
                <span>
                  🆔
                </span>

                <input
                  type="text"
                  value={userId}
                  onChange={(event) =>
                    handleUserIdChange(
                      event.target.value
                    )
                  }
                  placeholder={
                    CALL_OF_DUTY
                      .playerField
                      .placeholder
                  }
                  autoComplete="off"
                  maxLength={32}
                />
              </div>

              {error && (
                <div className="order-error">
                  {error}
                </div>
              )}

              <div className="order-total-preview">
                <span>
                  PRECIO
                </span>

                <strong>
                  {selectedOffer.price.toFixed(
                    2
                  )}
                  $
                </strong>
              </div>

              <button
                type="submit"
                className="finish-order-button call-of-duty-finish-button"
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
                REFERENCIA DEL PROVEEDOR
              </span>

              <strong>
                {supplierOrderId}
              </strong>
            </div>
          )}

          <div className="success-order-number">
            <span>
              ESTADO
            </span>

            <strong>
              {orderStatus ||
                "PENDIENTE"}
            </strong>
          </div>

          <button
            type="button"
            className="view-orders-button"
            onClick={() =>
              router.push(
                "/orders"
              )
            }
          >
            REVISAR ORDEN

            <span>
              →
            </span>
          </button>
        </section>
      )}

      <section className="service-info">
        <div className="service-info-item">
          <span>
            01
          </span>

          <div>
            <strong>
              ENTREGA
            </strong>

            <small>
              DIRECTA A SU CUENTA
            </small>
          </div>
        </div>

        <div className="service-info-item">
          <span>
            02
          </span>

          <div>
            <strong>
              REGIÓN
            </strong>

            <small>
              ACTIVISION · EE. UU.
            </small>
          </div>
        </div>

        <div className="service-info-item">
          <span>
            03
          </span>

          <div>
            <strong>
              PROCESO
            </strong>

            <small>
              AUTOMÁTICO
            </small>
          </div>
        </div>
      </section>

      <footer className="game-service-footer">
        <strong>
          🛒STORE GAMING🎮
        </strong>

        <span>
          CALL OF DUTY MOBILE ·
          ACTIVISION
        </span>
      </footer>
    </main>
  );
      }
