
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
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

type GiftCardOrderRow = {
  id: string;
  user_id: string;
  username: string | null;
  email: string | null;
  game: string;
  category_id: string;
  card_id: string;
  offer_name: string;
  quantity: number;
  retail_price: number | string;
  supplier_price: number | string;
  status: string;
  supplier_order_id: string | null;
  gift_codes: unknown;
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
  canonicalStatus: string;
  statusLabel: string;
  statusIcon: string;
  createdAt: string;
  supplierOrderId?: string;
  currency?: string;
  image: string;
  type: "TOPUP" | "GIFT_CARD";
  quantity?: number;
  giftCodes?: string[];
};

type Filter =
  | "TODAS"
  | "PENDIENTES"
  | "COMPLETADAS"
  | "CANCELADAS";

const GAME_IMAGES: Record<string, string> = {
  blood_strike: "/images/blood-strike.jpg",
  free_fire_latam: "/images/free-fire-latam.jpg",
  free_fire: "/images/free-fire-latam.jpg",
  mobile_legends_united_states: "/images/mobile-legends.jpg",
  mobile_legends: "/images/mobile-legends.jpg",
  delta_force: "/images/delta-force.jpg",
  eafc_mobile_id: "/images/fc-mobile.jpg",
  fc_mobile: "/images/fc-mobile.jpg",
  codm_activision_us: "/images/call-of-duty-mobile.jpg",
  call_of_duty_mobile: "/images/call-of-duty-mobile.jpg",
  call_of_duty: "/images/call-of-duty-mobile.jpg",
  cod_mobile: "/images/call-of-duty-mobile.jpg",
  honor_of_kings: "/images/honor-of-kings.jpg",
  honor_of_kings_global: "/images/honor-of-kings.jpg",
  league_of_legends: "/images/league-of-legends.jpg",
  lol: "/images/league-of-legends.jpg",
  modern_warships: "/images/modern-warships.jpg",
  sausage_man: "/images/sausage-man.jpg",
  arena_breakout: "/images/arena-breakout.jpg",
  arena_breakout_global: "/images/arena-breakout.jpg",
  telegram_stars: "/images/telegram-stars.jpg",
  roblox_global: "/images/gift-cards/gift-roblox-global.jpg",
};

const DEFAULT_GAME_IMAGE = "/images/battle-royale-bg.jpg";

function getGameImage(
  categoryId: string,
  game: string
): string {
  const directImage = GAME_IMAGES[
    String(categoryId || "").toLowerCase()
  ];

  if (directImage) return directImage;

  const normalized = String(game || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (normalized.includes("roblox")) {
    return "/images/gift-cards/gift-roblox-global.jpg";
  }

  if (normalized.includes("blood strike")) {
    return "/images/blood-strike.jpg";
  }

  if (
    normalized.includes("free") &&
    normalized.includes("fire")
  ) {
    return "/images/free-fire-latam.jpg";
  }

  if (normalized.includes("mobile legends")) {
    return "/images/mobile-legends.jpg";
  }

  if (normalized.includes("delta force")) {
    return "/images/delta-force.jpg";
  }

  if (
    normalized.includes("fc mobile") ||
    normalized.includes("eafc mobile") ||
    normalized.includes("ea fc")
  ) {
    return "/images/fc-mobile.jpg";
  }

  if (
    normalized.includes("call of duty") ||
    normalized.includes("cod mobile") ||
    normalized.includes("codm")
  ) {
    return "/images/call-of-duty-mobile.jpg";
  }

  if (normalized.includes("honor of kings")) {
    return "/images/honor-of-kings.jpg";
  }

  if (
    normalized.includes("league of legends") ||
    normalized === "lol"
  ) {
    return "/images/league-of-legends.jpg";
  }

  if (normalized.includes("modern warships")) {
    return "/images/modern-warships.jpg";
  }

  if (normalized.includes("sausage man")) {
    return "/images/sausage-man.jpg";
  }

  if (normalized.includes("arena breakout")) {
    return "/images/arena-breakout.jpg";
  }

  if (
    normalized.includes("telegram") ||
    normalized.includes("stars")
  ) {
    return "/images/telegram-stars.jpg";
  }

  return DEFAULT_GAME_IMAGE;
}

function normalizeStatus(
  status: string | null | undefined
): string {
  return String(status || "PENDING")
    .trim()
    .toUpperCase();
}

function getOrderStatusLabel(
  status: string | null | undefined
): string {
  const normalized = normalizeStatus(status);

  const labels: Record<string, string> = {
    RESERVED: "Procesando",
    PENDING: "Pendiente",
    SUPPLIER_PENDING: "Pendiente",
    PROCESSING: "Procesando",
    CONFIRMED: "Confirmado",
    COMPLETED: "Completado",
    REFUND: "Reembolsado",
    REFUNDED: "Reembolsado",
    FAILED: "Fallido",
    CANCELLED: "Cancelado",
    CANCELED: "Cancelado",
  };

  return (
    labels[normalized] ||
    normalized.replaceAll("_", " ")
  );
}

function getOrderStatusIcon(
  status: string | null | undefined
): string {
  const normalized = normalizeStatus(status);

  const icons: Record<string, string> = {
    RESERVED: "🕜",
    PENDING: "🕜",
    SUPPLIER_PENDING: "🕜",
    PROCESSING: "🔄",
    CONFIRMED: "🔎",
    COMPLETED: "✅",
    REFUND: "💸",
    REFUNDED: "💸",
    FAILED: "❌",
    CANCELLED: "🚫",
    CANCELED: "🚫",
  };

  return icons[normalized] || "🕜";
}

function normalizeGiftCodes(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (typeof item === "string") {
        return item.trim();
      }

      if (item && typeof item === "object") {
        const codeObject = item as Record<string, unknown>;

        const possibleCode =
          codeObject.code ??
          codeObject.gift_code ??
          codeObject.serial ??
          codeObject.key ??
          codeObject.pin;

        if (typeof possibleCode === "string") {
          return possibleCode.trim();
        }
      }

      return "";
    })
    .filter(Boolean);
}

function isGiftCardCompleted(order: Order): boolean {
  return normalizeStatus(order.status) === "COMPLETED";
}

function isGiftCardPending(order: Order): boolean {
  const status = normalizeStatus(order.status);

  return [
    "PENDING",
    "SUPPLIER_PENDING",
    "PROCESSING",
    "RESERVED",
    "CONFIRMED",
  ].includes(status);
}

function isGiftCardCancelledOrFailed(
  order: Order
): boolean {
  return [
    "CANCELLED",
    "CANCELED",
    "FAILED",
    "REFUNDED",
    "REFUND",
  ].includes(normalizeStatus(order.status));
}

function getOrderStatusClass(order: Order): string {
  const status = normalizeStatus(order.status);

  if (status === "COMPLETED") return "status-completed";
  if (status === "REFUNDED" || status === "REFUND") {
    return "status-refunded";
  }
  if (status === "FAILED") return "status-failed";
  if (status === "CANCELLED" || status === "CANCELED") {
    return "status-cancelled";
  }
  if (status === "PROCESSING" || status === "RESERVED") {
    return "status-processing";
  }
  if (status === "CONFIRMED") return "status-confirmed";

  return "status-pending";
}

function getOrderStatusText(order: Order): string {
  return getOrderStatusLabel(order.status).toUpperCase();
}

function isOrderInProgress(order: Order): boolean {
  return isGiftCardPending(order);
}

export default function OrdersPage() {
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<Filter>("TODAS");
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] =
    useState<Order | null>(null);
  const [copiedCode, setCopiedCode] = useState("");
  const [copyError, setCopyError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const loadOrders = useCallback(
    async (refreshSupplierStatuses = false) => {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.user) {
        setLoading(false);
        router.replace("/login");
        return;
      }

      const userId = session.user.id;

      const [
        topupResult,
        giftCardResult,
      ] = await Promise.all([
        supabase
          .from("topup_orders")
          .select(`
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
          `)
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),

        supabase
          .from("gift_card_orders")
          .select(`
            id,
            user_id,
            username,
            email,
            game,
            category_id,
            card_id,
            offer_name,
            quantity,
            retail_price,
            supplier_price,
            status,
            supplier_order_id,
            gift_codes,
            refunded_at,
            completed_at,
            failed_at,
            created_at,
            updated_at
          `)
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
      ]);

      if (topupResult.error) {
        console.error(
          "ERROR CARGANDO RECARGAS:",
          topupResult.error
        );
      }

      if (giftCardResult.error) {
        console.error(
          "ERROR CARGANDO TARJETAS DIGITALES:",
          giftCardResult.error
        );
      }

      /*
       * Consultar el endpoint de estado para las tarjetas
       * pendientes que ya tienen referencia del proveedor.
       * No se vuelve a ejecutar la compra desde aquí.
       */
      if (
        refreshSupplierStatuses &&
        !giftCardResult.error &&
        giftCardResult.data?.length
      ) {
        const pendingRows = (
          giftCardResult.data as GiftCardOrderRow[]
        ).filter((row) => {
          const status = normalizeStatus(row.status);

          return (
            row.supplier_order_id &&
            ["PENDING", "PROCESSING", "SUPPLIER_PENDING"].includes(
              status
            )
          );
        });

        await Promise.allSettled(
          pendingRows.map(async (row) => {
            const response = await fetch(
              `/api/fazercards/giftcards/order/status?id=${encodeURIComponent(
                row.id
              )}`,
              {
                method: "GET",
                headers: {
                  Authorization: `Bearer ${session.access_token}`,
                },
                cache: "no-store",
              }
            );

            if (!response.ok) {
              console.warn(
                "No se pudo actualizar la orden:",
                row.id
              );
            }
          })
        );
      }

      /*
       * Volver a leer las tarjetas después de consultar
       * sus estados para recuperar los códigos confirmados.
       */
      const refreshedGiftResult =
        refreshSupplierStatuses &&
        !giftCardResult.error &&
        giftCardResult.data?.length
          ? await supabase
              .from("gift_card_orders")
              .select(`
                id,
                user_id,
                username,
                email,
                game,
                category_id,
                card_id,
                offer_name,
                quantity,
                retail_price,
                supplier_price,
                status,
                supplier_order_id,
                gift_codes,
                refunded_at,
                completed_at,
                failed_at,
                created_at,
                updated_at
              `)
              .eq("user_id", userId)
              .order("created_at", { ascending: false })
          : giftCardResult;

      const topupRows = (
        (topupResult.data || []) as TopupOrderRow[]
      ).map((row): Order => {
        const fields = row.supplier_fields || {};

        const serverIdValue =
          fields.server_id ??
          fields.id_servidor ??
          fields.serverId;

        const status = normalizeStatus(row.status);

        return {
          id: row.id,
          user_id: row.user_id,
          email: row.email || undefined,
          username: row.username || undefined,
          game: row.game,
          categoryId: row.category_id,
          product: row.offer_name,
          displayProduct: row.offer_name,
          price: Number(row.retail_price) || 0,
          total: Number(row.retail_price) || 0,
          playerId: row.player_id || "—",
          serverId:
            serverIdValue !== undefined &&
            serverIdValue !== null
              ? String(serverIdValue)
              : undefined,
          status,
          canonicalStatus: status,
          statusLabel: getOrderStatusLabel(status),
          statusIcon: getOrderStatusIcon(status),
          createdAt: row.created_at,
          supplierOrderId:
            row.supplier_order_id || undefined,
          currency: row.currency || "USD",
          image: getGameImage(row.category_id, row.game),
          type: "TOPUP",
          quantity: 1,
        };
      });

      const giftCardRows = (
        (refreshedGiftResult.data ||
          []) as GiftCardOrderRow[]
      ).map((row): Order => {
        const status = normalizeStatus(row.status);
        const quantity = Math.max(
          1,
          Number(row.quantity) || 1
        );
        const total = Number(row.retail_price) || 0;

        return {
          id: row.id,
          user_id: row.user_id,
          email: row.email || undefined,
          username: row.username || undefined,
          game: row.game || "ROBLOX (GLOBAL)",
          categoryId: row.category_id,
          product: row.offer_name,
          displayProduct:
            `${row.offer_name} × ${quantity}`,
          price: total,
          total,
          playerId: "No requiere ID de jugador",
          status,
          canonicalStatus: status,
          statusLabel: getOrderStatusLabel(status),
          statusIcon: getOrderStatusIcon(status),
          createdAt: row.created_at,
          supplierOrderId:
            row.supplier_order_id || undefined,
          currency: "USD",
          image: getGameImage(
            row.category_id,
            row.game || "ROBLOX GLOBAL"
          ),
          type: "GIFT_CARD",
          quantity,
          giftCodes: normalizeGiftCodes(row.gift_codes),
        };
      });

      const combinedOrders = [
        ...topupRows,
        ...giftCardRows,
      ].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime()
      );

      setOrders(combinedOrders);

      setSelectedOrder((current) => {
        if (!current) return null;

        return (
          combinedOrders.find(
            (order) => order.id === current.id
          ) || current
        );
      });

      setLoading(false);
    },
    [router]
  );

  useEffect(() => {
    let mounted = true;
    let loadingOrders = false;

    const runLoad = async (refresh = false) => {
      if (!mounted || loadingOrders) return;

      loadingOrders = true;

      try {
        await loadOrders(refresh);
      } catch (error) {
        console.error(
          "ERROR INESPERADO CARGANDO ÓRDENES:",
          error
        );

        if (mounted) setLoading(false);
      } finally {
        loadingOrders = false;
      }
    };

    void runLoad(true);

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void runLoad(true);
      }
    }, 20000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void runLoad(true);
      }
    };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    return () => {
      mounted = false;
      window.clearInterval(intervalId);
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
    };
  }, [loadOrders]);

  const refreshOrders = async () => {
    setRefreshing(true);

    try {
      await loadOrders(true);
    } catch (error) {
      console.error("Error actualizando órdenes:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const copyGiftCode = async (code: string) => {
    setCopyError("");

    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);

      window.setTimeout(() => {
        setCopiedCode((current) =>
          current === code ? "" : current
        );
      }, 2000);
    } catch {
      setCopyError(
        "No se pudo copiar automáticamente. Mantén pulsado el código para copiarlo."
      );
    }
  };

  const filteredOrders = useMemo(() => {
    if (filter === "TODAS") return orders;

    if (filter === "PENDIENTES") {
      return orders.filter(isGiftCardPending);
    }

    if (filter === "COMPLETADAS") {
      return orders.filter(isGiftCardCompleted);
    }

    return orders.filter(isGiftCardCancelledOrFailed);
  }, [orders, filter]);

  const totalOrders = orders.length;

  const totalAmount = orders.reduce(
    (sum, order) =>
      sum +
      (Number(order.total) || Number(order.price) || 0),
    0
  );

  const completedOrders = orders.filter(
    isGiftCardCompleted
  ).length;

  const pendingOrders = orders.filter(
    isGiftCardPending
  ).length;

  const cancelledOrders = orders.filter(
    isGiftCardCancelledOrFailed
  ).length;

  function formatDate(date: string) {
    try {
      return new Date(date).toLocaleString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return date;
    }
  }

  function openOrder(order: Order) {
    setSelectedOrder(order);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function closeOrder() {
    setSelectedOrder(null);
    setCopyError("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  if (loading) {
    return (
      <main className="orders-page">
        <div className="orders-loading">
          <div className="orders-loading-spinner">⏳</div>
          <strong>CARGANDO TUS ÓRDENES...</strong>
          <span>Un momento por favor</span>
        </div>
      </main>
    );
  }

  if (selectedOrder) {
    return (
      <main className="orders-page order-detail-page">
        <section className="order-detail-screen">
          <header className="order-detail-screen-header">
            <button
              type="button"
              className="order-detail-back"
              onClick={closeOrder}
              aria-label="Regresar al historial"
            >
              ←
            </button>

            <div className="order-detail-game-image">
              <img
                src={selectedOrder.image}
                alt={selectedOrder.game}
                onError={(event) => {
                  const image = event.currentTarget;

                  if (
                    image.src.endsWith(DEFAULT_GAME_IMAGE)
                  ) {
                    return;
                  }

                  image.src = DEFAULT_GAME_IMAGE;
                }}
              />
            </div>

            <div className="order-detail-heading">
              <strong>DETALLES DE LA COMPRA</strong>
              <span>ORDEN #{selectedOrder.id}</span>
            </div>
          </header>

          <div className="order-detail-hero">
            <div className="order-detail-status">
              <span
                className={`order-status ${getOrderStatusClass(
                  selectedOrder
                )}`}
              >
                <span aria-hidden="true">
                  {getOrderStatusIcon(selectedOrder.status)}
                </span>

                <span>
                  {getOrderStatusText(selectedOrder)}
                </span>
              </span>
            </div>

            <div className="order-detail-content">
              <div className="order-detail-row">
                <span>🎮 Producto</span>
                <strong>
                  {selectedOrder.displayProduct ||
                    selectedOrder.product}
                </strong>
              </div>

              <div className="order-detail-row">
                <span>📦 Tipo de pedido</span>
                <strong>
                  {selectedOrder.type === "GIFT_CARD"
                    ? "Tarjeta digital"
                    : "Recarga de juego"}
                </strong>
              </div>

              {selectedOrder.type === "TOPUP" && (
                <div className="order-detail-row">
                  <span>🆔 ID del jugador</span>
                  <strong>{selectedOrder.playerId}</strong>
                </div>
              )}

              {selectedOrder.serverId && (
                <div className="order-detail-row">
                  <span>🌐 ID del servidor</span>
                  <strong>{selectedOrder.serverId}</strong>
                </div>
              )}

              {selectedOrder.type === "GIFT_CARD" && (
                <div className="order-detail-row">
                  <span>🔢 Cantidad</span>
                  <strong>
                    {selectedOrder.quantity || 1}
                  </strong>
                </div>
              )}

              <div className="order-detail-row">
                <span>💵 Total</span>
                <strong>
                  $
                  {(
                    selectedOrder.total ??
                    selectedOrder.price
                  ).toFixed(2)}{" "}
                  {selectedOrder.currency || "USD"}
                </strong>
              </div>

              <div className="order-detail-row">
                <span>📅 Fecha</span>
                <strong>
                  {formatDate(selectedOrder.createdAt)}
                </strong>
              </div>

              <div className="order-detail-row">
                <span>🔢 Número de orden</span>
                <strong className="order-id-value">
                  {selectedOrder.id}
                </strong>
              </div>

              {selectedOrder.supplierOrderId && (
                <div className="order-detail-row">
                  <span>⚙️ Referencia del proveedor</span>
                  <strong>
                    {selectedOrder.supplierOrderId}
                  </strong>
                </div>
              )}
            </div>
          </div>

          {selectedOrder.type === "GIFT_CARD" && (
            <section className="gift-codes-panel">
              <div className="gift-codes-heading">
                <span>🎁</span>
                <div>
                  <strong>CÓDIGOS DIGITALES</strong>
                  <p>
                    Los códigos aparecen cuando el proveedor
                    confirma su entrega.
                  </p>
                </div>
              </div>

              {selectedOrder.giftCodes &&
              selectedOrder.giftCodes.length > 0 ? (
                <div className="gift-codes-list">
                  {selectedOrder.giftCodes.map(
                    (code, index) => (
                      <div
                        className="gift-code-item"
                        key={`${selectedOrder.id}-${index}`}
                      >
                        <div>
                          <small>
                            CÓDIGO {index + 1}
                          </small>

                          <code>{code}</code>
                        </div>

                        <button
                          type="button"
                          onClick={() => void copyGiftCode(code)}
                        >
                          {copiedCode === code
                            ? "COPIADO ✓"
                            : "COPIAR"}
                        </button>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <div className="gift-codes-pending">
                  {isGiftCardCompleted(selectedOrder)
                    ? "La orden figura completada, pero todavía no hay códigos guardados. Contacta con soporte para verificar la entrega."
                    : normalizeStatus(selectedOrder.status) ===
                        "REFUNDED"
                      ? "Esta orden fue reembolsada. No hay códigos disponibles."
                      : "Todavía no hay códigos confirmados. Actualiza el estado de la orden en unos momentos."}
                </div>
              )}

              {copyError && (
                <p className="gift-code-copy-error">
                  {copyError}
                </p>
              )}

              <button
                type="button"
                className="gift-codes-refresh"
                onClick={() => void refreshOrders()}
                disabled={refreshing}
              >
                {refreshing
                  ? "CONSULTANDO..."
                  : "↻ ACTUALIZAR ESTADO"}
              </button>
            </section>
          )}

          <button
            type="button"
            className="order-detail-return"
            onClick={closeOrder}
          >
            ← REGRESAR A MIS ÓRDENES
          </button>
        </section>

        <style jsx>{`
          .gift-codes-panel {
            margin-top: 18px;
            padding: 16px;
            border: 1px solid rgba(255, 38, 56, 0.3);
            border-radius: 14px;
            background: rgba(0, 0, 0, 0.72);
          }

          .gift-codes-heading {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 14px;
          }

          .gift-codes-heading > span {
            font-size: 24px;
          }

          .gift-codes-heading strong {
            color: #ff4655;
            font-size: 13px;
            font-weight: 900;
          }

          .gift-codes-heading p {
            margin: 4px 0 0;
            color: #aaa;
            font-size: 11px;
            line-height: 1.5;
          }

          .gift-codes-list {
            display: flex;
            flex-direction: column;
            gap: 10px;
          }

          .gift-code-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            padding: 12px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            background: rgba(255, 255, 255, 0.04);
          }

          .gift-code-item > div {
            min-width: 0;
          }

          .gift-code-item small {
            display: block;
            margin-bottom: 6px;
            color: #999;
            font-size: 9px;
            font-weight: 800;
          }

          .gift-code-item code {
            display: block;
            color: #fff;
            font-size: 12px;
            overflow-wrap: anywhere;
            user-select: text;
          }

          .gift-code-item button,
          .gift-codes-refresh {
            padding: 10px 12px;
            border: 1px solid rgba(255, 38, 56, 0.4);
            border-radius: 8px;
            background: rgba(255, 38, 56, 0.1);
            color: #ff4655;
            font-size: 10px;
            font-weight: 900;
            cursor: pointer;
          }

          .gift-code-item button {
            flex-shrink: 0;
          }

          .gift-codes-pending {
            padding: 13px;
            border-radius: 9px;
            background: rgba(255, 255, 255, 0.04);
            color: #ccc;
            font-size: 12px;
            line-height: 1.6;
          }

          .gift-code-copy-error {
            color: #ff6976;
            font-size: 11px;
            line-height: 1.5;
          }

          .gift-codes-refresh {
            width: 100%;
            margin-top: 12px;
          }

          .gift-codes-refresh:disabled {
            opacity: 0.5;
            cursor: wait;
          }

          @media (max-width: 380px) {
            .gift-code-item {
              align-items: flex-start;
              flex-direction: column;
            }
          }
        `}</style>
      </main>
    );
  }

  return (
    <main className="orders-page">
      <header className="orders-header">
        <button
          type="button"
          className="orders-back-button"
          onClick={() => router.back()}
          aria-label="Volver"
        >
          ←
        </button>

        <div className="orders-header-title">
          <span>🛒</span>
          <strong>MIS ÓRDENES</strong>
        </div>

        <div className="orders-header-space" />
      </header>

      <section className="orders-hero">
        <div className="orders-hero-glow" />

        <div className="orders-hero-content">
          <span className="orders-hero-label">
            STORE GAMING
          </span>

          <h1>
            HISTORIAL
            <strong>DE ÓRDENES</strong>
          </h1>

          <p>
            Consulta tus compras, productos y el estado
            de cada pedido.
          </p>
        </div>

        <div className="orders-total-box">
          <span>PEDIDOS</span>
          <strong>{totalOrders}</strong>
          <small>REGISTRADOS</small>
        </div>
      </section>

      <section className="orders-stats">
        <div className="orders-stat-card">
          <span className="orders-stat-icon">📦</span>
          <strong>{totalOrders}</strong>
          <small>PEDIDOS</small>
        </div>

        <div className="orders-stat-card">
          <span className="orders-stat-icon">💵</span>
          <strong>${totalAmount.toFixed(2)}</strong>
          <small>TOTAL</small>
        </div>

        <div className="orders-stat-card">
          <span className="orders-stat-icon">✅</span>
          <strong>{completedOrders}</strong>
          <small>COMPLETADOS</small>
        </div>

        <div className="orders-stat-card">
          <span className="orders-stat-icon">❌</span>
          <strong>{cancelledOrders}</strong>
          <small>CANCELADOS</small>
        </div>

        <div className="orders-stat-card">
          <span className="orders-stat-icon">⏳</span>
          <strong>{pendingOrders}</strong>
          <small>PENDIENTES</small>
        </div>
      </section>

      <section className="orders-filters">
        {(
          [
            "TODAS",
            "PENDIENTES",
            "COMPLETADAS",
            "CANCELADAS",
          ] as Filter[]
        ).map((item) => (
          <button
            key={item}
            type="button"
            className={
              filter === item
                ? "orders-filter active"
                : "orders-filter"
            }
            onClick={() => setFilter(item)}
          >
            {item}
          </button>
        ))}
      </section>

      <section className="orders-history">
        <div className="orders-section-title">
          <div>
            <span>📋</span>
            <strong>HISTORIAL</strong>
          </div>

          <small>
            {filteredOrders.length}{" "}
            {filteredOrders.length === 1
              ? "orden"
              : "órdenes"}
          </small>
        </div>

        <div className="orders-refresh-row">
          <span>
            Se actualizan los estados de las tarjetas pendientes.
          </span>

          <button
            type="button"
            onClick={() => void refreshOrders()}
            disabled={refreshing}
          >
            {refreshing ? "ACTUALIZANDO..." : "↻ ACTUALIZAR"}
          </button>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="orders-empty">
            <div className="orders-empty-icon">📭</div>
            <strong>NO HAY ÓRDENES</strong>
            <p>
              No encontramos órdenes en esta categoría.
            </p>

            {filter !== "TODAS" && (
              <button
                type="button"
                onClick={() => setFilter("TODAS")}
              >
                VER TODAS LAS ÓRDENES
              </button>
            )}
          </div>
        ) : (
          <div className="orders-list">
            {filteredOrders.map((order) => (
              <button
                key={`${order.type}-${order.id}`}
                type="button"
                className="order-card"
                onClick={() => openOrder(order)}
              >
                <div className="order-card-left">
                  <div className="order-game-icon">
                    <img
                      src={order.image}
                      alt={order.game}
                      loading="lazy"
                      onError={(event) => {
                        const image = event.currentTarget;

                        if (
                          image.src.endsWith(DEFAULT_GAME_IMAGE)
                        ) {
                          return;
                        }

                        image.src = DEFAULT_GAME_IMAGE;
                      }}
                    />
                  </div>

                  <div className="order-card-info">
                    <strong>
                      {order.displayProduct || order.product}
                    </strong>

                    <span>{order.game}</span>

                    {order.type === "GIFT_CARD" ? (
                      <small>TARJETA DIGITAL</small>
                    ) : (
                      <small>ID: {order.playerId}</small>
                    )}

                    <small>{formatDate(order.createdAt)}</small>

                    {order.type === "GIFT_CARD" &&
                      order.giftCodes &&
                      order.giftCodes.length > 0 && (
                        <small className="orders-code-available">
                          🎁 CÓDIGO DISPONIBLE
                        </small>
                      )}
                  </div>
                </div>

                <div className="order-card-right">
                  <strong>
                    ${(order.total ?? order.price).toFixed(2)}
                  </strong>

                  <span
                    className={`order-status ${getOrderStatusClass(
                      order
                    )}`}
                  >
                    <span aria-hidden="true">
                      {getOrderStatusIcon(order.status)}
                    </span>

                    <span>{getOrderStatusText(order)}</span>
                  </span>

                  <span className="order-card-arrow">›</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="orders-security">
        <div>
          <span>🔒</span>

          <div>
            <strong>TUS ÓRDENES ESTÁN REGISTRADAS</strong>

            <p>
              Guarda el número de orden para consultar
              cualquier compra. Los códigos digitales solo
              aparecen cuando han sido guardados por el servidor.
            </p>
          </div>
        </div>
      </section>

      <footer className="orders-footer">
        <strong>🛒 TIENDA DE JUEGOS 🎮</strong>
        <span>
          TU MEJOR OPCIÓN PARA RECARGAS GAMING
        </span>
      </footer>

      <style jsx>{`
        .orders-refresh-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin: 10px 0 14px;
          color: #aaa;
          font-size: 11px;
        }

        .orders-refresh-row button {
          flex-shrink: 0;
          padding: 8px 10px;
          border: 1px solid rgba(255, 38, 56, 0.4);
          border-radius: 8px;
          background: rgba(255, 38, 56, 0.08);
          color: #ff4655;
          font-size: 10px;
          font-weight: 900;
          cursor: pointer;
        }

        .orders-refresh-row button:disabled {
          opacity: 0.5;
          cursor: wait;
        }

        .orders-code-available {
          color: #32d997 !important;
          font-weight: 900;
        }

        .orders-page .order-status.status-pending {
          color: #ffbf36 !important;
        }

        @media (max-width: 380px) {
          .orders-refresh-row {
            align-items: flex-start;
            flex-direction: column;
          }
        }
      `}</style>
    </main>
  );
}
