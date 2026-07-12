import Link from "next/link";
import {
  AudioLines, Bot, Clapperboard, FileText, Globe2, Mic2,
  MonitorPlay, Sparkles, Users,
} from "lucide-react";
import { HeroRibbon } from "@/components/marketing/hero-ribbon";
import { ParallaxLayer } from "@/components/spatial/parallax-layer";
import { TiltCard } from "@/components/spatial/tilt-card";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const capabilities = [
  { icon: MonitorPlay, title: "Video Translation", body: "Upload any video, receive subtitles or a fully dubbed version — voices, timing and emotion preserved." },
  { icon: AudioLines, title: "Audio & Podcasts", body: "Episodes localized with host voices intact. Music beds preserved, loudness broadcast-normalized." },
  { icon: Clapperboard, title: "Movies", body: "Multi-character casting, scene-aware consistency, broadcast subtitle specs. Cinema-grade output." },
  { icon: FileText, title: "Documents", body: "Layout-preserving translation for text-based formats, sharing glossaries with your media projects." },
  { icon: Users, title: "Multi-Speaker Dubbing", body: "Every speaker detected, diarized and voiced distinctly — adult, teen, child, elder or narrator." },
  { icon: Mic2, title: "Voice Cloning", body: "Consent-gated voice identity that speaks every target language. Revocable, always." },
  { icon: Globe2, title: "100+ Languages, Native Styles", body: "Not just Tamil — spoken Tamil, literary Tamil or Tanglish. Not just German — Sie, du or Swiss. The engine picks what a native would." },
  { icon: Bot, title: "AI Chat & Summaries", body: "Ask questions about any video, get timestamped answers, chapters and show notes in every language." },
  { icon: Sparkles, title: "Quality You Can See", body: "Per-segment quality scores route your attention to exactly the lines that need review." },
];

export default function LandingPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pb-20 pt-24">
        <ParallaxLayer speed={0.15} className="left-[8%] top-10 h-40 w-40 rounded-full bg-accent/20 blur-3xl animate-float" />
        <ParallaxLayer speed={0.3} className="right-[10%] top-32 h-56 w-56 rounded-full bg-success/15 blur-3xl animate-float" />
        <ParallaxLayer speed={0.08} className="left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-accent/10 blur-3xl" />

        <div className="relative mx-auto max-w-4xl text-center">
          <p className="mb-4 inline-block rounded-full border px-3 py-1 text-xs text-muted-foreground">
            The AI multimedia localization platform
          </p>
          <h1 className="font-display text-5xl font-semibold leading-tight md:text-6xl">
            Your content, native in{" "}
            <span className="text-accent">every language</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            LinguaAI Studio translates, dubs and subtitles video, audio and documents
            into 100+ languages — with the right regional style, preserved voices and
            emotions, and a professional studio for the final 5%.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link href="/register"><Button size="lg">Start free — 300 credits</Button></Link>
            <Link href="/features"><Button size="lg" variant="outline">See how it works</Button></Link>
          </div>
        </div>
        <div className="relative mt-16 px-2">
          <HeroRibbon />
        </div>
      </section>

      {/* Capabilities */}
      <section className="border-t px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center font-display text-3xl font-semibold">
            One platform. Every localization job.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
            Built as a pipeline, not a toy: every stage inspectable, every output reviewable.
          </p>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {capabilities.map(({ icon: Icon, title, body }) => (
              <TiltCard key={title} depth={1} className="animate-fade-up">
                <CardHeader>
                  <span className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15 text-accent">
                    <Icon className="h-5 w-5" />
                  </span>
                  <CardTitle>{title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">{body}</CardContent>
              </TiltCard>
            ))}
          </div>
        </div>
      </section>

      {/* Honest CTA */}
      <section className="px-4 py-20 text-center">
        <h2 className="font-display text-3xl font-semibold">
          94% automated. 100% reviewable.
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          We show you quality scores per segment instead of pretending AI is perfect.
          Fix the flagged lines in minutes, export with confidence.
        </p>
        <Link href="/register" className="mt-8 inline-block">
          <Button size="lg">Localize your first video</Button>
        </Link>
      </section>
    </>
  );
}
