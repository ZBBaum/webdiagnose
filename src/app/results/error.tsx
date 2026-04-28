"use client";

import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="min-h-[calc(100vh-76px)] flex items-center justify-center px-6">
      <div className="flex flex-col items-center gap-4 text-center max-w-sm">
        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-lg">
          ✕
        </div>
        <h2 className="text-lg font-semibold text-foreground">Audit failed</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">{error.message}</p>
        <div className="flex items-center gap-3 mt-2">
          <Button onClick={reset} size="sm">Try again</Button>
          <a href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Go back
          </a>
        </div>
      </div>
    </div>
  );
}
