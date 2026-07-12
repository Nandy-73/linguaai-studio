"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { RibbonNav } from "@/components/app/ribbon-nav";
import { getTokens } from "@/lib/api";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("lai_theme") === "dark") {
      document.documentElement.classList.add("dark");
    }
    if (!getTokens().access) {
      router.replace("/login");
    } else {
      setReady(true);
    }
  }, [router]);

  if (!ready) return null;

  return (
    <div className="spatial-field flex h-screen flex-col overflow-hidden">
      <RibbonNav />
      <main className="studio-scroll flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
