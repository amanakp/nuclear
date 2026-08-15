import React from 'react';
import { designTokens } from '../design/tokens';
import { SkipForward } from 'lucide-react';
import { LoadProgress } from '../assets/AssetManager';

interface CinematicUIProps {
  sceneTitle?: string;
  narration?: string;
  instruction?: string;
  progress?: LoadProgress | null;
  showSkip?: boolean;
  onSkip?: () => void;
  isLoading?: boolean;
}

export const CinematicUI: React.FC<CinematicUIProps> = ({
  sceneTitle,
  narration,
  instruction,
  progress,
  showSkip = false,
  onSkip,
  isLoading = false,
}) => {
  const percentage = progress?.percentage || 0;
  const currentAsset = progress?.currentAsset || '';

  if (!sceneTitle && !narration && !instruction && !isLoading) {
    return null;
  }

  return (
    <div className="cinematic-ui" style={styles.container}>
      {isLoading && (
        <div style={styles.loadingOverlay}>
          <div style={styles.loadingCard}>
            <div style={styles.loadingSpinner} />
            <div style={styles.loadingText}>
              <strong>Loading {currentAsset || 'assets'}...</strong>
              <span>{percentage.toFixed(1)}% • {progress?.loaded || 0}/{progress?.total || 0} assets</span>
            </div>
            <div style={styles.progressBar}>
              <div style={{ ...styles.progressFill, width: `${percentage}%` }} />
            </div>
          </div>
        </div>
      )}

      {!isLoading && (
        <>
          {sceneTitle && (
            <div style={styles.titleBar}>
              <div style={styles.sceneNumber}>{sceneTitle}</div>
            </div>
          )}

          {narration && (
            <div style={styles.narrationBar}>
              <p style={styles.narrationText}>{narration}</p>
            </div>
          )}

          {instruction && (
            <div style={styles.instructionBar}>
              <span style={styles.instructionText}>{instruction}</span>
            </div>
          )}

          {showSkip && onSkip && (
            <button onClick={onSkip} style={styles.skipButton} aria-label="Skip scene">
              <SkipForward size={18} />
              <span>Skip</span>
            </button>
          )}
        </>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    inset: 0,
    pointerEvents: 'none',
    zIndex: 100,
    display: 'flex',
    flexDirection: 'column',
    padding: designTokens.spacing.xl,
  },
  loadingOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(2, 4, 8, 0.95)',
    backdropFilter: designTokens.blur.xl,
    WebkitBackdropFilter: designTokens.blur.xl,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'auto',
    zIndex: 200,
  },
  loadingCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: designTokens.spacing.lg,
    padding: designTokens.spacing.xxxl,
    maxWidth: 400,
    width: '90%',
  },
  loadingSpinner: {
    width: 48,
    height: 48,
    border: `3px solid ${designTokens.colors.border.subtle}`,
    borderTopColor: designTokens.colors.accent.cyan,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    textAlign: 'center',
    color: designTokens.colors.text.primary,
    display: 'flex',
    flexDirection: 'column',
    gap: designTokens.spacing.xs,
  },
  progressBar: {
    width: '100%',
    height: 4,
    background: designTokens.colors.background.tertiary,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: `linear-gradient(90deg, ${designTokens.colors.accent.cyan}, ${designTokens.colors.accent.emerald})`,
    borderRadius: 2,
    transition: 'width 0.3s ease',
  },
  titleBar: {
    position: 'absolute',
    top: designTokens.spacing.xl,
    left: '50%',
    transform: 'translateX(-50%)',
    pointerEvents: 'auto',
  },
  sceneNumber: {
    fontFamily: designTokens.typography.fontFamilies.display,
    fontSize: designTokens.typography.fontSizes.xs,
    fontWeight: designTokens.typography.fontWeights.extrabold,
    color: designTokens.colors.accent.cyan,
    letterSpacing: designTokens.typography.letterSpacing.widest,
    textTransform: 'uppercase',
    background: 'rgba(2, 4, 8, 0.8)',
    backdropFilter: designTokens.blur.md,
    WebkitBackdropFilter: designTokens.blur.md,
    padding: `${designTokens.spacing.sm} ${designTokens.spacing.lg}`,
    borderRadius: designTokens.borderRadius.full,
    border: `1px solid ${designTokens.colors.border.subtle}`,
    whiteSpace: 'nowrap',
  },
  narrationBar: {
    position: 'absolute',
    bottom: designTokens.spacing.xxxl,
    left: '50%',
    transform: 'translateX(-50%)',
    maxWidth: 700,
    pointerEvents: 'auto',
    textAlign: 'center',
  },
  narrationText: {
    fontFamily: designTokens.typography.fontFamilies.sans,
    fontSize: designTokens.typography.fontSizes.lg,
    fontWeight: designTokens.typography.fontWeights.regular,
    color: designTokens.colors.text.primary,
    lineHeight: designTokens.typography.lineHeights.relaxed,
    background: 'rgba(2, 4, 8, 0.7)',
    backdropFilter: designTokens.blur.lg,
    WebkitBackdropFilter: designTokens.blur.lg,
    padding: `${designTokens.spacing.lg} ${designTokens.spacing.xxl}`,
    borderRadius: designTokens.borderRadius.xl,
    border: `1px solid ${designTokens.colors.border.subtle}`,
    margin: 0,
    animation: 'fadeInUp 0.8s ease-out',
  },
  instructionBar: {
    position: 'absolute',
    bottom: designTokens.spacing.xl,
    left: '50%',
    transform: 'translateX(-50%)',
    pointerEvents: 'auto',
  },
  instructionText: {
    fontFamily: designTokens.typography.fontFamilies.mono,
    fontSize: designTokens.typography.fontSizes.xs,
    fontWeight: designTokens.typography.fontWeights.medium,
    color: designTokens.colors.accent.cyan,
    letterSpacing: designTokens.typography.letterSpacing.wide,
    textTransform: 'uppercase',
    background: 'rgba(2, 4, 8, 0.6)',
    backdropFilter: designTokens.blur.md,
    WebkitBackdropFilter: designTokens.blur.md,
    padding: `${designTokens.spacing.sm} ${designTokens.spacing.lg}`,
    borderRadius: designTokens.borderRadius.full,
    border: `1px solid ${designTokens.colors.accent.cyan}40`,
    animation: 'pulse 2s ease-in-out infinite',
  },
  skipButton: {
    position: 'absolute',
    top: designTokens.spacing.xl,
    right: designTokens.spacing.xl,
    display: 'flex',
    alignItems: 'center',
    gap: designTokens.spacing.sm,
    padding: `${designTokens.spacing.sm} ${designTokens.spacing.lg}`,
    background: 'rgba(2, 4, 8, 0.8)',
    backdropFilter: designTokens.blur.md,
    WebkitBackdropFilter: designTokens.blur.md,
    border: `1px solid ${designTokens.colors.border.subtle}`,
    borderRadius: designTokens.borderRadius.full,
    color: designTokens.colors.text.secondary,
    fontFamily: designTokens.typography.fontFamilies.mono,
    fontSize: designTokens.typography.fontSizes.xs,
    fontWeight: designTokens.typography.fontWeights.medium,
    letterSpacing: designTokens.typography.letterSpacing.wide,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    pointerEvents: 'auto',
  },
};

export const CinematicUICSS = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes pulse {
    0%, 100% { opacity: 0.6; }
    50% { opacity: 1; }
  }
  .cinematic-ui {
    font-family: ${designTokens.typography.fontFamilies.sans};
  }
`;