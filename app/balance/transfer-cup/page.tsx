"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type TransferSettings = {
  exchange_rate: number;
  transfer_card: string;
  confirmation_number: string;
};

export default function TransferCupPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [exchangeRate, setExchangeRate] = useState(0);
  const [amountCup, setAmountCup] = useState("");
  const [senderPhone, setSenderPhone] = useState("");
  const [receipt, setReceipt] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState("");
  const [settings, setSettings] = useState<TransferSettings | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function loadSettings() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
          router.replace("/");
          return;
        }

        const response = await fetch("/api/transfer-cup/settings", {
          cache: "no-store",
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || "No se pudo cargar la configuración.");
        }

        if (!active) return;

        setSettings(result);
        setExchangeRate(Number(result.exchange_rate));
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Error al cargar la configuración."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadSettings();

    return () => {
      active = false;
    };
  }, [router]);

  const balanceAmount = useMemo(() => {
    const amount = Number(amountCup);

    if (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      exchangeRate <= 0
    ) {
      return 0;
    }

    return amount / exchangeRate;
  }, [amountCup, exchangeRate]);

  function handleReceipt(file: File | null) {
    setError("");
    setReceipt(null);
    setReceiptPreview("");

    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "image/webp"];

    if (!allowed.includes(file.type)) {
      setError("Selecciona una imagen JPG, PNG o WEBP.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("La imagen no puede superar los 5 MB.");
      return;
    }

    setReceipt(file);
    setReceiptPreview(URL.createObjectURL(file));
  }

  function submitDemo() {
    setError("");
    setMessage("");

    const amount = Number(amountCup);

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Introduce un importe válido en CUP.");
      return;
    }

    if (!senderPhone.trim()) {
      setError("Introduce el número de quien envía el dinero.");
      return;
    }

    if (!/^[0-9+\-()\s]{5,30}$/.test(senderPhone.trim())) {
      setError("El número del remitente no es válido.");
      return;
    }

    if (!receipt) {
      setError("Debes seleccionar la foto del comprobante.");
      return;
    }

    setMessage(
      "Validación de demostración completada. No se ha enviado ni registrado ninguna transferencia."
    );
  }

  if (loading) {
    return (
      <main className="transfer-page">
        <div className="transfer-loading">
          <div className="transfer-spinner" />
          <p>CARGANDO TRANSFERENCIA CUP...</p>
        </div>

        <style jsx>{styles}</style>
      </main>
    );
  }

  return (
    <main className="transfer-page">
      <div className="transfer-bg" />

      <header className="transfer-header">
        <button
          type="button"
          className="back-button"
          onClick={() => router.push("/balance")}
        >
          ←
        </button>

        <div>
          <small>STORE GAMING</small>
          <h1>TRANSFERENCIA <span>CUP</span></h1>
        </div>

        <div className="header-icon">🏦</div>
      </header>

      <section className="transfer-container">
        <div className="intro-card">
          <div className="intro-icon">💳</div>
          <div>
            <strong>TRANSFERENCIA BANCARIA</strong>
            <p>
              Consulta los datos indicados y completa los campos
              de la solicitud de demostración.
            </p>
          </div>
        </div>

        <section className="form-card">
          <div className="section-heading">
            <span>01</span>
            <div>
              <strong>IMPORTE DE TRANSFERENCIA</strong>
              <small>Introduce el importe en CUP</small>
            </div>
          </div>

          <label className="field-label" htmlFor="amountCup">
            IMPORTE EN CUP
          </label>

          <div className="amount-input-wrap">
            <input
              id="amountCup"
              type="number"
              min="0.01"
              step="0.01"
              value={amountCup}
              onChange={(e) => setAmountCup(e.target.value)}
              placeholder="Ej. 1000"
            />
            <span>CUP</span>
          </div>

          <div className="calculation-card">
            <div>
              <span>TASA TRANSFERENCIA CUP</span>
              <strong>
                {exchangeRate > 0 ? exchangeRate.toLocaleString("es-ES") : "—"}
              </strong>
            </div>

            <div className="calculation-divider" />

            <div>
              <span>BALANCE ESTIMADO</span>
              <strong className="estimated-balance">
                {balanceAmount.toFixed(4)} USD
              </strong>
            </div>
          </div>
        </section>

        <section className="form-card">
          <div className="section-heading">
            <span>02</span>
            <div>
              <strong>DATOS DE TRANSFERENCIA</strong>
              <small>Información que aparecerá en la pantalla</small>
            </div>
          </div>

          <div className="bank-data">
            <label>TARJETA A ENVIAR</label>
            <div className="bank-number">
              <strong>{settings?.transfer_card || "9238-9598-7208-5651"}</strong>
            </div>
          </div>

          <div className="bank-data">
            <label>NÚMERO A CONFIRMAR</label>
            <div className="bank-number">
              <strong>
                {settings?.confirmation_number || "58617939"}
              </strong>
            </div>
          </div>

          <div className="important-note">
            <span>ℹ️</span>
            <p>
              Comprueba cuidadosamente los datos mostrados antes
              de continuar.
            </p>
          </div>
        </section>

        <section className="form-card">
          <div className="section-heading">
            <span>03</span>
            <div>
              <strong>COMPROBANTE</strong>
              <small>Selecciona una imagen de prueba</small>
            </div>
          </div>

          <label className="upload-box" htmlFor="receipt">
            {receiptPreview ? (
              <img src={receiptPreview} alt="Vista previa del comprobante" />
            ) : (
              <>
                <span className="upload-icon">📷</span>
                <strong>SUBIR FOTO DEL COMPROBANTE</strong>
                <small>JPG, PNG o WEBP · Máximo 5 MB</small>
              </>
            )}
          </label>

          <input
            id="receipt"
            className="file-input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => handleReceipt(e.target.files?.[0] || null)}
          />

          {receipt && (
            <div className="selected-file">
              <span>✓ {receipt.name}</span>
              <button
                type="button"
                onClick={() => handleReceipt(null)}
              >
                Quitar
              </button>
            </div>
          )}
        </section>

        <section className="form-card">
          <div className="section-heading">
            <span>04</span>
            <div>
              <strong>DATOS DEL REMITENTE</strong>
              <small>Número de quien envía el dinero</small>
            </div>
          </div>

          <label className="field-label" htmlFor="senderPhone">
            NÚMERO DEL REMITENTE
          </label>

          <input
            id="senderPhone"
            className="text-input"
            type="tel"
            value={senderPhone}
            onChange={(e) => setSenderPhone(e.target.value)}
            placeholder="Introduce el número"
            maxLength={30}
          />
        </section>

        {error && <div className="feedback error">{error}</div>}

        {message && <div className="feedback success">{message}</div>}

        <button
          type="button"
          className="submit-button"
          onClick={submitDemo}
        >
          ENVIAR PEDIDO
          <span>→</span>
        </button>

        <div className="demo-notice">
          <strong>MODO DEMOSTRACIÓN</strong>
          <p>
            Esta pantalla valida los datos localmente. No envía
            comprobantes, no crea pedidos y no modifica balances.
          </p>
        </div>

        <button
          type="button"
          className="return-button"
          onClick={() => router.push("/balance")}
        >
          ← VOLVER A MI BILLETERA
        </button>
      </section>

      <style jsx>{styles}</style>
    </main>
  );
}

const styles = `
  .transfer-page {
    min-height: 100vh;
    background: #070707;
    color: #fff;
    padding-bottom: 50px;
    position: relative;
    overflow: hidden;
  }

  .transfer-bg {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background:
      radial-gradient(circle at 50% 0%, rgba(190, 35, 35, .17), transparent 38%),
      radial-gradient(circle at 0% 55%, rgba(150, 20, 20, .08), transparent 30%);
  }

  .transfer-header {
    max-width: 760px;
    margin: auto;
    padding: 25px 18px;
    display: flex;
    align-items: center;
    gap: 14px;
    position: relative;
    z-index: 1;
    border-bottom: 1px solid rgba(255,255,255,.07);
  }

  .back-button {
    width: 42px;
    height: 42px;
    border-radius: 12px;
    border: 1px solid #383838;
    background: #151515;
    color: #fff;
    font-size: 24px;
    cursor: pointer;
  }

  .transfer-header small {
    color: #999;
    font-size: 9px;
    font-weight: 900;
    letter-spacing: 2px;
  }

  .transfer-header h1 {
    font-size: 19px;
    margin: 4px 0 0;
    font-weight: 950;
  }

  .transfer-header h1 span {
    color: #e33b3b;
  }

  .header-icon {
    margin-left: auto;
    font-size: 26px;
  }

  .transfer-container {
    width: min(100% - 28px, 700px);
    margin: 22px auto;
    position: relative;
    z-index: 1;
  }

  .intro-card {
    display: flex;
    gap: 14px;
    align-items: center;
    padding: 17px;
    border: 1px solid rgba(218, 55, 55, .22);
    background: linear-gradient(135deg, #211313, #111);
    border-radius: 15px;
    margin-bottom: 18px;
  }

  .intro-icon {
    font-size: 30px;
  }

  .intro-card strong {
    font-size: 13px;
    font-weight: 950;
  }

  .intro-card p {
    color: #aaa;
    font-size: 11px;
    line-height: 1.6;
    margin: 5px 0 0;
  }

  .form-card {
    padding: 19px;
    background: linear-gradient(145deg, #171717, #0d0d0d);
    border: 1px solid rgba(255,255,255,.08);
    border-radius: 15px;
    margin-bottom: 15px;
  }

  .section-heading {
    display: flex;
    gap: 12px;
    align-items: center;
    margin-bottom: 20px;
  }

  .section-heading > span {
    width: 34px;
    height: 34px;
    display: grid;
    place-items: center;
    border-radius: 9px;
    background: rgba(215, 49, 49, .13);
    color: #ef5555;
    font-size: 12px;
    font-weight: 950;
  }

  .section-heading strong {
    display: block;
    font-size: 12px;
    font-weight: 950;
  }

  .section-heading small {
    display: block;
    color: #888;
    margin-top: 4px;
    font-size: 10px;
  }

  .field-label,
  .bank-data label {
    display: block;
    color: #aaa;
    font-size: 10px;
    font-weight: 900;
    letter-spacing: .7px;
    margin-bottom: 9px;
  }

  .amount-input-wrap {
    display: flex;
    align-items: center;
    border: 1px solid #444;
    background: #090909;
    border-radius: 10px;
    padding: 0 14px;
  }

  .amount-input-wrap:focus-within,
  .text-input:focus {
    border-color: #d93b3b;
  }

  .amount-input-wrap input {
    width: 100%;
    min-width: 0;
    height: 52px;
    border: 0;
    outline: none;
    color: white;
    background: transparent;
    font-size: 18px;
    font-weight: 900;
  }

  .amount-input-wrap > span {
    color: #e65a5a;
    font-size: 12px;
    font-weight: 950;
  }

  .calculation-card {
    display: grid;
    grid-template-columns: 1fr 1px 1fr;
    align-items: center;
    gap: 12px;
    padding: 15px;
    background: #090909;
    border: 1px solid #292929;
    border-radius: 10px;
    margin-top: 14px;
  }

  .calculation-card span {
    display: block;
    color: #888;
    font-size: 9px;
    font-weight: 900;
  }

  .calculation-card strong {
    display: block;
    font-size: 15px;
    margin-top: 7px;
    overflow-wrap: anywhere;
  }

  .calculation-card .estimated-balance {
    color: #65d6a4;
  }

  .calculation-divider {
    height: 38px;
    background: #333;
  }

  .bank-data {
    margin-bottom: 16px;
  }

  .bank-number {
    padding: 16px;
    border: 1px solid rgba(222, 65, 65, .35);
    background: #0a0909;
    border-radius: 10px;
    text-align: center;
  }

  .bank-number strong {
    font-size: 19px;
    letter-spacing: 1.5px;
    color: #fff;
    overflow-wrap: anywhere;
  }

  .important-note {
    display: flex;
    gap: 9px;
    padding: 11px;
    border-radius: 9px;
    background: rgba(255,255,255,.035);
  }

  .important-note p {
    color: #aaa;
    font-size: 10px;
    line-height: 1.6;
    margin: 0;
  }

  .upload-box {
    min-height: 150px;
    border: 1px dashed #a94444;
    background: rgba(180, 35, 35, .055);
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 9px;
    padding: 12px;
    cursor: pointer;
    overflow: hidden;
    text-align: center;
  }

  .upload-box img {
    max-width: 100%;
    max-height: 260px;
    object-fit: contain;
    border-radius: 8px;
  }

  .upload-icon {
    font-size: 30px;
  }

  .upload-box strong {
    font-size: 11px;
  }

  .upload-box small {
    color: #888;
    font-size: 10px;
  }

  .file-input {
    display: none;
  }

  .selected-file {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-top: 12px;
    color: #8ee0b8;
    font-size: 10px;
    overflow-wrap: anywhere;
  }

  .selected-file button {
    border: 0;
    background: transparent;
    color: #ff7777;
    cursor: pointer;
  }

  .text-input {
    width: 100%;
    height: 50px;
    border: 1px solid #444;
    background: #090909;
    border-radius: 10px;
    padding: 0 13px;
    color: #fff;
    outline: none;
    font-size: 14px;
  }

  .feedback {
    padding: 13px;
    border-radius: 10px;
    margin: 12px 0;
    font-size: 11px;
    line-height: 1.6;
  }

  .feedback.error {
    color: #ff9a9a;
    border: 1px solid rgba(255,80,80,.3);
    background: rgba(150,20,20,.12);
  }

  .feedback.success {
    color: #a0eac5;
    border: 1px solid rgba(70,200,140,.3);
    background: rgba(30,130,80,.1);
  }

  .submit-button {
    width: 100%;
    height: 56px;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 12px;
    border: 1px solid rgba(255,100,100,.4);
    border-radius: 12px;
    color: white;
    background: linear-gradient(135deg, #d83a3a, #941c1c);
    font-size: 13px;
    font-weight: 950;
    cursor: pointer;
    box-shadow: 0 12px 30px rgba(180,25,25,.2);
  }

  .submit-button span {
    font-size: 19px;
  }

  .demo-notice {
    margin-top: 14px;
    padding: 13px;
    background: rgba(210,160,60,.07);
    border: 1px solid rgba(210,160,60,.2);
    border-radius: 10px;
  }

  .demo-notice strong {
    color: #e4bd6b;
    font-size: 10px;
  }

  .demo-notice p {
    color: #aaa;
    font-size: 10px;
    line-height: 1.6;
    margin: 6px 0 0;
  }

  .return-button {
    width: 100%;
    padding: 16px;
    margin-top: 12px;
    border: 1px solid #333;
    border-radius: 10px;
    color: #aaa;
    background: #111;
    font-size: 11px;
    font-weight: 900;
    cursor: pointer;
  }

  .transfer-loading {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    gap: 15px;
    color: #aaa;
    font-size: 11px;
    font-weight: 900;
  }

  .transfer-spinner {
    width: 34px;
    height: 34px;
    border: 3px solid #333;
    border-top-color: #e33b3b;
    border-radius: 50%;
    animation: transfer-spin .8s linear infinite;
  }

  @keyframes transfer-spin {
    to { transform: rotate(360deg); }
  }

  @media (max-width: 430px) {
    .form-card {
      padding: 15px;
    }

    .bank-number strong {
      font-size: 16px;
    }

    .calculation-card {
      gap: 8px;
      padding: 12px;
    }

    .calculation-card strong {
      font-size: 12px;
    }
  }
`;
