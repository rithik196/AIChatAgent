"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useChat, type UIMessage } from '@ai-sdk/react'
import { ChatWindow } from '@/components/chat/ChatWindow';
import { VoiceButton } from '@/components/chat/VoiceButton';
import { Send } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useVoice } from '@/hooks/useVoice';
import { SpeakContext } from '@/hooks/SpeakContext';
import { PersonalDetailsWidget } from '@/components/widgets/PersonalDetailsWidget';

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
  const [identityVerified, setIdentityVerified] = useState(false);
  const [profile, setProfile] = useState<any>(null);

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

  // Watch for verification in chat messages
  useEffect(() => {
    // Look for a message indicating verification success
    const found = initialMessages?.some(
      (msg) =>
        msg.role === 'assistant' &&
        msg.parts.some(
          (part) =>
            part.type === 'text' &&
            (part.text.includes('Verification Successful') || part.text.includes('details have been fetched'))
        )
    );
    setIdentityVerified(found);
  }, [initialMessages]);

  // Fetch profile only after verification
  useEffect(() => {
    if (identityVerified && phone) {
      fetch(`/api/customer/profile/${phone}`)
        .then((r) => r.json())
        .then((data) => setProfile(data));
    }
  }, [identityVerified, phone]);

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
        identityVerified={identityVerified}
        profile={profile}
      />
    </SpeakContext.Provider>
  );
}

/** Inner component — only mounted after auth + history are resolved */
function ChatView({ product, sessionId, initialMessages, identityVerified, profile }: {
  product: string;
  sessionId: string;
  initialMessages: UIMessage[];
  identityVerified: boolean;
  profile: any;
}) {
  const [input, setInput] = useState('');

  const { messages, status, sendMessage } = useChat({
    id: sessionId,
    messages: initialMessages,
    body: { sessionId },
    headers: { "x-session-id": sessionId },
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

  const isLoading = status === 'submitted' || status === 'streaming';

  return (
    <SpeakContext.Provider value={speak}>
    <div className="flex flex-col h-full bg-white relative">
      {/* Header */}
      <div className="absolute top-0 left-0 w-full p-4 bg-white/80 backdrop-blur-xl border-b-2 border-orange-500 z-10 flex justify-between items-center shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-900 capitalize">
            {product.replace('_', ' ')}
          </h2>
          <p className="text-xs text-slate-500">Finance Agent</p>
        </div>
        <div className="flex gap-2">
          <div className="w-8 h-8 bg-slate-100 rounded-lg"></div>
          <div className="w-8 h-8 bg-slate-100 rounded-lg"></div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden pt-20 pb-24">
        {/* Show PersonalDetailsWidget only after verification */}
        {identityVerified && profile && (
          <div className="mb-4">
            <PersonalDetailsWidget data={profile} />
          </div>
        )}
        <ChatWindow messages={messages as any} isLoading={isLoading} />
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
        <form onSubmit={onSubmit} className="flex gap-3 items-center">
          <div className="flex-1 flex items-center bg-slate-100 rounded-2xl px-4 py-3">
            <input
              className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 text-slate-900 placeholder:text-slate-400"
              value={input || ''}
              onChange={(e) => setInput(e.target.value)}
              placeholder={voiceState === "listening" ? "Listening..." : "Type your message here..."}
              disabled={isLoading || voiceState === "listening"}
            />
          </div>
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
