# Step-by-Step Prediction Market Implementation Guide

Use this guide inside Zed to write your Anchor/Solana program. Follow these steps to implement the core state structures and instructions.

---

## Step 1: Define the Account Structures
In `lib.rs`, replace the placeholder structures with these complete state definitions.

### 1. Global Vault State
Tracks the total LP pool details.
```rust
#[account]
pub struct VaultState {
    pub authority: Pubkey,
    pub total_liquidity: u64,  // Total funds deposited by LPs
    pub active_loans: u64,     // Total funds currently borrowed for leverage
    pub lp_token_supply: u64,  // Tracker for virtual LP shares
    pub bump: u8,
}
```

### 2. Match Market State
Tracks a single World Cup match details and the total bets on each outcome.
```rust
#[account]
pub struct MarketState {
    pub match_id: String,       // TxLINE match ID
    pub title: String,          // E.g., "Brazil vs Germany"
    pub odds_home: u32,         // Basis points (e.g. 200 = 2.00x)
    pub odds_away: u32,
    pub odds_draw: u32,
    pub pool_home: u64,         // Total bet volume on Home
    pub pool_away: u64,         // Total bet volume on Away
    pub pool_draw: u64,         // Total bet volume on Draw
    pub is_resolved: bool,
    pub winning_outcome: u8,    // 0: Home, 1: Away, 2: Draw
    pub bump: u8,
}
```

### 3. Trader Position State
Tracks a user's open bet and leverage.
```rust
#[account]
pub struct PositionState {
    pub user: Pubkey,
    pub match_id: String,
    pub outcome: u8,            // Selection: 0, 1, or 2
    pub margin_amount: u64,     // Trader's own funds
    pub borrowed_amount: u64,   // Loan from LP vault (margin * (leverage - 1))
    pub entry_odds: u32,        // Odds locked at time of bet
    pub is_settled: bool,
    pub bump: u8,
}
```

---

## Step 2: Implement Instruction Context Validation

Define the PDA validation constraints in your context structs:

### 1. Initialize Vault Context
```rust
#[derive(Accounts)]
pub struct InitializeVault<'info> {
    #[account(
        init,
        payer = signer,
        space = 8 + 32 + 8 + 8 + 8 + 1,
        seeds = [b"vault"],
        bump
    )]
    pub vault_state: Account<'info, VaultState>,
    
    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}
```

### 2. Create Market Context
```rust
#[derive(Accounts)]
#[instruction(match_id: String)]
pub struct CreateMarket<'info> {
    #[account(
        init,
        payer = signer,
        space = 8 + 4 + match_id.len() + 4 + 64 + 4 + 4 + 4 + 8 + 8 + 8 + 1 + 1 + 1,
        seeds = [b"market", match_id.as_bytes()],
        bump
    )]
    pub market_state: Account<'info, MarketState>,

    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}
```

---

## Step 3: Write Instruction Logic Checklists

### 1. `initialize_vault` Logic:
- Set `vault_state.authority` to `signer.key()`.
- Set `total_liquidity`, `active_loans`, and `lp_token_supply` to `0`.
- Store the state's `bump`.

### 2. `create_market` Logic:
- Set `market_state.match_id` and `market_state.title`.
- Set starting odds (`odds_home`, `odds_away`, `odds_draw`).
- Initialize outcome pools (`pool_home`, `pool_away`, `pool_draw`) to `0`.
- Set `is_resolved` to `false`.

### 3. `place_leveraged_bet` Logic:
- Calculate required loan: `margin_amount * (leverage - 1)`.
- Transfer `margin_amount` from user's wallet to the global LP Vault (e.g. system transfer).
- Increment `vault_state.active_loans` by the loan amount.
- Increment the matching outcome pool (e.g. `market_state.pool_home`) by `margin_amount * leverage`.
- Initialize `PositionState` account to track this bet.
