"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/** Per-feature nature backdrops. First prefix match wins; anything unmatched
    (marketing pages etc.) falls back to the fjord set in globals.css. */
const BACKDROPS: [prefix: string, image: string][] = [
  ["/dashboard", "snow-valley.jpg"],
  ["/projects", "misty-hills.jpg"],
  ["/upload", "waterfall.jpg"],
  ["/studios", "foggy-peak.jpg"],
  ["/studio", "foggy-peak.jpg"],
  ["/voices", "calm-lake.jpg"],
  ["/characters", "canyon.jpg"],
  ["/chat", "aurora-night.jpg"],
  ["/analytics", "golden-field.jpg"],
  ["/history", "mountain-lake.jpg"],
  ["/downloads", "lake-sunset.jpg"],
  ["/notifications", "lake-sunset.jpg"],
  ["/team", "golden-field.jpg"],
  ["/organizations", "canyon.jpg"],
  ["/billing", "snow-valley.jpg"],
  ["/developers", "foggy-peak.jpg"],
  ["/profile", "mountain-lake.jpg"],
  ["/settings", "mountain-lake.jpg"],
  ["/admin", "lake-sunset.jpg"],
  ["/login", "mountain-lake.jpg"],
  ["/register", "mountain-lake.jpg"],
];

export function BackdropSwitcher() {
  const pathname = usePathname();

  useEffect(() => {
    const match = BACKDROPS.find(([prefix]) => pathname.startsWith(prefix));
    const root = document.documentElement;
    if (match) {
      root.style.setProperty("--page-bg", `url(/backgrounds/${match[1]})`);
    } else {
      root.style.removeProperty("--page-bg"); // fall back to the fjord default
    }
  }, [pathname]);

  return null;
}
