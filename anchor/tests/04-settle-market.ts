import { Keypair, PublicKey } from "@solana/web3.js";
import {
  createMint,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { expect } from "chai";
import { airdrop } from "./helpers/airdrop";
import { connection, program } from "./helpers/provider";
import { createMarketPda } from "./helpers/pdas";

describe("settle-market", () => {
  let admin: Keypair;
  let wrongAdmin: Keypair;
  let predictionMint: PublicKey;
  let marketState: PublicKey;

  const marketId = 401;
  const question = "Will SOL be above $100?";

  async function createTestMarket(id: number) {
    const state = createMarketPda(admin, id);
    const vault = getAssociatedTokenAddressSync(predictionMint, state, true);

    await program.methods
      .createMarket(question, id)
      .accountsPartial({
        admin: admin.publicKey,
        predictionMint,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .accountsPartial({
        marketState: state,
        predictionTokenVault: vault,
      })
      .signers([admin])
      .rpc();

    return { state, vault };
  }

  before(async () => {
    admin = Keypair.generate();
    wrongAdmin = Keypair.generate();

    await airdrop(admin);
    await airdrop(wrongAdmin);

    predictionMint = await createMint(
      connection,
      admin,
      admin.publicKey,
      null,
      6
    );

    ({ state: marketState } = await createTestMarket(marketId));
  });

  it("settles a market with the admin", async () => {
    await program.methods
      .settleMarket(0)
      .accountsPartial({
        admin: admin.publicKey,
        marketState,
      })
      .signers([admin])
      .rpc();

    const market = await program.account.marketState.fetch(marketState);

    expect(market.resolved).to.equal(true);
    expect(market.winner).to.equal(0);
  });

  it("rejects settlement by a different admin", async () => {
    try {
      await program.methods
        .settleMarket(1)
        .accountsPartial({
          admin: wrongAdmin.publicKey,
          marketState,
        })
        .signers([wrongAdmin])
        .rpc();
      expect.fail("Expected settlement to fail for the wrong admin");
    } catch (error) {
      expect(String(error)).to.include("AdminMismatch");
    }
  });

  it("rejects settling an already settled market", async () => {
    try {
      await program.methods
        .settleMarket(1)
        .accountsPartial({
          admin: admin.publicKey,
          marketState,
        })
        .signers([admin])
        .rpc();
      expect.fail("Expected double settlement to fail");
    } catch (error) {
      expect(String(error)).to.include("MarketAlreadySettled");
    }
  });

  it("rejects an invalid winner", async () => {
    const freshMarket = await createTestMarket(marketId + 1);

    try {
      await program.methods
        .settleMarket(3)
        .accountsPartial({
          admin: admin.publicKey,
          marketState: freshMarket.state,
        })
        .signers([admin])
        .rpc();
      expect.fail("Expected invalid winner to fail");
    } catch (error) {
      expect(String(error)).to.include("InvalidOutcome");
    }
  });
});
