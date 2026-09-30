"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type SupplierOffer = {
  offer_id: string;
  name: string;
  price_usd: string | number;
};

type FreeFireIdOffer = {
  id: string;
  supplierOfferId: string;
  name: string;
  display: string;
  price: number;
  supplierPrice: number;
  icon: string;
};

const STORE_MARGIN = 0.2;

function getIcon(name: string) {
  const lower = name.toLowerCase();

  if (
    lower.includes("pass") ||
    lower.includes("pase") ||
    lower.includes("bp") ||
    lower.includes("membres")
  ) {
    return "🎟️";
  }

  return "💎";
}

function getDisplay(name: string) {
  const lower = name.toLowerCase();

  /*
   * Pases de subida de nivel
   */
  const levelMatch = name.match(
    /(?:level up pass|pase de subida de nivel)\s*[-–]?\s*(?:level|nivel)?\s*(\d+)/i
  );

  if (levelMatch) {
    return `PASE NIVEL ${levelMatch[1]} 🎟️`;
  }

  /*
   * Membresías
   */
  if (lower.includes("membresía semanal")) {
    return "MEMBRESÍA SEMANAL 🎟️";
  }

  if (lower.includes("membresía mensual")) {
    return "MEMBRESÍA MENSUAL 🎟️";
  }

  /*
   * Tarjeta BP
   */
  if (lower.includes("tarjeta bp")) {
    return "TARJETA BP 🎟️";
  }

  /*
   * Diamantes
   */
  const diamondMatch = name.match(
    /^(\d+)\s*(?:diamantes|diamonds)/i
  );

  if (diamondMatch) {
    return `${diamondMatch[1]}💎`;
  }

  return name;
}

export default function FreeFireIdPage() {
  const router = useRouter();

  const [offers, setOffers] =
    useState<FreeFireIdOffer[]>([]);

  const [loadingOffers, setLoadingOffers] =
    useState(true);

  const [offersOpen, setOffersOpen] =
    useState(false);

  const [selectedOffer, setSelectedOffer] =
    useState<FreeFireIdOffer | null>(null);

  const [playerId, setPlayerId] =
    useState("");

  const [processing, setProcessing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [orderCreated, setOrderCreated] =
    useState(false);

  const [orderNumber, setOrderNumber] =
    useState("");

  /*
   * ============================================================
   * CARGAR CATÁLOGO DE FAZERCARDS
   * ============================================================
   */

  useEffect(() => {
    let cancelled = false;

    async function loadOffers() {
      try {
        setLoadingOffers(true);
        setError("");

        const response = await fetch(
          "/api/fazercards/topups?category_id=free_fire_id",
          {
            cache: "no-store",
          }
        );

        const data =
          await response.json();

        if (
          !response.ok ||
          !data?.ok
        ) {
          throw new Error(
            data?.error ||
              "No se pudo cargar el catálogo."
          );
        }

        const supplierOffers: SupplierOffer[] =
          Array.isArray(data.offers)
            ? data.offers
            : [];

        const normalized: FreeFireIdOffer[] =
          supplierOffers
            .map((offer) => {
              const supplierPrice =
                Number(offer.price_usd);

              return {
                id: offer.offer_id,

                supplierOfferId:
                  offer.offer_id,

                name:
                  offer.name,

                display:
                  getDisplay(
                    offer.name
                  ),

                supplierPrice,

                price:
                  Math.round(
                    (
                      supplierPrice +
                      STORE_MARGIN
                    ) * 10000
                  ) / 10000,

                icon:
                  getIcon(
                    offer.name
                  ),
              };
            })
            .filter(
              (offer) =>
                offer.supplierPrice >
                0
            );

        if (!cancelled) {
          setOffers(normalized);
        }
      } catch (err) {
        console.error(
          "ERROR CARGANDO FREE FIRE ID:",
          err
        );

        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "No se pudo cargar el catálogo."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingOffers(false);
        }
      }
    }

    loadOffers();

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * ============================================================
   * SELECCIONAR OFERTA
   * ============================================================
   */

  function handleSelectOffer(
    offer: FreeFireIdOffer
  ) {
    if (
      !offer.supplierPrice ||
      offer.supplierPrice <= 0
    ) {
      setError(
        "Esta oferta todavía no tiene un precio disponible."
      );

      return;
    }

    setSelectedOffer(
      offer
    );

    setPlayerId("");

    setError("");

    setOrderCreated(false);

    setOrderNumber("");
  }

  /*
   * ============================================================
   * CREAR ORDEN
   * ============================================================
   */

  async function createOrder() {
    if (!selectedOffer) {
      setError(
        "Selecciona una oferta."
      );

      return;
    }

    const cleanPlayerId =
      playerId.trim();

    if (!cleanPlayerId) {
      setError(
        "Introduce tu ID de jugador."
      );

      return;
    }

    if (
      !/^[0-9]+$/.test(
        cleanPlayerId
      )
    ) {
      setError(
        "El ID de jugador solo puede contener números."
      );

      return;
    }

    if (
      cleanPlayerId.length < 4
    ) {
      setError(
        "El ID de jugador debe tener al menos 4 números."
      );

      return;
    }

    if (
      cleanPlayerId.length > 20
    ) {
      setError(
        "El ID de jugador no puede superar 20 números."
      );

      return;
    }

    if (
      !selectedOffer.supplierPrice ||
      selectedOffer.supplierPrice <= 0
    ) {
      setError(
        "Esta oferta todavía no tiene un precio disponible."
      );

      return;
    }

    try {
      setProcessing(true);
      setError("");

      /*
       * Obtener sesión
       */
      const {
        data: { session },
      } =
        await supabase.auth.getSession();

      if (
        !session?.access_token
      ) {
        router.push("/login");
        return;
      }

      /*
       * Enviar pedido
       */
      const response =
        await fetch(
          "/api/topups/free-fire-id",
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
                selectedOffer.supplierOfferId,

              offerName:
                selectedOffer.name,

              playerId:
                cleanPlayerId,

              retailPrice:
                selectedOffer.price,

              idempotencyKey:
                crypto.randomUUID(),
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            "No se pudo crear el pedido."
        );
      }

      /*
       * Número de orden
       */
      const createdOrderNumber =
        data.orderNumber ||
        data.order_number ||
        data.order?.order_number ||
        data.order?.id ||
        data.id ||
        "";

      setOrderNumber(
        String(
          createdOrderNumber
        )
      );

      setOrderCreated(
        true
      );

      setSelectedOffer(
        null
      );

      setPlayerId("");
    } catch (err) {
      console.error(
        "ERROR CREANDO PEDIDO FREE FIRE ID:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "No se pudo crear el pedido."
      );
    } finally {
      setProcessing(
        false
      );
    }
  }

  /*
   * ============================================================
   * FORMULARIO
   * ============================================================
   */

  function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    void createOrder();
  }

  /*
   * ============================================================
   * UI
   * ============================================================
   */

  return (
    <main className="free-fire-id-page">
      <header className="free-fire-id-header">
        <button
          type="button"
          className="free-fire-id-back-button"
          onClick={() =>
            router.push("/top-up")
          }
        >
          ←
        </button>

        <h1>
          Free Fire (ID)
        </h1>

        <div className="free-fire-id-header-space" />
      </header>

      <section className="free-fire-id-content">
        <div className="free-fire-id-banner">
          <img
            src="/images/free-fire-latam.jpg"
            alt="Free Fire Indonesia"
          />
        </div>

        <div className="free-fire-id-note">
          <strong>
            🇮🇩 Región Indonesia
          </strong>

          <p>
            Recarga de Free Fire.
            Ingresa tu ID de jugador
            antes de realizar el pedido.
            Asegúrate de que tu cuenta
            de Free Fire esté registrada
            en la región de Indonesia;
            los paquetes están restringidos
            por región.
          </p>
        </div>

        <button
          type="button"
          className="free-fire-id-offers-toggle"
          onClick={() => {
            setOffersOpen(
              (value) => !value
            );

            setError("");
          }}
        >
          <span>
            ✏️ Presione para ver ofertas
          </span>

          <span className="free-fire-id-offers-arrow">
            {offersOpen
              ? "▲"
              : "▼"}
          </span>
        </button>

        {offersOpen && (
          <section className="free-fire-id-offers-section">
            {loadingOffers ? (
              <div className="free-fire-id-loading">
                Cargando ofertas...
              </div>
            ) : error &&
              offers.length === 0 ? (
              <div className="free-fire-id-error">
                {error}
              </div>
            ) : offers.length === 0 ? (
              <div className="free-fire-id-error">
                No hay ofertas disponibles.
              </div>
            ) : (
              <div className="free-fire-id-offers-list">
                {offers.map(
                  (offer) => {
                    const selected =
                      selectedOffer?.supplierOfferId ===
                      offer.supplierOfferId;

                    return (
                      <button
                        key={
                          offer.supplierOfferId
                        }
                        type="button"
                        className={`free-fire-id-offer ${
                          selected
                            ? "selected"
                            : ""
                        }`}
                        onClick={() =>
                          handleSelectOffer(
                            offer
                          )
                        }
                      >
                        <div className="free-fire-id-offer-left">
                          <span className="free-fire-id-offer-icon">
                            {offer.icon}
                          </span>

                          <div>
                            <strong>
                              {offer.display}
                            </strong>

                            <small>
                              {offer.name}
                            </small>
                          </div>
                        </div>

                        <div className="free-fire-id-offer-price">
                          {offer.price.toFixed(
                            4
                          )}
                          $
                        </div>
                      </button>
                    );
                  }
                )}
              </div>
            )}
          </section>
        )}

        {selectedOffer &&
          !orderCreated && (
            <section
              id="free-fire-id-order-form"
              className="free-fire-id-order-section"
            >
              <div className="free-fire-id-selected-offer">
                <span>
                  {selectedOffer.icon}
                </span>

                <div>
                  <strong>
                    {selectedOffer.name}
                  </strong>

                  <span>
                    {selectedOffer.price.toFixed(
                      4
                    )}
                    $
                  </span>
                </div>
              </div>

              <form
                onSubmit={
                  handleSubmit
                }
              >
                <label htmlFor="free-fire-id-player-id">
                  ID del jugador
                </label>

                <input
                  id="free-fire-id-player-id"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="Introduzca su ID de jugador"
                  value={playerId}
                  onChange={(event) =>
                    setPlayerId(
                      event.target.value
                    )
                  }
                  disabled={
                    processing
                  }
                />

                <p className="free-fire-id-input-help">
                  Introduce el ID de la
                  cuenta de Free Fire
                  donde deseas recibir
                  la recarga.
                </p>

                {error && (
                  <div className="free-fire-id-form-error">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  className="free-fire-id-create-order-button"
                  disabled={
                    processing
                  }
                >
                  {processing
                    ? "FINALIZANDO ORDEN..."
                    : "FINALIZAR ORDEN"}
                </button>
              </form>
            </section>
          )}

        {orderCreated && (
          <section className="free-fire-id-success-section">
            <div className="free-fire-id-success-icon">
              ✓
            </div>

            <h2>
              Orden creada
            </h2>

            <p>
              Tu pedido de Free Fire
              Indonesia fue creado
              correctamente.
            </p>

            {orderNumber && (
              <div className="free-fire-id-order-number">
                <span>
                  Número de orden
                </span>

                <strong>
                  {orderNumber}
                </strong>
              </div>
            )}

            <button
              type="button"
              className="free-fire-id-review-button"
              onClick={() =>
                router.push(
                  "/orders"
                )
              }
            >
              Revisar orden
            </button>

            <button
              type="button"
              className="free-fire-id-store-button"
              onClick={() =>
                router.push(
                  "/top-up"
                )
              }
            >
              Volver a la tienda
            </button>
          </section>
        )}
      </section>

      <section className="free-fire-id-info">
        <div className="free-fire-id-info-item">
          <span>⚡</span>

          <div>
            <strong>
              ENTREGA AUTOMÁTICA
            </strong>

            <p>
              El producto se entrega
              directamente a la cuenta.
            </p>
          </div>
        </div>

        <div className="free-fire-id-info-item">
          <span>🔒</span>

          <div>
            <strong>
              COMPRA SEGURA
            </strong>

            <p>
              Procesamos tu pedido de
              forma segura mediante
              FazerCards.
            </p>
          </div>
        </div>

        <div className="free-fire-id-info-item">
          <span>🇮🇩</span>

          <div>
            <strong>
              REGIÓN INDONESIA
            </strong>

            <p>
              Este servicio funciona
              únicamente con cuentas de
              Free Fire Indonesia.
            </p>
          </div>
        </div>
      </section>

      <footer className="free-fire-id-footer">
        🛒 STORE GAMING 🎮
        <small>
          FREE FIRE (ID) · INDONESIA
        </small>
      </footer>

      <style jsx>{`
        .free-fire-id-page {
          min-height: 100vh;
          color: #fff;
          background:
            linear-gradient(
              rgba(0, 0, 0, 0.72),
              rgba(0, 0, 0, 0.86)
            ),
            url("/images/battle-royale-bg.jpg")
              center / cover fixed;
          padding-bottom: 30px;
        }

        .free-fire-id-header {
          position: sticky;
          top: 0;
          z-index: 20;
          display: flex;
          align-items: center;
          justify-content: space-between;
          min-height: 58px;
          padding: 8px 12px;
          background: rgba(0, 0, 0, 0.88);
          border-bottom: 1px solid
            rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
        }

        .free-fire-id-header h1 {
          margin: 0;
          font-size: 19px;
          font-weight: 800;
          text-align: center;
        }

        .free-fire-id-back-button {
          width: 40px;
          height: 40px;
          border: 0;
          border-radius: 10px;
          background: rgba(
            255,
            255,
            255,
            0.08
          );
          color: #fff;
          font-size: 25px;
          cursor: pointer;
        }

        .free-fire-id-header-space {
          width: 40px;
        }

        .free-fire-id-content {
          width: min(100%, 680px);
          margin: 0 auto;
          padding: 0 12px 20px;
        }

        .free-fire-id-banner {
          width: calc(100% + 24px);
          margin-left: -12px;
          overflow: hidden;
        }

        .free-fire-id-banner img {
          display: block;
          width: 100%;
          height: 210px;
          object-fit: cover;
        }

        .free-fire-id-note {
          margin-top: 14px;
          padding: 14px;
          border-radius: 14px;
          background: rgba(
            0,
            0,
            0,
            0.68
          );
          border: 1px solid
            rgba(255, 255, 255, 0.1);
        }

        .free-fire-id-note strong {
          color: #fff;
          font-size: 15px;
        }

        .free-fire-id-note p {
          margin: 7px 0 0;
          color: #d8d8d8;
          font-size: 13px;
          line-height: 1.5;
        }

                .free-fire-id-offers-toggle {
          width: 100%;
          margin-top: 14px;
          padding: 15px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border: 1px solid
            rgba(255, 255, 255, 0.12);
          border-radius: 13px;
          background: rgba(
            0,
            0,
            0,
            0.78
          );
          color: #fff;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
        }

        .free-fire-id-offers-arrow {
          font-size: 12px;
        }

        .free-fire-id-offers-section {
          margin-top: 10px;
        }

        .free-fire-id-offers-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .free-fire-id-offer {
          width: 100%;
          min-height: 65px;
          padding: 10px 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          border: 1px solid
            rgba(255, 255, 255, 0.1);
          border-radius: 13px;
          background: rgba(
            0,
            0,
            0,
            0.78
          );
          color: #fff;
          text-align: left;
          cursor: pointer;
          transition: 0.15s ease;
        }

        .free-fire-id-offer:active {
          transform: scale(0.98);
        }

        .free-fire-id-offer.selected {
          border-color: rgba(
            255,
            50,
            50,
            0.8
          );
          background: rgba(
            120,
            0,
            0,
            0.3
          );
        }

        .free-fire-id-offer-left {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        .free-fire-id-offer-icon {
          width: 38px;
          height: 38px;
          flex: 0 0 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          background: rgba(
            255,
            255,
            255,
            0.08
          );
          font-size: 21px;
        }

        .free-fire-id-offer-left strong {
          display: block;
          font-size: 14px;
        }

        .free-fire-id-offer-left small {
          display: block;
          margin-top: 3px;
          color: #aaa;
          font-size: 11px;
        }

        .free-fire-id-offer-price {
          flex-shrink: 0;
          color: #fff;
          font-size: 14px;
          font-weight: 900;
          white-space: nowrap;
        }

        .free-fire-id-loading,
        .free-fire-id-error {
          padding: 18px;
          border-radius: 13px;
          background: rgba(
            0,
            0,
            0,
            0.78
          );
          text-align: center;
          font-size: 14px;
        }

        .free-fire-id-error {
          color: #ff8e8e;
          border: 1px solid
            rgba(
              255,
              70,
              70,
              0.35
            );
        }

        .free-fire-id-order-section {
          margin-top: 16px;
          padding: 16px;
          border-radius: 15px;
          background: rgba(
            0,
            0,
            0,
            0.82
          );
          border: 1px solid
            rgba(255, 255, 255, 0.1);
        }

        .free-fire-id-selected-offer {
          display: flex;
          align-items: center;
          gap: 11px;
          margin-bottom: 15px;
          padding: 12px;
          border-radius: 12px;
          background: rgba(
            255,
            255,
            255,
            0.06
          );
        }

        .free-fire-id-selected-offer
          > span {
          font-size: 25px;
        }

        .free-fire-id-selected-offer
          div {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .free-fire-id-selected-offer
          strong {
          font-size: 14px;
        }

        .free-fire-id-selected-offer
          div
          span {
          font-weight: 900;
          white-space: nowrap;
        }

        .free-fire-id-order-section
          form {
          display: flex;
          flex-direction: column;
        }

        .free-fire-id-order-section
          label {
          margin-bottom: 7px;
          font-size: 13px;
          font-weight: 800;
        }

        .free-fire-id-order-section
          input {
          width: 100%;
          box-sizing: border-box;
          padding: 13px;
          border: 1px solid
            rgba(255, 255, 255, 0.16);
          border-radius: 11px;
          outline: none;
          background: rgba(
            255,
            255,
            255,
            0.07
          );
          color: #fff;
          font-size: 15px;
        }

        .free-fire-id-order-section
          input::placeholder {
          color: #888;
        }

        .free-fire-id-input-help {
          margin: 7px 0 0;
          color: #888;
          font-size: 11px;
          line-height: 1.4;
        }

        .free-fire-id-form-error {
          margin-top: 8px;
          padding: 9px;
          border-radius: 9px;
          background: rgba(
            150,
            0,
            0,
            0.25
          );
          color: #ff9b9b;
          font-size: 12px;
        }

        .free-fire-id-create-order-button,
        .free-fire-id-review-button,
        .free-fire-id-store-button {
          width: 100%;
          margin-top: 12px;
          padding: 13px;
          border: 0;
          border-radius: 11px;
          font-weight: 900;
          cursor: pointer;
        }

        .free-fire-id-create-order-button {
          background: #d71920;
          color: #fff;
        }

        .free-fire-id-create-order-button:disabled {
          opacity: 0.6;
          cursor: wait;
        }

        .free-fire-id-success-section {
          margin-top: 16px;
          padding: 22px 16px;
          border-radius: 15px;
          background: rgba(
            0,
            0,
            0,
            0.84
          );
          border: 1px solid
            rgba(
              60,
              220,
              100,
              0.25
            );
          text-align: center;
        }

        .free-fire-id-success-icon {
          width: 58px;
          height: 58px;
          margin: 0 auto 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #20b957;
          color: #fff;
          font-size: 34px;
          font-weight: 900;
        }

        .free-fire-id-success-section h2 {
          margin: 0;
          font-size: 22px;
        }

        .free-fire-id-success-section p {
          margin: 8px 0 0;
          color: #bbb;
          font-size: 13px;
          line-height: 1.5;
        }

        .free-fire-id-order-number {
          margin-top: 15px;
          padding: 12px;
          border-radius: 11px;
          background: rgba(
            255,
            255,
            255,
            0.06
          );
        }

        .free-fire-id-order-number span {
          display: block;
          color: #999;
          font-size: 11px;
        }

        .free-fire-id-order-number strong {
          display: block;
          margin-top: 4px;
          color: #fff;
          font-size: 15px;
        }

        .free-fire-id-review-button {
          background: #d71920;
          color: #fff;
        }

        .free-fire-id-store-button {
          background: rgba(
            255,
            255,
            255,
            0.08
          );
          color: #fff;
        }

        .free-fire-id-info {
          width: min(
            100%,
            680px
          );
          margin: 0 auto;
          padding: 0 12px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .free-fire-id-info-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px;
          border-radius: 14px;
          background: rgba(
            0,
            0,
            0,
            0.78
          );
          border: 1px solid
            rgba(255, 255, 255, 0.1);
        }

        .free-fire-id-info-item
          > span {
          width: 40px;
          height: 40px;
          flex: 0 0 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 11px;
          background: rgba(
            120,
            0,
            0,
            0.25
          );
          font-size: 20px;
        }

        .free-fire-id-info-item
          strong {
          display: block;
          font-size: 13px;
        }

        .free-fire-id-info-item
          p {
          margin: 3px 0 0;
          color: #777;
          font-size: 11px;
        }

        .free-fire-id-footer {
          margin-top: 25px;
          padding: 12px;
          text-align: center;
          color: #aaa;
          font-size: 13px;
          font-weight: 800;
        }

        .free-fire-id-footer small {
          display: block;
          margin-top: 5px;
          color: #555;
          font-size: 10px;
          font-weight: 500;
        }

        @media (max-width: 480px) {
          .free-fire-id-header {
            min-height: 54px;
          }

          .free-fire-id-header h1 {
            font-size: 17px;
          }

          .free-fire-id-banner img {
            height: 180px;
          }

          .free-fire-id-content {
            padding-left: 10px;
            padding-right: 10px;
          }

          .free-fire-id-banner {
            width: calc(100% + 20px);
            margin-left: -10px;
          }

          .free-fire-id-offer {
            min-height: 62px;
            padding: 9px 10px;
          }

          .free-fire-id-offer-left
            strong {
            font-size: 13px;
          }

          .free-fire-id-offer-left
            small {
            font-size: 10px;
          }

          .free-fire-id-offer-price {
            font-size: 13px;
          }

          .free-fire-id-selected-offer
            div {
            align-items: flex-end;
          }

          .free-fire-id-selected-offer
            strong {
            font-size: 13px;
          }
        }
      `}</style>
    </main>
  );
}
