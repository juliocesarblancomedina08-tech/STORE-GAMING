
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type ApiResult = {
  success?: boolean;
  created?: boolean;
  rotated?: boolean;
  hasKey?: boolean;
  needsRecovery?: boolean;
  active?: boolean | null;
  createdAt?: string | null;
  apiKey?: string;
  message?: string;
  error?: string;
};

type View = "menu" | "api";

export default function AjustesPage() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [view, setView] = useState<View>("menu");
  const [loading, setLoading] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const [needsRecovery, setNeedsRecovery] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [active, setActive] = useState<boolean | null>(null);
  const [createdAt, setCreatedAt] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [confirmRotation, setConfirmRotation] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      const { data, error: sessionError } =
        await supabase.auth.getSession();

      if (!mounted) return;

      if (sessionError || !data.session?.user) {
        router.replace("/");
        return;
      }

      setChecking(false);
    }

    void checkSession();

    return () => {
      mounted = false;
    };
  }, [router]);

  const getAccessToken = useCallback(async () => {
    const { data, error: sessionError } =
      await supabase.auth.getSession();

    if (sessionError || !data.session?.access_token) {
      router.replace("/");
      throw new Error("Tu sesión ha caducado. Inicia sesión nuevamente.");
    }

    return data.session.access_token;
  }, [router]);

  const loadApi = useCallback(async () => {
    setLoading(true);
    setError("");
    setMessage("");
    setCopied(false);
    setShowKey(false);

    try {
      const token = await getAccessToken();

      const response = await fetch("/api/account/api-key", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      const result = (await response.json()) as ApiResult;

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "No se pudo consultar tu clave API."
        );
      }

      setHasKey(Boolean(result.hasKey));
      setNeedsRecovery(Boolean(result.needsRecovery));
      setActive(
        typeof result.active === "boolean" ? result.active : null
      );
      setCreatedAt(result.createdAt || "");
      setApiKey(result.apiKey || "");

      if (!result.hasKey) {
        setMessage("Todavía no tienes una clave API. Puedes crearla aquí.");
      } else if (result.needsRecovery) {
        setMessage(
          "Tu clave anterior no se puede recuperar. Puedes generar una nueva."
        );
      } else if (result.apiKey) {
        setMessage("Tu clave API está guardada y puedes consultarla cuando quieras.");
      } else {
        setMessage("Tu clave API está registrada.");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error inesperado."
      );
    } finally {
      setLoading(false);
    }
  }, [getAccessToken]);

  async function openApi() {
    setView("api");
    setConfirmRotation(false);
    await loadApi();
  }

  async function createApiKey() {
    setLoading(true);
    setError("");
    setMessage("");
    setApiKey("");
    setCopied(false);

    try {
      const token = await getAccessToken();

      const response = await fetch("/api/account/api-key", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      const result = (await response.json()) as ApiResult;

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "No se pudo crear tu clave API."
        );
      }

      setHasKey(Boolean(result.hasKey));
      setNeedsRecovery(Boolean(result.needsRecovery));
      setActive(
        typeof result.active === "boolean" ? result.active : null
      );
      setCreatedAt(result.createdAt || "");
      setApiKey(result.apiKey || "");

      if (result.created && result.apiKey) {
        setShowKey(true);
        setMessage(
          "¡Clave API creada! Guárdala en un lugar seguro."
        );
      } else if (result.needsRecovery) {
        setMessage(
          "Ya tienes una clave anterior que no se puede recuperar. Puedes generar una nueva."
        );
      } else {
        // Si ya existe, recuperar la clave mediante GET.
        await loadApi();
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error inesperado."
      );
    } finally {
      setLoading(false);
    }
  }

  async function rotateApiKey() {
    setLoading(true);
    setError("");
    setMessage("");
    setApiKey("");
    setCopied(false);
    setConfirmRotation(false);

    try {
      const token = await getAccessToken();

      const response = await fetch("/api/account/api-key", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      const result = (await response.json()) as ApiResult;

      if (!response.ok || !result.success || !result.apiKey) {
        throw new Error(
          result.error || "No se pudo renovar tu clave API."
        );
      }

      setHasKey(true);
      setNeedsRecovery(false);
      setActive(
        typeof result.active === "boolean" ? result.active : true
      );
      setCreatedAt(result.createdAt || "");
      setApiKey(result.apiKey);
      setShowKey(true);
      setMessage(
        "Clave renovada. La clave anterior deja de ser válida. Guarda esta nueva clave."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error inesperado."
      );
    } finally {
      setLoading(false);
    }
  }

  async function copyApiKey() {
    if (!apiKey) return;

    try {
      await navigator.clipboard.writeText(apiKey);
      setCopied(true);
      setMessage("Clave copiada correctamente.");
      setError("");
    } catch {
      setError(
        "No se pudo copiar automáticamente. Selecciona la clave y cópiala manualmente."
      );
    }
  }

  if (checking) {
    return (
      <main style={styles.page}>
        <div style={styles.loading}>Comprobando tu sesión...</div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <section style={styles.container}>
        <button
          type="button"
          onClick={() =>
            view === "api" ? setView("menu") : router.push("/home")
          }
          style={styles.backButton}
        >
          ← {view === "api" ? "VOLVER A AJUSTES" : "VOLVER A INICIO"}
        </button>

        <div style={styles.logo}>🛒 STORE GAMING 🎮</div>

        {view === "menu" ? (
          <>
            <p style={styles.eyebrow}>PANEL DE CONFIGURACIÓN</p>
            <h1 style={styles.title}>
              AJUSTES <span style={styles.red}>DE CUENTA</span>
            </h1>
            <p style={styles.description}>
              Administra las opciones y los servicios de tu cuenta.
            </p>

            <button
              type="button"
              onClick={() => void openApi()}
              style={styles.optionCard}
            >
              <span style={styles.optionIcon}>🔑</span>
              <span style={styles.optionContent}>
                <strong style={styles.optionTitle}>CLAVE API</strong>
                <span style={styles.optionDescription}>
                  Crear, consultar y copiar tu clave API personal.
                </span>
              </span>
              <span style={styles.chevron}>›</span>
            </button>

            <footer style={styles.footer}>
              STORE GAMING · AJUSTES
            </footer>
          </>
        ) : (
          <>
            <p style={styles.eyebrow}>ADMINISTRACIÓN DE SERVICIOS</p>
            <h1 style={styles.title}>
              CLAVE <span style={styles.red}>API</span>
            </h1>
            <p style={styles.description}>
              Gestiona la clave vinculada a tu cuenta de STORE GAMING.
            </p>

            <div style={styles.apiCard}>
              <div style={styles.apiIcon}>🔐</div>
              <h2 style={styles.subtitle}>MI CLAVE API</h2>

              <p style={styles.description}>
                Tu clave es personal. No la compartas con otras personas.
              </p>

              <div style={styles.status}>
                <span
                  style={{
                    ...styles.dot,
                    background:
                      active === true
                        ? "#22c55e"
                        : active === false
                        ? "#ef4444"
                        : "#9ca3af",
                  }}
                />
                {hasKey
                  ? active === true
                    ? "API registrada y activa"
                    : active === false
                    ? "API desactivada"
                    : "API registrada"
                  : "Todavía no tienes una clave API"}
              </div>

              {createdAt && (
                <p style={styles.date}>
                  Fecha de creación:{" "}
                  {new Date(createdAt).toLocaleDateString("es-ES")}
                </p>
              )}

              {loading && (
                <p style={styles.message}>Procesando solicitud...</p>
              )}

              {!loading && apiKey && (
                <div style={styles.keyArea}>
                  <label style={styles.label} htmlFor="api-key">
                    TU CLAVE API
                  </label>

                  <textarea
                    id="api-key"
                    value={showKey ? apiKey : "•".repeat(32)}
                    readOnly
                    rows={3}
                    spellCheck={false}
                    style={styles.keyInput}
                    onFocus={(event) => event.currentTarget.select()}
                  />

                  <button
                    type="button"
                    onClick={() => setShowKey((value) => !value)}
                    style={styles.secondaryButton}
                  >
                    {showKey ? "🙈 OCULTAR CLAVE" : "👁️ VER CLAVE"}
                  </button>

                  <button
                    type="button"
                    onClick={() => void copyApiKey()}
                    style={styles.primaryButton}
                  >
                    {copied ? "✓ CLAVE COPIADA" : "📋 COPIAR CLAVE"}
                  </button>
                </div>
              )}

              {!loading && !hasKey && (
                <button
                  type="button"
                  onClick={() => void createApiKey()}
                  style={styles.primaryButton}
                >
                  ⚡ CREAR MI CLAVE API
                </button>
              )}

              {!loading && hasKey && needsRecovery && (
                <div style={styles.warningBox}>
                  <p style={styles.warning}>
                    Tu clave anterior se creó antes de habilitar el
                    almacenamiento cifrado. No puede recuperarse. Si
                    generas otra, la clave anterior dejará de funcionar.
                  </p>

                  {!confirmRotation ? (
                    <button
                      type="button"
                      onClick={() => setConfirmRotation(true)}
                      style={styles.primaryButton}
                    >
                      GENERAR UNA NUEVA CLAVE
                    </button>
                  ) : (
                    <>
                      <p style={styles.warning}>
                        ¿Confirmas que quieres reemplazar la clave anterior?
                        Los servicios que la utilicen deberán actualizarla.
                      </p>
                      <button
                        type="button"
                        onClick={() => void rotateApiKey()}
                        style={styles.primaryButton}
                      >
                        SÍ, RENOVAR CLAVE
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmRotation(false)}
                        style={styles.secondaryButton}
                      >
                        CANCELAR
                      </button>
                    </>
                  )}
                </div>
              )}

              {message && (
                <div style={styles.success} role="status">
                  {message}
                </div>
              )}

              {error && (
                <div style={styles.error} role="alert">
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={() => void loadApi()}
                disabled={loading}
                style={styles.secondaryButton}
              >
                ↻ ACTUALIZAR ESTADO
              </button>
            </div>

            <div style={styles.infoCard}>
              <h3 style={styles.infoTitle}>🛡️ SEGURIDAD</h3>
              <p style={styles.infoText}>
                Mantén tu clave en privado. Si la renuevas, la clave
                anterior deja de funcionar. La disponibilidad de otros
                servicios depende de que sus endpoints validen esta API.
              </p>
            </div>
          </>
        )}

        <button
          type="button"
          onClick={() => router.push("/home")}
          style={styles.homeButton}
        >
          REGRESAR A STORE GAMING
        </button>
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    boxSizing: "border-box",
    minHeight: "100vh",
    padding: "24px 14px",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    background: "linear-gradient(145deg,#080a11,#111522 55%,#080a11)",
    color: "#fff",
    fontFamily: "Arial, sans-serif",
  },
  container: {
    boxSizing: "border-box",
    width: "100%",
    maxWidth: "650px",
    padding: "22px",
    borderRadius: "18px",
    border: "1px solid rgba(255,255,255,.1)",
    background: "rgba(12,15,24,.96)",
    boxShadow: "0 15px 45px rgba(0,0,0,.35)",
  },
  loading: {
    padding: "25px",
    color: "#fff",
  },
  backButton: {
    padding: "9px 12px",
    border: "1px solid #343846",
    borderRadius: "8px",
    background: "#171b27",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 800,
    fontSize: "11px",
  },
  logo: {
    marginTop: "25px",
    color: "#fff",
    fontWeight: 900,
    fontSize: "19px",
    letterSpacing: ".5px",
  },
  eyebrow: {
    marginTop: "27px",
    marginBottom: "7px",
    color: "#ff5964",
    fontSize: "10px",
    fontWeight: 900,
    letterSpacing: "2px",
  },
  title: {
    margin: 0,
    fontSize: "clamp(26px,6vw,36px)",
    fontWeight: 900,
  },
  red: {
    color: "#ff3948",
  },
  description: {
    color: "#b8c0cf",
    fontSize: "13px",
    lineHeight: 1.7,
  },
  optionCard: {
    boxSizing: "border-box",
    width: "100%",
    marginTop: "22px",
    padding: "18px",
    display: "flex",
    alignItems: "center",
    gap: "14px",
    textAlign: "left",
    borderRadius: "14px",
    border: "1px solid rgba(255,65,80,.35)",
    background: "linear-gradient(145deg,#191d2b,#10131c)",
    color: "#fff",
    cursor: "pointer",
  },
  optionIcon: {
    width: "48px",
    height: "48px",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "12px",
    background: "#29232a",
    fontSize: "25px",
  },
  optionContent: {
    display: "flex",
    flex: 1,
    flexDirection: "column",
    gap: "7px",
  },
  optionTitle: {
    fontSize: "14px",
    fontWeight: 900,
  },
  optionDescription: {
    color: "#b8c0cf",
    fontSize: "12px",
    lineHeight: 1.6,
  },
  chevron: {
    color: "#ff5964",
    fontSize: "28px",
    fontWeight: 700,
  },
  apiCard: {
    marginTop: "24px",
    padding: "20px",
    borderRadius: "14px",
    border: "1px solid rgba(255,65,80,.3)",
    background: "linear-gradient(145deg,#171b28,#10131c)",
  },
  apiIcon: {
    fontSize: "29px",
  },
  subtitle: {
    margin: "12px 0",
    fontSize: "17px",
    fontWeight: 900,
  },
  status: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginTop: "18px",
    fontSize: "12px",
    fontWeight: 800,
  },
  dot: {
    width: "9px",
    height: "9px",
    borderRadius: "50%",
    flexShrink: 0,
  },
  date: {
    color: "#9ca3af",
    fontSize: "11px",
  },
  keyArea: {
    marginTop: "18px",
  },
  label: {
    display: "block",
    marginBottom: "9px",
    color: "#ff7a83",
    fontSize: "10px",
    fontWeight: 900,
  },
  keyInput: {
    boxSizing: "border-box",
    width: "100%",
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid #414657",
    background: "#080a10",
    color: "#fff",
    fontSize: "12px",
    lineHeight: 1.6,
    overflowWrap: "anywhere",
    resize: "vertical",
  },
  primaryButton: {
    boxSizing: "border-box",
    width: "100%",
    marginTop: "14px",
    padding: "14px",
    border: "none",
    borderRadius: "9px",
    background: "linear-gradient(135deg,#ed1827,#a9000b)",
    color: "#fff",
    fontSize: "12px",
    fontWeight: 900,
    cursor: "pointer",
  },
  secondaryButton: {
    boxSizing: "border-box",
    width: "100%",
    marginTop: "12px",
    padding: "13px",
    border: "1px solid #363b49",
    borderRadius: "9px",
    background: "#171b27",
    color: "#fff",
    fontSize: "11px",
    fontWeight: 800,
    cursor: "pointer",
  },
  homeButton: {
    boxSizing: "border-box",
    width: "100%",
    marginTop: "18px",
    padding: "13px",
    border: "1px solid #363b49",
    borderRadius: "9px",
    background: "#171b27",
    color: "#fff",
    fontSize: "11px",
    fontWeight: 800,
    cursor: "pointer",
  },
  warningBox: {
    marginTop: "16px",
    padding: "12px",
    borderRadius: "9px",
    border: "1px solid rgba(251,191,36,.3)",
    background: "rgba(251,191,36,.06)",
  },
  warning: {
    margin: "5px 0",
    color: "#fbbf24",
    fontSize: "11px",
    lineHeight: 1.7,
  },
  message: {
    marginTop: "14px",
    color: "#d1d5db",
    fontSize: "12px",
    lineHeight: 1.6,
  },
  success: {
    marginTop: "15px",
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid rgba(34,197,94,.35)",
    background: "rgba(34,197,94,.08)",
    color: "#86efac",
    fontSize: "12px",
    lineHeight: 1.6,
    overflowWrap: "anywhere",
  },
  error: {
    marginTop: "15px",
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid rgba(239,68,68,.4)",
    background: "rgba(239,68,68,.1)",
    color: "#fca5a5",
    fontSize: "12px",
    lineHeight: 1.6,
  },
  infoCard: {
    marginTop: "18px",
    padding: "16px",
    borderRadius: "12px",
    background: "rgba(255,255,255,.035)",
    border: "1px solid rgba(255,255,255,.08)",
  },
  infoTitle: {
    margin: "0 0 8px",
    fontSize: "12px",
    fontWeight: 900,
  },
  infoText: {
    margin: 0,
    color: "#b8c0cf",
    fontSize: "12px",
    lineHeight: 1.7,
  },
  footer: {
    marginTop: "24px",
    textAlign: "center",
    color: "#737b8b",
    fontSize: "9px",
    letterSpacing: "1px",
  },
};
