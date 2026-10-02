"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

type Offer = {
  id: string;
  amount: string;
  price: number;
  supplierPrice: number;
  icon: string;
};

const offers: Offer[] = [
  {
    id: "575_rp",
    amount: "575 RP",
    price: 3.30,
    supplierPrice: 3.10,
    icon: "◈",
  },
  {
    id: "1380_rp",
    amount: "1380 RP",
    price: 7.57,
    supplierPrice: 7.37,
    icon: "◈",
  },
  {
    id: "2800_rp",
    amount: "2800 RP",
    price: 15.03,
    supplierPrice: 14.83,
    icon: "◈",
  },
  {
    id: "4500_rp",
    amount: "4500 RP",
    price: 23.56,
    supplierPrice: 23.36,
    icon: "◈",
  },
  {
    id: "6500_rp",
    amount: "6500 RP",
    price: 33.17,
    supplierPrice: 32.97,
    icon: "◈",
  },
  {
    id: "13500_rp",
    amount: "13500 RP",
    price: 64.10,
    supplierPrice: 63.90,
    icon: "◈",
  },
];

const GAME_NAME = "LEAGUE OF LEGENDS (ID)";
const GAME_IMAGE = "/images/league-of-legends.jpg";

/*
 * Categoría preparada para la futura integración
 * con FazerCards.
 *
 * No se utiliza directamente desde el navegador.
 * La API del servidor será la encargada de comunicarse
 * con FazerCards.
 */
const FAZERCARDS_CATEGORY_ID = "league_of_legends_id";

const GAME_NOTE =
  "Región: Indonesia. Recarga de League of Legends (PC). Introduce tu ID de Riot antes de realizar el pedido (formato: Nombre#ETIQUETA). Asegúrate de que tu cuenta de Riot esté registrada en la región de Indonesia; los códigos están restringidos por región. El producto seleccionado se entregará directamente a tu cuenta una vez realizado el pedido.";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LeagueOfLegendsIdPage() {
  const router = useRouter();

  const [showOffers, setShowOffers] = useState(true);

  const [selectedOffer, setSelectedOffer] =
    useState<Offer | null>(null);

  const [playerId, setPlayerId] = useState("");

  const [quantity, setQuantity] = useState(1);

  const [error, setError] = useState("");

  const [showConfirmation, setShowConfirmation] =
    useState(false);

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
    window.scrollTo(0, 0);
  }, []);

  /*
   * ============================================================
   * SELECCIONAR OFERTA
   * ============================================================
   */

  const selectOffer = (offer: Offer) => {
    setSelectedOffer(offer);

    setError("");

    setShowConfirmation(false);

    setOrderCreated(false);

    setOrderNumber("");

    setSupplierOrderId("");

    setOrderStatus("");

    setQuantity(1);

    setTimeout(() => {
      document
        .getElementById("order-section")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 100);
  };

  /*
   * ============================================================
   * CANTIDAD
   * ============================================================
   */

  const increaseQuantity = () => {
    setQuantity((current) =>
      Math.min(current + 1, 99)
    );
  };

  const decreaseQuantity = () => {
    setQuantity((current) =>
      Math.max(current - 1, 1)
    );
  };

  /*
   * ============================================================
   * VALIDAR RIOT ID
   * ============================================================
   */

  const validateRiotId = (
    value: string
  ): string => {
    const cleanId = value.trim();

    if (!cleanId) {
      return "Introduzca su ID de Riot.";
    }

    if (!cleanId.includes("#")) {
      return (
        "Introduzca su ID de Riot en formato Nombre#ETIQUETA."
      );
    }

    const parts = cleanId.split("#");

    if (parts.length !== 2) {
      return (
        "El Riot ID debe tener el formato Nombre#ETIQUETA."
      );
    }

    const name = parts[0].trim();

    const tag = parts[1].trim();

    if (!name || !tag) {
      return (
        "El Riot ID debe tener el formato Nombre#ETIQUETA."
      );
    }

    if (cleanId.length > 50) {
      return "El Riot ID es demasiado largo.";
    }

    return "";
  };

  /*
   * ============================================================
   * CONTINUAR AL PASO DE CONFIRMACIÓN
   * ============================================================
   */

  const handleFinishPurchase = () => {
    if (!selectedOffer) {
      setError("Seleccione un producto.");
      return;
    }

    const riotError =
      validateRiotId(playerId);

    if (riotError) {
      setError(riotError);
      return;
    }

    setError("");

    setShowConfirmation(true);

    setTimeout(() => {
      document
        .getElementById("confirmation-section")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 100);
  };

  /*
   * ============================================================
   * CREAR PEDIDO REAL
   * ============================================================
   */

  const createOrder = async () => {
    if (!selectedOffer) {
      setError("Seleccione un producto.");
      return;
    }

    const cleanPlayerId =
      playerId.trim();

    const riotError =
      validateRiotId(cleanPlayerId);

    if (riotError) {
      setError(riotError);
      return;
    }

    if (processing) {
      return;
    }

    setProcessing(true);

    setError("");

    try {
      /*
       * Obtener sesión actual de Supabase.
       */

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw new Error(
          "No se pudo comprobar la sesión."
        );
      }

      if (!session?.access_token) {
        throw new Error(
          "Debes iniciar sesión para realizar el pedido."
        );
      }

      /*
       * Crear una clave de idempotencia.
       *
       * Evita que una doble pulsación pueda crear
       * accidentalmente dos pedidos.
       */

      let idempotencyKey = "";

      if (
        typeof crypto !== "undefined" &&
        typeof crypto.randomUUID === "function"
      ) {
        idempotencyKey =
          crypto.randomUUID();
      } else {
        idempotencyKey =
          `lol-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2)}`;
      }

      /*
       * Calcular total.
       */

      const totalPrice = Number(
        (
          selectedOffer.price *
          quantity
        ).toFixed(2)
      );

      /*
       * Enviar pedido a nuestra API.
       */

      const response = await fetch(
        "/api/topups/league-of-legends",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${session.access_token}`,
          },

          body: JSON.stringify({
            categoryId:
              FAZERCARDS_CATEGORY_ID,

            offerId:
              selectedOffer.id,

            playerId:
              cleanPlayerId,

            quantity,

            idempotencyKey,

            retailPrice:
              selectedOffer.price,

            totalPrice,
          }),
        }
      );

      let result: any = null;

      try {
        result = await response.json();
      } catch {
        result = null;
      }

      if (!response.ok) {
        throw new Error(
          result?.error ||
            result?.message ||
            "No se pudo crear el pedido."
        );
      }

      /*
       * Número de pedido interno.
       */

      const returnedOrderNumber =
        result?.orderNumber ||
        result?.order?.order_number ||
        result?.order?.id ||
        `LOL-${Date.now()
          .toString()
          .slice(-8)}`;

      /*
       * ID del pedido del proveedor.
       */

      const returnedSupplierOrderId =
        result?.supplierOrderId ||
        result?.order?.supplier_order_id ||
        "";

      /*
       * Estado recibido.
       */

      const returnedStatus =
        result?.status ||
        result?.order?.status ||
        "PENDING";

      setOrderNumber(
        returnedOrderNumber
      );

      setSupplierOrderId(
        returnedSupplierOrderId
      );

      setOrderStatus(
        returnedStatus
      );

      setShowConfirmation(false);

      setOrderCreated(true);

      setTimeout(() => {
        document
          .getElementById(
            "order-success-section"
          )
          ?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
      }, 100);
    } catch (orderError) {
      console.error(
        "Error creando pedido:",
        orderError
      );

      const message =
        orderError instanceof Error
          ? orderError.message
          : "No se pudo crear el pedido.";

      setError(message);
    } finally {
      setProcessing(false);
    }
  };

  /*
   * ============================================================
   * IR A PEDIDOS
   * ============================================================
   */

  const goToOrders = () => {
    router.push("/orders");
  };

  /*
   * ============================================================
   * PRECIO TOTAL
   * ============================================================
   */

  const totalPrice = selectedOffer
    ? Number(
        (
          selectedOffer.price *
          quantity
        ).toFixed(2)
      )
    : 0;

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <main className="game-service-page">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <header className="game-service-header">

        <button
          type="button"
          className="game-back-button"
          onClick={() =>
            router.push("/top-up")
          }
          aria-label="Volver"
        >
          ←
        </button>

        <div className="game-header-title">
          {GAME_NAME}
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

      {/* ======================================================
          IMAGEN DEL JUEGO
      ====================================================== */}

      <section className="free-fire-main-image">

        <img
          src={GAME_IMAGE}
          alt={GAME_NAME}
        />

        <div className="free-fire-main-overlay">

          <div className="free-fire-main-text">

            <span>
              RECARGA
            </span>

            <strong>
              LEAGUE OF LEGENDS
            </strong>

          </div>

        </div>

      </section>

      {/* ======================================================
          BOTÓN OFERTAS
      ====================================================== */}

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
          OFERTAS DISPONIBLES
        </span>

        <span className="offers-toggle-pencil">
          {showOffers
            ? "⌃"
            : "⌄"}
        </span>

      </button>

      {/* ======================================================
          OFERTAS
      ====================================================== */}

      {showOffers && (
        <section className="offers-section">

          <h2 className="offers-heading">
            SELECCIONA TU RECARGA
          </h2>

          <div className="offers-list">

            {offers.map(
              (offer) => {

                const isSelected =
                  selectedOffer?.id ===
                  offer.id;

                return (
                  <button
                    key={offer.id}
                    type="button"
                    className={
                      `offer-card ${
                        isSelected
                          ? "selected"
                          : ""
                      }`
                    }
                    onClick={() =>
                      selectOffer(
                        offer
                      )
                    }
                    disabled={processing}
                  >

                    <div className="offer-left">

                      <div className="diamond-icon">
                        {offer.icon}
                      </div>

                      <div className="offer-info">

                        <strong>
                          {offer.amount}
                        </strong>

                        <span>
                          League of Legends
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
                        Comprar
                      </span>

                    </div>

                  </button>
                );
              }
            )}

          </div>

        </section>
      )}

      {/* ======================================================
          INFORMACIÓN
      ====================================================== */}

      <section className="game-note">

        <div className="game-note-icon">
          !
        </div>

        <div className="game-note-content">
          {GAME_NOTE}
        </div>

      </section>

      {/* ======================================================
          FORMULARIO DEL PEDIDO
      ====================================================== */}

      {selectedOffer &&
        !orderCreated && (
          <section
            id="order-section"
            className="order-section"
          >

            <h2 className="section-title">
              COMPLETA TU PEDIDO
            </h2>

            {/* PRODUCTO SELECCIONADO */}

            <div className="selected-order-card">

              <div className="selected-order-icon">

                <img
                  src={GAME_IMAGE}
                  alt=""
                />

              </div>

              <div className="selected-order-info">

                <strong>
                  {selectedOffer.amount}
                </strong>

                <span>
                  {GAME_NAME}
                </span>

              </div>

              <div className="selected-order-price">

                {selectedOffer.price.toFixed(
                  2
                )}
                $

              </div>

            </div>

            {/* INFORMACIÓN */}

            <div className="game-note game-note-order">

              <div className="game-note-icon">
                !
              </div>

              <div className="game-note-content">
                {GAME_NOTE}
              </div>

            </div>

            {/* CANTIDAD */}

            <div className="quantity-section">

              <span>
                CANTIDAD
              </span>

              <div className="quantity-control">

                <button
                  type="button"
                  onClick={
                    decreaseQuantity
                  }
                  disabled={
                    quantity <= 1 ||
                    processing
                  }
                >
                  −
                </button>

                <strong>
                  {quantity}
                </strong>

                <button
                  type="button"
                  onClick={
                    increaseQuantity
                  }
                  disabled={
                    quantity >= 99 ||
                    processing
                  }
                >
                  +
                </button>

              </div>

            </div>

            {/* RIOT ID */}

            <div className="order-form">

              <label className="player-id-label">
                ID DE RIOT
              </label>

              <p className="player-id-description">

                Introduce tu Riot ID
                exactamente como aparece
                en tu cuenta.

                <br />

                Formato:

                {" "}

                <strong>
                  Nombre#ETIQUETA
                </strong>

              </p>

              <div className="player-id-input-wrapper">

                <input
                  type="text"
                  value={playerId}
                  onChange={(event) => {
                    setPlayerId(
                      event.target.value
                    );

                    setError("");
                  }}
                  placeholder="Nombre#ETIQUETA"
                  maxLength={50}
                  autoComplete="off"
                  disabled={processing}
                />

              </div>

              {error && (
                <div className="order-error">
                  {error}
                </div>
              )}

              {/* TOTAL */}

              <div className="order-total-preview">

                <span>
                  TOTAL
                </span>

                <strong>
                  {totalPrice.toFixed(
                    2
                  )}
                  $
                </strong>

              </div>

              <button
                type="button"
                className="finish-order-button"
                onClick={
                  handleFinishPurchase
                }
                disabled={processing}
              >
                CONTINUAR
              </button>

            </div>

          </section>
        )}

      {/* ======================================================
          CONFIRMACIÓN
      ====================================================== */}

      {showConfirmation &&
        selectedOffer && (
          <section
            id="confirmation-section"
            className="confirmation-section"
          >

            <h2 className="section-title">
              CONFIRMA TU PEDIDO
            </h2>

            <div className="confirmation-card">

              <div className="confirmation-row">

                <span>
                  Juego
                </span>

                <strong>
                  {GAME_NAME}
                </strong>

              </div>

              <div className="confirmation-row">

                <span>
                  Producto
                </span>

                <strong>
                  {selectedOffer.amount}
                </strong>

              </div>

              <div className="confirmation-row">

                <span>
                  Cantidad
                </span>

                <strong>
                  {quantity}
                </strong>

              </div>

                            <div className="confirmation-row">

                <span>
                  ID de Riot
                </span>

                <strong>
                  {playerId.trim()}
                </strong>

              </div>

              <div className="confirmation-row">

                <span>
                  Total
                </span>

                <strong>
                  {totalPrice.toFixed(
                    2
                  )}
                  $
                </strong>

              </div>

              <div className="confirmation-warning">

                ⚠️ Verifica que tu Riot ID
                y la región de tu cuenta
                sean correctos antes de
                confirmar.

              </div>

              {error && (
                <div className="order-error">
                  {error}
                </div>
              )}

              <button
                type="button"
                className="confirm-final-button"
                onClick={
                  createOrder
                }
                disabled={
                  processing
                }
              >

                {processing
                  ? "PROCESANDO..."
                  : "CONFIRMAR PEDIDO"}

              </button>

            </div>

          </section>
        )}

      {/* ======================================================
          PEDIDO CREADO
      ====================================================== */}

      {orderCreated && (
        <section
          id="order-success-section"
          className="order-success-section"
        >

          <div className="success-circle">
            ✓
          </div>

          <h2>
            PEDIDO CREADO
          </h2>

          <p>
            Tu pedido fue registrado
            correctamente.
          </p>

          <div className="success-order-number">

            <span>
              NÚMERO DE PEDIDO
            </span>

            <strong>
              {orderNumber}
            </strong>

          </div>

          {supplierOrderId && (
            <div className="success-order-number">

              <span>
                ID DEL PROVEEDOR
              </span>

              <strong>
                {supplierOrderId}
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
            VER MIS PEDIDOS
          </button>

        </section>
      )}

      {/* ======================================================
          INFORMACIÓN DEL SERVICIO
      ====================================================== */}

      <section className="service-info">

        <div className="service-info-item">

          <span>
            ⚡
          </span>

          <div>

            <strong>
              ENTREGA DIRECTA
            </strong>

            <p>
              El producto se entrega
              directamente en tu cuenta.
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
              Procesamos tus pedidos
              de forma segura.
            </p>

          </div>

        </div>

        <div className="service-info-item">

          <span>
            🎧
          </span>

          <div>

            <strong>
              SOPORTE
            </strong>

            <p>
              Si tienes algún problema,
              puedes contactar con soporte.
            </p>

          </div>

        </div>

      </section>

      {/* ======================================================
          FOOTER
      ====================================================== */}

      <footer className="game-service-footer">

        <strong>
          STORE GAMING
        </strong>

        <span>
          © {new Date().getFullYear()}
        </span>

      </footer>

    </main>
  );
}
