# Prediction Market on Solana

A Solana prediction-market MVP built with Anchor, TypeScript, and Next.js.

## MVP scope

The current version uses a pool-based market model:

- An admin creates a market.
- Users place multiple bets on Home, Away, or Draw.
- Each bet is stored in a unique `PositionState` PDA.
- The market tracks a total pool and separate pools for each outcome.
- Live percentages are calculated from the current outcome pools.
- Settlement is currently admin-controlled.

The current MVP does not include oracle settlement, leveraged betting, market LP tokens, or withdrawals.

## Pool and payout model

When a user places a bet, the amount is transferred into the market vault and added to the selected outcome pool.

```text
total_pool = home_pool + away_pool + draw_pool
```

After settlement, winning positions share the total pool proportionally:

```text
payout = user_bet / winning_pool * total_pool
```

The displayed percentages and payout estimates can change as new bets enter until the market is settled.

## Project structure

```text
anchor/  Anchor program, instructions, state, and tests
web/     Next.js frontend
```

## Local development

The Anchor program uses Surfpool for local development. See [`anchor/README.md`](anchor/README.md) for setup, Surfpool commands, testing, and deployment workflows.

Start the frontend:

```bash
cd web
npm run dev
```

## Current development status

Implemented or in progress:

- Vault initialization
- Market creation
- Pool-based bet placement
- Position PDA tracking
- Admin-only market settlement
- Positive and negative integration tests

Planned next:

- Payout claiming
- Market close lifecycle
- Settlement and payout accounting tests
- Frontend market and pool displays
