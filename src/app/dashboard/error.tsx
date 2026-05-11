"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[DashboardError] Server component threw:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <h2 className="text-lg font-semibold text-gray-900">Something went wrong</h2>
      <p className="text-sm text-gray-500 max-w-sm">{error.message || "An unexpected error occurred."}</p>
      <Button onClick={reset} size="sm">Try again</Button>
    </div>
  );
}
