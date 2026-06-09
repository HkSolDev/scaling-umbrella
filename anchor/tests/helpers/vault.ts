import {
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { program, connection } from "./provider";
import { vaultPda, collateralMintPda, lpMintPda } from "./pdas";
import { Keypair } from "@solana/web3.js";
import { getMint } from "@solana/spl-token";

export async function ensureVault(admin: Keypair) {
  try {
    await program.account.vaultState.fetch(vaultPda());
  } catch {
    await initializeVault(admin);
  }
}

export async function initializeVault(admin: Keypair) {
  const sig = await program.methods
    .initializeVault()
    .accounts({ signer: admin.publicKey, tokenProgram: TOKEN_PROGRAM_ID })
    .signers([admin])
    .rpc();
  await connection.confirmTransaction(sig);

  const vault = vaultPda();
  const vaultCollateralTokenAccount = getAssociatedTokenAddressSync(
    collateralMintPda(),
    vault,
    true
  );

  // in your test, after initializeVault()
  const collateralMintAccount = await getMint(connection, collateralMintPda());
  const lpMintAccount = await getMint(connection, lpMintPda());
  return {
    vault,
    vaultCollateralTokenAccount,
    collateralMint: collateralMintAccount,
    lpMint: lpMintAccount,
  };
}
