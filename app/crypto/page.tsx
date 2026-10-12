"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type Direction = "buy" | "sell";
type PaymentMethod = "cup" | "mobile";

type CryptoSettings = {
  buy_cup_rate: number;
  buy_mobile_rate: number;
  sell_cup_rate: number;
  sell_mobile_rate: number;
  bep20_wallet: string;
  payment_instructions: string;
};

type CryptoOrder = {
  id: string;
  direction: Direction;
  payment_method: PaymentMethod;
  amount_usdt: number;
  rate: number;
  fiat_amount: number;
  wallet_address: string;
  contact: string;
  payment_reference: string;
  status: string;
  admin_note: string;
  created_at: string;
};

const initialSettings: CryptoSettings = {
  buy_cup_rate: 0,
  buy_mobile_rate: 0,
  sell_cup_rate: 0,
  sell_mobile_rate: 0,
  bep20_wallet: "",
  payment_instructions: "",
};

const statusLabels: Record<string, string> = {
  pending: "PENDIENTE",
  payment_review: "REVISANDO PAGO",
  approved: "APROBADA",
  completed: "COMPLETADA",
  rejected: "RECHAZADA",
};

export default function CryptoPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState("");
  const [settings, setSettings] =
    useState<CryptoSettings>(initialSettings);
  const [orders, setOrders] = useState<CryptoOrder[]>([]);

  const [direction, setDirection] =
    useState<Direction | null>(null);
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("cup");

  const [amount, setAmount] = useState("10");
  const [walletAddress, setWalletAddress] = useState("");
  const [contact, setContact] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadOrders = useCallback(async (id: string) => {
    const { data, error } = await supabase
      .from("crypto_orders")
      .select(
        "id,direction,payment_method,amount_usdt,rate,fiat_amount,wallet_address,contact,payment_reference,status,admin_note,created_at"
      )
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error cargando solicitudes:", error);
      return;
    }

    setOrders((data || []) as CryptoOrder[]);
  }, []);

  const loadPage = useCallback(async () => {
    setLoading(true);

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      router.replace("/");
      return;
    }

    setUserId(session.user.id);

    const { data, error } = await supabase
      .from("crypto_settings")
      .select(
        "buy_cup_rate,buy_mobile_rate,sell_cup_rate,sell_mobile_rate,bep20_wallet,payment_instructions"
      )
      .eq("id", 1)
      .single();

    if (error) {
      console.error("Error cargando tasas:", error);
      setErrorMessage(
        "No se pudieron cargar las tasas. Comprueba la configuración de Supabase."
      );
    } else if (data) {
      setSettings({
        buy_cup_rate: Number(data.buy_cup_rate),
        buy_mobile_rate: Number(data.buy_mobile_rate),
        sell_cup_rate: Number(data.sell_cup_rate),
        sell_mobile_rate: Number(data.sell_mobile_rate),
        bep20_wallet: data.bep20_wallet || "",
        payment_instructions: data.payment_instructions || "",
      });
    }

    await loadOrders(session.user.id);
    setLoading(false);
  }, [loadOrders, router]);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  const rate =
    direction === "buy"
      ? paymentMethod === "cup"
        ? settings.buy_cup_rate
        : settings.buy_mobile_rate
      : paymentMethod === "cup"
        ? settings.sell_cup_rate
        : settings.sell_mobile_rate;

  const parsedAmount = Number(amount);
  const validAmount =
    Number.isFinite(parsedAmount) && parsedAmount > 0;

  const total =
    validAmount && rate > 0 ? parsedAmount * rate : 0;

  function openDirection(value: Direction) {
    setDirection(value);
    setPaymentMethod("cup");
    setAmount("10");
    setWalletAddress("");
    setContact("");
    setPaymentReference("");
    setErrorMessage("");
    setSuccessMessage("");
  }

  async function submitOrder() {
    setErrorMessage("");
    setSuccessMessage("");

    if (!userId || !direction) return;

    if (!validAmount) {
      setErrorMessage("Introduce una cantidad de USDT válida.");
      return;
    }

    if (!Number.isFinite(rate) || rate <= 0) {
      setErrorMessage(
        "Este método no está disponible. El administrador debe configurar su tasa."
      );
      return;
    }

    if (!contact.trim()) {
      setErrorMessage(
        "Introduce tu número de contacto para coordinar la operación."
      );
      return;
    }

    if (direction === "buy" && !walletAddress.trim()) {
      setErrorMessage(
        "Introduce tu dirección de recepción USDT BEP20."
      );
      return;
    }

    if (direction === "sell" && !paymentReference.trim()) {
      setErrorMessage(
        "Introduce la referencia de la transferencia o indica cómo identificarás el envío."
      );
      return;
    }

    if (direction === "sell" && !settings.bep20_wallet.trim()) {
      setErrorMessage(
        "La dirección BEP20 de recepción todavía no está configurada."
      );
      return;
    }

    setSaving(true);

    // La tasa se vuelve a consultar antes de crear la solicitud.
    const { data: freshSettings, error: settingsError } =
      await supabase
        .from("crypto_settings")
        .select(
          "buy_cup_rate,buy_mobile_rate,sell_cup_rate,sell_mobile_rate,bep20_wallet"
        )
        .eq("id", 1)
        .single();

    if (settingsError || !freshSettings) {
      setSaving(false);
      setErrorMessage("No se pudieron verificar las tasas actuales.");
      return;
    }

    const currentRate = Number(
      direction === "buy"
        ? paymentMethod === "cup"
          ? freshSettings.buy_cup_rate
          : freshSettings.buy_mobile_rate
        : paymentMethod === "cup"
          ? freshSettings.sell_cup_rate
          : freshSettings.sell_mobile_rate
    );

    if (!Number.isFinite(currentRate) || currentRate <= 0) {
      setSaving(false);
      setErrorMessage("La tasa seleccionada no está disponible.");
      return;
    }

    const roundedTotal = Number(
      (parsedAmount * currentRate).toFixed(2)
    );

    const { data: created, error } = await supabase
      .from("crypto_orders")
      .insert({
        user_id: userId,
        direction,
        payment_method: paymentMethod,
        amount_usdt: parsedAmount,
        rate: currentRate,
        fiat_amount: roundedTotal,
        wallet_address:
          direction === "buy"
            ? walletAddress.trim()
            : freshSettings.bep20_wallet,
        contact: contact.trim(),
        payment_reference: paymentReference.trim(),
        status: "pending",
      })
      .select("id")
      .single();

    setSaving(false);

    if (error || !created) {
      console.error("Error creando solicitud:", error);
      setErrorMessage(
        "No se pudo registrar la solicitud. Comprueba los datos e inténtalo de nuevo."
      );
      return;
    }

    setSuccessMessage(
      `Solicitud registrada. Número: ${created.id}. Espera la revisión del administrador.`
    );

    setDirection(null);
    await loadOrders(userId);
  }

  if (loading) {
    return (
      <main className="crypto-page">
        <p className="crypto-muted">Cargando STORE GAMING...</p>
      </main>
    );
  }

  return (
    <main className="crypto-page">
      <header className="crypto-header">
        <button
          className="crypto-back"
          onClick={() => router.push("/home")}
          type="button"
        >
          ← Volver al Home
        </button>

        <div className="crypto-brand">STORE GAMING</div>
        <h1>COMPRA Y VENTA DE CRIPTO</h1>
        <p>USDT · Red BEP20 · Confirmación manual</p>
      </header>

      {successMessage && (
        <div className="crypto-success">{successMessage}</div>
      )}

      {errorMessage && (
        <div className="crypto-error">{errorMessage}</div>
      )}

      {!direction ? (
        <section className="crypto-cards">
          <button
            className="crypto-card crypto-buy"
            onClick={() => openDirection("buy")}
            type="button"
          >
            <span className="crypto-symbol">↓</span>
            <span className="crypto-tag">USDT BEP20</span>
            <strong>COMPRAR CRIPTO</strong>
            <span>
              Paga en CUP o saldo móvil y solicita tus USDT.
            </span>
            <b>CONTINUAR →</b>
          </button>

          <button
            className="crypto-card crypto-sell"
            onClick={() => openDirection("sell")}
            type="button"
          >
            <span className="crypto-symbol">↑</span>
            <span className="crypto-tag">USDT BEP20</span>
            <strong>VENDER CRIPTO</strong>
            <span>
              Solicita vender tus USDT y recibir tu pago.
            </span>
            <b>CONTINUAR →</b>
          </button>
        </section>
      ) : (
        <section className="crypto-form">
          <button
            type="button"
            className="crypto-back"
            onClick={() => {
              setDirection(null);
              setErrorMessage("");
            }}
          >
            ← Elegir otra operación
          </button>

          <h2>
            {direction === "buy" ? "COMPRAR USDT" : "VENDER USDT"}
          </h2>

          <label htmlFor="crypto-method">Método de pago</label>
          <select
            id="crypto-method"
            value={paymentMethod}
            onChange={(event) =>
              setPaymentMethod(event.target.value as PaymentMethod)
            }
          >
            <option value="cup">CUP</option>
            <option value="mobile">Saldo móvil</option>
          </select>

          <label htmlFor="crypto-amount">Cantidad de USDT</label>
          <input
            id="crypto-amount"
            type="number"
            min="0.00000001"
            step="any"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="Ej.: 10"
          />

          <div className="crypto-total">
            <span>Tasa actual</span>
            <strong>
              {rate > 0
                ? `${rate.toLocaleString("es-ES")} ${
                    paymentMethod === "cup" ? "CUP" : "saldo móvil"
                  } / USDT`
                : "No disponible"}
            </strong>

            <span>Importe calculado</span>
            <strong>
              {total > 0
                ? `${total.toLocaleString("es-ES", {
                    maximumFractionDigits: 2,
                  })} ${paymentMethod === "cup" ? "CUP" : "saldo móvil"}`
                : "—"}
            </strong>
          </div>

          {direction === "buy" ? (
            <>
              <label htmlFor="crypto-wallet">
                Tu dirección USDT BEP20 para recibir
              </label>
              <input
                id="crypto-wallet"
                value={walletAddress}
                onChange={(event) => setWalletAddress(event.target.value)}
                placeholder="Dirección de tu billetera"
                autoComplete="off"
              />

              <label htmlFor="crypto-reference">
                Referencia del pago (si ya la tienes)
              </label>
              <input
                id="crypto-reference"
                value={paymentReference}
                onChange={(event) =>
                  setPaymentReference(event.target.value)
                }
                placeholder="Referencia o comprobante"
              />
            </>
          ) : (
            <div className="crypto-wallet-box">
              <strong>Dirección de recepción BEP20</strong>
              <p>
                {settings.bep20_wallet ||
                  "El administrador aún no ha configurado la dirección."}
              </p>
              <small>
                Verifica que la red sea BNB Smart Chain (BEP20) antes de enviar.
                No envíes fondos hasta confirmar los detalles de la operación.
              </small>

              <label htmlFor="crypto-reference">
                Referencia de la transferencia USDT
              </label>
              <input
                id="crypto-reference"
                value={paymentReference}
                onChange={(event) =>
                  setPaymentReference(event.target.value)
                }
                placeholder="ID de transacción (TXID)"
              />
            </div>
          )}

          <label htmlFor="crypto-contact">
            Número de contacto
          </label>
          <input
            id="crypto-contact"
            value={contact}
            onChange={(event) => setContact(event.target.value)}
            placeholder="Teléfono o contacto para coordinar el pago"
          />

          {settings.payment_instructions && (
            <div className="crypto-instructions">
              <strong>Instrucciones</strong>
              <p>{settings.payment_instructions}</p>
            </div>
          )}

          <div className="crypto-warning">
            La solicitud no confirma el pago ni garantiza una transferencia
            inmediata. Espera las instrucciones y la confirmación del
            administrador. Comprueba todos los datos antes de operar.
          </div>

          <button
            type="button"
            className="crypto-submit"
            onClick={submitOrder}
            disabled={saving || rate <= 0}
          >
            {saving ? "REGISTRANDO..." : "REGISTRAR SOLICITUD"}
          </button>
        </section>
      )}

      <section className="crypto-history">
        <h2>MIS SOLICITUDES</h2>

        {orders.length === 0 ? (
          <p className="crypto-muted">
            Todavía no tienes solicitudes de cripto.
          </p>
        ) : (
          orders.map((order) => (
            <article className="crypto-order" key={order.id}>
              <div className="crypto-order-heading">
                <strong>
                  {order.direction === "buy" ? "COMPRA" : "VENTA"} USDT
                </strong>
                <span className={`crypto-status status-${order.status}`}>
                  {statusLabels[order.status] || order.status}
                </span>
              </div>

              <p>
                Cantidad: {Number(order.amount_usdt).toLocaleString("es-ES")} USDT
              </p>
              <p>
                Total: {Number(order.fiat_amount).toLocaleString("es-ES")}{" "}
                {order.payment_method === "cup" ? "CUP" : "saldo móvil"}
              </p>
              <p>
                Referencia: {order.id}
              </p>
              <small>
                {new Date(order.created_at).toLocaleString("es-ES")}
              </small>

              {order.admin_note && (
                <p className="crypto-note">
                  Nota de administración: {order.admin_note}
                </p>
              )}
            </article>
          ))
        )}
      </section>

      <footer className="crypto-footer">
        STORE GAMING · Operaciones USDT BEP20
      </footer>

      <style jsx>{`
        .crypto-page {
          min-height: 100vh;
          padding: 24px 16px 50px;
          color: #f5f5f5;
          background:
            radial-gradient(ellipse at top, #321015 0, transparent 50%),
            #090909;
          font-family: Arial, sans-serif;
        }
        .crypto-header, .crypto-history {
          max-width: 760px;
          margin: 0 auto 28px;
        }
        .crypto-header { text-align: center; }
        .crypto-back {
          display: block;
          margin-bottom: 20px;
          border: 1px solid #393939;
          border-radius: 8px;
          padding: 10px 13px;
          background: #171717;
          color: white;
          cursor: pointer;
        }
        .crypto-brand {
          color: #ff3648;
          font-weight: 900;
          letter-spacing: 3px;
        }
        .crypto-header h1 { font-size: clamp(22px, 5vw, 34px); }
        .crypto-header p, .crypto-muted { color: #aaa; }
        .crypto-cards {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
          max-width: 760px;
          margin: 0 auto 40px;
        }
        .crypto-card {
          display: flex;
          min-height: 245px;
          flex-direction: column;
          align-items: flex-start;
          gap: 13px;
          padding: 22px;
          border: 1px solid #383838;
          border-radius: 16px;
          color: white;
          background: linear-gradient(145deg, #1d1d1d, #101010);
          text-align: left;
          cursor: pointer;
        }
        .crypto-card strong { font-size: 19px; }
        .crypto-card > span:not(.crypto-symbol):not(.crypto-tag) {
          color: #c7c7c7;
          line-height: 1.5;
        }
        .crypto-buy { border-top: 3px solid #37c987; }
        .crypto-sell { border-top: 3px solid #f5bd42; }
        .crypto-symbol { font-size: 38px; font-weight: 900; }
        .crypto-tag { color: #f5c542; font-size: 11px; }
        .crypto-card b { margin-top: auto; color: #ff4858; }
        .crypto-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-width: 560px;
          margin: 0 auto 40px;
          padding: 22px;
          border: 1px solid #333;
          border-radius: 16px;
          background: #141414;
        }
        .crypto-form h2 { margin: 0 0 10px; }
        .crypto-form label { margin-top: 6px; font-size: 13px; }
        .crypto-form input, .crypto-form select {
          width: 100%;
          box-sizing: border-box;
          padding: 13px;
          border: 1px solid #444;
          border-radius: 8px;
          color: white;
          background: #090909;
        }
        .crypto-total, .crypto-wallet-box, .crypto-instructions,
        .crypto-warning {
          padding: 14px;
          border-radius: 10px;
          background: #202020;
          overflow-wrap: anywhere;
        }
        .crypto-total { display: grid; gap: 8px; }
        .crypto-total span, .crypto-wallet-box small { color: #aaa; }
        .crypto-wallet-box p { overflow-wrap: anywhere; }
        .crypto-wallet-box label { display: block; margin-bottom: 8px; }
        .crypto-warning { color: #f2cf85; font-size: 12px; line-height: 1.6; }
        .crypto-submit {
          padding: 15px;
          border: 0;
          border-radius: 9px;
          color: white;
          background: #e50914;
          font-weight: 900;
          cursor: pointer;
        }
        .crypto-submit:disabled { opacity: .5; cursor: not-allowed; }
        .crypto-success, .crypto-error {
          max-width: 720px;
          margin: 0 auto 18px;
          padding: 13px;
          border-radius: 9px;
          overflow-wrap: anywhere;
        }
        .crypto-success { background: #143b2b; color: #a7f3d0; }
        .crypto-error { background: #45191d; color: #fecaca; }
        .crypto-order {
          margin: 12px 0;
          padding: 16px;
          border: 1px solid #333;
          border-radius: 12px;
          background: #141414;
          overflow-wrap: anywhere;
        }
        .crypto-order p { margin: 8px 0; }
        .crypto-order-heading {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
        }
        .crypto-status { font-size: 10px; font-weight: 900; }
        .status-completed { color: #4ade80; }
        .status-rejected { color: #fb7185; }
        .status-pending, .status-payment_review { color: #fbbf24; }
        .crypto-order small { color: #aaa; }
        .crypto-note { color: #f5c542; }
        .crypto-footer { text-align: center; color: #777; font-size: 11px; }
        @media (max-width: 520px) {
          .crypto-cards { grid-template-columns: 1fr; }
          .crypto-card { min-height: 200px; }
          .crypto-form { padding: 16px; }
        }
      `}</style>
    </main>
  );
}
