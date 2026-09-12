"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function BalancePage() {
  const router = useRouter();

  const [balance, setBalance] = useState<number>(0);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBalance() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/");
        return;
      }

      setEmail(session.user.email || "");

      const { data, error } = await supabase
        .from("profiles")
        .select("balance")
        .eq("id", session.user.id)
        .single();

      if (!error && data) {
        setBalance(Number(data.balance || 0));
      }

      setLoading(false);
    }

    loadBalance();
  }, [router]);

  if (loading) {
    return (
      <main className="balance-page">
        <div className="balance-loading">
          <div className="balance-spinner">💰</div>
          <p>CARGANDO BALANCE...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="balance-page">
      <div className="balance-background" />

      <header className="balance-header">
        <button
          type="button"
          className="balance-back"
          onClick={() => router.push("/home")}
        >
          ←
        </button>

        <div>
          <p className="balance-header-small">
            STORE GAMING
          </p>

          <h1>
            💰 MI <span>BALANCE</span>
          </h1>
        </div>
      </header>

      <section className="balance-container">
        <div className="balance-card">
          <div className="balance-card-top">
            <span>BALANCE DISPONIBLE</span>
            <span className="balance-status">
              ● ACTIVO
            </span>
          </div>

          <div className="balance-amount">
            ${balance.toFixed(2)}
          </div>

          <p className="balance-email">
            {email}
          </p>
        </div>

        <button
          type="button"
          className="balance-add-button"
          onClick={() => router.push("/balance/deposit")}
        >
          <span className="balance-add-icon">＋</span>

          <span>
            <strong>INSERTAR BALANCE</strong>
            <small>
              Agrega fondos a tu cuenta
            </small>
          </span>

          <span className="balance-arrow">
            ›
          </span>
        </button>

        <div className="balance-info-card">
          <div className="balance-info-icon">
            🔐
          </div>

          <div>
            <strong>
              BALANCE SEGURO
            </strong>

            <p>
              Tu saldo está asociado
              directamente a tu cuenta.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
    }
