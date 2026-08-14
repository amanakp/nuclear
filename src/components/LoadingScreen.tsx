import React, { useEffect, useRef } from 'react';
import { designTokens } from '../design/tokens';
import { GlassPanel, GlassProgressBar, GlassButton } from '../design/GlassComponents';

export interface LoadingScreenProps {
  progress: {
    total: number;
    loaded: number;
    currentAsset: string;
    percentage: number;
    bytesLoaded: number;
    bytesTotal: number;
  } | null;
  error?: string;
  onRetry?: () => void;
  onCancel?: () => void;
  showDetails?: boolean;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  progress,
  error,
  onRetry,
  onCancel,
  showDetails = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  const percentage = progress?.percentage || 0;
  const status = progress ? `Loading ${progress.currentAsset}...` : 'Initializing...';
  const assetsLoaded = progress?.loaded || 0;
  const assetsTotal = progress?.total || 0;
  const currentAsset = progress?.currentAsset || '';

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const canvasElement = canvas;

    const ctx = canvasElement.getContext('2d');
    if (!ctx) return;

    let centerX = 0;
    let centerY = 0;
    let radius = 0;

    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      opacity: number;
      life: number;
      maxLife: number;
      color: string;
    }> = [];

    const colors = [
      designTokens.colors.accent.cyan,
      designTokens.colors.accent.emerald,
      designTokens.colors.accent.amber,
    ];

    function resize() {
      canvasElement.width = window.innerWidth;
      canvasElement.height = window.innerHeight;
      centerX = canvasElement.width / 2;
      centerY = canvasElement.height / 2;
      radius = Math.min(canvasElement.width, canvasElement.height) * 0.35;
    }

    function spawnParticle() {
      if (particles.length > 80) return;
      const side = Math.floor(Math.random() * 4);
      let x, y, vx, vy;

      switch (side) {
        case 0: // top
          x = Math.random() * canvasElement.width;
          y = -10;
          vx = (Math.random() - 0.5) * 0.5;
          vy = Math.random() * 0.8 + 0.3;
          break;
        case 1: // right
          x = canvasElement.width + 10;
          y = Math.random() * canvasElement.height;
          vx = -(Math.random() * 0.8 + 0.3);
          vy = (Math.random() - 0.5) * 0.5;
          break;
        case 2: // bottom
          x = Math.random() * canvasElement.width;
          y = canvasElement.height + 10;
          vx = (Math.random() - 0.5) * 0.5;
          vy = -(Math.random() * 0.8 + 0.3);
          break;
        default: // left
          x = -10;
          y = Math.random() * canvasElement.height;
          vx = Math.random() * 0.8 + 0.3;
          vy = (Math.random() - 0.5) * 0.5;
      }

      particles.push({
        x,
        y,
        vx,
        vy,
        size: Math.random() * 2 + 1,
        opacity: Math.random() * 0.4 + 0.1,
        life: 0,
        maxLife: Math.random() * 120 + 180,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    function animate() {
      if (!ctx) return;

      ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);

      // Draw center glow
      const gradient = ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, radius
      );
      gradient.addColorStop(0, `rgba(100, 180, 255, ${0.08 + percentage * 0.0004})`);
      gradient.addColorStop(0.5, `rgba(34, 211, 168, ${0.04 + percentage * 0.0002})`);
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvasElement.width, canvasElement.height);

      // Draw rotating rings
      const time = Date.now() * 0.0003;
      for (let i = 0; i < 3; i++) {
        const ringRadius = radius * (0.3 + i * 0.25) * (0.9 + Math.sin(time + i) * 0.1);
        ctx.beginPath();
        ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(100, 180, 255, ${0.15 - i * 0.04})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Update and draw particles
      spawnParticle();

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life++;
        p.opacity = Math.max(0, p.opacity * (1 - p.life / p.maxLife));

        if (p.life >= p.maxLife || p.opacity <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        const colorRgba = p.color.replace('rgb', 'rgba').replace(')', `, ${p.opacity})`);
        ctx.fillStyle = colorRgba;
        ctx.fill();
      }

      // Draw center logo pulse
      const pulseScale = 1 + Math.sin(Date.now() * 0.003) * 0.08;
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.scale(pulseScale, pulseScale);

      // Reactor symbol
      ctx.strokeStyle = designTokens.colors.accent.cyan;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 30, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, -30);
      ctx.lineTo(0, 30);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-30, 0);
      ctx.lineTo(30, 0);
      ctx.stroke();

      // Inner circle
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.strokeStyle = designTokens.colors.accent.emerald;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.restore();

      animationRef.current = requestAnimationFrame(animate);
    }

    window.addEventListener('resize', resize);
    resize();
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [percentage]);

  if (error) {
    return (
      <div className="loading-error-overlay" style={styles.errorOverlay}>
        <GlassPanel variant="intense" style={styles.errorPanel}>
          <div style={styles.errorIcon}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={designTokens.colors.accent.coral} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2 style={styles.errorTitle}>Loading Failed</h2>
          <p style={styles.errorMessage}>{error}</p>
          <div style={styles.errorActions}>
            {onRetry && (
              <GlassButton variant="primary" onClick={onRetry} style={styles.errorButton}>
                Retry Loading
              </GlassButton>
            )}
            {onCancel && (
              <GlassButton variant="ghost" onClick={onCancel} style={styles.errorButton}>
                Cancel
              </GlassButton>
            )}
          </div>
        </GlassPanel>
      </div>
    );
  }

  return (
    <div className="loading-screen" style={styles.screen}>
      <canvas ref={canvasRef} style={styles.canvas} aria-hidden="true" />
      <div style={styles.content}>
        <div style={styles.logoContainer}>
          <div style={styles.logoRing} />
          <div style={styles.logoCore} />
        </div>
        <h1 style={styles.title}>NUCLEUS</h1>
        <p style={styles.subtitle}>Infrastructure XR — Nuclear Digital Twin</p>
        <div style={styles.progressContainer}>
          <GlassProgressBar
            value={percentage}
            max={100}
            height={6}
            variant="gradient"
            animated={percentage > 0 && percentage < 100}
            showLabel
          />
          <div style={styles.progressInfo}>
            <span style={styles.progressText}>{percentage.toFixed(1)}%</span>
            {showDetails && (
              <>
                <span style={styles.divider}>\u00A0|\u00A0</span>
                <span style={styles.detailText}>
                  {assetsLoaded} / {assetsTotal} assets
                </span>
              </>
            )}
          </div>
        </div>
        <p style={styles.statusText}>{status}</p>
        {showDetails && currentAsset && (
          <p style={styles.currentAssetText}>Loading: {currentAsset}</p>
        )}
        {onCancel && (
          <GlassButton variant="ghost" onClick={onCancel} size="sm" style={styles.cancelButton}>
            Cancel Loading
          </GlassButton>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  screen: {
    position: 'fixed',
    inset: 0,
    zIndex: designTokens.zIndex.loading,
    background: designTokens.colors.background.primary,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  canvas: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
  },
  content: {
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: designTokens.spacing.xl,
    padding: designTokens.spacing.xxl,
    textAlign: 'center',
  },
  logoContainer: {
    position: 'relative',
    width: 120,
    height: 120,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoRing: {
    position: 'absolute',
    inset: 0,
    border: `2px solid ${designTokens.colors.accent.cyan}`,
    borderRadius: '50%',
    opacity: 0.3,
    animation: 'rotateSlow 20s linear infinite',
  },
  logoCore: {
    position: 'relative',
    width: 80,
    height: 80,
    border: `2px solid ${designTokens.colors.accent.cyan}`,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(100, 180, 255, 0.05)',
    boxShadow: `
      0 0 40px rgba(100, 180, 255, 0.2),
      inset 0 0 40px rgba(100, 180, 255, 0.1)
    `,
    animation: 'pulseSoft 3s ease-in-out infinite',
  },
  title: {
    fontFamily: designTokens.typography.fontFamilies.display,
    fontSize: designTokens.typography.fontSizes.xxxl,
    fontWeight: designTokens.typography.fontWeights.extrabold,
    color: designTokens.colors.text.primary,
    letterSpacing: designTokens.typography.letterSpacing.widest,
    margin: 0,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontFamily: designTokens.typography.fontFamilies.sans,
    fontSize: designTokens.typography.fontSizes.md,
    fontWeight: designTokens.typography.fontWeights.regular,
    color: designTokens.colors.text.secondary,
    letterSpacing: designTokens.typography.letterSpacing.wide,
    margin: 0,
    textTransform: 'uppercase',
  },
  progressContainer: {
    width: '100%',
    maxWidth: 480,
    display: 'flex',
    flexDirection: 'column',
    gap: designTokens.spacing.sm,
  },
  progressBar: {
    width: '100%',
  },
  progressInfo: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: designTokens.spacing.sm,
  },
  progressText: {
    fontFamily: designTokens.typography.fontFamilies.mono,
    fontSize: designTokens.typography.fontSizes.lg,
    fontWeight: designTokens.typography.fontWeights.semibold,
    color: designTokens.colors.accent.cyan,
  },
  divider: {
    color: designTokens.colors.border.subtle,
  },
  detailText: {
    fontFamily: designTokens.typography.fontFamilies.mono,
    fontSize: designTokens.typography.fontSizes.xs,
    color: designTokens.colors.text.muted,
  },
  statusText: {
    fontFamily: designTokens.typography.fontFamilies.mono,
    fontSize: designTokens.typography.fontSizes.xs,
    color: designTokens.colors.text.secondary,
    margin: 0,
    letterSpacing: designTokens.typography.letterSpacing.wide,
    textTransform: 'uppercase',
    minHeight: 20,
  },
  currentAssetText: {
    fontFamily: designTokens.typography.fontFamilies.mono,
    fontSize: '9px',
    color: designTokens.colors.text.muted,
    margin: `${designTokens.spacing.xs} 0 0 0`,
    letterSpacing: designTokens.typography.letterSpacing.normal,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: 480,
  },
  cancelButton: {
    marginTop: designTokens.spacing.md,
  },
  errorOverlay: {
    position: 'fixed',
    inset: 0,
    zIndex: designTokens.zIndex.loading,
    background: 'rgba(2, 4, 8, 0.95)',
    backdropFilter: designTokens.blur.xl,
    WebkitBackdropFilter: designTokens.blur.xl,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: designTokens.spacing.xxl,
  },
  errorPanel: {
    maxWidth: 420,
    width: '90%',
    padding: designTokens.spacing.xxxl,
    textAlign: 'center',
  },
  errorIcon: {
    marginBottom: designTokens.spacing.lg,
    animation: 'pulseSoft 2s ease-in-out infinite',
  },
  errorTitle: {
    fontFamily: designTokens.typography.fontFamilies.display,
    fontSize: designTokens.typography.fontSizes.xl,
    fontWeight: designTokens.typography.fontWeights.bold,
    color: designTokens.colors.accent.coral,
    margin: `${designTokens.spacing.md} 0 ${designTokens.spacing.sm} 0`,
  },
  errorMessage: {
    fontFamily: designTokens.typography.fontFamilies.sans,
    fontSize: designTokens.typography.fontSizes.base,
    color: designTokens.colors.text.secondary,
    margin: 0,
    lineHeight: designTokens.typography.lineHeights.relaxed,
  },
  errorActions: {
    display: 'flex',
    gap: designTokens.spacing.md,
    justifyContent: 'center',
    marginTop: designTokens.spacing.xl,
    flexWrap: 'wrap',
  },
  errorButton: {
    minWidth: 140,
  },
};

export const LoadingScreenCSS = `
  @keyframes rotateSlow {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  @keyframes pulseSoft {
    0%, 100% { transform: scale(1); opacity: 0.85; }
    50% { transform: scale(1.05); opacity: 1; }
  }

  .loading-screen {
    font-family: ${designTokens.typography.fontFamilies.sans};
  }
`;
