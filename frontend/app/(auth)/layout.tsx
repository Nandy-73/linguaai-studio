import Link from "next/link";
import { Languages } from "lucide-react";
import { ParallaxLayer } from "@/components/spatial/parallax-layer";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="spatial-field relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4">
      <ParallaxLayer speed={0.1} className="-left-10 top-16 h-56 w-56 rounded-full bg-accent/15 blur-3xl animate-float" />
      <ParallaxLayer speed={0.18} className="-right-10 bottom-10 h-64 w-64 rounded-full bg-success/12 blur-3xl animate-float" />
      <Link href="/" className="relative mb-8 flex items-center gap-2 font-display text-xl font-semibold">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <Languages className="h-5 w-5" />
        </span>
        LinguaAI Studio
      </Link>
      <div className="relative w-full max-w-sm">{children}</div>
    </div>
  );
}
