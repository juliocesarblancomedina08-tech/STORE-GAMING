"use client";

import { useState } from "react";

const games = [
  {
    id: "free-fire-latam",
    name: "FREE FIRE LATAM",
    game: "Free Fire",
    image:
      "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=85",
  },
  {
    id: "call-of-duty",
    name: "CALL OF DUTY",
    game: "Call of Duty Mobile",
    image:
      "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=85",
  },
  {
    id: "mobile-legends",
    name: "MOBILE LEGENDS",
    game: "Mobile Legends",
    image:
      "https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&w=1200&q=85",
  },
  {
    id: "blood-strike",
    name: "BLOOD STRIKE",
    game: "Blood Strike",
    image:
      "https://images.unsplash.com/photo-1547394765-185e1e68f34e?auto=format&fit=crop&w=1200&q=85",
  },
];

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <main className="min-h-screen bg-[#07080c] text-white">
      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#07080c]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-6">
          {/* LOGO */}
          <a
            href="/"
            className="flex items-center gap-2"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-xl">
              🛒
            </div>

            <div className="leading-none">
              <div className="text-base font-black tracking-tight sm:text-lg">
                STORE
              </div>

              <div className="text-xs font-black tracking-[0.18em] text-cyan-400 sm:text-sm">
                GAMING
              </div>
            </div>

            <span className="text-xl">🎮</span>
          </a>

          {/* DESKTOP NAV */}
          <nav className="hidden items-center gap-8 md:flex">
            <a
              href="/"
              className="text-sm font-bold text-cyan-400"
            >
              Inicio
            </a>

            <a
              href="#juegos"
              className="text-sm font-semibold text-white/60 transition hover:text-white"
            >
              Juegos
            </a>

            <a
              href="#ofertas"
              className="text-sm font-semibold text-white/60 transition hover:text-white"
            >
              Ofertas
            </a>

            <a
              href="#soporte"
              className="text-sm font-semibold text-white/60 transition hover:text-white"
            >
              Soporte
            </a>
          </nav>

          {/* RIGHT */}
          <div className="flex items-center gap-2">
            <button className="hidden rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-bold transition hover:bg-white/10 sm:block">
              Iniciar sesión
            </button>

            <button
              className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-lg transition hover:bg-white/10"
              aria-label="Carrito"
            >
              🛒

              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-cyan-400 px-1 text-[10px] font-black text-black">
                0
              </span>
            </button>

            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-lg md:hidden"
              aria-label="Menú"
            >
              ☰
            </button>
          </div>
        </div>

        {/* MOBILE MENU */}
        {menuOpen && (
          <div className="border-t border-white/10 bg-[#0b0d12] px-4 py-4 md:hidden">
            <div className="flex flex-col gap-1">
              <a
                href="/"
                onClick={() => setMenuOpen(false)}
                className="rounded-xl px-4 py-3 font-bold hover:bg-white/5"
              >
                🏠 Inicio
              </a>

              <a
                href="#juegos"
                onClick={() => setMenuOpen(false)}
                className="rounded-xl px-4 py-3 font-bold hover:bg-white/5"
              >
                🎮 Juegos
              </a>

              <a
                href="#ofertas"
                onClick={() => setMenuOpen(false)}
                className="rounded-xl px-4 py-3 font-bold hover:bg-white/5"
              >
                🔥 Ofertas
              </a>

              <a
                href="#soporte"
                onClick={() => setMenuOpen(false)}
                className="rounded-xl px-4 py-3 font-bold hover:bg-white/5"
              >
                📞 Soporte
              </a>

              <button className="mt-2 rounded-xl bg-cyan-400 px-4 py-3 font-black text-black">
                Iniciar sesión
              </button>
            </div>
          </div>
        )}
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(34,211,238,0.14),transparent_30%),radial-gradient(circle_at_10%_90%,rgba(99,102,241,0.10),transparent_30%)]" />

        <div className="relative mx-auto max-w-7xl px-5 py-16 sm:px-6 md:py-24">
          <div className="max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-xs font-black tracking-wide text-cyan-300">
              ⚡ RECARGAS GAMING INSTANTÁNEAS
            </div>

            <h1 className="text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl md:text-7xl">
              Recarga tus juegos.
              <span className="block text-cyan-400">
                Juega sin límites.
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-7 text-white/50 sm:text-lg">
              Compra diamantes, monedas y créditos para tus juegos favoritos
              de forma rápida y sencilla.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="#juegos"
                className="rounded-xl bg-cyan-400 px-7 py-4 text-center font-black text-black shadow-lg shadow-cyan-400/10 transition hover:scale-[1.02]"
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
          </div>
        </div>
      </section>

      {/* JUEGOS */}
      <section
        id="juegos"
        className="mx-auto max-w-7xl px-5 py-16 sm:px-6 md:py-20"
      >
        <div className="mb-9">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-400">
            🎮 CATÁLOGO
          </p>

          <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
            Elige tu juego
          </h2>

          <p className="mt-3 max-w-xl text-sm leading-6 text-white/45 sm:text-base">
            Selecciona un servicio para ver todas las recargas disponibles.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {games.map((game) => (
            <a
              key={game.id}
              href={`/games/${game.id}`}
              className="group overflow-hidden rounded-3xl border border-white/10 bg-[#101219] transition duration-300 hover:-translate-y-1 hover:border-cyan-400/40 hover:shadow-2xl hover:shadow-cyan-500/5"
            >
              {/* IMAGE */}
              <div className="relative aspect-[16/8] overflow-hidden">
                <img
                  src={game.image}
                  alt={game.name}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

                <div className="absolute bottom-4 left-5">
                  <span className="rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[10px] font-black uppercase tracking-wider backdrop-blur-md">
                    TOP UP
                  </span>
                </div>
              </div>

              {/* CARD TEXT */}
              <div className="flex items-center justify-between p-5">
                <div>
                  <h3 className="text-lg font-black">
                    {game.name}
                  </h3>

                  <p className="mt-1 text-xs text-white/40">
                    Recargas digitales
                  </p>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-lg transition group-hover:bg-cyan-400 group-hover:text-black">
                  →
                </div>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* VENTAJAS */}
      <section className="border-y border-white/10 bg-[#0b0d12]">
        <div className="mx-auto grid max-w-7xl gap-5 px-5 py-14 sm:px-6 md:grid-cols-3 md:py-16">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <div className="text-3xl">⚡</div>

            <h3 className="mt-4 font-black">
              Entrega rápida
            </h3>

            <p className="mt-2 text-sm leading-6 text-white/40">
              Tus recargas serán procesadas rápidamente.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <div className="text-3xl">🔒</div>

            <h3 className="mt-4 font-black">
              Compra segura
            </h3>

            <p className="mt-2 text-sm leading-6 text-white/40">
              Diseñamos el proceso para que comprar sea sencillo y seguro.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <div className="text-3xl">🎮</div>

            <h3 className="mt-4 font-black">
              Muchos juegos
            </h3>

            <p className="mt-2 text-sm leading-6 text-white/40">
              Añadiremos nuevos servicios y juegos progresivamente.
            </p>
          </div>
        </div>
      </section>

      {/* OFERTAS */}
      <section
        id="ofertas"
        className="mx-auto max-w-7xl px-5 py-16 sm:px-6 md:py-20"
      >
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-400/10 via-[#101219] to-[#101219] p-7 sm:p-10">
          <div className="max-w-2xl">
            <span className="text-xs font-black uppercase tracking-[0.2em] text-cyan-400">
              🔥 PRÓXIMAMENTE
            </span>

            <h2 className="mt-3 text-3xl font-black">
              Ofertas especiales
            </h2>

            <p className="mt-3 text-sm leading-6 text-white/45">
              Aquí aparecerán nuestras mejores promociones de recargas.
            </p>

            <a
              href="#juegos"
              className="mt-7 inline-block rounded-xl bg-white px-6 py-3 font-black text-black transition hover:bg-cyan-400"
            >
              Ver catálogo
            </a>
          </div>
        </div>
      </section>

      {/* SOPORTE */}
      <section
        id="soporte"
        className="border-t border-white/10 bg-[#0b0d12]"
      >
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-6">
          <div className="max-w-2xl">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-400">
              📞 SOPORTE
            </p>

            <h2 className="mt-3 text-3xl font-black">
              ¿Necesitas ayuda?
            </h2>

            <p className="mt-3 text-sm leading-6 text-white/45">
              Nuestro sistema de soporte estará disponible para ayudarte con
              tus pedidos y recargas.
            </p>

            <button className="mt-7 rounded-xl border border-white/10 bg-white/5 px-6 py-3 font-black transition hover:bg-white/10">
              Contactar soporte
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/10 bg-[#07080c]">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-8 text-sm sm:px-6 md:flex-row md:items-center md:justify-between">
          <div className="font-black text-white">
            🛒STORE GAMING🎮
          </div>

          <p className="text-white/30">
            © 2026 STORE GAMING
          </p>
        </div>
      </footer>
    </main>
  );
}
