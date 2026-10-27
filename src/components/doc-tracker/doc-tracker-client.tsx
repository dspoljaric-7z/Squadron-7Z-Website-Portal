"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CheckCircle2, XCircle, AlertCircle, Plus, Settings, Trash2, FileCheck, Clock, Download, Users } from "lucide-react";
import { format, parseISO, addYears, addDays, isAfter, isBefore } from "date-fns";
import { toast } from "sonner";
import { isSeniorStaff, isStaff } from "@/lib/permissions";
import { collectDocument, addDocumentType, deactivateDocumentType, selfReportDocument, confirmDocumentSubmission, bulkCollectDocument } from "@/app/(app)/settings/actions";
import type { Profile } from "@/types/database";

type DocType = {
  id: string;
  name: string;
  description: string | null;
  frequency: string;
  required: boolean;
  active: boolean;
  sort_order: number;
};

type Submission = {
  id: string;
  cadet_id: string;
  document_type_id: string;
  collected_at: string;
  expiry_date: string | null;
  notes: string | null;
  status: string;
  collected_by_profile: { full_name: string } | null;
};

type Cadet = { id: string; full_name: string; rank: string | null; division_id: string | null };

const FREQ_LABELS: Record<string, string> = {
  one_time: "One-time",
  annual: "Annual",
  per_event: "Per Event",
};

const FREQ_COLORS: Record<string, string> = {
  one_time: "bg-green-50 text-green-700 border-green-200",
  annual: "bg-blue-50 text-blue-700 border-blue-200",
  per_event: "bg-amber-50 text-amber-800 border-amber-200",
};

function isExpired(submission: Submission, freq: string): boolean {
  if (freq === "one_time") return false;
  if (submission.expiry_date) return new Date(submission.expiry_date) < new Date();
  if (freq === "annual") {
    const collected = new Date(submission.collected_at);
    return addYears(collected, 1) < new Date();
  }
  return false;
}

function getExpiryDate(submission: Submission, freq: string): Date | null {
  if (freq === "one_time") return null;
  if (submission.expiry_date) return new Date(submission.expiry_date);
  if (freq === "annual") return addYears(new Date(submission.collected_at), 1);
  return null;
}

export function DocTrackerClient({
  profile,
  docTypes,
  submissions,
  cadets,
}: {
  profile: Profile;
  docTypes: DocType[];
  submissions: Submission[];
  cadets: Cadet[];
}) {
  const router = useRouter();
  const canManage = isSeniorStaff(profile);
  const canMark = isStaff(profile);
  const isOwnView = !isStaff(profile);

  const [searchQ, setSearchQ] = useState("");
  const [collectDialog, setCollectDialog] = useState<{ cadet: Cadet; doc: DocType } | null>(null);
  const [collectForm, setCollectForm] = useState({ expiry_date: "", notes: "" });
  const [collecting, setCollecting] = useState(false);

  const [showManage, setShowManage] = useState(false);
  const [newDocForm, setNewDocForm] = useState({ name: "", description: "", frequency: "annual", required: true });
  const [addingDoc, setAddingDoc] = useState(false);

  // Bulk collect
  const [showBulk, setShowBulk] = useState(false);
  const [bulkDoc, setBulkDoc] = useState<DocType | null>(null);
  const [bulkForm, setBulkForm] = useState({ expiry_date: "", notes: "" });
  const [bulking, setBulking] = useState(false);

  // Self-report (cadet)
  const [selfReporting, setSelfReporting] = useState<string | null>(null);

  // Confirm pending (staff)
  const [confirming, setConfirming] = useState<string | null>(null);

  // Build a lookup: cadet_id + doc_type_id → most recent submission
  const submissionMap = useMemo(() => {
    const m = new Map<string, Submission>();
    for (const s of submissions) {
      const key = `${s.cadet_id}:${s.document_type_id}`;
      const existing = m.get(key);
      if (!existing || s.collected_at > existing.collected_at) m.set(key, s);
    }
    return m;
  }, [submissions]);

  const filteredCadets = useMemo(() => {
    if (!searchQ) return cadets;
    const q = searchQ.toLowerCase();
    return cadets.filter((c) => c.full_name.toLowerCase().includes(q));
  }, [cadets, searchQ]);

  const getStatus = (cadetId: string, doc: DocType) => {
    const sub = submissionMap.get(`${cadetId}:${doc.id}`);
    if (!sub) return "missing";
    if (sub.status === "pending") return "pending";
    if (isExpired(sub, doc.frequency)) return "expired";
    return "collected";
  };

  const handleSelfReport = async (docId: string) => {
    setSelfReporting(docId);
    const res = await selfReportDocument(docId);
    setSelfReporting(null);
    if (res.error) { toast.error(res.error); return; }
    toast.success("Flagged as submitted — staff will confirm");
    router.refresh();
  };

  const handleConfirmPending = async (submissionId: string) => {
    setConfirming(submissionId);
    const res = await confirmDocumentSubmission(submissionId);
    setConfirming(null);
    if (res.error) { toast.error(res.error); return; }
    toast.success("Document confirmed");
    router.refresh();
  };

  const handleBulkCollect = async () => {
    if (!bulkDoc) return;
    setBulking(true);
    const cadetIds = filteredCadets.map((c) => c.id);
    const res = await bulkCollectDocument(cadetIds, bulkDoc.id, bulkForm.expiry_date || undefined, bulkForm.notes || undefined);
    setBulking(false);
    if (res.error) { toast.error(res.error); return; }
    toast.success(`Marked ${res.count ?? cadetIds.length} cadets as collected`);
    setShowBulk(false);
    router.refresh();
  };

  const exportCsv = () => {
    const headers = ["Cadet", ...docTypes.map((d) => d.name)];
    const rows = cadets.map((c) => [
      `${c.rank ? c.rank + " " : ""}${c.full_name}`,
      ...docTypes.map((d) => {
        const status = getStatus(c.id, d);
        const sub = submissionMap.get(`${c.id}:${d.id}`);
        if (status === "collected") return `Collected ${sub ? format(parseISO(sub.collected_at), "yyyy-MM-dd") : ""}`;
        if (status === "expired") return "Expired";
        if (status === "pending") return "Pending";
        return "Missing";
      }),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `doc-tracker-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Expiry alerts: docs expiring within 30 days
  const expiryAlerts = useMemo(() => {
    const alerts: { cadet: Cadet; doc: DocType; expiryDate: Date }[] = [];
    const now = new Date();
    const in30 = addDays(now, 30);
    for (const cadet of cadets) {
      for (const doc of docTypes) {
        const sub = submissionMap.get(`${cadet.id}:${doc.id}`);
        if (!sub || sub.status === "pending") continue;
        const exp = getExpiryDate(sub, doc.frequency);
        if (exp && isAfter(exp, now) && isBefore(exp, in30)) {
          alerts.push({ cadet, doc, expiryDate: exp });
        }
      }
    }
    return alerts.sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime());
  }, [cadets, docTypes, submissionMap]);

  const openCollect = (cadet: Cadet, doc: DocType) => {
    const sub = submissionMap.get(`${cadet.id}:${doc.id}`);
    const defaultExpiry = doc.frequency === "annual" ? format(addYears(new Date(), 1), "yyyy-MM-dd") : "";
    setCollectForm({ expiry_date: sub?.expiry_date ?? defaultExpiry, notes: sub?.notes ?? "" as string });
    setCollectDialog({ cadet, doc });
  };

  const handleCollect = async () => {
    if (!collectDialog) return;
    setCollecting(true);
    const res = await collectDocument(
      collectDialog.cadet.id,
      collectDialog.doc.id,
      collectForm.expiry_date || undefined,
      collectForm.notes || undefined,
    );
    setCollecting(false);
    if (res.error) { toast.error(res.error); return; }
    toast.success("Document marked as collected");
    setCollectDialog(null);
    router.refresh();
  };

  const handleAddDoc = async () => {
    if (!newDocForm.name.trim()) return;
    setAddingDoc(true);
    const res = await addDocumentType(newDocForm.name, newDocForm.description, newDocForm.frequency, newDocForm.required);
    setAddingDoc(false);
    if (res.error) { toast.error(res.error); return; }
    toast.success("Document type added");
    setNewDocForm({ name: "", description: "", frequency: "annual", required: true });
    router.refresh();
  };

  const handleDeactivate = async (id: string) => {
    const res = await deactivateDocumentType(id);
    if (res.error) { toast.error(res.error); return; }
    toast.success("Document type removed");
    router.refresh();
  };

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === "collected") return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    if (status === "expired") return <AlertCircle className="h-4 w-4 text-amber-500" />;
    if (status === "pending") return <Clock className="h-4 w-4 text-blue-500" />;
    return <XCircle className="h-4 w-4 text-red-400" />;
  };

  // Own-cadet view
  if (isOwnView) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Document Tracker</h1>
          <p className="text-sm text-gray-500">Your required documents status</p>
        </div>
        <div className="space-y-2">
          {docTypes.length === 0 && (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-gray-400">
              <FileCheck className="mx-auto mb-2 h-8 w-8 text-gray-300" />
              No document requirements configured yet.
            </div>
          )}
          {docTypes.map((doc) => {
            const sub = submissionMap.get(`${profile.id}:${doc.id}`);
            const status = getStatus(profile.id, doc);
            return (
              <Card key={doc.id} className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-gray-900">{doc.name}</p>
                      {doc.required && <Badge variant="outline" className="text-xs text-red-600 border-red-200 bg-red-50">Required</Badge>}
                      <Badge variant="outline" className={`text-xs ${FREQ_COLORS[doc.frequency]}`}>{FREQ_LABELS[doc.frequency]}</Badge>
                    </div>
                    {doc.description && <p className="text-xs text-gray-500">{doc.description}</p>}
                    {sub && status !== "pending" && (
                      <p className="text-xs text-gray-400">
                        Collected {format(parseISO(sub.collected_at), "MMM d, yyyy")}
                        {sub.expiry_date && ` · Expires ${format(parseISO(sub.expiry_date), "MMM d, yyyy")}`}
                      </p>
                    )}
                    {status === "pending" && (
                      <p className="text-xs text-blue-600">Submitted — awaiting staff confirmation</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusIcon status={status} />
                    {(status === "missing" || status === "expired") && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        disabled={selfReporting === doc.id}
                        onClick={() => handleSelfReport(doc.id)}
                      >
                        {selfReporting === doc.id ? "Submitting…" : "Mark Submitted"}
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // Staff view — grid per cadet
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Document Tracker</h1>
          <p className="text-sm text-gray-500">{cadets.length} cadets · {docTypes.length} document types</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {canMark && docTypes.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setShowBulk(true)} className="gap-1.5">
              <Users className="h-3.5 w-3.5" /> Bulk Collect
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={exportCsv} className="gap-1.5">
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
          {canManage && (
            <Button variant="outline" size="sm" onClick={() => setShowManage(true)} className="gap-1.5">
              <Settings className="h-3.5 w-3.5" /> Manage Types
            </Button>
          )}
        </div>
      </div>

      {/* Expiry alerts widget */}
      {expiryAlerts.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
            <p className="text-sm font-semibold text-amber-800">
              {expiryAlerts.length} doc{expiryAlerts.length !== 1 ? "s" : ""} expiring within 30 days
            </p>
          </div>
          <div className="space-y-1">
            {expiryAlerts.slice(0, 5).map((a, i) => (
              <p key={i} className="text-xs text-amber-700">
                <span className="font-medium">{a.cadet.rank ? a.cadet.rank + " " : ""}{a.cadet.full_name}</span>
                {" — "}{a.doc.name}
                {" · Expires "}{format(a.expiryDate, "MMM d, yyyy")}
              </p>
            ))}
            {expiryAlerts.length > 5 && (
              <p className="text-xs text-amber-600 font-medium">+{expiryAlerts.length - 5} more…</p>
            )}
          </div>
        </div>
      )}

      <Input
        placeholder="Search cadets…"
        value={searchQ}
        onChange={(e) => setSearchQ(e.target.value)}
        className="h-10 max-w-sm"
      />

      {docTypes.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <FileCheck className="mx-auto mb-2 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-500">No document types configured.</p>
          {canManage && <p className="mt-1 text-xs text-gray-400">Add types using &ldquo;Manage Types&rdquo; above.</p>}
        </div>
      )}

      <div className="space-y-3">
        {filteredCadets.map((cadet) => {
          const missingRequired = docTypes.filter((d) => d.required && getStatus(cadet.id, d) !== "collected").length;
          return (
            <Card key={cadet.id} className="overflow-hidden">
              <div className="flex items-center gap-3 border-b bg-gray-50 px-4 py-3">
                <div>
                  <p className="font-semibold text-gray-900">
                    {cadet.rank ? `${cadet.rank} ` : ""}{cadet.full_name}
                  </p>
                </div>
                <div className="ml-auto">
                  {missingRequired > 0 ? (
                    <Badge variant="outline" className="text-xs text-red-600 border-red-200 bg-red-50">
                      {missingRequired} missing
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs text-green-700 border-green-200 bg-green-50">
                      All current
                    </Badge>
                  )}
                </div>
              </div>

              <div className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-3">
                {docTypes.map((doc) => {
                  const sub = submissionMap.get(`${cadet.id}:${doc.id}`);
                  const status = getStatus(cadet.id, doc);
                  return (
                    <div
                      key={doc.id}
                      className={`flex items-start justify-between gap-2 rounded border p-2.5 ${
                        status === "collected" ? "bg-green-50 border-green-200" :
                        status === "expired" ? "bg-amber-50 border-amber-200" :
                        status === "pending" ? "bg-blue-50 border-blue-200" :
                        "bg-white border-gray-200"
                      }`}
                    >
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-sm font-medium text-gray-800 truncate">{doc.name}</p>
                        <div className="flex items-center gap-1 flex-wrap">
                          <Badge variant="outline" className={`text-xs ${FREQ_COLORS[doc.frequency]}`}>
                            {FREQ_LABELS[doc.frequency]}
                          </Badge>
                          {status === "collected" && sub && (
                            <span className="text-xs text-gray-400">{format(parseISO(sub.collected_at), "MMM d, yy")}</span>
                          )}
                          {status === "expired" && (
                            <span className="text-xs text-amber-600">Expired</span>
                          )}
                          {status === "pending" && (
                            <span className="text-xs text-blue-600">Pending confirm</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <StatusIcon status={status} />
                        {canMark && status === "pending" && sub && (
                          <button
                            onClick={() => handleConfirmPending(sub.id)}
                            disabled={confirming === sub.id}
                            className="text-blue-500 hover:text-blue-700 transition-colors"
                            title="Confirm submission"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {canMark && status !== "pending" && (
                          <button
                            onClick={() => openCollect(cadet, doc)}
                            className="text-gray-400 hover:text-[#003087] transition-colors"
                            title="Mark collected"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Bulk Collect Dialog */}
      <Dialog open={showBulk} onOpenChange={(o) => { setShowBulk(o); if (!o) setBulkDoc(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Bulk Collect Document</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-xs text-gray-500">
              Mark all <strong>{filteredCadets.length}</strong> shown cadet{filteredCadets.length !== 1 ? "s" : ""} as collected for a document type.
            </p>
            <div className="space-y-1.5">
              <Label>Document Type</Label>
              <Select value={bulkDoc?.id ?? ""} onValueChange={(v) => setBulkDoc(docTypes.find((d) => d.id === v) ?? null)}>
                <SelectTrigger><SelectValue placeholder="Select document type…" /></SelectTrigger>
                <SelectContent>
                  {docTypes.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {bulkDoc && bulkDoc.frequency !== "one_time" && (
              <div className="space-y-1.5">
                <Label>Expiry Date (optional)</Label>
                <Input
                  type="date"
                  value={bulkForm.expiry_date}
                  onChange={(e) => setBulkForm({ ...bulkForm, expiry_date: e.target.value })}
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Input
                value={bulkForm.notes}
                onChange={(e) => setBulkForm({ ...bulkForm, notes: e.target.value })}
                placeholder="e.g. Collected at formation"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulk(false)}>Cancel</Button>
            <Button
              onClick={handleBulkCollect}
              disabled={bulking || !bulkDoc}
              className="bg-[#003087] hover:bg-[#002266]"
            >
              {bulking ? "Saving…" : `Mark ${filteredCadets.length} Collected`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Collect Document Dialog */}
      <Dialog open={!!collectDialog} onOpenChange={(o) => !o && setCollectDialog(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Mark Document Collected</DialogTitle>
          </DialogHeader>
          {collectDialog && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-gray-50 px-3 py-2 text-sm">
                <p className="font-medium text-gray-900">{collectDialog.doc.name}</p>
                <p className="text-gray-500 text-xs">{collectDialog.cadet.full_name}</p>
              </div>
              {collectDialog.doc.frequency !== "one_time" && (
                <div className="space-y-1.5">
                  <Label>Expiry Date</Label>
                  <Input
                    type="date"
                    value={collectForm.expiry_date}
                    onChange={(e) => setCollectForm({ ...collectForm, expiry_date: e.target.value })}
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Notes (optional)</Label>
                <Textarea
                  value={collectForm.notes}
                  onChange={(e) => setCollectForm({ ...collectForm, notes: e.target.value })}
                  rows={2}
                  placeholder="Any additional notes…"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCollectDialog(null)}>Cancel</Button>
            <Button onClick={handleCollect} disabled={collecting} className="bg-[#003087] hover:bg-[#002266]">
              {collecting ? "Saving…" : "Mark Collected"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Document Types Dialog */}
      <Dialog open={showManage} onOpenChange={setShowManage}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Manage Document Types</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {docTypes.map((doc) => (
              <div key={doc.id} className="flex items-start justify-between rounded border bg-gray-50 p-3">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                  {doc.description && <p className="text-xs text-gray-500">{doc.description}</p>}
                  <div className="flex gap-1.5 flex-wrap">
                    <Badge variant="outline" className={`text-xs ${FREQ_COLORS[doc.frequency]}`}>{FREQ_LABELS[doc.frequency]}</Badge>
                    {doc.required && <Badge variant="outline" className="text-xs text-red-600 border-red-200">Required</Badge>}
                  </div>
                </div>
                <button onClick={() => handleDeactivate(doc.id)} className="text-red-400 hover:text-red-600 ml-2 shrink-0">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="border-t pt-4 space-y-3">
            <p className="text-sm font-semibold text-gray-700">Add New Document Type</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">Name *</Label>
                <Input
                  value={newDocForm.name}
                  onChange={(e) => setNewDocForm({ ...newDocForm, name: e.target.value })}
                  placeholder="e.g. Medical Waiver"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">Description</Label>
                <Input
                  value={newDocForm.description}
                  onChange={(e) => setNewDocForm({ ...newDocForm, description: e.target.value })}
                  placeholder="What is this document for?"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Frequency</Label>
                <Select value={newDocForm.frequency} onValueChange={(v) => setNewDocForm({ ...newDocForm, frequency: v ?? "annual" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one_time">One-time</SelectItem>
                    <SelectItem value="annual">Annual</SelectItem>
                    <SelectItem value="per_event">Per Event</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Required?</Label>
                <Select value={newDocForm.required ? "yes" : "no"} onValueChange={(v) => setNewDocForm({ ...newDocForm, required: v === "yes" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No (optional)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleAddDoc} disabled={addingDoc || !newDocForm.name.trim()} className="w-full bg-[#003087] hover:bg-[#002266]">
              {addingDoc ? "Adding…" : "Add Document Type"}
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowManage(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
