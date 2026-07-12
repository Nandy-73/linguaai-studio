"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, setTokens } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: oauth } = useQuery({
    queryKey: ["oauth-providers"],
    queryFn: () => api<{ providers: string[] }>("/auth/oauth-providers"),
    retry: false,
  });
  const providers = oauth?.providers ?? [];

  // OAuth callback: tokens arrive in the URL fragment
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const access = hash.get("access_token");
    const refresh = hash.get("refresh_token");
    if (access && refresh) {
      setTokens(access, refresh);
      router.replace("/dashboard");
    }
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api<{ access_token: string; refresh_token: string }>(
        "/auth/login", { method: "POST", json: { email, password } });
      setTokens(data.access_token, data.refresh_token);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome back</CardTitle>
        <CardDescription>Sign in to your workspace</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email}
                   onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required value={password}
                   onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        {providers.length > 0 && (
          <>
            <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
            </div>
            <div className={`grid gap-2 ${
              providers.length === 1 ? "grid-cols-1" : providers.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>

              {providers.map((p) => (
                <a key={p} href={`/api/v1/auth/oauth/${p}`}>
                  <Button variant="outline" className="w-full capitalize" size="sm">{p}</Button>
                </a>
              ))}
            </div>
          </>
        )}
        <p className="mt-4 text-center text-sm text-muted-foreground">
          No account?{" "}
          <Link href="/register" className="text-accent hover:underline">Start free</Link>
        </p>
      </CardContent>
    </Card>
  );
}
