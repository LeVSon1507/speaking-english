"use client";
import { useEffect, useState } from "react";
import LoginPrompt from "@/components/LoginPrompt";

type BookmarkItem = { topic: string; createdAt: string };

export default function BookmarksPage() {
  const [items, setItems] = useState<BookmarkItem[]>([]);
  const [showLogin, setShowLogin] = useState(false);

  async function fetchBookmarks(signal?: AbortSignal) {
    try {
      const res = await fetch("/api/bookmarks", { signal });
      if (res.status === 401) {
        setShowLogin(true);
        return;
      }
      const data = await res.json();
      type BookmarkItemApi = { topic: string; createdAt: string };
      const items: BookmarkItem[] = (data?.items || []).map((it: BookmarkItemApi) => ({
        topic: it.topic,
        createdAt: it.createdAt,
      }));
      setItems(items);
    } catch {}
  }

  useEffect(() => {
    const controller = new AbortController();
    void fetchBookmarks(controller.signal);
    return () => controller.abort();
  }, []);

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-semibold">Bookmarks</h1>
      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <div className="text-sm text-neutral-600">No bookmarks yet.</div>
        ) : (
          items.map((b, idx) => (
            <div key={idx} className="p-3 rounded-xl border">
              <div className="text-sm font-semibold">{b.topic}</div>
              <div className="text-xs text-neutral-500 mt-1">{new Date(b.createdAt).toLocaleString()}</div>
            </div>
          ))
        )}
      </div>

      <LoginPrompt open={showLogin} onClose={() => setShowLogin(false)} onSuccess={fetchBookmarks} />
    </div>
  );
}
