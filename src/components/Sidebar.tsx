"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, BookOpen, LayoutDashboard, CalendarDays } from "lucide-react";

const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/productions", label: "Produzioni", icon: BookOpen },
  { href: "/theatres", label: "Teatri", icon: Building2 },
  { href: "/calendar", label: "Calendario", icon: CalendarDays },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="fixed left-0 top-0 h-screen w-56 bg-white border-r border-gray-200 flex flex-col">
      <div className="px-5 py-6 border-b border-gray-100">
        <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">Direttore di Scena</span>
        <h1 className="text-lg font-bold text-gray-900 mt-0.5">ODG</h1>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-gray-900 text-white"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="px-5 py-4 border-t border-gray-100">
        <span className="text-xs text-gray-400">v0.1 MVP</span>
      </div>
    </aside>
  );
}
