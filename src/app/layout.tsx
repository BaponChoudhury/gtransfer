import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import FetchMonitor from "@/components/FetchMonitor";
import Script from "next/script";
import { GoogleAnalytics } from "@next/third-parties/google";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

export const metadata: Metadata = {
  title: "GTransfer — Transfer Files Between Google Accounts",
  description: "Move files between Google accounts, Gmail attachments, and cloud storage providers.",
  icons: { icon: "/logo.png", apple: "/logo.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="min-h-full bg-gray-50 antialiased">
        {/* beforeInteractive runs before React — catches JSON.parse(html) at the earliest possible moment */}
        {process.env.NODE_ENV === "development" && (
          <Script src="/debug-monitor.js" strategy="beforeInteractive" />
        )}
        <FetchMonitor />
        {children}
        <GoogleAnalytics gaId="G-F0ECCV170C" />
      </body>
    </html>
  );
}
