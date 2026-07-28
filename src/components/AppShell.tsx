"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavItem {
  href: string;
  label: string;
  icon: string;
}

export default function AppShell({
  nav,
  displayName,
  roleLabel,
  children,
}: {
  nav: NavItem[];
  displayName: string;
  roleLabel: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <div className="min-h-screen">
      {/* Barra superior */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-ovi-bg px-4 py-3 text-white shadow no-print">
        <div className="flex items-center gap-3">
          <button
            className="flex min-h-[44px] min-w-[44px] flex-col items-center justify-center rounded-lg p-2 hover:bg-white/10 md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menú"
          >
            <span className="block h-0.5 w-6 bg-white" />
            <span className="mt-1.5 block h-0.5 w-6 bg-white" />
            <span className="mt-1.5 block h-0.5 w-6 bg-white" />
          </button>
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ovi-primary text-sm font-black">
              OVI
            </span>
            <span className="hidden text-sm font-semibold sm:block">
              Grupo Chacón
            </span>
          </Link>
        </div>
        <div className="flex items-center gap-3 text-right">
          <div className="leading-tight">
            <div className="text-sm font-semibold">{displayName}</div>
            <div className="text-xs text-slate-300">{roleLabel}</div>
          </div>
          <form action="/api/logout" method="post">
            <button className="min-h-[44px] rounded-lg bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/20">
              Salir
            </button>
          </form>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl">
        {/* Navegación lateral */}
        <aside
          className={`${
            open ? "block" : "hidden"
          } fixed inset-x-0 top-[57px] z-20 border-b border-slate-200 bg-white p-3 md:static md:block md:w-60 md:shrink-0 md:border-b-0 md:border-r md:p-4 no-print`}
        >
          <nav className="grid gap-1">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex min-h-[48px] items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-medium ${
                  isActive(item.href)
                    ? "bg-ovi-soft text-ovi-primaryDark"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Contenido */}
        <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
