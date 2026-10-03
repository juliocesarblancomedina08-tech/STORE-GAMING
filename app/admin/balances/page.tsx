"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type ClientBalance = {
  id: string;
  email: string | null;
  balance: number | string | null;
};

type BalancesResponse = {
  ok?: boolean;
  error?: string;
  balances?: ClientBalance[];
  totalClients?: number;
  totalBalance?: number;
};

const ADMIN_EMAIL = "juliocesarblancomedina08@gmail.com";

export default function AdminBalancesPage() {
  const router = useRouter();

  const [balances, setBalances] = useState<ClientBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const loadBalances = useCallback(async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

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

      const data: BalancesResponse = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(
          data.error || "No se pudieron cargar los saldos."
        );
      }

      setBalances(data.balances ?? []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error inesperado."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    void loadBalances();
  }, [loadBalances]);

  const filteredBalances = balances.filter((client) => {
    const query = search.trim().toLowerCase();

    if (!query) return true;

    return (
      (client.email ?? "").toLowerCase().includes(query) ||
      client.id.toLowerCase().includes(query)
    );
  });

  const totalBalance = balances.reduce(
    (total, client) => total + Number(client.balance ?? 0),
    0
  );

  const formatMoney = (value: number | string | null | undefined) => {
    const amount = Number(value ?? 0);

    return `$${(Number.isFinite(amount) ? amount : 0).toLocaleString(
      "en-US",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    )}`;
  };

  return (
    <main className="balances-page min-h-screen bg-[#080808] text-white">
      <style jsx global>{`
        .balances-page {
          min-height: 100vh;
          background:
            radial-gradient(
              ellipse at top,
              rgba(237, 28, 36, 0.09),
              transparent 48%
            ),
            #080808;
        }

        .balances-page * {
          box-sizing: border-box;
        }

        .balances-page button,
        .balances-page input {
          touch-action: manipulation;
        }

        .balances-page button {
          -webkit-tap-highlight-color: transparent;
        }

        .balances-page .balance-card {
          background: linear-gradient(145deg, #151515, #101010);
          border: 1px solid rgba(255, 255, 255, 0.075);
          transition:
            border-color 180ms ease,
            background 180ms ease,
            transform 180ms ease;
        }

        .balances-page .balance-card:hover {
          border-color: rgba(237, 28, 36, 0.55);
          background: linear-gradient(145deg, #191111, #101010);
        }

        .balances-page .client-row {
          background: #111;
          border: 1px solid rgba(255, 255, 255, 0.08);
          transition:
            border-color 180ms ease,
            background 180ms ease;
        }

        .balances-page .client-row:hover {
          border-color: rgba(237, 28, 36, 0.65);
          background: #171111;
        }

        .balances-page .balance-search {
          outline: none;
          background: #101010;
          border: 1px solid #292929;
          transition: border-color 180ms ease;
        }

        .balances-page .balance-search:focus {
          border-color: #ed1c24;
        }

        .balances-page .red-button {
          background: #ed1c24;
          transition: background 180ms ease;
        }

        .balances-page .red-button:hover {
          background: #ff3038;
        }

        @media (prefers-reduced-motion: reduce) {
          .balances-page * {
            transition: none !important;
            animation: none !important;
          }
        }
      `}</style>

      {/* Barra superior */}
      <header className="sticky top-0 z-20 border-b border-white/[0.08] bg-[#080808]/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[72px] max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <button
            type="button"
            onClick={() => router.push("/admin")}
            className="flex min-w-0 items-center gap-3 text-left"
            aria-label="Volver al panel de administración"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/10 text-xl">
              🛒
            </span>

            <span className="min-w-0">
              <span className="block truncate text-base font-black tracking-wide sm:text-lg">
                STORE <span className="text-[#ed1c24]">GAMING</span>
              </span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">
                Administración
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => router.push("/admin")}
            className="shrink-0 rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-white/70 transition hover:border-red-500/50 hover:text-white sm:px-4 sm:text-sm"
          >
            ← Panel
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 pb-12 pt-7 sm:px-6 sm:pt-10">
        {/* Encabezado */}
        <section className="mb-7">
          <div className="mb-3 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#ed1c24] shadow-[0_0_12px_rgba(237,28,36,0.7)]" />
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#ed1c24]">
              Panel de control
            </p>
          </div>

          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                Saldos de clientes
              </h1>

              <p className="mt-2 max-w-xl text-sm leading-6 text-white/50 sm:text-base">
                Consulta los balances y selecciona un cliente para
                administrar su crédito.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadBalances(true)}
              disabled={loading || refreshing}
              className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl border border-white/10 bg-[#141414] px-4 py-3 text-sm font-semibold text-white/80 transition hover:border-red-500/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
            >
              <span className={refreshing ? "animate-spin" : ""}>
                ↻
              </span>
              {refreshing ? "Actualizando..." : "Actualizar"}
            </button>
          </div>
        </section>

        {/* Resumen de balances */}
        <section
          aria-label="Resumen de saldos"
          className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          <div className="balance-card relative overflow-hidden rounded-2xl p-5 sm:p-6">
            <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-red-500/[0.07] blur-2xl" />

            <div className="relative flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-white/50">
                  Clientes registrados
                </p>

                <p className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
                  {loading ? "—" : balances.length}
                </p>

                <p className="mt-2 text-xs text-white/35">
                  Usuarios encontrados
                </p>
              </div>

              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 text-2xl">
                👥
              </div>
            </div>
          </div>

          <div className="balance-card relative overflow-hidden rounded-2xl p-5 sm:p-6">
            <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-green-500/[0.06] blur-2xl" />

            <div className="relative flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-white/50">
                  Saldo total de clientes
                </p>

                <p className="mt-3 break-words text-3xl font-black tracking-tight text-[#35d07f] sm:text-4xl">
                  {loading ? "—" : formatMoney(totalBalance)}
                </p>

                <p className="mt-2 text-xs text-white/35">
                  Suma de los balances registrados
                </p>
              </div>

              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-green-500/20 bg-green-500/10 text-2xl">
                💰
              </div>
            </div>
          </div>
        </section>

        {/* Lista de clientes */}
        <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d0d0d]">
          <div className="border-b border-white/[0.07] p-4 sm:p-5">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-lg font-bold">Lista de clientes</h2>
                <p className="mt-1 text-xs text-white/40">
                  Toca una cuenta para gestionar su saldo.
                </p>
              </div>

              <span className="self-start rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-white/60 sm:self-auto">
                {filteredBalances.length}{" "}
                {filteredBalances.length === 1 ? "resultado" : "resultados"}
              </span>
            </div>

            <div className="relative mt-5">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-white/35">
                ⌕
              </span>

              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por correo o ID del cliente..."
                aria-label="Buscar clientes por correo o ID"
                className="balance-search min-h-12 w-full rounded-xl py-3 pl-11 pr-4 text-base text-white placeholder:text-white/30 sm:text-sm"
              />
            </div>
          </div>

          <div className="p-3 sm:p-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-[#ed1c24]" />
                <p className="mt-4 text-sm font-medium text-white/70">
                  Cargando clientes...
                </p>
                <p className="mt-1 text-xs text-white/35">
                  Consultando los saldos registrados
                </p>
              </div>
            ) : error ? (
              <div className="rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-8 text-center">
                <div className="text-3xl">⚠️</div>
                <h3 className="mt-3 font-bold text-red-300">
                  No se pudieron cargar los saldos
                </h3>
                <p className="mx-auto mt-2 max-w-md break-words text-sm text-white/55">
                  {error}
                </p>

                <button
                  type="button"
                  onClick={() => void loadBalances()}
                  className="red-button mt-5 rounded-xl px-5 py-3 text-sm font-bold text-white"
                >
                  Intentar de nuevo
                </button>
              </div>
            ) : filteredBalances.length === 0 ? (
              <div className="px-4 py-14 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-3xl">
                  {search ? "🔎" : "👤"}
                </div>

                <h3 className="mt-4 font-bold">
                  {search
                    ? "No se encontraron resultados"
                    : "Todavía no hay clientes"}
                </h3>

                <p className="mt-2 text-sm text-white/40">
                  {search
                    ? "Prueba con otro correo o ID."
                    : "Los usuarios aparecerán aquí cuando estén registrados."}
                </p>

                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="mt-4 text-sm font-semibold text-[#ed1c24] hover:text-red-300"
                  >
                    Limpiar búsqueda
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredBalances.map((client) => (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() =>
                      router.push(
                        `/admin/balances/${encodeURIComponent(client.id)}`
                      )
                    }
                    className="client-row flex min-h-[92px] w-full items-center gap-3 rounded-xl p-3 text-left sm:gap-4 sm:p-4"
                    aria-label={`Administrar saldo de ${
                      client.email || "cliente"
                    }, balance ${formatMoney(client.balance)}`}
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/[0.08] text-lg font-black text-[#ed1c24] sm:h-12 sm:w-12">
                      {(client.email || "U").charAt(0).toUpperCase()}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block break-all text-sm font-bold text-white sm:text-base">
                        {client.email || "Sin correo"}
                      </span>

                      <span className="mt-1 block break-all text-[10px] text-white/30 sm:text-xs">
                        ID: {client.id}
                      </span>

                      <span className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/40 sm:text-xs">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#35d07f]" />
                        Cliente registrado
                      </span>
                    </span>

                    <span className="shrink-0 text-right">
                      <span className="block text-[10px] font-medium uppercase tracking-wider text-white/40 sm:text-xs">
                        Balance
                      </span>

                      <span className="mt-1 block text-base font-black text-[#35d07f] sm:text-xl">
                        {formatMoney(client.balance)}
                      </span>

                      <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-[#ed1c24] sm:text-xs">
                        Gestionar <span aria-hidden="true">›</span>
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {!loading && !error && balances.length > 0 && (
            <footer className="border-t border-white/[0.07] px-4 py-3 sm:px-5">
              <p className="text-center text-[11px] text-white/30">
                STORE GAMING · Gestión de saldos · Acceso administrativo
              </p>
            </footer>
          )}
        </section>
      </div>
    </main>
  );
                }
