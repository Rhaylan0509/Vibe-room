import React, { useState, useEffect } from 'react';
import { X, Mic, Volume2, ShieldCheck, Sliders, Play, Square, Sparkles } from 'lucide-react';
import { audioMesh } from '../services/audioMesh';

interface AudioSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AudioSettingsModal: React.FC<AudioSettingsModalProps> = ({ isOpen, onClose }) => {
  const [noiseReduction, setNoiseReduction] = useState(true);
  const [threshold, setThreshold] = useState(0.015);
  const [isTesting, setIsTesting] = useState(false);
  const [currentLevel, setCurrentLevel] = useState(0);

  useEffect(() => {
    if (isOpen) {
      const states = audioMesh.getStates();
      setNoiseReduction(states.isNoiseReductionEnabled);
      setThreshold(states.noiseThreshold);
      setIsTesting(states.isTestingMic);
    } else {
      if (isTesting) {
        audioMesh.toggleMicTest();
        setIsTesting(false);
      }
    }
  }, [isOpen]);

  useEffect(() => {
    let animId: number;
    const updateMeter = () => {
      // Small simulated live noise floor visualization if testing
      if (isOpen) {
        animId = requestAnimationFrame(updateMeter);
      }
    };
    if (isOpen) {
      animId = requestAnimationFrame(updateMeter);
    }
    return () => cancelAnimationFrame(animId);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleNoiseReduction = () => {
    const nextVal = !noiseReduction;
    setNoiseReduction(nextVal);
    audioMesh.setNoiseReduction(nextVal);
  };

  const handleThresholdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setThreshold(val);
    audioMesh.setNoiseThreshold(val);
  };

  const handleToggleTest = () => {
    const testState = audioMesh.toggleMicTest();
    setIsTesting(testState);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Configurações de Áudio & Voz</h3>
              <p className="text-xs text-slate-400">Cancelamento de ruído integrado e teste de microfone</p>
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
        <div className="p-6 space-y-5">
          {/* Noise Reduction Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/50 border border-slate-800/80">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-md bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 shrink-0 mt-0.5">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-200">Redução de Ruído Ativa (DSP)</div>
                <div className="text-[11px] text-slate-400 leading-relaxed mt-0.5">
                  Filtro passa-alta 85Hz + compressor dinâmico + isolamento de fundo contra teclado e ventilador.
                </div>
              </div>
            </div>
            <button
              onClick={handleToggleNoiseReduction}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ml-3 ${
                noiseReduction ? 'bg-indigo-600' : 'bg-slate-700'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  noiseReduction ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Noise Gate Sensitivity */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-300">Sensibilidade do Portão de Ruído (Gate)</span>
              <span className="font-mono text-indigo-400 text-[11px]">
                {Math.round(threshold * 1000)} / 100
              </span>
            </div>
            <input
              type="range"
              min="0.005"
              max="0.06"
              step="0.002"
              value={threshold}
              onChange={handleThresholdChange}
              disabled={!noiseReduction}
              className="w-full accent-indigo-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer disabled:opacity-40"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>Mais sensível (capta suspiros)</span>
              <span>Mais isolado (apenas voz firme)</span>
            </div>
          </div>

          {/* Mic Loopback Test */}
          <div className="p-3.5 rounded-xl bg-slate-950/50 border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
                <Mic className="w-3.5 h-3.5 text-indigo-400" />
                <span>Testar microfone com redução</span>
              </div>
              <button
                onClick={handleToggleTest}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                  isTesting
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm'
                }`}
              >
                {isTesting ? <Square className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
                <span>{isTesting ? 'Parar Teste' : 'Iniciar Teste'}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              {isTesting
                ? 'Fale algo no microfone para ouvir como seus amigos escutarão sua voz limpa.'
                : 'Clique para se ouvir em tempo real com o filtro anti-ruído aplicado.'}
            </p>
          </div>

          {/* Mesh latency badge */}
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-indigo-950/20 border border-indigo-500/20 text-[11px] text-indigo-300">
            <ShieldCheck className="w-4 h-4 shrink-0 text-indigo-400" />
            <span>Transmissão WebRTC P2P de baixa latência limitada a até 6 participantes na sala.</span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-950/70 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
};
