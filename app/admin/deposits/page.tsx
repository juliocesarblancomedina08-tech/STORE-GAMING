"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

type Deposit = {
  id: string;
  user_id: string;
  amount: number;
  network: "BEP20" | "TRC20" | "TON";
  address: string;
  status: "PENDING" | "CONFIRMED" | "REJECTED";
  created_at: string;
};

export default function AdminDepositsPage() {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadDeposits() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        window.location.href = "/";
        return;
      }

      const response = await fetch("/api/admin/deposits", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "No se pudieron cargar los depósitos."
        );
      }

      setDeposits(result.deposits || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDeposits();
  }, []);

  async function processDeposit(
    depositId: string,
    action: "CONFIRM" | "REJECT"
  ) {
    const confirmation =
      action === "CONFIRM"
        ? "¿Confirmar este depósito? El monto será añadido al balance del usuario."
        : "¿Rechazar este depósito?";

    if (!window.confirm(confirmation)) {
      return;
    }

    setProcessing(depositId);
    setError("");
    setMessage("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        window.location.href = "/";
        return;
      }

      const response = await fetch(
        "/api/admin/deposits/action",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            depositId,
            action,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "No se pudo procesar el depósito."
        );
      }

      setMessage(
        action === "CONFIRM"
          ? "Depósito confirmado y balance actualizado correctamente."
          : "Depósito rechazado correctamente."
      );

      await loadDeposits();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error."
      );
    } finally {
      setProcessing(null);
    }
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleString("es-ES", {
      dateStyle: "short",
      timeStyle: "short",
    });
  }

  return (
    <main className="admin-deposits-page">
      <div className="admin-deposits-background" />

      <header className="admin-deposits-header">

        <button
          type="button"
          className="admin-deposits-back"
          onClick={() => {
            window.location.href = "/home";
          }}
        >
          ←
        </button>

        <div>
          <small>
            STORE GAMING
          </small>

          <h1>
            DEPÓSITOS <span>ADMIN</span>
          </h1>
        </div>

        <div className="admin-deposits-icon">
          ₮
        </div>

      </header>

      <section className="admin-deposits-content">

        <div className="admin-deposits-title">

          <div>
            <strong>
              DEPÓSITOS PENDIENTES
            </strong>

            <span>
              Verifica las transferencias antes de acreditar
              el balance.
            </span>
          </div>

          <button
            type="button"
            className="admin-refresh-button"
            onClick={loadDeposits}
            disabled={loading}
          >
            ↻ ACTUALIZAR
          </button>

        </div>

        {message && (
          <div className="admin-success-message">
            ✓ {message}
          </div>
        )}

        {error && (
          <div className="admin-error-message">
            ⚠️ {error}
          </div>
        )}

        {loading ? (
          <div className="admin-deposits-loading">
            <div className="balance-spinner" />
            <p>
              CARGANDO DEPÓSITOS...
            </p>
          </div>
        ) : deposits.length === 0 ? (
          <div className="admin-empty-deposits">
            <div>
              ₮
            </div>

            <strong>
              NO HAY DEPÓSITOS PENDIENTES
            </strong>

            <span>
              Los nuevos depósitos aparecerán aquí.
            </span>
          </div>
        ) : (
          <div className="admin-deposits-list">

            {deposits.map((deposit) => (
              <article
                key={deposit.id}
                className="admin-deposit-card"
              >

                <div className="admin-deposit-card-header">

                  <div>
                    <small>
                      ID DEL DEPÓSITO
                    </small>

                    <strong>
                      {deposit.id}
                    </strong>
                  </div>

                  <span className="admin-pending-badge">
                    ⏳ PENDING
                  </span>

                </div>

                <div className="admin-deposit-amount">
                  <small>
                    MONTO
                  </small>

                  <strong>
                    ${Number(deposit.amount).toFixed(2)}
                  </strong>

                  <span>
                    USD
                  </span>
                </div>

                <div className="admin-deposit-network">

                  <span className="admin-usdt-symbol">
                    ₮
                  </span>

                  <div>
                    <strong>
                      USDT
                    </strong>

                    <span>
                      RED {deposit.network}
                    </span>
                  </div>

                </div>

                <div className="admin-deposit-address">

                  <small>
                    DIRECCIÓN UTILIZADA
                  </small>

                  <p>
                    {deposit.address}
                  </p>

                </div>

                <div className="admin-deposit-user">

                  <small>
                    USUARIO
                  </small>

                  <p>
                    {deposit.user_id}
                  </p>

                </div>

                <div className="admin-deposit-date">

                  <small>
                    FECHA
                  </small>

                  <span>
                    {formatDate(deposit.created_at)}
                  </span>

                </div>

                <div className="admin-deposit-actions">

                  <button
                    type="button"
                    className="admin-confirm-deposit"
                    disabled={processing === deposit.id}
                    onClick={() =>
                      processDeposit(
                        deposit.id,
                        "CONFIRM"
                      )
                    }
                  >
                    {processing === deposit.id
                      ? "PROCESANDO..."
                      : "✓ CONFIRMAR"}
                  </button>

                  <button
                    type="button"
                    className="admin-reject-deposit"
                    disabled={processing === deposit.id}
                    onClick={() =>
                      processDeposit(
                        deposit.id,
                        "REJECT"
                      )
                    }
                  >
                    ✕ RECHAZAR
                  </button>

                </div>

              </article>
            ))}

          </div>
        )}

      </section>
    </main>
  );
        }
