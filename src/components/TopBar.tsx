import React, { useState } from 'react';
import { 
  MessageSquare, 
  Palette, 
  Gamepad2, 
  Music, 
  Share2, 
  LogOut, 
  Check, 
  Crown,
  Users
} from 'lucide-react';
import type { RoomMode, RoomUser } from '../../shared/types.js';
import { VoiceControls } from './VoiceControls';

interface TopBarProps {
  roomId: string;
  roomName: string;
  currentMode: RoomMode;
  isHost: boolean;
  users: RoomUser[];
  onSetMode: (mode: RoomMode) => void;
  onLeave: () => void;
  onOpenHostTransfer: () => void;
  // Voice states
  isMuted: boolean;
  isDeafened: boolean;
  isSpeaking: boolean;
  onToggleMute: () => void;
  onToggleDeafen: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  roomId,
  currentMode,
  isHost,
  users,
  onSetMode,
  onLeave,
  onOpenHostTransfer,
  isMuted,
  isDeafened,
  isSpeaking,
  onToggleMute,
  onToggleDeafen
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('room', roomId);
    navigator.clipboard.writeText(url.toString());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const modes: { id: RoomMode; label: string; icon: React.ReactNode }[] = [
    { id: 'chat', label: 'Chat', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'drawing', label: 'Lousa', icon: <Palette className="w-4 h-4" /> },
    { id: 'games', label: 'Jogos', icon: <Gamepad2 className="w-4 h-4" /> },
    { id: 'music', label: 'Música', icon: <Music className="w-4 h-4" /> }
  ];

  return (
    <header className="h-14 border-b border-slate-800/80 bg-slate-950/95 backdrop-blur-md px-3 sm:px-5 flex items-center justify-between gap-2 sm:gap-4 sticky top-0 z-40 select-none">
      {/* Zone 1: Wordmark & Room Code */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="text-base font-bold tracking-tight text-white flex items-center gap-1">
            <span className="text-indigo-400">Vibe</span>Room
          </span>
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-mono text-slate-400 bg-slate-900 border border-slate-800 hover:text-white hover:border-slate-700 transition-colors cursor-pointer"
            title="Copiar link da sala"
          >
            <span>#{roomId.slice(0, 8)}</span>
            {copied ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Share2 className="w-2.5 h-2.5 text-slate-500" />}
          </button>
        </div>

        {/* Occupancy pill */}
        <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-400 pl-2 border-l border-slate-800/80">
          <Users className="w-3.5 h-3.5 text-slate-500" />
          <span className="tabular-nums font-semibold text-slate-300">{users.length}/6</span>
          {isHost && (
            <button
              onClick={onOpenHostTransfer}
              className="ml-1 text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
              title="Passar cargo de moderador"
            >
              <Crown className="w-3 h-3" />
              <span className="hidden lg:inline">Moderador</span>
            </button>
          )}
        </div>
      </div>

      {/* Zone 2: Minimalist Icon-First Mode Selector */}
      <nav className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800/90">
        {modes.map((mode) => {
          const isActive = currentMode === mode.id;
          return (
            <button
              key={mode.id}
              onClick={() => {
                if (isHost) onSetMode(mode.id);
              }}
              disabled={!isHost && !isActive}
              title={
                isHost
                  ? `Mudar modo para ${mode.label}`
                  : isActive
                  ? `Modo atual: ${mode.label}`
                  : `Apenas o moderador pode alternar para ${mode.label}`
              }
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : isHost
                  ? 'text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer'
                  : 'text-slate-600 cursor-not-allowed opacity-40'
              }`}
            >
              {mode.icon}
              <span className="hidden sm:inline">{mode.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Zone 3: Integrated Voice Controls & Invite Action */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Voice Controls: Always accessible, never covering content! */}
        <VoiceControls
          isMuted={isMuted}
          isDeafened={isDeafened}
          isSpeaking={isSpeaking}
          onToggleMute={onToggleMute}
          onToggleDeafen={onToggleDeafen}
        />

        {/* Invite Button (Icon on mobile, Icon+Text on desktop) */}
        <button
          onClick={handleCopyLink}
          className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
            copied
              ? 'bg-emerald-600 text-white'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm'
          }`}
          title="Copiar link de convite da sala"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{copied ? 'Copiado!' : 'Convidar'}</span>
        </button>

        {/* Leave Room Button */}
        <button
          onClick={onLeave}
          title="Sair da sala"
          className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-400 hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
