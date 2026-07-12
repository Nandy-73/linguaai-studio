"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Mic, MicOff, Radio, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import type { LanguageInfo } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label, Select } from "@/components/ui/input";

interface Line {
  id: number;
  source: string;
  translated: string | null;
  mock?: boolean;
}

const SPEECH_LANGS = [
  { code: "en-US", label: "English" },
  { code: "ta-IN", label: "Tamil (தமிழ்)" },
  { code: "hi-IN", label: "Hindi" },
  { code: "fr-FR", label: "French" },
  { code: "de-DE", label: "German" },
  { code: "es-ES", label: "Spanish" },
];

export default function LiveTranslatePage() {
  const [supported, setSupported] = useState(true);
  const [listening, setListening] = useState(false);
  const [speechLang, setSpeechLang] = useState("en-US");
  const [targetLang, setTargetLang] = useState("ta");
  const [style, setStyle] = useState("auto");
  const [interim, setInterim] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const recognitionRef = useRef<ReturnType<typeof createRecognition> | null>(null);
  const idRef = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: languages } = useQuery({
    queryKey: ["languages"],
    queryFn: () => api<{ languages: LanguageInfo[] }>("/languages"),
  });
  const { data: styles } = useQuery({
    queryKey: ["styles", targetLang],
    queryFn: () =>
      api<{ styles: { id: string; name: string }[] }>(`/languages/${targetLang}/styles`),
  });

  function createRecognition() {
    const SR =
      (window as unknown as Record<string, unknown>).SpeechRecognition ||
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    if (!SR) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new (SR as any)();
  }

  useEffect(() => {
    if (!createRecognition()) setSupported(false);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines, interim]);

  async function translateLine(lineId: number, text: string) {
    try {
      const data = await api<{ translated: string; mock: boolean }>("/live/translate", {
        method: "POST",
        json: { text, target_lang: targetLang, style },
      });
      setLines((prev) =>
        prev.map((l) =>
          l.id === lineId ? { ...l, translated: data.translated, mock: data.mock } : l
        )
      );
    } catch {
      setLines((prev) =>
        prev.map((l) => (l.id === lineId ? { ...l, translated: "⚠ translation failed" } : l))
      );
    }
  }

  function start() {
    const rec = createRecognition();
    if (!rec) return;
    rec.lang = speechLang;
    rec.continuous = true;
    rec.interimResults = true;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (event: any) => {
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript.trim();
        if (result.isFinal && text) {
          const id = ++idRef.current;
          setLines((prev) => [...prev, { id, source: text, translated: null }]);
          translateLine(id, text);
        } else {
          interimText += result[0].transcript;
        }
      }
      setInterim(interimText);
    };
    rec.onend = () => {
      // Chrome stops after silence — restart while the user wants to listen
      if (recognitionRef.current) rec.start();
    };
    rec.onerror = (e: { error?: string }) => {
      if (e.error === "not-allowed") {
        setSupported(true);
        stop();
        alert("Microphone permission denied — allow mic access and try again.");
      }
    };

    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  }

  function stop() {
    const rec = recognitionRef.current;
    recognitionRef.current = null; // prevents onend auto-restart
    rec?.stop();
    setListening(false);
    setInterim("");
  }

  useEffect(() => () => stop(), []); // stop on page leave
  // eslint-disable-next-line react-hooks/exhaustive-deps

  return (
    <div className="mx-auto flex h-full max-w-4xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-semibold">
            <Radio className="h-5 w-5 text-accent" /> Live Translate
          </h1>
          <p className="text-sm text-muted-foreground">
            Speak — captions appear instantly and are translated line by line.
          </p>
        </div>
        <Button
          size="lg"
          variant={listening ? "destructive" : "default"}
          onClick={listening ? stop : start}
          disabled={!supported}
        >
          {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          {listening ? "Stop" : "Start listening"}
        </Button>
      </div>

      {!supported && (
        <Card>
          <CardContent className="pt-5 text-sm text-destructive">
            Live speech recognition needs Chrome or Edge — this browser doesn&apos;t support it.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Languages</CardTitle>
          <CardDescription>
            Pick what you&apos;ll speak, and the language + native style to translate into.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>I speak</Label>
            <Select value={speechLang} onChange={(e) => setSpeechLang(e.target.value)}
                    disabled={listening}>
              {SPEECH_LANGS.map((l) => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Translate to</Label>
            <Select value={targetLang}
                    onChange={(e) => { setTargetLang(e.target.value); setStyle("auto"); }}>
              {(languages?.languages || []).map((l) => (
                <option key={l.code} value={l.code}>{l.name}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Style</Label>
            <Select value={style} onChange={(e) => setStyle(e.target.value)}>
              <option value="auto">Auto (natural)</option>
              {(styles?.styles || []).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="flex-1 overflow-hidden">
        <CardHeader className="flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            Captions
            {listening && (
              <span className="flex items-center gap-1.5 text-xs font-normal text-accent">
                <span className="h-2 w-2 animate-pulse rounded-full bg-accent" /> listening…
              </span>
            )}
          </CardTitle>
          {lines.length > 0 && (
            <Button size="sm" variant="ghost" onClick={() => setLines([])}>
              <Trash2 className="h-3.5 w-3.5" /> Clear
            </Button>
          )}
        </CardHeader>
        <CardContent className="studio-scroll h-full space-y-3 overflow-y-auto pb-6">
          {lines.length === 0 && !interim && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Press “Start listening” and speak — your words and their translation
              will appear here live.
            </p>
          )}
          {lines.map((line) => (
            <div key={line.id} className="rounded-xl border border-border/60 bg-card/40 p-3">
              <p className="text-sm text-muted-foreground">{line.source}</p>
              <p className={cn("mt-1 text-base", !line.translated && "animate-pulse text-muted-foreground")}>
                {line.translated ?? "translating…"}
              </p>
              {line.mock && (
                <Badge variant="warning" className="mt-2">
                  mock — connect an LLM for real translation
                </Badge>
              )}
            </div>
          ))}
          {interim && (
            <p className="px-1 text-sm italic text-muted-foreground/70">{interim}…</p>
          )}
          <div ref={bottomRef} />
        </CardContent>
      </Card>
    </div>
  );
}
