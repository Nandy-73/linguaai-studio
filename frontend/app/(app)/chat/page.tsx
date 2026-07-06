"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bot, FileText, Send, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import type { Run } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { useWorkspace } from "@/stores/workspace";

interface Message { role: "user" | "assistant"; text: string; }

function ChatInner() {
  const search = useSearchParams();
  const { currentOrg } = useWorkspace();
  const [runId, setRunId] = useState(search.get("run") || "");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);

  const { data: runs } = useQuery({
    queryKey: ["org-runs", currentOrg?.id],
    queryFn: () => api<Run[]>(`/orgs/${currentOrg!.id}/runs?status=succeeded`),
    enabled: !!currentOrg,
  });

  async function send() {
    if (!input.trim() || !runId) return;
    const question = input.trim();
    setMessages((m) => [...m, { role: "user", text: question }]);
    setInput("");
    setBusy(true);
    try {
      const data = await api<{ answer: string }>(`/runs/${runId}/chat`, {
        method: "POST", json: { message: question, lang: "en" },
      });
      setMessages((m) => [...m, { role: "assistant", text: data.answer }]);
    } catch (err) {
      setMessages((m) => [...m, { role: "assistant",
        text: err instanceof Error ? `Error: ${err.message}` : "Something went wrong" }]);
    } finally {
      setBusy(false);
      bottom.current?.scrollIntoView({ behavior: "smooth" });
    }
  }

  async function summarize(kind: string) {
    if (!runId) return;
    setBusy(true);
    try {
      const data = await api<{ result: string }>(
        `/runs/${runId}/summary?kind=${kind}`, { method: "POST" });
      setMessages((m) => [...m, { role: "assistant", text: data.result }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">AI Chat</h1>
        <Select className="w-64" value={runId} onChange={(e) => { setRunId(e.target.value); setMessages([]); }}>
          <option value="">Choose a completed run…</option>
          {(runs || []).map((r) => (
            <option key={r.id} value={r.id}>
              {r.template} → {(r.params.target_languages || []).join(",")} · {r.id.slice(0, 8)}
            </option>
          ))}
        </Select>
      </div>

      {runId && (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={busy} onClick={() => summarize("summary")}>
            <Sparkles className="h-3.5 w-3.5" /> Summarize
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => summarize("explanation")}>
            <Bot className="h-3.5 w-3.5" /> Explain
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => summarize("chapters")}>
            <FileText className="h-3.5 w-3.5" /> Chapters
          </Button>
        </div>
      )}

      <Card className="flex-1 overflow-hidden">
        <CardContent className="studio-scroll h-full space-y-3 overflow-y-auto py-5">
          {messages.length === 0 && (
            <p className="py-12 text-center text-sm text-muted-foreground">
              {runId
                ? "Ask anything about this media — answers cite timestamps."
                : "Pick a run to chat with its content."}
            </p>
          )}
          {messages.map((m, i) => (
            <div key={i}
                 className={`max-w-[85%] whitespace-pre-wrap rounded-xl px-4 py-2.5 text-sm ${
                   m.role === "user"
                     ? "ml-auto bg-accent text-accent-foreground"
                     : "bg-muted"}`}>
              {m.text}
            </div>
          ))}
          {busy && <div className="w-fit animate-pulse rounded-xl bg-muted px-4 py-2.5 text-sm">Thinking…</div>}
          <div ref={bottom} />
        </CardContent>
      </Card>

      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <Input value={input} onChange={(e) => setInput(e.target.value)}
               placeholder="Where do they mention pricing?" disabled={!runId || busy} />
        <Button type="submit" disabled={!runId || busy || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}

export default function ChatPage() {
  return <Suspense><ChatInner /></Suspense>;
}
