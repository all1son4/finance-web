"use client";

import { ChartColumnBig, PiggyBank, Receipt, Settings2, Target } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", icon: ChartColumnBig, label: "Главная" },
  { href: "/transactions", icon: Receipt, label: "Операции" },
  { href: "/budget", icon: PiggyBank, label: "Бюджет" },
  { href: "/savings-goals", icon: Target, label: "Цели" },
  { href: "/settings", icon: Settings2, label: "Настройки" },
];

export function AppNavigation() {
  const pathname = usePathname();

  return (
    <nav className="nav-strip" aria-label="Основная навигация">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;

        return (
          <Link
            className={`nav-chip${isActive ? " is-active" : ""}`}
            href={item.href}
            key={item.href}
          >
            <Icon size={18} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
