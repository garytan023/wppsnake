import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment } from '@react-three/drei';
import { Play, RotateCcw, Trophy, Activity, BrainCircuit, Pause, Disc, User, Medal } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

import { GameStatus, Position, GeminiAnalysis, LeaderboardEntry } from './types';
import { GameBoard, SnakeRenderer, FoodRenderer } from './components/SceneComponents';
import { getGameOverCommentary } from './services/geminiService';
import { getLeaderboard, saveScoreToLeaderboard } from './services/storageService';

// --- Constants & Helpers ---
const BOARD_SIZE = 15;
const INITIAL_SNAKE: Position[] = [{ x: 7, y: 7 }, { x: 7, y: 8 }, { x: 7, y: 9 }];
const INITIAL_DIRECTION: Position = { x: 0, y: -1 }; 
const BASE_SPEED = 150;

const getRandomPosition = (snake: Position[]): Position => {
  let newPos: Position;
  while (true) {
    newPos = {
      x: Math.floor(Math.random() * BOARD_SIZE),
      y: Math.floor(Math.random() * BOARD_SIZE),
    };
    const collision = snake.some(seg => seg.x === newPos.x && seg.y === newPos.y);
    if (!collision) break;
  }
  return newPos;
};

// --- Main Component ---
export default function App() {
  // Game State
  const [snake, setSnake] = useState<Position[]>(INITIAL_SNAKE);
  const [food, setFood] = useState<Position>({ x: 7, y: 4 });
  const [direction, setDirection] = useState<Position>(INITIAL_DIRECTION); 
  const [status, setStatus] = useState<GameStatus>(GameStatus.IDLE);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  
  // Player & Leaderboard State
  const [playerName, setPlayerName] = useState('');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  
  // Gemini State
  const [geminiData, setGeminiData] = useState<GeminiAnalysis | null>(null);
  const [isLoadingGemini, setIsLoadingGemini] = useState(false);

  // Refs
  const directionRef = useRef(INITIAL_DIRECTION);
  const nextDirectionRef = useRef(INITIAL_DIRECTION);
  const gameLoopRef = useRef<number | null>(null);
  const snakeRef = useRef(snake);

  // Keep snakeRef in sync with state
  useEffect(() => {
    snakeRef.current = snake;
  }, [snake]);

  // Load Leaderboard on Mount
  useEffect(() => {
    setLeaderboard(getLeaderboard());
    const savedName = localStorage.getItem('wpp_snake_player_name');
    if (savedName) setPlayerName(savedName);
  }, []);

  // --- Game Logic Methods ---

  const startGame = () => {
    if (!playerName.trim()) {
      alert("Please identify yourself, Agent.");
      return;
    }
    localStorage.setItem('wpp_snake_player_name', playerName);
    
    setSnake(INITIAL_SNAKE);
    setDirection(INITIAL_DIRECTION);
    directionRef.current = INITIAL_DIRECTION;
    nextDirectionRef.current = INITIAL_DIRECTION;
    setScore(0);
    setStatus(GameStatus.PLAYING);
    setFood(getRandomPosition(INITIAL_SNAKE));
    setGeminiData(null);
  };

  const togglePause = useCallback(() => {
    setStatus(prev => {
      if (prev === GameStatus.PLAYING) return GameStatus.PAUSED;
      if (prev === GameStatus.PAUSED) return GameStatus.PLAYING;
      return prev;
    });
  }, []);

  const handleGameOver = useCallback(async () => {
    setStatus(GameStatus.GAME_OVER);
    if (score > highScore) setHighScore(score);
    
    // Save to Leaderboard
    const newLeaderboard = saveScoreToLeaderboard(playerName, score);
    setLeaderboard(newLeaderboard);

    // Gemini Call
    setIsLoadingGemini(true);
    try {
      const analysis = await getGameOverCommentary(score, snakeRef.current.length);
      setGeminiData(analysis);
    } catch (e) {
      console.error("Failed to get analysis", e);
    } finally {
      setIsLoadingGemini(false);
    }
  }, [score, highScore, playerName]);

  const moveSnake = useCallback(() => {
    if (status !== GameStatus.PLAYING) return;

    const prevSnake = snakeRef.current;
    const head = prevSnake[0];
    
    // Apply buffered direction
    directionRef.current = nextDirectionRef.current;
    setDirection(directionRef.current); 

    const newHead = {
      x: head.x + directionRef.current.x,
      y: head.y + directionRef.current.y
    };

    // 1. Wall Collision
    if (
      newHead.x < 0 || 
      newHead.x >= BOARD_SIZE || 
      newHead.y < 0 || 
      newHead.y >= BOARD_SIZE
    ) {
      handleGameOver();
      return;
    }

    // 2. Determine if Eating
    const isEating = newHead.x === food.x && newHead.y === food.y;

    // 3. Self Collision
    const collisionBody = isEating ? prevSnake : prevSnake.slice(0, -1);

    if (collisionBody.some(seg => seg.x === newHead.x && seg.y === newHead.y)) {
      handleGameOver();
      return;
    }

    // 4. Move & Update
    const newSnake = [newHead, ...prevSnake];

    if (isEating) {
      setScore(s => s + 10);
      setFood(getRandomPosition(newSnake));
    } else {
      newSnake.pop();
    }

    setSnake(newSnake);
  }, [status, food, handleGameOver]);

  // --- Effects ---

  // Game Loop
  useEffect(() => {
    if (status === GameStatus.PLAYING) {
      const speed = Math.max(50, BASE_SPEED - Math.floor(score / 50) * 5);
      gameLoopRef.current = window.setInterval(moveSnake, speed);
    } else {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    }
    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, [status, moveSnake, score]);

  // Keyboard Input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        togglePause();
        return;
      }

      if (status !== GameStatus.PLAYING) return;

      const currentDir = directionRef.current;
      
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          if (currentDir.y !== 1) nextDirectionRef.current = { x: 0, y: -1 };
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          if (currentDir.y !== -1) nextDirectionRef.current = { x: 0, y: 1 };
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          if (currentDir.x !== 1) nextDirectionRef.current = { x: -1, y: 0 };
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          if (currentDir.x !== -1) nextDirectionRef.current = { x: 1, y: 0 };
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status, togglePause]);

  // --- Render Helpers ---

  return (
    <div className="relative w-full h-screen overflow-hidden bg-transparent text-white selection:bg-blue-300/30">
      
      {/* 3D Scene */}
      <div className="absolute inset-0 z-0">
        <Canvas shadows>
          <PerspectiveCamera makeDefault position={[0, 15, 10]} fov={50} />
          <OrbitControls 
            enableZoom={false} 
            enablePan={false} 
            maxPolarAngle={Math.PI / 2.5} 
            minPolarAngle={Math.PI / 6} 
          />
          
          {/* Lighting - High Key / Clean */}
          <ambientLight intensity={0.8} color="#ffffff" />
          <directionalLight 
            position={[10, 20, 10]} 
            intensity={1.5} 
            castShadow 
            shadow-mapSize={[2048, 2048]}
          />
          <Environment preset="studio" />

          <GameBoard size={BOARD_SIZE} />
          <SnakeRenderer segments={snake} />
          <FoodRenderer position={food} />

          {/* Background Color */}
          {/* We leave background transparent so the CSS gradient shows through, but need fog for depth */}
          <fog attach="fog" args={['#1e40af', 10, 45]} />
        </Canvas>
      </div>

      {/* HUD Overlay - Glassmorphism */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-10 pointer-events-none">
        <div className="pointer-events-auto">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 bg-white rounded-full animate-pulse shadow-[0_0_10px_rgba(255,255,255,0.8)]"></div>
            <h1 className="text-3xl font-display font-extrabold tracking-tight text-white">
              WPP<span className="font-light opacity-80">OPEN</span>
            </h1>
          </div>
          <p className="text-blue-100 text-sm font-medium opacity-80">
            {status === GameStatus.IDLE ? 'SYSTEM READY' : 
             status === GameStatus.PLAYING ? `AGENT: ${playerName || 'UNKNOWN'}` : 
             status === GameStatus.PAUSED ? 'SYSTEM PAUSED' : 
             'SESSION TERMINATED'}
          </p>
        </div>
        
        <div className="flex flex-col items-end gap-3 pointer-events-auto">
          <div className="flex items-center gap-2">
            {(status === GameStatus.PLAYING || status === GameStatus.PAUSED) && (
              <button 
                onClick={togglePause} 
                className="p-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-white hover:bg-white/20 transition-all"
              >
                 {status === GameStatus.PAUSED ? <Play className="w-5 h-5 fill-current" /> : <Pause className="w-5 h-5 fill-current" />}
              </button>
            )}
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/20 px-6 py-3 rounded-full shadow-xl">
              <Trophy className="w-5 h-5 text-yellow-300" />
              <span className="font-display text-xl font-bold">{score}</span>
            </div>
          </div>
          <div className="text-xs font-bold text-blue-200 uppercase tracking-wider">
            High Score: {Math.max(highScore, leaderboard[0]?.score || 0)}
          </div>
        </div>
      </div>

      {/* Start Screen */}
      {status === GameStatus.IDLE && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-blue-900/40 backdrop-blur-sm">
          <div className="bg-white/10 backdrop-blur-xl p-10 rounded-3xl border border-white/20 shadow-2xl text-center max-w-md mx-4 w-full">
             <div className="w-20 h-20 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg">
                <Disc className="w-10 h-10 text-white animate-spin-slow" />
             </div>
             <h2 className="text-3xl font-display font-bold mb-2 text-white">Snake Protocol</h2>
             <p className="text-blue-100 mb-8 leading-relaxed">
               Identify yourself to begin the simulation.
             </p>
             
             <div className="mb-6 relative">
               <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                 <User className="w-5 h-5 text-blue-300" />
               </div>
               <input 
                 type="text" 
                 value={playerName}
                 onChange={(e) => setPlayerName(e.target.value)}
                 placeholder="Enter Agent Name" 
                 maxLength={15}
                 className="w-full pl-10 pr-4 py-3 bg-blue-900/30 border border-blue-400/30 rounded-xl text-white placeholder-blue-300/50 focus:outline-none focus:ring-2 focus:ring-blue-400 font-display font-bold text-center"
               />
             </div>

             <button 
                onClick={startGame}
                disabled={!playerName.trim()}
                className="w-full py-4 px-8 bg-white text-blue-700 font-bold rounded-xl hover:bg-blue-50 transition-all shadow-lg transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
             >
                LAUNCH EXPERIENCE
             </button>
          </div>
        </div>
      )}

      {/* Pause Screen */}
      {status === GameStatus.PAUSED && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-blue-900/20 backdrop-blur-sm">
           <div className="bg-white/90 backdrop-blur p-8 rounded-3xl shadow-2xl text-center min-w-[320px]">
             <h2 className="text-2xl font-display font-bold mb-2 text-slate-800">Paused</h2>
             <p className="text-slate-500 text-sm mb-6">Game session suspended</p>
             
             <button 
                onClick={togglePause}
                className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all"
             >
                RESUME
             </button>
          </div>
        </div>
      )}

      {/* Game Over Screen */}
      {status === GameStatus.GAME_OVER && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-blue-900/60 backdrop-blur-md p-4">
          <div className="bg-white/95 backdrop-blur-xl p-8 rounded-3xl shadow-2xl w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 text-slate-800 max-h-[90vh] overflow-y-auto">
             
             {/* Left: Stats & Leaderboard */}
             <div className="flex flex-col h-full">
                <div className="mb-6">
                  <h2 className="text-4xl font-display font-bold text-slate-900 mb-1">Session Ended</h2>
                  <p className="text-slate-500">Agent: {playerName}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 w-full mb-6">
                  <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                    <div className="text-xs text-blue-500 font-bold uppercase">Score</div>
                    <div className="text-3xl font-bold text-slate-800">{score}</div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100">
                    <div className="text-xs text-purple-500 font-bold uppercase">Length</div>
                    <div className="text-3xl font-bold text-slate-800">{snake.length}</div>
                  </div>
                </div>

                {/* Leaderboard Section */}
                <div className="bg-white rounded-2xl border border-slate-200 flex-1 overflow-hidden flex flex-col mb-6 min-h-[200px]">
                  <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                    <Medal className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Global Leaderboard</span>
                  </div>
                  <div className="overflow-y-auto flex-1 p-2">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-slate-400 text-xs">
                          <th className="p-2 font-medium">Rank</th>
                          <th className="p-2 font-medium">Agent</th>
                          <th className="p-2 font-medium text-right">Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaderboard.length === 0 ? (
                           <tr><td colSpan={3} className="text-center p-4 text-slate-400">No records yet.</td></tr>
                        ) : (
                          leaderboard.map((entry, idx) => (
                            <tr key={idx} className={`border-b border-slate-50 last:border-0 ${entry.score === score && entry.name === playerName ? 'bg-blue-50' : ''}`}>
                              <td className="p-2 font-bold text-slate-400 w-12">#{idx + 1}</td>
                              <td className="p-2 font-medium text-slate-700 truncate max-w-[100px]">{entry.name}</td>
                              <td className="p-2 font-bold text-slate-900 text-right">{entry.score}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <button 
                  onClick={startGame}
                  className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 mt-auto"
                >
                  <RotateCcw className="w-5 h-5" />
                  RESTART
                </button>
             </div>

             {/* Right: AI Analysis */}
             <div className="flex flex-col gap-4 h-full justify-center">
                {/* AI Card */}
                <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl p-6 border border-slate-200 relative overflow-hidden h-full shadow-inner flex flex-col">
                  <div className="flex items-center gap-2 mb-6">
                    <BrainCircuit className={`w-6 h-6 ${isLoadingGemini ? 'text-blue-500 animate-pulse' : 'text-blue-600'}`} />
                    <span className="text-sm font-bold text-blue-600 uppercase tracking-wider">AI Performance Review</span>
                  </div>
                  
                  <div className="flex-1 flex flex-col justify-center">
                    {isLoadingGemini ? (
                      <div className="space-y-4">
                        <div className="h-3 bg-slate-200 rounded w-3/4 animate-pulse"></div>
                        <div className="h-3 bg-slate-200 rounded w-1/2 animate-pulse"></div>
                        <div className="h-3 bg-slate-200 rounded w-5/6 animate-pulse"></div>
                        <p className="text-sm text-slate-400 mt-6 text-center">Compiling metrics...</p>
                      </div>
                    ) : geminiData ? (
                      <div className="animate-fade-in relative z-10">
                        <p className="text-slate-700 text-lg leading-relaxed font-medium mb-8 italic">
                          "{geminiData.commentary}"
                        </p>
                        <div className="flex flex-col items-center p-6 bg-slate-50 rounded-xl border border-slate-100">
                          <span className="text-xs font-bold text-slate-400 uppercase mb-1">Performance Grade</span>
                          <span className="text-6xl font-display font-black text-transparent bg-clip-text bg-gradient-to-tr from-blue-600 to-purple-600 drop-shadow-sm">
                            {geminiData.grade}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-slate-400">
                        <Activity className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p>Waiting for analysis data...</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Decorative background element */}
                  <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-blue-100 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
                </div>
             </div>

          </div>
        </div>
      )}

      {/* Controls Hint */}
      <div className="absolute bottom-6 left-0 right-0 text-center pointer-events-none">
        <p className="text-xs text-blue-200/60 font-medium tracking-widest">
           ARROWS / WASD TO MOVE &bull; P TO PAUSE
        </p>
      </div>

    </div>
  );
}