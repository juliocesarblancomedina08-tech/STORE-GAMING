"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type Game = {
  name: string;
  description: string;
  image: string;
  route: string;
  tag: string;
};

const games: Game[] = [
  {
    name: "FREE FIRE LATAM",
    description: "Diamantes para tu cuenta.",
    image: "/images/free-fire-latam.jpg",
    route: "/games/free-fire-latam",
    tag: "DIAMANTES",
  },
  {
    name: "CALL OF DUTY MOBILE",
    description: "CP para Call of Duty Mobile.",
    image: "/images/call-of-duty-mobile.jpg",
    route: "/games/call-of-duty",
    tag: "CP",
  },
  {
    name: "MOBILE LEGENDS",
    description: "Diamantes para Mobile Legends.",
    image: "/images/mobile-legends.jpg",
    route: "/games/mobile-legends",
    tag: "DIAMANTES",
  },
  {
    name: "BLOOD STRIKE",
    description: "Recargas para tu cuenta.",
    image: "/images/blood-strike.jpg",
    route: "/games/blood-strike",
    tag: "RECARGAS",
  },
];

export default function HomePage() {

  const router = useRouter();

  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);


  useEffect(() => {

    async function loadUser() {

      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();


      if (error || !session?.user) {
        router.replace("/");
        return;
      }


      const email =
        session.user.email || "usuario";


      const name =
        email.split("@")[0] || "usuario";


      setUsername(name);
      setLoading(false);

    }


    loadUser();


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



  async function logout() {

    setMenuOpen(false);

    await supabase.auth.signOut();

    router.replace("/");

  }



  function goTo(path:string){

    setMenuOpen(false);

    router.push(path);

  }



  if (loading) {

    return (

      <main className="store-loading">

        <div className="loading-logo">
          STORE GAMING
        </div>


        <div className="loading-line" />


        <p>
          CARGANDO STORE GAMING...
        </p>


      </main>

    );

  }



  return (

    <main className="store-home">


      {menuOpen && (

        <>


          <button

            type="button"

            className="menu-backdrop"

            aria-label="Cerrar menú"

            onClick={() => setMenuOpen(false)}

          />



          <aside className="side-menu">


            <div className="side-menu-header">


              <div className="side-menu-brand">


                <span className="side-brand-line" />


                <div>

                  <small>
                    STORE
                  </small>


                  <strong>
                    GAMING
                  </strong>


                </div>


              </div>



              <button

                type="button"

                className="side-menu-close"

                onClick={() => setMenuOpen(false)}

              >

                ×

              </button>


            </div>



            <div className="side-menu-user">


              <div className="side-user-icon">
                @
              </div>


              <div>

                <small>
                  CUENTA
                </small>


                <strong>
                  @{username}
                </strong>


              </div>


            </div>

                        <nav className="side-menu-nav">


              {/* PRINCIPAL */}


              <button
                type="button"
                className="side-menu-item active"
                onClick={() => goTo("/home")}
              >

                <span className="menu-icon home-icon">
                  ⌂
                </span>

                <span>
                  Hogar
                </span>

              </button>



              <button
                type="button"
                className="side-menu-item"
                onClick={() => goTo("/orders")}
              >

                <span className="menu-icon">
                  ▣
                </span>

                <span>
                  Órdenes
                </span>

              </button>




              {/* SERVICIOS */}



              <div className="side-menu-section-title">

                <span />

                SERVICIOS

                <span />

              </div>




              <button
                type="button"
                className="side-menu-item"
                onClick={() =>
                  goTo("/telegram-stars")
                }
              >

                <span className="menu-icon">
                  ☆
                </span>

                <span>
                  Estrellas de Telegram
                </span>

              </button>




              <button
                type="button"
                className="side-menu-item"
                onClick={() =>
                  goTo("/gift-cards")
                }
              >

                <span className="menu-icon gift-icon">
                  ▱
                </span>


                <span>
                  Tarjetas de regalo
                </span>


              </button>





              <button
                type="button"
                className="side-menu-item"
                onClick={() => {

                  setMenuOpen(false);


                  document
                    .querySelector(".games-section")
                    ?.scrollIntoView({
                      behavior:"smooth",
                    });


                }}
              >

                <span className="menu-icon">
                  ◇
                </span>


                <span>
                  Recargas TOP UP
                </span>


              </button>





              {/* FINANZAS */}




              <div className="side-menu-section-title">


                <span />


                FINANZAS


                <span />


              </div>




              <button
                type="button"
                className="side-menu-item"
                onClick={() =>
                  goTo("/balance")
                }
              >


                <span className="menu-icon">
                  ◉
                </span>


                <span>
                  Billetera
                </span>


              </button>





              <button
                type="button"
                className="side-menu-item"
                onClick={() =>
                  goTo("/statistics")
                }
              >


                <span className="menu-icon">
                  ▥
                </span>


                <span>
                  Estadísticas
                </span>


              </button>





              <button
                type="button"
                className="side-menu-item"
                onClick={() =>
                  goTo("/profile")
                }
              >


                <span className="menu-icon">
                  ♙
                </span>


                <span>
                  Perfil
                </span>


              </button>





              {/* SOPORTE */





              <button
                type="button"
                className="side-menu-item support-item"
                onClick={() =>
                  goTo("/support")
                }
              >


                <span className="support-headset-icon">


                  <span className="support-head" />


                  <span className="support-headset" />


                  <span className="support-mic" />


                </span>



                <span>
                  Soporte
                </span>


              </button>




            </nav>

                            <div className="side-menu-bottom">


              <button
                type="button"
                className="side-menu-logout"
                onClick={logout}
              >

                <span>
                  ⇥
                </span>


                <strong>
                  Cerrar sesión
                </strong>


              </button>


            </div>


          </aside>


        </>

      )}




      {/* HEADER */}



      <header className="store-header">



        <button
          type="button"
          className="menu-button"
          onClick={() => setMenuOpen(true)}
          aria-label="Abrir menú"
        >

          <span />
          <span />
          <span />

        </button>





        <button
          type="button"
          className="store-logo"
          onClick={() => router.push("/home")}
        >

          <span className="store-logo-text">


            <strong>
              STORE
            </strong>



            <span className="store-logo-cart">
              🛒
            </span>



            <b>
              GAMING
            </b>


          </span>


        </button>




        <div className="store-header-actions">

        </div>



      </header>





      {/* EL RESTO DEL HOME QUEDA IGUAL */}

      {/* HERO */}

      <section className="store-hero">

        <div className="hero-glow" />


        <div className="hero-content">


          <div className="hero-badge">
            ⚡ TOP UP GAMING
          </div>


          <h1 className="hero-title">

            TU MUNDO

            <br />

            <span>
              GAMING
            </span>


          </h1>



          <p className="hero-text">

            Hola{" "}

            <strong>
              @{username}
            </strong>.

            Compra tus recargas de forma
            rápida y sencilla.


          </p>



          <div className="hero-stats">


            <div>

              <strong>
                ⚡
              </strong>


              <span>
                RÁPIDO
              </span>


            </div>



            <div>

              <strong>
                🔒
              </strong>


              <span>
                SEGURO
              </span>


            </div>




            <div>

              <strong>
                🎮
              </strong>


              <span>
                GAMING
              </span>


            </div>



          </div>


        </div>


      </section>





      {/* JUEGOS, BENEFICIOS Y FOOTER */}

      {/* 
        AQUÍ SE MANTIENE EXACTAMENTE
        TODO EL CÓDIGO ORIGINAL QUE YA TIENES:
        
        - games-section
        - games-grid
        - tarjetas de juegos
        - benefits-section
        - store-footer
        
        No se modifica porque el cambio era
        únicamente quitar "próximamente" y conectar
        los botones del menú.
      */}



    </main>

  );

                }
