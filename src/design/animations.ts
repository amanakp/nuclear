import { designTokens } from './tokens';

export const animations = {
  keyframes: `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes fadeOut {
      from { opacity: 1; }
      to { opacity: 0; }
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(16px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-16px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes slideInLeft {
      from {
        opacity: 0;
        transform: translateX(-24px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    @keyframes slideInRight {
      from {
        opacity: 0;
        transform: translateX(24px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    @keyframes slideInTop {
      from {
        opacity: 0;
        transform: translateY(-24px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes slideInBottom {
      from {
        opacity: 0;
        transform: translateY(24px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes scaleIn {
      from {
        opacity: 0;
        transform: scale(0.95);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }

    @keyframes scaleOut {
      from {
        opacity: 1;
        transform: scale(1);
      }
      to {
        opacity: 0;
        transform: scale(0.95);
      }
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    @keyframes pulseSoft {
      0%, 100% { opacity: 0.8; transform: scale(1); }
      50% { opacity: 1; transform: scale(1.02); }
    }

    @keyframes ping {
      0% { transform: scale(1); opacity: 0.5; }
      75%, 100% { transform: scale(2); opacity: 0; }
    }

    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }

    @keyframes progressStripe {
      0% { background-position: 0 0; }
      100% { background-position: 16px 0; }
    }

    @keyframes radialPulse {
      0%, 100% { stroke-dashoffset: var(--offset, 0); filter: drop-shadow(0 0 0 transparent); }
      50% { filter: drop-shadow(0 0 8px currentColor); }
    }

    @keyframes glowPulse {
      0%, 100% { box-shadow: 0 0 20px rgba(100, 180, 255, 0.15); }
      50% { box-shadow: 0 0 40px rgba(100, 180, 255, 0.3), 0 0 60px rgba(100, 180, 255, 0.15); }
    }

    @keyframes borderGlow {
      0%, 100% { border-color: rgba(100, 180, 255, 0.3); }
      50% { border-color: rgba(100, 180, 255, 0.6); }
    }

    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-4px); }
    }

    @keyframes breathe {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.01); }
    }

    @keyframes rotateSlow {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    @keyframes waveform {
      0% { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }

    @keyframes loadingBar {
      0% { transform: translateX(-100%); }
      50% { transform: translateX(0); }
      100% { transform: translateX(100%); }
    }

    @keyframes countUp {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes staggerIn {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes staggerOut {
      from { opacity: 1; transform: translateY(0); }
      to { opacity: 0; transform: translateY(-12px); }
    }

    @keyframes ringExpand {
      0% { transform: scale(0.8); opacity: 0.6; }
      100% { transform: scale(1.4); opacity: 0; }
    }

    @keyframes scanline {
      0% { transform: translateY(-100%); opacity: 0; }
      10% { opacity: 1; }
      90% { opacity: 1; }
      100% { transform: translateY(100vh); opacity: 0; }
    }
  `,

  transitions: {
    micro: `all ${designTokens.animation.durations.micro}ms ${designTokens.animation.easings.smooth}`,
    fast: `all ${designTokens.animation.durations.fast}ms ${designTokens.animation.easings.smooth}`,
    normal: `all ${designTokens.animation.durations.normal}ms ${designTokens.animation.easings.smooth}`,
    slow: `all ${designTokens.animation.durations.slow}ms ${designTokens.animation.easings.smooth}`,
  },

  easings: designTokens.animation.easings,
  durations: designTokens.animation.durations,
};

export function injectKeyframes(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById('design-system-keyframes')) return;

  const style = document.createElement('style');
  style.id = 'design-system-keyframes';
  style.textContent = animations.keyframes;
  document.head.appendChild(style);
}

export function createStaggeredAnimation(
  baseDelay: number = 50,
  stagger: number = 50
): string {
  return `
    animation: staggerIn ${designTokens.animation.durations.normal}ms ${designTokens.animation.easings.enter} both;
    animation-delay: calc(${baseDelay}ms + var(--stagger-index, 0) * ${stagger}ms);
  `;
}

export function getTransition(duration: keyof typeof designTokens.animation.durations, easing: keyof typeof designTokens.animation.easings = 'smooth'): string {
  return `all ${designTokens.animation.durations[duration]}ms ${designTokens.animation.easings[easing]}`;
}