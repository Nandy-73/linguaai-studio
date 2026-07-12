"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileUp } from "lucide-react";
import { api } from "@/lib/api";
import type { LanguageInfo, Project, Run } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label, Select } from "@/components/ui/input";
import { useWorkspace } from "@/stores/workspace";

const TEMPLATES = [
  { id: "video_dubbing", label: "Video → dubbed video", kind: "video" },
  { id: "subtitles", label: "Video/audio → subtitles", kind: "video" },
  { id: "audio_dubbing", label: "Audio → dubbed audio", kind: "audio" },
  { id: "document", label: "Document → translated document", kind: "document" },
];

function kindFor(file: File): string {
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "document";
}

function UploadInner() {
  const router = useRouter();
  const search = useSearchParams();
  const { currentOrg } = useWorkspace();
  const orgId = currentOrg?.id;

  const [projectId, setProjectId] = useState(search.get("project") || "");
  const [assetId, setAssetId] = useState(search.get("asset") || "");
  const [file, setFile] = useState<File | null>(null);
  const [template, setTemplate] = useState("video_dubbing");
  const [targets, setTargets] = useState<string[]>([]);
  const [styles, setStyles] = useState<Record<string, string>>({});
  const [phase, setPhase] = useState<"idle" | "uploading" | "starting">("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  const { data: projects } = useQuery({
    queryKey: ["projects", orgId],
    queryFn: () => api<Project[]>(`/orgs/${orgId}/projects`),
    enabled: !!orgId,
  });
  const { data: languages } = useQuery({
    queryKey: ["languages"],
    queryFn: () => api<{ languages: LanguageInfo[] }>("/languages"),
  });
  const styleQueries = useQuery({
    queryKey: ["styles", targets],
    queryFn: async () => {
      const out: Record<string, { id: string; name: string }[]> = {};
      for (const lang of targets) {
        const data = await api<{ styles: { id: string; name: string }[] }>(
          `/languages/${lang}/styles`);
        out[lang] = data.styles;
      }
      return out;
    },
    enabled: targets.length > 0,
  });

  function putWithProgress(url: string, body: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", url);
      xhr.setRequestHeader("Content-Type", body.type || "application/octet-stream");
      xhr.upload.onprogress = (e) =>
        e.lengthComputable && setProgress(Math.round((e.loaded / e.total) * 100));
      xhr.onload = () =>
        xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status})`));
      xhr.onerror = () => reject(new Error("Upload failed"));
      xhr.send(body);
    });
  }

  async function start() {
    if (!projectId || targets.length === 0) return;
    setError("");
    try {
      let aid = assetId;
      if (!aid) {
        if (!file) return;
        setPhase("uploading");
        const ticket = await api<{ asset_id: string; upload_url: string }>(
          `/projects/${projectId}/assets`,
          { method: "POST", json: { filename: file.name, content_type: file.type || "application/octet-stream", size_bytes: file.size, kind: kindFor(file) } });
        await putWithProgress(ticket.upload_url, file);
        await api(`/projects/${projectId}/assets/${ticket.asset_id}/confirm`, { method: "POST" });
        aid = ticket.asset_id;
      }
      setPhase("starting");
      const run = await api<Run>(`/projects/${projectId}/runs`, {
        method: "POST",
        json: { asset_id: aid, template, target_languages: targets, styles },
      });
      router.push(`/runs/${run.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setPhase("idle");
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="font-display text-2xl font-semibold">New localization</h1>

      <Card>
        <CardHeader>
          <CardTitle>1 · Source</CardTitle>
          <CardDescription>Pick a project and upload media (or reuse an existing asset).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Project</Label>
            <Select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              <option value="">Select a project…</option>
              {(projects || []).map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
          </div>
          {!assetId && (
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors hover:border-accent hover:bg-accent/5">
              <FileUp className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm font-medium">
                {file ? file.name : "Click to choose a video, audio or document file"}
              </span>
              <span className="text-xs text-muted-foreground">MP4, MOV, MP3, WAV, TXT, SRT…</span>
              <input type="file" className="hidden"
                     onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </label>
          )}
          {assetId && (
            <p className="text-sm text-muted-foreground">
              Using existing asset <code className="font-mono text-xs">{assetId}</code>{" "}
              <button className="text-accent hover:underline" onClick={() => setAssetId("")}>
                (upload a new file instead)
              </button>
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2 · Pipeline & languages</CardTitle>
          <CardDescription>Choose what to produce and in which native styles.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Pipeline</Label>
            <Select value={template} onChange={(e) => setTemplate(e.target.value)}>
              {TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Target languages</Label>
            <div className="studio-scroll flex max-h-44 flex-wrap gap-1.5 overflow-y-auto rounded-lg border p-2">
              {(languages?.languages || []).map((l) => {
                const active = targets.includes(l.code);
                return (
                  <button
                    key={l.code}
                    onClick={() =>
                      setTargets(active ? targets.filter((c) => c !== l.code) : [...targets, l.code])}
                    className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                      active ? "bg-accent text-accent-foreground"
                             : "bg-muted text-muted-foreground hover:bg-muted/70"}`}
                  >
                    {l.name}{l.styleCount > 1 ? ` ·${l.styleCount}` : ""}
                  </button>
                );
              })}
            </div>
          </div>
          {targets.map((lang) => (
            <div key={lang} className="flex items-center gap-3">
              <span className="w-24 font-mono text-xs">{lang}</span>
              <Select
                className="flex-1"
                value={styles[lang] || "auto"}
                onChange={(e) => setStyles({ ...styles, [lang]: e.target.value })}
              >
                <option value="auto">Auto — let the engine choose the natural style</option>
                {(styleQueries.data?.[lang] || []).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
            </div>
          ))}
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button
        size="lg" className="w-full"
        disabled={!projectId || targets.length === 0 || (!file && !assetId) || phase !== "idle"}
        onClick={start}
      >
        {phase === "uploading" ? `Uploading… ${progress}%`
          : phase === "starting" ? "Starting pipeline…"
          : "Start localization"}
      </Button>
      {(() => {
        const missing: string[] = [];
        if (!projectId) missing.push("pick a project (step 1)");
        if (!file && !assetId) missing.push("choose a file (step 1)");
        if (targets.length === 0) missing.push("select a target language");
        return missing.length > 0 && phase === "idle" ? (
          <p className="text-center text-sm text-warning">
            To enable the button: {missing.join(" · ")}
          </p>
        ) : null;
      })()}
    </div>
  );
}

export default function UploadPage() {
  return (
    <Suspense>
      <UploadInner />
    </Suspense>
  );
}
