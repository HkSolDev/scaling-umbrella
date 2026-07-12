use crate::errors::ErrorCode;
use crate::state::MarketState;
use anchor_lang::accounts::signer;
use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;

use anchor_spl::token_interface::{
    self, Mint, MintTo, TokenAccount, TokenInterface, TransferChecked,
};

#[derive(Accounts)]
pub struct PlaceBet<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mut,
        constraint =  market_state.prediction_mint == prediction_mint.key() &&  market_state.prediction_vault == prediction_token_vault.key() @ ErrorCode::InvalidPredictionMint
    )]
    pub market_state: Account<'info, MarketState>,

    // The mint for the Prediction use for the payment token
    pub prediction_mint: InterfaceAccount<'info, Mint>,

    //User token account for the prediction for placing the bet
    #[account(mut,
        constraint = user_prediction_token_account.mint == prediction_mint.key() && user_prediction_token_account.owner == user.key() @ ErrorCode::InvalidPredictionMint,)]
    pub user_prediction_token_account: InterfaceAccount<'info, TokenAccount>,

    //Where the specific market's prediction tokens are stored. This is the vault for the market.
    #[account(mut,
        constraint = prediction_token_vault.mint == prediction_mint.key() && prediction_token_vault.owner == market_state.key() @ ErrorCode::InvalidPredictionMint,)]
    pub prediction_token_vault: InterfaceAccount<'info, TokenAccount>,

    /// PREDICTION TOKEN LP MINT
    // use this mint for the LP token that will be used to represent shares in the market of the user
    #[account(mut,
        constraint = prediction_lp_mint.mint_authority == market_state.key().into() @ ErrorCode::InvalidPredictionLPMint,
        seeds = [b"prediction_lp_mint", market_state.key().as_ref()],
        bump
    )]
    pub prediction_lp_mint: InterfaceAccount<'info, Mint>,

    #[account(init_if_needed,
        payer = user,
        associated_token::mint = prediction_lp_mint,
        associated_token::authority = user,
        associated_token::token_program = token_program,
    )]
    pub user_prediction_lp_token_account: InterfaceAccount<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

impl<'info> PlaceBet<'info> {
    pub fn handle_place_bet(&mut self, amount: u64) -> Result<()> {
        msg!(
            "place_bet: user={}, market_id={}, amount={}",
            self.user.key(),
            self.market_state.market_id,
            amount
        );
        let user_balance = self.user_prediction_token_account.amount;

        require_gt!(user_balance, amount);

        let decimal = self.prediction_mint.decimals;
        let token_program = self.token_program.key();

        // Transfer the prediction tokens from the user to the market vault
        let cpi_accounts = TransferChecked {
            mint: self.prediction_mint.to_account_info(),
            from: self.user_prediction_token_account.to_account_info(),
            to: self.prediction_token_vault.to_account_info(),
            authority: self.user.to_account_info(),
        };

        let cpi_program = token_program.clone();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token_interface::transfer_checked(cpi_ctx, amount, decimal)?;

        // Mint LP tokenschecked(cpi_ctx, amount, decimalhe amount of prediction tokens they deposited
        let market_state = &mut self.market_state;
        let market_key = market_state.key();
        let market_key_bytes = market_key.to_bytes();
        let seeds = &[
            b"prediction_lp_mint",
            market_key_bytes.as_ref(),
            &[self.market_state.bump],
        ];
        let cpi_accounts_mint = MintTo {
            mint: self.prediction_lp_mint.to_account_info(),
            to: self.user_prediction_lp_token_account.to_account_info(),
            authority: self.market_state.to_account_info(),
        };
        let signer = &[&seeds[..]];
        let cpi_ctx_mint = CpiContext::new_with_signer(token_program, cpi_accounts_mint, signer);
        token_interface::mint_to(cpi_ctx_mint, amount)?;

        Ok(())
    }
}
