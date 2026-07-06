import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-4">
        <div>
          <div className="font-display text-lg font-semibold">LinguaAI Studio</div>
          <p className="mt-2 text-sm text-muted-foreground">
            AI multimedia localization — subtitles, dubbing and documents in 100+
            languages with native styles.
          </p>
        </div>
        <div className="text-sm">
          <div className="mb-3 font-medium">Product</div>
          <ul className="space-y-2 text-muted-foreground">
            <li><Link href="/features" className="hover:text-foreground">Features</Link></li>
            <li><Link href="/pricing" className="hover:text-foreground">Pricing</Link></li>
            <li><Link href="/docs" className="hover:text-foreground">API Docs</Link></li>
          </ul>
        </div>
        <div className="text-sm">
          <div className="mb-3 font-medium">Company</div>
          <ul className="space-y-2 text-muted-foreground">
            <li><Link href="/blog" className="hover:text-foreground">Blog</Link></li>
            <li><a href="#" className="hover:text-foreground">Quality manifesto</a></li>
            <li><a href="#" className="hover:text-foreground">Trust center</a></li>
          </ul>
        </div>
        <div className="text-sm">
          <div className="mb-3 font-medium">Legal</div>
          <ul className="space-y-2 text-muted-foreground">
            <li><a href="#" className="hover:text-foreground">Privacy</a></li>
            <li><a href="#" className="hover:text-foreground">Terms</a></li>
            <li><a href="#" className="hover:text-foreground">Voice consent policy</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} LinguaAI Studio. Synthetic media is always labeled.
      </div>
    </footer>
  );
}
