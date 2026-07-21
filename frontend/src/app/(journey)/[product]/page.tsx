"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useChat, type UIMessage } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai';
import { ChatWindow } from '@/components/chat/ChatWindow';
import type { ChatWindowMessage } from '@/components/chat/ChatWindow';
import { ChatInputBar } from '@/components/chat/ChatInputBar';
import { VoiceModePanel } from '@/components/chat/VoiceModePanel';
import { LogOut } from 'lucide-react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { useVoice } from '@/hooks/useVoice';
import { SpeakContext } from '@/hooks/SpeakContext';
import { buildVoicePreviewText, buildVoiceSpeechText } from '@/lib/voicePrompt';
import { resolveVoiceJourneyAction, type VoiceResolvedAction } from '@/lib/voiceActions';
import { dispatchVoiceWidgetFieldUpdate, resolveVisibleVoiceWidgetUpdate, VOICE_WIDGET_PROMPT_EVENT } from '@/lib/voiceWidgetFields';
import { PersonalDetailsWidget } from '@/components/widgets/PersonalDetailsWidget';
import type { PersonalDetailsWidgetProps } from '@/components/widgets/PersonalDetailsWidget';
import type { MessageBubbleProps } from '@/components/chat/MessageBubble';

/** Convert saved conversation messages → UIMessage format for useChat */
function toUIMessages(saved: { role: string; content: string; timestamp?: number; widget?: unknown; metadata?: unknown }[]): UIMessage[] {
  return saved.map((m, i) => ({
    id: `hist_${i}_${m.timestamp || i}`,
    role: m.role as "user" | "assistant",
    parts: [{ type: "text" as const, text: m.content }],
    metadata: (m.metadata || (m.widget ? { widget: m.widget } : undefined)) as UIMessage["metadata"],
  }));
}

function getMessageText(message?: UIMessage): string {
  if (!message) return "";
  return (
    message.parts
      ?.filter((part) => part.type === "text")
      .map((part) => ("text" in part ? part.text : ""))
      .filter(Boolean)
      .join("") || ""
  );
}

function hasMessageWidget(message?: UIMessage): boolean {
  if (!message) return false;
  const metadata = message.metadata as { widget?: unknown } | undefined;
  if (metadata?.widget) return true;
  if (message.parts?.some((part) => part.type === "data-widget" && Boolean(part.data))) return true;
  return /<WIDGET_DATA>[\s\S]*?<\/WIDGET_DATA>/.test(getMessageText(message));
}

type WidgetSpec = {
  widget?: string;
  data?: Record<string, unknown>;
};

type PersonalDetailsData = NonNullable<PersonalDetailsWidgetProps["data"]>;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isWidgetSpec(value: unknown): value is WidgetSpec {
  return isObject(value) && typeof value.widget === "string";
}

function isPersonalDetailsData(value: unknown): value is PersonalDetailsData {
  if (!isObject(value)) return false;
  const personal = value.personal;
  const address = value.address;
  const employment = value.employment;
  const income = value.income;

  return (
    typeof value.name === "string" &&
    typeof value.phone === "string" &&
    typeof value.email === "string" &&
    isObject(personal) &&
    typeof personal.idNumber === "string" &&
    isObject(address) &&
    isObject(employment) &&
    isObject(income)
  );
}

function toChatWindowMessage(message: UIMessage): ChatWindowMessage {
  const parts = (message.parts ?? []).map((part) => {
    const next: NonNullable<MessageBubbleProps["parts"]>[number] = {};

    if ("type" in part && typeof part.type === "string") {
      next.type = part.type;
    }
    if ("text" in part && typeof part.text === "string") {
      next.text = part.text;
    }
    if ("data" in part) {
      next.data = part.data;
    }

    return next;
  });

  const metadata = message.metadata as MessageBubbleProps["metadata"];

  return {
    id: message.id,
    role: message.role as "user" | "assistant",
    parts,
    metadata,
    content: getMessageText(message) || undefined,
  };
}

function extractLatestPersonalDetails(messages: UIMessage[]): PersonalDetailsData | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    const metadata = msg.metadata as { widget?: WidgetSpec; customerProfile?: unknown } | undefined;
    let widgetSpec = metadata?.widget;

    if (!widgetSpec) {
      const widgetDataPart = msg.parts?.find((part) => part.type === "data-widget");
      if (widgetDataPart && "data" in widgetDataPart && isWidgetSpec(widgetDataPart.data)) {
        widgetSpec = widgetDataPart.data;
      }
    }

    if (!widgetSpec) {
      const text = getMessageText(msg);
      const widgetMatch = text.match(/<WIDGET_DATA>([\s\S]*?)<\/WIDGET_DATA>/);
      if (widgetMatch?.[1]) {
        try {
          widgetSpec = JSON.parse(widgetMatch[1]) as WidgetSpec;
        } catch {
          widgetSpec = undefined;
        }
      }
    }

    if (widgetSpec?.widget === 'PersonalDetailsWidget' && isPersonalDetailsData(widgetSpec.data)) {
      return { ...widgetSpec.data, showActions: false, hideMissingMessage: true };
    }

    if (isPersonalDetailsData(metadata?.customerProfile)) {
      return { ...metadata.customerProfile, showActions: false, hideMissingMessage: true };
    }
  }

  return null;
}

function extractSessionPersonalDetails(session: Record<string, unknown> | null): PersonalDetailsData | null {
  const profile = session?.customer_profile;
  if (!isPersonalDetailsData(profile)) return null;
  return { ...profile, showActions: false, hideMissingMessage: true };
}

const VOICE_POST_SPEECH_HOLD_MS = 1000;
const VOICE_MIN_SPEECH_MS = 1200;
const VOICE_MAX_SPEECH_MS = 45000;
const VOICE_WORDS_PER_MINUTE = 155;
const VOICE_MS_PER_CHARACTER_FLOOR = 35;
const VOICE_TTS_FAILSAFE_EXTRA_MS = 2500;
const VOICE_WIDGET_UPDATE_PROMPT =
  "Updated. You can make another change or say save changes.";

function estimateVoiceSpeechMs(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;

  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  const wordEstimateMs = (wordCount / VOICE_WORDS_PER_MINUTE) * 60_000;
  const characterEstimateMs = trimmed.length * VOICE_MS_PER_CHARACTER_FLOOR;

  return Math.min(
    VOICE_MAX_SPEECH_MS,
    Math.max(VOICE_MIN_SPEECH_MS, wordEstimateMs, characterEstimateMs)
  );
}

export default function JourneyPage() {
  const params = useParams();
  const router = useRouter();
  const product = params.product as string;

  const [phone, setPhone] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [initialMessages, setInitialMessages] = useState<UIMessage[] | null>(null);
  const [initialSession, setInitialSession] = useState<Record<string, unknown> | null>(null);

  // Check auth on mount — redirect to login if not authenticated
  useEffect(() => {
    fetch("/customer_agent/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.authenticated && data.phone) {
          setPhone(data.phone);
        } else {
          router.replace("/login");
        }
        setAuthChecked(true);
      })
      .catch(() => {
        router.replace("/login");
        setAuthChecked(true);
      });
  }, [router]);

  // Session ID derived from phone number + product (stable across refreshes)
  const sessionId = phone ? `${phone}_${product}` : "";

  // Load conversation history after auth
  useEffect(() => {
    if (!sessionId) return;
    fetch(`/customer_agent/api/chat/history/${encodeURIComponent(sessionId)}`)
      .then((r) => r.json())
      .then((data) => {
        setInitialSession(data.session || null);
        if (data.messages && data.messages.length > 0) {
          setInitialMessages(toUIMessages(data.messages));
        } else {
          // No history — show welcome message
          setInitialMessages([
            {
              id: `welcome_${product}`,
              role: 'assistant' as const,
              parts: [{ type: 'text' as const, text: `Welcome to the ${product.replace('_', ' ')} application! I am Raya, your Agentic Finance Advisor. To get started, could you please provide your National ID?` }],
            },
          ]);
        }
      })
      .catch(() => {
        setInitialSession(null);
        setInitialMessages([
          {
            id: `welcome_${product}`,
            role: 'assistant' as const,
            parts: [{ type: 'text' as const, text: `Welcome to the ${product.replace('_', ' ')} application! I am Raya, your Agentic Finance Advisor. To get started, could you please provide your National ID?` }],
          },
        ]);
      });
  }, [sessionId, product]);

  // Show loading while checking auth or loading history
  if (!authChecked || !phone || !initialMessages) {
    return (
      <div className="flex items-center justify-center h-full bg-white">
        <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <SpeakContext.Provider value={() => {}}>
      <ChatView
        product={product}
        sessionId={sessionId}
        initialMessages={initialMessages}
        initialSession={initialSession}
      />
    </SpeakContext.Provider>
  );
}

/** Inner component — only mounted after auth + history are resolved */
function ChatView({ product, sessionId, initialMessages, initialSession }: {
  product: string;
  sessionId: string;
  initialMessages: UIMessage[];
  initialSession: Record<string, unknown> | null;
}) {
  const router = useRouter();
  const [input, setInput] = useState('');
  const [voiceModeOpen, setVoiceModeOpen] = useState(false);
  const [voicePanelText, setVoicePanelText] = useState('');
  const [lastVoiceUserText, setLastVoiceUserText] = useState('');
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [bufferedAssistantIds, setBufferedAssistantIds] = useState<Set<string>>(new Set());
  const [instantRevealAssistantIds, setInstantRevealAssistantIds] = useState<Set<string>>(new Set());
  const [knownMessageIds, setKnownMessageIds] = useState<Set<string>>(
    () => new Set(initialMessages.map((message) => message.id))
  );
  const [activeVoicePreviewId, setActiveVoicePreviewId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { messages, status, sendMessage, setMessages } = useChat({
    id: sessionId,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: '/customer_agent/api/chat',
      headers: { 'x-session-id': sessionId },
      body: { sessionId, session: initialSession ?? undefined },
    }),
  });

  const latestPersonalDetails = extractLatestPersonalDetails(messages) ?? extractSessionPersonalDetails(initialSession);
  const isLoading = status === 'submitted' || status === 'streaming';

  // Track whether voice mode is active (user initiated via mic button)
  const voiceModeRef = useRef(false);
  const knownMessageIdsRef = useRef<Set<string>>(new Set(initialMessages.map((message) => message.id)));
  const spokenAssistantIdsRef = useRef<Set<string>>(new Set());
  const resolvedVoicePromptIdsRef = useRef<Set<string>>(new Set());
  const activeVoicePreviewIdRef = useRef<string | null>(null);
  const voiceCommitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voiceSpeechMinTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voiceSpeechFailsafeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voiceCommitGenerationRef = useRef(0);
  const speakRef = useRef<((text: string, options?: { onEnd?: () => void; onError?: () => void }) => void) | null>(null);
  const startListeningRef = useRef<(() => void) | null>(null);
  const pendingVoiceInteractionRef = useRef<{
    text: string;
    messageId: string;
    action: VoiceResolvedAction | null;
    needsWidget: boolean;
  } | null>(null);
  const autoListenAfterSpeechRef = useRef(false);

  const clearVoiceCommitTimer = useCallback(() => {
    if (voiceCommitTimerRef.current) {
      clearTimeout(voiceCommitTimerRef.current);
      voiceCommitTimerRef.current = null;
    }
  }, []);

  const clearVoiceLifecycleTimers = useCallback(() => {
    clearVoiceCommitTimer();
    if (voiceSpeechMinTimerRef.current) {
      clearTimeout(voiceSpeechMinTimerRef.current);
      voiceSpeechMinTimerRef.current = null;
    }
    if (voiceSpeechFailsafeTimerRef.current) {
      clearTimeout(voiceSpeechFailsafeTimerRef.current);
      voiceSpeechFailsafeTimerRef.current = null;
    }
  }, [clearVoiceCommitTimer]);

  const commitVoicePreview = useCallback(
    (assistantId: string | null, immediate = false, afterRelease?: () => void) => {
      if (!assistantId) return;
      clearVoiceCommitTimer();

      const release = () => {
        setBufferedAssistantIds((current) => {
          if (!current.has(assistantId)) return current;
          const next = new Set(current);
          next.delete(assistantId);
          return next;
        });
        setInstantRevealAssistantIds((current) => {
          if (current.has(assistantId)) return current;
          const next = new Set(current);
          next.add(assistantId);
          return next;
        });
        if (activeVoicePreviewIdRef.current === assistantId) {
          activeVoicePreviewIdRef.current = null;
          setActiveVoicePreviewId(null);
        }
        afterRelease?.();
      };

      if (immediate) {
        release();
        return;
      }

      voiceCommitTimerRef.current = setTimeout(release, VOICE_POST_SPEECH_HOLD_MS);
    },
    [clearVoiceCommitTimer]
  );

  const clickVoiceAction = useCallback((action: VoiceResolvedAction): boolean => {
    if (typeof document === "undefined") return false;

    const root = document.querySelector<HTMLElement>(`[data-message-id="${action.messageId}"]`);
    if (!root) return false;

    if (action.clickCheckboxFirst) {
      const checkbox = root.querySelector<HTMLInputElement>('input[type="checkbox"]');
      if (checkbox && !checkbox.checked) {
        checkbox.click();
      }
    }

    const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>("button"));
    const normalize = (value: string) =>
      value
        .toLowerCase()
        .replace(/[^a-z0-9\s&]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const transcriptNormalized = normalize(action.buttonLabels.join(" "));
    const candidates = action.buttonLabels.map(normalize).filter(Boolean);

    const findMatch = () => {
      for (const button of buttons) {
        const text = normalize(button.textContent || "");
        if (!text) continue;
        if (candidates.some((candidate) => text === candidate || text.includes(candidate) || candidate.includes(text))) {
          return button;
        }
        if (transcriptNormalized && (text.includes(transcriptNormalized) || transcriptNormalized.includes(text))) {
          return button;
        }
      }
      return null;
    };

    let target = findMatch();

    if (!target && action.clickFirstButtonIfDisabled) {
      target = buttons[0] || null;
    }

    if (!target) return false;

    if (target.disabled && action.clickFirstButtonIfDisabled && buttons.length > 0) {
      const firstButton = buttons[0];
      if (firstButton && firstButton !== target) {
        firstButton.click();
      }
      window.setTimeout(() => target.click(), 75);
      return true;
    }

    if (action.clickCheckboxFirst || action.clickFirstButtonIfDisabled) {
      window.setTimeout(() => target.click(), 50);
      return true;
    }

    target.click();
    return true;
  }, []);

  const flushPendingVoiceInteraction = useCallback(
    (messageId?: string, widgetShown = false) => {
      const pending = pendingVoiceInteractionRef.current;
      if (!pending) return false;
      if (messageId && pending.messageId !== messageId) return false;
      if (pending.needsWidget && !widgetShown) return false;

      if (pending.action) {
        const clicked = clickVoiceAction(pending.action);
        if (clicked) {
          pendingVoiceInteractionRef.current = null;
          return true;
        }
        return false;
      }

      sendMessage({ text: pending.text });
      pendingVoiceInteractionRef.current = null;
      return true;
    },
    [clickVoiceAction, sendMessage]
  );

  const handleWidgetShown = useCallback(
    (messageId: string) => {
      if (!pendingVoiceInteractionRef.current) return;
      if (pendingVoiceInteractionRef.current.messageId !== messageId) return;
      flushPendingVoiceInteraction(messageId, true);
    },
    [flushPendingVoiceInteraction]
  );

  const dispatchMockMessage = useCallback((detail: unknown) => {
    if (typeof detail === "string") {
      sendMessage({ text: detail });
      return;
    }

    if (detail && typeof detail === "object") {
      const visibleText =
        typeof (detail as { visibleText?: unknown }).visibleText === "string"
          ? ((detail as { visibleText: string }).visibleText || "").trim()
          : "";
      const systemText =
        typeof (detail as { systemText?: unknown }).systemText === "string"
          ? ((detail as { systemText: string }).systemText || "").trim()
          : "";

      if (visibleText) {
        setMessages((prev) => [
          ...prev,
          {
            id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            role: "user",
            parts: [{ type: "text", text: visibleText }],
          } as UIMessage,
        ]);
      }

      if (systemText) {
        sendMessage({ text: systemText });
      } else if (visibleText) {
        sendMessage({ text: visibleText });
      }
    }
  }, [sendMessage, setMessages]);

  const latestOptionPrompt = useMemo(
    () =>
      [...messages]
        .reverse()
        .find((message) => message.role === "assistant" && ((message.metadata as { options?: unknown[] } | undefined)?.options?.length ?? 0) > 0),
    [messages]
  );

  const lastAssistant = useMemo(
    () => [...messages].reverse().find((m) => m.role === 'assistant') as
    | (UIMessage & { metadata?: { allow_upload?: boolean } })
    | undefined,
    [messages]
  );
  const lastAssistantText = useMemo(() => getMessageText(lastAssistant), [lastAssistant]);
  const allowUpload = Boolean(lastAssistant?.metadata?.allow_upload);
  const bufferedAssistant = useMemo(
    () =>
      [...messages].reverse().find(
        (message) => message.role === "assistant" && bufferedAssistantIds.has(message.id)
      ) as (UIMessage & { metadata?: { allow_upload?: boolean } }) | undefined,
    [messages, bufferedAssistantIds]
  );

  const onTranscript = useCallback((text: string) => {
    if (voiceModeRef.current && voiceModeOpen) {
      const widgetUpdate = resolveVisibleVoiceWidgetUpdate(text);
      if (widgetUpdate) {
        dispatchVoiceWidgetFieldUpdate(widgetUpdate);
        pendingVoiceInteractionRef.current = null;
        autoListenAfterSpeechRef.current = true;
        activeVoicePreviewIdRef.current = null;
        setActiveVoicePreviewId(null);
        setLastVoiceUserText("");
        setVoicePanelText(VOICE_WIDGET_UPDATE_PROMPT);
        speakRef.current?.(VOICE_WIDGET_UPDATE_PROMPT, {
          onEnd: () => {
            if (!voiceModeRef.current || !voiceModeOpen) return;
            if (isLoading) return;
            autoListenAfterSpeechRef.current = false;
            startListeningRef.current?.();
          },
          onError: () => {
            if (!voiceModeRef.current || !voiceModeOpen) return;
            if (isLoading) return;
            autoListenAfterSpeechRef.current = false;
            startListeningRef.current?.();
          },
        });
        return;
      }
    }

    if (voiceModeRef.current) {
      setLastVoiceUserText(text);
    }

    const activeAssistant = bufferedAssistant || lastAssistant;
    const voiceAction = resolveVoiceJourneyAction(activeAssistant, latestOptionPrompt, text);

    if (voiceModeRef.current && bufferedAssistant && activeAssistant) {
      pendingVoiceInteractionRef.current = {
        text,
        messageId: activeAssistant.id,
        action: voiceAction,
        needsWidget: hasMessageWidget(activeAssistant),
      };
      return;
    }

    if (voiceAction) {
      const clicked = clickVoiceAction(voiceAction);
      if (clicked) {
        resolvedVoicePromptIdsRef.current.add(voiceAction.messageId);
        if (voiceModeRef.current) {
          setLastVoiceUserText(text);
        }
        return;
      }
    }

    if (voiceModeRef.current) {
      setLastVoiceUserText(text);
    }
    sendMessage({ text });
  }, [
    activeVoicePreviewIdRef,
    bufferedAssistant,
    clickVoiceAction,
    isLoading,
    lastAssistant,
    latestOptionPrompt,
    pendingVoiceInteractionRef,
    sendMessage,
    setActiveVoicePreviewId,
    setLastVoiceUserText,
    setVoicePanelText,
    voiceModeOpen,
  ]);

  const { voiceState, interimText, supported, error: voiceError, clearError, toggleVoice, resetToIdle, speak, startListening, stopListening } = useVoice({
    language: "en-US",
    ttsEnabled: true,
    onTranscript,
  });

  useEffect(() => {
    speakRef.current = speak;
    startListeningRef.current = startListening;
  }, [speak, startListening]);

  const startVoicePreview = useCallback(
    (assistantId: string, previewText: string, speechText: string) => {
      clearVoiceLifecycleTimers();

      const generation = voiceCommitGenerationRef.current + 1;
      voiceCommitGenerationRef.current = generation;
      let speechFinished = false;
      let minimumSpeechTimePassed = false;
      let commitQueued = false;

      const commitIfReady = () => {
        if (commitQueued) return;
        if (voiceCommitGenerationRef.current !== generation) return;
        if (activeVoicePreviewIdRef.current !== assistantId) return;
        if (!speechFinished || !minimumSpeechTimePassed) return;

        commitQueued = true;
        const shouldAutoListen = autoListenAfterSpeechRef.current && !isLoading;

        commitVoicePreview(assistantId, false, () => {
          const handled = flushPendingVoiceInteraction(assistantId);
          if (!handled && pendingVoiceInteractionRef.current?.action) {
            window.setTimeout(() => {
              flushPendingVoiceInteraction(assistantId);
            }, 75);
          }
          if (!pendingVoiceInteractionRef.current && shouldAutoListen) {
            autoListenAfterSpeechRef.current = false;
            startListening();
          }
        });
      };

      const markSpeechFinished = () => {
        speechFinished = true;
        commitIfReady();
      };

      const estimatedSpeechMs = estimateVoiceSpeechMs(speechText);
      voiceSpeechMinTimerRef.current = setTimeout(() => {
        minimumSpeechTimePassed = true;
        voiceSpeechMinTimerRef.current = null;
        commitIfReady();
      }, estimatedSpeechMs);

      voiceSpeechFailsafeTimerRef.current = setTimeout(() => {
        speechFinished = true;
        minimumSpeechTimePassed = true;
        voiceSpeechFailsafeTimerRef.current = null;
        commitIfReady();
      }, estimatedSpeechMs + VOICE_TTS_FAILSAFE_EXTRA_MS);

      setVoicePanelText(previewText);
      setLastVoiceUserText("");
      speak(speechText, {
        onEnd: markSpeechFinished,
        onError: markSpeechFinished,
      });
    },
    [clearVoiceLifecycleTimers, commitVoicePreview, flushPendingVoiceInteraction, isLoading, speak, startListening]
  );

  const displayMessages = useMemo(
    () =>
      messages.filter(
        (message) => {
          if (message.role !== "assistant") return true;
          if (bufferedAssistantIds.has(message.id)) return false;
          if (!voiceModeOpen) return true;
          if (instantRevealAssistantIds.has(message.id)) return true;
          if (activeVoicePreviewId === message.id) return false;
          return knownMessageIds.has(message.id);
        }
      ),
    [messages, activeVoicePreviewId, bufferedAssistantIds, instantRevealAssistantIds, knownMessageIds, voiceModeOpen]
  );

  const chatWindowMessages = useMemo(
    () => displayMessages.map(toChatWindowMessage),
    [displayMessages]
  );

  // Auto-speak new assistant messages when in voice mode, and reset processing state
  useEffect(() => {
    messages.forEach((message) => {
      if (knownMessageIdsRef.current.has(message.id)) return;

      if (message.role !== "assistant") {
        knownMessageIdsRef.current.add(message.id);
        setKnownMessageIds((current) => {
          if (current.has(message.id)) return current;
          const next = new Set(current);
          next.add(message.id);
          return next;
        });
        return;
      }

      if (voiceModeRef.current && isLoading) return;

      knownMessageIdsRef.current.add(message.id);
      setKnownMessageIds((current) => {
        if (current.has(message.id)) return current;
        const next = new Set(current);
        next.add(message.id);
        return next;
      });

      resetToIdle();

      const text = getMessageText(message);
      if (!text.trim()) return;

      if (voiceModeRef.current && voiceModeOpen) {
        const previewText = buildVoicePreviewText(text);
        const speechText = buildVoiceSpeechText(text);

        setBufferedAssistantIds((current) => {
          const next = new Set(current);
          next.add(message.id);
          return next;
        });
        activeVoicePreviewIdRef.current = message.id;
        setActiveVoicePreviewId(message.id);
        spokenAssistantIdsRef.current.add(message.id);
        autoListenAfterSpeechRef.current = true;
        voiceModeRef.current = true;
        startVoicePreview(message.id, previewText, speechText);
        return;
      }

      if (voiceModeRef.current && !voiceModeOpen) {
        speak(buildVoiceSpeechText(text));
      }
    });
  }, [isLoading, messages, resetToIdle, speak, startVoicePreview, voiceModeOpen]);

  // Auto-clear voice errors after 5 seconds
  useEffect(() => {
    if (!voiceError) return;
    const t = setTimeout(clearError, 5000);
    return () => clearTimeout(t);
  }, [voiceError, clearError]);

  // Track voice mode: on when user taps mic, off when they type
  const handleToggleVoice = () => {
    voiceModeRef.current = true;
    toggleVoice();
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    voiceModeRef.current = false; // Switch to text mode
    sendMessage({ text: input });
    setInput('');
  };

  useEffect(() => {
    const handleMockMessage = (e: Event) => {
      dispatchMockMessage((e as CustomEvent).detail);
    };
    window.addEventListener('mock-send-message', handleMockMessage);
    return () => window.removeEventListener('mock-send-message', handleMockMessage);
  }, [dispatchMockMessage]);

  const chatWindowIsLoading = isLoading && !voiceModeOpen;
  const voiceModeSpeaker = voiceState === "speaking" || Boolean(activeVoicePreviewId) ? "ai" : "user";
  const voiceModeText =
    voiceModeSpeaker === "ai"
      ? voicePanelText || getMessageText(bufferedAssistant) || lastAssistantText || "I am ready when you are."
      : interimText || lastVoiceUserText || "I am listening.";

  useEffect(() => {
    if (!voiceModeOpen || isLoading) return;

    const assistantToSpeak = bufferedAssistant || lastAssistant;
    const assistantText = getMessageText(assistantToSpeak);
    if (!assistantToSpeak || !assistantText) return;
    if (resolvedVoicePromptIdsRef.current.has(assistantToSpeak.id)) return;
    if (spokenAssistantIdsRef.current.has(assistantToSpeak.id)) return;

    const previewText = buildVoicePreviewText(assistantText);
    const speechText = buildVoiceSpeechText(assistantText);
    spokenAssistantIdsRef.current.add(assistantToSpeak.id);
    activeVoicePreviewIdRef.current = bufferedAssistant ? assistantToSpeak.id : null;
    setActiveVoicePreviewId(bufferedAssistant ? assistantToSpeak.id : null);
    autoListenAfterSpeechRef.current = true;
    voiceModeRef.current = true;
    if (bufferedAssistant) {
      const previewStartTimer = window.setTimeout(() => {
        startVoicePreview(assistantToSpeak.id, previewText, speechText);
      }, 0);
      return () => clearTimeout(previewStartTimer);
    }

    clearVoiceLifecycleTimers();
    const generation = voiceCommitGenerationRef.current + 1;
    voiceCommitGenerationRef.current = generation;
    let speechFinished = false;
    let minimumSpeechTimePassed = false;
    let listeningQueued = false;

    const startListeningIfReady = () => {
      if (listeningQueued) return;
      if (voiceCommitGenerationRef.current !== generation) return;
      if (!speechFinished || !minimumSpeechTimePassed) return;
      if (!voiceModeRef.current || !autoListenAfterSpeechRef.current || isLoading) return;

      listeningQueued = true;
      voiceCommitTimerRef.current = setTimeout(() => {
        autoListenAfterSpeechRef.current = false;
        startListening();
      }, VOICE_POST_SPEECH_HOLD_MS);
    };

    const speechStartTimer = window.setTimeout(() => {
      setVoicePanelText(previewText);
      setLastVoiceUserText("");

      const estimatedSpeechMs = estimateVoiceSpeechMs(speechText);
      voiceSpeechMinTimerRef.current = setTimeout(() => {
        minimumSpeechTimePassed = true;
        voiceSpeechMinTimerRef.current = null;
        startListeningIfReady();
      }, estimatedSpeechMs);

      voiceSpeechFailsafeTimerRef.current = setTimeout(() => {
        speechFinished = true;
        minimumSpeechTimePassed = true;
        voiceSpeechFailsafeTimerRef.current = null;
        startListeningIfReady();
      }, estimatedSpeechMs + VOICE_TTS_FAILSAFE_EXTRA_MS);

      const markSpeechFinished = () => {
        speechFinished = true;
        startListeningIfReady();
      };

      speak(speechText, {
        onEnd: markSpeechFinished,
        onError: markSpeechFinished,
      });
    }, 0);

    return () => clearTimeout(speechStartTimer);
  }, [bufferedAssistant, clearVoiceLifecycleTimers, isLoading, lastAssistant, speak, startListening, startVoicePreview, voiceModeOpen]);

  const handleUploadClick = () => {
    if (!allowUpload) return;
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    sendMessage({ text: `__SYS__document_uploaded:${file.name}` });
    e.target.value = '';
  };

  const handleOpenVoiceMode = () => {
    voiceModeRef.current = true;
    setVoiceModeOpen(true);
  };

  const handleVoiceModeMicToggle = () => {
    voiceModeRef.current = true;
    toggleVoice();
  };

  const handleCloseVoiceMode = () => {
    autoListenAfterSpeechRef.current = false;
    voiceCommitGenerationRef.current += 1;
    clearVoiceLifecycleTimers();
    const previewAssistantId = activeVoicePreviewIdRef.current;
    commitVoicePreview(previewAssistantId, true);
    voiceModeRef.current = false;
    pendingVoiceInteractionRef.current = null;
    window.speechSynthesis?.cancel();
    stopListening();
    setVoiceModeOpen(false);
  };

  const handleLogout = async () => {
    setShowHeaderMenu(false);
    autoListenAfterSpeechRef.current = false;
    voiceModeRef.current = false;
    voiceCommitGenerationRef.current += 1;
    clearVoiceLifecycleTimers();
    commitVoicePreview(activeVoicePreviewIdRef.current, true);
    pendingVoiceInteractionRef.current = null;
    window.speechSynthesis?.cancel();
    stopListening();

    try {
      await fetch("/customer_agent/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
    } finally {
      router.replace("/login");
    }
  };

  useEffect(() => {
    return () => {
      clearVoiceLifecycleTimers();
    };
  }, [clearVoiceLifecycleTimers]);

  useEffect(() => {
    document.documentElement.dataset.voiceModeOpen = voiceModeOpen ? "true" : "false";
    return () => {
      if (document.documentElement.dataset.voiceModeOpen === "true" && !voiceModeOpen) {
        document.documentElement.dataset.voiceModeOpen = "false";
      }
    };
  }, [voiceModeOpen]);

  useEffect(() => {
    const handleVoiceWidgetPrompt = (event: Event) => {
      const detail = (event as CustomEvent<{ text?: string }>).detail;
      const text = typeof detail?.text === "string" ? detail.text.trim() : "";
      if (!text || !voiceModeRef.current || !voiceModeOpen) return;

      setVoicePanelText(text);
      setLastVoiceUserText("");
      autoListenAfterSpeechRef.current = false;
      speakRef.current?.(text, {
        onEnd: () => {
          if (!voiceModeRef.current || !voiceModeOpen) return;
          if (isLoading) return;
          startListeningRef.current?.();
        },
        onError: () => {
          if (!voiceModeRef.current || !voiceModeOpen) return;
          if (isLoading) return;
          startListeningRef.current?.();
        },
      });
    };

    window.addEventListener(VOICE_WIDGET_PROMPT_EVENT, handleVoiceWidgetPrompt);
    return () => window.removeEventListener(VOICE_WIDGET_PROMPT_EVENT, handleVoiceWidgetPrompt);
  }, [isLoading, voiceModeOpen]);

  return (
    <SpeakContext.Provider value={speak}>
    <div className="flex flex-col h-full bg-white relative">
      <div className="absolute top-0 left-0 w-full z-10 bg-white/70 backdrop-blur-xl shadow-[0_8px_24px_-18px_rgba(15,23,42,0.45)] relative">
        <div className="px-4 py-3.5 flex items-center gap-3">
          <div className="h-10 w-10  bg-white/85  flex items-center justify-center shrink-0">
            <Image
              src="/customer_agent/assets/newgen_logo.png"
              alt="Newgen"
              width={28}
              height={28}
              className="h-7 w-auto object-contain"
              priority
            />
          </div>
          <div className="min-w-0">
            <h2 className="type-display-sm text-slate-900 capitalize truncate">
              {product.replace('_', ' ')}
            </h2>
            <p className="type-overline pt-1 text-slate-500">Agentic Finance Advisor</p>
          </div>
          <div className="relative ml-auto flex items-center gap-1">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowHeaderMenu((open) => !open)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-orange-50"
                aria-label="Open profile details"
                title="Profile Details"
              >
                <Image
                  src="/customer_agent/assets/header_user_details.png"
                  alt=""
                  width={30}
                  height={28}
                  className="h-6 w-6 object-contain"
                />
              </button>
              {showHeaderMenu && (
                <div className="absolute right-0 top-11 z-30 w-[350px] max-w-[calc(100vw-32px)] rounded-lg border border-slate-200 bg-white p-3 shadow-[0_12px_28px_-18px_rgba(15,23,42,0.55)] max-h-[80vh] overflow-y-auto hide-scrollbar">
                  {latestPersonalDetails ? (
                    <div className="-mt-3 -mx-4 transform scale-95 origin-top">
                      <PersonalDetailsWidget data={latestPersonalDetails} />
                    </div>
                  ) : (
                    <div className="text-center py-6 px-4 text-slate-500 text-sm font-medium bg-slate-50 rounded-lg border border-slate-100">
                      No personal details available yet. Please complete the verification process first.
                    </div>
                  )}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-[#C24231]"
              aria-label="Logout"
              title="Logout"
            >
              <LogOut className="h-[22px] w-[22px]" />
            </button>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 h-[2px] w-full bg-gradient-to-r from-[#FB8B23] to-[#C24231]" />
      </div>

      <div className={voiceModeOpen ? "flex-1 overflow-hidden pt-0 pb-[300px]" : "flex-1 overflow-hidden pt-0 pb-24"}>
        <ChatWindow
          messages={chatWindowMessages}
          isLoading={chatWindowIsLoading}
          forceVisibleAssistantIds={[...instantRevealAssistantIds]}
          onWidgetShown={handleWidgetShown}
        />
      </div>

      {/* Input Area */}
      <div className={voiceModeOpen ? "absolute bottom-0 left-0 w-full bg-white" : "absolute bottom-0 left-0 w-full p-4 bg-white shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)]"}>
        {/* Voice error banner */}
        {voiceError && (
          <div className="mb-2 px-4 py-2 bg-red-50 border border-red-200 rounded-xl type-body-md-strong text-red-700 flex justify-between items-center">
            <span>{voiceError}</span>
            <button onClick={clearError} className="ml-2 text-red-400 hover:text-red-600 font-bold">&times;</button>
          </div>
        )}
        {/* Interim voice transcript */}
        {!voiceModeOpen && interimText && (
          <div className="mb-2 px-4 py-2 bg-blue-50 rounded-xl type-body-md-strong text-blue-700 italic animate-pulse">
            🎙 {interimText}
          </div>
        )}
        {voiceModeOpen ? (
          <VoiceModePanel
            displayText={voiceModeText}
            mode={voiceModeSpeaker}
            voiceState={voiceState}
            allowUpload={allowUpload}
            isLoading={isLoading}
            onUpload={handleUploadClick}
            onFileSelect={handleFileSelect}
            onMicToggle={handleVoiceModeMicToggle}
            onClose={handleCloseVoiceMode}
            fileInputRef={fileInputRef}
          />
        ) : (
          <ChatInputBar
            input={input || ''}
            isLoading={isLoading}
            allowUpload={allowUpload}
            voiceState={voiceState}
            supported={supported}
            onInputChange={setInput}
            onSubmit={onSubmit}
            onUpload={handleUploadClick}
            onFileSelect={handleFileSelect}
            onDictationToggle={handleToggleVoice}
            onOpenVoiceMode={handleOpenVoiceMode}
            fileInputRef={fileInputRef}
          />
        )}
      </div>
    </div>
    </SpeakContext.Provider>
  );
}
