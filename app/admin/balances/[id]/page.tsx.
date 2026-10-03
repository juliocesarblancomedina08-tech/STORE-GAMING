"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

type ClientBalance = {
  id: string;
  email: string | null;
  balance: number | string | null;
};

const ADMIN_EMAIL = "juliocesarblancomedina08@gmail.com";

export default function AdminBalanceDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const clientId = params.id;

  const [client, setClient] = useState<ClientBalance | null>(null);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const formatMoney = (value: number | string | null | undefined) => {
    const number = Number(value ?? 0);

    return `$${(Number.isFinite(number) ? number : 0).toLocaleString(
      "en-US",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    )}`;
  };

  const loadClient = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      if (!session?.access_token) {
        router.replace("/login");
        return;
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (user?.email?.toLowerCase() !== ADMIN_EMAIL) {
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
        throw new Error(data.error || "No se pudieron cargar los datos.");
      }

      const selected = (data.balances ?? []).find(
        (item: ClientBalance) => item.id === clientId
      );

      if (!selected) {
        throw new Error("No se encontró el cliente seleccionado.");
      }

      setClient(selected);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error inesperado."
      );
    } finally {
      setLoading(false);
    }
  }, [clientId, router]);

  useEffect(() => {
    void loadClient();
  }, [loadClient]);

  async function adjustBalance(action: "ADD" | "SUBTRACT") {
    setError("");
    setMessage("");

    const value = Number(amount);

    if (!amount.trim() || !Number.isFinite(value) || value <= 0) {
      setError("Introduce un monto válido mayor que cero.");
      return;
    }

    if (Math.round(value * 100) / 100 !== value) {
      setError("El monto debe tener como máximo dos decimales.");
      return;
    }

    if (
      action === "SUBTRACT" &&
      value > Number(client?.balance ?? 0)
    ) {
      setError("El saldo del cliente es insuficiente para esta operación.");
      return;
    }

    const confirmed = window.confirm(
      `${action === "ADD" ? "¿Sumar" : "¿Restar"} ${formatMoney(value)} ${
        action === "ADD" ? "al saldo de" : "del saldo de"
      } ${client?.email || "este cliente"}?`
    );

    if (!confirmed) return;

    setProcessing(true);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      if (!session?.access_token) {
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
          userId: clientId,
          amount: value,
          action,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "No se pudo modificar el saldo.");
      }

      setMessage(
        action === "ADD"
          ? "El saldo se sumó correctamente."
          : "El saldo se restó correctamente."
      );

      setAmount("");

      if (data.client) {
        setClient(data.client);
      } else {
        await loadClient();
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error inesperado."
      );
    } finally {
      setProcessing(false);
    }
  }

  return (
    <main className="balance-detail min-h-screen bg-[#080808] text-white">
      <style jsx global>{`
        .balance-detail {
          background:
            radial-gradient(
              ellipse at top,
              rgba(237, 28, 36, 0.09),
              transparent 48%
            ),
            #080808;
        }

        .balance-detail * {
          box-sizing: border-box;
        }

        .balance-detail button,
        .balance-detail input {
          touch-action: manipulation;
        }

        .balance-detail .detail-panel {
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: linear-gradient(145deg, #151515, #0e0e0e);
        }

        .balance-detail .amount-input {
          border: 1px solid #303030;
          background: #090909;
          outline: none;
        }

        .balance-detail .amount-input:focus {
          border-color: #ed1c24;
        }

        .balance-detail .red-button {
          background: #ed1c24;
          transition: background 180ms ease;
        }

        .balance-detail .red-button:hover {
          background: #ff3038;
        }

        @media (prefers-reduced-motion: reduce) {
          .balance-detail * {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>

      <header className="sticky top-0 z-20 border-b border-white/[0.08] bg-[#080808]/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[72px] max-w-4xl items-center justify-between gap-3 px-4 sm:px-6">
          <button
            type="button"
            onClick={() => router.push("/admin")}
            className="flex items-center gap-3 text-left"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/10 text-xl">
              🛒
            </span>

            <span>
              <span className="block font-black tracking-wide">
                STORE <span className="text-[#ed1c24]">GAMING</span>
              </span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">
                Administración
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => router.push("/admin/balances")}
            className="rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-white/70 hover:border-red-500/50 sm:text-sm"
          >
            ← Clientes
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 pb-12 pt-7 sm:px-6 sm:pt-10">
        <div className="mb-6">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#ed1c24]">
            Gestión de cuenta
          </p>

          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
            Administrar saldo
          </h1>

          <p className="mt-2 text-sm leading-6 text-white/50">
            Consulta el balance del cliente y realiza ajustes desde el panel
            administrativo.
          </p>
        </div>

        {loading ? (
          <div className="detail-panel rounded-2xl p-10 text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-[#ed1c24]" />
            <p className="mt-4 text-sm text-white/60">
              Cargando información del cliente...
            </p>
          </div>
        ) : error && !client ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.06] p-6 text-center">
            <p className="text-lg font-bold text-red-300">
              No se pudo abrir la cuenta
            </p>
            <p className="mt-2 break-words text-sm text-white/60">
              {error}
            </p>
            <button
              type="button"
              onClick={() => void loadClient()}
              className="red-button mt-5 rounded-xl px-5 py-3 text-sm font-bold"
            >
              Intentar de nuevo
            </button>
          </div>
        ) : client ? (
          <>
            <section className="detail-panel relative mb-5 overflow-hidden rounded-2xl p-5 sm:p-6">
              <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-red-500/[0.07] blur-3xl" />

              <div className="relative flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 text-2xl font-black text-[#ed1c24]">
                  {(client.email || "U").charAt(0).toUpperCase()}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
                    Cliente seleccionado
                  </p>

                  <h2 className="mt-2 break-all text-base font-bold sm:text-lg">
                    {client.email || "Sin correo"}
                  </h2>

                  <p className="mt-2 break-all text-[11px] text-white/35">
                    ID: {client.id}
                  </p>
                </div>
              </div>

              <div className="relative mt-7 rounded-xl border border-green-500/15 bg-green-500/[0.05] p-5">
                <p className="text-sm font-medium text-white/50">
                  Saldo actual
                </p>

                <p className="mt-2 break-words text-4xl font-black tracking-tight text-[#35d07f] sm:text-5xl">
                  {formatMoney(client.balance)}
                </p>

                <p className="mt-3 text-xs text-white/35">
                  Balance registrado en la cuenta
                </p>
              </div>
            </section>

            <section className="detail-panel rounded-2xl p-5 sm:p-6">
              <div className="mb-5">
                <h2 className="text-xl font-black">
                  Ajustar balance
                </h2>
                <p className="mt-1 text-sm text-white/45">
                  Introduce el importe que deseas modificar.
                </p>
              </div>

              <label
                htmlFor="balance-amount"
                className="mb-2 block text-sm font-semibold text-white/75"
              >
                Importe en USD
              </label>

              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-white/40">
                  $
                </span>

                <input
                  id="balance-amount"
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="0.00"
                  disabled={processing}
                  className="amount-input min-h-14 w-full rounded-xl py-3 pl-10 pr-4 text-lg font-semibold text-white placeholder:text-white/25 disabled:opacity-50"
                />
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {[1, 5, 10, 20, 50].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    disabled={processing}
                    onClick={() => setAmount(String(preset))}
                    className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-white/65 transition hover:border-red-500/50 hover:text-white disabled:opacity-50"
                  >
                    ${preset}
                  </button>
                ))}
              </div>

              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  disabled={processing || !amount}
                  onClick={() => void adjustBalance("ADD")}
                  className="flex min-h-14 items-center justify-center gap-2 rounded-xl bg-[#169b55] px-4 py-3 font-bold text-white transition hover:bg-[#1bb866] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span className="text-xl">＋</span>
                  {processing ? "Procesando..." : "Sumar saldo"}
                </button>

                <button
                  type="button"
                  disabled={processing || !amount}
                  onClick={() => void adjustBalance("SUBTRACT")}
                  className="flex min-h-14 items-center justify-center gap-2 rounded-xl bg-[#ed1c24] px-4 py-3 font-bold text-white transition hover:bg-[#ff3038] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span className="text-xl">−</span>
                  {processing ? "Procesando..." : "Restar saldo"}
                </button>
              </div>

              {message && (
                <div
                  role="status"
                  className="mt-5 rounded-xl border border-green-500/20 bg-green-500/[0.07] p-4 text-sm text-green-300"
                >
                  ✓ {message}
                </div>
              )}

              {error && (
                <div
                  role="alert"
                  className="mt-5 rounded-xl border border-red-500/20 bg-red-500/[0.07] p-4 text-sm text-red-300"
                >
                  {error}
                </div>
              )}

              <p className="mt-5 text-center text-[11px] leading-5 text-white/30">
                Las operaciones requieren autorización administrativa y
                confirmación antes de aplicarse.
              </p>
            </section>
          </>
        ) : null}

        <footer className="mt-8 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25">
          STORE GAMING · Panel administrativo
        </footer>
      </div>
    </main>
  );
}
