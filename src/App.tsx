import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Sparkles,
  AlertCircle,
  MessageSquare,
  X,
  Radio,
  Volume2,
  Monitor
} from 'lucide-react';
import type { 
  RoomState, 
  RoomMode, 
  ChatMessage, 
  DrawStroke, 
  DrawPoint,
  DrawCursor, 
  MusicTrack, 
  AmbientSoundState,
  AmbientSoundType,
  GameState,
  ServerEvent,
  ReactionType
} from '../shared/types.js';
import { wsClient } from './services/websocket';
import { audioMesh } from './services/audioMesh';
import { ambientSound } from './services/ambientAudio';
import { TopBar } from './components/TopBar';
import { UserBar } from './components/UserBar';
import { ChatView } from './components/ChatView';
import { DrawingView } from './components/DrawingView';
import { GamesView } from './components/GamesView';
import { MusicView } from './components/MusicView';
import { AmbientSoundView } from './components/AmbientSoundView';
import { DesktopWorkspace } from './components/WindowManager/DesktopWorkspace';
import { WallpaperModal } from './components/WallpaperModal';
import { HostTransferModal } from './components/HostTransferModal';
import { JoinModal } from './components/JoinModal';

export default function App() {
  // Room identity & join state
  const [initialRoomId, setInitialRoomId] = useState<string>('');
  const [isJoined, setIsJoined] = useState(false);
  const [myUserId, setMyUserId] = useState('');
  const [myNickname, setMyNickname] = useState('');
  const [myAvatar, setMyAvatar] = useState('🎧');
  const [myColor, setMyColor] = useState('#6366f1');

  // Room authoritative state
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [strokes, setStrokes] = useState<DrawStroke[]>([]);
  const [liveStrokes, setLiveStrokes] = useState<Record<string, DrawStroke>>({});
  const [remoteCursors, setRemoteCursors] = useState<Record<string, DrawCursor>>({});

  // Ambient sound local state
  const [localAmbientVolume, setLocalAmbientVolume] = useState(0.6);
  const [isLocalAmbientMuted, setIsLocalAmbientMuted] = useState(false);

  // Desktop Wallpaper state (scenic landscapes and animated GIFs)
  const [activeWallpaper, setActiveWallpaper] = useState(
    'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=1920&q=80'
  );

  // Voice local state
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Persistent synchronized room music player
  const globalAudioRef = useRef<HTMLAudioElement | null>(null);
  const [localMusicVolume, setLocalMusicVolume] = useState(0.8);
  const [isLocalMusicMuted, setIsLocalMusicMuted] = useState(false);
  const [needsAudioUnlock, setNeedsAudioUnlock] = useState(false);

  // Mobile chat overlay toggle (when in drawing, games or music mode)
  const [isMobileChatOpen, setIsMobileChatOpen] = useState(false);

  // Modals & notifications
  const [isHostTransferOpen, setIsHostTransferOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Room reaction visual effects (background emotion pulse + rising emojis)
  const [activeReaction, setActiveReaction] = useState<{
    type: ReactionType;
    triggeredBy: string;
    id: number;
  } | null>(null);

  const [floatingEmojis, setFloatingEmojis] = useState<
    Array<{
      id: number;
      emoji: string;
      left: number;
      delay: number;
      duration: number;
      size: number;
    }>
  >([]);

  const reactionTimeoutRef = useRef<any>(null);

  // Check URL parameters for room link on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      setInitialRoomId(roomParam.trim().toLowerCase());
    } else if (window.location.hash) {
      setInitialRoomId(window.location.hash.replace('#', '').trim().toLowerCase());
    }
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  // Global persistent audio player synchronization
  useEffect(() => {
    const audio = globalAudioRef.current;
    if (!audio || !roomState?.music?.currentTrack) return;

    if (audio.src !== roomState.music.currentTrack.audioUrl) {
      audio.src = roomState.music.currentTrack.audioUrl;
    }

    audio.volume = isLocalMusicMuted ? 0 : localMusicVolume;

    if (roomState.music.isPlaying) {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setNeedsAudioUnlock(false);
          })
          .catch((err) => {
            console.warn('Autoplay blocked by browser policy:', err);
            setNeedsAudioUnlock(true);
          });
      }
    } else {
      audio.pause();
      setNeedsAudioUnlock(false);
    }
  }, [roomState?.music, localMusicVolume, isLocalMusicMuted]);

  const handleUnlockAudio = () => {
    const audio = globalAudioRef.current;
    if (audio) {
      audio.play()
        .then(() => setNeedsAudioUnlock(false))
        .catch((err) => console.warn('Audio unlock interaction failed:', err));
    }
    ambientSound.unlock().catch(() => {});
  };

  // Synchronize room ambient audio layer (rain, nature, wind, cafe, fireplace, etc.)
  useEffect(() => {
    if (!roomState?.ambientSound) return;
    const amb = roomState.ambientSound;

    if (amb.isPlaying) {
      const effectiveVol = isLocalAmbientMuted ? 0 : localAmbientVolume * (amb.volume ?? 0.6);
      ambientSound.startSound(amb.soundType, effectiveVol, amb.audioUrl);
    } else {
      ambientSound.stop();
    }
  }, [roomState?.ambientSound, localAmbientVolume, isLocalAmbientMuted]);

  // WebSocket event subscription
  useEffect(() => {
    const unsubscribe = wsClient.subscribe((event: ServerEvent) => {
      switch (event.type) {
        case 'room_joined': {
          setRoomState(event.room);
          setMyUserId(event.yourId);
          setIsJoined(true);
          setErrorMessage(null);
          if (event.room.desktopWallpaper) {
            setActiveWallpaper(event.room.desktopWallpaper);
          }

          // Update URL in browser history without reload
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.set('room', event.room.id);
          window.history.replaceState({}, '', newUrl.toString());

          // Initialize WebRTC Voice Mesh with integrated noise reduction
          audioMesh.initialize(event.yourId, {
            onSpeakingChange: (speaking) => {
              setIsSpeaking(speaking);
            },
            onRemoteTrack: (_userId, _stream) => {
              // Remote track received and played automatically
            },
            onPeerLeave: (userId) => {
              audioMesh.removePeer(userId);
            },
            onError: (err) => {
              console.warn('Audio mesh warning:', err);
            }
          }).then((hasMic) => {
            if (hasMic) {
              event.room.users.forEach((existingUser) => {
                if (existingUser.id !== event.yourId) {
                  audioMesh.connectToPeer(existingUser.id, true);
                }
              });
            }
          });
          break;
        }

        case 'room_error': {
          setErrorMessage(event.message);
          showToast(event.message);
          break;
        }

        case 'user_joined': {
          setRoomState((prev) => {
            if (!prev) return prev;
            if (prev.users.some((u) => u.id === event.user.id)) return prev;
            return {
              ...prev,
              users: [...prev.users, event.user]
            };
          });

          audioMesh.connectToPeer(event.user.id, false);
          break;
        }

        case 'user_left': {
          setRoomState((prev) => {
            if (!prev) return prev;
            const updatedUsers = prev.users.filter((u) => u.id !== event.userId);
            let nextHostId = prev.hostId;
            if (event.newHostId) {
              nextHostId = event.newHostId;
              updatedUsers.forEach((u) => {
                u.isHost = u.id === event.newHostId;
              });
            }
            return {
              ...prev,
              users: updatedUsers,
              hostId: nextHostId
            };
          });

          audioMesh.removePeer(event.userId);
          setRemoteCursors((prev) => {
            const next = { ...prev };
            delete next[event.userId];
            return next;
          });
          break;
        }

        case 'user_updated': {
          setRoomState((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              users: prev.users.map((u) =>
                u.id === event.user.id ? { ...u, ...event.user } : u
              )
            };
          });
          break;
        }

        case 'host_transferred': {
          setRoomState((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              hostId: event.newHostId,
              users: prev.users.map((u) => ({
                ...u,
                isHost: u.id === event.newHostId
              }))
            };
          });
          showToast('👑 Título de Moderador atualizado!');
          break;
        }

        case 'mode_changed': {
          setRoomState((prev) => {
            if (!prev) return prev;
            return { ...prev, mode: event.mode };
          });
          setIsMobileChatOpen(false);
          break;
        }

        case 'chat_message': {
          setRoomState((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              chat: [...prev.chat, event.message]
            };
          });
          break;
        }

        case 'draw_stroke': {
          setStrokes((prev) => [...prev, event.stroke]);
          setLiveStrokes((prev) => {
            const next = { ...prev };
            delete next[event.stroke.userId];
            return next;
          });
          break;
        }

        case 'draw_live_stroke': {
          setLiveStrokes((prev) => ({
            ...prev,
            [event.userId]: {
              id: event.strokeId,
              userId: event.userId,
              points: event.points,
              color: event.color,
              size: event.size,
              isEraser: event.isEraser
            }
          }));
          break;
        }

        case 'draw_cursor': {
          setRemoteCursors((prev) => ({
            ...prev,
            [event.cursor.userId]: event.cursor
          }));
          break;
        }

        case 'draw_cleared': {
          setStrokes([]);
          setLiveStrokes({});
          break;
        }

        case 'draw_history': {
          setStrokes(event.strokes);
          break;
        }

        case 'music_updated': {
          setRoomState((prev) => {
            if (!prev) return prev;
            return { ...prev, music: event.music };
          });
          break;
        }

        case 'ambient_updated': {
          setRoomState((prev) => {
            if (!prev) return prev;
            return { ...prev, ambientSound: event.ambient };
          });
          break;
        }

        case 'wallpaper_updated': {
          setActiveWallpaper(event.wallpaperUrl);
          showToast(`🎨 ${event.setBy} alterou o papel de parede da sala!`);
          break;
        }

        case 'game_updated': {
          setRoomState((prev) => {
            if (!prev) return prev;
            return { ...prev, game: event.game };
          });
          if (event.notification) {
            showToast(event.notification);
          }
          break;
        }

        case 'room_reaction': {
          const reactionType = event.reactionType;
          const emojiPools: Record<ReactionType, string[]> = {
            esquentando: ['🔥', '💥', '♨️', '🌶️', '❤️‍🔥', '🔥', '🔥'],
            comemoracao: ['🎉', '🎊', '🥳', '🍾', '✨', '🏆', '🎉', '🥂'],
            suspense: ['👀', '⚡', '🦇', '😱', '🎭', '🤫', '👀', '👁️'],
            risadas: ['😂', '🤣', '😆', '💀', '😹', '🤣', '😂', '😭']
          };

          const pool = emojiPools[reactionType] || emojiPools.comemoracao;
          const generated = Array.from({ length: 34 }).map((_, i) => ({
            id: Date.now() + i + Math.random(),
            emoji: pool[Math.floor(Math.random() * pool.length)],
            left: Math.floor(Math.random() * 92) + 4,
            delay: Number((Math.random() * 2.5).toFixed(2)),
            duration: Number((3.5 + Math.random() * 2.5).toFixed(2)),
            size: Math.floor(26 + Math.random() * 22)
          }));

          setActiveReaction({
            type: reactionType,
            triggeredBy: event.triggeredBy,
            id: Date.now()
          });
          setFloatingEmojis(generated);

          if (reactionTimeoutRef.current) clearTimeout(reactionTimeoutRef.current);
          reactionTimeoutRef.current = setTimeout(() => {
            setActiveReaction(null);
            setFloatingEmojis([]);
          }, 7500);

          break;
        }

        case 'webrtc_signal': {
          audioMesh.handleSignal(event.senderUserId, event.signal);
          break;
        }
      }
    });

    return () => {
      unsubscribe();
      if (reactionTimeoutRef.current) clearTimeout(reactionTimeoutRef.current);
    };
  }, [showToast]);

  const handleJoin = (roomId: string, nick: string, avatar: string, color: string) => {
    setMyNickname(nick);
    setMyAvatar(avatar);
    setMyColor(color);
    wsClient.connect(roomId, nick, avatar, color);
  };

  const handleLeave = () => {
    wsClient.disconnect();
    audioMesh.cleanup();
    ambientSound.stop();
    if (globalAudioRef.current) {
      globalAudioRef.current.pause();
    }
    setIsJoined(false);
    setRoomState(null);
    setStrokes([]);
    setLiveStrokes({});
    const url = new URL(window.location.href);
    url.searchParams.delete('room');
    window.history.replaceState({}, '', url.toString());
  };

  const isHost = !!(roomState && myUserId && roomState.hostId === myUserId);

  // Moderator actions
  const handleSetMode = (mode: RoomMode) => {
    wsClient.send({ type: 'set_mode', mode });
  };

  const handleTransferHost = (targetUserId: string) => {
    wsClient.send({ type: 'transfer_host', targetUserId });
  };

  const handleSendMessage = (text: string) => {
    wsClient.send({ type: 'send_chat', text });
  };

  const handleSendReaction = (reactionType: ReactionType) => {
    wsClient.send({ type: 'send_reaction', reactionType });
  };

  // Drawing actions
  const handleSendStroke = (stroke: DrawStroke) => {
    setStrokes((prev) => [...prev, stroke]);
    setLiveStrokes((prev) => {
      const next = { ...prev };
      delete next[stroke.userId];
      return next;
    });
    wsClient.send({ type: 'draw_stroke', stroke });
  };

  const handleSendLiveStroke = (
    strokeId: string,
    points: DrawPoint[],
    color: string,
    size: number,
    isEraser: boolean
  ) => {
    wsClient.send({
      type: 'draw_live_stroke',
      strokeId,
      points,
      color,
      size,
      isEraser
    });
  };

  const handleSendCursor = (cursor: DrawCursor) => {
    wsClient.send({ type: 'draw_cursor', cursor });
  };

  const handleClearDrawing = () => {
    setStrokes([]);
    setLiveStrokes({});
    wsClient.send({ type: 'draw_clear' });
  };

  // Ambient sound moderator controls
  const handleControlAmbient = (
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
  ) => {
    wsClient.send({
      type: 'ambient_control',
      action,
      ...(opts || {})
    });
  };

  // Wallpaper change
  const handleWallpaperChange = (url: string, broadcast: boolean) => {
    setActiveWallpaper(url);
    if (broadcast && isHost) {
      wsClient.send({ type: 'set_wallpaper', wallpaperUrl: url });
    }
  };

  // Music actions (open to guest requests and host controls)
  const handleMusicControl = (
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
  ) => {
    wsClient.send({
      type: 'music_control',
      action,
      track,
      position,
      requestId,
      ...(extra || {})
    });
  };

  // Game actions
  const handleGameAction = (actionPayload: any) => {
    wsClient.send({ type: 'game_control', ...actionPayload });
  };

  // Voice actions
  const handleToggleMute = () => {
    const muted = audioMesh.toggleMute();
    setIsMuted(muted);
  };

  const handleToggleDeafen = () => {
    const deafened = audioMesh.toggleDeafen();
    setIsDeafened(deafened);
  };

  // If not joined, show instant entry screen
  if (!isJoined || !roomState) {
    return (
      <JoinModal
        initialRoomId={initialRoomId}
        onJoin={handleJoin}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans select-none relative">
      {/* Global Synchronized Audio Element (Plays across all room modes!) */}
      <audio ref={globalAudioRef} loop preload="auto" />

      {/* Autoplay Unlock Banner for Guests if Browser blocked audio */}
      {needsAudioUnlock && roomState.music.isPlaying && (
        <div
          onClick={handleUnlockAudio}
          className="bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between cursor-pointer shadow-xl z-50 shrink-0 animate-in fade-in"
          title="Clique para habilitar a reprodução do áudio sincronizado"
        >
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-white animate-pulse" />
            <span>
              Música tocando na sala: <strong>{roomState.music.currentTrack?.title}</strong>. Clique para sintonizar o som!
            </span>
          </div>
          <button className="px-3 py-1 bg-white text-indigo-950 rounded-lg text-xs font-bold shrink-0 ml-3 hover:bg-slate-100 transition-colors shadow">
            Ouvir Agora ▶
          </button>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 right-4 sm:right-6 z-50 bg-indigo-600 text-white px-3.5 py-2 rounded-xl shadow-xl flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-top-3">
          <Sparkles className="w-3.5 h-3.5 shrink-0 text-indigo-200" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Error banner if present */}
      {errorMessage && (
        <div className="bg-rose-950/90 border-b border-rose-500/40 text-rose-200 px-4 py-1.5 text-xs flex items-center justify-between z-50">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-xs text-rose-300 hover:text-white cursor-pointer ml-3"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Room Reaction: Pulsating Background with Strong and Weak Intensity Cycles */}
      {activeReaction && (
        <div
          className={`fixed inset-0 pointer-events-none z-10 transition-all duration-700 animate-emotion-pulse ${
            activeReaction.type === 'esquentando'
              ? 'bg-[radial-gradient(ellipse_at_center,_rgba(239,68,68,0.38)_0%,_rgba(249,115,22,0.24)_45%,_rgba(185,28,28,0.1)_100%)]'
              : activeReaction.type === 'comemoracao'
              ? 'bg-[radial-gradient(ellipse_at_center,_rgba(16,185,129,0.35)_0%,_rgba(234,179,8,0.26)_40%,_rgba(139,92,246,0.22)_100%)]'
              : activeReaction.type === 'suspense'
              ? 'bg-[radial-gradient(ellipse_at_center,_rgba(139,92,246,0.42)_0%,_rgba(67,56,202,0.32)_45%,_rgba(15,23,42,0.6)_100%)]'
              : 'bg-[radial-gradient(ellipse_at_center,_rgba(245,158,11,0.4)_0%,_rgba(234,179,8,0.28)_45%,_rgba(217,119,6,0.15)_100%)]'
          }`}
        />
      )}

      {/* Room Reaction: Rising Floating Emojis Layer */}
      {floatingEmojis.length > 0 && (
        <div className="fixed inset-0 pointer-events-none z-20 overflow-hidden">
          {floatingEmojis.map((item) => (
            <div
              key={item.id}
              className="absolute bottom-0 select-none animate-emoji-rise drop-shadow-xl"
              style={{
                left: `${item.left}%`,
                fontSize: `${item.size}px`,
                animationDelay: `${item.delay}s`,
                animationDuration: `${item.duration}s`
              }}
            >
              {item.emoji}
            </div>
          ))}
        </div>
      )}

      {/* Room Reaction: Floating Announcement Badge at Top */}
      {activeReaction && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-40 animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-auto">
          <div
            className={`px-4 py-2 rounded-2xl border shadow-2xl backdrop-blur-xl flex items-center gap-2.5 text-xs font-semibold ${
              activeReaction.type === 'esquentando'
                ? 'bg-red-950/90 border-red-500/50 text-orange-200 shadow-red-950/60'
                : activeReaction.type === 'comemoracao'
                ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200 shadow-emerald-950/60'
                : activeReaction.type === 'suspense'
                ? 'bg-purple-950/90 border-purple-500/50 text-purple-200 shadow-purple-950/60'
                : 'bg-amber-950/90 border-amber-500/50 text-amber-200 shadow-amber-950/60'
            }`}
          >
            <span className="text-base animate-bounce">
              {activeReaction.type === 'esquentando' && '🔥'}
              {activeReaction.type === 'comemoracao' && '🎉'}
              {activeReaction.type === 'suspense' && '👀'}
              {activeReaction.type === 'risadas' && '😂'}
            </span>
            <span>
              <strong className="text-white">{activeReaction.triggeredBy}</strong> ativou{' '}
              <span className="uppercase tracking-wider font-bold">
                {activeReaction.type === 'esquentando' && 'Esquentando'}
                {activeReaction.type === 'comemoracao' && 'Comemoração'}
                {activeReaction.type === 'suspense' && 'Suspense'}
                {activeReaction.type === 'risadas' && 'Risadas'}
              </span>
              !
            </span>
            <button
              onClick={() => {
                setActiveReaction(null);
                setFloatingEmojis([]);
              }}
              className="ml-2 p-1 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
              title="Dispensar efeito"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Top Bar with integrated Voice Controls and icon-first navigation */}
      <TopBar
        roomId={roomState.id}
        roomName={roomState.name}
        currentMode={roomState.mode}
        isHost={isHost}
        users={roomState.users}
        onSetMode={handleSetMode}
        onLeave={handleLeave}
        onOpenHostTransfer={() => setIsHostTransferOpen(true)}
        isMuted={isMuted}
        isDeafened={isDeafened}
        isSpeaking={isSpeaking}
        onToggleMute={handleToggleMute}
        onToggleDeafen={handleToggleDeafen}
      />

      {/* Compact User Bar (6 avatars max, zero horizontal scrollbar) */}
      <UserBar
        users={roomState.users}
        myUserId={myUserId}
        isHost={isHost}
        onTransferHost={handleTransferHost}
        onInvite={() => {
          const url = new URL(window.location.href);
          url.searchParams.set('room', roomState.id);
          navigator.clipboard.writeText(url.toString());
          showToast('Link da sala copiado!');
        }}
      />

      {/* Main Collaborative Workspace */}
      <main className="flex-1 min-h-0 p-2 sm:p-3 flex gap-3 overflow-hidden relative">
        {/* Active Mode Main View */}
        <div className="flex-1 min-h-0 flex flex-col h-full overflow-hidden">
          {roomState.mode === 'chat' && (
            <div className="h-full flex flex-col max-w-3xl mx-auto w-full">
              <ChatView
                messages={roomState.chat}
                myUserId={myUserId}
                onSendMessage={handleSendMessage}
                onSendReaction={handleSendReaction}
              />
            </div>
          )}

          {roomState.mode === 'drawing' && (
            <div className="h-full flex flex-col lg:flex-row gap-3 min-h-0">
              <div className="flex-1 min-h-0 h-full">
                <DrawingView
                  strokes={strokes}
                  remoteCursors={remoteCursors}
                  onSendStroke={handleSendStroke}
                  onSendCursor={handleSendCursor}
                  onClear={handleClearDrawing}
                  myUserId={myUserId}
                  myNickname={myNickname}
                  myColor={myColor}
                />
              </div>

              {/* Side Chat on Desktop */}
              <div className="hidden lg:flex w-72 xl:w-80 h-full flex-col shrink-0">
                <ChatView
                  messages={roomState.chat}
                  myUserId={myUserId}
                  onSendMessage={handleSendMessage}
                  onSendReaction={handleSendReaction}
                  placeholder="Comentar no desenho..."
                />
              </div>
            </div>
          )}

          {roomState.mode === 'games' && (
            <div className="h-full flex flex-col lg:flex-row gap-3 min-h-0">
              <div className="flex-1 min-h-0 h-full overflow-y-auto">
                <GamesView
                  gameState={roomState.game}
                  isHost={isHost}
                  users={roomState.users}
                  myUserId={myUserId}
                  myNickname={myNickname}
                  myColor={myColor}
                  strokes={strokes}
                  remoteCursors={remoteCursors}
                  onSendStroke={handleSendStroke}
                  onSendCursor={handleSendCursor}
                  onClearDrawing={handleClearDrawing}
                  onGameAction={handleGameAction}
                />
              </div>

              {/* Side Chat on Desktop */}
              <div className="hidden lg:flex w-72 xl:w-80 h-full flex-col shrink-0">
                <ChatView
                  messages={roomState.chat}
                  myUserId={myUserId}
                  onSendMessage={handleSendMessage}
                  onSendReaction={handleSendReaction}
                  placeholder="Chat & palpites..."
                />
              </div>
            </div>
          )}

          {roomState.mode === 'music' && (
            <div className="h-full flex flex-col lg:flex-row gap-3 min-h-0">
              <div className="flex-1 min-h-0 h-full overflow-y-auto">
                <MusicView
                  musicState={roomState.music}
                  isHost={isHost}
                  myNickname={myNickname}
                  myUserId={myUserId}
                  localVolume={localMusicVolume}
                  isLocalMuted={isLocalMusicMuted}
                  onVolumeChange={(vol) => setLocalMusicVolume(vol)}
                  onToggleMuteLocal={() => setIsLocalMusicMuted(!isLocalMusicMuted)}
                  onControlMusic={handleMusicControl}
                />
              </div>

              {/* Side Chat on Desktop */}
              <div className="hidden lg:flex w-72 xl:w-80 h-full flex-col shrink-0">
                <ChatView
                  messages={roomState.chat}
                  myUserId={myUserId}
                  onSendMessage={handleSendMessage}
                  onSendReaction={handleSendReaction}
                  placeholder="Comentar sobre a música..."
                />
              </div>
            </div>
          )}
        </div>

        {/* Mobile Floating Chat Trigger (only in drawing, games, music modes on small screens) */}
        {roomState.mode !== 'chat' && (
          <div className="lg:hidden fixed bottom-4 right-4 z-40">
            <button
              onClick={() => setIsMobileChatOpen(!isMobileChatOpen)}
              className="w-11 h-11 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl flex items-center justify-center transition-transform active:scale-95 cursor-pointer border border-indigo-400/40"
              title="Abrir Chat da Sala"
            >
              {isMobileChatOpen ? <X className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
            </button>
          </div>
        )}

        {/* Mobile Slide-over Chat Drawer */}
        {isMobileChatOpen && roomState.mode !== 'chat' && (
          <div className="lg:hidden fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex justify-end animate-in fade-in">
            <div className="w-full max-w-sm h-full bg-slate-900 border-l border-slate-800 flex flex-col p-3 shadow-2xl animate-in slide-in-from-right duration-200">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                <div className="flex items-center gap-2 text-xs font-semibold text-white">
                  <MessageSquare className="w-4 h-4 text-indigo-400" />
                  <span>Chat da Sala</span>
                </div>
                <button
                  onClick={() => setIsMobileChatOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 min-h-0">
                <ChatView
                  messages={roomState.chat}
                  myUserId={myUserId}
                  onSendMessage={handleSendMessage}
                  onSendReaction={handleSendReaction}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Host Transfer Modal */}
      <HostTransferModal
        isOpen={isHostTransferOpen}
        onClose={() => setIsHostTransferOpen(false)}
        users={roomState.users}
        myUserId={myUserId}
        onConfirmTransfer={handleTransferHost}
      />
    </div>
  );
}
