import React, { useState } from 'react';

interface LobbyProps {
  onJoinGame: (playerName: string, roomCode: string, numBots: number) => void;
}

export const Lobby: React.FC<LobbyProps> = ({ onJoinGame }) => {
  const [playerName, setPlayerName] = useState<string>('Player One');
  const [roomCode, setRoomCode] = useState<string>('ROOM-123');
  const [numBots, setNumBots] = useState<number>(3);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (playerName.trim() && roomCode.trim()) {
      onJoinGame(playerName.trim(), roomCode.trim().toUpperCase(), numBots);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-4">
      <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl max-w-md w-full border border-slate-700">
        <h1 className="text-4xl font-extrabold text-center mb-8 tracking-tight">
          No <span className="text-[#8E0000]">Thanks!</span>
        </h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="playerName" className="block text-sm font-medium text-slate-300 mb-2">
              Your Name
            </label>
            <input
              type="text"
              id="playerName"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#8E0000] focus:border-transparent transition-all"
              required
            />
          </div>

          <div>
            <label htmlFor="roomCode" className="block text-sm font-medium text-slate-300 mb-2">
              Room Code (To join others)
            </label>
            <input
              type="text"
              id="roomCode"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white uppercase focus:outline-none focus:ring-2 focus:ring-[#1A237E] focus:border-transparent transition-all tracking-wider"
              required
            />
          </div>

          <div>
             <label htmlFor="numBots" className="block text-sm font-medium text-slate-300 mb-2">
              Add AI Bots ({numBots})
            </label>
            <input 
              type="range" 
              id="numBots" 
              min="0" 
              max="4" 
              value={numBots} 
              onChange={(e) => setNumBots(parseInt(e.target.value, 10))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#8E0000]"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-2 px-1">
              <span>0</span>
              <span>1</span>
              <span>2</span>
              <span>3</span>
              <span>4</span>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-[#8E0000] hover:bg-[#680000] text-white font-bold py-4 rounded-xl text-lg transition-colors shadow-lg mt-4"
          >
            Join Game
          </button>
        </form>

        <p className="text-center text-slate-500 text-sm mt-6">
          A premium digital board game experience.
        </p>
      </div>
    </div>
  );
};
