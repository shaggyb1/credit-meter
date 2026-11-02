import { describe, expect, it } from "vitest";
import { addTopUp, balance, InsufficientCredits, spend, type Account } from "../src/ledger";

const solo = (over: Partial<Account> = {}): Account => ({ plan: "solo", usageMonth: "2026-11", used: 0, topUp: 0, ...over });

describe("balance", () => {
  it("adds the monthly allowance left to top-up credits", () => {
    expect(balance(solo({ used: 100, topUp: 50 }), "2026-11")).toMatchObject({ monthlyLeft: 200, available: 250 });
  });

  it("resets the monthly allowance in a new month but keeps top-ups", () => {
    expect(balance(solo({ used: 300, topUp: 50 }), "2026-12")).toMatchObject({ used: 0, monthlyLeft: 300, available: 350 });
  });

  it("never shows a negative allowance", () => {
    expect(balance(solo({ used: 320 }), "2026-11").monthlyLeft).toBe(0);
  });

  it("treats an unknown plan as Free", () => {
    expect(balance(solo({ plan: "enterprise" as Account["plan"] }), "2026-11").monthly).toBe(40);
  });
});

describe("spend", () => {
  it("uses the monthly allowance before top-up credits", () => {
    const after = spend(solo({ used: 295, topUp: 20 }), 9, "2026-11");
    expect(after).toMatchObject({ used: 304, topUp: 16 });
    expect(balance(after, "2026-11").available).toBe(16);
  });

  it("starts a fresh month's count on the first spend of the month", () => {
    expect(spend(solo({ usageMonth: "2026-10", used: 300 }), 4, "2026-11")).toMatchObject({ usageMonth: "2026-11", used: 4 });
  });

  it("refuses to spend more than is available", () => {
    expect(() => spend(solo({ used: 299 }), 4, "2026-11")).toThrow(InsufficientCredits);
  });

  it("rejects fractional and negative amounts", () => {
    expect(() => spend(solo(), 1.5)).toThrow(RangeError);
    expect(() => spend(solo(), -1)).toThrow(RangeError);
  });
});

describe("addTopUp", () => {
  it("adds 500 credits per pack", () => {
    expect(addTopUp(solo(), 2).topUp).toBe(1000);
  });

  it("rejects zero or partial packs", () => {
    expect(() => addTopUp(solo(), 0)).toThrow(RangeError);
    expect(() => addTopUp(solo(), 0.5)).toThrow(RangeError);
  });
});
