"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { useSpeechRecognition, speak } from "@/hooks/useSpeech";
import MicButton from "@/components/MicButton";
import { Bookmark, Volume2 } from "lucide-react";

export default function SpeakingPage() {
  const { supported, listening, transcript, interimTranscript, start, stop } =
    useSpeechRecognition();
  const { messages, addMessage, ipa, setIPA, turns, incTurns } = useAppStore();

  const [mounted, setMounted] = useState(false);
  const [readWhileRecording, setReadWhileRecording] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");

  if (!mounted) {
    return <div className="min-h-screen bg-white" />;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header with progress */}
      <div className="container px-4 py-3 flex items-center justify-between">
        <button className="text-sm">◀</button>
        <div className="text-sm">{turns} / 5</div>
        <button className="text-sm">▶</button>
      </div>

      {/* Orange hero with illustration */}
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
        <div className="px-6 pb-6 text-white font-semibold">
          Could you tell me about your UI/UX design experience?
        </div>
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
          <span className="font-semibold">Đang ghi âm:</span> {interimTranscript || "..."}
        </div>
      )}

      {/* Bottom controls */}
      <div className="fixed bottom-4 left-0 right-0 flex items-center justify-center gap-4">
        <button className="h-12 w-12 rounded-full border border-black/10 bg-white shadow-[4px_4px_0px_#00000020] grid place-items-center" aria-label="Bookmark">
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
            {m.content}
          </div>
        ))}

        {/* Loading bubble while waiting for AI */}
        {loading && (
          <div className="max-w-[80%] px-4 py-2 rounded-2xl border border-black/10 shadow-[4px_4px_0px_#00000020] bg-neutral-100 inline-flex items-center gap-2">
            <span className="text-xs text-neutral-500">Đang trả lời...</span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="h-2 w-2 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="h-2 w-2 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: "300ms" }} />
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
    </div>
  );
}
