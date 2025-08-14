export const ModernTheme = {
  // Revolutionary therapy colors with AI-inspired aesthetics
  colors: {
    // Primary AI-inspired gradients
    primaryGradient: ['#667eea', '#764ba2', '#6B73FF'],
    secondaryGradient: ['#f093fb', '#f5576c', '#4facfe'],
    tertiaryGradient: ['#43e97b', '#38f9d7', '#b2fefa'],
    
    // Holographic effects
    holographic: ['#ff9a9e', '#fecfef', '#fecfef', '#f093fb'],
    aurora: ['#667eea', '#764ba2', '#f093fb', '#f5576c'],
    cosmic: ['#2b5876', '#4e4376', '#667eea', '#764ba2'],
    
    // Therapeutic mood colors
    calmBlue: ['#74b9ff', '#0984e3', '#6c5ce7'],
    energyOrange: ['#fd79a8', '#fdcb6e', '#e84393'],
    growthGreen: ['#00b894', '#55a3ff', '#74b9ff'],
    wisdomPurple: ['#a29bfe', '#6c5ce7', '#fd79a8'],
    
    // Glassmorphism
    glass: {
      primary: 'rgba(255, 255, 255, 0.25)',
      secondary: 'rgba(255, 255, 255, 0.18)',
      dark: 'rgba(0, 0, 0, 0.2)',
    },
    
    // Neumorphism
    neumorph: {
      light: '#f0f0f3',
      shadow1: '#d1d9e6',
      shadow2: '#ffffff',
    },
    
    // Status with glow effects
    success: '#00b894',
    warning: '#fdcb6e',
    error: '#fd79a8',
    info: '#74b9ff',
    
    // Text with modern contrast
    textPrimary: '#2d3436',
    textSecondary: '#636e72',
    textMuted: '#b2bec3',
    textInverse: '#ffffff',
    textAccent: '#6c5ce7',
    text: '#2d3436', // Add primary text color
    secondaryText: '#636e72', // Add secondary text color
    
    // Background layers
    background: ['#f8f9fa', '#e9ecef'],
    surface: 'rgba(255, 255, 255, 0.9)',
    surfaceElevated: 'rgba(255, 255, 255, 0.95)',
    
    // Border and dividers
    border: 'rgba(108, 92, 231, 0.1)',
    divider: 'rgba(108, 92, 231, 0.05)',
  },
  
  // Advanced typography system
  typography: {
    display: {
      fontSize: 48,
      fontWeight: '800' as const,
      lineHeight: 56,
      letterSpacing: -1,
    },
    h1: {
      fontSize: 36,
      fontWeight: '700' as const,
      lineHeight: 44,
      letterSpacing: -0.5,
    },
    h2: {
      fontSize: 30,
      fontWeight: '600' as const,
      lineHeight: 38,
      letterSpacing: -0.25,
    },
    h3: {
      fontSize: 24,
      fontWeight: '600' as const,
      lineHeight: 32,
    },
    h4: {
      fontSize: 20,
      fontWeight: '600' as const,
      lineHeight: 28,
    },
    body1: {
      fontSize: 16,
      fontWeight: '400' as const,
      lineHeight: 24,
    },
    body2: {
      fontSize: 14,
      fontWeight: '400' as const,
      lineHeight: 20,
    },
    caption: {
      fontSize: 12,
      fontWeight: '500' as const,
      lineHeight: 16,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.5,
    },
    button: {
      fontSize: 16,
      fontWeight: '600' as const,
      lineHeight: 24,
      letterSpacing: 0.25,
    }
  },
  
  // Advanced spacing system
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    xxxl: 64,
  },
  
  // Modern border radius
  radius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 28,
    xxxl: 40,
    full: 9999,
  },
  
  // Advanced shadows with multiple layers
  shadows: {
    sm: {
      shadowColor: '#6c5ce7',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    md: {
      shadowColor: '#6c5ce7',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
    lg: {
      shadowColor: '#6c5ce7',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 8,
    },
    xl: {
      shadowColor: '#6c5ce7',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.25,
      shadowRadius: 24,
      elevation: 12,
    },
    glow: {
      shadowColor: '#667eea',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 20,
      elevation: 16,
    }
  },
  
  // Animation timings
  animation: {
    fast: 200,
    normal: 300,
    slow: 500,
    bounce: 800,
  }
};

// Modern therapy emojis with animations context
export const ModernEmojis = {
  // Core emotions
  peaceful: '🧘‍♀️',
  joyful: '😊',
  energetic: '⚡',
  calm: '😌',
  confident: '💪',
  grateful: '🙏',
  
  // AI & Technology
  ai: '🤖',
  brain: '🧠',
  sparkles: '✨',
  rocket: '🚀',
  diamond: '💎',
  star: '⭐',
  
  // Therapy & Wellness
  heart: '💚',
  hug: '🤗',
  support: '🤝',
  protection: '🛡️',
  growth: '🌱',
  bloom: '🌸',
  
  // Activities
  meditation: '🧘‍♀️',
  art: '🎨',
  music: '🎵',
  writing: '✍️',
  nature: '🌿',
  
  // Progress & Achievement
  trophy: '🏆',
  target: '🎯',
  chart: '📊',
  fire: '🔥',
  
  // Time & Mood
  sun: '☀️',
  moon: '🌙',
  rainbow: '🌈',
  
  // Emergency
  emergency: '🆘',
  phone: '📞',
};

// Modern UI patterns
export const ModernPatterns = {
  gradientAngles: {
    topToBottom: { x: 0, y: 0 },
    bottomToTop: { x: 0, y: 1 },
    leftToRight: { x: 0, y: 0 },
    rightToLeft: { x: 1, y: 0 },
    diagonal: { x: 0, y: 0 },
    radial: { x: 0.5, y: 0.5 },
  },
  
  blurStrength: {
    light: 10,
    medium: 20,
    strong: 30,
  },
  
  opacity: {
    ghost: 0.05,
    subtle: 0.1,
    light: 0.2,
    medium: 0.5,
    strong: 0.8,
    solid: 1,
  }
};
