use anchor_lang::prelude::*;
use anchor_spl::token_interface::spl_token_metadata_interface::borsh::schema::SchemaMaxSerializedSizeError::Overflow;

#[error_code]
pub enum ErrorCode {
    #[msg("The provided token account has zero tokens!")]
    NoBalance,
    #[msg("The input token amount exceeded single deposit limit!")]
    ExceededSingleDepositLimit,
    #[msg("The input token amount exceeded total deposit limit!")]
    ExceededTotalDepositLimit,
    #[msg("The math operation underflowed")]
    MathUnderflow,
    #[msg("The math operation is overflow")]
    MathOverflow,

    #[msg("Error in increasing liquidity")]
    IncreaseLiquidityError,
    #[msg("Error in decreasing liquidity")]
    DecreaseLiquidityError,
    #[msg("Error in minting LP tokens")]
    MintLpTokenError,
}
