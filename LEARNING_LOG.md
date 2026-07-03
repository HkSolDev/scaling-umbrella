# Learning Log — Prediction Market (Anchor/Rust)

Format per entry: topic, status, what clicked, date.
Status: `learning` (seen once) | `understood` (can explain back) | `recurring` (tripped up 2+ times)

## Entries

- **Project mentor skill installed** — status: learning — 2026-07-02 — Agent uses `prediction-market-mentor` skill: Grill Me for architecture, hints-before-fixes for bugs, checks this log before re-teaching.
- **Rust module path (`pub mod`)** — status: learning — 2026-07-02 — `pub mod instructions` in `src/lib.rs` only looks inside `src/` for `instructions.rs` or `src/instructions/mod.rs`; folder was wrongly placed as sibling of `src/`.
- **Zed Rust autocomplete** — status: learning — 2026-07-02 — `show_completions_on_input` was `false` (disabled); rust-analyzer needs Cargo workspace root (`anchor/`) or `linkedProjects`; `InitSpace` appears inside `#[derive(...)]` after `use anchor_lang::prelude::*`.