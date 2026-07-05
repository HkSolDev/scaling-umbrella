use crate::state::VaultState;
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{self, Mint, TokenAccount, TokenInterface},
};

#[derive(Accounts)]
pub struct InitializeVault<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(init,
payer = signer,
space = 8 + VaultState::INIT_SPACE,
seeds= [b"global_state", signer.key().as_ref()], bump
    )]
    pub vault_state: Account<'info, VaultState>,

    //TODO Do i need to store the mint address in the vault state?
    // Try to break it passing other mint
    #[account(init,
        payer = signer,
              mint::decimals = 6,
              mint::authority = vault_state,
            seeds = [b"collateral_mint"], bump,
    )]
    pub mint: InterfaceAccount<'info, Mint>,

    #[account(init,
    payer = signer,
associated_token::mint = mint,
associated_token::authority = vault_state,
 associated_token::token_program = token_program,
    )]
    pub vault_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
    init,
    payer = signer,
    mint::decimals = 6,
    mint::authority = vault_state,
    seeds = [b"lp_mint"], bump,)]
    pub mint_lp: InterfaceAccount<'info, Mint>,

    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

impl<'info> InitializeVault<'info> {
    pub fn handle_initialize_vault(&mut self, bump: u8) -> Result<()> {
        let vault_state = &mut self.vault_state;
        vault_state.authority = *self.signer.key;
        vault_state.total_liquidity = 0;
        vault_state.active_loans = 0;
        vault_state.lp_token_supply = 0;
        vault_state.bump = bump;
        Ok(())
    }
}
