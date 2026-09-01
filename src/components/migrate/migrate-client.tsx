"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Database, Upload, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

type ParsedRow = {
  email: string;
  full_name: string;
  role: string;
  valid: boolean;
  error?: string;
};

const VALID_ROLES = ["cadet", "nco", "snco", "officer", "parent"];

function parseCSV(text: string): ParsedRow[] {
  const lines = text.trim().split("\n").filter((l) => l.trim());
  if (lines.length === 0) return [];

  // Check if first line is a header
  const firstLower = lines[0].toLowerCase();
  const hasHeader = firstLower.includes("email") || firstLower.includes("name");
  const dataLines = hasHeader ? lines.slice(1) : lines;

  return dataLines.map((line) => {
    const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    const email = cols[0] ?? "";
    const full_name = cols[1] ?? "";
    const role = (cols[2] ?? "cadet").toLowerCase();

    if (!email || !email.includes("@")) {
      return { email, full_name, role, valid: false, error: "Invalid email" };
    }
    if (!VALID_ROLES.includes(role)) {
      return { email, full_name, role, valid: false, error: `Unknown role "${role}"` };
    }
    return { email, full_name, role, valid: true };
  });
}

export function MigrateClient() {
  const [csv, setCsv] = useState("");
  const [parsed, setParsed] = useState<ParsedRow[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState<{ success: number; skipped: number } | null>(null);

  const handleParse = () => {
    if (!csv.trim()) return;
    const rows = parseCSV(csv);
    setParsed(rows);
    setDone(null);
  };

  const handleImport = async () => {
    if (!parsed) return;
    const valid = parsed.filter((r) => r.valid);
    if (valid.length === 0) return;

    setImporting(true);
    const supabase = createClient();

    let success = 0;
    let skipped = 0;

    for (const row of valid) {
      const { error } = await supabase
        .from("allowed_emails")
        .upsert(
          { email: row.email, full_name: row.full_name || null, role: row.role },
          { onConflict: "email", ignoreDuplicates: false }
        );
      if (error) {
        if (error.code === "23505") {
          skipped++;
        } else {
          toast.error(`${row.email}: ${error.message}`);
        }
      } else {
        success++;
      }
    }

    setImporting(false);
    setDone({ success, skipped });
    toast.success(`Imported ${success} email${success !== 1 ? "s" : ""}${skipped > 0 ? `, ${skipped} already existed` : ""}`);
  };

  const validCount = parsed?.filter((r) => r.valid).length ?? 0;
  const invalidCount = parsed?.filter((r) => !r.valid).length ?? 0;

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center gap-2">
        <Database className="h-5 w-5 text-[#003087]" />
        <h1 className="text-xl font-bold text-gray-900">Data Migration</h1>
        <Badge className="bg-red-100 text-red-700 border-red-200">Command Only</Badge>
      </div>

      <p className="text-sm text-gray-600">
        Bulk-add members to the allow list. Each imported email can then sign in with Google OAuth
        to create their own profile. Existing entries are updated in place.
      </p>

      <Card className="p-4 space-y-3">
        <div>
          <Label className="text-sm font-semibold">CSV Format</Label>
          <p className="mt-1 text-xs text-gray-500">
            One row per member: <code className="rounded bg-gray-100 px-1">email, full_name, role</code>
          </p>
          <p className="text-xs text-gray-400">
            Valid roles: <code className="rounded bg-gray-100 px-1">cadet · nco · snco · officer · parent</code>
            {" "}· Header row optional · full_name optional
          </p>
        </div>
        <p className="rounded bg-gray-50 px-3 py-2 font-mono text-xs text-gray-600">
          email,full_name,role<br />
          smith.j@gmail.com,John Smith,cadet<br />
          jones.a@gmail.com,Alice Jones,nco<br />
          doe.b@gmail.com,,cadet
        </p>
      </Card>

      <div className="space-y-2">
        <Label>Paste CSV</Label>
        <Textarea
          value={csv}
          onChange={(e) => { setCsv(e.target.value); setParsed(null); setDone(null); }}
          placeholder={"email,full_name,role\nsmith.j@gmail.com,John Smith,cadet"}
          rows={8}
          className="font-mono text-sm"
        />
      </div>

      <div className="flex gap-2">
        <Button onClick={handleParse} variant="outline" disabled={!csv.trim()}>
          Preview ({csv.trim().split("\n").filter((l) => l.trim()).length} rows)
        </Button>
        {parsed && validCount > 0 && (
          <Button
            onClick={handleImport}
            disabled={importing}
            className="bg-[#003087] hover:bg-[#002266]"
          >
            <Upload className="mr-1.5 h-4 w-4" />
            {importing ? "Importing…" : `Import ${validCount} email${validCount !== 1 ? "s" : ""}`}
          </Button>
        )}
      </div>

      {done && (
        <Card className="p-4 bg-green-50 border-green-200">
          <div className="flex items-center gap-2 text-green-800">
            <CheckCircle className="h-5 w-5" />
            <span className="font-semibold">Import complete</span>
          </div>
          <p className="mt-1 text-sm text-green-700">
            {done.success} added · {done.skipped} already existed (updated)
          </p>
          <p className="mt-1 text-xs text-green-600">
            These members can now sign in with Google using their imported email address.
          </p>
        </Card>
      )}

      {parsed && (
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-sm">
            <span className="flex items-center gap-1 text-green-700">
              <CheckCircle className="h-4 w-4" /> {validCount} valid
            </span>
            {invalidCount > 0 && (
              <span className="flex items-center gap-1 text-red-600">
                <XCircle className="h-4 w-4" /> {invalidCount} invalid
              </span>
            )}
          </div>

          <div className="divide-y rounded-xl border bg-white overflow-hidden">
            {parsed.map((row, i) => (
              <div key={i} className={`flex items-center gap-3 px-4 py-2.5 text-sm ${!row.valid ? "bg-red-50" : ""}`}>
                {row.valid
                  ? <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />
                  : <XCircle className="h-4 w-4 shrink-0 text-red-500" />
                }
                <span className="flex-1 truncate font-medium text-gray-900">{row.email}</span>
                <span className="text-gray-500 truncate">{row.full_name || "—"}</span>
                <Badge variant="outline" className="text-xs capitalize shrink-0">{row.role}</Badge>
                {row.error && (
                  <span className="flex items-center gap-1 text-xs text-red-600 shrink-0">
                    <AlertTriangle className="h-3 w-3" /> {row.error}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
