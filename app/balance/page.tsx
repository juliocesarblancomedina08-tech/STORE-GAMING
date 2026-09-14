"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type Network = "BEP20" | "TRC20" | "TON";

export default function BalancePage() {
  const router = useRouter();

  const [balance, setBalance] = useState<number>(0);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);

  // DEPÓSITO
  const [showDeposit, setShowDeposit] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [selectedNetwork, setSelectedNetwork] =
    useState<Network | null>(null);
  const [depositError, setDepositError] = useState("");

  useEffect(() => {
    async function loadBalance() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.replace("/");
        return;
      }

      setEmail(session.user.email || "usuario");

      const { data, error } = await supabase
        .from("profiles")
        .select("balance")
        .eq("id", session.user.id)
        .single();

      if (!error && data) {
        setBalance(Number(data.balance || 0));
      }

      setLoading(false);
    }

    loadBalance();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session?.user) {
          router.replace("/");
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  function openDeposit() {
    setDepositAmount("");
    setSelectedNetwork(null);
    setDepositError("");
    setShowDeposit(true);
  }

  function closeDeposit() {
    setShowDeposit(false);
    setDepositError("");
  }

  function selectNetwork(network: Network) {
    setSelectedNetwork(network);
    setDepositError("");
  }

  function confirmDeposit() {
    const numericAmount = Number(depositAmount);

    if (!depositAmount || !Number.isFinite(numericAmount)) {
      setDepositError("Introduzca el monto que desea depositar.");
      return;
    }

    if (numericAmount <= 0) {
      setDepositError("El monto debe ser mayor que 0.");
      return;
    }

    if (!selectedNetwork) {
      setDepositError("Seleccione una red para continuar.");
      return;
    }

    /*
     * Todavía no aumentamos el balance aquí.
     *
     * En el siguiente paso, la página de depósito
     * creará el registro en public.deposits y mostrará
     * la dirección y el QR correspondiente.
     */
    router.push(
      `/balance/deposit?amount=${encodeURIComponent(
        numericAmount.toFixed(2)
      )}&network=${encodeURIComponent(selectedNetwork)}`
    );
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
            CARGANDO BILLETERA...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="balance-page">
      <div className="balance-background" />

      {/* HEADER */}

      <header className="balance-header">

        <button
          type="button"
          className="balance-back-button"
          onClick={() => router.push("/home")}
          aria-label="Volver"
        >
          <span>←</span>
        </button>

        <div className="balance-header-title">
          <small>
            STORE GAMING
          </small>

          <h1>
            MI <span>BILLETERA</span>
          </h1>
        </div>

        <div className="balance-header-icon">
          💰
        </div>

      </header>

      {/* CONTENIDO */}

      <section className="balance-content">

        {/* TARJETA PRINCIPAL */}

        <div className="balance-main-card">

          <div className="balance-card-glow" />

          <div className="balance-card-top">

            <div>
              <span className="balance-label">
                BALANCE DISPONIBLE
              </span>

              <div className="balance-live">
                <span />
                CUENTA ACTIVA
              </div>
            </div>

            <div className="balance-wallet-symbol">
              ◉
            </div>

          </div>

          <div className="balance-amount">
            <span>$</span>
            {balance.toFixed(2)}
          </div>

          <div className="balance-card-bottom">

            <div>
              <small>
                CUENTA
              </small>

              <strong>
                {email}
              </strong>
            </div>

            →
          </div>

        </div>

        {/* INSERTAR BALANCE */}

        <button
          type="button"
          className="insert-balance-button"
          onClick={openDeposit}
        >
          <span className="insert-balance-icon">
            +
          </span>

          <span className="insert-balance-text">
            <strong>
              INSERTAR BALANCE
            </strong>

            <small>
              Deposita USDT en tu billetera
            </small>
          </span>

          <span className="insert-balance-arrow">
            →
          </span>
        </button>

        {/* HISTORIAL */}

        <button
          type="button"
          className="balance-history-card"
          onClick={() => router.push("/balance/history")}
        >

          <div className="history-icon">
            ▣
          </div>

          <div className="history-text">

            <strong>
              HISTORIAL DE MOVIMIENTOS
            </strong>

            <span>
              Consulta tus depósitos y movimientos
            </span>

          </div>

          <div className="history-arrow">
            →
          </div>

        </button>

        {/* INFORMACIÓN */}

        <div className="balance-security-card">

          <div className="security-icon">
            🛡️
          </div>

          <div>

            <strong>
              TU DINERO ESTÁ PROTEGIDO
            </strong>

            <p>
              Tu balance está vinculado
              exclusivamente a tu cuenta de
              STORE GAMING.
            </p>

          </div>

        </div>

        {/* VOLVER */}

        <button
          type="button"
          className="balance-home-button"
          onClick={() => router.push("/home")}
        >
          ← VOLVER A LA TIENDA
        </button>

      </section>

      {/* ===================================================== */}
      {/* VENTANA INFERIOR — INSERTAR BALANCE                   */}
      {/* ===================================================== */}

      {showDeposit && (
        <div
          className="deposit-sheet-overlay"
          onClick={closeDeposit}
        >

          <section
            className="deposit-sheet"
            onClick={(event) => event.stopPropagation()}
          >

            {/* INDICADOR SUPERIOR */}

            <div className="deposit-sheet-handle" />

            {/* CABECERA */}

            <div className="deposit-sheet-header">

              <div>
                <small>
                  STORE GAMING
                </small>

                <h2>
                  INSERTAR <span>BALANCE</span>
                </h2>
              </div>

              <button
                type="button"
                className="deposit-sheet-close"
                onClick={closeDeposit}
                aria-label="Cerrar"
              >
                ×
              </button>

            </div>

            {/* MONTO */}

            <div className="deposit-amount-wrapper">

              <label htmlFor="deposit-amount">
                MONTO A DEPOSITAR
              </label>

              <div className="deposit-amount-input">

                <span>
                  $
                </span>

                <input
                  id="deposit-amount"
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  value={depositAmount}
                  onChange={(event) => {
                    setDepositAmount(event.target.value);
                    setDepositError("");
                  }}
                />

                <span>
                  USD
                </span>

              </div>

            </div>

            {/* REDES */}

            <div className="deposit-networks-section">

              <div className="deposit-networks-title">
                <strong>
                  SELECCIONA LA RED
                </strong>

                <span>
                  USDT
                </span>
              </div>

              <div className="deposit-networks">

                {/* BEP20 */}

                <button
                  type="button"
                  className={`deposit-network-card ${
                    selectedNetwork === "BEP20"
                      ? "selected"
                      : ""
                  }`}
                  onClick={() => selectNetwork("BEP20")}
                >

                  <div className="deposit-network-icon">
                    ₮
                  </div>

                  <div className="deposit-network-info">
                    <strong>
                      USDT
                    </strong>

                    <span>
                      BEP20
                    </span>
                  </div>

                  <div className="deposit-network-check">
                    {selectedNetwork === "BEP20"
                      ? "✓"
                      : ""}
                  </div>

                </button>

                {/* TRC20 */}

                <button
                  type="button"
                  className={`deposit-network-card ${
                    selectedNetwork === "TRC20"
                      ? "selected"
                      : ""
                  }`}
                  onClick={() => selectNetwork("TRC20")}
                >

                  <div className="deposit-network-icon">
                    ₮
                  </div>

                  <div className="deposit-network-info">
                    <strong>
                      USDT
                    </strong>

                    <span>
                      TRC20
                    </span>
                  </div>

                  <div className="deposit-network-check">
                    {selectedNetwork === "TRC20"
                      ? "✓"
                      : ""}
                  </div>

                </button>

                {/* TON */}

                <button
                  type="button"
                  className={`deposit-network-card ${
                    selectedNetwork === "TON"
                      ? "selected"
                      : ""
                  }`}
                  onClick={() => selectNetwork("TON")}
                >

                  <div className="deposit-network-icon">
                    ₮
                  </div>

                  <div className="deposit-network-info">
                    <strong>
                      USDT
                    </strong>

                    <span>
                      TON
                    </span>
                  </div>

                  <div className="deposit-network-check">
                    {selectedNetwork === "TON"
                      ? "✓"
                      : ""}
                  </div>

                </button>

              </div>

            </div>

            {/* ERROR */}

            {depositError && (
              <div className="deposit-error">
                ⚠️ {depositError}
              </div>
            )}

            {/* CONFIRMAR */}

            <button
              type="button"
              className="deposit-confirm-button"
              onClick={confirmDeposit}
            >
              CONFIRMAR
              <span>
                →
              </span>
            </button>

            {/* CANCELAR */}

            <button
              type="button"
              className="deposit-cancel-button"
              onClick={closeDeposit}
            >
              CANCELAR
            </button>

            {/* AVISO */}

            <div className="deposit-sheet-security">
              <span>
                🛡️
              </span>

              <p>
                Selecciona correctamente la red antes
                de enviar tus USDT. Enviar fondos por
                una red incorrecta puede provocar la
                pérdida de los fondos.
              </p>
            </div>

          </section>

        </div>
      )}

    </main>
  );
      }
