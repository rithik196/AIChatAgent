"use client";

import { useRef, useState, useCallback, useEffect, useSyncExternalStore } from "react";
import { getFemaleVoice } from "@/lib/voice";

// ── Browser Speech API types ───────────────────────────────────────
interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message?: string;
}

type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
};

function getSpeechRecognition(): (new () => SpeechRecognitionInstance) | null {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  return (w.SpeechRecognition || w.webkitSpeechRecognition || null) as
    | (new () => SpeechRecognitionInstance)
    | null;
}

// NOTE: Do NOT check support at module level — it causes hydration mismatch
// because the server sees false while the client sees true. Instead, we check
// inside useEffect (see useVoice hook below).

// ── Hook ────────────────────────────────────────────────────────────
export type VoiceState = "idle" | "listening" | "processing" | "speaking";

type SpeakOptions = {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: () => void;
};

const TTS_START_TIMEOUT_MS = 1600;
const TTS_START_MAX_ATTEMPTS = 4;

function getTtsRetryDelayMs(attempt: number): number {
  if (attempt <= 2) return 0;
  if (attempt === 3) return 120;
  return 260;
}

function waitForSpeechVoices(synth: SpeechSynthesis, timeoutMs = 700): Promise<void> {
  if (synth.getVoices().length > 0) return Promise.resolve();

  return new Promise((resolve) => {
    let settled = false;
    const previousHandler = synth.onvoiceschanged;
    const timer = window.setTimeout(() => finish(), timeoutMs);

    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      synth.onvoiceschanged = previousHandler;
      resolve();
    };

    synth.onvoiceschanged = (event) => {
      if (typeof previousHandler === "function") {
        previousHandler.call(synth, event);
      }
      finish();
    };
  });
}

interface UseVoiceOptions {
  language?: string;
  ttsEnabled?: boolean;
  onTranscript: (text: string) => void;
}

export function useVoice({
  language = "en-US",
  ttsEnabled = true,
  onTranscript,
}: UseVoiceOptions) {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [interimText, setInterimText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const speechRequestIdRef = useRef(0);

  // Hydration-safe: returns false on server, true on client (no mismatch)
  const supported = useSyncExternalStore(
    () => () => {},                     // subscribe (static value, no-op)
    () => !!getSpeechRecognition(),      // client snapshot
    () => false                          // server snapshot
  );

  // ── Release mic stream (plain function, no useCallback needed) ────
  function releaseMic() {
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
  }

  // ── Start listening ───────────────────────────────────────────────
  const startListening = useCallback(async () => {
    const SpeechRec = getSpeechRecognition();
    if (!SpeechRec) return;

    setError(null);

    // Acquire mic permission first
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
    } catch (err: unknown) {
      const e = err as { name?: string; message?: string };
      const msg =
        e.name === "NotAllowedError"
          ? "Microphone access denied. Please allow mic permission in your browser settings."
          : e.name === "NotFoundError"
          ? "No microphone found. Please connect a mic and try again."
          : `Microphone error: ${e.message || e.name}`;
      setError(msg);
      setVoiceState("idle");
      return;
    }

    // Cancel any ongoing TTS
    speechRequestIdRef.current += 1;
    window.speechSynthesis?.cancel();

    const recognition = new SpeechRec();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onstart = () => {
      setVoiceState("listening");
      setInterimText("");
    };

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      let final = "";
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const transcript = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += transcript;
        else interim += transcript;
      }
      if (interim) setInterimText(interim);
      if (final.trim()) {
        setInterimText("");
        setVoiceState("processing");
        onTranscript(final.trim());
      }
    };

    recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
      if (e.error === "audio-capture") {
        setError("Could not capture audio. Check your microphone and browser permissions.");
      } else if (e.error !== "no-speech" && e.error !== "aborted") {
        console.error("Speech recognition error:", e.error);
      }
      releaseMic();
      setVoiceState("idle");
      setInterimText("");
    };

    recognition.onend = () => {
      releaseMic();
      setVoiceState((prev) => (prev === "listening" ? "idle" : prev));
      setInterimText("");
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [language, onTranscript]);

  // ── Stop listening ────────────────────────────────────────────────
  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    releaseMic();
    setVoiceState("idle");
    setInterimText("");
  }, []);

  // ── Toggle ────────────────────────────────────────────────────────
  const toggleVoice = useCallback(() => {
    if (voiceState === "listening") {
      stopListening();
    } else if (voiceState === "idle" || voiceState === "processing") {
      if (voiceState === "processing") setVoiceState("idle");
      else startListening();
    } else if (voiceState === "speaking") {
      speechRequestIdRef.current += 1;
      window.speechSynthesis?.cancel();
      setVoiceState("idle");
    }
  }, [voiceState, startListening, stopListening]);

  // ── Reset to idle (called when assistant response arrives) ────────
  const resetToIdle = useCallback(() => {
    setVoiceState((prev) => (prev === "processing" ? "idle" : prev));
  }, []);

  const primeTts = useCallback(() => {
    const synth = typeof window !== "undefined" ? window.speechSynthesis : null;
    const UtteranceCtor =
      typeof window !== "undefined" ? window.SpeechSynthesisUtterance : undefined;

    if (!ttsEnabled || !synth || !UtteranceCtor) return;

    const warmUp = async () => {
      await waitForSpeechVoices(synth, 1200);
      if (typeof synth.resume === "function") {
        synth.resume();
      }
    };

    void warmUp().catch(() => {
      // Ignore warm-up failures and allow regular speak path to proceed.
    });
  }, [ttsEnabled]);

  // ── Speak (TTS) ──────────────────────────────────────────────────
  const speak = useCallback(
    (text: string, options?: SpeakOptions) => {
      const finishWithoutSpeech = () => {
        window.setTimeout(() => options?.onEnd?.(), 0);
      };

      const synth = typeof window !== "undefined" ? window.speechSynthesis : null;
      const UtteranceCtor =
        typeof window !== "undefined" ? window.SpeechSynthesisUtterance : undefined;

      if (!ttsEnabled || !synth || !UtteranceCtor) {
        finishWithoutSpeech();
        return;
      }

      const clean = text.replace(/\*\*/g, "").replace(/[#_~`>]/g, "");
      if (!clean.trim()) {
        finishWithoutSpeech();
        return;
      }

      const requestId = speechRequestIdRef.current + 1;
      speechRequestIdRef.current = requestId;

      const beginSpeech = () => {
        let settled = false;

        function settle(asError: boolean) {
          if (settled) return;
          settled = true;
          if (speechRequestIdRef.current !== requestId) return;
          setVoiceState("idle");
          if (asError) options?.onError?.();
          options?.onEnd?.();
        }

        const startAttempt = (attempt: number) => {
          if (settled || speechRequestIdRef.current !== requestId) return;

          let started = false;
          let utterance: SpeechSynthesisUtterance;
          try {
            utterance = new UtteranceCtor(clean);
          } catch {
            settle(true);
            return;
          }

          utterance.lang = language;
          if (attempt === 1) {
            const femaleVoice = getFemaleVoice(language);
            if (femaleVoice) utterance.voice = femaleVoice;
          }
          if (attempt >= 4) {
            utterance.rate = 1;
            utterance.pitch = 1;
            utterance.volume = 1;
          } else {
            utterance.rate = 0.94;
            utterance.pitch = 1.04;
            utterance.volume = 1;
          }

          const retryOrSettleError = () => {
            if (settled || speechRequestIdRef.current !== requestId) return;
            if (attempt < TTS_START_MAX_ATTEMPTS) {
              const nextAttempt = attempt + 1;
              const retryDelayMs = getTtsRetryDelayMs(nextAttempt);
              window.setTimeout(() => {
                if (settled || speechRequestIdRef.current !== requestId) return;
                startAttempt(nextAttempt);
              }, retryDelayMs);
              return;
            }
            settle(true);
          };

          const startWatchdog = window.setTimeout(() => {
            if (settled || speechRequestIdRef.current !== requestId || started) return;
            try {
              synth.cancel();
            } catch {
              // Ignore cancellation errors from platform speech engines.
            }
            retryOrSettleError();
          }, TTS_START_TIMEOUT_MS);

          const clearWatchdog = () => {
            window.clearTimeout(startWatchdog);
          };

          utterance.onstart = () => {
            if (settled || speechRequestIdRef.current !== requestId) return;
            started = true;
            clearWatchdog();
            setVoiceState("speaking");
            options?.onStart?.();
          };

          utterance.onend = () => {
            if (settled || speechRequestIdRef.current !== requestId) return;
            clearWatchdog();
            settle(false);
          };

          utterance.onerror = () => {
            if (settled || speechRequestIdRef.current !== requestId) return;
            clearWatchdog();
            if (!started) {
              retryOrSettleError();
              return;
            }
            settle(true);
          };

          try {
            synth.cancel();
            if (typeof synth.resume === "function") synth.resume();
            synth.speak(utterance);
          } catch {
            clearWatchdog();
            retryOrSettleError();
          }
        };

        startAttempt(1);
      };

      beginSpeech();
    },
    [language, ttsEnabled]
  );

  const clearError = useCallback(() => setError(null), []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      releaseMic();
      speechRequestIdRef.current += 1;
      window.speechSynthesis?.cancel();
    };
  }, []);

  return {
    voiceState,
    interimText,
    supported,
    error,
    clearError,
    toggleVoice,
    resetToIdle,
    primeTts,
    speak,
    startListening,
    stopListening,
  };
}
