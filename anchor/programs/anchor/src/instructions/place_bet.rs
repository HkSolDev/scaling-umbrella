use crate::errors::ErrorCode;
use crate::state::{MarketState, PositionState};
use anchor_lang::accounts::signer;
use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;

use anchor_spl::token_interface::{
    self, Mint, MintTo, TokenAccount, TokenInterface, TransferChecked,
};

#[derive(Accounts)]
#[instruction(entry_odds_scaled: u64, bet_id: u16)]
pub struct PlaceBet<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    // The account that will store the user's bet information for this specific market. This is a PDA derived from the user, market, and bet id.
    #[account(init,
        payer = user,
        space = 8 + PositionState::INIT_SPACE,
        seeds = [b"place_bet", bet_id.to_be_bytes().as_ref(), user.key().as_ref(), market_state.key().as_ref()],
        bump
    )]
    pub user_market_bet_state: Account<'info, PositionState>,

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
        constraint = market_position_mint
        .mint_authority == market_state.key().into() @ ErrorCode::InvalidMarketPositionMint,
        seeds = [b"market_position_mint", market_state.key().as_ref()],
        bump
    )]
    pub market_position_mint: InterfaceAccount<'info, Mint>,

    #[account(init_if_needed,
        payer = user,
        associated_token::mint = market_position_mint
,
        associated_token::authority = user,
        associated_token::token_program = token_program,
    )]
    pub user_market_position_token_account: InterfaceAccount<'info, TokenAccount>,
    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

impl<'info> PlaceBet<'info> {
    pub fn handle_place_bet(
        &mut self,
        entry_odds_scaled: u64,
        bet_id: u16,
        outcome: u8,
        amount: u64,
        market_position_mint_bump: u8,
    ) -> Result<()> {
        msg!(
            "place_bet: user={}, market_id={}, amount={}",
            self.user.key(),
            self.market_state.market_id,
            amount
        );
        let user_balance = self.user_prediction_token_account.amount;

        require_gt!(user_balance, amount);
        require!(outcome <= 2, ErrorCode::InvalidOutcome);

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

        self.user_market_bet_state.entry_odds_scaled = entry_odds_scaled;
        self.user_market_bet_state.bet_id = bet_id;
        self.user_market_bet_state.user = *self.user.key;
        self.user_market_bet_state.match_id = self.market_state.market_id;
        self.user_market_bet_state.outcome = outcome;
        self.user_market_bet_state.amount = amount;
        // TODO(security): derive odds from MarketState on-chain instead of trusting client input.
        self.user_market_bet_state.entry_odds = entry_odds_scaled;
        self.user_market_bet_state.is_settled = false;
        // TODO: store the user_market_bet_state bump, not the market-position mint bump.
        self.user_market_bet_state.bump = market_position_mint_bump;

        //Increase the total liquidity of the market by the amount of prediction tokens deposited
        self.market_state.total_liquidity = self
            .market_state
            .total_liquidity
            .checked_add(amount)
            .ok_or(ErrorCode::MathOverflow)?;

        // Mint LP tokenschecked(cpi_ctx, amount, decimalhe amount of prediction tokens they deposited
        let market_state = &mut self.market_state;
        let market_key = market_state.key();
        let market_key_bytes = market_key.to_bytes();
        let seeds = &[
            b"market_position_mint",
            market_key_bytes.as_ref(),
            &[market_position_mint_bump],
        ];
        let cpi_accounts_mint = MintTo {
            mint: self.market_position_mint.to_account_info(),
            to: self.user_market_position_token_account.to_account_info(),
            authority: self.market_state.to_account_info(),
        };
        let signer = &[&seeds[..]];
        let cpi_ctx_mint = CpiContext::new_with_signer(token_program, cpi_accounts_mint, signer);
        token_interface::mint_to(cpi_ctx_mint, amount)?;

        // Increase the total LP tokens of the market by the amount of LP tokens mintedq
        self.market_state.total_lp_tokens = self
            .market_state
            .total_lp_tokens
            .checked_add(amount)
            .ok_or(ErrorCode::MathOverflow)?;

        self.market_state.total_bets = self
            .market_state
            .total_bets
            .checked_add(1)
            .ok_or(ErrorCode::MathOverflow)?;

        // TODO: reload prediction_token_vault after the transfer CPI before checking its balance.
        self.market_state.reload()?;

        let total_liquidity = self.market_state.total_liquidity;
        let market_vault_balance = self.prediction_token_vault.amount;
        // TODO: replace assert_eq! with a typed on-chain accounting error.
        assert_eq!(total_liquidity, market_vault_balance);

        Ok(())
    }
}
