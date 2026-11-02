export type PlanId = "free" | "solo" | "pro" | "agency";

export interface Plan {
  id: PlanId;
  name: string;
  /** USD per month on monthly billing. */
  priceMonthly: number;
  /** USD per month when billed yearly. */
  priceYearly: number;
  /** INR per month for customers billed in rupees through Razorpay. */
  priceInr: { monthly: number; yearly: number };
  /** AI credits included each month. Unused credits don't roll over. */
  creditsPerMonth: number;
}

export const PLANS: Record<PlanId, Plan> = {
  free: { id: "free", name: "Free", priceMonthly: 0, priceYearly: 0, priceInr: { monthly: 0, yearly: 0 }, creditsPerMonth: 40 },
  solo: { id: "solo", name: "Solo", priceMonthly: 4, priceYearly: 3, priceInr: { monthly: 299, yearly: 249 }, creditsPerMonth: 300 },
  pro: { id: "pro", name: "Pro", priceMonthly: 9, priceYearly: 7, priceInr: { monthly: 749, yearly: 599 }, creditsPerMonth: 800 },
  agency: { id: "agency", name: "Agency", priceMonthly: 24, priceYearly: 19, priceInr: { monthly: 1999, yearly: 1599 }, creditsPerMonth: 2000 },
};

/** Unknown or old plan IDs fall back to Free, so a bad value can never unlock credits. */
export const planById = (id: string): Plan => PLANS[id as PlanId] ?? PLANS.free;

/** Top-up pack: extra credits that never expire. */
export const CREDIT_PACK = { credits: 500, price: 5, priceInr: 399 };

/**
 * Credits per AI action, sized to what the action costs to run, so no plan can lose money.
 * Quick writing runs on a fast, inexpensive model; deeper work on a stronger one.
 */
export const CREDIT_COST = {
  captions: 1,
  hashtags: 1,
  ideas: 1,
  translate: 1,
  replies: 1,
  carousel: 3,
  reel: 4,
  score: 4,
  brandDna: 4,
  repurpose: 5,
  insights: 5,
  copilot: 7,
  calendar: 9,
  trends: 15,
} as const;
export type CreditAction = keyof typeof CREDIT_COST;
