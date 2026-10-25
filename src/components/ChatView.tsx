import React, { useState, useRef, useEffect } from 'react';
import { Send, Smile, Sparkles, Command, Flame, PartyPopper, Eye, Laugh } from 'lucide-react';
import type { ChatMessage, ReactionType } from '../../shared/types.js';

interface SlashReaction {
  id: ReactionType;
  command: string;
  title: string;
  description: string;
  icon: string;
  accentColor: string;
  cardStyle: string;
}

export const SLASH_REACTIONS: SlashReaction[] = [
  {
    id: 'esquentando',
    command: '/esquentando',
    title: 'Esquentando',
    description: 'Chamas ardentes & energia alta',
    icon: '🔥',
    accentColor: '#f97316',
    cardStyle: 'bg-gradient-to-r from-red-950/70 via-orange-950/60 to-slate-900 border-orange-500/40 text-orange-200'
  },
  {
    id: 'comemoracao',
    command: '/comemoracao',
    title: 'Comemoração',
    description: 'Festa, confetes & vitória',
    icon: '🎉',
    accentColor: '#10b981',
    cardStyle: 'bg-gradient-to-r from-emerald-950/70 via-teal-950/60 to-slate-900 border-emerald-500/40 text-emerald-200'
  },
  {
    id: 'suspense',
    command: '/suspense',
    title: 'Suspense',
    description: 'Mistério, tensão & olhos atentos',
    icon: '👀',
    accentColor: '#a855f7',
    cardStyle: 'bg-gradient-to-r from-purple-950/70 via-indigo-950/60 to-slate-900 border-purple-500/40 text-purple-200'
  },
  {
    id: 'risadas',
    command: '/risadas',
    title: 'Risadas',
    description: 'Gargalhada & diversão máxima',
    icon: '😂',
    accentColor: '#eab308',
    cardStyle: 'bg-gradient-to-r from-amber-950/70 via-yellow-950/60 to-slate-900 border-amber-500/40 text-amber-200'
  }
];

interface ChatViewProps {
  messages: ChatMessage[];
  myUserId: string;
  onSendMessage: (text: string) => void;
  onSendReaction?: (reactionType: ReactionType) => void;
  placeholder?: string;
}

export const ChatView: React.FC<ChatViewProps> = ({
  messages,
  myUserId,
  onSendMessage,
  onSendReaction,
  placeholder = 'Escreva ou digite / para reações...'
}) => {
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [selectedSlashIndex, setSelectedSlashIndex] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const emojis = ['😄', '🔥', '🎉', '❤️', '👏', '👀', '🤣', '🎮', '✨', '💯'];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle typing / to trigger slash commands menu
  useEffect(() => {
    if (inputText.startsWith('/')) {
      setShowSlashMenu(true);
      setSelectedSlashIndex(0);
    } else if (showSlashMenu && !inputText.startsWith('/')) {
      setShowSlashMenu(false);
    }
  }, [inputText]);

  // Filter slash reactions based on search after "/"
  const slashQuery = inputText.startsWith('/') ? inputText.slice(1).toLowerCase().trim() : '';
  const filteredReactions = SLASH_REACTIONS.filter(
    (r) =>
      r.title.toLowerCase().includes(slashQuery) ||
      r.command.toLowerCase().includes(slashQuery) ||
      r.id.toLowerCase().includes(slashQuery)
  );

  const handleTriggerReaction = (reaction: SlashReaction) => {
    if (onSendReaction) {
      onSendReaction(reaction.id);
    } else {
      onSendMessage(reaction.command);
    }
    setInputText('');
    setShowSlashMenu(false);
    setShowEmojiPicker(false);
  };

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    // If user hit send while slash menu is open and filtered has match
    if (inputText.startsWith('/')) {
      if (filteredReactions.length > 0) {
        handleTriggerReaction(filteredReactions[selectedSlashIndex] || filteredReactions[0]);
        return;
      }
    }

    onSendMessage(inputText.trim());
    setInputText('');
    setShowEmojiPicker(false);
    setShowSlashMenu(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showSlashMenu && filteredReactions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSlashIndex((prev) => (prev + 1) % filteredReactions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSlashIndex((prev) => (prev - 1 + filteredReactions.length) % filteredReactions.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        handleTriggerReaction(filteredReactions[selectedSlashIndex]);
      } else if (e.key === 'Escape') {
        setShowSlashMenu(false);
      }
    }
  };

  const handleAddEmoji = (emoji: string) => {
    setInputText((prev) => prev + emoji);
  };

  const handleToggleSlashMenu = () => {
    setShowEmojiPicker(false);
    if (!showSlashMenu) {
      setInputText('/');
      setShowSlashMenu(true);
      setSelectedSlashIndex(0);
      inputRef.current?.focus();
    } else {
      setInputText('');
      setShowSlashMenu(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950/60 rounded-2xl border border-slate-800/80 overflow-hidden shadow-lg relative">
      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
        {messages.map((msg) => {
          const isMe = msg.userId === myUserId;
          const isSystem = msg.type === 'system';
          const isCorrectGuess = msg.type === 'guess_correct';
          const isReaction = msg.type === 'reaction';

          // Clean, quiet inline system message
          if (isSystem) {
            return (
              <div
                key={msg.id}
                className="flex items-center justify-center gap-1.5 py-1 text-[11px] text-slate-500 select-none text-center"
              >
                <span>{msg.avatar}</span>
                <span>{msg.text}</span>
              </div>
            );
          }

          if (isCorrectGuess) {
            return (
              <div
                key={msg.id}
                className="flex items-center justify-center gap-2 py-1.5 px-3 my-1 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-xs text-emerald-300 shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>
                  <strong className="text-white">{msg.nickname}</strong> {msg.text}
                </span>
              </div>
            );
          }

          // Special Full Reaction Card in Chat
          if (isReaction) {
            const reactionData = SLASH_REACTIONS.find((r) => r.id === msg.reactionType);
            const style = reactionData?.cardStyle || 'bg-slate-900 border-indigo-500/40 text-indigo-200';
            const icon = reactionData?.icon || msg.avatar || '✨';
            const title = reactionData?.title || 'Reação';

            return (
              <div
                key={msg.id}
                className={`my-1.5 p-2.5 sm:p-3 rounded-2xl border shadow-lg flex items-center justify-between gap-3 animate-in fade-in zoom-in-95 ${style}`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center text-xl shrink-0 shadow-inner">
                    {icon}
                  </div>
                  <div className="truncate">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                      <span>{msg.nickname}</span>
                      <span className="text-[10px] font-normal px-1.5 py-0.5 rounded-full bg-white/10 uppercase tracking-wider">
                        {title}
                      </span>
                    </div>
                    <p className="text-[11px] opacity-90 truncate mt-0.5 font-medium">
                      {msg.text}
                    </p>
                  </div>
                </div>

                <div className="text-[9px] text-white/50 tabular-nums shrink-0">
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className={`flex items-start gap-2 max-w-[85%] ${
                isMe ? 'ml-auto flex-row-reverse' : ''
              }`}
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] shrink-0 select-none mt-0.5 shadow-sm"
                style={{
                  backgroundColor: `${msg.color}25`,
                  border: `1px solid ${msg.color}`
                }}
              >
                {msg.avatar}
              </div>

              <div className="flex flex-col">
                <div
                  className={`flex items-baseline gap-1.5 mb-0.5 ${
                    isMe ? 'flex-row-reverse' : ''
                  }`}
                >
                  <span className="text-[11px] font-medium text-slate-400">
                    {msg.nickname}
                  </span>
                  <span className="text-[9px] text-slate-600 tabular-nums">
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>

                <div
                  className={`px-3 py-1.5 rounded-2xl text-xs leading-relaxed break-words shadow-sm ${
                    isMe
                      ? 'bg-indigo-600 text-white rounded-tr-xs'
                      : 'bg-slate-900 text-slate-200 border border-slate-800 rounded-tl-xs'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Slash Reaction Autocomplete Popup Menu */}
      {showSlashMenu && (
        <div className="mx-2 mb-1 p-2 bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl z-30 animate-in slide-in-from-bottom-2 fade-in">
          <div className="flex items-center justify-between px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 mb-1.5">
            <span className="flex items-center gap-1.5">
              <Command className="w-3 h-3 text-indigo-400" />
              Reações Especiais
            </span>
            <span className="text-slate-500 font-mono">Use ↑↓ e Enter</span>
          </div>

          {filteredReactions.length === 0 ? (
            <div className="p-3 text-center text-xs text-slate-500">
              Nenhuma reação encontrada com esse nome.
            </div>
          ) : (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {filteredReactions.map((reaction, idx) => {
                const isSelected = idx === selectedSlashIndex;
                return (
                  <button
                    key={reaction.id}
                    type="button"
                    onClick={() => handleTriggerReaction(reaction)}
                    onMouseEnter={() => setSelectedSlashIndex(idx)}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-md scale-[1.01]'
                        : 'hover:bg-slate-800/80 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className="text-lg shrink-0">{reaction.icon}</span>
                      <div className="truncate">
                        <div className="font-semibold flex items-center gap-1.5">
                          <span>{reaction.title}</span>
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                              isSelected ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {reaction.command}
                          </span>
                        </div>
                        <div
                          className={`text-[10px] truncate ${
                            isSelected ? 'text-indigo-200' : 'text-slate-400'
                          }`}
                        >
                          {reaction.description}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-lg shrink-0 ml-2 ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      Ativar
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Emoji picker bar */}
      {showEmojiPicker && (
        <div className="flex items-center gap-2 px-3 py-1.5 border-t border-slate-800/80 bg-slate-900/90 overflow-x-auto no-scrollbar">
          {emojis.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleAddEmoji(emoji)}
              className="text-base p-1 hover:bg-slate-800 rounded-lg transition-transform hover:scale-125 cursor-pointer"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Unobstructed Input Form with Slash Command Quick Access */}
      <form
        onSubmit={handleSend}
        className="p-2 sm:p-2.5 border-t border-slate-800/80 bg-slate-950/90 flex items-center gap-1.5 shrink-0"
      >
        {/* Quick Slash Button [/] */}
        <button
          type="button"
          onClick={handleToggleSlashMenu}
          className={`p-2 rounded-xl transition-all cursor-pointer shrink-0 text-xs font-mono font-bold flex items-center justify-center ${
            showSlashMenu
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-indigo-400 hover:bg-slate-800/80'
          }`}
          title="Abrir reações especiais com /"
        >
          <span className="text-sm">/</span>
        </button>

        {/* Emoji Button */}
        <button
          type="button"
          onClick={() => {
            setShowEmojiPicker(!showEmojiPicker);
            setShowSlashMenu(false);
          }}
          className={`text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800/80 transition-colors cursor-pointer shrink-0 ${
            showEmojiPicker ? 'text-indigo-400 bg-slate-800/80' : ''
          }`}
          title="Inserir Emoji"
        >
          <Smile className="w-4 h-4" />
        </button>

        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          maxLength={300}
          className="flex-1 min-w-0 bg-slate-900/90 border border-slate-800 text-slate-100 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder-slate-500"
        />

        <button
          type="submit"
          disabled={!inputText.trim()}
          className="w-8 h-8 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-all shadow-sm cursor-pointer shrink-0"
          title="Enviar"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
