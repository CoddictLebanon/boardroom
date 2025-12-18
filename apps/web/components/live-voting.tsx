"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useMeetingSocket, VoteTally, VoteUpdateEvent } from "@/lib/socket";
import { ThumbsUp, ThumbsDown, Minus, Users, Wifi, WifiOff } from "lucide-react";
import type { Decision } from "@/lib/types";

interface LiveVotingProps {
  meetingId: string;
  decisions: Decision[];
  isLive: boolean;
}

export function LiveVoting({ meetingId, decisions, isLive }: LiveVotingProps) {
  const {
    isConnected,
    isInMeeting,
    currentAttendees,
    castVote,
    onVoteUpdate,
    error,
  } = useMeetingSocket(meetingId);

  const [voteTallies, setVoteTallies] = useState<Record<string, VoteTally>>({});
  const [userVotes, setUserVotes] = useState<Record<string, "FOR" | "AGAINST" | "ABSTAIN">>({});
  const [voting, setVoting] = useState<string | null>(null);

  // Listen for vote updates
  useEffect(() => {
    const unsubscribe = onVoteUpdate((event: VoteUpdateEvent) => {
      setVoteTallies((prev) => ({
        ...prev,
        [event.decisionId]: event.tally,
      }));
    });

    return unsubscribe;
  }, [onVoteUpdate]);

  // Initialize tallies from decisions
  useEffect(() => {
    const initialTallies: Record<string, VoteTally> = {};
    decisions.forEach((decision) => {
      if (decision.votes) {
        const tally: VoteTally = { for: 0, against: 0, abstain: 0 };
        decision.votes.forEach((vote) => {
          if (vote.vote === "FOR") tally.for++;
          else if (vote.vote === "AGAINST") tally.against++;
          else if (vote.vote === "ABSTAIN") tally.abstain++;
        });
        initialTallies[decision.id] = tally;
      }
    });
    setVoteTallies(initialTallies);
  }, [decisions]);

  const handleVote = async (decisionId: string, vote: "FOR" | "AGAINST" | "ABSTAIN") => {
    if (!isLive || !isConnected) return;

    setVoting(decisionId);
    try {
      const result = await castVote(decisionId, vote);
      if (result.success && result.tally) {
        setVoteTallies((prev) => ({
          ...prev,
          [decisionId]: result.tally!,
        }));
        setUserVotes((prev) => ({
          ...prev,
          [decisionId]: vote,
        }));
      }
    } catch (err) {
      console.error("Vote failed:", err);
    } finally {
      setVoting(null);
    }
  };

  const getVotePercentage = (tally: VoteTally) => {
    const total = tally.for + tally.against + tally.abstain;
    if (total === 0) return { for: 0, against: 0, abstain: 0 };
    return {
      for: Math.round((tally.for / total) * 100),
      against: Math.round((tally.against / total) * 100),
      abstain: Math.round((tally.abstain / total) * 100),
    };
  };

  const pendingDecisions = decisions.filter((d) => !d.outcome);

  if (pendingDecisions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Live Voting</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No pending decisions to vote on.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Live Voting</CardTitle>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <Badge variant="outline" className="bg-green-50 text-green-700">
                <Wifi className="mr-1 h-3 w-3" />
                Connected
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-red-50 text-red-700">
                <WifiOff className="mr-1 h-3 w-3" />
                Disconnected
              </Badge>
            )}
            <Badge variant="secondary">
              <Users className="mr-1 h-3 w-3" />
              {currentAttendees.length} online
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {pendingDecisions.map((decision) => {
          const tally = voteTallies[decision.id] || { for: 0, against: 0, abstain: 0 };
          const percentages = getVotePercentage(tally);
          const userVote = userVotes[decision.id];
          const isVoting = voting === decision.id;

          return (
            <div key={decision.id} className="space-y-4 rounded-lg border p-4">
              <div>
                <h4 className="font-medium">{decision.title}</h4>
                {decision.description && (
                  <p className="text-sm text-muted-foreground">{decision.description}</p>
                )}
              </div>

              {/* Vote Buttons */}
              {isLive && (
                <div className="flex gap-2">
                  <Button
                    variant={userVote === "FOR" ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleVote(decision.id, "FOR")}
                    disabled={!isConnected || isVoting}
                    className={userVote === "FOR" ? "bg-green-600 hover:bg-green-700" : ""}
                  >
                    <ThumbsUp className="mr-1 h-4 w-4" />
                    For
                  </Button>
                  <Button
                    variant={userVote === "AGAINST" ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleVote(decision.id, "AGAINST")}
                    disabled={!isConnected || isVoting}
                    className={userVote === "AGAINST" ? "bg-red-600 hover:bg-red-700" : ""}
                  >
                    <ThumbsDown className="mr-1 h-4 w-4" />
                    Against
                  </Button>
                  <Button
                    variant={userVote === "ABSTAIN" ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleVote(decision.id, "ABSTAIN")}
                    disabled={!isConnected || isVoting}
                    className={userVote === "ABSTAIN" ? "bg-gray-600 hover:bg-gray-700" : ""}
                  >
                    <Minus className="mr-1 h-4 w-4" />
                    Abstain
                  </Button>
                </div>
              )}

              {/* Vote Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-green-700">For: {tally.for}</span>
                  <span>{percentages.for}%</span>
                </div>
                <Progress value={percentages.for} className="h-2 bg-gray-200" />

                <div className="flex items-center justify-between text-sm">
                  <span className="text-red-700">Against: {tally.against}</span>
                  <span>{percentages.against}%</span>
                </div>
                <Progress value={percentages.against} className="h-2 bg-gray-200" />

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">Abstain: {tally.abstain}</span>
                  <span>{percentages.abstain}%</span>
                </div>
                <Progress value={percentages.abstain} className="h-2 bg-gray-200" />
              </div>

              <div className="text-center text-sm text-muted-foreground">
                Total votes: {tally.for + tally.against + tally.abstain}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
