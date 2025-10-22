import { useCallback, useEffect, useRef, useState } from "react";

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
  const [error, setError] = useState<string | null>(null);

  // Fallback recording to server STT when native is unsupported
  const [mode, setMode] = useState<"native" | "server">("native");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mimeRef = useRef<string>("");

  useEffect(() => {
    const canMediaRecord =
      typeof navigator !== "undefined" &&
      typeof navigator.mediaDevices?.getUserMedia === "function" &&
      typeof MediaRecorder !== "undefined";
    if (!supported && canMediaRecord) {
      setMode("server");
    } else {
      setMode("native");
    }
  }, [supported]);

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

    rec.onerror = (e: Event) => {
      setListening(false);
      setInterimTranscript("");
      const ev = e as unknown as { error?: string; message?: string };
      let msg = "Microphone error";
      if (ev?.error === "not-allowed") msg = "Microphone permission denied";
      else if (ev?.error === "audio-capture") msg = "Microphone not found";
      else if (typeof ev?.message === "string" && ev.message) msg = ev.message;
      setError(msg);
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
    async (opts?: { autoStopBySilence?: boolean }) => {
      const now = Date.now();
      if (now - lastActionTsRef.current < 300) return;
      lastActionTsRef.current = now;
      if (listening) return;
      setTranscript("");
      setInterimTranscript("");
      setError(null);

      if (mode === "native") {
        if (!supported || !recognitionRef.current) return;
        // Configure auto-stop behavior per mode
        autoStopBySilenceRef.current = opts?.autoStopBySilence ?? true;
        setListening(true);
        hasFirstResultRef.current = false;
        lastSpeechTsRef.current = 0;
        try {
          recognitionRef.current.start();
        } catch (e) {
          const ev = e as unknown as { message?: string };
          setError(ev?.message || "Failed to start microphone");
          setListening(false);
        }
      } else {
        try {
          if (
            typeof navigator === "undefined" ||
            typeof navigator.mediaDevices?.getUserMedia !== "function"
          ) {
            setError("Microphone access is not available");
            return;
          }
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          streamRef.current = stream;
          let mime = "audio/webm;codecs=opus";
          if (typeof MediaRecorder !== "undefined" && !MediaRecorder.isTypeSupported(mime)) {
            mime = "audio/ogg;codecs=opus";
          }
          mimeRef.current = mime;
          const rec = new MediaRecorder(stream, { mimeType: mime });
          chunksRef.current = [];
          rec.ondataavailable = (e: BlobEvent) => {
            if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
          };
          rec.onstop = () => {
            setInterimTranscript("");
          };
          recorderRef.current = rec;
          setListening(true);
          setInterimTranscript("Recording...");
          rec.start();
        } catch (e) {
          const ev = e as unknown as { message?: string };
          setError(ev?.message || "Failed to start microphone");
          setListening(false);
        }
      }
    },
    [supported, listening, mode]
  );

  const stop = useCallback(() => {
    const now = Date.now();
    if (now - lastActionTsRef.current < 300) return; // debounce
    lastActionTsRef.current = now;

    if (mode === "native") {
      if (!supported || !recognitionRef.current) return;
      setListening(false);
      try {
        recognitionRef.current.stop();
      } catch {
        /* noop */
      }
    } else {
      const rec = recorderRef.current;
      if (!rec) {
        setListening(false);
        setInterimTranscript("");
        return;
      }
      rec.onstop = async () => {
        try {
          const blob = new Blob(chunksRef.current, { type: mimeRef.current || "audio/webm" });
          chunksRef.current = [];
          recorderRef.current = null;
          // Stop tracks
          streamRef.current?.getTracks()?.forEach((t) => t.stop());
          streamRef.current = null;

          const res = await fetch("/api/stt", {
            method: "POST",
            headers: {
              "Content-Type": "application/octet-stream",
              "X-Mime-Type": blob.type || "audio/webm",
              "X-Language": "en-US",
            },
            body: blob,
          });
          const data = await res.json();
          if (!res.ok) {
            setError(data?.error || "Speech-to-Text failed");
            setListening(false);
            setInterimTranscript("");
            return;
          }
          const text = (data?.transcript || "").trim();
          setTranscript(text);
          setInterimTranscript("");
          setListening(false);
        } catch (e) {
          const ev = e as unknown as { message?: string };
          setError(ev?.message || "Failed to process audio");
          setListening(false);
          setInterimTranscript("");
        }
      };
      try {
        rec.stop();
      } catch {
        setListening(false);
        setInterimTranscript("");
      }
    }
  }, [supported, mode]);

  const abort = useCallback(() => {
    if (mode === "native") {
      if (!supported || !recognitionRef.current) return;
      setListening(false);
      setInterimTranscript("");
      try {
        recognitionRef.current.abort();
      } catch {
        /* noop */
      }
    } else {
      try {
        recorderRef.current?.stop();
      } catch {
        /* noop */
      }
      setListening(false);
      setInterimTranscript("");
      streamRef.current?.getTracks()?.forEach((t) => t.stop());
      streamRef.current = null;
      chunksRef.current = [];
    }
  }, [supported, mode]);

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
    setError(null);
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
    error,
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
