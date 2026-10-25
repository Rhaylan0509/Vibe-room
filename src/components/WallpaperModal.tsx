import React, { useState } from 'react';
import { 
  Image, 
  Sparkles, 
  Check, 
  X, 
  Link as LinkIcon, 
  Crown,
  Monitor
} from 'lucide-react';

export interface WallpaperOption {
  id: string;
  title: string;
  category: 'Paisagem' | 'Aesthetic & GIF' | 'Minimalista';
  url: string;
  isGif?: boolean;
}

export const WALLPAPER_PRESETS: WallpaperOption[] = [
  {
    id: 'rainy-cafe',
    title: 'Chuva na Janela & Café',
    category: 'Aesthetic & GIF',
    url: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=1920&q=80'
  },
  {
    id: 'sakura-blossoms',
    title: 'Cerejeiras Sakura no Japão',
    category: 'Paisagem',
    url: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?w=1920&q=80'
  },
  {
    id: 'aurora-borealis',
    title: 'Aurora Boreal & Céu Estrelado',
    category: 'Paisagem',
    url: 'https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?w=1920&q=80'
  },
  {
    id: 'cyber-sunset',
    title: 'Pôr do Sol Synthwave Neon',
    category: 'Aesthetic & GIF',
    url: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=1920&q=80'
  },
  {
    id: 'alpine-lake',
    title: 'Montanhas Alpinas & Lago Sereno',
    category: 'Paisagem',
    url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1920&q=80'
  },
  {
    id: 'misty-forest',
    title: 'Floresta Mística e Névoa',
    category: 'Paisagem',
    url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1920&q=80'
  },
  {
    id: 'tokyo-night',
    title: 'Metrópole Noturna de Tóquio',
    category: 'Paisagem',
    url: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=1920&q=80'
  },
  {
    id: 'cozy-fireplace',
    title: 'Fogueira Quente de Inverno',
    category: 'Aesthetic & GIF',
    url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1920&q=80'
  },
  {
    id: 'tropical-sunset',
    title: 'Pôr do Sol na Praia Tropical',
    category: 'Paisagem',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920&q=80'
  },
  {
    id: 'space-nebula',
    title: 'Galáxia Cósmica e Estrelas',
    category: 'Paisagem',
    url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1920&q=80'
  },
  {
    id: 'classic-dark',
    title: 'Vibe Dark Minimalista',
    category: 'Minimalista',
    url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=1920&q=80'
  }
];

interface WallpaperModalProps {
  isOpen: boolean;
  currentWallpaper: string;
  isHost: boolean;
  onClose: () => void;
  onSelectWallpaper: (url: string, broadcastToRoom: boolean) => void;
}

export const WallpaperModal: React.FC<WallpaperModalProps> = ({
  isOpen,
  currentWallpaper,
  isHost,
  onClose,
  onSelectWallpaper
}) => {
  const [customInput, setCustomInput] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'Todos' | 'Paisagem' | 'Aesthetic & GIF' | 'Minimalista'>('Todos');
  const [broadcastRoom, setBroadcastRoom] = useState(isHost);

  if (!isOpen) return null;

  const filtered = selectedFilter === 'Todos'
    ? WALLPAPER_PRESETS
    : WALLPAPER_PRESETS.filter(p => p.category === selectedFilter);

  const handleApply = (url: string) => {
    onSelectWallpaper(url, broadcastRoom && isHost);
    onClose();
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInput.trim()) return;
    onSelectWallpaper(customInput.trim(), broadcastRoom && isHost);
    setCustomInput('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-900/60 border border-indigo-700/50 flex items-center justify-center text-indigo-300">
              <Monitor className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Personalizar Fundo da Área de Trabalho</span>
              </h3>
              <p className="text-xs text-slate-400">Escolha paisagens de tirar o fôlego ou insira um GIF animado</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Categories Bar & Broadcast Toggle */}
        <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {(['Todos', 'Paisagem', 'Aesthetic & GIF', 'Minimalista'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedFilter(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  selectedFilter === cat
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {isHost && (
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none bg-slate-950/70 px-2.5 py-1 rounded-lg border border-slate-800">
              <input
                type="checkbox"
                checked={broadcastRoom}
                onChange={(e) => setBroadcastRoom(e.target.checked)}
                className="w-3.5 h-3.5 accent-indigo-600 cursor-pointer rounded"
              />
              <Crown className="w-3 h-3 text-amber-400" />
              <span>Mudar para toda a sala</span>
            </label>
          )}
        </div>

        {/* Wallpaper Grid */}
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 sm:grid-cols-3 gap-3 min-h-0">
          {filtered.map((item) => {
            const isSelected = currentWallpaper === item.url;

            return (
              <div
                key={item.id}
                onClick={() => handleApply(item.url)}
                className={`group relative rounded-xl overflow-hidden aspect-video border cursor-pointer transition-all ${
                  isSelected
                    ? 'border-indigo-500 ring-2 ring-indigo-500/80 shadow-lg scale-[1.02]'
                    : 'border-slate-800 hover:border-slate-600 hover:scale-[1.02]'
                }`}
              >
                <img
                  src={item.url}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  loading="lazy"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent flex flex-col justify-end p-2.5">
                  <div className="text-xs font-bold text-white drop-shadow truncate">{item.title}</div>
                  <div className="text-[10px] text-indigo-300 font-medium">{item.category}</div>
                </div>

                {isSelected && (
                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Custom URL Input Footer */}
        <form onSubmit={handleCustomSubmit} className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2 shrink-0">
          <LinkIcon className="w-4 h-4 text-indigo-400 shrink-0 ml-1" />
          <input
            type="url"
            placeholder="Ou cole a URL direta de qualquer imagem ou GIF animado..."
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold cursor-pointer shrink-0 transition-colors"
          >
            Aplicar Link
          </button>
        </form>
      </div>
    </div>
  );
};
