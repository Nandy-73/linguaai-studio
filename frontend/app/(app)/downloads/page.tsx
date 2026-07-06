"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { api } from "@/lib/api";
import type { Run } from "@/lib/types";
import { timeAgo } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useWorkspace } from "@/stores/workspace";

export default function DownloadsPage() {
  const { currentOrg } = useWorkspace();
  const { data: runs } = useQuery({
    queryKey: ["org-runs-done", currentOrg?.id],
    queryFn: () => api<Run[]>(`/orgs/${currentOrg!.id}/runs?status=succeeded`),
    enabled: !!currentOrg,
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Downloads</h1>
        <p className="text-sm text-muted-foreground">
          Deliverables from completed runs. Download links are generated per visit and expire.
        </p>
      </div>
      {(runs || []).map((run) => (
        <Card key={run.id}>
          <CardHeader>
            <CardTitle className="text-base">
              {run.template.replace("_", " ")} → {(run.params.target_languages || []).join(", ")}
            </CardTitle>
            <CardDescription>{timeAgo(run.created_at)}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {(run.params.target_languages || []).map((lang) => (
              <a key={lang} href={`/api/v1/runs/${run.id}/subtitles.srt?lang=${lang}`} target="_blank">
                <Button size="sm" variant="outline">
                  <Download className="h-3.5 w-3.5" /> {lang}.srt
                </Button>
              </a>
            ))}
            <Link href={`/runs/${run.id}`}>
              <Button size="sm" variant="ghost">All artifacts →</Button>
            </Link>
          </CardContent>
        </Card>
      ))}
      {runs && runs.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">No completed runs yet.</p>
      )}
    </div>
  );
}
