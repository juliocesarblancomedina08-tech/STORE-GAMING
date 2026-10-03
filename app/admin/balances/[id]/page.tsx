
"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

const ADMIN_EMAIL = "juliocesarblancomedina08@gmail.com";

type Client = {
  id: string;
  email: string | null;
  balance: number | string;
};

type ApiResponse = {
  ok?: boolean;
  error?: string;
  message?: string;
  balances?: Client[];
  client?: {
    id: string;
    balance: number | string;
  };
  transaction?: {
    amount: number | string;
    balanceBefore: number | string;
    balanceAfter: number | string;
  };
};

function formatBalance(value: number | string | null | undefined) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number.toFixed(4) : "0.0000";
}

async function readResponse(response: Response): Promise<ApiResponse> {
  const text = await response.text();

  let data: ApiResponse;

  try {
    data = JSON.parse(text) as ApiResponse;
  } catch {
    console.error(
      "Respuesta no JSON de la API:",
      response.status,
      text.slice(0, 500)
    );

    throw new Error(
      `El servidor devolvió una respuesta inesperada (HTTP ${response.status}). Comprueba el despliegue de Vercel y la ruta de la API.`
    );
  }

  if (!response.ok || data.ok === false) {
    throw new Error(data.error || data.message || "No se pudo completar la operación.");
  }

  return data;
}

export default function AdminBalanceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const clientId = params.id;

  const [client, setClient] = useState<Client | null>(null);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");

  const loadClient = useCallback(async () => {
    setLoading(true);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        router.replace("/login");
        return;
      }

      if (session.user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
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

      const data = await readResponse(response);
      const found = data.balances?.find((item) => item.id === clientId);

      if (!found) {
        setClient(null);
        setMessage("No se encontró el usuario seleccionado.");
        setMessageType("error");
        return;
      }

      setClient(found);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo cargar la información del usuario."
      );
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  }, [clientId, router]);

  useEffect(() => {
    if (clientId) {
      void loadClient();
    }
  }, [clientId, loadClient]);

  async function adjustBalance(action: "ADD" | "SUBTRACT") {
    if (processing) return;

    const normalizedAmount = amount.trim();

    if (!/^\d+(?:\.\d{1,4})?$/.test(normalizedAmount)) {
      setMessage("Introduce una cantidad positiva con un máximo de 4 decimales. Ejemplo: 0.1234");
      setMessageType("error");
      return;
    }

    if (!Number.isFinite(Number(normalizedAmount)) || Number(normalizedAmount) <= 0) {
      setMessage("La cantidad debe ser mayor que cero.");
      setMessageType("error");
      return;
    }

    const confirmed = window.confirm(
      `${action === "ADD" ? "Agregar" : "Restar"} ${normalizedAmount} ${
        action === "ADD" ? "al saldo de" : "del saldo de"
      } ${client?.email || "este usuario"}?`
    );

    if (!confirmed) return;

    setProcessing(true);
    setMessage("");
    setMessageType("");

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error("Tu sesión ha caducado. Inicia sesión nuevamente.");
      }

      const response = await fetch("/api/admin/balances/adjust", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          userId: clientId,
          amount: normalizedAmount,
          action,
        }),
      });

      const data = await readResponse(response);

      setMessage(
        data.message ||
          (action === "ADD"
            ? "Saldo agregado correctamente."
            : "Saldo restado correctamente.")
      );
      setMessageType("success");
      setAmount("");

      // Actualizar el saldo mostrado con el resultado confirmado por el servidor.
      if (data.client) {
        setClient((previous) =>
          previous
            ? { ...previous, balance: data.client!.balance }
            : previous
        );
      } else {
        await loadClient();
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Ocurrió un error al ajustar el saldo."
      );
      setMessageType("error");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#080808] px-4 py-8 text-white">
      <div className="mx-auto max-w-xl">
        <button
          type="button"
          onClick={() => router.push("/admin/balances")}
          className="mb-6 rounded-lg border border-white/15 px-4 py-2 text-sm text-gray-300 transition hover:bg-white/10"
        >
          ← Volver a los saldos
        </button>

        <section className="rounded-2xl border border-red-600/30 bg-[#111111] p-5 shadow-xl sm:p-7">
          <h1 className="text-2xl font-bold">
            Administrar <span className="text-red-500">saldo</span>
          </h1>

          <p className="mt-2 text-sm text-gray-400">
            Agrega o resta saldo al usuario seleccionado.
          </p>

          {loading ? (
            <p className="mt-8 text-gray-300">Cargando usuario...</p>
          ) : client ? (
            <>
              <div className="mt-6 rounded-xl border border-white/10 bg-black/40 p-4">
                <p className="text-xs uppercase tracking-wider text-gray-500">
                  Correo del usuario
                </p>
                <p className="mt-1 break-all font-medium">
                  {client.email || "Sin correo"}
                </p>

                <p className="mt-5 text-xs uppercase tracking-wider text-gray-500">
                  Saldo actual
                </p>
                <p className="mt-1 text-3xl font-bold text-green-400">
                  ${formatBalance(client.balance)}
                </p>
              </div>

              <div className="mt-6">
                <label
                  htmlFor="amount"
                  className="mb-2 block text-sm font-medium text-gray-300"
                >
                  Cantidad a ajustar
                </label>

                <input
                  id="amount"
                  type="number"
                  min="0.0001"
                  step="0.0001"
                  inputMode="decimal"
                  placeholder="Ej.: 0.1234"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  disabled={processing}
                  className="w-full rounded-xl border border-white/15 bg-black px-4 py-3 text-white outline-none transition placeholder:text-gray-600 focus:border-red-500 disabled:opacity-50"
                />

                <p className="mt-2 text-xs text-gray-500">
                  Se permiten hasta 4 decimales. Ejemplo: 1.2345.
                </p>
              </div>

              {message && (
                <div
                  role="status"
                  className={`mt-5 rounded-xl border p-3 text-sm ${
                    messageType === "success"
                      ? "border-green-500/30 bg-green-500/10 text-green-300"
                      : "border-red-500/30 bg-red-500/10 text-red-300"
                  }`}
                >
                  {message}
                </div>
              )}

              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => void adjustBalance("ADD")}
                  disabled={processing || loading || !amount.trim()}
                  className="rounded-xl bg-green-600 px-4 py-3 font-bold text-white transition hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {processing ? "Procesando..." : "+ Agregar saldo"}
                </button>

                <button
                  type="button"
                  onClick={() => void adjustBalance("SUBTRACT")}
                  disabled={processing || loading || !amount.trim()}
                  className="rounded-xl bg-red-600 px-4 py-3 font-bold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {processing ? "Procesando..." : "− Restar saldo"}
                </button>
              </div>

              <button
                type="button"
                onClick={() => void loadClient()}
                disabled={processing || loading}
                className="mt-4 w-full rounded-xl border border-white/15 px-4 py-3 text-sm text-gray-300 transition hover:bg-white/10 disabled:opacity-50"
              >
                Actualizar saldo
              </button>
            </>
          ) : (
            <div className="mt-6">
              <p className="text-red-300">
                {message || "No se encontró el usuario."}
              </p>
              <button
                type="button"
                onClick={() => void loadClient()}
                className="mt-4 rounded-lg border border-white/15 px-4 py-2 hover:bg-white/10"
              >
                Intentar nuevamente
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
                  }
