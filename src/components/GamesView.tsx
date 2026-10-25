import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  Gamepad2, 
  Trophy, 
  Timer, 
  Sparkles, 
  Play, 
  HelpCircle, 
  Flame, 
  RotateCcw,
  Pencil,
  CheckCircle2,
  Users
} from 'lucide-react';
import { DrawingView } from './DrawingView';
import type { 
  GameState, 
  GameType, 
  DrawGuessGame, 
  TriviaGame, 
  TicTacToeGame, 
  RoomUser,
  DrawStroke,
  DrawCursor
} from '../../shared/types.js';

interface GamesViewProps {
  gameState: GameState;
  isHost: boolean;
  users: RoomUser[];
  myUserId: string;
  myNickname: string;
  myColor: string;
  strokes: DrawStroke[];
  remoteCursors: Record<string, DrawCursor>;
  onSendStroke: (stroke: DrawStroke) => void;
  onSendCursor: (cursor: DrawCursor) => void;
  onClearDrawing: () => void;
  onGameAction: (action: any) => void;
}

export const GamesView: React.FC<GamesViewProps> = ({
  gameState,
  isHost,
  users,
  myUserId,
  myNickname,
  myColor,
  strokes,
  remoteCursors,
  onSendStroke,
  onSendCursor,
  onClearDrawing,
  onGameAction
}) => {
  const [guessInput, setGuessInput] = useState('');

  // Trigger celebration confetti on win or correct guess
  useEffect(() => {
    if (gameState?.type === 'draw_guess') {
      const g = gameState as DrawGuessGame;
      if (g.guessedUsers.includes(myUserId) && g.guessedUsers.length === 1) {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 }
        });
      }
    } else if (gameState?.type === 'tictactoe') {
      const g = gameState as TicTacToeGame;
      if (g.winner && g.winner !== 'draw') {
        const isWinnerMe = (g.winner === 'X' && g.playerX === myUserId) || (g.winner === 'O' && g.playerO === myUserId);
        if (isWinnerMe) {
          confetti({
            particleCount: 70,
            spread: 80,
            origin: { y: 0.6 }
          });
        }
      }
    }
  }, [gameState, myUserId]);

  const handleSelectGameType = (type: GameType) => {
    if (!isHost) return;
    onGameAction({ action: 'set_type', gameType: type });
  };

  const handleStartGame = () => {
    if (!isHost) return;
    onGameAction({ action: 'start' });
  };

  const handleGuessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guessInput.trim()) return;
    onGameAction({ action: 'guess', guess: guessInput.trim() });
    setGuessInput('');
  };

  const handleAnswerTrivia = (optionIdx: number) => {
    onGameAction({ action: 'answer_trivia', answerIndex: optionIdx });
  };

  const handleTicTacToeCellClick = (idx: number) => {
    onGameAction({ action: 'tictactoe_move', cellIndex: idx });
  };

  const handleJoinTicTacToe = (role: 'X' | 'O') => {
    onGameAction({ action: 'join_tictactoe', role });
  };

  // Safe lookup helper
  const getUser = (id: string | null) => users.find((u) => u.id === id);

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Game Selector Header (Host controlled) */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 sm:p-2.5 rounded-2xl bg-slate-900/80 border border-slate-800 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
            <Gamepad2 className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-bold text-white">Jogos</h2>
            <p className="text-[10px] text-slate-400 hidden sm:block">
              {isHost ? 'Escolha um jogo para a sala' : 'Aguardando moderador'}
            </p>
          </div>
        </div>

        {/* Game Mode Tabs - Minimalist Icon-First */}
        <div className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => handleSelectGameType('draw_guess')}
            disabled={!isHost}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              (gameState?.type || 'draw_guess') === 'draw_guess'
                ? 'bg-indigo-600 text-white shadow-sm'
                : isHost
                ? 'text-slate-400 hover:text-white cursor-pointer'
                : 'text-slate-500 cursor-not-allowed opacity-60'
            }`}
            title="Desenhe & Adivinhe"
          >
            🎨 <span className="hidden sm:inline">Desenho</span>
          </button>

          <button
            onClick={() => handleSelectGameType('trivia')}
            disabled={!isHost}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              gameState?.type === 'trivia'
                ? 'bg-indigo-600 text-white shadow-sm'
                : isHost
                ? 'text-slate-400 hover:text-white cursor-pointer'
                : 'text-slate-500 cursor-not-allowed opacity-60'
            }`}
            title="Quiz & Trivia"
          >
            🧠 <span className="hidden sm:inline">Quiz</span>
          </button>

          <button
            onClick={() => handleSelectGameType('tictactoe')}
            disabled={!isHost}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              gameState?.type === 'tictactoe'
                ? 'bg-indigo-600 text-white shadow-sm'
                : isHost
                ? 'text-slate-400 hover:text-white cursor-pointer'
                : 'text-slate-500 cursor-not-allowed opacity-60'
            }`}
            title="Jogo da Velha"
          >
            ⭕ <span className="hidden sm:inline">Velha</span>
          </button>
        </div>

        {/* Start / Restart Game button */}
        {isHost && (
          <button
            onClick={handleStartGame}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-sm cursor-pointer ml-auto"
            title={gameState?.status === 'playing' ? 'Reiniciar Rodada' : 'Começar Jogo'}
          >
            {gameState?.status === 'playing' ? (
              <>
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reiniciar</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span className="hidden sm:inline">Começar</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Main Game Screen */}
      <div className="flex-1 min-h-0">
        {/* GAME 1: DRAW & GUESS */}
        {(!gameState || gameState.type === 'draw_guess') && (
          <div className="h-full flex flex-col md:flex-row gap-4">
            {/* Left: Canvas & Drawing Controls */}
            <div className="flex-1 flex flex-col min-h-[400px]">
              {gameState?.status === 'playing' && (
                <div className="flex items-center justify-between px-4 py-2 bg-indigo-950/40 border border-indigo-500/30 rounded-xl mb-3">
                  <div className="flex items-center gap-2">
                    <Timer className="w-4 h-4 text-amber-400 animate-pulse" />
                    <span className="text-xs font-mono font-bold text-amber-300 tabular-nums">
                      {gameState.timeRemaining}s
                    </span>
                    <span className="text-slate-500">·</span>
                    <span className="text-xs text-slate-300">
                      Categoria: <strong>{(gameState as DrawGuessGame).category}</strong>
                    </span>
                  </div>

                  {/* Word Hint or Secret Word */}
                  <div className="text-sm font-mono tracking-widest font-bold">
                    {(gameState as DrawGuessGame).drawerId === myUserId ? (
                      <span className="text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded border border-emerald-500/30">
                        Sua palavra: {(gameState as DrawGuessGame).word}
                      </span>
                    ) : (
                      <span className="text-amber-300 bg-slate-900 px-3 py-1 rounded border border-slate-700">
                        {(gameState as DrawGuessGame).wordHint}
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-400 flex items-center gap-1.5">
                    <Pencil className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Desenhando: {getUser((gameState as DrawGuessGame).drawerId)?.nickname || '...'}</span>
                  </div>
                </div>
              )}

              <div className="flex-1 min-h-0">
                <DrawingView
                  strokes={strokes}
                  remoteCursors={remoteCursors}
                  onSendStroke={onSendStroke}
                  onSendCursor={onSendCursor}
                  onClear={onClearDrawing}
                  myUserId={myUserId}
                  myNickname={myNickname}
                  myColor={myColor}
                  readOnly={
                    gameState?.status === 'playing' &&
                    (gameState as DrawGuessGame).drawerId !== myUserId
                  }
                />
              </div>

              {/* Guesser Submit Bar */}
              {gameState?.status === 'playing' &&
                (gameState as DrawGuessGame).drawerId !== myUserId && (
                  <form onSubmit={handleGuessSubmit} className="mt-3 flex gap-2">
                    <input
                      type="text"
                      value={guessInput}
                      onChange={(e) => setGuessInput(e.target.value)}
                      placeholder="Qual é o desenho? Digite seu palpite aqui..."
                      className="flex-1 bg-slate-900 border border-slate-700 text-white text-xs rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="submit"
                      disabled={!guessInput.trim()}
                      className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer"
                    >
                      Palpitar
                    </button>
                  </form>
                )}
            </div>

            {/* Right: Scoreboard */}
            <div className="w-full md:w-64 bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-800 text-xs font-bold text-white">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>Placar da Partida</span>
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto">
                {users.map((u, i) => {
                  const score =
                    gameState && gameState.type === 'draw_guess'
                      ? gameState.scores[u.id] || 0
                      : 0;
                  const hasGuessed =
                    gameState &&
                    gameState.type === 'draw_guess' &&
                    gameState.guessedUsers.includes(u.id);

                  return (
                    <div
                      key={u.id}
                      className={`flex items-center justify-between p-2 rounded-xl text-xs ${
                        hasGuessed
                          ? 'bg-emerald-950/30 border border-emerald-500/30 text-emerald-300'
                          : 'bg-slate-950/40 border border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-500 text-[10px]">#{i + 1}</span>
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[10px]"
                          style={{ backgroundColor: `${u.color}30` }}
                        >
                          {u.avatar}
                        </div>
                        <span className="truncate max-w-[90px] font-medium">{u.nickname}</span>
                      </div>

                      <div className="flex items-center gap-1.5 font-mono font-bold tabular-nums">
                        {hasGuessed && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                        <span className="text-white">{score}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {gameState?.status !== 'playing' && isHost && (
                <div className="pt-2 border-t border-slate-800 text-center">
                  <p className="text-[11px] text-slate-400 mb-2">Clique para iniciar a 1ª rodada</p>
                  <button
                    onClick={handleStartGame}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Iniciar Desenhe & Adivinhe
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* GAME 2: TRIVIA & QUIZ */}
        {gameState?.type === 'trivia' && (
          <div className="h-full flex flex-col max-w-3xl mx-auto justify-center p-4">
            {gameState.status === 'playing' || gameState.status === 'round_end' ? (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
                {/* Header with timer */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-indigo-400 tracking-wider">
                      {gameState.currentQuestion?.category || 'Cultura & Geek'}
                    </span>
                    <span className="text-slate-600">·</span>
                    <span className="text-xs text-slate-400">
                      Rodada {gameState.round} de {gameState.totalRounds}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950 border border-slate-800 text-amber-300 font-mono text-xs font-bold">
                    <Timer className="w-3.5 h-3.5" />
                    <span>{gameState.timeRemaining}s</span>
                  </div>
                </div>

                {/* Question Text */}
                <h3 className="text-lg sm:text-xl font-bold text-white leading-relaxed text-center">
                  {gameState.currentQuestion?.question}
                </h3>

                {/* 4 Options Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {gameState.currentQuestion?.options.map((opt, idx) => {
                    const isMyAnswer = gameState.userAnswers[myUserId] === idx;
                    const isCorrect =
                      gameState.status === 'round_end' &&
                      gameState.currentQuestion?.correctIndex === idx;
                    const isWrong =
                      gameState.status === 'round_end' &&
                      isMyAnswer &&
                      !isCorrect;

                    return (
                      <button
                        key={idx}
                        onClick={() => handleAnswerTrivia(idx)}
                        disabled={
                          gameState.status !== 'playing' ||
                          gameState.userAnswers[myUserId] !== undefined
                        }
                        className={`p-4 rounded-2xl text-left font-medium text-xs sm:text-sm border transition-all cursor-pointer flex items-center justify-between ${
                          isCorrect
                            ? 'bg-emerald-950/60 border-emerald-500 text-emerald-200 ring-2 ring-emerald-500/40'
                            : isWrong
                            ? 'bg-rose-950/60 border-rose-500 text-rose-200'
                            : isMyAnswer
                            ? 'bg-indigo-600 text-white border-indigo-400 shadow-md'
                            : 'bg-slate-950/60 hover:bg-slate-800 border-slate-800 text-slate-200'
                        }`}
                      >
                        <span>{opt}</span>
                        {isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                {/* Answers status from other users */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-800 text-xs text-slate-400">
                  <span>Respostas recebidas:</span>
                  <div className="flex items-center gap-1.5">
                    {users.map((u) => (
                      <div
                        key={u.id}
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] border ${
                          gameState.userAnswers[u.id] !== undefined
                            ? 'border-emerald-400 bg-emerald-950/50'
                            : 'border-slate-800 bg-slate-900 opacity-50'
                        }`}
                        title={`${u.nickname}: ${
                          gameState.userAnswers[u.id] !== undefined ? 'Respondeu' : 'Pensando...'
                        }`}
                      >
                        {u.avatar}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-4">
                <HelpCircle className="w-12 h-12 text-indigo-400 mx-auto" />
                <h3 className="text-lg font-bold text-white">Quiz & Trivia Multiplayer</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Perguntas cronometradas em tempo real. Quem responder corretamente mais rápido ganha mais pontos!
                </p>
                {isHost && (
                  <button
                    onClick={handleStartGame}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl cursor-pointer shadow-lg"
                  >
                    Iniciar Quiz
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* GAME 3: TIC-TAC-TOE RELÂMPAGO */}
        {gameState?.type === 'tictactoe' && (
          <div className="h-full flex flex-col items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl max-w-md w-full space-y-6">
              {/* Players matchup bar */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center border border-indigo-500/30">
                    X
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">
                      {getUser(gameState.playerX)?.nickname || 'Aguardando...'}
                    </div>
                    {!gameState.playerX && (
                      <button
                        onClick={() => handleJoinTicTacToe('X')}
                        className="text-[10px] text-indigo-400 hover:underline cursor-pointer"
                      >
                        Jogar como X
                      </button>
                    )}
                  </div>
                </div>

                <div className="text-xs font-mono font-bold text-slate-500">VS</div>

                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className="text-xs font-semibold text-white">
                      {getUser(gameState.playerO)?.nickname || 'Aguardando...'}
                    </div>
                    {!gameState.playerO && (
                      <button
                        onClick={() => handleJoinTicTacToe('O')}
                        className="text-[10px] text-amber-400 hover:underline cursor-pointer"
                      >
                        Jogar como O
                      </button>
                    )}
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center border border-amber-500/30">
                    O
                  </div>
                </div>
              </div>

              {/* Status Notice */}
              <div className="text-center text-xs">
                {gameState.winner ? (
                  <span className="text-emerald-400 font-bold">
                    {gameState.winner === 'draw'
                      ? 'Empate técnico!'
                      : `Vitória de ${gameState.winner}! 🎉`}
                  </span>
                ) : (
                  <span className="text-slate-300">
                    Vez de: <strong className="text-indigo-400">{gameState.turn}</strong>
                  </span>
                )}
              </div>

              {/* 3x3 Board */}
              <div className="grid grid-cols-3 gap-2.5 max-w-[280px] mx-auto">
                {gameState.board.map((cell, idx) => {
                  const isWinningCell = gameState.winningLine?.includes(idx);
                  return (
                    <button
                      key={idx}
                      onClick={() => handleTicTacToeCellClick(idx)}
                      disabled={cell !== null || !!gameState.winner}
                      className={`h-20 rounded-2xl text-2xl font-black flex items-center justify-center transition-all cursor-pointer ${
                        isWinningCell
                          ? 'bg-emerald-600 text-white animate-bounce'
                          : cell === 'X'
                          ? 'bg-indigo-950/60 text-indigo-400 border border-indigo-500/40'
                          : cell === 'O'
                          ? 'bg-amber-950/60 text-amber-400 border border-amber-500/40'
                          : 'bg-slate-950 hover:bg-slate-800/80 border border-slate-800'
                      }`}
                    >
                      {cell}
                    </button>
                  );
                })}
              </div>

              {/* Restart */}
              {isHost && (
                <div className="pt-2 text-center">
                  <button
                    onClick={handleStartGame}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Novo Jogo da Velha
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
