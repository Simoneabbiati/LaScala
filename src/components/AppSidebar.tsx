"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, BookOpen, LayoutDashboard, CalendarDays } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/productions", label: "Produzioni", icon: BookOpen },
  { href: "/theatres", label: "Teatri", icon: Building2 },
  { href: "/calendar", label: "Calendario", icon: CalendarDays },
];

export default function AppSidebar() {
  const pathname = usePathname();
  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-4 border-b">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Direttore di Scena
        </p>
        <h1 className="text-base font-bold leading-tight">ODG</h1>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {links.map(({ href, label, icon: Icon }) => {
                const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
                return (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton isActive={active} render={<Link href={href} />}>
                      <Icon size={16} />
                      <span>{label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-4 py-3 border-t">
        <p className="text-xs text-muted-foreground">v0.1 MVP</p>
      </SidebarFooter>
    </Sidebar>
  );
}
