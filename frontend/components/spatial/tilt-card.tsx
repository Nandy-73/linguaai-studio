"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

interface TiltCardProps extends React.HTMLAttributes<HTMLDivElement> {
  depth?: 1 | 2 | 3;
  tilt?: boolean;
  glass?: boolean;
  /** Applied to the rounded/glass inner surface — use for rings, borders. */
  innerClassName?: string;
}

const ELEVATE = { 1: "elevate-1", 2: "elevate-2", 3: "elevate-3" } as const;

/** A floating, glass-elevated panel that tilts toward the cursor — the
    "spatial" building block reused across marketing, dashboard and pricing. */
export function TiltCard({
  depth = 2,
  tilt = true,
  glass = true,
  className,
  innerClassName,
  children,
  ...props
}: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!tilt || !ref.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const rotateY = (px - 0.5) * 8;
    const rotateX = (0.5 - py) * 8;
    ref.current.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(0)`;
    ref.current.style.setProperty("--sheen-x", `${px * 100}%`);
    ref.current.style.setProperty("--sheen-y", `${py * 100}%`);
    ref.current.style.setProperty("--sheen-o", "1");
  }

  function onMouseLeave() {
    if (!ref.current) return;
    ref.current.style.transform = "rotateX(0deg) rotateY(0deg) translateZ(0)";
    ref.current.style.setProperty("--sheen-o", "0");
  }

  return (
    <div className={cn("tilt-host", className)} {...props}>
      <div
        ref={ref}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        className={cn(
          "tilt-inner relative overflow-hidden rounded-2xl",
          glass && "glass-2",
          ELEVATE[depth],
          innerClassName
        )}
      >
        <div className="tilt-sheen pointer-events-none absolute inset-0" />
        {children}
      </div>
    </div>
  );
}
