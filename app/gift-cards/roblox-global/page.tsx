
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type GiftCardOffer = {
  id: string;
  robux: number;
  price: number;
  supplierPrice: number;
  stock: number;
  maxOrderQuantity: number;
};

type SupplierOffer = {
  card_id: string;
  name: string;
  price_usd: string | number;
  stock: number;
  min_order_quantity?: number;
  max_order_quantity?: number;
};

type CatalogResponse = {
  ok: boolean;
  error?: string;
  data?: {
    name?: string;
    offers?: SupplierOffer[];
  };
};

const API_URL =
  "/api/fazercards/giftcards?category_id=roblox_global";

const PROFIT_PER_UNIT = 0.25;

const productNote =
  "Región: Global. Tarjetas de regalo Robux de Roblox. Comprueba que tu cuenta y la región sean compatibles antes de comprar. Las unidades disponibles y los precios se actualizan desde nuestro proveedor.";

function money(value: number) {
  return `$${value.toFixed(2)} USD`;
}

function parseRobux(name: string): number {
  const match = name.match(/([\d,]+)\s*Robux/i);
  return match
    ? Number(match[1].replace(/,/g, ""))
    : 0;
}

function mapSupplierOffer(
  item: SupplierOffer
): GiftCardOffer | null {
  const supplierPrice = Number(item.price_usd);
  const stock = Math.max(0, Number(item.stock) || 0);
  const maxOrderQuantity = Math.max(
    0,
    Number(item.max_order_quantity) || 0
  );
  const robux = parseRobux(item.name);

  if (
    !item.card_id ||
    !Number.isFinite(supplierPrice) ||
    supplierPrice < 0 ||
    !robux
  ) {
    return null;
  }

  return {
    id: item.card_id,
    robux,
    supplierPrice,
    price:
      Math.round((supplierPrice + PROFIT_PER_UNIT) * 100) /
      100,
    stock,
    maxOrderQuantity,
  };
}

export default function RobloxGlobalGiftCardPage() {
  const router = useRouter();

  const [offers, setOffers] = useState<GiftCardOffer[]>([]);
  const [selectedOffer, setSelectedOffer] =
    useState<GiftCardOffer | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [showConfirmation, setShowConfirmation] =
    useState(false);
  const [orderCreated, setOrderCreated] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [loading, setLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setCatalogError("");

    try {
      const response = await fetch(API_URL, {
        method: "GET",
        cache: "no-store",
      });

      const result: CatalogResponse = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(
          result.error || "No se pudo consultar el catálogo."
        );
      }

      const supplierOffers = result.data?.offers;

      if (!Array.isArray(supplierOffers)) {
        throw new Error(
          "FazerCards no devolvió una lista de ofertas válida."
        );
      }

      const mappedOffers = supplierOffers
        .map(mapSupplierOffer)
        .filter(
          (offer): offer is GiftCardOffer => offer !== null
        )
        .sort((a, b) => a.robux - b.robux);

      setOffers(mappedOffers);
      setLastUpdated(new Date().toLocaleTimeString());

      setSelectedOffer((current) => {
        if (!current) return null;

        return (
          mappedOffers.find(
            (offer) => offer.id === current.id
          ) ?? null
        );
      });
    } catch (error) {
      console.error("Error cargando Roblox Global:", error);
      setCatalogError(
        error instanceof Error
          ? error.message
          : "Error al consultar FazerCards."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const maxQuantity = selectedOffer
    ? Math.min(
        selectedOffer.stock,
        selectedOffer.maxOrderQuantity
      )
    : 0;

  useEffect(() => {
    if (!selectedOffer) return;

    if (maxQuantity < 1) {
      setQuantity(1);
      setShowConfirmation(false);
      return;
    }

    setQuantity((current) =>
      Math.min(Math.max(1, current), maxQuantity)
    );
  }, [selectedOffer, maxQuantity]);

  const selectOffer = (offer: GiftCardOffer) => {
    if (offer.stock < 1 || offer.maxOrderQuantity < 1) {
      return;
    }

    setSelectedOffer(offer);
    setQuantity(1);
    setShowConfirmation(false);

    setTimeout(() => {
      document
        .getElementById("gift-card-order")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 100);
  };

  const increaseQuantity = () => {
    if (!selectedOffer || quantity >= maxQuantity) return;
    setQuantity((current) => current + 1);
  };

  const decreaseQuantity = () => {
    setQuantity((current) => Math.max(1, current - 1));
  };

  const total = selectedOffer
    ? Math.round(selectedOffer.price * quantity * 100) / 100
    : 0;

  const continueOrder = () => {
    if (
      !selectedOffer ||
      selectedOffer.stock < quantity ||
      quantity > selectedOffer.maxOrderQuantity
    ) {
      setCatalogError(
        "La cantidad solicitada ya no está disponible. Actualiza el catálogo."
      );
      return;
    }

    setShowConfirmation(true);

    setTimeout(() => {
      document
        .getElementById("gift-card-confirmation")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 100);
  };

  const createOrder = () => {
    if (!selectedOffer) return;

    if (
      selectedOffer.stock < quantity ||
      quantity > selectedOffer.maxOrderQuantity
    ) {
      setShowConfirmation(false);
      setCatalogError(
        "La disponibilidad puede haber cambiado. Actualiza el catálogo antes de continuar."
      );
      void loadCatalog();
      return;
    }

    // IMPORTANTE:
    // Este bloque solo guarda una solicitud local en el navegador.
    // No realiza todavía una compra en FazerCards ni registra
    // una orden en la base de datos de STORE GAMING.
    const orderId = `GC-${Date.now()
      .toString()
      .slice(-8)}`;

    const newOrder = {
      id: orderId,
      type: "GIFT CARD",
      game: "ROBLOX (GLOBAL)",
      robux: selectedOffer.robux,
      supplierOfferId: selectedOffer.id,
      price: selectedOffer.price,
      quantity,
      total,
      status: "PENDIENTE",
      createdAt: new Date().toISOString(),
    };

    try {
      const existing = JSON.parse(
        localStorage.getItem("storeGamingOrders") || "[]"
      );

      if (!Array.isArray(existing)) {
        throw new Error("El historial local no es válido.");
      }

      localStorage.setItem(
        "storeGamingOrders",
        JSON.stringify([...existing, newOrder])
      );

      localStorage.setItem(
        "storeGamingLastOrder",
        JSON.stringify(newOrder)
      );

      setOrderNumber(orderId);
      setShowConfirmation(false);
      setOrderCreated(true);

      setTimeout(() => {
        document
          .getElementById("gift-card-success")
          ?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
      }, 100);
    } catch (error) {
      console.error("Error guardando la solicitud:", error);
      setCatalogError(
        "No se pudo guardar la solicitud en este navegador."
      );
    }
  };

  const header = (
    <header className="game-service-header">
      <button
        className="game-back-button"
        onClick={() => router.push("/gift-cards")}
        aria-label="Volver a tarjetas"
      >
        ←
      </button>

      <div className="game-header-title">
        <span>STORE</span>
        <strong>GIFT CARD</strong>
      </div>

      <button
        className="game-cart-button"
        onClick={() => router.push("/orders")}
        aria-label="Pedidos"
      >
        🛒
      </button>
    </header>
  );

  const infoNote = (
    <section className="game-note gift-card-main-note redesigned-note">
      <div className="game-note-icon">!</div>
      <div className="game-note-content">
        <strong>INFORMACIÓN DEL PRODUCTO</strong>
        <p>{productNote}</p>
        <div className="note-region">
          <span>🌎</span>
          <span>REGIÓN GLOBAL</span>
          <span>•</span>
          <span>CÓDIGO DIGITAL</span>
        </div>
      </div>
    </section>
  );

  if (orderCreated && selectedOffer) {
    return (
      <main className="game-service-page gift-card-service-page">
        {header}

        <section
          id="gift-card-success"
          className="order-success-section gift-card-success-section"
        >
          <div className="order-success-icon">✓</div>

          <h1>SOLICITUD GUARDADA</h1>

          <p className="order-success-message">
            Tu solicitud se guardó en este navegador.
            Todavía no se ha enviado a FazerCards ni se ha
            confirmado una compra.
          </p>

          <div className="selected-order-card">
            <div className="selected-order-game">
              ROBLOX (GLOBAL)
            </div>

            <div className="selected-order-offer">
              {selectedOffer.robux} ROBUX
            </div>

            <div className="selected-order-quantity">
              Cantidad: <strong>{quantity}</strong>
            </div>

            <div className="selected-order-price">
              Precio unitario:{" "}
              <strong>{money(selectedOffer.price)}</strong>
            </div>

            <div className="selected-order-total">
              Total: <strong>{money(total)}</strong>
            </div>

            <div className="selected-order-number">
              Solicitud: <strong>{orderNumber}</strong>
            </div>
          </div>

          {infoNote}

          <button
            className="finish-order-button"
            onClick={() => router.push("/orders")}
          >
            VER MIS PEDIDOS
          </button>

          <button
            className="game-back-button-bottom"
            onClick={() => router.push("/gift-cards")}
          >
            VOLVER A TARJETAS
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="game-service-page gift-card-service-page roblox-global-page">
      {header}

      <section className="game-service-hero">
        <div className="free-fire-main-image">
          <img
            src="/images/gift-cards/gift-roblox-global.jpg"
            alt="Tarjetas de regalo Roblox Global"
          />
        </div>

        <h1>ROBLOX (GLOBAL)</h1>

        <p>
          Elige tu paquete de Robux y consulta su
          disponibilidad actual.
        </p>

        <div className="catalog-status">
          <span
            className={`status-dot ${
              loading ? "is-loading" : ""
            }`}
          />
          {loading
            ? "Consultando catálogo..."
            : catalogError
              ? "No se pudo actualizar el catálogo"
              : "Catálogo conectado"}
        </div>
      </section>

      {infoNote}

      {catalogError && (
        <section className="catalog-error" role="alert">
          <strong>NO SE PUDO ACTUALIZAR</strong>
          <p>{catalogError}</p>
          <button
            type="button"
            onClick={() => void loadCatalog()}
          >
            REINTENTAR
          </button>
        </section>
      )}

      <section className="offers-section">
        <div className="offers-toggle">
          <span>🎁</span>
          <strong>SELECCIONA TU TARJETA</strong>
        </div>

        <div className="catalog-toolbar">
          <span>
            {offers.length} paquetes disponibles en el catálogo
          </span>

          <button
            type="button"
            onClick={() => void loadCatalog()}
            disabled={loading}
          >
            ↻ Actualizar
          </button>
        </div>

        {lastUpdated && !loading && (
          <p className="catalog-updated">
            Última consulta: {lastUpdated}
          </p>
        )}

        {loading && offers.length === 0 && (
          <div className="catalog-message">
            <span className="catalog-spinner" />
            <p>Cargando precios y cantidades...</p>
          </div>
        )}

        {!loading && !catalogError && offers.length === 0 && (
          <div className="catalog-message">
            <p>No se encontraron ofertas de Roblox Global.</p>
          </div>
        )}

        <div className="offers-list">
          {offers.map((offer) => {
            const unavailable =
              offer.stock < 1 ||
              offer.maxOrderQuantity < 1;

            return (
              <button
                key={offer.id}
                type="button"
                className={`offer-card ${
                  selectedOffer?.id === offer.id ? "selected" : ""
                } ${unavailable ? "offer-unavailable" : ""}`}
                onClick={() => selectOffer(offer)}
                disabled={unavailable || loading}
              >
                <div className="diamond-icon">🪙</div>

                <div className="offer-info">
                  <strong>{offer.robux} ROBUX</strong>

                  <small
                    className={
                      unavailable
                        ? "availability-empty"
                        : "availability-positive"
                    }
                  >
                    {unavailable
                      ? "Agotado"
                      : `Disponibles: ${offer.stock}`}
                  </small>
                </div>

                <div className="offer-right">
                  <strong>{money(offer.price)}</strong>
                  <span>
                    {unavailable
                      ? "—"
                      : selectedOffer?.id === offer.id
                        ? "✓"
                        : "›"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {selectedOffer && (
        <section
          id="gift-card-order"
          className="order-section gift-card-order-section"
        >
          <div className="game-note game-note-order redesigned-note">
            <div className="game-note-icon">!</div>
            <div className="game-note-content">
              <strong>PRODUCTO SELECCIONADO</strong>
              <p>
                Has seleccionado{" "}
                <strong>{selectedOffer.robux} ROBUX</strong>.
              </p>
              <p>
                Disponibles actualmente:{" "}
                <strong>{selectedOffer.stock}</strong>.
              </p>
            </div>
          </div>

          <div className="selected-order-card">
            <div className="selected-order-game">
              ROBLOX (GLOBAL)
            </div>

            <div className="selected-order-offer">
              {selectedOffer.robux} ROBUX
            </div>

            <div className="quantity-control">
              <button
                type="button"
                onClick={decreaseQuantity}
                disabled={quantity <= 1}
                aria-label="Disminuir cantidad"
              >
                −
              </button>

              <span>{quantity}</span>

              <button
                type="button"
                onClick={increaseQuantity}
                disabled={quantity >= maxQuantity}
                aria-label="Aumentar cantidad"
              >
                +
              </button>
            </div>

            <p className="quantity-limit">
              Máximo por pedido: {maxQuantity}
            </p>

            <div className="selected-order-price">
              Precio unitario:{" "}
              <strong>{money(selectedOffer.price)}</strong>
            </div>

            <div className="selected-order-total">
              Total: <strong>{money(total)}</strong>
            </div>
          </div>

          <button
            className="finish-order-button"
            onClick={continueOrder}
            disabled={
              maxQuantity < 1 ||
              quantity > selectedOffer.stock
            }
          >
            CONTINUAR
          </button>
        </section>
      )}

      {showConfirmation && selectedOffer && (
        <section
          id="gift-card-confirmation"
          className="confirmation-section gift-card-confirmation-section"
        >
          <div className="game-note redesigned-note">
            <div className="game-note-icon">!</div>
            <div className="game-note-content">
              <strong>REVISA TU SOLICITUD</strong>
              <p>
                Comprueba el paquete, la cantidad y el total
                antes de continuar.
              </p>
              <p>
                Esta página todavía no envía compras al
                proveedor.
              </p>
            </div>
          </div>

          <div className="selected-order-card confirmation-card">
            <h2>CONFIRMACIÓN</h2>

            <div className="confirmation-row">
              <span>Producto</span>
              <strong>ROBLOX (GLOBAL)</strong>
            </div>

            <div className="confirmation-row">
              <span>Robux por unidad</span>
              <strong>{selectedOffer.robux} ROBUX</strong>
            </div>

            <div className="confirmation-row">
              <span>Cantidad</span>
              <strong>{quantity}</strong>
            </div>

            <div className="confirmation-row">
              <span>Precio unitario</span>
              <strong>{money(selectedOffer.price)}</strong>
            </div>

            <div className="confirmation-row confirmation-total">
              <span>TOTAL</span>
              <strong>{money(total)}</strong>
            </div>
          </div>

          <button
            className="confirm-final-button"
            onClick={createOrder}
          >
            GUARDAR SOLICITUD
          </button>

          <button
            className="game-back-button-bottom"
            onClick={() => setShowConfirmation(false)}
          >
            ← VOLVER
          </button>
        </section>
      )}

      <footer className="game-service-footer gift-card-footer">
        <p>STORE GAMING</p>
        <span>Tarjetas digitales · Roblox Global</span>
      </footer>

      <style jsx global>{`
        .roblox-global-page {
          --roblox-red: #ff202d;
          --roblox-red-dark: #c90019;
        }

        .roblox-global-page .game-service-hero h1 {
          color: #ff2538;
          text-shadow: 0 0 18px rgba(255, 25, 45, 0.22);
          font-weight: 900;
          letter-spacing: 0.5px;
        }

        .roblox-global-page .red-price,
        .roblox-global-page .offer-right > strong,
        .roblox-global-page .selected-order-price > strong,
        .roblox-global-page .selected-order-total > strong,
        .roblox-global-page .confirmation-total > strong {
          color: #ff202d !important;
          font-weight: 900;
          text-shadow: 0 0 12px rgba(255, 32, 45, 0.12);
        }

        .roblox-global-page .offer-right > strong {
          font-size: 1.05rem;
          white-space: nowrap;
        }

        .roblox-global-page .redesigned-note {
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(255, 32, 45, 0.38);
          border-radius: 16px;
          background:
            linear-gradient(
              120deg,
              rgba(255, 32, 45, 0.12),
              rgba(20, 20, 25, 0.96) 58%
            );
          box-shadow: 0 8px 28px rgba(0, 0, 0, 0.14);
          padding: 17px;
        }

        .roblox-global-page .redesigned-note::before {
          content: "";
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 4px;
          background: linear-gradient(#ff4655, #b90018);
        }

        .roblox-global-page .redesigned-note .game-note-icon {
          background: #ff2538;
          color: #fff;
          box-shadow: 0 0 18px rgba(255, 32, 45, 0.25);
          border-radius: 10px;
        }

        .roblox-global-page .redesigned-note .game-note-content > strong {
          color: #ff4655;
          font-size: 0.88rem;
          letter-spacing: 0.8px;
        }

        .roblox-global-page .redesigned-note .game-note-content p {
          line-height: 1.65;
          opacity: 0.92;
        }

        .roblox-global-page .note-region {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 7px;
          margin-top: 12px;
          color: #ff6976;
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.4px;
        }

        .roblox-global-page .catalog-status {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 10px;
          padding: 7px 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 30px;
          background: rgba(0, 0, 0, 0.2);
          font-size: 0.78rem;
        }

        .roblox-global-page .status-dot {
          width: 8px;
          height: 8px;
          flex: 0 0 8px;
          border-radius: 50%;
          background: #25d98b;
          box-shadow: 0 0 9px rgba(37, 217, 139, 0.55);
        }

        .roblox-global-page .status-dot.is-loading {
          background: #ffbd4a;
          box-shadow: 0 0 9px rgba(255, 189, 74, 0.5);
        }

        .roblox-global-page .catalog-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 10px;
          margin: 12px 0 4px;
          font-size: 0.78rem;
          opacity: 0.88;
        }

        .roblox-global-page .catalog-toolbar button,
        .roblox-global-page .catalog-error button {
          border: 1px solid rgba(255, 32, 45, 0.55);
          border-radius: 10px;
          padding: 8px 11px;
          color: #ff4655;
          background: rgba(255, 32, 45, 0.08);
          font-weight: 800;
          cursor: pointer;
        }

        .roblox-global-page .catalog-toolbar button:disabled {
          opacity: 0.5;
          cursor: wait;
        }

        .roblox-global-page .catalog-updated {
          margin: 4px 0 12px;
          font-size: 0.7rem;
          opacity: 0.58;
        }

        .roblox-global-page .availability-positive {
          display: block;
          margin-top: 5px;
          color: #32d997;
          font-weight: 700;
        }

        .roblox-global-page .availability-empty {
          display: block;
          margin-top: 5px;
          color: #ff4b5c;
          font-weight: 800;
        }

        .roblox-global-page .offer-unavailable {
          opacity: 0.58;
          cursor: not-allowed;
          filter: grayscale(0.35);
        }

        .roblox-global-page .catalog-error {
          margin: 12px 0;
          padding: 14px;
          border: 1px solid rgba(255, 32, 45, 0.45);
          border-radius: 14px;
          background: rgba(255, 32, 45, 0.08);
        }

        .roblox-global-page .catalog-error > strong {
          color: #ff4655;
        }

        .roblox-global-page .catalog-error p {
          font-size: 0.85rem;
          line-height: 1.5;
        }

        .roblox-global-page .catalog-message {
          padding: 22px 12px;
          text-align: center;
          opacity: 0.8;
        }

        .roblox-global-page .catalog-spinner {
          display: inline-block;
          width: 24px;
          height: 24px;
          border: 3px solid rgba(255, 32, 45, 0.2);
          border-top-color: #ff2538;
          border-radius: 50%;
          animation: roblox-catalog-spin 0.8s linear infinite;
        }

        .roblox-global-page .quantity-limit {
          margin: 6px 0 12px;
          text-align: center;
          font-size: 0.75rem;
          opacity: 0.65;
        }

        .roblox-global-page .offer-card.selected {
          border-color: #ff2538;
          box-shadow: 0 0 0 1px rgba(255, 32, 45, 0.25);
        }

        .roblox-global-page .selected-order-price strong,
        .roblox-global-page .selected-order-total strong {
          color: #ff202d !important;
        }

        @keyframes roblox-catalog-spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </main>
  );
}
