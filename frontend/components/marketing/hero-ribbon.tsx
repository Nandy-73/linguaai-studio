"use client";

import { motion } from "framer-motion";

const STAGES = [
  "Probe", "Speakers", "Transcribe", "Emotion", "Translate",
  "Style", "Voices", "Subtitles", "Mix", "Render",
];

/** Animated Run Ribbon for the landing hero — a real pipeline, not an illustration. */
export function HeroRibbon() {
  return (
    <div className="glass mx-auto w-full max-w-3xl rounded-2xl p-6 shadow-lg">
      <div className="mb-4 flex items-center justify-between text-sm">
        <span className="font-medium">product-launch.mp4 → Tamil (spoken), French, Japanese</span>
        <span className="font-mono text-xs text-muted-foreground">run_01hx…</span>
      </div>
      <div className="flex items-center gap-1.5">
        {STAGES.map((label, i) => (
          <div key={label} className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full rounded-full bg-accent"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{
                  duration: 1.1,
                  delay: i * 1.1,
                  repeat: Infinity,
                  repeatDelay: STAGES.length * 1.1 - 1.1 + 2,
                  ease: "easeInOut",
                }}
              />
            </div>
            <span className="truncate text-center text-[10px] text-muted-foreground">
              {label}
            </span>
          </div>
        ))}
      </div>
      <motion.div
        className="mt-4 flex items-center gap-2 text-sm text-success"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0, 1] }}
        transition={{ duration: STAGES.length * 1.1 + 1, repeat: Infinity, repeatDelay: 1, times: [0, 0.95, 1] }}
      >
        ✓ 3 dubbed videos ready — 94% of segments passed quality checks
      </motion.div>
    </div>
  );
}
