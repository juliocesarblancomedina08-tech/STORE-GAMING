"use client";

import { useState } from "react";

const games = [
  {
    name: "Free Fire",
    icon: "🔥",
    description: "Diamantes para Free Fire",
  },
  {
    name: "Call of Duty Mobile",
    icon: "🎯",
    description: "CP para Call of Duty Mobile",
  },
  {
    name: "Mobile Legends",
    icon: "⚔️",
    description: "Diamantes para Mobile Legends",
  },
  {
    name: "Blood Strike",
    icon: "💥",
    description: "Gold para Blood Strike",
  },
];

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <main className="min-h-screen bg-[#08090d] text-white">
      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#08090d]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          {/* LOGO */}
          <button className="flex items-center gap-2">
            <span className="text-2xl">🛒</span>

            <span className="text-lg font-black tracking-tight">
              STORE <span className="text-cyan-400">GAMING</span>
            </span>

            <span className="text-xl">🎮</span>
          </button>

          {/* DESKTOP MENU */}
          <nav className="hidden items-center gap-7 md:flex">
            <a
              href="#inicio"
              className="text-sm font-semibold text-white transition hover:text-cyan-400"
            >
              Inicio
            </a>

            <a
              href="#juegos"
              className="text-sm font-semibold text-white/70 transition hover:text-cyan-400"
            >
              Juegos
            </a>

            <a
              href="#ofertas"
              className="text-sm font-semibold text-white/70 transition hover:text-cyan-400"
            >
              Ofertas
            </a>

            <a
              href="#soporte"
              className="text-sm font-semibold text-white/70 transition hover:text-cyan-400"
            >
              Soporte
            </a>
          </nav>

          {/* RIGHT */}
          <div className="flex items-center gap-2">
            <button className="hidden rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold transition hover:bg-white/10 sm:block">
              Iniciar sesión
            </button>

            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-xl"
            >
              🛒
            </button>

            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 md:hidden"
            >
              ☰
            </button>
          </div>
        </div>

        {/* MOBILE MENU */}
        {menuOpen && (
          <div className="border-t border-white/10 bg-[#0c0e13] px-4 py-4 md:hidden">
            <div className="flex flex-col gap-2">
              <a
                href="#inicio"
                onClick={() => setMenuOpen(false)}
                className="rounded-xl px-4 py-3 font-semibold hover:bg-white/5"
              >
                🏠 Inicio
              </a>

              <a
                href="#juegos"
                onClick={() => setMenuOpen(false)}
                className="rounded-xl px-4 py-3 font-semibold hover:bg-white/5"
              >
                🎮 Juegos
              </a>

              <a
                href="#ofertas"
                onClick={() => setMenuOpen(false)}
                className="rounded-xl px-4 py-3 font-semibold hover:bg-white/5"
              >
                🔥 Ofertas
              </a>

              <a
                href="#soporte"
                onClick={() => setMenuOpen(false)}
                className="rounded-xl px-4 py-3 font-semibold hover:bg-white/5"
              >
                📞 Soporte
              </a>

              <button className="mt-2 rounded-xl bg-cyan-500 px-4 py-3 font-black text-black">
                Iniciar sesión
              </button>
            </div>
          </div>
        )}
      </header>

      {/* HERO */}
      <section
        id="inicio"
        className="relative overflow-hidden border-b border-white/10"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(0,220,255,0.16),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(123,63,255,0.12),_transparent_35%)]" />

        <div className="relative mx-auto grid min-h-[540px] max-w-7xl items-center gap-10 px-5 py-16 md:grid-cols-2 md:px-8">
          {/* TEXT */}
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-xs font-bold text-cyan-300">
              ⚡ RECARGAS GAMING RÁPIDAS
            </div>

            <h1 className="max-w-2xl text-4xl font-black leading-tight sm:text-5xl md:text-6xl">
              Tu tienda para
              <span className="block text-cyan-400">
                comprar dentro de tus juegos.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-7 text-white/60 sm:text-lg">
              Compra diamantes, CP, monedas y otros productos digitales para
              tus juegos favoritos de forma sencilla.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="#juegos"
                className="rounded-xl bg-cyan-400 px-7 py-4 text-center font-black text-black shadow-lg shadow-cyan-400/20 transition hover:scale-[1.02]"
              >
                🎮 Ver juegos
              </a>

              <a
                href="#ofertas"
                className="rounded-xl border border-white/10 bg-white/5 px-7 py-4 text-center font-black transition hover:bg-white/10"
              >
                🔥 Ver ofertas
              </a>
            </div>

            {/* STATS */}
            <div className="mt-10 flex flex-wrap gap-6">
              <div>
                <p className="text-2xl font-black">24/7</p>
                <p className="text-xs text-white/40">Servicio</p>
              </div>

              <div>
                <p className="text-2xl font-black">⚡</p>
                <p className="text-xs text-white/40">Entrega rápida</p>
              </div>

              <div>
                <p className="text-2xl font-black">🔒</p>
                <p className="text-xs text-white/40">Compra segura</p>
              </div>
            </div>
          </div>

          {/* HERO CARD */}
          <div className="relative mx-auto w-full max-w-md">
            <div className="absolute -inset-10 rounded-full bg-cyan-400/10 blur-3xl" />

            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#151923] to-[#0c0e13] p-6 shadow-2xl">
              <div className="mb-5 flex items-center justify-between">
                <span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-bold text-red-400">
                  🔥 DESTACADO
                </span>

                <span className="text-xs text-white/40">
                  STORE GAMING
                </span>
              </div>

              <div className="flex min-h-[260px] items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500/20 via-red-500/10 to-transparent">
                <div className="text-center">
                  <div className="text-8xl drop-shadow-2xl">🔥</div>

                  <h2 className="mt-5 text-3xl font-black">
                    FREE FIRE
                  </h2>

                  <p className="mt-2 text-sm text-white/50">
                    Diamantes disponibles
                  </p>
                </div>
              </div>

              <button
                onClick={() =>
                  document
                    .getElementById("juegos")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="mt-5 w-full rounded-xl bg-white py-3 font-black text-black transition hover:bg-cyan-400"
              >
                Ver ofertas →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* GAMES */}
      <section id="juegos" className="mx-auto max-w-7xl px-5 py-20 md:px-8">
        <div className="mb-10">
          <p className="mb-2 text-sm font-bold uppercase tracking-widest text-cyan-400">
            🎮 Categorías
          </p>

          <h2 className="text-3xl font-black sm:text-4xl">
            Elige tu juego
          </h2>

          <p className="mt-3 max-w-xl text-white/50">
            Selecciona un juego para ver todas las recargas disponibles.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {games.map((game) => (
            <button
              key={game.name}
              className="group overflow-hidden rounded-2xl border border-white/10 bg-[#101219] text-left transition duration-300 hover:-translate-y-1 hover:border-cyan-400/40 hover:bg-[#141821]"
            >
              <div className="flex h-40 items-center justify-center bg-gradient-to-br from-white/5 to-transparent">
                <span className="text-7xl transition duration-300 group-hover:scale-110">
                  {game.icon}
                </span>
              </div>

              <div className="p-5">
                <h3 className="text-lg font-black">
                  {game.name}
                </h3>

                <p className="mt-2 text-sm text-white/45">
                  {game.description}
                </p>

                <div className="mt-5 flex items-center justify-between">
                  <span className="text-sm font-bold text-cyan-400">
                    Ver productos
                  </span>

                  <span className="text-white/40 transition group-hover:translate-x-1">
                    →
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* OFFERS */}
      <section
        id="ofertas"
        className="border-y border-white/10 bg-[#0c0e13]"
      >
        <div className="mx-auto max-w-7xl px-5 py-20 md:px-8">
          <div className="mb-10">
            <p className="mb-2 text-sm font-bold uppercase tracking-widest text-orange-400">
              🔥 Promociones
            </p>

            <h2 className="text-3xl font-black sm:text-4xl">
              Ofertas destacadas
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-[#11141b] p-6">
              <div className="text-4xl">💎</div>

              <h3 className="mt-5 text-xl font-black">
                Diamantes Free Fire
              </h3>

              <p className="mt-2 text-sm text-white/50">
                Recargas disponibles próximamente.
              </p>

              <button className="mt-6 w-full rounded-xl bg-white/5 py-3 font-bold transition hover:bg-cyan-400 hover:text-black">
                Ver ofertas
              </button>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#11141b] p-6">
              <div className="text-4xl">🎯</div>

              <h3 className="mt-5 text-xl font-black">
                Call of Duty CP
              </h3>

              <p className="mt-2 text-sm text-white/50">
                Recargas disponibles próximamente.
              </p>

              <button className="mt-6 w-full rounded-xl bg-white/5 py-3 font-bold transition hover:bg-cyan-400 hover:text-black">
                Ver ofertas
              </button>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#11141b] p-6">
              <div className="text-4xl">⚔️</div>

              <h3 className="mt-5 text-xl font-black">
                Mobile Legends
              </h3>

              <p className="mt-2 text-sm text-white/50">
                Recargas disponibles próximamente.
              </p>

              <button className="mt-6 w-full rounded-xl bg-white/5 py-3 font-bold transition hover:bg-cyan-400 hover:text-black">
                Ver ofertas
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* SUPPORT */}
      <section id="soporte" className="mx-auto max-w-7xl px-5 py-20 md:px-8">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-r from-cyan-400/10 to-transparent p-8 md:p-12">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-widest text-cyan-400">
              📞 Soporte
            </p>

            <h2 className="mt-3 text-3xl font-black">
              ¿Necesitas ayuda con tu compra?
            </h2>

            <p className="mt-4 leading-7 text-white/50">
              Nuestro sistema de soporte estará disponible para ayudarte con
              pedidos, pagos y recargas.
            </p>

            <button className="mt-7 rounded-xl bg-cyan-400 px-6 py-3 font-black text-black">
              Contactar soporte
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/10 bg-[#06070a]">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 text-sm text-white/40 sm:flex-row sm:items-center sm:justify-between md:px-8">
          <div className="font-bold text-white/70">
            🛒STORE GAMING🎮
          </div>

          <div>
            © 2026 STORE GAMING. Todos los derechos reservados.
          </div>
        </div>
      </footer>
    </main>
  );
        }
