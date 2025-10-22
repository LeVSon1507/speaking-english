"use client";
import { useEffect, useState } from "react";
import LoginPrompt from "@/components/LoginPrompt";

type SavedItem = { value: string; kind?: string; createdAt: string };

export default function SavedPage() {
  const [items, setItems] = useState<SavedItem[]>([]);
  const [showLogin, setShowLogin] = useState(false);
  const [newSaved, setNewSaved] = useState("");
  const [saving, setSaving] = useState(false);

  async function fetchSaved(signal?: AbortSignal) {
    try {
      const res = await fetch("/api/saved", { signal });
      if (res.status === 401) {
        setShowLogin(true);
        return;
      }
      const data = await res.json();
      type SavedItemApi = { value: string; kind?: string; createdAt: string };
      const items: SavedItem[] = (data?.items || []).map((it: SavedItemApi) => ({
        value: it.value,
        kind: it.kind,
        createdAt: it.createdAt,
      }));
      setItems(items);
    } catch {}
  }

  async function addSaved() {
    if (!newSaved.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/saved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: newSaved.trim(), kind: "custom" }),
      });
      if (res.status === 401) {
        setShowLogin(true);
        return;
      }
      setNewSaved("");
      fetchSaved();
    } catch {} finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    void fetchSaved(controller.signal);
    return () => controller.abort();
  }, []);

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-semibold">Saved</h1>

      <div className="mt-4 flex gap-2">
        <input
          value={newSaved}
          onChange={(e) => setNewSaved(e.target.value)}
          placeholder="Enter content to save"
          className="flex-1 h-9 px-3 rounded-xl border"
        />
        <button
          onClick={addSaved}
          disabled={saving || !newSaved.trim()}
          className="px-3 h-9 rounded-full border bg-[#f6d184]"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <div className="text-sm text-neutral-600">No saved items yet.</div>
        ) : (
          items.map((s, idx) => (
            <div key={idx} className="p-3 rounded-xl border">
              <div className="text-sm">{s.value}</div>
              <div className="text-xs text-neutral-500 mt-1">{new Date(s.createdAt).toLocaleString()}</div>
            </div>
          ))
        )}
      </div>

      <LoginPrompt open={showLogin} onClose={() => setShowLogin(false)} onSuccess={fetchSaved} />
    </div>
  );
}
