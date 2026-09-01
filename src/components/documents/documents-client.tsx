"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LiveIndicator } from "@/components/shared/live-indicator";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Dialog as EditDialog,
  DialogContent as EditDialogContent,
  DialogHeader as EditDialogHeader,
  DialogTitle as EditDialogTitle,
  DialogFooter as EditDialogFooter,
} from "@/components/ui/dialog";
import { FileText, Upload, Pencil, Trash2, Download, Lock } from "lucide-react";
import { toast } from "sonner";
import type { DocumentRow, Profile } from "@/types/database";

export function DocumentsClient({ profile, initialDocuments }: { profile: Profile; initialDocuments: DocumentRow[] }) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editing, setEditing] = useState<DocumentRow | null>(null);

  const isOfficer = profile.role === "officer" || profile.role === "snco";

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("documents-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "documents" }, () => {
        supabase.from("documents").select("*").order("folder").order("name").then(({ data }) => data && setDocuments(data));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const folders = useMemo(() => {
    const map = new Map<string, DocumentRow[]>();
    documents.forEach((d) => {
      // Officers always see everything
      if (profile.role === "officer") { map.set(d.folder, [...(map.get(d.folder) ?? []), d]); return; }
      // Legacy officer_only check
      if (d.officer_only && profile.role !== "snco") return;
      // New granular access: if access_roles set, user must be in it (or match a billet)
      if (d.access_roles && d.access_roles.length > 0) {
        const roleMatch = d.access_roles.includes(profile.role);
        const billetMatch = d.access_billets && profile.billet && d.access_billets.some(
          (b) => profile.billet?.toLowerCase().includes(b.toLowerCase())
        );
        if (!roleMatch && !billetMatch) return;
      }
      const list = map.get(d.folder) ?? [];
      list.push(d);
      map.set(d.folder, list);
    });
    return map;
  }, [documents, profile.role, profile.billet]);

  const remove = async (id: string) => {
    const supabase = createClient();
    const { error } = await supabase.from("documents").delete().eq("id", id);
    if (error) toast.error("Failed to delete document");
    else toast.success("Document deleted");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-[#003087]">Document Library</h1>
          <LiveIndicator />
        </div>
        {isOfficer && (
          <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
            <DialogTrigger render={<Button className="bg-[#003087] hover:bg-[#002266]" />}>
              <Upload className="mr-1 h-4 w-4" /> Upload
            </DialogTrigger>
            <UploadForm profile={profile} onClose={() => setUploadOpen(false)} />
          </Dialog>
        )}
      </div>

      {Array.from(folders.entries()).map(([folder, docs]) => (
        <Card key={folder} className="divide-y">
          <div className="bg-gray-50 px-4 py-2 text-sm font-semibold text-[#003087]">{folder}</div>
          {docs.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between gap-3 p-3">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium">{doc.name}</p>
                  <div className="flex items-center gap-2">
                    {doc.officer_only && (
                      <span className="flex items-center gap-1 text-xs text-[#B8860B]"><Lock className="h-3 w-3" /> Officer Only</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a href={doc.file_url} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-[#003087]">
                  <Download className="h-4 w-4" />
                </a>
                {isOfficer && (
                  <>
                    <button onClick={() => setEditing(doc)} className="text-gray-400 hover:text-[#003087]">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => remove(doc.id)} className="text-gray-400 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </Card>
      ))}
      {folders.size === 0 && <p className="text-sm text-gray-400">No documents available yet.</p>}

      {editing && (
        <EditDialog open onOpenChange={(v) => !v && setEditing(null)}>
          <EditDialogContent className="sm:max-w-sm">
            <EditDocumentForm doc={editing} onClose={() => setEditing(null)} />
          </EditDialogContent>
        </EditDialog>
      )}
    </div>
  );
}

function UploadForm({ profile, onClose }: { profile: Profile; onClose: () => void }) {
  const [name, setName] = useState("");
  const [folder, setFolder] = useState("General");
  const [officerOnly, setOfficerOnly] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please choose a file.");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const path = `${profile.id}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("documents").upload(path, file);
    if (uploadError) {
      toast.error("Upload failed: " + uploadError.message);
      setSaving(false);
      return;
    }
    const { data } = supabase.storage.from("documents").getPublicUrl(path);
    const { error } = await supabase.from("documents").insert({
      name: name || file.name,
      file_url: data.publicUrl,
      folder: folder || "General",
      officer_only: officerOnly,
      uploaded_by: profile.id,
    });
    setSaving(false);
    if (error) {
      toast.error("Failed to save document");
      return;
    }
    toast.success("Document uploaded");
    onClose();
  };

  return (
    <DialogContent className="sm:max-w-sm">
      <DialogHeader><DialogTitle>Upload Document</DialogTitle></DialogHeader>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>File</Label>
          <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </div>
        <div className="space-y-2">
          <Label>Display Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={file?.name ?? "Document name"} />
        </div>
        <div className="space-y-2">
          <Label>Folder</Label>
          <Input value={folder} onChange={(e) => setFolder(e.target.value)} />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="officer-only">Officer-only</Label>
          <Switch id="officer-only" checked={officerOnly} onCheckedChange={setOfficerOnly} />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button className="bg-[#003087] hover:bg-[#002266]" onClick={handleUpload} disabled={saving}>
          {saving ? "Uploading..." : "Upload"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function EditDocumentForm({ doc, onClose }: { doc: DocumentRow; onClose: () => void }) {
  const [name, setName] = useState(doc.name);
  const [folder, setFolder] = useState(doc.folder);
  const [officerOnly, setOfficerOnly] = useState(doc.officer_only);

  const save = async () => {
    const supabase = createClient();
    const { error } = await supabase.from("documents").update({ name, folder, officer_only: officerOnly }).eq("id", doc.id);
    if (error) {
      toast.error("Failed to update");
      return;
    }
    toast.success("Document updated");
    onClose();
  };

  return (
    <>
      <EditDialogHeader><EditDialogTitle>Edit Document</EditDialogTitle></EditDialogHeader>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Folder</Label>
          <Input value={folder} onChange={(e) => setFolder(e.target.value)} />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="edit-officer-only">Officer-only</Label>
          <Switch id="edit-officer-only" checked={officerOnly} onCheckedChange={setOfficerOnly} />
        </div>
      </div>
      <EditDialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button className="bg-[#003087] hover:bg-[#002266]" onClick={save}>Save</Button>
      </EditDialogFooter>
    </>
  );
}
