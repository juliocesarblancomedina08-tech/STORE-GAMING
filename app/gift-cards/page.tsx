"use client";

import { useRouter } from "next/navigation";


export default function GiftCardsPage(){

const router = useRouter();


const cards=[
"Google Play",
"Steam",
"PlayStation",
"Xbox",
"Netflix"
];


return(

<main className="service-page">


<header className="service-header">

<button
className="back-button"
onClick={()=>router.push("/home")}
>
←
</button>


<h1>
🎁 TARJETAS
</h1>


</header>



<section className="service-hero">

<span>
GIFT CARDS
</span>


<h2>
PRÓXIMAMENTE
</h2>


<p>
Estamos preparando las mejores tarjetas digitales.
</p>


</section>



<section className="service-grid">

{cards.map(card=>(

<div
key={card}
className="service-card"
>

<strong>
🎁 {card}
</strong>


<span>
DISPONIBLE PRONTO
</span>


</div>

))}


</section>



</main>

)

}
