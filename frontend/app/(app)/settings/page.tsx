"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useWorkspace } from "@/stores/workspace";

export default function SettingsPage() {
  const { currentOrg } = useWorkspace();

  function setTheme(theme: "light" | "dark") {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("lai_theme", theme);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="font-display text-2xl font-semibold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appearance</CardTitle>
          <CardDescription>
            Studios always open dark — that's a professional-editing decision, not a preference.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button variant="outline" onClick={() => setTheme("light")}>
            <Sun className="h-4 w-4" /> Light
          </Button>
          <Button variant="outline" onClick={() => setTheme("dark")}>
            <Moon className="h-4 w-4" /> Dark
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Workspace defaults</CardTitle>
          <CardDescription>
            Applies to {currentOrg?.name ?? "your workspace"} — default styles per language
            are set per project in Project Settings; engine tiers are governed by your plan.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <ul className="list-inside list-disc space-y-1">
            <li>Synthetic media labeling: <span className="text-foreground">always on</span></li>
            <li>Voice cloning consent enforcement: <span className="text-foreground">blocking</span></li>
            <li>Content used for model training: <span className="text-foreground">never (opt-in only)</span></li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
