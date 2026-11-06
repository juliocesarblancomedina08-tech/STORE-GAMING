
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type StoreOrder = {
  id?: string;
  user_id?: string;
  email?: string;
  username?: string;
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

      if (!mounted) return;

      loadOrders(user.id, userEmail);

      setLoading(false);
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

        if (mounted) {
          loadOrders(user.id, userEmail);
        }
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

  function loadOrders(
    userId: string,
    userEmail: string
  ) {
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

    const userOrders = orders.filter((order) => {
      if (
        order.user_id &&
        order.user_id === userId
      ) {
        return true;
      }

      if (
        !order.user_id &&
        order.email &&
        order.email.toLowerCase() ===
          userEmail.toLowerCase()
      ) {
        return true;
      }

      return false;
    });

    setTotalOrders(userOrders.length);

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

    const completedOrders = userOrders.filter(
      (order) =>
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
   * ABRIR VIP
   * =========================
   */

  function openVIP() {
    router.push("/vip");
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

      {/* HEADER */}

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

      {/* PERFIL */}

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
          STORE GAMING VIP
      ========================== */}

      <section className="profile-vip-card">

        <div className="vip-card-decoration" />

        <div className="vip-card-top">

          <div className="vip-crown">
            ♛
          </div>

          <span className="vip-status">
            MEMBRESÍA EXCLUSIVA
          </span>

        </div>

        <div className="vip-card-content">

          <span className="vip-brand">
            STORE GAMING
          </span>

          <h2>
            VIP <span>MEMBER</span>
          </h2>

          <p>
            Desbloquea ventajas, mejores precios
            y oportunidades exclusivas.
          </p>

        </div>

        <div className="vip-benefits">

          <div>
            <span>％</span>
            <p>
              Descuentos especiales en ofertas
            </p>
          </div>

          <div>
            <span>✦</span>
            <p>
              Promociones exclusivas para VIP
            </p>
          </div>

          <div>
            <span>◆</span>
            <p>
              Acceso a futuras ventajas premium
            </p>
          </div>

        </div>

        <div className="vip-card-footer">

          <div className="vip-price">
            <strong>5.00</strong>
            <span>CRÉDITOS / MES</span>
          </div>

          <button
            type="button"
            onClick={openVIP}
            className="vip-button"
          >
            DESCUBRIR VIP
            <span>→</span>
          </button>

        </div>

        <div className="vip-duration">
          SUSCRIPCIÓN MENSUAL · 30 DÍAS
        </div>

      </section>

      {/* ACCESOS */}

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

      {/* ESTADÍSTICAS */}

      <section className="profile-statistics">

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

      {/* INFORMACIÓN */}

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

      {/* FOOTER */}

      <footer className="service-footer">

        <strong>
          STORE GAMING
        </strong>

        <span>
          PERFIL DEL CLIENTE
        </span>

      </footer>

      {/* ESTILOS VIP */}

      <style jsx global>{`
        .profile-vip-card {
          position: relative;
          overflow: hidden;
          max-width: 620px;
          margin: 22px auto;
          padding: 21px;
          border-radius: 20px;
          border: 1px solid rgba(255,65,65,.45);
          background:
            radial-gradient(
              circle at 90% 5%,
              rgba(255,45,45,.22),
              transparent 42%
            ),
            linear-gradient(135deg,#291010,#100909 75%);
          box-shadow:
            0 12px 35px rgba(0,0,0,.3),
            0 0 22px rgba(255,40,40,.07);
          color: white;
        }

        .vip-card-decoration {
          position: absolute;
          width: 180px;
          height: 180px;
          right: -80px;
          bottom: -100px;
          border-radius: 50%;
          background: rgba(255,40,40,.15);
          filter: blur(35px);
          pointer-events: none;
        }

        .vip-card-top,
        .vip-card-footer {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .vip-crown {
          width: 43px;
          height: 43px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 13px;
          background: rgba(255,55,55,.15);
          border: 1px solid rgba(255,75,75,.4);
          color: #ff6262;
          font-size: 29px;
        }

        .vip-status {
          color: #ff7777;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 1.4px;
        }

        .vip-card-content {
          position: relative;
          z-index: 1;
          margin-top: 17px;
        }

        .vip-brand {
          color: #c18b8b;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 3px;
        }

        .vip-card-content h2 {
          margin: 5px 0;
          font-size: 32px;
          font-weight: 950;
          letter-spacing: 1px;
        }

        .vip-card-content h2 span {
          color: #ff5555;
        }

        .vip-card-content p {
          max-width: 390px;
          margin: 7px 0 0;
          color: #c5aaaa;
          font-size: 11px;
          line-height: 1.6;
        }

        .vip-benefits {
          position: relative;
          z-index: 1;
          display: grid;
          gap: 10px;
          margin: 20px 0;
          padding: 15px 0;
          border-top: 1px solid rgba(255,255,255,.09);
          border-bottom: 1px solid rgba(255,255,255,.09);
        }

        .vip-benefits > div {
          display: flex;
          align-items: center;
          gap: 11px;
        }

        .vip-benefits > div > span {
          width: 25px;
          height: 25px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          background: rgba(255,55,55,.13);
          color: #ff6565;
          font-size: 15px;
          flex-shrink: 0;
        }

        .vip-benefits p {
          margin: 0;
          color: #e3d2d2;
          font-size: 11px;
          font-weight: 700;
        }

        .vip-price strong {
          display: block;
          color: #fff;
          font-size: 26px;
          font-weight: 950;
        }

        .vip-price > span {
          display: block;
          margin-top: 3px;
          color: #c18b8b;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 1px;
        }

        .vip-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 12px 15px;
          border: 0;
          border-radius: 10px;
          background: linear-gradient(135deg,#ff5555,#b71919);
          color: white;
          font-size: 10px;
          font-weight: 950;
          cursor: pointer;
          box-shadow: 0 5px 18px rgba(255,40,40,.2);
          transition: .2s ease;
        }

        .vip-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 22px rgba(255,40,40,.3);
        }

        .vip-button:active {
          transform: scale(.97);
        }

        .vip-button span {
          font-size: 16px;
        }

        .vip-duration {
          position: relative;
          z-index: 1;
          margin-top: 16px;
          color: #997b7b;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 1.2px;
          text-align: center;
        }

        @media(max-width:420px) {
          .profile-vip-card {
            padding: 17px;
          }

          .vip-card-content h2 {
            font-size: 28px;
          }

          .vip-button {
            padding: 11px;
            font-size: 9px;
          }
        }
      `}</style>

    </main>
  );
}
