use anchor_lang::prelude::*;

// One vault for the whole program, which will be used to manage LP deposits and leveraged bets. The vault will hold the total liquidity, active loans, and track LP token supply.
#[derive(InitSpace)]
#[account]
pub struct VaultState {
    pub authority: Pubkey,
    pub total_liquidity: u64, // Total funds deposited by LPs
    pub active_loans: u64,    // Funds currently locked in leveraged bets
    pub lp_token_supply: u64, // Virtual or real LP token supply tracker
    pub bump: u8,
}

#[derive(InitSpace)]
#[account]
pub struct MarketState {
    pub admin: Pubkey,
    #[max_len(256)]
    pub question: String,
    pub market_id: u16,
    pub prediction_mint: Pubkey,
    pub prediction_vault: Pubkey,
    pub total_bets: u64,
    pub resolved: bool,
    pub winner: u8,
    pub bump: u8,
}
