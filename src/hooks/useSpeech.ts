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
          window as unknown as {
            SpeechRecognition?: RecognitionCtor;
            webkitSpeechRecognition?: RecognitionCtor;
          }
        ).SpeechRecognition ||
        (
          window as unknown as {
            SpeechRecognition?: RecognitionCtor;
            webkitSpeechRecognition?: RecognitionCtor;
          }
        ).webkitSpeechRecognition
      : undefined;

  const supported = Boolean(SpeechRecognitionCtor);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const lastActionTsRef = useRef<number>(0);
  const lastSpeechTsRef = useRef<number>(0);
  const hasFirstResultRef = useRef<boolean>(false);
  const silenceTimerRef = useRef<number | null>(null);
  const SILENCE_MS = 1200;
  const autoStopBySilenceRef = useRef<boolean>(true);

  useEffect(() => {
    if (!supported || !SpeechRecognitionCtor) return;
    const rec = new SpeechRecognitionCtor();
    rec.lang = "en-US";
    rec.continuous = true;
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
      hasFirstResultRef.current = true;
      lastSpeechTsRef.current = Date.now();
    };

    rec.onspeechend = () => {
      setInterimTranscript("");
    };

    rec.onend = () => {
      setListening(false);
      setInterimTranscript("");
      if (silenceTimerRef.current != null) {
        clearInterval(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    };

    rec.onerror = () => {
      setListening(false);
      setInterimTranscript("");
      if (silenceTimerRef.current != null) {
        clearInterval(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    };

    recognitionRef.current = rec;
    return () => {
      rec.onresult = null;
      rec.onend = null;
      rec.onerror = null;
      rec.onspeechend = null;
      if (silenceTimerRef.current != null) {
        clearInterval(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    };
  }, [SpeechRecognitionCtor, supported]);

  const start = useCallback(
    (opts?: { autoStopBySilence?: boolean }) => {
      if (!supported || !recognitionRef.current) return;
      const now = Date.now();
      if (now - lastActionTsRef.current < 300) return;
      lastActionTsRef.current = now;
      if (listening) return;
      // Configure auto-stop behavior per mode
      autoStopBySilenceRef.current = opts?.autoStopBySilence ?? true;
      setTranscript("");
      setInterimTranscript("");
      setListening(true);
      hasFirstResultRef.current = false;
      lastSpeechTsRef.current = 0;
      try {
        recognitionRef.current.start();
      } catch {
        /* noop */
      }
    },
    [supported, listening]
  );

  const stop = useCallback(() => {
    if (!supported || !recognitionRef.current) return;
    const now = Date.now();
    if (now - lastActionTsRef.current < 300) return; // debounce
    lastActionTsRef.current = now;
    setListening(false);
    try {
      recognitionRef.current.stop();
    } catch {
      /* noop */
    }
  }, [supported]);

  const abort = useCallback(() => {
    if (!supported || !recognitionRef.current) return;
    setListening(false);
    setInterimTranscript("");
    try {
      recognitionRef.current.abort();
    } catch {
      /* noop */
    }
  }, [supported]);

  useEffect(() => {
    if (!supported) return;
    if (listening && autoStopBySilenceRef.current) {
      if (silenceTimerRef.current != null) {
        clearInterval(silenceTimerRef.current);
      }
      silenceTimerRef.current = window.setInterval(() => {
        if (!hasFirstResultRef.current) return;
        const since = Date.now() - lastSpeechTsRef.current;
        if (since > SILENCE_MS) {
          try {
            recognitionRef.current?.stop();
          } catch {
            /* noop */
          }
        }
      }, 250);
      return () => {
        if (silenceTimerRef.current != null) {
          clearInterval(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
      };
    } else {
      if (silenceTimerRef.current != null) {
        clearInterval(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    }
  }, [listening, supported]);

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
    silenceMs: SILENCE_MS,
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
