"use client";

import {
  useEffect,
  useState,
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

const ADMIN_EMAIL =
  "juliocesarblancomedina08@gmail.com";

export default function AdminBalancesPage() {
  const router = useRouter();

  const [loading, setLoading] =
    useState(true);

  const [loadingBalances, setLoadingBalances] =
    useState(false);

  const [authorized, setAuthorized] =
    useState(false);

  const [clients, setClients] =
    useState<BalanceClient[]>([]);

  const [totalBalance, setTotalBalance] =
    useState(0);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
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

        if (
          sessionError ||
          !session?.user
        ) {
          router.replace("/login");
          return;
        }

        const email =
          session.user.email
            ?.trim()
            .toLowerCase() || "";

        if (
          email !==
          ADMIN_EMAIL.toLowerCase()
        ) {
          router.replace("/home");
          return;
        }

        setAuthorized(true);
        setLoading(false);

        await loadBalances(
          session.access_token
        );
      } catch (err) {
        console.error(
          "ERROR VERIFICANDO ADMIN:",
          err
        );

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

  async function loadBalances(
    accessToken?: string
  ) {
    setLoadingBalances(true);
    setError("");

    try {
      let token = accessToken;

      if (!token) {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        token =
          session?.access_token;
      }

      if (!token) {
        router.replace("/login");
        return;
      }

      const response =
        await fetch(
          "/api/admin/balances",
          {
            method: "GET",
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
            cache: "no-store",
          }
        );

      const data =
        (await response.json()) as
          BalancesResponse;

      if (!response.ok) {
        throw new Error(
          data.error ||
            "No se pudieron cargar los balances."
        );
      }

      setClients(
        data.balances || []
      );

      setTotalBalance(
        Number(
          data.totalBalance || 0
        )
      );
    } catch (err) {
      console.error(
        "ERROR CARGANDO BALANCES:",
        err
      );

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

  function formatBalance(
    amount: number
  ) {
    return amount.toLocaleString(
      "en-US",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    );
  }

  const filteredClients =
    clients.filter((client) => {
      const value =
        search.trim().toLowerCase();

      if (!value) {
        return true;
      }

      return (
        client.email
          .toLowerCase()
          .includes(value) ||
        client.id
          .toLowerCase()
          .includes(value)
      );
    });

  if (loading) {
    return (
      <main className="admin-page">

        <div className="admin-loading">

          <div className="admin-loading-icon">
            👑
          </div>

          <p>
            VERIFICANDO ACCESO...
          </p>

        </div>

      </main>
    );
  }

  if (!authorized) {
    return null;
  }

  return (
    <main className="admin-page">

      {/* =========================
          ENCABEZADO
      ========================== */}

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

          <div className="admin-header-icon">
            💰
          </div>

          <div>

            <span>
              STORE GAMING
            </span>

            <h1>
              BALANCES
            </h1>

          </div>

        </div>

        <button
          type="button"
          className="admin-logout-button"
          onClick={() =>
            loadBalances()
          }
          aria-label="Actualizar"
          disabled={loadingBalances}
        >
          ↻
        </button>

      </header>

      {/* =========================
          RESUMEN
      ========================== */}

      <section className="admin-account-card">

        <div className="admin-account-icon">
          💰
        </div>

        <div className="admin-account-info">

          <span>
            SALDO TOTAL DE CLIENTES
          </span>

          <strong>
            ${formatBalance(totalBalance)}
          </strong>

        </div>

        <div className="admin-account-status">

          <span />

          {clients.length} CLIENTES

        </div>

      </section>

      {/* =========================
          INTRO
      ========================== */}

      <section className="admin-intro">

        <span>
          CONTROL FINANCIERO
        </span>

        <h2>
          BALANCES
        </h2>

        <p>
          Consulta el saldo disponible
          de cada cliente registrado.
        </p>

      </section>

      {/* =========================
          BUSCADOR
      ========================== */}

      <section className="admin-balances-search">

        <span>
          🔎
        </span>

        <input
          type="text"
          value={search}
          onChange={(event) =>
            setSearch(
              event.target.value
            )
          }
          placeholder="Buscar por correo o ID..."
        />

      </section>

      {/* =========================
          ERROR
      ========================== */}

      {error && (
        <section className="admin-error-card">

          <strong>
            ⚠️ ERROR
          </strong>

          <p>
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              loadBalances()
            }
          >
            REINTENTAR
          </button>

        </section>
      )}

      {/* =========================
          CLIENTES
      ========================== */}

      <section className="admin-services">

        {loadingBalances && (
          <div className="admin-loading-card">

            <div>
              ↻
            </div>

            <span>
              CARGANDO BALANCES...
            </span>

          </div>
        )}

        {!loadingBalances &&
          !error &&
          filteredClients.length === 0 && (
            <div className="admin-empty-card">

              <div>
                👥
              </div>

              <strong>
                NO HAY CLIENTES
              </strong>

              <span>
                No se encontraron clientes
                con esa búsqueda.
              </span>

            </div>
          )}

        {!loadingBalances &&
          filteredClients.map(
            (client) => (
              <div
                key={client.id}
                className="admin-service-card admin-balance-client-card"
              >

                <div className="admin-service-icon">
                  👤
                </div>

                <div className="admin-service-content">

                  <strong>
                    {client.email}
                  </strong>

                  <span>
                    ID: {client.id}
                  </span>

                  <small>
                    SALDO DISPONIBLE
                  </small>

                </div>

                <div className="admin-balance-amount">

                  <strong>
                    $
                    {formatBalance(
                      client.balance
                    )}
                  </strong>

                  <span>
                    USDT
                  </span>

                </div>

              </div>
            )
          )}

      </section>

      {/* =========================
          SEGURIDAD
      ========================== */}

      <section className="admin-security-card">

        <div className="admin-security-icon">
          🔐
        </div>

        <div>

          <strong>
            INFORMACIÓN PROTEGIDA
          </strong>

          <p>
            Los balances mostrados
            pertenecen exclusivamente
            al panel administrativo.
          </p>

        </div>

      </section>

      {/* =========================
          FOOTER
      ========================== */}

      <footer className="admin-footer">

        <strong>
          STORE GAMING
        </strong>

        <span>
          CONTROL DE BALANCES
        </span>

        <small>
          © 2026 STORE GAMING
        </small>

      </footer>

    </main>
  );
            }
