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

function DepositContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [amount, setAmount] = useState("");
  const [network, setNetwork] =
    useState<Network | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [creating, setCreating] =
    useState(false);

  const [depositId, setDepositId] =
    useState("");

  const [orderNumber, setOrderNumber] =
    useState("");

  const [copied, setCopied] =
    useState(false);

  const [error, setError] =
    useState("");

  const [created, setCreated] =
    useState(false);

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

  /*
   * =========================================================
   * INICIALIZAR DEPÓSITO
   * =========================================================
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

        if (
          sessionError ||
          !session?.user
        ) {
          router.replace("/");
          return;
        }

        const urlAmount =
          searchParams.get("amount");

        const urlNetwork =
          searchParams.get("network");

        if (
          !urlAmount ||
          !urlNetwork
        ) {
          setError(
            "Los datos del depósito no son válidos."
          );
          setLoading(false);
          return;
        }

        const numericAmount =
          Number(urlAmount);

        if (
          !Number.isFinite(numericAmount) ||
          numericAmount <= 0
        ) {
          setError(
            "El monto del depósito no es válido."
          );
          setLoading(false);
          return;
        }

        const normalizedNetwork =
          urlNetwork.toUpperCase() as Network;

        if (
          !NETWORKS[normalizedNetwork]
        ) {
          setError(
            "La red seleccionada no es válida."
          );
          setLoading(false);
          return;
        }

        setAmount(
          numericAmount.toFixed(2)
        );

        setNetwork(
          normalizedNetwork
        );

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
   * =========================================================
   * CREAR DEPÓSITO
   * =========================================================
   */

  async function createDeposit() {
    if (
      creating ||
      created
    ) {
      return;
    }

    try {
      setCreating(true);
      setError("");

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (
        sessionError ||
        !session?.user
      ) {
        router.replace("/");
        return;
      }

      if (
        !network ||
        !selectedNetwork
      ) {
        setError(
          "Selecciona una red válida."
        );
        return;
      }

      const numericAmount =
        Number(amount);

      if (
        !Number.isFinite(numericAmount) ||
        numericAmount <= 0
      ) {
        setError(
          "El monto del depósito no es válido."
        );
        return;
      }

      /*
       * Obtener nombre de usuario desde
       * el correo de la cuenta.
       */
      const email =
        session.user.email || "";

      const username =
        email
          .split("@")[0]
          .replace(/^@/, "");

      /*
       * Referencia visible del depósito.
       */
      const generatedOrderNumber =
        `DEP-${Date.now()
          .toString()
          .slice(-8)}`;

      /*
       * La expiración se calcula ahora.
       */
      const expiration =
        new Date(
          Date.now() +
            DEPOSIT_DURATION_MS
        ).toISOString();

      /*
       * IMPORTANTE:
       *
       * El balance NO se modifica aquí.
       *
       * Solo se crea el depósito
       * con estado PENDING.
       */
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
          payment_method:
            "CRYPTO",
          network,
          wallet_address:
            selectedNetwork.address,
          tx_hash: null,
          status: "PENDING",
          expires_at: expiration,
        })
        .select(
          `
          id,
          created_at,
          expires_at,
          status
          `
        )
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
        generatedOrderNumber
      );

      setExpiresAt(
        new Date(
          data.expires_at
        ).getTime()
      );

      setDepositStatus(
        "PENDING"
      );

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
   * =========================================================
   * CONTADOR DE 10 MINUTOS
   * =========================================================
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
      const now =
        Date.now();

      const difference =
        expiresAt - now;

      if (difference <= 0) {
        setRemainingSeconds(0);

        /*
         * La expiración definitiva debe
         * quedar protegida también en servidor.
         *
         * Aquí solamente actualizamos
         * la interfaz inmediatamente.
         */
        setDepositStatus(
          "EXPIRED"
        );

        return;
      }

      setRemainingSeconds(
        Math.ceil(
          difference / 1000
        )
      );
    }

    updateTimer();

    const timer =
      window.setInterval(
        updateTimer,
        1000
      );

    return () => {
      window.clearInterval(timer);
    };
  }, [
    created,
    expiresAt,
    depositStatus,
  ]);

  /*
   * =========================================================
   * COMPROBAR ESTADO DEL DEPÓSITO
   * =========================================================
   *
   * Por ahora solamente consulta el estado
   * guardado en Supabase.
   *
   * Más adelante nuestro backend será quien
   * compruebe automáticamente la blockchain.
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
          .select(
            `
            status,
            expires_at
            `
          )
          .eq(
            "id",
            depositId
          )
          .single();

        if (
          cancelled ||
          statusError ||
          !data
        ) {
          return;
        }

        const status =
          String(
            data.status
          ).toUpperCase();

        if (
          status ===
          "CONFIRMED"
        ) {
          setDepositStatus(
            "CONFIRMED"
          );
          return;
        }

        if (
          status ===
          "REJECTED"
        ) {
          setDepositStatus(
            "REJECTED"
          );
          return;
        }

        if (
          status ===
          "EXPIRED"
        ) {
          setDepositStatus(
            "EXPIRED"
          );
          return;
        }

        if (
          data.expires_at
        ) {
          const expiration =
            new Date(
              data.expires_at
            ).getTime();

          if (
            Date.now() >=
            expiration
          ) {
            setDepositStatus(
              "EXPIRED"
            );
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

    const interval =
      window.setInterval(
        checkDepositStatus,
        5000
      );

    return () => {
      cancelled = true;

      window.clearInterval(
        interval
      );
    };
  }, [
    created,
    depositId,
    depositStatus,
  ]);

  /*
   * =========================================================
   * COPIAR DIRECCIÓN
   * =========================================================
   */

  async function copyAddress() {
    if (
      !selectedNetwork
    ) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        selectedNetwork.address
      );

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (err) {
      console.error(
        "ERROR COPIANDO DIRECCIÓN:",
        err
      );
    }
  }

  /*
   * =========================================================
   * FORMATO DEL CONTADOR
   * =========================================================
   */

  function formatRemainingTime(
    seconds: number
  ) {
    const minutes =
      Math.floor(
        seconds / 60
      );

    const secs =
      seconds % 60;

    return `${String(
      minutes
    ).padStart(2, "0")}:${String(
      secs
    ).padStart(2, "0")}`;
  }

  /*
   * =========================================================
   * LOADING
   * =========================================================
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

          <p>
            PREPARANDO DEPÓSITO...
          </p>
        </div>
      </main>
    );
  }

  /*
   * =========================================================
   * ERROR
   * =========================================================
   */

  if (error) {
    return (
      <main className="balance-page">
        <div className="balance-background" />

        <section className="balance-section">
          <div className="balance-card">

            <div className="balance-card-header">
              <span>
                ⚠️
              </span>

              <h1>
                DEPÓSITO
              </h1>
            </div>

            <div className="deposit-error">
              {error}
            </div>

            <button
              type="button"
              className="deposit-confirm-button"
              onClick={() =>
                router.push(
                  "/balance"
                )
              }
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
   * =========================================================
   * PANTALLA ANTES DE CREAR EL DEPÓSITO
   * =========================================================
   */

  if (
    !created ||
    !selectedNetwork
  ) {
    return (
      <main className="balance-page">
        <div className="balance-background" />

        <section className="balance-section">

          <div className="balance-card">

            <div className="balance-card-header">
              <span>
                ₮
              </span>

              <h1>
                DEPÓSITO USDT
              </h1>
            </div>

            <div className="deposit-amount-card">

              <small>
                MONTO
              </small>

              <strong>
                ${amount}
              </strong>

              <span>
                USDT
              </span>

            </div>

            <div className="deposit-network-badge">
              ₮ {selectedNetwork.name}
            </div>

            <div className="deposit-warning">

              <span>
                ⚠️
              </span>

              <p>
                Verifica cuidadosamente
                la red y el monto antes
                de continuar.
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

              {!creating && (
                <span>
                  →
                </span>
              )}
            </button>

            <button
              type="button"
              className="deposit-back-button"
              onClick={() =>
                router.push(
                  "/balance"
                )
              }
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
   * DEPÓSITO EXPIRADO
   * =========================================================
   */

  if (
    depositStatus ===
    "EXPIRED"
  ) {
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
              El tiempo de pago de
              10 minutos ha terminado.
            </p>

            <div className="deposit-reference-text">
              ID DE DEPÓSITO:
              <br />
              <strong>
                {depositId}
              </strong>
            </div>

            <button
              type="button"
              className="deposit-confirm-button"
              onClick={() =>
                router.push(
                  "/balance"
                )
              }
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
   * =========================================================
   * DEPÓSITO CONFIRMADO
   * =========================================================
   */

  if (
    depositStatus ===
    "CONFIRMED"
  ) {
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
              El pago fue confirmado
              correctamente.
            </p>

            <div className="deposit-amount-card">

              <small>
                MONTO ACREDITADO
              </small>

              <strong>
                ${amount}
              </strong>

              <span>
                USDT
              </span>

            </div>

            <div className="deposit-reference-text">
              ID DE DEPÓSITO:
              <br />
              <strong>
                {depositId}
              </strong>
            </div>

            <button
              type="button"
              className="deposit-confirm-button"
              onClick={() =>
                router.push(
                  "/balance"
                )
              }
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
   * =========================================================
   * DEPÓSITO RECHAZADO
   * =========================================================
   */

  if (
    depositStatus ===
    "REJECTED"
  ) {
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
              Este depósito no pudo
              ser aprobado.
            </p>

            <div className="deposit-reference-text">
              ID DE DEPÓSITO:
              <br />
              <strong>
                {depositId}
              </strong>
            </div>

            <button
              type="button"
              className="deposit-confirm-button"
              onClick={() =>
                router.push(
                  "/balance"
                )
              }
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
   *=========================================================
   * PANTALLA DE PAGO
   * =========================================================
   */

  return (
    <main className="balance-page">

      <div className="balance-background" />

      <section className="balance-section">

        <div className="balance-card">

          <div className="balance-card-header">

            <span>
              ₮
            </span>

            <h1>
              DEPÓSITO USDT
            </h1>

          </div>

          <div className="deposit-amount-card">

            <small>
              MONTO
            </small>

            <strong>
              ${amount}
            </strong>

            <span>
              USDT
            </span>

          </div>

          <div className="deposit-network-badge">
            ₮ {selectedNetwork?.name}
          </div>

          <div className="deposit-order-reference">

            <span>
              REFERENCIA
            </span>

            <strong>
              {orderNumber}
            </strong>

          </div>

          {depositStatus ===
            "PENDING" && (
            <div className="deposit-timer">

              <span>
                ⏱️ TIEMPO RESTANTE
              </span>

              <strong>
                {formatRemainingTime(
                  remainingSeconds
                )}
              </strong>

            </div>
          )}

          <div className="deposit-address-box">

            <span>
              {selectedNetwork?.address}
            </span>

            <button
              type="button"
              onClick={copyAddress}
              className="deposit-copy-button"
            >
              {copied
                ? "✓ COPIADO"
                : "COPIAR"}
            </button>

          </div>

          <div className="deposit-qr-box">

            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(
                selectedNetwork?.address ||
                  ""
              )}`}
              alt={`QR ${selectedNetwork?.name}`}
            />

          </div>

          <div className="deposit-warning">

            <span>
              ⚠️
            </span>

            <p>
              Envía exactamente{" "}
              <strong>
                ${amount} USDT
              </strong>{" "}
              utilizando la red{" "}
              <strong>
                {selectedNetwork?.name}
              </strong>
              .
              <br />
              <br />
              No utilices otra red.
              Una transferencia enviada
              por una red incorrecta puede
              perderse.
            </p>

          </div>

          <div className="deposit-reference-text">

            ID DE DEPÓSITO:
            <br />

            <strong>
              {depositId}
            </strong>

          </div>

          <div className="deposit-pending-message">

            <span>
              🔎
            </span>

            <p>
              Estamos esperando la
              confirmación del pago.
              <br />
              No cierres esta página
              hasta completar la transferencia.
            </p>

          </div>

          <button
            type="button"
            className="deposit-confirm-button"
            onClick={() =>
              router.push(
                "/balance"
              )
            }
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
 * DepositContent utiliza useSearchParams(),
 * por eso debe estar dentro de Suspense
 * en Next.js 14.
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
