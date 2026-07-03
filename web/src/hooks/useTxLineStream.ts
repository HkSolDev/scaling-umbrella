"use client";

import { useEffect, useState } from "react";

export interface MatchUpdate {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  score: {
    home: number;
    away: number;
  };
  odds: {
    homeWin: number; // e.g. 2.10
    awayWin: number;
    draw: number;
  };
  status: "live" | "scheduled" | "finished";
  proof?: string; // Optional Merkle proof for resolution
}

export function useTxLineStream() {
  const [matches, setMatches] = useState<MatchUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // TxLINE World Cup SSE stream URL
    // TODO: Replace with the actual TxLINE World Cup SSE feed URL from hackathon docs
    const streamUrl = "https://txline.txodds.com/api/v1/worldcup/stream";

    // Set up standard browser EventSource
    const eventSource = new EventSource(streamUrl);

    eventSource.onopen = () => {
      console.log("Connected to TxLINE SSE Stream");
      setLoading(false);
      setError(null);
    };

    eventSource.onmessage = (event) => {
      try {
        const rawData = JSON.parse(event.data);
        
        // TODO: Map the raw TxLINE JSON schema to your MatchUpdate format
        const updatedMatch: MatchUpdate = {
          matchId: rawData.match_id || rawData.id,
          homeTeam: rawData.home_team,
          awayTeam: rawData.away_team,
          score: {
            home: rawData.score?.home ?? 0,
            away: rawData.score?.away ?? 0,
          },
          odds: {
            homeWin: rawData.odds?.home ?? 1.0,
            awayWin: rawData.odds?.away ?? 1.0,
            draw: rawData.odds?.draw ?? 1.0,
          },
          status: rawData.status || "live",
          proof: rawData.merkle_proof,
        };

        setMatches((prevMatches) => {
          const index = prevMatches.findIndex((m) => m.matchId === updatedMatch.matchId);
          if (index !== -1) {
            // Update existing match
            const newMatches = [...prevMatches];
            newMatches[index] = updatedMatch;
            return newMatches;
          } else {
            // Add new match
            return [...prevMatches, updatedMatch];
          }
        });
      } catch (err) {
        console.error("Error parsing TxLINE stream data:", err);
      }
    };

    eventSource.onerror = (err) => {
      console.error("TxLINE stream connection error:", err);
      setError("Failed to connect to stream feed.");
      setLoading(false);
    };

    // Clean up EventSource connection when component unmounts
    return () => {
      eventSource.close();
      console.log("TxLINE stream connection closed");
    };
  }, []);

  return { matches, loading, error };
}
