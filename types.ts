export enum GameStatus {
  IDLE = 'IDLE',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  GAME_OVER = 'GAME_OVER'
}

export interface Position {
  x: number;
  y: number;
}

export interface GameState {
  snake: Position[];
  food: Position;
  direction: Position;
  score: number;
  highScore: number;
  status: GameStatus;
  speed: number;
  history: { attempt: number; score: number }[];
}

export interface GeminiAnalysis {
  commentary: string;
  grade: string;
}

export interface LeaderboardEntry {
  name: string;
  score: number;
  date: string;
}