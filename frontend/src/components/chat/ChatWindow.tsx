"use client";

import React, { useRef, useEffect, useMemo, useState } from 'react';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import type { MessageBubbleProps } from './MessageBubble';

export interface ChatWindowMessage {
  id: string;
  role: 'user' | 'assistant';
  content?: string;
  parts?: MessageBubbleProps['parts'];
  annotations?: unknown[];
  metadata?: MessageBubbleProps['metadata'];
}

interface ChatWindowProps {
  messages: ChatWindowMessage[];
  isLoading: boolean;
  forceVisibleAssistantIds?: string[];
  onWidgetShown?: (messageId: string, element: HTMLDivElement) => void;
}

const MESSAGE_REVEAL_DELAY_MS = 1000;
const WIDGET_REVEAL_DELAY_MS = 1000;
const POST_TEXT_REVEAL_DELAY_MS = 4000;

function getMessageText(message: ChatWindowMessage): string {
  return (
    message.content ||
    message.parts
      ?.filter((part) => part?.type === "text")
      .map((part) => part.text)
      .filter(Boolean)
      .join("") ||
    ""
  );
}

function hasWidget(message: ChatWindowMessage): boolean {
  const metadata = message.metadata as { widget?: unknown } | undefined;
  if (metadata?.widget) return true;
  if (message.parts?.some((part) => part?.type === "data-widget" && part.data)) return true;
  return /<WIDGET_DATA>[\s\S]*?<\/WIDGET_DATA>/.test(getMessageText(message));
}

// A second bubble (postText) rendered before the widget is revealed after its own delay.
function hasDelayedPostText(message: ChatWindowMessage): boolean {
  if (message.role !== 'assistant') return false;
  const metadata = message.metadata;
  return Boolean(metadata?.postTextBeforeWidget && metadata.postText?.trim());
}

export function ChatWindow({ messages, isLoading, forceVisibleAssistantIds = [], onWidgetShown }: ChatWindowProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messageTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const widgetTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const postTextTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const widgetScrollLockUntilRef = useRef(0);
  const [revealedAssistantIds, setRevealedAssistantIds] = useState<Set<string>>(
    () => new Set(messages.filter((message) => message.role === 'assistant').map((message) => message.id))
  );
  const [visibleWidgetIds, setVisibleWidgetIds] = useState<Set<string>>(
    () => new Set(messages.filter((message) => hasWidget(message)).map((message) => message.id))
  );
  const [visiblePostTextIds, setVisiblePostTextIds] = useState<Set<string>>(
    () => new Set(messages.filter((message) => hasDelayedPostText(message)).map((message) => message.id))
  );
  const [widgetAnchorIds, setWidgetAnchorIds] = useState<Set<string>>(new Set());

  const visibleAssistantIds = useMemo(() => {
    const next = new Set(revealedAssistantIds);
    forceVisibleAssistantIds.forEach((id) => next.add(id));
    return next;
  }, [forceVisibleAssistantIds, revealedAssistantIds]);

  useEffect(() => {
    if (Date.now() < widgetScrollLockUntilRef.current) {
      return;
    }
    const container = scrollContainerRef.current;
    container?.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
  }, [messages, isLoading, visibleAssistantIds, visiblePostTextIds, visibleWidgetIds, widgetAnchorIds]);

  useEffect(() => {
    messages.forEach((message) => {
      if (message.role !== 'assistant') return;
      if (visibleAssistantIds.has(message.id) || messageTimersRef.current.has(message.id)) return;
      if (isLoading) return;

      const timer = setTimeout(() => {
        setRevealedAssistantIds((current) => {
          const next = new Set(current);
          next.add(message.id);
          return next;
        });
        messageTimersRef.current.delete(message.id);
      }, MESSAGE_REVEAL_DELAY_MS);

      messageTimersRef.current.set(message.id, timer);
    });
  }, [isLoading, messages, visibleAssistantIds]);

  useEffect(() => {
    const currentMessageIds = new Set(messages.map((message) => message.id));

    messageTimersRef.current.forEach((timer, messageId) => {
      if (currentMessageIds.has(messageId)) return;
      clearTimeout(timer);
      messageTimersRef.current.delete(messageId);
    });

    widgetTimersRef.current.forEach((timer, messageId) => {
      if (currentMessageIds.has(messageId)) return;
      clearTimeout(timer);
      widgetTimersRef.current.delete(messageId);
    });

    postTextTimersRef.current.forEach((timer, messageId) => {
      if (currentMessageIds.has(messageId)) return;
      clearTimeout(timer);
      postTextTimersRef.current.delete(messageId);
    });
  }, [messages]);

  useEffect(() => {
    messages.forEach((message) => {
      if (!hasDelayedPostText(message)) return;
      if (!visibleAssistantIds.has(message.id)) return;
      if (visiblePostTextIds.has(message.id) || postTextTimersRef.current.has(message.id)) return;

      const timer = setTimeout(() => {
        setVisiblePostTextIds((current) => {
          const next = new Set(current);
          next.add(message.id);
          return next;
        });
        postTextTimersRef.current.delete(message.id);
      }, POST_TEXT_REVEAL_DELAY_MS);

      postTextTimersRef.current.set(message.id, timer);
    });
  }, [messages, visibleAssistantIds, visiblePostTextIds]);

  useEffect(() => {
    messages.forEach((message) => {
      if (message.role !== 'assistant' || !hasWidget(message)) return;
      if (!visibleAssistantIds.has(message.id)) return;
      if (hasDelayedPostText(message) && !visiblePostTextIds.has(message.id)) return;
      if (visibleWidgetIds.has(message.id) || widgetTimersRef.current.has(message.id)) return;

      const timer = setTimeout(() => {
        setVisibleWidgetIds((current) => {
          const next = new Set(current);
          next.add(message.id);
          return next;
        });
        setWidgetAnchorIds((current) => {
          const next = new Set(current);
          next.add(message.id);
          return next;
        });
        widgetScrollLockUntilRef.current = Date.now() + 1200;
        widgetTimersRef.current.delete(message.id);
      }, WIDGET_REVEAL_DELAY_MS);

      widgetTimersRef.current.set(message.id, timer);
    });
  }, [messages, visibleAssistantIds, visiblePostTextIds, visibleWidgetIds]);

  useEffect(() => {
    const messageTimers = messageTimersRef.current;
    const widgetTimers = widgetTimersRef.current;
    const postTextTimers = postTextTimersRef.current;

    return () => {
      messageTimers.forEach((timer) => clearTimeout(timer));
      messageTimers.clear();
      widgetTimers.forEach((timer) => clearTimeout(timer));
      widgetTimers.clear();
      postTextTimers.forEach((timer) => clearTimeout(timer));
      postTextTimers.clear();
    };
  }, []);

  return (
    <div ref={scrollContainerRef} className="flex min-h-0 flex-col gap-4 overflow-y-auto overflow-x-hidden p-4 h-full bg-white">
      {messages.map((message) => {
        const showMessage = message.role !== 'assistant' || visibleAssistantIds.has(message.id);
        const messageHasWidget = hasWidget(message);
        const showWidget = !messageHasWidget || visibleWidgetIds.has(message.id);
        const showPostText = !hasDelayedPostText(message) || visiblePostTextIds.has(message.id);
        const showWidgetDelay = messageHasWidget && !showWidget && !getMessageText(message).trim();
        const shouldAnchorWidget = widgetAnchorIds.has(message.id);

        if (!showMessage) {
          return <TypingIndicator key={`message-delay-${message.id}`} />;
        }

        return (
          <React.Fragment key={message.id}>
            <MessageBubble
              messageId={message.id}
              role={message.role}
              content={message.content}
              parts={message.parts}
              metadata={message.metadata as React.ComponentProps<typeof MessageBubble>['metadata']}
              showWidget={showWidget}
              showPostText={showPostText}
              onWidgetShown={
                shouldAnchorWidget
                  ? (element) => {
                      widgetScrollLockUntilRef.current = Date.now() + 1200;
                      const container = scrollContainerRef.current;
                      if (container) {
                        const containerTop = container.getBoundingClientRect().top;
                        const elementTop = element.getBoundingClientRect().top;
                        container.scrollTo({
                          top: container.scrollTop + elementTop - containerTop,
                          behavior: "smooth",
                        });
                      }
                      setWidgetAnchorIds((current) => {
                        const next = new Set(current);
                        next.delete(message.id);
                        return next;
                      });
                      onWidgetShown?.(message.id, element);
                    }
                  : onWidgetShown
                    ? (element) => onWidgetShown(message.id, element)
                    : undefined
              }
            />
            {(showWidgetDelay || !showPostText) && <TypingIndicator />}
          </React.Fragment>
        );
      })}
      {isLoading && <TypingIndicator />}
    </div>
  );
}
