"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, FolderKanban, UploadCloud, Zap } from "lucide-react";
import { api } from "@/lib/api";
import type { Project, Run } from "@/lib/types";
import { timeAgo } from "@/lib/utils";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StageRibbon } from "@/components/stage-ribbon";
import { useWorkspace } from "@/stores/workspace";

export default function DashboardPage() {
  const { currentOrg } = useWorkspace();
  const orgId = currentOrg?.id;

  const { data: projects } = useQuery({
    queryKey: ["projects", orgId],
    queryFn: () => api<Project[]>(`/orgs/${orgId}/projects`),
    enabled: !!orgId,
  });
  const { data: runs } = useQuery({
    queryKey: ["org-runs", orgId],
    queryFn: () => api<Run[]>(`/orgs/${orgId}/runs`),
    enabled: !!orgId,
    refetchInterval: 5000,
  });

  const active = (runs || []).filter((r) => ["queued", "running"].includes(r.status));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">Dashboard</h1>
        <Link href="/upload">
          <Button><UploadCloud className="h-4 w-4" /> New localization</Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Projects</CardDescription>
            <CardTitle className="font-mono text-3xl">{projects?.length ?? "—"}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Active runs</CardDescription>
            <CardTitle className="font-mono text-3xl">{active.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Credits</CardDescription>
            <CardTitle className="font-mono text-3xl">
              {currentOrg?.credits?.toLocaleString() ?? "—"}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-accent" /> Recent runs
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(runs || []).slice(0, 6).map((run) => (
            <Link key={run.id} href={`/runs/${run.id}`}
                  className="block rounded-lg border p-3 transition-colors hover:bg-muted/50">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-sm font-medium">
                  {run.template.replace("_", " ")} →{" "}
                  {(run.params.target_languages || []).join(", ")}
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
            <div className="py-8 text-center text-sm text-muted-foreground">
              No runs yet — upload your first video to get started.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderKanban className="h-4 w-4 text-accent" /> Projects
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {(projects || []).slice(0, 4).map((p) => (
            <Link key={p.id} href={`/projects/${p.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 text-sm hover:bg-muted/50">
              <span className="font-medium">{p.name}</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
          {projects && projects.length === 0 && (
            <Link href="/projects" className="text-sm text-accent hover:underline">
              Create your first project →
            </Link>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
