use crate::errors::ErrorCode;
use crate::state::MarketState;
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{self, Mint, TokenAccount, TokenInterface},
};

pub const USDC_DEVNET: Pubkey = pubkey!("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

#[derive(Accounts)]
#[instruction(question: String, market_id: u16)]
pub struct CreateMarket<'info> {
    // Only the admin can create markets
    #[account(mut)]
    pub admin: Signer<'info>,
    // Initialize the market state account for the market store info for the market
    #[account(init,
        payer = admin,
        space = 8 + MarketState::INIT_SPACE,
        seeds = [b"create_market", admin.key().as_ref(), question.as_bytes(), &market_id.to_le_bytes()],
        bump)]
    pub market_state: Account<'info, MarketState>,
    // The mint for the Prediction use for the payment token
    #[account(
        constraint = prediction_mint.key() == USDC_DEVNET @ ErrorCode::InvalidPredictionMint,
    )]
    pub prediction_mint: InterfaceAccount<'info, Mint>,
    // The associated token account for the prediction mint
    #[account(init,
        payer = admin,
        associated_token::mint = prediction_mint,
        associated_token::authority = market_state,
        associated_token::token_program = token_program,
    )]
    pub prediction_token_vault: InterfaceAccount<'info, TokenAccount>,
    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

impl<'info> CreateMarket<'info> {
    pub fn handle_createMarket(&mut self, question: String, marketId: u16, bump: u8) -> Result<()> {
        self.market_state.admin = *self.admin.key;
        self.market_state.bump = bump;
        self.market_state.question = question;
        self.market_state.prediction_mint = self.prediction_mint.key();
        self.market_state.prediction_vault = self.prediction_token_vault.key();
        self.market_state.market_id = marketId;
        self.market_state.total_bets = 0;
        self.market_state.resolved = false;
        self.market_state.winner = 0;
        Ok(())
    }
}
