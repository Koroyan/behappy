export const TherapyTheme = {
  // Primary colors - calming and professional
  colors: {
    primary: '#6366F1', // Modern indigo
    primaryLight: '#818CF8',
    primaryDark: '#4F46E5',
    
    secondary: '#10B981', // Healing green
    secondaryLight: '#34D399',
    secondaryDark: '#059669',
    
    accent: '#F59E0B', // Warm amber
    accentLight: '#FBBF24',
    accentDark: '#D97706',
    
    // Therapeutic colors
    calm: '#06B6D4', // Cyan for peace
    warmth: '#EF4444', // Red for energy
    growth: '#22C55E', // Green for progress
    wisdom: '#8B5CF6', // Purple for insight
    
    // Neutrals
    background: '#FAFAFA',
    surface: '#FFFFFF',
    surfaceSecondary: '#F8FAFC',
    border: '#E2E8F0',
    
    // Text
    textPrimary: '#1E293B',
    textSecondary: '#64748B',
    textMuted: '#94A3B8',
    textInverse: '#FFFFFF',
    
    // Status
    success: '#22C55E',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#06B6D4',
    
    // Gradients
    gradients: {
      primary: ['#6366F1', '#8B5CF6'],
      calm: ['#06B6D4', '#0891B2'],
      warmth: ['#F97316', '#EA580C'],
      growth: ['#22C55E', '#16A34A'],
      sunset: ['#F97316', '#EF4444'],
      ocean: ['#06B6D4', '#3B82F6'],
      forest: ['#22C55E', '#059669'],
      lavender: ['#8B5CF6', '#6366F1'],
    }
  },
  
  // Typography
  typography: {
    h1: {
      fontSize: 32,
      fontWeight: '700' as const,
      lineHeight: 40,
    },
    h2: {
      fontSize: 28,
      fontWeight: '600' as const,
      lineHeight: 36,
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
      fontWeight: '400' as const,
      lineHeight: 16,
    },
    button: {
      fontSize: 16,
      fontWeight: '600' as const,
      lineHeight: 24,
    }
  },
  
  // Spacing
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  
  // Border radius
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 28,
    full: 9999,
  },
  
  // Shadows
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 8,
    },
    xl: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.2,
      shadowRadius: 24,
      elevation: 12,
    }
  }
};

export const TherapyEmojis = {
  // Emotions
  calm: '😌',
  happy: '😊',
  peaceful: '🧘‍♀️',
  growth: '🌱',
  heart: '💚',
  brain: '🧠',
  star: '⭐',
  sparkles: '✨',
  
  // Activities
  meditation: '🧘‍♀️',
  art: '🎨',
  writing: '✍️',
  music: '🎵',
  nature: '🌿',
  sun: '☀️',
  moon: '🌙',
  
  // Support
  hug: '🤗',
  support: '🤝',
  care: '💝',
  protection: '🛡️',
  emergency: '🆘',
  
  // Progress
  chart: '📊',
  trophy: '🏆',
  target: '🎯',
  rocket: '🚀',
  diamond: '💎',
};
