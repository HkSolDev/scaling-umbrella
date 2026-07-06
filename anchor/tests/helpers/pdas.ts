import { PublicKey } from "@solana/web3.js";
import { Keypair } from "@solana/web3.js";
import { programId } from "./provider";

export const SEEDS = {
  vault: "global_state",
  collateralMint: "collateral_mint",
  lpMint: "lp_mint",
} as const;

function getPda(seed: string): PublicKey {
  return PublicKey.findProgramAddressSync([Buffer.from(seed)], programId)[0];
}

export function vaultPda(admin: Keypair): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.vault), admin.publicKey.toBytes()],
    programId
  )[0];
}

export function collateralMintPda(): PublicKey {
  return getPda(SEEDS.collateralMint);
}

export function lpMintPda(): PublicKey {
  return getPda(SEEDS.lpMint);
}
