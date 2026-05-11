"use client";

import { useEffect } from "react";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[RootError] Page-level error:", error.message, error);
  }, [error]);

  return (
    <div style={{ padding: 40, fontFamily: "sans-serif", textAlign: "center" }}>
      <h2>Something went wrong</h2>
      <p style={{ color: "#555", maxWidth: 400, margin: "0 auto" }}>
        {error.message || "An unexpected error occurred."}
      </p>
      <button onClick={reset} style={{ marginTop: 16, padding: "8px 20px", cursor: "pointer" }}>
        Try again
      </button>
    </div>
  );
}
