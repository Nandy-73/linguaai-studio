"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Captions, Clock, Download, MessageSquare, PlayCircle, SlidersHorizontal, XCircle } from "lucide-react";
import { api, wsUrl } from "@/lib/api";
import type { Run } from "@/lib/types";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StageRibbon, stageLabel } from "@/components/stage-ribbon";

export default function RunPage() {
  const { runId } = useParams<{ runId: string }>();
  const qc = useQueryClient();

  const { data: run } = useQuery({
    queryKey: ["run", runId],
    queryFn: () => api<Run>(`/runs/${runId}`),
    refetchInterval: (q) =>
      ["queued", "running"].includes((q.state.data as Run | undefined)?.status || "") ? 4000 : false,
  });

  // Live updates over WebSocket
  useEffect(() => {
    if (!runId) return;
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(wsUrl(runId));
      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type && msg.type !== "ping") {
          qc.invalidateQueries({ queryKey: ["run", runId] });
        }
      };
    } catch { /* polling covers it */ }
    return () => ws?.close();
  }, [runId, qc]);

  const { data: artifacts } = useQuery({
    queryKey: ["artifacts", runId],
    queryFn: () => api<{ stage: string; key: string; url: string }[]>(`/runs/${runId}/artifacts`),
    enabled: run?.status === "succeeded",
  });

  const done = run?.status === "succeeded";
  const langs = run?.params.target_languages || [];

  // Playable outputs: final dubbed videos (video pipelines) or mixed audio
  // tracks (audio pipelines) — keyed by language from the artifact filename.
  const videoPreviews = (artifacts || []).filter((a) =>
    a.key.includes("/video_render/final."));
  const audioPreviews = videoPreviews.length > 0 ? [] :
    (artifacts || []).filter((a) => a.key.includes("/audio_mixing/mixed."));
  const previewLang = (key: string) =>
    key.split("/").pop()?.split(".").slice(-2, -1)[0] || "";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">
            {run?.template.replace("_", " ")} → {langs.join(", ")}
          </h1>
          <p className="font-mono text-xs text-muted-foreground">run_{runId}</p>
        </div>
        <div className="flex items-center gap-2">
          {run && <Badge variant={statusVariant(run.status)}>{run.status}</Badge>}
          {run && ["queued", "running"].includes(run.status) && (
            <Button variant="outline" size="sm"
                    onClick={() => api(`/runs/${runId}/cancel`, { method: "POST" })
                      .then(() => qc.invalidateQueries({ queryKey: ["run", runId] }))}>
              <XCircle className="h-4 w-4" /> Cancel
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Pipeline</CardTitle></CardHeader>
        <CardContent>
          {run && <StageRibbon stages={run.stages} />}
          <div className="mt-4 space-y-1.5">
            {(run?.stages || []).map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-md px-2 py-1 text-sm hover:bg-muted/50">
                <span className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  {stageLabel(s.name)}
                  {s.attempt > 1 && (
                    <span className="text-xs text-warning">retry {s.attempt}</span>
                  )}
                </span>
                <span className="flex items-center gap-2">
                  {s.error && <span className="max-w-64 truncate text-xs text-destructive">{s.error}</span>}
                  <Badge variant={statusVariant(s.status)}>{s.status}</Badge>
                </span>
              </div>
            ))}
          </div>
          {run?.error && (
            <p className="mt-3 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{run.error}</p>
          )}
        </CardContent>
      </Card>

      {done && (videoPreviews.length > 0 || audioPreviews.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlayCircle className="h-4 w-4 text-accent" /> Preview — translated result
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {videoPreviews.map((a) => (
              <div key={a.key}>
                <p className="mb-1.5 font-mono text-xs uppercase text-muted-foreground">
                  {previewLang(a.key)} — dubbed video
                </p>
                <video
                  controls
                  preload="metadata"
                  className="mx-auto max-h-[65vh] w-auto max-w-full rounded-xl border border-border/60 bg-black"
                  src={a.url}
                />
              </div>
            ))}
            {audioPreviews.map((a) => (
              <div key={a.key}>
                <p className="mb-1.5 font-mono text-xs uppercase text-muted-foreground">
                  {previewLang(a.key)} — dubbed audio
                </p>
                <audio controls className="w-full" src={a.url} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {done && (
        <Card>
          <CardHeader><CardTitle>Open in a studio</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Link href={`/studio/subtitle/${runId}`}>
              <Button variant="outline"><Captions className="h-4 w-4" /> Subtitle Studio</Button>
            </Link>
            <Link href={`/studio/timeline/${runId}`}>
              <Button variant="outline"><SlidersHorizontal className="h-4 w-4" /> Timeline Editor</Button>
            </Link>
            <Link href={`/chat?run=${runId}`}>
              <Button variant="outline"><MessageSquare className="h-4 w-4" /> AI Chat</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {done && (
        <Card>
          <CardHeader><CardTitle>Deliverables</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {langs.map((lang) => (
              <div key={lang} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="w-16 font-mono text-xs">{lang}</span>
                <a href={`/api/v1/runs/${runId}/subtitles.srt?lang=${lang}`} target="_blank">
                  <Button size="sm" variant="outline"><Download className="h-3.5 w-3.5" /> SRT</Button>
                </a>
                <a href={`/api/v1/runs/${runId}/subtitles.vtt?lang=${lang}`} target="_blank">
                  <Button size="sm" variant="outline"><Download className="h-3.5 w-3.5" /> VTT</Button>
                </a>
              </div>
            ))}
            {(artifacts || []).map((a) => (
              <div key={a.key} className="flex items-center justify-between rounded-lg border p-2 text-sm">
                <span className="truncate font-mono text-xs">{a.key.split("/").slice(-2).join("/")}</span>
                <a href={a.url} target="_blank" rel="noreferrer">
                  <Button size="sm" variant="ghost"><Download className="h-3.5 w-3.5" /> Download</Button>
                </a>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
