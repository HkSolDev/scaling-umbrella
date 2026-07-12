# TxLINE Prediction Market — Agent Instructions

Local agent notes — not committed to GitHub (see `.gitignore`).

## Skills for this repo

Use **both** skills below when working on the Anchor program, tests, or `web/` frontend.

### 1. Prediction market mentor (architecture + Grill Me)

`~/.agents/skills/prediction-market-mentor/SKILL.md`

**Use for:**
- Learning Rust / Anchor / Solana mental models
- Architecture and design (`create_market`, leverage, settlement, vault economics)
- **Grill Me mode** — one question at a time before new instructions; TDD first
- Doubts, errors, code review in *this* project's context

**Grill Me triggers:** "how should I design…", new instruction from scratch, market/odds/resolution questions.

### 2. Safe Solana Builder (security-first code)

`~/.agents/skills/safe-solana-builder/SKILL.md`

**Use for:**
- Writing or scaffolding Anchor instructions (`create_market`, `place_leveraged_bet`, `settle_market`)
- Security constraints, CPIs, PDA bumps, account validation, checked math
- Pre-audit hardening — read `references/shared-base.md` + `references/anchor.md` before coding

**Triggers:** new program code, "write a secure instruction", security review of on-chain changes.

### How they work together

| Phase | Lead skill |
|-------|------------|
| Design new feature | **prediction-market-mentor** (Grill Me) |
| Implement instruction | **safe-solana-builder** (security rules) + mentor (project-specific) |
| Debug / teach | **prediction-market-mentor** |
| Review before merge | **safe-solana-builder** checklist + mentor security refs |

## Learning memory

Before re-teaching a topic, read:

`LEARNING_LOG.md` (project root)

Update after resolving doubts — one bullet per concept, no duplicates.

## Repo layout

- `anchor/` — Anchor program (`programs/anchor/src/`), tests (`tests/initialize.ts`), helpers (`tests/helpers/`)
- `anchor/README.md` — Surfpool local test workflow
- `web/` — Next.js frontend, wallet, TxLINE hooks

## Security-first defaults

Checked arithmetic, PDA seeds, Anchor account constraints, signer checks on fund movement, TxLINE oracle CPI for settlement — enforced by **safe-solana-builder** references and **prediction-market-mentor** `references/security-checklist.md`.

## Current build priority

**Prediction market first** (LP vault init done; deposit deprioritized):

1. `create_market`
2. `place_leveraged_bet`
3. `settle_market`
4. LP deposit/withdraw (fund vault when bets need liquidity)