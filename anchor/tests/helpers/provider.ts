import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Anchor } from "../../target/types/anchor";

export const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);

export const program = anchor.workspace.anchor as Program<Anchor>;
export const programId = program.programId;
export const connection = provider.connection;
export const wallet = provider.wallet;
