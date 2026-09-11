"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    const cleanUsername = username.trim().replace(/^@/, "");

    if (!cleanUsername || !password) {
      setError("Completa todos los campos.");
      return;
    }

    const savedUser = localStorage.getItem("storeGamingUser");

    if (!savedUser) {
      setError("No existe una cuenta. Regístrate primero.");
      return;
    }

    try {
      const account = JSON.parse(savedUser);

      if (
        account.username.toLowerCase() !==
          cleanUsername.toLowerCase() ||
        account.password !== password
      ) {
        setError("Usuario o contraseña incorrectos.");
        return;
      }

      setLoading(true);

      localStorage.setItem(
        "storeGamingAuth",
        JSON.stringify({
          username: account.username,
          loggedAt: Date.now(),
        })
      );

      router.push("/home");
    } catch {
      setError("No se pudo iniciar sesión. Inténtalo nuevamente.");
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-background" />

      <section className="auth-card">
        <button
          type="button"
          className="back-button"
          onClick={() => router.push("/")}
        >
          ← Volver
        </button>

        <div className="auth-logo">🛒🎮</div>

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
            USUARIO

            <div className="input-wrapper">
              <span>@</span>

              <input
                type="text"
                value={username}
                onChange={(event) =>
                  setUsername(event.target.value)
                }
                placeholder="tuusuario"
                autoComplete="username"
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
            {loading ? "ENTRANDO..." : "ENTRAR"}
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
