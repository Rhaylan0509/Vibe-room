import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import type {
  RoomState,
  RoomUser,
  ChatMessage,
  DrawStroke,
  DrawCursor,
  MusicState,
  MusicTrack,
  GameState,
  ClientEvent,
  ServerEvent,
  RoomMode,
  DrawGuessGame,
  TriviaGame,
  TicTacToeGame
} from './shared/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProd = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 3000;

// High quality verified 24/7 curated audio streams for synchronized playback
const PRESET_TRACKS: MusicTrack[] = [
  {
    id: 'track-1',
    title: 'Groove Salad (Lo-Fi Ambient & Chill Beats)',
    artist: 'SomaFM Lounge',
    duration: 3600,
    coverArt: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=300&h=300&fit=crop',
    audioUrl: 'https://ice1.somafm.com/groovesalad-128-mp3',
    source: 'preset'
  },
  {
    id: 'track-2',
    title: 'DEF CON (Cyberpunk & Synthwave Drive)',
    artist: 'Neon Cyber Session',
    duration: 3600,
    coverArt: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=300&h=300&fit=crop',
    audioUrl: 'https://ice1.somafm.com/defcon-128-mp3',
    source: 'preset'
  },
  {
    id: 'track-3',
    title: 'Lush (Mellow Vocals & Acoustic Chill)',
    artist: 'Sunset Cafe & Acoustic',
    duration: 3600,
    coverArt: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=300&h=300&fit=crop',
    audioUrl: 'https://ice1.somafm.com/lush-128-mp3',
    source: 'preset'
  },
  {
    id: 'track-4',
    title: 'Beat Blender (Deep House & Night Lounge)',
    artist: 'Midnight Sessions',
    duration: 3600,
    coverArt: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&h=300&fit=crop',
    audioUrl: 'https://ice1.somafm.com/beatblender-128-mp3',
    source: 'preset'
  },
  {
    id: 'track-5',
    title: 'Vaporwaves (Retro Dream & Nostalgia)',
    artist: 'Aesthetic Wave',
    duration: 3600,
    coverArt: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&h=300&fit=crop',
    audioUrl: 'https://ice1.somafm.com/vaporwaves-128-mp3',
    source: 'preset'
  }
];

// Draw & Guess word bank in Portuguese
const DRAW_WORDS = [
  { word: 'GATO', category: 'Animais' },
  { word: 'PIZZA', category: 'Comida' },
  { word: 'FOGUETE', category: 'Objetos' },
  { word: 'GUITARRA', category: 'Música' },
  { word: 'SORVETE', category: 'Comida' },
  { word: 'CASTELO', category: 'Lugares' },
  { word: 'BICICLETA', category: 'Transporte' },
  { word: 'TUBARAO', category: 'Animais' },
  { word: 'VULCAO', category: 'Natureza' },
  { word: 'ASTRONAUTA', category: 'Profissões' },
  { word: 'ROBO', category: 'Tecnologia' },
  { word: 'DRAGAO', category: 'Fantasia' },
  { word: 'MELANCIA', category: 'Comida' },
  { word: 'SUBMARINO', category: 'Transporte' }
];

// Curated trivia questions
const TRIVIA_BANK = [
  {
    id: 'q1',
    category: 'Música & Cultura',
    question: 'Em que ano foi lançada a plataforma Spotify oficialmente ao público?',
    options: ['2006', '2008', '2010', '2012'],
    correctIndex: 1
  },
  {
    id: 'q2',
    category: 'Games',
    question: 'Qual é o jogo mais vendido de todos os tempos na história dos videogames?',
    options: ['Grand Theft Auto V', 'Tetris', 'Minecraft', 'Wii Sports'],
    correctIndex: 2
  },
  {
    id: 'q3',
    category: 'Ciência & Tecnologia',
    question: 'Qual protocolo WebRTC é responsável pela transmissão de áudio e vídeo de ponta a ponta?',
    options: ['SRTP', 'HTTP/3', 'FTP', 'IMAP'],
    correctIndex: 0
  },
  {
    id: 'q4',
    category: 'Cinema & Séries',
    question: 'Qual filme venceu o Oscar de Melhor Filme em 2020, sendo o primeiro de língua não-inglesa a vencer?',
    options: ['1917', 'Parasita', 'Coringa', 'Era uma vez em Hollywood'],
    correctIndex: 1
  },
  {
    id: 'q5',
    category: 'Cultura Geral',
    question: 'Qual é o instrumento musical que possui 88 teclas, sendo 52 brancas e 36 pretas?',
    options: ['Cravo', 'Órgão', 'Piano', 'Acordeão'],
    correctIndex: 2
  }
];

interface ConnectedClient {
  ws: WebSocket;
  userId: string;
  roomId: string;
}

interface ServerRoom {
  state: RoomState;
  strokes: DrawStroke[];
  clients: Map<string, ConnectedClient>; // userId -> client
  gameTimer?: NodeJS.Timeout;
  musicTimer?: NodeJS.Timeout;
}

const rooms = new Map<string, ServerRoom>();

function broadcastToRoom(room: ServerRoom, event: ServerEvent, excludeUserId?: string) {
  const data = JSON.stringify(event);
  room.clients.forEach((client, userId) => {
    if (excludeUserId && userId === excludeUserId) return;
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(data);
    }
  });
}

function sendToUser(client: ConnectedClient, event: ServerEvent) {
  if (client.ws.readyState === WebSocket.OPEN) {
    client.ws.send(JSON.stringify(event));
  }
}

function normalizeText(text: string): string {
  return text
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function createWordHint(word: string, guessedRatio: number = 0.3): string {
  const chars = word.split('');
  return chars
    .map((c, i) => {
      if (c === ' ') return '  ';
      if (i === 0 || i === chars.length - 1 || Math.random() < guessedRatio) return c;
      return '_';
    })
    .join(' ');
}

function getOrCreateRoom(roomId: string, hostNickname: string): ServerRoom {
  let room = rooms.get(roomId);
  if (!room) {
    const musicState: MusicState = {
      isPlaying: false,
      currentTrack: null,
      position: 0,
      updatedAt: Date.now(),
      queue: [],
      songRequests: [],
      allowGuestRequests: true,
      volume: 0.8
    };

    const ambientSound = {
      trackId: 'rain-soft',
      title: 'Chuva Suave na Janela',
      category: 'Clima',
      icon: '🌧️',
      soundType: 'rain' as const,
      isPlaying: false,
      volume: 0.6,
      updatedAt: Date.now()
    };

    const roomState: RoomState = {
      id: roomId,
      name: `Sala Privada #${roomId.substring(0, 6)}`,
      createdAt: Date.now(),
      maxUsers: 6,
      hostId: '',
      mode: 'drawing', // Default directly into the collaborative whiteboard / desktop
      users: [],
      chat: [
        {
          id: 'sys-welcome',
          userId: 'system',
          nickname: 'VibeRoom Bot',
          avatar: '🤖',
          color: '#6366f1',
          text: `Bem-vindo à sala! O limite é de 6 pessoas. Janelas redimensionáveis no estilo Windows, lousa sincronizada, sons ambientes e músicas prontas.`,
          timestamp: Date.now(),
          type: 'system'
        }
      ],
      music: musicState,
      ambientSound,
      desktopWallpaper: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=1920&q=80',
      game: null
    };

    room = {
      state: roomState,
      strokes: [],
      clients: new Map()
    };
    rooms.set(roomId, room);
  }
  return room;
}

function checkTicTacToeWinner(board: (string | null)[]): { winner: 'X' | 'O' | 'draw' | null; line: number[] | null } {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
    [0, 4, 8], [2, 4, 6]             // diags
  ];

  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a] as 'X' | 'O', line: [a, b, c] };
    }
  }

  if (board.every(cell => cell !== null)) {
    return { winner: 'draw', line: null };
  }

  return { winner: null, line: null };
}

function advanceDrawGuessGame(room: ServerRoom) {
  if (!room.state.game || room.state.game.type !== 'draw_guess') return;
  const game = room.state.game as DrawGuessGame;

  if (room.gameTimer) clearInterval(room.gameTimer);

  if (room.state.users.length < 1) {
    room.state.game = null;
    broadcastToRoom(room, { type: 'game_updated', game: null });
    return;
  }

  // Pick next drawer
  const userIds = room.state.users.map(u => u.id);
  const currentIdx = game.drawerId ? userIds.indexOf(game.drawerId) : -1;
  const nextDrawerId = userIds[(currentIdx + 1) % userIds.length];

  const wordObj = DRAW_WORDS[Math.floor(Math.random() * DRAW_WORDS.length)];
  game.status = 'playing';
  game.drawerId = nextDrawerId;
  game.word = wordObj.word;
  game.category = wordObj.category;
  game.wordHint = createWordHint(wordObj.word, 0.2);
  game.timeRemaining = 60;
  game.guessedUsers = [];
  game.round += 1;

  // Clear drawing canvas for new round
  room.strokes = [];
  broadcastToRoom(room, { type: 'draw_cleared', clearedBy: 'Sistema' });

  // Broadcast game state: mask word for everyone except the drawer!
  room.clients.forEach((client, userId) => {
    const isDrawer = userId === nextDrawerId;
    const clientGame: DrawGuessGame = {
      ...game,
      word: isDrawer ? game.word : '?????'
    };
    sendToUser(client, {
      type: 'game_updated',
      game: clientGame,
      notification: isDrawer ? `Sua vez de desenhar! Sua palavra secreta é: ${game.word}` : `Nova rodada! Adivinhe o desenho.`
    });
  });

  // Start tick timer
  room.gameTimer = setInterval(() => {
    if (!room.state.game || room.state.game.type !== 'draw_guess') {
      if (room.gameTimer) clearInterval(room.gameTimer);
      return;
    }
    const g = room.state.game as DrawGuessGame;
    g.timeRemaining -= 1;

    if (g.timeRemaining <= 0) {
      if (room.gameTimer) clearInterval(room.gameTimer);
      g.status = 'round_end';
      const roundEndNotice = `Tempo esgotado! A palavra era: ${g.word}`;
      broadcastToRoom(room, {
        type: 'game_updated',
        game: { ...g },
        notification: roundEndNotice
      });

      // Advance to next round in 5 seconds
      setTimeout(() => {
        advanceDrawGuessGame(room);
      }, 5000);
      return;
    }

    // Broadcast time tick
    broadcastToRoom(room, {
      type: 'game_updated',
      game: {
        ...g,
        word: '?????' // drawer already knows
      }
    });
  }, 1000);
}

function advanceTriviaGame(room: ServerRoom) {
  if (!room.state.game || room.state.game.type !== 'trivia') return;
  const game = room.state.game as TriviaGame;

  if (room.gameTimer) clearInterval(room.gameTimer);

  const question = TRIVIA_BANK[(game.round - 1) % TRIVIA_BANK.length];
  game.status = 'playing';
  game.currentQuestion = {
    id: question.id,
    category: question.category,
    question: question.question,
    options: question.options
    // correctIndex hidden during play!
  };
  game.timeRemaining = 20;
  game.userAnswers = {};

  broadcastToRoom(room, {
    type: 'game_updated',
    game: { ...game },
    notification: `Pergunta #${game.round}: ${question.question}`
  });

  room.gameTimer = setInterval(() => {
    if (!room.state.game || room.state.game.type !== 'trivia') {
      if (room.gameTimer) clearInterval(room.gameTimer);
      return;
    }
    const g = room.state.game as TriviaGame;
    g.timeRemaining -= 1;

    if (g.timeRemaining <= 0) {
      if (room.gameTimer) clearInterval(room.gameTimer);
      g.status = 'round_end';
      const currentQ = TRIVIA_BANK[(g.round - 1) % TRIVIA_BANK.length];
      if (g.currentQuestion) {
        g.currentQuestion.correctIndex = currentQ.correctIndex;
      }

      // Calculate scores
      Object.entries(g.userAnswers).forEach(([uid, ansIdx]) => {
        if (ansIdx === currentQ.correctIndex) {
          g.scores[uid] = (g.scores[uid] || 0) + 100;
        }
      });

      broadcastToRoom(room, {
        type: 'game_updated',
        game: { ...g },
        notification: `Resposta correta: ${currentQ.options[currentQ.correctIndex]}`
      });

      // Wait 5s and next question
      setTimeout(() => {
        if (room.state.game && room.state.game.type === 'trivia') {
          (room.state.game as TriviaGame).round += 1;
          advanceTriviaGame(room);
        }
      }, 5000);
      return;
    }

    broadcastToRoom(room, {
      type: 'game_updated',
      game: { ...g }
    });
  }, 1000);
}

function handleClientMessage(client: ConnectedClient, room: ServerRoom, data: ClientEvent) {
  const { state } = room;
  const user = state.users.find(u => u.id === client.userId);
  if (!user && data.type !== 'join_room') return;

  switch (data.type) {
    case 'set_mode': {
      // Only host/moderator can change modes
      if (!user?.isHost) {
        sendToUser(client, { type: 'room_error', message: 'Apenas o moderador pode alterar os modos da sala.' });
        return;
      }
      state.mode = data.mode;
      broadcastToRoom(room, { type: 'mode_changed', mode: data.mode, changedBy: user.nickname });

      const modeNames: Record<RoomMode, string> = {
        chat: 'Conversa & Chat',
        drawing: 'Lousa de Desenho Colaborativo',
        games: 'Modo Jogos Multiplayer',
        music: 'Música Sincronizada'
      };

      const sysMsg: ChatMessage = {
        id: `sys-mode-${Date.now()}`,
        userId: 'system',
        nickname: 'Sistema',
        avatar: '🔄',
        color: '#6366f1',
        text: `${user.nickname} mudou o modo da sala para "${modeNames[data.mode]}".`,
        timestamp: Date.now(),
        type: 'system'
      };
      state.chat.push(sysMsg);
      broadcastToRoom(room, { type: 'chat_message', message: sysMsg });
      break;
    }

    case 'transfer_host': {
      // Host passing moderator role to guest
      if (!user?.isHost) {
        sendToUser(client, { type: 'room_error', message: 'Apenas o moderador atual pode transferir o título.' });
        return;
      }
      const targetUser = state.users.find(u => u.id === data.targetUserId);
      if (!targetUser) return;

      user.isHost = false;
      targetUser.isHost = true;
      state.hostId = targetUser.id;

      broadcastToRoom(room, { type: 'host_transferred', newHostId: targetUser.id });

      const transferMsg: ChatMessage = {
        id: `sys-host-${Date.now()}`,
        userId: 'system',
        nickname: 'Sistema',
        avatar: '👑',
        color: '#eab308',
        text: `👑 ${user.nickname} transferiu o título de Moderador para ${targetUser.nickname}!`,
        timestamp: Date.now(),
        type: 'system'
      };
      state.chat.push(transferMsg);
      broadcastToRoom(room, { type: 'chat_message', message: transferMsg });
      break;
    }

    case 'send_chat': {
      const text = data.text.trim();
      if (!text || !user) return;

      // Check if user is guessing during draw_guess
      if (state.mode === 'games' && state.game?.type === 'draw_guess' && state.game.status === 'playing') {
        const game = state.game as DrawGuessGame;
        const isDrawer = user.id === game.drawerId;
        const alreadyGuessed = game.guessedUsers.includes(user.id);

        if (!isDrawer && !alreadyGuessed && normalizeText(text) === normalizeText(game.word)) {
          game.guessedUsers.push(user.id);
          const points = game.guessedUsers.length === 1 ? 100 : 70;
          game.scores[user.id] = (game.scores[user.id] || 0) + points;
          // Award drawer some points
          if (game.drawerId) {
            game.scores[game.drawerId] = (game.scores[game.drawerId] || 0) + 30;
          }

          const correctMsg: ChatMessage = {
            id: `correct-${Date.now()}-${Math.random()}`,
            userId: user.id,
            nickname: user.nickname,
            avatar: user.avatar,
            color: user.color,
            text: `🎯 Acertou a palavra secreta! (+${points} pts)`,
            timestamp: Date.now(),
            type: 'guess_correct'
          };
          state.chat.push(correctMsg);
          broadcastToRoom(room, { type: 'chat_message', message: correctMsg });

          // If all guessers got it, advance early
          const nonDrawers = state.users.filter(u => u.id !== game.drawerId);
          if (game.guessedUsers.length >= nonDrawers.length && nonDrawers.length > 0) {
            game.status = 'round_end';
            broadcastToRoom(room, {
              type: 'game_updated',
              game: { ...game },
              notification: `Todos acertaram! A palavra era ${game.word}. Próxima rodada em instantes...`
            });
            setTimeout(() => advanceDrawGuessGame(room), 3500);
          }
          return;
        }
      }

      // Check if message is a reaction slash command (e.g. /esquentando, /comemoracao, /suspense, /risadas)
      const cleanCmd = normalizeText(text.toLowerCase());
      let matchedReaction: 'esquentando' | 'comemoracao' | 'suspense' | 'risadas' | null = null;
      if (cleanCmd.startsWith('/esquentando') || cleanCmd === '/esquentar') matchedReaction = 'esquentando';
      else if (cleanCmd.startsWith('/comemoracao') || cleanCmd.startsWith('/comemorar')) matchedReaction = 'comemoracao';
      else if (cleanCmd.startsWith('/suspense')) matchedReaction = 'suspense';
      else if (cleanCmd.startsWith('/risadas') || cleanCmd.startsWith('/risada')) matchedReaction = 'risadas';

      if (matchedReaction) {
        const reactionLabels = {
          esquentando: { emoji: '🔥', label: '🔥 ativou o clima: Esquentando!' },
          comemoracao: { emoji: '🎉', label: '🎉 soltou a reação: Comemoração!' },
          suspense: { emoji: '👀', label: '👀 colocou a sala em clima de Suspense!' },
          risadas: { emoji: '😂', label: '😂 disparou uma chuva de Risadas!' }
        };
        const info = reactionLabels[matchedReaction];

        const reactionMsg: ChatMessage = {
          id: `react-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          userId: user.id,
          nickname: user.nickname,
          avatar: info.emoji,
          color: user.color,
          text: `${user.nickname} ${info.label}`,
          timestamp: Date.now(),
          type: 'reaction',
          reactionType: matchedReaction
        };

        state.chat.push(reactionMsg);
        if (state.chat.length > 100) state.chat.shift();
        broadcastToRoom(room, { type: 'chat_message', message: reactionMsg });
        broadcastToRoom(room, {
          type: 'room_reaction',
          reactionType: matchedReaction,
          triggeredBy: user.nickname,
          userId: user.id,
          timestamp: Date.now()
        });
        return;
      }

      const msg: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        userId: user.id,
        nickname: user.nickname,
        avatar: user.avatar,
        color: user.color,
        text,
        timestamp: Date.now(),
        type: 'chat'
      };

      state.chat.push(msg);
      if (state.chat.length > 100) state.chat.shift();
      broadcastToRoom(room, { type: 'chat_message', message: msg });
      break;
    }

    case 'send_reaction': {
      if (!user) return;
      const { reactionType } = data;
      const reactionLabels = {
        esquentando: { emoji: '🔥', label: '🔥 ativou o clima: Esquentando!' },
        comemoracao: { emoji: '🎉', label: '🎉 soltou a reação: Comemoração!' },
        suspense: { emoji: '👀', label: '👀 colocou a sala em clima de Suspense!' },
        risadas: { emoji: '😂', label: '😂 disparou uma chuva de Risadas!' }
      };
      const info = reactionLabels[reactionType] || reactionLabels.comemoracao;

      const reactionMsg: ChatMessage = {
        id: `react-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        userId: user.id,
        nickname: user.nickname,
        avatar: info.emoji,
        color: user.color,
        text: `${user.nickname} ${info.label}`,
        timestamp: Date.now(),
        type: 'reaction',
        reactionType
      };

      state.chat.push(reactionMsg);
      if (state.chat.length > 100) state.chat.shift();
      broadcastToRoom(room, { type: 'chat_message', message: reactionMsg });
      broadcastToRoom(room, {
        type: 'room_reaction',
        reactionType,
        triggeredBy: user.nickname,
        userId: user.id,
        timestamp: Date.now()
      });
      break;
    }

    case 'voice_state': {
      if (!user) return;
      user.isMuted = data.isMuted;
      user.isDeafened = data.isDeafened;
      user.isSpeaking = data.isSpeaking;

      broadcastToRoom(room, {
        type: 'user_updated',
        user: {
          id: user.id,
          isMuted: user.isMuted,
          isDeafened: user.isDeafened,
          isSpeaking: user.isSpeaking
        }
      });
      break;
    }

    case 'draw_stroke': {
      if (room.strokes.length > 500) room.strokes.shift();
      room.strokes.push(data.stroke);
      broadcastToRoom(room, { type: 'draw_stroke', stroke: data.stroke }, client.userId);
      break;
    }

    case 'draw_live_stroke': {
      broadcastToRoom(room, {
        type: 'draw_live_stroke',
        userId: client.userId,
        strokeId: data.strokeId,
        points: data.points,
        color: data.color,
        size: data.size,
        isEraser: data.isEraser
      }, client.userId);
      break;
    }

    case 'draw_cursor': {
      broadcastToRoom(room, { type: 'draw_cursor', cursor: data.cursor }, client.userId);
      break;
    }

    case 'draw_clear': {
      room.strokes = [];
      broadcastToRoom(room, { type: 'draw_cleared', clearedBy: user?.nickname || 'Alguém' });
      break;
    }

    case 'music_control': {
      if (!user) return;
      const { music } = state;

      // Guest action: Request a song for the room playlist
      if (data.action === 'request_song' && data.track) {
        if (!music.allowGuestRequests && !user?.isHost) {
          sendToUser(client, { type: 'room_error', message: 'O moderador desativou pedidos de música no momento.' });
          return;
        }

        const requestedTrack: MusicTrack = {
          ...data.track,
          id: `req-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          requestedBy: {
            userId: user.id,
            nickname: user.nickname,
            avatar: user.avatar
          }
        };

        if (!music.songRequests) music.songRequests = [];
        music.songRequests.push(requestedTrack);

        broadcastToRoom(room, { type: 'music_updated', music });

        // System notification in chat
        const reqChatMsg: ChatMessage = {
          id: `sys-req-${Date.now()}`,
          userId: 'system',
          nickname: 'Música',
          avatar: '🎶',
          color: '#ec4899',
          text: `🎶 ${user.nickname} sugeriu a música "${requestedTrack.title}"! O moderador pode aprová-la para a fila.`,
          timestamp: Date.now(),
          type: 'system'
        };
        state.chat.push(reqChatMsg);
        broadcastToRoom(room, { type: 'chat_message', message: reqChatMsg });
        return;
      }

      // Moderator actions below
      if (!user?.isHost) {
        sendToUser(client, { type: 'room_error', message: 'Apenas o moderador pode controlar a reprodução principal.' });
        return;
      }

      if (data.action === 'play') {
        music.isPlaying = true;
        music.updatedAt = Date.now();
      } else if (data.action === 'pause') {
        if (music.isPlaying) {
          music.position += (Date.now() - music.updatedAt) / 1000;
        }
        music.isPlaying = false;
        music.updatedAt = Date.now();
      } else if (data.action === 'seek' && typeof data.position === 'number') {
        music.position = data.position;
        music.updatedAt = Date.now();
      } else if (data.action === 'change_track' && data.track) {
        music.currentTrack = data.track;
        music.position = 0;
        music.isPlaying = true;
        music.updatedAt = Date.now();
      } else if (data.action === 'add_queue' && data.track) {
        music.queue.push(data.track);
      } else if (data.action === 'approve_request' && data.requestId) {
        const reqIdx = (music.songRequests || []).findIndex(r => r.id === data.requestId);
        if (reqIdx !== -1) {
          const [approvedTrack] = music.songRequests.splice(reqIdx, 1);
          music.queue.push(approvedTrack);

          const approveMsg: ChatMessage = {
            id: `sys-appr-${Date.now()}`,
            userId: 'system',
            nickname: 'Música',
            avatar: '✅',
            color: '#10b981',
            text: `✅ O moderador aprovou "${approvedTrack.title}" pedida por ${approvedTrack.requestedBy?.nickname || 'um hóspede'}! Adicionada à fila.`,
            timestamp: Date.now(),
            type: 'system'
          };
          state.chat.push(approveMsg);
          broadcastToRoom(room, { type: 'chat_message', message: approveMsg });
        }
      } else if (data.action === 'reject_request' && data.requestId) {
        const reqIdx = (music.songRequests || []).findIndex(r => r.id === data.requestId);
        if (reqIdx !== -1) {
          music.songRequests.splice(reqIdx, 1);
        }
      } else if (data.action === 'toggle_requests') {
        music.allowGuestRequests = !music.allowGuestRequests;
      } else if (data.action === 'import_playlist') {
        music.playlistName = data.playlistName;
        music.playlistCover = data.playlistCover;
        music.playlistUrl = data.playlistUrl;
        music.spotifyEmbedUri = data.spotifyEmbedUri;
        if (data.track) {
          music.currentTrack = data.track;
          music.queue = data.tracks?.filter(t => t.id !== data.track?.id) || [];
        } else if (data.tracks && data.tracks.length > 0) {
          music.currentTrack = data.tracks[0];
          music.queue = data.tracks.slice(1);
        }
        music.position = 0;
        music.isPlaying = true;
        music.updatedAt = Date.now();

        const importMsg: ChatMessage = {
          id: `sys-pl-${Date.now()}`,
          userId: 'system',
          nickname: 'Spotify',
          avatar: '🎧',
          color: '#10b981',
          text: `🎶 ${user.nickname} importou a playlist "${data.playlistName || 'Spotify'}" com ${(data.tracks?.length || 0)} músicas!`,
          timestamp: Date.now(),
          type: 'system'
        };
        state.chat.push(importMsg);
        broadcastToRoom(room, { type: 'chat_message', message: importMsg });
      }

      broadcastToRoom(room, { type: 'music_updated', music });
      break;
    }

    case 'ambient_control': {
      if (!user) return;
      const { ambientSound } = state;

      // Only host/moderator can change track, volume or play/pause ambient sound for the room
      if (['play', 'pause', 'set_track', 'set_volume'].includes(data.action) && !user.isHost) {
        sendToUser(client, { type: 'room_error', message: 'Apenas o moderador pode controlar os sons de ambiente da sala.' });
        return;
      }

      if (data.action === 'play') {
        ambientSound.isPlaying = true;
        ambientSound.updatedAt = Date.now();
      } else if (data.action === 'pause') {
        ambientSound.isPlaying = false;
        ambientSound.updatedAt = Date.now();
      } else if (data.action === 'set_track') {
        ambientSound.trackId = data.trackId || 'rain-soft';
        ambientSound.title = data.title || 'Chuva Suave';
        ambientSound.category = data.category || 'Clima';
        ambientSound.icon = data.icon || '🌧️';
        ambientSound.soundType = data.soundType || 'rain';
        ambientSound.audioUrl = data.audioUrl;
        ambientSound.isPlaying = true;
        ambientSound.updatedAt = Date.now();

        const ambMsg: ChatMessage = {
          id: `sys-amb-${Date.now()}`,
          userId: 'system',
          nickname: 'Ambiente',
          avatar: ambientSound.icon,
          color: '#06b6d4',
          text: `${ambientSound.icon} O moderador colocou o áudio ambiente: "${ambientSound.title}"`,
          timestamp: Date.now(),
          type: 'system'
        };
        state.chat.push(ambMsg);
        broadcastToRoom(room, { type: 'chat_message', message: ambMsg });
      } else if (data.action === 'set_volume' && typeof data.volume === 'number') {
        ambientSound.volume = Math.max(0, Math.min(1, data.volume));
        ambientSound.updatedAt = Date.now();
      }

      broadcastToRoom(room, { type: 'ambient_updated', ambient: ambientSound });
      break;
    }

    case 'set_wallpaper': {
      if (!user) return;
      state.desktopWallpaper = data.wallpaperUrl;
      broadcastToRoom(room, {
        type: 'wallpaper_updated',
        wallpaperUrl: data.wallpaperUrl,
        setBy: user.nickname
      });
      break;
    }

    case 'game_control': {
      // Game start/stop/switch restricted to host, in-game actions open to players
      if (['start', 'stop', 'set_type', 'next_round'].includes(data.action) && !user?.isHost) {
        sendToUser(client, { type: 'room_error', message: 'Apenas o moderador pode configurar as partidas.' });
        return;
      }

      if (data.action === 'set_type') {
        const type = data.gameType || 'draw_guess';
        if (type === 'draw_guess') {
          state.game = {
            type: 'draw_guess',
            status: 'idle',
            round: 0,
            totalRounds: 5,
            drawerId: null,
            word: '',
            wordHint: '',
            category: '',
            timeRemaining: 60,
            scores: {},
            guessedUsers: []
          };
        } else if (type === 'trivia') {
          state.game = {
            type: 'trivia',
            status: 'idle',
            round: 1,
            totalRounds: 5,
            currentQuestion: null,
            timeRemaining: 20,
            scores: {},
            userAnswers: {}
          };
        } else if (type === 'tictactoe') {
          const players = state.users.map(u => u.id);
          state.game = {
            type: 'tictactoe',
            status: 'playing',
            board: Array(9).fill(null),
            playerX: players[0] || null,
            playerO: players[1] || null,
            turn: 'X',
            winner: null,
            winningLine: null,
            scores: {}
          };
        }
        broadcastToRoom(room, { type: 'game_updated', game: state.game });
      } else if (data.action === 'start') {
        if (!state.game) {
          state.game = {
            type: 'draw_guess',
            status: 'idle',
            round: 0,
            totalRounds: 5,
            drawerId: null,
            word: '',
            wordHint: '',
            category: '',
            timeRemaining: 60,
            scores: {},
            guessedUsers: []
          };
        }
        if (state.game.type === 'draw_guess') {
          advanceDrawGuessGame(room);
        } else if (state.game.type === 'trivia') {
          advanceTriviaGame(room);
        } else if (state.game.type === 'tictactoe') {
          const g = state.game as TicTacToeGame;
          g.board = Array(9).fill(null);
          g.turn = 'X';
          g.winner = null;
          g.winningLine = null;
          g.status = 'playing';
          broadcastToRoom(room, { type: 'game_updated', game: g });
        }
      } else if (data.action === 'answer_trivia' && typeof data.answerIndex === 'number') {
        if (state.game?.type === 'trivia' && state.game.status === 'playing') {
          const g = state.game as TriviaGame;
          if (g.userAnswers[client.userId] === undefined) {
            g.userAnswers[client.userId] = data.answerIndex;
            broadcastToRoom(room, { type: 'game_updated', game: g });
          }
        }
      } else if (data.action === 'join_tictactoe' && data.role) {
        if (state.game?.type === 'tictactoe') {
          const g = state.game as TicTacToeGame;
          if (data.role === 'X' && !g.playerX) g.playerX = client.userId;
          if (data.role === 'O' && !g.playerO) g.playerO = client.userId;
          broadcastToRoom(room, { type: 'game_updated', game: g });
        }
      } else if (data.action === 'tictactoe_move' && typeof data.cellIndex === 'number') {
        if (state.game?.type === 'tictactoe' && state.game.status === 'playing') {
          const g = state.game as TicTacToeGame;
          const isPlayerX = client.userId === g.playerX;
          const isPlayerO = client.userId === g.playerO;
          const mySymbol = isPlayerX ? 'X' : isPlayerO ? 'O' : null;

          if (mySymbol && mySymbol === g.turn && g.board[data.cellIndex] === null) {
            g.board[data.cellIndex] = mySymbol;
            const res = checkTicTacToeWinner(g.board);
            if (res.winner) {
              g.winner = res.winner;
              g.winningLine = res.line;
              g.status = 'round_end';
              if (res.winner === 'X' && g.playerX) {
                g.scores[g.playerX] = (g.scores[g.playerX] || 0) + 1;
              } else if (res.winner === 'O' && g.playerO) {
                g.scores[g.playerO] = (g.scores[g.playerO] || 0) + 1;
              }
            } else {
              g.turn = g.turn === 'X' ? 'O' : 'X';
            }
            broadcastToRoom(room, { type: 'game_updated', game: g });
          }
        }
      }
      break;
    }

    case 'webrtc_signal': {
      // Direct WebRTC signaling mesh between peers
      const targetClient = room.clients.get(data.targetUserId);
      if (targetClient && targetClient.ws.readyState === WebSocket.OPEN) {
        sendToUser(targetClient, {
          type: 'webrtc_signal',
          senderUserId: client.userId,
          signal: data.signal
        });
      }
      break;
    }
  }
}

function handleClientDisconnect(client: ConnectedClient) {
  const room = rooms.get(client.roomId);
  if (!room) return;

  room.clients.delete(client.userId);
  const userIdx = room.state.users.findIndex(u => u.id === client.userId);
  if (userIdx === -1) return;

  const [removedUser] = room.state.users.splice(userIdx, 1);
  let newHostId: string | undefined;

  // If host left and there are other users, promote next user
  if (removedUser.isHost && room.state.users.length > 0) {
    room.state.users[0].isHost = true;
    room.state.hostId = room.state.users[0].id;
    newHostId = room.state.users[0].id;

    const hostMsg: ChatMessage = {
      id: `sys-host-${Date.now()}`,
      userId: 'system',
      nickname: 'Sistema',
      avatar: '👑',
      color: '#eab308',
      text: `👑 ${removedUser.nickname} saiu da sala. ${room.state.users[0].nickname} agora é o novo Moderador!`,
      timestamp: Date.now(),
      type: 'system'
    };
    room.state.chat.push(hostMsg);
  }

  broadcastToRoom(room, {
    type: 'user_left',
    userId: client.userId,
    newHostId
  });

  // If room is completely empty, cleanup after timeout
  if (room.state.users.length === 0) {
    if (room.gameTimer) clearInterval(room.gameTimer);
    setTimeout(() => {
      if (room.state.users.length === 0) {
        rooms.delete(client.roomId);
      }
    }, 15 * 60 * 1000);
  }
}

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server });

  app.use(express.json());

  // Quick API health & room status query
  app.get('/api/room/:roomId', (req, res) => {
    const room = rooms.get(req.params.roomId);
    if (!room) {
      return res.json({ exists: false, count: 0, max: 6 });
    }
    return res.json({
      exists: true,
      name: room.state.name,
      count: room.state.users.length,
      max: room.state.maxUsers,
      isFull: room.state.users.length >= room.state.maxUsers
    });
  });

  // Spotify playlist/album/track resolver endpoint
  app.post('/api/spotify/resolve', async (req, res) => {
    try {
      const inputUrl = (req.body?.url || '').trim();
      if (!inputUrl) {
        return res.status(400).json({ success: false, message: 'URL do Spotify é obrigatória.' });
      }

      // Match playlist, album, track or artist
      const match = inputUrl.match(/spotify\.com\/(playlist|album|track)\/([a-zA-Z0-9]+)/i) ||
                    inputUrl.match(/spotify:(playlist|album|track):([a-zA-Z0-9]+)/i);

      if (!match) {
        return res.status(400).json({
          success: false,
          message: 'Link inválido. Insira um link válido do Spotify (ex: https://open.spotify.com/playlist/... ou album/... ou track/...)'
        });
      }

      const type = match[1].toLowerCase();
      const id = match[2];
      const embedUrl = `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`;
      const canonicalUrl = `https://open.spotify.com/${type}/${id}`;

      let title = type === 'playlist' ? 'Playlist Spotify' : type === 'album' ? 'Álbum Spotify' : 'Faixa Spotify';
      let subtitle = 'Spotify';
      let coverArt = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&h=600&fit=crop';
      let tracks: MusicTrack[] = [];

      // 1. Fetch Spotify oEmbed for accurate Title & high-res Cover Art
      try {
        const oembedRes = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(canonicalUrl)}`, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
          signal: AbortSignal.timeout(4000)
        });
        if (oembedRes.ok) {
          const oembedData = await oembedRes.json() as any;
          if (oembedData.title) title = oembedData.title;
          if (oembedData.thumbnail_url) coverArt = oembedData.thumbnail_url;
        }
      } catch (e) {
        // oEmbed fallback continues
      }

      // 2. Fetch Embed HTML to parse __NEXT_DATA__ tracklist
      try {
        const embedRes = await fetch(`https://open.spotify.com/embed/${type}/${id}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8'
          },
          signal: AbortSignal.timeout(5000)
        });

        if (embedRes.ok) {
          const html = await embedRes.text();
          const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
          if (nextDataMatch && nextDataMatch[1]) {
            const nextData = JSON.parse(nextDataMatch[1]);
            const entity = nextData?.props?.pageProps?.state?.data?.entity;
            if (entity) {
              if (entity.name) title = entity.name;
              if (entity.subtitle) subtitle = entity.subtitle;
              if (entity.coverArt?.sources?.length > 0) {
                coverArt = entity.coverArt.sources[0].url;
              }

              // Extract tracks
              if (Array.isArray(entity.trackList) && entity.trackList.length > 0) {
                tracks = entity.trackList.map((t: any, idx: number) => ({
                  id: t.id || `spotify-t-${idx}-${Date.now()}`,
                  title: t.title || `Faixa ${idx + 1}`,
                  artist: t.subtitle || subtitle || 'Spotify Artist',
                  duration: Math.max(30, Math.floor((t.duration || 180000) / 1000)),
                  coverArt: t.coverArt?.sources?.[0]?.url || coverArt,
                  audioUrl: t.audioPreview?.url || (idx === 0 ? 'https://ice1.somafm.com/groovesalad-128-mp3' : undefined),
                  source: 'spotify' as const,
                  spotifyUri: t.uri || `spotify:track:${t.id || id}`
                }));
              }
            }
          }
        }
      } catch (err) {
        console.error('Error fetching Spotify embed data:', err);
      }

      // If it's a single track or no tracks were extracted from page props
      if (tracks.length === 0) {
        tracks = [{
          id: `track-${id}`,
          title: title || 'Faixa Spotify',
          artist: subtitle || 'Artista Spotify',
          duration: 210,
          coverArt,
          audioUrl: 'https://ice1.somafm.com/groovesalad-128-mp3',
          source: 'spotify',
          spotifyUri: `spotify:${type}:${id}`
        }];
      }

      return res.json({
        success: true,
        type,
        id,
        title,
        subtitle,
        coverArt,
        embedUrl,
        trackCount: tracks.length,
        tracks
      });
    } catch (error: any) {
      console.error('Resolve spotify error:', error);
      return res.status(500).json({
        success: false,
        message: 'Falha ao importar playlist do Spotify. Verifique se o link é público.'
      });
    }
  });

  // WebSocket Server Setup
  wss.on('connection', (ws) => {
    let clientRef: ConnectedClient | null = null;

    ws.on('message', (rawData) => {
      try {
        const data = JSON.parse(rawData.toString()) as ClientEvent;

        if (data.type === 'join_room') {
          const roomId = data.roomId.trim().toLowerCase();
          const nickname = data.nickname.trim().slice(0, 24) || 'Amigo Anônimo';
          const room = getOrCreateRoom(roomId, nickname);

          // Strictly enforce limit of 6 people!
          if (room.state.users.length >= 6) {
            ws.send(JSON.stringify({
              type: 'room_error',
              code: 'ROOM_FULL',
              message: 'Esta sala já atingiu a capacidade máxima de 6 participantes.'
            }));
            return;
          }

          const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          const isFirstUser = room.state.users.length === 0;

          const newUser: RoomUser = {
            id: userId,
            nickname,
            avatar: data.avatar || '🎧',
            color: data.color || '#6366f1',
            isHost: isFirstUser,
            isMuted: false,
            isDeafened: false,
            isSpeaking: false,
            joinedAt: Date.now()
          };

          if (isFirstUser) {
            room.state.hostId = userId;
          }

          room.state.users.push(newUser);
          clientRef = { ws, userId, roomId };
          room.clients.set(userId, clientRef);

          // Send full room state to the newly joined user
          sendToUser(clientRef, {
            type: 'room_joined',
            room: room.state,
            yourId: userId
          });

          // Send current drawing history
          if (room.strokes.length > 0) {
            sendToUser(clientRef, {
              type: 'draw_history',
              strokes: room.strokes
            });
          }

          // Broadcast user_joined to all other participants
          broadcastToRoom(room, {
            type: 'user_joined',
            user: newUser
          }, userId);

          // System notification in chat
          const joinChatMsg: ChatMessage = {
            id: `sys-join-${Date.now()}`,
            userId: 'system',
            nickname: 'Sistema',
            avatar: '👋',
            color: '#10b981',
            text: `${newUser.nickname} entrou na sala! (${room.state.users.length}/6)`,
            timestamp: Date.now(),
            type: 'system'
          };
          room.state.chat.push(joinChatMsg);
          broadcastToRoom(room, { type: 'chat_message', message: joinChatMsg });
          return;
        }

        if (clientRef) {
          const room = rooms.get(clientRef.roomId);
          if (room) {
            handleClientMessage(clientRef, room, data);
          }
        }
      } catch (err) {
        console.error('WS error:', err);
      }
    });

    ws.on('close', () => {
      if (clientRef) {
        handleClientDisconnect(clientRef);
      }
    });

    ws.on('error', (err) => {
      console.error('Socket error:', err);
      if (clientRef) {
        handleClientDisconnect(clientRef);
      }
    });
  });

  // Vite middleware in dev or static files in production
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 VibeRoom server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
