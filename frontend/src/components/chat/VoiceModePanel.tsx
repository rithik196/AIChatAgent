"use client";

import React from "react";
import { FilePlus2, Mic, X } from "lucide-react";
import type { VoiceState } from "@/hooks/useVoice";
import { cn } from "@/lib/utils";
import { VoiceWaveform } from "./VoiceWaveform";

interface VoiceModePanelProps {
  displayText: string;
  mode: "ai" | "user";
  voiceState: VoiceState;
  allowUpload: boolean;
  isLoading: boolean;
  onUpload: () => void;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onMicToggle: () => void;
  onClose: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

export function VoiceModePanel({
  displayText,
  mode,
  voiceState,
  allowUpload,
  isLoading,
  onUpload,
  onFileSelect,
  onMicToggle,
  onClose,
  fileInputRef,
}: VoiceModePanelProps) {
  const isAi = mode === "ai";
  const isListening = voiceState === "listening";
  const isUserWaiting = mode === "user" && voiceState === "idle";
  const waveformActive = isAi || isListening;
  const statusLabel = isAi ? "AI Speaking" : isListening ? "User Speaking" : "Open your mic to answer";

  return (
    <div className="rounded-t-[24px] border border-slate-200 bg-[#EFF9FF] px-4 pb-4 pt-3 shadow-[0_-4px_18px_-10px_rgba(15,23,42,0.45)]">
      <div
        className={cn(
          "max-h-[42vh] min-h-[80px] overflow-y-auto whitespace-pre-wrap break-words rounded-xl px-4 py-3 type-body-md-strong text-[#0D141A]",
          isAi
            ? "bg-gradient-to-r from-[#E9F8FF] to-[#BFE4F8]"
            : "bg-gradient-to-r from-[#FFD096] to-[#E6A09C]"
        )}
      >
        {displayText}
      </div>

      <div className="pt-4">
        <VoiceWaveform mode={mode} active={waveformActive} />
        <div className={cn("mt-1 text-center text-[11px] leading-4", isAi ? "text-[#247EA5]" : "text-[#C65F28]")}>
          {statusLabel}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-center gap-9">
        <button
          type="button"
          onClick={onUpload}
          disabled={!allowUpload || isLoading || voiceState === "listening"}
          className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-[#425768] shadow-sm transition-colors hover:text-[#0D141A] disabled:cursor-not-allowed disabled:text-slate-300"
          aria-label="Upload document"
          title={allowUpload ? "Upload document" : "Upload is currently unavailable"}
        >
          <FilePlus2 className="h-6 w-6" />
        </button>

        <button
          type="button"
          onClick={onMicToggle}
          disabled={voiceState === "processing" || isLoading}
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-xl bg-white text-[#425768] shadow-sm transition-colors hover:text-[#0D141A] disabled:cursor-not-allowed disabled:text-slate-300",
            isUserWaiting && "text-[#C65F28] shadow-[0_0_0_3px_rgba(198,95,40,0.16),0_8px_18px_-12px_rgba(198,95,40,0.9)]",
            isListening && "bg-[#FFF3E8] text-[#C65F28] shadow-[0_0_0_4px_rgba(198,95,40,0.24),0_10px_22px_-12px_rgba(198,95,40,0.95)]"
          )}
          aria-label={voiceState === "listening" ? "Stop listening" : "Start listening"}
          title={voiceState === "listening" ? "Stop listening" : "Start listening"}
        >
          <Mic className="h-6 w-6" />
        </button>

        <button
          type="button"
          onClick={onClose}
          className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-[#425768] shadow-sm transition-colors hover:text-[#0D141A]"
          aria-label="Close voice mode"
          title="Close voice mode"
        >
          <X className="h-7 w-7" />
        </button>

        <input
          ref={fileInputRef}
          type="file"
          onChange={onFileSelect}
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png"
        />
      </div>
    </div>
  );
}
