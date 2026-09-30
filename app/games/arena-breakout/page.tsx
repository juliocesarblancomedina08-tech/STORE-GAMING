"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import {
  ARENA_BREAKOUT,
  ArenaBreakoutOffer,
} from "@/lib/games/arena-breakout";

export default function ArenaBreakoutPage() {
  const router = useRouter();
  const supabase = createClientComponentClient();

  const [showOffers, setShowOffers] = useState(false);
  const [selectedOffer, setSelectedOffer] =
    useState<ArenaBreakoutOffer | null>(null);

  const [playerId, setPlayerId] = useState("");
  const [error, setError] = useState("");

  const [processing, setProcessing] = useState(false);
  const [orderCreated, setOrderCreated] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [supplierOrderId, setSupplierOrderId] = useState("");
  const [orderStatus, setOrderStatus] = useState("");

  function selectOffer(offer: ArenaBreakoutOffer) {
    setSelectedOffer(offer);
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

  function handlePlayerIdChange(value: string) {
    const cleaned = value.replace(/\D/g, "").slice(0, 32);
    setPlayerId(cleaned);
    setError("");
  }

  async function createOrder() {
    if (!selectedOffer) {
      setError("Seleccione una oferta.");
      return;
    }

    const cleanPlayerId = playerId.trim();

    if (!cleanPlayerId) {
      setError("Introduzca su Player ID.");
      return;
    }

    if (!/^\d{4,32}$/.test(cleanPlayerId)) {
      setError("El Player ID debe contener entre 4 y 32 números.");
      return;
    }

    setProcessing(true);
    setError("");
    setOrderCreated(false);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setError("Su sesión ha expirado. Inicie sesión nuevamente.");
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

      const data = await response.json().catch(() => null);

      if (!response.ok && response.status !== 202) {
        throw new Error(
          data?.error || "No se pudo crear la orden."
        );
      }

      setOrderCreated(true);
      setOrderNumber(
        String(data?.orderNumber || data?.order_number || "")
      );
      setSupplierOrderId(
        String(
          data?.supplierOrderId ||
            data?.supplier_order_id ||
            ""
        )
      );
      setOrderStatus(String(data?.status || "PENDIENTE"));
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
          Pedidos
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
              ARENA BREAKOUT
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

          <span className="arena-breakout-offers-arrow">
            {showOffers ? "⌃" : "⌄"}
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
                    type="button"
                    key={offer.id}
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
                        ${offer.price.toFixed(2)}
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
                    <span>Oferta seleccionada</span>
                    <strong>{selectedOffer.name}</strong>
                  </div>

                  <div className="arena-breakout-offer-price">
                    ${selectedOffer.price.toFixed(2)}
                  </div>
                </div>

                <form
                  className="arena-breakout-order-form"
                  onSubmit={handleSubmit}
                >
                  <label htmlFor="arena-breakout-player-id">
                    Player ID
                  </label>

                  <div className="arena-breakout-input-wrapper">
                    <input
                      id="arena-breakout-player-id"
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="Introduzca su Player ID"
                      value={playerId}
                      onChange={(event) =>
                        handlePlayerIdChange(event.target.value)
                      }
                      maxLength={32}
                    />
                  </div>

                  <div className="arena-breakout-order-note">
                    <span>🔒</span>
                    <span>
                      Verifique que el Player ID sea correcto antes
                      de crear la orden.
                    </span>
                  </div>

                  {error && (
                    <div className="arena-breakout-error">
                      {error}
                    </div>
                  )}

                  <div className="arena-breakout-total">
                    <span>Total</span>
                    <strong>
                      ${selectedOffer.price.toFixed(2)}
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
              <section className="arena-breakout-success-section">
                <div className="arena-breakout-success-icon">
                  ✓
                </div>

                <h2>Orden creada</h2>

                <p>
                  Su orden fue creada correctamente.
                </p>

                <div className="arena-breakout-success-details">
                  <div>
                    <span>Oferta</span>
                    <strong>{selectedOffer.name}</strong>
                  </div>

                  <div>
                    <span>Player ID</span>
                    <strong>{playerId}</strong>
                  </div>

                  <div>
                    <span>Total</span>
                    <strong>
                      ${selectedOffer.price.toFixed(2)}
                    </strong>
                  </div>

                  {orderNumber && (
                    <div>
                      <span>Número de orden</span>
                      <strong>{orderNumber}</strong>
                    </div>
                  )}

                  {supplierOrderId && (
                    <div>
                      <span>Orden del proveedor</span>
                      <strong>{supplierOrderId}</strong>
                    </div>
                  )}

                  {orderStatus && (
                    <div>
                      <span>Estado</span>
                      <strong>{orderStatus}</strong>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className="arena-breakout-create-order-button"
                  onClick={() => router.push("/orders")}
                >
                  REVISAR ORDEN
                </button>
              </section>
            )}
          </section>
        )}

        <section className="arena-breakout-service-info">
          <div>
            <span className="arena-breakout-service-info-icon">
              ⚡
            </span>

            <div>
              <strong>Entrega automática</strong>
              <p>
                La recarga se procesa automáticamente después
                de realizar el pedido.
              </p>
            </div>
          </div>

          <div>
            <span className="arena-breakout-service-info-icon">
              🌎
            </span>

            <div>
              <strong>Región Global</strong>
              <p>
                Servicio disponible para cuentas de Arena Breakout
                de la región Global.
              </p>
            </div>
          </div>

          <div>
            <span className="arena-breakout-service-info-icon">
              🆔
            </span>

            <div>
              <strong>Player ID</strong>
              <p>
                Solo necesitamos tu Player ID para realizar la
                recarga.
              </p>
            </div>
          </div>
        </section>

        <footer className="arena-breakout-footer">
          <span>🛒 STORE GAMING 🎮</span>
          <small>Recargas rápidas y seguras</small>
        </footer>
      </div>
    </main>
  );
                                   }
