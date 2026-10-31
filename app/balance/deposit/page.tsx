"use client";

import {
  Suspense,
  useEffect,
  useState,
} from "react";

import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import { supabase } from "../../../lib/supabase";

type Network = "BEP20" | "TRC20" | "TON";

type NetworkInfo = {
  name: string;
  address: string;
};

const NETWORKS: Record<Network, NetworkInfo> = {
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

const DEPOSIT_DURATION_MS = 10 * 60 * 1000;

/*
 * TASA DE CAMBIO
 *
 * 1 USDT = 1 BALANCE
 */

const EXCHANGE_RATE = 1;

function UsdtLogo() {
  return (
    <span className="usdt-logo" aria-label="USDT">
      <img
        src="/images/usdt-bep20-logo.png"
        alt="USDT"
      />
    </span>
  );
}

function DepositContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [amount, setAmount] = useState("");

  const [network, setNetwork] =
    useState<Network | null>(null);

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const [depositId, setDepositId] = useState("");
  const [orderNumber, setOrderNumber] = useState("");

  const [copied, setCopied] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);

  const [error, setError] = useState("");
  const [created, setCreated] = useState(false);

  const [expiresAt, setExpiresAt] =
    useState<number | null>(null);

  const [remainingSeconds, setRemainingSeconds] =
    useState(0);

  const [depositStatus, setDepositStatus] =
    useState<
      "PENDING" |
      "CONFIRMED" |
      "REJECTED" |
      "EXPIRED"
    >("PENDING");

  const selectedNetwork =
    network ? NETWORKS[network] : null;

  const numericAmount = Number(amount);

  const balanceToReceive =
    Number.isFinite(numericAmount) && numericAmount > 0
      ? numericAmount * EXCHANGE_RATE
      : 0;

  /*
   * INICIALIZAR DEPÓSITO
   */

  useEffect(() => {
    async function initializeDeposit() {
      try {
        setLoading(true);
        setError("");

        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session?.user) {
          router.replace("/");
          return;
        }

        const urlNetwork =
          searchParams.get("network");

        if (!urlNetwork) {
          setError(
            "No se seleccionó una red de depósito."
          );
          setLoading(false);
          return;
        }

        const normalizedNetwork =
          urlNetwork.toUpperCase() as Network;

        if (!NETWORKS[normalizedNetwork]) {
          setError(
            "La red seleccionada no es válida."
          );
          setLoading(false);
          return;
        }

        setNetwork(normalizedNetwork);

        /*
         * Si viene una cantidad desde otra página,
         * la conservamos como valor inicial.
         */

        const urlAmount =
          searchParams.get("amount");

        if (urlAmount) {
          const parsedAmount = Number(urlAmount);

          if (
            Number.isFinite(parsedAmount) &&
            parsedAmount > 0
          ) {
            setAmount(parsedAmount.toString());
          }
        }

        setLoading(false);
      } catch (err) {
        console.error(
          "ERROR AL PREPARAR DEPÓSITO:",
          err
        );

        setError(
          "No se pudo preparar el depósito."
        );

        setLoading(false);
      }
    }

    initializeDeposit();
  }, [router, searchParams]);

  /*
   * CREAR DEPÓSITO
   */

  async function createDeposit() {
    if (creating || created) return;

    try {
      setCreating(true);
      setError("");

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.user) {
        router.replace("/");
        return;
      }

      if (!network || !selectedNetwork) {
        setError("Selecciona una red válida.");
        return;
      }

      const numericAmount = Number(amount);

      if (
        !Number.isFinite(numericAmount) ||
        numericAmount <= 0
      ) {
        setError(
          "Introduce una cantidad válida de USDT."
        );
        return;
      }

      if (numericAmount > 1000000) {
        setError(
          "La cantidad supera el límite permitido."
        );
        return;
      }

      const email = session.user.email || "";

      const username = email
        .split("@")[0]
        .replace(/^@/, "");

      const expiration = new Date(
        Date.now() + DEPOSIT_DURATION_MS
      ).toISOString();

      const {
        data,
        error: insertError,
      } = await supabase
        .from("deposits")
        .insert({
          user_id: session.user.id,
          username,
          email,
          amount: numericAmount,
          currency: "USDT",
          payment_method: "CRYPTO",
          network,
          wallet_address: selectedNetwork.address,
          tx_hash: null,
          status: "PENDING",
          expires_at: expiration,
        })
        .select(`
          id,
          created_at,
          expires_at,
          status
        `)
        .single();

      if (insertError) {
        console.error(
          "ERROR CREANDO DEPÓSITO:",
          insertError
        );

        setError(
          insertError.message ||
          "No se pudo crear el depósito."
        );

        return;
      }

      if (!data) {
        setError(
          "No se recibió información del depósito."
        );
        return;
      }

      setDepositId(data.id);

      setOrderNumber(
        `DEP-${Date.now().toString().slice(-8)}`
      );

      setExpiresAt(
        new Date(data.expires_at).getTime()
      );

      setDepositStatus("PENDING");
      setCreated(true);
    } catch (err) {
      console.error(
        "ERROR CREANDO DEPÓSITO:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Error inesperado al crear el depósito."
      );
    } finally {
      setCreating(false);
    }
  }

  /*
   * CONTADOR
   */

  useEffect(() => {
    if (
      !created ||
      !expiresAt ||
      depositStatus !== "PENDING"
    ) {
      return;
    }

    function updateTimer() {
      const difference = expiresAt! - Date.now();

      if (difference <= 0) {
        setRemainingSeconds(0);
        setDepositStatus("EXPIRED");
        return;
      }

      setRemainingSeconds(
        Math.ceil(difference / 1000)
      );
    }

    updateTimer();

    const timer = window.setInterval(
      updateTimer,
      1000
    );

    return () => {
      window.clearInterval(timer);
    };
  }, [created, expiresAt, depositStatus]);

  /*
   * COMPROBAR ESTADO
   */

  useEffect(() => {
    if (
      !created ||
      !depositId ||
      depositStatus !== "PENDING"
    ) {
      return;
    }

    let cancelled = false;

    async function checkDepositStatus() {
      try {
        const {
          data,
          error: statusError,
        } = await supabase
          .from("deposits")
          .select(`
            status,
            expires_at
          `)
          .eq("id", depositId)
          .single();

        if (
          cancelled ||
          statusError ||
          !data
        ) {
          return;
        }

        const status =
          String(data.status).toUpperCase();

        if (
          status === "CONFIRMED" ||
          status === "REJECTED" ||
          status === "EXPIRED"
        ) {
          setDepositStatus(
            status as
              | "CONFIRMED"
              | "REJECTED"
              | "EXPIRED"
          );

          return;
        }

        if (data.expires_at) {
          const expiration =
            new Date(data.expires_at).getTime();

          if (Date.now() >= expiration) {
            setDepositStatus("EXPIRED");
          }
        }
      } catch (err) {
        console.error(
          "ERROR CONSULTANDO DEPÓSITO:",
          err
        );
      }
    }

    checkDepositStatus();

    const interval = window.setInterval(
      checkDepositStatus,
      5000
    );

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [created, depositId, depositStatus]);

  /*
   * COPIAR MONTO
   */

  async function copyAmount() {
    try {
      await navigator.clipboard.writeText(amount);

      setCopiedAmount(true);

      window.setTimeout(() => {
        setCopiedAmount(false);
      }, 2000);
    } catch (err) {
      console.error("ERROR COPIANDO MONTO:", err);
    }
  }

  /*
   * COPIAR DIRECCIÓN
   */

  async function copyAddress() {
    if (!selectedNetwork) return;

    try {
      await navigator.clipboard.writeText(
        selectedNetwork.address
      );

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (err) {
      console.error("ERROR COPIANDO DIRECCIÓN:", err);
    }
  }

  function formatRemainingTime(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(
      secs
    ).padStart(2, "0")}`;
  }

  /*
   * LOADING
   */

  if (loading) {
    return (
      <main className="balance-page">
        <div className="balance-background" />

        <div className="balance-loading">
          <div className="balance-loading-logo">
            🛒🎮
          </div>

          <div className="balance-spinner" />

          <p>PREPARANDO DEPÓSITO...</p>
        </div>
      </main>
    );
  }

  /*
   * ERROR
   */

  if (error && !created) {
    return (
      <main className="balance-page">
        <div className="balance-background" />

        <section className="balance-section">
          <div className="balance-card">
            <div className="balance-card-header">
              <span>⚠️</span>
              <h1>DEPÓSITO</h1>
            </div>

            <div className="deposit-error">
              {error}
            </div>

            <button
              type="button"
              className="deposit-confirm-button"
              onClick={() => router.push("/balance")}
            >
              VOLVER A MI BILLETERA
              <span>→</span>
            </button>
          </div>
        </section>
      </main>
    );
  }

  /*
   * PANTALLA PARA INTRODUCIR CANTIDAD
   */

  if (!created && selectedNetwork) {
    return (
      <main className="balance-page">
        <div className="balance-background" />

        <section className="balance-section">
          <div className="balance-card deposit-input-card">

            <div className="deposit-verify-logo">
              <UsdtLogo />
            </div>

            <div className="deposit-verify-content">
              <h1>INGRESAR BALANCE</h1>

              <p>
                Introduce la cantidad de USDT
                que deseas depositar.
              </p>
            </div>

            <div className="exchange-rate-card">
              <span className="exchange-rate-icon">
                ⇄
              </span>

              <div>
                <small>TASA DE CAMBIO</small>

                <strong>
                  1 USDT = 1 BALANCE
                </strong>

                <span>
                  Tu depósito se convierte
                  automáticamente.
                </span>
              </div>
            </div>

            <div className="deposit-network-badge deposit-network-badge-compact">
              <span>{selectedNetwork.name}</span>
            </div>

            <div className="deposit-input-group">
              <label htmlFor="deposit-amount">
                CANTIDAD A INGRESAR
              </label>

              <div className="deposit-input-wrapper">
                <input
                  id="deposit-amount"
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  placeholder="Ejemplo: 10"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setError("");
                  }}
                />

                <span>USDT</span>
              </div>
            </div>

            <div className="deposit-calculation-card">
              <span>RECIBIRÁS EN TU BALANCE</span>

              <strong>
                {balanceToReceive.toLocaleString(
                  "en-US",
                  {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }
                )}
              </strong>

              <small>
                1 USDT equivale a 1 balance
              </small>
            </div>

            {error && (
              <div className="deposit-error">
                {error}
              </div>
            )}

            <button
              type="button"
              className="deposit-confirm-button"
              disabled={
                !amount ||
                !Number.isFinite(numericAmount) ||
                numericAmount <= 0
              }
              onClick={() => {
                if (
                  !Number.isFinite(Number(amount)) ||
                  Number(amount) <= 0
                ) {
                  setError(
                    "Introduce una cantidad válida."
                  );
                  return;
                }

                setError("");
                setCreated(false);

                // Continuar a la verificación.
                setCreated(false);

                // La cantidad ya está preparada.
                setDepositStatus("PENDING");

                // Mostrar confirmación previa.
                setShowVerification(true);
              }}
            >
              CONTINUAR
              <span>→</span>
            </button>

            <button
              type="button"
              className="deposit-back-button"
              onClick={() => router.push("/balance")}
            >
              CANCELAR
            </button>

            <style jsx global>{`
              .deposit-input-card {
                background:
                  linear-gradient(145deg, rgba(255,255,255,.045), rgba(255,255,255,.015)),
                  #0b0b0b;
                border: 1px solid rgba(38,161,123,.24);
                box-shadow: 0 24px 70px rgba(0,0,0,.5);
              }

              .exchange-rate-card {
                display: flex;
                align-items: center;
                gap: 15px;
                padding: 17px;
                margin: 18px 0;
                border-radius: 17px;
                border: 1px solid rgba(38,161,123,.35);
                background: linear-gradient(135deg, rgba(38,161,123,.17), rgba(38,161,123,.045));
              }

              .exchange-rate-icon {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 48px;
                height: 48px;
                flex-shrink: 0;
                border-radius: 14px;
                background: rgba(38,161,123,.2);
                color: #48d6a6;
                font-size: 28px;
                font-weight: 900;
              }

              .exchange-rate-card div {
                display: flex;
                flex-direction: column;
                gap: 5px;
              }

              .exchange-rate-card small {
                color: #8d9e97;
                font-size: 10px;
                font-weight: 900;
                letter-spacing: .12em;
              }

              .exchange-rate-card strong {
                color: #45d4a3;
                font-size: 19px;
                font-weight: 950;
              }

              .exchange-rate-card div span {
                color: #aaa;
                font-size: 11px;
              }

              .deposit-input-group {
                margin: 22px 0 15px;
              }

              .deposit-input-group label {
                display: block;
                margin-bottom: 10px;
                color: #ddd;
                font-size: 11px;
                font-weight: 900;
                letter-spacing: .08em;
              }

              .deposit-input-wrapper {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 5px 15px;
                min-height: 60px;
                border-radius: 14px;
                border: 1px solid rgba(38,161,123,.32);
                background: #070707;
              }

              .deposit-input-wrapper input {
                width: 100%;
                min-width: 0;
                background: transparent;
                border: 0;
                outline: none;
                color: #fff;
                font-size: 22px;
                font-weight: 900;
              }

              .deposit-input-wrapper input::placeholder {
                color: #555;
              }

              .deposit-input-wrapper input::-webkit-inner-spin-button,
              .deposit-input-wrapper input::-webkit-outer-spin-button {
                opacity: 1;
              }

              .deposit-input-wrapper > span {
                color: #26a17b;
                font-size: 13px;
                font-weight: 950;
              }

              .deposit-calculation-card {
                display: flex;
                flex-direction: column;
                gap: 7px;
                padding: 17px;
                margin-bottom: 18px;
                border-radius: 15px;
                background: rgba(255,255,255,.035);
                border: 1px solid rgba(255,255,255,.09);
              }

              .deposit-calculation-card span {
                color: #999;
                font-size: 10px;
                font-weight: 900;
                letter-spacing: .08em;
              }

              .deposit-calculation-card strong {
                color: #45d4a3;
                font-size: 29px;
                font-weight: 950;
              }

              .deposit-calculation-card small {
                color: #777;
                font-size: 11px;
              }

              .deposit-confirm-button:disabled {
                opacity: .4;
                cursor: not-allowed;
                transform: none;
              }
            `}</style>

          </div>
        </section>
      </main>
    );
  }

  /*
   * PANTALLA DE VERIFICACIÓN
   */

  if (!created && selectedNetwork && showVerification) {
    return (
      <main className="balance-page">
        <div className="balance-background" />

        <section className="balance-section">
          <div className="balance-card">

            <div className="deposit-verify-logo">
              <UsdtLogo />
            </div>

            <div className="deposit-verify-content">
              <h1>Monto a depositar</h1>

              <div className="deposit-verify-amount">
                ${Number(amount).toFixed(2)} USDT
              </div>

              <p>
                Verifica cuidadosamente los datos
                antes de realizar el pago.
              </p>
            </div>

            <div className="exchange-rate-card">
              <div>
                <small>TASA DE CAMBIO</small>
                <strong>1 USDT = 1 BALANCE</strong>
              </div>
            </div>

            <div className="deposit-calculation-card">
              <span>BALANCE QUE RECIBIRÁS</span>
              <strong>
                {balanceToReceive.toFixed(2)}
              </strong>
            </div>

            <div className="deposit-network-badge deposit-network-badge-compact">
              <span>{selectedNetwork.name}</span>
            </div>

            <div className="deposit-warning">
              <span>⚠️</span>
              <p>
                Comprueba el monto y la red
                antes de continuar.
              </p>
            </div>

            {error && (
              <div className="deposit-error">
                {error}
              </div>
            )}

            <button
              type="button"
              className="deposit-confirm-button"
              onClick={createDeposit}
              disabled={creating}
            >
              {creating
                ? "CREANDO DEPÓSITO..."
                : "HE REVISADO LOS DATOS"}

              {!creating && <span>→</span>}
            </button>

            <button
              type="button"
              className="deposit-back-button"
              onClick={() => setShowVerification(false)}
            >
              MODIFICAR CANTIDAD
            </button>

          </div>
        </section>
      </main>
    );
  }

  /*
   * ESTADOS DEL DEPÓSITO
   */

  if (depositStatus === "EXPIRED") {
    return (
      <main className="balance-page">
        <div className="balance-background" />

        <section className="balance-section">
          <div className="balance-card">
            <div className="deposit-status-icon deposit-status-expired">
              ⏱️
            </div>

            <h1 className="deposit-success-title">
              DEPÓSITO EXPIRADO
            </h1>

            <p className="deposit-success-text">
              El tiempo de pago de 10 minutos ha terminado.
            </p>

            <div className="deposit-reference-text">
              ID DE DEPÓSITO:
              <br />
              <strong>{depositId}</strong>
            </div>

            <button
              type="button"
              className="deposit-confirm-button"
              onClick={() => router.push("/balance")}
            >
              VOLVER A MI BILLETERA
              <span>→</span>
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (depositStatus === "CONFIRMED") {
    return (
      <main className="balance-page">
        <div className="balance-background" />

        <section className="balance-section">
          <div className="balance-card">
            <div className="deposit-status-icon deposit-status-confirmed">
              ✓
            </div>

            <h1 className="deposit-success-title">
              DEPÓSITO COMPLETADO
            </h1>

            <p className="deposit-success-text">
              El pago fue confirmado correctamente.
            </p>

            <div className="deposit-amount-card">
              <small>MONTO ACREDITADO</small>
              <strong>${amount}</strong>
              <span>USDT</span>
            </div>

            <div className="deposit-reference-text">
              ID DE DEPÓSITO:
              <br />
              <strong>{depositId}</strong>
            </div>

            <button
              type="button"
              className="deposit-confirm-button"
              onClick={() => router.push("/balance")}
            >
              VOLVER A MI BILLETERA
              <span>→</span>
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (depositStatus === "REJECTED") {
    return (
      <main className="balance-page">
        <div className="balance-background" />

        <section className="balance-section">
          <div className="balance-card">
            <div className="deposit-status-icon deposit-status-rejected">
              ✕
            </div>

            <h1 className="deposit-success-title">
              DEPÓSITO RECHAZADO
            </h1>

            <p className="deposit-success-text">
              Este depósito no pudo ser aprobado.
            </p>

            <div className="deposit-reference-text">
              ID DE DEPÓSITO:
              <br />
              <strong>{depositId}</strong>
            </div>

            <button
              type="button"
              className="deposit-confirm-button"
              onClick={() => router.push("/balance")}
            >
              VOLVER A MI BILLETERA
              <span>→</span>
            </button>
          </div>
        </section>
      </main>
    );
  }

  /*
   * PANTALLA DE PAGO
   */

  return (
    <main className="balance-page">
      <div className="balance-background" />

      <section className="balance-section">
        <div className="balance-card deposit-payment-card">

          <div className="deposit-payment-logo-top">
            <UsdtLogo />
          </div>

          <div className="balance-card-header deposit-payment-header">
            <div className="deposit-title-content">
              <span className="deposit-title-label">
                PAGAR CON
              </span>

              <h1>DEPÓSITO USDT</h1>
            </div>

            {depositStatus === "PENDING" && (
              <div className="deposit-timer">
                <span>⏱ TIEMPO RESTANTE</span>

                <strong>
                  {formatRemainingTime(remainingSeconds)}
                  <span className="deposit-rotating-clock">
                    🕑
                  </span>
                </strong>
              </div>
            )}
          </div>

          <div className="deposit-amount-card deposit-copyable-amount">
            <small>MONTO A ENVIAR</small>

            <button
              type="button"
              className="deposit-copy-amount-button"
              onClick={copyAmount}
              aria-label="Copiar monto a enviar"
            >
              <span className="deposit-amount-value">
                <strong>${amount}</strong>
                <span>USDT</span>
              </span>

              <span className="deposit-copy-amount-label">
                {copiedAmount
                  ? "✓ COPIADO"
                  : "COPIAR MONTO"}
              </span>
            </button>
          </div>

          <div className="deposit-network-badge">
            <div>
              <span className="deposit-network-label">
                RED DE PAGO
              </span>

              <strong>{selectedNetwork?.name}</strong>
            </div>
          </div>

          <div className="deposit-order-reference">
            <span>REFERENCIA DEL PEDIDO</span>
            <strong>{orderNumber}</strong>
          </div>

          <div className="deposit-payment-section">
            <div className="deposit-payment-section-title">
              <span>01</span>

              <div>
                <strong>DIRECCIÓN DE PAGO</strong>
                <small>Envía el monto a esta dirección</small>
              </div>
            </div>

            <div className="deposit-address-box">
              <div className="deposit-address-content">
                <span>{selectedNetwork?.address}</span>
              </div>

              <button
                type="button"
                onClick={copyAddress}
                className="deposit-copy-button"
              >
                {copied ? "✓ COPIADO" : "COPIAR"}
              </button>
            </div>
          </div>

          <div className="deposit-payment-section">
            <div className="deposit-payment-section-title">
              <span>02</span>

              <div>
                <strong>CÓDIGO QR</strong>
                <small>Escanea para realizar el pago</small>
              </div>
            </div>

            <div className="deposit-qr-box">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(
                  selectedNetwork?.address || ""
                )}`}
                alt={`QR ${selectedNetwork?.name}`}
              />
            </div>
          </div>

          <div className="deposit-warning">
            <span>⚠️</span>

            <div>
              <strong>IMPORTANTE</strong>

              <p>
                Envía exactamente{" "}
                <b>${amount} USDT</b>{" "}
                utilizando la red{" "}
                <b>{selectedNetwork?.name}</b>.
                <br />
                <br />
                No utilices otra red.
                Una transferencia enviada por
                una red incorrecta puede perderse.
              </p>
            </div>
          </div>

          <div className="deposit-reference-text">
            <span>ID DE DEPÓSITO</span>
            <strong>{depositId}</strong>
          </div>

          <div className="deposit-pending-message">
            <span>🔎</span>

            <div>
              <strong>ESPERANDO EL PAGO</strong>

              <p>
                Estamos esperando la confirmación
                del depósito.
                <br />
                No cierres esta página hasta
                completar la transferencia.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="deposit-confirm-button"
            onClick={() => router.push("/balance")}
          >
            VOLVER A MI BILLETERA
            <span>→</span>
          </button>

        </div>
      </section>

      <style jsx global>{`
        .balance-page {
          min-height: 100vh;
          background:
            radial-gradient(circle at 50% 0%, rgba(38,161,123,.13), transparent 38%),
            linear-gradient(180deg, #0b0b0b 0%, #050505 100%);
          color: #fff;
        }

        .balance-page .deposit-payment-card,
        .balance-page .deposit-input-card {
          background:
            linear-gradient(145deg, rgba(255,255,255,.045), rgba(255,255,255,.015)),
            #0b0b0b;
          border: 1px solid rgba(38,161,123,.22);
          box-shadow:
            0 24px 70px rgba(0,0,0,.55),
            0 0 35px rgba(38,161,123,.08);
        }

        .balance-page .deposit-payment-header {
          border-bottom: 1px solid rgba(255,255,255,.08);
        }

        .balance-page .deposit-network-badge {
          background: linear-gradient(145deg, rgba(38,161,123,.12), rgba(255,255,255,.025));
          border: 1px solid rgba(38,161,123,.25);
        }

        .balance-page .deposit-amount-card {
          background: linear-gradient(145deg, rgba(38,161,123,.11), rgba(255,255,255,.025));
          border: 1px solid rgba(38,161,123,.22);
        }

        .balance-page .deposit-amount-value strong {
          color: #fff;
        }

        .balance-page .deposit-amount-value span,
        .balance-page .deposit-order-reference strong,
        .balance-page .deposit-reference-text strong {
          color: #26a17b;
        }

        .balance-page .deposit-order-reference,
        .balance-page .deposit-reference-text {
          background: rgba(255,255,255,.025);
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 14px;
        }

        .balance-page .deposit-payment-section {
          background: rgba(255,255,255,.018);
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 18px;
          padding: 16px;
        }

        .balance-page .deposit-payment-section-title {
          margin-bottom: 14px;
        }

        .balance-page .deposit-payment-section-title > span {
          background: rgba(38,161,123,.13);
          color: #26a17b;
          border: 1px solid rgba(38,161,123,.2);
        }

        .balance-page .deposit-address-box {
          background: #070707;
          border: 1px solid rgba(38,161,123,.22);
          border-radius: 14px;
          padding: 12px;
        }

        .balance-page .deposit-address-content span {
          color: #ddd;
          word-break: break-all;
          font-size: 13px;
          line-height: 1.5;
        }

        .balance-page .deposit-copy-button {
          background: #26a17b;
          color: #04120d;
          border: 0;
          font-weight: 900;
          border-radius: 10px;
        }

        .balance-page .deposit-qr-box {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 18px;
          background: #fff;
          border-radius: 18px;
          border: 3px solid rgba(38,161,123,.42);
        }

        .balance-page .deposit-qr-box img {
          display: block;
          width: min(100%, 330px);
          height: auto;
          aspect-ratio: 1;
          object-fit: contain;
          border-radius: 8px;
        }

        .balance-page .deposit-warning {
          background: rgba(245,158,11,.055);
          border: 1px solid rgba(245,158,11,.18);
          border-radius: 16px;
        }

        .balance-page .deposit-pending-message {
          background: rgba(38,161,123,.055);
          border: 1px solid rgba(38,161,123,.18);
          border-radius: 16px;
        }

        .balance-page .deposit-pending-message strong {
          color: #26a17b;
        }

        .balance-page .deposit-confirm-button {
          background: linear-gradient(135deg, #26a17b, #147a5c);
          border: 1px solid rgba(75,220,171,.45);
          box-shadow:
            0 14px 32px rgba(38,161,123,.18),
            inset 0 1px rgba(255,255,255,.16);
        }

        .balance-page .deposit-timer {
          background: rgba(38,161,123,.08);
          border: 1px solid rgba(38,161,123,.18);
          border-radius: 12px;
          padding: 9px 12px;
        }

        .balance-page .deposit-timer strong {
          color: #26a17b;
        }

        .balance-page .deposit-back-button {
          margin-top: 10px;
          width: 100%;
          min-height: 48px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,.12);
          background: rgba(255,255,255,.045);
          color: #d9d9d9;
          font-weight: 900;
          letter-spacing: .04em;
        }

        .balance-page .deposit-verify-logo,
        .balance-page .deposit-payment-logo-top {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          margin: 2px auto 16px;
        }

        .balance-page .deposit-verify-logo .usdt-logo,
        .balance-page .deposit-payment-logo-top .usdt-logo {
          width: 72px;
          height: 72px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          overflow: hidden;
          background: #26a17b;
          box-shadow: 0 0 30px rgba(38,161,123,.25);
        }

        .balance-page .deposit-verify-logo .usdt-logo img,
        .balance-page .deposit-payment-logo-top .usdt-logo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .balance-page .deposit-verify-content {
          text-align: center;
          margin-bottom: 18px;
        }

        .balance-page .deposit-verify-content h1 {
          margin: 0 0 8px;
          font-size: 24px;
          font-weight: 950;
          color: #fff;
        }

        .balance-page .deposit-verify-amount {
          color: #26a17b;
          font-size: 25px;
          font-weight: 950;
          margin-bottom: 10px;
        }

        .balance-page .deposit-verify-content p {
          max-width: 520px;
          margin: 0 auto;
          color: #aaa;
          line-height: 1.55;
          font-size: 14px;
        }

        .balance-page .deposit-network-badge-compact {
          justify-content: center;
          margin-bottom: 14px;
        }

        .balance-page .deposit-copyable-amount {
          padding-bottom: 12px;
        }

        .balance-page .deposit-copy-amount-button {
          width: 100%;
          border: 0;
          background: transparent;
          color: inherit;
          cursor: pointer;
          padding: 4px 0 0;
          text-align: left;
        }

        .balance-page .deposit-copy-amount-button .deposit-amount-value {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          width: 100%;
        }

        .balance-page .deposit-copy-amount-label {
          display: inline-flex;
          margin-top: 10px;
          padding: 7px 10px;
          border-radius: 9px;
          background: rgba(38,161,123,.09);
          color: #26a17b;
          font-size: 10px;
          font-weight: 950;
        }

        .balance-page .deposit-rotating-clock {
          display: inline-block;
          margin-left: 8px;
          animation: depositClockSpin 1.2s linear infinite;
        }

        @keyframes depositClockSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media (max-width: 600px) {
          .balance-page .deposit-payment-card {
            border-radius: 20px;
          }

          .balance-page .deposit-payment-header {
            gap: 10px;
            flex-wrap: wrap;
          }

          .balance-page .deposit-timer {
            width: 100%;
          }

          .balance-page .deposit-address-box {
            flex-direction: column;
            align-items: stretch;
          }

          .balance-page .deposit-copy-button {
            width: 100%;
            min-height: 44px;
          }

          .balance-page .deposit-qr-box {
            padding: 12px;
          }
        }
      `}</style>
    </main>
  );
}

/*
 * PÁGINA PRINCIPAL
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

            <p>PREPARANDO DEPÓSITO...</p>
          </div>
        </main>
      }
    >
      <DepositContent />
    </Suspense>
  );
}
