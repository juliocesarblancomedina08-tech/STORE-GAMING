"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function RegisterPage() {
const router = useRouter();

const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [confirmPassword, setConfirmPassword] = useState("");

const [verificationCode, setVerificationCode] = useState("");
const [verificationEmail, setVerificationEmail] = useState("");

const [showVerification, setShowVerification] = useState(false);

const [error, setError] = useState("");
const [success, setSuccess] = useState("");
const [loading, setLoading] = useState(false);
const [resending, setResending] = useState(false);

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
  const {
    data,
    error: signUpError,
  } = await supabase.auth.signUp({
    email: cleanEmail,
    password,
  });

  if (signUpError) {
    setError(signUpError.message);
    setLoading(false);
    return;
  }

  if (data.user && !data.session) {
    setVerificationEmail(cleanEmail);
    setVerificationCode("");
    setShowVerification(true);

    setSuccess(
      `Hemos enviado un código de verificación de 8 dígitos a ${cleanEmail}.`
    );

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
    "Revisa tu correo electrónico para verificar tu cuenta."
  );
} catch {
  setError(
    "Ocurrió un error al crear la cuenta. Inténtalo nuevamente."
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

const cleanCode = verificationCode.trim();

if (!cleanCode) {
  setError("Introduce el código de verificación.");
  return;
}

if (!/^\d{8}$/.test(cleanCode)) {
  setError("El código debe tener 8 dígitos.");
  return;
}

if (!verificationEmail) {
  setError(
    "No encontramos el correo que está pendiente de verificación."
  );
  return;
}

setLoading(true);

try {
  const {
    data,
    error: verifyError,
  } = await supabase.auth.verifyOtp({
    email: verificationEmail,
    token: cleanCode,
    type: "email",
  });

  if (verifyError) {
    setError(
      "El código no es válido o ha expirado. Comprueba el código e inténtalo nuevamente."
    );

    setLoading(false);
    return;
  }

  if (data.session) {
    setSuccess(
      "Correo verificado correctamente. ¡Bienvenido a STORE GAMING!"
    );

    setTimeout(() => {
      router.push("/home");
    }, 700);

    return;
  }

  setSuccess(
    "Correo verificado correctamente. Ahora puedes iniciar sesión."
  );

  setTimeout(() => {
    router.push("/login");
  }, 900);
} catch {
  setError(
    "No se pudo verificar el código. Inténtalo nuevamente."
  );
}

setLoading(false);

}

async function handleResendCode() {
if (!verificationEmail) {
setError(
"No encontramos el correo que está pendiente de verificación."
);
return;
}

setError("");
setSuccess("");
setResending(true);

try {
  const {
    error: resendError,
  } = await supabase.auth.resend({
    type: "signup",
    email: verificationEmail,
  });

  if (resendError) {
    setError(
      "No se pudo reenviar el código. Espera unos segundos e inténtalo nuevamente."
    );

    setResending(false);
    return;
  }

  setVerificationCode("");

  setSuccess(
    "Hemos enviado un nuevo código de 8 dígitos a tu correo electrónico."
  );
} catch {
  setError(
    "No se pudo reenviar el código. Inténtalo nuevamente."
  );
}

setResending(false);

}

function backToRegister() {
setShowVerification(false);
setVerificationCode("");
setError("");
setSuccess("");
}

return (
<main className="auth-page register-page">

  <div className="auth-background" />

  <section className="auth-card register-card">

    <button
      type="button"
      className="back-button auth-back-button register-back-button"
      onClick={() =>
        showVerification
          ? backToRegister()
          : router.push("/")
      }
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

    {showVerification ? (
      <>

        <div className="register-heading">

          <p className="auth-small">
            VERIFICACIÓN DE CORREO
          </p>

          <h1 className="auth-title">
            CONFIRMA{" "}
            <span>
              TU CUENTA
            </span>
          </h1>

          <div className="register-title-line" />

          <p className="auth-description">
            Hemos enviado un código de 8 dígitos a:
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
            {verificationEmail}
          </p>

        </div>

        <form
          onSubmit={handleVerifyCode}
          className="auth-form register-form"
        >

          <div className="register-field">

            <label htmlFor="verification-code">
              CÓDIGO DE VERIFICACIÓN
            </label>

            <div className="input-wrapper register-input-wrapper">

              <span className="input-icon">
                #
              </span>

              <input
                id="verification-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={8}
                value={verificationCode}
                onChange={(event) => {
                  const value =
                    event.target.value.replace(
                      /\D/g,
                      ""
                    );

                  setVerificationCode(
                    value.slice(0, 8)
                  );
                }}
                placeholder="00000000"
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
              verificationCode.length !== 8
            }
          >
            <span>
              {loading
                ? "VERIFICANDO..."
                : "VERIFICAR CORREO"}
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
    ) : (

      <>

        <div className="register-heading">

          <p className="auth-small">
            ÚNETE A LA COMUNIDAD
          </p>

          <h1 className="auth-title">
            CREAR{" "}
            <span>
              CUENTA
            </span>
          </h1>

          <div className="register-title-line" />

          <p className="auth-description">
            Crea tu cuenta para comenzar a comprar
            tus recargas gaming.
          </p>

        </div>

        <form
          onSubmit={handleRegister}
          className="auth-form register-form"
        >

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
                  setEmail(
                    event.target.value
                  )
                }
                placeholder="tucorreo@gmail.com"
                autoComplete="email"
                inputMode="email"
              />

            </div>

          </div>

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
                  setPassword(
                    event.target.value
                  )
                }
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
              />

            </div>

          </div>

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
                ? "CREANDO CUENTA..."
                : "CREAR CUENTA"}
            </span>

            {!loading && (
              <b>
                →
              </b>
            )}

          </button>

        </form>

        <div className="auth-divider register-divider">

          <span />

          <strong>
            O
          </strong>

          <span />

        </div>

        <div className="register-login-area">

          <p className="auth-register-text">
            ¿YA TIENES UNA CUENTA?
          </p>

          <button
            type="button"
            className="auth-register-button register-login-button"
            onClick={() =>
              router.push("/login")
            }
          >
            <span>
              INICIAR SESIÓN
            </span>

            <b>
              →
            </b>

          </button>

        </div>

      </>

    )}

    <div className="register-footer">
      STORE GAMING • RECARGAS GAMING
    </div>

  </section>

</main>

);
      }
