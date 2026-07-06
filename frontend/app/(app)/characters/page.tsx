"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Drama, Plus } from "lucide-react";
import { api } from "@/lib/api";
import type { Character, Project, Voice } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { useWorkspace } from "@/stores/workspace";

const CATEGORIES = ["adult_male", "adult_female", "teen_boy", "teen_girl",
  "child_boy", "child_girl", "old_male", "old_female", "narrator"];

export default function CharactersPage() {
  const { currentOrg } = useWorkspace();
  const orgId = currentOrg?.id;
  const qc = useQueryClient();
  const [projectId, setProjectId] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("adult_male");
  const [speakerLabel, setSpeakerLabel] = useState("");

  const { data: projects } = useQuery({
    queryKey: ["projects", orgId],
    queryFn: () => api<Project[]>(`/orgs/${orgId}/projects`),
    enabled: !!orgId,
  });
  const { data: voices } = useQuery({
    queryKey: ["voices", orgId],
    queryFn: () => api<Voice[]>(`/orgs/${orgId}/voices`),
    enabled: !!orgId,
  });
  const { data: characters } = useQuery({
    queryKey: ["characters", projectId],
    queryFn: () => api<Character[]>(`/projects/${projectId}/characters`),
    enabled: !!projectId,
  });

  const create = useMutation({
    mutationFn: () =>
      api(`/projects/${projectId}/characters`, {
        method: "POST",
        json: { name, category, speaker_label: speakerLabel || null, voice_id: null },
      }),
    onSuccess: () => {
      setName(""); setSpeakerLabel("");
      qc.invalidateQueries({ queryKey: ["characters", projectId] });
    },
  });

  const assign = useMutation({
    mutationFn: ({ ch, voiceId }: { ch: Character; voiceId: string }) =>
      api(`/projects/${projectId}/characters/${ch.id}`, {
        method: "PATCH",
        json: { name: ch.name, category: ch.category,
                speaker_label: ch.speaker_label, voice_id: voiceId || null },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["characters", projectId] }),
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Character Manager</h1>
        <p className="text-sm text-muted-foreground">
          Map detected speakers to characters and cast a voice for each — the dubbing
          pipeline keeps every character consistent across the whole video.
        </p>
      </div>

      <Card>
        <CardContent className="pt-5">
          <Label>Project</Label>
          <Select className="mt-1.5" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            <option value="">Select a project…</option>
            {(projects || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </CardContent>
      </Card>

      {projectId && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">New character</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Dr. Chen" />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace("_", " ")}</option>)}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Speaker label</Label>
                <Input value={speakerLabel} onChange={(e) => setSpeakerLabel(e.target.value)}
                       placeholder="SPEAKER_00" className="w-36" />
              </div>
              <Button onClick={() => create.mutate()} disabled={!name || create.isPending}>
                <Plus className="h-4 w-4" /> Add
              </Button>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            {(characters || []).map((ch) => (
              <Card key={ch.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Drama className="h-4 w-4 text-accent" /> {ch.name}
                  </CardTitle>
                  <CardDescription>
                    {ch.category.replace("_", " ")}
                    {ch.speaker_label && <> · <span className="font-mono">{ch.speaker_label}</span></>}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Label className="text-xs">Voice</Label>
                  <Select
                    className="mt-1"
                    value={ch.voice_id || ""}
                    onChange={(e) => assign.mutate({ ch, voiceId: e.target.value })}
                  >
                    <option value="">Auto-select by category</option>
                    {(voices || [])
                      .filter((v) => v.consent_status !== "revoked")
                      .map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </Select>
                </CardContent>
              </Card>
            ))}
            {characters && characters.length === 0 && (
              <p className="text-sm text-muted-foreground">No characters in this project yet.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
