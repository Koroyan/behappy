export const AppTheme = {
  colors: {
    // Main colors
    primary: '#007AFF',
    secondary: '#4ECDC4',
    success: '#34C759',
    warning: '#FF9500',
    error: '#FF3B30',
    
    // Background colors
    background: '#ffffff',
    backgroundSecondary: '#f8f8f8',
    backgroundTertiary: '#f0f0f0',
    
    // Text colors
    text: '#000000',
    textSecondary: '#8e8e93',
    textTertiary: '#c7c7cc',
    textInverse: '#ffffff',
    
    // Border colors
    border: '#e0e0e0',
    borderLight: '#f0f0f0',
    
    // Tool colors
    toolRed: '#FF6B6B',
    toolTeal: '#4ECDC4',
    toolBlue: '#45B7D1',
    toolGreen: '#96CEB4',
    toolPurple: '#B19CD9',
    toolOrange: '#FFB347',
  },
  
  typography: {
    // Headers
    h1: {
      fontSize: 28,
      fontWeight: 'bold' as const,
      lineHeight: 34,
    },
    h2: {
      fontSize: 24,
      fontWeight: 'bold' as const,
      lineHeight: 30,
    },
    h3: {
      fontSize: 20,
      fontWeight: '600' as const,
      lineHeight: 26,
    },
    h4: {
      fontSize: 18,
      fontWeight: '600' as const,
      lineHeight: 24,
    },
    
    // Body text
    body: {
      fontSize: 16,
      fontWeight: '400' as const,
      lineHeight: 22,
    },
    bodySmall: {
      fontSize: 14,
      fontWeight: '400' as const,
      lineHeight: 20,
    },
    caption: {
      fontSize: 12,
      fontWeight: '400' as const,
      lineHeight: 16,
    },
    
    // Button text
    button: {
      fontSize: 16,
      fontWeight: '600' as const,
      lineHeight: 22,
    },
    buttonSmall: {
      fontSize: 14,
      fontWeight: '600' as const,
      lineHeight: 20,
    },
  },
  
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    xxl: 20,
    full: 999,
  },
  
  shadows: {
    small: {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 4,
    },
    large: {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 8,
    },
  },
};

export const InstagramIcons = {
  // Navigation
  home: 'home',
  tools: 'th-large',
  chat: 'comment',
  profile: 'user-circle',
  
  // Tools
  artTherapy: 'paint-brush',
  moodCards: 'clone',
  courses: 'graduation-cap',
  assessments: 'tasks',
  
  // General
  settings: 'cog',
  notifications: 'bell',
  help: 'question-circle',
  info: 'info-circle',
  privacy: 'shield-alt',
  moon: 'moon',
  edit: 'edit',
  
  // Actions
  send: 'paper-plane',
  chevronRight: 'chevron-right',
  ellipsis: 'ellipsis-v',
  
  // Mood & Emotions
  smile: 'smile',
  chart: 'chart-line',
  heart: 'heart',
  brain: 'brain',
  
  // AI & Tech
  robot: 'robot',
  lightbulb: 'lightbulb',
};
