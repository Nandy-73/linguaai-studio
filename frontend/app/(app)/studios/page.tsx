"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Captions, SlidersHorizontal } from "lucide-react";
import { api } from "@/lib/api";
import type { Run } from "@/lib/types";
import { timeAgo } from "@/lib/utils";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useWorkspace } from "@/stores/workspace";

export default function StudiosPage() {
  const { currentOrg } = useWorkspace();
  const { data: runs } = useQuery({
    queryKey: ["org-runs", currentOrg?.id],
    queryFn: () => api<Run[]>(`/orgs/${currentOrg!.id}/runs`),
    enabled: !!currentOrg,
  });

  const openable = (runs || []).filter((r) => r.status === "succeeded");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Translation Studios</h1>
        <p className="text-sm text-muted-foreground">
          Pick a completed run to open it in the Subtitle Studio or Timeline Editor.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Completed runs</CardTitle>
          <CardDescription>Only finished runs can be opened in a studio.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {openable.map((run) => (
            <div key={run.id} className="flex items-center justify-between rounded-lg border p-3">
              <div className="min-w-0 text-sm">
                <div className="font-medium">
                  {run.template.replace("_", " ")} → {(run.params.target_languages || []).join(", ")}
                </div>
                <div className="text-xs text-muted-foreground">{timeAgo(run.created_at)}</div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={statusVariant(run.status)}>{run.status}</Badge>
                <Link href={`/studio/subtitle/${run.id}`}>
                  <Button size="sm" variant="outline"><Captions className="h-3.5 w-3.5" /> Subtitles</Button>
                </Link>
                <Link href={`/studio/timeline/${run.id}`}>
                  <Button size="sm" variant="outline"><SlidersHorizontal className="h-3.5 w-3.5" /> Timeline</Button>
                </Link>
              </div>
            </div>
          ))}
          {openable.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No completed runs yet — <Link href="/upload" className="text-accent hover:underline">start one</Link>.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
