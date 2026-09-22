"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type MovementType =
  | "DEPOSITO"
  | "COMPRA"
  | "REEMBOLSO";

type Movement = {
  id: string;
  type: MovementType;
  title: string;
  description: string;
  amount: number;
  network?: string;
  status: string;
  createdAt?: string;
};

type DepositRow = {
  id: string;
  amount: number | string;
  network: string | null;
  status: string | null;
};

type TopupOrderRow = {
  id: string;
  game: string;
  offer_name: string;
  retail_price: number | string;
  currency: string | null;
  status: string;
  created_at: string;
};

export default function BalanceHistoryPage() {
  const router = useRouter();

  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);

  /*
   * ============================================================
   * CARGAR MOVIMIENTOS
   * ============================================================
   */

  useEffect(() => {
    let mounted = true;

    async function loadMovements() {
      try {
        /*
         * ======================================================
         * SESIÓN
         * ======================================================
         */

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session?.user) {
          if (mounted) {
            router.replace("/");
          }

          return;
        }

        const userId = session.user.id;

        /*
         * ======================================================
         * DEPÓSITOS
         * ======================================================
         *
         * public.deposits
         *
         * Columnas utilizadas:
         * user_id
         * amount
         * network
         * status
         */

        const {
          data: depositsData,
          error: depositsError,
        } = await supabase
          .from("deposits")
          .select(
            `
              id,
              amount,
              network,
              status
            `
          )
          .eq("user_id", userId);

        if (depositsError) {
          console.error(
            "ERROR CARGANDO DEPÓSITOS:",
            depositsError
          );
        }

        /*
         * ======================================================
         * COMPRAS
         * ======================================================
         *
         * topup_orders
         */

        const {
          data: ordersData,
          error: ordersError,
        } = await supabase
          .from("topup_orders")
          .select(
            `
              id,
              game,
              offer_name,
              retail_price,
              currency,
              status,
              created_at
            `
          )
          .eq("user_id", userId)
          .order("created_at", {
            ascending: false,
          });

        if (ordersError) {
          console.error(
            "ERROR CARGANDO COMPRAS:",
            ordersError
          );
        }

        /*
         * ======================================================
         * CONVERTIR DEPÓSITOS
         * ======================================================
         */

        const deposits =
          ((depositsData || []) as DepositRow[]).map(
            (deposit): Movement => ({
              id: `deposit-${deposit.id}`,

              type: "DEPOSITO",

              title: "DEPÓSITO",

              description:
                deposit.network
                  ? `USDT • ${deposit.network}`
                  : "Ingreso de balance",

              amount:
                Number(deposit.amount) || 0,

              network:
                deposit.network || undefined,

              status:
                deposit.status || "PENDING",
            })
          );

        /*
         * ======================================================
         * CONVERTIR COMPRAS
         * ======================================================
         */

        const orders =
          ((ordersData || []) as TopupOrderRow[]).map(
            (order): Movement => {
              const normalizedStatus =
                String(order.status || "")
                  .toUpperCase();

              const isRefunded =
                normalizedStatus ===
                  "REFUNDED" ||
                normalizedStatus ===
                  "CANCELLED" ||
                normalizedStatus ===
                  "CANCELED" ||
                normalizedStatus ===
                  "FAILED";

              return {
                id: `order-${order.id}`,

                type: isRefunded
                  ? "REEMBOLSO"
                  : "COMPRA",

                title: isRefunded
                  ? "REEMBOLSO"
                  : "COMPRA",

                description:
                  `${order.game} • ${order.offer_name}`,

                amount:
                  Number(order.retail_price) || 0,

                status:
                  order.status,

                createdAt:
                  order.created_at,
              };
            }
          );

        /*
         * ======================================================
         * UNIR MOVIMIENTOS
         * ======================================================
         */

        const allMovements = [
          ...deposits,
          ...orders,
        ];

        /*
         * Los depósitos no tienen una fecha incluida
         * en las columnas conocidas actualmente, por lo
         * que solamente ordenamos las compras que sí
         * tienen created_at.
         */

        const sortedMovements =
          allMovements.sort((a, b) => {
            if (
              !a.createdAt &&
              !b.createdAt
            ) {
              return 0;
            }

            if (!a.createdAt) {
              return 1;
            }

            if (!b.createdAt) {
              return -1;
            }

            return (
              new Date(b.createdAt).getTime() -
              new Date(a.createdAt).getTime()
            );
          });

        if (mounted) {
          setMovements(sortedMovements);
          setLoading(false);
        }
      } catch (error) {
        console.error(
          "ERROR INESPERADO CARGANDO HISTORIAL:",
          error
        );

        if (mounted) {
          setMovements([]);
          setLoading(false);
        }
      }
    }

    loadMovements();

    return () => {
      mounted = false;
    };
  }, [router]);

  /*
   * ============================================================
   * FUNCIONES
   * ============================================================
   */

  function formatDate(date?: string) {
    if (!date) {
      return "";
    }

    try {
      return new Date(date).toLocaleString(
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
      return "";
    }
  }

  function getStatusText(status: string) {
    const normalized =
      String(status || "")
        .toUpperCase();

    if (
      normalized === "CONFIRMED" ||
      normalized === "COMPLETED" ||
      normalized === "CONFIRMADO" ||
      normalized === "CONFIRMADA" ||
      normalized === "COMPLETADA"
    ) {
      return "CONFIRMADO";
    }

    if (
      normalized === "REFUNDED"
    ) {
      return "REEMBOLSADO";
    }

    if (
      normalized === "FAILED" ||
      normalized === "CANCELLED" ||
      normalized === "CANCELED"
    ) {
      return "CANCELADO";
    }

    if (
      normalized === "SUPPLIER_PENDING" ||
      normalized === "PROCESSING"
    ) {
      return "PROCESANDO";
    }

    return "PENDIENTE";
  }

  function getStatusClass(status: string) {
    const normalized =
      String(status || "")
        .toUpperCase();

    if (
      normalized === "CONFIRMED" ||
      normalized === "COMPLETED" ||
      normalized === "CONFIRMADO" ||
      normalized === "CONFIRMADA" ||
      normalized === "COMPLETADA"
    ) {
      return "history-status-confirmed";
    }

    if (
      normalized === "REFUNDED"
    ) {
      return "history-status-refunded";
    }

    if (
      normalized === "FAILED" ||
      normalized === "CANCELLED" ||
      normalized === "CANCELED"
    ) {
      return "history-status-cancelled";
    }

    return "history-status-pending";
  }

  /*
   * ============================================================
   * RESUMEN
   * ============================================================
   */

  const totalDeposits = useMemo(() => {
    return movements
      .filter(
        (movement) =>
          movement.type === "DEPOSITO"
      )
      .reduce(
        (sum, movement) =>
          sum + movement.amount,
        0
      );
  }, [movements]);

  const totalPurchases = useMemo(() => {
    return movements
      .filter(
        (movement) =>
          movement.type === "COMPRA"
      )
      .reduce(
        (sum, movement) =>
          sum + movement.amount,
        0
      );
  }, [movements]);

  const totalRefunds = useMemo(() => {
    return movements
      .filter(
        (movement) =>
          movement.type === "REEMBOLSO"
      )
      .reduce(
        (sum, movement) =>
          sum + movement.amount,
        0
      );
  }, [movements]);

  /*
   * ============================================================
   * LOADING
   * ============================================================
   */

  if (loading) {
    return (
      <main className="balance-history-page">

        <div className="balance-history-background" />

        <div className="balance-history-loading">

          <div className="balance-history-loading-logo">
            🛒🎮
          </div>

          <div className="balance-history-spinner" />

          <strong>
            CARGANDO MOVIMIENTOS...
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
   * PÁGINA
   * ============================================================
   */

  return (
    <main className="balance-history-page">

      <div className="balance-history-background" />

      {/* ======================================================
          HEADER
          ====================================================== */}

      <header className="balance-history-header">

        <button
          type="button"
          className="balance-history-back-button"
          onClick={() =>
            router.push("/balance")
          }
          aria-label="Regresar"
        >
          ←
        </button>

        <div className="balance-history-header-title">

          <small>
            STORE GAMING
          </small>

          <h1>
            HISTORIAL DE{" "}
            <span>MOVIMIENTOS</span>
          </h1>

        </div>

        <div className="balance-history-header-icon">
          ▣
        </div>

      </header>

      {/* ======================================================
          RESUMEN
          ====================================================== */}

      <section className="balance-history-summary">

        <div className="balance-history-summary-card">

          <span className="history-summary-icon">
            ↓
          </span>

          <small>
            INGRESOS
          </small>

          <strong>
            +${totalDeposits.toFixed(2)}
          </strong>

        </div>

        <div className="balance-history-summary-card">

          <span className="history-summary-icon">
            ↑
          </span>

          <small>
            COMPRAS
          </small>

          <strong>
            -${totalPurchases.toFixed(2)}
          </strong>

        </div>

        <div className="balance-history-summary-card">

          <span className="history-summary-icon">
            ↩
          </span>

          <small>
            REEMBOLSOS
          </small>

          <strong>
            +${totalRefunds.toFixed(2)}
          </strong>

        </div>

      </section>

      {/* ======================================================
          TÍTULO
          ====================================================== */}

      <section className="balance-history-title-section">

        <div>

          <span>
            ▣
          </span>

          <div>

            <strong>
              TODOS LOS MOVIMIENTOS
            </strong>

            <small>
              Ingresos y descuentos de tu billetera
            </small>

          </div>

        </div>

        <span className="balance-history-count">
          {movements.length}
        </span>

      </section>

      {/* ======================================================
          LISTA
          ====================================================== */}

      <section className="balance-history-list">

        {movements.length === 0 ? (

          <div className="balance-history-empty">

            <div className="balance-history-empty-icon">
              ▣
            </div>

            <strong>
              NO HAY MOVIMIENTOS
            </strong>

            <p>
              Todavía no tienes ingresos ni
              compras registradas.
            </p>

            <button
              type="button"
              onClick={() =>
                router.push("/balance")
              }
            >
              ← VOLVER A LA BILLETERA
            </button>

          </div>

        ) : (

          movements.map((movement) => {

            const isDeposit =
              movement.type ===
              "DEPOSITO";

            const isRefund =
              movement.type ===
              "REEMBOLSO";

            return (
              <article
                key={movement.id}
                className={`balance-movement-card ${
                  isDeposit
                    ? "movement-deposit"
                    : isRefund
                    ? "movement-refund"
                    : "movement-purchase"
                }`}
              >

                {/* ICONO */}

                <div className="balance-movement-icon">

                  {isDeposit ? (
                    <span>↓</span>
                  ) : isRefund ? (
                    <span>↩</span>
                  ) : (
                    <span>↑</span>
                  )}

                </div>

                {/* INFORMACIÓN */}

                <div className="balance-movement-info">

                  <strong>
                    {movement.title}
                  </strong>

                  <span>
                    {movement.description}
                  </span>

                  {movement.network && (
                    <small>
                      RED: {movement.network}
                    </small>
                  )}

                  {movement.createdAt && (
                    <small>
                      {formatDate(
                        movement.createdAt
                      )}
                    </small>
                  )}

                </div>

                {/* MONTO */}

                <div className="balance-movement-right">

                  <strong
                    className={
                      isDeposit ||
                      isRefund
                        ? "movement-positive"
                        : "movement-negative"
                    }
                  >
                    {isDeposit ||
                    isRefund
                      ? "+"
                      : "-"}
                    $
                    {movement.amount.toFixed(
                      2
                    )}
                  </strong>

                  <span
                    className={
                      getStatusClass(
                        movement.status
                      )
                    }
                  >
                    {getStatusText(
                      movement.status
                    )}
                  </span>

                </div>

              </article>
            );
          })

        )}

      </section>

      {/* ======================================================
          INFORMACIÓN
          ====================================================== */}

      <section className="balance-history-security">

        <div className="balance-history-security-icon">
          🛡️
        </div>

        <div>

          <strong>
            MOVIMIENTOS DE TU BILLETERA
          </strong>

          <p>
            Aquí puedes consultar los ingresos
            realizados y los descuentos generados
            por tus compras en STORE GAMING.
          </p>

        </div>

      </section>

      {/* ======================================================
          REGRESAR
          ====================================================== */}

      <button
        type="button"
        className="balance-history-return-button"
        onClick={() =>
          router.push("/balance")
        }
      >
        ← REGRESAR A MI BILLETERA
      </button>

    </main>
  );
      }
