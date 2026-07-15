use crate::errors::ErrorCode;
use crate::state::{MarketState, PositionState};
use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;

use anchor_spl::token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked};

#[derive(Accounts)]
#[instruction(bet_id: u16)]
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

    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

impl<'info> PlaceBet<'info> {
    pub fn handle_place_bet(
        &mut self,
        bet_id: u16,
        outcome: u8,
        amount: u64,
        user_market_bet_state_bump: u8,
    ) -> Result<()> {
        msg!(
            "place_bet: user={}, market_id={}, amount={}",
            self.user.key(),
            self.market_state.market_id,
            amount
        );
        let user_balance = self.user_prediction_token_account.amount;

        require!(
            !self.market_state.resolved,
            ErrorCode::MarketAlreadyResolved
        );
        require_gt!(amount, 0, ErrorCode::AmountMustBePositive);
        require!(user_balance >= amount, ErrorCode::InsufficientBalance);
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

        self.user_market_bet_state.bet_id = bet_id;

        self.user_market_bet_state.user = *self.user.key;
        self.user_market_bet_state.match_id = self.market_state.market_id;
        self.user_market_bet_state.outcome = outcome;
        self.user_market_bet_state.amount = amount;
        self.user_market_bet_state.is_settled = self.market_state.resolved;
        self.user_market_bet_state.bump = user_market_bet_state_bump;

        //Increase the total liquidity of the market by the amount of prediction tokens deposited
        self.market_state.total_liquidity = self
            .market_state
            .total_liquidity
            .checked_add(amount)
            .ok_or(ErrorCode::MathOverflow)?;

        match outcome {
            0 => {
                self.market_state.home_pool = self
                    .market_state
                    .home_pool
                    .checked_add(amount)
                    .ok_or(ErrorCode::MathOverflow)?;
            }
            1 => {
                self.market_state.away_pool = self
                    .market_state
                    .away_pool
                    .checked_add(amount)
                    .ok_or(ErrorCode::MathOverflow)?;
            }
            2 => {
                self.market_state.draw_pool = self
                    .market_state
                    .draw_pool
                    .checked_add(amount)
                    .ok_or(ErrorCode::MathOverflow)?;
            }
            _ => Err(ErrorCode::InvalidOutcome)?,
        }

        self.market_state.total_bets = self
            .market_state
            .total_bets
            .checked_add(1)
            .ok_or(ErrorCode::MathOverflow)?;

        self.prediction_token_vault.reload()?;

        let selected_pool = match outcome {
            0 => self.market_state.home_pool,
            1 => self.market_state.away_pool,
            2 => self.market_state.draw_pool,
            _ => return Err(ErrorCode::InvalidOutcome.into()),
        };
        let share_bps = amount
            .checked_mul(10_000)
            .ok_or(ErrorCode::MathOverflow)?
            .checked_div(selected_pool)
            .ok_or(ErrorCode::MathUnderflow)?;

        let total_liquidity = self.market_state.total_liquidity;
        let market_vault_balance = self.prediction_token_vault.amount;
        require_eq!(
            total_liquidity,
            market_vault_balance,
            ErrorCode::AccountingMismatch
        );

        msg!("entry pool share bps: {}", share_bps);

        Ok(())
    }
}
