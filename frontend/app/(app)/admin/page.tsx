"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface Overview {
  users: number; orgs: number; totalRuns: number; activeRuns: number;
  queueDepths: Record<string, number>;
}
interface AdminUser { id: string; email: string; name: string; is_active: boolean; is_superuser: boolean; }
interface AdminOrg { id: string; name: string; plan: string; credits: number; }

export default function AdminPage() {
  const qc = useQueryClient();
  const { data: overview, error } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => api<Overview>("/admin/overview"),
    retry: false,
  });
  const { data: users } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => api<AdminUser[]>("/admin/users"),
    enabled: !!overview,
  });
  const { data: orgs } = useQuery({
    queryKey: ["admin-orgs"],
    queryFn: () => api<AdminOrg[]>("/admin/orgs"),
    enabled: !!overview,
  });

  const toggle = useMutation({
    mutationFn: (userId: string) => api(`/admin/users/${userId}/toggle-active`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });
  const grant = useMutation({
    mutationFn: (orgId: string) =>
      api(`/admin/orgs/${orgId}/grant-credits?amount=1000`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-orgs"] }),
  });

  if (error instanceof ApiError && error.status === 403) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center text-sm text-muted-foreground">
        The Admin Dashboard is restricted to platform operators (superusers).
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="font-display text-2xl font-semibold">Admin Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-4">
        {[["Users", overview?.users], ["Organizations", overview?.orgs],
          ["Total runs", overview?.totalRuns], ["Active runs", overview?.activeRuns]]
          .map(([label, value]) => (
          <Card key={label as string}>
            <CardHeader>
              <CardDescription>{label}</CardDescription>
              <CardTitle className="font-mono text-3xl">{value ?? "—"}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Queue depths</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {Object.entries(overview?.queueDepths || {}).map(([q, depth]) => (
            <div key={q} className="rounded-lg border px-4 py-2 text-sm">
              <span className="font-mono text-xs text-muted-foreground">{q}</span>
              <div className="font-mono text-xl">{depth}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Organizations</CardTitle></CardHeader>
          <CardContent className="divide-y">
            {(orgs || []).map((o) => (
              <div key={o.id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <span className="font-medium">{o.name}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {o.plan} · {o.credits} cr
                  </span>
                </div>
                <Button size="sm" variant="outline" onClick={() => grant.mutate(o.id)}>
                  +1000 cr
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Users</CardTitle></CardHeader>
          <CardContent className="divide-y">
            {(users || []).map((u) => (
              <div key={u.id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <span className="font-medium">{u.name || u.email}</span>
                  {u.is_superuser && <Badge className="ml-2" variant="accent">op</Badge>}
                </div>
                <Button size="sm" variant={u.is_active ? "outline" : "destructive"}
                        onClick={() => toggle.mutate(u.id)}>
                  {u.is_active ? "Suspend" : "Reactivate"}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
