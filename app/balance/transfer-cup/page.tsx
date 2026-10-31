"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type TransferSettings = {
exchange_rate: number;
transfer_card: string;
confirmation_number: string;
};

type DemoOrder = {
reference: string;
amountCup: number;
exchangeRate: number;
balanceAmount: number;
senderPhone: string;
fileName: string;
createdAt: string;
};

export default function TransferCupPage() {
const router = useRouter();

const [loading, setLoading] = useState(true);
const [submitting, setSubmitting] = useState(false);
const [settings, setSettings] = useState<TransferSettings | null>(null);

const [amount, setAmount] = useState("");
const [senderPhone, setSenderPhone] = useState("");
const [receipt, setReceipt] = useState<File | null>(null);
const [receiptPreview, setReceiptPreview] = useState("");

const [demoOrder, setDemoOrder] = useState<DemoOrder | null>(null);
const [error, setError] = useState("");

useEffect(() => {
let active = true;

async function loadPage() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    router.replace("/");
    return;
  }

  try {
    const response = await fetch("/api/transfer-cup/settings", {
      cache: "no-store",
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || "No se pudo cargar la tasa.");
    }

    if (active) {
      setSettings({
        exchange_rate: Number(result.exchange_rate),
        transfer_card: result.transfer_card,
        confirmation_number: result.confirmation_number,
      });
    }
  } catch (err) {
    if (active) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron cargar los datos."
      );
    }
  } finally {
    if (active) setLoading(false);
  }
}

loadPage();

return () => {
  active = false;
};

}, [router]);

const amountCup = Number(amount);
const exchangeRate = settings?.exchange_rate || 0;
const balanceAmount =
amountCup > 0 && exchangeRate > 0
? amountCup / exchangeRate
: 0;

function handleReceiptChange(event: ChangeEvent<HTMLInputElement>) {
const file = event.target.files?.[0];

setError("");
setReceipt(null);
setReceiptPreview("");

if (!file) return;

const allowedTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

if (!allowedTypes.includes(file.type)) {
  setError("Selecciona una imagen JPG, PNG o WEBP.");
  event.target.value = "";
  return;
}

if (file.size > 5 * 1024 * 1024) {
  setError("La imagen no puede superar los 5 MB.");
  event.target.value = "";
  return;
}

setReceipt(file);
setReceiptPreview(URL.createObjectURL(file));

}

function handleSubmit(event: FormEvent<HTMLFormElement>) {
event.preventDefault();
setError("");

if (!settings || exchangeRate <= 0) {
  setError("No se encuentra disponible la tasa de demostración.");
  return;
}

if (!Number.isFinite(amountCup) || amountCup <= 0) {
  setError("Introduce un importe CUP válido.");
  return;
}

if (!senderPhone.trim()) {
  setError("Introduce el número de teléfono del remitente.");
  return;
}

if (!/^[0-9+\-\s]{6,20}$/.test(senderPhone.trim())) {
  setError("Revisa el formato del número de teléfono.");
  return;
}

if (!receipt) {
  setError("Selecciona una imagen de comprobante de prueba.");
  return;
}

setSubmitting(true);

const reference =
  "DEMO-" +
  Date.now().toString().slice(-8) +
  "-" +
  Math.floor(100 + Math.random() * 900);

setDemoOrder({
  reference,
  amountCup,
  exchangeRate,
  balanceAmount,
  senderPhone: senderPhone.trim(),
  fileName: receipt.name,
  createdAt: new Date().toLocaleString("es-ES"),
});

setSubmitting(false);

}

function resetDemo() {
setDemoOrder(null);
setAmount("");
setSenderPhone("");
setReceipt(null);
setReceiptPreview("");
setError("");
}

if (loading) {
return (
<main className="transfer-page">
<div className="transfer-loading">
<div className="transfer-logo">🏦</div>
<div className="transfer-spinner" />
<p>CARGANDO TRANSFERENCIA CUP...</p>
</div>

    <style jsx global>{styles}</style>
  </main>
);

}

if (demoOrder) {
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
        <h1>RESULTADO <span>DE PRUEBA</span></h1>
      </div>
    </header>

    <section className="transfer-container">
      <div className="success-card">
        <div className="success-icon">✓</div>

        <div className="demo-label">
          PEDIDO DE PRUEBA — PENDIENTE
        </div>

        <h2>VALIDACIÓN COMPLETADA</h2>

        <p>
          Los datos se validaron correctamente en esta pantalla.
          No se ha creado un pedido real ni se ha modificado tu balance.
        </p>

        <div className="reference-box">
          <small>REFERENCIA DE PRUEBA</small>
          <strong>{demoOrder.reference}</strong>
        </div>

        <div className="summary">
          <div>
            <span>Importe introducido</span>
            <strong>
              {demoOrder.amountCup.toFixed(2)} CUP
            </strong>
          </div>

          <div>
            <span>Tasa utilizada</span>
            <strong>
              {demoOrder.exchangeRate.toFixed(4)}
            </strong>
          </div>

          <div>
            <span>Balance calculado de prueba</span>
            <strong>
              {demoOrder.balanceAmount.toFixed(4)}
            </strong>
          </div>

          <div>
            <span>Teléfono introducido</span>
            <strong>{demoOrder.senderPhone}</strong>
          </div>

          <div>
            <span>Archivo seleccionado</span>
            <strong className="file-name">
              {demoOrder.fileName}
            </strong>
          </div>

          <div>
            <span>Fecha de validación</span>
            <strong>{demoOrder.createdAt}</strong>
          </div>
        </div>

        <div className="demo-warning">
          <span>ℹ️</span>
          <p>
            Esta referencia solo existe en esta sesión de demostración.
            No representa una transferencia bancaria ni una solicitud
            registrada en STORE GAMING.
          </p>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={resetDemo}
        >
          REALIZAR OTRA PRUEBA
        </button>

        <button
          type="button"
          className="secondary-button"
          onClick={() => router.push("/balance")}
        >
          VOLVER A MI BILLETERA
        </button>
      </div>
    </section>

    <style jsx global>{styles}</style>
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
      aria-label="Volver"
    >
      ←
    </button>

    <div>
      <small>STORE GAMING</small>
      <h1>TRANSFERENCIA <span>CUP</span></h1>
    </div>

    <div className="transfer-header-icon">🏦</div>
  </header>

  <section className="transfer-container">
    <div className="transfer-intro">
      <span className="intro-tag">MÉTODO CUP</span>
      <h2>DATOS DE TRANSFERENCIA</h2>
      <p>
        Consulta los datos y utiliza el formulario para probar
        la validación de la pantalla.
      </p>
    </div>

    <div className="bank-card">
      <div className="bank-card-top">
        <span>TARJETA DE DESTINO</span>
        <span className="bank-chip">CUP</span>
      </div>

      <div className="bank-card-number">
        {settings?.transfer_card || "No disponible"}
      </div>

      <div className="bank-card-bottom">
        <div>
          <small>NÚMERO A CONFIRMAR</small>
          <strong>
            {settings?.confirmation_number || "No disponible"}
          </strong>
        </div>
        <span>STORE GAMING</span>
      </div>
    </div>

    <div className="rate-card">
      <div>
        <small>TASA DE DEMOSTRACIÓN</small>
        <strong>
          {exchangeRate > 0
            ? `${exchangeRate.toFixed(4)} CUP`
            : "No disponible"}
        </strong>
      </div>

      <span>↔</span>

      <div>
        <small>CALCULADORA</small>
        <strong>BALANCE DE PRUEBA</strong>
      </div>
    </div>

    <form className="transfer-form" onSubmit={handleSubmit}>
      <div className="form-heading">
        <h2>DATOS DE LA PRUEBA</h2>
        <span>DEMO</span>
      </div>

      <label htmlFor="amount">
        IMPORTE EN CUP
      </label>

      <input
        id="amount"
        type="number"
        min="0.01"
        step="0.01"
        placeholder="Ejemplo: 1000"
        value={amount}
        onChange={(event) => setAmount(event.target.value)}
      />

      <div className="calculation-card">
        <span>BALANCE CALCULADO DE PRUEBA</span>
        <strong>{balanceAmount.toFixed(4)}</strong>
        <small>
          Cálculo informativo; no se acredita en tu cuenta.
        </small>
      </div>

      <label htmlFor="senderPhone">
        TELÉFONO DEL REMITENTE
      </label>

      <input
        id="senderPhone"
        type="tel"
        placeholder="Introduce el teléfono"
        value={senderPhone}
        onChange={(event) => setSenderPhone(event.target.value)}
        maxLength={20}
      />

      <label htmlFor="receipt">
        IMAGEN DE COMPROBANTE DE PRUEBA
      </label>

      <label className="upload-box" htmlFor="receipt">
        <span className="upload-icon">📷</span>
        <strong>
          {receipt ? "IMAGEN SELECCIONADA" : "SELECCIONAR IMAGEN"}
        </strong>
        <small>JPG, PNG o WEBP · Máximo 5 MB</small>
      </label>

      <input
        id="receipt"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleReceiptChange}
        hidden
      />

      {receiptPreview && (
        <div className="receipt-preview">
          <img src={receiptPreview} alt="Vista previa de prueba" />
          <span>{receipt?.name}</span>
        </div>
      )}

      {error && (
        <div className="error-message">
          <span>!</span>
          {error}
        </div>
      )}

      <div className="demo-warning">
        <span>ℹ️</span>
        <p>
          MODO DEMOSTRACIÓN: los datos solo se validan localmente.
          No se envían comprobantes, no se registran pedidos y no
          se modifica ningún balance.
        </p>
      </div>

      <button
        type="submit"
        className="primary-button"
        disabled={submitting}
      >
        {submitting ? "VALIDANDO..." : "ENVIAR PEDIDO DE PRUEBA"}
        <span>→</span>
      </button>
    </form>
  </section>

  <style jsx global>{styles}</style>
</main>

);
}

const styles = `
.transfer-page {
min-height: 100vh;
background: #070707;
color: #fff;
position: relative;
overflow: hidden;
padding-bottom: 50px;
}

.transfer-background {
position: fixed;
inset: 0;
pointer-events: none;
background:
radial-gradient(circle at 50% 0%, rgba(180, 25, 35, .16), transparent 38%),
radial-gradient(circle at 100% 70%, rgba(35, 75, 145, .07), transparent 35%);
}

.transfer-header {
position: relative;
z-index: 1;
max-width: 760px;
margin: auto;
padding: 25px 20px;
display: flex;
align-items: center;
gap: 15px;
}

.transfer-header small {
color: #999;
font-size: 10px;
font-weight: 900;
letter-spacing: 2px;
}

.transfer-header h1 {
margin: 4px 0 0;
font-size: 20px;
font-weight: 950;
letter-spacing: .5px;
}

.transfer-header h1 span {
color: #e04444;
}

.transfer-back {
width: 42px;
height: 42px;
border-radius: 12px;
border: 1px solid #333;
background: #151515;
color: white;
font-size: 23px;
cursor: pointer;
}

.transfer-header-icon {
margin-left: auto;
font-size: 25px;
}

.transfer-container {
position: relative;
z-index: 1;
width: min(100% - 30px, 620px);
margin: 10px auto;
}

.transfer-intro {
margin-bottom: 20px;
}

.intro-tag {
display: inline-block;
padding: 6px 10px;
border-radius: 6px;
background: rgba(224, 68, 68, .12);
color: #f06a6a;
font-size: 10px;
font-weight: 900;
letter-spacing: 1px;
}

.transfer-intro h2 {
margin: 12px 0 7px;
font-size: 19px;
font-weight: 950;
}

.transfer-intro p {
color: #999;
font-size: 12px;
line-height: 1.6;
}

.bank-card {
padding: 23px;
border-radius: 18px;
border: 1px solid rgba(255,255,255,.12);
background: linear-gradient(135deg, #202020, #101010 60%, #191919);
box-shadow: 0 18px 45px rgba(0,0,0,.35);
}

.bank-card-top,
.bank-card-bottom {
display: flex;
align-items: center;
justify-content: space-between;
}

.bank-card-top {
color: #aaa;
font-size: 10px;
font-weight: 900;
letter-spacing: 1px;
}

.bank-chip {
color: #f0c46b;
border: 1px solid rgba(240,196,107,.35);
border-radius: 5px;
padding: 5px 8px;
}

.bank-card-number {
margin: 27px 0;
font-size: clamp(20px, 5vw, 27px);
font-weight: 900;
letter-spacing: 1.5px;
overflow-wrap: anywhere;
}

.bank-card-bottom small,
.bank-card-bottom strong {
display: block;
}

.bank-card-bottom small {
color: #999;
font-size: 9px;
margin-bottom: 7px;
}

.bank-card-bottom strong {
color: #f0c46b;
font-size: 17px;
letter-spacing: 1px;
}

.bank-card-bottom > span {
color: #aaa;
font-size: 10px;
font-weight: 900;
}

.rate-card {
margin: 15px 0 24px;
padding: 15px;
display: flex;
align-items: center;
justify-content: space-between;
gap: 10px;
border-radius: 12px;
background: #121212;
border: 1px solid #292929;
}

.rate-card div {
min-width: 0;
}

.rate-card small,
.rate-card strong {
display: block;
}

.rate-card small {
color: #999;
font-size: 9px;
margin-bottom: 7px;
}

.rate-card strong {
font-size: 12px;
color: #e9c16d;
}

.rate-card > span {
color: #777;
}

.transfer-form,
.success-card {
padding: 21px;
border-radius: 16px;
border: 1px solid #292929;
background: linear-gradient(160deg, #151515, #0c0c0c);
}

.form-heading {
display: flex;
justify-content: space-between;
align-items: center;
margin-bottom: 22px;
}

.form-heading h2 {
font-size: 14px;
margin: 0;
font-weight: 950;
}

.form-heading span {
color: #f0c46b;
font-size: 10px;
font-weight: 900;
}

.transfer-form > label:not(.upload-box) {
display: block;
color: #bbb;
font-size: 10px;
font-weight: 900;
letter-spacing: .7px;
margin: 17px 0 8px;
}

.transfer-form input:not([type="file"]) {
width: 100%;
min-height: 48px;
border-radius: 10px;
border: 1px solid #333;
outline: none;
background: #090909;
color: white;
padding: 0 13px;
font-size: 14px;
}

.transfer-form input:focus {
border-color: #c94343;
}

.calculation-card {
margin-top: 10px;
padding: 14px;
border-radius: 10px;
background: rgba(38,161,123,.08);
border: 1px solid rgba(38,161,123,.2);
}

.calculation-card span,
.calculation-card strong,
.calculation-card small {
display: block;
}

.calculation-card span {
color: #aaa;
font-size: 9px;
font-weight: 900;
}

.calculation-card strong {
margin: 7px 0;
color: #57d6a7;
font-size: 25px;
}

.calculation-card small {
color: #888;
font-size: 10px;
}

.upload-box {
min-height: 105px;
display: flex;
flex-direction: column;
align-items: center;
justify-content: center;
gap: 6px;
border: 1px dashed #555;
border-radius: 11px;
background: #101010;
cursor: pointer;
text-align: center;
}

.upload-icon {
font-size: 23px;
}

.upload-box strong {
font-size: 11px;
}

.upload-box small {
color: #888;
font-size: 10px;
}

.receipt-preview {
margin-top: 12px;
padding: 10px;
display: flex;
align-items: center;
gap: 12px;
border: 1px solid #333;
border-radius: 10px;
}

.receipt-preview img {
width: 65px;
height: 65px;
border-radius: 7px;
object-fit: cover;
}

.receipt-preview span {
color: #bbb;
font-size: 11px;
overflow-wrap: anywhere;
}

.demo-warning {
display: flex;
gap: 10px;
margin: 18px 0;
padding: 13px;
border: 1px solid rgba(230,172,55,.2);
border-radius: 10px;
background: rgba(230,172,55,.06);
}

.demo-warning p {
margin: 0;
color: #c4b58f;
font-size: 10px;
line-height: 1.6;
}

.error-message {
margin-top: 14px;
padding: 11px;
border-radius: 9px;
background: rgba(220,50,50,.1);
border: 1px solid rgba(220,50,50,.3);
color: #ff8585;
font-size: 11px;
}

.primary-button,
.secondary-button {
width: 100%;
min-height: 49px;
border-radius: 10px;
font-size: 11px;
font-weight: 950;
cursor: pointer;
}

.primary-button {
display: flex;
justify-content: center;
align-items: center;
gap: 10px;
color: white;
border: 1px solid rgba(255,100,100,.4);
background: linear-gradient(135deg, #bd3434, #791d1d);
box-shadow: 0 10px 25px rgba(180,35,35,.18);
}

.primary-button:disabled {
opacity: .6;
cursor: not-allowed;
}

.secondary-button {
margin-top: 10px;
color: #bbb;
border: 1px solid #333;
background: #111;
}

.success-card {
text-align: center;
}

.success-icon {
width: 62px;
height: 62px;
margin: 5px auto 15px;
display: grid;
place-items: center;
border-radius: 50%;
background: rgba(38,161,123,.13);
border: 1px solid rgba(38,161,123,.4);
color: #57d6a7;
font-size: 30px;
font-weight: 900;
}

.demo-label {
color: #e9c16d;
font-size: 10px;
font-weight: 950;
letter-spacing: .7px;
}

.success-card h2 {
margin: 12px 0;
font-size: 19px;
}

.success-card > p {
color: #999;
font-size: 11px;
line-height: 1.6;
}

.reference-box {
margin: 20px 0;
padding: 14px;
border-radius: 10px;
background: #0a0a0a;
border: 1px dashed #555;
}

.reference-box small,
.reference-box strong {
display: block;
}

.reference-box small {
color: #999;
font-size: 9px;
}

.reference-box strong {
margin-top: 8px;
color: #e9c16d;
font-size: 19px;
overflow-wrap: anywhere;
}

.summary {
margin-bottom: 18px;
text-align: left;
}

.summary > div {
display: flex;
justify-content: space-between;
gap: 12px;
padding: 12px 0;
border-bottom: 1px solid #292929;
}

.summary span {
color: #999;
font-size: 10px;
}

.summary strong {
color: #eee;
font-size: 11px;
text-align: right;
overflow-wrap: anywhere;
}

.summary .file-name {
max-width: 55%;
}

.transfer-loading {
min-height: 100vh;
display: flex;
flex-direction: column;
align-items: center;
justify-content: center;
gap: 15px;
color: #aaa;
font-size: 11px;
font-weight: 900;
}

.transfer-logo {
font-size: 35px;
}

.transfer-spinner {
width: 35px;
height: 35px;
border: 3px solid #333;
border-top-color: #d04444;
border-radius: 50%;
animation: transfer-spin .8s linear infinite;
}

@keyframes transfer-spin {
to { transform: rotate(360deg); }
}

@media (max-width: 420px) {
.transfer-form,
.success-card {
padding: 16px;
}

.bank-card {
  padding: 18px;
}

.summary > div {
  flex-direction: column;
  gap: 5px;
}

.summary strong {
  text-align: left;
}

}
`;
