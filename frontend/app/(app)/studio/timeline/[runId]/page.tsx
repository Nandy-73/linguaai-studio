"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Play } from "lucide-react";
import { api } from "@/lib/api";
import type { Run, Transcript } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";

const SPEAKER_BG = ["bg-sky-500/70", "bg-rose-500/70", "bg-emerald-500/70", "bg-violet-500/70"];

export default function TimelineEditorPage() {
  const { runId } = useParams<{ runId: string }>();
  const [lang, setLang] = useState("");
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  const { data: run } = useQuery({
    queryKey: ["run", runId],
    queryFn: () => api<Run>(`/runs/${runId}`),
  });
  const { data: transcript } = useQuery({
    queryKey: ["transcript", runId],
    queryFn: () => api<Transcript>(`/runs/${runId}/transcript`),
  });
  const { data: artifacts } = useQuery({
    queryKey: ["artifacts", runId],
    queryFn: () => api<{ stage: string; key: string; url: string }[]>(`/runs/${runId}/artifacts`),
  });

  const langs = run?.params.target_languages || [];
  useEffect(() => { if (!lang && langs.length) setLang(langs[0]); }, [langs, lang]);

  const segments = transcript?.segments || [];
  const duration = useMemo(
    () => Math.max(1, ...segments.map((s) => s.end)), [segments]);
  const speakers = useMemo(
    () => [...new Set(segments.map((s) => s.speaker).filter(Boolean))] as string[], [segments]);
  const dubTrack = (artifacts || []).find(
    (a) => a.stage === "voice_generation" && a.key.endsWith(`dub.${lang}.wav`));
  const sel = selected !== null ? segments[selected] : null;

  return (
    <div className="dark -m-6 flex h-[calc(100vh-4rem)] flex-col bg-background text-foreground">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-3">
          <Link href={`/runs/${runId}`}>
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /> Run</Button>
          </Link>
          <span className="font-display font-semibold">Timeline Editor</span>
        </div>
        <Select value={lang} onChange={(e) => setLang(e.target.value)} className="w-36">
          {langs.map((l) => <option key={l} value={l}>{l}</option>)}
        </Select>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-6">
        {/* Track lanes */}
        <div className="space-y-2">
          {["Original", `Dub · ${lang || "—"}`].map((label, lane) => (
            <div key={label}>
              <div className="mb-1 text-xs font-medium text-muted-foreground">{label}</div>
              <div className="relative h-10 rounded-lg bg-muted">
                {segments.map((seg, i) => {
                  const left = (seg.start / duration) * 100;
                  const width = Math.max(0.5, ((seg.end - seg.start) / duration) * 100);
                  const speakerIdx = speakers.indexOf(seg.speaker || "");
                  return (
                    <button
                      key={i}
                      title={`${seg.speaker ?? ""} ${seg.text}`}
                      onClick={() => setSelected(i)}
                      className={cn(
                        "absolute top-1 h-8 rounded transition-opacity",
                        lane === 0 ? SPEAKER_BG[speakerIdx % 4] : "bg-accent/70",
                        selected === i ? "opacity-100 ring-2 ring-accent" : "opacity-80 hover:opacity-100"
                      )}
                      style={{ left: `${left}%`, width: `${width}%` }}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Dub track player */}
        {dubTrack && (
          <div className="rounded-lg border p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Play className="h-4 w-4 text-accent" /> Dubbed track — {lang}
            </div>
            <audio controls src={dubTrack.url} className="w-full" />
          </div>
        )}

        {/* Segment inspector */}
        {sel && (
          <div className="rounded-lg border p-4">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium">
                Segment {sel.index + 1} · {sel.speaker ?? "—"} · {sel.emotion ?? "neutral"}
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                {sel.start.toFixed(1)}s → {sel.end.toFixed(1)}s
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{sel.text}</p>
            <p className="mt-2 text-sm">{sel.translations?.[lang]?.text ?? "—"}</p>
            <div className="mt-3 flex gap-2">
              <Link href={`/studio/subtitle/${runId}`}>
                <Button size="sm" variant="outline">Edit in Subtitle Studio</Button>
              </Link>
            </div>
          </div>
        )}
        {!sel && (
          <p className="text-center text-sm text-muted-foreground">
            Click a segment block to inspect it.
          </p>
        )}
      </div>
    </div>
  );
}
