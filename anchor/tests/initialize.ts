import { Keypair } from "@solana/web3.js";
import { getAccount } from "@solana/spl-token";
import { expect } from "chai";
import { airdrop } from "./helpers/airdrop";
import { connection, program } from "./helpers/provider";
import { initializeVault } from "./helpers/vault";

describe("txline-prediction-market", () => {
  let admin: Keypair;

  before(async () => {
    admin = Keypair.generate();
    await airdrop(admin);
  });

  it("Initializes the LP Vault", async () => {
    const { vault, vaultCollateralTokenAccount, collateralMint, lpMint } =
      await initializeVault(admin);

    const vaultState = await program.account.vaultState.fetch(vault);
    expect(vaultState.authority.toString()).eq(admin.publicKey.toString());

    expect(collateralMint.mintAuthority?.toString()).eq(vault.toString());

    const vaultAta = await getAccount(connection, vaultCollateralTokenAccount);
    expect(vaultAta.owner.toString()).eq(vault.toString());
    expect(vaultAta.mint.toString()).eq(collateralMint.address.toString());

    expect(lpMint.mintAuthority?.toString()).eq(vault.toString());
  });
});
