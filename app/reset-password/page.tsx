"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setError(
          "El enlace de recuperación no es válido o ya expiró."
        );
      }

      setChecking(false);
    }

    checkSession();
  }, []);

  async function handleUpdatePassword(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (password.length < 6) {
      setError(
        "La contraseña debe tener al menos 6 caracteres."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);

    const { error: updateError } =
      await supabase.auth.updateUser({
        password,
      });

    if (updateError) {
      setError(
        "No se pudo actualizar la contraseña. Inténtalo nuevamente."
      );
      setLoading(false);
      return;
    }

    setSuccess(
      "¡Contraseña actualizada correctamente! 🎉"
    );

    setPassword("");
    setConfirmPassword("");

    setTimeout(() => {
      router.replace("/login");
    }, 2000);
  }

  if (checking) {
    return (
      <main className="auth-page">
        <div className="auth-background" />

        <section className="auth-card">
          <div className="auth-logo">
            🛒🎮
          </div>

          <p className="auth-small">
            STORE GAMING
          </p>

          <h1 className="auth-title">
            VERIFICANDO <span>ENLACE</span>
          </h1>

          <p className="auth-description">
            Verificando tu enlace de recuperación...
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <div className="auth-background" />

      <section className="auth-card">
        <div className="auth-logo">
          🔐
        </div>

        <p className="auth-small">
          SEGURIDAD DE CUENTA
        </p>

        <h1 className="auth-title">
          NUEVA <span>CONTRASEÑA</span>
        </h1>

        <p className="auth-description">
          Crea una nueva contraseña para tu cuenta de
          STORE GAMING.
        </p>

        <form
          onSubmit={handleUpdatePassword}
          className="auth-form"
        >
          <label>
            NUEVA CONTRASEÑA

            <div className="input-wrapper">
              <span>🔒</span>

              <input
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
                disabled={loading}
              />
            </div>
          </label>

          <label>
            REPETIR CONTRASEÑA

            <div className="input-wrapper">
              <span>✓</span>

              <input
                type="password"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(event.target.value)
                }
                placeholder="Repite tu contraseña"
                autoComplete="new-password"
                disabled={loading}
              />
            </div>
          </label>

          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          {success && (
            <div className="auth-success">
              {success}
            </div>
          )}

          <button
            type="submit"
            className="auth-submit"
            disabled={loading || !!success}
          >
            {loading
              ? "ACTUALIZANDO..."
              : "ACTUALIZAR CONTRASEÑA"}
          </button>
        </form>

        <button
          type="button"
          className="auth-register-button"
          onClick={() => router.push("/login")}
          disabled={loading}
        >
          VOLVER AL LOGIN
        </button>
      </section>
    </main>
  );
  }
