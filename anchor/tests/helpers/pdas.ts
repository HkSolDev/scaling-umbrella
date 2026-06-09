import { PublicKey } from "@solana/web3.js";
import { Keypair } from "@solana/web3.js";
import { programId } from "./provider";

export const SEEDS = {
  vault: "global_state",
  collateralMint: "collateral_mint",
  lpMint: "lp_mint",
} as const;

// Uncomment when deploying/testing on devnet with real USDC:
// export const USDC_DEVNET = new PublicKey(
//   "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
// );

function getPda(seed: string): PublicKey {
  return PublicKey.findProgramAddressSync([Buffer.from(seed)], programId)[0];
}

export function vaultPda(): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.vault)],
    programId
  )[0];
}

export function collateralMintPda(): PublicKey {
  return getPda(SEEDS.collateralMint);
}

export function lpMintPda(): PublicKey {
  return getPda(SEEDS.lpMint);
}

// Rust: [b"create_market", admin, market_id.to_le_bytes()] — question lives in MarketState only
export function createMarketPda(admin: Keypair, marketId: number): PublicKey {
  const marketIdLe = Buffer.alloc(2);
  marketIdLe.writeUInt16LE(marketId);

  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("create_market"),
      admin.publicKey.toBuffer(),
      marketIdLe,
    ],
    programId
  )[0];
}