import React, { forwardRef } from 'react';
import { cn } from '../utils/cn';
import { designTokens } from './tokens';

export interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'light' | 'medium' | 'strong' | 'intense';
  blur?: keyof typeof designTokens.blur;
  border?: boolean;
  shadow?: keyof typeof designTokens.shadows;
  padding?: keyof typeof designTokens.spacing;
  radius?: keyof typeof designTokens.borderRadius;
  children: React.ReactNode;
}

export const GlassPanel = forwardRef<HTMLDivElement, GlassPanelProps>(
  (
    {
      className,
      variant = 'medium',
      blur,
      border = true,
      shadow,
      padding,
      radius = 'md',
      children,
      style,
      ...props
    },
    ref
  ) => {
    const glassStyle = designTokens.glass[variant];
    const blurStyle = blur ? { backdropFilter: designTokens.blur[blur], WebkitBackdropFilter: designTokens.blur[blur] } : {};
    const shadowStyle = shadow ? { boxShadow: designTokens.shadows[shadow] } : {};
    const paddingStyle = padding ? { padding: designTokens.spacing[padding] } : {};
    const radiusStyle = { borderRadius: designTokens.borderRadius[radius] };
    const borderStyle = border ? { border: glassStyle.border } : {};

    const combinedStyle: React.CSSProperties = {
      ...glassStyle,
      ...blurStyle,
      ...shadowStyle,
      ...paddingStyle,
      ...radiusStyle,
      ...borderStyle,
      ...style,
    };

    return (
      <div
        ref={ref}
        className={cn('glass-panel', className)}
        style={combinedStyle}
        {...props}
      >
        {children}
      </div>
    );
  }
);

GlassPanel.displayName = 'GlassPanel';

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'light' | 'medium' | 'strong' | 'intense';
  hoverable?: boolean;
  pressed?: boolean;
  children: React.ReactNode;
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, variant = 'strong', hoverable = false, pressed = false, children, style, ...props }, ref) => {
    const glassStyle = designTokens.glass[variant];
    const hoverStyle = hoverable
      ? {
          transition: `all ${designTokens.animation.durations.normal}ms ${designTokens.animation.easings.smooth}`,
        }
      : {};

    const pressedStyle = pressed
      ? {
          transform: 'scale(0.98)',
          boxShadow: designTokens.shadows.md,
        }
      : {};

    return (
      <div
        ref={ref}
        className={cn('glass-card', hoverable && 'glass-card-hoverable', className)}
        style={{
          ...glassStyle,
          ...hoverStyle,
          ...pressedStyle,
          ...style,
        }}
        {...props}
      >
        {children}
      </div>
    );
  }
);

GlassCard.displayName = 'GlassCard';

export interface GlassDialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  variant?: 'light' | 'medium' | 'strong' | 'intense';
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
}

export const GlassDialog: React.FC<GlassDialogProps> = ({
  open,
  onClose,
  title,
  description,
  children,
  size = 'md',
  variant = 'intense',
  showCloseButton = true,
  closeOnOverlayClick = true,
}) => {
  if (!open) return null;

  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: { maxWidth: '360px', width: '90vw' },
    md: { maxWidth: '480px', width: '90vw' },
    lg: { maxWidth: '640px', width: '90vw' },
    xl: { maxWidth: '800px', width: '90vw' },
    full: { maxWidth: '95vw', width: '95vw', maxHeight: '95vh', height: '95vh' },
  };

  const glassStyle = designTokens.glass[variant];

  return (
    <div
      className="glass-dialog-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: designTokens.zIndex.modal,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(2, 4, 8, 0.7)',
        backdropFilter: designTokens.blur.xl,
        WebkitBackdropFilter: designTokens.blur.xl,
        animation: `fadeIn ${designTokens.animation.durations.fast}ms ${designTokens.animation.easings.enter}`,
      }}
      onClick={closeOnOverlayClick ? onClose : undefined}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'dialog-title' : undefined}
      aria-describedby={description ? 'dialog-description' : undefined}
    >
      <div
        className="glass-dialog-content"
        style={{
          ...glassStyle,
          ...sizeStyles[size],
          maxHeight: '90vh',
          overflow: 'auto',
          borderRadius: designTokens.borderRadius.xl,
          boxShadow: designTokens.shadows.xxl,
          animation: `slideUp ${designTokens.animation.durations.normal}ms ${designTokens.animation.easings.enter}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || showCloseButton) && (
          <div
            className="glass-dialog-header"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: `${designTokens.spacing.lg} ${designTokens.spacing.xl}`,
              borderBottom: `1px solid ${designTokens.colors.border.subtle}`,
            }}
          >
            <div>
              {title && (
                <h2
                  id="dialog-title"
                  className="glass-dialog-title"
                  style={{
                    fontFamily: designTokens.typography.fontFamilies.display,
                    fontSize: designTokens.typography.fontSizes.lg,
                    fontWeight: designTokens.typography.fontWeights.semibold,
                    color: designTokens.colors.text.primary,
                    letterSpacing: designTokens.typography.letterSpacing.tight,
                    margin: 0,
                  }}
                >
                  {title}
                </h2>
              )}
              {description && (
                <p
                  id="dialog-description"
                  className="glass-dialog-description"
                  style={{
                    fontSize: designTokens.typography.fontSizes.sm,
                    color: designTokens.colors.text.muted,
                    margin: `${designTokens.spacing.xs} 0 0 0`,
                  }}
                >
                  {description}
                </p>
              )}
            </div>
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="glass-dialog-close"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  borderRadius: designTokens.borderRadius.full,
                  background: 'transparent',
                  border: `1px solid ${designTokens.colors.border.subtle}`,
                  color: designTokens.colors.text.secondary,
                  cursor: 'pointer',
                  transition: `all ${designTokens.animation.durations.fast}ms ${designTokens.animation.easings.smooth}`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = designTokens.colors.background.surface;
                  e.currentTarget.style.borderColor = designTokens.colors.border.default;
                  e.currentTarget.style.color = designTokens.colors.text.primary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderColor = designTokens.colors.border.subtle;
                  e.currentTarget.style.color = designTokens.colors.text.secondary;
                }}
                aria-label="Close dialog"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        )}
        <div
          className="glass-dialog-body"
          style={{
            padding: `${designTokens.spacing.xl}`,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export interface GlassSidePanelProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  position?: 'left' | 'right';
  width?: string;
  variant?: 'light' | 'medium' | 'strong' | 'intense';
}

export const GlassSidePanel: React.FC<GlassSidePanelProps> = ({
  open,
  onClose,
  title,
  children,
  position = 'right',
  width = '380px',
  variant = 'intense',
}) => {
  if (!open) return null;

  const glassStyle = designTokens.glass[variant];

  return (
    <div
      className="glass-side-panel-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: designTokens.zIndex.floating,
        display: 'flex',
        justifyContent: position === 'left' ? 'flex-start' : 'flex-end',
        background: 'rgba(2, 4, 8, 0.5)',
        backdropFilter: designTokens.blur.lg,
        WebkitBackdropFilter: designTokens.blur.lg,
        pointerEvents: 'none',
      }}
      onClick={onClose}
      aria-hidden="true"
    >
      <div
        className="glass-side-panel"
        style={{
          ...glassStyle,
          width,
          maxWidth: '100vw',
          height: '100vh',
          maxHeight: '100vh',
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: designTokens.shadows.xxl,
          borderRadius: 0,
          borderLeft: position === 'right' ? `1px solid ${designTokens.colors.border.default}` : undefined,
          borderRight: position === 'left' ? `1px solid ${designTokens.colors.border.default}` : undefined,
          animation: `slideIn${position.charAt(0).toUpperCase() + position.slice(1)} ${designTokens.animation.durations.slow}ms ${designTokens.animation.easings.enter}`,
          pointerEvents: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div
            className="glass-side-panel-header"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: `${designTokens.spacing.lg} ${designTokens.spacing.xl}`,
              borderBottom: `1px solid ${designTokens.colors.border.subtle}`,
            }}
          >
            <h2
              className="glass-side-panel-title"
              style={{
                fontFamily: designTokens.typography.fontFamilies.display,
                fontSize: designTokens.typography.fontSizes.lg,
                fontWeight: designTokens.typography.fontWeights.semibold,
                color: designTokens.colors.text.primary,
                letterSpacing: designTokens.typography.letterSpacing.tight,
                margin: 0,
              }}
            >
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="glass-side-panel-close"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: designTokens.borderRadius.full,
                background: 'transparent',
                border: `1px solid ${designTokens.colors.border.subtle}`,
                color: designTokens.colors.text.secondary,
                cursor: 'pointer',
                transition: `all ${designTokens.animation.durations.fast}ms ${designTokens.animation.easings.smooth}`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = designTokens.colors.background.surface;
                e.currentTarget.style.borderColor = designTokens.colors.border.default;
                e.currentTarget.style.color = designTokens.colors.text.primary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderColor = designTokens.colors.border.subtle;
                e.currentTarget.style.color = designTokens.colors.text.secondary;
              }}
              aria-label="Close panel"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}
        <div
          className="glass-side-panel-body"
          style={{
            flex: 1,
            padding: `${designTokens.spacing.xl}`,
            overflow: 'auto',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export interface GlassTooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  variant?: 'light' | 'medium' | 'strong';
}

export const GlassTooltip: React.FC<GlassTooltipProps> = ({
  content,
  children,
  position = 'top',
  delay = 200,
  variant = 'strong',
}) => {
  const [visible, setVisible] = React.useState<boolean>(false);
  const timeoutRef = React.useRef<number | null>(null);

  const show = () => {
    timeoutRef.current = window.setTimeout(() => setVisible(true), delay);
  };

  const hide = () => {
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    setVisible(false);
  };

  const glassStyle = designTokens.glass[variant];

  const positionStyles: Record<string, React.CSSProperties> = {
    top: { bottom: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)' },
    bottom: { top: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)' },
    left: { right: 'calc(100% + 8px)', top: '50%', transform: 'translateY(-50%)' },
    right: { left: 'calc(100% + 8px)', top: '50%', transform: 'translateY(-50%)' },
  };

  return (
    <div
      className="glass-tooltip-wrapper"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      style={{ position: 'relative', display: 'inline-flex' }}
    >
      {children}
      {visible && (
        <div
          className="glass-tooltip"
          style={{
            ...glassStyle,
            ...positionStyles[position],
            position: 'absolute',
            zIndex: designTokens.zIndex.toast,
            padding: `${designTokens.spacing.sm} ${designTokens.spacing.md}`,
            borderRadius: designTokens.borderRadius.sm,
            fontSize: designTokens.typography.fontSizes.xs,
            color: designTokens.colors.text.primary,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            animation: `fadeIn ${designTokens.animation.durations.fast}ms ${designTokens.animation.easings.enter}`,
            boxShadow: designTokens.shadows.lg,
          }}
        >
          {content}
        </div>
      )}
    </div>
  );
};

export interface GlassProgressBarProps {
  value: number;
  max?: number;
  color?: string;
  height?: number;
  showLabel?: boolean;
  animated?: boolean;
  variant?: 'default' | 'gradient' | 'segmented';
}

export const GlassProgressBar: React.FC<GlassProgressBarProps> = ({
  value,
  max = 100,
  color = designTokens.colors.accent.cyan,
  height = 4,
  showLabel = false,
  animated = false,
  variant = 'default',
}) => {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));

  const trackStyle: React.CSSProperties = {
    height,
    background: designTokens.colors.background.tertiary,
    borderRadius: height,
    overflow: 'hidden',
    position: 'relative',
  };

  const fillStyle: React.CSSProperties = {
    height: '100%',
    width: `${pct}%`,
    borderRadius: height,
    transition: `width ${designTokens.animation.durations.slow}ms ${designTokens.animation.easings.smooth}`,
  };

  if (variant === 'gradient') {
    fillStyle.background = `linear-gradient(90deg, ${designTokens.colors.accent.cyan} 0%, ${designTokens.colors.accent.emerald} 100%)`;
  } else if (variant === 'segmented') {
    fillStyle.background = `linear-gradient(90deg, ${designTokens.colors.accent.cyan} 0%, ${designTokens.colors.accent.amber} 50%, ${designTokens.colors.accent.coral} 100%)`;
  } else {
    fillStyle.background = color;
  }

  if (animated) {
    fillStyle.backgroundImage = `linear-gradient(
      45deg,
      rgba(255,255,255,0.15) 25%,
      transparent 25%,
      transparent 50%,
      rgba(255,255,255,0.15) 50%,
      rgba(255,255,255,0.15) 75%,
      transparent 75%,
      transparent
    )`;
    fillStyle.backgroundSize = `${height * 4}px ${height * 4}px`;
    fillStyle.animation = `progressStripe 1s linear infinite`;
  }

  return (
    <div className="glass-progress-bar" style={trackStyle} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      <div style={fillStyle} />
      {showLabel && (
        <span
          style={{
            position: 'absolute',
            right: 0,
            top: `calc(100% + ${designTokens.spacing.xs})`,
            fontSize: designTokens.typography.fontSizes.xs,
            fontFamily: designTokens.typography.fontFamilies.mono,
            color: designTokens.colors.text.secondary,
          }}
        >
          {pct.toFixed(0)}%
        </span>
      )}
    </div>
  );
};

export interface GlassRadialProgressProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trailColor?: string;
  children?: React.ReactNode;
  animated?: boolean;
}

export const GlassRadialProgress: React.FC<GlassRadialProgressProps> = ({
  value,
  max = 100,
  size = 80,
  strokeWidth = 4,
  color = designTokens.colors.accent.cyan,
  trailColor = designTokens.colors.border.subtle,
  children,
  animated = false,
}) => {
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (value / max) * circumference;

  const svgStyle: React.CSSProperties = {
    width: size,
    height: size,
    transform: 'rotate(-90deg)',
  };

  return (
    <div className="glass-radial-progress" style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg style={svgStyle}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={trailColor}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{
            transition: `stroke-dashoffset ${designTokens.animation.durations.slow}ms ${designTokens.animation.easings.smooth}`,
            ...(animated && { animation: 'radialPulse 2s ease-in-out infinite' }),
          }}
        />
      </svg>
      <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </div>
    </div>
  );
};

export interface GlassChipProps {
  label: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'xs' | 'sm' | 'md';
  removable?: boolean;
  onRemove?: () => void;
  active?: boolean;
  onClick?: () => void;
}

export const GlassChip: React.FC<GlassChipProps> = ({
  label,
  icon,
  variant = 'default',
  size = 'sm',
  removable = false,
  onRemove,
  active = false,
  onClick,
}) => {
  const sizeStyles: Record<string, React.CSSProperties> = {
    xs: { padding: `${designTokens.spacing.xs} ${designTokens.spacing.sm}`, fontSize: designTokens.typography.fontSizes.xs, gap: designTokens.spacing.xs },
    sm: { padding: `${designTokens.spacing.sm} ${designTokens.spacing.md}`, fontSize: designTokens.typography.fontSizes.sm, gap: designTokens.spacing.sm },
    md: { padding: `${designTokens.spacing.md} ${designTokens.spacing.lg}`, fontSize: designTokens.typography.fontSizes.base, gap: designTokens.spacing.md },
  };

  const variantColors: Record<string, { bg: string; border: string; text: string; dot: string }> = {
    default: {
      bg: 'rgba(255,255,255,0.04)',
      border: designTokens.colors.border.subtle,
      text: designTokens.colors.text.secondary,
      dot: designTokens.colors.accent.cyan,
    },
    success: {
      bg: 'rgba(34,211,168,0.12)',
      border: 'rgba(34,211,168,0.3)',
      text: designTokens.colors.accent.emerald,
      dot: designTokens.colors.accent.emerald,
    },
    warning: {
      bg: 'rgba(245,184,0,0.12)',
      border: 'rgba(245,184,0,0.3)',
      text: designTokens.colors.accent.amber,
      dot: designTokens.colors.accent.amber,
    },
    danger: {
      bg: 'rgba(255,107,107,0.12)',
      border: 'rgba(255,107,107,0.3)',
      text: designTokens.colors.accent.coral,
      dot: designTokens.colors.accent.coral,
    },
    info: {
      bg: 'rgba(100,180,255,0.12)',
      border: 'rgba(100,180,255,0.3)',
      text: designTokens.colors.accent.cyan,
      dot: designTokens.colors.accent.cyan,
    },
  };

  const colors = variantColors[variant];
  const isInteractive = onClick || removable;

  return (
    <div
      className={cn('glass-chip', active && 'glass-chip-active', isInteractive && 'glass-chip-interactive')}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        ...sizeStyles[size],
        borderRadius: designTokens.borderRadius.full,
        background: active ? `rgba(100, 180, 255, 0.15)` : colors.bg,
        border: `1px solid ${colors.border}`,
        color: active ? designTokens.colors.accent.cyan : colors.text,
        fontFamily: designTokens.typography.fontFamilies.mono,
        fontWeight: designTokens.typography.fontWeights.medium,
        letterSpacing: designTokens.typography.letterSpacing.wide,
        cursor: isInteractive ? 'pointer' : 'default',
        transition: `all ${designTokens.animation.durations.fast}ms ${designTokens.animation.easings.smooth}`,
        userSelect: 'none',
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        if (isInteractive) {
          e.currentTarget.style.background = active ? 'rgba(100, 180, 255, 0.2)' : 'rgba(255,255,255,0.06)';
          e.currentTarget.style.borderColor = active ? designTokens.colors.accent.cyan : designTokens.colors.border.default;
        }
      }}
      onMouseLeave={(e) => {
        if (isInteractive) {
          e.currentTarget.style.background = active ? 'rgba(100, 180, 255, 0.15)' : colors.bg;
          e.currentTarget.style.borderColor = active ? designTokens.colors.accent.cyan : colors.border;
        }
      }}
    >
      {icon && <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>}
      <span>{label}</span>
      {removable && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove?.(); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '16px',
            height: '16px',
            borderRadius: designTokens.borderRadius.full,
            background: 'transparent',
            border: 'none',
            color: colors.text,
            cursor: 'pointer',
            marginLeft: designTokens.spacing.xs,
            opacity: 0.7,
            transition: `opacity ${designTokens.animation.durations.fast}ms`,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.7')}
          aria-label="Remove"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  );
};

export interface GlassPillProps {
  label: string;
  icon?: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  variant?: 'default' | 'primary' | 'danger' | 'ghost';
  size?: 'xs' | 'sm' | 'md';
  disabled?: boolean;
}

export const GlassPill: React.FC<GlassPillProps> = ({
  label,
  icon,
  active = false,
  onClick,
  variant = 'default',
  size = 'sm',
  disabled = false,
}) => {
  const sizeStyles: Record<string, React.CSSProperties> = {
    xs: { padding: `${designTokens.spacing.xs} ${designTokens.spacing.sm}`, fontSize: designTokens.typography.fontSizes.xs, gap: designTokens.spacing.xs },
    sm: { padding: `${designTokens.spacing.sm} ${designTokens.spacing.md}`, fontSize: designTokens.typography.fontSizes.sm, gap: designTokens.spacing.sm },
    md: { padding: `${designTokens.spacing.md} ${designTokens.spacing.lg}`, fontSize: designTokens.typography.fontSizes.base, gap: designTokens.spacing.md },
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    default: {
      background: active ? 'rgba(100, 180, 255, 0.15)' : 'transparent',
      border: `1px solid ${active ? 'rgba(100, 180, 255, 0.4)' : 'transparent'}`,
      color: active ? designTokens.colors.accent.cyan : designTokens.colors.text.secondary,
    },
    primary: {
      background: active ? 'rgba(100, 180, 255, 0.2)' : 'rgba(100, 180, 255, 0.1)',
      border: `1px solid ${active ? 'rgba(100, 180, 255, 0.5)' : 'rgba(100, 180, 255, 0.3)'}`,
      color: active ? '#ffffff' : designTokens.colors.accent.cyan,
    },
    danger: {
      background: active ? 'rgba(255, 107, 107, 0.2)' : 'rgba(255, 107, 107, 0.1)',
      border: `1px solid ${active ? 'rgba(255, 107, 107, 0.4)' : 'rgba(255, 107, 107, 0.25)'}`,
      color: active ? '#ffffff' : designTokens.colors.accent.coral,
    },
    ghost: {
      background: active ? 'rgba(255,255,255,0.06)' : 'transparent',
      border: `1px solid ${active ? 'rgba(255,255,255,0.1)' : 'transparent'}`,
      color: active ? designTokens.colors.text.primary : designTokens.colors.text.secondary,
    },
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn('glass-pill', active && 'glass-pill-active', disabled && 'glass-pill-disabled')}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...sizeStyles[size],
        ...variantStyles[variant],
        borderRadius: designTokens.borderRadius.full,
        fontFamily: designTokens.typography.fontFamilies.sans,
        fontWeight: designTokens.typography.fontWeights.medium,
        letterSpacing: designTokens.typography.letterSpacing.wide,
        cursor: disabled ? 'not-allowed' : 'pointer',
        backdropFilter: designTokens.blur.md,
        WebkitBackdropFilter: designTokens.blur.md,
        transition: `all ${designTokens.animation.durations.fast}ms ${designTokens.animation.easings.smooth}`,
        opacity: disabled ? 0.4 : 1,
      }}
      aria-pressed={active}
    >
      {icon && <span style={{ display: 'flex', alignItems: 'center', marginRight: designTokens.spacing.xs }}>{icon}</span>}
      {label}
    </button>
  );
};

export interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'glass';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  fullWidth?: boolean;
}

export const GlassButton = forwardRef<HTMLButtonElement, GlassButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      icon,
      iconPosition = 'left',
      loading = false,
      fullWidth = false,
      disabled,
      children,
      style,
      onClick,
      ...props
    },
    ref
  ) => {
    const sizeStyles: Record<string, React.CSSProperties> = {
      xs: { padding: `${designTokens.spacing.xs} ${designTokens.spacing.sm}`, fontSize: designTokens.typography.fontSizes.xs, gap: designTokens.spacing.xs, height: '28px' },
      sm: { padding: `${designTokens.spacing.sm} ${designTokens.spacing.md}`, fontSize: designTokens.typography.fontSizes.sm, gap: designTokens.spacing.sm, height: '36px' },
      md: { padding: `${designTokens.spacing.md} ${designTokens.spacing.lg}`, fontSize: designTokens.typography.fontSizes.base, gap: designTokens.spacing.md, height: '44px' },
      lg: { padding: `${designTokens.spacing.lg} ${designTokens.spacing.xl}`, fontSize: designTokens.typography.fontSizes.lg, gap: designTokens.spacing.lg, height: '52px' },
    };

    const variantStyles: Record<string, React.CSSProperties> = {
      primary: {
        background: 'linear-gradient(135deg, rgba(100, 180, 255, 0.15) 0%, rgba(80, 150, 255, 0.1) 100%)',
        border: `1px solid ${designTokens.colors.border.focus}`,
        color: designTokens.colors.accent.cyan,
        boxShadow: 'none',
      },
      secondary: {
        background: 'rgba(255,255,255,0.05)',
        border: `1px solid ${designTokens.colors.border.default}`,
        color: designTokens.colors.text.secondary,
        boxShadow: 'none',
      },
      danger: {
        background: 'linear-gradient(135deg, rgba(255, 107, 107, 0.12) 0%, rgba(255, 80, 80, 0.08) 100%)',
        border: `1px solid rgba(255, 107, 107, 0.25)`,
        color: designTokens.colors.accent.coral,
        boxShadow: 'none',
      },
      ghost: {
        background: 'transparent',
        border: '1px solid transparent',
        color: designTokens.colors.text.secondary,
        boxShadow: 'none',
      },
      glass: {
        background: designTokens.glass.strong.background,
        backdropFilter: designTokens.glass.strong.backdropFilter,
        WebkitBackdropFilter: designTokens.glass.strong.backdropFilter,
        border: designTokens.glass.strong.border,
        color: designTokens.colors.text.primary,
        boxShadow: designTokens.glass.strong.boxShadow,
      },
    };

    const hoverStyles: Record<string, React.CSSProperties> = {
      primary: {
        background: 'linear-gradient(135deg, rgba(100, 180, 255, 0.25) 0%, rgba(80, 150, 255, 0.2) 100%)',
        borderColor: 'rgba(100, 180, 255, 0.5)',
        color: '#ffffff',
        boxShadow: designTokens.shadows.glow,
      },
      secondary: {
        background: 'rgba(255,255,255,0.08)',
        borderColor: designTokens.colors.border.default,
        color: designTokens.colors.text.primary,
      },
      danger: {
        background: 'linear-gradient(135deg, rgba(255, 107, 107, 0.2) 0%, rgba(255, 80, 80, 0.15) 100%)',
        borderColor: 'rgba(255, 107, 107, 0.4)',
        color: '#ffffff',
        boxShadow: '0 4px 20px rgba(255, 107, 107, 0.15)',
      },
      ghost: {
        background: 'rgba(255,255,255,0.06)',
        borderColor: designTokens.colors.border.subtle,
        color: designTokens.colors.text.primary,
      },
      glass: {
        background: designTokens.glass.intense.background,
        borderColor: designTokens.colors.border.strong,
        boxShadow: designTokens.glass.intense.boxShadow,
      },
    };

    const activeStyles: Record<string, React.CSSProperties> = {
      primary: { transform: 'scale(0.98)' },
      secondary: { transform: 'scale(0.98)' },
      danger: { transform: 'scale(0.98)' },
      ghost: { transform: 'scale(0.98)' },
      glass: { transform: 'scale(0.98)' },
    };

    const baseStyle: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      ...sizeStyles[size],
      ...variantStyles[variant],
      borderRadius: designTokens.borderRadius.lg,
      fontFamily: designTokens.typography.fontFamilies.sans,
      fontWeight: designTokens.typography.fontWeights.semibold,
      letterSpacing: designTokens.typography.letterSpacing.wide,
      cursor: disabled || loading ? 'not-allowed' : 'pointer',
      transition: `all ${designTokens.animation.durations.fast}ms ${designTokens.animation.easings.smooth}`,
      width: fullWidth ? '100%' : 'auto',
      opacity: disabled || loading ? 0.6 : 1,
      ...style,
    };

    return (
      <button
        ref={ref}
        className={cn('glass-button', className)}
        style={baseStyle}
        disabled={disabled || loading}
        onClick={onClick}
        onMouseEnter={(e) => {
          if (!disabled && !loading) {
            Object.assign(e.currentTarget.style, hoverStyles[variant]);
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled && !loading) {
            Object.assign(e.currentTarget.style, variantStyles[variant]);
          }
        }}
        onMouseDown={(e) => {
          if (!disabled && !loading) {
            Object.assign(e.currentTarget.style, activeStyles[variant]);
          }
        }}
        onMouseUp={(e) => {
          if (!disabled && !loading) {
            Object.assign(e.currentTarget.style, hoverStyles[variant]);
          }
        }}
        {...props}
      >
        {loading && (
          <svg
            className="glass-button-spinner"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            style={{ animation: 'spin 1s linear infinite', marginRight: iconPosition === 'left' ? designTokens.spacing.sm : 0 }}
          >
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.25" strokeLinecap="round" />
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        )}
        {icon && !loading && iconPosition === 'left' && <span style={{ display: 'flex' }}>{icon}</span>}
        <span>{children}</span>
        {icon && !loading && iconPosition === 'right' && <span style={{ display: 'flex', marginLeft: designTokens.spacing.sm }}>{icon}</span>}
      </button>
    );
  }
);

GlassButton.displayName = 'GlassButton';

export interface GlassInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  placeholder?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

export const GlassInput = forwardRef<HTMLInputElement, GlassInputProps>(
  ({ className, label, placeholder, error, helperText, icon, iconPosition = 'left', fullWidth = false, id, style, ...props }, ref) => {
    const inputId = id || `glass-input-${React.useId()}`;

    const wrapperStyle: React.CSSProperties = {
      display: 'flex',
      flexDirection: 'column',
      gap: designTokens.spacing.xs,
      width: fullWidth ? '100%' : 'auto',
      ...style,
    };

    const inputWrapperStyle: React.CSSProperties = {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
    };

const inputStyle: React.CSSProperties = {
      width: '100%',
      padding: `${designTokens.spacing.sm} ${designTokens.spacing.md}`,
      paddingLeft: icon && iconPosition === 'left' ? '40px' : designTokens.spacing.md,
      paddingRight: icon && iconPosition === 'right' ? '40px' : designTokens.spacing.md,
      fontSize: designTokens.typography.fontSizes.sm,
      fontFamily: designTokens.typography.fontFamilies.mono,
      color: designTokens.colors.text.primary,
      background: designTokens.colors.background.surface,
      border: `1px solid ${error ? designTokens.colors.accent.coral : designTokens.colors.border.subtle}`,
      borderRadius: designTokens.borderRadius.md,
      outline: 'none',
      transition: `all ${designTokens.animation.durations.fast}ms ${designTokens.animation.easings.smooth}`,
    };

    const iconStyle: React.CSSProperties = {
      position: 'absolute',
      left: iconPosition === 'left' ? designTokens.spacing.md : undefined,
      right: iconPosition === 'right' ? designTokens.spacing.md : undefined,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: designTokens.colors.text.muted,
      pointerEvents: 'none',
    };

    return (
      <div className={cn('glass-input-wrapper', className)} style={wrapperStyle}>
        {label && (
          <label
            htmlFor={inputId}
            style={{
              fontSize: designTokens.typography.fontSizes.xs,
              fontWeight: designTokens.typography.fontWeights.medium,
              letterSpacing: designTokens.typography.letterSpacing.wider,
              textTransform: 'uppercase',
              color: designTokens.colors.text.secondary,
              fontFamily: designTokens.typography.fontFamilies.sans,
            }}
          >
            {label}
          </label>
        )}
        <div style={inputWrapperStyle}>
          {icon && iconPosition === 'left' && <span style={iconStyle}>{icon}</span>}
          <input
            ref={ref}
            id={inputId}
            className={cn('glass-input', error && 'glass-input-error')}
            placeholder={placeholder}
            style={inputStyle}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = error ? designTokens.colors.accent.coral : designTokens.colors.border.focus;
              e.currentTarget.style.boxShadow = `0 0 0 2px ${error ? 'rgba(255, 107, 107, 0.2)' : 'rgba(100, 180, 255, 0.2)'}`;
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = error ? designTokens.colors.accent.coral : designTokens.colors.border.subtle;
              e.currentTarget.style.boxShadow = 'none';
            }}
            {...props}
          />
          {icon && iconPosition === 'right' && <span style={iconStyle}>{icon}</span>}
        </div>
        {(error || helperText) && (
          <span
            style={{
              fontSize: designTokens.typography.fontSizes.xs,
              color: error ? designTokens.colors.accent.coral : designTokens.colors.text.muted,
              fontFamily: designTokens.typography.fontFamilies.mono,
            }}
          >
            {error || helperText}
          </span>
        )}
      </div>
    );
  }
);

GlassInput.displayName = 'GlassInput';

export interface GlassSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  placeholder?: string;
  error?: string;
  options: { value: string; label: string }[];
  fullWidth?: boolean;
}

export const GlassSelect = forwardRef<HTMLSelectElement, GlassSelectProps>(
  ({ className, label, placeholder, error, options, fullWidth = false, id, style, ...props }, ref) => {
    const selectId = id || `glass-select-${React.useId()}`;

    const wrapperStyle: React.CSSProperties = {
      display: 'flex',
      flexDirection: 'column',
      gap: designTokens.spacing.xs,
      width: fullWidth ? '100%' : 'auto',
      ...style,
    };

const selectStyle: React.CSSProperties = {
      width: '100%',
      padding: `${designTokens.spacing.sm} ${designTokens.spacing.md}`,
      fontSize: designTokens.typography.fontSizes.sm,
      fontFamily: designTokens.typography.fontFamilies.mono,
      color: designTokens.colors.text.primary,
      background: designTokens.colors.background.surface,
      border: `1px solid ${error ? designTokens.colors.accent.coral : designTokens.colors.border.subtle}`,
      borderRadius: designTokens.borderRadius.md,
      outline: 'none',
      appearance: 'none',
      cursor: 'pointer',
      transition: `all ${designTokens.animation.durations.fast}ms ${designTokens.animation.easings.smooth}`,
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2388aadd' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'right 12px center',
      paddingRight: '40px',
    };

    return (
      <div className={cn('glass-select-wrapper', className)} style={wrapperStyle}>
        {label && (
          <label
            htmlFor={selectId}
            style={{
              fontSize: designTokens.typography.fontSizes.xs,
              fontWeight: designTokens.typography.fontWeights.medium,
              letterSpacing: designTokens.typography.letterSpacing.wider,
              textTransform: 'uppercase',
              color: designTokens.colors.text.secondary,
              fontFamily: designTokens.typography.fontFamilies.sans,
            }}
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={cn('glass-select', error && 'glass-select-error')}
          style={selectStyle}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = error ? designTokens.colors.accent.coral : designTokens.colors.border.focus;
            e.currentTarget.style.boxShadow = `0 0 0 2px ${error ? 'rgba(255, 107, 107, 0.2)' : 'rgba(100, 180, 255, 0.2)'}`;
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = error ? designTokens.colors.accent.coral : designTokens.colors.border.subtle;
            e.currentTarget.style.boxShadow = 'none';
          }}
          {...props}
        >
          {placeholder && <option value="" disabled>{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && (
          <span
            style={{
              fontSize: designTokens.typography.fontSizes.xs,
              color: designTokens.colors.accent.coral,
              fontFamily: designTokens.typography.fontFamilies.mono,
            }}
          >
            {error}
          </span>
        )}
      </div>
    );
  }
);

GlassSelect.displayName = 'GlassSelect';
