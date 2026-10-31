
"use client";

import {
  useEffect,
  useState,
  type ChangeEvent,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type TransferSettings = {
  exchange_rate: number;
};

type CreatedOrder = {
  id: string;
  amount_cup: number;
  exchange_rate: number;
  balance_amount: number;
  status: string;
  created_at: string;
};

export default function TransferCupPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [settings, setSettings] =
    useState<TransferSettings | null>(null);

  const [amount, setAmount] = useState("");
  const [order, setOrder] =
    useState<CreatedOrder | null>(null);

  const [userToken, setUserToken] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          router.replace("/");
          return;
        }

        if (!active) return;

        setUserToken(session.access_token);

        const response = await fetch(
          "/api/transfer-cup/settings",
          { cache: "no-store" }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.error ||
              "No se pudo cargar la configuración."
          );
        }

        const rate = Number(
          result.exchange_rate ??
          result.settings?.exchange_rate
        );

        if (!Number.isFinite(rate) || rate <= 0) {
          throw new Error("La tasa de prueba no es válida.");
        }

        if (!active) return;

        setSettings({
          exchange_rate: rate,
        });
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "No se pudo cargar la página."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    initialize();

    return () => {
      active = false;
    };
  }, [router]);

  const cupAmount = Number(amount);

  const balanceAmount =
    settings &&
    Number.isFinite(cupAmount) &&
    cupAmount > 0
      ? Number(
          (cupAmount / settings.exchange_rate).toFixed(4)
        )
      : 0;

  function handleAmountChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    setAmount(event.target.value);
    setError("");
  }

  async function sendRequest() {
    if (sending || order) return;

    setError("");

    if (!userToken) {
      setError(
        "Tu sesión ha expirado. Inicia sesión nuevamente."
      );
      return;
    }

    if (
      !Number.isFinite(cupAmount) ||
      cupAmount <= 0
    ) {
      setError("Introduce un importe válido en CUP.");
      return;
    }

    setSending(true);

    try {
      const response = await fetch(
        "/api/transfer-cup/orders",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${userToken}`,
          },
          body: JSON.stringify({
            amount_cup: cupAmount,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
            "No se pudo registrar la solicitud."
        );
      }

      setOrder(result.order);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error al enviar la solicitud."
      );
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <main className="transfer-page">
        <div className="transfer-loading">
          <div className="transfer-spinner" />
          <p>CARGANDO TRANSFERENCIA CUP...</p>
        </div>
        <TransferStyles />
      </main>
    );
  }

  if (!settings) {
    return (
      <main className="transfer-page">
        <div className="transfer-background" />

        <section className="transfer-error">
          <h2>NO SE PUDO CARGAR</h2>
          <p>
            {error ||
              "Inténtalo nuevamente más tarde."}
          </p>

          <button
            type="button"
            onClick={() => router.push("/balance")}
          >
            VOLVER A MI BILLETERA
          </button>
        </section>

        <TransferStyles />
      </main>
    );
  }

  if (order) {
    return (
      <main className="transfer-page">
        <div className="transfer-background" />

        <section className="transfer-success">
          <div className="transfer-success-icon">
            ✓
          </div>

          <small>STORE GAMING</small>

          <h1>
            SOLICITUD <span>REGISTRADA</span>
          </h1>

          <p>
            La solicitud de prueba se registró
            correctamente en el sistema.
          </p>

          <div className="transfer-demo-notice">
            MODO DEMOSTRACIÓN
            <p>
              Este registro no representa un pago real
              y no modifica el balance de la cuenta.
            </p>
          </div>

          <div className="transfer-details">
            <div>
              <span>NÚMERO DE ORDEN</span>
              <strong className="transfer-order-id">
                {order.id}
              </strong>
            </div>

            <div>
              <span>IMPORTE DE REFERENCIA</span>
              <strong>
                {Number(order.amount_cup).toFixed(2)} CUP
              </strong>
            </div>

            <div>
              <span>TASA UTILIZADA</span>
              <strong>
                {Number(order.exchange_rate)}
              </strong>
            </div>

            <div>
              <span>CRÉDITO DE REFERENCIA</span>
              <strong>
                {Number(order.balance_amount).toFixed(4)}
              </strong>
            </div>

            <div>
              <span>ESTADO</span>
              <strong className="transfer-pending">
                {order.status.toUpperCase()}
              </strong>
            </div>

            <div>
              <span>FECHA DE REGISTRO</span>
              <strong>
                {new Date(
                  order.created_at
                ).toLocaleString()}
              </strong>
            </div>
          </div>

          <button
            type="button"
            onClick={() => router.push("/balance")}
          >
            VOLVER A MI BILLETERA
          </button>
        </section>

        <TransferStyles />
      </main>
    );
  }

  return (
    <main className="transfer-page">
      <div className="transfer-background" />

      <header className="transfer-header">
        <button
          type="button"
          className="transfer-back"
          onClick={() => router.push("/balance")}
        >
          ←
        </button>

        <div>
          <small>STORE GAMING</small>
          <h1>
            TRANSFERENCIA <span>CUP</span>
          </h1>
        </div>

        <div className="transfer-header-icon">
          ⇄
        </div>
      </header>

      <section className="transfer-content">
        <div className="transfer-intro">
          <span className="transfer-tag">
            SOLICITUD DE PRUEBA
          </span>

          <h2>TRANSFERENCIA CUP</h2>

          <p>
            Introduce un importe para registrar una
            solicitud de prueba en STORE GAMING.
          </p>
        </div>

        <div className="transfer-rate-card">
          <div>
            <small>TASA CONFIGURADA</small>
            <strong>
              1 BALANCE = {settings.exchange_rate} CUP
            </strong>
          </div>

          <span>⇄</span>
        </div>

        <div className="transfer-card">
          <label htmlFor="transfer-amount">
            IMPORTE DE REFERENCIA
          </label>

          <div className="transfer-input-wrap">
            <input
              id="transfer-amount"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="Ejemplo: 200"
              value={amount}
              onChange={handleAmountChange}
              disabled={sending}
            />

            <span>CUP</span>
          </div>

          <div className="transfer-result">
            <div>
              <small>CRÉDITO DE REFERENCIA</small>
              <strong>
                {balanceAmount.toFixed(4)}
              </strong>
            </div>

            <span>NO ACREDITABLE</span>
          </div>
        </div>

        <div className="transfer-summary">
          <h3>RESUMEN DE LA SOLICITUD</h3>

          <div>
            <span>Importe de referencia</span>
            <strong>
              {cupAmount > 0
                ? `${cupAmount.toFixed(2)} CUP`
                : "0.00 CUP"}
            </strong>
          </div>

          <div>
            <span>Tasa configurada</span>
            <strong>
              {settings.exchange_rate}
            </strong>
          </div>

          <div className="transfer-summary-total">
            <span>VALOR DE REFERENCIA</span>
            <strong>
              {balanceAmount.toFixed(4)}
            </strong>
          </div>
        </div>

        <div className="transfer-demo-notice">
          MODO DEMOSTRACIÓN
          <p>
            Al enviar se creará una orden de prueba
            en Administración. No se procesan pagos
            ni se modifica el balance.
          </p>
        </div>

        {error && (
          <div className="transfer-error-message">
            {error}
          </div>
        )}

        <button
          type="button"
          className="transfer-submit"
          onClick={sendRequest}
          disabled={
            sending ||
            !amount ||
            !Number.isFinite(cupAmount) ||
            cupAmount <= 0
          }
        >
          {sending
            ? "REGISTRANDO SOLICITUD..."
            : "ENVIAR SOLICITUD"}
          {!sending && <span>→</span>}
        </button>

        <div className="transfer-security">
          <span>ⓘ</span>
          <p>
            La orden aparecerá identificada como
            TRANSFERENCIA CUP en Administración →
            Órdenes y estará marcada como demostración.
          </p>
        </div>

        <button
          type="button"
          className="transfer-cancel"
          onClick={() => router.push("/balance")}
          disabled={sending}
        >
          CANCELAR Y VOLVER
        </button>
      </section>

      <TransferStyles />
    </main>
  );
}

function TransferStyles() {
  return (
    <style jsx global>{`
      .transfer-page {
        min-height: 100vh;
        position: relative;
        overflow: hidden;
        padding-bottom: 45px;
        background: #070707;
        color: #fff;
        font-family: Arial, Helvetica, sans-serif;
      }

      .transfer-background {
        position: absolute;
        inset: 0;
        pointer-events: none;
        background:
          radial-gradient(
            circle at 50% 0%,
            rgba(190, 25, 35, .17),
            transparent 36%
          ),
          radial-gradient(
            circle at 100% 45%,
            rgba(120, 15, 25, .08),
            transparent 35%
          );
      }

      .transfer-header {
        position: relative;
        z-index: 1;
        max-width: 650px;
        margin: auto;
        padding: 24px 18px;
        display: flex;
        align-items: center;
        gap: 15px;
        border-bottom: 1px solid rgba(255,255,255,.07);
      }

      .transfer-back {
        width: 42px;
        height: 42px;
        border: 1px solid #303030;
        border-radius: 12px;
        background: #151515;
        color: #fff;
        font-size: 24px;
        cursor: pointer;
      }

      .transfer-header small,
      .transfer-tag {
        color: #e13a45;
        font-size: 10px;
        font-weight: 900;
        letter-spacing: 2px;
      }

      .transfer-header h1 {
        margin: 4px 0 0;
        font-size: 19px;
        font-weight: 950;
      }

      .transfer-header h1 span {
        color: #ed3441;
      }

      .transfer-header-icon {
        margin-left: auto;
        color: #ed3441;
        font-size: 28px;
      }

      .transfer-content {
        position: relative;
        z-index: 1;
        width: min(100% - 28px, 600px);
        margin: 25px auto;
      }

      .transfer-intro {
        margin-bottom: 22px;
      }

      .transfer-intro h2 {
        margin: 10px 0 7px;
        font-size: 23px;
        font-weight: 950;
      }

      .transfer-intro p {
        margin: 0;
        color: #999;
        font-size: 13px;
        line-height: 1.7;
      }

      .transfer-rate-card {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 19px;
        margin-bottom: 15px;
        border: 1px solid rgba(225, 55, 66, .35);
        border-radius: 15px;
        background: linear-gradient(
          130deg,
          rgba(130, 20, 30, .24),
          #151515
        );
      }

      .transfer-rate-card small,
      .transfer-rate-card strong {
        display: block;
      }

      .transfer-rate-card small {
        color: #aaa;
        font-size: 10px;
        letter-spacing: 1px;
        margin-bottom: 8px;
      }

      .transfer-rate-card strong {
        color: #fff;
        font-size: 16px;
        font-weight: 950;
      }

      .transfer-rate-card > span {
        color: #f04450;
        font-size: 32px;
      }

      .transfer-card {
        padding: 19px;
        margin-bottom: 15px;
        border: 1px solid #292929;
        border-radius: 15px;
        background: linear-gradient(145deg, #171717, #0d0d0d);
      }

      .transfer-card > label {
        display: block;
        margin-bottom: 12px;
        color: #ddd;
        font-size: 11px;
        font-weight: 900;
      }

      .transfer-input-wrap {
        display: flex;
        align-items: center;
        border: 1px solid #3a3a3a;
        border-radius: 11px;
        background: #080808;
        padding: 0 14px;
      }

      .transfer-input-wrap:focus-within {
        border-color: #e13a45;
      }

      .transfer-input-wrap input {
        flex: 1;
        width: 100%;
        min-width: 0;
        padding: 16px 0;
        border: none;
        outline: none;
        background: transparent;
        color: #fff;
        font-size: 23px;
        font-weight: 900;
      }

      .transfer-input-wrap input::-webkit-inner-spin-button,
      .transfer-input-wrap input::-webkit-outer-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }

      .transfer-input-wrap span {
        color: #e74b56;
        font-size: 13px;
        font-weight: 900;
      }

      .transfer-result {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 16px;
        margin-top: 14px;
        border-radius: 10px;
        background: rgba(255, 190, 70, .06);
        border: 1px solid rgba(255, 190, 70, .2);
      }

      .transfer-result small,
      .transfer-result strong {
        display: block;
      }

      .transfer-result small {
        color: #aaa;
        font-size: 10px;
        margin-bottom: 6px;
      }

      .transfer-result strong {
        color: #e8bb67;
        font-size: 23px;
        font-weight: 950;
      }

      .transfer-result > span {
        color: #e8bb67;
        font-size: 9px;
        font-weight: 900;
        text-align: right;
      }

      .transfer-summary {
        padding: 18px;
        margin-bottom: 16px;
        border: 1px solid #292929;
        border-radius: 13px;
        background: #111;
      }

      .transfer-summary h3 {
        margin: 0 0 17px;
        font-size: 12px;
        font-weight: 950;
      }

      .transfer-summary > div {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        margin-top: 13px;
        color: #aaa;
        font-size: 12px;
      }

      .transfer-summary strong {
        color: #fff;
      }

      .transfer-summary .transfer-summary-total {
        padding-top: 15px;
        border-top: 1px solid #333;
        color: #eee;
        font-weight: 900;
      }

      .transfer-summary .transfer-summary-total strong {
        color: #e8bb67;
        font-size: 19px;
      }

      .transfer-demo-notice {
        padding: 14px;
        margin-bottom: 16px;
        border: 1px solid rgba(255,190,70,.2);
        border-radius: 10px;
        background: rgba(255,190,70,.06);
        color: #e8bb67;
        font-size: 11px;
        font-weight: 950;
        letter-spacing: .5px;
      }

      .transfer-demo-notice p {
        margin: 7px 0 0;
        color: #b7a98c;
        font-size: 11px;
        font-weight: 400;
        line-height: 1.6;
        letter-spacing: 0;
      }

      .transfer-error-message {
        padding: 13px;
        margin-bottom: 14px;
        border: 1px solid rgba(240,60,70,.35);
        border-radius: 9px;
        background: rgba(180,20,30,.12);
        color: #ff737c;
        font-size: 12px;
        line-height: 1.5;
      }

      .transfer-submit {
        width: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 12px;
        padding: 17px;
        border: 1px solid #ff5965;
        border-radius: 11px;
        background: linear-gradient(135deg, #d52b39, #94151f);
        box-shadow: 0 10px 28px rgba(200,25,40,.2);
        color: white;
        font-size: 12px;
        font-weight: 950;
        letter-spacing: .5px;
        cursor: pointer;
      }

      .transfer-submit:disabled {
        opacity: .45;
        cursor: not-allowed;
      }

      .transfer-submit span {
        font-size: 19px;
      }

      .transfer-security {
        display: flex;
        gap: 10px;
        align-items: flex-start;
        margin-top: 17px;
        padding: 13px;
        border-radius: 9px;
        background: rgba(255,255,255,.035);
      }

      .transfer-security > span {
        color: #e8bb67;
      }

      .transfer-security p {
        margin: 0;
        color: #999;
        font-size: 10px;
        line-height: 1.6;
      }

      .transfer-cancel {
        display: block;
        margin: 18px auto 0;
        padding: 10px;
        border: none;
        background: transparent;
        color: #888;
        font-size: 10px;
        font-weight: 900;
        cursor: pointer;
      }

      .transfer-cancel:disabled {
        opacity: .4;
      }

      .transfer-loading,
      .transfer-error {
        position: relative;
        z-index: 1;
        min-height: 75vh;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        gap: 15px;
        text-align: center;
        padding: 20px;
      }

      .transfer-loading p {
        color: #e94a55;
        font-size: 11px;
        font-weight: 900;
        letter-spacing: 2px;
      }

      .transfer-spinner {
        width: 38px;
        height: 38px;
        border: 3px solid #333;
        border-top-color: #e13a45;
        border-radius: 50%;
        animation: transfer-spin .8s linear infinite;
      }

      @keyframes transfer-spin {
        to { transform: rotate(360deg); }
      }

      .transfer-success {
        position: relative;
        z-index: 1;
        width: min(100% - 30px, 480px);
        margin: 55px auto;
        padding: 25px;
        border: 1px solid #303030;
        border-radius: 17px;
        background: linear-gradient(145deg, #181818, #090909);
        text-align: center;
      }

      .transfer-success-icon {
        width: 65px;
        height: 65px;
        display: flex;
        justify-content: center;
        align-items: center;
        margin: 0 auto 20px;
        border-radius: 50%;
        background: rgba(60,200,120,.13);
        border: 1px solid #3b9d68;
        color: #53dc91;
        font-size: 35px;
      }

      .transfer-success > small {
        color: #e54b56;
        font-weight: 900;
        letter-spacing: 2px;
      }

      .transfer-success h1 {
        font-size: 22px;
        font-weight: 950;
      }

      .transfer-success h1 span {
        color: #e84b57;
      }

      .transfer-success > p {
        color: #aaa;
        font-size: 12px;
        line-height: 1.7;
      }

      .transfer-details {
        padding: 15px;
        margin: 20px 0;
        border-radius: 11px;
        background: #0b0b0b;
        text-align: left;
      }

      .transfer-details > div {
        display: flex;
        flex-direction: column;
        gap: 5px;
        padding: 10px 0;
        border-bottom: 1px solid #292929;
      }

      .transfer-details > div:last-child {
        border: none;
      }

      .transfer-details span {
        color: #888;
        font-size: 9px;
        font-weight: 900;
      }

      .transfer-details strong {
        color: #fff;
        font-size: 14px;
      }

      .transfer-details .transfer-order-id {
        overflow-wrap: anywhere;
        font-size: 10px;
      }

      .transfer-details .transfer-pending {
        color: #e8b65c;
        font-size: 11px;
      }

      .transfer-success > button,
      .transfer-error button {
        width: 100%;
        padding: 15px;
        margin-top: 12px;
        border: 0;
        border-radius: 9px;
        background: linear-gradient(135deg, #d52b39, #94151f);
        color: #fff;
        font-size: 11px;
        font-weight: 950;
        cursor: pointer;
      }

      .transfer-error h2 {
        color: #ef515d;
      }

      .transfer-error p {
        color: #aaa;
      }

      @media (max-width: 400px) {
        .transfer-content {
          width: calc(100% - 22px);
        }

        .transfer-card {
          padding: 14px;
        }

        .transfer-rate-card strong {
          font-size: 14px;
        }
      }
    `}</style>
  );
}
