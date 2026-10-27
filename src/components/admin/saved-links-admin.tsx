"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Plus, Trash2, GripVertical, ExternalLink } from "lucide-react";
import type { SavedLink } from "@/types/database";

export function SavedLinksAdmin({
  initialLinks,
  profileId,
}: {
  initialLinks: SavedLink[];
  profileId: string;
}) {
  const [links, setLinks] = useState<SavedLink[]>(initialLinks);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", url: "", description: "" });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = createClient() as any;

  const addLink = async () => {
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    if (!form.url.trim()) { toast.error("URL is required"); return; }
    let url = form.url.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) url = `https://${url}`;
    setSaving(true);
    const { data, error } = await sb.from("saved_links").insert({
      title: form.title.trim(),
      url,
      description: form.description.trim() || null,
      sort_order: links.length,
      created_by: profileId,
    }).select("*").single();
    setSaving(false);
    if (error) { toast.error("Failed to add link"); return; }
    toast.success("Link added");
    setLinks((prev) => [...prev, data]);
    setForm({ title: "", url: "", description: "" });
    setAdding(false);
  };

  const deleteLink = async (id: string) => {
    const { error } = await sb.from("saved_links").delete().eq("id", id);
    if (error) { toast.error("Failed to delete"); return; }
    toast.success("Link removed");
    setLinks((prev) => prev.filter((l) => l.id !== id));
  };

  const moveUp = async (index: number) => {
    if (index === 0) return;
    const reordered = [...links];
    [reordered[index - 1], reordered[index]] = [reordered[index], reordered[index - 1]];
    setLinks(reordered);
    await Promise.all(
      reordered.map((l, i) => sb.from("saved_links").update({ sort_order: i }).eq("id", l.id))
    );
  };

  return (
    <div className="space-y-3">
      {links.length === 0 && !adding && (
        <div className="rounded-xl border border-dashed bg-white p-8 text-center text-sm text-gray-400">
          No quick links yet. Add one to show it on the dashboard.
        </div>
      )}

      {links.map((link, i) => (
        <div key={link.id} className="flex items-center gap-3 rounded-xl border bg-white p-3.5 shadow-sm">
          <button
            onClick={() => moveUp(i)}
            disabled={i === 0}
            className="shrink-0 text-gray-300 hover:text-gray-500 disabled:opacity-20"
            aria-label="Move up"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-gray-800 truncate">{link.title}</p>
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-gray-400 hover:text-[#003087]"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
            <p className="text-xs text-gray-400 truncate">{link.url}</p>
            {link.description && <p className="text-xs text-gray-500 mt-0.5">{link.description}</p>}
          </div>
          <button
            onClick={() => deleteLink(link.id)}
            className="shrink-0 text-gray-300 hover:text-red-500 transition-colors"
            aria-label="Delete link"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}

      {adding ? (
        <div className="rounded-xl border bg-white p-4 shadow-sm space-y-3">
          <p className="text-sm font-semibold text-gray-800">New Link</p>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Discord, Google Docs, SharePoint…"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#003087] focus:outline-none"
              autoFocus
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              URL <span className="text-red-400">*</span>
            </label>
            <input
              type="url"
              value={form.url}
              onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
              placeholder="https://discord.com/invite/…"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#003087] focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Description (optional)</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Short description shown as a tooltip"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#003087] focus:outline-none"
            />
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={addLink}
              disabled={saving}
              className="bg-[#003087] hover:bg-[#003087]/80 text-white"
            >
              {saving ? "Saving…" : "Add Link"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setAdding(false); setForm({ title: "", url: "", description: "" }); }}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAdding(true)}
          className="w-full border-dashed text-gray-500 hover:text-[#003087] hover:border-[#003087]/30"
        >
          <Plus className="h-4 w-4 mr-1.5" /> Add Link
        </Button>
      )}
    </div>
  );
}
