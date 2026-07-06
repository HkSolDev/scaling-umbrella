import { Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { connection } from "./provider";

export async function airdrop(wallet: Keypair) {
  const signature = await connection.requestAirdrop(
    wallet.publicKey,
    LAMPORTS_PER_SOL * 10
  );
  await connection.confirmTransaction(signature);
  return signature;
}
