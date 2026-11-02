import { describe, expect, it, vi } from "vitest";
import { InsufficientCredits, type Account } from "../src/ledger";
import { metered, type AccountStore } from "../src/meter";

const NOW = new Date("2026-11-02T10:00:00Z");

function memoryStore(account: Account) {
  const rows = new Map([["ws1", account]]);
  const store: AccountStore = {
    get: async (id) => rows.get(id)!,
    // A Map update is synchronous, so it's atomic like a single SQL UPDATE.
    update: async (id, change) => {
      const next = change(rows.get(id)!);
      rows.set(id, next);
      return next;
    },
  };
  return { store, rows };
}

const fresh = (over: Partial<Account> = {}): Account => ({ plan: "solo", usageMonth: "2026-11", used: 0, topUp: 0, ...over });

describe("metered", () => {
  it("charges the action's credits after it succeeds", async () => {
    const { store, rows } = memoryStore(fresh());
    await expect(metered(store, "ws1", "calendar", async () => "ok", NOW)).resolves.toBe("ok");
    expect(rows.get("ws1")!.used).toBe(9);
  });

  it("charges nothing when the AI call fails", async () => {
    const { store, rows } = memoryStore(fresh());
    await expect(metered(store, "ws1", "trends", async () => Promise.reject(new Error("rate limited")), NOW)).rejects.toThrow("rate limited");
    expect(rows.get("ws1")!.used).toBe(0);
  });

  it("doesn't call the AI at all without enough credits", async () => {
    const { store } = memoryStore(fresh({ plan: "free", used: 35 }));
    const run = vi.fn(async () => "never");
    await expect(metered(store, "ws1", "calendar", run, NOW)).rejects.toThrow(InsufficientCredits);
    expect(run).not.toHaveBeenCalled();
  });

  it("passes the routed model to the action", async () => {
    const { store } = memoryStore(fresh());
    const models: string[] = [];
    await metered(store, "ws1", "captions", async (m) => models.push(m), NOW);
    await metered(store, "ws1", "calendar", async (m) => models.push(m), NOW);
    expect(models).toEqual(["claude-haiku-5-5", "claude-sonnet-5-5"]);
  });

  it("never takes a balance below zero when requests overlap", async () => {
    const { store, rows } = memoryStore(fresh({ plan: "free", used: 30 }));
    // Both requests pass the balance check before either is charged.
    await Promise.all([metered(store, "ws1", "calendar", async () => "a", NOW), metered(store, "ws1", "calendar", async () => "b", NOW)]);
    expect(rows.get("ws1")!.used).toBe(40);
  });
});
