"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type StoreOrder = {
  id?: string;
  game?: string;
  product?: string;
  displayProduct?: string;
  price?: number | string;
  total?: number | string;
  status?: string;
  date?: string;
  createdAt?: string;
};

export default function ProfilePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");

  const [balance, setBalance] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error || !session?.user) {
        router.replace("/");
        return;
      }

      const user = session.user;

      const userEmail = user.email || "";
      const userName =
        userEmail.split("@")[0] || "usuario";

      setEmail(userEmail);
      setUsername(userName);

      await loadBalance(user.id);
      loadOrders();

      if (mounted) {
        setLoading(false);
      }
    }

    loadProfile();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!session?.user) {
          router.replace("/");
          return;
        }

        const user = session.user;

        const userEmail = user.email || "";
        const userName =
          userEmail.split("@")[0] || "usuario";

        setEmail(userEmail);
        setUsername(userName);

        await loadBalance(user.id);
        loadOrders();
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  /*
   * =========================
   * BALANCE
   * =========================
   */

  async function loadBalance(userId: string) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("balance")
        .eq("id", userId)
        .single();

      if (!error && data) {
        setBalance(Number(data.balance) || 0);
      } else {
        setBalance(0);
      }
    } catch {
      setBalance(0);
    }
  }

  /*
   * =========================
   * ÓRDENES
   * =========================
   */

  function loadOrders() {
    let orders: StoreOrder[] = [];

    try {
      const savedOrders = localStorage.getItem(
        "storeGamingOrders"
      );

      if (savedOrders) {
        const parsed = JSON.parse(savedOrders);

        if (Array.isArray(parsed)) {
          orders = parsed;
        }
      }
    } catch {
      orders = [];
    }

    /*
     * PEDIDOS TOTALES
     */

    setTotalOrders(orders.length);

    /*
     * GASTO TOTAL
     *
     * Solo contamos órdenes completadas.
     */

    const completedStatuses = [
      "COMPLETADA",
      "COMPLETADO",
      "CONFIRMADA",
      "CONFIRMADO",
      "completada",
      "completado",
      "confirmada",
      "confirmado",
    ];

    const completedOrders = orders.filter((order) =>
      completedStatuses.includes(
        String(order.status || "")
      )
    );

    const spent = completedOrders.reduce(
      (sum, order) => {
        const amount =
          Number(order.total) ||
          Number(order.price) ||
          0;

        return sum + amount;
      },
      0
    );

    setTotalSpent(spent);
  }

  /*
   * =========================
   * EDITAR PERFIL
   * =========================
   */

  function editProfile() {
    router.push("/profile/edit");
  }

  /*
   * =========================
   * CARGANDO
   * =========================
   */

  if (loading) {
    return (
      <main className="store-loading">

        <div className="loading-logo">
          STORE GAMING
        </div>

        <div className="loading-line" />

        <p>
          CARGANDO PERFIL...
        </p>

      </main>
    );
  }

  return (
    <main className="service-page">

      {/* =========================
          HEADER
      ========================== */}

      <header className="service-header">

        <button
          className="back-button"
          onClick={() => router.push("/home")}
          aria-label="Volver"
        >
          ←
        </button>

        <h1>
          ♙ PERFIL
        </h1>

      </header>


      {/* =========================
          PERFIL
      ========================== */}

      <section className="profile-card">

        <div className="profile-avatar">
          @
        </div>


        <h2>
          @{username}
        </h2>


        <p>
          {email}
        </p>


        <span className="profile-client-label">
          Cliente STORE GAMING
        </span>


        <button
          type="button"
          onClick={editProfile}
        >
          EDITAR PERFIL
        </button>

      </section>


      {/* =========================
          ACCESOS
      ========================== */}

      <section className="profile-menu">

        <button
          type="button"
          className="profile-menu-item"
          onClick={() => router.push("/orders")}
        >

          <span className="profile-menu-icon">
            ▣
          </span>

          <div>
            <strong>
              ÓRDENES
            </strong>

            <small>
              Consulta tus pedidos
            </small>
          </div>

          <span className="profile-menu-arrow">
            →
          </span>

        </button>


        <button
          type="button"
          className="profile-menu-item"
          onClick={() => router.push("/balance")}
        >

          <span className="profile-menu-icon">
            $
          </span>

          <div>
            <strong>
              BALANCE
            </strong>

            <small>
              Administra tu saldo
            </small>
          </div>

          <span className="profile-menu-arrow">
            →
          </span>

        </button>


        <button
          type="button"
          className="profile-menu-item"
          onClick={() => router.push("/statistics")}
        >

          <span className="profile-menu-icon">
            ▥
          </span>

          <div>
            <strong>
              ACTAS
            </strong>

            <small>
              Actividad de tu cuenta
            </small>
          </div>

          <span className="profile-menu-arrow">
            →
          </span>

        </button>


        <button
          type="button"
          className="profile-menu-item"
          onClick={() => router.push("/support")}
        >

          <span className="profile-menu-icon">
            🎧
          </span>

          <div>
            <strong>
              APOYO
            </strong>

            <small>
              Contacta con soporte
            </small>
          </div>

          <span className="profile-menu-arrow">
            →
          </span>

        </button>

      </section>


      {/* =========================
          ESTADÍSTICAS
      ========================== */}

      <section className="profile-statistics">

        {/* BALANCE */}

        <div className="profile-stat-card profile-stat-balance">

          <div className="profile-stat-top">

            <span className="profile-stat-icon">
              $
            </span>

            <span>
              BALANCE
            </span>

          </div>


          <strong>
            ${balance.toFixed(4)}
          </strong>

        </div>


        {/* PEDIDOS TOTALES */}

        <div className="profile-stat-card">

          <div className="profile-stat-top">

            <span className="profile-stat-icon">
              ▣
            </span>

            <span>
              PEDIDOS TOTALES
            </span>

          </div>


          <strong>
            {totalOrders}
          </strong>


          <button
            type="button"
            onClick={() => router.push("/orders")}
          >
            ÓRDENES ABIERTAS →
          </button>

        </div>


        {/* GASTO TOTAL */}

        <div className="profile-stat-card profile-stat-wide">

          <div className="profile-stat-top">

            <span className="profile-stat-icon">
              💳
            </span>

            <span>
              GASTO TOTAL
            </span>

          </div>


          <strong>
            ${totalSpent.toFixed(4)}
          </strong>


          <small>
            TODOS LOS TIEMPOS
          </small>

        </div>

      </section>


      {/* =========================
          INFORMACIÓN
      ========================== */}

      <section className="profile-account-info">

        <div>
          <span>
            USUARIO
          </span>

          <strong>
            @{username}
          </strong>
        </div>


        <div>
          <span>
            CORREO ELECTRÓNICO
          </span>

          <strong>
            {email}
          </strong>
        </div>

      </section>


      {/* =========================
          FOOTER
      ========================== */}

      <footer className="service-footer">

        <strong>
          STORE GAMING
        </strong>

        <span>
          PERFIL DEL CLIENTE
        </span>

      </footer>

    </main>
  );
  }
