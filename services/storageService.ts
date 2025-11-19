import { LeaderboardEntry } from "../types";

const STORAGE_KEY = 'wpp_snake_leaderboard_v1';
const MAX_ENTRIES = 10;

export const getLeaderboard = (): LeaderboardEntry[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Failed to load leaderboard", e);
    return [];
  }
};

export const saveScoreToLeaderboard = (name: string, score: number): LeaderboardEntry[] => {
  const current = getLeaderboard();
  const newEntry: LeaderboardEntry = {
    name: name.trim() || 'Anonymous Agent',
    score,
    date: new Date().toISOString()
  };

  const updated = [...current, newEntry]
    .sort((a, b) => b.score - a.score) // Sort descending
    .slice(0, MAX_ENTRIES); // Keep top N

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error("Failed to save leaderboard", e);
  }

  return updated;
};