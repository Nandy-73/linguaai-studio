"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Check, Plus } from "lucide-react";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { useWorkspace, type Org } from "@/stores/workspace";

export default function OrganizationsPage() {
  const { currentOrg, setCurrentOrg } = useWorkspace();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [token, setToken] = useState("");

  const { data: orgs } = useQuery({ queryKey: ["orgs"], queryFn: () => api<Org[]>("/orgs") });

  const create = useMutation({
    mutationFn: () => api<Org>("/orgs", { method: "POST", json: { name } }),
    onSuccess: (org) => {
      setName("");
      setCurrentOrg(org);
      qc.invalidateQueries({ queryKey: ["orgs"] });
    },
  });

  const accept = useMutation({
    mutationFn: () => api(`/orgs/invitations/${token}/accept`, { method: "POST" }),
    onSuccess: () => {
      setToken("");
      qc.invalidateQueries({ queryKey: ["orgs"] });
    },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="font-display text-2xl font-semibold">Organizations</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Create organization</CardTitle></CardHeader>
          <CardContent className="flex items-end gap-3">
            <div className="flex-1 space-y-1.5">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <Button onClick={() => create.mutate()} disabled={!name || create.isPending}>
              <Plus className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Join with invitation</CardTitle>
            <CardDescription>Paste the token you received.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-end gap-3">
            <Input value={token} onChange={(e) => setToken(e.target.value)} placeholder="token" />
            <Button variant="outline" onClick={() => accept.mutate()} disabled={!token}>Join</Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="divide-y pt-2">
          {(orgs || []).map((o) => (
            <div key={o.id} className="flex items-center justify-between gap-3 py-3">
              <div className="flex items-center gap-3">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">{o.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {o.plan} · {o.credits.toLocaleString()} credits · you are {o.role}
                  </div>
                </div>
              </div>
              {currentOrg?.id === o.id ? (
                <Badge variant="accent"><Check className="mr-1 h-3 w-3" /> active</Badge>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setCurrentOrg(o)}>Switch</Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
