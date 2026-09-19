"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { BLOOD_STRIKE } from "../../../lib/games/blood-strike";

type Offer = {
  id: string;
  supplierOfferId: string;
  name: string;
  displayName: string;
  price: number;
  supplierPrice: number;
};

type CreatedOrder = {
  id?: string;
  order_number?: string;
  supplier_order_id?: string | null;
  status?: string;
  supplier_status?: string | null;
  offer_name?: string;
  player_id?: string;
  amount?: number;
  price?: number;
  currency?: string;
  created_at?: string;
};

type ApiResponse = {
  ok?: boolean;
  message?: string;
  error?: string;
  order?: CreatedOrder;
  supplier?: unknown;
  supplierOrderId?: string | null;
};

export default function BloodStrikePage() {
  const router = useRouter();

  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [playerId, setPlayerId] = useState("");

  const [loading, setLoading] = useState(true);
  const [creatingOrder, setCreatingOrder] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [createdOrder, setCreatedOrder] =
    useState<CreatedOrder | null>(null);

  const [supplierOrderId, setSupplierOrderId] = useState<string | null>(
    null
  );

  const [expanded, setExpanded] = useState(true);

  const offers = useMemo(
    () => BLOOD_STRIKE.offers as readonly Offer[],
    []
  );

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (!session) {
          router.replace("/");
          return;
        }

        setLoading(false);
      } catch {
        if (!mounted) return;

        setError("No se pudo verificar la sesión.");
        setLoading(false);
      }
    }

    checkSession();

    return () => {
      mounted = false;
    };
  }, [router]);

  function selectOffer(offer: Offer) {
    if (creatingOrder) return;

    setSelectedOffer(offer);
    setError("");
    setSuccess(false);
    setCreatedOrder(null);
    setSupplierOrderId(null);

    setTimeout(() => {
      document
        .getElementById("blood-strike-player-id")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
    }, 50);
  }

  function normalizePlayerId(value: string) {
    return value.replace(/\s/g, "");
  }

  function isValidPlayerId(value: string) {
    return /^[A-Za-z0-9_-]{4,32}$/.test(value);
  }

  async function createOrder() {
    setError("");

    if (!selectedOffer) {
      setError("Seleccione una oferta antes de continuar.");
      return;
    }

    const cleanPlayerId = normalizePlayerId(playerId);

    if (!cleanPlayerId) {
      setError("Introduzca su Player ID.");
      return;
    }

    if (!isValidPlayerId(cleanPlayerId)) {
      setError(
        "El Player ID debe tener entre 4 y 32 caracteres."
      );
      return;
    }

    setCreatingOrder(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        router.replace("/");
        return;
      }

      const idempotencyKey = crypto.randomUUID();

      const response = await fetch("/api/topups/blood-strike", {
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
      });

      let result: ApiResponse = {};

      try {
        result = await response.json();
      } catch {
        result = {};
      }

      if (!response.ok || !result.ok) {
        throw new Error(
          result.error ||
            result.message ||
            "No se pudo crear la orden."
        );
      }

      const order = result.order || null;

      setCreatedOrder(order);

      setSupplierOrderId(
        result.supplierOrderId ||
          order?.supplier_order_id ||
          null
      );

      setSuccess(true);
    } catch (err: any) {
      setError(
        err?.message ||
          "Ocurrió un error al crear la orden."
      );
    } finally {
      setCreatingOrder(false);
    }
  }

  function reviewOrder() {
    if (createdOrder?.order_number) {
      router.push(
        `/orders?order=${encodeURIComponent(
          createdOrder.order_number
        )}`
      );
      return;
    }

    router.push("/orders");
  }

  function resetPurchase() {
    setSelectedOffer(null);
    setPlayerId("");
    setSuccess(false);
    setCreatedOrder(null);
    setSupplierOrderId(null);
    setError("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  if (loading) {
    return (
      <main className="game-page">
        <div className="game-loading">
          <div className="game-loading-spinner" />
          <p>Cargando Blood Strike...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="game-page blood-strike-page">
      <header className="game-page-header">
        <button
          type="button"
          className="game-back-button"
          onClick={() => router.back()}
          aria-label="Volver"
        >
          ←
        </button>

        <div className="game-page-title-wrap">
          <h1 className="game-page-title">
            BLOOD STRIKE
          </h1>

          <p className="game-page-subtitle">
            Recargas y ofertas
          </p>
        </div>

        <button
          type="button"
          className="game-home-button"
          onClick={() => router.push("/")}
          aria-label="Inicio"
        >
          🏠
        </button>
      </header>

      <section className="game-hero">
        <img
          src={BLOOD_STRIKE.image}
          alt="Blood Strike"
          className="game-hero-image"
        />
      </section>

      <section className="game-service-intro">
        <h2>
          Bienvenido al servicio TOP UP de Blood Strike
        </h2>

        <p>
          Selecciona la recarga o el pase que deseas
          comprar.
        </p>

        <div className="game-service-features">
          <span>⚡ Entrega rápida</span>
          <span>🔒 Compra segura</span>
          <span>🎮 Recarga automática</span>
        </div>
      </section>

      {!success && (
        <>
          <section className="game-offers-section">
            <button
              type="button"
              className="game-offers-toggle"
              onClick={() => setExpanded((value) => !value)}
              aria-expanded={expanded}
            >
              <span className="game-offers-toggle-icon">
                ✎
              </span>

              <span>
                presione para ver ofertas
              </span>

              <span className="game-offers-toggle-arrow">
                {expanded ? "⌃" : "⌄"}
              </span>
            </button>

            {expanded && (
              <div className="game-offers-list">
                {offers.map((offer) => {
                  const isSelected =
                    selectedOffer?.id === offer.id;

                  return (
                    <button
                      type="button"
                      key={offer.id}
                      className={`game-offer-row ${
                        isSelected
                          ? "selected"
                          : ""
                      }`}
                      onClick={() =>
                        selectOffer(offer)
                      }
                      disabled={creatingOrder}
                    >
                      <div className="game-offer-info">
                        <strong>
                          {offer.displayName}
                        </strong>

                        <span>
                          Blood Strike
                        </span>
                      </div>

                      <div className="game-offer-price">
                        {offer.price.toFixed(2)}$
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section
            id="blood-strike-player-id"
            className="game-purchase-section"
          >
            <div className="game-selected-offer">
              <div>
                <span className="game-selected-label">
                  Oferta seleccionada
                </span>

                <strong>
                  {selectedOffer
                    ? selectedOffer.displayName
                    : "Ninguna oferta seleccionada"}
                </strong>
              </div>

              <strong className="game-selected-price">
                {selectedOffer
                  ? `${selectedOffer.price.toFixed(
                      2
                    )}$`
                  : "--"}
              </strong>
            </div>

            <label
              htmlFor="blood-strike-player-id-input"
              className="game-input-label"
            >
              {BLOOD_STRIKE.playerField.label}
            </label>

            <input
              id="blood-strike-player-id-input"
              type="text"
              inputMode="text"
              autoComplete="off"
              value={playerId}
              onChange={(event) =>
                setPlayerId(event.target.value)
              }
              placeholder={
                BLOOD_STRIKE.playerField.placeholder
              }
              maxLength={32}
              className="game-player-input"
              disabled={creatingOrder}
            />

            <p className="game-input-description">
              {BLOOD_STRIKE.playerField.description}
            </p>

            {error && (
              <div className="game-error-message">
                ⚠️ {error}
              </div>
            )}

            <button
              type="button"
              className="game-finalize-button"
              onClick={createOrder}
              disabled={
                creatingOrder ||
                !selectedOffer ||
                !playerId.trim()
              }
            >
              {creatingOrder
                ? "CREANDO ORDEN..."
                : "FINALIZAR COMPRA"}
            </button>
          </section>
        </>
      )}

      {success && createdOrder && (
        <section className="game-success-section">
          <div className="game-success-icon">
            ✓
          </div>

          <h2>orden creada</h2>

          <p className="game-success-message">
            Tu pedido de Blood Strike fue creado
            correctamente.
          </p>

          <div className="game-order-card">
            <div className="game-order-row">
              <span>Orden</span>

              <strong>
                {createdOrder.order_number ||
                  "Pendiente"}
              </strong>
            </div>

            <div className="game-order-row">
              <span>Oferta</span>

              <strong>
                {createdOrder.offer_name ||
                  selectedOffer?.displayName ||
                  "--"}
              </strong>
            </div>

            <div className="game-order-row">
              <span>Player ID</span>

              <strong>
                {createdOrder.player_id ||
                  playerId}
              </strong>
            </div>

            <div className="game-order-row">
              <span>Total</span>

              <strong>
                {typeof createdOrder.price ===
                "number"
                  ? `${createdOrder.price.toFixed(
                      2
                    )}$`
                  : selectedOffer
                    ? `${selectedOffer.price.toFixed(
                        2
                      )}$`
                    : "--"}
              </strong>
            </div>

            <div className="game-order-row">
              <span>Estado</span>

              <strong>
                {createdOrder.status ||
                  "pending"}
              </strong>
            </div>

            {supplierOrderId && (
              <div className="game-order-row">
                <span>Referencia</span>

                <strong>
                  {supplierOrderId}
                </strong>
              </div>
            )}
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
            className="game-new-purchase-button"
            onClick={resetPurchase}
          >
            HACER OTRA COMPRA
          </button>
        </section>
      )}

      <section className="game-region-note">
        <span>🌎</span>

        <div>
          <strong>Región / servicio</strong>

          <p>
            {BLOOD_STRIKE.note}
          </p>
        </div>
      </section>

      <footer className="game-page-footer">
        <p>🛒 STORE GAMING 🎮</p>

        <span>
          Blood Strike • Recarga segura
        </span>
      </footer>
    </main>
  );
        }
