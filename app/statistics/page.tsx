"use client";

import { useRouter } from "next/navigation";


export default function StatisticsPage(){

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
📊 ESTADÍSTICAS
</h1>


</header>


<section className="stats-panel">


<div>
<strong>
0
</strong>

<span>
PEDIDOS
</span>

</div>


<div>
<strong>
0$
</strong>

<span>
GASTADO
</span>

</div>


<div>
<strong>
0
</strong>

<span>
RECARGAS
</span>

</div>


</section>


</main>

)

}
