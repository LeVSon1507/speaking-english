"use client";
import { useRef } from "react";
import { Mic, Square } from "lucide-react";

export default function MicButton({
  listening,
  onStart,
  onStop,
  mode = "hold",
  releaseDelayMs = 350,
}: {
  listening: boolean;
  onStart: () => void;
  onStop: () => void;
  mode?: "toggle" | "hold";
  releaseDelayMs?: number;
}) {
  const stopTimerRef = useRef<number | null>(null);

  function playBeep(type: "start" | "stop") {
    try {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = type === "start" ? 880 : 440;
      gain.gain.value = 0.05;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch {}
  }

  const handleClick = () => {
    if (mode === "toggle") {
      if (listening) {
        playBeep("stop");
        onStop();
      } else {
        playBeep("start");
        onStart();
      }
    }
  };

  const handleDown = () => {
    if (mode === "hold") {
      if (stopTimerRef.current != null) {
        clearTimeout(stopTimerRef.current);
        stopTimerRef.current = null;
      }
      playBeep("start");
      onStart();
    }
  };
  const handleUpLeave = () => {
    if (mode === "hold") {
      playBeep("stop");
      if (stopTimerRef.current == null) {
        stopTimerRef.current = window.setTimeout(() => {
          onStop();
          stopTimerRef.current = null;
        }, releaseDelayMs);
      }
    }
  };

  return (
    <button
      onClick={mode === "toggle" ? handleClick : undefined}
      onPointerDown={mode === "hold" ? handleDown : undefined}
      onPointerUp={mode === "hold" ? handleUpLeave : undefined}
      onPointerLeave={mode === "hold" ? handleUpLeave : undefined}
      onTouchStart={
        mode === "hold"
          ? (e) => {
              e.preventDefault();
              handleDown();
            }
          : undefined
      }
      onTouchEnd={
        mode === "hold"
          ? (e) => {
              e.preventDefault();
              handleUpLeave();
            }
          : undefined
      }
      className={`h-16 w-16 rounded-full bg-[#1093DB] text-white border border-black/10 shadow-[6px_6px_0px_#00000020] transition active:translate-y-[2px] ${
        listening ? "animate-pulse bg-red-500" : ""
      }`}
      title={
        listening
          ? mode === "hold"
            ? "Release to stop"
            : "Recording"
          : mode === "hold"
          ? "Hold to speak"
          : "Tap to speak"
      }
    >
      <div className="grid place-items-center h-full">
        {listening ? (
          <Square className="h-7 w-7" />
        ) : (
          <Mic className="h-7 w-7" />
        )}
      </div>
    </button>
  );
}
