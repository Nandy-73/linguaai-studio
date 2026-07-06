"use client";

import { cn } from "@/lib/utils";

export interface Stage {
  id: string;
  name: string;
  status: string;
  position: number;
}

const STAGE_LABELS: Record<string, string> = {
  probe: "Probe",
  speaker_detection: "Speakers",
  diarization: "Diarize",
  asr: "Transcribe",
  language_detection: "Language",
  emotion: "Emotion",
  translation: "Translate",
  style_selection: "Style",
  voice_generation: "Voices",
  subtitle_generation: "Subtitles",
  audio_mixing: "Mix",
  video_render: "Render",
  document_extract: "Extract",
  document_render: "Render",
};

export function stageLabel(name: string): string {
  return STAGE_LABELS[name] || name;
}

/** The Run Ribbon — the product's heartbeat. Each pipeline stage is a segment
    that fills as the job progresses. */
export function StageRibbon({ stages, compact = false }: { stages: Stage[]; compact?: boolean }) {
  return (
    <div className="flex w-full items-center gap-1">
      {stages.map((stage) => (
        <div key={stage.id} className="flex min-w-0 flex-1 flex-col gap-1">
          <div
            className={cn(
              "h-1.5 rounded-full transition-colors",
              stage.status === "succeeded" && "bg-success",
              stage.status === "running" && "animate-pulse bg-accent",
              stage.status === "queued" && "bg-accent/40",
              stage.status === "failed" && "bg-destructive",
              stage.status === "skipped" && "bg-muted-foreground/30",
              stage.status === "pending" && "bg-muted"
            )}
            title={`${stageLabel(stage.name)} — ${stage.status}`}
          />
          {!compact && (
            <span className="truncate text-center text-[10px] text-muted-foreground">
              {stageLabel(stage.name)}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
