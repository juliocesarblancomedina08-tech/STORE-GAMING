"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type Network = "BEP20";

export default function BalancePage() {
  const router = useRouter();

  const [balance, setBalance] = useState<number>(0);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);

  // DEPÓSITO
  const [showDeposit, setShowDeposit] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [selectedNetwork] = useState<Network>("BEP20");
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
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        router.replace("/");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  function openDeposit() {
    setDepositAmount("");
    setDepositError("");
    setShowDeposit(true);
  }

  function closeDeposit() {
    setShowDeposit(false);
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
          <div className="balance-loading-logo">🛒🎮</div>
          <div className="balance-spinner" />
          <p>CARGANDO BILLETERA...</p>
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
          <small>STORE GAMING</small>

          <h1>
            MI <span>BILLETERA</span>
          </h1>
        </div>

        <div className="balance-header-icon">💰</div>
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
              <small>CUENTA</small>
              <strong>{email}</strong>
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
            <strong>INSERTAR BALANCE</strong>
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
              Tu balance está vinculado exclusivamente
              a tu cuenta de STORE GAMING.
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
      {/* VENTANA INFERIOR — INSERTAR BALANCE */}
      {/* ===================================================== */}

      {showDeposit && (
        <div
          className="deposit-sheet-overlay"
          onClick={closeDeposit}
        >
          <section
            className="deposit-sheet"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            {/* INDICADOR SUPERIOR */}
            <div className="deposit-sheet-handle" />

            {/* CABECERA */}
            <div className="deposit-sheet-header">
              <div>
                <small>STORE GAMING</small>

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
                INSERTAR BALANCE
              </label>

              <div className="deposit-amount-input">
                <span>$</span>

                <input
                  id="deposit-amount"
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  placeholder="00000"
                  value={depositAmount}
                  onChange={(event) => {
                    setDepositAmount(
                      event.target.value
                    );
                    setDepositError("");
                  }}
                />

                <span>USD</span>
              </div>
            </div>

            {/* MÉTODO DE PAGO */}
            <div className="deposit-networks-section deposit-single-method">
              <div className="deposit-networks-title">
                <strong>MÉTODO DE PAGO</strong>
                <span>USDT</span>
              </div>

              <div className="deposit-networks">

                {/* USDT BEP20 */}
                <div className="deposit-network-card selected">

                  <div className="deposit-network-icon tether-logo">
                    <img
                      src="/images/usdt-logo.png"
                      alt="Tether USDT"
                    />
                  </div>

                  <div className="deposit-network-info">
                    <strong>
                      Tether USD
                    </strong>

                    <span>
                      BNB Smart Chain · BEP-20
                    </span>
                  </div>

                  <div className="deposit-network-check">
                    ✓
                  </div>
                </div>

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
              <span>→</span>
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
              <span>🛡️</span>

              <p>
                Envía únicamente USDT por la red
                BNB Smart Chain (BEP-20).
                Verifica la red antes de confirmar
                el depósito.
              </p>
            </div>
          </section>
        </div>
      )}

      {/* ESTILOS ESPECÍFICOS DEL DEPÓSITO */}
      <style jsx global>{`

        .balance-page .deposit-sheet {
          background:
            radial-gradient(
              circle at 50% 0%,
              rgba(38,161,123,.13),
              transparent 34%
            ),
            linear-gradient(
              180deg,
              #151515 0%,
              #050505 100%
            );

          border:1px solid rgba(38,161,123,.18);

          box-shadow:
            0 -28px 80px rgba(0,0,0,.85),
            0 -4px 30px rgba(38,161,123,.10);
        }

        .balance-page .deposit-sheet-header h2 span {
          color:#26a17b;
        }

        .balance-page .deposit-amount-wrapper {
          border:1px solid rgba(255,255,255,.12);

          background:
            linear-gradient(
              145deg,
              #181818,
              #080808
            );

          box-shadow:
            inset 0 1px rgba(255,255,255,.04),
            0 12px 28px rgba(0,0,0,.35);
        }

        .balance-page .deposit-amount-wrapper label {
          color:#fff;
          letter-spacing:.7px;
          font-weight:950;
        }

        .balance-page .deposit-amount-input {
          display:flex;
          align-items:center;
          gap:10px;

          min-height:58px;
          padding:0 15px;

          border-radius:14px;

          background:#0b0b0b;

          border:1px solid rgba(255,255,255,.08);
        }

        .balance-page .deposit-amount-input input {
          flex:1;
          min-width:0;

          background:transparent;
          border:0;
          outline:0;

          color:#fff;

          font-size:21px;
          font-weight:900;
        }

        .balance-page
        .deposit-amount-input
        input::placeholder {
          color:#555;
          opacity:1;
        }

        .balance-page
        .deposit-amount-input
        > span:first-child {
          color:#26a17b;
          font-weight:950;
        }

        .balance-page
        .deposit-amount-input
        > span:last-child {
          color:#26a17b;
          font-size:10px;
          font-weight:950;
        }

        .balance-page
        .deposit-single-method
        .deposit-network-card {
          min-height:78px;

          border-color:
            rgba(38,161,123,.42);

          background:
            linear-gradient(
              145deg,
              rgba(38,161,123,.12),
              #0a0a0a
            );

          box-shadow:
            0 12px 28px rgba(0,0,0,.38),
            0 0 18px rgba(38,161,123,.08);
        }

        .balance-page .tether-logo {
          width:48px;
          height:48px;
          flex:0 0 48px;

          display:flex;
          align-items:center;
          justify-content:center;

          border-radius:50%;

          background:#26a17b;

          border:2px solid
            rgba(255,255,255,.12);

          box-shadow:
            0 0 18px
            rgba(38,161,123,.28);

          overflow:hidden;
        }

        .balance-page .tether-logo img {
          width:100%;
          height:100%;

          object-fit:contain;

          padding:7px;
        }

        .balance-page
        .deposit-network-info
        strong {
          font-size:14px;
        }

        .balance-page
        .deposit-network-info
        span {
          color:#26a17b;
          font-weight:800;
        }

        .balance-page .deposit-network-check {
          width:28px;
          height:28px;

          border-radius:50%;

          display:flex;
          align-items:center;
          justify-content:center;

          background:#26a17b;

          color:#03140f;

          font-weight:950;
        }

        .balance-page
        .deposit-confirm-button {
          background:
            linear-gradient(
              135deg,
              #26a17b,
              #147a5c
            );

          border-color:
            rgba(75,220,171,.55);

          box-shadow:
            0 14px 32px
            rgba(38,161,123,.22),
            inset 0 1px
            rgba(255,255,255,.16);
        }

        .balance-page
        .deposit-sheet-security {
          border-color:
            rgba(38,161,123,.12);

          background:
            rgba(38,161,123,.045);
        }

      `}</style>
    </main>
  );
  }
