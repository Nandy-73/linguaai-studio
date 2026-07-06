"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, KeyRound, Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { timeAgo } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { useWorkspace } from "@/stores/workspace";

interface ApiKey {
  id: string; name: string; prefix: string; scopes: string[];
  revoked: boolean; last_used_at: string | null; created_at: string;
  plaintext?: string;
}

export default function DevelopersPage() {
  const { currentOrg } = useWorkspace();
  const orgId = currentOrg?.id;
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [freshKey, setFreshKey] = useState<string | null>(null);

  const { data: keys } = useQuery({
    queryKey: ["api-keys", orgId],
    queryFn: () => api<ApiKey[]>(`/orgs/${orgId}/api-keys`),
    enabled: !!orgId,
  });

  const create = useMutation({
    mutationFn: () =>
      api<ApiKey>(`/orgs/${orgId}/api-keys`, {
        method: "POST", json: { name, scopes: ["read", "write"] },
      }),
    onSuccess: (data) => {
      setFreshKey(data.plaintext || null);
      setName("");
      qc.invalidateQueries({ queryKey: ["api-keys", orgId] });
    },
  });

  const revoke = useMutation({
    mutationFn: (keyId: string) =>
      api(`/orgs/${orgId}/api-keys/${keyId}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["api-keys", orgId] }),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">API Keys</h1>
        <p className="text-sm text-muted-foreground">
          Everything the UI does is available over the REST API — see the{" "}
          <a href="/docs" className="text-accent hover:underline">docs</a>.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Create key</CardTitle></CardHeader>
        <CardContent className="flex items-end gap-3">
          <div className="flex-1 space-y-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="CI pipeline" />
          </div>
          <Button onClick={() => create.mutate()} disabled={!name || create.isPending}>
            <Plus className="h-4 w-4" /> Create
          </Button>
        </CardContent>
      </Card>

      {freshKey && (
        <Card className="border-accent">
          <CardHeader>
            <CardTitle className="text-base">Copy your key now</CardTitle>
            <CardDescription>It will never be shown again.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <code className="flex-1 truncate rounded-lg bg-muted px-3 py-2 font-mono text-xs">
              {freshKey}
            </code>
            <Button size="icon" variant="outline"
                    onClick={() => navigator.clipboard.writeText(freshKey)}>
              <Copy className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="divide-y pt-2">
          {(keys || []).map((k) => (
            <div key={k.id} className="flex items-center justify-between gap-3 py-3">
              <div className="flex items-center gap-3">
                <KeyRound className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">{k.name}</div>
                  <div className="font-mono text-xs text-muted-foreground">
                    {k.prefix}··· · created {timeAgo(k.created_at)}
                    {k.last_used_at && ` · last used ${timeAgo(k.last_used_at)}`}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {k.revoked ? (
                  <Badge variant="destructive">revoked</Badge>
                ) : (
                  <Button size="icon" variant="ghost" onClick={() => revoke.mutate(k.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            </div>
          ))}
          {keys && keys.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">No API keys yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
