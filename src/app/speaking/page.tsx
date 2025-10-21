"use client";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { useSpeechRecognition, speak } from "@/hooks/useSpeech";
import MicButton from "@/components/MicButton";
import { Bookmark, Volume2, Copy } from "lucide-react";
import { useSearchParams } from "next/navigation";

export default function SpeakingPage() {
  const params = useSearchParams();
  const topicParam =
    params.get("topic") ||
    "Could you tell me about your UI/UX design experience?";
  const lessonId = params.get("lesson") || "daily";

  const { supported, listening, transcript, interimTranscript, start, stop } =
    useSpeechRecognition();
  const {
    messages,
    addMessage,
    ipa,
    setIPA,
    turns,
    incTurns,
    clearConversation,
  } = useAppStore();

  const [mounted, setMounted] = useState(false);
  const [readWhileRecording, setReadWhileRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savedToast, setSavedToast] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Save selected topic into localStorage vocabulary on first mount
  useEffect(() => {
    if (!mounted) return;
    const key = "my_vocab";
    try {
      const raw = localStorage.getItem(key);
      const list: Array<{ lesson: string; topic: string; time: number }> = raw
        ? JSON.parse(raw)
        : [];
      // Avoid duplicate consecutive saves
      if (!list.length || list[list.length - 1]?.topic !== topicParam) {
        list.push({ lesson: lessonId, topic: topicParam, time: Date.now() });
        localStorage.setItem(key, JSON.stringify(list));
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, lessonId, topicParam]);

  useEffect(() => {
    if (!listening && transcript) {
      void sendToAI(transcript);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      // Auto read reply when not recording, or if user allows reading during recording
      if (!listening || readWhileRecording) speak(reply);
      incTurns();
    } catch (e) {
      addMessage({
        role: "assistant",
        content: "Có lỗi khi gọi AI. Kiểm tra API key server.",
      });
    } finally {
      setLoading(false);
    }
  }

  const lastAssistant = useMemo(
    () => [...messages].reverse().find((m) => m.role === "assistant"),
    [messages]
  );

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
  };

  const saveCurrentTopic = () => {
    try {
      const key = "my_vocab";
      const raw = localStorage.getItem(key);
      const list: Array<{ lesson: string; topic: string; time: number }> = raw
        ? JSON.parse(raw)
        : [];
      list.push({ lesson: lessonId, topic: topicParam, time: Date.now() });
      localStorage.setItem(key, JSON.stringify(list));
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 1500);
    } catch {}
  };

  if (!mounted) {
    return <div className="min-h-screen bg-white" />;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header with progress + Clear */}
      <div className="container px-4 py-3 flex items-center justify-between">
        <button className="text-sm">◀</button>
        <div className="text-sm">{turns} / 5</div>
        <button
          className="hover:bg-orange-100 cursor-pointer text-xs rounded-lg border border-black/10 px-2 py-1 bg-white shadow-[2px_2px_0px_#00000020]"
          onClick={clearConversation}
        >
          Clear conversation
        </button>
      </div>

      {/* Orange hero with illustration and topic */}
      <div className="mx-4 rounded-3xl bg-orange-400 border border-black/10 shadow-[6px_6px_0px_#00000020] overflow-hidden">
        <div className="relative h-40">
          <Image
            src="/undraw/undraw_conference-speaker_balr.svg"
            alt="Speaking"
            fill
            className="object-contain p-4"
            priority
          />
        </div>
        <div className="px-6 pb-6 text-white font-semibold">{topicParam}</div>
      </div>

      {/* White response bubble + IPA tips */}
      <div className="mx-4 mt-4 bg-white rounded-3xl border border-black/10 shadow-[6px_6px_0px_#00000020]">
        <div className="p-6 space-y-3">
          <div className="font-semibold">
            I have more than 1 year experience in UI design field.
          </div>
          <div className="rounded-xl border border-black/10 p-4 text-sm">
            <ul className="list-disc pl-5 space-y-1">
              <li>Sound to improve: /θ/, /s/, /z/</li>
              <li>Try giving a more detailed answer.</li>
            </ul>
          </div>
        </div>
        {ipa?.ipa?.length ? (
          <div className="px-6 pb-6">
            <div className="text-xs text-neutral-700">IPA Pronunciation</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {ipa.ipa.map((w, i) => (
                <span
                  key={i}
                  className="px-2 py-1 rounded-full bg-neutral-100 border border-black/10"
                >
                  {w.word} — /{w.ipa}/
                </span>
              ))}
            </div>
            {ipa.tips && <p className="mt-2 text-sm">Gợi ý: {ipa.tips}</p>}
          </div>
        ) : null}
      </div>

      {/* Live transcript overlay while recording (Chrome-friendly) */}
      {listening && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 max-w-[90%] px-4 py-2 rounded-xl bg-white/90 backdrop-blur border border-black/10 shadow-[4px_4px_0px_#00000020] text-sm">
          <span className="font-semibold">Đang ghi âm:</span>{" "}
          {interimTranscript || "..."}
        </div>
      )}

      {/* Bottom controls */}
      <div className="fixed bottom-4 left-0 right-0 flex items-center justify-center gap-4">
        <button
          className="h-12 w-12 rounded-full border border-black/10 bg-white shadow-[4px_4px_0px_#00000020] grid place-items-center"
          aria-label="Bookmark"
          onClick={saveCurrentTopic}
        >
          <Bookmark className="h-5 w-5" />
        </button>
        <MicButton listening={listening} onStart={start} onStop={stop} />
        <div className="flex items-center gap-2">
          <button
            className="h-12 w-12 rounded-full border border-black/10 bg-white shadow-[4px_4px_0px_#00000020] grid place-items-center"
            aria-label="Đọc to"
            onClick={() => lastAssistant && speak(lastAssistant.content)}
          >
            <Volume2 className="h-5 w-5" />
          </button>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              className="accent-black"
              checked={readWhileRecording}
              onChange={(e) => setReadWhileRecording(e.target.checked)}
            />
            Đọc khi ghi âm
          </label>
        </div>
      </div>

      {/* Chat bubbles */}
      <div className="container px-4 pb-28 mt-4 space-y-2">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[80%] px-4 py-2 rounded-2xl border border-black/10 shadow-[4px_4px_0px_#00000020] ${
              m.role === "assistant" ? "bg-neutral-100" : "bg-[#D8F3FF]"
            }`}
          >
            <div className="flex items-start gap-2">
              <div className="flex-1">{m.content}</div>
              <button
                className="p-1 rounded-md border border-black/10 bg-white shadow-[2px_2px_0px_#00000020]"
                aria-label="Copy"
                onClick={() => copyText(m.content)}
              >
                <Copy className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}

        {/* Loading bubble while waiting for AI */}
        {loading && (
          <div className="max-w-[80%] px-4 py-2 rounded-2xl border border-black/10 shadow-[4px_4px_0px_#00000020] bg-neutral-100 inline-flex items-center gap-2">
            <span className="text-xs text-neutral-500">Đang trả lời...</span>
            <span className="flex items-center gap-1">
              <span
                className="h-2 w-2 rounded-full bg-neutral-400 animate-bounce"
                style={{ animationDelay: "0ms" }}
              />
              <span
                className="h-2 w-2 rounded-full bg-neutral-400 animate-bounce"
                style={{ animationDelay: "150ms" }}
              />
              <span
                className="h-2 w-2 rounded-full bg-neutral-400 animate-bounce"
                style={{ animationDelay: "300ms" }}
              />
            </span>
          </div>
        )}
      </div>

      {/* Helper banner */}
      {!supported && (
        <div className="fixed bottom-24 left-0 right-0 flex justify-center">
          <div className="bg-white border border-black/10 rounded-xl shadow-[4px_4px_0px_#00000020] px-3 py-2 text-sm">
            Trình duyệt không hỗ trợ nhận diện giọng nói. Bạn vẫn có thể chat
            bằng văn bản.
          </div>
        </div>
      )}

      {/* Saved toast */}
      {savedToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-white border border-black/10 rounded-xl shadow-[4px_4px_0px_#00000020] px-3 py-2 text-xs">
          Đã lưu vào từ vựng của bạn.
        </div>
      )}
    </div>
  );
}
