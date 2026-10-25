import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Minus, 
  Square, 
  Copy, 
  X, 
  Maximize2, 
  Minimize2, 
  Music, 
  CloudRain, 
  MessageSquare, 
  Gamepad2, 
  PenTool, 
  Users, 
  LayoutGrid, 
  Image as ImageIcon, 
  Volume2, 
  VolumeX, 
  Mic, 
  MicOff, 
  Headphones, 
  Sparkles, 
  Crown,
  ChevronUp,
  Settings,
  Share2
} from 'lucide-react';
import type { 
  RoomState, 
  RoomUser, 
  ChatMessage, 
  DrawStroke, 
  DrawCursor, 
  DrawPoint,
  MusicTrack, 
  AmbientSoundState,
  AmbientSoundType,
  ReactionType 
} from '../../shared/types.js';
import { DrawingView } from '../DrawingView.js';
import { MusicView } from '../MusicView.js';
import { AmbientSoundView } from '../AmbientSoundView.js';
import { ChatView } from '../ChatView.js';
import { GamesView } from '../GamesView.js';
import { WallpaperModal } from '../WallpaperModal.js';

export type WindowId = 'drawing' | 'music' | 'ambient' | 'chat' | 'games' | 'users';

export interface WindowState {
  id: WindowId;
  title: string;
  icon: string;
  isOpen: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  prevBounds?: { x: number; y: number; width: number; height: number };
}

interface DesktopWorkspaceProps {
  roomState: RoomState;
  myUserId: string;
  myNickname: string;
  myAvatar: string;
  myColor: string;
  isHost: boolean;
  strokes: DrawStroke[];
  liveStrokes: Record<string, DrawStroke>;
  remoteCursors: Record<string, DrawCursor>;
  onSendStroke: (stroke: DrawStroke) => void;
  onSendLiveStroke: (strokeId: string, points: DrawPoint[], color: string, size: number, isEraser: boolean) => void;
  onSendCursor: (cursor: DrawCursor) => void;
  onClearDrawing: () => void;
  localMusicVolume: number;
  isLocalMusicMuted: boolean;
  onMusicVolumeChange: (vol: number) => void;
  onToggleMusicMute: () => void;
  onControlMusic: any;
  localAmbientVolume: number;
  isLocalAmbientMuted: boolean;
  onAmbientVolumeChange: (vol: number) => void;
  onToggleAmbientMute: () => void;
  onControlAmbient: any;
  onSendMessage: (text: string) => void;
  onSendReaction: (reactionType: ReactionType) => void;
  onGameAction: (actionPayload: any) => void;
  isMuted: boolean;
  isDeafened: boolean;
  onToggleMute: () => void;
  onToggleDeafen: () => void;
  onTransferHost: (targetUserId: string) => void;
  onOpenHostTransferModal: () => void;
  onWallpaperChange: (url: string, broadcast: boolean) => void;
  activeWallpaper: string;
}

export const DesktopWorkspace: React.FC<DesktopWorkspaceProps> = ({
  roomState,
  myUserId,
  myNickname,
  myAvatar,
  myColor,
  isHost,
  strokes,
  liveStrokes,
  remoteCursors,
  onSendStroke,
  onSendLiveStroke,
  onSendCursor,
  onClearDrawing,
  localMusicVolume,
  isLocalMusicMuted,
  onMusicVolumeChange,
  onToggleMusicMute,
  onControlMusic,
  localAmbientVolume,
  isLocalAmbientMuted,
  onAmbientVolumeChange,
  onToggleAmbientMute,
  onControlAmbient,
  onSendMessage,
  onSendReaction,
  onGameAction,
  isMuted,
  isDeafened,
  onToggleMute,
  onToggleDeafen,
  onTransferHost,
  onOpenHostTransferModal,
  onWallpaperChange,
  activeWallpaper
}) => {
  const desktopContainerRef = useRef<HTMLDivElement>(null);

  // Time for taskbar clock
  const [clockTime, setClockTime] = useState<string>('');
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setClockTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Wallpaper Modal state
  const [isWallpaperModalOpen, setIsWallpaperModalOpen] = useState(false);

  // Start Menu flyout state
  const [isStartMenuOpen, setIsStartMenuOpen] = useState(false);

  // Top z-index tracker
  const [topZ, setTopZ] = useState(10);

  // Responsive initial default window positions
  const getInitialWindows = (): Record<WindowId, WindowState> => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
    const screenW = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const screenH = typeof window !== 'undefined' ? window.innerHeight : 800;

    if (isMobile) {
      return {
        drawing: {
          id: 'drawing',
          title: 'Lousa de Desenho Colaborativo',
          icon: '🎨',
          isOpen: true,
          isMinimized: false,
          isMaximized: true,
          zIndex: 10,
          x: 0,
          y: 0,
          width: screenW,
          height: screenH - 52
        },
        music: {
          id: 'music',
          title: 'Som da Sala & Spotify',
          icon: '🎵',
          isOpen: false,
          isMinimized: false,
          isMaximized: true,
          zIndex: 5,
          x: 0,
          y: 0,
          width: screenW,
          height: screenH - 52
        },
        ambient: {
          id: 'ambient',
          title: 'Áudios de Ambiente (Natureza & Chuva)',
          icon: '🌧️',
          isOpen: false,
          isMinimized: false,
          isMaximized: true,
          zIndex: 4,
          x: 0,
          y: 0,
          width: screenW,
          height: screenH - 52
        },
        chat: {
          id: 'chat',
          title: 'Chat da Sala & Reações',
          icon: '💬',
          isOpen: false,
          isMinimized: false,
          isMaximized: true,
          zIndex: 6,
          x: 0,
          y: 0,
          width: screenW,
          height: screenH - 52
        },
        games: {
          id: 'games',
          title: 'Jogos Multiplayer',
          icon: '🎮',
          isOpen: false,
          isMinimized: false,
          isMaximized: true,
          zIndex: 3,
          x: 0,
          y: 0,
          width: screenW,
          height: screenH - 52
        },
        users: {
          id: 'users',
          title: 'Participantes & Voz',
          icon: '👥',
          isOpen: false,
          isMinimized: false,
          isMaximized: true,
          zIndex: 2,
          x: 0,
          y: 0,
          width: screenW,
          height: screenH - 52
        }
      };
    }

    // Desktop default tile arrangement:
    // Drawing board gets primary prominent workspace on the left
    const drawingW = Math.max(680, Math.floor(screenW * 0.58));
    const drawingH = Math.max(500, screenH - 120);

    // Chat on bottom-right
    const chatW = Math.max(340, Math.floor(screenW * 0.38));
    const chatH = Math.max(300, Math.floor((screenH - 120) * 0.54));

    // Music/Ambient on top-right
    const musicW = chatW;
    const musicH = Math.max(260, Math.floor((screenH - 120) * 0.44));

    return {
      drawing: {
        id: 'drawing',
        title: 'Lousa de Desenho Colaborativo',
        icon: '🎨',
        isOpen: true,
        isMinimized: false,
        isMaximized: false,
        zIndex: 10,
        x: 16,
        y: 12,
        width: drawingW,
        height: drawingH
      },
      music: {
        id: 'music',
        title: 'Som da Sala & Spotify',
        icon: '🎵',
        isOpen: true,
        isMinimized: false,
        isMaximized: false,
        zIndex: 8,
        x: drawingW + 28,
        y: 12,
        width: musicW,
        height: musicH
      },
      ambient: {
        id: 'ambient',
        title: 'Áudios de Ambiente (Chuva & Natureza)',
        icon: '🌧️',
        isOpen: true,
        isMinimized: false,
        isMaximized: false,
        zIndex: 7,
        x: Math.max(40, drawingW - 240),
        y: 60,
        width: 480,
        height: 380
      },
      chat: {
        id: 'chat',
        title: 'Chat da Sala & Reações',
        icon: '💬',
        isOpen: true,
        isMinimized: false,
        isMaximized: false,
        zIndex: 9,
        x: drawingW + 28,
        y: musicH + 24,
        width: chatW,
        height: chatH
      },
      games: {
        id: 'games',
        title: 'Jogos Multiplayer',
        icon: '🎮',
        isOpen: false,
        isMinimized: false,
        isMaximized: false,
        zIndex: 5,
        x: 80,
        y: 50,
        width: Math.min(840, screenW - 120),
        height: Math.min(620, screenH - 160)
      },
      users: {
        id: 'users',
        title: 'Participantes & Voz',
        icon: '👥',
        isOpen: false,
        isMinimized: false,
        isMaximized: false,
        zIndex: 4,
        x: 120,
        y: 80,
        width: 420,
        height: 480
      }
    };
  };

  const [windows, setWindows] = useState<Record<WindowId, WindowState>>(getInitialWindows);

  // Bring window to focus
  const focusWindow = (id: WindowId) => {
    setTopZ((prev) => {
      const nextZ = prev + 1;
      setWindows((curr) => ({
        ...curr,
        [id]: {
          ...curr[id],
          zIndex: nextZ,
          isMinimized: false
        }
      }));
      return nextZ;
    });
  };

  // Toggle open/minimize from taskbar
  const toggleTaskbarWindow = (id: WindowId) => {
    setWindows((curr) => {
      const win = curr[id];
      if (!win.isOpen) {
        return {
          ...curr,
          [id]: { ...win, isOpen: true, isMinimized: false, zIndex: topZ + 1 }
        };
      }
      if (win.isMinimized) {
        return {
          ...curr,
          [id]: { ...win, isMinimized: false, zIndex: topZ + 1 }
        };
      }
      // If already focused and active, minimize it
      const highestZ = Math.max(...Object.values(curr).map((w) => w.zIndex));
      if (win.zIndex === highestZ) {
        return {
          ...curr,
          [id]: { ...win, isMinimized: true }
        };
      }
      // Otherwise bring to front
      return {
        ...curr,
        [id]: { ...win, zIndex: topZ + 1 }
      };
    });
    setTopZ((prev) => prev + 1);
  };

  const handleMinimize = (id: WindowId, e: React.MouseEvent) => {
    e.stopPropagation();
    setWindows((curr) => ({
      ...curr,
      [id]: { ...curr[id], isMinimized: true }
    }));
  };

  const handleMaximize = (id: WindowId, e: React.MouseEvent) => {
    e.stopPropagation();
    setWindows((curr) => {
      const win = curr[id];
      if (win.isMaximized) {
        return {
          ...curr,
          [id]: {
            ...win,
            isMaximized: false,
            ...(win.prevBounds || {})
          }
        };
      }
      return {
        ...curr,
        [id]: {
          ...win,
          isMaximized: true,
          prevBounds: { x: win.x, y: win.y, width: win.width, height: win.height }
        }
      };
    });
  };

  const handleClose = (id: WindowId, e: React.MouseEvent) => {
    e.stopPropagation();
    setWindows((curr) => ({
      ...curr,
      [id]: { ...curr[id], isOpen: false }
    }));
  };

  // Quick layout presets: Tile Side-by-Side
  const handleTileLayout = () => {
    if (!desktopContainerRef.current) return;
    const bounds = desktopContainerRef.current.getBoundingClientRect();
    const halfW = Math.floor(bounds.width / 2) - 8;
    const fullH = bounds.height - 12;
    const halfH = Math.floor(fullH / 2) - 6;

    setWindows((curr) => ({
      ...curr,
      drawing: {
        ...curr.drawing,
        isOpen: true,
        isMinimized: false,
        isMaximized: false,
        x: 6,
        y: 6,
        width: halfW,
        height: fullH,
        zIndex: topZ + 1
      },
      music: {
        ...curr.music,
        isOpen: true,
        isMinimized: false,
        isMaximized: false,
        x: halfW + 14,
        y: 6,
        width: halfW,
        height: halfH,
        zIndex: topZ + 2
      },
      chat: {
        ...curr.chat,
        isOpen: true,
        isMinimized: false,
        isMaximized: false,
        x: halfW + 14,
        y: halfH + 16,
        width: halfW,
        height: halfH,
        zIndex: topZ + 3
      }
    }));
    setTopZ((prev) => prev + 4);
    setIsStartMenuOpen(false);
  };

  // Window drag handling
  const draggingWindowRef = useRef<{
    id: WindowId;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
  } | null>(null);

  const startDrag = (id: WindowId, e: React.PointerEvent) => {
    if (windows[id].isMaximized) return;
    focusWindow(id);
    draggingWindowRef.current = {
      id,
      startX: e.clientX,
      startY: e.clientY,
      initialX: windows[id].x,
      initialY: windows[id].y
    };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  // Window resize handling
  const resizingWindowRef = useRef<{
    id: WindowId;
    startX: number;
    startY: number;
    initialW: number;
    initialH: number;
  } | null>(null);

  const startResize = (id: WindowId, e: React.PointerEvent) => {
    e.stopPropagation();
    if (windows[id].isMaximized) return;
    focusWindow(id);
    resizingWindowRef.current = {
      id,
      startX: e.clientX,
      startY: e.clientY,
      initialW: windows[id].width,
      initialH: windows[id].height
    };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (draggingWindowRef.current) {
      const { id, startX, startY, initialX, initialY } = draggingWindowRef.current;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      setWindows((curr) => {
        const win = curr[id];
        return {
          ...curr,
          [id]: {
            ...win,
            x: Math.max(0, initialX + dx),
            y: Math.max(0, initialY + dy)
          }
        };
      });
    }

    if (resizingWindowRef.current) {
      const { id, startX, startY, initialW, initialH } = resizingWindowRef.current;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      setWindows((curr) => {
        const win = curr[id];
        return {
          ...curr,
          [id]: {
            ...win,
            width: Math.max(280, initialW + dx),
            height: Math.max(200, initialH + dy)
          }
        };
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (draggingWindowRef.current) {
      try {
        (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
      } catch (err) {}
      draggingWindowRef.current = null;
    }
    if (resizingWindowRef.current) {
      try {
        (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
      } catch (err) {}
      resizingWindowRef.current = null;
    }
  };

  // App definitions for launcher
  const APP_LIST: Array<{ id: WindowId; name: string; icon: string; desc: string }> = [
    { id: 'drawing', name: 'Lousa de Desenho', icon: '🎨', desc: 'Quadro branco em tempo real com traço suave' },
    { id: 'music', name: 'Som da Sala & Spotify', icon: '🎵', desc: 'Música sincronizada e pedidos de som' },
    { id: 'ambient', name: 'Áudios de Ambiente', icon: '🌧️', desc: 'Chuva, tempestade, campo e lareira' },
    { id: 'chat', name: 'Chat da Sala & Reações', icon: '💬', desc: 'Chat ao vivo e comandos emocionais' },
    { id: 'games', name: 'Jogos Multiplayer', icon: '🎮', desc: 'Gartic de adivinhação, quiz e velha' },
    { id: 'users', name: 'Mesa de Usuários & Voz', icon: '👥', desc: 'Microfones, participantes e moderação' }
  ];

  return (
    <div
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className="relative flex-1 w-full h-full flex flex-col overflow-hidden select-none"
      style={{
        backgroundImage: `url(${activeWallpaper})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Dark tint overlay on wallpaper to ensure UI contrast */}
      <div className="absolute inset-0 bg-slate-950/40 pointer-events-none z-0 backdrop-blur-[0.5px]" />

      {/* Desktop Workspace Window Area */}
      <div
        ref={desktopContainerRef}
        onClick={() => setIsStartMenuOpen(false)}
        className="relative flex-1 w-full h-full overflow-hidden p-2 z-10"
      >
        {/* Render each floating window */}
        {(Object.keys(windows) as WindowId[]).map((id) => {
          const win = windows[id];
          if (!win.isOpen || win.isMinimized) return null;

          const isMax = win.isMaximized;

          const windowStyle: React.CSSProperties = isMax
            ? {
                position: 'absolute',
                left: 0,
                top: 0,
                width: '100%',
                height: '100%',
                zIndex: win.zIndex
              }
            : {
                position: 'absolute',
                left: `${win.x}px`,
                top: `${win.y}px`,
                width: `${win.width}px`,
                height: `${win.height}px`,
                zIndex: win.zIndex
              };

          return (
            <div
              key={id}
              onClick={() => focusWindow(id)}
              style={windowStyle}
              className={`flex flex-col bg-slate-900/90 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden transition-shadow duration-150 ${
                win.zIndex >= topZ ? 'ring-1 ring-indigo-500/50 shadow-indigo-950/40' : ''
              }`}
            >
              {/* Window Title Bar */}
              <div
                onPointerDown={(e) => startDrag(id, e)}
                onDoubleClick={(e) => handleMaximize(id, e)}
                className="h-10 px-3 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between gap-2 shrink-0 cursor-grab active:cursor-grabbing select-none"
              >
                {/* Title & Icon */}
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-base shrink-0">{win.icon}</span>
                  <span className="text-xs font-bold text-white truncate">{win.title}</span>
                </div>

                {/* Window Control Buttons (Windows style: Minimize, Maximize/Restore, Close) */}
                <div className="flex items-center gap-1 shrink-0 ml-auto" onPointerDown={(e) => e.stopPropagation()}>
                  <button
                    onClick={(e) => handleMinimize(id, e)}
                    className="w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 flex items-center justify-center transition-colors cursor-pointer"
                    title="Minimizar"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={(e) => handleMaximize(id, e)}
                    className="w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 flex items-center justify-center transition-colors cursor-pointer"
                    title={isMax ? 'Restaurar Tamanho' : 'Maximizar'}
                  >
                    {isMax ? <Copy className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    onClick={(e) => handleClose(id, e)}
                    className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-300 hover:bg-rose-950/60 flex items-center justify-center transition-colors cursor-pointer"
                    title="Fechar Janela"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Window Body Content */}
              <div className="flex-1 min-h-0 overflow-hidden relative bg-slate-950/60">
                {id === 'drawing' && (
                  <DrawingView
                    strokes={strokes}
                    liveStrokes={liveStrokes}
                    remoteCursors={remoteCursors}
                    onSendStroke={onSendStroke}
                    onSendLiveStroke={onSendLiveStroke}
                    onSendCursor={onSendCursor}
                    onClear={onClearDrawing}
                    myUserId={myUserId}
                    myNickname={myNickname}
                    myColor={myColor}
                  />
                )}

                {id === 'music' && (
                  <div className="h-full overflow-y-auto">
                    <MusicView
                      musicState={roomState.music}
                      isHost={isHost}
                      myNickname={myNickname}
                      myUserId={myUserId}
                      localVolume={localMusicVolume}
                      isLocalMuted={isLocalMusicMuted}
                      onVolumeChange={onMusicVolumeChange}
                      onToggleMuteLocal={onToggleMusicMute}
                      onControlMusic={onControlMusic}
                    />
                  </div>
                )}

                {id === 'ambient' && (
                  <div className="h-full overflow-y-auto">
                    <AmbientSoundView
                      ambientState={roomState.ambientSound}
                      isHost={isHost}
                      localVolume={localAmbientVolume}
                      isLocalMuted={isLocalAmbientMuted}
                      onVolumeChange={onAmbientVolumeChange}
                      onToggleMuteLocal={onToggleAmbientMute}
                      onControlAmbient={onControlAmbient}
                    />
                  </div>
                )}

                {id === 'chat' && (
                  <div className="h-full">
                    <ChatView
                      messages={roomState.chat}
                      myUserId={myUserId}
                      onSendMessage={onSendMessage}
                      onSendReaction={onSendReaction}
                    />
                  </div>
                )}

                {id === 'games' && (
                  <div className="h-full overflow-y-auto">
                    <GamesView
                      gameState={roomState.game}
                      isHost={isHost}
                      users={roomState.users}
                      myUserId={myUserId}
                      myNickname={myNickname}
                      myColor={myColor}
                      strokes={strokes}
                      remoteCursors={remoteCursors}
                      onSendStroke={onSendStroke}
                      onSendCursor={onSendCursor}
                      onClearDrawing={onClearDrawing}
                      onGameAction={onGameAction}
                    />
                  </div>
                )}

                {id === 'users' && (
                  <div className="p-4 h-full overflow-y-auto space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        <Users className="w-4 h-4 text-indigo-400" />
                        <span>Mesa de Participantes ({roomState.users.length}/6)</span>
                      </div>
                      <button
                        onClick={onOpenHostTransferModal}
                        className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Crown className="w-3.5 h-3.5" />
                        <span>{isHost ? 'Transferir Coroa' : 'Moderador'}</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {roomState.users.map((u) => {
                        const isMe = u.id === myUserId;
                        return (
                          <div
                            key={u.id}
                            className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                              isMe
                                ? 'bg-indigo-950/40 border-indigo-500/50'
                                : 'bg-slate-900/60 border-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 border"
                                style={{ backgroundColor: `${u.color}30`, borderColor: u.color }}
                              >
                                {u.avatar}
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
                                  <span>{u.nickname}</span>
                                  {u.isHost && <Crown className="w-3 h-3 text-amber-400 shrink-0" />}
                                  {isMe && <span className="text-[10px] text-indigo-300 font-normal">(Você)</span>}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {u.isSpeaking ? (
                                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                      Falando...
                                    </span>
                                  ) : u.isMuted ? (
                                    <span className="text-rose-400">Silenciado</span>
                                  ) : (
                                    <span>Conectado</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom-right Resizing Grip (only when not maximized) */}
              {!isMax && (
                <div
                  onPointerDown={(e) => startResize(id, e)}
                  className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-30 flex items-center justify-center text-slate-500 hover:text-white"
                  title="Redimensionar Janela"
                >
                  <svg className="w-2.5 h-2.5 fill-current opacity-70" viewBox="0 0 6 6">
                    <circle cx="5" cy="5" r="1" />
                    <circle cx="5" cy="2" r="1" />
                    <circle cx="2" cy="5" r="1" />
                  </svg>
                </div>
              )}
            </div>
          );
        })}

        {/* Windows 11 Start Menu Flyout */}
        {isStartMenuOpen && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-3 left-3 sm:left-4 w-80 sm:w-96 bg-slate-900/95 backdrop-blur-2xl border border-slate-700/80 rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-bottom-4 duration-150"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-lg border"
                  style={{ backgroundColor: `${myColor}30`, borderColor: myColor }}
                >
                  {myAvatar}
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>{myNickname}</span>
                    {isHost && <Crown className="w-3 h-3 text-amber-400" />}
                  </div>
                  <div className="text-[10px] text-slate-400">VibeRoom Desktop OS</div>
                </div>
              </div>

              <button
                onClick={() => setIsStartMenuOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick App Launcher */}
            <div className="py-3 space-y-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Janelas & Ferramentas
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {APP_LIST.map((app) => (
                  <button
                    key={app.id}
                    onClick={() => {
                      toggleTaskbarWindow(app.id);
                      setIsStartMenuOpen(false);
                    }}
                    className="p-2.5 rounded-xl bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 text-left transition-all cursor-pointer flex items-center gap-2.5 group"
                  >
                    <span className="text-xl group-hover:scale-110 transition-transform">{app.icon}</span>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white truncate">{app.name}</div>
                      <div className="text-[9px] text-slate-400 truncate">
                        {windows[app.id].isOpen ? 'Janela aberta' : 'Abrir'}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Workspace Presets & Actions */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
              <button
                onClick={handleTileLayout}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Organizar lousa, música e chat lado a lado"
              >
                <LayoutGrid className="w-3.5 h-3.5 text-indigo-400" />
                <span>Organizar Lado a Lado</span>
              </button>

              <button
                onClick={() => {
                  setIsWallpaperModalOpen(true);
                  setIsStartMenuOpen(false);
                }}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ml-auto"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Trocar Fundo</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Windows Taskbar at bottom */}
      <footer className="h-12 bg-slate-950/90 backdrop-blur-xl border-t border-slate-800/90 px-3 flex items-center justify-between gap-2 z-40 shrink-0 select-none shadow-2xl">
        {/* Left: Start Button & Open Windows */}
        <div className="flex items-center gap-1.5 min-w-0 overflow-x-auto no-scrollbar">
          {/* Windows Start Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsStartMenuOpen(!isStartMenuOpen);
            }}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
              isStartMenuOpen
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950/50'
                : 'bg-slate-900 hover:bg-slate-800 text-indigo-300 border border-slate-800'
            }`}
          >
            <div className="grid grid-cols-2 gap-0.5 w-3.5 h-3.5">
              <div className="bg-indigo-400 rounded-[1px]" />
              <div className="bg-indigo-300 rounded-[1px]" />
              <div className="bg-indigo-500 rounded-[1px]" />
              <div className="bg-indigo-400 rounded-[1px]" />
            </div>
            <span className="font-semibold text-white">Iniciar</span>
          </button>

          {/* Window app buttons in taskbar */}
          {APP_LIST.map((app) => {
            const win = windows[app.id];
            const isTop = win.isOpen && !win.isMinimized && win.zIndex >= topZ;

            return (
              <button
                key={app.id}
                onClick={() => toggleTaskbarWindow(app.id)}
                className={`px-2.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0 border ${
                  win.isOpen
                    ? isTop
                      ? 'bg-slate-800/90 text-white border-indigo-500/80 shadow-sm'
                      : win.isMinimized
                      ? 'bg-slate-950/60 text-slate-400 border-slate-800'
                      : 'bg-slate-900/80 text-slate-200 border-slate-700'
                    : 'bg-transparent text-slate-400 border-transparent hover:bg-slate-900/60 hover:text-white'
                }`}
                title={win.isOpen ? `${app.name} (${win.isMinimized ? 'Minimizada' : 'Aberta'})` : `Abrir ${app.name}`}
              >
                <span>{app.icon}</span>
                <span className="hidden md:inline font-medium">{app.name}</span>
                {win.isOpen && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isTop ? 'bg-indigo-400' : 'bg-slate-500'
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Center/Right: Ambient Audio & Wallpaper & Clock */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Active Ambient Sound Indicator in Taskbar */}
          <button
            onClick={() => toggleTaskbarWindow('ambient')}
            className={`px-2.5 py-1 rounded-xl text-xs flex items-center gap-1.5 border transition-all cursor-pointer ${
              roomState.ambientSound.isPlaying
                ? 'bg-cyan-950/60 text-cyan-200 border-cyan-700/50 hover:bg-cyan-900/60'
                : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-white'
            }`}
            title="Áudios de Ambiente da Sala"
          >
            <span>{roomState.ambientSound.icon || '🌧️'}</span>
            <span className="hidden sm:inline font-medium truncate max-w-[110px]">
              {roomState.ambientSound.title}
            </span>
            {roomState.ambientSound.isPlaying && (
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            )}
          </button>

          {/* Wallpaper Switcher Button */}
          <button
            onClick={() => setIsWallpaperModalOpen(true)}
            className="px-2.5 py-1 bg-slate-900/90 hover:bg-slate-850 text-slate-300 hover:text-white rounded-xl text-xs font-medium border border-slate-800 flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Trocar papel de parede (Paisagens & GIFs)"
          >
            <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden lg:inline">Fundo</span>
          </button>

          {/* Quick Voice Mic / Deafen toggles */}
          <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 p-1 rounded-xl">
            <button
              onClick={onToggleMute}
              className={`p-1 rounded-lg transition-colors cursor-pointer ${
                isMuted ? 'text-rose-400 hover:bg-rose-950/40' : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
              title={isMuted ? 'Desmutar microfone' : 'Mutar microfone'}
            >
              {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={onToggleDeafen}
              className={`p-1 rounded-lg transition-colors cursor-pointer ${
                isDeafened ? 'text-rose-400 hover:bg-rose-950/40' : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
              title={isDeafened ? 'Reativar áudio da sala' : 'Desativar áudio (Deafen)'}
            >
              <Headphones className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Windows Clock */}
          <div className="px-2 py-1 bg-slate-900/80 border border-slate-800 rounded-xl text-xs font-mono text-slate-300 flex items-center justify-center min-w-[50px]">
            {clockTime}
          </div>
        </div>
      </footer>

      {/* Wallpaper Modal */}
      <WallpaperModal
        isOpen={isWallpaperModalOpen}
        currentWallpaper={activeWallpaper}
        isHost={isHost}
        onClose={() => setIsWallpaperModalOpen(false)}
        onSelectWallpaper={onWallpaperChange}
      />
    </div>
  );
};
