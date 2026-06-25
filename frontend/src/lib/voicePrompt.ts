const OFFER_LEAD_IN = "I have prepared the offer details for you.";

function cleanForVoice(text: string): string {
  const normalized = text
    .replace(/<WIDGET_DATA>[\s\S]*?<\/WIDGET_DATA>/g, "")
    .replace(/\*\*/g, "")
    .replace(/[#_~`>]/g, "")
    .replace(/\r\n/g, "\n");

  return normalized
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function stripRedundantLeadIns(text: string): string {
  return text
    .replace(new RegExp(`^${OFFER_LEAD_IN.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*`, "i"), "")
    .trim();
}

export function buildVoicePreviewText(text: string): string {
  const clean = stripRedundantLeadIns(cleanForVoice(text));
  if (!clean) {
    return "I am ready when you are.";
  }

  const lower = clean.toLowerCase();
  if (lower.includes("welcome") && lower.includes("national id")) {
    return "Hi, I am Raya, your finance assistant. I will guide you through this application. Please tell me your National ID when you are ready.";
  }

  return clean;
}

export function buildVoiceSpeechText(text: string): string {
  const clean = stripRedundantLeadIns(cleanForVoice(text));
  if (!clean) {
    return "I am ready when you are.";
  }

  const lower = clean.toLowerCase();
  if (lower.includes("welcome") && lower.includes("national id")) {
    return "Hi, I am Raya, your finance assistant. I will guide you through this application. Please tell me your National ID when you are ready.";
  }

  return clean;
}

export function buildVoicePrompt(text: string): string {
  return buildVoiceSpeechText(text);
}
