"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3, Bell, Bot, CreditCard, Download, FolderKanban, History,
  KeyRound, Languages, LayoutDashboard, Mic2, Settings, Shield,
  SlidersHorizontal, UploadCloud, UserRound, Users, Building2, Drama,
} from "lucide-react";
import { cn } from "@/lib/utils";

const groups: { label: string; items: { href: string; label: string; icon: React.ElementType }[] }[] = [
  {
    label: "Create",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/projects", label: "Projects", icon: FolderKanban },
      { href: "/upload", label: "Upload", icon: UploadCloud },
    ],
  },
  {
    label: "Studios",
    items: [
      { href: "/studios", label: "Translation Studios", icon: SlidersHorizontal },
      { href: "/voices", label: "Voice Studio", icon: Mic2 },
      { href: "/characters", label: "Characters", icon: Drama },
      { href: "/chat", label: "AI Chat", icon: Bot },
    ],
  },
  {
    label: "Library",
    items: [
      { href: "/history", label: "History", icon: History },
      { href: "/downloads", label: "Downloads", icon: Download },
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/notifications", label: "Notifications", icon: Bell },
    ],
  },
  {
    label: "Workspace",
    items: [
      { href: "/team", label: "Team", icon: Users },
      { href: "/organizations", label: "Organizations", icon: Building2 },
      { href: "/billing", label: "Billing", icon: CreditCard },
      { href: "/developers", label: "API Keys", icon: KeyRound },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/profile", label: "Profile", icon: UserRound },
      { href: "/settings", label: "Settings", icon: Settings },
      { href: "/admin", label: "Admin", icon: Shield },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="glass-3 hidden w-56 shrink-0 border-r md:flex md:flex-col">
      <Link href="/dashboard" className="flex h-16 items-center gap-2 border-b px-4 font-display font-semibold">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <Languages className="h-4 w-4" />
        </span>
        LinguaAI
      </Link>
      <nav className="studio-scroll flex-1 overflow-y-auto p-3">
        {groups.map((group) => (
          <div key={group.label} className="mb-4">
            <div className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {group.label}
            </div>
            {group.items.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors",
                  pathname.startsWith(href)
                    ? "bg-accent/15 font-medium text-accent"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}
