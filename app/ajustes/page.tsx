
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type ApiResult = {
  success?: boolean;
  created?: boolean;
  hasKey?: boolean;
  active?: boolean;
  createdAt?: string;
  apiKey?: string;
  message?: string;
  error?: string;
};

export default function AjustesPage() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [active, setActive] = useState<boolean | null>(null);
  const [createdAt, setCreatedAt] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

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

  async function createApiKey() {
    setError("");
    setMessage("");
    setApiKey("");
    setCopied(false);
    setLoading(true);

    try {
      const { data, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError || !data.session?.access_token) {
        router.replace("/");
        return;
      }

      const response = await fetch("/api/account/api-key", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${data.session.access_token}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      const result = (await response.json()) as ApiResult;

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "No se pudo gestionar la API."
        );
      }

      setHasKey(Boolean(result.hasKey));
      setActive(
        typeof result.active === "boolean"
          ? result.active
          : null
      );
      setCreatedAt(result.createdAt || "");

      if (result.created && result.apiKey) {
        setApiKey(result.apiKey);
        setMessage(
          "¡API creada! Copia y guarda tu clave ahora. No volveremos a mostrarla."
        );
      } else {
        setMessage(
          "Esta cuenta ya tiene una clave API. Por seguridad, la clave original no se puede recuperar desde aquí."
        );
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

  async function copyApiKey() {
    if (!apiKey) return;

    try {
      await navigator.clipboard.writeText(apiKey);
      setCopied(true);
      setMessage("Clave copiada. Guárdala en un lugar seguro.");
    } catch {
      setError(
        "No se pudo copiar automáticamente. Selecciona la clave y cópiala manualmente."
      );
    }
  }

  if (checking) {
    return (
      <main style={styles.page}>
        <p>Comprobando tu sesión...</p>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <section style={styles.card}>
        <button
          type="button"
          onClick={() => router.push("/home")}
          style={styles.back}
        >
          ← VOLVER A INICIO
        </button>

        <div style={styles.logo}>🛒 STORE GAMING 🎮</div>

        <p style={styles.eyebrow}>PANEL DE CUENTA</p>
        <h1 style={styles.title}>
          AJUSTES <span style={styles.red}>API</span>
        </h1>

        <p style={styles.description}>
          Administra el acceso API de tu cuenta para las
          integraciones compatibles con STORE GAMING.
        </p>

        <div style={styles.apiCard}>
          <div style={styles.apiIcon}>🔑</div>

          <h2 style={styles.subtitle}>TU CLAVE API</h2>

          <p style={styles.description}>
            Cada cuenta puede tener su propia clave. La clave
            se crea de forma segura y su hash se guarda en el
            servidor.
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
              ? active
                ? "API registrada y activa"
                : active === false
                ? "API desactivada"
                : "API registrada"
              : "Todavía no has consultado tu API"}
          </div>

          {createdAt && (
            <p style={styles.date}>
              Fecha de creación:{" "}
              {new Date(createdAt).toLocaleDateString("es-ES")}
            </p>
          )}

          {apiKey && (
            <div style={styles.keyArea}>
              <label style={styles.label} htmlFor="api-key">
                TU NUEVA CLAVE — GUÁRDALA AHORA
              </label>

              <textarea
                id="api-key"
                value={apiKey}
                readOnly
                rows={3}
                spellCheck={false}
                style={styles.keyInput}
                onFocus={(event) => event.currentTarget.select()}
              />

              <button
                type="button"
                onClick={() => void copyApiKey()}
                style={styles.primaryButton}
              >
                {copied ? "✓ CLAVE COPIADA" : "📋 COPIAR CLAVE"}
              </button>

              <p style={styles.warning}>
                ⚠️ No compartas esta clave. Si pierdes la clave,
                necesitarás regenerarla mediante un procedimiento
                seguro.
              </p>
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

          {!hasKey && (
            <button
              type="button"
              onClick={() => void createApiKey()}
              disabled={loading}
              style={{
                ...styles.primaryButton,
                opacity: loading ? 0.65 : 1,
              }}
            >
              {loading ? "CREANDO API..." : "⚡ CREAR MI CLAVE API"}
            </button>
          )}

          {hasKey && !apiKey && (
            <p style={styles.warning}>
              Tu clave ya existe y no se puede recuperar desde
              esta pantalla. No pulses repetidamente para intentar
              verla: primero tendremos que implementar la opción
              segura de regeneración.
            </p>
          )}
        </div>

        <div style={styles.infoCard}>
          <h3 style={styles.infoTitle}>🛡️ SEGURIDAD</h3>
          <p style={styles.infoText}>
            No publiques tu clave ni la incluyas en código que se
            ejecute en el navegador. Utiliza únicamente conexiones
            HTTPS y servicios de confianza.
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.push("/home")}
          style={styles.secondaryButton}
        >
          REGRESAR A STORE GAMING
        </button>

        <footer style={styles.footer}>
          STORE GAMING · AJUSTES DE CUENTA
        </footer>
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: "24px 14px",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    background:
      "linear-gradient(145deg,#080a11,#111522 55%,#080a11)",
    color: "#fff",
    fontFamily: "Arial, sans-serif",
  },
  card: {
    width: "100%",
    maxWidth: "650px",
    padding: "22px",
    borderRadius: "18px",
    border: "1px solid rgba(255,255,255,.1)",
    background: "rgba(12,15,24,.96)",
    boxShadow: "0 15px 45px rgba(0,0,0,.35)",
  },
  back: {
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
  warning: {
    marginTop: "13px",
    color: "#fbbf24",
    fontSize: "11px",
    lineHeight: 1.7,
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
