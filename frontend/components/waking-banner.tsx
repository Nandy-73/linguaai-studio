"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { onServerWaking } from "@/lib/api";

export function WakingBanner() {
  const [state, setState] = useState<{ attempt: number; max: number } | null>(null);

  useEffect(() => {
    const unsubscribe = onServerWaking((attempt, max) => {
      setState({ attempt, max });
      // Clear automatically if nothing updates it for a while (request finally
      // succeeded or gave up) — avoids a stuck banner.
      window.clearTimeout((window as unknown as { __wakingTimer?: number }).__wakingTimer);
      (window as unknown as { __wakingTimer?: number }).__wakingTimer = window.setTimeout(
        () => setState(null),
        20000
      );
    });
    return unsubscribe;
  }, []);

  if (!state) return null;

  return (
    <div className="glass-3 elevate-2 fixed inset-x-0 top-0 z-[100] flex items-center justify-center gap-2 px-4 py-2 text-sm">
      <Loader2 className="h-4 w-4 animate-spin text-accent" />
      Waking up the LinguaAI server (free tier sleeps when idle) — this can take up to a minute…
    </div>
  );
}
