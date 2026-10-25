export type RoomMode = 'chat' | 'drawing' | 'games' | 'music';

export interface RoomUser {
  id: string;
  nickname: string;
  avatar: string;
  color: string;
  isHost: boolean;
  isMuted: boolean;
  isDeafened: boolean;
  isSpeaking: boolean;
  joinedAt: number;
}

export type ReactionType = 'esquentando' | 'comemoracao' | 'suspense' | 'risadas';

export interface ChatMessage {
  id: string;
  userId: string;
  nickname: string;
  avatar: string;
  color: string;
  text: string;
  timestamp: number;
  type: 'chat' | 'system' | 'guess_correct' | 'reaction';
  reactionType?: ReactionType;
}

export interface DrawPoint {
  x: number;
  y: number;
}

export interface DrawStroke {
  id: string;
  userId: string;
  points: DrawPoint[];
  color: string;
  size: number;
  isEraser: boolean;
}

export interface DrawCursor {
  userId: string;
  nickname: string;
  color: string;
  x: number;
  y: number;
  isDrawing: boolean;
}

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  duration: number; // in seconds
  coverArt: string;
  audioUrl: string;
  source: 'preset' | 'spotify' | 'custom';
  spotifyUri?: string;
  requestedBy?: {
    userId: string;
    nickname: string;
    avatar?: string;
  };
}

export interface MusicState {
  isPlaying: boolean;
  currentTrack: MusicTrack | null;
  position: number; // current playback position in seconds
  updatedAt: number; // server timestamp for exact drift-free sync
  queue: MusicTrack[];
  songRequests: MusicTrack[]; // Guest song requests
  allowGuestRequests: boolean;
  volume: number; // 0 to 1
  playlistName?: string; // e.g. "Today's Top Hits"
  playlistCover?: string; // High-res playlist artwork
  playlistUrl?: string; // Spotify URL
  spotifyEmbedUri?: string; // Embed player URI
}

export type GameType = 'draw_guess' | 'trivia' | 'tictactoe';
export type GameStatus = 'idle' | 'starting' | 'playing' | 'round_end' | 'game_over';

export interface DrawGuessGame {
  type: 'draw_guess';
  status: GameStatus;
  round: number;
  totalRounds: number;
  drawerId: string | null;
  word: string; // only sent to drawer or when round ends
  wordHint: string; // e.g. "_ _ _ A _ _"
  category: string;
  timeRemaining: number;
  scores: Record<string, number>;
  guessedUsers: string[]; // user IDs who already guessed correctly
}

export interface TriviaQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex?: number; // revealed at round end
  category: string;
}

export interface TriviaGame {
  type: 'trivia';
  status: GameStatus;
  round: number;
  totalRounds: number;
  currentQuestion: TriviaQuestion | null;
  timeRemaining: number;
  scores: Record<string, number>;
  userAnswers: Record<string, number>; // userId -> optionIndex
}

export interface TicTacToeGame {
  type: 'tictactoe';
  status: GameStatus;
  board: (string | null)[]; // 9 cells ('X', 'O', null)
  playerX: string | null; // userId
  playerO: string | null; // userId
  turn: 'X' | 'O';
  winner: 'X' | 'O' | 'draw' | null;
  winningLine: number[] | null;
  scores: Record<string, number>;
}

export type GameState = DrawGuessGame | TriviaGame | TicTacToeGame | null;

export type AmbientSoundType = 'rain' | 'thunder' | 'forest' | 'wind' | 'cafe' | 'fireplace' | 'waves' | 'night' | 'stream' | 'custom';

export interface AmbientSoundState {
  trackId: string;
  title: string;
  category: string;
  icon: string;
  soundType: AmbientSoundType;
  audioUrl?: string;
  isPlaying: boolean;
  volume: number; // 0 to 1
  updatedAt: number;
}

export interface RoomState {
  id: string;
  name: string;
  createdAt: number;
  maxUsers: 6;
  hostId: string;
  mode: RoomMode;
  users: RoomUser[];
  chat: ChatMessage[];
  music: MusicState;
  ambientSound: AmbientSoundState;
  desktopWallpaper?: string;
  game: GameState;
}

// WebSocket client-to-server and server-to-client events
export type ClientEvent =
  | { type: 'join_room'; roomId: string; nickname: string; avatar: string; color: string }
  | { type: 'leave_room' }
  | { type: 'set_mode'; mode: RoomMode }
  | { type: 'transfer_host'; targetUserId: string }
  | { type: 'send_chat'; text: string }
  | { type: 'send_reaction'; reactionType: ReactionType }
  | { type: 'voice_state'; isMuted: boolean; isDeafened: boolean; isSpeaking: boolean }
  | { type: 'draw_stroke'; stroke: DrawStroke }
  | { type: 'draw_live_stroke'; strokeId: string; points: DrawPoint[]; color: string; size: number; isEraser: boolean }
  | { type: 'draw_cursor'; cursor: DrawCursor }
  | { type: 'draw_clear' }
  | { type: 'music_control'; action: 'play' | 'pause' | 'seek' | 'change_track' | 'add_queue' | 'request_song' | 'approve_request' | 'reject_request' | 'toggle_requests' | 'import_playlist'; track?: MusicTrack; tracks?: MusicTrack[]; playlistName?: string; playlistCover?: string; playlistUrl?: string; spotifyEmbedUri?: string; position?: number; requestId?: string }
  | { type: 'ambient_control'; action: 'play' | 'pause' | 'set_track' | 'set_volume'; trackId?: string; title?: string; soundType?: AmbientSoundType; audioUrl?: string; icon?: string; category?: string; volume?: number }
  | { type: 'set_wallpaper'; wallpaperUrl: string }
  | { type: 'game_control'; action: 'start' | 'next_round' | 'stop' | 'set_type' | 'guess' | 'answer_trivia' | 'tictactoe_move' | 'join_tictactoe'; gameType?: GameType; guess?: string; answerIndex?: number; cellIndex?: number; role?: 'X' | 'O' }
  | { type: 'webrtc_signal'; targetUserId: string; signal: any };

export type ServerEvent =
  | { type: 'room_joined'; room: RoomState; yourId: string }
  | { type: 'room_error'; message: string; code?: 'ROOM_FULL' | 'NOT_FOUND' | 'FORBIDDEN' }
  | { type: 'user_joined'; user: RoomUser }
  | { type: 'user_left'; userId: string; newHostId?: string }
  | { type: 'user_updated'; user: Partial<RoomUser> & { id: string } }
  | { type: 'host_transferred'; newHostId: string }
  | { type: 'mode_changed'; mode: RoomMode; changedBy: string }
  | { type: 'chat_message'; message: ChatMessage }
  | { type: 'room_reaction'; reactionType: ReactionType; triggeredBy: string; userId: string; timestamp: number }
  | { type: 'draw_stroke'; stroke: DrawStroke }
  | { type: 'draw_live_stroke'; userId: string; strokeId: string; points: DrawPoint[]; color: string; size: number; isEraser: boolean }
  | { type: 'draw_cursor'; cursor: DrawCursor }
  | { type: 'draw_cleared'; clearedBy: string }
  | { type: 'draw_history'; strokes: DrawStroke[] }
  | { type: 'music_updated'; music: MusicState }
  | { type: 'ambient_updated'; ambient: AmbientSoundState }
  | { type: 'wallpaper_updated'; wallpaperUrl: string; setBy: string }
  | { type: 'game_updated'; game: GameState; notification?: string }
  | { type: 'webrtc_signal'; senderUserId: string; signal: any };
