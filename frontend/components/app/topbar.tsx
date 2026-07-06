"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LogOut, Moon, Sun } from "lucide-react";
import { api, clearTokens } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { useWorkspace, type Org } from "@/stores/workspace";

export function Topbar() {
  const router = useRouter();
  const { currentOrg, setCurrentOrg } = useWorkspace();

  const { data: orgs } = useQuery({
    queryKey: ["orgs"],
    queryFn: () => api<Org[]>("/orgs"),
  });
  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: () => api<{ name: string; email: string }>("/auth/me"),
  });

  useEffect(() => {
    if (orgs?.length && !currentOrg) setCurrentOrg(orgs[0]);
    // Refresh stale persisted org (credits change)
    if (orgs?.length && currentOrg) {
      const fresh = orgs.find((o) => o.id === currentOrg.id);
      if (fresh && fresh.credits !== currentOrg.credits) setCurrentOrg(fresh);
    }
  }, [orgs, currentOrg, setCurrentOrg]);

  function toggleTheme() {
    document.documentElement.classList.toggle("dark");
    localStorage.setItem("lai_theme",
      document.documentElement.classList.contains("dark") ? "dark" : "light");
  }

  function logout() {
    clearTokens();
    router.push("/login");
  }

  return (
    <header className="flex h-16 items-center justify-between gap-4 border-b bg-card px-4">
      <div className="flex items-center gap-3">
        <Select
          className="w-48"
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
          <span className="hidden rounded-full bg-accent/10 px-2.5 py-1 font-mono text-xs text-accent sm:inline">
            {currentOrg.credits.toLocaleString()} credits
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className="hidden text-sm text-muted-foreground sm:inline">{user?.email}</span>
        <Button variant="ghost" size="icon" onClick={toggleTheme} title="Toggle theme">
          <Sun className="h-4 w-4 dark:hidden" />
          <Moon className="hidden h-4 w-4 dark:block" />
        </Button>
        <Button variant="ghost" size="icon" onClick={logout} title="Sign out">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
