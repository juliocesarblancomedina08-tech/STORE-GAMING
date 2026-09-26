"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type TopupOrderRow = {
  id: string;
  user_id: string;
  username: string | null;
  email: string | null;
  game: string;
  category_id: string;
  offer_id: string;
  offer_name: string;
  player_id: string;
  retail_price: number | string;
  supplier_price: number | string;
  currency: string;
  status: string;
  supplier_order_id: string | null;
  supplier_fields: Record<string, unknown> | null;
  supplier_response: Record<string, unknown> | null;
  refunded_at: string | null;
  completed_at: string | null;
  failed_at: string | null;
  created_at: string;
  updated_at: string;
};

type Order = {
  id: string;
  user_id?: string;
  email?: string;
  username?: string;
  game: string;
  categoryId?: string;
  product: string;
  displayProduct?: string;
  price: number;
  total?: number;
  playerId: string;
  serverId?: string;
  status: string;
  createdAt: string;
  supplierOrderId?: string;
  currency?: string;
  image: string;
};

type Filter =
  | "TODAS"
  | "PENDIENTES"
  | "COMPLETADAS"
  | "CANCELADAS";

/*
 * ============================================================
 * IMÁGENES DE LOS JUEGOS
 * ============================================================
 *
 * Estas rutas corresponden a las imágenes que están dentro de:
 *
 * public/images/
 *
 * IMPORTANTE:
 * Battle Royale NO se utiliza como imagen de ningún juego.
 * Solamente queda como imagen de respaldo si aparece una
 * categoría desconocida.
 */

const GAME_IMAGES: Record<string, string> = {
  /*
   * BLOOD STRIKE
   */
  blood_strike:
    "/images/blood-strike.jpg",

  /*
   * FREE FIRE
   */
  free_fire_latam:
    "/images/free-fire-latam.jpg",

  free_fire:
    "/images/free-fire-latam.jpg",

  /*
   * MOBILE LEGENDS
   */
  mobile_legends_united_states:
    "/images/mobile-legends.jpg",

  mobile_legends:
    "/images/mobile-legends.jpg",

  /*
   * DELTA FORCE
   */
  delta_force:
    "/images/delta-force.jpg",

  /*
   * EA FC MOBILE
   */
  eafc_mobile_id:
    "/images/fc-mobile.jpg",

  fc_mobile:
    "/images/fc-mobile.jpg",

  /*
   * CALL OF DUTY MOBILE
   *
   * El nombre real del archivo en GitHub es:
   * call-of-duty-mobile.jpg
   */
  codm_activision_us:
    "/images/call-of-duty-mobile.jpg",

  call_of_duty_mobile:
    "/images/call-of-duty-mobile.jpg",

  call_of_duty:
    "/images/call-of-duty-mobile.jpg",

  cod_mobile:
    "/images/call-of-duty-mobile.jpg",

  /*
   * HONOR OF KINGS
   */
  honor_of_kings:
    "/images/honor-of-kings.jpg",

  honor_of_kings_global:
    "/images/honor-of-kings.jpg",

  /*
   * LEAGUE OF LEGENDS
   */
  league_of_legends:
    "/images/league-of-legends.jpg",

  lol:
    "/images/league-of-legends.jpg",

  /*
   * MODERN WARSHIPS
   */
  modern_warships:
    "/images/modern-warships.jpg",

  /*
   * SAUSAGE MAN
   */
  sausage_man:
    "/images/sausage-man.jpg",

  /*
   * ARENA BREAKOUT
   */
  arena_breakout:
    "/images/arena-breakout.jpg",

  arena_breakout_global:
    "/images/arena-breakout.jpg",

  /*
   * TELEGRAM STARS
   *
   * Se mantiene porque ya estaba configurado en el proyecto.
   * Si esta imagen existe en public/images, se utilizará.
   */
  telegram_stars:
    "/images/telegram-stars.jpg",
};

/*
 * Imagen de respaldo.
 *
 * Battle Royale queda únicamente como respaldo para una
 * categoría que todavía no esté registrada.
 *
 * NO se utiliza para Blood Strike ni para los juegos
 * registrados arriba.
 */
const DEFAULT_GAME_IMAGE =
  "/images/battle-royale-bg.jpg";

/*
 * ============================================================
 * OBTENER IMAGEN DEL JUEGO
 * ============================================================
 */

function getGameImage(
  categoryId: string,
  game: string
): string {
  /*
   * Primero buscamos directamente por category_id.
   *
   * Ejemplo:
   *
   * blood_strike
   * ↓
   * /images/blood-strike.jpg
   */

  const directImage =
    GAME_IMAGES[categoryId];

  if (directImage) {
    return directImage;
  }

  /*
   * Si no encontramos el category_id,
   * intentamos identificar el juego por su nombre.
   */

  const normalized =
    game
      .toLowerCase()
      .normalize("NFD")
      .replace(
        /[\u0300-\u036f]/g,
        ""
      );

  /*
   * ==========================================================
   * BLOOD STRIKE
   * ==========================================================
   */

  if (
    normalized.includes(
      "blood strike"
    )
  ) {
    return "/images/blood-strike.jpg";
  }

  /*
   * ==========================================================
   * FREE FIRE
   * ==========================================================
   */

  if (
    normalized.includes("free") &&
    normalized.includes("fire")
  ) {
    return "/images/free-fire-latam.jpg";
  }

  /*
   * ==========================================================
   * MOBILE LEGENDS
   * ==========================================================
   */

  if (
    normalized.includes(
      "mobile legends"
    )
  ) {
    return "/images/mobile-legends.jpg";
  }

  /*
   * ==========================================================
   * DELTA FORCE
   * ==========================================================
   */

  if (
    normalized.includes(
      "delta force"
    )
  ) {
    return "/images/delta-force.jpg";
  }

  /*
   * ==========================================================
   * EA FC MOBILE
   * ==========================================================
   */

  if (
    normalized.includes(
      "fc mobile"
    ) ||
    normalized.includes(
      "eafc mobile"
    ) ||
    normalized.includes(
      "ea fc"
    )
  ) {
    return "/images/fc-mobile.jpg";
  }

  /*
   * ==========================================================
   * CALL OF DUTY MOBILE
   * ==========================================================
   */

  if (
    normalized.includes(
      "call of duty"
    ) ||
    normalized.includes(
      "cod mobile"
    ) ||
    normalized.includes(
      "codm"
    )
  ) {
    return "/images/call-of-duty-mobile.jpg";
  }

  /*
   * ==========================================================
   * HONOR OF KINGS
   * ==========================================================
   */

  if (
    normalized.includes(
      "honor of kings"
    )
  ) {
    return "/images/honor-of-kings.jpg";
  }

  /*
   * ==========================================================
   * LEAGUE OF LEGENDS
   * ==========================================================
   */

  if (
    normalized.includes(
      "league of legends"
    ) ||
    normalized === "lol"
  ) {
    return "/images/league-of-legends.jpg";
  }

  /*
   * ==========================================================
   * MODERN WARSHIPS
   * ==========================================================
   */

  if (
    normalized.includes(
      "modern warships"
    )
  ) {
    return "/images/modern-warships.jpg";
  }

  /*
   * ==========================================================
   * SAUSAGE MAN
   * ==========================================================
   */

  if (
    normalized.includes(
      "sausage man"
    )
  ) {
    return "/images/sausage-man.jpg";
  }

  /*
   * ==========================================================
   * ARENA BREAKOUT
   * ==========================================================
   */

  if (
    normalized.includes(
      "arena breakout"
    )
  ) {
    return "/images/arena-breakout.jpg";
  }

  /*
   * ==========================================================
   * TELEGRAM
   * ==========================================================
   */

  if (
    normalized.includes(
      "telegram"
    ) ||
    normalized.includes(
      "stars"
    )
  ) {
    return "/images/telegram-stars.jpg";
  }

  /*
   * ==========================================================
   * RESPALDO
   * ==========================================================
   *
   * Solamente se llega aquí si aparece un juego nuevo
   * que todavía no hemos registrado.
   */

  return DEFAULT_GAME_IMAGE;
}

export default function OrdersPage() {
  const router = useRouter();

  const [orders, setOrders] =
    useState<Order[]>([]);

  const [filter, setFilter] =
    useState<Filter>("TODAS");

  const [loading, setLoading] =
    useState(true);

  /*
   * Esta variable sirve para entrar
   * a una pantalla exclusiva de la orden.
   */
  const [selectedOrder, setSelectedOrder] =
    useState<Order | null>(null);

  /*
   * ============================================================
   * CARGAR ÓRDENES
   * ============================================================
   */

  useEffect(() => {
    let mounted = true;

    async function loadOrders() {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (
          sessionError ||
          !session?.user
        ) {
          if (mounted) {
            setLoading(false);
            router.replace("/login");
          }

          return;
        }

        const userId =
          session.user.id;

        const { data, error } =
          await supabase
            .from("topup_orders")
            .select(
              `
                id,
                user_id,
                username,
                email,
                game,
                category_id,
                offer_id,
                offer_name,
                player_id,
                retail_price,
                supplier_price,
                currency,
                status,
                supplier_order_id,
                supplier_fields,
                supplier_response,
                refunded_at,
                completed_at,
                failed_at,
                created_at,
                updated_at
              `
            )
            .eq(
              "user_id",
              userId
            )
            .order(
              "created_at",
              {
                ascending: false,
              }
            );

        if (error) {
          console.error(
            "ERROR CARGANDO ÓRDENES:",
            error
          );

          if (mounted) {
            setOrders([]);
            setLoading(false);
          }

          return;
        }

        const rows =
          (data ||
            []) as TopupOrderRow[];

        const mappedOrders: Order[] =
          rows.map((row) => {
            const fields =
              row.supplier_fields ||
              {};

            /*
             * Mobile Legends utiliza server_id.
             *
             * Dejamos compatibilidad con:
             * server_id
             * id_servidor
             * serverId
             */

            const serverIdValue =
              fields.server_id ??
              fields.id_servidor ??
              fields.serverId;

            /*
             * OBTENEMOS LA IMAGEN REAL
             * DEL JUEGO.
             */

            const gameImage =
              getGameImage(
                row.category_id,
                row.game
              );

            return {
              id: row.id,

              user_id:
                row.user_id,

              email:
                row.email ||
                undefined,

              username:
                row.username ||
                undefined,

              game:
                row.game,

              categoryId:
                row.category_id,

              product:
                row.offer_name,

              displayProduct:
                row.offer_name,

              price:
                Number(
                  row.retail_price
                ) || 0,

              total:
                Number(
                  row.retail_price
                ) || 0,

              playerId:
                row.player_id,

              serverId:
                serverIdValue !==
                  undefined &&
                serverIdValue !==
                  null
                  ? String(
                      serverIdValue
                    )
                  : undefined,

              status:
                row.status,

              createdAt:
                row.created_at,

              supplierOrderId:
                row.supplier_order_id ||
                undefined,

              currency:
                row.currency ||
                "USD",

              /*
               * AQUÍ SE GUARDA LA FOTO
               * ESPECÍFICA DEL JUEGO.
               */
              image:
                gameImage,
            };
          });

        if (mounted) {
          setOrders(
            mappedOrders
          );

          setLoading(false);
        }
      } catch (error) {
        console.error(
          "ERROR INESPERADO CARGANDO ÓRDENES:",
          error
        );

        if (mounted) {
          setOrders([]);
          setLoading(false);
        }
      }
    }

    loadOrders();

    return () => {
      mounted = false;
    };
  }, [router]);

  /*
   * ============================================================
   * ESTADOS DE LAS ÓRDENES
   * ============================================================
   */

  function isCompleted(
    status: string
  ) {
    const normalized =
      status.toUpperCase();

    return (
      normalized ===
        "COMPLETED" ||
      normalized ===
        "COMPLETADA" ||
      normalized ===
        "CONFIRMADO" ||
      normalized ===
        "CONFIRMADA" ||
      normalized ===
        "SUCCESS" ||
      normalized ===
        "SUCCESSFUL"
    );
  }

  function isCancelled(
    status: string
  ) {
    const normalized =
      status.toUpperCase();

    return (
      normalized ===
        "CANCELLED" ||
      normalized ===
        "CANCELED" ||
      normalized ===
        "CANCELADA" ||
      normalized ===
        "FAILED" ||
      normalized ===
        "REFUNDED"
    );
  }

  function isPending(
    status: string
  ) {
    const normalized =
      status.toUpperCase();

    return (
      normalized ===
        "RESERVED" ||
      normalized ===
        "SUPPLIER_PENDING" ||
      normalized ===
        "REFUND_PENDING" ||
      normalized ===
        "PENDING" ||
      normalized ===
        "PROCESSING" ||
      normalized ===
        "PENDIENTE"
    );
  }

  function getStatusClass(
    status: string
  ) {
    if (
      isCompleted(status)
    ) {
      return "status-completed";
    }

    if (
      isCancelled(status)
    ) {
      return "status-cancelled";
    }

    return "status-pending";
  }

  function getStatusText(
    status: string
  ) {
    if (
      isCompleted(status)
    ) {
      return "COMPLETADA";
    }

    if (
      isCancelled(status)
    ) {
      if (
        status.toUpperCase() ===
        "REFUNDED"
      ) {
        return "REEMBOLSADA";
      }

      return "CANCELADA";
    }

    if (
      status.toUpperCase() ===
      "SUPPLIER_PENDING"
    ) {
      return "PROCESANDO";
    }

    if (
      status.toUpperCase() ===
      "REFUND_PENDING"
    ) {
      return "REEMBOLSO PENDIENTE";
    }

    return "PENDIENTE";
  }

  /*
   * ============================================================
   * FECHA
   * ============================================================
   */

  function formatDate(
    date: string
  ) {
    try {
      return new Date(
        date
      ).toLocaleString(
        "es-ES",
        {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }
      );
    } catch {
      return date;
    }
  }

  /*
   * ============================================================
   * FILTROS
   * ============================================================
   */

  const filteredOrders =
    useMemo(() => {
      if (
        filter ===
        "TODAS"
      ) {
        return orders;
      }

      if (
        filter ===
        "PENDIENTES"
      ) {
        return orders.filter(
          (order) =>
            isPending(
              order.status
            )
        );
      }

      if (
        filter ===
        "COMPLETADAS"
      ) {
        return orders.filter(
          (order) =>
            isCompleted(
              order.status
            )
        );
      }

      if (
        filter ===
        "CANCELADAS"
      ) {
        return orders.filter(
          (order) =>
            isCancelled(
              order.status
            )
        );
      }

      return orders;
    }, [
      orders,
      filter,
    ]);

  /*
   * ============================================================
   * CONTADORES
   * ============================================================
   */

  const totalOrders =
    orders.length;

  const totalAmount =
    orders.reduce(
      (
        sum,
        order
      ) =>
        sum +
        (Number(
          order.total
        ) ||
          Number(
            order.price
          ) ||
          0),
      0
    );

  const completedOrders =
    orders.filter(
      (order) =>
        isCompleted(
          order.status
        )
    ).length;

  const pendingOrders =
    orders.filter(
      (order) =>
        isPending(
          order.status
        )
    ).length;

  const cancelledOrders =
    orders.filter(
      (order) =>
        isCancelled(
          order.status
        )
    ).length;

  /*
   * ============================================================
   * ABRIR ORDEN
   * ============================================================
   */

  function openOrder(
    order: Order
  ) {
    setSelectedOrder(
      order
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  /*
   * ============================================================
   * REGRESAR AL HISTORIAL
   * ============================================================
   */

  function closeOrder() {
    setSelectedOrder(
      null
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  /*
   * ============================================================
   * LOADING
   * ============================================================
   */

  if (loading) {
    return (
      <main className="orders-page">
        <div className="orders-loading">

          <div className="orders-loading-spinner">
            ⏳
          </div>

          <strong>
            CARGANDO TUS ÓRDENES...
          </strong>

          <span>
            Un momento por favor
          </span>

        </div>
      </main>
    );
  }

  /*
   * ============================================================
   * VISTA EXCLUSIVA DE LA ORDEN
   * ============================================================
   */

  if (
    selectedOrder
  ) {
    return (
      <main
        className="
          orders-page
          order-detail-page
        "
      >

        <section
          className="
            order-detail-screen
          "
        >

          {/* ==================================================
              ENCABEZADO DE LA COMPRA
              ================================================== */}

          <header
            className="
              order-detail-screen-header
            "
          >

            <button
              type="button"
              className="
                order-detail-back
              "
              onClick={
                closeOrder
              }
              aria-label="
                Regresar al historial
              "
            >
              ←
            </button>

            <div
              className="
                order-detail-game-image
              "
            >
              <img
                src={
                  selectedOrder.image
                }
                alt={
                  selectedOrder.game
                }
                onError={(
                  event
                ) => {
                  const image =
                    event.currentTarget;

                  if (
                    image.src.endsWith(
                      DEFAULT_GAME_IMAGE
                    )
                  ) {
                    return;
                  }

                  image.src =
                    DEFAULT_GAME_IMAGE;
                }}
              />
            </div>

            <div
              className="
                order-detail-heading
              "
            >

              <strong>
                DETALLES DE LA COMPRA
              </strong>

              <span>
                ORDEN #
                {
                  selectedOrder.id
                }
              </span>

            </div>

          </header>

          {/* ==================================================
              ESTADO
              ================================================== */}

          <div
            className="
              order-detail-hero
            "
          >

            <div
              className="
                order-detail-status
              "
            >

              <span
                className={getStatusClass(
                  selectedOrder.status
                )}
              >
                {
                  getStatusText(
                    selectedOrder.status
                  )
                }
              </span>

            </div>

            {/* ==================================================
                INFORMACIÓN DE LA COMPRA
                ================================================== */}

            <div
              className="
                order-detail-content
              "
            >

              <div
                className="
                  order-detail-row
                "
              >
                <span>
                  🎮 Juego
                </span>

                <strong>
                  {selectedOrder.game}
                </strong>
              </div>

              <div
                className="
                  order-detail-row
                "
              >
                <span>
                  📦 Producto
                </span>

                <strong>
                  {selectedOrder.displayProduct ||
                    selectedOrder.product}
                </strong>
              </div>

              <div
                className="
                  order-detail-row
                "
              >
                <span>
                  🆔 ID del jugador
                </span>

                <strong>
                  {selectedOrder.playerId}
                </strong>
              </div>

              {selectedOrder.serverId && (
                <div
                  className="
                    order-detail-row
                  "
                >
                  <span>
                    🌐 ID del servidor
                  </span>

                  <strong>
                    {selectedOrder.serverId}
                  </strong>
                </div>
              )}

              <div
                className="
                  order-detail-row
                "
              >
                <span>
                  💵 Precio
                </span>

                <strong>
                  ${selectedOrder.price.toFixed(2)}
                </strong>
              </div>

              <div
                className="
                  order-detail-row
                "
              >
                <span>
                  💳 Moneda
                </span>

                <strong>
                  {selectedOrder.currency || "USD"}
                </strong>
              </div>

              <div
                className="
                  order-detail-row
                "
              >
                <span>
                  📅 Fecha
                </span>

                <strong>
                  {formatDate(
                    selectedOrder.createdAt
                  )}
                </strong>
              </div>

              <div
                className="
                  order-detail-row
                "
              >
                <span>
                  🔢 Número de orden
                </span>

                <strong
                  className="
                    order-id-value
                  "
                >
                  {selectedOrder.id}
                </strong>
              </div>

              {selectedOrder.supplierOrderId && (
                <div
                  className="
                    order-detail-row
                  "
                >
                  <span>
                    ⚙️ Referencia
                  </span>

                  <strong>
                    {selectedOrder.supplierOrderId}
                  </strong>
                </div>
              )}

            </div>

          </div>

          {/* ==================================================
              BOTÓN REGRESAR
              ================================================== */}

          <button
            type="button"
            className="
              order-detail-return
            "
            onClick={closeOrder}
          >
            ← REGRESAR A MIS ÓRDENES
          </button>

        </section>

      </main>
    );
  }

  /*
   * ============================================================
   * HISTORIAL NORMAL
   * ============================================================
   */

  return (
    <main className="orders-page">

      {/* ======================================================
          ENCABEZADO
          ====================================================== */}

      <header
        className="
          orders-header
        "
      >

        <button
          type="button"
          className="
            orders-back-button
          "
          onClick={() =>
            router.back()
          }
          aria-label="Volver"
        >
          ←
        </button>

        <div
          className="
            orders-header-title
          "
        >
          <span>
            🛒
          </span>

          <strong>
            MIS ÓRDENES
          </strong>
        </div>

        <div
          className="
            orders-header-space
          "
        />

      </header>

      {/* ======================================================
          HERO
          ====================================================== */}

      <section
        className="
          orders-hero
        "
      >

        <div
          className="
            orders-hero-glow
          "
        />

        <div
          className="
            orders-hero-content
          "
        >

          <span
            className="
              orders-hero-label
            "
          >
            STORE GAMING
          </span>

          <h1>
            HISTORIAL
            <strong>
              DE ÓRDENES
            </strong>
          </h1>

          <p>
            Consulta tus compras,
            productos y el estado
            de cada pedido.
          </p>

        </div>

        <div
          className="
            orders-total-box
          "
        >

          <span>
            PEDIDOS
          </span>

          <strong>
            {totalOrders}
          </strong>

          <small>
            REGISTRADOS
          </small>

        </div>

      </section>

      {/* ======================================================
          ESTADÍSTICAS
          ====================================================== */}

      <section
        className="
          orders-stats
        "
      >

        <div
          className="
            orders-stat-card
          "
        >
          <span
            className="
              orders-stat-icon
            "
          >
            📦
          </span>

          <strong>
            {totalOrders}
          </strong>

          <small>
            PEDIDOS
          </small>
        </div>

        <div
          className="
            orders-stat-card
          "
        >
          <span
            className="
              orders-stat-icon
            "
          >
            💵
          </span>

          <strong>
            ${totalAmount.toFixed(2)}
          </strong>

          <small>
            TOTAL
          </small>
        </div>

        <div
          className="
            orders-stat-card
          "
        >
          <span
            className="
              orders-stat-icon
            "
          >
            ✅
          </span>

          <strong>
            {completedOrders}
          </strong>

          <small>
            COMPLETADOS
          </small>
        </div>

        <div
          className="
            orders-stat-card
          "
        >
          <span
            className="
              orders-stat-icon
            "
          >
            ❌
          </span>

          <strong>
            {cancelledOrders}
          </strong>

          <small>
            CANCELADOS
          </small>
        </div>

        <div
          className="
            orders-stat-card
          "
        >
          <span
            className="
              orders-stat-icon
            "
          >
            ⏳
          </span>

          <strong>
            {pendingOrders}
          </strong>

          <small>
            PENDIENTES
          </small>
        </div>

      </section>

      {/* ======================================================
          FILTROS
          ====================================================== */}

      <section
        className="
          orders-filters
        "
      >

        <button
          type="button"
          className={
            filter === "TODAS"
              ? "orders-filter active"
              : "orders-filter"
          }
          onClick={() =>
            setFilter("TODAS")
          }
        >
          TODAS
        </button>

        <button
          type="button"
          className={
            filter === "PENDIENTES"
              ? "orders-filter active"
              : "orders-filter"
          }
          onClick={() =>
            setFilter("PENDIENTES")
          }
        >
          PENDIENTES
        </button>

        <button
          type="button"
          className={
            filter === "COMPLETADAS"
              ? "orders-filter active"
              : "orders-filter"
          }
          onClick={() =>
            setFilter("COMPLETADAS")
          }
        >
          COMPLETADAS
        </button>

        <button
          type="button"
          className={
            filter === "CANCELADAS"
              ? "orders-filter active"
              : "orders-filter"
          }
          onClick={() =>
            setFilter("CANCELADAS")
          }
        >
          CANCELADAS
        </button>

      </section>

      {/* ======================================================
          HISTORIAL
          ====================================================== */}

      <section
        className="
          orders-history
        "
      >

        <div
          className="
            orders-section-title
          "
        >

          <div>
            <span>
              📋
            </span>

            <strong>
              HISTORIAL
            </strong>
          </div>

          <small>
            {filteredOrders.length}{" "}
            {filteredOrders.length === 1
              ? "orden"
              : "órdenes"}
          </small>

        </div>

        {filteredOrders.length === 0 ? (

          <div
            className="
              orders-empty
            "
          >

            <div
              className="
                orders-empty-icon
              "
            >
              📭
            </div>

            <strong>
              NO HAY ÓRDENES
            </strong>

            <p>
              No encontramos órdenes
              en esta categoría.
            </p>

            {filter !== "TODAS" && (
              <button
                type="button"
                onClick={() =>
                  setFilter("TODAS")
                }
              >
                VER TODAS LAS ÓRDENES
              </button>
            )}

          </div>

        ) : (

          <div
            className="
              orders-list
            "
          >

            {filteredOrders.map(
              (order) => (

                <button
                  key={order.id}
                  type="button"
                  className="
                    order-card
                  "
                  onClick={() =>
                    openOrder(order)
                  }
                >

                  {/* ==========================================
                      IMAGEN DEL JUEGO
                      ========================================== */}

                  <div
                    className="
                      order-card-left
                    "
                  >

                    <div
                      className="
                        order-game-icon
                      "
                    >

                      <img
                        src={order.image}
                        alt={order.game}
                        loading="lazy"
                        onError={(event) => {
                          const image =
                            event.currentTarget;

                          if (
                            image.src.endsWith(
                              DEFAULT_GAME_IMAGE
                            )
                          ) {
                            return;
                          }

                          image.src =
                            DEFAULT_GAME_IMAGE;
                        }}
                      />

                    </div>

                    <div
                      className="
                        order-card-info
                      "
                    >

                      <strong>
                        {order.displayProduct ||
                          order.product}
                      </strong>

                      <span>
                        {order.game}
                      </span>

                      <small>
                        ID: {order.playerId}
                      </small>

                      <small>
                        {formatDate(
                          order.createdAt
                        )}
                      </small>

                    </div>

                  </div>

                  {/* ==========================================
                      PRECIO Y ESTADO
                      ========================================== */}

                  <div
                    className="
                      order-card-right
                    "
                  >

                    <strong>
                      ${order.price.toFixed(2)}
                    </strong>

                    <span
                      className={getStatusClass(
                        order.status
                      )}
                    >
                      {getStatusText(
                        order.status
                      )}
                    </span>

                    <span
                      className="
                        order-card-arrow
                      "
                    >
                      ›
                    </span>

                  </div>

                </button>

              )
            )}

          </div>

        )}

      </section>

      {/* ======================================================
          SEGURIDAD
          ====================================================== */}

      <section
        className="
          orders-security
        "
      >

        <div>

          <span>
            🔒
          </span>

          <div>

            <strong>
              TUS ÓRDENES ESTÁN REGISTRADAS
            </strong>

            <p>
              Guarda el número de orden
              para consultar cualquier
              compra.
            </p>

          </div>

        </div>

      </section>

      {/* ======================================================
          PIE DE PÁGINA
          ====================================================== */}

      <footer
        className="
          orders-footer
        "
      >

        <strong>
          🛒TIENDA DE JUEGOS🎮
        </strong>

        <span>
          TU MEJOR OPCIÓN PARA
          RECARGAS GAMING
        </span>

      </footer>

    </main>
  );
                        }
