import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  SkipForward, 
  Volume2, 
  VolumeX, 
  Disc3, 
  Plus, 
  ExternalLink, 
  ListMusic, 
  Sparkles, 
  Link as LinkIcon, 
  HeartHandshake, 
  Check, 
  X, 
  Clock, 
  Music,
  Share2,
  Loader2,
  FolderDown,
  Layers,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import type { MusicState, MusicTrack } from '../../shared/types.js';

interface MusicViewProps {
  musicState: MusicState;
  isHost: boolean;
  myNickname: string;
  myUserId: string;
  localVolume: number;
  isLocalMuted: boolean;
  onVolumeChange: (vol: number) => void;
  onToggleMuteLocal: () => void;
  onControlMusic: (
    action: 'play' | 'pause' | 'seek' | 'change_track' | 'add_queue' | 'request_song' | 'approve_request' | 'reject_request' | 'toggle_requests' | 'import_playlist',
    track?: MusicTrack,
    position?: number,
    requestId?: string,
    extra?: {
      tracks?: MusicTrack[];
      playlistName?: string;
      playlistCover?: string;
      playlistUrl?: string;
      spotifyEmbedUri?: string;
    }
  ) => void;
}

// Popular sample playlists for quick 1-click import and testing
const SAMPLE_PLAYLISTS = [
  {
    name: 'Top Brasil',
    url: 'https://open.spotify.com/playlist/37i9dQZF1DX0FOF1IUWK1W',
    category: 'Pop & Hits'
  },
  {
    name: 'Lofi Chill Beats',
    url: 'https://open.spotify.com/playlist/37i9dQZF1DXdLEN7aqioXM',
    category: 'Relax & Foco'
  },
  {
    name: "Today's Top Hits",
    url: 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M',
    category: 'Global'
  },
  {
    name: 'Rock Classics',
    url: 'https://open.spotify.com/playlist/37i9dQZF1DWXRqgorJj26U',
    category: 'Rock'
  }
];

export const MusicView: React.FC<MusicViewProps> = ({
  musicState,
  isHost,
  myNickname,
  myUserId,
  localVolume,
  isLocalMuted,
  onVolumeChange,
  onToggleMuteLocal,
  onControlMusic
}) => {
  const [spotifyInputUrl, setSpotifyInputUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'playlist' | 'requests' | 'import'>('playlist');
  const [currentDisplayPos, setCurrentDisplayPos] = useState(0);
  const [requestedSuccess, setRequestedSuccess] = useState<string | null>(null);
  const [showEmbedPlayer, setShowEmbedPlayer] = useState(true);
  const [coverError, setCoverError] = useState(false);

  // Full tracklist includes the current track + the queued tracks
  const allTracks: MusicTrack[] = [
    ...(musicState.currentTrack ? [musicState.currentTrack] : []),
    ...(musicState.queue || [])
  ];

  // Reset cover error when track changes
  useEffect(() => {
    setCoverError(false);
  }, [musicState.currentTrack?.coverArt, musicState.playlistCover]);

  // Smooth position progress ticker
  useEffect(() => {
    let animId: number;
    const tick = () => {
      if (musicState.isPlaying) {
        const elapsed = (Date.now() - musicState.updatedAt) / 1000;
        const dur = musicState.currentTrack?.duration || 3600;
        const pos = Math.min(dur, musicState.position + elapsed);
        setCurrentDisplayPos(pos);
      } else {
        setCurrentDisplayPos(musicState.position);
      }
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [musicState.isPlaying, musicState.position, musicState.updatedAt, musicState.currentTrack]);

  const handleTogglePlay = () => {
    if (!isHost) return;
    if (musicState.isPlaying) {
      onControlMusic('pause');
    } else {
      onControlMusic('play');
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isHost) return;
    const pos = parseFloat(e.target.value);
    onControlMusic('seek', undefined, pos);
  };

  // Import Spotify playlist or track via backend resolver
  const handleImportPlaylist = async (urlToImport?: string) => {
    const targetUrl = (urlToImport || spotifyInputUrl).trim();
    if (!targetUrl) return;

    setIsImporting(true);
    setImportError(null);

    try {
      const response = await fetch('/api/spotify/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Falha ao importar playlist do Spotify.');
      }

      if (isHost) {
        // Host imports playlist directly to room
        onControlMusic(
          'import_playlist',
          data.tracks[0],
          0,
          undefined,
          {
            tracks: data.tracks,
            playlistName: data.title,
            playlistCover: data.coverArt,
            playlistUrl: targetUrl,
            spotifyEmbedUri: data.embedUrl
          }
        );
        setActiveTab('playlist');
        setSpotifyInputUrl('');
      } else {
        // Guest suggests/requests the playlist or song
        if (data.tracks.length > 0) {
          onControlMusic('request_song', data.tracks[0]);
          setRequestedSuccess(data.tracks[0].title);
          setTimeout(() => setRequestedSuccess(null), 4000);
        }
        setSpotifyInputUrl('');
      }
    } catch (err: any) {
      console.error('Import failed:', err);
      setImportError(err.message || 'Erro ao carregar o link do Spotify.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleRequestTrack = (track: MusicTrack) => {
    onControlMusic('request_song', track);
    setRequestedSuccess(track.title);
    setTimeout(() => setRequestedSuccess(null), 4000);
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const duration = musicState.currentTrack?.duration || 240;
  const requestsCount = musicState.songRequests?.length || 0;

  // Cover image fallback
  const displayCover = !coverError && (musicState.currentTrack?.coverArt || musicState.playlistCover)
    ? (musicState.currentTrack?.coverArt || musicState.playlistCover)
    : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&h=500&fit=crop';

  return (
    <div className="flex flex-col h-full gap-3 sm:gap-4 max-w-5xl mx-auto p-2 sm:p-3 overflow-y-auto">
      {/* Toast confirmation for song request */}
      {requestedSuccess && (
        <div className="bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 px-3.5 py-2 rounded-xl text-xs flex items-center gap-2 shadow-lg animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Música <strong>"{requestedSuccess}"</strong> pedida com sucesso! O moderador foi notificado.</span>
        </div>
      )}

      {/* Moderator Role Banner */}
      <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 text-xs text-indigo-300">
        <div className="flex items-center gap-2 truncate">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 animate-pulse" />
          <span className="truncate">
            {isHost
              ? '👑 Você é o Moderador: Importe playlists, controle a reprodução e gerencie a fila.'
              : '🎧 Sala sincronizada com o Moderador. Você pode pedir músicas da playlist!'}
          </span>
        </div>

        {/* Guest Requests toggle for Host */}
        {isHost && (
          <button
            onClick={() => onControlMusic('toggle_requests')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer shrink-0 ml-2 ${
              musicState.allowGuestRequests !== false
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
            title="Permitir que os hóspedes sugiram e peçam músicas"
          >
            <HeartHandshake className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              Pedidos: {musicState.allowGuestRequests !== false ? 'Ativos' : 'Bloqueados'}
            </span>
          </button>
        )}
      </div>

      {/* Main Player Display Card with Playlist & Track Info */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col md:flex-row items-center gap-5 sm:gap-7 relative overflow-hidden shrink-0">
        <div
          className="absolute -top-24 -left-24 w-72 h-72 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ backgroundColor: '#10b981' }}
        />

        {/* High-res Album / Playlist Cover Art */}
        <div className="relative shrink-0">
          <div
            className={`w-28 h-28 sm:w-44 sm:h-44 rounded-2xl overflow-hidden shadow-2xl border border-slate-700/80 bg-slate-950 flex items-center justify-center transition-all ${
              musicState.isPlaying ? 'shadow-[0_0_30px_rgba(16,185,129,0.3)] ring-2 ring-emerald-500/30' : ''
            }`}
          >
            <img
              src={displayCover}
              alt={musicState.currentTrack?.title || 'Capa'}
              referrerPolicy="no-referrer"
              onError={() => setCoverError(true)}
              className="w-full h-full object-cover"
            />
          </div>

          <div
            className={`absolute -bottom-2 -right-2 p-2 rounded-full bg-slate-950 border border-slate-800 text-emerald-400 shadow-lg ${
              musicState.isPlaying ? 'animate-spin' : ''
            }`}
            style={{ animationDuration: '6s' }}
          >
            <Disc3 className="w-4 h-4" />
          </div>
        </div>

        {/* Player Controls & Rich Info */}
        <div className="flex-1 w-full space-y-3.5">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-emerald-400 mb-1">
              <span className="flex items-center gap-1.5">
                <Music className="w-3.5 h-3.5" />
                {musicState.playlistName || 'Playlist Spotify'}
              </span>

              {allTracks.length > 0 && (
                <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700">
                  {allTracks.length} faixas importadas
                </span>
              )}

              {musicState.currentTrack?.requestedBy && (
                <span className="text-[10px] text-pink-400 bg-pink-950/40 px-2 py-0.5 rounded-full border border-pink-500/30">
                  Pedida por: {musicState.currentTrack.requestedBy.nickname}
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-white truncate">
              {musicState.currentTrack?.title || 'Nenhuma playlist importada'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5 truncate">
              {musicState.currentTrack?.artist || 'Importe um link do Spotify para começar a ouvir'}
            </p>
          </div>

          {/* Timeline Scrub Bar */}
          <div className="space-y-1">
            <input
              type="range"
              min="0"
              max={duration}
              step="1"
              value={currentDisplayPos}
              onChange={handleSeek}
              disabled={!isHost || !musicState.currentTrack}
              className="w-full accent-emerald-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer disabled:cursor-not-allowed"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500 tabular-nums">
              <span>{formatSeconds(currentDisplayPos)}</span>
              <span>{formatSeconds(duration)}</span>
            </div>
          </div>

          {/* Playback Controls & Local Volume */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2.5">
              <button
                onClick={handleTogglePlay}
                disabled={!isHost || !musicState.currentTrack}
                className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all shadow-md ${
                  isHost && musicState.currentTrack
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer hover:scale-105 active:scale-95'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
                title={isHost ? (musicState.isPlaying ? 'Pausar' : 'Tocar') : 'Apenas o moderador controla a reprodução'}
              >
                {musicState.isPlaying ? (
                  <Pause className="w-5 h-5 fill-current" />
                ) : (
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                )}
              </button>

              {isHost && (
                <button
                  onClick={() => {
                    if (musicState.queue.length > 0) {
                      onControlMusic('change_track', musicState.queue[0]);
                    }
                  }}
                  disabled={musicState.queue.length === 0}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  title="Próxima faixa"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
              )}

              {musicState.spotifyEmbedUri && (
                <button
                  onClick={() => setShowEmbedPlayer(!showEmbedPlayer)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1 transition-colors cursor-pointer"
                  title="Exibir ou ocultar reprodutor Spotify oficial"
                >
                  <Disc3 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">Player Embed</span>
                  {showEmbedPlayer ? <ChevronUp className="w-3 h-3 ml-0.5" /> : <ChevronDown className="w-3 h-3 ml-0.5" />}
                </button>
              )}
            </div>

            {/* Individual Local Volume for this user */}
            <div className="flex items-center gap-2 bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800">
              <button
                onClick={onToggleMuteLocal}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                title={isLocalMuted ? 'Desmutar' : 'Mutar som individual'}
              >
                {isLocalMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isLocalMuted ? 0 : localVolume}
                onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                className="w-16 sm:w-20 accent-emerald-500 bg-slate-800 h-1.5 rounded cursor-pointer"
                title="Seu volume individual"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Official Spotify Web Player Embed (Synchronized with Room) */}
      {showEmbedPlayer && (musicState.spotifyEmbedUri || musicState.playlistUrl) && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-lg space-y-2 shrink-0 animate-in fade-in">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span className="font-semibold text-white flex items-center gap-1.5">
              <ExternalLink className="w-3.5 h-3.5 text-emerald-400" /> Reprodutor Spotify da Sala
            </span>
            {musicState.playlistUrl && (
              <a
                href={musicState.playlistUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-emerald-400 hover:underline flex items-center gap-1"
              >
                <span>Abrir no App do Spotify</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
          <iframe
            src={
              musicState.spotifyEmbedUri ||
              `https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M?utm_source=generator&theme=0`
            }
            width="100%"
            height="152"
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            className="rounded-xl w-full"
          />
        </div>
      )}

      {/* Navigation Tabs: Músicas da Playlist | Pedidos dos Hóspedes | Importar Spotify */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 shrink-0">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveTab('playlist')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'playlist'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <ListMusic className="w-3.5 h-3.5" />
            <span>Músicas da Playlist ({allTracks.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('requests')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 relative ${
              activeTab === 'requests'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <HeartHandshake className="w-3.5 h-3.5" />
            <span>Músicas Pedidas</span>
            {requestsCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-pink-500 text-white text-[10px] font-bold flex items-center justify-center ml-0.5">
                {requestsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('import')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'import'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <FolderDown className="w-3.5 h-3.5" />
            <span>{isHost ? 'Importar Playlist' : 'Sugerir Link Spotify'}</span>
          </button>
        </div>
      </div>

      {/* TAB 1: MÚSICAS DA PLAYLIST (FULL TRACKLIST DISPLAY FOR HOST & GUESTS) */}
      {activeTab === 'playlist' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-4 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-300 font-semibold border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>
                {musicState.playlistName ? `Faixas de "${musicState.playlistName}"` : 'Faixas da Sala'}
              </span>
            </div>
            <span className="font-mono text-slate-500 text-[11px]">{allTracks.length} músicas</span>
          </div>

          {allTracks.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-500 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center mx-auto text-emerald-400">
                <Music className="w-6 h-6" />
              </div>
              <div>
                <p className="font-medium text-slate-300 text-sm">Nenhuma playlist importada ainda.</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {isHost
                    ? 'Importe o link de uma playlist do Spotify para carregar todas as músicas.'
                    : 'Aguarde o moderador importar uma playlist ou sugira uma abaixo.'}
                </p>
              </div>
              <button
                onClick={() => setActiveTab('import')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer shadow inline-flex items-center gap-1.5"
              >
                <FolderDown className="w-4 h-4" />
                <span>{isHost ? 'Importar Playlist do Spotify' : 'Sugerir Música'}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
              {allTracks.map((track, idx) => {
                const isCurrentlyPlaying = musicState.currentTrack?.id === track.id;

                return (
                  <div
                    key={`${track.id}-${idx}`}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-colors ${
                      isCurrentlyPlaying
                        ? 'bg-emerald-950/40 border-emerald-500/40 shadow-sm'
                        : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 truncate">
                      <span className="font-mono text-slate-500 text-[11px] w-5 text-center shrink-0">
                        {isCurrentlyPlaying ? (
                          <Disc3 className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                        ) : (
                          idx + 1
                        )}
                      </span>

                      <img
                        src={track.coverArt || displayCover}
                        alt={track.title}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-lg object-cover shrink-0 border border-slate-800"
                      />

                      <div className="truncate">
                        <div
                          className={`font-semibold truncate ${
                            isCurrentlyPlaying ? 'text-emerald-300' : 'text-slate-200'
                          }`}
                        >
                          {track.title}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate flex items-center gap-1.5">
                          <span>{track.artist}</span>
                          {track.requestedBy && (
                            <span className="text-pink-400 font-medium">
                              · Pedida por {track.requestedBy.nickname}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="text-[11px] font-mono text-slate-500 hidden sm:inline">
                        {formatSeconds(track.duration)}
                      </span>

                      {isHost ? (
                        <button
                          onClick={() => onControlMusic('change_track', track)}
                          className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1 ${
                            isCurrentlyPlaying
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white'
                          }`}
                          title={isCurrentlyPlaying ? 'Tocando agora' : 'Tocar agora para a sala'}
                        >
                          {isCurrentlyPlaying ? (
                            <>
                              <Disc3 className="w-3 h-3 text-emerald-400" />
                              <span>Tocando</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3 h-3 fill-current" />
                              <span>Tocar</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRequestTrack(track)}
                          className="px-2.5 py-1 bg-pink-600/30 hover:bg-pink-600 text-pink-200 hover:text-white rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1"
                          title="Pedir para o moderador tocar esta música"
                        >
                          <HeartHandshake className="w-3 h-3" />
                          <span>Pedir</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PEDIDOS DE MÚSICAS DOS HÓSPEDES */}
      {activeTab === 'requests' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-300 font-semibold border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <HeartHandshake className="w-4 h-4 text-pink-400" />
              <span>Músicas Solicitadas pelos Participantes</span>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">{requestsCount} pedidos pendentes</span>
          </div>

          {requestsCount === 0 ? (
            <div className="text-center py-10 text-xs text-slate-500 space-y-2">
              <HeartHandshake className="w-10 h-10 mx-auto text-slate-600" />
              <p className="font-medium text-slate-300">Nenhum pedido de música pendente.</p>
              <p className="text-[11px] text-slate-500">
                Os hóspedes podem pedir qualquer música da playlist ou colar um link do Spotify.
              </p>
              <button
                onClick={() => setActiveTab('import')}
                className="text-emerald-400 hover:underline cursor-pointer text-xs mt-1"
              >
                Pedir uma música agora
              </button>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {musicState.songRequests.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-pink-500/20 text-xs transition-colors"
                >
                  <div className="flex items-center gap-3 truncate">
                    <img
                      src={req.coverArt || displayCover}
                      alt={req.title}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-lg object-cover shrink-0 border border-slate-800"
                    />
                    <div className="truncate">
                      <div className="font-semibold text-white truncate">{req.title}</div>
                      <div className="text-[11px] text-slate-400 truncate">{req.artist}</div>
                      <div className="text-[10px] text-pink-400 font-medium mt-0.5">
                        Pedido por: <strong>{req.requestedBy?.nickname || 'Hóspede'}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0 ml-3">
                    {isHost ? (
                      <>
                        <button
                          onClick={() => onControlMusic('change_track', req)}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1"
                          title="Tocar agora imediatamente"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>Tocar</span>
                        </button>
                        <button
                          onClick={() => onControlMusic('approve_request', undefined, undefined, req.id)}
                          className="p-1.5 bg-emerald-600/30 text-emerald-300 hover:bg-emerald-600 hover:text-white rounded-lg transition-colors cursor-pointer"
                          title="Aprovar e adicionar à fila"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onControlMusic('reject_request', undefined, undefined, req.id)}
                          className="p-1.5 bg-slate-800 text-slate-400 hover:bg-rose-900/50 hover:text-rose-300 rounded-lg transition-colors cursor-pointer"
                          title="Recusar pedido"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <span className="text-[11px] text-amber-400 bg-amber-950/40 px-2 py-1 rounded-lg border border-amber-500/30">
                        Aguardando Moderador
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: IMPORTAR PLAYLIST DO SPOTIFY (ONLY SPOTIFY IMPORT AS REQUESTED) */}
      {activeTab === 'import' && (
        <div className="space-y-4">
          {/* Main Importer Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <FolderDown className="w-4 h-4 text-emerald-400" />
                <span>{isHost ? 'Importar Playlist ou Álbum do Spotify' : 'Sugerir Link do Spotify'}</span>
              </div>
              <span className="text-[11px] text-slate-400">
                {isHost ? 'Carrega capas, títulos e faixas' : 'Envia para aprovação do moderador'}
              </span>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleImportPlaylist();
              }}
              className="space-y-3"
            >
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <LinkIcon className="w-4 h-4 text-emerald-400" />
                  </div>
                  <input
                    type="text"
                    value={spotifyInputUrl}
                    onChange={(e) => setSpotifyInputUrl(e.target.value)}
                    placeholder="Cole o link (ex: https://open.spotify.com/playlist/...)"
                    className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!spotifyInputUrl.trim() || isImporting}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 shadow"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Carregando Playlist...</span>
                    </>
                  ) : (
                    <>
                      <FolderDown className="w-3.5 h-3.5" />
                      <span>{isHost ? 'Importar Playlist' : 'Sugerir Música'}</span>
                    </>
                  )}
                </button>
              </div>

              {importError && (
                <div className="p-2.5 rounded-xl bg-rose-950/70 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                  <X className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{importError}</span>
                </div>
              )}
            </form>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Cole o link de qualquer <strong>Playlist</strong>, <strong>Álbum</strong> ou <strong>Música</strong> pública do Spotify. O aplicativo extrai automaticamente as informações oficiais, capa de alta resolução e a lista completa de faixas.
            </p>
          </div>

          {/* Quick 1-Click Preset Playlists for Easy Testing */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Playlists Populares (Importação Rápida com 1 Clique)</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Clique em qualquer uma para importar imediatamente sem precisar abrir o Spotify:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {SAMPLE_PLAYLISTS.map((pl) => (
                <button
                  key={pl.name}
                  onClick={() => handleImportPlaylist(pl.url)}
                  disabled={isImporting}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-950 text-left transition-all cursor-pointer group"
                >
                  <div className="truncate">
                    <div className="text-xs font-semibold text-white group-hover:text-emerald-300 transition-colors truncate">
                      {pl.name}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">{pl.category}</div>
                  </div>

                  <div className="p-1.5 rounded-lg bg-slate-800 group-hover:bg-emerald-600 text-slate-300 group-hover:text-white transition-colors shrink-0 ml-2">
                    <FolderDown className="w-3.5 h-3.5" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
