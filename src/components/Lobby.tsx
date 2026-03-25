import React, { useState } from 'react';
import { BOT_ARCHETYPES } from '../game/models';
import type { BotArchetypeId } from '../game/models';

interface LobbyProps {
  onJoinGame: (playerName: string, roomCode: string, bots: BotArchetypeId[]) => void;
}

export const Lobby: React.FC<LobbyProps> = ({ onJoinGame }) => {
  const [playerName, setPlayerName] = useState<string>('Player One');
  const [roomCode, setRoomCode] = useState<string>('ROOM-123');
  const [selectedBots, setSelectedBots] = useState<BotArchetypeId[]>(['rookie', 'gambler', 'grandmaster']);

  const handleAddBot = (botId: BotArchetypeId) => {
    if (selectedBots.length < 5) { // Max 5 bots + you = 6 players (which is pushing it but fun)
      setSelectedBots([...selectedBots, botId]);
    }
  };

  const handleRemoveBot = (index: number) => {
    setSelectedBots(selectedBots.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (playerName.trim() && roomCode.trim()) {
      onJoinGame(playerName.trim(), roomCode.trim().toUpperCase(), selectedBots);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-4">
      <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl max-w-lg w-full border border-slate-700">
        <h1 className="text-4xl font-extrabold text-center mb-8 tracking-tight">
          NO <span className="text-[#ffb4a8]">THANKS!</span>
        </h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
               <label htmlFor="playerName" className="block text-sm font-medium text-slate-300 mb-2">
                 Your Name
               </label>
               <input
                 type="text"
                 id="playerName"
                 value={playerName}
                 onChange={(e) => setPlayerName(e.target.value)}
                 className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#ffb4a8] focus:border-transparent transition-all"
                 required
               />
             </div>
             <div>
               <label htmlFor="roomCode" className="block text-sm font-medium text-slate-300 mb-2">
                 Room Code
               </label>
               <input
                 type="text"
                 id="roomCode"
                 value={roomCode}
                 onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                 className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white uppercase focus:outline-none focus:ring-2 focus:ring-[#ffb4a8] focus:border-transparent transition-all tracking-wider"
                 required
               />
             </div>
          </div>

          <div className="border-t border-slate-700 pt-6">
            <div className="flex justify-between items-center mb-4">
               <label className="block text-sm font-medium text-slate-300">
                 Selected AI Opponents ({selectedBots.length})
               </label>
            </div>
            
            {/* Current Roster */}
            <div className="flex flex-col gap-2 mb-4 max-h-40 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-600">
               {selectedBots.length === 0 && (
                 <div className="text-center text-slate-500 text-sm py-2 italic border border-dashed border-slate-700 rounded-lg">
                   No bots selected. You will play solo.
                 </div>
               )}
               {selectedBots.map((botId, index) => {
                 const bot = BOT_ARCHETYPES.find(b => b.id === botId)!;
                 return (
                   <div key={`${botId}-${index}`} className="flex justify-between items-center bg-slate-700 px-3 py-2 rounded-lg border border-slate-600">
                     <div>
                       <span className="font-bold text-sm">{bot.name}</span>
                       <div className="text-[10px] text-slate-400">Skill: {bot.skill} | Risk: {bot.riskyness}</div>
                     </div>
                     <button type="button" onClick={() => handleRemoveBot(index)} className="text-slate-400 hover:text-red-400 text-sm p-1">
                        Remove
                     </button>
                   </div>
                 );
               })}
            </div>

            {/* Add Bots Menu */}
            <div className="grid grid-cols-2 gap-2">
               {BOT_ARCHETYPES.map(bot => (
                 <button 
                    key={bot.id} 
                    type="button" 
                    disabled={selectedBots.length >= 5}
                    onClick={() => handleAddBot(bot.id as BotArchetypeId)}
                    className="flex flex-col items-start bg-slate-900 hover:bg-slate-800 p-2 rounded-lg border border-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left group"
                 >
                    <span className="text-sm font-bold group-hover:text-white text-slate-300">{bot.name}</span>
                    <span className="text-[9px] text-slate-500 leading-tight mt-1 hidden md:block">{bot.description}</span>
                 </button>
               ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-[#400000] hover:bg-[#680000] text-white font-black tracking-widest py-4 rounded-xl text-lg transition-colors shadow-[0_4px_12px_rgba(64,0,0,0.5)] mt-4 border border-[#680000]"
          >
            JOIN ROOM
          </button>
        </form>
      </div>
    </div>
  );
};
