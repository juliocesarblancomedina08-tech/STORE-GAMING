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
};

const ADMIN_EMAIL = "juliocesarblancomedina08@gmail.com";

export default function AdminBalancesPage() {
  const router = useRouter();

  const [balances, setBalances] = useState<ClientBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const loadBalances = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
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
        throw new Error(data.error || "No se pudieron cargar los saldos.");
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

    return (
      !query ||
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

  function openClient(client: ClientBalance) {
    if (!client.id) {
      setError("Este cliente no tiene un ID válido.");
      return;
    }

    router.push(`/admin/balances/${encodeURIComponent(client.id)}`);
  }

  return (
    <main className="admin-balances min-h-screen bg-[#080808] text-white">
      <style jsx global>{`
        .admin-balances {
          background:
            radial-gradient(
              ellipse at top,
              rgba(237, 28, 36, 0.09),
              transparent 48%
            ),
            #080808;
        }

        .admin-balances * {
          box-sizing: border-box;
        }

        .admin-balances button,
        .admin-balances input {
          touch-action: manipulation;
        }

        .admin-balances .summary-card {
          border: 1px solid rgba(255, 255, 255, 0.09);
          background: linear-gradient(145deg, #171717, #101010);
        }

        .admin-balances .client-row {
          display: flex;
          width: 100%;
          align-items: center;
          gap: 14px;
          border: 1px solid #303030;
          border-radius: 15px;
          background: #151515;
          padding: 16px;
          text-align: left;
          color: #ffffff;
          transition:
            border-color 180ms ease,
            background 180ms ease,
            transform 180ms ease;
        }

        .admin-balances .client-row:hover {
          border-color: rgba(237, 28, 36, 0.75);
          background: #1b1212;
        }

        .admin-balances .client-row:focus-visible,
        .admin-balances button:focus-visible {
          outline: 2px solid #ed1c24;
          outline-offset: 3px;
        }

        .admin-balances .client-email {
          color: #ffffff !important;
          opacity: 1 !important;
          -webkit-text-fill-color: #ffffff;
        }

        .admin-balances .client-id {
          color: #c7c7c7;
          overflow-wrap: anywhere;
        }

        .admin-balances .action-button {
          display: inline-flex;
          min-height: 44px;
          align-items: center;
          justify-content: center;
          gap: 9px;
          border-radius: 12px;
          padding: 11px 16px;
          font-size: 13px;
          font-weight: 800;
          transition:
            background 180ms ease,
            border-color 180ms ease,
            transform 180ms ease;
        }

        .admin-balances .refresh-button {
          border: 1px solid rgba(237, 28, 36, 0.5);
          background: linear-gradient(135deg, #3a1012, #1a0b0c);
          color: #ffffff;
        }

        .admin-balances .refresh-button:hover {
          border-color: #ff4249;
          background: #4a1115;
        }

        .admin-balances .back-button {
          border: 1px solid #383838;
          background: linear-gradient(135deg, #242424, #151515);
          color: #ffffff;
        }

        .admin-balances .back-button:hover {
          border-color: #ed1c24;
          background: #211313;
        }

        .admin-balances .search-input {
          border: 1px solid #333333;
          background: #101010;
          color: #ffffff;
          outline: none;
        }

        .admin-balances .search-input::placeholder {
          color: #a3a3a3;
        }

        .admin-balances .search-input:focus {
          border-color: #ed1c24;
        }

        @media (max-width: 420px) {
          .admin-balances .client-row {
            gap: 10px;
            padding: 12px;
          }

          .admin-balances .client-email {
            font-size: 13px;
          }

          .admin-balances .balance-value {
            font-size: 15px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .admin-balances * {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>

      {/* Encabezado */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#080808]/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[76px] max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
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
              <span className="block truncate text-base font-black tracking-wide text-white sm:text-lg">
                STORE <span className="text-[#ed1c24]">GAMING</span>
              </span>
              <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">
                Administración
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => router.push("/admin")}
            className="action-button back-button shrink-0"
          >
            <span aria-hidden="true">←</span>
            <span className="hidden sm:inline">Volver al panel</span>
            <span className="sm:hidden">Panel</span>
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 pb-12 pt-8 sm:px-6 sm:pt-10">
        {/* Título */}
        <section className="mb-7">
          <p className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-[#ff454c]">
            <span className="h-2 w-2 rounded-full bg-[#ed1c24]" />
            Panel de control
          </p>

          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                Saldos de clientes
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-white/65 sm:text-base">
                Selecciona el renglón de un cliente para abrir su cuenta y
                administrar su saldo.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadBalances(true)}
              disabled={loading || refreshing}
              className="action-button refresh-button self-start disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
            >
              <span
                aria-hidden="true"
                className={refreshing ? "animate-spin" : ""}
              >
                ↻
              </span>
              {refreshing ? "Actualizando..." : "Actualizar saldos"}
            </button>
          </div>
        </section>

        {/* Tarjetas de resumen */}
        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="summary-card rounded-2xl p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-white/65">
                  Clientes registrados
                </p>
                <p className="mt-3 text-4xl font-black text-white">
                  {loading ? "—" : balances.length}
                </p>
                <p className="mt-2 text-xs text-white/50">
                  Usuarios encontrados
                </p>
              </div>

              <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-red-500/25 bg-red-500/10 text-2xl">
                👥
              </span>
            </div>
          </div>

          <div className="summary-card rounded-2xl p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white/65">
                  Saldo total
                </p>
                <p className="mt-3 break-words text-3xl font-black text-[#35d07f] sm:text-4xl">
                  {loading ? "—" : formatMoney(totalBalance)}
                </p>
                <p className="mt-2 text-xs text-white/50">
                  Total de los balances registrados
                </p>
              </div>

              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-green-500/25 bg-green-500/10 text-2xl">
                💰
              </span>
            </div>
          </div>
        </section>

        {/* Lista de clientes */}
        <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d0d]">
          <div className="border-b border-white/10 p-4 sm:p-5">
            <h2 className="text-lg font-black text-white">
              Clientes
            </h2>
            <p className="mt-1 text-sm text-white/60">
              Toca cualquier renglón para administrar el balance.
            </p>

            <div className="relative mt-5">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-white/60">
                ⌕
              </span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por correo o ID..."
                aria-label="Buscar clientes"
                className="search-input min-h-12 w-full rounded-xl py-3 pl-11 pr-4 text-base sm:text-sm"
              />
            </div>
          </div>

          <div className="space-y-3 p-3 sm:p-4">
            {loading ? (
              <div className="py-14 text-center">
                <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-[#ed1c24]" />
                <p className="mt-4 text-sm font-semibold text-white">
                  Cargando clientes...
                </p>
              </div>
            ) : error ? (
              <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-5 text-center">
                <p className="font-bold text-red-300">{error}</p>
                <button
                  type="button"
                  onClick={() => void loadBalances()}
                  className="action-button refresh-button mt-4"
                >
                  Intentar de nuevo
                </button>
              </div>
            ) : filteredBalances.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <p className="text-lg font-bold text-white">
                  {search ? "Sin resultados" : "No hay clientes"}
                </p>
                <p className="mt-2 text-sm text-white/60">
                  {search
                    ? "Prueba con otro correo o ID."
                    : "Los clientes aparecerán aquí cuando estén registrados."}
                </p>
              </div>
            ) : (
              filteredBalances.map((client) => (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => openClient(client)}
                  className="client-row"
                  aria-label={`Abrir balance de ${client.email || "cliente"}`}
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/10 text-lg font-black text-white sm:h-12 sm:w-12">
                    {(client.email || "U").charAt(0).toUpperCase()}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="client-email block break-all text-sm font-bold sm:text-base">
                      {client.email || "Sin correo"}
                    </span>

                    <span className="client-id mt-1 block text-[10px] sm:text-xs">
                      ID: {client.id}
                    </span>

                    <span className="mt-2 block text-[10px] font-bold uppercase tracking-wider text-white/65 sm:text-xs">
                      Toca para administrar
                    </span>
                  </span>

                  <span className="shrink-0 text-right">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-white/65 sm:text-xs">
                      Saldo
                    </span>

                    <span className="balance-value mt-1 block text-base font-black text-[#35d07f] sm:text-xl">
                      {formatMoney(client.balance)}
                    </span>

                    <span className="mt-1 block text-xs font-black text-[#ff454c]">
                      Abrir →
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>

          {!loading && !error && balances.length > 0 && (
            <footer className="border-t border-white/10 px-4 py-4 text-center">
              <p className="text-xs font-medium text-white/50">
                Mostrando {filteredBalances.length} de {balances.length} clientes
              </p>
            </footer>
          )}
        </section>
      </div>
    </main>
  );
            }
