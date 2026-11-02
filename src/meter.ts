import { balance, InsufficientCredits, monthOf, spend, type Account } from "./ledger";
import { CREDIT_COST, type CreditAction } from "./plans";
import { modelFor } from "./routing";

/** Where accounts live. Upsoar uses Postgres; the tests use a Map. */
export interface AccountStore {
  get(id: string): Promise<Account>;
  /**
   * Applies `change` to the latest copy of the account as one atomic step, so two
   * requests can't both read the same balance and overwrite each other's charge.
   * In Postgres that's a single UPDATE, or SELECT ... FOR UPDATE inside a transaction.
   */
  update(id: string, change: (account: Account) => Account): Promise<Account>;
}

/**
 * Runs an AI action if the account has enough credits for it, and only charges the
 * credits once it succeeds, so a failed or refused AI call costs the user nothing.
 * `run` receives the model the action is routed to.
 */
export async function metered<T>(
  store: AccountStore,
  accountId: string,
  action: CreditAction,
  run: (model: string) => Promise<T>,
  now = new Date(),
): Promise<T> {
  const cost = CREDIT_COST[action];
  const month = monthOf(now);
  const { available } = balance(await store.get(accountId), month);
  if (available < cost) throw new InsufficientCredits(cost, available);

  const result = await run(modelFor(action));

  // Another request may have spent credits while this one ran. The work is already
  // done, so charge what's left rather than fail or take the balance below zero.
  await store.update(accountId, (latest) => spend(latest, Math.min(cost, balance(latest, month).available), month));
  return result;
}
