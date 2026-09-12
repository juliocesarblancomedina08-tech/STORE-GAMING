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

      if (!session?.user) {
        router.replace("/");
        return;
      }

      setEmail(session.user.email || "usuario");

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

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session?.user) {
          router.replace("/");
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  if (loading) {
    return (
      <main className="balance-page">
        <div className="balance-background" />

        <div className="balance-loading">
          <div className="balance-loading-logo">
            🛒🎮
          </div>

          <div className="balance-spinner" />

          <p>
            CARGANDO BILLETERA...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="balance-page">
      <div className="balance-background" />

      {/* HEADER */}

      <header className="balance-header">

        <button
          type="button"
          className="balance-back-button"
          onClick={() => router.push("/home")}
          aria-label="Volver"
        >
          <span>←</span>
        </button>

        <div className="balance-header-title">
          <small>
            STORE GAMING
          </small>

          <h1>
            MI <span>BILLETERA</span>
          </h1>
        </div>

        <div className="balance-header-icon">
          💰
        </div>

      </header>

      {/* CONTENIDO */}

      <section className="balance-content">

        {/* TARJETA PRINCIPAL */}

        <div className="balance-main-card">

          <div className="balance-card-glow" />

          <div className="balance-card-top">

            <div>
              <span className="balance-label">
                BALANCE DISPONIBLE
              </span>

              <div className="balance-live">
                <span />
                CUENTA ACTIVA
              </div>
            </div>

            <div className="balance-wallet-symbol">
              ◉
            </div>

          </div>

          <div className="balance-amount">
            <span>$</span>
            {balance.toFixed(2)}
          </div>

          <div className="balance-card-bottom">

            <div>
              <small>
                CUENTA
              </small>

              <strong>
                {email}
              </strong>
            </div>

            <div className="balance-secure">
              🔒
              <span>
                SEGURO
              </span>
            </div>

          </div>

        </div>

        {/* INSERTAR BALANCE */}

        <button
          type="button"
          className="balance-deposit-card"
          onClick={() => router.push("/balance/deposit")}
        >

          <div className="deposit-icon">
            +
          </div>

          <div className="deposit-text">

            <strong>
              INSERTAR BALANCE
            </strong>

            <span>
              Agrega fondos a tu billetera
            </span>

          </div>

          <div className="deposit-arrow">
            →
          </div>

        </button>

        {/* HISTORIAL */}

        <button
          type="button"
          className="balance-history-card"
          onClick={() => router.push("/balance/history")}
        >

          <div className="history-icon">
            ▣
          </div>

          <div className="history-text">

            <strong>
              HISTORIAL DE MOVIMIENTOS
            </strong>

            <span>
              Consulta tus depósitos y movimientos
            </span>

          </div>

          <div className="history-arrow">
            →
          </div>

        </button>

        {/* INFORMACIÓN */}

        <div className="balance-security-card">

          <div className="security-icon">
            🛡️
          </div>

          <div>

            <strong>
              TU DINERO ESTÁ PROTEGIDO
            </strong>

            <p>
              Tu balance está vinculado
              exclusivamente a tu cuenta de
              STORE GAMING.
            </p>

          </div>

        </div>

        {/* VOLVER */}

        <button
          type="button"
          className="balance-home-button"
          onClick={() => router.push("/home")}
        >
          ← VOLVER A LA TIENDA
        </button>

      </section>

    </main>
  );
          }
