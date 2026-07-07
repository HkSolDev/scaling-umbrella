use anchor_lang::prelude::*;

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
    #[msg("Admin signature does not match")]
    AdminMismatch,
    #[msg("Invalid prediction mint")]
    InvalidPredictionMint,
    #[msg("Invalid prediction LP mint")]
    InvalidMarketPositionMint,
    #[msg("Invalid outcome")]
    InvalidOutcome,
}
