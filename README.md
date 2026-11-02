# credit-meter

How [Upsoar](https://upsoar.in) charges for AI without losing money on any plan.

Upsoar is my AI social media manager. Its code is private, so I've pulled out this one self-contained part to show how I write backend logic. It's the same approach as in production, simplified so it runs with no database, API key or framework.

![Tests](https://github.com/shaggyb1/credit-meter/actions/workflows/test.yml/badge.svg)

## The problem

Every AI call costs money, and the priciest costs about 40 times the cheapest. A flat monthly plan could lose money on one heavy user, and the cheapest plan is ₹299 a month.

## How it works

1. **Credits are priced by cost.** Each action costs credits according to what it costs to run: a caption is 1 credit, and live trend research is 15. See `CREDIT_COST` in [`src/plans.ts`](src/plans.ts).
2. **Each action goes to the right model.** Quick writing runs on a fast, cheap model and deeper work on a stronger one. You can override any tier with an environment variable. See [`src/routing.ts`](src/routing.ts).
3. **Prompt caching.** The brand profile is the same for every request in a session, so it's marked as the cache breakpoint and repeat calls read it from cache.
4. **A credit ledger.** Each plan includes credits every month, and those reset monthly. Top-up packs never expire. Spending uses the monthly credits first, then top-ups. See [`src/ledger.ts`](src/ledger.ts).
5. **Charge only after success.** `metered()` checks the balance before calling the AI, and charges only if the call works. A failed or refused call costs the user nothing. The charge is one atomic update, so overlapping requests can't overwrite each other's charges or push a balance below zero. See [`src/meter.ts`](src/meter.ts).
6. **Profitability checks in the tests.** The tests assume a subscriber who spends every credit on the most expensive action. They fail if any plan or top-up pack would lose money after Stripe or Razorpay fees, in dollars or rupees. See [`tests/economics.test.ts`](tests/economics.test.ts).

```ts
const posts = await metered(store, workspaceId, "calendar", (model) =>
  client.messages.create({ model, system: systemBlocks(SYSTEM, brandContext), ... }),
);
```

## Run it

```bash
npm install
npm test
npm run typecheck
```

## Differences from production

- **Storage:** Upsoar stores accounts in PostgreSQL with Drizzle ORM, and the charge is one SQL `UPDATE`. Here the store is an interface, and the tests use a `Map`.
- **Extra checks:** Upsoar also blocks jailbreak attempts and limits AI use before an email is confirmed. Neither is included here.
- **Cost estimates:** the estimates in `src/economics.ts` are worked out from list prices. They need re-measuring against real usage.

## Licence

Copyright (c) 2026 Bhushan Kumbhare. All rights reserved. You can read the code, but you can't reuse it without permission.
