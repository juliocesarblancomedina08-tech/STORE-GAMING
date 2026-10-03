"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

type ClientBalance = {
  id: string;
  email: string;
  balance: number;
};

const ADMIN_EMAIL = "juliocesarblancomedina08@gmail.com";

export default function ClientBalancePage() {
  const router = useRouter();
  const params = useParams();
  const rawId = params.id;
  const userId = Array.isArray(rawId) ? rawId[0] : rawId;

  const [client, setClient] = useState<ClientBalance | null>(null);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const formatBalance = (value: number) =>
    (Number(value) || 0).toFixed(2);

  const loadClient = useCallback(async () => {
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

      if (
        session.user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()
      ) {
        router.replace("/");
        return;
      }

      const response = await fetch("/api/admin/balances", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(
          data.error || "No se pudieron cargar los datos del cliente."
        );
      }

      const balances: ClientBalance[] = Array.isArray(data.balances)
        ? data.balances
        : [];

      const foundClient = balances.find(
        (item) => item.id === userId
      );

      if (!foundClient) {
        setClient(null);
        setError("No se encontró este cliente.");
        return;
      }

      setClient(foundClient);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error al cargar el cliente."
      );
    } finally {
      setLoading(false);
    }
  }, [router, userId]);

  useEffect(() => {
    if (userId) {
      void loadClient();
    }
  }, [userId, loadClient]);

  const adjustBalance = async (action: "ADD" | "SUBTRACT") => {
    setError("");
    setMessage("");

    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Introduce una cantidad válida mayor que 0.");
      return;
    }

    if (!client) {
      setError("No se encontró el cliente.");
      return;
    }

    if (
      action === "SUBTRACT" &&
      numericAmount > Number(client.balance)
    ) {
      setError(
        "El cliente no tiene saldo suficiente para restar esa cantidad."
      );
      return;
    }

    setProcessing(true);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        router.replace("/login");
        return;
      }

      const response = await fetch("/api/admin/balances/adjust", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          userId: client.id,
          amount: numericAmount,
          action,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(
          data.error || "No se pudo actualizar el balance."
        );
      }

      setMessage(
        action === "ADD"
          ? `Se agregaron ${formatBalance(numericAmount)} al balance.`
          : `Se restaron ${formatBalance(numericAmount)} del balance.`
      );

      setAmount("");
      await loadClient();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error al modificar el balance."
      );
    } finally {
      setProcessing(false);
    }
  };

  return (
    <main className="balance-detail-page">
      <style jsx>{`
        .balance-detail-page {
          min-height: 100vh;
          padding: 22px 16px 40px;
          color: #fff;
          background:
            radial-gradient(
              circle at 50% 0%,
              rgba(229, 9, 20, 0.17),
              transparent 40%
            ),
            #080808;
        }

        .container {
          width: 100%;
          max-width: 560px;
          margin: 0 auto;
        }

        .back-button {
          min-height: 44px;
          padding: 11px 17px;
          margin-bottom: 24px;
          border: 1px solid #e50914;
          border-radius: 10px;
          background: #151515;
          color: #fff;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
        }

        .back-button:hover {
          background: #e50914;
        }

        .client-card {
          position: relative;
          overflow: hidden;
          padding: 24px 20px;
          margin-bottom: 22px;
          border: 1px solid #e50914;
          border-radius: 17px;
          background: linear-gradient(
            135deg,
            rgba(229, 9, 20, 0.2),
            #111 58%,
            #0b0b0b
          );
          box-shadow: 0 8px 28px rgba(229, 9, 20, 0.1);
        }

        .client-card::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 4px;
          background: #e50914;
        }

        .card-heading {
          margin: 0 0 23px;
          color: #fff;
          font-size: 21px;
          font-weight: 900;
        }

        .data-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-width: 0;
          margin-bottom: 21px;
        }

        .data-group:last-child {
          margin-bottom: 0;
        }

        .label {
          color: #c7c7c7;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.7px;
          text-transform: uppercase;
        }

        .username {
          color: #fff !important;
          -webkit-text-fill-color: #fff;
          overflow-wrap: anywhere;
          font-size: 16px;
          font-weight: 800;
        }

        .current-balance {
          color: #43f28a;
          font-size: clamp(30px, 7vw, 38px);
          font-weight: 900;
          line-height: 1.2;
          overflow-wrap: anywhere;
        }

        .form-card {
          padding: 22px 18px;
          border: 1px solid #303030;
          border-radius: 16px;
          background: #111;
        }

        .form-heading {
          margin: 0 0 17px;
          color: #fff;
          font-size: 18px;
          font-weight: 900;
        }

        .amount-input {
          display: block;
          width: 100%;
          min-height: 52px;
          padding: 13px 15px;
          margin: 8px 0 17px;
          border: 1px solid #454545;
          border-radius: 10px;
          outline: none;
          background: #080808;
          color: #fff;
          font-size: 18px;
          font-weight: 700;
          box-sizing: border-box;
        }

        .amount-input::placeholder {
          color: #888;
          font-size: 15px;
          font-weight: 500;
        }

        .amount-input:focus {
          border-color: #e50914;
          box-shadow: 0 0 0 2px rgba(229, 9, 20, 0.13);
        }

        .buttons-row {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .action-button {
          min-height: 49px;
          padding: 12px 8px;
          border: 0;
          border-radius: 10px;
          color: #fff;
          font-size: 15px;
          font-weight: 900;
          cursor: pointer;
          transition:
            filter 0.2s ease,
            transform 0.2s ease;
        }

        .action-button:hover {
          filter: brightness(1.12);
        }

        .action-button:active {
          transform: scale(0.98);
        }

        .action-button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .add-button {
          background: #16863d;
          border: 1px solid #39d76a;
        }

        .subtract-button {
          background: #c90019;
          border: 1px solid #ff3446;
        }

        .notice {
          padding: 13px 14px;
          margin-bottom: 15px;
          border: 1px solid;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 700;
          overflow-wrap: anywhere;
        }

        .success {
          border-color: #258a4a;
          background: rgba(22, 134, 61, 0.12);
          color: #61f18b;
        }

        .error {
          border-color: #e50914;
          background: rgba(229, 9, 20, 0.1);
          color: #ff858b;
        }

        .status {
          padding: 20px;
          border: 1px solid #303030;
          border-radius: 12px;
          background: #111;
          color: #ddd;
          text-align: center;
        }

        @media (max-width: 360px) {
          .client-card {
            padding: 22px 15px;
          }

          .form-card {
            padding: 19px 13px;
          }

          .buttons-row {
            gap: 8px;
          }

          .action-button {
            font-size: 14px;
          }
        }
      `}</style>

      <div className="container">
        <button
          type="button"
          className="back-button"
          onClick={() => router.push("/admin/balances")}
        >
          ← Regresar a clientes
        </button>

        {loading ? (
          <div className="status">Cargando datos del cliente...</div>
        ) : client ? (
          <>
            <section className="client-card">
              <h1 className="card-heading">Datos del cliente</h1>

              <div className="data-group">
                <span className="label">Usuario</span>
                <span className="username">
                  {client.email || "Sin correo"}
                </span>
              </div>

              <div className="data-group">
                <span className="label">Balance actual</span>
                <strong className="current-balance">
                  {formatBalance(client.balance)}
                </strong>
              </div>
            </section>

            <section className="form-card">
              <h2 className="form-heading">Modificar balance</h2>

              {error && (
                <div className="notice error" role="alert">
                  {error}
                </div>
              )}

              {message && (
                <div className="notice success" role="status">
                  {message}
                </div>
              )}

              <label className="label" htmlFor="balance-amount">
                Cantidad
              </label>

              <input
                id="balance-amount"
                className="amount-input"
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                placeholder="Escribe la cantidad..."
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                disabled={processing}
              />

              <div className="buttons-row">
                <button
                  type="button"
                  className="action-button add-button"
                  onClick={() => void adjustBalance("ADD")}
                  disabled={processing || loading}
                >
                  {processing ? "Procesando..." : "Agregar +"}
                </button>

                <button
                  type="button"
                  className="action-button subtract-button"
                  onClick={() => void adjustBalance("SUBTRACT")}
                  disabled={processing || loading}
                >
                  {processing ? "Procesando..." : "Restar -"}
                </button>
              </div>
            </section>
          </>
        ) : (
          <div className="status">
            {error || "No se encontró el cliente."}
          </div>
        )}
      </div>
    </main>
  );
    }
