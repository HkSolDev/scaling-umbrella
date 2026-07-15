import * as anchor from "@coral-xyz/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createMint,
  getAssociatedTokenAddressSync,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { expect } from "chai";
import { airdrop } from "./helpers/airdrop";
import { connection, program } from "./helpers/provider";
import { createMarketPda, userBetStatePda } from "./helpers/pdas";
import { ensureVault } from "./helpers/vault";

describe("Place the bet into the market", () => {
  let admin: Keypair;
  let user: Keypair;
  let predictionMint: PublicKey;
  let userPredictionTokenAccount: PublicKey;

  before(async () => {
    admin = Keypair.generate();
    user = Keypair.generate();

    await airdrop(admin);
    await airdrop(user);

    // Ensure vault is initialized (creates its own collateral mint, but we use a separate one below)
    await ensureVault(admin);

    // Create a test-controlled mint (admin is mint authority so we can easily mint tokens to users)
    predictionMint = await createMint(
      connection,
      admin,            // payer
      admin.publicKey,  // mint authority
      null,             // freeze authority
      6                 // decimals
    );

    // Create (or get) user's associated token account for this mint
    const userAta = await getOrCreateAssociatedTokenAccount(
      connection,
      admin,
      predictionMint,
      user.publicKey
    );
    userPredictionTokenAccount = userAta.address;

    // Mint some tokens to the user for betting
    await mintTo(
      connection,
      admin,
      predictionMint,
      userPredictionTokenAccount,
      admin,               // mint authority (admin)
      1_000_000_000        // 1000 tokens (with 6 decimals)
    );
  });

  it("should place a bet into the market (happy path)", async () => {
    const marketId = 100;
    const betId = 200;
    const question = "Will SOL be above $100?";
    const outcome = 1; // 0 = home, 1 = away, 2 = draw
    const amount = new anchor.BN(100_000_000); // 100 tokens

    // === MarketState PDA (use the same one for createMarket + placeBet) ===
    const marketState = createMarketPda(admin, marketId);

    const predictionTokenVault = getAssociatedTokenAddressSync(
      predictionMint,
      marketState,
      true, // allowOwnerOffCurve because owned by PDA
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    // 1. Create the market first
    await program.methods
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

    // 2. Derive user's bet position PDA
    const userBetState = userBetStatePda(user, betId, marketState);

    // 3. Place the bet
    await program.methods
      .placeBet(betId, outcome, amount)
      .accounts({
        user: user.publicKey,
        marketState,
        predictionMint,
        userPredictionTokenAccount,
        predictionTokenVault,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .accountsPartial({
        userMarketBetState: userBetState,
      })
      .signers([user])
      .rpc();

    // === Happy path assertions ===
    const userBal = await connection.getTokenAccountBalance(userPredictionTokenAccount);
    console.log("User token balance after bet:", userBal.value.uiAmount);

    const market = await program.account.marketState.fetch(marketState);
    console.log("Market state after bet:", {
      totalLiquidity: market.totalLiquidity.toNumber(),
      awayPool: market.awayPool.toNumber(),
      totalBets: market.totalBets.toNumber(),
    });

    expect(market.totalBets.toNumber()).to.equal(1);
    expect(market.awayPool.toNumber()).to.equal(amount.toNumber());

    const position = await program.account.positionState.fetch(userBetState);
    expect(position.user.toBase58()).to.equal(user.publicKey.toBase58());
    expect(position.outcome).to.equal(outcome);
    expect(position.amount.toNumber()).to.equal(amount.toNumber());
    expect(position.isSettled).to.equal(false);
  });
});
