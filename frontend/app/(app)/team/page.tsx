"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserPlus } from "lucide-react";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { useWorkspace } from "@/stores/workspace";

interface Member { id: string; user_id: string; email: string; name: string; role: string; }

export default function TeamPage() {
  const { currentOrg } = useWorkspace();
  const orgId = currentOrg?.id;
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("editor");
  const [inviteToken, setInviteToken] = useState<string | null>(null);

  const { data: members } = useQuery({
    queryKey: ["members", orgId],
    queryFn: () => api<Member[]>(`/orgs/${orgId}/members`),
    enabled: !!orgId,
  });

  const invite = useMutation({
    mutationFn: () =>
      api<{ token: string }>(`/orgs/${orgId}/invitations`, {
        method: "POST", json: { email, role },
      }),
    onSuccess: (data) => {
      setInviteToken(data.token);
      setEmail("");
    },
  });

  const changeRole = useMutation({
    mutationFn: ({ memberId, newRole }: { memberId: string; newRole: string }) =>
      api(`/orgs/${orgId}/members/${memberId}`, { method: "PATCH", json: { role: newRole } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["members", orgId] }),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="font-display text-2xl font-semibold">Team</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invite member</CardTitle>
          <CardDescription>Viewers see, editors run, admins manage voices, owners manage everything.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="min-w-56 flex-1 space-y-1.5">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
              <option value="admin">Admin</option>
            </Select>
          </div>
          <Button onClick={() => invite.mutate()} disabled={!email || invite.isPending}>
            <UserPlus className="h-4 w-4" /> Invite
          </Button>
          {inviteToken && (
            <p className="w-full rounded-lg bg-muted p-3 text-xs text-muted-foreground">
              Invitation created. Share this acceptance token (email delivery lands later):{" "}
              <code className="font-mono">{inviteToken}</code>
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="divide-y pt-2">
          {(members || []).map((m) => (
            <div key={m.id} className="flex items-center justify-between gap-3 py-3">
              <div>
                <div className="text-sm font-medium">{m.name || m.email}</div>
                <div className="text-xs text-muted-foreground">{m.email}</div>
              </div>
              {m.role === "owner" ? (
                <Badge variant="accent">owner</Badge>
              ) : (
                <Select
                  className="w-28"
                  value={m.role}
                  onChange={(e) => changeRole.mutate({ memberId: m.id, newRole: e.target.value })}
                >
                  <option value="viewer">viewer</option>
                  <option value="editor">editor</option>
                  <option value="admin">admin</option>
                </Select>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
