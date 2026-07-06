"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";

interface Me { id: string; email: string; name: string; avatar_url: string | null; }

export default function ProfilePage() {
  const qc = useQueryClient();
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => api<Me>("/auth/me") });
  const [name, setName] = useState("");

  useEffect(() => { if (me) setName(me.name); }, [me]);

  const save = useMutation({
    mutationFn: () => api("/users/me", { method: "PATCH", json: { name } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["me"] }),
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="font-display text-2xl font-semibold">Profile</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
          <CardDescription>{me?.email}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Display name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !name}>
            {save.isPending ? "Saving…" : "Save changes"}
          </Button>
          {save.isSuccess && <p className="text-sm text-success">Saved.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
