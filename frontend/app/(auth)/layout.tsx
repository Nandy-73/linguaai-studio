import Link from "next/link";
import { Languages } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <Link href="/" className="mb-8 flex items-center gap-2 font-display text-xl font-semibold">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <Languages className="h-5 w-5" />
        </span>
        LinguaAI Studio
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
