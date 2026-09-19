"use client";

import { usePathname, useRouter } from "next/navigation";

type BottomMenuItem = {
  label: string;
  icon: string;
  path: string;
};

const items: BottomMenuItem[] = [
  {
    label: "Inicio",
    icon: "🏠",
    path: "/home",
  },
  {
    label: "Órdenes",
    icon: "📦",
    path: "/orders",
  },
  {
    label: "Billetera",
    icon: "💰",
    path: "/wallet",
  },
  {
    label: "Perfil",
    icon: "👤",
    path: "/profile",
  },
];

export default function BottomMenu() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <nav className="store-bottom-menu">
      {items.map((item) => {
        const active =
          pathname === item.path ||
          pathname.startsWith(`${item.path}/`);

        return (
          <button
            key={item.path}
            type="button"
            className={`store-bottom-item ${
              active ? "active" : ""
            }`}
            onClick={() => router.push(item.path)}
          >
            <span className="store-bottom-icon">
              {item.icon}
            </span>

            <span className="store-bottom-label">
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
