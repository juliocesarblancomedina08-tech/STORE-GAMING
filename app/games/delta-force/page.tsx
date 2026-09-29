"use client";

import {
  FormEvent,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import { createClient } from "@supabase/supabase-js";

import {
  deltaForceGame,
  type DeltaForceOffer,
} from "../../../lib/games/delta-force";

const supabase = createClient(
  process.env
    .NEXT_PUBLIC_SUPABASE_URL!,
  process.env
    .NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const gameNote =
  "Región: Global. La moneda se entrega directamente a tu cuenta después de realizar el pedido.";

type SupplierOffer = {
  offer_id: string;
  name: string;
  price_usd: string | number;
};

export default function DeltaForcePage() {
  const router = useRouter();

  const [
    showOffers,
    setShowOffers,
  ] = useState(false);

  const [
    selectedOffer,
    setSelectedOffer,
  ] =
    useState<DeltaForceOffer | null>(
      null
    );

  const [
    playerId,
    setPlayerId,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  const [
    orderCreated,
    setOrderCreated,
  ] = useState(false);

  const [
    orderNumber,
    setOrderNumber,
  ] = useState("");

  const [
    supplierOrderId,
    setSupplierOrderId,
  ] = useState("");

  const [
    orderStatus,
    setOrderStatus,
  ] = useState("");

  const [
    processing,
    setProcessing,
  ] = useState(false);

  function selectOffer(
    offer: DeltaForceOffer
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
        .getElementById(
          "order-section"
        )
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
        error: sessionError,
      } =
        await supabase.auth.getSession();

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
       * 4. ENVIAR PEDIDO AL API
       * ============================================================
       */

      const response =
        await fetch(
          "/api/topups/delta-force",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${session.access_token}`,
            },

            body:
              JSON.stringify({
                offerId:
                  selectedOffer.id,

                offerName:
                  selectedOffer.name,

                playerId:
                  cleanPlayerId,

                retailPrice:
                  selectedOffer.price,

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
       * 7. OBTENER DATOS DE LA ORDEN
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
          "SUPPLIER_PENDING"
      );

      /*
       * ============================================================
       * 8. GUARDAR COMPATIBILIDAD LOCAL
       * ============================================================
       */

      try {
        const storedOrders =
          JSON.parse(
            localStorage.getItem(
              "storeGamingOrders"
            ) || "[]"
          );

        const localOrder = {
          id:
            result.orderNumber ||
            result.id ||
            crypto.randomUUID(),

          orderNumber:
            result.orderNumber ||
            result.id ||
            "",

          supplierOrderId:
            result.supplierOrderId ||
            "",

          game:
            "Delta Force",

          categoryId:
            "delta_force",

          offerId:
            selectedOffer.id,

          offerName:
            selectedOffer.name,

          playerId:
            cleanPlayerId,

          retailPrice:
            selectedOffer.price,

          supplierPrice:
            result.supplierPrice ??
            selectedOffer.supplierPrice,

          status:
            result.status ||
            "SUPPLIER_PENDING",

          createdAt:
            new Date().toISOString(),
        };

        localStorage.setItem(
          "storeGamingOrders",
          JSON.stringify([
            localOrder,
            ...storedOrders,
          ])
        );

        localStorage.setItem(
          "storeGamingLastOrder",
          JSON.stringify(
            localOrder
          )
        );
      } catch (
        localStorageError
      ) {
        console.error(
          "ERROR GUARDANDO ORDEN LOCAL:",
          localStorageError
        );
      }

      /*
       * ============================================================
       * 9. MOSTRAR ORDEN CREADA
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
        "ERROR CREANDO TOPUP DELTA FORCE:",
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
    <main className="game-service-page delta-force-page">

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
            DELTA FORCE
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

      <section className="delta-force-main-image">

        <img
          src="/images/delta-force.jpg"
          alt="Delta Force"
        />

        <div className="delta-force-main-overlay" />

        <div className="delta-force-main-text">

          <span>
            ⚡ TOP UP
          </span>

          <h1>
            DELTA
            <strong>
              FORCE
            </strong>
          </h1>

          <p>
            Delta Coins y pases
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
            (current) =>
              !current
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
                DELTA FORCE
              </span>

              <h2>
                ELIGE TU OFERTA
              </h2>

            </div>

          </div>


          <div className="offers-list">

            {deltaForceGame.offers.map(
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
                {gameNote}
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
                DELTA FORCE
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
                {gameNote}
              </p>

            </div>

          </div>


          {/* ========================================================
              FORMULARIO
          ======================================================== */}

          <form
            className="order-form"
            onSubmit={
              handleFinishPurchase
            }
          >

            <label
              className="player-id-label"
              htmlFor="player-id"
            >
              ID DEL JUGADOR
            </label>

            <p className="player-id-description">
              Introduzca el Player ID de
              la cuenta donde desea
              recibir la compra.
            </p>


            <div className="player-id-input-wrapper">

              <span>
                🆔
              </span>

              <input
                id="player-id"
                type="text"
                inputMode="numeric"
                value={playerId}
                onChange={(event) => {
                  setPlayerId(
                    event.target.value.replace(
                      /[^0-9]/g,
                      ""
                    )
                  );

                  setError("");
                }}
                placeholder="Introduzca su Player ID"
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


          {/* ========================================================
              NÚMERO DE ORDEN
          ======================================================== */}

          <div className="success-order-number">

            <span>
              NÚMERO DE ORDEN
            </span>

            <strong>
              {orderNumber ||
                "PENDIENTE"}
            </strong>

          </div>


          {/* ========================================================
              ORDEN DEL PROVEEDOR
          ======================================================== */}

          {supplierOrderId && (

            <div className="success-order-number">

              <span>
                ORDEN DEL PROVEEDOR
              </span>

              <strong>
                {supplierOrderId}
              </strong>

            </div>

          )}


                    {/* ========================================================
              ESTADO
          ======================================================== */}

          <div className="success-order-status">

            <span>
              ESTADO
            </span>

            <strong>
              {orderStatus ||
                "PROCESANDO"}
            </strong>

          </div>

          <div className="success-order-details">

            <div className="success-detail-row">
              <span>PRODUCTO</span>
              <strong>
                {selectedOffer?.name || "Delta Force"}
              </strong>
            </div>

            <div className="success-detail-row">
              <span>PLAYER ID</span>
              <strong>
                {playerId}
              </strong>
            </div>

            <div className="success-detail-row">
              <span>PRECIO</span>
              <strong>
                ${selectedOffer?.price.toFixed(2)} USD
              </strong>
            </div>

            {supplierOrderId && (
              <div className="success-detail-row">
                <span>ID DEL PROVEEDOR</span>
                <strong>
                  {supplierOrderId}
                </strong>
              </div>
            )}

          </div>

          <div className="success-order-actions">

            <button
              type="button"
              className="success-orders-button"
              onClick={goToOrders}
            >
              VER MIS PEDIDOS
            </button>

            <button
              type="button"
              className="success-new-order-button"
              onClick={() => {
                setOrderCreated(false);
                setOrderNumber("");
                setSupplierOrderId("");
                setOrderStatus("");
                setSelectedOffer(null);
                setPlayerId("");
                setError("");
              }}
            >
              HACER OTRO PEDIDO
            </button>

          </div>

        </div>

      )}

    </section>

    {/* ============================================================
        FOOTER
    ============================================================ */}

    <footer className="game-service-footer">

      <div className="footer-brand">
        🛒STORE GAMING🎮
      </div>

      <p>
        Recargas de Delta Force
      </p>

      <span>
        © {new Date().getFullYear()} STORE GAMING
      </span>

    </footer>

  </main>
);
}
