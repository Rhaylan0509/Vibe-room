import React, { useState } from 'react';
import { X, Crown, AlertCircle } from 'lucide-react';
import type { RoomUser } from '../../shared/types.js';

interface HostTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: RoomUser[];
  myUserId: string;
  onConfirmTransfer: (targetUserId: string) => void;
}

export const HostTransferModal: React.FC<HostTransferModalProps> = ({
  isOpen,
  onClose,
  users,
  myUserId,
  onConfirmTransfer
}) => {
  const guests = users.filter((u) => u.id !== myUserId);
  const [selectedUserId, setSelectedUserId] = useState<string>(guests[0]?.id || '');

  if (!isOpen) return null;

  const handleTransfer = () => {
    if (!selectedUserId) return;
    onConfirmTransfer(selectedUserId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
              <Crown className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Passar Título de Moderador</h3>
              <p className="text-xs text-slate-400">Transfira o controle da sala para um hóspede</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-950/20 border border-amber-500/20 text-amber-300 text-xs leading-relaxed">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
            <span>
              Ao passar o título, o novo moderador terá o poder de alternar os modos da sala (jogos, lousa, chat) e controlar o player de música em tempo real.
            </span>
          </div>

          {guests.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-400">
              Nenhum outro participante na sala ainda. Convide amigos usando o botão Convidar!
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300">
                Selecione o participante:
              </label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {guests.map((g) => {
                  const isSelected = selectedUserId === g.id;
                  return (
                    <div
                      key={g.id}
                      onClick={() => setSelectedUserId(g.id)}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-950/30 border-amber-500/50 text-white shadow-sm'
                          : 'bg-slate-950/50 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-xs"
                          style={{ backgroundColor: `${g.color}30` }}
                        >
                          {g.avatar}
                        </div>
                        <span className="text-xs font-semibold">{g.nickname}</span>
                      </div>
                      {isSelected && <Crown className="w-3.5 h-3.5 text-amber-400" />}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950/70 border-t border-slate-800 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleTransfer}
            disabled={!selectedUserId || guests.length === 0}
            className="px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 disabled:opacity-40 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Crown className="w-3.5 h-3.5" />
            <span>Confirmar Transferência</span>
          </button>
        </div>
      </div>
    </div>
  );
};
