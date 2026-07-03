"use client";

import { useMemo } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Program, AnchorProvider, Idl } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

// TODO: Run 'anchor build' first, then copy/import the generated program IDL here:
// import idl from "../../../anchor/target/idl/anchor.json";
const mockIdl = {
  address: "FqHrJKiHpXbrtUJDZCCdU4U1h7TQaqo6AeGyPLNDgx5G",
  metadata: {
    address: "FqHrJKiHpXbrtUJDZCCdU4U1h7TQaqo6AeGyPLNDgx5G",
  },
  version: "0.1.0",
  name: "anchor",
  instructions: [],
  accounts: [],
  types: [],
} as unknown as Idl;


export function useAnchorProgram() {
  const { connection } = useConnection();
  const wallet = useWallet();

  // Memoize provider to avoid unnecessary recreation
  const provider = useMemo(() => {
    if (!wallet) return null;
    return new AnchorProvider(connection, wallet as any, {
      preflightCommitment: "confirmed",
    });
  }, [connection, wallet]);

  // Memoize program reference
  const program = useMemo(() => {
    if (!provider) return null;
    return new Program(mockIdl, provider);
  }, [provider]);

  return { program, provider, wallet, connection };
}

