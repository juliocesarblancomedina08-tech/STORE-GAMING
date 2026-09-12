"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

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
      setError("La contraseña debe tener al menos 6 caracteres.");
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

        <form
          onSubmit={handleRegister}
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

          {success && (
            <div className="auth-success">
              {success}
            </div>
          )}

          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
          >
            {loading ? "CREANDO CUENTA..." : "CREAR CUENTA"}
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
