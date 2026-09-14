"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Network = "BEP20" | "TRC20" | "TON";

type NetworkInfo = {
  name: string;
  shortName: string;
  address: string;
};

const NETWORKS: Record<Network, NetworkInfo> = {
  BEP20: {
    name: "USDT (BEP20)",
    shortName: "BEP20",
    address: "0xdcdEe992E26cDBe1b024e171a3a980078BeaAC77",
  },

  TRC20: {
    name: "USDT (TRC20)",
    shortName: "TRC20",
    address: "TTYHTFZJTMisUGZcSEooegLpxYt3zVo6YQ",
  },

  TON: {
    name: "USDT (TON)",
    shortName: "TON",
    address:
      "UQCKwyZB4Ph58WjL78LIYyd3U81nTYGuwWFNGaz2_YAvJJDg",
  },
};

export default function DepositPage() {
  const router = useRouter();

  const [amount, setAmount] = useState("");
  const [network, setNetwork] = useState<Network | null>(null);

  const [showOrder, setShowOrder] = useState(false);

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const [userId, setUserId] = useState("");
  const [userEmail, setUserEmail] = useState("");

  const [depositId, setDepositId] = useState("");
  const [orderNumber, setOrderNumber] = useState("");

  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  /*
   * COMPROBAR SESIÓN
   */
  useEffect(() => {
    async function checkSession() {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.user) {
        router.replace("/");
        return;
      }

      setUserId(session.user.id);
      setUserEmail(session.user.email || "");
      setLoading(false);
    }

    checkSession();
  }, [router]);

  /*
   * VALIDAR MONTO
   */
  function getAmountNumber() {
    const normalized = amount.replace(",", ".").trim();
    const value = Number(normalized);

    if (!normalized || !Number.isFinite(value)) {
      return null;
    }

    if (value <= 0) {
      return null;
    }

    return value;
  }

  /*
   * CONFIRMAR DEPÓSITO
   */
  async function createDeposit() {
    setError("");

    const numericAmount = getAmountNumber();

    if (!numericAmount) {
      setError("Introduzca un monto válido.");
      return;
    }

    if (!network) {
      setError("Seleccione una red para continuar.");
      return;
    }

    if (!userId) {
      setError("Su sesión ha expirado. Inicie sesión nuevamente.");
      router.replace("/");
      return;
    }

    setCreating(true);

    try {
      const selectedNetwork = NETWORKS[network];

      const generatedOrderNumber =
        `DEP-${Date.now().toString().slice(-8)}`;

      /*
       * CREAR DEPÓSITO EN SUPABASE
       *
       * IMPORTANTE:
       * No se modifica el balance aquí.
       * El depósito queda PENDING hasta ser verificado.
       */
      const { data, error: insertError } = await supabase
        .from("deposits")
        .insert({
          user_id: userId,
          amount: numericAmount,
          network: network,
          address: selectedNetwork.address,
          status: "PENDING",
        })
        .select("id")
        .single();

      if (insertError) {
        console.error("Error creando depósito:", insertError);

        setError(
          "No se pudo crear la orden de depósito. Verifique la configuración de Supabase."
        );

        setCreating(false);
        return;
      }

      setDepositId(data.id);
      setOrderNumber(generatedOrderNumber);

      setShowOrder(true);
      setCreating(false);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (err) {
      console.error(err);

      setError("Ocurrió un error inesperado.");
      setCreating(false);
    }
  }

  /*
   * COPIAR DIRECCIÓN
   */
  async function copyAddress() {
    if (!network) return;

    try {
      await navigator.clipboard.writeText(
        NETWORKS[network].address
      );

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      setError("No se pudo copiar la dirección.");
    }
  }

  /*
   * QR
   *
   * El contenido del QR es exactamente la dirección pública
   * de recepción seleccionada.
   */
  function getQrUrl() {
    if (!network) return "";

    const address = NETWORKS[network].address;

    return `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(
      address
    )}`;
  }

  /*
   * VOLVER A SELECCIÓN
   */
  function backToSelection() {
    setShowOrder(false);
    setDepositId("");
    setOrderNumber("");
    setCopied(false);
    setError("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  if (loading) {
    return (
      <main className="balance-page">
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontWeight: 900,
          }}
        >
          CARGANDO...
        </div>
      </main>
    );
  }

  /*
   * ORDEN DE DEPÓSITO
   */
  if (showOrder && network) {
    const selectedNetwork = NETWORKS[network];

    return (
      <main className="balance-page deposit-page">

        <header className="balance-header">
          <button
            type="button"
            className="balance-back-button"
            onClick={() => router.push("/balance")}
            aria-label="Volver"
          >
            ←
          </button>

          <div className="balance-header-title">
            <span>STORE GAMING</span>
            <strong>ORDEN DE DEPÓSITO</strong>
          </div>

          <div
            style={{
              width: 42,
              height: 42,
            }}
          />
        </header>

        <section className="deposit-order-page">

          <div className="deposit-order-status">
            <div className="deposit-pending-icon">
              ₮
            </div>

            <div>
              <span>ORDEN CREADA</span>
              <strong>PENDIENTE DE PAGO</strong>
            </div>
          </div>

          <div className="deposit-order-number">
            <span>NÚMERO DE ORDEN</span>
            <strong>{orderNumber}</strong>
          </div>

          <div className="deposit-amount-card">

            <span>MONTO A ENVIAR</span>

            <strong>
              {Number(amount.replace(",", ".")).toFixed(2)}
            </strong>

            <small>USDT</small>

          </div>

          <div className="deposit-network-card">

            <div className="deposit-network-symbol">
              ₮
            </div>

            <div className="deposit-network-information">
              <span>RED SELECCIONADA</span>
              <strong>{selectedNetwork.name}</strong>
            </div>

          </div>

          <div className="deposit-address-card">

            <div className="deposit-address-title">
              <span>DIRECCIÓN DE DESTINO</span>

              <button
                type="button"
                onClick={copyAddress}
                className="deposit-copy-button"
              >
                {copied ? "✓ COPIADA" : "COPIAR"}
              </button>
            </div>

            <div className="deposit-address">
              {selectedNetwork.address}
            </div>

          </div>

          <div className="deposit-qr-card">

            <div className="deposit-qr-title">
              ESCANEA EL QR PARA PAGAR
            </div>

            <div className="deposit-qr-wrapper">

              <img
                src={getQrUrl()}
                alt={`QR de depósito ${selectedNetwork.name}`}
                className="deposit-qr-image"
              />

            </div>

            <p>
              Escanea este código desde tu wallet para enviar
              exactamente el monto indicado.
            </p>

          </div>

          <div className="deposit-warning">

            <span>⚠️</span>

            <div>
              <strong>IMPORTANTE</strong>

              <p>
                Envía únicamente USDT utilizando la red{" "}
                {selectedNetwork.shortName}.
                No utilices otra red porque los fondos podrían
                perderse.
              </p>
            </div>

          </div>

          <div className="deposit-order-info">

            <div>
              <span>ESTADO</span>
              <strong>PENDIENTE</strong>
            </div>

            <div>
              <span>MONTO</span>
              <strong>
                {Number(amount.replace(",", ".")).toFixed(2)} USDT
              </strong>
            </div>

            <div>
              <span>RED</span>
              <strong>{selectedNetwork.shortName}</strong>
            </div>

          </div>

          {depositId && (
            <div className="deposit-reference">
              <span>REFERENCIA DEL DEPÓSITO</span>
              <small>{depositId}</small>
            </div>
          )}

          <button
            type="button"
            className="secondary-button deposit-back-selection"
            onClick={backToSelection}
          >
            ← CAMBIAR DEPÓSITO
          </button>

          <button
            type="button"
            className="secondary-button"
            onClick={() => router.push("/balance")}
          >
            VOLVER A MI BILLETERA
          </button>

        </section>

        <footer className="game-service-footer">
          <strong>STORE GAMING</strong>
          <span>DEPÓSITOS SEGUROS</span>
        </footer>

      </main>
    );
  }

  /*
   * SELECCIÓN DE DEPÓSITO
   */
  return (
    <main className="balance-page deposit-page">

      <header className="balance-header">

        <button
          type="button"
          className="balance-back-button"
          onClick={() => router.push("/balance")}
          aria-label="Volver"
        >
          ←
        </button>

        <div className="balance-header-title">
          <span>STORE GAMING</span>
          <strong>INSERTAR BALANCE</strong>
        </div>

        <div
          style={{
            width: 42,
            height: 42,
          }}
        />

      </header>

      <section className="deposit-selection-page">

        <div className="deposit-intro">

          <span className="deposit-intro-icon">
            ₮
          </span>

          <div>
            <span>MI BILLETERA</span>
            <h1>INSERTAR BALANCE</h1>
          </div>

        </div>

        <div className="deposit-user-card">

          <span>CUENTA</span>

          <strong>
            {userEmail}
          </strong>

        </div>

        <div className="deposit-amount-section">

          <label htmlFor="deposit-amount">
            MONTO A INSERTAR
          </label>

          <div className="deposit-amount-input-wrapper">

            <span>₮</span>

            <input
              id="deposit-amount"
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(event) => {
                const value = event.target.value;

                if (/^[0-9]*[.,]?[0-9]*$/.test(value)) {
                  setAmount(value);
                  setError("");
                }
              }}
              placeholder="0.00"
              autoComplete="off"
            />

            <strong>USDT</strong>

          </div>

        </div>

        <div className="deposit-network-section">

          <div className="deposit-section-heading">
            <span>01</span>

            <div>
              <strong>SELECCIONA LA RED</strong>
              <p>
                Utiliza la misma red desde tu wallet.
              </p>
            </div>
          </div>

          <div className="deposit-network-list">

            {(Object.keys(NETWORKS) as Network[]).map(
              (networkKey) => {
                const item = NETWORKS[networkKey];
                const selected = network === networkKey;

                return (
                  <button
                    key={networkKey}
                    type="button"
                    className={`deposit-network-option ${
                      selected ? "selected" : ""
                    }`}
                    onClick={() => {
                      setNetwork(networkKey);
                      setError("");
                    }}
                  >

                    <div className="deposit-tether-icon">
                      ₮
                    </div>

                    <div className="deposit-network-text">
                      <strong>{item.name}</strong>
                      <span>
                        Red de recepción {item.shortName}
                      </span>
                    </div>

                    <div className="deposit-network-check">
                      {selected ? "✓" : ""}
                    </div>

                  </button>
                );
              }
            )}

          </div>

        </div>

        {error && (
          <div className="deposit-error">
            <span>!</span>
            {error}
          </div>
        )}

        <div className="deposit-security-notice">

          <span>🔒</span>

          <div>
            <strong>DEPÓSITO SEGURO</strong>

            <p>
              Su depósito quedará asociado a su cuenta y será
              verificado antes de acreditar el balance.
            </p>
          </div>

        </div>

        <button
          type="button"
          className="deposit-confirm-button"
          onClick={createDeposit}
          disabled={creating}
        >
          {creating ? "CREANDO ORDEN..." : "CONFIRMAR"}
        </button>

        <button
          type="button"
          className="secondary-button"
          onClick={() => router.push("/balance")}
        >
          CANCELAR
        </button>

      </section>

      <footer className="game-service-footer">
        <strong>STORE GAMING</strong>
        <span>DEPÓSITOS SEGUROS</span>
      </footer>

    </main>
  );
}
