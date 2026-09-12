"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setError("Completa todos los campos.");
      return;
    }

    if (!cleanEmail.includes("@")) {
      setError("Introduce un correo electrónico válido.");
      return;
    }

    setLoading(true);

    try {
      const { error: loginError } =
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

      if (loginError) {
        if (
          loginError.message
            .toLowerCase()
            .includes("email not confirmed")
        ) {
          setError(
            "Tu correo todavía no está confirmado. Revisa tu email y pulsa el enlace de confirmación."
          );
        } else {
          setError(
            "Correo o contraseña incorrectos."
          );
        }

        setLoading(false);
        return;
      }

      router.push("/home");
    } catch {
      setError(
        "No se pudo iniciar sesión. Inténtalo nuevamente."
      );

      setLoading(false);
    }
  }

  function handleForgotPassword() {
    if (loading) return;

    router.push("/forgot-password");
  }

  return (
    <main className="auth-page login-page">

      <div className="auth-background" />

      <section className="auth-card login-card">

        {/* BOTÓN ATRÁS */}

        <button
          type="button"
          className="back-button auth-back-button login-back-button"
          onClick={() => router.push("/")}
          disabled={loading}
        >
          <span className="back-arrow">
            ←
          </span>

          <span>
            ATRÁS
          </span>
        </button>

        {/* LOGO */}

        <div className="login-logo">

          <div className="login-logo-cart">
            🛒
          </div>

          <div className="login-logo-text">
            <span>
              STORE
            </span>

            <strong>
              GAMING
            </strong>
          </div>

        </div>

        {/* ENCABEZADO */}

        <div className="login-heading">

          <p className="auth-small">
            BIENVENIDO DE NUEVO
          </p>

          <h1 className="auth-title">
            INICIAR <span>SESIÓN</span>
          </h1>

          <div className="login-title-line" />

          <p className="auth-description">
            Entra a tu cuenta para acceder a
            <strong> STORE GAMING</strong>.
          </p>

        </div>

        {/* FORMULARIO */}

        <form
          onSubmit={handleLogin}
          className="auth-form login-form"
        >

          {/* CORREO */}

          <div className="login-field">

            <label htmlFor="login-email">
              CORREO ELECTRÓNICO
            </label>

            <div className="input-wrapper login-input-wrapper">

              <span className="input-icon">
                ✉
              </span>

              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                placeholder="tucorreo@gmail.com"
                autoComplete="email"
                inputMode="email"
                disabled={loading}
              />

            </div>

          </div>

          {/* CONTRASEÑA */}

          <div className="login-field">

            <label htmlFor="login-password">
              CONTRASEÑA
            </label>

            <div className="input-wrapper login-input-wrapper">

              <span className="input-icon">
                🔒
              </span>

              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                placeholder="Tu contraseña"
                autoComplete="current-password"
                disabled={loading}
              />

            </div>

          </div>

          {/* RECUPERAR CONTRASEÑA */}

          <div className="login-forgot-wrapper">

            <button
              type="button"
              className="forgot-password-button login-forgot-button"
              onClick={handleForgotPassword}
              disabled={loading}
            >
              <span>
                ¿OLVIDASTE TU CONTRASEÑA?
              </span>

              <b>
                →
              </b>
            </button>

          </div>

          {/* ERROR */}

          {error && (
            <div className="auth-error login-message">

              <span>
                ⚠
              </span>

              <p>
                {error}
              </p>

            </div>
          )}

          {/* ENTRAR */}

          <button
            type="submit"
            className="auth-submit login-submit"
            disabled={loading}
          >

            <span>
              {loading
                ? "ENTRANDO..."
                : "ENTRAR"}
            </span>

            {!loading && (
              <b>
                →
              </b>
            )}

          </button>

        </form>

        {/* DIVISOR */}

        <div className="auth-divider login-divider">

          <span />

          <strong>
            O
          </strong>

          <span />

        </div>

        {/* REGISTRO */}

        <div className="login-register-area">

          <p className="auth-register-text">
            ¿TODAVÍA NO TIENES UNA CUENTA?
          </p>

          <button
            type="button"
            className="auth-register-button login-register-button"
            onClick={() => router.push("/register")}
            disabled={loading}
          >
            <span>
              CREAR CUENTA
            </span>

            <b>
              →
            </b>
          </button>

        </div>

        {/* PIE */}

        <div className="login-footer">
          STORE GAMING • RECARGAS GAMING
        </div>

      </section>

    </main>
  );
                }
