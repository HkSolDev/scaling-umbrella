use anchor_lang::prelude::*;

// pub mod const;
pub mod errors;
pub use errors::*;
pub mod state;
pub use state::*;
pub mod instructions;
pub use instructions::*;
declare_id!("5NMv2idtCXsT6GUuXfDnKpQ2y2f26Mt4W7mvvcXeK1GP");

#[program]
pub mod anchor {
    use super::*;

    // --- STEP 1: LP Vault Instructions ---

    /// Initializes the global Liquidity Pool Vault.
    pub fn initialize_vault(ctx: Context<InitializeVault>) -> Result<()> {
        // TODO: Set up vault state, authority, and initialize fee values
        msg!("Vault initialized");
        let bump = ctx.bumps.vault_state;
        ctx.accounts.handle_initialize_vault(bump)?;
        Ok(())
    }

    /// LPs deposit collateral (e.g. SOL or USDC) into the vault.
    pub fn deposit_lp(ctx: Context<DepositLP>, amount: u64) -> Result<()> {
        // TODO: Transfer funds from depositor to the vault account
        // TODO: Mint LP share tokens or update internal ledger

        msg!("Deposited LP: {}", amount);
        ctx.accounts.handle_deposit_lp(amount)?;
        Ok(())
    }

    /// LPs withdraw collateral from the vault based on their share of the pool.
    pub fn withdraw_lp(ctx: Context<WithdrawLp>, shares: u64) -> Result<()> {
        // TODO: Calculate user's share of vault value
        // TODO: Transfer calculated funds from vault back to depositor
        // TODO: Burn LP shares / update internal ledger
        msg!("Withdrawn LP shares: {}", shares);
        Ok(())
    }

    // --- STEP 2: Match Market Instructions ---

    /// Creates a new sports prediction market for a specific match from TxLINE.
    pub fn create_market(
        ctx: Context<CreateMarket>,
        question: String,
        market_id: u16,
    ) -> Result<()> {
        msg!("Market created for match: {}", market_id);
        let bump = ctx.bumps.market_state;
        ctx.accounts
            .handle_createMarket(question, market_id, bump)?;
        Ok(())
    }

    // --- STEP 3: Betting Instructions ---

    /// Places a prediction bet on a match outcome.
    /// User pays collateral (e.g. USDC) directly to the prediction market escrow.

    pub fn place_bet(ctx: Context<PlaceBet>, bet_id: u16, outcome: u8, amount: u64) -> Result<()> {
        let user_market_bet_state_bump = ctx.bumps.user_market_bet_state;
        ctx.accounts
            .handle_place_bet(bet_id, outcome, amount, user_market_bet_state_bump)?;
        Ok(())
    }

    /// Trustlessly settles a completed match prediction.
    /// In a production environment, this CPIs into the TxLINE validate_stat program.
    pub fn settle_market(
        ctx: Context<SettleMarket>,
        winning_outcome: u8,
        // TxLINE Merkle proof inputs would be passed here (or simulated)
    ) -> Result<()> {
        // TODO: Execute validation CPI (simulate or CPI into TxLINE's validate_stat program)
        // TODO: Distribute payouts to winning traders
        // TODO: Collect lost stakes and deposit a portion back to the LP Vault
        msg!("Market settled. Winner outcome: {}", winning_outcome);
        Ok(())
    }
}

// --- ACCOUNT STRUCTURES & CONTEXTS ---

#[account]
pub struct VaultState {
    pub authority: Pubkey,
    pub total_liquidity: u64, // Total funds deposited by LPs
    pub active_loans: u64,    // Unused in non-leverage MVP (kept for compatibility or remove)
    pub lp_token_supply: u64, // Virtual or real LP token supply tracker
    pub bump: u8,
}

// --- CONTEXT DEFINITIONS (TODO: Fill in Anchor macros/constraints) ---

#[derive(Accounts)]
pub struct WithdrawLp<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    // TODO: Define accounts to process withdrawal and transfer back to LP
}

#[derive(Accounts)]
pub struct SettleMarket<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    // TODO: Define accounts for VaultState, MarketState, and trader positions
}
