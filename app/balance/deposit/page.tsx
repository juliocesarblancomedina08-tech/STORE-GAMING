"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Network = "BEP20" | "TRC20" | "TON";

const NETWORKS: Record<
  Network,
  {
    name: string;
    address: string;
  }
> = {
  BEP20: {
    name: "USDT (BEP20)",
    address:
      "0xdcdEe992E26cDBe1b024e171a3a980078BeaAC77",
  },

  TRC20: {
    name: "USDT (TRC20)",
    address:
      "TTYHTFZJTMisUGZcSEooegLpxYt3zVo6YQ",
  },

  TON: {
    name: "USDT (TON)",
    address:
      "UQCKwyZB4Ph58WjL78LIYyd3U81nTYGuwWFNGaz2_YAvJJDg",
  },
};

function DepositContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [amount, setAmount] = useState("");
  const [network, setNetwork] = useState<Network | null>(null);

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const [depositId, setDepositId] = useState("");
  const [orderNumber, setOrderNumber] = useState("");

  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function initializeDeposit() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.replace("/");
        return;
      }

      const urlAmount = searchParams.get("amount");
      const urlNetwork = searchParams.get("network");

      if (!urlAmount || !urlNetwork) {
        setError("Los datos del depósito no son válidos.");
        setLoading(false);
        return;
      }

      const numericAmount = Number(urlAmount);

      if (
        !Number.isFinite(numericAmount) ||
        numericAmount <= 0
      ) {
        setError("El monto del depósito no es válido.");
        setLoading(false);
        return;
      }

      if (
        urlNetwork !== "BEP20" &&
        urlNetwork !== "TRC20" &&
        urlNetwork !== "TON"
      ) {
        setError("La red seleccionada no es válida.");
        setLoading(false);
        return;
      }

      setAmount(numericAmount.toFixed(2));
      setNetwork(urlNetwork);

      setLoading(false);
    }

    initializeDeposit();
  }, [router, searchParams]);

  async function createDeposit() {
    if (!network || !amount) {
      setError("Los datos del depósito están incompletos.");
      return;
    }

    setCreating(true);
    setError("");

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      router.replace("/");
      return;
    }

    const numericAmount = Number(amount);

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      setError("El monto no es válido.");
      setCreating(false);
      return;
    }

    const selectedNetwork = NETWORKS[network];

    const {
      data,
      error: insertError,
    } = await supabase
      .from("deposits")
      .insert({
        user_id: session.user.id,
        amount: numericAmount,
        network: network,
        address: selectedNetwork.address,
        status: "PENDING",
      })
      .select("id")
      .single();

    if (insertError || !data) {
      console.error(insertError);

      setError(
        "No se pudo crear el depósito. Inténtelo nuevamente."
      );

      setCreating(false);
      return;
    }

    const generatedOrderNumber =
      `DEP-${Date.now().toString().slice(-8)}`;

    setDepositId(data.id);
    setOrderNumber(generatedOrderNumber);
    setCreating(false);
  }

  async function copyAddress() {
    if (!network) return;

    const address = NETWORKS[network].address;

    try {
      await navigator.clipboard.writeText(address);

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      setError(
        "No se pudo copiar la dirección. Mantenga presionada la dirección para copiarla."
      );
    }
  }

  if (loading) {
    return (
      <main className="balance-page">
        <div className="balance-background" />

        <div className="balance-loading">
          <div className="balance-loading-logo">
            🛒🎮
          </div>

          <div className="balance-spinner" />

          <p>
            PREPARANDO DEPÓSITO...
          </p>
        </div>
      </main>
    );
  }

  if (error && !network) {
    return (
      <main className="balance-page">
        <div className="balance-background" />

        <section className="deposit-order-page">

          <div className="deposit-error-page">
            ⚠️
          </div>

          <h1>
            DEPÓSITO NO DISPONIBLE
          </h1>

          <p>
            {error}
          </p>

          <button
            type="button"
            className="deposit-cancel-button"
            onClick={() => router.push("/balance")}
          >
            ← VOLVER A MI BILLETERA
          </button>

        </section>
      </main>
    );
  }

  if (!network) {
    return null;
  }

  const selectedNetwork = NETWORKS[network];

  /*
   * =========================================================
   * ORDEN DE DEPÓSITO
   * =========================================================
   */

  if (!depositId) {
    return (
      <main className="balance-page">
        <div className="balance-background" />

        <header className="balance-header">

          <button
            type="button"
            className="balance-back-button"
            onClick={() => router.push("/balance")}
            aria-label="Volver"
          >
            <span>
              ←
            </span>
          </button>

          <div className="balance-header-title">

            <small>
              STORE GAMING
            </small>

            <h1>
              DEPÓSITO
            </h1>

          </div>

          <div className="balance-header-icon">
            ₮
          </div>

        </header>

        <section className="deposit-order-page">

          <div className="deposit-order-card">

            <div className="deposit-order-top">

              <span>
                MONTO A ENVIAR
              </span>

              <strong>
                ${amount}
              </strong>

              <small>
                USD
              </small>

            </div>

            <div className="deposit-network-badge">
              ₮ {selectedNetwork.name}
            </div>

            <div className="deposit-order-info">

              <strong>
                DIRECCIÓN DE DESTINO
              </strong>

              <div className="deposit-address-box">

                <span>
                  {selectedNetwork.address}
                </span>

                <button
                  type="button"
                  onClick={copyAddress}
                  className="deposit-copy-button"
                >
                  {copied ? "✓" : "COPIAR"}
                </button>

              </div>

            </div>

            <div className="deposit-qr-section">

              <strong>
                CÓDIGO QR
              </strong>

              <div className="deposit-qr-box">

                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(
                    selectedNetwork.address
                  )}`}
                  alt={`QR ${selectedNetwork.name}`}
                />

              </div>

              <p>
                Escanea este código QR desde tu
                billetera de criptomonedas.
              </p>

            </div>

            <div className="deposit-warning">

              <span>
                ⚠️
              </span>

              <p>
                Envía únicamente USDT utilizando
                la red <strong>{network}</strong>.
                Una transferencia realizada por
                otra red puede perderse.
              </p>

            </div>

            {error && (
              <div className="deposit-error">
                ⚠️ {error}
              </div>
            )}

            <button
              type="button"
              className="deposit-confirm-button"
              disabled={creating}
              onClick={createDeposit}
            >
              {creating
                ? "CREANDO DEPÓSITO..."
                : "HE REVISADO LOS DATOS"}

              {!creating && (
                <span>
                  →
                </span>
              )}
            </button>

            <button
              type="button"
              className="deposit-cancel-button"
              onClick={() => router.push("/balance")}
            >
              CANCELAR
            </button>

          </div>

        </section>

      </main>
    );
  }

  /*
   * =========================================================
   * DEPÓSITO CREADO
   * =========================================================
   */

  return (
    <main className="balance-page">
      <div className="balance-background" />

      <header className="balance-header">

        <button
          type="button"
          className="balance-back-button"
          onClick={() => router.push("/balance")}
          aria-label="Volver"
        >
          <span>
            ←
          </span>
        </button>

        <div className="balance-header-title">

          <small>
            STORE GAMING
          </small>

          <h1>
            DEPÓSITO
          </h1>

        </div>

        <div className="balance-header-icon">
          ₮
        </div>

      </header>

      <section className="deposit-order-page">

        <div className="deposit-success-card">

          <div className="deposit-success-icon">
            ✓
          </div>

          <h2>
            DEPÓSITO CREADO
          </h2>

          <p>
            Tu solicitud de depósito fue registrada
            correctamente.
          </p>

          <div className="deposit-pending-badge">
            ⏳ PENDIENTE DE CONFIRMACIÓN
          </div>

          <div className="deposit-final-amount">

            <small>
              MONTO
            </small>

            <strong>
              ${amount}
            </strong>

            <span>
              USD
            </span>

          </div>

          <div className="deposit-network-badge">
            ₮ {selectedNetwork.name}
          </div>

          <div className="deposit-order-reference">

            <span>
              REFERENCIA
            </span>

            <strong>
              {orderNumber}
            </strong>

          </div>

          <div className="deposit-address-box">

            <span>
              {selectedNetwork.address}
            </span>

            <button
              type="button"
              onClick={copyAddress}
              className="deposit-copy-button"
            >
              {copied ? "✓" : "COPIAR"}
            </button>

          </div>

          <div className="deposit-qr-box">

            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(
                selectedNetwork.address
              )}`}
              alt={`QR ${selectedNetwork.name}`}
            />

          </div>

          <div className="deposit-warning">

            <span>
              ⚠️
            </span>

            <p>
              Envía exactamente el monto indicado
              utilizando la red seleccionada.
              Guarda el comprobante de la
              transferencia.
            </p>

          </div>

          <p className="deposit-reference-text">
            ID de depósito:
            <br />
            {depositId}
          </p>

          <button
            type="button"
            className="deposit-confirm-button"
            onClick={() => router.push("/balance")}
          >
            VOLVER A MI BILLETERA
            <span>
              →
            </span>
          </button>

        </div>

      </section>

    </main>
  );
}

/*
 * ===========================================================
 * PÁGINA PRINCIPAL
 * ===========================================================
 *
 * Suspense es necesario porque DepositContent utiliza
 * useSearchParams().
 */

export default function DepositPage() {
  return (
    <Suspense
      fallback={
        <main className="balance-page">
          <div className="balance-background" />

          <div className="balance-loading">

            <div className="balance-loading-logo">
              🛒🎮
            </div>

            <div className="balance-spinner" />

            <p>
              PREPARANDO DEPÓSITO...
            </p>

          </div>
        </main>
      }
    >
      <DepositContent />
    </Suspense>
  );
  }
