# TxLINE Prediction Market — Agent Instructions

## Primary mentor skill

When working on this repo (Anchor program, tests, or `web/` frontend), use the **prediction-market-mentor** skill:

`~/.agents/skills/prediction-market-mentor/SKILL.md`

Trigger it on doubt, errors, design questions, code review, or explicit teaching requests.

## Learning memory

Before answering a repeated topic, read:

`LEARNING_LOG.md` (project root)

Update it after resolving doubts — one bullet per concept, no duplicates.

## Repo layout

- `anchor/` — Anchor program (`programs/anchor/src/lib.rs`), tests (`tests/anchor.ts`)
- `web/` — Next.js frontend, wallet, TxLINE hooks

## Security-first defaults

Checked arithmetic, PDA seeds, Anchor account constraints, signer checks on fund movement, TxLINE oracle CPI for settlement — see skill references.