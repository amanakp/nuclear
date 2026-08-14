import React from 'react';

export interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  strong?: boolean;
}

export const GlassPanel: React.FC<GlassPanelProps> = ({ children, className = '', style, strong = false }) => {
  const base = strong ? 'glass-panel-strong' : 'glass-panel';
  return (
    <div className={`${base} ${className}`} style={style}>
      {children}
    </div>
  );
};

export interface PillProps {
  label: string;
  active?: boolean;
  color?: string;
  onClick?: () => void;
  size?: 'sm' | 'xs';
}

export const Pill: React.FC<PillProps> = ({ label, active, color, onClick, size = 'xs' }) => {
  const sizeClass = size === 'xs' ? 'px-2.5 py-0.5 text-[10px]' : 'px-3 py-1 text-xs';
  const activeStyle: React.CSSProperties = active
    ? {
        color: color ?? '#22d3ee',
        background: color
          ? `color-mix(in srgb, ${color} 15%, transparent)`
          : 'rgba(6, 182, 212, 0.15)',
        borderColor: color
          ? `color-mix(in srgb, ${color} 40%, transparent)`
          : 'rgba(6, 182, 212, 0.4)',
      }
    : {};
  return (
    <button
      type="button"
      className={`${sizeClass} rounded-full font-medium tracking-wide cursor-pointer transition-all whitespace-nowrap
        ${active ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40' : 'text-slate-200 hover:text-white border border-transparent'}`}
      style={activeStyle}
      onClick={onClick}
      aria-pressed={active}
    >
      {label}
    </button>
  );
};

export interface LabelValueProps {
  label: string;
  value: string | number;
  unit?: string;
  size?: 'sm' | 'md';
  accent?: boolean;
}

export const LabelValue: React.FC<LabelValueProps> = ({ label, value, unit, size = 'sm', accent }) => {
  const valClass = size === 'sm' ? 'text-value-sm' : 'text-value';
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-label">{label}</span>
      <div className="flex items-baseline gap-1.5">
        <span className={`${valClass} ${accent ? 'text-[#64b4ff]' : ''}`}>{value}</span>
        {unit && <span className="text-micro">{unit}</span>}
      </div>
    </div>
  );
};

export interface ProgressBarProps {
  value: number;
  max: number;
  color?: string;
  height?: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ value, max, color, height = 3 }) => {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="progress-bar-track" style={{ height }}>
      <div
        className="progress-bar-fill"
        style={{ width: `${pct}%`, background: color || 'linear-gradient(90deg, #64b4ff 0%, #22d3a8 100%)' }}
      />
    </div>
  );
};

export interface RadialProgressProps {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trailColor?: string;
  children?: React.ReactNode;
}

export const RadialProgress: React.FC<RadialProgressProps> = ({
  value,
  max,
  size = 90,
  strokeWidth = 3,
  color = '#64b4ff',
  trailColor = 'rgba(255,255,255,0.06)',
  children,
}) => {
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (value / max) * circumference;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="absolute" width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trailColor} strokeWidth={strokeWidth} />
        <circle
          className="radial-progress-fill"
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="text-center">{children}</div>
    </div>
  );
};

export interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  progress?: { value: number; max: number; color?: string };
  accent?: boolean;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, unit, subtitle, progress, accent, className = '' }) => {
  return (
    <div className={`glass-panel p-3 ${className}`}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-label">{label}</span>
        {subtitle && <span className="text-micro">{subtitle}</span>}
      </div>
      <div className="flex items-baseline gap-1.5 mb-1">
        <span className={`text-value-sm ${accent ? 'text-[#64b4ff]' : ''}`}>{value}</span>
        {unit && <span className="text-micro">{unit}</span>}
      </div>
      {progress && <ProgressBar value={progress.value} max={progress.max} color={progress.color} />}
    </div>
  );
};

export interface DataRowProps {
  label: string;
  value: string | number;
  unit?: string;
  width?: string;
}

export const DataRow: React.FC<DataRowProps> = ({ label, value, unit, width }) => {
  return (
    <div className="flex items-center justify-between py-1.5" style={width ? { width } : {}}>
      <span className="text-xs text-[#5a6d8a] font-medium">{label}</span>
      <span className="text-xs text-white font-semibold font-mono">
        {value}
        {unit && <span className="text-[10px] text-[#5a6d8a] ml-1">{unit}</span>}
      </span>
    </div>
  );
};

export interface SimpleButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md';
  className?: string;
  disabled?: boolean;
  title?: string;
  'aria-label'?: string;
}

export const SimpleButton: React.FC<SimpleButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled,
  title,
  'aria-label': ariaLabel,
}) => {
  const cls = {
    primary: 'btn-primary',
    secondary: `bg-white/5 border border-white/10 text-[#88aadd] hover:bg-white/10`,
    danger: 'btn-danger',
    ghost: 'btn-ghost',
  }[variant];
  const sz = size === 'sm' ? 'px-3 py-1.5 text-[11px]' : 'px-4 py-2 text-xs';
  return (
    <button
      className={`${cls} ${sz} ${className}`}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
};

export interface ChipProps {
  label: string;
  color?: string;
  dot?: string;
}

export const Chip: React.FC<ChipProps> = ({ label, color, dot }) => {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium tracking-wide"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.06)',
        color: color || '#88aadd',
      }}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full" style={{ background: dot }} />}
      {label}
    </span>
  );
};
