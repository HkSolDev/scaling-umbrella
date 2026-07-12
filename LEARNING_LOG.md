# Learning Log — Prediction Market (Anchor/Rust)

Format per entry: topic, status, what clicked, date.
Status: `learning` (seen once) | `understood` (can explain back) | `recurring` (tripped up 2+ times)

## Entries

- **Project mentor skill installed** — status: learning — 2026-07-02 — Agent uses `prediction-market-mentor` skill: Grill Me for architecture, hints-before-fixes for bugs, checks this log before re-teaching.
- **Rust module path (`pub mod`)** — status: learning — 2026-07-02 — `pub mod instructions` in `src/lib.rs` only looks inside `src/` for `instructions.rs` or `src/instructions/mod.rs`; folder was wrongly placed as sibling of `src/`.
- **Zed Rust autocomplete** — status: learning — 2026-07-02 — `show_completions_on_input` was `false` (disabled); rust-analyzer needs Cargo workspace root (`anchor/`) or `linkedProjects`; `InitSpace` appears inside `#[derive(...)]` after `use anchor_lang::prelude::*`.
- **PDA ATA derivation (client)** — status: understood — 2026-07-06 — `getAssociatedTokenAddressSync(mint, pdaOwner, true)` — third arg `allowOwnerOffCurve` required when owner is a PDA; on-chain Anchor `associated_token::authority` allows it automatically.
- **Anchor fetch vs SPL helpers** — status: understood — 2026-07-06 — `program.account.vaultState.fetch()` only for program-owned Anchor accounts; mints/ATAs need `getMint` / `getAccount` from `@solana/spl-token`.
- **Account owner vs token authority** — status: understood — 2026-07-06 — `getAccountInfo().owner` = owning program (Token Program); parsed token `.owner` = who controls the tokens (vault PDA).
- **Surfpool for Anchor tests** — status: learning — 2026-07-06 — Keep surfpool running on `:8899`; run `anchor test --skip-local-validator` so tests hit surfnet instead of slow `solana-test-validator`.