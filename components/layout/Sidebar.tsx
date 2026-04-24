"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  FilePlus,
  Beef,
  Store,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/asignaciones", label: "Dashboard", icon: LayoutDashboard },
  { href: "/asignaciones/crear-lead", label: "Crear Lead", icon: FilePlus },
  { href: "/asignaciones/gns-ofertantes", label: "GNS Ofertantes", icon: Beef },
  { href: "/asignaciones/gns-ofrecedoras", label: "GNS Ofrecedoras", icon: Store },
];


export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "relative hidden md:flex flex-col h-screen border-r border-border bg-card transition-all duration-300 ease-in-out shrink-0",
        collapsed ? "w-16" : "w-56"
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex items-center gap-3 px-4 py-5 border-b border-border",
          collapsed && "justify-center px-2"
        )}
      >
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/20 shrink-0">
          <TrendingUp className="w-4 h-4 text-primary" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              Asignaciones Comerciales
            </p>
            <p className="text-xs text-muted-foreground">Monitor Interno</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group",
                collapsed && "justify-center px-2",
                active
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              <Icon
                className={cn(
                  "w-4 h-4 shrink-0 transition-colors",
                  active ? "text-primary" : "group-hover:text-foreground"
                )}
              />
              {!collapsed && <span>{label}</span>}
              {active && !collapsed && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-[72px] flex items-center justify-center w-6 h-6 rounded-full border border-border bg-card text-muted-foreground hover:text-foreground transition-colors z-10"
      >
        {collapsed ? (
          <ChevronRight className="w-3 h-3" />
        ) : (
          <ChevronLeft className="w-3 h-3" />
        )}
      </button>

      {/* Footer */}
      {!collapsed && (
        <div className="px-4 py-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            © 2025 · Uso Interno
          </p>
        </div>
      )}
    </aside>
  );
}
