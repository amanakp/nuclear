export const designTokens = {
  colors: {
    background: {
      primary: '#020408',
      secondary: '#080c14',
      tertiary: '#0f141f',
      surface: 'rgba(15, 20, 30, 0.45)',
      surfaceStrong: 'rgba(10, 15, 25, 0.6)',
      surfaceOverlay: 'rgba(8, 12, 20, 0.72)',
    },
    border: {
      subtle: 'rgba(255, 255, 255, 0.06)',
      default: 'rgba(255, 255, 255, 0.08)',
      focus: 'rgba(100, 180, 255, 0.35)',
      strong: 'rgba(255, 255, 255, 0.12)',
      glass: 'rgba(255, 255, 255, 0.1)',
    },
    text: {
      primary: '#ffffff',
      secondary: '#88aadd',
      muted: '#5a6d8a',
      label: '#88aadd',
      inverse: '#020408',
    },
    accent: {
      cyan: '#64b4ff',
      cyanBright: '#00f0ff',
      cyanDim: '#3a8fd6',
      emerald: '#22d3a8',
      emeraldBright: '#34f5b8',
      amber: '#f5b800',
      amberBright: '#ffd43a',
      coral: '#ff6b6b',
      coralBright: '#ff8a8a',
    },
    semantic: {
      success: '#22d3a8',
      warning: '#f5b800',
      danger: '#ff6b6b',
      info: '#64b4ff',
    },
    status: {
      nominal: '#22d3a8',
      elevated: '#f5b800',
      critical: '#ff6b6b',
    },
    category: {
      safety: '#00ff88',
      thermal: '#ff4400',
      hydro: '#0088ff',
      generation: '#ffaa00',
      physics: '#00f0ff',
    },
  },

  spacing: {
    xs: '2px',
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    xxl: '24px',
    xxxl: '32px',
  },

  borderRadius: {
    sm: '6px',
    md: '8px',
    lg: '10px',
    xl: '12px',
    xxl: '16px',
    full: '9999px',
  },

  typography: {
    fontFamilies: {
      sans: '"Inter", "Roboto", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      mono: '"JetBrains Mono", "Fira Code", monospace',
      display: '"Orbitron", "JetBrains Mono", monospace',
    },
    fontSizes: {
      xs: '10px',
      sm: '11px',
      base: '12px',
      md: '14px',
      lg: '16px',
      xl: '20px',
      xxl: '28px',
      xxxl: '36px',
    },
    fontWeights: {
      light: 300,
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 900,
    },
    lineHeights: {
      tight: 1.1,
      normal: 1.35,
      relaxed: 1.5,
    },
    letterSpacing: {
      tight: '-0.02em',
      normal: '0',
      wide: '0.05em',
      wider: '0.08em',
      widest: '0.12em',
    },
  },

  shadows: {
    none: 'none',
    xs: '0 1px 2px rgba(0, 0, 0, 0.3)',
    sm: '0 2px 8px rgba(0, 0, 0, 0.35)',
    md: '0 4px 16px rgba(0, 0, 0, 0.4)',
    lg: '0 8px 32px rgba(0, 0, 0, 0.45)',
    xl: '0 16px 48px rgba(0, 0, 0, 0.5)',
    xxl: '0 24px 64px rgba(0, 0, 0, 0.55)',
    inner: 'inset 0 1px 2px rgba(255, 255, 255, 0.03)',
    glow: '0 0 20px rgba(100, 180, 255, 0.15)',
    glowStrong: '0 0 40px rgba(100, 180, 255, 0.25)',
    focus: '0 0 0 2px rgba(100, 180, 255, 0.4)',
  },

  blur: {
    none: '0',
    sm: 'blur(4px)',
    md: 'blur(8px)',
    lg: 'blur(12px)',
    xl: 'blur(16px)',
    xxl: 'blur(20px)',
    xxxl: 'blur(32px)',
  },

  opacity: {
    disabled: 0.35,
    hover: 0.85,
    active: 0.7,
    overlay: 0.5,
    glass: 0.45,
    glassStrong: 0.6,
  },

  transitions: {
    instant: '0ms',
    fast: '100ms',
    normal: '150ms',
    slow: '250ms',
    slower: '350ms',
    slowest: '500ms',
  },

  easing: {
    linear: 'linear',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easeOutExpo: 'cubic-bezier(0.19, 1, 0.22, 1)',
    easeOutBack: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    smooth: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
  },

  zIndex: {
    base: 0,
    canvas: 1,
    hotspots: 20,
    hud: 30,
    dock: 35,
    floating: 40,
    caliper: 42,
    modal: 45,
    aura: 48,
    xr: 50,
    toast: 55,
    loading: 60,
  },

  breakpoints: {
    sm: '640px',
    md: '820px',
    lg: '1180px',
    xl: '1440px',
    xxl: '1920px',
  },

  glass: {
    light: {
      background: 'rgba(15, 20, 30, 0.35)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255, 255, 255, 0.06)',
    },
    medium: {
      background: 'rgba(15, 20, 30, 0.45)',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
    },
    strong: {
      background: 'rgba(10, 15, 25, 0.6)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.03) inset',
    },
    intense: {
      background: 'rgba(8, 12, 20, 0.72)',
      backdropFilter: 'blur(24px)',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05) inset',
    },
  },

  animation: {
    durations: {
      micro: 80,
      fast: 150,
      normal: 250,
      slow: 350,
      page: 500,
      camera: 1500,
    },
    easings: {
      default: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      enter: 'cubic-bezier(0.19, 1, 0.22, 1)',
      exit: 'cubic-bezier(0.4, 0, 0.6, 1)',
      spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      smooth: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    },
  },
} as const;

export type DesignTokens = typeof designTokens;

export function getToken<T extends keyof DesignTokens>(category: T, path: string): DesignTokens[T] | undefined {
  const keys = path.split('.');
  let current: unknown = designTokens[category];
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }
  return current as DesignTokens[T];
}

export function cssVar(name: string): string {
  return `var(--${name})`;
}

export function generateCSSVariables(): string {
  const lines: string[] = [];

  function flatten(obj: Record<string, unknown>, prefix = ''): void {
    for (const [key, value] of Object.entries(obj)) {
      const newPrefix = prefix ? `${prefix}-${key}` : key;
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        flatten(value as Record<string, unknown>, newPrefix);
      } else {
        lines.push(`  --${newPrefix}: ${value};`);
      }
    }
  }

  flatten(designTokens as Record<string, unknown>);
  return ':root {\n' + lines.join('\n') + '\n}';
}