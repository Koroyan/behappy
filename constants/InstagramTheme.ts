export interface Theme {
  colors: {
    primary: string;
    background: string;
    surface: string;
    card: string;
    text: string;
    textSecondary: string;
    textMuted: string;
    border: string;
    borderLight: string;
    accent: string;
    success: string;
    warning: string;
    error: string;
    tabBar: string;
    tabBarActive: string;
    tabBarInactive: string;
    header: string;
    shadow: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
    full: number;
  };
  typography: {
    h1: { fontSize: number; fontWeight: "normal" | "bold" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900" };
    h2: { fontSize: number; fontWeight: "normal" | "bold" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900" };
    h3: { fontSize: number; fontWeight: "normal" | "bold" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900" };
    body: { fontSize: number; fontWeight: "normal" | "bold" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900" };
    caption: { fontSize: number; fontWeight: "normal" | "bold" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900" };
    button: { fontSize: number; fontWeight: "normal" | "bold" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900" };
  };
  shadows: {
    sm: any;
    md: any;
    lg: any;
  };
}

export const lightTheme: Theme = {
  colors: {
    primary: '#000000',
    background: '#ffffff',
    surface: '#ffffff',
    card: '#ffffff',
    text: '#000000',
    textSecondary: '#8e8e93',
    textMuted: '#c7c7cc',
    border: '#dbdbdb',
    borderLight: '#f0f0f0',
    accent: '#0095f6',
    success: '#42b883',
    warning: '#f39c12',
    error: '#e74c3c',
    tabBar: '#ffffff',
    tabBarActive: '#000000',
    tabBarInactive: '#8e8e93',
    header: '#ffffff',
    shadow: '#000000',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    full: 9999,
  },
  typography: {
    h1: { fontSize: 28, fontWeight: "bold" },
    h2: { fontSize: 22, fontWeight: "bold" },
    h3: { fontSize: 18, fontWeight: "600" },
    body: { fontSize: 16, fontWeight: "normal" },
    caption: { fontSize: 12, fontWeight: "normal" },
    button: { fontSize: 16, fontWeight: "600" },
  },
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
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 8,
    },
  },
};

export const darkTheme: Theme = {
  ...lightTheme,
  colors: {
    primary: '#ffffff',
    background: '#000000',
    surface: '#1a1a1a',
    card: '#262626',
    text: '#ffffff',
    textSecondary: '#a8a8a8',
    textMuted: '#737373',
    border: '#363636',
    borderLight: '#262626',
    accent: '#0095f6',
    success: '#42b883',
    warning: '#f39c12',
    error: '#e74c3c',
    tabBar: '#000000',
    tabBarActive: '#ffffff',
    tabBarInactive: '#a8a8a8',
    header: '#000000',
    shadow: '#ffffff',
  },
  typography: {
    h1: { fontSize: 28, fontWeight: "bold" },
    h2: { fontSize: 22, fontWeight: "bold" },
    h3: { fontSize: 18, fontWeight: "600" },
    body: { fontSize: 16, fontWeight: "normal" },
    caption: { fontSize: 12, fontWeight: "normal" },
    button: { fontSize: 16, fontWeight: "600" },
  },
};

export const useInstagramTheme = (isDark: boolean): Theme => {
  return isDark ? darkTheme : lightTheme;
};
