import React, { useState, useRef, useEffect } from 'react';
import { spatialAudio } from '../audio/spatialAudio';
import { GlassPanel } from '../ui/GlassmorphismComponents';
import { Hand, Radio, Activity, RotateCcw } from 'lucide-react';

interface HoloLensHandRigProps {
  enabled: boolean;
  onCalibrate?: () => void;
}

export const HoloLensHandRig: React.FC<HoloLensHandRigProps> = ({ enabled, onCalibrate }) => {
  const [coords, setCoords] = useState<{ x: number; y: number }>({ x: 400, y: 350 });
  const [isPinching, setIsPinching] = useState(false);
  const [calPct, setCalPct] = useState(0);
  const calRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;
    const onMouseMove = (e: MouseEvent) => setCoords({ x: e.clientX, y: e.clientY });
    const onMouseDown = (e: MouseEvent) => { if (e.button === 0) { setIsPinching(true); spatialAudio.playAirTap(); } };
    const onMouseUp = (e: MouseEvent) => { if (e.button === 0) setIsPinching(false); };
    const onKeyDown = (e: KeyboardEvent) => { if (e.code === 'Space') { e.preventDefault(); setIsPinching(true); spatialAudio.playAirTap(); } };
    const onKeyUp = (e: KeyboardEvent) => { if (e.code === 'Space') setIsPinching(false); };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [enabled]);

  const startCal = () => {
    setCalPct(0); calRef.current = 0;
    spatialAudio.playAirTap();
    const iv = setInterval(() => {
      calRef.current += 8;
      setCalPct(calRef.current);
      if (calRef.current >= 100) { clearInterval(iv); onCalibrate?.(); spatialAudio.playSuccessChime(); }
    }, 80);
  };

  if (!enabled) return null;
  const { x, y } = coords;

  const handJoints = React.useMemo(() => {
    const j = new Map<string, { x: number; y: number; z: number }>();
    const bx = x + 20, by = y + 20;
    j.set('wrist', { x: bx + 60, y: by + 100, z: 0 });
    j.set('palm', { x: bx + 60, y: by + 80, z: 0 });
    j.set('thumb_tip', { x: bx + (isPinching ? 22 : 28), y: by + (isPinching ? 28 : 72), z: 0 });
    j.set('index_tip', { x: bx + 22, y: by + 22, z: 0 });
    j.set('middle_tip', { x: bx + 55, y: by + 18, z: 0 });
    j.set('ring_tip', { x: bx + 80, y: by + 32, z: 0 });
    j.set('pinky_tip', { x: bx + 105, y: by + 55, z: 0 });
    return j;
  }, [x, y, isPinching]);

  const fingers: [string, string][] = [
    ['palm', 'index_tip'], ['palm', 'middle_tip'], ['palm', 'ring_tip'], ['palm', 'pinky_tip'], ['wrist', 'thumb_tip'],
  ];

  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden select-none">
      <svg className="absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id="lr" x1="0" y1="100%" x2="0" y2="0">
            <stop offset="0" stopColor="#64b4ff" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#64b4ff" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        <line x1={x} y1={y + 100} x2={x} y2={y} stroke="url(#lr)" strokeWidth={isPinching ? 2 : 1} strokeDasharray={isPinching ? 'none' : '4 3'} />
      </svg>

      <div className="absolute -translate-x-1/2 -translate-y-1/2 transition-transform duration-75" style={{ left: x, top: y }}>
        <div className={`relative rounded-full flex items-center justify-center transition-all ${isPinching ? 'w-9 h-9 bg-white/12 border border-white/20' : 'w-6 h-6 bg-white/5 border border-white/10'}`}>
          <div className={`rounded-full bg-white/60 ${isPinching ? 'w-2 h-2' : 'w-1.5 h-1.5'}`} />
        </div>
      </div>

      <div className="absolute transition-transform duration-75 -translate-x-1/2" style={{ left: x + 20, top: y + 20 }}>
        <svg width="140" height="140" viewBox="0 0 140 140" className="opacity-60">
          {fingers.map(([from, to]) => {
            const s = handJoints.get(from); const e = handJoints.get(to);
            if (!s || !e) return null;
            return <line key={`${from}-${to}`} x1={s.x - (x + 20)} y1={s.y - (y + 20)} x2={e.x - (x + 20)} y2={e.y - (y + 20)} stroke="#64b4ff" strokeWidth={1.2} opacity={0.5} strokeLinecap="round" />;
          })}
          {Array.from(handJoints.entries()).map(([name, pos]) => (
            <circle key={name} cx={pos.x - (x + 20)} cy={pos.y - (y + 20)} r={name.includes('tip') ? 3 : 2.5} fill={name === 'index_tip' && isPinching ? '#fff' : '#64b4ff'} opacity={name.includes('tip') ? 0.8 : 0.5} />
          ))}
        </svg>
        <div className="absolute top-[95px] left-6 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/50 border border-white/8 text-[9px] text-[#88aadd] font-mono">
          <Activity className="w-2.5 h-2.5 text-[#64b4ff]" />
          <span>Hand Rig 6-DoF</span>
        </div>
      </div>

      <div className="hand-rig-status hand-rig-status-right absolute bottom-4 right-4 pointer-events-auto">
        <GlassPanel className="px-3 py-1.5 flex items-center gap-2">
          <Radio className="w-3 h-3 text-[#64b4ff]" />
          <span className="text-[10px] text-[#88aadd] font-mono">Spatial Mesh 99.8%</span>
          <button onClick={startCal} className="flex items-center gap-1 text-[10px] text-[#64b4ff] hover:text-white transition-colors cursor-pointer">
            <RotateCcw className="w-3 h-3" />
            {calPct > 0 && calPct < 100 ? `${calPct}%` : 'Calibrate'}
          </button>
        </GlassPanel>
      </div>

      <div className="hand-rig-status hand-rig-status-left absolute bottom-4 left-4">
        <GlassPanel className="px-3 py-1.5 flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${isPinching ? 'bg-[#64b4ff] animate-pulse' : 'bg-white/20'}`} />
          <Hand className={`w-3 h-3 ${isPinching ? 'text-[#64b4ff]' : 'text-white/30'}`} />
          <span className="text-[10px] text-[#88aadd] font-mono">{isPinching ? 'AIR-TAP' : 'IDLE'}</span>
        </GlassPanel>
      </div>
    </div>
  );
};
