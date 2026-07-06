import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const groups = [
  {
    title: "Localization pipelines",
    items: [
      ["Video Translation", "Subtitles, dubbed audio or fully rendered dubbed video — per target language, from one upload."],
      ["Audio & Podcast Translation", "Voice-preserving episode localization with music beds intact and per-language show notes."],
      ["Movie Translation", "Long-form pipelines: scene segmentation, character-consistent voices, broadcast subtitle presets."],
      ["Meeting Translation", "Recorded meetings become speaker-attributed translated transcripts with action items."],
      ["Document Translation", "Text formats translated with structure preserved, sharing project glossaries."],
      ["Subtitle Translation", "Import existing SRT/VTT and translate with timing and constraints respected."],
    ],
  },
  {
    title: "The AI engine",
    items: [
      ["LACTE", "The Language-Aware Contextual Translation Engine translates with document context, emotion and idiom awareness — not sentence-by-sentence."],
      ["Native style selection", "Per language, the engine picks (or you pin) the natural variety: spoken Tamil vs Tanglish, keigo vs casual, Sie vs du."],
      ["Multi-speaker detection & diarization", "Who speaks when — every speaker gets an ID, a category (adult/teen/child/elder/narrator) and a consistent voice."],
      ["Emotion preservation", "Affect detected from the original audio guides translation tone and synthesis."],
      ["AI dubbing with isochrony", "Dubbed speech fits the original rhythm — pauses and speaking speed preserved."],
      ["Voice cloning with consent", "Every cloned voice carries a visible consent record. Revocation deletes it, everywhere, immediately."],
    ],
  },
  {
    title: "Studios & workspace",
    items: [
      ["Subtitle Studio", "Segment-level editing with per-segment quality scores and one-click export to SRT/VTT."],
      ["Timeline Editor", "Original vs dub side by side, per-segment A/B listening and regeneration."],
      ["Voice Studio", "Your organization's voice library: clones, stock voices, auditions."],
      ["AI Chat & Summary", "Ask your media questions; get chapters, summaries and explanations in any language."],
      ["Team Workspace", "Organizations, roles, invitations — viewer to owner, enforced everywhere."],
      ["API & Webhooks", "Everything the UI does, scriptable. Keys scoped and revocable."],
    ],
  },
];

export default function FeaturesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="font-display text-4xl font-semibold">Features</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Everything below ships in the platform today or is visibly on the run ribbon as
        an experimental stage — no vaporware.
      </p>
      {groups.map((group) => (
        <section key={group.title} className="mt-12">
          <h2 className="mb-6 font-display text-2xl font-semibold">{group.title}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {group.items.map(([title, body]) => (
              <Card key={title}>
                <CardHeader>
                  <CardTitle className="text-base">{title}</CardTitle>
                  <CardDescription>{body}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
