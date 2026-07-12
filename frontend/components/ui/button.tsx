import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-accent text-accent-foreground hover:bg-accent/90 shadow-[inset_0_1px_0_0_hsl(0_0%_100%/0.35),0_4px_12px_-4px_hsl(var(--accent)/0.5)]",
        secondary:
          "bg-muted/60 text-foreground backdrop-blur-md hover:bg-muted/80 shadow-[inset_0_1px_0_0_hsl(0_0%_100%/0.3)]",
        outline:
          "border border-border/60 bg-card/40 backdrop-blur-md hover:bg-card/70 shadow-[inset_0_1px_0_0_hsl(0_0%_100%/0.3)]",
        ghost: "hover:bg-muted/60 hover:backdrop-blur-md",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 shadow-[inset_0_1px_0_0_hsl(0_0%_100%/0.25)]",
      },
      size: {
        default: "h-9 px-4",
        sm: "h-8 px-3 text-xs",
        lg: "h-11 px-6 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  )
);
Button.displayName = "Button";
