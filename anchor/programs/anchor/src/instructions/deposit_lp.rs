use crate::errors::ErrorCode;
use crate::state::VaultState;
use anchor_lang::{prelude::*, solana_program::program_option::COption};
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{self, Mint, MintTo, TokenAccount, TokenInterface, TransferChecked},
};

#[derive(Accounts)]
pub struct DepositLP<'info> {
    #[account(mut)]
    pub depositer: Signer<'info>,
    #[account(mut,
    seeds = [b"vault_state"],
    bump = vault_state.bump,
    )]
    pub vault_state: Account<'info, VaultState>,

    //The vault Colletral token account
    #[account(mut,
        //Vault mint should be match with the mint of the vault token account
        constraint = vault_token_account.mint == colletral_mint.key(),
        //vault Token Acc has the owner which is vault state
        constraint = vault_token_account.owner == vault_state.key()
    )]
    pub vault_token_account: InterfaceAccount<'info, TokenAccount>,

    //The depositer Colletral token account
    #[account(mut,
     constraint = depositer_token_account.mint == colletral_mint.key(),
constraint = depositer_token_account.owner == depositer.key()
    )]
    pub depositer_token_account: InterfaceAccount<'info, TokenAccount>,

    //The colletral mint used of the deposite
    #[account(mut,
   seeds = [b"colletral_mint"], bump,
    //has_one = mint_authority @ VaultError::InvalidMintAuthority,


    constraint = colletral_mint.mint_authority == vault_state.key().into()
    )]
    pub colletral_mint: InterfaceAccount<'info, Mint>,

    //The LP token mint
    #[account(mut,
    seeds = [b"lp_mint"], bump,
    constraint = mint_lp.mint_authority == vault_state.key().into()
    )]
    pub mint_lp: InterfaceAccount<'info, Mint>,

    //The LP token account of the depositer
    #[account(init_if_needed,
    payer = depositer,
    seeds = [b"lp_token_account", depositer_token_account.key().as_ref()], bump,
    token::mint = mint_lp,
    token::authority = depositer,
    )]
    pub depositer_lp_token_account: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

impl<'info> DepositLP<'info> {
    pub fn handle_deposit_lp(&mut self, amount: u64) -> Result<()> {
        let decimals = self.colletral_mint.decimals;

        let vault_state = &mut self.vault_state;
        let before_vault_total_liquidity = vault_state.total_liquidity;
        let before_vault_total_lp_supply = vault_state.lp_token_supply;

        let depositer_token_account = &mut self.depositer_token_account;
        let depositer_lp_token_account = &mut self.depositer_lp_token_account;
        let vault_token_account = &mut self.vault_token_account;
        let token_program = &self.token_program;

        let cpi_accounts = TransferChecked {
            mint: self.colletral_mint.to_account_info(),
            from: depositer_token_account.to_account_info(),
            to: vault_token_account.to_account_info(),
            authority: self.depositer.to_account_info(),
        };

        let cpi_program = *token_program.key;
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token_interface::transfer_checked(cpi_ctx, amount, decimals)?;

        vault_state.total_liquidity = vault_state
            .total_liquidity
            .checked_add(amount)
            .ok_or(ErrorCode::MathOverflow)?;

        let mint_lp_account = MintTo {
            mint: self.mint_lp.to_account_info(),
            to: depositer_token_account.to_account_info(),
            authority: vault_state.to_account_info(),
        };

        let cpi_program = *token_program.key;

        let cpi_ctx = CpiContext::new(cpi_program, mint_lp_account);

        token_interface::mint_to(cpi_ctx, amount)?;

        // Supply the lp mint to the depositer
        let lp_seeds = &[b"vault_state"];

        let lp_mint = &self.mint_lp;

        let lp_accounts = MintTo {
            mint: lp_mint.to_account_info(),
            authority: vault_state.to_account_info(),
            to: self.depositer_lp_token_account.to_account_info(),
        };

        let cpi_program = *token_program.key;
        let lp_cxt = CpiContext::new(cpi_program, lp_accounts);
        token_interface::mint_to(lp_cxt, amount)?;

        vault_state.total_liquidity = vault_state
            .total_liquidity
            .checked_add(amount)
            .ok_or(ErrorCode::MathOverflow)?;

        vault_state.lp_token_supply = vault_state
            .lp_token_supply
            .checked_add(amount)
            .ok_or(ErrorCode::MathOverflow)?;

        let after_vault_total_liquidity = vault_state.total_liquidity;
        let after_vault_total_lp_supply = vault_state.lp_token_supply;

        msg!(
            "Deposited LP: {} (Vault liquidity: {} -> {}, LP supply: {} -> {})",
            amount,
            before_vault_total_liquidity,
            after_vault_total_liquidity,
            before_vault_total_lp_supply,
            after_vault_total_lp_supply
        );

        require!(
            after_vault_total_liquidity >= before_vault_total_liquidity,
            ErrorCode::IncreaseLiquidityError
        );
        require!(
            after_vault_total_lp_supply >= before_vault_total_lp_supply,
            ErrorCode::MintLpTokenError
        );

        Ok(())
    }
}
