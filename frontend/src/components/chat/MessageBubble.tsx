"use client";

import React, { useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSpeakContext } from "@/hooks/SpeakContext";
import { getFemaleVoice } from "@/lib/voice";
import { NafathWidget } from "../widgets/NafathWidget";
import { OfferSliderWidget } from "../widgets/OfferSliderWidget";
import { SuccessWidget } from "../widgets/SuccessWidget";
import { WelcomeWidget } from "../widgets/WelcomeWidget";
import { LoadingWidget } from "../widgets/LoadingWidget";
import { VerificationSuccessWidget } from "../widgets/VerificationSuccessWidget";
import { PersonalDetailsWidget } from "../widgets/PersonalDetailsWidget";
import { EligibleOfferWidget } from "../widgets/EligibleOfferWidget";
import { FinanceSummaryWidget } from "../widgets/FinanceSummaryWidget";
import { DocumentPreviewWidget } from "../widgets/DocumentPreviewWidget";
import { OtpVerificationWidget } from "../widgets/OtpVerificationWidget";
import { AccountSelectorWidget } from "../widgets/AccountSelectorWidget";
import { DisbursementWidget } from "../widgets/DisbursementWidget";
import { NTBIntroductionWidget } from "../widgets/NTBIntroductionWidget";

type WidgetData = unknown;

interface WidgetSpec {
  widget: string;
  data?: WidgetData;
}

interface MessagePart {
  type?: string;
  text?: string;
  data?: WidgetSpec | null;
}

interface MessageMetadata {
  widget?: WidgetSpec | null;
}

type WidgetComponent = React.ComponentType<any>;

// Widget registry - maps widget name to component
const WIDGET_REGISTRY: Record<string, WidgetComponent> = {
  NafathWidget,
  OfferSliderWidget,
  SuccessWidget,
  WelcomeWidget,
  LoadingWidget,
  VerificationSuccessWidget,
  PersonalDetailsWidget,
  EligibleOfferWidget,
  FinanceSummaryWidget,
  DocumentPreviewWidget,
  OtpVerificationWidget,
  AccountSelectorWidget,
  DisbursementWidget,
  NTBIntroductionWidget,
};

interface MessageBubbleProps {
  role: "user" | "assistant";
  content?: string;
  parts?: MessagePart[];
  metadata?: MessageMetadata;
}

/** Render lightweight inline markdown: **bold**, *italic*, `code` */
function renderInlineMarkdown(text: string): React.ReactNode {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let listItems: React.ReactNode[] = [];
  let listType: "ol" | "ul" | null = null;

  const flushList = () => {
    if (listItems.length > 0 && listType) {
      const ListTag = listType;
      elements.push(
        <ListTag
          key={`list-${elements.length}`}
          className={
            listType === "ol"
              ? "list-decimal pl-5 space-y-1 my-1"
              : "list-disc pl-5 space-y-1 my-1"
          }
        >
          {listItems}
        </ListTag>
      );
      listItems = [];
      listType = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    const olMatch = trimmed.match(/^(\d+)\.\s+(.+)/);
    const ulMatch = trimmed.match(/^[-•]\s+(.+)/);

    if (olMatch) {
      if (listType !== "ol") flushList();
      listType = "ol";
      listItems.push(<li key={`li-${i}`}>{renderInlineSpans(olMatch[2])}</li>);
    } else if (ulMatch) {
      if (listType !== "ul") flushList();
      listType = "ul";
      listItems.push(<li key={`li-${i}`}>{renderInlineSpans(ulMatch[1])}</li>);
    } else {
      flushList();
      if (trimmed === "") {
        if (elements.length > 0) {
          elements.push(<div key={`br-${i}`} className="h-2" />);
        }
      } else {
        elements.push(<p key={`p-${i}`} className="my-0.5">{renderInlineSpans(trimmed)}</p>);
      }
    }
  }

  flushList();
  return <>{elements}</>;
}

/** Render inline spans: **bold**, *italic*, `code` within a single line */
function renderInlineSpans(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[2]) {
      parts.push(
        <strong key={match.index} className="font-bold">
          {match[2]}
        </strong>
      );
    } else if (match[3]) {
      parts.push(<em key={match.index}>{match[3]}</em>);
    } else if (match[4]) {
      parts.push(
        <code key={match.index} className="bg-slate-100 px-1 rounded text-[13px]">
          {match[4]}
        </code>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

export function MessageBubble({ role, content, parts, metadata }: MessageBubbleProps) {
  const isUser = role === "user";
  const speak = useSpeakContext();
  const [isSpeaking, setIsSpeaking] = useState(false);

  const displayText =
    content ||
    parts
      ?.filter((part) => part.type === "text")
      .map((part) => part.text)
      .filter(Boolean)
      .join("") ||
    "";

  let widgetSpec: WidgetSpec | null = metadata?.widget || null;

  if (!widgetSpec) {
    const widgetDataPart = parts?.find((part) => part.type === "data-widget");
    widgetSpec = widgetDataPart?.data || null;
  }

  if (!widgetSpec) {
    const widgetMatch = displayText.match(/<WIDGET_DATA>([\s\S]*?)<\/WIDGET_DATA>/);
    if (widgetMatch?.[1]) {
      try {
        widgetSpec = JSON.parse(widgetMatch[1]);
      } catch (error) {
        console.error("Failed to parse widget data", error);
      }
    }
  }

  const sanitizedText = displayText.replace(/<WIDGET_DATA>[\s\S]*?<\/WIDGET_DATA>/g, "").trim();

  if (isUser && sanitizedText.startsWith("__SYS__")) return null;
  if (!sanitizedText && !widgetSpec) return null;

  const WidgetComponent = widgetSpec ? WIDGET_REGISTRY[widgetSpec.widget] : null;

  const handleSpeak = () => {
    if (isSpeaking) {
      window.speechSynthesis?.cancel();
      setIsSpeaking(false);
      return;
    }

    if (!speak || !sanitizedText.trim()) return;

    const clean = sanitizedText.replace(/\*\*/g, "").replace(/[#_~`>]/g, "");
    window.speechSynthesis?.cancel();

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = "en-US";

    const femaleVoice = getFemaleVoice("en-US");
    if (femaleVoice) utterance.voice = femaleVoice;

    utterance.pitch = 1.1;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className={cn("flex flex-col w-full gap-2", isUser ? "items-end" : "items-start")}>
      {sanitizedText && (
        <div
          className={cn(
            "max-w-[85%] px-5 py-3.5 text-[14px] leading-relaxed text-slate-900 rounded-[24px] shadow-sm font-medium",
            isUser ? "bg-gradient-to-r from-[#ffd3a6] to-[#d6988d] rounded-br-[8px]" : "rounded-bl-[8px]"
          )}
          style={
            !isUser
              ? {
                  backgroundColor: "#FFFFFF",
                  backgroundImage:
                    "linear-gradient(125.41deg, rgba(185, 220, 242, 0.2) -6.53%, rgba(235, 244, 245, 0.2) 110.14%)",
                }
              : undefined
          }
        >
          {isUser ? sanitizedText : renderInlineMarkdown(sanitizedText)}
          {!isUser && speak && (
            <button
              onClick={handleSpeak}
              className="mt-2 flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 transition-colors"
              aria-label={isSpeaking ? "Stop speaking" : "Read aloud"}
            >
              {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          )}
        </div>
      )}

      {WidgetComponent && <WidgetComponent data={widgetSpec?.data} />}
    </div>
  );
}
