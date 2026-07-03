use crate::state::VaultState;
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{self, Mint, TokenAccount, TokenInterface, TransferChecked},
};

#[derive(Accounts)]
pub struct DepositLP<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(mut)]
    pub vault_state: Account<'info, VaultState>,
    #[account(mut)]
    pub vault_token_account: InterfaceAccount<'info, TokenAccount>,
    #[account(mut)]
    pub depositer_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(mut,
   seeds = [b"colletral_mint"], bump,
   // has_one = mint = vault_state
    )]
    pub mint: InterfaceAccount<'info, Mint>,

    #[account(mut,
    seeds = [b"lp_mint"], bump,
    // constraint = mint_lp.authority() == vault_state
    )]
    pub mint_lp: InterfaceAccount<'info, Mint>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

impl<'info> DepositLP<'info> {
    fn handle_deposit_lp(&mut self, amount: u64) -> Result<()> {
        let decimals = self.mint.decimals();
        let vault_state = &mut self.vault_state;
        let depositer_token_account = &mut self.depositer_token_account;
        let vault_token_account = &mut self.vault_token_account;
        let token_program = &self.token_program;

        let cpi_accounts = TransferChecked {
            mint: self.mint.to_account_info(),
            from: depositer_token_account.to_account_info(),
            to: vault_token_account.to_account_info(),
            authority: self.signer.to_account_info(),
        };

        let cpi_program = token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token_interface::token::transfer_checked(cpi_ctx, amount, decimals)?;

        vault_state.total_liquidity = vault_state
            .total_liquidity
            .checked_add(amount)
            .ok_or(ErrorCode::Overflow)?;

        let mint_lp_account = MintTo {
            mint: self.mint_lp.to_account_info(),
            to: depositer_token_account.to_account_info(),
            authority: vault_state.to_account_info(),
        };

        let cpi_program_id = token_program.to_account_info();

        let cpi_ctx = CpiContext::new(cpi_program_id, mint_lp_account);

        token_interface::mint_to(cpi_ctx, amount)?;

        vault_state.lp_token_supply = vault_state
            .lp_token_supply
            .checked_add(amount)
            .ok_or(ErrorCode::Overflow)?;

        Ok(())
    }
}
