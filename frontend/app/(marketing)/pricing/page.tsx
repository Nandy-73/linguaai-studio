import Link from "next/link";
import { Check } from "lucide-react";
import { TiltCard } from "@/components/spatial/tilt-card";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const plans = [
  { id: "free", name: "Free", price: "$0", credits: "300 credits/mo",
    features: ["~30 min transcription", "Subtitles in any language", "1 seat", "Watermarked exports"] },
  { id: "creator", name: "Creator", price: "$24", credits: "3,000 credits/mo", popular: true,
    features: ["AI dubbing (open engines)", "2 voice clones", "3 seats", "No watermark", "All native styles"] },
  { id: "studio", name: "Studio", price: "$89", credits: "15,000 credits/mo",
    features: ["Premium voice engines", "10 voice clones", "API access", "Priority queue", "Analytics"] },
  { id: "business", name: "Business", price: "$399", credits: "80,000 credits/mo",
    features: ["Per-project access control", "SLA", "Advanced analytics", "Dedicated support"] },
];

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="text-center font-display text-4xl font-semibold">Pricing</h1>
      <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
        Credits map to actual compute — you see the exact cost of every run before it
        starts, and a hard cap protects you by default.
      </p>
      <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => (
          <TiltCard key={plan.id} depth={plan.popular ? 3 : 2}
                    innerClassName={plan.popular ? "ring-1 ring-accent" : ""}>
            <CardHeader>
              {plan.popular && (
                <span className="mb-1 w-fit rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent">
                  Most popular
                </span>
              )}
              <CardTitle>{plan.name}</CardTitle>
              <div className="mt-2">
                <span className="font-display text-4xl font-semibold">{plan.price}</span>
                <span className="text-sm text-muted-foreground">/month</span>
              </div>
              <p className="text-sm text-muted-foreground">{plan.credits}</p>
            </CardHeader>
            <CardContent>
              <ul className="mb-6 space-y-2 text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" /> {f}
                  </li>
                ))}
              </ul>
              <Link href="/register">
                <Button className="w-full" variant={plan.popular ? "default" : "outline"}>
                  Get started
                </Button>
              </Link>
            </CardContent>
          </TiltCard>
        ))}
      </div>
      <p className="mt-8 text-center text-sm text-muted-foreground">
        Enterprise (SSO, engine allowlists, invoicing) — contact us.
      </p>
    </div>
  );
}
