import { getJourneyDisplayName, type JourneyProductId, type JourneyVariant } from "./journeyConfig";

export type ProductId = JourneyProductId;

export interface ProductIntentResult {
  product?: ProductId;
  answer: string;
  shouldRoute: boolean;
}

function normalizeIntent(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function detectIndiaProduct(value: string): ProductId | undefined {
  if (
    value.includes("personal finance") ||
    value.includes("personal loan") ||
    value.includes("india finance") ||
    value.includes("india loan") ||
    value.includes("personal credit") ||
    value === "personal" ||
    value === "loan"
  ) {
    return "personal_loan";
  }

  return undefined;
}

function mentionsUnsupportedIndiaProduct(value: string): boolean {
  return (
    value.includes("auto loan") ||
    value.includes("car loan") ||
    value.includes("car finance") ||
    value.includes("vehicle loan") ||
    value.includes("vehicle finance") ||
    value.includes("home loan") ||
    value.includes("home finance") ||
    value.includes("mortgage")
  );
}

function detectProduct(value: string, variant: JourneyVariant = "default"): ProductId | undefined {
  if (variant === "india") {
    return detectIndiaProduct(value);
  }

  if (
    value.includes("cash finance") ||
    value.includes("cash loan") ||
    value.includes("personal cash") ||
    value.includes("personal finance") ||
    value.includes("start cash") ||
    value === "cash"
  ) {
    return "cash_finance";
  }

  if (
    value.includes("home finance") ||
    value.includes("home loan") ||
    value.includes("house finance") ||
    value.includes("property finance") ||
    value.includes("mortgage")
  ) {
    return "home_loan";
  }

  if (
    value.includes("vehicle finance") ||
    value.includes("vehicle loan") ||
    value.includes("car finance") ||
    value.includes("car loan") ||
    value.includes("auto finance")
  ) {
    return "personal_loan";
  }

  return undefined;
}

function detectExplicitJourneyStart(value: string, variant: JourneyVariant = "default"): ProductId | undefined {
  const explicitJourneyPhrases = [
    "go with",
    "start",
    "begin",
    "open",
    "proceed with",
    "take me to",
    "launch",
    "lets do",
    "let us do",
    "i want to start",
    "i want to go with",
    "move to",
  ];

  const mentionsJourney = explicitJourneyPhrases.some((phrase) => value.includes(phrase));
  const mentionsJourneyWord = value.includes("journey") || value.includes("apply");

  if (variant === "india" && (mentionsJourney || mentionsJourneyWord || value.includes("continue"))) {
    return detectIndiaProduct(value) ?? "personal_loan";
  }

  const product = detectProduct(value, variant);
  if (!product) return undefined;

  return mentionsJourney || mentionsJourneyWord ? product : undefined;
}

function productInfo(product: ProductId, variant: JourneyVariant = "default"): string {
  if (variant === "india" && product === "personal_loan") {
    return "Personal Finance is designed for everyday borrowing needs in the India journey. I can explain the steps or open the application whenever you are ready.";
  }

  switch (product) {
    case "cash_finance":
      return "Cash Finance is for personal cash needs, like handling expenses or emergencies. If you want, I can also walk you through how the journey works.";
    case "home_loan":
      return "Home Finance is for property-related funding, like buying or supporting a home. I can explain the journey in simple terms if you'd like.";
    case "personal_loan":
      return "Vehicle Finance is for vehicle-related funding with flexible repayment options. I can tell you more or help you start whenever you are ready.";
    default:
      return variant === "india"
        ? "I can help you with the Personal Finance journey for India."
        : "I can help you choose a finance journey. You can say Cash Finance, Home Finance, or Vehicle Finance.";
  }
}

function isQuestionLike(value: string): boolean {
  return (
    value.includes("what") ||
    value.includes("why") ||
    value.includes("how") ||
    value.includes("when") ||
    value.includes("where") ||
    value.includes("which") ||
    value.includes("who") ||
    value.includes("tell me") ||
    value.includes("explain") ||
    value.includes("difference") ||
    value.includes("compare") ||
    value.includes("help")
  );
}

export function resolveProductIntent(text: string, variant: JourneyVariant = "default"): ProductIntentResult {
  const value = normalizeIntent(text);

  if (!value) {
    return {
      answer:
        variant === "india"
          ? "Please ask about Personal Finance or tell me to start your India application."
          : "Please choose a finance type or ask me what each option means.",
      shouldRoute: false,
    };
  }

  if (
    value.includes("difference") ||
    value.includes("compare") ||
    value.includes("between") ||
    value.includes("which one") ||
    value.includes("explain")
  ) {
    if (variant === "india") {
      return {
        answer:
          "This India flow is focused on Personal Finance. I can explain how it works or start the application for you.",
        shouldRoute: false,
      };
    }

    return {
      answer:
        "Sure. Cash Finance is for personal cash needs, Home Finance is for property-related support, and Vehicle Finance is for vehicle financing. Tell me which one you want to hear more about.",
      shouldRoute: false,
    };
  }

  if (variant === "india" && mentionsUnsupportedIndiaProduct(value)) {
    return {
      answer: "For India, Personal Loan is available right now. Auto Loan and Home Loan are not available from this entry yet.",
      shouldRoute: false,
    };
  }

  const product = detectProduct(value, variant);
  if (product) {
    const label = getJourneyDisplayName(product, variant);
    return {
      product,
      answer: `Great, opening ${label} for you.`,
      shouldRoute: true,
    };
  }

  return {
    answer:
      variant === "india"
        ? "I can help you with Personal Finance in India. You can ask how it works or tell me to start the application."
        : "I can help you choose a finance journey. You can say Cash Finance, Home Finance, or Vehicle Finance. You can also ask what the difference is.",
    shouldRoute: false,
  };
}

export function resolveLandingVoiceIntent(text: string, variant: JourneyVariant = "default"): ProductIntentResult {
  const value = normalizeIntent(text);

  if (!value) {
    return {
      answer:
        variant === "india"
          ? "Please ask me about Personal Finance or tell me to start your India application."
          : "Please ask me about Cash Finance, Home Finance, or Vehicle Finance, or tell me which journey you want to start.",
      shouldRoute: false,
    };
  }

  if (
    value.includes("difference") ||
    value.includes("compare") ||
    value.includes("between") ||
    value.includes("which one") ||
    value.includes("explain")
  ) {
    if (variant === "india") {
      return {
        answer:
          "This India journey is focused on Personal Finance. I can explain the steps or open the application when you are ready.",
        shouldRoute: false,
      };
    }

    return {
      answer:
        "Sure. Cash Finance is for personal cash needs, Home Finance is for property-related needs, and Vehicle Finance is for vehicle-related funding. Tell me which one you would like to explore.",
      shouldRoute: false,
    };
  }

  if (variant === "india" && mentionsUnsupportedIndiaProduct(value)) {
    return {
      answer: "For India, I can open Personal Loan right now. Auto Loan and Home Loan are not available from this entry yet.",
      shouldRoute: false,
    };
  }

  const explicitProduct = detectExplicitJourneyStart(value, variant);
  if (explicitProduct) {
    const routeLabel = getJourneyDisplayName(explicitProduct, variant);
    return {
      product: explicitProduct,
      answer: `Great, I am opening ${routeLabel} for you.`,
      shouldRoute: true,
    };
  }

  const product = detectProduct(value, variant);
  if (product) {
    return {
      product,
      answer: productInfo(product, variant),
      shouldRoute: variant === "india",
    };
  }

  if (isQuestionLike(value)) {
    return {
      answer:
        variant === "india"
          ? "Of course. Ask me about the India Personal Finance journey, and I will explain it before we start anything."
          : "Of course. Ask me about Cash Finance, Home Finance, or Vehicle Finance, and I’ll explain it in a simple way before we start anything.",
      shouldRoute: false,
    };
  }

  return {
    answer:
      variant === "india"
        ? "I can help you understand the India Personal Finance journey or begin it when you are ready."
        : "I can help you understand the finance options or begin one when you're ready. Just ask me about Cash Finance, Home Finance, or Vehicle Finance.",
    shouldRoute: false,
  };
}
