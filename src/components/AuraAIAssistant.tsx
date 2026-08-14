import React, { useState, useEffect } from 'react';
import { spatialAudio } from '../audio/spatialAudio';
import { GlassPanel, SimpleButton, Chip } from '../ui/GlassmorphismComponents';
import { Bot, Send, Mic, Radio, Cpu, ShieldCheck, Thermometer, Zap } from 'lucide-react';

export const AuraAIAssistant: React.FC<{ currentZone: string; zoneNarrative: string }> = ({ currentZone, zoneNarrative }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; content: string }[]>([{ role: 'ai', content: zoneNarrative }]);

  useEffect(() => { setMessages([{ role: 'ai', content: zoneNarrative }]); }, [currentZone, zoneNarrative]);

  const send = () => {
    if (!input.trim()) return;
    const msg = input.trim(); setInput('');
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    spatialAudio.playAirTap();
    setTimeout(() => {
      const replies: Record<string, string> = {
        core: 'Reactor core at 3,450 MWth. 193 UO₂ assemblies. Cherenkov glow visible. Neutron flux 2.44×10¹³ n/cm²·s.',
        turbine: '1,180 MWe turbine at 1,800 RPM. H₂ cooling nominal. Vibration 0.82 mm/s. Bearing temp 64°C.',
        gantry: '53 CRDM clusters suspended electromagnetically. SCRAM insertion 1.42s. All coils energized.',
        coolant: 'Primary loop at 15.51 MPa, 325°C hot leg. Four RCP pumps at 24,500 m³/hr. SG at 1,920 kg/s.',
      };
      const resp = replies[currentZone] || 'All systems nominal. Ask about core, turbine, coolant, or safety.';
      setMessages(prev => [...prev, { role: 'ai', content: resp }]);
      spatialAudio.speak(resp);
    }, 400);
  };

  const suggestions = [
    { label: 'Core Status', icon: <Radio className="w-3 h-3" /> },
    { label: 'Turbine Data', icon: <Cpu className="w-3 h-3" /> },
    { label: 'Safety Systems', icon: <ShieldCheck className="w-3 h-3" /> },
    { label: 'Coolant Loop', icon: <Thermometer className="w-3 h-3" /> },
    { label: 'SCRAM', icon: <Zap className="w-3 h-3" /> },
  ];

  return (
    <GlassPanel strong className="p-4 w-full max-w-sm flex flex-col h-[420px]">
      <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-3">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-[#64b4ff]" />
          <span className="text-xs font-semibold text-white tracking-wide">AURA AI</span>
          <Chip label="VOICE" color="#64b4ff" dot="#64b4ff" />
        </div>
        <SimpleButton variant="ghost" size="sm" onClick={() => { spatialAudio.playAirTap(); spatialAudio.stopSpeaking(); }}>✕</SimpleButton>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 mb-3 pr-1 scrollbar-hide">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
              msg.role === 'user' ? 'bg-white/8 text-white' : 'bg-white/[0.03] border border-white/[0.06] text-white/80'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-white/5 pt-2 space-y-2">
        <div className="flex gap-1.5 flex-wrap">
          {suggestions.map((q, i) => (
            <button key={i} onClick={() => { setInput(q.label); setTimeout(send, 50); }}
              className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] text-[9px] text-[#88aadd] hover:bg-white/[0.08] transition-colors cursor-pointer"
            >{q.icon} {q.label}</button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { spatialAudio.playAirTap(); }}
            className="p-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[#88aadd] hover:text-white transition-colors cursor-pointer">
            <Mic className="w-3.5 h-3.5" />
          </button>
          <input type="text" value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Ask AURA..." className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-full px-3 py-1.5 text-xs text-white placeholder-[#5a6d8a] focus:outline-none focus:border-white/20"
          />
          <button onClick={send} disabled={!input.trim()}
            className="p-1.5 rounded-full bg-white/10 border border-white/15 text-white hover:bg-white/20 disabled:opacity-30 transition-all cursor-pointer">
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </GlassPanel>
  );
};
