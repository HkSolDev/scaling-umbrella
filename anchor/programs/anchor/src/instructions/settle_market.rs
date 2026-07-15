use crate::errors::ErrorCode;
use crate::state::MarketState;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct SettleMarket<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        mut,
        has_one = admin @ ErrorCode::AdminMismatch,
        constraint = market_state.resolved == false @ ErrorCode::MarketAlreadySettled,
    )]
    pub market_state: Account<'info, MarketState>,
}

impl<'info> SettleMarket<'info> {
    pub fn handle_settle_market(&mut self, winner: u8) -> Result<()> {
        require!(winner <= 2, ErrorCode::InvalidOutcome);
        self.market_state.resolved = true;

        self.market_state.winner = winner;
        Ok(())
    }
}
