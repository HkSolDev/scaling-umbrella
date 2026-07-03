use anchor_lang::prelude::*;

#[derive(InitSpace)]
#[account]
pub struct VaultState {
    pub authority: Pubkey,
    pub total_liquidity: u64, // Total funds deposited by LPs
    pub active_loans: u64,    // Funds currently locked in leveraged bets
    pub lp_token_supply: u64, // Virtual or real LP token supply tracker
    pub bump: u8,
}
