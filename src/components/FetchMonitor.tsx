"use client";

import { useEffect } from "react";

export default function FetchMonitor() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    console.warn("[FetchMonitor] ✅ MOUNTED — intercepting all fetch + JSON.parse calls");

    // Intercept global fetch to log any response returning HTML
    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
      const res = await originalFetch.apply(this, args);
      const ct = res.headers.get("content-type") ?? "";
      if (ct.includes("text/html")) {
        const url = typeof args[0] === "string" ? args[0]
          : args[0] instanceof Request ? args[0].url
          : String(args[0]);
        console.error(
          `[FetchMonitor] ⚠️ HTML response from fetch!\n` +
          `  URL: ${url}\n` +
          `  Status: ${res.status}\n` +
          `  Content-Type: ${ct}`
        );
      }
      return res;
    };

    // Intercept JSON.parse to catch HTML being parsed anywhere
    const originalParse = JSON.parse;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (JSON as any).parse = function (text: string, reviver?: (this: unknown, key: string, value: unknown) => unknown) {
      if (typeof text === "string" && text.trimStart().startsWith("<")) {
        console.error(
          `[FetchMonitor] ⚠️ JSON.parse called with HTML!\n` +
          `  Preview: ${text.slice(0, 300)}\n` +
          `  Stack:\n${new Error().stack}`
        );
      }
      return originalParse.call(JSON, text, reviver);
    };

    return () => {
      window.fetch = originalFetch;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (JSON as any).parse = originalParse;
    };
  }, []);

  return null;
}
