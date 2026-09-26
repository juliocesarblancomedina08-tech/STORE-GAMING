"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

type SupplierOffer = {
  offer_id: string;
  name: string;
  price_usd: string | number;
};

type DeltaOffer = {
  id: string;
  supplierOfferId: string;
  name: string;
  display: string;
  price: number;
  icon: string;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const gameNote =
  "Región: Global. La moneda se entrega directamente a su cuenta después de realizar el pedido.";

export default function DeltaForcePage() {
  const router = useRouter();

  const [showOffers, setShowOffers] = useState(false);

  const [offers, setOffers] = useState<DeltaOffer[]>([]);

  const [loadingOffers, setLoadingOffers] =
    useState(true);

  const [offersError, setOffersError] =
    useState("");

  const [selectedOffer, setSelectedOffer] =
    useState<DeltaOffer | null>(null);

  const [playerId, setPlayerId] =
    useState("");

  const [error, setError] =
    useState("");

  const [showConfirmation, setShowConfirmation] =
    useState(false);

  const [orderCreated, setOrderCreated] =
    useState(false);

  const [orderNumber, setOrderNumber] =
    useState("");

  const [creatingOrder, setCreatingOrder] =
    useState(false);

  /*
   * ============================================================
   * CARGAR OFERTAS REALES DE FAZERCARDS
   * ============================================================
   */

  useEffect(() => {
    let cancelled = false;

    async function loadOffers() {
      try {
        setLoadingOffers(true);
        setOffersError("");

        const response = await fetch(
          "/api/fazercards/topups?category_id=delta_force",
          {
            method: "GET",
            cache: "no-store",
          }
        );

        const data = await response.json();

        if (!response.ok || !data?.ok) {
          throw new Error(
            data?.error ||
              "No se pudieron cargar las ofertas de Delta Force."
          );
        }

        if (!Array.isArray(data.offers)) {
          throw new Error(
            "FazerCards no devolvió una lista válida de ofertas."
          );
        }

        const normalizedOffers: DeltaOffer[] =
          data.offers
            .map(
              (
                offer: SupplierOffer
              ): DeltaOffer | null => {
                if (
                  !offer?.offer_id ||
                  !offer?.name
                ) {
                  return null;
                }

                const price = Number(
                  offer.price_usd
                );

                if (
                  !Number.isFinite(price)
                ) {
                  return null;
                }

                const name =
                  String(
                    offer.name
                  ).trim();

                const lowerName =
                  name.toLowerCase();

                const isPass =
                  lowerName.includes(
                    "pass"
                  ) ||
                  lowerName.includes(
                    "pase"
                  );

                return {
                  id: String(
                    offer.offer_id
                  ),

                  supplierOfferId:
                    String(
                      offer.offer_id
                    ),

                  name:
                    name.toUpperCase(),

                  display: isPass
                    ? name.toUpperCase()
                    : name
                        .replace(
                          /delta coins?/i,
                          "🪙"
                        )
                        .toUpperCase(),

                  price,

                  icon: isPass
                    ? "🎟️"
                    : "🪙",
                };
              }
            )
            .filter(
              (
                offer: DeltaOffer | null
              ): offer is DeltaOffer =>
                offer !== null
            );

        if (cancelled) {
          return;
        }

        if (
          normalizedOffers.length === 0
        ) {
          throw new Error(
            "FazerCards no devolvió ofertas disponibles."
          );
        }

        setOffers(
          normalizedOffers
        );
      } catch (err) {
        if (cancelled) {
          return;
        }

        console.error(
          "Error cargando Delta Force:",
          err
        );

        setOffersError(
          err instanceof Error
            ? err.message
            : "No se pudieron cargar las ofertas."
        );
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

  function selectOffer(
    offer: DeltaOffer
  ) {
    setSelectedOffer(offer);
    setPlayerId("");
    setError("");
    setShowConfirmation(false);
    setOrderCreated(false);
    setOrderNumber("");

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

  /*
   * ============================================================
   * FORMULARIO
   * ============================================================
   */

  function handleFinishPurchase(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    if (!selectedOffer) {
      setError(
        "Seleccione una oferta."
      );
      return;
    }

    const cleanId =
      playerId.trim();

    if (!cleanId) {
      setError(
        "Ponga el ID de su cuenta."
      );
      return;
    }

    if (!/^[0-9]+$/.test(cleanId)) {
      setError(
        "El ID solo puede contener números."
      );
      return;
    }

    if (cleanId.length < 4) {
      setError(
        "El ID parece demasiado corto."
      );
      return;
    }

    setShowConfirmation(true);

    setTimeout(() => {
      document
        .getElementById(
          "confirmation-section"
        )
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 100);
  }

  /*
   * ============================================================
   * CREAR PEDIDO REAL
   * ============================================================
   */

  async function createOrder() {
    if (
      !selectedOffer ||
      creatingOrder
    ) {
      return;
    }

    setError("");
    setCreatingOrder(true);

    try {
      const {
        data: sessionData,
        error: sessionError,
      } =
        await supabase.auth.getSession();

      if (
        sessionError ||
        !sessionData.session
      ) {
        setError(
          "Su sesión ha expirado. Inicie sesión nuevamente."
        );
        router.push("/login");
        return;
      }

      const cleanPlayerId =
        playerId.trim();

      const idempotencyKey =
        crypto.randomUUID();

      const response =
        await fetch(
          "/api/topups/delta-force",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",

              Accept:
                "application/json",

              Authorization:
                `Bearer ${sessionData.session.access_token}`,
            },

            body:
              JSON.stringify({
                offerId:
                  selectedOffer.supplierOfferId,

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

      const data =
        await response.json();

      if (
        !response.ok &&
        !data?.ok
      ) {
        throw new Error(
          data?.error ||
            "No se pudo crear la orden."
        );
      }

      if (!data?.orderNumber) {
        throw new Error(
          "La orden fue procesada pero no se recibió el número de orden."
        );
      }

      setOrderNumber(
        String(
          data.orderNumber
        )
      );

      setOrderCreated(true);
      setShowConfirmation(false);

      /*
       * Guardamos únicamente una referencia local
       * para compatibilidad con pantallas antiguas.
       *
       * La orden real está en topup_orders.
       */

      const localOrder = {
        id:
          data.orderNumber,

        game:
          "DELTA FORCE",

        product:
          selectedOffer.name,

        displayProduct:
          selectedOffer.display,

        price:
          selectedOffer.price,

        unitPrice:
          selectedOffer.price,

        quantity:
          1,

        playerId:
          cleanPlayerId,

        status:
          data.status ===
          "COMPLETED"
            ? "Completada"
            : "Pendiente",

        supplier:
          "FazerCards",

        supplierOfferId:
          selectedOffer.supplierOfferId,

        supplierOrderId:
          data.supplierOrderId ??
          null,

        createdAt:
          new Date().toISOString(),
      };

      try {
        const existingOrders =
          localStorage.getItem(
            "storeGamingOrders"
          );

        let orders: any[] = [];

        if (existingOrders) {
          const parsed =
            JSON.parse(
              existingOrders
            );

          if (
            Array.isArray(
              parsed
            )
          ) {
            orders = parsed;
          }
        }

        const alreadyExists =
          orders.some(
            (item) =>
              String(
                item?.id
              ) ===
              String(
                localOrder.id
              )
          );

        if (!alreadyExists) {
          orders.unshift(
            localOrder
          );
        }

        localStorage.setItem(
          "storeGamingOrders",
          JSON.stringify(
            orders
          )
        );

        localStorage.setItem(
          "storeGamingLastOrder",
          JSON.stringify(
            localOrder
          )
        );
      } catch (storageError) {
        console.warn(
          "No se pudo actualizar el almacenamiento local:",
          storageError
        );
      }

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
        "Error creando pedido Delta Force:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error creando la orden."
      );
    } finally {
      setCreatingOrder(false);
    }
  }

  /*
   * ============================================================
   * IR A PEDIDOS
   * ============================================================
   */

  function goToOrders() {
    router.push(
      "/orders"
    );
  }

  /*
   * ============================================================
   * TOTAL
   * ============================================================
   */

  const total =
    selectedOffer
      ? selectedOffer.price
      : 0;

  return (
    <main className="game-service-page">

      {/* =========================
          HEADER
      ========================== */}

      <header className="game-service-header">

        <button
          type="button"
          className="game-back-button"
          onClick={() =>
            router.push(
              "/top-up"
            )
          }
          aria-label="Volver"
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
            router.push(
              "/cart"
            )
          }
          aria-label="Carrito"
        >
          🛒
        </button>

      </header>


      {/* =========================
          IMAGEN PRINCIPAL
      ========================== */}

      <section className="free-fire-main-image">

        <img
          src="/images/delta-force.jpg"
          alt="Delta Force"
        />

        <div className="free-fire-main-overlay" />

        <div className="free-fire-main-text">

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
            Monedas y pases
          </p>

        </div>

      </section>


      {/* =========================
          BOTÓN PARA MOSTRAR OFERTAS
      ========================== */}

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


      {/* =========================
          OFERTAS
      ========================== */}

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


          {loadingOffers && (

            <div className="game-note">

              <div className="game-note-icon">
                ⟳
              </div>

              <div className="game-note-content">

                <strong>
                  CARGANDO OFERTAS
                </strong>

                <p>
                  Consultando las ofertas
                  disponibles de Delta Force...
                </p>

              </div>

            </div>

          )}


          {!loadingOffers &&
            offersError && (

              <div className="game-note">

                <div className="game-note-icon">
                  !
                </div>

                <div className="game-note-content">

                  <strong>
                    ERROR
                  </strong>

                  <p>
                    {offersError}
                  </p>

                </div>

              </div>

            )}


          {!loadingOffers &&
            !offersError &&
            offers.length > 0 && (

              <div className="offers-list">

                {offers.map(
                  (offer) => {

                    const selected =
                      selectedOffer?.id ===
                      offer.id;

                    return (

                      <button
                        key={
                          offer.supplierOfferId
                        }
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
                            {offer.price.toFixed(
                              2
                            )}
                            $
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

            )}


          {!loadingOffers &&
            !offersError &&
            offers.length > 0 && (

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

            )}

        </section>

      )}


      {/* =========================
          DATOS DEL PEDIDO
      ========================== */}

      {selectedOffer && (

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
                DELTA FORCE
              </span>

              <strong>
                {selectedOffer.name}
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


                    {/* =========================
              FORMULARIO
          ========================== */}

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
              Introduzca el ID de su cuenta
              de Delta Force.
            </p>

            <div className="player-id-input-wrapper">

              <input
                id="player-id"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={playerId}
                onChange={(event) =>
                  setPlayerId(
                    event.target.value
                  )
                }
                placeholder="Escriba su ID"
              />

            </div>


            {/* =========================
                ERROR
            ========================== */}

            {error && (

              <div className="order-error">
                {error}
              </div>

            )}


            {/* =========================
                TOTAL
            ========================== */}

            <div className="order-total-preview">

              <span>
                TOTAL
              </span>

              <strong>
                {total.toFixed(2)}
                $
              </strong>

            </div>


            <button
              type="submit"
              className="finish-order-button"
              disabled={creatingOrder}
            >
              FINALIZAR COMPRA
            </button>

          </form>


          {/* =========================
              CONFIRMACIÓN
          ========================== */}

          {showConfirmation &&
            !orderCreated && (

              <section
                id="confirmation-section"
                className="confirmation-section"
              >

                <div className="section-title">

                  <span>
                    02
                  </span>

                  <div>

                    <small>
                      CONFIRMAR
                    </small>

                    <h2>
                      CONFIRMA TU PEDIDO
                    </h2>

                  </div>

                </div>


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

                    <small>
                      ID: {playerId.trim()}
                    </small>

                  </div>

                  <div className="selected-order-price">
                    {total.toFixed(2)}$
                  </div>

                </div>


                <button
                  type="button"
                  className="finish-order-button"
                  onClick={createOrder}
                  disabled={creatingOrder}
                >
                  {creatingOrder
                    ? "PROCESANDO..."
                    : "CONFIRMAR PEDIDO"}
                </button>

              </section>

            )}


          {/* =========================
              PEDIDO CREADO
          ========================== */}

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
                Su pedido fue registrado
                correctamente.
              </p>

              <div className="success-order-number">

                <span>
                  NÚMERO DE ORDEN
                </span>

                <strong>
                  {orderNumber}
                </strong>

              </div>

              <button
                type="button"
                className="view-orders-button"
                onClick={goToOrders}
              >
                REVISAR ORDEN
              </button>

            </section>

          )}

        </section>

      )}


      {/* =========================
          FOOTER
      ========================== */}

      <footer className="game-service-footer">

        <strong>
          🛒STORE GAMING🎮
        </strong>

        <span>
          DELTA FORCE TOP UP
        </span>

      </footer>

    </main>
  );
}
