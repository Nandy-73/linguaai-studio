"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { api } from "@/lib/api";
import type { Project } from "@/lib/types";
import { timeAgo } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { useWorkspace } from "@/stores/workspace";

export default function ProjectsPage() {
  const { currentOrg } = useWorkspace();
  const orgId = currentOrg?.id;
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  const { data: projects } = useQuery({
    queryKey: ["projects", orgId],
    queryFn: () => api<Project[]>(`/orgs/${orgId}/projects`),
    enabled: !!orgId,
  });

  const create = useMutation({
    mutationFn: () =>
      api<Project>(`/orgs/${orgId}/projects`, { method: "POST", json: { name } }),
    onSuccess: () => {
      setName("");
      setCreating(false);
      qc.invalidateQueries({ queryKey: ["projects", orgId] });
    },
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">Projects</h1>
        <Button onClick={() => setCreating((v) => !v)}>
          <Plus className="h-4 w-4" /> New project
        </Button>
      </div>

      {creating && (
        <Card>
          <CardContent className="flex items-end gap-3 pt-5">
            <div className="flex-1 space-y-1.5">
              <Label>Project name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)}
                     placeholder="Q3 course localization" />
            </div>
            <Button onClick={() => create.mutate()} disabled={!name || create.isPending}>
              Create
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(projects || []).map((p) => (
          <Link key={p.id} href={`/projects/${p.id}`}>
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardHeader>
                <CardTitle>{p.name}</CardTitle>
                <CardDescription>
                  {p.target_languages.length
                    ? `→ ${p.target_languages.join(", ")}`
                    : "No target languages yet"}
                </CardDescription>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                Created {timeAgo(p.created_at)}
              </CardContent>
            </Card>
          </Link>
        ))}
        {projects && projects.length === 0 && !creating && (
          <p className="text-sm text-muted-foreground">No projects yet.</p>
        )}
      </div>
    </div>
  );
}
