"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Mic2, Plus, ShieldCheck, ShieldOff } from "lucide-react";
import { api } from "@/lib/api";
import type { Voice } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { useWorkspace } from "@/stores/workspace";

const CATEGORIES = ["adult_male", "adult_female", "teen_boy", "teen_girl",
  "child_boy", "child_girl", "old_male", "old_female", "narrator"];
const ENGINES = ["xtts", "openvoice", "cosyvoice", "fishspeech"];

export default function VoiceStudioPage() {
  const { currentOrg } = useWorkspace();
  const orgId = currentOrg?.id;
  const qc = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState("stock");
  const [engine, setEngine] = useState("xtts");
  const [category, setCategory] = useState("adult_male");
  const [consent, setConsent] = useState(false);
  const [uploadUrl, setUploadUrl] = useState<string | null>(null);

  const { data: voices } = useQuery({
    queryKey: ["voices", orgId],
    queryFn: () => api<Voice[]>(`/orgs/${orgId}/voices`),
    enabled: !!orgId,
  });

  const create = useMutation({
    mutationFn: () =>
      api<{ voice: Voice; reference_upload_url: string | null }>(`/orgs/${orgId}/voices`, {
        method: "POST",
        json: { name, kind, engine, category, consent_granted: consent, language_coverage: [] },
      }),
    onSuccess: (data) => {
      setUploadUrl(data.reference_upload_url);
      setName(""); setConsent(false);
      if (!data.reference_upload_url) setShowForm(false);
      qc.invalidateQueries({ queryKey: ["voices", orgId] });
    },
  });

  const revoke = useMutation({
    mutationFn: (voiceId: string) =>
      api(`/orgs/${orgId}/voices/${voiceId}/revoke-consent`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["voices", orgId] }),
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Voice Studio</h1>
          <p className="text-sm text-muted-foreground">
            Your workspace voice library. Cloned voices require a consent record — no exceptions.
          </p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}><Plus className="h-4 w-4" /> Add voice</Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>New voice</CardTitle>
            <CardDescription>
              Stock voices use engine presets. Cloned voices need ~45s of clean reference audio
              and an explicit consent attestation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Narrator — warm" />
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={kind} onChange={(e) => setKind(e.target.value)}>
                  <option value="stock">Stock</option>
                  <option value="cloned">Cloned</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Engine</Label>
                <Select value={engine} onChange={(e) => setEngine(e.target.value)}>
                  {ENGINES.map((e) => <option key={e} value={e}>{e}</option>)}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace("_", " ")}</option>)}
                </Select>
              </div>
            </div>
            {kind === "cloned" && (
              <label className="flex items-start gap-2 rounded-lg border border-accent/40 bg-accent/5 p-3 text-sm">
                <input type="checkbox" checked={consent} className="mt-0.5"
                       onChange={(e) => setConsent(e.target.checked)} />
                <span>
                  I attest that the voice owner has given explicit, documented consent for this
                  clone, and I understand revoking consent deletes the voice everywhere.
                </span>
              </label>
            )}
            <Button onClick={() => create.mutate()}
                    disabled={!name || (kind === "cloned" && !consent) || create.isPending}>
              Create voice
            </Button>
            {uploadUrl && (
              <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                Voice created. Upload the reference WAV with an HTTP PUT to the presigned URL
                (valid 1h): <code className="break-all font-mono">{uploadUrl.slice(0, 80)}…</code>
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {(voices || []).map((v) => (
          <Card key={v.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Mic2 className="h-4 w-4 text-accent" /> {v.name}
                </CardTitle>
                {v.kind === "cloned" && v.consent_status === "granted" && (
                  <span title="Consent on record"
                        className="flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-xs text-success">
                    <ShieldCheck className="h-3 w-3" /> consent
                  </span>
                )}
                {v.consent_status === "revoked" && (
                  <span className="flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-xs text-destructive">
                    <ShieldOff className="h-3 w-3" /> revoked
                  </span>
                )}
              </div>
              <CardDescription>
                {v.kind} · {v.engine} · {v.category.replace("_", " ")}
              </CardDescription>
            </CardHeader>
            {v.kind === "cloned" && v.consent_status === "granted" && (
              <CardContent>
                <Button size="sm" variant="destructive" onClick={() => revoke.mutate(v.id)}>
                  Revoke consent
                </Button>
              </CardContent>
            )}
          </Card>
        ))}
        {voices && voices.length === 0 && !showForm && (
          <p className="text-sm text-muted-foreground">No voices yet.</p>
        )}
      </div>
    </div>
  );
}
