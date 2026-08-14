import React, { useState, useEffect, useRef } from 'react';
import { spatialAudio } from '../audio/spatialAudio';
import { GlassPanel, SimpleButton, RadialProgress, ProgressBar, DataRow } from '../ui/GlassmorphismComponents';
import { AlertTriangle, Zap, X, Loader2, CheckCircle, RotateCcw } from 'lucide-react';

interface ScramEmergencyModalProps {
  scramActive: boolean;
  onTriggerScram: () => void;
  onResetScram: () => void;
  thermalPowerMW: number;
  onClose?: () => void;
}

export const ScramEmergencyModal: React.FC<ScramEmergencyModalProps> = ({ scramActive, onTriggerScram, onResetScram, thermalPowerMW, onClose }) => {
  const [phase, setPhase] = useState<'idle' | 'confirm' | 'executing' | 'complete'>('idle');
  const [cd, setCd] = useState(3);
  const [rodPos, setRodPos] = useState(28);
  const [powerLvl, setPowerLvl] = useState(thermalPowerMW);
  const [pressLvl, setPressLvl] = useState(15.51);
  const cdRef = useRef<NodeJS.Timeout | null>(null);
  const simRef = useRef<NodeJS.Timeout | null>(null);

  const start = () => {
    spatialAudio.playAirTap(); spatialAudio.playScramAlarm(); setPhase('executing'); setCd(3);
    cdRef.current = setInterval(() => {
      setCd(p => { if (p <= 1) { clearInterval(cdRef.current!); exec(); return 0; } return p - 1; });
    }, 1000);
  };

  const exec = () => {
    setPhase('complete'); onTriggerScram();
    simRef.current = setInterval(() => {
      setRodPos(p => Math.min(100, p + 8));
      setPowerLvl(p => Math.max(120, p * 0.92));
      setPressLvl(p => Math.max(12.2, p - 0.08));
      if (rodPos >= 100) clearInterval(simRef.current!);
    }, 200);
  };

  const reset = () => {
    spatialAudio.playAirTap(); spatialAudio.stopScramAlarm();
    if (cdRef.current) clearInterval(cdRef.current);
    if (simRef.current) clearInterval(simRef.current);
    onResetScram(); setPhase('idle'); setRodPos(28); setPowerLvl(3450); setPressLvl(15.51); setCd(3);
  };

  useEffect(() => { if (!scramActive && phase === 'complete') setPhase('idle'); }, [scramActive, phase]);
  useEffect(() => { return () => { if (cdRef.current) clearInterval(cdRef.current); if (simRef.current) clearInterval(simRef.current); }; }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm pointer-events-auto">
      <GlassPanel strong className="p-5 w-full max-w-sm">
        <div className="flex items-start justify-between border-b border-white/5 pb-3 mb-3">
          <div className="flex items-center gap-3">
            {phase === 'executing' ? <Loader2 className="w-5 h-5 text-[#ff6b6b] animate-spin" />
              : phase === 'complete' ? <CheckCircle className="w-5 h-5 text-[#22d3a8]" />
              : <AlertTriangle className="w-5 h-5 text-[#ff6b6b]" />}
            <div>
              <div className="text-xs font-semibold text-white tracking-wide">
                {phase === 'idle' && 'SCRAM SYSTEM'}
                {phase === 'confirm' && 'CONFIRM SCRAM'}
                {phase === 'executing' && `ROD DROP T-${cd}`}
                {phase === 'complete' && 'REACTOR TRIPPED'}
              </div>
              <div className="text-[10px] text-[#5a6d8a]">
                {phase === 'idle' && 'Reactor trip actuation'}
                {phase === 'confirm' && '53 rods will drop by gravity'}
                {phase === 'executing' && 'Emergency injection armed'}
                {phase === 'complete' && 'All rods 100% inserted'}
              </div>
            </div>
          </div>
          {onClose && (
            <SimpleButton variant="ghost" size="sm" onClick={() => { spatialAudio.playAirTap(); onClose(); }}>✕</SimpleButton>
          )}
        </div>

        <div className="flex items-center justify-center gap-4 py-3">
          <RadialProgress value={rodPos} max={100} color={rodPos > 80 ? '#ff6b6b' : rodPos > 50 ? '#f5b800' : '#22d3a8'} size={80}>
            <span className="text-lg font-mono font-semibold text-white">{rodPos}%</span>
            <span className="text-[8px] text-[#5a6d8a]">Rods</span>
          </RadialProgress>
          <RadialProgress value={powerLvl} max={3450} color={powerLvl < 500 ? '#22d3a8' : '#f5b800'} size={80}>
            <span className="text-lg font-mono font-semibold text-white">{(powerLvl / 100).toFixed(0)}</span>
            <span className="text-[8px] text-[#5a6d8a]">% Pwr</span>
          </RadialProgress>
          <RadialProgress value={pressLvl} max={17} color={pressLvl < 13 ? '#ff6b6b' : '#64b4ff'} size={80}>
            <span className="text-lg font-mono font-semibold text-white">{pressLvl.toFixed(1)}</span>
            <span className="text-[8px] text-[#5a6d8a]">MPa</span>
          </RadialProgress>
        </div>

        {phase === 'executing' && (
          <div className="mb-3">
            <ProgressBar value={(3 - cd) / 3 * 100} max={100} color="#ff6b6b" height={2} />
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-white/5">
          <DataRow label="Drop Time" value="1.42s" />
          <DataRow label="ECCS" value="ARMED" />
          <DataRow label="Decay" value={`${(powerLvl / 3450 * 6.5).toFixed(1)}%`} />
        </div>

        <div className="mt-3 space-y-2">
          {phase === 'idle' && (
            <SimpleButton variant="danger" className="w-full" onClick={() => setPhase('confirm')}>
              <Zap className="w-3.5 h-3.5" /> Initiate SCRAM
            </SimpleButton>
          )}
          {phase === 'confirm' && (
            <div className="space-y-2">
              <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.08] text-center">
                <p className="text-[11px] text-[#ff6b6b] mb-1 font-medium">⚠ This will trip the reactor ⚠</p>
                <p className="text-[10px] text-[#5a6d8a]">53 rods insert in 1.42s. Power decays to ~6.5%.</p>
              </div>
              <div className="flex gap-2">
                <SimpleButton variant="danger" className="flex-1" onClick={start}><Zap className="w-3.5 h-3.5" /> Confirm</SimpleButton>
                <SimpleButton variant="secondary" className="flex-1" onClick={() => setPhase('idle')}><X className="w-3.5 h-3.5" /> Abort</SimpleButton>
              </div>
            </div>
          )}
          {phase === 'complete' && (
            <SimpleButton variant="primary" className="w-full" onClick={reset}>
              <RotateCcw className="w-3.5 h-3.5" /> Reset Reactor
            </SimpleButton>
          )}
        </div>
      </GlassPanel>
    </div>
  );
};
