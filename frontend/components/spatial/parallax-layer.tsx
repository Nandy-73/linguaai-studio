"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/** Drifts a decorative layer vertically at a fraction of scroll speed —
    the depth cue that separates background shapes from foreground content. */
export function ParallaxLayer({
  speed = 0.2,
  className,
  children,
}: {
  speed?: number;
  className?: string;
  children?: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    function onScroll() {
      if (!ref.current) return;
      const rect = ref.current.parentElement?.getBoundingClientRect();
      const offset = rect ? -rect.top * speed : 0;
      ref.current.style.transform = `translateY(${offset}px)`;
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [speed]);

  return (
    <div ref={ref} className={cn("pointer-events-none absolute", className)}>
      {children}
    </div>
  );
}
