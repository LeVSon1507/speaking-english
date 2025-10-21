"use client";
import { Mic, Square } from "lucide-react";

export default function MicButton({
  listening,
  onStart,
  onStop,
}: {
  listening: boolean;
  onStart: () => void;
  onStop: () => void;
}) {
  return (
    <button
      onClick={() => (listening ? onStop() : onStart())}
      className={`h-16 w-16 rounded-full bg-[#1093DB] text-white border border-black/10 shadow-[6px_6px_0px_#00000020] transition active:translate-y-[2px] ${
        listening ? "animate-pulse bg-red-500" : ""
      }`}
      title={listening ? "Đang ghi" : "Nhấn để nói"}
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
