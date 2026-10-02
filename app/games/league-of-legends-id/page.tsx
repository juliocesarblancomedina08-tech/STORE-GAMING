"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

import {
  LEAGUE_OF_LEGENDS_ID,
  LeagueOfLegendsIdOffer,
} from "../../../lib/games/league-of-legends-id";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LeagueOfLegendsIdPage() {
  const router = useRouter();

  const [selectedOffer, setSelectedOffer] =
    useState<LeagueOfLegendsIdOffer | null>(null);

  const [riotId, setRiotId] = useState("");
  const [processing, setProcessing] = useState(false);

  const [orderCreated, setOrderCreated] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [supplierOrderId, setSupplierOrderId] = useState("");

  const [error, setError] = useState("");

  const formattedPrice = useMemo(() => {
    if (!selectedOffer) return "0.00";
    return selectedOffer.price.toFixed(2);
  }, [selectedOffer]);

  function validateRiotId(value: string) {
    const clean = value.trim();

    if (!clean) {
      return "Introduce tu Riot ID.";
    }

    if (!clean.includes("#")) {
      return "El Riot ID debe tener el formato Nombre#TAG.";
    }

    const parts = clean.split("#");

    if (parts.length !== 2) {
      return "El Riot ID debe tener el formato Nombre#TAG.";
    }

    const name = parts[0].trim();
    const tag = parts[1].trim();

    if (!name || !tag) {
      return "El Riot ID debe tener el formato Nombre#TAG.";
    }

    if (name.length > 32 || tag.length > 16) {
      return "El Riot ID introducido es demasiado largo.";
    }

    return "";
  }

  async function createOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    if (!selectedOffer) {
      setError("Selecciona una oferta.");
      return;
    }

    const riotIdClean = riotId.trim();

    const riotError = validateRiotId(riotIdClean);

    if (riotError) {
      setError(riotError);
      return;
    }

    setProcessing(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setError("Tu sesión ha expirado. Inicia sesión nuevamente.");
        router.push("/login");
        return;
      }

      const idempotencyKey = crypto.randomUUID();

      const response = await fetch("/api/topups/league-of-legends-id", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          offerId: selectedOffer.id,
          riotId: riotIdClean,
          idempotencyKey,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data?.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            "No se pudo crear la orden."
        );
      }

      setOrderCreated(true);

      setOrderNumber(
        data.orderNumber ||
          data.order?.order_number ||
          data.order?.id ||
          ""
      );

      setSupplierOrderId(
        data.supplierOrderId ||
          data.order?.supplier_order_id ||
          ""
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "No se pudo crear la orden."
      );
    } finally {
      setProcessing(false);
    }
  }

  if (orderCreated) {
    return (
      <main className="min-h-screen bg-black text-white px-4 py-8">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-6">
            <button
              type="button"
              onClick={() => router.push("/top-up")}
              className="text-sm text-white/70 hover:text-white"
            >
              ← Volver a la tienda
            </button>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-center shadow-xl">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-green-500/20">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-3xl text-black">
                ✓
              </div>
            </div>

            <h1 className="text-2xl font-bold">
              Orden creada
            </h1>

            <p className="mt-2 text-sm text-white/60">
              Tu pedido de League of Legends (ID) fue creado correctamente.
            </p>

            {orderNumber && (
              <div className="mt-5 rounded-xl bg-black/40 p-4">
                <p className="text-xs uppercase tracking-wide text-white/40">
                  Número de orden
                </p>

                <p className="mt-1 break-all text-lg font-bold">
                  {orderNumber}
                </p>
              </div>
            )}

            {supplierOrderId && (
              <div className="mt-3 rounded-xl bg-black/40 p-4">
                <p className="text-xs uppercase tracking-wide text-white/40">
                  ID del proveedor
                </p>

                <p className="mt-1 break-all text-sm text-white/70">
                  {supplierOrderId}
                </p>
              </div>
            )}

            <div className="mt-6 grid gap-3">
              <button
                type="button"
                onClick={() => router.push("/orders")}
                className="gaming-button w-full rounded-xl px-5 py-3 font-bold"
              >
                Revisar orden
              </button>

              <button
                type="button"
                onClick={() => router.push("/top-up")}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-5 py-3 font-semibold text-white"
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
    <main className="min-h-screen bg-black text-white">
      <div className="relative min-h-screen overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-25"
          style={{
            backgroundImage:
              "url('/images/battle-royale-bg.jpg')",
          }}
        />

        <div className="absolute inset-0 bg-black/70" />

        <div className="relative mx-auto w-full max-w-md px-4 py-6">
          <button
            type="button"
            onClick={() => router.push("/top-up")}
            className="mb-5 text-sm text-white/70 hover:text-white"
          >
            ← Volver a la tienda
          </button>

          <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/80 shadow-2xl backdrop-blur">
            <div className="relative h-48 w-full overflow-hidden">
              <img
                src={LEAGUE_OF_LEGENDS_ID.image}
                alt="League of Legends"
                className="h-full w-full object-cover"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

              <div className="absolute bottom-4 left-4">
                <h1 className="text-2xl font-black">
                  LEAGUE OF LEGENDS
                </h1>

                <p className="text-sm font-semibold text-red-400">
                  INDONESIA
                </p>
              </div>
            </div>

            <div className="p-4">
              <div className="mb-5 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] p-3">
                <span className="text-lg">✏️</span>

                <p className="text-sm font-semibold text-white/80">
                  Presione para ver ofertas
                </p>
              </div>

              <div className="grid gap-2">
                {LEAGUE_OF_LEGENDS_ID.offers.map((offer) => {
                  const active =
                    selectedOffer?.id === offer.id;

                  return (
                    <button
                      key={offer.id}
                      type="button"
                      onClick={() => {
                        setSelectedOffer(offer);
                        setError("");
                      }}
                      className={[
                        "flex w-full items-center justify-between rounded-xl border p-4 text-left transition",
                        active
                          ? "border-red-500 bg-red-500/10"
                          : "border-white/10 bg-white/[0.03] hover:border-white/20",
                      ].join(" ")}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">
                          {offer.icon}
                        </span>

                        <div>
                          <p className="font-bold">
                            {offer.name}
                          </p>

                          <p className="text-xs text-white/40">
                            Riot Points
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="font-black text-white">
                          ${offer.price.toFixed(2)}
                        </p>

                        {active && (
                          <p className="text-xs text-red-400">
                            Seleccionado
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedOffer && (
                <form
                  onSubmit={createOrder}
                  className="mt-5"
                >
                  <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-white/40">
                          Oferta seleccionada
                        </p>

                        <p className="mt-1 font-bold">
                          {selectedOffer.name}
                        </p>
                      </div>

                      <p className="text-xl font-black">
                        ${formattedPrice}
                      </p>
                    </div>
                  </div>

                  <label
                    htmlFor="riotId"
                    className="mb-2 block text-sm font-semibold"
                  >
                    Riot ID
                  </label>

                  <input
                    id="riotId"
                    type="text"
                    value={riotId}
                    onChange={(event) => {
                      setRiotId(event.target.value);
                      setError("");
                    }}
                    placeholder="Nombre#TAG"
                    autoComplete="off"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none placeholder:text-white/30 focus:border-red-500"
                  />

                  <p className="mt-2 text-xs leading-5 text-white/45">
                    Región: Indonesia. Introduce tu Riot ID exactamente
                    como aparece en tu cuenta.
                  </p>

                  {error && (
                    <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={processing}
                    className="gaming-button mt-5 w-full rounded-xl px-5 py-4 font-black disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {processing
                      ? "CREANDO ORDEN..."
                      : `COMPRAR POR $${formattedPrice}`}
                  </button>
                </form>
              )}

              {!selectedOffer && (
                <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-center text-sm text-white/50">
                  Selecciona una oferta para continuar.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
          }
