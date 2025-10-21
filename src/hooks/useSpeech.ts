import { useCallback, useEffect, useRef, useState } from "react";

// Minimal Web Speech API typings to avoid 'any'
export type RecognitionCtor = new () => SpeechRecognitionLike;
export interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: Array<SpeechRecognitionResultLike>;
}
export interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript?: string };
}
export interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onspeechend: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: Event) => void) | null;
}

export function useSpeechRecognition() {
  const SpeechRecognitionCtor: RecognitionCtor | undefined =
    typeof window !== "undefined"
      ? (
          (window as unknown as {
            SpeechRecognition?: RecognitionCtor;
            webkitSpeechRecognition?: RecognitionCtor;
          }).SpeechRecognition ||
          (window as unknown as {
            SpeechRecognition?: RecognitionCtor;
            webkitSpeechRecognition?: RecognitionCtor;
          }).webkitSpeechRecognition
        )
      : undefined;

  const supported = Boolean(SpeechRecognitionCtor);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");

  useEffect(() => {
    if (!supported || !SpeechRecognitionCtor) return;
    const rec = new SpeechRecognitionCtor();
    rec.lang = "en-US";
    rec.continuous = false; // auto-stop after a pause
    rec.interimResults = true; // show live text while speaking

    rec.onresult = (e: SpeechRecognitionEventLike) => {
      let interim = "";
      let finalText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        const text = result[0]?.transcript ?? "";
        if (result.isFinal) {
          finalText += text + " ";
        } else {
          interim = text;
        }
      }
      if (finalText) setTranscript((prev) => `${prev} ${finalText}`.trim());
      setInterimTranscript(interim);
    };

    // Auto-stop as soon as Chrome detects speech end (silence)
    rec.onspeechend = () => {
      setInterimTranscript("");
      try {
        rec.stop();
      } catch {
        /* noop */
      }
    };

    rec.onend = () => {
      setListening(false);
      setInterimTranscript("");
    };

    rec.onerror = () => {
      setListening(false);
    };

    recognitionRef.current = rec;
    return () => {
      rec.onresult = null;
      rec.onend = null;
      rec.onerror = null;
      rec.onspeechend = null;
    };
  }, [SpeechRecognitionCtor, supported]);

  const start = useCallback(() => {
    if (!supported || !recognitionRef.current) return;
    setTranscript("");
    setInterimTranscript("");
    setListening(true);
    try {
      recognitionRef.current.start();
    } catch {
      /* noop */
    }
  }, [supported]);

  const stop = useCallback(() => {
    if (!supported || !recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch {
      /* noop */
    }
  }, [supported]);

  const abort = useCallback(() => {
    if (!supported || !recognitionRef.current) return;
    try {
      recognitionRef.current.abort();
    } catch {
      /* noop */
    }
  }, [supported]);

  const reset = useCallback(() => {
    setTranscript("");
    setInterimTranscript("");
  }, []);

  return {
    supported,
    listening,
    transcript,
    interimTranscript,
    start,
    stop,
    abort,
    reset,
  };
}

export function speak(text: string) {
  if (typeof window === "undefined") return;
  const synth = window.speechSynthesis;
  if (!synth) return;
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "en-US";
  utter.rate = 1;
  utter.pitch = 1;
  const voices = synth.getVoices();
  const enVoice =
    voices.find(
      (v) =>
        v.lang?.startsWith?.("en") && v.name?.toLowerCase?.().includes("female")
    ) || voices.find((v) => v.lang?.startsWith?.("en"));
  if (enVoice) utter.voice = enVoice;
  // Avoid overlapping speech
  if (synth.speaking) synth.cancel();
  synth.speak(utter);
}
