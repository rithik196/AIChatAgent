export type JourneyVariant = "default" | "india";

export type JourneyProductId = "cash_finance" | "home_loan" | "personal_loan";

export interface CountryOption {
  code: string;
  name: string;
  flag: string;
  length: number;
  placeholder: string;
}

type JourneyFeature = {
  title: string;
  description: string;
};

export interface JourneyLandingChoice {
  id: JourneyProductId;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface JourneyConfig {
    head: string;
  key: JourneyVariant;
  region: "SA" | "IN";
  queryValue?: string;
  lockedProduct?: JourneyProductId;
  skipProductStageAfterOtp?: boolean;
  sessionVariant?: string;
  heroBadge?: string;
  heroHeadline?: string;
  heroDescription?: string;
  title: string;
  subtitle: string;
  formTitle: string;
  formDescription: string;
  phoneCtaLabel?: string;
  otpTitle?: string;
  otpDescription?: string;
  otpSubmitLabel?: string;
  otpSuccessDescription?: string;
  agentName?: string;
  assistantIntro: string;
  assistantGreeting: string;
  availableCountries: CountryOption[];
  featureCards: JourneyFeature[];
  landingChoices?: JourneyLandingChoice[];
}

export const SAUDI_COUNTRIES: CountryOption[] = [
  { code: "+966", name: "Saudi Arabia", flag: "🇸🇦", length: 10, placeholder: "5x xxx xxxx" },
  { code: "+971", name: "UAE", flag: "🇦🇪", length: 9, placeholder: "5x xxx xxxx" },
  { code: "+973", name: "Bahrain", flag: "🇧🇭", length: 8, placeholder: "3x xxx xxx" },
  { code: "+965", name: "Kuwait", flag: "🇰🇼", length: 8, placeholder: "5x xxx xxx" },
  { code: "+968", name: "Oman", flag: "🇴🇲", length: 8, placeholder: "9x xxx xxx" },
];

export const INDIA_COUNTRY: CountryOption = {
  code: "+91",
  name: "India",
  flag: "🇮🇳",
  length: 10,
  placeholder: "98 xxx xxxxx",
};

const DEFAULT_JOURNEY_CONFIG: JourneyConfig = {
    head:"Finance",
  key: "default",
  region: "SA",
  title: "Smarter Finance",
  subtitle: "Apply in minutes through a friendly real-time chat with Advisor Raya.",
  formTitle: "Let's Get Started",
  formDescription: "Enter your mobile number to begin safely.",
  phoneCtaLabel: "Continue",
  otpTitle: "Verify OTP",
  otpDescription: "A 4-digit code was sent to",
  otpSubmitLabel: "Verify & Continue",
  otpSuccessDescription: "Taking you to your landing page...",
  agentName: "Finance Agent",
  assistantIntro: "I am your personal finance assistant. Let's start your digital finance application.",
  assistantGreeting: "assalamu alaikum, I am Raya , Your personal finance assistant.",
  availableCountries: SAUDI_COUNTRIES,
  featureCards: [
    { title: "Voice-First", description: "Talk naturally" },
    { title: "Instant Guide", description: "Fast support" },
    { title: "Fast Approval", description: "Simple check" },
  ],
  landingChoices: [
    { id: "cash_finance", label: "Cash Finance", description: "Personal cash financing up to SAR 350K" },
    { id: "home_loan", label: "Home Finance", description: "Home financing with competitive rates" },
    { id: "personal_loan", label: "Vehicle Finance", description: "Flexible vehicle financing" },
  ],
};

const INDIA_JOURNEY_CONFIG: JourneyConfig = {
    head:"Personal Loan",
  key: "india",
  region: "IN",
  queryValue: "india",
  lockedProduct: "personal_loan",
  skipProductStageAfterOtp: false,
  sessionVariant: "india_personal",
  heroBadge: "India Personal Finance",
  heroHeadline: "Mobile-first onboarding with OTP login and guided support.",
  heroDescription: "Start with your mobile number, verify OTP, and continue directly into the India personal finance journey without extra product switching.",
  title: "Smarter Loan Application",
  subtitle: "Apply in minutes through a friendly real-time chat with Advisor Raya.",
  formTitle: "Login With Your Mobile Number",
  formDescription: "Enter your India mobile number to receive a secure OTP and continue.",
  phoneCtaLabel: "Continue",
  otpTitle: "Verify Your OTP",
  otpDescription: "We sent a 4-digit verification code to",
  otpSubmitLabel: "Verify OTP & Continue",
  otpSuccessDescription: "OTP verified. Taking you to your India personal finance journey...",
  agentName: "Loan Agent",
  assistantIntro: "I am your personal loan assistant. Let's start your digital loan application.",
  assistantGreeting: "Hello, I am Raya, your personal finance assistant for India.",
  availableCountries: [INDIA_COUNTRY],
  featureCards: [
    { title: "Voice First", description: "Talk naturally" },
    { title: "Instant Guide", description: "Fast support" },
    { title: "Fast Approval", description: "Simple check" },
  ],
  landingChoices: [
    { id: "personal_loan", label: "Personal Loan", description: "Continue to the India personal loan chat" },
    { id: "cash_finance", label: "Auto Loan", description: "Available soon", disabled: false },
    { id: "home_loan", label: "Home Loan", description: "Available soon", disabled: false },
  ],
};

export function resolveJourneyVariant(value: string | null | undefined): JourneyConfig {
  if (typeof value === "string" && value.toLowerCase() === INDIA_JOURNEY_CONFIG.queryValue) {
    return INDIA_JOURNEY_CONFIG;
  }

  return DEFAULT_JOURNEY_CONFIG;
}

export function buildJourneyHref(product: string, variant: JourneyVariant): string {
  if (variant === "india") {
    return `/${product}?journey=india`;
  }

  return `/${product}`;
}

export function buildLoginHref(variant: JourneyVariant): string {
  if (variant === "india") {
    return "/login?journey=india";
  }

  return "/login";
}

export function buildJourneySessionId(phone: string, product: string, variant: JourneyVariant): string {
  if (variant === "india") {
    return `${phone}_${product}_india`;
  }

  return `${phone}_${product}`;
}

export function getJourneyDisplayName(product: string, variant: JourneyVariant): string {
  if (variant === "india" && product === "personal_loan") {
    return "Personal Loan";
  }

  switch (product) {
    case "cash_finance":
      return "Cash Finance";
    case "home_loan":
      return "Home Finance";
    case "personal_loan":
      return "Vehicle Finance";
    default:
      return product.replace(/_/g, " ");
  }
}