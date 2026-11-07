
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Offer = {
  offer_id: string;
  name: string;
  supplier_price: number;
  retail_price: number;
  vip_active: boolean;
};

type OrderResult = {
  ok?: boolean;
  error?: string;
  message?: string;
  orderNumber?: string;
  supplierOrderId?: string;
  status?: string;
  retailPrice?: number;
};

export default function MobileLegendsPage() {
  const router = useRouter();

  const [offers, setOffers] = useState<Offer[]>([]);
  const [playerId, setPlayerId] = useState("");
  const [serverId, setServerId] = useState("");

  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);

  const [vipActive, setVipActive] = useState(false);
  const [accessToken, setAccessToken] = useState("");

  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<
    "success" | "error" | "pending" | ""
  >("");

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setMessage("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        router.replace("/");
        return;
      }

      setAccessToken(session.access_token);

      const response = await fetch(
        "/api/topups/mobile-legends",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            Accept: "application/json",
          },
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(
          result.error || "No se pudo cargar el catálogo."
        );
      }

      setOffers(result.offers || []);
      setVipActive(Boolean(result.vip_active));
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Error cargando las ofertas."
      );
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  const buyOffer = async () => {
    if (!selectedOffer) {
      return;
    }

    if (!accessToken) {
      setMessage("Tu sesión ha expirado. Inicia sesión nuevamente.");
      setMessageType("error");
      return;
    }

    if (!/^[0-9]{3,20}$/.test(playerId.trim())) {
      setMessage("Introduce un Player ID válido.");
      setMessageType("error");
      return;
    }

    if (!/^[0-9]{1,20}$/.test(serverId.trim())) {
      setMessage("Introduce un Server ID válido.");
      setMessageType("error");
      return;
    }

    const confirmed = window.confirm(
      `¿Confirmas la compra de ${selectedOffer.name} por ${Number(
        selectedOffer.retail_price
      ).toFixed(4)} créditos?`
    );

    if (!confirmed) return;

    setBuying(true);
    setMessage("");
    setMessageType("");

    try {
      const response = await fetch(
        "/api/topups/mobile-legends",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            offerId: selectedOffer.offer_id,
            playerId: playerId.trim(),
            serverId: serverId.trim(),
            idempotencyKey: crypto.randomUUID(),
          }),
        }
      );

      const result: OrderResult = await response.json();

      if (!response.ok || !result.ok) {
        throw new Error(
          result.error || "No se pudo procesar la compra."
        );
      }

      if (result.status === "COMPLETED") {
        setMessage(
          `¡Compra completada! Número de pedido: ${result.orderNumber || "Confirmado"}`
        );
        setMessageType("success");
      } else {
        setMessage(
          `Tu pedido está pendiente de confirmación. Número: ${
            result.orderNumber || "Pendiente"
          }. No repitas la compra mientras se verifica.`
        );
        setMessageType("pending");
      }

      setSelectedOffer(null);
      setPlayerId("");
      setServerId("");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Ocurrió un error al realizar la compra."
      );
      setMessageType("error");
    } finally {
      setBuying(false);
    }
  };

  const formatPrice = (price: number) => {
    return Number(price).toFixed(4);
  };

  return (
    <main className="ml-page">
      <div className="ml-container">

        <button
          className="back-button"
          onClick={() => router.back()}
        >
          ← Volver
        </button>

        <header className="hero">
          <div className="game-icon">⚔️</div>

          <div>
            <span className="region">UNITED STATES</span>
            <h1>Mobile Legends</h1>
            <p>Recarga de diamantes y Weekly Diamond Pass</p>
          </div>
        </header>

        {vipActive && (
          <div className="vip-banner">
            <span>⭐</span>
            <div>
              <strong>BENEFICIO VIP ACTIVO</strong>
              <p>Estás disfrutando de precios especiales.</p>
            </div>
          </div>
        )}

        <section className="player-card">
          <h2>Datos del jugador</h2>
          <p className="section-description">
            Introduce los datos de tu cuenta para recibir tu recarga.
          </p>

          <label htmlFor="playerId">Player ID</label>
          <input
            id="playerId"
            type="text"
            inputMode="numeric"
            placeholder="Introduce tu Player ID"
            value={playerId}
            onChange={(e) => setPlayerId(e.target.value)}
            maxLength={20}
          />

          <label htmlFor="serverId">Server ID</label>
          <input
            id="serverId"
            type="text"
            inputMode="numeric"
            placeholder="Introduce tu Server ID"
            value={serverId}
            onChange={(e) => setServerId(e.target.value)}
            maxLength={20}
          />

          <div className="info-note">
            Comprueba cuidadosamente tu Player ID y Server ID antes de comprar.
          </div>
        </section>

        <section className="offers-section">
          <div className="section-heading">
            <div>
              <h2>Ofertas disponibles</h2>
              <p>Selecciona la recarga que deseas comprar.</p>
            </div>

            <span className="offer-count">
              {offers.length} ofertas
            </span>
          </div>

          {loading ? (
            <div className="loading">
              <div className="spinner" />
              <p>Cargando ofertas...</p>
            </div>
          ) : offers.length === 0 ? (
            <div className="empty">
              No hay ofertas disponibles en este momento.
            </div>
          ) : (
            <div className="offers-grid">
              {offers.map((offer) => {
                const active =
                  selectedOffer?.offer_id === offer.offer_id;

                return (
                  <button
                    key={offer.offer_id}
                    type="button"
                    className={`offer-card ${active ? "selected" : ""}`}
                    onClick={() => {
                      setSelectedOffer(offer);
                      setMessage("");
                      setMessageType("");
                    }}
                  >
                    <span className="diamond">💎</span>

                    <strong className="offer-name">
                      {offer.name}
                    </strong>

                    <span className="offer-price">
                      {formatPrice(offer.retail_price)}
                      <small> créditos</small>
                    </span>

                    {vipActive && (
                      <span className="vip-price-label">
                        PRECIO VIP
                      </span>
                    )}

                    <span className="select-label">
                      {active ? "✓ Seleccionado" : "Seleccionar"}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {selectedOffer && (
          <section className="checkout-card">
            <h2>Confirmar compra</h2>

            <div className="checkout-row">
              <span>Producto</span>
              <strong>{selectedOffer.name}</strong>
            </div>

            <div className="checkout-row">
              <span>Player ID</span>
              <strong>{playerId || "Pendiente"}</strong>
            </div>

            <div className="checkout-row">
              <span>Server ID</span>
              <strong>{serverId || "Pendiente"}</strong>
            </div>

            <div className="checkout-total">
              <span>Total</span>
              <strong>
                {formatPrice(selectedOffer.retail_price)} créditos
              </strong>
            </div>

            <button
              className="buy-button"
              onClick={buyOffer}
              disabled={buying || loading}
            >
              {buying ? "PROCESANDO PEDIDO..." : "CONFIRMAR Y COMPRAR"}
            </button>

            <button
              className="cancel-button"
              onClick={() => setSelectedOffer(null)}
              disabled={buying}
            >
              Cancelar
            </button>
          </section>
        )}

        {message && (
          <div className={`message ${messageType}`}>
            {message}
          </div>
        )}

        <footer>
          <p>STORE GAMING · Mobile Legends United States</p>
          <span>Recargas procesadas mediante FazerCards</span>
        </footer>

      </div>

      <style jsx>{`
        .ml-page {
          min-height: 100vh;
          padding: 25px 15px 50px;
          background:
            radial-gradient(ellipse at top, #183d58 0%, transparent 45%),
            linear-gradient(145deg, #07111e, #0b1728 55%, #101b2d);
          color: #fff;
        }

        .ml-container {
          max-width: 950px;
          margin: 0 auto;
        }

        .back-button {
          background: #ffffff12;
          border: 1px solid #ffffff20;
          color: white;
          padding: 10px 17px;
          border-radius: 10px;
          cursor: pointer;
          margin-bottom: 25px;
        }

        .hero {
          display: flex;
          align-items: center;
          gap: 20px;
          padding: 25px;
          border: 1px solid #ffffff20;
          border-radius: 20px;
          background: linear-gradient(120deg, #183d58, #14243a);
          margin-bottom: 20px;
        }

        .game-icon {
          width: 75px;
          height: 75px;
          display: grid;
          place-items: center;
          font-size: 39px;
          background: #ffffff15;
          border-radius: 18px;
          flex-shrink: 0;
        }

        .region {
          color: #5fd6ff;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 2px;
        }

        h1 {
          font-size: clamp(25px, 5vw, 36px);
          margin: 5px 0;
        }

        .hero p,
        .section-description,
        .section-heading p {
          color: #aabbd0;
          font-size: 13px;
          margin: 5px 0 0;
        }

        .vip-banner {
          display: flex;
          gap: 14px;
          align-items: center;
          padding: 16px;
          margin-bottom: 20px;
          border: 1px solid #d8ad48;
          border-radius: 14px;
          background: #b78b241c;
        }

        .vip-banner > span {
          font-size: 27px;
        }

        .vip-banner strong {
          color: #ffd46b;
          font-size: 13px;
        }

        .vip-banner p {
          color: #d4c49d;
          margin: 5px 0 0;
          font-size: 12px;
        }

        .player-card,
        .checkout-card {
          padding: 22px;
          border-radius: 17px;
          border: 1px solid #ffffff18;
          background: #142238;
          margin-bottom: 28px;
        }

        h2 {
          font-size: 19px;
          margin: 0 0 7px;
        }

        .player-card label {
          display: block;
          font-size: 13px;
          font-weight: 700;
          margin: 20px 0 8px;
        }

        .player-card input {
          box-sizing: border-box;
          width: 100%;
          padding: 14px;
          background: #091525;
          color: white;
          border: 1px solid #34465d;
          border-radius: 10px;
          outline: none;
          font-size: 14px;
        }

        .player-card input:focus {
          border-color: #32b8ed;
        }

        .info-note {
          margin-top: 15px;
          padding: 12px;
          background: #1d4760;
          border-radius: 9px;
          color: #c6eaff;
          font-size: 12px;
        }

        .section-heading {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          margin-bottom: 17px;
        }

        .offer-count {
          color: #8edfff;
          font-size: 12px;
          background: #1b4560;
          padding: 8px 12px;
          border-radius: 20px;
          white-space: nowrap;
        }

        .offers-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 13px;
        }

        .offer-card {
          min-width: 0;
          text-align: left;
          padding: 17px 13px;
          color: white;
          border: 1px solid #30435b;
          background: linear-gradient(145deg, #172b43, #101e31);
          border-radius: 14px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          gap: 9px;
          transition: border-color .2s, background .2s;
        }

        .offer-card.selected {
          border: 2px solid #35c5ff;
          background: #17415a;
        }

        .diamond {
          font-size: 25px;
        }

        .offer-name {
          font-size: 14px;
          min-height: 34px;
        }

        .offer-price {
          color: #64d7ff;
          font-size: 17px;
          font-weight: 900;
          overflow-wrap: anywhere;
        }

        .offer-price small {
          font-size: 10px;
          color: #b8c9d9;
        }

        .vip-price-label {
          color: #ffd46b;
          font-size: 10px;
          font-weight: 900;
        }

        .select-label {
          color: #a8c5d8;
          font-size: 11px;
        }

        .checkout-card {
          border-color: #36bde9;
        }

        .checkout-row,
        .checkout-total {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 15px;
          padding: 13px 0;
          border-bottom: 1px solid #ffffff17;
          font-size: 13px;
        }

        .checkout-row span,
        .checkout-total span {
          color: #aabbd0;
        }

        .checkout-row strong {
          text-align: right;
          overflow-wrap: anywhere;
        }

        .checkout-total strong {
          color: #60d5ff;
          font-size: 17px;
          text-align: right;
        }

        .buy-button {
          width: 100%;
          margin-top: 20px;
          padding: 16px;
          border: none;
          border-radius: 11px;
          color: #061522;
          background: linear-gradient(90deg, #45cfff, #77e3ff);
          font-weight: 900;
          cursor: pointer;
        }

        .buy-button:disabled {
          opacity: .5;
          cursor: not-allowed;
        }

        .cancel-button {
          width: 100%;
          padding: 12px;
          margin-top: 8px;
          color: #c6d2df;
          background: transparent;
          border: none;
          cursor: pointer;
        }

        .message {
          padding: 15px;
          border-radius: 11px;
          margin: 20px 0;
          font-size: 13px;
          overflow-wrap: anywhere;
        }

        .message.success {
          background: #12452f;
          border: 1px solid #2dba79;
        }

        .message.error {
          background: #521e29;
          border: 1px solid #d65b70;
        }

        .message.pending {
          background: #59451c;
          border: 1px solid #d9ae48;
        }

        .loading,
        .empty {
          text-align: center;
          padding: 45px 15px;
          color: #aabbd0;
          background: #142238;
          border-radius: 15px;
        }

        .spinner {
          width: 30px;
          height: 30px;
          margin: 0 auto 12px;
          border: 3px solid #ffffff25;
          border-top-color: #42caff;
          border-radius: 50%;
          animation: spin .8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        footer {
          text-align: center;
          margin-top: 45px;
          color: #8196ad;
          font-size: 12px;
        }

        footer span {
          font-size: 10px;
        }

        @media (min-width: 650px) {
          .offers-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 380px) {
          .hero {
            padding: 17px;
            gap: 12px;
          }

          .game-icon {
            width: 55px;
            height: 55px;
            font-size: 29px;
          }

          .offer-card {
            padding: 13px 10px;
          }
        }
      `}</style>
    </main>
  );
}
