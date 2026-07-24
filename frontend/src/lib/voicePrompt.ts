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

// Expand uppercase abbreviations into spaced letters so TTS pronounces them
// correctly (e.g. "OTP" → "O. T. P." instead of reading it as a word).
const TTS_ABBREVIATIONS: [RegExp, string][] = [
  [/\bOTP\b/g,  "O. T. P."],
  [/\bIVR\b/g,  "I. V. R."],
  [/\bSMS\b/g,  "S. M. S."],
  [/\bSAMA\b/g, "S. A. M. A."],
  [/\bIBAN\b/g, "I. B. A. N."],
  [/\bEMI\b/g,  "E. M. I."],
  [/\bNTB\b/g,  "N. T. B."],
  [/\bKYC\b/g,  "K. Y. C."],
];

function expandAbbreviationsForTTS(text: string): string {
  let result = text;
  for (const [pattern, replacement] of TTS_ABBREVIATIONS) {
    result = result.replace(pattern, replacement);
  }
  return result;
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

  return expandAbbreviationsForTTS(clean);
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

  return expandAbbreviationsForTTS(clean);
}

export function buildVoicePrompt(text: string): string {
  return buildVoiceSpeechText(text);
}
