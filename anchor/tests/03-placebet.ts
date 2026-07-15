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
  let predictionTokenVault: PublicKey;
  const marketId = 100;
  const question = "Will SOL be above $100?";
  let marketState: PublicKey;

  async function expectPlaceBetFailure(
    betId: number,
    outcome: number,
    amount: anchor.BN,
    accounts: Record<string, PublicKey>,
    expectedMessage: string | RegExp
  ) {
    try {
      await program.methods
        .placeBet(betId, outcome, amount)
        .accounts(accounts)
        .accountsPartial({
          userMarketBetState: userBetStatePda(user, betId, marketState),
        })
        .signers([user])
        .rpc();
      expect.fail("Expected place_bet to fail");
    } catch (error) {
      if (expectedMessage instanceof RegExp) {
        expect(String(error)).to.match(expectedMessage);
      } else {
        expect(String(error)).to.include(expectedMessage);
      }
    }
  }

  before(async () => {
    admin = Keypair.generate();
    user = Keypair.generate();
    marketState = createMarketPda(admin, marketId);

    await airdrop(admin);
    await airdrop(user);

    // Ensure vault is initialized (creates its own collateral mint, but we use a separate one below)
    await ensureVault(admin);

    // Create a test-controlled mint (admin is mint authority so we can easily mint tokens to users)
    predictionMint = await createMint(
      connection,
      admin, // payer
      admin.publicKey, // mint authority
      null, // freeze authority
      6 // decimals
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
      admin, // mint authority (admin)
      1_000_000_000 // 1000 tokens (with 6 decimals)
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

    predictionTokenVault = getAssociatedTokenAddressSync(
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
    const userBal = await connection.getTokenAccountBalance(
      userPredictionTokenAccount
    );
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

  it("rejects an invalid outcome", async () => {
    await expectPlaceBetFailure(
      201,
      3,
      new anchor.BN(1_000_000),
      {
        user: user.publicKey,
        marketState,
        predictionMint,
        userPredictionTokenAccount,
        predictionTokenVault,
        tokenProgram: TOKEN_PROGRAM_ID,
      },
      "Invalid outcome"
    );
  });

  it("rejects a zero amount", async () => {
    await expectPlaceBetFailure(
      202,
      0,
      new anchor.BN(0),
      {
        user: user.publicKey,
        marketState,
        predictionMint,
        userPredictionTokenAccount,
        predictionTokenVault,
        tokenProgram: TOKEN_PROGRAM_ID,
      },
      "Amount must be positive"
    );
  });

  it("rejects an amount greater than the user's balance", async () => {
    await expectPlaceBetFailure(
      203,
      0,
      new anchor.BN(2_000_000_000),
      {
        user: user.publicKey,
        marketState,
        predictionMint,
        userPredictionTokenAccount,
        predictionTokenVault,
        tokenProgram: TOKEN_PROGRAM_ID,
      },
      "User token balance is insufficient"
    );
  });

  it("rejects a duplicate bet id", async () => {
    await expectPlaceBetFailure(
      200,
      1,
      new anchor.BN(1_000_000),
      {
        user: user.publicKey,
        marketState,
        predictionMint,
        userPredictionTokenAccount,
        predictionTokenVault,
        tokenProgram: TOKEN_PROGRAM_ID,
      },
      "already in use"
    );
  });

  it("rejects the wrong prediction mint", async () => {
    const wrongMint = await createMint(
      connection,
      admin,
      admin.publicKey,
      null,
      6
    );
    const wrongUserTokenAccount = (
      await getOrCreateAssociatedTokenAccount(
        connection,
        admin,
        wrongMint,
        user.publicKey
      )
    ).address;

    await expectPlaceBetFailure(
      204,
      0,
      new anchor.BN(1_000_000),
      {
        user: user.publicKey,
        marketState,
        predictionMint: wrongMint,
        userPredictionTokenAccount: wrongUserTokenAccount,
        predictionTokenVault,
        tokenProgram: TOKEN_PROGRAM_ID,
      },
      /Invalid prediction mint|constraint|owner/i
    );
  });

  it("rejects the wrong prediction vault", async () => {
    const wrongVault = (
      await getOrCreateAssociatedTokenAccount(
        connection,
        admin,
        predictionMint,
        user.publicKey
      )
    ).address;

    await expectPlaceBetFailure(
      205,
      0,
      new anchor.BN(1_000_000),
      {
        user: user.publicKey,
        marketState,
        predictionMint,
        userPredictionTokenAccount,
        predictionTokenVault: wrongVault,
        tokenProgram: TOKEN_PROGRAM_ID,
      },
      /Invalid prediction mint|constraint|owner/i
    );
  });

  it.skip("rejects a bet after market resolution", async () => {
    // TODO: implement a secure resolve/close instruction first. The current
    // settle_market stub does not mutate MarketState.resolved.
  });
});
