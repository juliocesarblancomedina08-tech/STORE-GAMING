"use client";

import { useRouter } from "next/navigation";

type StoreHeaderProps = {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onMenu?: () => void;
};

export default function StoreHeader({
  title = "🛒STORE GAMING🎮",
  subtitle,
  showBack = false,
  onMenu,
}: StoreHeaderProps) {
  const router = useRouter();

  function handleLeftButton() {
    if (showBack) {
      router.back();
      return;
    }

    onMenu?.();
  }

  return (
    <header className="store-header">
      <button
        type="button"
        className="store-header-menu"
        onClick={handleLeftButton}
        aria-label={showBack ? "Volver" : "Abrir menú"}
      >
        {showBack ? "←" : "☰"}
      </button>

      <div className="store-logo-text">
        <strong>{title}</strong>

        {subtitle && <b>{subtitle}</b>}
      </div>
    </header>
  );
}
