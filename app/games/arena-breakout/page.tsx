"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import {
  ARENA_BREAKOUT,
  ArenaBreakoutOffer,
} from "@/lib/games/arena-breakout";

export default function ArenaBreakoutPage() {
  const router = useRouter();

  const [showOffers, setShowOffers] = useState(true);
  const [selectedOffer, setSelectedOffer] =
    useState<ArenaBreakoutOffer | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [playerId, setPlayerId] = useState("");
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);

  const [orderCreated, setOrderCreated] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [supplierOrderId, setSupplierOrderId] = useState("");
  const [orderStatus, setOrderStatus] = useState("");

  const supabase = createClientComponentClient();

  function selectOffer(offer: ArenaBreakoutOffer) {
    setSelectedOffer(offer);
    setQuantity(1);
    setError("");
    setOrderCreated(false);
    setOrderNumber("");
    setSupplierOrderId("");
    setOrderStatus("");

    setTimeout(() => {
      document
        .getElementById("arena-breakout-order-section")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 50);
  }

  function decreaseQuantity() {
    setQuantity((current) => Math.max(1, current - 1));
  }

  function increaseQuantity() {
    setQuantity((current) => current + 1);
  }

  async function createOrder() {
    setError("");
    setOrderCreated(false);

    if (!selectedOffer) {
      setError("Seleccione una oferta.");
      return;
    }

    const cleanPlayerId = playerId.trim();

    if (!/^\d{4,32}$/.test(cleanPlayerId)) {
      setError("El Player ID debe contener entre 4 y 32 números.");
      return;
    }

    /*
     * El endpoint actual de Arena Breakout crea una orden por oferta.
     * No enviamos quantity al proveedor porque su API actual no define
     * un campo quantity.
     */
    if (quantity !== 1) {
      setError(
        "Para esta recarga debe realizarse una orden individual. Mantenga la cantidad en 1."
      );
      return;
    }

    setProcessing(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setError("Su sesión ha expirado. Inicie sesión nuevamente.");
        setProcessing(false);
        return;
      }

      const idempotencyKey = crypto.randomUUID();

      const response = await fetch("/api/topups/arena-breakout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          offerId: selectedOffer.id,
          playerId: cleanPlayerId,
          retailPrice: selectedOffer.price,
          idempotencyKey,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok && response.status !== 202) {
        throw new Error(
          data?.error ||
            data?.message ||
            "No se pudo crear la orden."
        );
      }

      setOrderCreated(true);
      setOrderNumber(
        String(
          data?.orderNumber ||
            data?.order?.orderNumber ||
            data?.order?.id ||
            ""
        )
      );
      setSupplierOrderId(
        String(
          data?.supplierOrderId ||
            data?.supplier_order_id ||
            ""
        )
      );
      setOrderStatus(
        String(data?.status || "SUPPLIER_PENDING")
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo crear la orden."
      );
    } finally {
      setProcessing(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void createOrder();
  }

  return (
    <main className="arena-breakout-page">
      <header className="arena-breakout-header">
        <button
          type="button"
          className="arena-breakout-back-button"
          onClick={() => router.back()}
          aria-label="Volver"
        >
          ←
        </button>

        <div className="arena-breakout-header-title">
          ARENA BREAKOUT
        </div>

        <button
          type="button"
          className="arena-breakout-orders-button"
          onClick={() => router.push("/orders")}
        >
          📋
        </button>
      </header>

      <div className="arena-breakout-content">
        <section className="arena-breakout-banner">
          <img
            src={ARENA_BREAKOUT.image}
            alt="Arena Breakout"
          />

          <div className="arena-breakout-banner-overlay">
            <div className="arena-breakout-banner-text">
              <span>ARENA</span>
              <strong>BREAKOUT</strong>
            </div>
          </div>
        </section>

        <section className="arena-breakout-note">
          <div className="arena-breakout-note-icon">ℹ️</div>

          <div className="arena-breakout-note-content">
            <strong>Información del servicio</strong>
            <p>{ARENA_BREAKOUT.note}</p>
          </div>
        </section>

        <button
          type="button"
          className="arena-breakout-offers-toggle"
          onClick={() => setShowOffers((current) => !current)}
        >
          <span>Presione para ver ofertas</span>

          <span
            className={`arena-breakout-offers-arrow ${
              showOffers ? "open" : ""
            }`}
          >
           ⌄
          </span>
        </button>

        {showOffers && (
          <section className="arena-breakout-offers-section">
            <div className="arena-breakout-offers-list">
              {ARENA_BREAKOUT.offers.map((offer) => {
                const isSelected =
                  selectedOffer?.id === offer.id;

                return (
                  <button
                    key={offer.id}
                    type="button"
                    className={`arena-breakout-offer ${
                      isSelected ? "selected" : ""
                    }`}
                    onClick={() => selectOffer(offer)}
                  >
                    <div className="arena-breakout-offer-left">
                      <div className="arena-breakout-offer-icon">
                        🎁
                      </div>

                      <div>
                        <div className="arena-breakout-offer-name">
                          {offer.name}
                        </div>

                        <div className="arena-breakout-offer-description">
                          {offer.displayName}
                        </div>
                      </div>
                    </div>

                    <div className="arena-breakout-offer-right">
                      <div className="arena-breakout-offer-price">
                        ${Number(offer.price).toFixed(2)}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {selectedOffer && (
          <section
            id="arena-breakout-order-section"
            className="arena-breakout-order-section"
          >
            {!orderCreated ? (
              <>
                <div className="arena-breakout-selected-offer">
                  <div>
                    <span className="arena-breakout-selected-label">
                      OFERTA SELECCIONADA
                    </span>

                    <strong>
                      {selectedOffer.displayName}
                    </strong>
                  </div>

                  <span className="arena-breakout-selected-price">
                    ${Number(selectedOffer.price).toFixed(2)}
                  </span>
                </div>

                <div className="arena-breakout-quantity-section">
                  <label>Cantidad</label>

                  <div className="arena-breakout-quantity-control">
                    <button
                      type="button"
                      onClick={decreaseQuantity}
                      aria-label="Disminuir cantidad"
                    >
                      −
                    </button>

                    <span>{quantity}</span>

                    <button
                      type="button"
                      onClick={increaseQuantity}
                      aria-label="Aumentar cantidad"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="arena-breakout-order-note">
                  <span>🎮</span>
                  <p>
                    Introduzca correctamente el Player ID de
                    su cuenta de Arena Breakout.
                  </p>
                </div>

                <form
                  className="arena-breakout-order-form"
                  onSubmit={handleSubmit}
                >
                  <label htmlFor="arena-breakout-player-id">
                    Player ID
                  </label>

                  <div className="arena-breakout-input-wrapper">
                    <span>🆔</span>

                    <input
                      id="arena-breakout-player-id"
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="Introduzca su Player ID"
                      value={playerId}
                      maxLength={32}
                      onChange={(event) => {
                        setPlayerId(
                          event.target.value.replace(/\D/g, "")
                        );
                        setError("");
                      }}
                    />
                  </div>

                  {error && (
                    <div className="arena-breakout-error">
                      ⚠️ {error}
                    </div>
                  )}

                  <div className="arena-breakout-total">
                    <span>Total</span>

                    <strong>
                      $
                      {(
                        Number(selectedOffer.price) * quantity
                      ).toFixed(2)}
                    </strong>
                  </div>

                  <button
                    type="submit"
                    className="arena-breakout-create-order-button"
                    disabled={processing}
                  >
                    {processing
                      ? "CREANDO ORDEN..."
                      : "CREAR ORDEN"}
                  </button>
                </form>
              </>
            ) : (
              <div className="arena-breakout-success">
                <div className="arena-breakout-success-icon">
                  ✓
                </div>

                <h2>ORDEN CREADA</h2>

                <p>
                  Su solicitud de recarga fue registrada
                  correctamente.
                </p>

                {orderNumber && (
                  <div className="arena-breakout-success-row">
                    <span>Número de orden</span>
                    <strong>{orderNumber}</strong>
                  </div>
                )}

                {supplierOrderId && (
                  <div className="arena-breakout-success-row">
                    <span>ID del proveedor</span>
                    <strong>{supplierOrderId}</strong>
                  </div>
                )}

                {orderStatus && (
                  <div className="arena-breakout-success-row">
                    <span>Estado</span>
                    <strong>{orderStatus}</strong>
                  </div>
                )}

                <button
                  type="button"
                  className="arena-breakout-create-order-button"
                  onClick={() => router.push("/orders")}
                >
                  REVISAR ORDEN
                </button>
              </div>
            )}
          </section>
        )}

        <section className="arena-breakout-service-info">
          <div>
            <span>🌎</span>
            <strong>Región</strong>
            <p>Global</p>
          </div>

          <div>
            <span>⚡</span>
            <strong>Entrega</strong>
            <p>Automática</p>
          </div>

          <div>
            <span>🆔</span>
            <strong>Dato requerido</strong>
            <p>Player ID</p>
          </div>
        </section>

        <footer className="arena-breakout-footer">
          <p>
            Recarga segura de Arena Breakout
          </p>

          <span>
            🛒STORE GAMING🎮
          </span>
        </footer>
      </div>
    </main>
  );
        }
