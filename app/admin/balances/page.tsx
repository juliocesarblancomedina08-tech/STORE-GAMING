"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type ClientBalance = {
  id: string;
  email: string | null;
  balance: number | string | null;
};

export default function AdminBalancesPage() {
  const router = useRouter();

  const [balances, setBalances] = useState<ClientBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadBalances() {
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

        const { data: userData } = await supabase.auth.getUser();
        const email = userData.user?.email?.toLowerCase();

        if (email !== "juliocesarblancomedina08@gmail.com") {
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
          throw new Error(data.error || "No se pudieron cargar los saldos.");
        }

        if (active) {
          setBalances(data.balances ?? []);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Ocurrió un error inesperado."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadBalances();

    return () => {
      active = false;
    };
  }, [router]);

  const totalBalance = balances.reduce(
    (total, client) => total + Number(client.balance ?? 0),
    0
  );

  return (
    <main className="min-h-screen bg-[#080808] px-4 py-6 text-white sm:px-6">
      <div className="mx-auto max-w-4xl">
        <button
          type="button"
          onClick={() => router.push("/admin")}
          className="mb-5 rounded-lg border border-white/15 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10"
        >
          ← Volver al panel
        </button>

        <header className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-500">
            Store Gaming
          </p>

          <h1 className="mt-2 text-3xl font-black sm:text-4xl">
            Saldos de clientes
          </h1>

          <p className="mt-2 text-sm text-white/60">
            Consulta los usuarios registrados y administra sus saldos.
          </p>
        </header>

        <section className="mb-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-[#121212] p-5">
            <p className="text-sm text-white/60">Clientes registrados</p>
            <p className="mt-2 text-3xl font-bold">{balances.length}</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#121212] p-5">
            <p className="text-sm text-white/60">Saldo total</p>
            <p className="mt-2 text-3xl font-bold text-green-400">
              ${totalBalance.toFixed(2)}
            </p>
          </div>
        </section>

        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-[#121212] p-8 text-center text-white/60">
            Cargando saldos...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-950/20 p-5 text-red-300">
            {error}
          </div>
        ) : balances.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-[#121212] p-8 text-center text-white/60">
            No hay clientes para mostrar.
          </div>
        ) : (
          <section className="space-y-3">
            {balances.map((client) => (
              <button
                key={client.id}
                type="button"
                onClick={() =>
                  router.push(
                    `/admin/balances/${encodeURIComponent(client.id)}`
                  )
                }
                className="flex w-full items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#121212] p-4 text-left transition hover:border-red-500/60 hover:bg-[#181010] sm:p-5"
              >
                <div className="min-w-0">
                  <p className="break-all font-semibold">
                    {client.email || "Sin correo"}
                  </p>

                  <p className="mt-1 text-xs text-white/40">
                    ID: {client.id}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-xs text-white/50">Saldo</p>
                  <p className="mt-1 font-bold text-green-400">
                    ${Number(client.balance ?? 0).toFixed(2)}
                  </p>
                  <p className="mt-1 text-xs text-red-400">Administrar →</p>
                </div>
              </button>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
