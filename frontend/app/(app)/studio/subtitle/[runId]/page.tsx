"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Download } from "lucide-react";
import { api } from "@/lib/api";
import type { Run, Transcript } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Select, Textarea } from "@/components/ui/input";

function ts(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = (seconds % 60).toFixed(1).padStart(4, "0");
  return `${String(m).padStart(2, "0")}:${s}`;
}

const SPEAKER_COLORS = ["text-sky-400", "text-rose-400", "text-emerald-400", "text-violet-400"];

export default function SubtitleStudioPage() {
  const { runId } = useParams<{ runId: string }>();
  const qc = useQueryClient();
  const [lang, setLang] = useState<string>("");
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // Studios are dark by design
  useEffect(() => {
    document.documentElement.classList.add("dark");
    return () => {
      if (localStorage.getItem("lai_theme") !== "dark") {
        document.documentElement.classList.remove("dark");
      }
    };
  }, []);

  const { data: run } = useQuery({
    queryKey: ["run", runId],
    queryFn: () => api<Run>(`/runs/${runId}`),
  });
  const { data: transcript } = useQuery({
    queryKey: ["transcript", runId],
    queryFn: () => api<Transcript>(`/runs/${runId}/transcript`),
  });

  const langs = run?.params.target_languages || [];
  useEffect(() => {
    if (!lang && langs.length) setLang(langs[0]);
  }, [langs, lang]);

  const speakers = useMemo(() => {
    const set = new Set((transcript?.segments || []).map((s) => s.speaker).filter(Boolean));
    return [...set] as string[];
  }, [transcript]);

  const save = useMutation({
    mutationFn: ({ index, text }: { index: number; text: string }) =>
      api(`/runs/${runId}/segments/${index}`, { method: "PATCH", json: { lang, text } }),
    onSuccess: () => {
      setSavedAt(Date.now());
      qc.invalidateQueries({ queryKey: ["transcript", runId] });
    },
  });

  return (
    <div className="dark -m-6 flex h-[calc(100vh-4rem)] flex-col bg-background text-foreground">
      {/* Studio toolbar */}
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-3">
          <Link href={`/runs/${runId}`}>
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /> Run</Button>
          </Link>
          <span className="font-display font-semibold">Subtitle Studio</span>
          <span className="font-mono text-xs text-muted-foreground">run_{runId?.slice(0, 8)}</span>
        </div>
        <div className="flex items-center gap-2">
          {savedAt && (
            <span className="flex items-center gap-1 text-xs text-success">
              <Check className="h-3 w-3" /> saved
            </span>
          )}
          <Select value={lang} onChange={(e) => setLang(e.target.value)} className="w-36">
            {langs.map((l) => <option key={l} value={l}>{l}</option>)}
          </Select>
          <a href={`/api/v1/runs/${runId}/subtitles.srt?lang=${lang}`} target="_blank">
            <Button size="sm" variant="outline"><Download className="h-3.5 w-3.5" /> SRT</Button>
          </a>
          <a href={`/api/v1/runs/${runId}/subtitles.vtt?lang=${lang}`} target="_blank">
            <Button size="sm" variant="outline"><Download className="h-3.5 w-3.5" /> VTT</Button>
          </a>
        </div>
      </div>

      {/* Segment table */}
      <div className="studio-scroll flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl space-y-1 p-4">
          {(transcript?.segments || []).map((seg) => {
            const translation = seg.translations?.[lang]?.text ?? "";
            const draft = drafts[seg.index] ?? translation;
            const dirty = draft !== translation;
            const speakerIdx = speakers.indexOf(seg.speaker || "");
            return (
              <div key={seg.index}
                   className={cn("grid grid-cols-[90px_1fr_1fr] gap-3 rounded-lg border p-3",
                                 seg.edited && "border-accent/40")}>
                <div className="text-xs text-muted-foreground">
                  <div className="font-mono">{ts(seg.start)}</div>
                  <div className="font-mono">{ts(seg.end)}</div>
                  {seg.speaker && (
                    <div className={cn("mt-1 font-medium", SPEAKER_COLORS[speakerIdx % 4])}>
                      {seg.speaker.replace("SPEAKER_", "S")}
                    </div>
                  )}
                  {seg.emotion && seg.emotion !== "neutral" && (
                    <div className="mt-0.5 text-warning">{seg.emotion}</div>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">{seg.text}</div>
                <div className="flex flex-col gap-1.5">
                  <Textarea
                    value={draft}
                    onChange={(e) => setDrafts({ ...drafts, [seg.index]: e.target.value })}
                    className="min-h-[48px] text-sm"
                  />
                  {dirty && (
                    <Button size="sm" className="self-end"
                            disabled={save.isPending}
                            onClick={() => save.mutate({ index: seg.index, text: draft })}>
                      Save
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
          {transcript && transcript.segments.length === 0 && (
            <p className="py-12 text-center text-sm text-muted-foreground">No segments.</p>
          )}
          {!transcript && (
            <p className="py-12 text-center text-sm text-muted-foreground">Loading transcript…</p>
          )}
        </div>
      </div>
    </div>
  );
}
