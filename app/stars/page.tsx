"use client";

import { useRouter } from "next/navigation";

export default function StarsPage() {

  const router = useRouter();

  const packages = [
    { stars: 50, price: 0.85 },
    { stars: 100, price: 1.70 },
    { stars: 200, price: 3.20 },
    { stars: 250, price: 4.00 },
    { stars: 500, price: 7.90 },
    { stars: 750, price: 12.00 },
  ];

  return (
    <main className="service-page">

      <header className="service-header">

        <button
          onClick={() => router.push("/home")}
          className="back-button"
        >
          ←
        </button>

        <h1>
          ⭐ ESTRELLAS
        </h1>

      </header>


      <section className="service-hero">

        <span>
          TELEGRAM ⭐
        </span>

        <h2>
          COMPRA ESTRELLAS
        </h2>

        <p>
          Recibe estrellas de Telegram de forma rápida y segura.
        </p>

      </section>


      <section className="service-grid">

        {packages.map((item)=>(
          
          <button
            key={item.stars}
            className="service-card"
          >

            <strong>
              ⭐ {item.stars}
            </strong>

            <span>
              ${item.price.toFixed(2)}
            </span>

          </button>

        ))}

      </section>


    </main>
  );
}
