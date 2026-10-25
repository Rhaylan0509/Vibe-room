import React, { useState } from 'react';
import { 
  CloudRain, 
  Volume2, 
  VolumeX, 
  Play, 
  Pause, 
  Sliders, 
  Sparkles, 
  Wind, 
  Flame, 
  Coffee, 
  Trees, 
  Waves, 
  Moon, 
  Droplets,
  Radio,
  Plus
} from 'lucide-react';
import type { AmbientSoundState, AmbientSoundType } from '../../shared/types.js';

interface AmbientSoundViewProps {
  ambientState: AmbientSoundState;
  isHost: boolean;
  localVolume: number;
  isLocalMuted: boolean;
  onVolumeChange: (vol: number) => void;
  onToggleMuteLocal: () => void;
  onControlAmbient: (
    action: 'play' | 'pause' | 'set_track' | 'set_volume',
    opts?: {
      trackId?: string;
      title?: string;
      soundType?: AmbientSoundType;
      icon?: string;
      category?: string;
      audioUrl?: string;
      volume?: number;
    }
  ) => void;
}

export interface AmbientPreset {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  icon: string;
  soundType: AmbientSoundType;
  accent: string;
  bgGradient: string;
}

export const AMBIENT_PRESETS: AmbientPreset[] = [
  {
    id: 'rain-soft',
    title: 'Chuva Suave na Janela',
    subtitle: 'Pingos relaxantes de chuva contínua',
    category: 'Clima & Relax',
    icon: '🌧️',
    soundType: 'rain',
    accent: 'text-sky-400',
    bgGradient: 'from-sky-950/60 to-slate-900/80'
  },
  {
    id: 'rain-thunder',
    title: 'Tempestade com Trovões',
    subtitle: 'Chuva intensa com trovões distantes',
    category: 'Clima & Relax',
    icon: '⛈️',
    soundType: 'thunder',
    accent: 'text-indigo-400',
    bgGradient: 'from-indigo-950/60 to-slate-900/80'
  },
  {
    id: 'nature-forest',
    title: 'Natureza & Pássaros',
    subtitle: 'Folhagens e canto de pássaros silvestres',
    category: 'Natureza',
    icon: '🌲',
    soundType: 'forest',
    accent: 'text-emerald-400',
    bgGradient: 'from-emerald-950/60 to-slate-900/80'
  },
  {
    id: 'nature-wind',
    title: 'Campo & Brisa Calma',
    subtitle: 'Vento soprando suavemente pela campina',
    category: 'Natureza',
    icon: '🌾',
    soundType: 'wind',
    accent: 'text-amber-400',
    bgGradient: 'from-amber-950/60 to-slate-900/80'
  },
  {
    id: 'cozy-fireplace',
    title: 'Lareira & Fogueira',
    subtitle: 'Estalos de madeira e calor aconchegante',
    category: 'Aconchego',
    icon: '🔥',
    soundType: 'fireplace',
    accent: 'text-orange-400',
    bgGradient: 'from-orange-950/60 to-slate-900/80'
  },
  {
    id: 'cozy-cafe',
    title: 'Cafeteria & Estudo',
    subtitle: 'Murmúrio acolhedor e xícaras de café',
    category: 'Aconchego',
    icon: '☕',
    soundType: 'cafe',
    accent: 'text-amber-300',
    bgGradient: 'from-yellow-950/60 to-slate-900/80'
  },
  {
    id: 'ocean-waves',
    title: 'Ondas do Mar & Praia',
    subtitle: 'Maré suave quebrando na praia',
    category: 'Água & Mar',
    icon: '🌊',
    soundType: 'waves',
    accent: 'text-cyan-400',
    bgGradient: 'from-cyan-950/60 to-slate-900/80'
  },
  {
    id: 'water-stream',
    title: 'Riacho de Água Fresca',
    subtitle: 'Correnteza fluindo por pedras lisas',
    category: 'Água & Mar',
    icon: '💧',
    soundType: 'stream',
    accent: 'text-teal-400',
    bgGradient: 'from-teal-950/60 to-slate-900/80'
  },
  {
    id: 'night-crickets',
    title: 'Noite Estrelada & Grilos',
    subtitle: 'Paz noturna com grilos e silêncio',
    category: 'Noite & Paz',
    icon: '🌌',
    soundType: 'night',
    accent: 'text-purple-400',
    bgGradient: 'from-purple-950/60 to-slate-900/80'
  }
];

export const AmbientSoundView: React.FC<AmbientSoundViewProps> = ({
  ambientState,
  isHost,
  localVolume,
  isLocalMuted,
  onVolumeChange,
  onToggleMuteLocal,
  onControlAmbient
}) => {
  const [customUrl, setCustomUrl] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const handleSelectPreset = (preset: AmbientPreset) => {
    if (!isHost) return;
    onControlAmbient('set_track', {
      trackId: preset.id,
      title: preset.title,
      category: preset.category,
      icon: preset.icon,
      soundType: preset.soundType
    });
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isHost || !customUrl.trim()) return;
    onControlAmbient('set_track', {
      trackId: `custom-${Date.now()}`,
      title: customTitle.trim() || 'Áudio Ambiente Personalizado',
      category: 'Personalizado',
      icon: '🎧',
      soundType: 'custom',
      audioUrl: customUrl.trim()
    });
    setCustomUrl('');
    setCustomTitle('');
    setShowCustomInput(false);
  };

  const currentPreset = AMBIENT_PRESETS.find(p => p.soundType === ambientState.soundType) || {
    id: ambientState.trackId,
    title: ambientState.title,
    subtitle: 'Áudio ambiente ativo na sala',
    category: ambientState.category || 'Geral',
    icon: ambientState.icon || '🌧️',
    soundType: ambientState.soundType,
    accent: 'text-indigo-400',
    bgGradient: 'from-indigo-950/60 to-slate-900/80'
  };

  return (
    <div className="flex flex-col h-full bg-slate-950/80 rounded-2xl border border-slate-800/80 overflow-hidden shadow-2xl relative">
      {/* Header Banner */}
      <div className="p-3 sm:p-4 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-950/80 border border-indigo-700/40 flex items-center justify-center text-xl shadow-inner">
            {ambientState.icon || '🌧️'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-wide">Áudios de Ambiente</h2>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                ambientState.isPlaying 
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 animate-pulse'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                {ambientState.isPlaying ? 'Tocando no fundo' : 'Pausado'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {isHost ? 'Você é o moderador: selecione e comande o som de fundo da sala' : 'Sons de fundo controlados pelo moderador'}
            </p>
          </div>
        </div>

        {/* Play/Pause & Volume for Host */}
        <div className="flex items-center gap-2">
          {isHost && (
            <button
              onClick={() => onControlAmbient(ambientState.isPlaying ? 'pause' : 'play')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-md ${
                ambientState.isPlaying
                  ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-950/40'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/40'
              }`}
            >
              {ambientState.isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>Pausar Sala</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Tocar Sala</span>
                </>
              )}
            </button>
          )}

          {/* Personal volume balance */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 px-2.5 py-1.5 rounded-xl">
            <button
              onClick={onToggleMuteLocal}
              className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              title={isLocalMuted ? 'Desmutar ambiente local' : 'Mutar ambiente local'}
            >
              {isLocalMuted || localVolume === 0 ? (
                <VolumeX className="w-3.5 h-3.5 text-rose-400" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={isLocalMuted ? 0 : localVolume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="w-16 h-1.5 accent-indigo-500 cursor-pointer"
              title={`Seu volume: ${Math.round((isLocalMuted ? 0 : localVolume) * 100)}%`}
            />
            <span className="text-[10px] text-slate-400 font-mono w-6 text-right">
              {Math.round((isLocalMuted ? 0 : localVolume) * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* Currently Playing Card */}
      <div className="p-3 sm:p-4 bg-slate-900/50 border-b border-slate-800/80 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <span className="text-3xl">{currentPreset.icon}</span>
            {ambientState.isPlaying && (
              <span className="absolute -bottom-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            )}
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-300">Ambiente Selecionado:</div>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <span>{ambientState.title}</span>
              <span className="text-[10px] font-normal text-slate-400 px-2 py-0.5 bg-slate-800/80 rounded-full">
                {currentPreset.category}
              </span>
            </div>
          </div>
        </div>

        {/* Ambient Soundwave Bars animation */}
        {ambientState.isPlaying && (
          <div className="flex items-end gap-1 h-6 px-2">
            <span className="w-1 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s] h-4"></span>
            <span className="w-1 bg-indigo-300 rounded-full animate-bounce [animation-delay:-0.15s] h-6"></span>
            <span className="w-1 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.4s] h-3"></span>
            <span className="w-1 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.2s] h-5"></span>
            <span className="w-1 bg-indigo-300 rounded-full animate-bounce [animation-delay:-0.35s] h-4"></span>
          </div>
        )}
      </div>

      {/* Presets Grid */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 min-h-0 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Biblioteca de Sons Ambientes ({AMBIENT_PRESETS.length})</span>
          </h3>

          {isHost && (
            <button
              onClick={() => setShowCustomInput(!showCustomInput)}
              className="text-xs font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Link Próprio (URL)</span>
            </button>
          )}
        </div>

        {/* Custom Stream URL Input if open */}
        {showCustomInput && isHost && (
          <form onSubmit={handleAddCustom} className="p-3 bg-slate-900 border border-indigo-700/40 rounded-xl space-y-2 animate-in fade-in">
            <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-indigo-400" />
              <span>Adicionar Stream / Áudio Personalizado (MP3/AAC):</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="Nome do áudio (ex: Chuva no Japão)"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <input
                type="url"
                required
                placeholder="https://.../audio.mp3"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                className="flex-2 px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold cursor-pointer shrink-0"
              >
                Tocar URL
              </button>
            </div>
          </form>
        )}

        {/* Presets List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {AMBIENT_PRESETS.map((preset) => {
            const isCurrent = ambientState.soundType === preset.soundType;

            return (
              <div
                key={preset.id}
                onClick={() => handleSelectPreset(preset)}
                className={`p-3 rounded-xl border transition-all text-left relative overflow-hidden flex flex-col justify-between group ${
                  isCurrent
                    ? 'border-indigo-500/80 bg-indigo-950/40 shadow-lg ring-1 ring-indigo-500/50'
                    : 'border-slate-800/80 bg-slate-900/60 hover:bg-slate-900 hover:border-slate-700/80'
                } ${isHost ? 'cursor-pointer hover:scale-[1.01]' : 'cursor-default'}`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl shrink-0 group-hover:scale-110 transition-transform">
                      {preset.icon}
                    </span>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>{preset.title}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 line-clamp-1">{preset.subtitle}</div>
                    </div>
                  </div>

                  {isCurrent && (
                    <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping shrink-0" />
                  )}
                </div>

                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/60 text-[10px]">
                  <span className="text-slate-400">{preset.category}</span>
                  {isHost ? (
                    <span className={`font-semibold ${isCurrent ? 'text-indigo-300' : 'text-slate-400 group-hover:text-white'}`}>
                      {isCurrent ? (ambientState.isPlaying ? 'Ativo ▶' : 'Selecionado') : 'Escolher'}
                    </span>
                  ) : (
                    <span className="text-slate-500 font-medium">
                      {isCurrent ? 'Ouvindo agora' : 'Disponível'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
