"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    const cleanUsername = username.trim().replace(/^@/, "");

    if (!cleanUsername || !password || !confirmPassword) {
      setError("Completa todos los campos.");
      return;
    }

    if (cleanUsername.length < 3) {
      setError("El usuario debe tener al menos 3 caracteres.");
      return;
    }

    if (/\s/.test(cleanUsername)) {
      setError("El usuario no puede contener espacios.");
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    const existingUser = localStorage.getItem("storeGamingUser");

    if (existingUser) {
      try {
        const account = JSON.parse(existingUser);

        if (
          account.username.toLowerCase() ===
          cleanUsername.toLowerCase()
        ) {
          setError("Ese usuario ya está registrado.");
          return;
        }
      } catch {
        localStorage.removeItem("storeGamingUser");
      }
    }

    const account = {
      username: cleanUsername,
      password: password,
      createdAt: Date.now(),
    };

    localStorage.setItem(
      "storeGamingUser",
      JSON.stringify(account)
    );

    localStorage.setItem(
      "storeGamingAuth",
      JSON.stringify({
        username: cleanUsername,
        loggedAt: Date.now(),
      })
    );

    router.push("/home");
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

        <p className="auth-small">ÚNETE A LA COMUNIDAD</p>

        <h1 className="auth-title">
          CREAR <span>CUENTA</span>
        </h1>

        <p className="auth-description">
          Crea tu cuenta para comenzar a comprar tus recargas
          gaming.
        </p>

        <form onSubmit={handleRegister} className="auth-form">
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
                maxLength={30}
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
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
              />
            </div>
          </label>

          <label>
            VERIFICAR CONTRASEÑA
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
          >
            CREAR CUENTA
          </button>
        </form>

        <div className="auth-divider">
          <span />
          O
          <span />
        </div>

        <p className="auth-register-text">
          ¿Ya tienes una cuenta?
        </p>

        <button
          type="button"
          className="auth-register-button"
          onClick={() => router.push("/login")}
        >
          INICIAR SESIÓN
        </button>
      </section>
    </main>
  );
                                }
