import { CREDIT_COST, type CreditAction, type Plan } from "./plans";

// Estimated AI cost (USD) per action at list prices: quick writing on Haiku 5.5
// ($0.10/$0.50 per MTok), deeper work on Sonnet 5.5 ($2/$10), web searches $0.01 each.
// Re-measure from real usage and update these numbers.
export const EST_COST: Record<CreditAction, number> = {
  captions: 0.004,
  hashtags: 0.003,
  ideas: 0.004,
  translate: 0.003,
  replies: 0.003,
  carousel: 0.008,
  reel: 0.03,
  score: 0.025,
  brandDna: 0.025,
  repurpose: 0.04,
  insights: 0.04,
  copilot: 0.05,
  calendar: 0.07,
  trends: 0.12,
};

/** The most a single credit can cost us, whichever action it's spent on. */
export const worstCostPerCredit = () =>
  Math.max(...(Object.keys(EST_COST) as CreditAction[]).map((a) => EST_COST[a] / CREDIT_COST[a]));

/** What's left of a card charge after Stripe's standard fee: 2.9% + $0.30. */
export const stripeNet = (usd: number) => usd - (usd * 0.029 + 0.3);

/** What's left of a rupee charge in USD after Razorpay's ~2% fee plus 18% GST on the fee. */
export const razorpayNetUsd = (inr: number, inrPerUsd = 88) => (inr * (1 - 0.02 * 1.18)) / inrPerUsd;

/**
 * Monthly profit (USD) from one subscriber who spends every credit on the priciest action.
 * Yearly plans are charged once, so the fixed card fee is spread over 12 months.
 */
export function worstCaseMargin(plan: Plan, interval: "monthly" | "yearly", currency: "USD" | "INR") {
  const aiCost = plan.creditsPerMonth * worstCostPerCredit();
  if (currency === "INR") return razorpayNetUsd(plan.priceInr[interval]) - aiCost;
  const revenue = interval === "monthly" ? stripeNet(plan.priceMonthly) : stripeNet(plan.priceYearly * 12) / 12;
  return revenue - aiCost;
}
