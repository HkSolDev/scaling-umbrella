"use client";

import React from "react";
import dynamic from "next/dynamic";
import { useWallet } from "@solana/wallet-adapter-react";
import { useTxLineStream } from "@/hooks/useTxLineStream";
import { useAnchorProgram } from "@/hooks/useAnchorProgram";

// Dynamically import WalletMultiButton to prevent server-side rendering mismatch errors
const WalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then((mod) => mod.WalletMultiButton),
  { ssr: false }
);

export default function Home() {
  const wallet = useWallet();
  const { matches, loading: streamLoading } = useTxLineStream();
  const { program } = useAnchorProgram();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold bg-gradient-to-r from-green-400 via-teal-400 to-blue-500 bg-clip-text text-transparent">
              TxLINE Prediction Market
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-500/10 text-green-400 border border-green-500/20">
              Devnet MVP
            </span>
          </div>

          <div className="flex items-center gap-4">
            <WalletMultiButton className="!bg-indigo-600 hover:!bg-indigo-700 !rounded-lg !h-10 !px-4 !text-sm !font-semibold transition-all" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Columns: Matches and Positions */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* World Cup Match Feed */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
              Live World Cup Matches (TxLINE Stream)
            </h2>

            {streamLoading ? (
              <p className="text-zinc-400 text-sm">Connecting to real-time stream feed...</p>
            ) : matches.length === 0 ? (
              <p className="text-zinc-500 text-sm">No active matches found. Simulated events will appear once stream starts.</p>
            ) : (
              <div className="space-y-4">
                {matches.map((match) => (
                  <div key={match.matchId} className="p-4 bg-zinc-950/60 border border-zinc-800/80 rounded-lg flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm">{match.homeTeam} vs {match.awayTeam}</p>
                      <p className="text-xs text-zinc-400 mt-1">Score: {match.score.home} - {match.score.away}</p>
                    </div>
                    <div className="flex gap-2 text-xs">
                      <button className="px-3 py-1.5 bg-zinc-850 hover:bg-zinc-800 border border-zinc-800 rounded text-green-400">
                        Home ({match.odds.homeWin.toFixed(2)})
                      </button>
                      <button className="px-3 py-1.5 bg-zinc-850 hover:bg-zinc-800 border border-zinc-800 rounded text-zinc-400">
                        Draw ({match.odds.draw.toFixed(2)})
                      </button>
                      <button className="px-3 py-1.5 bg-zinc-850 hover:bg-zinc-800 border border-zinc-800 rounded text-blue-400">
                        Away ({match.odds.awayWin.toFixed(2)})
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Active Positions */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-lg font-bold mb-4">Active Leveraged Positions</h2>
            <div className="text-zinc-500 text-sm border border-dashed border-zinc-800 rounded-lg p-8 text-center">
              Connect wallet to view your active predictions.
            </div>
          </section>
        </div>

        {/* Right Column: Code Onboarding Guide */}
        <div className="space-y-8">
          <section className="bg-gradient-to-b from-indigo-950/20 to-zinc-900 border border-indigo-500/20 rounded-xl p-6">
            <h2 className="text-md font-bold text-indigo-400 mb-3">🛠️ Welcome to Your MVP Workspace!</h2>
            <p className="text-zinc-300 text-sm leading-relaxed mb-4">
              I have configured the core workspace structure and Solana hooks. Now, you can code the Rust logic yourself to learn Anchor hands-on!
            </p>

            <h3 className="text-xs font-semibold tracking-wider text-zinc-400 uppercase mb-2">How to start:</h3>
            <ol className="list-decimal pl-4 text-xs text-zinc-300 space-y-2">
              <li>
                Open <code className="text-teal-400 font-mono">anchor/programs/anchor/src/lib.rs</code> and implement the LP Vault, Market creation, and Leveraged Bet logic.
              </li>
              <li>
                Run <code className="text-teal-400 font-mono">anchor build</code> to build your smart contract.
              </li>
              <li>
                Implement test calls in <code className="text-teal-400 font-mono">anchor/tests/anchor.ts</code> and execute them using <code className="text-teal-400 font-mono">anchor test</code>.
              </li>
              <li>
                Import your final built contract IDL in <code className="text-teal-400 font-mono">web/src/hooks/useAnchorProgram.ts</code> to connect the UI!
              </li>
            </ol>
          </section>

          {/* LP Vault Section */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-lg font-bold mb-4">LP Vault Pools</h2>
            <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800/80 mb-4 flex justify-between items-center">
              <div>
                <p className="text-xs text-zinc-400">Total Value Locked</p>
                <p className="text-xl font-bold mt-0.5">$0.00</p>
              </div>
              <div>
                <p className="text-xs text-zinc-400">Current Yield (APY)</p>
                <p className="text-xl font-bold mt-0.5 text-green-400">-- %</p>
              </div>
            </div>
            <button className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 font-semibold rounded-lg text-sm transition-all">
              Deposit Liquidity
            </button>
          </section>
        </div>
      </main>
    </div>
  );
}
