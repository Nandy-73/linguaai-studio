"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Run } from "@/lib/types";
import { timeAgo } from "@/lib/utils";
import { Badge, statusVariant } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { StageRibbon } from "@/components/stage-ribbon";
import { useWorkspace } from "@/stores/workspace";

export default function HistoryPage() {
  const { currentOrg } = useWorkspace();
  const { data: runs } = useQuery({
    queryKey: ["org-runs", currentOrg?.id],
    queryFn: () => api<Run[]>(`/orgs/${currentOrg!.id}/runs`),
    enabled: !!currentOrg,
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="font-display text-2xl font-semibold">History</h1>
      <Card>
        <CardContent className="space-y-3 pt-5">
          {(runs || []).map((run) => (
            <Link key={run.id} href={`/runs/${run.id}`}
                  className="block rounded-lg border p-3 hover:bg-muted/50">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-sm font-medium">
                  {run.template.replace("_", " ")} → {(run.params.target_languages || []).join(", ")}
                </span>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-mono">-{run.credits_used} cr</span>
                  <Badge variant={statusVariant(run.status)}>{run.status}</Badge>
                  <span>{timeAgo(run.created_at)}</span>
                </div>
              </div>
              <StageRibbon stages={run.stages} compact />
            </Link>
          ))}
          {runs && runs.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">Nothing here yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
