
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function WelcomePage() {
  const router = useRouter();

  useEffect(() => {
    const auth = localStorage.getItem("storeGamingAuth");

    if (!auth) return;

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

      <header className="premium-header">
        <button
          type="button"
          className="premium-brand"
          onClick={() => router.push("/")}
          aria-label="STORE GAMING inicio"
        >
          <span className="brand-icon">SG</span>
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

      <section className="premium-hero">
        <div className="hero-content">
          <div className="hero-badge">
            <span>✦</span>
            TU UNIVERSO GAMING
            <span>✦</span>
          </div>

          <p className="hero-eyebrow">BIENVENIDO A STORE GAMING</p>

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
              <div className="visual-energy energy-two" />
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
  background: #080607;
  color: #ffffff;
  font-family: Arial, Helvetica, sans-serif;
}

.premium-background {
  position: absolute;
  inset: 0;
  z-index: -4;
  background-image:
    linear-gradient(90deg, rgba(8,4,6,.97) 0%, rgba(8,4,6,.88) 45%, rgba(8,4,6,.58) 100%),
    linear-gradient(180deg, rgba(8,4,6,.3), #080607 100%),
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
    radial-gradient(ellipse at 75% 40%, rgba(220,25,48,.18), transparent 42%),
    linear-gradient(180deg, transparent 65%, #080607 100%);
  pointer-events: none;
}

.premium-grid {
  position: absolute;
  inset: 0;
  z-index: -2;
  opacity: .13;
  pointer-events: none;
  background-image:
    linear-gradient(rgba(220,35,55,.13) 1px, transparent 1px),
    linear-gradient(90deg, rgba(220,35,55,.13) 1px, transparent 1px);
  background-size: 55px 55px;
  mask-image: linear-gradient(to bottom, black, transparent 85%);
}

.premium-glow {
  position: absolute;
  z-index: -1;
  border-radius: 50%;
  pointer-events: none;
  filter: blur(100px);
}

.premium-glow-one {
  width: 390px;
  height: 390px;
  background: rgba(210,20,45,.19);
  top: 12%;
  right: 4%;
}

.premium-glow-two {
  width: 280px;
  height: 280px;
  background: rgba(155,10,30,.12);
  bottom: 0;
  left: -100px;
}

/* HEADER */

.premium-header {
  width: 100%;
  max-width: 1250px;
  margin: auto;
  padding: 24px 35px;
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
  width: 45px;
  height: 45px;
  border-radius: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  font-weight: 1000;
  letter-spacing: -1px;
  background: linear-gradient(145deg,#f02b45,#790b20);
  border: 1px solid rgba(255,80,100,.6);
  box-shadow: 0 0 25px rgba(235,30,55,.28);
}

.brand-name {
  font-size: 16px;
  font-weight: 950;
  letter-spacing: 1px;
}

.brand-name strong {
  color: #ff334d;
}

.header-status {
  display: flex;
  align-items: center;
  gap: 9px;
  color: #b7a6aa;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 2px;
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #ff344e;
  box-shadow: 0 0 12px #ff344e;
}

.header-login {
  padding: 12px 18px;
  border: 1px solid rgba(255,60,85,.4);
  border-radius: 10px;
  background: rgba(75,10,23,.45);
  color: white;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: .8px;
  cursor: pointer;
  transition: .25s ease;
}

.header-login:hover {
  background: rgba(180,20,45,.3);
  border-color: #ff344e;
  box-shadow: 0 0 20px rgba(220,25,48,.16);
}

.header-login span {
  color: #ff4058;
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
  border: 1px solid rgba(255,55,80,.35);
  background: rgba(90,12,27,.35);
  color: #ffb0bb;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 2px;
  box-shadow: inset 0 0 15px rgba(220,25,48,.05);
}

.hero-badge span {
  color: #ff344e;
}

.hero-eyebrow {
  margin: 24px 0 0;
  color: #c7aeb2;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 3px;
}

.hero-content h1 {
  margin: 12px 0 0;
  font-size: clamp(38px, 6vw, 67px);
  line-height: .99;
  font-weight: 1000;
  letter-spacing: -2.5px;
  text-shadow: 0 5px 30px rgba(0,0,0,.6);
}

.hero-content h1 span {
  color: #ff334d;
  text-shadow: 0 0 30px rgba(255,40,65,.3);
}

.hero-underline {
  width: 140px;
  height: 4px;
  margin-top: 23px;
  background: rgba(255,55,80,.15);
  border-radius: 10px;
}

.hero-underline span {
  display: block;
  width: 68%;
  height: 100%;
  border-radius: 10px;
  background: linear-gradient(90deg,#ff334d,#a50d28);
  box-shadow: 0 0 15px rgba(255,40,65,.8);
}

.hero-description {
  max-width: 450px;
  margin: 23px 0 0;
  color: #b9adb1;
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
  transition: .25s ease;
}

.hero-button:hover {
  transform: translateY(-4px);
}

.hero-button-primary {
  color: #fff;
  background: linear-gradient(135deg,#ff4059,#b80e2c);
  border: 1px solid #ff5268;
  box-shadow: 0 9px 30px rgba(210,20,45,.23);
}

.hero-button-primary:hover {
  box-shadow: 0 12px 35px rgba(240,35,60,.4);
  background: linear-gradient(135deg,#ff526a,#d01637);
}

.hero-button-primary b {
  font-size: 19px;
}

.hero-button-secondary {
  color: white;
  background: rgba(25,12,16,.8);
  border: 1px solid rgba(255,255,255,.17);
}

.hero-button-secondary:hover {
  border-color: #ff344e;
  background: rgba(140,15,35,.18);
}

.hero-button-secondary b {
  color: #ff4058;
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
  color: #b9a8ad;
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
  border: 1px solid rgba(255,65,90,.48);
  background:
    radial-gradient(circle at 50% 45%, rgba(190,20,45,.25), transparent 58%),
    linear-gradient(145deg,rgba(48,12,22,.96),rgba(12,7,11,.98));
  box-shadow:
    0 25px 80px rgba(0,0,0,.6),
    0 0 45px rgba(220,25,48,.15),
    inset 0 0 35px rgba(255,45,65,.06);
  transform: rotate(2deg);
  transition: .35s ease;
}

.visual-main-card:hover {
  transform: rotate(0deg) translateY(-6px);
  box-shadow:
    0 30px 90px rgba(0,0,0,.65),
    0 0 55px rgba(220,25,48,.23);
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
  background: linear-gradient(145deg,#f03b55,#850d27);
  border: 1px solid rgba(255,100,120,.35);
  color: white;
  font-size: 15px;
  font-weight: 1000;
  box-shadow: 0 0 20px rgba(255,40,65,.25);
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
  color: #ff667a;
  font-size: 8px;
  margin-top: 5px;
  letter-spacing: 1.5px;
}

.visual-star {
  color: #ff465f;
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
  filter: drop-shadow(0 10px 25px rgba(0,0,0,.65));
  animation: controllerFloat 4s ease-in-out infinite;
}

.visual-energy {
  position: absolute;
  width: 200px;
  height: 200px;
  border: 1px solid rgba(255,65,90,.3);
  border-radius: 50%;
  box-shadow: 0 0 50px rgba(220,25,48,.15);
  animation: energyPulse 4s ease-in-out infinite;
}

.energy-two {
  width: 150px;
  height: 150px;
  border-style: dashed;
  animation-direction: reverse;
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
  color: #b4a0a5;
  font-size: 8px;
  letter-spacing: 1.5px;
}

.visual-card-bottom strong {
  color: #ff536b;
  margin-top: 5px;
  font-size: 12px;
  letter-spacing: 1px;
}

.visual-card-bottom > span {
  color: #ff334d;
  font-size: 25px;
  font-weight: 1000;
}

.visual-orbit {
  position: absolute;
  width: 390px;
  height: 390px;
  border: 1px solid rgba(255,65,90,.17);
  border-radius: 50%;
}

.orbit-two {
  width: 460px;
  height: 460px;
  border-style: dashed;
  border-color: rgba(255,65,90,.1);
  animation: orbitRotate 45s linear infinite;
}

.floating-tag {
  position: absolute;
  z-index: 3;
  padding: 12px 15px;
  display: flex;
  align-items: center;
  gap: 9px;
  border: 1px solid rgba(255,65,90,.4);
  border-radius: 11px;
  background: rgba(25,8,13,.96);
  color: white;
  font-size: 8px;
  font-weight: 950;
  letter-spacing: 1px;
  box-shadow: 0 10px 30px rgba(0,0,0,.45), 0 0 20px rgba(200,20,45,.08);
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
  background: rgba(13,6,9,.72);
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
  background: rgba(190,20,45,.14);
  border: 1px solid rgba(255,65,90,.23);
  box-shadow: inset 0 0 15px rgba(220,25,48,.06);
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
  color: #a8979d;
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
  color: #817078;
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
  color: #b39ca2;
}

.footer-center i {
  width: 16px;
  height: 1px;
  background: #ff344e;
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
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-12px); }
}

@keyframes energyPulse {
  0%, 100% { transform: scale(.94); opacity: .5; }
  50% { transform: scale(1.08); opacity: 1; }
}

@keyframes orbitRotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
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
    margin-top: 12px;
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
  .visual-controller,
  .orbit-two,
  .visual-energy {
    animation: none;
  }

  .visual-main-card,
  .hero-button {
    transition: none;
  }
}
`;
