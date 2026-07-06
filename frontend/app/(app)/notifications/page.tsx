"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { api } from "@/lib/api";
import { timeAgo, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Notification {
  id: string; type: string; title: string; body: string;
  read: boolean; created_at: string;
}

export default function NotificationsPage() {
  const qc = useQueryClient();
  const { data: notifications } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api<Notification[]>("/notifications"),
  });
  const markAll = useMutation({
    mutationFn: () => api("/notifications/read-all", { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">Notifications</h1>
        <Button variant="outline" size="sm" onClick={() => markAll.mutate()}>
          <CheckCheck className="h-4 w-4" /> Mark all read
        </Button>
      </div>
      <Card>
        <CardContent className="divide-y pt-2">
          {(notifications || []).map((n) => (
            <div key={n.id} className={cn("flex gap-3 py-3", !n.read && "bg-accent/5")}>
              <Bell className={cn("mt-0.5 h-4 w-4", n.read ? "text-muted-foreground" : "text-accent")} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{n.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(n.created_at)}</span>
                </div>
                {n.body && <p className="text-sm text-muted-foreground">{n.body}</p>}
              </div>
            </div>
          ))}
          {notifications && notifications.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">All caught up.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
