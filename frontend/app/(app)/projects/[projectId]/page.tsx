"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { UploadCloud } from "lucide-react";
import { api } from "@/lib/api";
import type { Asset, Project, Run } from "@/lib/types";
import { formatBytes, formatDuration, timeAgo } from "@/lib/utils";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StageRibbon } from "@/components/stage-ribbon";

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();

  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => api<Project>(`/projects/${projectId}`),
  });
  const { data: assets } = useQuery({
    queryKey: ["assets", projectId],
    queryFn: () => api<Asset[]>(`/projects/${projectId}/assets`),
  });
  const { data: runs } = useQuery({
    queryKey: ["runs", projectId],
    queryFn: () => api<Run[]>(`/projects/${projectId}/runs`),
    refetchInterval: 5000,
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">{project?.name ?? "…"}</h1>
          {project?.description && (
            <p className="text-sm text-muted-foreground">{project.description}</p>
          )}
        </div>
        <Link href={`/upload?project=${projectId}`}>
          <Button><UploadCloud className="h-4 w-4" /> Upload media</Button>
        </Link>
      </div>

      <Card>
        <CardHeader><CardTitle>Media library</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {(assets || []).map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
              <div className="min-w-0">
                <div className="truncate font-medium">{a.filename}</div>
                <div className="text-xs text-muted-foreground">
                  {a.kind} · {formatBytes(a.size_bytes)} · {formatDuration(a.duration_seconds)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={a.status === "ready" ? "success" : "default"}>{a.status}</Badge>
                <Link href={`/upload?project=${projectId}&asset=${a.id}`}>
                  <Button size="sm" variant="outline">Localize</Button>
                </Link>
              </div>
            </div>
          ))}
          {assets && assets.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">No media yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Runs</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {(runs || []).map((run) => (
            <Link key={run.id} href={`/runs/${run.id}`}
                  className="block rounded-lg border p-3 hover:bg-muted/50">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium">
                  {run.template.replace("_", " ")} → {(run.params.target_languages || []).join(", ")}
                </span>
                <div className="flex items-center gap-2">
                  <Badge variant={statusVariant(run.status)}>{run.status}</Badge>
                  <span className="text-xs text-muted-foreground">{timeAgo(run.created_at)}</span>
                </div>
              </div>
              <StageRibbon stages={run.stages} compact />
            </Link>
          ))}
          {runs && runs.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">No runs yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
