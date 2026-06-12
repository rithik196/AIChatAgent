"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useChat, type UIMessage } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { VoiceButton } from '@/components/chat/VoiceButton';
import { Paperclip, Send } from 'lucide-react';
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
      />
    </SpeakContext.Provider>
  );
}

/** Inner component — only mounted after auth + history are resolved */
function ChatView({ product, sessionId, initialMessages }: {
  product: string;
  sessionId: string;
  initialMessages: UIMessage[];
}) {
  const [input, setInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { messages, status, sendMessage } = useChat({
    id: sessionId,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: '/api/chat',
      headers: { 'x-session-id': sessionId },
      body: { sessionId },
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
      sendMessage({ text: (e as CustomEvent).detail });
    };
    window.addEventListener('mock-send-message', handleMockMessage);
    return () => window.removeEventListener('mock-send-message', handleMockMessage);
  }, [sendMessage]);

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
      <div className="absolute top-0 left-0 w-full bg-white/80 backdrop-blur-xl border-b border-slate-200 z-10 shadow-sm">
        <div className="p-4 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-900 capitalize">
              {product.replace('_', ' ')}
            </h2>
            <p className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">Agentic Finance Advisor</p>
          </div>
          <div className="flex gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-teal-100 border border-blue-200 flex items-center justify-center shadow-sm">
              <span className="text-xs font-bold text-blue-700">R</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden pt-[72px] pb-24">
        <ChatWindow
          messages={messages as unknown as { id: string; role: 'user' | 'assistant'; content?: string; parts?: unknown[]; annotations?: unknown[] }[]}
          isLoading={isLoading}
        />
      </div>

      {/* Input Area */}
      <div className="absolute bottom-0 left-0 w-full p-4 bg-white shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.05)]">
        {/* Voice error banner */}
        {voiceError && (
          <div className="mb-2 px-4 py-2 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex justify-between items-center">
            <span>{voiceError}</span>
            <button onClick={clearError} className="ml-2 text-red-400 hover:text-red-600 font-bold">&times;</button>
          </div>
        )}
        {/* Interim voice transcript */}
        {interimText && (
          <div className="mb-2 px-4 py-2 bg-blue-50 rounded-xl text-sm text-blue-700 italic animate-pulse">
            🎙 {interimText}
          </div>
        )}
        <form onSubmit={onSubmit} className="flex gap-2 items-center">
          <div className="flex-1 flex items-center bg-slate-100 rounded-2xl px-4 py-3">
            <input
              className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 text-slate-900 placeholder:text-slate-400"
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
