"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { timeAgo } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useWorkspace } from "@/stores/workspace";

interface Billing {
  plan: string; credits: number;
  usage: { id: string; credits: number; kind: string; description: string; created_at: string }[];
}
interface Plan { id: string; name: string; price: number; credits: number; features: string[]; }

export default function BillingPage() {
  const { currentOrg } = useWorkspace();
  const { data: billing } = useQuery({
    queryKey: ["billing", currentOrg?.id],
    queryFn: () => api<Billing>(`/orgs/${currentOrg!.id}/billing`),
    enabled: !!currentOrg,
  });
  const { data: plansData } = useQuery({
    queryKey: ["plans"],
    queryFn: () => api<{ plans: Plan[] }>("/billing/plans"),
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="font-display text-2xl font-semibold">Billing & Usage</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardDescription>Current plan</CardDescription>
            <CardTitle className="capitalize">{billing?.plan ?? "—"}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Credits remaining</CardDescription>
            <CardTitle className="font-mono text-3xl">
              {billing?.credits?.toLocaleString() ?? "—"}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Plans</CardTitle>
          <CardDescription>Self-serve checkout arrives with the commercial launch.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(plansData?.plans || []).map((p) => (
            <div key={p.id} className="rounded-lg border p-4">
              <div className="font-medium">{p.name}</div>
              <div className="font-display text-2xl">${p.price}<span className="text-sm text-muted-foreground">/mo</span></div>
              <div className="mb-3 text-xs text-muted-foreground">{p.credits.toLocaleString()} credits</div>
              <Button size="sm" variant="outline" className="w-full" disabled={billing?.plan === p.id}>
                {billing?.plan === p.id ? "Current" : "Upgrade"}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Usage</CardTitle></CardHeader>
        <CardContent className="divide-y">
          {(billing?.usage || []).map((u) => (
            <div key={u.id} className="flex items-center justify-between py-2.5 text-sm">
              <div>
                <span className="font-medium">{u.description || u.kind}</span>
                <span className="ml-2 text-xs text-muted-foreground">{timeAgo(u.created_at)}</span>
              </div>
              <Badge variant={u.credits < 0 ? "default" : "success"}>
                {u.credits > 0 ? "+" : ""}{u.credits} cr
              </Badge>
            </div>
          ))}
          {billing && billing.usage.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">No usage yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
