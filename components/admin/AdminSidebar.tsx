"use client";

import type { ReactNode } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavigationItem = {
  href: string;
  label: string;
  description: string;
  exact?: boolean;
  icon: ReactNode;
};

const navigationItems: NavigationItem[] = [
  {
    href: "/admin",
    label: "Dashboard",
    description: "Podsumowanie panelu",
    exact: true,
    icon: <DashboardIcon />,
  },
  {
    href: "/admin/courses",
    label: "Kursy",
    description: "Kursy, moduły i lekcje",
    icon: <BookIcon />,
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="lg:sticky lg:top-24 lg:h-[calc(100vh-7rem)] lg:w-72 lg:shrink-0">
      <div className="flex h-full flex-col rounded-3xl border border-zinc-800 bg-zinc-950/70 p-5 backdrop-blur-xl">
        <div className="border-b border-zinc-800/80 px-2 pb-6">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-blue-400">
            Administracja
          </p>

          <Link
            href="/admin"
            className="mt-3 block text-xl font-semibold tracking-tight text-zinc-100 transition hover:text-blue-400"
          >
            Panel administratora
          </Link>

          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Zarządzaj zawartością platformy.
          </p>
        </div>

        <nav
          aria-label="Nawigacja panelu administratora"
          className="mt-5 space-y-2"
        >
          {navigationItems.map((item) => {
            const isActive =
              isNavigationItemActive(
                pathname,
                item,
              );

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={
                  isActive
                    ? "page"
                    : undefined
                }
                className={[
                  "group flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all duration-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                  isActive
                    ? "border-blue-500/50 bg-blue-500/10 text-blue-300 shadow-lg shadow-blue-950/20"
                    : "border-transparent text-zinc-400 hover:border-zinc-800 hover:bg-zinc-900/70 hover:text-zinc-100",
                ].join(" ")}
              >
                <span
                  className={[
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors",
                    isActive
                      ? "border-blue-500/50 bg-blue-500/10 text-blue-400"
                      : "border-zinc-800 bg-zinc-950 text-zinc-500 group-hover:text-zinc-300",
                  ].join(" ")}
                >
                  {item.icon}
                </span>

                <span className="min-w-0">
                  <span className="block text-sm font-medium">
                    {item.label}
                  </span>

                  <span className="mt-0.5 block truncate text-xs text-zinc-500">
                    {item.description}
                  </span>
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-zinc-800/80 pt-5">
          <Link
            href="/"
            className="group flex items-center gap-3 rounded-2xl border border-zinc-800 px-4 py-3 text-sm text-zinc-400 transition-all hover:border-zinc-700 hover:bg-zinc-900/70 hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-500 transition group-hover:text-zinc-300">
              ←
            </span>

            <span>Zobacz stronę ucznia</span>
          </Link>
        </div>
      </div>
    </aside>
  );
}

function isNavigationItemActive(
  pathname: string,
  item: NavigationItem,
): boolean {
  if (item.exact) {
    return pathname === item.href;
  }

  return (
    pathname === item.href ||
    pathname.startsWith(
      `${item.href}/`,
    )
  );
}

function DashboardIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
    >
      <rect
        x="3"
        y="3"
        width="7"
        height="7"
        rx="2"
      />
      <rect
        x="14"
        y="3"
        width="7"
        height="7"
        rx="2"
      />
      <rect
        x="3"
        y="14"
        width="7"
        height="7"
        rx="2"
      />
      <rect
        x="14"
        y="14"
        width="7"
        height="7"
        rx="2"
      />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
    >
      <path
        d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 5.5A2.5 2.5 0 0 1 6.5 8H20"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
