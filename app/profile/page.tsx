"use client";


import {useRouter} from "next/navigation";


export default function ProfilePage(){

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
♙ PERFIL
</h1>


</header>


<section className="profile-card">


<div className="profile-avatar">
@
</div>


<h2>
Usuario
</h2>


<p>
Cliente STORE GAMING
</p>


<button>
EDITAR PERFIL
</button>


</section>



</main>

)

}
