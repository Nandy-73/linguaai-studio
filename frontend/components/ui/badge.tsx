import { cn } from "@/lib/utils";

const styles: Record<string, string> = {
  default: "bg-muted text-muted-foreground",
  accent: "bg-accent/15 text-accent",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  destructive: "bg-destructive/15 text-destructive",
};

export function Badge({
  variant = "default",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: keyof typeof styles }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        styles[variant],
        className
      )}
      {...props}
    />
  );
}

export function statusVariant(status: string): keyof typeof styles {
  switch (status) {
    case "succeeded": return "success";
    case "failed": return "destructive";
    case "running": case "queued": return "accent";
    case "canceled": return "warning";
    default: return "default";
  }
}
