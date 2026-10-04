"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type User = {
  id: string;
  email: string;
  balance: number;
};

type Movement = {
  id: string;
  kind: "ADD" | "SUBTRACT" | "PURCHASE";
  amount: number;
  description: string;
  product: string;
  date: string | null;
  status?: string;
};

type Summary = {
  added: number;
  spent: number;
  balance: number;
};

const ADMIN_EMAIL = "juliocesarblancomedina08@gmail.com";

export default function AdminMovementsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const selectedUserId =
    searchParams.get("userId");

  const [users, setUsers] = useState<User[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [summary, setSummary] = useState<Summary>({
    added: 0,
    spent: 0,
    balance: 0,
  });

  const [selectedUser, setSelectedUser] =
    useState<User | null>(null);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] =
    useState(false);
  const [error, setError] = useState("");

  const formatMoney = (value: number) =>
    `$${(Number(value) || 0).toFixed(2)}`;

  const formatDate = (value: string | null) => {
    if (!value) {
      return "Fecha no disponible";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Fecha no disponible";
    }

    return date.toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  /*
   * ============================================================
   * AUTENTICACIÓN
   * ============================================================
   */

  const getSessionToken = useCallback(async () => {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (
      sessionError ||
      !session?.access_token
    ) {
      router.replace("/login");
      return null;
    }

    const email =
      session.user.email?.toLowerCase();

    if (
      email !== ADMIN_EMAIL.toLowerCase()
    ) {
      router.replace("/");
      return null;
    }

    return session.access_token;
  }, [router]);

  /*
   * ============================================================
   * CARGAR USUARIOS
   * ============================================================
   */

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const token =
        await getSessionToken();

      if (!token) {
        return;
      }

      const response = await fetch(
        "/api/admin/movements",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (
        !response.ok ||
        !data.ok
      ) {
        throw new Error(
          data.error ||
            "No se pudieron cargar los usuarios."
        );
      }

      setUsers(
        Array.isArray(data.users)
          ? data.users
          : []
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error cargando usuarios."
      );
    } finally {
      setLoading(false);
    }
  }, [getSessionToken]);

  /*
   * ============================================================
   * CARGAR DETALLE
   * ============================================================
   */

  const loadDetail = useCallback(
    async (userId: string) => {
      setDetailLoading(true);
      setError("");

      try {
        const token =
          await getSessionToken();

        if (!token) {
          return;
        }

        const response = await fetch(
          `/api/admin/movements?userId=${encodeURIComponent(
            userId
          )}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          }
        );

        const data = await response.json();

        if (
          !response.ok ||
          !data.ok
        ) {
          throw new Error(
            data.error ||
              "No se pudo cargar el historial."
          );
        }

        setSelectedUser(
          data.user || null
        );

        setSummary(
          data.summary || {
            added: 0,
            spent: 0,
            balance: 0,
          }
        );

        setMovements(
          Array.isArray(data.movements)
            ? data.movements
            : []
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Error cargando movimientos."
        );
      } finally {
        setDetailLoading(false);
      }
    },
    [getSessionToken]
  );

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    if (selectedUserId) {
      void loadDetail(selectedUserId);
    } else {
      setSelectedUser(null);
      setMovements([]);
      setSummary({
        added: 0,
        spent: 0,
        balance: 0,
      });
    }
  }, [selectedUserId, loadDetail]);

  /*
   * ============================================================
   * BÚSQUEDA
   * ============================================================
   */

  const filteredUsers = useMemo(() => {
    const term =
      search.trim().toLowerCase();

    if (!term) {
      return users;
    }

    return users.filter((user) =>
      user.email
        .toLowerCase()
        .includes(term)
    );
  }, [users, search]);

  /*
   * ============================================================
   * VISTA DE USUARIO
   * ============================================================
   */

  if (selectedUserId) {
    return (
      <main className="movements-page">
        <style jsx>{`
          .movements-page {
            min-height: 100vh;
            padding: 22px 16px 45px;
            background:
              radial-gradient(
                circle at 50% 0%,
                rgba(229, 9, 20, 0.16),
                transparent 38%
              ),
              #080808;
            color: #fff;
          }

          .container {
            width: 100%;
            max-width: 950px;
            margin: 0 auto;
          }

          .top-actions {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
          }

          button {
            font-family: inherit;
          }

          .back-button,
          .refresh-button {
            min-height: 44px;
            border: 1px solid #e50914;
            border-radius: 10px;
            padding: 11px 16px;
            color: #fff;
            background: #151515;
            font-size: 14px;
            font-weight: 800;
            cursor: pointer;
          }

          .back-button:hover,
          .refresh-button:hover {
            background: #e50914;
          }

          .user-header {
            margin-bottom: 20px;
            padding: 20px;
            border: 1px solid #e50914;
            border-radius: 17px;
            background:
              linear-gradient(
                125deg,
                rgba(229, 9, 20, 0.2),
                rgba(15, 15, 15, 0.98) 55%
              ),
              #111;
          }

          .header-label {
            display: block;
            margin-bottom: 7px;
            color: #aaa;
            font-size: 12px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.8px;
          }

          .user-email {
            display: block;
            color: #fff;
            font-size: 18px;
            font-weight: 900;
            overflow-wrap: anywhere;
          }

          .summary {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 12px;
            margin-bottom: 24px;
          }

          .summary-card {
            min-width: 0;
            padding: 19px 15px;
            border: 1px solid #303030;
            border-radius: 14px;
            background: linear-gradient(
              135deg,
              #181818,
              #0d0d0d
            );
          }

          .summary-label {
            display: block;
            margin-bottom: 10px;
            color: #aaa;
            font-size: 11px;
            font-weight: 900;
            letter-spacing: 0.6px;
          }

          .summary-value {
            display: block;
            font-size: clamp(20px, 5vw, 29px);
            font-weight: 900;
            overflow-wrap: anywhere;
          }

          .added {
            color: #43f28a;
          }

          .spent {
            color: #ff4d57;
          }

          .current {
            color: #fff;
          }

          .section-title {
            margin: 0 0 13px;
            font-size: 20px;
            font-weight: 900;
          }

          .error {
            margin-bottom: 15px;
            padding: 14px;
            border: 1px solid #e50914;
            border-radius: 11px;
            color: #ff777d;
            background: #151010;
          }

          .loading,
          .empty {
            padding: 25px;
            border: 1px solid #303030;
            border-radius: 13px;
            color: #ccc;
            background: #111;
            text-align: center;
          }

          .movement-list {
            display: flex;
            flex-direction: column;
            gap: 10px;
          }

          .movement {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 15px;
            padding: 16px;
            border: 1px solid #2c2c2c;
            border-radius: 13px;
            background: #111;
          }

          .movement.add {
            border-left: 4px solid #43f28a;
          }

          .movement.subtract,
          .movement.purchase {
            border-left: 4px solid #ff3b45;
          }

          .movement-left {
            min-width: 0;
            display: flex;
            flex-direction: column;
            gap: 6px;
          }

          .movement-title {
            color: #fff;
            font-size: 15px;
            font-weight: 850;
            overflow-wrap: anywhere;
          }

          .movement-date {
            color: #888;
            font-size: 12px;
          }

          .movement-right {
            flex-shrink: 0;
            text-align: right;
          }

          .movement-amount {
            font-size: 19px;
            font-weight: 950;
            white-space: nowrap;
          }

          .movement-amount.green {
            color: #43f28a;
          }

          .movement-amount.red {
            color: #ff4d57;
          }

          .movement-type {
            margin-top: 4px;
            color: #888;
            font-size: 10px;
            font-weight: 800;
            text-transform: uppercase;
          }

          @media (max-width: 600px) {
            .summary {
              gap: 7px;
            }

            .summary-card {
              padding: 15px 10px;
            }

            .summary-label {
              font-size: 10px;
            }

            .summary-value {
              font-size: 19px;
            }

            .movement {
              align-items: flex-start;
            }

            .movement-right {
              padding-top: 2px;
            }
          }

          @media (max-width: 390px) {
            .summary-value {
              font-size: 17px;
            }

            .movement {
              padding: 13px;
              gap: 8px;
            }

            .movement-amount {
              font-size: 16px;
            }
          }
        `}</style>

        <div className="container">
          <div className="top-actions">
            <button
              type="button"
              className="back-button"
              onClick={() =>
                router.push("/admin/movements")
              }
            >
              ← Usuarios
            </button>

            <button
              type="button"
              className="refresh-button"
              onClick={() =>
                void loadDetail(
                  selectedUserId
                )
              }
              disabled={detailLoading}
            >
              {detailLoading
                ? "Cargando..."
                : "↻ Actualizar"}
            </button>
          </div>

          {error && (
            <div className="error">
              {error}
            </div>
          )}

          <section className="user-header">
            <span className="header-label">
              Usuario
            </span>

            <span className="user-email">
              {selectedUser?.email ||
                "Cargando..."}
            </span>
          </section>

          <section className="summary">
            <div className="summary-card">
              <span className="summary-label">
                AGREGADO
              </span>

              <strong className="summary-value added">
                {formatMoney(
                  summary.added
                )}
              </strong>
            </div>

            <div className="summary-card">
              <span className="summary-label">
                GASTADO
              </span>

              <strong className="summary-value spent">
                {formatMoney(
                  summary.spent
                )}
              </strong>
            </div>

            <div className="summary-card">
              <span className="summary-label">
                BALANCE ACTUAL
              </span>

              <strong className="summary-value current">
                {formatMoney(
                  summary.balance
                )}
              </strong>
            </div>
          </section>

          <h2 className="section-title">
            Historial de movimientos
          </h2>

          {detailLoading ? (
            <div className="loading">
              Cargando movimientos...
            </div>
          ) : movements.length === 0 ? (
            <div className="empty">
              Este usuario todavía no tiene
              movimientos registrados.
            </div>
          ) : (
            <div className="movement-list">
              {movements.map(
                (movement) => {
                  const isAdd =
                    movement.kind ===
                    "ADD";

                  const title =
                    movement.kind ===
                    "PURCHASE"
                      ? movement.product
                      : movement.description;

                  return (
                    <div
                      className={`movement ${
                        isAdd
                          ? "add"
                          : "purchase"
                      }`}
                      key={movement.id}
                    >
                      <div className="movement-left">
                        <span className="movement-title">
                          {title}
                        </span>

                        <span className="movement-date">
                          {formatDate(
                            movement.date
                          )}
                        </span>
                      </div>

                      <div className="movement-right">
                        <div
                          className={`movement-amount ${
                            isAdd
                              ? "green"
                              : "red"
                          }`}
                        >
                          {isAdd
                            ? "+"
                            : "-"}
                          {formatMoney(
                            movement.amount
                          )}
                        </div>

                        <div className="movement-type">
                          {movement.kind ===
                          "ADD"
                            ? "Ingreso"
                            : movement.kind ===
                                "PURCHASE"
                              ? "Compra"
                              : "Ajuste"}
                        </div>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </div>
      </main>
    );
  }

  /*
   * ============================================================
   * LISTA PRINCIPAL DE USUARIOS
   * ============================================================
   */

  return (
    <main className="movements-page">
      <style jsx>{`
        .movements-page {
          min-height: 100vh;
          padding: 22px 16px 45px;
          background:
            radial-gradient(
              circle at 50% 0%,
              rgba(229, 9, 20, 0.16),
              transparent 38%
            ),
            #080808;
          color: #fff;
        }

        .container {
          width: 100%;
          max-width: 900px;
          margin: 0 auto;
        }

        .top-actions {
          margin-bottom: 22px;
        }

        .back-button {
          min-height: 44px;
          border: 1px solid #e50914;
          border-radius: 10px;
          padding: 11px 17px;
          color: #fff;
          background: #151515;
          font-size: 14px;
          font-weight: 800;
          cursor: pointer;
        }

        .back-button:hover {
          background: #e50914;
        }

        .hero {
          position: relative;
          overflow: hidden;
          margin-bottom: 22px;
          padding: 25px 22px;
          border: 1px solid #ff2631;
          border-radius: 18px;
          background:
            linear-gradient(
              125deg,
              rgba(229, 9, 20, 0.24),
              rgba(15, 15, 15, 0.98) 55%
            ),
            #111;
          box-shadow: 0 8px 30px rgba(229, 9, 20, 0.12);
        }

        .hero::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 4px;
          background: #e50914;
        }

        .hero-title {
          margin: 0 0 7px;
          font-size: clamp(25px, 6vw, 35px);
          font-weight: 950;
        }

        .hero-text {
          margin: 0;
          color: #aaa;
          font-size: 14px;
        }

        .search {
          width: 100%;
          min-height: 49px;
          margin-bottom: 18px;
          padding: 13px 15px;
          border: 1px solid #333;
          border-radius: 11px;
          outline: none;
          background: #111;
          color: #fff;
          font-size: 16px;
        }

        .search::placeholder {
          color: #888;
        }

        .search:focus {
          border-color: #e50914;
          box-shadow:
            0 0 0 2px
              rgba(229, 9, 20, 0.13);
        }

        .section-title {
          margin: 0 0 13px;
          font-size: 19px;
          font-weight: 900;
        }

        .user-list {
          display: flex;
          flex-direction: column;
          gap: 11px;
        }

        .user-row {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          padding: 16px;
          border: 1px solid #303030;
          border-left: 4px solid #e50914;
          border-radius: 13px;
                    background:
            linear-gradient(
              110deg,
              #171717,
              #0d0d0d
            );
          color: #fff;
          text-align: left;
          cursor: pointer;
          transition:
            border-color 0.2s ease,
            background 0.2s ease,
            transform 0.2s ease;
        }

        .user-row:hover {
          border-color: #e50914;
          background: #1b1112;
        }

        .user-row:active {
          transform: scale(0.995);
        }

        .user-info {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .label {
          color: #999;
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.7px;
        }

        .email {
          color: #fff;
          font-size: 15px;
          font-weight: 850;
          overflow-wrap: anywhere;
        }

        .balance {
          flex-shrink: 0;
          color: #43f28a;
          font-size: 20px;
          font-weight: 950;
          white-space: nowrap;
        }

        .message {
          padding: 22px;
          border: 1px solid #303030;
          border-radius: 12px;
          background: #111;
          color: #ccc;
          text-align: center;
        }

        .error {
          margin-bottom: 15px;
          border-color: #e50914;
          color: #ff777d;
        }

        .footer {
          margin-top: 14px;
          color: #777;
          font-size: 12px;
          text-align: center;
        }

        @media (max-width: 500px) {
          .user-row {
            align-items: flex-start;
          }

          .balance {
            font-size: 17px;
          }
        }
      `}</style>

      <div className="container">
        <div className="top-actions">
          <button
            type="button"
            className="back-button"
            onClick={() => router.push("/admin")}
          >
            ← Regresar al panel
          </button>
        </div>

        <section className="hero">
          <h1 className="hero-title">
            MOVIMIENTOS
          </h1>

          <p className="hero-text">
            Historial automático de ingresos,
            compras y ajustes de saldo.
          </p>
        </section>

        <input
          className="search"
          type="search"
          placeholder="Buscar usuario por correo..."
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
        />

        {error && (
          <div className="message error">
            {error}
          </div>
        )}

        <h2 className="section-title">
          Usuarios
        </h2>

        {loading ? (
          <div className="message">
            Cargando usuarios...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="message">
            {search.trim()
              ? "No se encontraron usuarios."
              : "No hay usuarios para mostrar."}
          </div>
        ) : (
          <div className="user-list">
            {filteredUsers.map((user) => (
              <button
                type="button"
                className="user-row"
                key={user.id}
                onClick={() =>
                  router.push(
                    `/admin/movements?userId=${encodeURIComponent(
                      user.id
                    )}`
                  )
                }
              >
                <div className="user-info">
                  <span className="label">
                    Usuario
                  </span>

                  <span className="email">
                    {user.email || "Sin correo"}
                  </span>
                </div>

                <span className="balance">
                  {formatMoney(user.balance)}
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="footer">
          Mostrando {filteredUsers.length} de{" "}
          {users.length} usuarios
        </div>
      </div>
    </main>
  );
}
