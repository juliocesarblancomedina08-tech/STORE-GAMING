"use client";

import { useEffect, useState } from "react";
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

type AdjustmentAction = "ADD" | "SUBTRACT";

type AdjustmentResponse = {
  ok?: boolean;
  error?: string;
  message?: string;
  balance?: number;
};

const ADMIN_EMAIL = "juliocesarblancomedina08@gmail.com";

export default function AdminBalancesPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [loadingBalances, setLoadingBalances] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  const [clients, setClients] = useState<BalanceClient[]>([]);
  const [totalBalance, setTotalBalance] = useState(0);

  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [expandedClientId, setExpandedClientId] = useState("");
  const [adjustmentAmount, setAdjustmentAmount] = useState("");
  const [adjustmentMode, setAdjustmentMode] =
    useState<AdjustmentAction>("ADD");

  const [adjustingClientId, setAdjustingClientId] = useState("");
  const [adjustmentError, setAdjustmentError] = useState("");
  const [adjustmentSuccess, setAdjustmentSuccess] = useState("");

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

        const email = session.user.email?.trim().toLowerCase() || "";

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

    void verifyAdmin();

    return () => {
      mounted = false;
    };
  }, [router]);

  async function loadBalances(accessToken?: string) {
    setLoadingBalances(true);
    setError("");

    try {
      let token = accessToken;

      if (!token) {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        token = session?.access_token;
      }

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

      const data = (await response.json()) as BalancesResponse;

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

  function toggleAdjustment(client: BalanceClient) {
    if (expandedClientId === client.id) {
      setExpandedClientId("");
      setAdjustmentAmount("");
      setAdjustmentError("");
      setAdjustmentSuccess("");
      return;
    }

    setExpandedClientId(client.id);
    setAdjustmentAmount("");
    setAdjustmentMode("ADD");
    setAdjustmentError("");
    setAdjustmentSuccess("");
  }

  function selectMode(mode: AdjustmentAction) {
    setAdjustmentMode(mode);
    setAdjustmentError("");
    setAdjustmentSuccess("");
  }

  async function submitAdjustment(
    client: BalanceClient,
    action: AdjustmentAction
  ) {
    if (adjustingClientId) return;

    const amount = Number(adjustmentAmount);

    if (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      amount > 1_000_000_000
    ) {
      setAdjustmentError("Introduce una cantidad válida mayor que cero.");
      return;
    }

    if (Math.round(amount * 100) !== amount * 100) {
      setAdjustmentError("La cantidad solo puede tener dos decimales.");
      return;
    }

    if (action === "SUBTRACT" && amount > Number(client.balance)) {
      setAdjustmentError(
        "No puedes restar más saldo del que tiene el cliente."
      );
      return;
    }

    const actionText = action === "ADD" ? "añadir" : "restar";

    const confirmed = window.confirm(
      `¿Confirmas ${actionText} $${formatBalance(amount)} USDT a ${client.email}?`
    );

    if (!confirmed) return;

    setAdjustingClientId(client.id);
    setAdjustmentError("");
    setAdjustmentSuccess("");

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        router.replace("/login");
        return;
      }

      const response = await fetch("/api/admin/balances/adjust", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          userId: client.id,
          amount,
          action,
        }),
      });

      const data = (await response.json()) as AdjustmentResponse;

      if (!response.ok || !data.ok) {
        throw new Error(
          data.error || "No se pudo modificar el saldo."
        );
      }

      setAdjustmentSuccess(
        data.message ||
          `Saldo actualizado correctamente para ${client.email}.`
      );

      setAdjustmentAmount("");

      await loadBalances(session.access_token);
    } catch (err) {
      console.error("ERROR MODIFICANDO SALDO:", err);

      setAdjustmentError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error al modificar el saldo."
      );
    } finally {
      setAdjustingClientId("");
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
          onClick={() => void loadBalances()}
          aria-label="Actualizar balances"
          disabled={loadingBalances}
        >
          ↻
        </button>
      </header>

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

      <section className="admin-intro">
        <span>CONTROL FINANCIERO</span>
        <h2>BALANCES</h2>
        <p>
          Consulta y administra el saldo disponible de cada cliente
          registrado.
        </p>
      </section>

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

      {error && (
        <section className="admin-error-card">
          <strong>⚠️ ERROR</strong>
          <p>{error}</p>
          <button
            type="button"
            onClick={() => void loadBalances()}
          >
            REINTENTAR
          </button>
        </section>
      )}

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
          filteredClients.map((client) => (
            <div
              key={client.id}
              className="admin-service-card admin-balance-client-card"
              style={{
                display: "block",
                padding: "16px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  width: "100%",
                }}
              >
                <div className="admin-service-icon">👤</div>

                <div
                  className="admin-service-content"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    overflowWrap: "anywhere",
                  }}
                >
                  <strong>{client.email}</strong>
                  <span>ID: {client.id}</span>
                  <small>SALDO DISPONIBLE</small>
                </div>

                <button
                  type="button"
                  onClick={() => toggleAdjustment(client)}
                  aria-expanded={expandedClientId === client.id}
                  aria-controls={`adjustment-panel-${client.id}`}
                  aria-label={`Administrar saldo de ${client.email}`}
                  style={{
                    border: "1px solid #ef4444",
                    borderRadius: "10px",
                    padding: "10px",
                    background: "rgba(239, 68, 68, 0.08)",
                    color: "#ffffff",
                    cursor: "pointer",
                    textAlign: "right",
                    flexShrink: 0,
                  }}
                >
                  <strong
                    style={{
                      display: "block",
                      color: "#f87171",
                      fontSize: "16px",
                    }}
                  >
                    ${formatBalance(client.balance)}
                  </strong>
                  <span
                    style={{
                      display: "block",
                      fontSize: "11px",
                      marginTop: "3px",
                    }}
                  >
                    USDT {expandedClientId === client.id ? "▲" : "✎"}
                  </span>
                </button>
              </div>

              {expandedClientId === client.id && (
                <div
                  id={`adjustment-panel-${client.id}`}
                  style={{
                    marginTop: "18px",
                    padding: "16px",
                    borderRadius: "12px",
                    border: "1px solid rgba(239, 68, 68, 0.4)",
                    background: "rgba(0, 0, 0, 0.25)",
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                >
                  <div
                    style={{
                      marginBottom: "14px",
                    }}
                  >
                    <strong
                      style={{
                        display: "block",
                        color: "#ffffff",
                        fontSize: "15px",
                      }}
                    >
                      💰 ADMINISTRAR SALDO
                    </strong>

                    <span
                      style={{
                        display: "block",
                        color: "#a3a3a3",
                        fontSize: "12px",
                        marginTop: "5px",
                        overflowWrap: "anywhere",
                      }}
                    >
                      Cliente: {client.email}
                    </span>

                    <span
                      style={{
                        display: "block",
                        color: "#d4d4d4",
                        fontSize: "13px",
                        marginTop: "8px",
                      }}
                    >
                      Saldo actual:{" "}
                      <strong>
                        ${formatBalance(client.balance)} USDT
                      </strong>
                    </span>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "10px",
                      marginBottom: "16px",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => selectMode("ADD")}
                      aria-pressed={adjustmentMode === "ADD"}
                      style={{
                        padding: "12px 8px",
                        borderRadius: "9px",
                        border:
                          adjustmentMode === "ADD"
                            ? "2px solid #22c55e"
                            : "1px solid #404040",
                        background:
                          adjustmentMode === "ADD"
                            ? "rgba(34, 197, 94, 0.16)"
                            : "#171717",
                        color:
                          adjustmentMode === "ADD"
                            ? "#4ade80"
                            : "#d4d4d4",
                        fontWeight: 800,
                        cursor: "pointer",
                      }}
                    >
                      ＋ AÑADIR
                    </button>

                    <button
                      type="button"
                      onClick={() => selectMode("SUBTRACT")}
                      aria-pressed={adjustmentMode === "SUBTRACT"}
                      style={{
                        padding: "12px 8px",
                        borderRadius: "9px",
                        border:
                          adjustmentMode === "SUBTRACT"
                            ? "2px solid #ef4444"
                            : "1px solid #404040",
                        background:
                          adjustmentMode === "SUBTRACT"
                            ? "rgba(239, 68, 68, 0.16)"
                            : "#171717",
                        color:
                          adjustmentMode === "SUBTRACT"
                            ? "#f87171"
                            : "#d4d4d4",
                        fontWeight: 800,
                        cursor: "pointer",
                      }}
                    >
                      − RESTAR
                    </button>
                  </div>

                  <label
                    htmlFor={`adjustment-${client.id}`}
                    style={{
                      display: "block",
                      color: "#d4d4d4",
                      fontSize: "13px",
                      marginBottom: "8px",
                    }}
                  >
                    Cantidad en USDT
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
                    disabled={adjustingClientId !== ""}
                    style={{
                      display: "block",
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "13px",
                      borderRadius: "9px",
                      border: "1px solid #404040",
                      background: "#111111",
                      color: "#ffffff",
                      fontSize: "16px",
                      outline: "none",
                    }}
                  />

                  <button
                    type="button"
                    onClick={() =>
                      void submitAdjustment(client, adjustmentMode)
                    }
                    disabled={
                      adjustingClientId !== "" ||
                      adjustmentAmount.trim() === ""
                    }
                    style={{
                      display: "block",
                      width: "100%",
                      marginTop: "14px",
                      padding: "14px",
                      border: "none",
                      borderRadius: "9px",
                      background:
                        adjustmentMode === "ADD"
                          ? "#16a34a"
                          : "#dc2626",
                      color: "#ffffff",
                      fontWeight: 800,
                      cursor:
                        adjustingClientId !== ""
                          ? "not-allowed"
                          : "pointer",
                      opacity:
                        adjustingClientId !== "" ? 0.6 : 1,
                    }}
                  >
                    {adjustingClientId === client.id
                      ? "PROCESANDO..."
                      : adjustmentMode === "ADD"
                        ? "＋ CONFIRMAR Y AÑADIR SALDO"
                        : "− CONFIRMAR Y RESTAR SALDO"}
                  </button>

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

<button
  type="button"
  onClick={() => toggleAdjustment(client)}
  disabled={adjustingClientId !== ""}
  style={{
    width: "100%",
    marginTop: "10px",
    padding: "11px",
    border: "1px solid #404040",
    borderRadius: "9px",
    background: "transparent",
    color: "#d4d4d4",
    cursor: "pointer",
  }}
>
  CERRAR
</button>
</div>
)}
</div>
))}
</section>

<section className="admin-security-card">
  <div className="admin-security-icon">🔐</div>
  <div>
    <strong>INFORMACIÓN PROTEGIDA</strong>
    <p>
      Los balances mostrados pertenecen exclusivamente al panel
      administrativo.
    </p>
  </div>
</section>

<footer className="admin-footer">
  <strong>STORE GAMING</strong>
  <span>CONTROL DE BALANCES</span>
  <small>© 2026 STORE GAMING</small>
</footer>
</main>
);
}
