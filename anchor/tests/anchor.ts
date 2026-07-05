import * as anchor from "@coral-xyz/anchor";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { Program } from "@coral-xyz/anchor";
import { Anchor } from "../target/types/anchor";
import { expect } from "chai";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAccount,
  getAssociatedTokenAddressSync,
  getMint,
} from "@solana/spl-token";
describe("txline-prediction-market", () => {
  // Configure the client to use the local cluster.
  let provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.anchor as Program<Anchor>;

  let vaultPda: anchor.web3.PublicKey;
  let marketPda: anchor.web3.PublicKey;
  let admin: anchor.web3.Keypair;
  let collateralMint: anchor.web3.PublicKey;
  let vaultCollateralTokenAccount: anchor.web3.PublicKey;
  let depositerCollateralTokenAccount: anchor.web3.PublicKey;
  let lpMint: anchor.web3.PublicKey;
  let depositerLpTokenAccount: anchor.web3.PublicKey;

  before(async () => {
    admin = anchor.web3.Keypair.generate();
    console.log("Admin public key:", admin.publicKey.toString());
    let airdropAdmin = await provider.connection.requestAirdrop(
      admin.publicKey,
      LAMPORTS_PER_SOL * 100
    );
    await provider.connection.confirmTransaction(airdropAdmin);

    [vaultPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("global_state"), admin.publicKey.toBytes()],
      program.programId
    );

    [collateralMint] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("collateral_mint")],
      program.programId
    );

    [lpMint] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("lp_mint")],
      program.programId
    );

    vaultCollateralTokenAccount = getAssociatedTokenAddressSync(
      collateralMint,
      vaultPda,
      true
    );
  });

  it("Initializes the LP Vault", async () => {
    // TODO: Write test for program.methods.initializeVault()
    const ix = await program.methods
      .initializeVault()
      .accounts({
        signer: admin.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([admin])
      .rpc();

    await provider.connection.confirmTransaction(ix);

    // Verify vault state was initialized correctly
    const vaultState = await program.account.vaultState.fetch(vaultPda);
    expect(vaultState.authority.toString()).eq(admin.publicKey.toString());

    //Collateral mint
    const collateralMintAccount = await getMint(
      provider.connection,
      collateralMint
    );
    console.log("Collateral check");
    expect(collateralMintAccount.mintAuthority?.toString()).eq(
      vaultPda.toString()
    );

    // Vault PDA is the token *authority* inside the ATA data, not the account's program owner
    const vaultAta = await getAccount(
      provider.connection,
      vaultCollateralTokenAccount
    );
    expect(vaultAta.owner.toString()).eq(vaultPda.toString());
    expect(vaultAta.mint.toString()).eq(collateralMint.toString());

    // Get the LP mint account
    const lpMintAccount = await getMint(provider.connection, lpMint);
    console.log("LPMint check");
    expect(lpMintAccount.mintAuthority?.toString()).eq(vaultPda.toString());
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
