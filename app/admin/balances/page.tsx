"use client";

import {
  useEffect,
  useState,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type BalanceClient = {
  id: string;
  email: string;
  balance: number;
};

type BalancesResponse = {
  ok?: boolean;
  balances?: BalanceClient[];
  totalClients?: number;
  totalBalance?: number;
  error?: string;
};

type AdjustmentMode = "ADD" | "SUBTRACT";

const ADMIN_EMAIL =
  "juliocesarblancomedina08@gmail.com";

export default function AdminBalancesPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [loadingBalances, setLoadingBalances] =
    useState(false);
  const [authorized, setAuthorized] = useState(false);

  const [clients, setClients] =
    useState<BalanceClient[]>([]);
  const [totalBalance, setTotalBalance] = useState(0);

  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [expandedClientId, setExpandedClientId] =
    useState<string | null>(null);

  const [adjustmentMode, setAdjustmentMode] =
    useState<AdjustmentMode>("ADD");

  const [adjustmentAmount, setAdjustmentAmount] =
    useState("");

  const [adjustingClientId, setAdjustingClientId] =
    useState<string | null>(null);

  const [adjustmentError, setAdjustmentError] =
    useState("");

  const [adjustmentSuccess, setAdjustmentSuccess] =
    useState("");

  useEffect(() => {
    let mounted = true;

    async function verifyAdmin() {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (sessionError || !session?.user) {
          router.replace("/login");
          return;
        }

        const email =
          session.user.email?.trim().toLowerCase() || "";

        if (email !== ADMIN_EMAIL.toLowerCase()) {
          router.replace("/home");
          return;
        }

        setAuthorized(true);
        setLoading(false);

        await loadBalances(session.access_token);
      } catch (err) {
        console.error("ERROR VERIFICANDO ADMIN:", err);

        if (mounted) {
          router.replace("/login");
        }
      }
    }

    verifyAdmin();

    return () => {
      mounted = false;
    };
  }, [router]);

  async function getAccessToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return session?.access_token || "";
  }

  async function loadBalances(accessToken?: string) {
    setLoadingBalances(true);
    setError("");

    try {
      const token = accessToken || await getAccessToken();

      if (!token) {
        router.replace("/login");
        return;
      }

      const response = await fetch("/api/admin/balances", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      const data =
        (await response.json()) as BalancesResponse;

      if (!response.ok) {
        throw new Error(
          data.error || "No se pudieron cargar los balances."
        );
      }

      setClients(data.balances || []);
      setTotalBalance(Number(data.totalBalance || 0));
    } catch (err) {
      console.error("ERROR CARGANDO BALANCES:", err);

      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron cargar los balances."
      );
    } finally {
      setLoadingBalances(false);
    }
  }

  function goBack() {
    router.push("/admin");
  }

  function formatBalance(amount: number) {
    return Number(amount || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function toggleAdjustment(clientId: string) {
    setExpandedClientId((current) =>
      current === clientId ? null : clientId
    );

    setAdjustmentAmount("");
    setAdjustmentMode("ADD");
    setAdjustmentError("");
    setAdjustmentSuccess("");
  }

  function selectMode(mode: AdjustmentMode) {
    setAdjustmentMode(mode);
    setAdjustmentError("");
    setAdjustmentSuccess("");
  }

  async function submitAdjustment(
    event: FormEvent<HTMLFormElement>,
    client: BalanceClient
  ) {
    event.preventDefault();

    setAdjustmentError("");
    setAdjustmentSuccess("");

    const amount = Number(adjustmentAmount);

    if (
      !adjustmentAmount.trim() ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      setAdjustmentError(
        "Introduce una cantidad válida mayor que cero."
      );
      return;
    }

    if (amount > 1_000_000_000) {
      setAdjustmentError(
        "La cantidad introducida es demasiado grande."
      );
      return;
    }

    if (
      adjustmentMode === "SUBTRACT" &&
      amount > Number(client.balance)
    ) {
      setAdjustmentError(
        "El descuento no puede superar el saldo actual."
      );
      return;
    }

    const confirmed = window.confirm(
      adjustmentMode === "ADD"
        ? `¿Confirmas sumar $${formatBalance(amount)} al saldo de ${client.email}?`
        : `¿Confirmas restar $${formatBalance(amount)} del saldo de ${client.email}?`
    );

    if (!confirmed) return;

    setAdjustingClientId(client.id);

    try {
      const token = await getAccessToken();

      if (!token) {
        router.replace("/login");
        return;
      }

      const response = await fetch(
        "/api/admin/balances/adjust",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            userId: client.id,
            amount,
            action: adjustmentMode,
          }),
        }
      );

      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
        balance?: number;
      };

      if (!response.ok || data.ok !== true) {
        throw new Error(
          data.error ||
            "No se pudo actualizar el crédito."
        );
      }

      setAdjustmentSuccess(
        adjustmentMode === "ADD"
          ? `Se sumaron $${formatBalance(amount)} correctamente.`
          : `Se restaron $${formatBalance(amount)} correctamente.`
      );

      setAdjustmentAmount("");

      // Recargar los datos confirmados por el servidor.
      await loadBalances(token);
    } catch (err) {
      console.error("ERROR AJUSTANDO CRÉDITO:", err);

      setAdjustmentError(
        err instanceof Error
          ? err.message
          : "No se pudo actualizar el crédito."
      );
    } finally {
      setAdjustingClientId(null);
    }
  }

  const filteredClients = clients.filter((client) => {
    const value = search.trim().toLowerCase();

    if (!value) return true;

    return (
      client.email.toLowerCase().includes(value) ||
      client.id.toLowerCase().includes(value)
    );
  });

  if (loading) {
    return (
      <main className="admin-page">
        <div className="admin-loading">
          <div className="admin-loading-icon">👑</div>
          <p>VERIFICANDO ACCESO...</p>
        </div>
      </main>
    );
  }

  if (!authorized) return null;

  return (
    <main className="admin-page">
      {/* ENCABEZADO */}
      <header className="admin-header">
        <button
          type="button"
          className="admin-back-button"
          onClick={goBack}
          aria-label="Volver"
        >
          ←
        </button>

        <div className="admin-header-title">
          <div className="admin-header-icon">💰</div>

          <div>
            <span>STORE GAMING</span>
            <h1>BALANCES</h1>
          </div>
        </div>

        <button
          type="button"
          className="admin-logout-button"
          onClick={() => loadBalances()}
          aria-label="Actualizar"
          disabled={loadingBalances}
        >
          ↻
        </button>
      </header>

      {/* RESUMEN */}
      <section className="admin-account-card">
        <div className="admin-account-icon">💰</div>

        <div className="admin-account-info">
          <span>SALDO TOTAL DE CLIENTES</span>
          <strong>${formatBalance(totalBalance)}</strong>
        </div>

        <div className="admin-account-status">
          <span />
          {clients.length} CLIENTES
        </div>
      </section>

      {/* INTRODUCCIÓN */}
      <section className="admin-intro">
        <span>CONTROL FINANCIERO</span>
        <h2>BALANCES</h2>
        <p>
          Consulta y administra el crédito disponible
          de cada cliente registrado.
        </p>
      </section>

      {/* BUSCADOR */}
      <section className="admin-balances-search">
        <span>🔎</span>

        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por correo o ID..."
          aria-label="Buscar cliente"
        />
      </section>

      {/* ERROR GENERAL */}
      {error && (
        <section className="admin-error-card">
          <strong>⚠️ ERROR</strong>
          <p>{error}</p>

          <button
            type="button"
            onClick={() => loadBalances()}
          >
            REINTENTAR
          </button>
        </section>
      )}

      {/* LISTA DE CLIENTES */}
      <section className="admin-services">
        {loadingBalances && (
          <div className="admin-loading-card">
            <div>↻</div>
            <span>CARGANDO BALANCES...</span>
          </div>
        )}

        {!loadingBalances &&
          !error &&
          filteredClients.length === 0 && (
            <div className="admin-empty-card">
              <div>👥</div>
              <strong>NO HAY CLIENTES</strong>
              <span>
                No se encontraron clientes con esa búsqueda.
              </span>
            </div>
          )}

        {!loadingBalances &&
          filteredClients.map((client) => {
            const isExpanded =
              expandedClientId === client.id;

            const isAdjusting =
              adjustingClientId === client.id;

            return (
              <article
                key={client.id}
                className="admin-service-card admin-balance-client-card"
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  cursor: "default",
                  gap: "12px",
                }}
              >
                <div className="admin-service-icon">
                  👤
                </div>

                <div
                  className="admin-service-content"
                  style={{
                    flex: "1 1 145px",
                    minWidth: 0,
                  }}
                >
                  <strong
                    style={{
                      overflowWrap: "anywhere",
                    }}
                  >
                    {client.email || "Usuario sin correo"}
                  </strong>

                  <span
                    style={{
                      overflowWrap: "anywhere",
                    }}
                  >
                    ID: {client.id}
                  </span>

                  <small>SALDO DISPONIBLE</small>
                </div>

                {/* TOCAR EL SALDO ABRE EL PANEL */}
                <button
                  type="button"
                  onClick={() => toggleAdjustment(client.id)}
                  aria-expanded={isExpanded}
                  aria-label={`Gestionar crédito de ${client.email}`}
                  style={{
                    border: "1px solid rgba(229,9,20,.35)",
                    borderRadius: "12px",
                    padding: "10px 12px",
                    background: isExpanded
                      ? "rgba(229,9,20,.15)"
                      : "rgba(255,255,255,.035)",
                    color: "#fff",
                    cursor: "pointer",
                    textAlign: "right",
                    minWidth: "105px",
                  }}
                >
                  <strong
                    style={{
                      display: "block",
                      fontSize: "17px",
                      fontWeight: 900,
                    }}
                  >
                    ${formatBalance(client.balance)}
                  </strong>

                  <span
                    style={{
                      display: "block",
                      marginTop: "4px",
                      color: "#aaa",
                      fontSize: "10px",
                    }}
                  >
                    USDT {isExpanded ? "▲" : "＋"}
                  </span>
                </button>

                {/* PANEL DESPLEGABLE */}
                {isExpanded && (
                  <div
                    style={{
                      flex: "1 0 100%",
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "16px",
                      marginTop: "4px",
                      borderRadius: "14px",
                      background:
                        "linear-gradient(145deg,#151515,#090909)",
                      border: "1px solid rgba(229,9,20,.28)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "10px",
                        marginBottom: "7px",
                      }}
                    >
                      <strong
                        style={{
                          color: "#fff",
                          fontSize: "12px",
                        }}
                      >
                        ⚙️ AJUSTAR CRÉDITO
                      </strong>

                      <button
                        type="button"
                        onClick={() => toggleAdjustment(client.id)}
                        aria-label="Cerrar ajustes"
                        style={{
                          border: 0,
                          background: "transparent",
                          color: "#aaa",
                          fontSize: "20px",
                          cursor: "pointer",
                        }}
                      >
                        ×
                      </button>
                    </div>

                    <p
                      style={{
                        margin: "0 0 14px",
                        color: "#999",
                        fontSize: "11px",
                        overflowWrap: "anywhere",
                      }}
                    >
                      Cliente: {client.email}
                    </p>

                    <div
                      style={{
                        padding: "11px",
                        borderRadius: "10px",
                        background: "#0b0b0b",
                        border: "1px solid #292929",
                        marginBottom: "14px",
                      }}
                    >
                      <span
                        style={{
                          display: "block",
                          color: "#888",
                          fontSize: "10px",
                          marginBottom: "5px",
                        }}
                      >
                        SALDO ACTUAL
                      </span>

                      <strong
                        style={{
                          color: "#fff",
                          fontSize: "23px",
                        }}
                      >
                        ${formatBalance(client.balance)}
                      </strong>
                      <span
                        style={{
                          marginLeft: "7px",
                          color: "#999",
                          fontSize: "10px",
                        }}
                      >
                        USDT
                      </span>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(2,minmax(0,1fr))",
                        gap: "9px",
                        marginBottom: "14px",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => selectMode("ADD")}
                        aria-pressed={adjustmentMode === "ADD"}
                        style={{
                          minHeight: "46px",
                          borderRadius: "10px",
                          border:
                            adjustmentMode === "ADD"
                              ? "1px solid #2fbd70"
                              : "1px solid #28533b",
                          background:
                            adjustmentMode === "ADD"
                              ? "rgba(37,180,100,.17)"
                              : "#101a13",
                          color: "#45dc88",
                          fontSize: "11px",
                          fontWeight: 900,
                          cursor: "pointer",
                        }}
                      >
                        ＋ SUMAR
                      </button>

                      <button
                        type="button"
                        onClick={() => selectMode("SUBTRACT")}
                        aria-pressed={
                          adjustmentMode === "SUBTRACT"
                        }
                        style={{
                          minHeight: "46px",
                          borderRadius: "10px",
                          border:
                            adjustmentMode === "SUBTRACT"
                              ? "1px solid #e34450"
                              : "1px solid #653038",
                          background:
                            adjustmentMode === "SUBTRACT"
                              ? "rgba(229,9,20,.18)"
                              : "#1a1011",
                          color: "#ff5964",
                          fontSize: "11px",
                          fontWeight: 900,
                          cursor: "pointer",
                        }}
                      >
                        − RESTAR
                      </button>
                    </div>

                    <form
                      onSubmit={(event) =>
                        submitAdjustment(event, client)
                      }
                    >
                      <label
                        htmlFor={`adjustment-${client.id}`}
                        style={{
                          display: "block",
                          color: "#bbb",
                          fontSize: "11px",
                          fontWeight: 700,
                          marginBottom: "7px",
                        }}
                      >
                        CANTIDAD EN USDT
                      </label>

                      <input
  id={`adjustment-${client.id}`}
  type="number"
  inputMode="decimal"
  min="0.01"
  max="1000000000"
  step="0.01"
  required
  value={adjustmentAmount}
  onChange={(event) => {
    setAdjustmentAmount(event.target.value);
    setAdjustmentError("");
    setAdjustmentSuccess("");
  }}
  placeholder="Ejemplo: 5.00"
/>

<div
  style={{
    display: "flex",
    gap: "10px",
    marginTop: "14px",
    flexWrap: "wrap",
  }}
>
  <button
    type="button"
    onClick={() => submitAdjustment(client, "ADD")}
    disabled={adjustingClientId === client.id}
    style={{
      flex: "1",
      minWidth: "120px",
      padding: "13px 16px",
      border: "none",
      borderRadius: "10px",
      background: "#16a34a",
      color: "#ffffff",
      fontWeight: 800,
      cursor:
        adjustingClientId === client.id
          ? "not-allowed"
          : "pointer",
      opacity:
        adjustingClientId === client.id
          ? 0.6
          : 1,
    }}
  >
    {adjustingClientId === client.id
      ? "PROCESANDO..."
      : "＋ AÑADIR SALDO"}
  </button>

  <button
    type="button"
    onClick={() =>
      submitAdjustment(client, "SUBTRACT")
    }
    disabled={adjustingClientId === client.id}
    style={{
      flex: "1",
      minWidth: "120px",
      padding: "13px 16px",
      border: "none",
      borderRadius: "10px",
      background: "#dc2626",
      color: "#ffffff",
      fontWeight: 800,
      cursor:
        adjustingClientId === client.id
          ? "not-allowed"
          : "pointer",
      opacity:
        adjustingClientId === client.id
          ? 0.6
          : 1,
    }}
  >
    {adjustingClientId === client.id
      ? "PROCESANDO..."
      : "− RESTAR SALDO"}
  </button>
</div>

{adjustmentError && (
  <p
    role="alert"
    style={{
      marginTop: "12px",
      padding: "10px",
      borderRadius: "8px",
      background: "rgba(220, 38, 38, 0.12)",
      color: "#f87171",
      fontSize: "13px",
      overflowWrap: "anywhere",
    }}
  >
    ⚠️ {adjustmentError}
  </p>
)}

{adjustmentSuccess && (
  <p
    role="status"
    style={{
      marginTop: "12px",
      padding: "10px",
      borderRadius: "8px",
      background: "rgba(22, 163, 74, 0.12)",
      color: "#4ade80",
      fontSize: "13px",
      overflowWrap: "anywhere",
    }}
  >
    ✅ {adjustmentSuccess}
  </p>
)}
