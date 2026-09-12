"use client";

import { useRouter } from "next/navigation";

export default function TelegramStarsPage() {

  const router = useRouter();

  return (
    <main className="service-page">

      <button
        className="back-button"
        onClick={() => router.push("/home")}
      >
        ← Volver
      </button>


      <section className="service-card">

        <div className="service-icon">
          ⭐
        </div>


        <h1>
          ESTRELLAS DE TELEGRAM
        </h1>


        <p>
          Compra estrellas de Telegram
          de forma rápida y segura.
        </p>


        <div className="coming-box">

          Próximamente ofertas disponibles

        </div>


      </section>

    </main>
  );
}
