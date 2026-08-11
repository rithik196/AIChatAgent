"use client";

import type { UIMessage } from "@ai-sdk/react";

export type VoiceResolvedAction = {
  messageId: string;
  buttonLabels: string[];
  clickFirstButtonIfDisabled?: boolean;
  clickCheckboxFirst?: boolean;
  fallbackVisibleText?: string;
  fallbackSystemText?: string;
};

type WidgetSpec = {
  widget?: string;
  data?: unknown;
};

type VoiceOption = {
  id: string;
  label: string;
  value: string;
};

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchesAnyPhrase(text: string, phrases: string[]): boolean {
  const normalizedText = normalize(text);
  return phrases.some((phrase) => normalizedText.includes(normalize(phrase)));
}

function getMessageText(message: UIMessage | undefined): string {
  if (!message) return "";

  const content = (message as { content?: unknown }).content;
  if (typeof content === "string" && content.trim()) {
    return content;
  }

  const parts = (message as { parts?: Array<{ type?: string; text?: string }> }).parts || [];
  return parts
    .filter((part) => part?.type === "text" && typeof part.text === "string")
    .map((part) => part.text as string)
    .join(" ")
    .trim();
}

const SPOKEN_DIGITS: Record<string, string> = {
  zero: "0",
  oh: "0",
  o: "0",
  one: "1",
  two: "2",
  to: "2",
  too: "2",
  three: "3",
  four: "4",
  for: "4",
  five: "5",
  six: "6",
  seven: "7",
  eight: "8",
  ate: "8",
  nine: "9",
};

function extractOtpFromTranscript(transcript: string): { otp: string | null; hasOtpCue: boolean } {
  const normalizedTranscript = normalize(transcript);
  const hasOtpCue = matchesAnyPhrase(normalizedTranscript, [
    "otp",
    "o t p",
    "one time password",
    "verification code",
    "security code",
  ]);

  const explicitDigits = normalizedTranscript.match(/\b\d{4,8}\b/);
  if (explicitDigits?.[0]) {
    return { otp: explicitDigits[0], hasOtpCue };
  }

  const tokens = normalizedTranscript.split(/\s+/).filter(Boolean);
  const spokenDigits = tokens
    .map((token) => {
      if (SPOKEN_DIGITS[token] !== undefined) return SPOKEN_DIGITS[token];
      if (/^\d+$/.test(token)) return token;
      return "";
    })
    .join("");

  if (spokenDigits.length >= 4 && spokenDigits.length <= 8) {
    return { otp: spokenDigits, hasOtpCue };
  }

  return { otp: null, hasOtpCue };
}

function isOtpVerificationContext(message: UIMessage | undefined): boolean {
  if (!message) return false;

  const { widget } = widgetSpec(message);
  if (widget === "OtpVerificationWidget" || widget === "FinalIVRConsentWidget" || widget === "LoadingWidget") {
    return true;
  }

  const text = normalize(getMessageText(message));
  if (!text) return false;

  return matchesAnyPhrase(text, ["otp", "one time password", "verification code", "simah", "bureau", "ivr"]);
}

function widgetSpec(message: UIMessage | undefined): WidgetSpec {
  return ((message?.metadata as { widget?: WidgetSpec } | undefined)?.widget || {}) as WidgetSpec;
}

function buildOptionAction(message: UIMessage | undefined, transcript: string): VoiceResolvedAction | null {
  if (!message) return null;
  const metadata = (message.metadata || {}) as {
    options?: VoiceOption[];
  };

  const options = metadata.options || [];
  if (options.length === 0) return null;

  const normalizedTranscript = normalize(transcript);
  if (!normalizedTranscript) return null;

  const ranked = options
    .map((option) => {
      const candidates = [option.label, option.value].filter(Boolean);
      let score = 0;

      for (const candidate of candidates) {
        const normalizedCandidate = normalize(candidate);
        if (!normalizedCandidate) continue;

        if (normalizedTranscript === normalizedCandidate) {
          score = Math.max(score, 4);
        } else if (
          normalizedTranscript.startsWith(`${normalizedCandidate} `) ||
          normalizedTranscript.endsWith(` ${normalizedCandidate}`) ||
          normalizedTranscript.includes(` ${normalizedCandidate} `)
        ) {
          score = Math.max(score, 3);
        } else if (normalizedTranscript.includes(normalizedCandidate) && normalizedCandidate.length >= 3) {
          score = Math.max(score, 2);
        }
      }

      return { option, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  const best = ranked[0]?.option;
  if (!best) return null;

  return {
    messageId: message.id,
    buttonLabels: [best.label, best.value],
  };
}

function widgetAction(message: UIMessage | undefined, transcript: string): VoiceResolvedAction | null {
  if (!message) return null;

  const { widget, data } = widgetSpec(message);
  if (!widget) return null;

  const normalized = normalize(transcript);
  if (!normalized) return null;

  const action = (labels: string[], extras?: Partial<VoiceResolvedAction>): VoiceResolvedAction => ({
    messageId: message.id,
    buttonLabels: labels,
    ...extras,
  });

  const categoryButtons = Array.isArray((data as { categories?: string[] } | undefined)?.categories)
    ? ((data as { categories?: string[] }).categories || [])
    : ["Cash Finance", "Finance Type 2", "Finance Type 3"];

  switch (widget) {
    case "WelcomeWidget":
      for (const category of categoryButtons) {
        if (matchesAnyPhrase(normalized, [category])) {
          return action([category]);
        }
      }
      if (matchesAnyPhrase(normalized, ["cash finance", "finance type 2", "finance type 3"])) {
        return action(categoryButtons);
      }
      return null;

    case "NTBIntroductionWidget":
      if (matchesAnyPhrase(normalized, [
        "let's begin",
        "lets begin",
        "begin",
        "start",
        "yes",
        "yes please",
        "yes start",
        "continue",
        "proceed",
        "go ahead",
        "start the loan application",
        "begin the journey",
      ])) {
        return action(["Let's Begin", "Let's begin"]);
      }
      return null;

    case "IndiaOtpWidget":
      if (matchesAnyPhrase(normalized, [
        "did not receive otp",
        "did not receive the otp",
        "did not receive one time password",
        "resend otp",
        "resend",
        "send otp again",
      ])) {
        return action(["Did not receive the One-Time Password"]);
      }
      return null;

    case "IndiaPreApprovedOfferWidget":
      const indiaOfferData = data as {
        accept_label?: string;
        accept_signal?: string;
        secondary_label?: string;
        secondary_signal?: string;
      } | undefined;
      const indiaAcceptLabel = indiaOfferData?.accept_label ?? "Accept Pre-Approved Offer";
      const indiaAcceptSignal = indiaOfferData?.accept_signal ?? "__SYS__accepted_pre_approved_offer";
      const indiaSecondaryLabel = indiaOfferData?.secondary_label ?? "Need Higher Amount";
      const indiaSecondarySignal = indiaOfferData?.secondary_signal ?? "__SYS__higher_amount_requested";
      const indiaQuestionStarters = [
        "what",
        "why",
        "how",
        "when",
        "where",
        "which",
        "who",
        "can you",
        "could you",
        "do i",
        "does",
        "is",
        "are",
        "will",
        "would",
        "should",
        "tell me",
        "explain",
        "describe",
      ];
      const indiaAcceptPhrases = [
        "accept",
        "accept offer",
        "accept the offer",
        "accept this offer",
        "accept preapproved offer",
        "accept the preapproved offer",
        "accept pre approved offer",
        "accept the pre approved offer",
        "accept pre approved loan offer",
        "i accept offer",
        "i accept the offer",
        "i accept this offer",
        "accept counter offer",
        "accept counter loan offer",
        "accept the counter offer",
        "go with offer",
        "go ahead with this offer",
        "yes accept",
      ];
      const indiaHigherAmountPhrases = [
        "need higher amount",
        "need a higher amount",
        "higher amount",
        "more amount",
        "need more amount",
        "higher loan amount",
        "i want higher amount",
        "i want a higher amount",
        "i want more amount",
        "want higher amount",
        "want more amount",
        "request a higher amount",
        "request higher amount",
      ];

      if (matchesAnyPhrase(normalized, [
        "do not accept",
        "dont accept",
        "don t accept",
        "not accept",
        "decline",
        "reject",
      ])) {
        return null;
      }

      if (indiaQuestionStarters.some((starter) => normalized.startsWith(starter))) {
        return null;
      }

      const indiaAcceptMatch = matchesAnyPhrase(normalized, indiaAcceptPhrases);
      const indiaHigherAmountMatch = matchesAnyPhrase(normalized, indiaHigherAmountPhrases);
      if (indiaAcceptMatch === indiaHigherAmountMatch) {
        return null;
      }

      if (indiaAcceptMatch) {
        return action([
          indiaAcceptLabel,
          "Accept Pre-Approved Offer",
          "Accept Pre-Approved Loan Offer",
          "Accept Counter Loan Offer",
        ], {
          fallbackVisibleText: indiaAcceptLabel,
          fallbackSystemText: indiaAcceptSignal,
        });
      }
      if (indiaHigherAmountMatch) {
        return action([indiaSecondaryLabel, "Need Higher Amount"], {
          fallbackVisibleText: indiaSecondaryLabel,
          fallbackSystemText: indiaSecondarySignal,
        });
      }
      return null;

    case "IndiaEmploymentDetailsWidget":
      if (matchesAnyPhrase(normalized, [
        "confirm details",
        "confirm employment details",
        "these details are accurate",
        "details are accurate",
        "continue",
        "proceed",
      ])) {
        return action(["I confirm these details are accurate"]);
      }
      if (matchesAnyPhrase(normalized, [
        "modify employment details",
        "modify my employment",
        "modify employment",
        "modify my employ",
        "edit employment details",
        "change employment details",
        "change employ",
        "update employment details",
      ])) {
        return action(["I wish to modify my Employment Details"], {
          fallbackVisibleText: "I wish to modify my Employment Details",
          fallbackSystemText: "__SYS__india_modify_employment",
        });
      }
      if (matchesAnyPhrase(normalized, ["save changes", "save employment details", "save updated employment details", "save"])) {
        return action(["Save Changes"]);
      }
      if (matchesAnyPhrase(normalized, ["back to review", "go back", "back"])) {
        return action(["Back to Review"]);
      }
      return null;

    case "IndiaPersonalDetailsWidget":
      if (matchesAnyPhrase(normalized, [
        "confirm details",
        "confirm personal details",
        "these details are accurate",
        "details are accurate",
        "continue",
        "proceed",
      ])) {
        return action(["I confirm these details are accurate"]);
      }
      if (matchesAnyPhrase(normalized, [
        "modify personal details",
        "modify my personal",
        "modify personal",
        "edit personal details",
        "change personal details",
        "change personal",
        "update personal details",
      ])) {
        return action(["I wish to modify my personal details"], {
          fallbackVisibleText: "I wish to modify my personal details",
          fallbackSystemText: "__SYS__india_modify_personal_details",
        });
      }
      if (matchesAnyPhrase(normalized, ["save changes", "save personal details", "save updated personal details", "save"])) {
        return action(["Save Changes"]);
      }
      if (matchesAnyPhrase(normalized, ["back to review", "go back", "back"])) {
        return action(["Back to Review"]);
      }
      return null;

    case "IndiaFacilityLetterWidget":
      if (matchesAnyPhrase(normalized, [
        "e sign",
        "esign",
        "sign",
        "sign document",
        "proceed to sign",
        "continue to e sign",
      ])) {
        return action(["E-Sign"]);
      }
      return null;

    case "PersonalDetailsWidget":
      if (matchesAnyPhrase(normalized, ["modify details", "change details", "edit details", "update details"])) {
        return action(["Modify Details"], {
          fallbackVisibleText: "Modify Details",
          fallbackSystemText: "__SYS__modify_section",
        });
      }
      if (matchesAnyPhrase(normalized, ["confirm and continue", "confirm continue", "continue", "proceed", "done"])) {
        return action(["Confirm & Continue", "Confirm and Continue"], {
          fallbackVisibleText: "Details confirmed",
          fallbackSystemText: "__SYS__continue",
        });
      }
      return null;

    case "ModifySectionWidget":
      if (matchesAnyPhrase(normalized, ["personal details", "personal"])) {
        return action(["Personal Details"]);
      }
      if (matchesAnyPhrase(normalized, ["address details", "address"])) {
        return action(["Address Details"]);
      }
      if (matchesAnyPhrase(normalized, ["employment details", "employment", "job", "work"])) {
        return action(["Employment Details"]);
      }
      if (matchesAnyPhrase(normalized, ["income details", "income", "salary"])) {
        return action(["Income Details"]);
      }
      return null;

    case "ModifyPersonalWidget":
      if (matchesAnyPhrase(normalized, ["save changes", "save updated personal details", "save personal"])) {
        return action(["Save Changes"]);
      }
      return null;

    case "ModifyAddressWidget":
      if (matchesAnyPhrase(normalized, ["save changes", "save updated address details", "save address"])) {
        return action(["Save Changes"]);
      }
      return null;

    case "ModifyEmploymentWidget":
      if (matchesAnyPhrase(normalized, ["save changes", "save updated employment details", "save employment"])) {
        return action(["Save Changes"]);
      }
      return null;

    case "ModifyIncomeWidget":
      if (matchesAnyPhrase(normalized, ["save changes", "save updated income details", "save income"])) {
        return action(["Save Changes"]);
      }
      return null;

    case "IncomeProofChoiceWidget":
      if (matchesAnyPhrase(normalized, ["upload bank statement", "upload statement", "statement", "upload"])) {
        return action(["Upload Bank Statement"]);
      }
      if (matchesAnyPhrase(normalized, ["open banking", "banking link", "link my bank"])) {
        return action(["Open Banking"]);
      }
      return null;

    case "OtpVerificationWidget":
      if (matchesAnyPhrase(normalized, ["sms otp", "otp verification", "otp", "sms"])) {
        return action(["SMS OTP"]);
      }
      if (matchesAnyPhrase(normalized, ["ivr call", "ivr verification", "call"])) {
        return action(["IVR Call"]);
      }
      return null;

    case "FinalIVRConsentWidget":
      if (matchesAnyPhrase(normalized, ["send me an otp", "send otp", "otp verification", "sms otp", "verify with otp", "otp"])) {
        return action(["OTP Verification", "SMS OTP"]);
      }
      if (matchesAnyPhrase(normalized, ["call me for ivr verification", "ivr call", "ivr"])) {
        return action(["IVR Call Verification", "IVR Call"]);
      }
      if (matchesAnyPhrase(normalized, ["do not consent", "i do not consent", "no consent", "decline"])) {
        return action(["I do not consent"]);
      }
      return null;

    case "EligibleOfferWidget":
      if (matchesAnyPhrase(normalized, ["review details and proceed", "continue", "proceed", "review details"])) {
        return action(["Review Details & Proceed"], {
          fallbackVisibleText: "I had reviewed the offer details and wish to proceed",
          fallbackSystemText: "__SYS__continue",
        });
      }
      return null;

    case "PreApprovedOfferWidget":
      if (matchesAnyPhrase(normalized, ["go with offer", "accept offer", "take offer"])) {
        return action(["Go with offer"], {
          fallbackVisibleText: "Go with offer",
          fallbackSystemText: "__SYS__accepted_pre_approved_offer",
        });
      }
      if (matchesAnyPhrase(normalized, ["need higher amount", "higher amount", "more amount"])) {
        return action(["Need higher amount"], {
          fallbackVisibleText: "I need higher amount",
          fallbackSystemText: "__SYS__higher_amount_requested",
        });
      }
      return null;

    case "WantsMoreDecisionWidget":
      if (matchesAnyPhrase(normalized, ["amount is okay", "okay", "accept", "eligible finance offer", "proceed", "yes"])) {
        return action(["Proceed", "Amount is okay", "Accept eligible finance offer"], {
          fallbackVisibleText: "Amount is okay",
          fallbackSystemText: "__SYS__accepted_max_offer",
        });
      }
      if (matchesAnyPhrase(normalized, ["request for a higher amount", "higher amount", "want more", "need higher amount"])) {
        return action(["Need Higher Amount", "Request for Higher Amount"], {
          fallbackVisibleText: "I need a higher amount",
          fallbackSystemText: "__SYS__higher_amount_requested",
        });
      }
      return null;

    case "HigherAmountReviewWidget":
      if (matchesAnyPhrase(normalized, ["submit for review", "submit review", "review now"])) {
        return action(["Submit for review"], {
          fallbackVisibleText: "Submit for review",
          fallbackSystemText: "__SYS__submit_higher_amount_review",
        });
      }
      if (matchesAnyPhrase(normalized, ["go back", "back"])) {
        return action(["Go back"], {
          fallbackVisibleText: "Go back",
          fallbackSystemText: "__SYS__higher_amount_review_go_back",
        });
      }
      return null;

    case "OfferSliderWidget":
      if (matchesAnyPhrase(normalized, ["confirm finance plan", "confirm plan", "confirm", "done", "proceed"])) {
        return action(["Confirm Finance Plan"]);
      }
      return null;

    case "FinanceSummaryWidget":
      if (matchesAnyPhrase(normalized, ["confirm finance plan", "confirm plan", "proceed", "commodity trade", "next step"])) {
        return action(["Proceed to commodity trade", "Confirm Finance Plan"], {
          fallbackVisibleText: "Proceed to commodity trade",
          fallbackSystemText: "__SYS__continue",
        });
      }
      if (matchesAnyPhrase(normalized, ["request higher amount", "higher amount", "modify amount", "modify tenure"])) {
        return action(["Modify Amount or Tenure", "Request higher amount"], {
          fallbackVisibleText: "I wish to modify the amount/tenure",
        });
      }
      return null;

    case "ExpensesWidget":
      if (matchesAnyPhrase(normalized, ["modify expenses", "edit expenses", "change expenses", "modify"])) {
        return action(["Modify"]);
      }
      if (
        matchesAnyPhrase(normalized, [
          "save changes",
          "save updated expenses",
          "save expense",
          "save expenses",
          "save my expense",
          "save my expenses",
          "save",
        ])
      ) {
        return action(["Save Expenses", "Save Changes", "Continue"], {
          fallbackVisibleText: "Save my expenses",
          fallbackSystemText: "__SYS__expenses_confirm",
        });
      }
      if (matchesAnyPhrase(normalized, ["continue", "confirm expenses", "confirm", "proceed"])) {
        return action(["Continue"], {
          fallbackVisibleText: "Save my expenses",
          fallbackSystemText: "__SYS__expenses_confirm",
        });
      }
      return null;

    case "GenerateContractWidget":
      if (matchesAnyPhrase(normalized, [
        "continue",
        "proceed",
        "go ahead",
        "next",
        "generate contract",
        "generate documents",
        "show documents",
        "promissory note",
      ])) {
        return action(["Generate Contract & Promissory Note"], {
          fallbackVisibleText: "Generate the Contract & Promissory Note",
          fallbackSystemText: "__SYS__proceed_esign",
        });
      }
      return null;

    case "DocumentPreviewWidget":
      if (matchesAnyPhrase(normalized, ["next step", "proceed to next step"])) {
        return action(["Proceed to next step"], {
          fallbackVisibleText: "Proceed to next step",
          fallbackSystemText: "__SYS__proceed_contract_prompt",
        });
      }
      if (matchesAnyPhrase(normalized, ["continue", "proceed"])) {
        return action(["Proceed to next step", "E-Sign via Nafath", "Proceed to e-sign"], {
          fallbackVisibleText: "E-Sign via Nafath",
          fallbackSystemText: "__SYS__proceed_esign",
        });
      }
      if (matchesAnyPhrase(normalized, ["e sign", "esign", "proceed to e sign", "proceed to e-sign", "nafath", "sign documents"])) {
        return action(["E-Sign via Nafath", "Generate Contract & Promissory Note", "Proceed to e-sign"], {
          fallbackVisibleText: "E-Sign via Nafath",
          fallbackSystemText: "__SYS__proceed_esign",
        });
      }
      return null;

    case "CommodityTradeAuthorizationWidget":
      if (matchesAnyPhrase(normalized, ["i authorize the trade", "authorize the trade", "authorize trade", "commodity trade", "yes authorize", "authorize"])) {
        return action(["Authorize Trade"], {
          clickCheckboxFirst: true,
          clickFirstButtonIfDisabled: true,
          fallbackVisibleText: "I authorize the commodity trade.",
          fallbackSystemText: "__SYS__continue",
        });
      }
      return null;

    case "ApplicationSummaryWidget":
      if (matchesAnyPhrase(normalized, ["confirm", "i confirm", "confirm details", "yes confirm", "confirm and proceed", "final verification", "proceed"])) {
        return action(["Confirm & Proceed"], {
          clickCheckboxFirst: true,
          fallbackVisibleText: "I confirm all details. Proceed for final verification.",
          fallbackSystemText: "__SYS__continue",
        });
      }
      return null;

    case "IBANValidationWidget":
      if (matchesAnyPhrase(normalized, ["proceed to summary", "confirm iban", "proceed", "confirm"])) {
        return action(["Proceed to Summary", "Confirm IBAN"], {
          clickCheckboxFirst: true,
          clickFirstButtonIfDisabled: true,
          fallbackVisibleText: "Confirm and proceed",
        });
      }
      if (matchesAnyPhrase(normalized, ["try different iban", "different iban", "enter another iban"])) {
        return action(["Try Different IBAN", "Let me enter a different IBAN"], {
          fallbackVisibleText: "Let me enter a different IBAN",
        });
      }
      return null;

    case "AccountSelectorWidget":
      if (matchesAnyPhrase(normalized, ["use selected account", "selected account", "use this account", "proceed with this account"])) {
        return action(["Use Selected Account"], { clickFirstButtonIfDisabled: true });
      }
      if (matchesAnyPhrase(normalized, ["validate iban", "verify iban"])) {
        return action(["Validate IBAN"]);
      }
      if (matchesAnyPhrase(normalized, ["enter iban manually", "manual iban", "or enter iban manually"])) {
        return action(["Or enter IBAN manually"]);
      }
      if (matchesAnyPhrase(normalized, ["back to existing account", "back to existing accounts", "go back to accounts"])) {
        return action(["Back to Existing Accounts"]);
      }
      return null;

    case "NafathWidget":
      if (matchesAnyPhrase(normalized, ["did not receive the request", "did not receive", "not receive", "resend"])) {
        return action(["Did not receive the request"]);
      }
      return null;

    case "VerificationSuccessWidget":
    case "LoadingWidget":
      if (matchesAnyPhrase(normalized, ["continue", "proceed", "done"])) {
        return action(["Continue"]);
      }
      return null;

    default:
      return null;
  }
}

export function resolveVoiceJourneyAction(
  activeAssistant: UIMessage | undefined,
  latestOptionPrompt: UIMessage | undefined,
  transcript: string
): VoiceResolvedAction | null {
  const { otp, hasOtpCue } = extractOtpFromTranscript(transcript);
  if (otp && activeAssistant && (hasOtpCue || isOtpVerificationContext(activeAssistant))) {
    return {
      messageId: activeAssistant.id,
      buttonLabels: [],
      fallbackVisibleText: otp,
    };
  }

  const optionAction = buildOptionAction(latestOptionPrompt, transcript);
  if (optionAction) return optionAction;

  const widgetResolvedAction = widgetAction(activeAssistant, transcript);
  if (widgetResolvedAction) return widgetResolvedAction;

  return null;
}
