"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useChat, type UIMessage } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { VoiceButton } from '@/components/chat/VoiceButton';
import { Paperclip, Send } from 'lucide-react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { useVoice } from '@/hooks/useVoice';
import { SpeakContext } from '@/hooks/SpeakContext';

/** Convert saved conversation messages → UIMessage format for useChat */
function toUIMessages(saved: { role: string; content: string; timestamp?: number }[]): UIMessage[] {
  return saved.map((m, i) => ({
    id: `hist_${i}_${m.timestamp || i}`,
    role: m.role as "user" | "assistant",
    parts: [{ type: "text" as const, text: m.content }],
  }));
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
    fetch("/api/auth/me")
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
    fetch(`/api/chat/history/${encodeURIComponent(sessionId)}`)
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
  const [input, setInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { messages, status, sendMessage, setMessages } = useChat({
    id: sessionId,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: '/api/chat',
      headers: { 'x-session-id': sessionId },
      body: { sessionId, session: initialSession ?? undefined },
    }),
  });

  // Track whether voice mode is active (user initiated via mic button)
  const voiceModeRef = useRef(false);

  const onTranscript = useCallback((text: string) => {
    sendMessage({ text });
  }, [sendMessage]);

  const { voiceState, interimText, supported, error: voiceError, clearError, toggleVoice, resetToIdle, speak } = useVoice({
    language: "en-US",
    ttsEnabled: true,
    onTranscript,
  });

  // Auto-speak new assistant messages when in voice mode, and reset processing state
  const prevMsgCountRef = useRef(messages.length);
  useEffect(() => {
    if (messages.length > prevMsgCountRef.current) {
      const last = messages[messages.length - 1];
      if (last.role === "assistant") {
        // Reset processing spinner
        resetToIdle();
        // Only auto-speak if user was in voice mode
        if (voiceModeRef.current) {
          const textPart = last.parts?.find((p) => p.type === "text");
          const text = (textPart && 'text' in textPart ? textPart.text : "") || "";
          if (text) speak(text);
        }
      }
    }
    prevMsgCountRef.current = messages.length;
  }, [messages, speak, resetToIdle]);

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
      const detail = (e as CustomEvent).detail;

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
        }
      }
    };
    window.addEventListener('mock-send-message', handleMockMessage);
    return () => window.removeEventListener('mock-send-message', handleMockMessage);
  }, [sendMessage, setMessages]);

  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant') as
    | (UIMessage & { metadata?: { allow_upload?: boolean } })
    | undefined;
  const allowUpload = Boolean(lastAssistant?.metadata?.allow_upload);

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

  const isLoading = status === 'submitted' || status === 'streaming';

  return (
    <SpeakContext.Provider value={speak}>
    <div className="flex flex-col h-full bg-white relative">
      <div className="absolute top-0 left-0 w-full z-10 bg-white/70 backdrop-blur-xl shadow-[0_8px_24px_-18px_rgba(15,23,42,0.45)] relative">
        <div className="px-4 py-3.5 flex items-center gap-3">
          <div className="h-10 w-10  bg-white/85  flex items-center justify-center shrink-0">
            <Image
              src="/assets/newgen_logo.png"
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
        </div>
        <div className="absolute bottom-0 left-0 h-[2px] w-full bg-gradient-to-r from-[#FB8B23] to-[#C24231]" />
      </div>

      <div className="flex-1 overflow-hidden pt-0 pb-24">
        <ChatWindow
          messages={messages as unknown as { id: string; role: 'user' | 'assistant'; content?: string; parts?: unknown[]; annotations?: unknown[] }[]}
          isLoading={isLoading}
        />
      </div>

      {/* Input Area */}
      <div className="absolute bottom-0 left-0 w-full p-4 bg-white shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)]">
        {/* Voice error banner */}
        {voiceError && (
          <div className="mb-2 px-4 py-2 bg-red-50 border border-red-200 rounded-xl type-body-md-strong text-red-700 flex justify-between items-center">
            <span>{voiceError}</span>
            <button onClick={clearError} className="ml-2 text-red-400 hover:text-red-600 font-bold">&times;</button>
          </div>
        )}
        {/* Interim voice transcript */}
        {interimText && (
          <div className="mb-2 px-4 py-2 bg-blue-50 rounded-xl type-body-md-strong text-blue-700 italic animate-pulse">
            🎙 {interimText}
          </div>
        )}
        <form onSubmit={onSubmit} className="flex gap-2 items-center">
          <div className="flex-1 flex items-center bg-slate-100 rounded-2xl px-4 py-3">
            <input
              className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 type-body-md text-slate-900 placeholder:text-slate-400"
              value={input || ''}
              onChange={(e) => setInput(e.target.value)}
              placeholder={voiceState === "listening" ? "Listening..." : "Type your message here..."}
              disabled={isLoading || voiceState === "listening"}
            />
          </div>
          <button
            type="button"
            onClick={handleUploadClick}
            disabled={!allowUpload || isLoading || voiceState === "listening"}
            className="p-2.5 text-slate-600 hover:text-slate-800 disabled:text-slate-300 disabled:cursor-not-allowed transition-colors"
            aria-label="Upload document"
            title={allowUpload ? "Upload document" : "Upload is currently unavailable"}
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png"
          />
          {(input || '').trim() ? (
            <button
              type="submit"
              disabled={isLoading}
              className="p-3 bg-gradient-to-t from-blue-700 to-cyan-500 text-white rounded-xl hover:opacity-90 transition-opacity shadow-lg"
            >
              <Send className="w-5 h-5" />
            </button>
          ) : (
            <VoiceButton
              voiceState={voiceState}
              onToggle={handleToggleVoice}
              supported={supported}
            />
          )}
        </form>
      </div>
    </div>
    </SpeakContext.Provider>
  );
}
