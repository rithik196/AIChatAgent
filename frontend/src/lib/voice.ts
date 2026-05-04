/**
 * Select a female voice from the browser's available speech synthesis voices.
 * Prefers Microsoft/Google female voices that sound natural.
 */
export function getFemaleVoice(lang: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis?.getVoices() ?? [];

  // Preferred female voice names (ranked by quality)
  const preferred = [
    "Microsoft Zira",       // Windows English female
    "Microsoft Aria",       // Windows English female (neural)
    "Google UK English Female",
    "Google US English",
    "Samantha",             // macOS
    "Karen",                // macOS Australian
    "Victoria",             // macOS
    "Fiona",                // macOS
  ];

  // Try preferred voices first
  for (const name of preferred) {
    const v = voices.find((v) => v.name.includes(name) && v.lang.startsWith(lang.slice(0, 2)));
    if (v) return v;
  }

  // Fallback: any voice whose name suggests female for the target language
  const femaleKeywords = /female|woman|zira|aria|samantha|karen|fiona|victoria|heera|aditi/i;
  const langMatch = voices.find((v) => v.lang.startsWith(lang.slice(0, 2)) && femaleKeywords.test(v.name));
  if (langMatch) return langMatch;

  // Final fallback: first voice for the language
  return voices.find((v) => v.lang.startsWith(lang.slice(0, 2))) ?? null;
}
