
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type ManualOrder = {
  id: string;
  user_id: string;
  username?: string | null;
  email?: string | null;
  method: string;
  amount_cup: number;
  exchange_rate: number;
  balance_amount: number;
  confirmation_number?: string | null;
  receipt_url?: string | null;
  receipt_signed_url?: string | null;
  receipt_error?: string | null;
  status: string;
  created_at: string;
  admin_note?: string | null;
  demo_mode?: boolean;
  can_process?: boolean;
};

const STATUS_LABELS: Record<string, string> = {
  pending: "PENDIENTE",
  approved: "APROBADA",
  rejected: "RECHAZADA",
  PENDING: "PENDIENTE",
  APPROVED: "APROBADA",
  REJECTED: "RECHAZADA",
};

export default function ManualOrdersPage() {
  const router = useRouter();

  const [orders, setOrders] = useState<ManualOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("pending");
  const [selected, setSelected] = useState<ManualOrder | null>(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        router.replace("/login");
        return;
      }

      const response = await fetch(
        `/api/admin/manual-orders?status=${encodeURIComponent(filter)}`,
        {
          method: "GET",
          cache: "no-store",
          credentials: "same-origin",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401) {
          router.replace("/login");
        }

        throw new Error(
          result.error || "No se pudieron cargar las solicitudes."
        );
      }

      const loadedOrders: ManualOrder[] = Array.isArray(result.orders)
        ? result.orders
        : [];

      setOrders(loadedOrders);

      setSelected((current) => {
        if (!current) return null;

        return (
          loadedOrders.find((order) => order.id === current.id) || null
        );
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error al cargar las solicitudes."
      );
    } finally {
      setLoading(false);
    }
  }, [filter, router]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const money = (value: number) =>
    Number(value || 0).toLocaleString("es", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    });

  const isTransferDemo = (order: ManualOrder) =>
    order.method === "transferencia_cup" ||
    order.demo_mode === true;

  return (
    <main className="manual-admin">
      <header className="page-header">
        <button
          className="back-button"
          type="button"
          onClick={() => router.push("/home")}
        >
          ← Volver al inicio
        </button>

        <div className="eyebrow">
          STORE GAMING · ADMINISTRACIÓN
        </div>

        <h1>ÓRDENES ADM</h1>

        <p>
          Consulta las solicitudes de SALDO CUP y TRANSFERENCIA CUP
          desde un mismo panel administrativo.
        </p>
      </header>

      <section className="summary">
        <article className="summary-card">
          <span>Solicitudes visibles</span>
          <strong>{orders.length}</strong>
        </article>

        <article className="summary-card">
          <span>Solicitudes pendientes</span>
          <strong>
            {
              orders.filter((o) =>
                ["pending", "PENDING"].includes(o.status)
              ).length
            }
          </strong>
        </article>
      </section>

      <section className="orders-panel">
        <div className="panel-heading">
          <div>
            <h2>Solicitudes de depósitos</h2>
            <p>
              SALDO CUP y TRANSFERENCIA CUP
            </p>
          </div>

          <button
            type="button"
            className="refresh-button"
            onClick={() => void loadOrders()}
            disabled={loading}
          >
            ↻ Actualizar
          </button>
        </div>

        <div className="filters">
          {[
            { value: "pending", label: "Pendientes" },
            { value: "approved", label: "Aprobadas" },
            { value: "rejected", label: "Rechazadas" },
            { value: "all", label: "Todas" },
          ].map((item) => (
            <button
              key={item.value}
              type="button"
              className={
                filter === item.value ? "filter active" : "filter"
              }
              onClick={() => setFilter(item.value)}
              disabled={loading}
            >
              {item.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}

        {loading ? (
          <div className="empty-state">
            <span className="loader" />
            <p>Cargando solicitudes...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">▤</div>
            <h3>No hay solicitudes para mostrar</h3>
            <p>
              Cuando existan solicitudes, aparecerán aquí.
            </p>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map((order) => (
              <article className="order-card" key={order.id}>
                <div className="order-top">
                  <div className="method-group">
                    <span className="order-method">
                      {order.method === "transferencia_cup"
                        ? "TRANSFERENCIA CUP"
                        : order.method === "saldo_cup"
                          ? "SALDO CUP"
                          : order.method}
                    </span>

                    {isTransferDemo(order) && (
                      <span className="demo-badge">
                        MODO DEMOSTRACIÓN
                      </span>
                    )}
                  </div>

                  <span
                    className={`status status-${String(
                      order.status
                    ).toLowerCase()}`}
                  >
                    {STATUS_LABELS[order.status] || order.status}
                  </span>
                </div>

                <div className="order-amount">
                  <strong>{money(order.balance_amount)}</strong>
                  <span>
                    {isTransferDemo(order)
                      ? "importe de referencia · no acreditable"
                      : "balance solicitado"}
                  </span>
                </div>

                <div className="order-details">
                  <div>
                    <span>Importe registrado</span>
                    <strong>{money(order.amount_cup)} CUP</strong>
                  </div>

                  <div>
                    <span>Tasa registrada</span>
                    <strong>{money(order.exchange_rate)} CUP</strong>
                  </div>

                  <div>
                    <span>Número de confirmación</span>
                    <strong>
                      {order.confirmation_number || "No indicado"}
                    </strong>
                  </div>

                  <div>
                    <span>Usuario</span>
                    <strong>
                      {order.email || order.username || order.user_id}
                    </strong>
                  </div>
                </div>

                <div className="order-date">
                  {order.created_at
                    ? new Date(order.created_at).toLocaleString("es")
                    : "Fecha no disponible"}
                </div>

                <button
                  type="button"
                  className="details-button"
                  onClick={() => setSelected(order)}
                >
                  Consultar solicitud →
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      {selected && (
        <div
          className="modal-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setSelected(null);
            }
          }}
        >
          <section
            className="order-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <div className="modal-heading">
              <div>
                <span className="eyebrow">
                  CONSULTA ADMINISTRATIVA
                </span>

                <h2 id="modal-title">
                  Solicitud de depósito
                </h2>
              </div>

              <button
                type="button"
                className="close-button"
                onClick={() => setSelected(null)}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            {isTransferDemo(selected) && (
              <div className="demo-notice">
                <strong>
                  TRANSFERENCIA CUP · MODO DEMOSTRACIÓN
                </strong>

                <p>
                  Esta solicitud es únicamente de prueba.
                  Los importes son datos de referencia y no
                  representan un pago verificado.
                </p>

                <p>
                  No se permite aprobar, rechazar ni acreditar
                  balances mediante esta solicitud.
                </p>
              </div>
            )}

            <div className="receipt-area">
              <p className="receipt-title">
                Información de la solicitud
              </p>

              <p>
                Los datos mostrados proceden del registro
                administrativo. Esta pantalla no verifica pagos.
              </p>
            </div>

            <div className="modal-details">
              <p>
                <span>Usuario:</span>{" "}
                {selected.email ||
                  selected.username ||
                  selected.user_id}
              </p>

              <p>
                <span>Método:</span>{" "}
                {selected.method === "transferencia_cup"
                  ? "TRANSFERENCIA CUP"
                  : selected.method === "saldo_cup"
                    ? "SALDO CUP"
                    : selected.method}
              </p>

              <p>
                <span>Tipo de registro:</span>{" "}
                {isTransferDemo(selected)
                  ? "Demostración"
                  : "Registro administrativo"}
              </p>

              <p>
                <span>CUP registrados:</span>{" "}
                {money(selected.amount_cup)} CUP
              </p>

              <p>
                <span>Tasa registrada:</span>{" "}
                {money(selected.exchange_rate)} CUP por unidad
              </p>

              <p>
                <span>Importe de referencia:</span>{" "}
                {money(selected.balance_amount)}
              </p>

              <p>
                <span>Confirmación:</span>{" "}
                {selected.confirmation_number || "No indicado"}
              </p>

              <p>
                <span>Estado:</span>{" "}
                {STATUS_LABELS[selected.status] || selected.status}
              </p>

              <p>
                <span>Fecha:</span>{" "}
                {selected.created_at
                  ? new Date(selected.created_at).toLocaleString("es")
                  : "No disponible"}
              </p>
            </div>

            {selected.admin_note && (
              <div className="admin-note">
                <strong>Nota administrativa</strong>
                <p>{selected.admin_note}</p>
              </div>
            )}

            <div className="read-only-notice">
              <strong>Panel de consulta</strong>
              <p>
                Esta versión permite consultar los registros.
                No ejecuta aprobaciones, rechazos ni movimientos
                de balance.
              </p>
            </div>

            <button
              type="button"
              className="details-button close-modal-button"
              onClick={() => setSelected(null)}
            >
              Cerrar consulta
            </button>
          </section>
        </div>
      )}

      <style jsx global>{`
        .manual-admin {
          min-height: 100vh;
          padding: 32px;
          color: #f5f5f5;
          background:
            radial-gradient(
              ellipse at top right,
              #3c1018 0%,
              transparent 38%
            ),
            #090909;
          font-family: Arial, Helvetica, sans-serif;
        }

        .manual-admin * {
          box-sizing: border-box;
        }

        .page-header {
          max-width: 1200px;
          margin: 0 auto 28px;
        }

        .back-button,
        .refresh-button {
          color: #fff;
          background: #1a1a1a;
          border: 1px solid #343434;
          border-radius: 10px;
          padding: 11px 15px;
          cursor: pointer;
          margin-bottom: 24px;
        }

        .eyebrow {
          color: #ff515b;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 2px;
        }

        .page-header h1 {
          margin: 10px 0;
          font-size: clamp(28px, 5vw, 44px);
          font-weight: 900;
          letter-spacing: -1px;
        }

        .page-header p,
        .panel-heading p {
          color: #999;
          line-height: 1.6;
        }

        .summary,
        .orders-panel {
          max-width: 1200px;
          margin: 0 auto 22px;
        }

        .summary {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }

        .summary-card,
        .orders-panel,
        .order-card {
          background: #111;
          border: 1px solid #292929;
          border-radius: 16px;
        }

        .summary-card {
          padding: 22px;
        }

        .summary-card span,
        .order-details span {
          display: block;
          color: #999;
          font-size: 12px;
          margin-bottom: 9px;
        }

        .summary-card strong {
          font-size: 30px;
          font-weight: 900;
        }

        .orders-panel {
          padding: 24px;
        }

        .panel-heading,
        .order-top,
        .modal-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
        }

        .panel-heading h2,
        .modal-heading h2 {
          margin: 8px 0;
          font-size: 20px;
        }

        .refresh-button {
          margin: 0;
        }

        .filters {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin: 22px 0;
        }

        .filter {
          padding: 10px 14px;
          color: #bbb;
          background: #181818;
          border: 1px solid #303030;
          border-radius: 9px;
          cursor: pointer;
        }

        .filter.active {
          color: white;
          background: #a91424;
          border-color: #ff3b4d;
        }

        .orders-list {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }

        .order-card {
          padding: 19px;
          min-width: 0;
        }

        .method-group {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
        }

        .order-method {
          color: #ff626b;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 1px;
        }

        .demo-badge {
          display: inline-block;
          padding: 6px 9px;
          color: #ffd36a;
          background: #35280d;
          border: 1px solid #80601d;
          border-radius: 7px;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.5px;
        }

        .status {
          padding: 6px 9px;
          border-radius: 7px;
          font-size: 10px;
          font-weight: 900;
          background: #272727;
        }

        .status-pending {
          color: #ffcf70;
        }

        .status-approved {
          color: #72e6a0;
        }

        .status-rejected {
          color: #ff8282;
        }

        .order-amount {
          margin: 24px 0;
        }

        .order-amount strong {
          display: block;
          font-size: 34px;
          overflow-wrap: anywhere;
        }

        .order-amount span,
        .order-date {
          color: #999;
          font-size: 12px;
        }

        .order-details {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 17px 12px;
        }

        .order-details strong {
          display: block;
          font-size: 13px;
          overflow-wrap: anywhere;
        }

        .order-date {
          margin: 20px 0;
        }

        .details-button {
          width: 100%;
          padding: 12px 15px;
          color: white;
          background: #262626;
          border: 1px solid #3b3b3b;
          border-radius: 9px;
          font-weight: 800;
          cursor: pointer;
        }

        .empty-state {
          text-align: center;
          padding: 52px 15px;
          color: #999;
        }

        .empty-state h3 {
          color: white;
        }

        .empty-icon {
          font-size: 38px;
          color: #ff515b;
        }

        .loader {
          display: inline-block;
          width: 25px;
          height: 25px;
          border: 3px solid #444;
          border-top-color: #ff515b;
          border-radius: 50%;
          animation: manual-spin 0.8s linear infinite;
        }

        @keyframes manual-spin {
          to {
            transform: rotate(360deg);
          }
        }

        .error-message {
          padding: 13px;
          margin: 15px 0;
          color: #ffb3b8;
          background: #381317;
          border: 1px solid #7a2931;
          border-radius: 9px;
          overflow-wrap: anywhere;
        }

        .modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 18px;
          background: rgb(0 0 0 / 80%);
          overflow-y: auto;
        }

        .order-modal {
          width: 100%;
          max-width: 720px;
          max-height: 92vh;
          overflow-y: auto;
          padding: 24px;
          color: white;
          background: #111;
          border: 1px solid #393939;
          border-radius: 16px;
        }

        .close-button {
          width: 36px;
          height: 36px;
          color: white;
          background: #272727;
          border: 0;
          border-radius: 9px;
          font-size: 24px;
          cursor: pointer;
        }

        .demo-notice {
          margin: 18px 0;
          padding: 15px;
          color: #ffda83;
          background: #30240e;
          border: 1px solid #80601d;
          border-radius: 10px;
        }

        .demo-notice strong {
          font-size: 12px;
        }

        .demo-notice p {
          margin-bottom: 0;
          color: #e6d4a8;
          font-size: 13px;
          line-height: 1.5;
        }

        .receipt-area {
          margin: 20px 0;
          padding: 15px;
          background: #191919;
          border-radius: 12px;
        }

        .receipt-area p {
          color: #bbb;
          font-size: 13px;
          line-height: 1.5;
        }

        .receipt-title {
          color: #fff !important;
          font-weight: 800;
        }

        .modal-details {
          margin: 20px 0;
        }

        .modal-details p {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          padding-bottom: 10px;
          border-bottom: 1px solid #292929;
          overflow-wrap: anywhere;
        }

        .modal-details span {
          color: #999;
        }

        .admin-note,
        .read-only-notice {
          margin: 16px 0;
          padding: 14px;
          background: #1a1a1a;
          border: 1px solid #333;
          border-radius: 10px;
        }

        .admin-note strong,
        .read-only-notice strong {
          font-size: 13px;
          color: #ff727b;
        }

        .admin-note p,
        .read-only-notice p {
          color: #bbb;
          font-size: 13px;
          line-height: 1.6;
          margin-bottom: 0;
          overflow-wrap: anywhere;
        }

        .read-only-notice {
          border-color: #55502b;
          background: #211e12;
        }

        .read-only-notice strong {
          color: #ffd36a;
        }

        .close-modal-button {
          margin-top: 12px;
        }

        @media (max-width: 700px) {
          .manual-admin {
            padding: 18px 12px;
          }

          .orders-panel {
            padding: 15px;
          }

          .summary,
          .orders-list {
            grid-template-columns: 1fr;
          }

          .panel-heading {
            align-items: flex-start;
            flex-direction: column;
          }

          .refresh-button {
            width: 100%;
          }

          .order-modal {
            padding: 16px;
          }

          .order-top {
            align-items: flex-start;
            flex-direction: column;
          }
        }
      `}</style>
    </main>
  );
}
