"use client";

import { useState } from "react";
import { supabase } from "../../../lib/supabase";
import {
  DELTA_FORCE_OFFERS,
  type DeltaForceOffer,
} from "../../../lib/games/delta-force";

export default function DeltaForcePage() {
  const [playerId, setPlayerId] = useState("");
  const [selectedOffer, setSelectedOffer] =
    useState<DeltaForceOffer | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handlePurchase() {
    setMessage("");

    if (!selectedOffer) {
      setMessage("Selecciona un paquete.");
      return;
    }

    if (!/^\d{4,20}$/.test(playerId.trim())) {
      setMessage("Introduce un ID de jugador válido.");
      return;
    }

    setLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setMessage("Inicia sesión para comprar.");
        return;
      }

      const response = await fetch("/api/topups/delta-force", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          offerId: selectedOffer.id,
          playerId: playerId.trim(),
          idempotencyKey: crypto.randomUUID(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "No se pudo procesar el pedido.");
        return;
      }

      setMessage(
        result.pending
          ? `Pedido ${result.orderId} recibido y pendiente de confirmación.`
          : `Pedido recibido. Número de orden: ${result.orderId}`
      );
    } catch {
      setMessage("Error de conexión. Inténtalo nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-8 text-white">
      <a href="/home" className="text-sm text-gray-400 hover:text-white">
        ← Volver a la tienda
      </a>

      <header className="my-6 overflow-hidden rounded-2xl border border-red-500/30 bg-gradient-to-br from-gray-900 to-red-950 p-6">
        <p className="text-sm font-bold uppercase tracking-widest text-red-400">
          STORE GAMING
        </p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">
          DELTA FORCE
        </h1>
        <p className="mt-2 text-gray-300">
          Selecciona tus Delta Coins o tu pase y escribe tu ID de jugador.
        </p>
      </header>

      <section className="mb-6 rounded-2xl border border-white/10 bg-gray-900 p-5">
        <label htmlFor="playerId" className="mb-2 block font-semibold">
          ID del jugador
        </label>
        <input
          id="playerId"
          inputMode="numeric"
          autoComplete="off"
          value={playerId}
          onChange={(event) =>
            setPlayerId(event.target.value.replace(/\D/g, ""))
          }
          placeholder="Escribe tu ID de jugador"
          className="w-full rounded-xl border border-white/15 bg-gray-950 px-4 py-3 outline-none focus:border-red-500"
        />
      </section>

      <h2 className="mb-4 text-xl font-bold">Elige tu paquete</h2>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {DELTA_FORCE_OFFERS.map((offer) => {
          const active = selectedOffer?.id === offer.id;

          return (
            <button
              type="button"
              key={offer.id}
              onClick={() => setSelectedOffer(offer)}
              className={`rounded-xl border p-4 text-left transition ${
                active
                  ? "border-red-500 bg-red-950/60"
                  : "border-white/10 bg-gray-900 hover:border-red-500/60"
              }`}
            >
              <span className="block font-semibold">{offer.name}</span>
              <span className="mt-3 block text-lg font-black text-red-400">
                ${offer.price.toFixed(2)} USD
              </span>
              {active && (
                <span className="mt-2 block text-xs text-red-300">
                  Paquete seleccionado
                </span>
              )}
            </button>
          );
        })}
      </section>

      <section className="mt-6 rounded-2xl border border-white/10 bg-gray-900 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-gray-400">Total del pedido</p>
            <p className="text-2xl font-black">
              {selectedOffer
                ? `$${selectedOffer.price.toFixed(2)} USD`
                : "Selecciona un paquete"}
            </p>
          </div>

          <button
            type="button"
            onClick={handlePurchase}
            disabled={loading || !selectedOffer}
            className="rounded-xl bg-red-600 px-6 py-3 font-bold hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Procesando..." : "Comprar ahora"}
          </button>
        </div>

        {message && (
          <p
            role="status"
            className="mt-4 rounded-lg bg-gray-950 p-3 text-sm"
          >
            {message}
          </p>
        )}
      </section>
    </main>
  );
}
