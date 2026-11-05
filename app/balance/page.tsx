
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function BalancePage() {
  const router = useRouter();

  const [balance, setBalance] = useState<number>(0);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadBalance() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.replace("/");
        return;
      }

      if (!active) return;

      setEmail(session.user.email || "usuario");

      const { data, error } = await supabase
        .from("profiles")
        .select("balance")
        .eq("id", session.user.id)
        .single();

      if (!active) return;

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
      active = false;
      subscription.unsubscribe();
    };
  }, [router]);

  if (loading) {
    return (
      <main className="balance-page">
        <div className="balance-background" />
        <div className="balance-loading">
          <div className="balance-loading-logo">🛒🎮</div>
          <div className="balance-spinner" />
          <p>CARGANDO BILLETERA...</p>
        </div>

        <style jsx global>{styles}</style>
      </main>
    );
  }

  return (
    <main className="balance-page">
      <div className="balance-background" />

      <header className="balance-header">
        <button
          type="button"
          className="balance-back-button"
          onClick={() => router.push("/home")}
          aria-label="Volver"
        >
          ←
        </button>

        <div className="balance-header-title">
          <small>STORE GAMING</small>
          <h1>
            MI <span>BILLETERA</span>
          </h1>
        </div>

        <div className="balance-header-icon">💰</div>
      </header>

      <section className="balance-content">

        {/* TARJETA DEL BALANCE */}

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
              <small>CUENTA STORE GAMING</small>
              <strong>{email}</strong>
            </div>
            <span>✦</span>
          </div>
        </div>

        {/* ACCIONES RÁPIDAS */}

        <div className="balance-section-heading">
          <strong>ACCIONES RÁPIDAS</strong>
          <span>GESTIONA TU BILLETERA</span>
        </div>

        <div className="balance-actions">

          <button
            type="button"
            className="balance-action deposit-action"
            onClick={() => router.push("/balance/methods")}
          >
            <div className="balance-action-icon">
              <span>＋</span>
            </div>

            <strong>DEPOSITAR</strong>
            <small>Ingresar balance</small>

            <span className="balance-action-arrow">→</span>
          </button>

          <button
            type="button"
            className="balance-action history-action"
            onClick={() => router.push("/balance/history")}
          >
            <div className="balance-action-icon">
              <span>▤</span>
            </div>

            <strong>MOVIMIENTOS</strong>
            <small>Consultar historial</small>

            <span className="balance-action-arrow">→</span>
          </button>

        </div>

        {/* HISTORIAL */}

        <div className="balance-history-heading">
          <div>
            <strong>ACTIVIDAD</strong>
            <small>TUS OPERACIONES EN STORE GAMING</small>
          </div>

          <button
            type="button"
            onClick={() => router.push("/balance/history")}
          >
            VER TODO →
          </button>
        </div>

        <button
          type="button"
          className="balance-history-card"
          onClick={() => router.push("/balance/history")}
        >
          <div className="history-icon">▣</div>

          <div className="history-text">
            <strong>HISTORIAL DE MOVIMIENTOS</strong>
            <span>
              Consulta tus depósitos, compras y operaciones.
            </span>
          </div>

          <div className="history-arrow">→</div>
        </button>

        {/* SEGURIDAD */}

        <div className="balance-security-card">
          <div className="security-icon">🛡️</div>

          <div>
            <strong>TU DINERO ESTÁ PROTEGIDO</strong>
            <p>
              Tu balance está vinculado exclusivamente
              a tu cuenta de STORE GAMING.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="balance-home-button"
          onClick={() => router.push("/home")}
        >
          ← VOLVER A LA TIENDA
        </button>

      </section>

      <style jsx global>{styles}</style>
    </main>
  );
}

const styles = `
.balance-page {
  min-height: 100vh;
  position: relative;
  overflow: hidden;
  background: #050706;
  color: #fff;
  padding-bottom: 45px;
  font-family: Arial, sans-serif;
}

.balance-page .balance-background {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(ellipse at 50% 0%, rgba(38,161,123,.15), transparent 48%),
    linear-gradient(180deg, #080e0b, #050706 55%);
}

.balance-page .balance-header,
.balance-page .balance-content {
  position: relative;
  z-index: 1;
}

.balance-page .balance-header {
  max-width: 760px;
  margin: auto;
  padding: 25px 20px;
  display: flex;
  align-items: center;
  gap: 15px;
}

.balance-page .balance-back-button {
  width: 43px;
  height: 43px;
  border-radius: 13px;
  border: 1px solid #263c32;
  background: #101b15;
  color: #fff;
  font-size: 23px;
  cursor: pointer;
}

.balance-page .balance-header-title {
  flex: 1;
}

.balance-page .balance-header-title small {
  color: #26a17b;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 3px;
}

.balance-page .balance-header-title h1 {
  font-size: 22px;
  margin: 4px 0 0;
  font-weight: 950;
  letter-spacing: 1px;
}

.balance-page .balance-header-title h1 span {
  color: #26a17b;
}

.balance-page .balance-header-icon {
  font-size: 27px;
}

.balance-page .balance-content {
  max-width: 620px;
  margin: 15px auto;
  padding: 0 20px;
}

.balance-page .balance-main-card {
  position: relative;
  overflow: hidden;
  padding: 25px;
  min-height: 220px;
  border-radius: 22px;
  border: 1px solid rgba(38,161,123,.45);
  background:
    radial-gradient(circle at 90% 10%, rgba(38,161,123,.25), transparent 40%),
    linear-gradient(135deg, #142a20, #08120d 70%);
  box-shadow: 0 18px 50px rgba(0,0,0,.4), 0 0 30px rgba(38,161,123,.08);
}

.balance-page .balance-card-glow {
  position: absolute;
  width: 190px;
  height: 190px;
  right: -70px;
  bottom: -100px;
  border-radius: 50%;
  background: rgba(38,161,123,.16);
  filter: blur(35px);
}

.balance-page .balance-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.balance-page .balance-label {
  display: block;
  font-size: 11px;
  letter-spacing: 1.5px;
  color: #a4c6b5;
  font-weight: 900;
}

.balance-page .balance-live {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: 12px;
  color: #42d6a1;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 1px;
}

.balance-page .balance-live span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #32d69a;
  box-shadow: 0 0 10px #32d69a;
}

.balance-page .balance-wallet-symbol {
  width: 52px;
  height: 52px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(38,161,123,.14);
  color: #42d6a1;
  border: 1px solid rgba(38,161,123,.3);
}

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

.balance-page .balance-amount {
  margin-top: 26px;
  font-size: clamp(37px, 9vw, 49px);
  font-weight: 950;
  letter-spacing: -2px;
  position: relative;
  z-index: 1;
}

.balance-page .balance-amount span {
  color: #36c997;
  margin-right: 4px;
}

.balance-page .balance-card-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid rgba(255,255,255,.1);
  margin-top: 20px;
  padding-top: 15px;
  position: relative;
  z-index: 1;
}

.balance-page .balance-card-bottom small {
  display: block;
  color: #83a493;
  font-size: 9px;
  letter-spacing: 1px;
  margin-bottom: 5px;
}

.balance-page .balance-card-bottom strong {
  display: block;
  font-size: 12px;
  overflow-wrap: anywhere;
}

.balance-page .balance-card-bottom > span {
  color: #36c997;
  font-size: 25px;
}

.balance-page .balance-section-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 30px 2px 14px;
}

.balance-page .balance-section-heading strong,
.balance-page .balance-history-heading strong {
  font-size: 12px;
  letter-spacing: 1px;
}

.balance-page .balance-section-heading span {
  color: #718279;
  font-size: 9px;
  font-weight: 800;
}

.balance-page .balance-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.balance-page .balance-action {
  min-width: 0;
  position: relative;
  text-align: left;
  padding: 17px 14px;
  min-height: 145px;
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,.09);
  background: linear-gradient(145deg,#141c17,#0b100d);
  color: white;
  cursor: pointer;
  transition: .2s ease;
}

.balance-page .balance-action:active {
  transform: scale(.97);
}

.balance-page .deposit-action {
  border-color: rgba(38,161,123,.35);
}

.balance-page .balance-action-icon {
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: rgba(38,161,123,.16);
  color: #38d49f;
  font-size: 26px;
  margin-bottom: 15px;
}

.balance-page .history-action .balance-action-icon {
  background: rgba(86,145,235,.13);
  color: #7cafff;
  font-size: 22px;
}

.balance-page .balance-action > strong {
  display: block;
  font-size: 12px;
  font-weight: 950;
}

.balance-page .balance-action > small {
  display: block;
  margin-top: 6px;
  font-size: 10px;
  color: #829188;
}

.balance-page .balance-action-arrow {
  position: absolute;
  right: 14px;
  top: 18px;
  color: #36c997;
}

.balance-page .balance-history-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 32px 2px 13px;
}

.balance-page .balance-history-heading small {
  display: block;
  margin-top: 5px;
  font-size: 9px;
  color: #77857c;
}

.balance-page .balance-history-heading button {
  background: none;
  border: none;
  color: #36c997;
  font-size: 10px;
  font-weight: 900;
  cursor: pointer;
}

.balance-page .balance-history-card {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 17px;
  text-align: left;
  color: #fff;
  border: 1px solid rgba(255,255,255,.09);
  background: linear-gradient(145deg,#141b17,#0a0e0c);
  border-radius: 15px;
  cursor: pointer;
}

.balance-page .history-icon {
  width: 43px;
  height: 43px;
  flex: 0 0 43px;
  border-radius: 12px;
  background: rgba(38,161,123,.13);
  color: #36c997;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
}

.balance-page .history-text {
  flex: 1;
  min-width: 0;
}

.balance-page .history-text strong {
  display: block;
  font-size: 11px;
}

.balance-page .history-text span {
  display: block;
  margin-top: 5px;
  color: #89968e;
  font-size: 10px;
  line-height: 1.5;
}

.balance-page .history-arrow {
  color: #36c997;
}

.balance-page .balance-security-card {
  display: flex;
  align-items: flex-start;
  gap: 13px;
  padding: 17px;
  margin-top: 20px;
  border: 1px solid rgba(38,161,123,.18);
  background: rgba(38,161,123,.055);
  border-radius: 15px;
}

.balance-page .security-icon {
  font-size: 25px;
}

.balance-page .balance-security-card strong {
  font-size: 11px;
  color: #42d6a1;
}

.balance-page .balance-security-card p {
  margin: 7px 0 0;
  font-size: 11px;
  color: #a0aea5;
  line-height: 1.6;
}

.balance-page .balance-home-button {
  width: 100%;
  margin-top: 22px;
  padding: 15px;
  border-radius: 12px;
  border: 1px solid rgba(38,161,123,.2);
  background: #101913;
  color: #36c997;
  font-weight: 900;
  font-size: 11px;
  cursor: pointer;
}

.balance-page .balance-loading {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 15px;
}

.balance-page .balance-loading-logo {
  font-size: 40px;
}

.balance-page .balance-loading p {
  color: #36c997;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 2px;
}

.balance-page .balance-spinner {
  width: 34px;
  height: 34px;
  border: 3px solid #183126;
  border-top-color: #36c997;
  border-radius: 50%;
  animation: balanceSpin .8s linear infinite;
}

@keyframes balanceSpin {
  to { transform: rotate(360deg); }
}

@media(max-width:480px) {
  .balance-page .balance-header {
    padding: 20px 15px;
  }

  .balance-page .balance-content {
    padding: 0 15px;
  }

  .balance-page .balance-main-card {
    padding: 21px;
  }
}
`;
