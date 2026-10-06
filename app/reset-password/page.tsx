"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ResetPasswordPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError("Ingrese su correo electrónico.");
      return;
    }

    if (!cleanEmail.includes("@")) {
      setError("Ingrese un correo electrónico válido.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        cleanEmail,
        {
          redirectTo: `${window.location.origin}/reset-password/code`,
        }
      );

      if (error) {
        setError(error.message);
        return;
      }

      sessionStorage.setItem("reset_password_email", cleanEmail);

      setSuccess("Código enviado correctamente a su correo.");

      setTimeout(() => {
        router.push("/reset-password/code");
      }, 1000);
    } catch (err) {
      console.error(err);
      setError("Ocurrió un error. Intente nuevamente.");
    } finally {
      setLoading(false);
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
            Recuperar contraseña
          </p>
        </div>

        {/* CARD */}
        <div className="bg-[#101010] border border-white/10 rounded-2xl p-6 shadow-2xl">

          <h2 className="text-xl font-bold text-center mb-2">
            RECUPERAR CONTRASEÑA
          </h2>

          <p className="text-sm text-gray-400 text-center mb-6">
            Introduzca su Gmail para recibir un código de verificación de 6 dígitos.
          </p>

          <form onSubmit={handleSendCode} className="space-y-4">

            {/* EMAIL */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-gray-300 mb-2"
              >
                CORREO ELECTRÓNICO
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ejemplo@gmail.com"
                autoComplete="email"
                className="w-full h-12 rounded-xl bg-[#181818] border border-white/10 px-4 text-white placeholder-gray-600 outline-none focus:border-green-400 transition"
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

            {/* BUTTON */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-green-500 hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-black transition"
            >
              {loading ? "ENVIANDO..." : "VERIFICAR GMAIL"}
            </button>

          </form>

          {/* BACK */}
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="w-full mt-4 text-sm text-gray-400 hover:text-white transition"
          >
            ← VOLVER AL INICIO DE SESIÓN
          </button>

        </div>
      </div>
    </main>
  );
}
