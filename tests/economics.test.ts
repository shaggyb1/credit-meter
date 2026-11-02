import { describe, expect, it } from "vitest";
import { razorpayNetUsd, stripeNet, worstCaseMargin, worstCostPerCredit } from "../src/economics";
import { CREDIT_PACK, PLANS } from "../src/plans";

const paid = Object.values(PLANS).filter((p) => p.priceMonthly > 0);

describe("pricing economics", () => {
  it("never costs more than a credit is worth on any action", () => {
    expect(worstCostPerCredit()).toBeLessThanOrEqual(0.0085);
  });

  for (const plan of paid) {
    it(`${plan.name} stays profitable even if every credit is spent on the priciest action`, () => {
      expect(worstCaseMargin(plan, "monthly", "USD")).toBeGreaterThan(0);
      expect(worstCaseMargin(plan, "yearly", "USD")).toBeGreaterThan(0);
    });

    it(`${plan.name} in rupees stays profitable at full credit use`, () => {
      expect(worstCaseMargin(plan, "monthly", "INR")).toBeGreaterThan(0);
      expect(worstCaseMargin(plan, "yearly", "INR")).toBeGreaterThan(0);
    });
  }

  it("top-up packs are profitable in both currencies", () => {
    const cost = CREDIT_PACK.credits * worstCostPerCredit();
    expect(cost).toBeLessThan(stripeNet(CREDIT_PACK.price));
    expect(cost).toBeLessThan(razorpayNetUsd(CREDIT_PACK.priceInr));
  });

  it("free plan costs very little per user", () => {
    expect(PLANS.free.creditsPerMonth * worstCostPerCredit()).toBeLessThan(0.5);
  });

  it("yearly is never more expensive than monthly", () => {
    for (const p of Object.values(PLANS)) {
      expect(p.priceYearly).toBeLessThanOrEqual(p.priceMonthly);
      expect(p.priceInr.yearly).toBeLessThanOrEqual(p.priceInr.monthly);
    }
  });
});
