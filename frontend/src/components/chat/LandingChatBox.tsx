"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import { ChatInputBar } from "./ChatInputBar";
import { VoiceModePanel } from "./VoiceModePanel";
import { useVoice } from "@/hooks/useVoice";
import { resolveLandingVoiceIntent, resolveProductIntent, type ProductId } from "@/lib/productIntent";
import type { JourneyVariant } from "@/lib/journeyConfig";

interface LandingChatBoxProps {
  onSelectProduct: (product: ProductId) => void;
  journeyVariant?: JourneyVariant;
}

function getLandingIntro(journeyVariant: JourneyVariant): string {
  if (journeyVariant === "india") {
    return "Hi, I am Raya. I can guide you through the Personal Finance journey for India, or start the application when you are ready.";
  }

  return "Hi, I am Raya. You can ask me about the finance options, or tell me which journey you want to start.";
}

export function LandingChatBox({ onSelectProduct, journeyVariant = "default" }: LandingChatBoxProps) {
  const [input, setInput] = useState("");
  const [voiceModeOpen, setVoiceModeOpen] = useState(false);
  const [voicePanelText, setVoicePanelText] = useState(
    getLandingIntro(journeyVariant)
  );
  const [lastVoiceUserText, setLastVoiceUserText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const routeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoListenAfterSpeechRef = useRef(false);
  const previousVoiceStateRef = useRef<"idle" | "listening" | "processing" | "speaking">("idle");
  const handleMessageRef = useRef<(text: string) => void>(() => {});

  const clearRouteTimer = useCallback(() => {
    if (routeTimerRef.current) {
      clearTimeout(routeTimerRef.current);
      routeTimerRef.current = null;
    }
  }, []);

  const { voiceState, interimText, supported, toggleVoice, speak, startListening, stopListening } = useVoice({
    language: "en-US",
    ttsEnabled: true,
    onTranscript: (text) => handleMessageRef.current(text),
  });

  const handleMessage = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      if (voiceModeOpen) {
        const result = resolveLandingVoiceIntent(trimmed, journeyVariant);

        setLastVoiceUserText(trimmed);
        setVoicePanelText(result.answer);

        clearRouteTimer();

        if (result.shouldRoute && result.product) {
          autoListenAfterSpeechRef.current = false;
          speak(result.answer, {
            onEnd: () => {
              clearRouteTimer();
              routeTimerRef.current = setTimeout(() => onSelectProduct(result.product!), 500);
            },
          });
          return;
        }

        autoListenAfterSpeechRef.current = true;
        speak(result.answer);
        return;
      }

      const result = resolveProductIntent(trimmed, journeyVariant);
      setVoicePanelText(result.answer);

      if (result.shouldRoute && result.product) {
        clearRouteTimer();
        routeTimerRef.current = setTimeout(() => onSelectProduct(result.product!), 450);
      }
    },
    [clearRouteTimer, journeyVariant, onSelectProduct, speak, voiceModeOpen]
  );

  useEffect(() => {
    handleMessageRef.current = handleMessage;
  }, [handleMessage]);

  useEffect(() => {
    return () => {
      clearRouteTimer();
    };
  }, [clearRouteTimer]);

  useEffect(() => {
    const previous = previousVoiceStateRef.current;
    if (
      voiceModeOpen &&
      previous === "speaking" &&
      voiceState === "idle" &&
      autoListenAfterSpeechRef.current
    ) {
      autoListenAfterSpeechRef.current = false;
      startListening();
    }
    previousVoiceStateRef.current = voiceState;
  }, [voiceModeOpen, voiceState, startListening]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!input.trim()) return;
    handleMessage(input);
    setInput("");
  };

  const handleOpenVoiceMode = () => {
    const intro =
      journeyVariant === "india"
        ? "Hi, I am Raya. I am your personal finance assistant for India. I can explain the Personal Finance journey or start your application when you are ready."
        : "Hi, I am Raya. I am your personal finance assistant. Let's start your digital finance application. You can ask me about the finance options, or tell me which journey you want to start.";
    setVoiceModeOpen(true);
    setVoicePanelText(intro);
    setLastVoiceUserText("");
    autoListenAfterSpeechRef.current = true;
    speak(intro);
  };

  const handleCloseVoiceMode = () => {
    autoListenAfterSpeechRef.current = false;
    clearRouteTimer();
    window.speechSynthesis?.cancel();
    stopListening();
    setVoiceModeOpen(false);
  };

  const voiceModeSpeaker = voiceState === "listening" || voiceState === "processing" ? "user" : "ai";
  const voiceModeText =
    voiceModeSpeaker === "ai"
      ? voicePanelText || "I am ready when you are."
      : interimText || lastVoiceUserText || "I am listening.";

  return (
    <div className="space-y-3">
      {voiceModeOpen ? (
        <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-3">
            <VoiceModePanel
              displayText={voiceModeText}
              mode={voiceModeSpeaker}
              voiceState={voiceState}
            allowUpload={false}
            isLoading={false}
            onUpload={() => {}}
            onFileSelect={() => {}}
            onMicToggle={toggleVoice}
            onClose={handleCloseVoiceMode}
            fileInputRef={fileInputRef}
          />
        </div>
      ) : (
        <ChatInputBar
          input={input}
          isLoading={false}
          allowUpload={false}
          voiceState={voiceState}
          supported={supported}
          onInputChange={setInput}
          onSubmit={handleSubmit}
          onUpload={() => {}}
          onFileSelect={() => {}}
          onDictationToggle={toggleVoice}
          onOpenVoiceMode={handleOpenVoiceMode}
          fileInputRef={fileInputRef}
        />
      )}
    </div>
  );
}
