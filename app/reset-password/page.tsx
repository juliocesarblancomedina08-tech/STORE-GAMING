"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import { supabase } from "../../lib/supabase";

type ResetStep =
  | "email"
  | "code"
  | "password";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [step, setStep] =
    useState<ResetStep>("email");

  const [email, setEmail] =
    useState("");

  const [code, setCode] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [resending, setResending] =
    useState(false);

  const [checking, setChecking] =
    useState(true);

  /*
  |--------------------------------------------------------------------------
  | COMPROBAR SESIÓN
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    async function checkSession() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        /*
         * Si ya existe una sesión de recuperación,
         * podemos permitir directamente el cambio
         * de contraseña.
         */
        if (session) {
          setStep("password");
        }
      } catch (error) {
        console.error(
          "RESET PASSWORD SESSION ERROR:",
          error
        );
      } finally {
        setChecking(false);
      }
    }

    checkSession();
  }, []);

  /*
  |--------------------------------------------------------------------------
  | ENVIAR CÓDIGO
  |--------------------------------------------------------------------------
  */

  async function handleSendCode(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const cleanEmail =
      email.trim().toLowerCase();

    if (!cleanEmail) {
      setError(
        "Introduzca su correo electrónico."
      );
      return;
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        cleanEmail
      )
    ) {
      setError(
        "Introduzca un correo electrónico válido."
      );
      return;
    }

    setLoading(true);

    try {
      /*
       * Supabase enviará el correo de
       * recuperación.
       *
       * El template del correo debe utilizar
       * {{ .Token }} para mostrar el código
       * numérico.
       */
      const {
        error: resetError,
      } =
        await supabase.auth.resetPasswordForEmail(
          cleanEmail,
          {
            redirectTo:
              `${window.location.origin}/reset-password`,
          }
        );

      if (resetError) {
        console.error(
          "SEND RESET CODE ERROR:",
          resetError
        );

        setError(
          resetError.message ||
            "No se pudo enviar el código. Inténtelo nuevamente."
        );

        setLoading(false);
        return;
      }

      setEmail(cleanEmail);

      setCode("");

      setStep("code");

      setSuccess(
        "Código enviado. Revise su correo electrónico."
      );
    } catch (error: any) {
      console.error(
        "SEND RESET CODE ERROR:",
        error
      );

      setError(
        error?.message ||
          "No se pudo enviar el código. Inténtelo nuevamente."
      );
    } finally {
      setLoading(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | CAMBIO DEL CÓDIGO
  |--------------------------------------------------------------------------
  */

  function handleCodeChange(
    value: string
  ) {
    const clean =
      value
        .replace(/\D/g, "")
        .slice(0, 6);

    setCode(clean);
    setError("");
    setSuccess("");
  }

  /*
  |--------------------------------------------------------------------------
  | VERIFICAR CÓDIGO
  |--------------------------------------------------------------------------
  */

  async function handleVerifyCode(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const cleanCode =
      code.trim();

    if (cleanCode.length !== 6) {
      setError(
        "Introduzca el código numérico de 6 dígitos."
      );
      return;
    }

    if (!/^\d{6}$/.test(cleanCode)) {
      setError(
        "El código debe contener solamente números."
      );
      return;
    }

    if (!email) {
      setError(
        "No se encontró el correo electrónico."
      );
      return;
    }

    setLoading(true);

    try {
      /*
       * Verificamos el código como RECOVERY.
       */
      const {
        data,
        error: verifyError,
      } =
        await supabase.auth.verifyOtp({
          email,
          token: cleanCode,
          type: "recovery",
        });

      if (verifyError) {
        console.error(
          "VERIFY RESET CODE ERROR:",
          verifyError
        );

        setError(
          "El código no es válido o ha expirado."
        );

        setLoading(false);
        return;
      }

      if (!data?.session) {
        /*
         * En algunos casos Supabase puede
         * completar la verificación sin devolver
         * inmediatamente la sesión en la respuesta.
         *
         * Comprobamos la sesión actual.
         */
        const {
          data: sessionData,
        } =
          await supabase.auth.getSession();

        if (!sessionData.session) {
          setError(
            "No se pudo confirmar la recuperación. Solicite un nuevo código."
          );

          setLoading(false);
          return;
        }
      }

      setCode("");

      setPassword("");

      setConfirmPassword("");

      setStep("password");

      setSuccess(
        "Código confirmado correctamente. Ahora cree su nueva contraseña."
      );
    } catch (error: any) {
      console.error(
        "VERIFY RESET CODE ERROR:",
        error
      );

      setError(
        "El código no es válido o ha expirado."
      );
    } finally {
      setLoading(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | REENVIAR CÓDIGO
  |--------------------------------------------------------------------------
  */

  async function handleResendCode() {
    setError("");
    setSuccess("");

    const cleanEmail =
      email.trim().toLowerCase();

    if (!cleanEmail) {
      setError(
        "No se encontró el correo electrónico."
      );
      return;
    }

    setResending(true);

    try {
      const {
        error: resendError,
      } =
        await supabase.auth.resetPasswordForEmail(
          cleanEmail,
          {
            redirectTo:
              `${window.location.origin}/reset-password`,
          }
        );

      if (resendError) {
        console.error(
          "RESEND RESET CODE ERROR:",
          resendError
        );

        setError(
          resendError.message ||
            "No se pudo reenviar el código."
        );

        return;
      }

      setCode("");

      setSuccess(
        "Se ha enviado un nuevo código a su correo."
      );
    } catch (error: any) {
      console.error(
        "RESEND RESET CODE ERROR:",
        error
      );

      setError(
        error?.message ||
          "No se pudo reenviar el código."
      );
    } finally {
      setResending(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | CAMBIAR CONTRASEÑA
  |--------------------------------------------------------------------------
  */

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

    if (
      password !== confirmPassword
    ) {
      setError(
        "Las contraseñas no coinciden."
      );
      return;
    }

    setLoading(true);

    try {
      /*
       * Comprobar que la verificación
       * realmente dejó una sesión activa.
       */
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setError(
          "La verificación ha expirado. Solicite un nuevo código."
        );

        setStep("email");

        setLoading(false);
        return;
      }

      const {
        error: updateError,
      } =
        await supabase.auth.updateUser({
          password,
        });

      if (updateError) {
        console.error(
          "UPDATE PASSWORD ERROR:",
          updateError
        );

        setError(
          updateError.message ||
            "No se pudo actualizar la contraseña. Inténtelo nuevamente."
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
    } catch (error: any) {
      console.error(
        "UPDATE PASSWORD ERROR:",
        error
      );

      setError(
        error?.message ||
          "No se pudo actualizar la contraseña."
      );
    } finally {
      setLoading(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | PANTALLA DE COMPROBACIÓN
  |--------------------------------------------------------------------------
  */

  if (checking) {
    return (
      <main className="auth-page">
        <div className="auth-background" />

        <section className="auth-card">
          <div className="auth-logo">
            🛒🎮
          </div>

          <p className="auth-small">
            SEGURIDAD DE CUENTA
          </p>

          <h1 className="auth-title">
            COMPROBANDO
            <span> CUENTA</span>
          </h1>

          <p className="auth-description">
            Espere un momento...
          </p>
        </section>
      </main>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | PASO 1 — CORREO
  |--------------------------------------------------------------------------
  */

  if (step === "email") {
    return (
      <main className="auth-page">
        <div className="auth-background" />

        <section className="auth-card">
          <div className="auth-logo">
            🛒🎮
          </div>

          <p className="auth-small">
            SEGURIDAD DE CUENTA
          </p>

          <h1 className="auth-title">
            RECUPERAR
            <span> CONTRASEÑA</span>
          </h1>

          <p className="auth-description">
            Introduzca el correo electrónico
            asociado a su cuenta de STORE
            GAMING. Le enviaremos un código
            numérico para confirmar el cambio.
          </p>

          <form
            onSubmit={handleSendCode}
            className="auth-form"
          >
            <label>
              CORREO ELECTRÓNICO

              <div className="input-wrapper">
                <span>📧</span>

                <input
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(
                      event.target.value
                    )
                  }
                  placeholder="Ingrese su correo"
                  autoComplete="email"
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
              disabled={loading}
            >
              {loading
                ? "ENVIANDO CÓDIGO..."
                : "ENVIAR CÓDIGO"}
            </button>
          </form>

          <button
            type="button"
            className="auth-register-button"
            onClick={() =>
              router.push("/login")
            }
            disabled={loading}
          >
            VOLVER AL LOGIN
          </button>
        </section>
      </main>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | PASO 2 — CÓDIGO
  |--------------------------------------------------------------------------
  */

  if (step === "code") {
    return (
      <main className="auth-page">
        <div className="auth-background" />

        <section className="auth-card">
          <div className="auth-logo">
            🛒🎮
          </div>

          <p className="auth-small">
            VERIFICACIÓN DE SEGURIDAD
          </p>

          <h1 className="auth-title">
            CÓDIGO DE
            <span> VERIFICACIÓN</span>
          </h1>

          <p className="auth-description">
            Enviamos un código numérico de
            6 dígitos a:
          </p>

          <p
            className="auth-description"
            style={{
              fontWeight: 800,
              wordBreak: "break-word",
            }}
          >
            {email}
          </p>

          <form
            onSubmit={handleVerifyCode}
            className="auth-form"
          >
            <label>
              CÓDIGO DE VERIFICACIÓN

              <div className="input-wrapper">
                <span>🔐</span>

                <input
                  type="text"
                  value={code}
                  onChange={(event) =>
                    handleCodeChange(
                      event.target.value
                    )
                  }
                  placeholder="000000"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  disabled={loading}
                  style={{
                    letterSpacing:
                      "7px",
                    fontWeight: 900,
                    textAlign: "center",
                  }}
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
              disabled={
                loading ||
                code.length !== 6
              }
            >
              {loading
                ? "VERIFICANDO..."
                : "CONFIRMAR CÓDIGO"}
            </button>
          </form>

          <button
            type="button"
            className="auth-register-button"
            onClick={
              handleResendCode
            }
            disabled={
              loading ||
              resending
            }
          >
            {resending
              ? "REENVIANDO..."
              : "REENVIAR CÓDIGO"}
          </button>

          <button
            type="button"
            className="auth-register-button"
            onClick={() => {
              setStep("email");
              setCode("");
              setError("");
              setSuccess("");
            }}
            disabled={
              loading ||
              resending
            }
          >
            CAMBIAR CORREO
          </button>

          <button
            type="button"
            className="auth-register-button"
            onClick={() =>
              router.push("/login")
            }
            disabled={
              loading ||
              resending
            }
          >
            VOLVER AL LOGIN
          </button>
        </section>
      </main>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | PASO 3 — NUEVA CONTRASEÑA
  |--------------------------------------------------------------------------
  */

  return (
    <main className="auth-page">
      <div className="auth-background" />

      <section className="auth-card">
        <div className="auth-logo">
          🛒🎮
        </div>

        <p className="auth-small">
          SEGURIDAD DE CUENTA
        </p>

        <h1 className="auth-title">
          NUEVA
          <span> CONTRASEÑA</span>
        </h1>

        <p className="auth-description">
          Código confirmado correctamente.
          Ahora cree una nueva contraseña
          para su cuenta de STORE GAMING.
        </p>

        <form
          onSubmit={
            handleUpdatePassword
          }
          className="auth-form"
        >
          <label>
            PONGA SU CONTRASEÑA

            <div className="input-wrapper">
              <span>🔒</span>

              <input
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value
                  )
                }
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
                disabled={loading}
              />
            </div>
          </label>

          <label>
            REPITA SU CONTRASEÑA

            <div className="input-wrapper">
              <span>🔐</span>

              <input
                type="password"
                value={
                  confirmPassword
                }
                onChange={(event) =>
                  setConfirmPassword(
                    event.target.value
                  )
                }
                placeholder="Repita su contraseña"
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
            disabled={
              loading ||
              !!success
            }
          >
            {loading
              ? "ACTUALIZANDO..."
              : "ACTUALIZAR CONTRASEÑA"}
          </button>
        </form>

        <button
          type="button"
          className="auth-register-button"
          onClick={() =>
            router.push("/login")
          }
          disabled={loading}
        >
          VOLVER AL LOGIN
        </button>
      </section>
    </main>
  );
}
