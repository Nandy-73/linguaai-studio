import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const posts = [
  {
    title: "Why 'formal or informal' isn't enough: a variety ontology for machine translation",
    date: "2026-06-20",
    excerpt: "Tanglish is not a checkbox. Keigo is not a tone. How we factorized language varieties into nine measurable axes — and why your dubs sound native because of it.",
  },
  {
    title: "Dubbing that breathes: isochrony-constrained translation",
    date: "2026-06-02",
    excerpt: "A dubbed line that runs 20% long ruins the scene. We translate to a duration budget before synthesis, so the rhythm of the original survives.",
  },
  {
    title: "Consent is a feature: how voice cloning should work",
    date: "2026-05-15",
    excerpt: "Every cloned voice in LinguaAI Studio carries a visible consent seal, and revocation deletes the voice everywhere. Here's the architecture behind that promise.",
  },
];

export default function BlogPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="font-display text-4xl font-semibold">Blog</h1>
      <p className="mt-3 text-muted-foreground">Research notes and engineering from the team.</p>
      <div className="mt-10 space-y-4">
        {posts.map((post) => (
          <Card key={post.title} className="cursor-pointer transition-shadow hover:shadow-md">
            <CardHeader>
              <p className="text-xs text-muted-foreground">{post.date}</p>
              <CardTitle className="text-lg leading-snug">{post.title}</CardTitle>
              <CardDescription>{post.excerpt}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
