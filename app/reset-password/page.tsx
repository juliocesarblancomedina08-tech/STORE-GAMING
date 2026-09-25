"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [step, setStep] = useState<"email" | "code" | "password">(
    "email"
  );

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  async function handleSendCode(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError("Introduce tu correo electrónico.");
      return;
    }

    if (!cleanEmail.includes("@")) {
      setError("Introduce un correo electrónico válido.");
      return;
    }

    setLoading(true);

    try {
      const { error: resetError } =
        await supabase.auth.resetPasswordForEmail(
          cleanEmail,
          {
            redirectTo:
              `${window.location.origin}/reset-password`,
          }
        );

      if (resetError) {
        setError(resetError.message);
        setLoading(false);
        return;
      }

      /*
       * IMPORTANTE:
       * El código fue enviado correctamente.
       * Pasamos inmediatamente a la pantalla
       * donde el usuario debe introducirlo.
       */
      setEmail(cleanEmail);
      setCode("");
      setError("");
      setSuccess("");

      setStep("code");
    } catch {
      setError(
        "No se pudo enviar el código. Inténtalo nuevamente."
      );
    }

    setLoading(false);
  }

  async function handleVerifyCode(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const cleanCode = code.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanCode) {
      setError("Introduce el código de verificación.");
      return;
    }

    if (!/^\d{6}$/.test(cleanCode)) {
      setError("El código debe tener 6 dígitos.");
      return;
    }

    if (!cleanEmail) {
      setError(
        "No se encontró el correo utilizado para recuperar la cuenta."
      );
      return;
    }

    setLoading(true);

    try {
      const {
        data,
        error: verifyError,
      } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanCode,
        type: "recovery",
      });

      if (verifyError) {
        setError(
          "El código no es válido o ha expirado. Comprueba el código e inténtalo nuevamente."
        );

        setLoading(false);
        return;
      }

      /*
       * Después de verificar el código,
       * Supabase debe entregar una sesión de recuperación.
       */
      if (!data.session) {
        setError(
          "El código fue verificado, pero no se pudo iniciar la recuperación. Inténtalo nuevamente."
        );

        setLoading(false);
        return;
      }

      setError("");
      setSuccess("");

      /*
       * PASAMOS AUTOMÁTICAMENTE A NUEVA CONTRASEÑA
       */
      setPassword("");
      setConfirmPassword("");
      setStep("password");
    } catch {
      setError(
        "No se pudo verificar el código. Inténtalo nuevamente."
      );
    }

    setLoading(false);
  }

  async function handleUpdatePassword(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!password || !confirmPassword) {
      setError("Completa todos los campos.");
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
      const { error: updateError } =
        await supabase.auth.updateUser({
          password,
        });

      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }

      /*
       * CONTRASEÑA ACTUALIZADA
       */
      setError("");
      setSuccess(
        "La contraseña fue actualizada con éxito."
      );

      setPassword("");
      setConfirmPassword("");

      /*
       * La sesión de recuperación ya está activa.
       * No necesitamos pedir nuevamente el correo
       * ni la contraseña.
       *
       * Damos un pequeño tiempo para que el usuario
       * pueda ver el mensaje de éxito.
       */
      setTimeout(async () => {
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();

          if (session) {
            router.push("/");
            router.refresh();
          } else {
            router.push("/login");
          }
        } catch {
          router.push("/login");
        }
      }, 1500);
    } catch {
      setError(
        "No se pudo actualizar la contraseña. Inténtalo nuevamente."
      );
    }

    setLoading(false);
  }

  async function handleResendCode() {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError(
        "Introduce el correo utilizado para recuperar la cuenta."
      );
      return;
    }

    setError("");
    setSuccess("");
    setResending(true);

    try {
      const { error: resendError } =
        await supabase.auth.resetPasswordForEmail(
          cleanEmail,
          {
            redirectTo:
              `${window.location.origin}/reset-password`,
          }
        );

      if (resendError) {
        setError(
          "No se pudo reenviar el código. Espera unos segundos e inténtalo nuevamente."
        );

        setResending(false);
        return;
      }

      setCode("");

      setSuccess(
        "Hemos enviado un nuevo código de recuperación a tu correo electrónico."
      );
    } catch {
      setError(
        "No se pudo reenviar el código. Inténtalo nuevamente."
      );
    }

    setResending(false);
  }

  function goBack() {
    if (step === "password") {
      setStep("code");
      setError("");
      setSuccess("");
      return;
    }

    if (step === "code") {
      setStep("email");
      setCode("");
      setError("");
      setSuccess("");
      return;
    }

    router.push("/login");
  }

  return (
    <main className="auth-page reset-password-page">

      <div className="auth-background" />

      <section className="auth-card reset-password-card">

        <button
          type="button"
          className="back-button auth-back-button"
          onClick={goBack}
        >
          <span className="back-arrow">
            ←
          </span>

          <span>
            ATRÁS
          </span>
        </button>

        <div className="register-logo">

          <div className="register-logo-cart">
            🛒
          </div>

          <div className="register-logo-text">

            <span>
              STORE
            </span>

            <strong>
              GAMING
            </strong>

          </div>

        </div>

        {/* =========================
            PASO 1 — CORREO
        ========================= */}

        {step === "email" && (
          <>

            <div className="register-heading">

              <p className="auth-small">
                RECUPERACIÓN DE CUENTA
              </p>

              <h1 className="auth-title">
                RESTABLECER{" "}
                <span>
                  CONTRASEÑA
                </span>
              </h1>

              <div className="register-title-line" />

              <p className="auth-description">
                Introduce tu correo electrónico y te enviaremos
                un código para recuperar tu cuenta.
              </p>

            </div>

            <form
              onSubmit={handleSendCode}
              className="auth-form register-form"
            >

              <div className="register-field">

                <label htmlFor="reset-email">
                  CORREO ELECTRÓNICO
                </label>

                <div className="input-wrapper register-input-wrapper">

                  <span className="input-icon">
                    ✉
                  </span>

                  <input
                    id="reset-email"
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

              {error && (
                <div className="auth-error register-message">

                  <span>
                    ⚠
                  </span>

                  <p>
                    {error}
                  </p>

                </div>
              )}

              {success && (
                <div className="auth-success register-message">

                  <span>
                    ✓
                  </span>

                  <p>
                    {success}
                  </p>

                </div>
              )}

              <button
                type="submit"
                className="auth-submit register-submit"
                disabled={loading}
              >
                <span>
                  {loading
                    ? "ENVIANDO..."
                    : "ENVIAR CÓDIGO"}
                </span>

                {!loading && (
                  <b>
                    →
                  </b>
                )}

              </button>

            </form>

          </>
        )}

        {/* =========================
            PASO 2 — CÓDIGO
        ========================= */}

        {step === "code" && (
          <>

            <div className="register-heading">

              <p className="auth-small">
                VERIFICACIÓN
              </p>

              <h1 className="auth-title">
                CÓDIGO DE{" "}
                <span>
                  RECUPERACIÓN
                </span>
              </h1>

              <div className="register-title-line" />

              <p className="auth-description">
                Hemos enviado un código de 6 dígitos a:
              </p>

              <p
                style={{
                  marginTop: "8px",
                  color: "#ffffff",
                  fontWeight: 800,
                  fontSize: "14px",
                  wordBreak: "break-word",
                }}
              >
                {email}
              </p>

            </div>

            <form
              onSubmit={handleVerifyCode}
              className="auth-form register-form"
            >

              <div className="register-field">

                <label htmlFor="reset-code">
                  CÓDIGO DE VERIFICACIÓN
                </label>

                <div className="input-wrapper register-input-wrapper">

                  <span className="input-icon">
                    #
                  </span>

                  <input
                    id="reset-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={code}
                    onChange={(event) => {
                      const value =
                        event.target.value.replace(
                          /\D/g,
                          ""
                        );

                      setCode(
                        value.slice(0, 6)
                      );
                    }}
                    placeholder="000000"
                  />

                </div>

              </div>

              {error && (
                <div className="auth-error register-message">

                  <span>
                    ⚠
                  </span>

                  <p>
                    {error}
                  </p>

                </div>
              )}

              {success && (
                <div className="auth-success register-message">

                  <span>
                    ✓
                  </span>

                  <p>
                    {success}
                  </p>

                </div>
              )}

              <button
                type="submit"
                className="auth-submit register-submit"
                disabled={
                  loading ||
                  code.length !== 6
                }
              >
                <span>
                  {loading
                    ? "VERIFICANDO..."
                    : "VERIFICAR CÓDIGO"}
                </span>

                {!loading && (
                  <b>
                    ✓
                  </b>
                )}

              </button>

            </form>

            <div
              style={{
                marginTop: "18px",
                textAlign: "center",
              }}
            >

              <p
                style={{
                  margin: 0,
                  color: "#777",
                  fontSize: "12px",
                }}
              >
                ¿No recibiste el código?
              </p>

              <button
                type="button"
                onClick={handleResendCode}
                disabled={resending}
                style={{
                  marginTop: "8px",
                  background: "transparent",
                  border: "none",
                  color: "#e50914",
                  fontWeight: 900,
                  fontSize: "12px",
                  cursor: resending
                    ? "default"
                    : "pointer",
                  opacity: resending
                    ? 0.6
                    : 1,
                }}
              >
                {resending
                  ? "ENVIANDO..."
                  : "REENVIAR CÓDIGO"}
              </button>

            </div>

          </>
        )}

        {/* =========================
            PASO 3 — NUEVA CONTRASEÑA
        ========================= */}

        {step === "password" && (
          <>

            <div className="register-heading">

              <p className="auth-small">
                CUENTA VERIFICADA
              </p>

              <h1 className="auth-title">
                NUEVA{" "}
                <span>
                  CONTRASEÑA
                </span>
              </h1>

              <div className="register-title-line" />

              <p className="auth-description">
                Introduce tu nueva contraseña para completar
                la recuperación de tu cuenta.
              </p>

            </div>

            <form
              onSubmit={handleUpdatePassword}
              className="auth-form register-form"
            >

              <div className="register-field">

                <label htmlFor="new-password">
                  NUEVA CONTRASEÑA
                </label>

                <div className="input-wrapper register-input-wrapper">

                  <span className="input-icon">
                    🔒
                  </span>

                  <input
                    id="new-password"
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

              <div className="register-field">

                <label htmlFor="confirm-new-password">
                  REPETIR CONTRASEÑA
                </label>

                <div className="input-wrapper register-input-wrapper">

                  <span className="input-icon">
                    ✓
                  </span>

                  <input
                    id="confirm-new-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(event) =>
                      setConfirmPassword(
                        event.target.value
                      )
                    }
                    placeholder="Repite tu contraseña"
                    autoComplete="new-password"
                  />

                </div>

              </div>

              {error && (
                <div className="auth-error register-message">

                  <span>
                    ⚠
                  </span>

                  <p>
                    {error}
                  </p>

                </div>
              )}

              {success && (
                <div className="auth-success register-message">

                  <span>
                    ✓
                  </span>

                  <p>
                    {success}
                  </p>

                </div>
              )}

              <button
                type="submit"
                className="auth-submit register-submit"
                disabled={loading}
              >
                <span>
                  {loading
                    ? "ACTUALIZANDO..."
                    : "CONFIRMAR"}
                </span>

                {!loading && (
                  <b>
                    ✓
                  </b>
                )}

              </button>

            </form>

          </>
        )}

        <div className="register-footer">
          STORE GAMING • RECUPERACIÓN DE CUENTA
        </div>

      </section>

    </main>
  );
}
