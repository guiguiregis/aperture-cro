"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { FindingMarker } from "@/components/audit/finding-marker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Suggestion } from "@/types/audit";

function impactVariant(impact: Suggestion["impact"]) {
  if (impact === "HIGH") return "high" as const;
  if (impact === "MEDIUM") return "mid" as const;
  return "low" as const;
}

function CodeBlock({ label, code }: { label: string; code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-background">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <Button
          variant="ghost"
          size="sm"
          onClick={(event) => {
            event.stopPropagation();
            void copy();
          }}
          className="h-7 px-2"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-[11px] leading-5 text-emerald-100/90">
        {code}
      </pre>
    </div>
  );
}

export function SuggestionCard({
  suggestion,
  markerId,
  active = false,
  onSelect,
}: {
  suggestion: Suggestion;
  markerId?: string;
  active?: boolean;
  onSelect?: () => void;
}) {
  return (
    <Card
      id={markerId ? `suggestion-${markerId}` : undefined}
      className={cn(
        "scroll-mt-3 transition-shadow",
        onSelect && "cursor-pointer",
        active && "ring-2 ring-primary",
      )}
      onClick={onSelect}
    >
      <CardHeader className="space-y-3">
        <div className="flex items-start gap-3">
          {markerId ? <FindingMarker id={markerId} impact={suggestion.impact} className="mt-0.5" /> : null}
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {markerId ? (
                <Badge variant="outline">Preview pin {markerId}</Badge>
              ) : null}
              <Badge variant="secondary">{suggestion.category}</Badge>
              <Badge variant={impactVariant(suggestion.impact)}>{suggestion.impact} impact</Badge>
            </div>
            <h3 className="text-lg font-semibold">{suggestion.title}</h3>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{suggestion.reasoning}</p>
        <p className="font-mono text-xs text-primary/80">{suggestion.selector}</p>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2">
        <CodeBlock label="Current code / element" code={suggestion.currentCodeSnippet} />
        <CodeBlock label="Suggested optimization" code={suggestion.suggestedCodeSnippet} />
      </CardContent>
    </Card>
  );
}
