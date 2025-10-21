"use client";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Copy, Bookmark, Volume2 } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { useSearchParams, useRouter } from "next/navigation";
import MicButton from "@/components/MicButton";
import { useSpeechRecognition } from "@/hooks/useSpeech";

export default function SpeakingContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { supported, listening, transcript, interimTranscript, start, stop } =
    useSpeechRecognition();
  const { messages, clearConversation, addMessage, setIPA, ipa } =
    useAppStore();

  const [loading, setLoading] = useState(false);

  const topic = params.get("topic") || "Chào hỏi và giới thiệu bản thân";

  useEffect(() => {
    try {
      const raw = localStorage.getItem("my_vocab");
      const list = raw ? JSON.parse(raw) : [];
      const exists = list.some((t: string) => t === topic);
      if (!exists) {
        const next = [topic, ...list].slice(0, 100);
        localStorage.setItem("my_vocab", JSON.stringify(next));
      }
    } catch {}
  }, [topic]);

  const speakText = (text: string) => {
    try {
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = "en-US";
      speechSynthesis.cancel();
      speechSynthesis.speak(utter);
    } catch {}
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
  };

  const handleBookmark = () => {
    try {
      const raw = localStorage.getItem("my_vocab");
      const list = raw ? JSON.parse(raw) : [];
      const next = [topic, ...list.filter((t: string) => t !== topic)].slice(
        0,
        100
      );
      localStorage.setItem("my_vocab", JSON.stringify(next));
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
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userText: text }),
      });
      const data = await res.json();
      const reply = data.reply || "Okay.";
      addMessage({ role: "assistant", content: reply });
      setIPA({ ipa: data.ipa || [], tips: data.tips });
    } catch (e) {
      addMessage({
        role: "assistant",
        content: "Có lỗi khi gọi AI. Kiểm tra API key server.",
      });
    } finally {
      setLoading(false);
    }
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
            className="h-9 w-9 grid place-items-center rounded-full border border-black/10 bg-white shadow-[4px_4px_0px_#00000015] transition-transform duration-200 hover:scale-[1.05] active:translate-y-[1px]"
            title="Trở về Trang chủ"
          >
            <span className="text-lg">◀</span>
          </button>
          <span className="text-sm text-neutral-500">Speaking</span>
        </div>
        <button
          onClick={() => clearConversation()}
          className="px-3 h-9 rounded-full bg-white border border-black/10 shadow-[4px_4px_0px_#00000015] text-sm transition-colors transition-transform duration-200 hover:bg-neutral-50 hover:scale-[1.02] active:translate-y-[1px]"
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
          <div className="text-xs text-neutral-600">Chủ đề đang luyện nói</div>
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={() => speakText(heroTitle)}
              className="h-8 w-8 grid place-items-center rounded-full border border-black/10 bg-white shadow-[4px_4px_0px_#00000015] transition-transform duration-200 hover:scale-[1.05] active:translate-y-[1px]"
              title="Đọc to"
            >
              <Volume2 className="h-4 w-4" />
            </button>
            <button
              onClick={handleBookmark}
              className="px-3 h-8 rounded-full bg-white border border-black/10 shadow-[4px_4px_0px_#00000015] text-xs transition-transform duration-200 hover:scale-[1.05] active:translate-y-[1px]"
            >
              <Bookmark className="h-4 w-4 inline mr-1" /> Bookmark
            </button>
          </div>
        </div>
      </div>

      {/* Chat */}
      <div className="bg-white p-5 rounded-2xl border border-black/10 shadow-md">
        <div className="mb-3 text-sm text-neutral-500">Cuộc hội thoại</div>
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
                      className="h-8 w-8 grid place-items-center rounded-full border border-black/10 bg-white shadow-[3px_3px_0px_#00000012] transition-transform duration-200 hover:scale-[1.05] active:translate-y-[1px]"
                      title="Đọc to"
                    >
                      <Volume2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleCopy(m.content)}
                      className="h-8 w-8 grid place-items-center rounded-full border border-black/10 bg-white shadow-[3px_3px_0px_#00000012] transition-transform duration-200 hover:scale-[1.05] active:translate-y-[1px]"
                      title="Copy"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>

                  {m.role === "assistant" && ipa?.ipa?.length ? (
                    <div className="flex-1 min-w-0 max-h-24 overflow-y-auto">
                      <div className="flex flex-wrap gap-2">
                        {ipa.ipa.map((w, idx) => (
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
              </div>
            </div>
          )}
        </div>

        {/* Voice overlay */}
        {interimTranscript && (
          <div className="mt-3 rounded-xl bg-[#e5f4ff] border border-black/10 p-3 shadow-[4px_4px_0px_#00000015] animate-[fadeIn_0.2s_ease-out]">
            <div className="text-xs font-medium mb-1">Đang ghi âm...</div>
            <div className="text-sm">{interimTranscript}</div>
          </div>
        )}

        <div className="mt-4 flex items-center gap-3">
          <MicButton listening={listening} onStart={start} onStop={stop} />
          <div className="text-xs text-neutral-500">Nhấn để nói (English)</div>
        </div>
      </div>
    </div>
  );
}