import React, { useState } from 'react';
import { BOT_ARCHETYPES } from '../game/models';
import type { BotArchetypeId } from '../game/models';

interface LobbyProps {
  onJoinGame: (playerName: string, roomCode: string, bots: BotArchetypeId[]) => void;
}

export const Lobby: React.FC<LobbyProps> = ({ onJoinGame }) => {
  const [playerName, setPlayerName] = useState<string>('Player One');
  const [roomCode, setRoomCode] = useState<string>('ROOM-123');
  const [selectedBots, setSelectedBots] = useState<BotArchetypeId[]>(['average', 'calculator', 'empath']);

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
      <div className="bg-slate-800 p-6 md:p-8 rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-700">
        <h1 className="text-3xl md:text-4xl font-extrabold text-center mb-8 tracking-tight">
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
            <div className="flex flex-col lg:flex-row gap-6">
              
              {/* Left Column: Current Roster */}
              <div className="w-full lg:w-1/3 flex flex-col border-r-0 lg:border-r border-slate-700 lg:pr-6">
                <div className="flex justify-between items-center mb-3">
                   <label className="block text-sm font-bold text-slate-200">
                     Selected AI ({selectedBots.length}/5)
                   </label>
                </div>
                
                <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-600">
                   {selectedBots.length === 0 && (
                     <div className="text-center text-slate-500 text-sm py-4 italic border border-dashed border-slate-700 rounded-lg">
                       No bots selected.<br/>You will play solo.
                     </div>
                   )}
                   {selectedBots.map((botId, index) => {
                     const bot = BOT_ARCHETYPES.find(b => b.id === botId)!;
                     return (
                       <div key={`${botId}-${index}`} className="flex justify-between items-center bg-slate-900 px-3 py-2 rounded-lg border border-slate-700">
                         <div className="flex flex-col">
                           <span className="font-bold text-sm text-white">{bot.name}</span>
                           <div className="text-[10px] text-slate-400 font-mono mt-0.5">S:{bot.skill} | A:{bot.awareness} | R:{bot.riskyness}</div>
                         </div>
                         <button type="button" onClick={() => handleRemoveBot(index)} className="text-slate-400 hover:text-[#ffb4a8] text-xs font-bold px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 transition-colors">
                            X
                         </button>
                       </div>
                     );
                   })}
                </div>
              </div>

              {/* Right Column: Add Bots Menu */}
              <div className="w-full lg:w-2/3">
                <label className="block text-sm font-bold text-slate-200 mb-3">
                  Bot Archetypes (Skill, Awareness, Risk)
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                   {BOT_ARCHETYPES.map(bot => (
                     <button 
                        key={bot.id} 
                        type="button" 
                        disabled={selectedBots.length >= 5}
                        onClick={() => handleAddBot(bot.id as BotArchetypeId)}
                        className="flex flex-col items-start bg-slate-900 hover:bg-slate-800 p-2.5 rounded-lg border border-slate-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-left group h-full"
                     >
                        <div className="flex justify-between w-full items-start mb-1">
                          <span className="text-[13px] font-bold text-white group-hover:text-[#ffb4a8] transition-colors leading-tight">
                            {bot.name}
                          </span>
                        </div>
                        <div className="flex gap-1 flex-wrap mb-1.5 mt-auto">
                           <span className="text-[9px] font-bold px-1.5 rounded-full bg-blue-900/50 text-blue-200 border border-blue-800">S:{bot.skill}</span>
                           <span className="text-[9px] font-bold px-1.5 rounded-full bg-emerald-900/50 text-emerald-200 border border-emerald-800">A:{bot.awareness}</span>
                           <span className="text-[9px] font-bold px-1.5 rounded-full bg-red-900/50 text-red-200 border border-red-800">R:{bot.riskyness}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 leading-snug">
                          {bot.description}
                        </span>
                     </button>
                   ))}
                </div>
              </div>

            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-[#400000] hover:bg-[#680000] text-white font-black tracking-widest py-4 rounded-xl text-xl transition-colors shadow-[0_4px_12px_rgba(64,0,0,0.5)] mt-6 border border-[#680000]"
          >
            CREATE / JOIN ROOM
          </button>
        </form>
      </div>
    </div>
  );
};
