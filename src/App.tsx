import React, { useState, useEffect, useCallback } from 'react';
import { GameBoard } from './components/GameBoard';
import { Lobby } from './components/Lobby';
import type { GameState, BotAction } from './game/models';
import { createInitialGameState, processAction, calculateScore } from './game/engine';
import { evaluateBotDecision } from './game/ai';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [localPlayerId] = useState<string>('p_1'); // Default to Player 1
  const [hideChips, setHideChips] = useState<boolean>(true);
  const [roomInfo, setRoomInfo] = useState<{name: string, room: string, bots: number} | null>(null);

  // Initialize Game when Lobby submits
  const handleJoinGame = (playerName: string, roomCode: string, numBots: number) => {
    const botNames = ['Bot Alpha', 'Bot Beta', 'Bot Gamma', 'Bot Delta'].slice(0, numBots);
    
    // In the future, this is where we'd connect to WebSockets with `roomCode`
    // For now, initialize a local game immediately with the configured bots
    const initial = createInitialGameState([playerName], botNames);
    setGameState(initial);
    setRoomInfo({ name: playerName, room: roomCode, bots: numBots });
  };

  // Handle Player/Bot Actions
  const handleAction = useCallback((action: BotAction) => {
    setGameState(prev => {
      if (!prev) return prev;
      return processAction(prev, prev.players[prev.currentPlayerIndex].id, action);
    });
  }, []);

  // Bot Turn Loop
  useEffect(() => {
    if (!gameState || gameState.status !== 'playing') return;

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    
    // Is it a bot's turn?
    if (currentPlayer.isBot) {
      // Simulate thinking time (500ms - 1500ms)
      const thinkingTime = 500 + Math.random() * 1000;
      
      const timeout = setTimeout(() => {
        const action = evaluateBotDecision(gameState, currentPlayer);
        handleAction(action);
      }, thinkingTime);

      return () => clearTimeout(timeout);
    }
  }, [gameState, handleAction]);

  if (!gameState) {
    return <Lobby onJoinGame={handleJoinGame} />;
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <GameBoard 
        gameState={gameState} 
        localPlayerId={localPlayerId} 
        onAction={handleAction} 
        hideChips={hideChips}
        onToggleHideChips={() => setHideChips(prev => !prev)}
      />
      
      {/* Lobby Info Overlay (Top Left corner) */}
      <div className="absolute top-24 left-4 md:top-6 md:left-6 z-30 pointer-events-none">
        <div className="bg-slate-800/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 text-sm shadow-md font-medium tracking-wide">
          Room: <span className="text-white font-bold">{roomInfo?.room}</span>
        </div>
      </div>
      
      {/* Game Over Screen Overlay */}
      {gameState.status === 'finished' && (
        <div className="fixed inset-0 bg-slate-900/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 md:p-8 max-w-lg w-full shadow-2xl">
            <h2 className="text-3xl font-bold text-center mb-6 text-slate-800">Game Over!</h2>
            
            <div className="space-y-4 mb-8">
              {gameState.players
                .map(p => ({ player: p, score: calculateScore(p) }))
                .sort((a, b) => a.score - b.score) // Lowest score wins
                .map((result, index) => (
                  <div key={result.player.id} className={`
                    flex justify-between items-center p-4 rounded-xl border-2
                    ${index === 0 ? 'border-amber-400 bg-amber-50' : 'border-slate-200'}
                  `}>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{index === 0 ? '🏆' : `${index + 1}.`}</span>
                      <span className="font-bold text-lg">{result.player.name} {result.player.isBot && '🤖'}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black text-slate-800">{result.score} pts</div>
                      <div className="text-sm text-slate-500">Chips: {result.player.chips}</div>
                    </div>
                  </div>
                ))
              }
            </div>

            <button 
              onClick={() => {
                if (roomInfo) {
                   handleJoinGame(roomInfo.name, roomInfo.room, roomInfo.bots);
                }
              }}
              className="w-full bg-[#1A237E] hover:bg-[#000767] text-white font-bold py-4 rounded-xl text-xl transition-colors mb-3"
            >
              Play Again
            </button>
            
            <button 
              onClick={() => setGameState(null)}
              className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-3 rounded-xl text-lg transition-colors"
            >
              Return to Lobby
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
