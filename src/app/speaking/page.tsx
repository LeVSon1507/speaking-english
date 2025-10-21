"use client";
import { Suspense } from "react";
import SpeakingContent from "./SpeakingContent";

export default function SpeakingPage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-neutral-500">Loading...</div>}>
      <SpeakingContent />
    </Suspense>
  );
}
