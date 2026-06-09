import { Keypair } from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { expect } from "chai";
import { airdrop } from "./helpers/airdrop";
import { connection, program } from "./helpers/provider";
import { collateralMintPda, createMarketPda } from "./helpers/pdas";
import { ensureVault } from "./helpers/vault";

describe("create-market", () => {
  let admin: Keypair;
  const predictionMint = collateralMintPda();

  before(async () => {
    admin = Keypair.generate();
    await airdrop(admin);
    await ensureVault(admin);
  });

  it("Creates a new market", async () => {
    const question = "Will the price of SOL be above $100 in 2024?";
    const marketId = Math.floor(Math.random() * 65534) + 1;

    const marketState = createMarketPda(admin, marketId);
    const predictionTokenVault = getAssociatedTokenAddressSync(
      predictionMint,
      marketState,
      true,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const sig = await program.methods
      .createMarket(question, marketId)
      .accounts({
        admin: admin.publicKey,
        predictionMint,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .accountsPartial({
        marketState,
        predictionTokenVault,
      })
      .signers([admin])
      .rpc();

    await connection.confirmTransaction(sig);

    const market = await program.account.marketState.fetch(marketState);

    expect(market.question).eq(question);
    expect(market.admin.toString()).eq(admin.publicKey.toString());
    expect(market.marketId).eq(marketId);
    expect(market.predictionMint.toString()).eq(predictionMint.toString());
  });
});