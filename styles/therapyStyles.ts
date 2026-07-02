import { Dimensions, StyleSheet } from 'react-native';

const { width, height } = Dimensions.get('window');

// Keep original TherapyColors for backward compatibility
export const TherapyColors = {
  // Primary therapeutic colors
  primary: '#6B73FF',
  primaryLight: '#9BB5FF',
  primaryDark: '#4A5A8A',
  
  // Calming and healing colors
  healing: '#7ED321',
  healingLight: '#A8E65A',
  
  // Warm and supportive colors
  support: '#FFA726',
  supportLight: '#FFD95B',
  
  // Soft backgrounds
  background: '#F8FAFF',
  cardBackground: '#FFFFFF',
  
  // Text colors
  text: '#2C3E50',
  textSecondary: '#7F8C8D',
  textLight: '#BDC3C7',
  
  // Emotion colors
  emotions: {
    joy: '#FFD93D',
    sadness: '#4A90E2',
    anger: '#FF6B6B',
    fear: '#9B59B6',
    surprise: '#F39C12',
    love: '#E91E63',
    calm: '#26C6DA',
    anxious: '#FF7043',
  },
  
  // Gradient colors
  gradients: {
    calm: ['#667eea', '#764ba2'],
    healing: ['#7ED321', '#A8E65A'],
    sunset: ['#FF9500', '#FF5722'],
    ocean: ['#00BCD4', '#009688'],
    flower: ['#E91E63', '#9C27B0'],
  },
  
  // Component specific colors
  message: {
    userBubble: '#6B73FF',
    aiBubble: '#F5F7FA',
    userText: '#FFFFFF',
    aiText: '#2C3E50',
  },
  
  // Interactive element colors
  interactive: {
    breathing: '#7ED321',
    drawing: '#FF6B6B',
    journaling: '#9B59B6',
    emotion: '#FFA726',
  },
};

export const TherapyShadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6.27,
    elevation: 10,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 10.32,
    elevation: 16,
  },
};

export const TherapySpacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const TherapyBorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  circle: 50,
};

export const therapyStyles = StyleSheet.create({
  // Container styles
  container: {
    flex: 1,
    backgroundColor: TherapyColors.background,
  },
  
  safeArea: {
    flex: 1,
    backgroundColor: TherapyColors.background,
  },
  
  // Card styles
  card: {
    backgroundColor: TherapyColors.cardBackground,
    borderRadius: TherapyBorderRadius.lg,
    padding: TherapySpacing.md,
    marginVertical: TherapySpacing.sm,
    marginHorizontal: TherapySpacing.md,
    ...TherapyShadows.small,
  },
  
  cardLarge: {
    backgroundColor: TherapyColors.cardBackground,
    borderRadius: TherapyBorderRadius.xl,
    padding: TherapySpacing.lg,
    margin: TherapySpacing.md,
    ...TherapyShadows.medium,
  },
  
  // Text styles
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: TherapyColors.text,
    marginBottom: TherapySpacing.sm,
  },
  
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: TherapyColors.text,
    marginBottom: TherapySpacing.sm,
  },
  
  body: {
    fontSize: 16,
    fontWeight: '400',
    color: TherapyColors.text,
    lineHeight: 24,
  },
  
  bodySecondary: {
    fontSize: 14,
    fontWeight: '400',
    color: TherapyColors.textSecondary,
    lineHeight: 20,
  },
  
  caption: {
    fontSize: 12,
    fontWeight: '400',
    color: TherapyColors.textLight,
    lineHeight: 16,
  },
  
  // Button styles
  primaryButton: {
    backgroundColor: TherapyColors.primary,
    borderRadius: TherapyBorderRadius.lg,
    paddingVertical: TherapySpacing.md,
    paddingHorizontal: TherapySpacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...TherapyShadows.small,
  },
  
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: TherapyColors.primary,
    borderRadius: TherapyBorderRadius.lg,
    paddingVertical: TherapySpacing.md,
    paddingHorizontal: TherapySpacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  secondaryButtonText: {
    color: TherapyColors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Chat specific styles
  chatContainer: {
    flex: 1,
    backgroundColor: TherapyColors.background,
  },
  
  chatMessagesContainer: {
    flex: 1,
    paddingVertical: TherapySpacing.sm,
  },
  
  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: TherapySpacing.md,
    paddingVertical: TherapySpacing.sm,
    paddingBottom: TherapySpacing.xl, // Extra padding at bottom
    backgroundColor: TherapyColors.cardBackground,
    borderTopWidth: 1,
    borderTopColor: '#E1E8ED',
    marginBottom: 80, // Space for tab bar
  },
  
  chatInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E1E8ED',
    borderRadius: TherapyBorderRadius.lg,
    paddingHorizontal: TherapySpacing.md,
    paddingVertical: TherapySpacing.sm,
    marginRight: TherapySpacing.sm,
    fontSize: 16,
    maxHeight: 100,
    backgroundColor: TherapyColors.background,
  },
  
  chatSendButton: {
    backgroundColor: TherapyColors.primary,
    borderRadius: TherapyBorderRadius.circle,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    ...TherapyShadows.small,
  },
  
  // Message bubble styles
  messageBubble: {
    maxWidth: width * 0.8,
    borderRadius: TherapyBorderRadius.lg,
    padding: TherapySpacing.md,
    marginVertical: TherapySpacing.xs,
    marginHorizontal: TherapySpacing.md,
  },
  
  userMessageBubble: {
    backgroundColor: TherapyColors.message.userBubble,
    alignSelf: 'flex-end',
    borderBottomRightRadius: TherapyBorderRadius.sm,
  },
  
  aiMessageBubble: {
    backgroundColor: TherapyColors.message.aiBubble,
    alignSelf: 'flex-start',
    borderBottomLeftRadius: TherapyBorderRadius.sm,
    ...TherapyShadows.small,
  },
  
  userMessageText: {
    color: TherapyColors.message.userText,
    fontSize: 16,
    lineHeight: 22,
  },
  
  aiMessageText: {
    color: TherapyColors.message.aiText,
    fontSize: 16,
    lineHeight: 22,
  },
  
  // Interactive component styles
  interactiveContainer: {
    backgroundColor: TherapyColors.cardBackground,
    borderRadius: TherapyBorderRadius.lg,
    padding: TherapySpacing.lg,
    margin: TherapySpacing.md,
    ...TherapyShadows.medium,
  },
  
  // Breathing exercise styles
  breathingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: TherapySpacing.xl,
  },
  
  breathingCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: TherapyColors.interactive.breathing,
    alignItems: 'center',
    justifyContent: 'center',
    ...TherapyShadows.large,
  },
  
  breathingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  
  breathingInstructions: {
    fontSize: 16,
    color: TherapyColors.textSecondary,
    textAlign: 'center',
    marginTop: TherapySpacing.md,
    marginBottom: TherapySpacing.lg,
  },
  
  // Drawing canvas styles
  canvasContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: TherapyBorderRadius.lg,
    overflow: 'hidden',
    ...TherapyShadows.medium,
  },
  
  canvasHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: TherapySpacing.md,
    backgroundColor: TherapyColors.interactive.drawing,
  },
  
  canvasHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  
  canvasControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: TherapySpacing.sm,
    backgroundColor: '#F8F9FA',
  },
  
  // Journal styles
  journalContainer: {
    backgroundColor: TherapyColors.cardBackground,
    borderRadius: TherapyBorderRadius.lg,
    padding: TherapySpacing.lg,
    ...TherapyShadows.small,
  },
  
  journalPrompt: {
    fontSize: 16,
    fontWeight: '600',
    color: TherapyColors.interactive.journaling,
    marginBottom: TherapySpacing.md,
  },
  
  journalInput: {
    borderWidth: 1,
    borderColor: '#E1E8ED',
    borderRadius: TherapyBorderRadius.md,
    padding: TherapySpacing.md,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    backgroundColor: TherapyColors.background,
  },
  
  // Emotion tracker styles
  emotionTrackerContainer: {
    backgroundColor: TherapyColors.cardBackground,
    borderRadius: TherapyBorderRadius.lg,
    padding: TherapySpacing.lg,
    ...TherapyShadows.medium,
  },
  
  emotionTrackerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: TherapyColors.text,
    textAlign: 'center',
    marginBottom: TherapySpacing.lg,
  },
  
  // Technique badge styles
  techniqueBadge: {
    backgroundColor: TherapyColors.primaryLight,
    borderRadius: TherapyBorderRadius.lg,
    paddingHorizontal: TherapySpacing.sm,
    paddingVertical: TherapySpacing.xs,
    alignSelf: 'flex-start',
    marginBottom: TherapySpacing.sm,
  },
  
  techniqueBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: TherapyColors.primary,
  },
  
  // Loading and status styles
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: TherapySpacing.lg,
  },
  
  loadingText: {
    fontSize: 16,
    color: TherapyColors.textSecondary,
    marginLeft: TherapySpacing.sm,
  },
  
  // Error styles
  errorContainer: {
    backgroundColor: '#FFE6E6',
    borderRadius: TherapyBorderRadius.md,
    padding: TherapySpacing.md,
    margin: TherapySpacing.md,
  },
  
  errorText: {
    color: '#D32F2F',
    fontSize: 14,
    textAlign: 'center',
  },

  // Art Therapy styles
  artTherapyContainer: {
    backgroundColor: TherapyColors.cardBackground,
    borderRadius: TherapyBorderRadius.lg,
    padding: TherapySpacing.lg,
    margin: TherapySpacing.md,
    borderLeftWidth: 4,
    borderLeftColor: TherapyColors.interactive.drawing,
    ...TherapyShadows.small,
  },

  artTherapyInstructions: {
    backgroundColor: TherapyColors.background,
    borderRadius: TherapyBorderRadius.md,
    padding: TherapySpacing.md,
    marginVertical: TherapySpacing.sm,
    borderWidth: 1,
    borderColor: '#E1E8ED',
  },

  // Emergency Alert Styles
  emergencyAlert: {
    backgroundColor: '#FFF5F5',
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#FF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },

  emergencyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  } as any,

  emergencyText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    marginBottom: 12,
    textAlign: 'center',
  },

  emergencyContacts: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563EB',
    marginBottom: 16,
    textAlign: 'center',
  } as any,

  emergencyButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  } as any,

  emergencyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default therapyStyles;