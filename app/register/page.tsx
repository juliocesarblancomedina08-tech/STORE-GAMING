"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function RegisterPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password || !confirmPassword) {
      setError("Completa todos los campos.");
      return;
    }

    if (!cleanEmail.includes("@")) {
      setError("Introduce un correo electrónico válido.");
      return;
    }

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

    try {
      const { data, error: signUpError } =
        await supabase.auth.signUp({
          email: cleanEmail,
          password,
        });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      if (data.user && !data.session) {
        setSuccess(
          "Cuenta creada correctamente. Revisa tu correo electrónico y pulsa el enlace de confirmación para activar tu cuenta."
        );

        setEmail("");
        setPassword("");
        setConfirmPassword("");

        setLoading(false);
        return;
      }

      if (data.session) {
        router.push("/home");
        return;
      }

      setSuccess(
        "Revisa tu correo electrónico para confirmar tu cuenta."
      );
    } catch {
      setError(
        "Ocurrió un error al crear la cuenta. Inténtalo nuevamente."
      );
    }

    setLoading(false);
  }

  return (
    <main className="auth-page register-page">
      <div className="auth-background" />

      <section className="auth-card register-card">

        {/* BOTÓN ATRÁS */}

        <button
          type="button"
          className="back-button auth-back-button register-back-button"
          onClick={() => router.push("/")}
        >
          <span className="back-arrow">←</span>
          <span>ATRÁS</span>
        </button>

        {/* LOGO */}

        <div className="register-logo">
          <div className="register-logo-cart">
            🛒
          </div>

          <div className="register-logo-text">
            <span>STORE</span>
            <strong>GAMING</strong>
          </div>
        </div>

        {/* ENCABEZADO */}

        <div className="register-heading">

          <p className="auth-small">
            ÚNETE A LA COMUNIDAD
          </p>

          <h1 className="auth-title">
            CREAR <span>CUENTA</span>
          </h1>

          <div className="register-title-line" />

          <p className="auth-description">
            Crea tu cuenta para comenzar a comprar
            tus recargas gaming.
          </p>

        </div>

        {/* FORMULARIO */}

        <form
          onSubmit={handleRegister}
          className="auth-form register-form"
        >

          {/* CORREO */}

          <div className="register-field">

            <label htmlFor="register-email">
              CORREO ELECTRÓNICO
            </label>

            <div className="input-wrapper register-input-wrapper">

              <span className="input-icon">
                ✉
              </span>

              <input
                id="register-email"
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                placeholder="tucorreo@gmail.com"
                autoComplete="email"
                inputMode="email"
              />

            </div>

          </div>

          {/* CONTRASEÑA */}

          <div className="register-field">

            <label htmlFor="register-password">
              CONTRASEÑA
            </label>

            <div className="input-wrapper register-input-wrapper">

              <span className="input-icon">
                🔒
              </span>

              <input
                id="register-password"
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
              />

            </div>

          </div>

          {/* CONFIRMAR CONTRASEÑA */}

          <div className="register-field">

            <label htmlFor="register-confirm-password">
              VERIFICAR CONTRASEÑA
            </label>

            <div className="input-wrapper register-input-wrapper">

              <span className="input-icon">
                ✓
              </span>

              <input
                id="register-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(event.target.value)
                }
                placeholder="Repite tu contraseña"
                autoComplete="new-password"
              />

            </div>

          </div>

          {/* ERROR */}

          {error && (
            <div className="auth-error register-message">
              <span>⚠</span>
              <p>{error}</p>
            </div>
          )}

          {/* ÉXITO */}

          {success && (
            <div className="auth-success register-message">
              <span>✓</span>
              <p>{success}</p>
            </div>
          )}

          {/* CREAR CUENTA */}

          <button
            type="submit"
            className="auth-submit register-submit"
            disabled={loading}
          >
            <span>
              {loading
                ? "CREANDO CUENTA..."
                : "CREAR CUENTA"}
            </span>

            {!loading && (
              <b>→</b>
            )}
          </button>

        </form>

        {/* DIVISOR */}

        <div className="auth-divider register-divider">

          <span />

          <strong>O</strong>

          <span />

        </div>

        {/* LOGIN */}

        <div className="register-login-area">

          <p className="auth-register-text">
            ¿YA TIENES UNA CUENTA?
          </p>

          <button
            type="button"
            className="auth-register-button register-login-button"
            onClick={() => router.push("/login")}
          >
            <span>INICIAR SESIÓN</span>
            <b>→</b>
          </button>

        </div>

        {/* PIE */}

        <div className="register-footer">
          STORE GAMING • RECARGAS GAMING
        </div>

      </section>
    </main>
  );
}
