import React, { useState } from 'react';
import { Crown, MicOff, VolumeX, Plus } from 'lucide-react';
import type { RoomUser } from '../../shared/types.js';

interface UserBarProps {
  users: RoomUser[];
  myUserId: string;
  isHost: boolean;
  onTransferHost: (targetUserId: string) => void;
  onInvite: () => void;
}

export const UserBar: React.FC<UserBarProps> = ({
  users,
  myUserId,
  isHost,
  onTransferHost,
  onInvite
}) => {
  const [selectedUser, setSelectedUser] = useState<RoomUser | null>(null);

  const maxSlots = 6;
  const emptySlotsCount = Math.max(0, maxSlots - users.length);

  return (
    <div className="bg-slate-950/80 border-b border-slate-800/80 px-3 py-1.5 shrink-0 z-30">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Avatars row - up to 6 slots fitting on any device */}
        <div className="flex items-center gap-2 overflow-visible">
          {users.map((user) => {
            const isMe = user.id === myUserId;
            return (
              <div key={user.id} className="relative group">
                <button
                  onClick={() => {
                    if (isHost && !isMe) {
                      setSelectedUser(selectedUser?.id === user.id ? null : user);
                    }
                  }}
                  className={`relative flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full transition-all text-sm select-none cursor-pointer ${
                    user.isSpeaking
                      ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                      : 'hover:scale-105'
                  }`}
                  style={{
                    backgroundColor: `${user.color}25`,
                    border: `1.5px solid ${user.isSpeaking ? '#10b981' : user.color}`
                  }}
                  title={`${user.nickname}${isMe ? ' (você)' : ''}${user.isHost ? ' · Moderador' : ''}${
                    isHost && !isMe ? ' · Clique para transferir moderador' : ''
                  }`}
                >
                  <span>{user.avatar}</span>

                  {/* Host Crown Badge */}
                  {user.isHost && (
                    <div
                      className="absolute -top-1 -right-1 bg-amber-400 text-slate-950 p-0.5 rounded-full shadow-sm"
                      title="Moderador"
                    >
                      <Crown className="w-2.5 h-2.5 fill-current" />
                    </div>
                  )}

                  {/* Muted or Deafened status badge */}
                  {user.isMuted && !user.isDeafened && (
                    <div
                      className="absolute -bottom-0.5 -right-0.5 bg-rose-500 text-white p-0.5 rounded-full shadow-sm"
                      title="Mutado"
                    >
                      <MicOff className="w-2 h-2" />
                    </div>
                  )}
                  {user.isDeafened && (
                    <div
                      className="absolute -bottom-0.5 -right-0.5 bg-amber-500 text-slate-950 p-0.5 rounded-full shadow-sm"
                      title="Ensurdecido"
                    >
                      <VolumeX className="w-2 h-2" />
                    </div>
                  )}
                </button>

                {/* Nickname tooltip / small label */}
                <div className="hidden sm:block text-center mt-0.5">
                  <span className="text-[10px] text-slate-400 block max-w-[50px] truncate leading-tight">
                    {user.nickname}
                  </span>
                </div>

                {/* Dropdown for Moderator to Transfer Role */}
                {selectedUser?.id === user.id && isHost && !isMe && (
                  <div className="absolute top-full left-0 mt-1 z-50 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1.5 w-48 text-xs animate-in fade-in zoom-in-95">
                    <div className="px-2 py-1 text-[10px] text-slate-400 border-b border-slate-800">
                      {user.nickname}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onTransferHost(user.id);
                        setSelectedUser(null);
                      }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 text-left text-amber-300 hover:bg-amber-950/40 rounded-lg transition-colors cursor-pointer mt-1"
                    >
                      <Crown className="w-3.5 h-3.5 text-amber-400" />
                      <span>Passar Moderador</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {/* Empty slot indicators (clean minimal circles with + icon) */}
          {Array.from({ length: emptySlotsCount }).map((_, index) => (
            <div key={`empty-${index}`} className="flex flex-col items-center">
              <button
                onClick={onInvite}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-dashed border-slate-800 hover:border-slate-600 text-slate-600 hover:text-slate-400 flex items-center justify-center transition-colors cursor-pointer"
                title={`Vaga ${users.length + index + 1} de 6 disponível. Clique para convidar amigo!`}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <span className="hidden sm:block text-[10px] text-slate-600 mt-0.5">
                Livre
              </span>
            </div>
          ))}
        </div>

        {/* Minimalist Capacity Info */}
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <span className="hidden sm:inline">Sala Privada</span>
          <span className="hidden sm:inline">·</span>
          <span>Máx. 6 pessoas</span>
        </div>
      </div>
    </div>
  );
};
