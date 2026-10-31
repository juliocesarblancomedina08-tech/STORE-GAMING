
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type PaymentMethod = "BEP20" | "saldo_cup" | "transferencia_cup";

export default function BalancePage() {
  const router = useRouter();

  const [balance, setBalance] = useState<number>(0);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);

  const [showDeposit, setShowDeposit] = useState(false);
  const [selectedMethod, setSelectedMethod] =
    useState<PaymentMethod>("BEP20");

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
    setSelectedMethod("BEP20");
    setShowDeposit(true);
  }

  function closeDeposit() {
    setShowDeposit(false);
  }

  function selectMethod(method: PaymentMethod) {
    setSelectedMethod(method);
  }

  function confirmDeposit() {
    setShowDeposit(false);

    if (selectedMethod === "BEP20") {
      // SE CONSERVA LA RUTA DEL DEPÓSITO AUTOMÁTICO EXISTENTE.
      router.push("/balance/deposit?network=BEP20");
      return;
    }

    // NUEVOS MÉTODOS CUP.
    router.push(
      `/balance/manual-deposit?method=${encodeURIComponent(
        selectedMethod
      )}`
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
              <span className="balance-label">BALANCE DISPONIBLE</span>

              <div className="balance-live">
                <span />
                CUENTA ACTIVA
              </div>
            </div>

            <div
              className="balance-wallet-symbol"
              aria-label="Billetera"
            >
              <span className="wallet-line-icon">
                <i />
                <i />
                <i />
              </span>
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
            <span className="wallet-line-icon wallet-line-icon-small">
              <i />
              <i />
              <i />
            </span>
          </span>

          <span className="insert-balance-text">
            <strong>INSERTAR BALANCE</strong>
            <small>USDT BEP20 · Saldo CUP · Transferencia CUP</small>
          </span>

          <span className="insert-balance-arrow">→</span>
        </button>

        {/* HISTORIAL */}
        <button
          type="button"
          className="balance-history-card"
          onClick={() => router.push("/balance/history")}
        >
          <div className="history-icon">▣</div>

          <div className="history-text">
            <strong>HISTORIAL DE MOVIMIENTOS</strong>
            <span>Consulta tus depósitos y movimientos</span>
          </div>

          <div className="history-arrow">→</div>
        </button>

        {/* INFORMACIÓN */}
        <div className="balance-security-card">
          <div className="security-icon">🛡️</div>

          <div>
            <strong>TU DINERO ESTÁ PROTEGIDO</strong>

            <p>
              Tu balance está vinculado exclusivamente a tu cuenta
              de STORE GAMING.
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

      {/* VENTANA INSERTAR BALANCE */}
      {showDeposit && (
        <div
          className="deposit-sheet-overlay"
          onClick={closeDeposit}
        >
          <section
            className="deposit-sheet"
            onClick={(event) => event.stopPropagation()}
          >
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

            {/* MÉTODOS DE PAGO */}
            <div className="deposit-networks-section">
              <div className="deposit-networks-title">
                <strong>SELECCIONA TU MÉTODO DE PAGO</strong>
                <span>3 MÉTODOS</span>
              </div>

              <div className="deposit-networks">

                {/* USDT BEP20 */}
                <button
                  type="button"
                  className={`deposit-network-card ${
                    selectedMethod === "BEP20" ? "selected" : ""
                  }`}
                  onClick={() => selectMethod("BEP20")}
                >
                  <div className="deposit-network-icon tether-logo">
                    <img
                      src="/images/usdt-bep20-logo.png"
                      alt="USDT BEP20"
                    />
                  </div>

                  <div className="deposit-network-info">
                    <strong>USDT BEP20</strong>
                    <span>BNB Smart Chain · Automático</span>
                  </div>

                  {selectedMethod === "BEP20" && (
                    <div className="deposit-network-check">✓</div>
                  )}
                </button>

                {/* SALDO CUP */}
                <button
                  type="button"
                  className={`deposit-network-card cup-method ${
                    selectedMethod === "saldo_cup" ? "selected" : ""
                  }`}
                  onClick={() => selectMethod("saldo_cup")}
                >
                  <div className="deposit-network-icon cup-icon">
                    💵
                  </div>

                  <div className="deposit-network-info">
                    <strong>SALDO CUP</strong>
                    <span>Depósito manual · CUP</span>
                  </div>

                  {selectedMethod === "saldo_cup" && (
                    <div className="deposit-network-check cup-check">
                      ✓
                    </div>
                  )}
                </button>

                {/* TRANSFERENCIA CUP */}
                <button
                  type="button"
                  className={`deposit-network-card cup-method ${
                    selectedMethod === "transferencia_cup"
                      ? "selected"
                      : ""
                  }`}
                  onClick={() =>
                    selectMethod("transferencia_cup")
                  }
                >
                  <div className="deposit-network-icon transfer-icon">
                    🏦
                  </div>

                  <div className="deposit-network-info">
                    <strong>TRANSFERENCIA CUP</strong>
                    <span>Transferencia bancaria · CUP</span>
                  </div>

                  {selectedMethod === "transferencia_cup" && (
                    <div className="deposit-network-check cup-check">
                      ✓
                    </div>
                  )}
                </button>
              </div>
            </div>

            {/* DESCRIPCIÓN */}
            <div className="selected-method-description">
              <span>ℹ️</span>

              <p>
                {selectedMethod === "BEP20"
                  ? "Deposita USDT mediante BNB Smart Chain."
                  : selectedMethod === "saldo_cup"
                    ? "Continúa para consultar las instrucciones y realizar tu depósito mediante Saldo CUP."
                    : "Continúa para consultar los datos bancarios y realizar tu transferencia CUP."}
              </p>
            </div>

            {/* CONFIRMAR */}
            <button
              type="button"
              className="deposit-confirm-button"
              onClick={confirmDeposit}
            >
              CONTINUAR
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
                {selectedMethod === "BEP20"
                  ? "Envía únicamente USDT por la red BNB Smart Chain (BEP-20). Verifica la red antes de confirmar."
                  : "Los depósitos CUP requieren comprobante y confirmación del administrador antes de acreditar tu balance."}
              </p>
            </div>
          </section>
        </div>
      )}

      <style jsx global>{`
        .balance-page .wallet-line-icon {
          width: 30px;
          height: 22px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          align-items: center;
          position: relative;
        }

        .balance-page .wallet-line-icon::before {
          content: "";
          position: absolute;
          left: 2px;
          right: 2px;
          top: 1px;
          height: 13px;
          border: 2px solid currentColor;
          border-radius: 4px;
        }

        .balance-page .wallet-line-icon::after {
          content: "";
          position: absolute;
          right: 2px;
          bottom: 1px;
          width: 9px;
          height: 6px;
          border: 2px solid currentColor;
          border-radius: 3px;
          background: transparent;
        }

        .balance-page .wallet-line-icon i {
          display: block;
          width: 19px;
          height: 2px;
          background: currentColor;
          border-radius: 2px;
          position: relative;
          z-index: 2;
        }

        .balance-page .wallet-line-icon-small {
          width: 26px;
          height: 20px;
        }

        .balance-page .wallet-line-icon-small::before {
          left: 1px;
          right: 1px;
          height: 12px;
        }

        .balance-page .wallet-line-icon-small::after {
          right: 1px;
        }

        .balance-page .wallet-line-icon-small i {
          width: 17px;
          height: 2px;
        }

        .balance-page .deposit-network-icon img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          padding: 5px;
        }

        .balance-page .deposit-network-icon {
          overflow: hidden;
        }

        .balance-page .insert-balance-icon,
        .balance-page .balance-wallet-symbol {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .balance-page .deposit-sheet {
          background:
            radial-gradient(
              circle at 50% 0%,
              rgba(38, 161, 123, .13),
              transparent 34%
            ),
            linear-gradient(180deg, #151515 0%, #050505 100%);
          border: 1px solid rgba(38, 161, 123, .18);
          box-shadow:
            0 -28px 80px rgba(0, 0, 0, .85),
            0 -4px 30px rgba(38, 161, 123, .10);
        }

        .balance-page .deposit-sheet-header h2 span {
          color: #26a17b;
        }

        .balance-page .deposit-networks-section {
          margin: 22px 0;
        }

        .balance-page .deposit-networks-title {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
        }

        .balance-page .deposit-networks-title strong {
          font-size: 11px;
          letter-spacing: .8px;
        }

        .balance-page .deposit-networks-title span {
          color: #999;
          font-size: 10px;
          font-weight: 900;
        }

        .balance-page .deposit-networks {
          display: flex;
          flex-direction: column;
          gap: 11px;
        }

        .balance-page .deposit-network-card {
          width: 100%;
          min-height: 78px;
          display: flex;
          align-items: center;
          gap: 13px;
          padding: 12px;
          text-align: left;
          color: #fff;
          border: 1px solid rgba(255, 255, 255, .10);
          border-radius: 13px;
          background: linear-gradient(145deg, #181818, #0a0a0a);
          cursor: pointer;
          transition: .2s ease;
        }

        .balance-page .deposit-network-card.selected {
          border-color: rgba(38, 161, 123, .65);
          background: linear-gradient(
            145deg,
            rgba(38, 161, 123, .12),
            #0a0a0a
          );
          box-shadow: 0 0 18px rgba(38, 161, 123, .09);
        }

        .balance-page .deposit-network-icon {
          width: 48px;
          height: 48px;
          flex: 0 0 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
        }

        .balance-page .tether-logo {
          background: #26a17b;
          border: 2px solid rgba(255, 255, 255, .12);
          box-shadow: 0 0 18px rgba(38, 161, 123, .28);
        }

        .balance-page .tether-logo img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          padding: 7px;
        }

        .balance-page .cup-icon {
          font-size: 25px;
          background: rgba(230, 172, 55, .14);
          border: 1px solid rgba(230, 172, 55, .35);
        }

        .balance-page .transfer-icon {
          font-size: 24px;
          background: rgba(75, 135, 230, .14);
          border: 1px solid rgba(75, 135, 230, .35);
        }

        .balance-page .deposit-network-info {
          flex: 1;
          min-width: 0;
        }

        .balance-page .deposit-network-info strong {
          display: block;
          font-size: 14px;
          font-weight: 900;
        }

        .balance-page .deposit-network-info span {
          display: block;
          margin-top: 5px;
          color: #26a17b;
          font-size: 11px;
          font-weight: 800;
        }

        .balance-page .cup-method .deposit-network-info span {
          color: #d5ad60;
        }

        .balance-page .deposit-network-check {
          width: 28px;
          height: 28px;
          flex: 0 0 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #26a17b;
          color: #03140f;
          font-weight: 950;
        }

        .balance-page .cup-check {
          background: #c99b43;
          color: #171006;
        }

        .balance-page .deposit-confirm-button {
          background: linear-gradient(135deg, #26a17b, #147a5c);
          border-color: rgba(75, 220, 171, .55);
          box-shadow:
            0 14px 32px rgba(38, 161, 123, .22),
            inset 0 1px rgba(255, 255, 255, .16);
        }

        .balance-page .selected-method-description {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 12px;
          margin: 14px 0;
          background: rgba(255, 255, 255, .035);
          border: 1px solid rgba(255, 255, 255, .07);
          border-radius: 10px;
        }

        .balance-page .selected-method-description p {
          color: #aaa;
          font-size: 11px;
          line-height: 1.6;
          margin: 0;
        }

        .balance-page .deposit-sheet-security {
          border-color: rgba(38, 161, 123, .12);
          background: rgba(38, 161, 123, .045);
        }

        @media (max-width: 480px) {
          .balance-page .deposit-network-card {
            min-height: 72px;
            padding: 10px;
          }

          .balance-page .deposit-network-icon {
            width: 42px;
            height: 42px;
            flex-basis: 42px;
          }

          .balance-page .deposit-network-info strong {
            font-size: 12px;
          }

          .balance-page .deposit-network-info span {
            font-size: 10px;
          }
        }
      `}</style>
    </main>
  );
}
