import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Anchor } from "../target/types/anchor";

describe("txline-prediction-market", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.anchor as Program<Anchor>;

  it("Initializes the LP Vault", async () => {
    // TODO: Write test for program.methods.initializeVault()
  });

  it("Allows LP deposits", async () => {
    // TODO: Write test for program.methods.depositLp()
  });

  it("Creates a prediction market for a match", async () => {
    // TODO: Write test for program.methods.createMarket()
  });

  it("Allows placing a leveraged bet", async () => {
    // TODO: Write test for program.methods.placeLeveragedBet()
  });

  it("Allows LPs to withdraw funds", async () => {
    // TODO: Write test for program.methods.withdrawLp()
  });

  it("Settles the market via TxLINE verification", async () => {
    // TODO: Write test for program.methods.settleMarket()
  });
});

