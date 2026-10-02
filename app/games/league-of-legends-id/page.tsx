"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

import { LEAGUE_OF_LEGENDS_ID } from "../../../lib/games/league-of-legends-id";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type LeagueOffer = {
  id: string;
  name: string;
  price: number;
  supplierPrice: number;
  icon: string;
};

export default function LeagueOfLegendsIdPage() {
  const router = useRouter();

  const [showOffers, setShowOffers] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<LeagueOffer | null>(
    null
  );

  const [riotId, setRiotId] = useState("");

  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);

  const [orderCreated, setOrderCreated] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [supplierOrderId, setSupplierOrderId] = useState("");

  const [error, setError] = useState("");

  useEffect(() => {
    const savedOrder = localStorage.getItem(
      "store_gaming_last_league_of_legends_id_order"
    );

    if (!savedOrder) return;

    try {
      const parsed = JSON.parse(savedOrder);

      if (parsed?.orderNumber) {
        setOrderNumber(parsed.orderNumber);
      }

      if (parsed?.supplierOrderId) {
        setSupplierOrderId(parsed.supplierOrderId);
      }
    } catch {
      // Ignorar datos corruptos del localStorage
    }
  }, []);

  const offers = LEAGUE_OF_LEGENDS_ID.offers as readonly LeagueOffer[];

  function formatPrice(price: number) {
    return `$${price.toFixed(2)}`;
  }

  function handleSelectOffer(offer: LeagueOffer) {
    setSelectedOffer(offer);
    setError("");

    setTimeout(() => {
      document
        .getElementById("league-order-form")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  }

  function validateRiotId(value: string) {
    /*
     * Riot ID:
     * Nombre#TAG
     *
     * Ejemplo:
     * Player123#LAS
     */
    const trimmed = value.trim();

    if (!trimmed) {
      return "Introduce tu Riot ID.";
    }

    if (!trimmed.includes("#")) {
      return "El Riot ID debe tener el formato Nombre#TAG.";
    }

    const parts = trimmed.split("#");

    if (parts.length !== 2) {
      return "El Riot ID debe tener el formato Nombre#TAG.";
    }

    const name = parts[0].trim();
    const tag = parts[1].trim();

    if (!name || !tag) {
      return "El Riot ID debe tener el formato Nombre#TAG.";
    }

    if (name.length > 32) {
      return "El nombre del Riot ID es demasiado largo.";
    }

    if (tag.length > 10) {
      return "El TAG del Riot ID es demasiado largo.";
    }

    return "";
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    if (!selectedOffer) {
      setError("Selecciona una oferta.");
      return;
    }

    const normalizedRiotId = riotId.trim();

    const riotIdError = validateRiotId(normalizedRiotId);

    if (riotIdError) {
      setError(riotIdError);
      return;
    }

    setLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setError("Tu sesión ha expirado. Inicia sesión nuevamente.");
        setLoading(false);
        return;
      }

      /*
       * Generamos una clave única para evitar
       * que una misma orden se cree dos veces.
       */
      const idempotencyKey =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      setValidating(true);

      const response = await fetch(
        "/api/topups/league-of-legends-id",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            offerId: selectedOffer.id,
            riotId: normalizedRiotId,
            idempotencyKey,
          }),
        }
      );

      setValidating(false);

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            "No se pudo crear la orden."
        );
      }

      const newOrderNumber =
        data.orderNumber ||
        data.order_number ||
        data.orderId ||
        data.order_id ||
        "";

      const newSupplierOrderId =
        data.supplierOrderId ||
        data.supplier_order_id ||
        "";

      setOrderNumber(newOrderNumber);
      setSupplierOrderId(newSupplierOrderId);
      setOrderCreated(true);

      localStorage.setItem(
        "store_gaming_last_league_of_legends_id_order",
        JSON.stringify({
          orderNumber: newOrderNumber,
          supplierOrderId: newSupplierOrderId,
          riotId: normalizedRiotId,
          offerId: selectedOffer.id,
          offerName: selectedOffer.name,
          price: selectedOffer.price,
          createdAt: new Date().toISOString(),
        })
      );
    } catch (err) {
      setValidating(false);

      setError(
        err instanceof Error
          ? err.message
          : "No se pudo crear la orden."
      );
    } finally {
      setLoading(false);
    }
  }

  /*
   * Pantalla después de crear la orden.
   * Mantiene el mismo concepto visual de Sausage Man.
   */
  if (orderCreated) {
    return (
      <main className="min-h-screen bg-transparent text-white px-4 py-6">
        <div className="mx-auto w-full max-w-md">
          <div className="rounded-2xl border border-white/10 bg-black/70 backdrop-blur-md p-6 shadow-2xl">
            <div className="flex flex-col items-center text-center">
              <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-green-500/15 border border-green-500/30">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-black text-3xl font-black">
                  ✓
                </div>
              </div>

              <h1 className="text-2xl font-black uppercase tracking-wide">
                ORDEN CREADA
              </h1>

              <p className="mt-2 text-sm text-white/65">
                Tu pedido de League of Legends (ID) fue creado
                correctamente.
              </p>

              {orderNumber && (
                <div className="mt-6 w-full rounded-xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-wider text-white/45">
                    Número de orden
                  </p>

                  <p className="mt-1 break-all text-lg font-bold">
                    {orderNumber}
                  </p>
                </div>
              )}

              {supplierOrderId && (
                <div className="mt-3 w-full rounded-xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-wider text-white/45">
                    Orden del proveedor
                  </p>

                  <p className="mt-1 break-all text-sm font-semibold text-white/80">
                    {supplierOrderId}
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={() => router.push("/orders")}
                className="mt-6 w-full rounded-xl bg-red-600 px-5 py-4 text-sm font-black uppercase tracking-wide text-white transition active:scale-[0.98] hover:bg-red-500"
              >
                Revisar orden
              </button>

              <button
                type="button"
                onClick={() => router.push("/top-up")}
                className="mt-3 w-full rounded-xl border border-white/10 bg-white/5 px-5 py-4 text-sm font-bold text-white/80 transition active:scale-[0.98] hover:bg-white/10"
              >
                Volver a la tienda
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-transparent text-white">
      <div className="mx-auto w-full max-w-5xl px-3 pb-10 pt-4 sm:px-5">
        {/* BOTÓN VOLVER */}
        <button
          type="button"
          onClick={() => router.push("/top-up")}
          className="mb-4 flex items-center gap-2 rounded-xl border border-white/10 bg-black/50 px-4 py-2.5 text-sm font-semibold text-white/80 backdrop-blur-md transition active:scale-[0.98] hover:bg-white/10"
        >
          <span className="text-lg">‹</span>
          Volver
        </button>

        {/* HEADER / IMAGEN */}
        <section className="overflow-hidden rounded-2xl border border-white/10 bg-black/60 shadow-2xl backdrop-blur-md">
          <div className="relative w-full overflow-hidden">
            <img
              src={LEAGUE_OF_LEGENDS_ID.image}
              alt="League of Legends"
              className="block h-auto max-h-[260px] w-full object-cover sm:max-h-[340px]"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

            <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
              <h1 className="text-2xl font-black uppercase tracking-wide drop-shadow-lg sm:text-3xl">
                {LEAGUE_OF_LEGENDS_ID.name}
              </h1>

              <p className="mt-1 text-xs text-white/70 sm:text-sm">
                Recarga de RP · Región Indonesia
              </p>
            </div>
          </div>

          {/* INFORMACIÓN */}
          <div className="p-4 sm:p-5">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-sm leading-6 text-white/75">
                {LEAGUE_OF_LEGENDS_ID.note}
              </p>
            </div>

            {/* BOTÓN PARA MOSTRAR OFERTAS */}
            <button
              type="button"
              onClick={() => setShowOffers((value) => !value)}
              className="mt-4 flex w-full items-center justify-between rounded-xl border border-red-500/30 bg-red-600/10 px-4 py-4 text-left transition active:scale-[0.99] hover:bg-red-600/15"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">✏️</span>

                <div>
                  <p className="text-sm font-black uppercase tracking-wide">
                    Presione para ver ofertas
                  </p>

                  <p className="mt-0.5 text-xs text-white/45">
                    Selecciona la cantidad de RP
                  </p>
                </div>
              </div>

              <span
                className={`text-xl transition-transform ${
                  showOffers ? "rotate-180" : ""
                }`}
              >
               ⌄
              </span>
            </button>

            {/* OFERTAS */}
            {showOffers && (
              <div className="mt-3 space-y-2">
                {offers.map((offer) => {
                  const isSelected = selectedOffer?.id === offer.id;

                  return (
                    <button
                      type="button"
                      key={offer.id}
                      onClick={() => handleSelectOffer(offer)}
                      className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition active:scale-[0.99] ${
                        isSelected
                          ? "border-red-500 bg-red-600/15"
                          : "border-white/10 bg-black/40 hover:bg-white/5"
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/5 text-xl">
                          {offer.icon}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-black">
                            {offer.name}
                          </p>

                          <p className="mt-0.5 text-xs text-white/40">
                            League of Legends · Indonesia
                          </p>
                        </div>
                      </div>

                      <div className="ml-3 shrink-0 text-right">
                        <p className="text-base font-black">
                          {formatPrice(offer.price)}
                        </p>

                        {isSelected && (
                          <p className="mt-0.5 text-[10px] font-bold uppercase text-red-400">
                            Seleccionado
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* FORMULARIO */}
            {selectedOffer && (
              <form
                id="league-order-form"
                onSubmit={handleSubmit}
                className="mt-5 rounded-2xl border border-white/10 bg-black/50 p-4 sm:p-5"
              >
                <div className="mb-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-white/40">
                    Oferta seleccionada
                  </p>

                  <div className="mt-2 flex items-center justify-between gap-3 rounded-xl bg-white/5 p-4">
                    <div>
                      <p className="font-black">
                        {selectedOffer.name}
                      </p>

                      <p className="mt-1 text-xs text-white/40">
                        Región Indonesia
                      </p>
                    </div>

                    <p className="text-xl font-black">
                      {formatPrice(selectedOffer.price)}
                    </p>
                  </div>
                </div>

                <label
                  htmlFor="riot-id"
                  className="mb-2 block text-sm font-black"
                >
                  Riot ID
                </label>

                <input
                  id="riot-id"
                  type="text"
                  value={riotId}
                  onChange={(event) => {
                    setRiotId(event.target.value);
                    setError("");
                  }}
                  placeholder="Nombre#TAG"
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={43}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-4 text-base font-semibold text-white outline-none placeholder:text-white/25 focus:border-red-500/60 focus:bg-white/[0.07]"
                />

                <div className="mt-3 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-3">
                  <p className="text-xs leading-5 text-yellow-200/70">
                    ⚠️ Escribe tu Riot ID exactamente como aparece en tu
                    cuenta. Debe tener el formato{" "}
                    <strong className="text-yellow-200">
                      Nombre#TAG
                    </strong>
                    .
                  </p>
                </div>

                {error && (
                  <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3">
                    <p className="text-sm font-semibold text-red-300">
                      {error}
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || validating}
                  className="mt-5 flex w-full items-center justify-center rounded-xl bg-red-600 px-5 py-4 text-sm font-black uppercase tracking-wide text-white transition active:scale-[0.98] hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading || validating
                    ? "Procesando..."
                    : `Comprar ${formatPrice(selectedOffer.price)}`}
                </button>
              </form>
            )}
          </div>
        </section>
      </div>
    </main>
  );
  }
