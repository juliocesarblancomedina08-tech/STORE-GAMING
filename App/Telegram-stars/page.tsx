"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";


const starsOffers = [
  { name: "50⭐", price: "0.80$" },
  { name: "100⭐", price: "1.57$" },
  { name: "200⭐", price: "3.10$" },
  { name: "250⭐", price: "3.88$" },
  { name: "500⭐", price: "7.74$" },
  { name: "750⭐", price: "11.57$" },
  { name: "1000⭐", price: "15.42$" },
  { name: "1500⭐", price: "23.12$" },
  { name: "2000⭐", price: "30.90$" },
  { name: "3000⭐", price: "46.20$" },
  { name: "5000⭐", price: "77.00$" },
  { name: "10000⭐", price: "154.00$" },
];


const premiumOffers = [
  {
    name: "3 MESES",
    price: "12.40$",
  },
  {
    name: "6 MESES",
    price: "16.60$",
  },
  {
    name: "1 AÑO",
    price: "30.00$",
  },
];


export default function TelegramStarsPage() {

  const router = useRouter();

  const [section, setSection] = useState<
    "stars" | "premium"
  >("stars");


  const offers =
    section === "stars"
      ? starsOffers
      : premiumOffers;


  return (

    <main className="telegram-stars-page">


      <button
        className="back-button"
        onClick={() => router.push("/home")}
      >
        ← Volver
      </button>



      <h1 className="telegram-stars-title">

        TELEGRAM STARS

      </h1>



      <div className="telegram-tabs">


        <button
          className={
            section === "stars"
              ? "telegram-tab active"
              : "telegram-tab"
          }
          onClick={() =>
            setSection("stars")
          }
        >

          ⭐ Estrellas Telegram

        </button>



        <button
          className={
            section === "premium"
              ? "telegram-tab active"
              : "telegram-tab"
          }
          onClick={() =>
            setSection("premium")
          }
        >

          ⭐ Telegram Premium

        </button>


      </div>




      <section className="telegram-offers">


        {offers.map((offer) => (

          <button
            key={offer.name}
            className="telegram-offer-card"
          >


            <span className="offer-price">

              {offer.price}

            </span>



            <h2>

              {section === "stars"
                ? offer.name
                : "Telegram Premium"
              }

            </h2>



            {section === "premium" && (

              <p>

                {offer.name}

              </p>

            )}



          </button>


        ))}



      </section>



    </main>

  );
        }
