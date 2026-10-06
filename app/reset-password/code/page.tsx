"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ResetPasswordCodePage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const savedEmail = sessionStorage.getItem("reset_password_email");

    if (!savedEmail) {
      router.replace("/reset-password");
      return;
    }

    setEmail(savedEmail);
  }, [router]);

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    const cleanCode = code.trim();

    if (!email) {
      setError("No se encontró el correo electrónico.");
      return;
    }

    if (cleanCode.length !== 6) {
      setError("El código debe tener 6 dígitos.");
      return;
    }

    if (!/^\d{6}$/.test(cleanCode)) {
      setError("El código solo puede contener números.");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: cleanCode,
        type: "recovery",
      });

      if (error) {
        setError("El código es incorrecto o ha expirado.");
        return;
      }

      if (!data.session) {
        setError("No se pudo verificar la sesión. Solicite un nuevo código.");
        return;
      }

      sessionStorage.setItem("reset_password_verified", "true");

      setSuccess("Código confirmado correctamente.");

      setTimeout(() => {
        router.push("/reset-password/new-password");
      }, 700);
    } catch (err) {
      console.error(err);
      setError("Ocurrió un error. Intente nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email || resending) return;

    setError("");
    setSuccess("");
    setResending(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: `${window.location.origin}/reset-password/code`,
        }
      );

      if (error) {
        setError(error.message);
        return;
      }

      setSuccess("Se ha enviado un nuevo código a su correo.");
    } catch (err) {
      console.error(err);
      setError("No se pudo reenviar el código.");
    } finally {
      setResending(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#050505] text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* LOGO */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 w-20 h-20 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/20">
            <span className="text-4xl">🛒</span>
          </div>

          <h1 className="text-3xl font-black tracking-tight">
            STORE <span className="text-green-400">GAMING</span>
          </h1>

          <p className="text-gray-400 mt-2">
            Verificación de seguridad
          </p>
        </div>

        {/* CARD */}
        <div className="bg-[#101010] border border-white/10 rounded-2xl p-6 shadow-2xl">

          <h2 className="text-xl font-bold text-center mb-2">
            CONFIRMAR CÓDIGO
          </h2>

          <p className="text-sm text-gray-400 text-center mb-2">
            Introduzca el código de 6 dígitos enviado a:
          </p>

          <p className="text-sm text-green-400 text-center font-semibold mb-6 break-all">
            {email || "Cargando..."}
          </p>

          <form onSubmit={handleConfirm} className="space-y-4">

            {/* CODE */}
            <div>
              <label
                htmlFor="code"
                className="block text-sm font-semibold text-gray-300 mb-2"
              >
                CÓDIGO DE 6 DÍGITOS
              </label>

              <input
                id="code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="000000"
                autoComplete="one-time-code"
                className="w-full h-14 rounded-xl bg-[#181818] border border-white/10 px-4 text-center text-2xl font-black tracking-[0.5em] text-white placeholder-gray-700 outline-none focus:border-green-400 transition"
              />
            </div>

            {/* ERROR */}
            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            {/* SUCCESS */}
            {success && (
              <div className="rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-400">
                {success}
              </div>
            )}

            {/* CONFIRM BUTTON */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-green-500 hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-black transition"
            >
              {loading ? "CONFIRMANDO..." : "CONFIRMAR"}
            </button>

          </form>

          {/* RESEND */}
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="w-full mt-4 text-sm text-green-400 hover:text-green-300 disabled:opacity-50 transition"
          >
            {resending ? "REENVIANDO..." : "REENVIAR CÓDIGO"}
          </button>

          {/* BACK */}
          <button
            type="button"
            onClick={() => router.push("/reset-password")}
            className="w-full mt-4 text-sm text-gray-400 hover:text-white transition"
          >
            ← VOLVER
          </button>

        </div>
      </div>
    </main>
  );
        }
