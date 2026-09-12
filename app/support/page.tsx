"use client";


import {useRouter} from "next/navigation";


export default function SupportPage(){

const router=useRouter();


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
🎧 SOPORTE
</h1>


</header>



<section className="support-card">


<h2>
¿NECESITAS AYUDA?
</h2>


<p>
Nuestro equipo está disponible para ayudarte con tus pedidos.
</p>


<button>
CONTACTAR SOPORTE
</button>


</section>



</main>

)

}
