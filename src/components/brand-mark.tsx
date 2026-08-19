import Link from "next/link";
import { Aperture } from "lucide-react";
import { cn } from "@/lib/utils";

export function BrandMark({
  className,
  href = "/",
}: {
  className?: string;
  href?: string;
}) {
  return (
    <Link href={href} className={cn("flex items-center gap-2 font-semibold tracking-tight", className)}>
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Aperture className="h-4 w-4" />
      </span>
      Aperture
    </Link>
  );
}
