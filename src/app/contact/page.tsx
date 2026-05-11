"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircleIcon, MailIcon, MessageSquareIcon, SendIcon } from "lucide-react";

const SUBJECTS = [
  "General enquiry",
  "Billing / payment issue",
  "Technical problem",
  "Feature request",
  "Account / access issue",
  "Other",
];

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
    if (error) setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
      } else {
        setSuccess(true);
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-gray-900 text-lg">
            <img src="/logo.png" alt="GTransfer" className="w-16 h-16 object-contain" />
            GTransfer
          </Link>
          <Link href="/login" className="text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
            Get started
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-16">

        {success ? (
          /* ── Success state ── */
          <div className="text-center py-16 space-y-5">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircleIcon className="w-9 h-9 text-green-500" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Message sent!</h1>
            <p className="text-gray-500 text-sm max-w-sm mx-auto">
              Thanks for reaching out. We&apos;ll get back to you at <strong>{form.email}</strong> within 24–48 hours.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
              <Button variant="outline" onClick={() => { setSuccess(false); setForm({ name: "", email: "", subject: "", message: "" }); }}>
                Send another message
              </Button>
              <Button asChild>
                <Link href="/">Back to home</Link>
              </Button>
            </div>
          </div>
        ) : (
          /* ── Form ── */
          <>
            {/* Header */}
            <div className="mb-10">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <MessageSquareIcon className="w-5 h-5 text-blue-600" />
                </div>
                <h1 className="text-3xl font-extrabold text-gray-900">Contact us</h1>
              </div>
              <p className="text-gray-500 text-sm leading-relaxed">
                Have a question, issue, or feedback? Fill in the form below and we&apos;ll respond within 24–48 hours.
                Alternatively, email us directly at{" "}
                <a href="mailto:support@gtransfer.app" className="text-blue-600 hover:underline font-medium">
                  support@gtransfer.app
                </a>.
              </p>
            </div>

            <Card className="shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <MailIcon className="w-4 h-4 text-gray-400" />
                  Send us a message
                </CardTitle>
                <CardDescription>All fields are required.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-5">

                  {/* Name + Email row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                        Your name
                      </label>
                      <input
                        id="name"
                        type="text"
                        placeholder="Jane Smith"
                        value={form.name}
                        onChange={e => set("name", e.target.value)}
                        required
                        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                        Email address
                      </label>
                      <input
                        id="email"
                        type="email"
                        placeholder="jane@example.com"
                        value={form.email}
                        onChange={e => set("email", e.target.value)}
                        required
                        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      />
                    </div>
                  </div>

                  {/* Subject */}
                  <div className="space-y-1.5">
                    <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
                      Subject
                    </label>
                    <select
                      id="subject"
                      value={form.subject}
                      onChange={e => set("subject", e.target.value)}
                      required
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    >
                      <option value="" disabled>Select a topic…</option>
                      {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  {/* Message */}
                  <div className="space-y-1.5">
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700">
                      Message
                    </label>
                    <textarea
                      id="message"
                      rows={6}
                      placeholder="Describe your question or issue in detail…"
                      value={form.message}
                      onChange={e => set("message", e.target.value)}
                      required
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
                    />
                  </div>

                  {/* Error */}
                  {error && (
                    <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                      {error}
                    </p>
                  )}

                  {/* Submit */}
                  <Button type="submit" className="w-full h-11 text-base gap-2" disabled={loading}>
                    {loading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        Sending…
                      </>
                    ) : (
                      <>
                        <SendIcon className="w-4 h-4" />
                        Send message
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-gray-400 text-center">
                    We aim to reply within 24–48 hours on business days.
                  </p>
                </form>
              </CardContent>
            </Card>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8 mt-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-400">
            GTransfer is an independent tool and is not affiliated with, sponsored by, or endorsed by Google LLC.
          </p>
          <div className="flex gap-5 text-xs text-gray-400">
            <Link href="/terms"   className="hover:text-gray-700 transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-gray-700 transition-colors">Privacy</Link>
            <Link href="/"        className="hover:text-gray-700 transition-colors">Home</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
