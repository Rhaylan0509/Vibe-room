import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Sparkles, 
  ArrowRight, 
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';

interface JoinModalProps {
  initialRoomId: string;
  onJoin: (roomId: string, nickname: string, avatar: string, color: string) => void;
}

const AVATARS = ['🎧', '🦊', '🚀', '🎮', '🐱', '🎸', '⚡', '🍕', '🎨', '👾', '🦄', '☕'];
const COLORS = [
  '#6366f1', // Indigo
  '#ec4899', // Pink
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#06b6d4', // Cyan
  '#8b5cf6', // Violet
  '#ef4444'  // Rose
];

export const JoinModal: React.FC<JoinModalProps> = ({
  initialRoomId,
  onJoin
}) => {
  const [roomId, setRoomId] = useState(initialRoomId || '');
  const [nickname, setNickname] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('🎧');
  const [selectedColor, setSelectedColor] = useState('#6366f1');
  const [roomInfo, setRoomInfo] = useState<{ exists: boolean; count: number; max: number; isFull: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  // Randomize a nice nickname placeholder
  const placeholders = ['Lucas', 'Bia', 'Matheus', 'Camila', 'Gabriel', 'Larissa', 'Rafa'];
  const [randomPlaceholder] = useState(() => placeholders[Math.floor(Math.random() * placeholders.length)]);

  useEffect(() => {
    if (initialRoomId) {
      setRoomId(initialRoomId);
      fetch(`/api/room/${initialRoomId}`)
        .then((r) => r.json())
        .then((data) => setRoomInfo(data))
        .catch((err) => console.warn('Could not fetch room info:', err));
    } else {
      const generated = Math.random().toString(36).substring(2, 8);
      setRoomId(generated);
    }
  }, [initialRoomId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalNick = nickname.trim() || randomPlaceholder;
    const finalRoom = roomId.trim().toLowerCase() || Math.random().toString(36).substring(2, 8);
    setLoading(true);
    onJoin(finalRoom, finalNick, selectedAvatar, selectedColor);
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col justify-center items-center p-3 sm:p-4 py-8 overflow-y-auto relative">
      {/* Subtle ambient lighting */}
      <div className="absolute top-1/4 -left-32 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm sm:max-w-md bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-6 space-y-4 z-10 animate-in fade-in zoom-in-95 my-auto">
        {/* Header Wordmark */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[11px] font-semibold">
            <Sparkles className="w-3 h-3" />
            <span>Espaço Privado</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Vibe<span className="text-indigo-400">Room</span>
          </h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Sem cadastro. Até 6 amigos com voz anti-ruído, lousa, jogos e música sincronizada.
          </p>
        </div>

        {/* Room Capacity Status if joining existing */}
        {roomInfo && roomInfo.exists && (
          <div
            className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
              roomInfo.isFull
                ? 'bg-rose-950/30 border-rose-500/30 text-rose-300'
                : 'bg-indigo-950/30 border-indigo-500/30 text-indigo-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              <span>Sala #{roomId}</span>
            </div>
            <div className="font-mono font-bold text-[11px]">
              {roomInfo.count} / {roomInfo.max} vagas
            </div>
          </div>
        )}

        {roomInfo?.isFull && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-300">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>Sala lotada (limite de 6 pessoas). Crie uma nova sala para continuar.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Nickname & Room Code in a 2-col or clean compact stack */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300">
                Seu Apelido
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder={`Ex: ${randomPlaceholder}`}
                maxLength={20}
                autoFocus
                required
                className="w-full bg-slate-950 border border-slate-800 text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder-slate-600"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-300">
                Código da Sala
              </label>
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="sala-amigos"
                maxLength={18}
                required
                className="w-full bg-slate-950 border border-slate-800 text-white text-xs font-mono rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Compact Avatar Grid */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-300 flex items-center justify-between">
              <span>Avatar</span>
              <span className="text-[10px] text-slate-500 font-normal">Escolha um ícone</span>
            </label>
            <div className="grid grid-cols-6 gap-1.5">
              {AVATARS.map((av) => (
                <button
                  type="button"
                  key={av}
                  onClick={() => setSelectedAvatar(av)}
                  className={`h-9 rounded-xl text-base flex items-center justify-center transition-all cursor-pointer border ${
                    selectedAvatar === av
                      ? 'bg-indigo-600/30 border-indigo-400 scale-105 shadow-sm'
                      : 'bg-slate-950 border-slate-800/80 hover:bg-slate-800/60'
                  }`}
                  title={av}
                >
                  {av}
                </button>
              ))}
            </div>
          </div>

          {/* Compact Color Picker */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-300">
              Cor do Perfil
            </label>
            <div className="flex items-center justify-between gap-1.5 px-1">
              {COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setSelectedColor(c)}
                  className={`w-6 h-6 rounded-full border transition-transform cursor-pointer ${
                    selectedColor === c
                      ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-slate-900 border-white'
                      : 'border-slate-800 hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          </div>

          {/* Submit Action Button - Always visible, never cut off! */}
          <button
            type="submit"
            disabled={loading || (roomInfo?.isFull && initialRoomId === roomId)}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold text-xs rounded-xl transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer mt-3"
          >
            <span>{initialRoomId ? 'Entrar na Sala Agora' : 'Criar Sala Privada'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Minimal Footer Info */}
        <div className="text-center text-[10px] text-slate-500 flex items-center justify-center gap-1.5 pt-1">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
          <span>Basta compartilhar o link com até 5 amigos</span>
        </div>
      </div>
    </div>
  );
};
