"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3, Bell, Bot, Building2, CreditCard, Download, Drama, FolderKanban,
  History, KeyRound, Languages, LayoutDashboard, LogOut, Mic2, Moon,
  Settings, Shield, SlidersHorizontal, Sun, UploadCloud, UserRound, Users,
} from "lucide-react";
import { api, clearTokens } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Select } from "@/components/ui/input";
import { useWorkspace, type Org } from "@/stores/workspace";

interface RibbonItem {
  href: string;
  label: string;
  icon: React.ElementType;
}
interface RibbonGroup {
  caption: string;
  items: RibbonItem[];
}
interface RibbonTab {
  id: string;
  label: string;
  groups: RibbonGroup[];
}

const TABS: RibbonTab[] = [
  {
    id: "create",
    label: "Create",
    groups: [
      { caption: "Overview", items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }] },
      {
        caption: "Localize",
        items: [
          { href: "/projects", label: "Projects", icon: FolderKanban },
          { href: "/upload", label: "Upload", icon: UploadCloud },
        ],
      },
    ],
  },
  {
    id: "studios",
    label: "Studios",
    groups: [
      { caption: "Open", items: [{ href: "/studios", label: "Translation Studios", icon: SlidersHorizontal }] },
      {
        caption: "Voice & Cast",
        items: [
          { href: "/voices", label: "Voice Studio", icon: Mic2 },
          { href: "/characters", label: "Characters", icon: Drama },
        ],
      },
      { caption: "Assistant", items: [{ href: "/chat", label: "AI Chat", icon: Bot }] },
    ],
  },
  {
    id: "library",
    label: "Library",
    groups: [
      {
        caption: "Activity",
        items: [
          { href: "/history", label: "History", icon: History },
          { href: "/downloads", label: "Downloads", icon: Download },
        ],
      },
      {
        caption: "Insights",
        items: [
          { href: "/analytics", label: "Analytics", icon: BarChart3 },
          { href: "/notifications", label: "Notifications", icon: Bell },
        ],
      },
    ],
  },
  {
    id: "workspace",
    label: "Workspace",
    groups: [
      {
        caption: "People",
        items: [
          { href: "/team", label: "Team", icon: Users },
          { href: "/organizations", label: "Organizations", icon: Building2 },
        ],
      },
      {
        caption: "Billing & API",
        items: [
          { href: "/billing", label: "Billing", icon: CreditCard },
          { href: "/developers", label: "API Keys", icon: KeyRound },
        ],
      },
    ],
  },
  {
    id: "account",
    label: "Account",
    groups: [
      {
        caption: "You",
        items: [
          { href: "/profile", label: "Profile", icon: UserRound },
          { href: "/settings", label: "Settings", icon: Settings },
        ],
      },
      { caption: "Platform", items: [{ href: "/admin", label: "Admin", icon: Shield }] },
    ],
  },
];

function tabForPath(pathname: string): string {
  for (const tab of TABS) {
    for (const group of tab.groups) {
      if (group.items.some((i) => pathname.startsWith(i.href))) return tab.id;
    }
  }
  return "create";
}

export function RibbonNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentOrg, setCurrentOrg } = useWorkspace();
  const [activeTab, setActiveTab] = useState(() => tabForPath(pathname));

  useEffect(() => setActiveTab(tabForPath(pathname)), [pathname]);

  const { data: orgs } = useQuery({ queryKey: ["orgs"], queryFn: () => api<Org[]>("/orgs") });
  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: () => api<{ name: string; email: string }>("/auth/me"),
  });

  useEffect(() => {
    if (orgs?.length && !currentOrg) setCurrentOrg(orgs[0]);
    if (orgs?.length && currentOrg) {
      const fresh = orgs.find((o) => o.id === currentOrg.id);
      if (fresh && fresh.credits !== currentOrg.credits) setCurrentOrg(fresh);
    }
  }, [orgs, currentOrg, setCurrentOrg]);

  const tab = useMemo(() => TABS.find((t) => t.id === activeTab) ?? TABS[0], [activeTab]);

  function toggleTheme() {
    document.documentElement.classList.toggle("dark");
    localStorage.setItem("lai_theme", document.documentElement.classList.contains("dark") ? "dark" : "light");
  }

  function logout() {
    clearTokens();
    router.push("/login");
  }

  return (
    <div className="glass-3 elevate-2 sticky top-0 z-40 border-b">
      {/* Identity strip */}
      <div className="flex h-12 items-center justify-between gap-4 px-4">
        <Link href="/dashboard" className="flex items-center gap-2 font-display text-sm font-semibold">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent text-accent-foreground">
            <Languages className="h-3.5 w-3.5" />
          </span>
          LinguaAI Studio
        </Link>
        <div className="flex items-center gap-2">
          <Select
            className="h-7 w-44 text-xs"
            value={currentOrg?.id || ""}
            onChange={(e) => {
              const org = orgs?.find((o) => o.id === e.target.value);
              if (org) setCurrentOrg(org);
            }}
          >
            {(orgs || []).map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </Select>
          {currentOrg && (
            <span className="hidden rounded-full bg-accent/10 px-2 py-0.5 font-mono text-xs text-accent sm:inline">
              {currentOrg.credits.toLocaleString()} cr
            </span>
          )}
          <span className="hidden text-xs text-muted-foreground md:inline">{user?.email}</span>
          <button onClick={toggleTheme} title="Toggle theme"
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
            <Sun className="h-3.5 w-3.5 dark:hidden" />
            <Moon className="hidden h-3.5 w-3.5 dark:block" />
          </button>
          <button onClick={logout} title="Sign out"
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Tab strip */}
      <div className="flex items-center gap-1 border-t border-border/60 px-4 pt-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={cn(
              "relative rounded-t-lg px-3 py-1.5 text-xs font-medium transition-colors",
              activeTab === t.id
                ? "bg-background text-accent"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
            {activeTab === t.id && (
              <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent" />
            )}
          </button>
        ))}
      </div>

      {/* Ribbon body — grouped, icon-over-label buttons like a classic Office ribbon */}
      <div className="flex items-stretch gap-1 overflow-x-auto bg-background/60 px-3 py-2">
        {tab.groups.map((group, gi) => (
          <div key={group.caption} className="flex items-stretch">
            <div className="flex flex-col items-center gap-1 px-2">
              <div className="flex gap-1">
                {group.items.map((item) => {
                  const active = pathname.startsWith(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex w-16 flex-col items-center gap-1 rounded-lg px-1.5 py-1.5 text-center transition-colors",
                        active
                          ? "bg-accent/15 text-accent"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-[10px] leading-tight">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground/70">
                {group.caption}
              </span>
            </div>
            {gi < tab.groups.length - 1 && <div className="mx-1 w-px shrink-0 self-stretch bg-border" />}
          </div>
        ))}
      </div>
    </div>
  );
}
