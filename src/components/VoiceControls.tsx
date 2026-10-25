import React, { useState } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Sparkles, SlidersHorizontal } from 'lucide-react';
import { audioMesh } from '../services/audioMesh';
import { AudioSettingsModal } from './AudioSettingsModal';

interface VoiceControlsProps {
  isMuted: boolean;
  isDeafened: boolean;
  isSpeaking: boolean;
  onToggleMute: () => void;
  onToggleDeafen: () => void;
}

export const VoiceControls: React.FC<VoiceControlsProps> = ({
  isMuted,
  isDeafened,
  isSpeaking,
  onToggleMute,
  onToggleDeafen
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [noiseReductionActive, setNoiseReductionActive] = useState(true);

  const handleToggleNoiseReduction = () => {
    const nextVal = !noiseReductionActive;
    setNoiseReductionActive(nextVal);
    audioMesh.setNoiseReduction(nextVal);
  };

  return (
    <>
      <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 rounded-xl p-1 shadow-sm shrink-0">
        {/* Mic Toggle Button */}
        <button
          onClick={onToggleMute}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
            isMuted
              ? 'bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 border border-rose-500/30'
              : isSpeaking
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.35)]'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
          title={isMuted ? 'Desmutar microfone' : 'Mutar microfone'}
          aria-label={isMuted ? 'Desmutar microfone' : 'Mutar microfone'}
        >
          {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        {/* Audio / Deafen Toggle Button */}
        <button
          onClick={onToggleDeafen}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
            isDeafened
              ? 'bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 border border-amber-500/30'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
          title={isDeafened ? 'Ativar som da sala' : 'Ensurdecer (mutar áudio da sala)'}
          aria-label={isDeafened ? 'Ativar som da sala' : 'Ensurdecer'}
        >
          {isDeafened ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        {/* Noise Reduction Toggle Button */}
        <button
          onClick={handleToggleNoiseReduction}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
            noiseReductionActive
              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
              : 'text-slate-500 hover:text-slate-400 hover:bg-slate-800'
          }`}
          title={
            noiseReductionActive
              ? 'Cancelamento de Ruído: ATIVO (filtra teclado, ventilador e eco)'
              : 'Cancelamento de Ruído: DESATIVADO'
          }
          aria-label="Alternar cancelamento de ruído"
        >
          <Sparkles className="w-4 h-4" />
        </button>

        {/* Audio Settings Button */}
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          title="Configurações de Áudio e Teste de Voz"
          aria-label="Configurações de áudio"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
        </button>
      </div>

      <AudioSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  );
};
