"use client";
import Image from "next/image";
import { useEffect, useMemo, useState, useRef } from "react";
import { Copy, Bookmark, Volume2, BookmarkPlus } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { useSearchParams, useRouter } from "next/navigation";
import MicButton from "@/components/MicButton";
import { useSpeechRecognition } from "@/hooks/useSpeech";
import LoginPrompt from "@/components/LoginPrompt";

type RetryAction =
  | { type: "bookmark"; payload: string }
  | { type: "history"; payload: { text: string; reply: string } }
  | { type: "saved"; payload: { value: string; kind: string } };

export default function SpeakingContent() {
  const router = useRouter();
  const params = useSearchParams();
  const {
    supported,
    listening,
    transcript,
    interimTranscript,
    start,
    stop,
    silenceMs,
  } = useSpeechRecognition();
  const { messages, clearConversation, addMessage } = useAppStore();

  const [loading, setLoading] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [retryAction, setRetryAction] = useState<RetryAction | null>(null);
  const [bookmarked, setBookmarked] = useState(false);
  const [savedValues, setSavedValues] = useState<Set<string>>(new Set());
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [voiceLang, setVoiceLang] = useState<"en-US" | "en-GB">("en-US");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [micMode, setMicMode] = useState<"hold" | "toggle">("hold");
  const lastSpokenRef = useRef<string | null>(null);
  const chatControllerRef = useRef<AbortController | null>(null);

  const topic = params.get("topic") || "Greetings and self-introduction";

  useEffect(() => {
    try {
      const raw = localStorage.getItem("my_vocab");
      const list = raw ? JSON.parse(raw) : [];
      setBookmarked(list.some((t: string) => t === topic));
    } catch {}
  }, [topic]);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch("/api/saved", { signal: controller.signal });
        if (res.status === 401) return;
        const data = await res.json();
        const vals = new Set<string>(
          (data?.items || []).map((it: { value: string }) => it.value)
        );
        setSavedValues(vals);
      } catch {}
    })();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const updateVoices = () => {
      try {
        const list = speechSynthesis.getVoices();
        const enVoices = list.filter((v) => v.lang && v.lang.startsWith("en"));
        setVoices(enVoices);
      } catch {}
    };
    updateVoices();
    const id = setInterval(() => {
      const list = speechSynthesis.getVoices();
      if (list && list.length) {
        updateVoices();
        clearInterval(id);
      }
    }, 250);
    return () => clearInterval(id);
  }, []);

  const speakText = (text: string) => {
    try {
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = voiceLang;
      const v =
        voices.find((vv) => vv.lang === voiceLang) ||
        voices.find((vv) => vv.lang?.startsWith("en"));
      if (v) utter.voice = v;
      utter.rate = 1.0;
      utter.pitch = 1.0;
      speechSynthesis.cancel();
      speechSynthesis.speak(utter);
    } catch {}
  };

  useEffect(() => {
    if (!autoSpeak || !messages.length) return;
    const last = messages[messages.length - 1];
    if (
      last?.role === "assistant" &&
      last.content &&
      last.content !== lastSpokenRef.current
    ) {
      lastSpokenRef.current = last.content;
      speakText(last.content);
    }
  }, [messages, autoSpeak]);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
  };

  const handleBookmark = async () => {
    if (bookmarked) return;
    try {
      const res = await fetch("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });
      if (res.status === 401) {
        setRetryAction({ type: "bookmark", payload: topic });
        setShowLogin(true);
        return;
      }
      const raw = localStorage.getItem("my_vocab");
      const list = raw ? JSON.parse(raw) : [];
      const next = [topic, ...list.filter((t: string) => t !== topic)].slice(
        0,
        100
      );
      localStorage.setItem("my_vocab", JSON.stringify(next));
      setBookmarked(true);
    } catch {}
  };

  const handleSave = async (value: string, kind: string = "phrase") => {
    if (savedValues.has(value)) return;
    try {
      const res = await fetch("/api/saved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value, kind }),
      });
      if (res.status === 401) {
        setRetryAction({ type: "saved", payload: { value, kind } });
        setShowLogin(true);
        return;
      }
      setSavedValues((prev) => {
        const next = new Set(prev);
        next.add(value);
        return next;
      });
    } catch {}
  };

  useEffect(() => {
    if (!listening && transcript) {
      void sendToAI(transcript);
    }
  }, [listening, transcript]);

  async function sendToAI(text: string) {
    addMessage({ role: "user", content: text });
    setLoading(true);
    try {
      const controller = new AbortController();
      chatControllerRef.current = controller;
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userText: text }),
        signal: controller.signal,
      });
      const data = await res.json();
      const reply = data.reply || "Okay.";
      addMessage({
        role: "assistant",
        content: reply,
        ipaData: { ipa: data.ipa || [], tips: data.tips },
      });
      try {
        const hres = await fetch("/api/history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userText: text, replyText: reply }),
        });
        if (hres.status === 401) {
          setRetryAction({ type: "history", payload: { text, reply } });
          setShowLogin(true);
        }
      } catch {}
    } catch (e: unknown) {
      const isAbort =
        typeof e === "object" &&
        e !== null &&
        (e as { name?: string }).name === "AbortError";
      if (isAbort) {
        addMessage({
          role: "assistant",
          content: "Request canceled. You can continue speaking.",
        });
      } else {
        addMessage({
          role: "assistant",
          content: "Error calling AI. Check the server API key.",
        });
      }
    } finally {
      chatControllerRef.current = null;
      setLoading(false);
    }
  }

  function handleLoginSuccess() {
    if (!retryAction) return;
    if (retryAction.type === "bookmark") {
      void fetch("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: retryAction.payload }),
      });
      try {
        const raw = localStorage.getItem("my_vocab");
        const list = raw ? JSON.parse(raw) : [];
        const next = [topic, ...list.filter((t: string) => t !== topic)].slice(
          0,
          100
        );
        localStorage.setItem("my_vocab", JSON.stringify(next));
      } catch {}
      setBookmarked(true);
    } else if (retryAction.type === "history") {
      const { text, reply } = retryAction.payload || {};
      void fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userText: text, replyText: reply }),
      });
    } else if (retryAction.type === "saved") {
      const { value, kind } = retryAction.payload;
      void fetch("/api/saved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value, kind }),
      });
      setSavedValues((prev) => {
        const next = new Set(prev);
        next.add(value);
        return next;
      });
    }
    setRetryAction(null);
  }

  const heroTitle = useMemo(() => {
    return topic;
  }, [topic]);

  return (
    <div className="min-h-dvh max-w-[960px] mx-auto px-6 py-8 space-y-6">
      {/* Header with Back */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="h-9 w-9 grid place-items-center rounded-full border border-black/10 bg-white shadow-[4px_4px_0px_#00000015] transition-transform duration-200 hover:scale-[1.05] active:translate-y-px"
            title="Back to Home"
          >
            <span className="text-lg">◀</span>
          </button>
          <span className="text-sm text-neutral-500">Speaking</span>
        </div>
        <button
          onClick={() => clearConversation()}
          className="px-3 h-9 rounded-full bg-white border border-black/10 shadow-[4px_4px_0px_#00000015] text-sm transition-colors duration-200 hover:bg-neutral-50 hover:scale-[1.02] active:translate-y-px"
        >
          Clear conversation
        </button>
      </div>

      {/* Hero */}
      <div className="rounded-2xl bg-white p-4 border border-black/10 shadow-md flex items-center gap-4 animate-[fadeIn_0.25s_ease-out]">
        <Image
          src="/undraw/undraw_conference-speaker_balr.svg"
          alt="Speaking"
          width={72}
          height={72}
          className="object-contain p-1"
        />
        <div className="flex-1">
          <div className="text-base font-semibold">{heroTitle}</div>
          <div className="text-xs text-neutral-600">Current speaking topic</div>
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={() => speakText(heroTitle)}
              className="h-8 w-8 grid place-items-center rounded-full border border-black/10 bg-white shadow-[4px_4px_0px_#00000015] transition-transform duration-200 hover:scale-[1.05] active:translate-y-px"
              title="Speak aloud"
            >
              <Volume2 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setAutoSpeak((v) => !v)}
              className="px-3 h-8 rounded-full bg-white border border-black/10 shadow-[4px_4px_0px_#00000015] text-xs transition-transform duration-200 hover:scale-[1.05] active:translate-y-px"
              title="Auto speak replies"
            >
              {autoSpeak ? "Auto: On" : "Auto: Off"}
            </button>
            <button
              onClick={() =>
                setVoiceLang((v) => (v === "en-US" ? "en-GB" : "en-US"))
              }
              className="px-3 h-8 rounded-full bg-white border border-black/10 shadow-[4px_4px_0px_#00000015] text-xs transition-transform duration-200 hover:scale-[1.05] active:translate-y-px"
              title="Toggle US/UK voice"
            >
              {voiceLang === "en-US" ? "Voice: US" : "Voice: UK"}
            </button>
            <button
              onClick={handleBookmark}
              disabled={bookmarked}
              title={bookmarked ? "Bookmarked" : "Bookmark"}
              className={`px-3 h-8 rounded-full bg-white border border-black/10 shadow-[4px_4px_0px_#00000015] text-xs transition-transform duration-200 ${
                bookmarked
                  ? "opacity-60 cursor-not-allowed"
                  : "hover:scale-[1.05] active:translate-y-px"
              }`}
            >
              {bookmarked ? (
                <Bookmark className="h-4 w-4 inline mr-1" />
              ) : (
                <BookmarkPlus className="h-4 w-4 inline mr-1" />
              )}
              {bookmarked ? "Bookmarked" : "Bookmark"}
            </button>
          </div>
        </div>
      </div>

      {/* Chat */}
      <div className="bg-white p-5 rounded-2xl border border-black/10 shadow-md">
        <div className="mb-3 text-sm text-neutral-500">Conversation</div>
        <div className="space-y-3">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${
                m.role === "assistant" ? "justify-start" : "justify-end"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm border border-black/10 shadow-[4px_4px_0px_#00000015] animate-[bubbleIn_0.2s_ease-out] ${
                  m.role === "assistant" ? "bg-white" : "bg-[#f6d184]"
                }`}
              >
                <div>{m.content}</div>
                <div className="flex items-start gap-2 mt-2">
                  <div className="shrink-0 flex gap-2">
                    <button
                      onClick={() => speakText(m.content)}
                      className="h-8 w-8 grid place-items-center rounded-full border border-black/10 bg-white shadow-[3px_3px_0px_#00000012] transition-transform duration-200 hover:scale-[1.05] active:translate-y-px"
                      title="Speak aloud"
                    >
                      <Volume2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleCopy(m.content)}
                      className="h-8 w-8 grid place-items-center rounded-full border border-black/10 bg-white shadow-[3px_3px_0px_#00000012] transition-transform duration-200 hover:scale-[1.05] active:translate-y-px"
                      title="Copy"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() =>
                        handleSave(
                          m.content,
                          m.role === "assistant" ? "phrase" : "user"
                        )
                      }
                      disabled={savedValues.has(m.content)}
                      className={`h-8 w-8 grid place-items-center rounded-full border border-black/10 bg-white shadow-[3px_3px_0px_#00000012] transition-transform duration-200 ${
                        savedValues.has(m.content)
                          ? "opacity-60 cursor-not-allowed"
                          : "hover:scale-[1.05] active:translate-y-px"
                      }`}
                      title={savedValues.has(m.content) ? "Saved" : "Save"}
                    >
                      {savedValues.has(m.content) ? (
                        <Bookmark className="h-4 w-4" />
                      ) : (
                        <BookmarkPlus className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  {m.role === "assistant" && m.ipaData?.ipa?.length ? (
                    <div className="flex-1 min-w-0 max-h-24 overflow-y-auto">
                      <div className="flex flex-wrap gap-2">
                        {m.ipaData.ipa.map((w, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 rounded-full bg-neutral-100 border border-black/10 text-xs whitespace-nowrap"
                          >
                            {w.word} — /{w.ipa}/
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ))}

          {/* Loading bubble */}
          {loading && (
            <div className="flex justify-start animate-[fadeIn_0.2s_ease-out]">
              <div className="max-w-[70%] rounded-2xl px-3 py-2 text-sm border border-black/10 shadow-[4px_4px_0px_#00000015] bg-white">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span
                      className="h-2 w-2 rounded-full bg-neutral-700 animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <span
                      className="h-2 w-2 rounded-full bg-neutral-700 animate-bounce"
                      style={{ animationDelay: "120ms" }}
                    />
                    <span
                      className="h-2 w-2 rounded-full bg-neutral-700 animate-bounce"
                      style={{ animationDelay: "240ms" }}
                    />
                  </div>
                  <button
                    onClick={() => {
                      try {
                        chatControllerRef.current?.abort();
                      } catch {}
                      setLoading(false);
                    }}
                    className="px-2 h-7 rounded-full bg-white border border-black/10 shadow-[3px_3px_0px_#00000012] text-xs hover:scale-[1.02]"
                    title="Cancel AI request"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Voice overlay */}
        {interimTranscript && (
          <div className="mt-3 rounded-xl bg-[#e5f4ff] border border-black/10 p-3 shadow-[4px_4px_0px_#00000015] animate-[fadeIn_0.2s_ease-out]">
            <div className="text-xs font-medium mb-1">Recording...</div>
            <div className="text-sm">{interimTranscript}</div>
          </div>
        )}

        <div className="mt-4 flex items-center gap-3 flex-wrap">
          <MicButton
            listening={listening}
            onStart={() => {
              if (!supported) {
                console.warn("Browser does not support audio recording.");
                return;
              }
              try {
                speechSynthesis.cancel();
              } catch {}
              start({ autoStopBySilence: micMode === "toggle" });
            }}
            onStop={stop}
            mode={micMode}
          />
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <span>
              {micMode === "hold" ? "Hold to speak" : "Tap to speak"} (English)
            </span>
            {micMode === "toggle" && (
              <span className="text-neutral-400">
                • Auto-stop on silence ~{(silenceMs / 1000).toFixed(1)}s
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 rounded-full border border-black/10 bg-white shadow-[4px_4px_0px_#00000015] p-1">
            <button
              onClick={() => setMicMode("hold")}
              className={`px-3 h-7 rounded-full text-xs ${
                micMode === "hold"
                  ? "bg-[#1093DB] text-white"
                  : "bg-white text-neutral-700"
              }`}
              title="Hold-to-speak mode"
            >
              Hold
            </button>
            <button
              onClick={() => setMicMode("toggle")}
              className={`px-3 h-7 rounded-full text-xs ${
                micMode === "toggle"
                  ? "bg-[#1093DB] text-white"
                  : "bg-white text-neutral-700"
              }`}
              title="Tap-once mode"
            >
              Toggle
            </button>
          </div>
        </div>
      </div>
      <LoginPrompt
        open={showLogin}
        onClose={() => setShowLogin(false)}
        onSuccess={handleLoginSuccess}
      />
    </div>
  );
}
