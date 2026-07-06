"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useWorkspace } from "@/stores/workspace";

interface Overview {
  totalRuns: number; succeeded: number; failed: number;
  creditsUsed: number; mediaMinutes: number;
  byTemplate: { template: string; count: number }[];
  byDay: { day: string; count: number }[];
}

export default function AnalyticsPage() {
  const { currentOrg } = useWorkspace();
  const { data } = useQuery({
    queryKey: ["analytics", currentOrg?.id],
    queryFn: () => api<Overview>(`/orgs/${currentOrg!.id}/analytics/overview`),
    enabled: !!currentOrg,
  });

  const maxDay = Math.max(1, ...(data?.byDay || []).map((d) => d.count));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="font-display text-2xl font-semibold">Analytics</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Total runs", data?.totalRuns],
          ["Succeeded", data?.succeeded],
          ["Failed", data?.failed],
          ["Media minutes", data?.mediaMinutes],
        ].map(([label, value]) => (
          <Card key={label as string}>
            <CardHeader>
              <CardDescription>{label}</CardDescription>
              <CardTitle className="font-mono text-3xl">{value ?? "—"}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Runs per day</CardTitle></CardHeader>
          <CardContent>
            <div className="flex h-40 items-end gap-1">
              {(data?.byDay || []).map((d) => (
                <div key={d.day} className="flex-1 rounded-t bg-accent/70"
                     title={`${d.day.slice(0, 10)} — ${d.count}`}
                     style={{ height: `${(d.count / maxDay) * 100}%` }} />
              ))}
              {(!data || data.byDay.length === 0) && (
                <p className="w-full text-center text-sm text-muted-foreground">No data yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>By pipeline</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(data?.byTemplate || []).map((t) => (
              <div key={t.template} className="flex items-center gap-3 text-sm">
                <span className="w-32">{t.template.replace("_", " ")}</span>
                <div className="h-2 flex-1 rounded-full bg-muted">
                  <div className="h-full rounded-full bg-accent"
                       style={{ width: `${(t.count / Math.max(1, data?.totalRuns || 1)) * 100}%` }} />
                </div>
                <span className="w-8 text-right font-mono text-xs">{t.count}</span>
              </div>
            ))}
            {(!data || data.byTemplate.length === 0) && (
              <p className="text-sm text-muted-foreground">No runs yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardDescription>Credits used</CardDescription>
          <CardTitle className="font-mono text-3xl">{data?.creditsUsed ?? "—"}</CardTitle>
        </CardHeader>
      </Card>
    </div>
  );
}
