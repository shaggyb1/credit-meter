import { CREDIT_PACK, planById, type PlanId } from "./plans";

/** What's stored per account. `used` resets when `usageMonth` changes; `topUp` never expires. */
export interface Account {
  plan: PlanId;
  usageMonth: string;
  used: number;
  topUp: number;
}

export class InsufficientCredits extends Error {
  constructor(
    public needed: number,
    public available: number,
  ) {
    super(`This needs ${needed} AI credit${needed === 1 ? "" : "s"} and you have ${available} left this month.`);
  }
}

/** e.g. "2026-11". Credits reset on the first of each month (UTC). */
export const monthOf = (date = new Date()) => date.toISOString().slice(0, 7);

/** Credits: the plan's monthly allowance (resets each month) plus purchased top-ups. */
export function balance(account: Account, month = monthOf()) {
  const plan = planById(account.plan);
  const used = account.usageMonth === month ? account.used : 0;
  const monthlyLeft = Math.max(0, plan.creditsPerMonth - used);
  return { used, monthly: plan.creditsPerMonth, monthlyLeft, topUp: account.topUp, available: monthlyLeft + account.topUp };
}

/** Spends credits: the monthly allowance first, then top-up credits. */
export function spend(account: Account, amount: number, month = monthOf()): Account {
  if (!Number.isInteger(amount) || amount < 0) throw new RangeError(`Credit amount must be a whole number, got ${amount}`);
  const b = balance(account, month);
  if (amount > b.available) throw new InsufficientCredits(amount, b.available);
  const fromMonthly = Math.min(amount, b.monthlyLeft);
  return { ...account, usageMonth: month, used: b.used + amount, topUp: account.topUp - (amount - fromMonthly) };
}

export function addTopUp(account: Account, packs: number): Account {
  if (!Number.isInteger(packs) || packs < 1) throw new RangeError(`Packs must be a positive whole number, got ${packs}`);
  return { ...account, topUp: account.topUp + packs * CREDIT_PACK.credits };
}
