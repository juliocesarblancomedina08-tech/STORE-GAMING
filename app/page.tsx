
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function WelcomePage() {
  const router = useRouter();

  useEffect(() => {
    const auth = localStorage.getItem("storeGamingAuth");

    if (!auth) {
      return;
    }

    try {
      const account = JSON.parse(auth);

      if (account?.username) {
        router.replace("/home");
      }
    } catch {
      localStorage.removeItem("storeGamingAuth");
    }
  }, [router]);

  return (
    <main className="premium-welcome">
      <div className="premium-background" />
      <div className="premium-overlay" />
      <div className="premium-grid" />
      <div className="premium-glow premium-glow-one" />
      <div className="premium-glow premium-glow-two" />

      {/* ENCABEZADO */}

      <header className="premium-header">
        <button
          type="button"
          className="premium-brand"
          onClick={() => router.push("/")}
          aria-label="STORE GAMING inicio"
        >
          <span className="brand-icon">🎮</span>

          <span className="brand-name">
            STORE <strong>GAMING</strong>
          </span>
        </button>

        <div className="header-status">
          <span className="status-dot" />
          PLATAFORMA GAMING
        </div>

        <button
          type="button"
          className="header-login"
          onClick={() => router.push("/login")}
        >
          INICIAR SESIÓN <span>↗</span>
        </button>
      </header>

      {/* CONTENIDO PRINCIPAL */}

      <section className="premium-hero">

        <div className="hero-content">

          <div className="hero-badge">
            <span>✦</span>
            TU UNIVERSO GAMING
            <span>✦</span>
          </div>

          <h1>
            LLEVA TU
            <br />
            EXPERIENCIA
            <br />
            <span>GAMING</span>
            <br />
            AL SIGUIENTE NIVEL
          </h1>

          <div className="hero-underline">
            <span />
          </div>

          <p className="hero-description">
            Descubre una nueva forma de conseguir tus
            <strong> recargas gaming </strong>
            y productos digitales favoritos.
            Todo en un solo lugar.
          </p>

          {/* BOTONES */}

          <div className="hero-buttons">

            <button
              type="button"
              className="hero-button hero-button-primary"
              onClick={() => router.push("/register")}
            >
              <span>CREAR MI CUENTA</span>
              <b>→</b>
            </button>

            <button
              type="button"
              className="hero-button hero-button-secondary"
              onClick={() => router.push("/login")}
            >
              <span>YA TENGO CUENTA</span>
              <b>↗</b>
            </button>

          </div>

          {/* CATEGORÍAS */}

          <div className="hero-categories">
            <div className="category-item">
              <span>⚡</span>
              <small>RECARGAS</small>
            </div>

            <i />

            <div className="category-item">
              <span>🎮</span>
              <small>GAMING</small>
            </div>

            <i />

            <div className="category-item">
              <span>💎</span>
              <small>DIGITAL</small>
            </div>
          </div>

        </div>

        {/* PANEL DECORATIVO */}

        <div className="hero-visual">

          <div className="visual-orbit orbit-one" />
          <div className="visual-orbit orbit-two" />

          <div className="visual-main-card">

            <div className="visual-card-top">
              <span className="visual-logo">SG</span>

              <div>
                <small>STORE GAMING</small>
                <strong>PREMIUM EXPERIENCE</strong>
              </div>

              <span className="visual-star">✦</span>
            </div>

            <div className="visual-center">
              <div className="visual-controller">🎮</div>
              <div className="visual-energy" />
            </div>

            <div className="visual-card-bottom">
              <div>
                <small>PREPÁRATE PARA</small>
                <strong>JUGAR SIN LÍMITES</strong>
              </div>

              <span>SG.</span>
            </div>

          </div>

          <div className="floating-tag tag-top">
            <span>⚡</span>
            GAMING STORE
          </div>

          <div className="floating-tag tag-bottom">
            <span>💎</span>
            PRODUCTOS DIGITALES
          </div>

        </div>

      </section>

      {/* VENTAJAS */}

      <section className="premium-benefits">

        <div className="benefit-item">
          <span className="benefit-icon">🎯</span>
          <div>
            <strong>TODO EN UN LUGAR</strong>
            <small>Tu espacio para productos gaming.</small>
          </div>
        </div>

        <div className="benefit-divider" />

        <div className="benefit-item">
          <span className="benefit-icon">🛡️</span>
          <div>
            <strong>CUENTA PERSONAL</strong>
            <small>Gestiona tu perfil y tu balance.</small>
          </div>
        </div>

        <div className="benefit-divider" />

        <div className="benefit-item">
          <span className="benefit-icon">💬</span>
          <div>
            <strong>SOPORTE</strong>
            <small>Estamos aquí para ayudarte.</small>
          </div>
        </div>

      </section>

      {/* PIE DE PÁGINA */}

      <footer className="premium-footer">
        <span>© {new Date().getFullYear()} STORE GAMING</span>

        <span className="footer-center">
          <i />
          TU UNIVERSO GAMING
          <i />
        </span>

        <span>POWERED BY SG</span>
      </footer>

      <style jsx global>{styles}</style>
    </main>
  );
}

const styles = `
.premium-welcome {
  min-height: 100vh;
  position: relative;
  isolation: isolate;
  overflow: hidden;
  background: #050807;
  color: #ffffff;
  font-family: Arial, Helvetica, sans-serif;
}

.premium-background {
  position: absolute;
  inset: 0;
  z-index: -4;
  background-image:
    linear-gradient(90deg, rgba(3,8,6,.97) 0%, rgba(3,8,6,.88) 45%, rgba(3,8,6,.55) 100%),
    linear-gradient(180deg, rgba(3,8,6,.3), #050807 100%),
    url("/images/battle-royale-bg.jpg");
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  transform: scale(1.02);
}

.premium-overlay {
  position: absolute;
  inset: 0;
  z-index: -3;
  background:
    radial-gradient(ellipse at 75% 40%, rgba(38,161,123,.17), transparent 40%),
    linear-gradient(180deg, transparent 65%, #050807 100%);
  pointer-events: none;
}

.premium-grid {
  position: absolute;
  inset: 0;
  z-index: -2;
  opacity: .13;
  pointer-events: none;
  background-image:
    linear-gradient(rgba(65,200,150,.12) 1px, transparent 1px),
    linear-gradient(90deg, rgba(65,200,150,.12) 1px, transparent 1px);
  background-size: 55px 55px;
  mask-image: linear-gradient(to bottom, black, transparent 85%);
}

.premium-glow {
  position: absolute;
  z-index: -1;
  border-radius: 50%;
  pointer-events: none;
  filter: blur(90px);
}

.premium-glow-one {
  width: 350px;
  height: 350px;
  background: rgba(38,161,123,.13);
  top: 15%;
  right: 5%;
}

.premium-glow-two {
  width: 250px;
  height: 250px;
  background: rgba(38,161,123,.08);
  bottom: 0;
  left: -100px;
}

/* HEADER */

.premium-header {
  width: 100%;
  max-width: 1250px;
  margin: auto;
  padding: 25px 35px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  z-index: 5;
  border-bottom: 1px solid rgba(255,255,255,.07);
}

.premium-brand {
  display: flex;
  align-items: center;
  gap: 11px;
  background: none;
  border: none;
  color: white;
  cursor: pointer;
}

.brand-icon {
  width: 43px;
  height: 43px;
  border-radius: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 23px;
  background: linear-gradient(145deg,#1a4935,#0b1b12);
  border: 1px solid rgba(54,201,151,.4);
  box-shadow: 0 0 20px rgba(54,201,151,.12);
}

.brand-name {
  font-size: 16px;
  font-weight: 950;
  letter-spacing: 1px;
}

.brand-name strong {
  color: #36c997;
}

.header-status {
  display: flex;
  align-items: center;
  gap: 9px;
  color: #a1b4a9;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 2px;
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #36c997;
  box-shadow: 0 0 12px #36c997;
}

.header-login {
  padding: 12px 18px;
  border: 1px solid rgba(54,201,151,.35);
  border-radius: 10px;
  background: rgba(13,35,24,.7);
  color: white;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: .8px;
  cursor: pointer;
  transition: .2s ease;
}

.header-login:hover {
  background: rgba(38,161,123,.2);
  border-color: #36c997;
}

.header-login span {
  color: #36c997;
  margin-left: 8px;
}

/* HERO */

.premium-hero {
  width: 100%;
  max-width: 1250px;
  min-height: 590px;
  margin: auto;
  padding: 70px 35px 55px;
  display: grid;
  grid-template-columns: 1.1fr .9fr;
  align-items: center;
  gap: 30px;
  position: relative;
  z-index: 1;
}

.hero-content {
  max-width: 590px;
  animation: heroAppear .8s ease both;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 9px 14px;
  border-radius: 30px;
  border: 1px solid rgba(54,201,151,.3);
  background: rgba(15,44,29,.65);
  color: #9de4c7;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 2px;
}

.hero-badge span {
  color: #36c997;
}

.hero-content h1 {
  margin: 26px 0 0;
  font-size: clamp(38px, 6vw, 67px);
  line-height: .99;
  font-weight: 1000;
  letter-spacing: -2.5px;
  text-shadow: 0 5px 30px rgba(0,0,0,.6);
}

.hero-content h1 span {
  color: #36c997;
  text-shadow: 0 0 28px rgba(54,201,151,.2);
}

.hero-underline {
  width: 130px;
  height: 4px;
  margin-top: 23px;
  background: rgba(54,201,151,.15);
  border-radius: 10px;
}

.hero-underline span {
  display: block;
  width: 65%;
  height: 100%;
  border-radius: 10px;
  background: #36c997;
  box-shadow: 0 0 15px #36c997;
}

.hero-description {
  max-width: 450px;
  margin: 23px 0 0;
  color: #b0beb5;
  font-size: 14px;
  line-height: 1.9;
}

.hero-description strong {
  color: #ffffff;
}

.hero-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 13px;
  margin-top: 32px;
}

.hero-button {
  min-height: 54px;
  min-width: 190px;
  padding: 0 19px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 22px;
  font-size: 10px;
  font-weight: 950;
  letter-spacing: .7px;
  cursor: pointer;
  transition: .2s ease;
}

.hero-button:hover {
  transform: translateY(-3px);
}

.hero-button-primary {
  color: #04120b;
  background: linear-gradient(135deg,#55e2ae,#20ad7c);
  border: 1px solid #55e2ae;
  box-shadow: 0 9px 30px rgba(38,201,151,.18);
}

.hero-button-primary:hover {
  box-shadow: 0 12px 35px rgba(38,201,151,.3);
}

.hero-button-primary b {
  font-size: 19px;
}

.hero-button-secondary {
  color: white;
  background: rgba(13,22,17,.7);
  border: 1px solid rgba(255,255,255,.17);
}

.hero-button-secondary:hover {
  border-color: #36c997;
  background: rgba(38,161,123,.12);
}

.hero-button-secondary b {
  color: #36c997;
  font-size: 17px;
}

/* CATEGORÍAS */

.hero-categories {
  display: flex;
  align-items: center;
  gap: 17px;
  margin-top: 42px;
}

.category-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.category-item span {
  font-size: 16px;
}

.category-item small {
  color: #a5b5aa;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 1px;
}

.hero-categories > i {
  height: 18px;
  width: 1px;
  background: rgba(255,255,255,.2);
}

/* PANEL VISUAL */

.hero-visual {
  min-height: 390px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: visualAppear 1s ease both;
}

.visual-main-card {
  width: min(100%, 360px);
  height: 340px;
  padding: 23px;
  position: relative;
  z-index: 2;
  overflow: hidden;
  border-radius: 25px;
  border: 1px solid rgba(95,224,174,.4);
  background:
    radial-gradient(circle at 50% 45%, rgba(38,161,123,.25), transparent 55%),
    linear-gradient(145deg,rgba(18,48,32,.94),rgba(5,14,9,.96));
  box-shadow:
    0 25px 80px rgba(0,0,0,.55),
    0 0 45px rgba(38,201,151,.12),
    inset 0 0 35px rgba(54,201,151,.05);
  transform: rotate(2deg);
  transition: .35s ease;
}

.visual-main-card:hover {
  transform: rotate(0deg) translateY(-5px);
}

.visual-card-top {
  display: flex;
  align-items: center;
  gap: 11px;
  position: relative;
  z-index: 2;
}

.visual-logo {
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: #1d704f;
  color: white;
  font-size: 15px;
  font-weight: 1000;
  box-shadow: 0 0 20px rgba(54,201,151,.25);
}

.visual-card-top div {
  flex: 1;
}

.visual-card-top small,
.visual-card-top strong {
  display: block;
}

.visual-card-top small {
  color: #fff;
  font-size: 11px;
  font-weight: 950;
  letter-spacing: 1px;
}

.visual-card-top strong {
  color: #65cfa5;
  font-size: 8px;
  margin-top: 5px;
  letter-spacing: 1.5px;
}

.visual-star {
  color: #56dba8;
  font-size: 23px;
}

.visual-center {
  position: absolute;
  inset: 70px 0 65px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.visual-controller {
  position: relative;
  z-index: 2;
  font-size: 112px;
  filter: drop-shadow(0 10px 25px rgba(0,0,0,.55));
  animation: controllerFloat 4s ease-in-out infinite;
}

.visual-energy {
  position: absolute;
  width: 200px;
  height: 200px;
  border: 1px solid rgba(54,201,151,.22);
  border-radius: 50%;
  box-shadow: 0 0 50px rgba(54,201,151,.12);
}

.visual-card-bottom {
  position: absolute;
  bottom: 23px;
  left: 23px;
  right: 23px;
  padding-top: 15px;
  border-top: 1px solid rgba(255,255,255,.12);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.visual-card-bottom small,
.visual-card-bottom strong {
  display: block;
}

.visual-card-bottom small {
  color: #9eafa4;
  font-size: 8px;
  letter-spacing: 1.5px;
}

.visual-card-bottom strong {
  color: #58d8a6;
  margin-top: 5px;
  font-size: 12px;
  letter-spacing: 1px;
}

.visual-card-bottom > span {
  color: #36c997;
  font-size: 25px;
  font-weight: 1000;
}

.visual-orbit {
  position: absolute;
  width: 390px;
  height: 390px;
  border: 1px solid rgba(54,201,151,.12);
  border-radius: 50%;
}

.orbit-two {
  width: 460px;
  height: 460px;
  border-style: dashed;
  border-color: rgba(54,201,151,.08);
}

.floating-tag {
  position: absolute;
  z-index: 3;
  padding: 12px 15px;
  display: flex;
  align-items: center;
  gap: 9px;
  border: 1px solid rgba(54,201,151,.3);
  border-radius: 11px;
  background: rgba(8,21,14,.94);
  color: white;
  font-size: 8px;
  font-weight: 950;
  letter-spacing: 1px;
  box-shadow: 0 10px 30px rgba(0,0,0,.35);
}

.floating-tag span {
  font-size: 16px;
}

.tag-top {
  top: 28px;
  right: -8px;
}

.tag-bottom {
  bottom: 22px;
  left: -20px;
}

/* VENTAJAS */

.premium-benefits {
  max-width: 1180px;
  margin: 0 auto;
  padding: 24px 35px;
  display: grid;
  grid-template-columns: 1fr auto 1fr auto 1fr;
  align-items: center;
  gap: 25px;
  border-top: 1px solid rgba(255,255,255,.08);
  border-bottom: 1px solid rgba(255,255,255,.08);
  background: rgba(5,14,9,.5);
  position: relative;
  z-index: 2;
}

.benefit-item {
  display: flex;
  align-items: center;
  gap: 13px;
}

.benefit-icon {
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 12px;
  background: rgba(38,161,123,.12);
  border: 1px solid rgba(54,201,151,.18);
  font-size: 19px;
}

.benefit-item strong,
.benefit-item small {
  display: block;
}

.benefit-item strong {
  font-size: 10px;
  letter-spacing: .7px;
}

.benefit-item small {
  color: #899a90;
  font-size: 9px;
  margin-top: 6px;
}

.benefit-divider {
  height: 35px;
  width: 1px;
  background: rgba(255,255,255,.1);
}

/* FOOTER */

.premium-footer {
  max-width: 1180px;
  margin: auto;
  padding: 22px 35px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #73847a;
  font-size: 8px;
  font-weight: 900;
  letter-spacing: 1.3px;
  position: relative;
  z-index: 2;
}

.footer-center {
  display: flex;
  align-items: center;
  gap: 9px;
  color: #8ca398;
}

.footer-center i {
  width: 16px;
  height: 1px;
  background: #36c997;
}

/* ANIMACIONES */

@keyframes heroAppear {
  from {
    opacity: 0;
    transform: translateY(22px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes visualAppear {
  from {
    opacity: 0;
    transform: translateX(25px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes controllerFloat {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-12px);
  }
}

/* TABLETS */

@media (max-width: 900px) {
  .premium-hero {
    grid-template-columns: 1fr .8fr;
    padding-top: 55px;
    gap: 10px;
  }

  .hero-content h1 {
    font-size: clamp(37px, 6vw, 53px);
  }

  .visual-main-card {
    height: 300px;
  }

  .visual-controller {
    font-size: 90px;
  }

  .premium-benefits {
    gap: 13px;
  }
}

/* MÓVILES */

@media (max-width: 650px) {
  .premium-header {
    padding: 17px 16px;
  }

  .brand-icon {
    width: 39px;
    height: 39px;
  }

  .brand-name {
    font-size: 13px;
  }

  .header-status {
    display: none;
  }

  .header-login {
    padding: 11px 12px;
    font-size: 9px;
  }

  .premium-hero {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    padding: 55px 22px 35px;
    gap: 20px;
  }

  .hero-content {
    width: 100%;
  }

  .hero-content h1 {
    font-size: clamp(38px, 10vw, 54px);
    letter-spacing: -1.8px;
    margin-top: 22px;
  }

  .hero-description {
    font-size: 13px;
    line-height: 1.8;
  }

  .hero-buttons {
    display: grid;
    grid-template-columns: 1fr;
    gap: 11px;
  }

  .hero-button {
    width: 100%;
    min-height: 53px;
  }

  .hero-categories {
    justify-content: space-between;
    gap: 8px;
    margin-top: 30px;
  }

  .category-item {
    gap: 5px;
  }

  .category-item small {
    font-size: 8px;
  }

  .hero-visual {
    min-height: 340px;
    margin-top: 15px;
  }

  .visual-main-card {
    width: min(82%, 340px);
    height: 285px;
    padding: 18px;
  }

  .visual-card-bottom {
    left: 18px;
    right: 18px;
    bottom: 18px;
  }

  .visual-controller {
    font-size: 88px;
  }

  .visual-orbit {
    width: 300px;
    height: 300px;
  }

  .orbit-two {
    width: 350px;
    height: 350px;
  }

  .tag-top {
    top: 12px;
    right: -2px;
  }

  .tag-bottom {
    bottom: 5px;
    left: -2px;
  }

  .premium-benefits {
    grid-template-columns: 1fr;
    gap: 17px;
    padding: 23px 22px;
  }

  .benefit-divider {
    width: 100%;
    height: 1px;
  }

  .premium-footer {
    padding: 20px 16px;
    gap: 12px;
    font-size: 7px;
  }

  .footer-center {
    display: none;
  }
}

@media (max-width: 360px) {
  .premium-header {
    padding-left: 12px;
    padding-right: 12px;
  }

  .brand-name {
    font-size: 11px;
  }

  .header-login {
    font-size: 8px;
  }

  .premium-hero {
    padding-left: 16px;
    padding-right: 16px;
  }

  .hero-content h1 {
    font-size: 36px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero-content,
  .hero-visual,
  .visual-controller {
    animation: none;
  }

  .visual-main-card,
  .hero-button {
    transition: none;
  }
}
`;
