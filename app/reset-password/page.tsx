"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type ResetStep = "email" | "code" | "password";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [step, setStep] = useState<ResetStep>("email");

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  // =========================================================
  // ENVIAR CÓDIGO
  // =========================================================

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
       * El correo ya fue enviado correctamente.
       *
       * Pasamos inmediatamente a la pantalla
       * donde el usuario debe introducir el código.
       */
      setEmail(cleanEmail);
      setCode("");
      setError("");
      setSuccess("");

      setStep("code");
    } catch (error) {
      console.error(error);

      setError(
        "No se pudo enviar el código. Inténtalo nuevamente."
      );
    } finally {
      setLoading(false);
    }
  }

  // =========================================================
  // VERIFICAR CÓDIGO
  // =========================================================

  async function handleVerifyCode(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const cleanCode = code.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError("No se encontró el correo de recuperación.");
      return;
    }

    if (!cleanCode) {
      setError("Introduce el código de verificación.");
      return;
    }

    if (!/^\d{6}$/.test(cleanCode)) {
      setError("El código debe tener 6 dígitos.");
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
        console.error(verifyError);

        setError(
          "El código no es válido o ha expirado. Comprueba el código e inténtalo nuevamente."
        );

        setLoading(false);
        return;
      }

      if (!data.session) {
        setError(
          "El código fue procesado, pero no se pudo iniciar la recuperación de la cuenta."
        );

        setLoading(false);
        return;
      }

      /*
       * Código correcto.
       *
       * Ahora pasamos automáticamente a la pantalla
       * para crear la nueva contraseña.
       */
      setCode("");

      setError("");

      setSuccess(
        "Código verificado correctamente."
      );

      setStep("password");
    } catch (error) {
      console.error(error);

      setError(
        "No se pudo verificar el código. Inténtalo nuevamente."
      );
    } finally {
      setLoading(false);
    }
  }

  // =========================================================
  // ACTUALIZAR CONTRASEÑA
  // =========================================================

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
      /*
       * Actualizamos la contraseña.
       *
       * Después de verifyOtp() Supabase mantiene
       * la sesión de recuperación activa.
       */
      const { error: updateError } =
        await supabase.auth.updateUser({
          password,
        });

      if (updateError) {
        console.error(updateError);

        setError(updateError.message);

        setLoading(false);
        return;
      }

      /*
       * Contraseña actualizada correctamente.
       */
      setError("");

      setSuccess(
        "✓ La contraseña fue actualizada con éxito."
      );

      setPassword("");
      setConfirmPassword("");

      /*
       * Esperamos un momento para que el usuario
       * pueda ver el mensaje y después entramos
       * automáticamente al inicio.
       */
      setTimeout(() => {
        router.replace("/");
        router.refresh();
      }, 1500);
    } catch (error) {
      console.error(error);

      setError(
        "No se pudo actualizar la contraseña. Inténtalo nuevamente."
      );
    } finally {
      setLoading(false);
    }
  }

  // =========================================================
  // REENVIAR CÓDIGO
  // =========================================================

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
        console.error(resendError);

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
    } catch (error) {
      console.error(error);

      setError(
        "No se pudo reenviar el código. Inténtalo nuevamente."
      );
    } finally {
      setResending(false);
    }
  }

  // =========================================================
  // ATRÁS
  // =========================================================

  function goBack() {
    setError("");
    setSuccess("");

    if (step === "password") {
      setStep("code");
      setPassword("");
      setConfirmPassword("");
      return;
    }

    if (step === "code") {
      setStep("email");
      setCode("");
      return;
    }

    router.push("/login");
  }

  // =========================================================
  // PÁGINA
  // =========================================================

  return (
    <main className="auth-page reset-password-page">

      <div className="auth-background" />

      <section className="auth-card reset-password-card">

        {/* ================================================= */}
        {/* BOTÓN ATRÁS */}
        {/* ================================================= */}

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

        {/* ================================================= */}
        {/* LOGO */}
        {/* ================================================= */}

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

        {/* ================================================= */}
        {/* PASO 1 - CORREO */}
        {/* ================================================= */}

        {step === "email" && (
          <>

            <div className="register-heading">

              <p className="auth-small">
                RECUPERACIÓN DE CUENTA
              </p>

              <h1 className="auth-title">
                OLVIDÉ MI{" "}
                <span>
                  CONTRASEÑA
                </span>
              </h1>

              <div className="register-title-line" />

              <p className="auth-description">
                Introduce el correo de tu cuenta y te enviaremos
                un código de verificación para recuperar tu contraseña.
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

        {/* ================================================= */}
        {/* PASO 2 - CÓDIGO */}
        {/* ================================================= */}

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

        {/* ================================================= */}
        {/* PASO 3 - NUEVA CONTRASEÑA */}
        {/* ================================================= */}

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
                Introduce tu nueva contraseña y confírmala
                para completar la recuperación de tu cuenta.
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

        {/* ================================================= */}
        {/* FOOTER */}
        {/* ================================================= */}

        <div className="register-footer">
          STORE GAMING • RECUPERACIÓN DE CUENTA
        </div>

      </section>

    </main>
  );
        }
