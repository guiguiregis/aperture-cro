import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "text-foreground",
        poor: "border-transparent bg-rose-500/15 text-rose-300",
        medium: "border-transparent bg-amber-400/15 text-amber-300",
        good: "border-transparent bg-emerald-400/15 text-emerald-300",
        high: "border-transparent bg-rose-500/15 text-rose-300",
        mid: "border-transparent bg-amber-400/15 text-amber-300",
        low: "border-transparent bg-sky-400/15 text-sky-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof badgeVariants>) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
