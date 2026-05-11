"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlusIcon, Trash2Icon, RefreshCwIcon, CheckCircleIcon, AlertCircleIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";

interface ConnectedAccount {
  id: string;
  google_email: string;
  display_name: string | null;
  avatar_url: string | null;
  role: "primary" | "secondary";
  created_at: string;
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const justConnected = searchParams.get("connected") === "true";
  const connectError = searchParams.get("error");

  useEffect(() => {
    fetchAccounts();
  }, []);

  async function fetchAccounts() {
    setLoading(true);
    const res = await fetch("/api/accounts");
    if (!res.ok) { setLoading(false); return; }
    const { accounts } = await res.json();
    setAccounts(accounts ?? []);
    setLoading(false);
  }

  async function disconnectAccount(id: string) {
    if (!confirm("Disconnect this account? Any active transfers using it will fail.")) return;
    setDeleting(id);
    await fetch("/api/accounts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId: id }),
    });
    await fetchAccounts();
    setDeleting(null);
  }

  function connectNewAccount() {
    window.location.href = "/api/auth/google/connect";
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Connected Accounts</h1>
        <p className="text-gray-500 mt-1">
          Connect multiple Google accounts to transfer files between them. The first account you connect becomes your primary account.
        </p>
      </div>

      {/* Status banners */}
      {justConnected && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          <CheckCircleIcon className="w-4 h-4 shrink-0" />
          Account connected successfully!
        </div>
      )}
      {connectError && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircleIcon className="w-4 h-4 shrink-0" />
          {connectError === "oauth_denied" ? "Connection cancelled." :
           connectError === "invalid_state" ? "Security check failed. Please try again." :
           "Failed to connect account. Please try again."}
        </div>
      )}

      {/* Accounts list */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Your Google Accounts</CardTitle>
              <CardDescription>
                {accounts.length === 0
                  ? "Connect your first Google account to get started."
                  : `${accounts.length} account${accounts.length !== 1 ? "s" : ""} connected`}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" onClick={fetchAccounts} disabled={loading}>
                <RefreshCwIcon className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
              <Button onClick={connectNewAccount} size="sm">
                <PlusIcon className="w-4 h-4" />
                Add Account
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="divide-y divide-gray-100">
          {loading ? (
            <div className="py-8 text-center text-gray-400 text-sm">Loading accounts…</div>
          ) : accounts.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-gray-500 mb-4">No accounts connected yet.</p>
              <Button onClick={connectNewAccount}>
                <PlusIcon className="w-4 h-4" />
                Connect Google Account
              </Button>
            </div>
          ) : (
            accounts.map((acc) => (
              <div key={acc.id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                {acc.avatar_url ? (
                  <img src={acc.avatar_url} alt="" className="w-10 h-10 rounded-full" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center font-semibold text-gray-600">
                    {acc.google_email[0].toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{acc.google_email}</p>
                  {acc.display_name && (
                    <p className="text-sm text-gray-500 truncate">{acc.display_name}</p>
                  )}
                </div>
                <Badge variant={acc.role === "primary" ? "default" : "secondary"}>
                  {acc.role}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-gray-400 hover:text-red-600"
                  onClick={() => disconnectAccount(acc.id)}
                  disabled={deleting === acc.id}
                >
                  <Trash2Icon className="w-4 h-4" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Info card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <h3 className="font-medium text-blue-900 mb-1">About account roles</h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li><strong>Primary</strong> — your main Google account (first connected)</li>
            <li><strong>Secondary</strong> — additional accounts you can transfer files to/from</li>
            <li>You can connect as many secondary accounts as you need</li>
            <li>You can transfer in any direction between any two connected accounts</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
