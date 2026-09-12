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
    router.push("/forgot-password");
  }

  return (
    <main className="auth-page">
      <div className="auth-background" />

      <section className="auth-card">
        <button
          type="button"
          className="back-button"
          onClick={() => router.push("/")}
          disabled={loading}
        >
          ← Volver
        </button>

        <div className="auth-logo">
          🛒🎮
        </div>

        <p className="auth-small">
          BIENVENIDO DE NUEVO
        </p>

        <h1 className="auth-title">
          INICIAR <span>SESIÓN</span>
        </h1>

        <p className="auth-description">
          Entra a tu cuenta para acceder a STORE GAMING.
        </p>

        <form
          onSubmit={handleLogin}
          className="auth-form"
        >
          <label>
            CORREO ELECTRÓNICO

            <div className="input-wrapper">
              <span>✉️</span>

              <input
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
          </label>

          <label>
            CONTRASEÑA

            <div className="input-wrapper">
              <span>🔒</span>

              <input
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
          </label>

          <button
            type="button"
            className="forgot-password-button"
            onClick={handleForgotPassword}
            disabled={loading}
          >
            ¿OLVIDASTE TU CONTRASEÑA?
          </button>

          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
          >
            {loading
              ? "ENTRANDO..."
              : "ENTRAR"}
          </button>
        </form>

        <div className="auth-divider">
          <span />
          O
          <span />
        </div>

        <p className="auth-register-text">
          ¿Todavía no tienes una cuenta?
        </p>

        <button
          type="button"
          className="auth-register-button"
          onClick={() => router.push("/register")}
          disabled={loading}
        >
          CREAR CUENTA
        </button>
      </section>
    </main>
  );
                }
