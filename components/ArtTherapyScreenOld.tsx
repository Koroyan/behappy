import { useLanguage } from '@/contexts/LanguageContext';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState, useRef } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Easing
} from 'react-native';
import ArtTherapyProgramManager, { ART_THERAPY_SESSIONS, ArtTherapySession } from '../services/artTherapyProgram';
import ParticleSystem from './ParticleSystem';
import { FloatingEarth } from './FloatingEarth';
import { RainbowPath } from './RainbowPath';
import { FloatingHearts } from './FloatingHearts';
import MagicButton from './MagicButton';

const { width } = Dimensions.get('window');

interface SessionCardProps {
  session: ArtTherapySession;
  isUnlocked: boolean;
  isCompleted: boolean;
  onPress: () => void;
  language: string;
}

const SessionCard: React.FC<SessionCardProps> = ({ session, isUnlocked, isCompleted, onPress, language }) => {
  const lang = language as 'en' | 'ka' | 'ru' | 'hy';
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isUnlocked) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 2000,
            easing: Easing.bezier(0.4, 0, 0.6, 1),
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 2000,
            easing: Easing.bezier(0.4, 0, 0.6, 1),
            useNativeDriver: false,
          }),
        ])
      ).start();
    }
  }, [isUnlocked, glowAnim]);

  const handlePress = () => {
    if (isUnlocked) {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
      
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onPress();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  };

  const glowColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.3)'],
  });

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={handlePress}
        disabled={!isUnlocked}
        style={[styles.sessionCard, !isUnlocked && styles.sessionCardLocked]}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={
            isUnlocked 
              ? isCompleted
                ? ['#10B981', '#059669', '#047857']
                : [session.color + 'FF', session.color + 'CC', session.color + '88']
              : ['#374151', '#4B5563', '#6B7280']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.sessionGradient}
        >
          <Animated.View style={[styles.glowOverlay, { backgroundColor: glowColor }]} />
          
          <View style={styles.sessionHeader}>
            <View style={[
              styles.iconContainer, 
              { 
                backgroundColor: isUnlocked ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                borderWidth: 2,
                borderColor: isUnlocked ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.2)',
              }
            ]}>
              <Text style={[styles.iconText, { opacity: isUnlocked ? 1 : 0.5 }]}>{session.icon}</Text>
            </View>

            <View style={styles.sessionInfo}>
              <Text style={[styles.sessionNumber, !isUnlocked && styles.textLocked]}>
                {isCompleted ? '✨ ' : ''}Session {session.id}
              </Text>
              <Text style={[styles.sessionTitle, !isUnlocked && styles.textLocked]}>
                {session.title[lang]}
              </Text>
            </View>

            {!isUnlocked && (
              <View style={styles.lockIcon}>
                <Text style={styles.lockEmoji}>🔒</Text>
              </View>
            )}
            {isCompleted && (
              <View style={styles.completedIcon}>
                <Text style={styles.completedEmoji}>🏆</Text>
              </View>
            )}
          </View>

          <View style={styles.sessionBody}>
            <Text style={[styles.sessionTheme, !isUnlocked && styles.textLocked]}>
              {session.theme[lang]}
            </Text>
            <Text style={[styles.sessionDescription, !isUnlocked && styles.textLocked]} numberOfLines={2}>
              {session.description[lang]}
            </Text>

            <View style={styles.sessionMeta}>
              <View style={styles.metaItem}>
                <Text style={styles.metaIcon}>⏱️</Text>
                <Text style={[styles.metaText, !isUnlocked && styles.textLocked]}>
                  {session.estimatedDuration} min
                </Text>
              </View>
              {isCompleted && (
                <View style={styles.completedBadge}>
                  <Text style={styles.completedText}>Completed</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.cardShine} />
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function ArtTherapyScreen() {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [unlockedSessions, setUnlockedSessions] = useState<Set<number>>(new Set([1]));
  const [completedSessions, setCompletedSessions] = useState<Set<number>>(new Set());
  const router = useRouter();

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const sparkleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }),
    ]).start();

    // Sparkle animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(sparkleAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(sparkleAnim, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [fadeAnim, slideAnim, sparkleAnim]);

  useEffect(() => {
    // Animate progress bar
    Animated.timing(progressAnim, {
      toValue: completionPercentage / 100,
      duration: 1500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [completionPercentage, progressAnim]);

  useEffect(() => {
    loadProgress();
  }, []);

  // Reload progress whenever the screen gains focus
  useFocusEffect(
    React.useCallback(() => {
      loadProgress();
      return () => {};
    }, [])
  );

  const loadProgress = async () => {
    try {
      setLoading(true);
      setError(null);

      // Simplified loading with shorter timeout
      const [percentage, progress] = await Promise.all([
        Promise.race([
          ArtTherapyProgramManager.getCompletionPercentage(),
          new Promise<number>((_, reject) => 
            setTimeout(() => reject(new Error('Timeout loading completion')), 3000)
          )
        ]),
        Promise.race([
          ArtTherapyProgramManager.getProgress(),
          new Promise<Map<number, any>>((_, reject) => 
            setTimeout(() => reject(new Error('Timeout loading progress')), 3000)
          )
        ])
      ]);

      setCompletionPercentage(percentage);

      // Check which sessions are unlocked and completed
      const unlocked = new Set<number>([1]); // Always unlock first session
      const completed = new Set<number>();

      // Process sessions with timeout for each
      for (const session of ART_THERAPY_SESSIONS) {
        try {
          // Skip checking unlock status for session 1 (always unlocked)
          if (session.id > 1) {
            const isUnlocked = await Promise.race([
              ArtTherapyProgramManager.isSessionUnlocked(session.id),
              new Promise<boolean>((_, reject) => 
                setTimeout(() => reject(new Error('Timeout')), 1000)
              )
            ]);
            if (isUnlocked) {
              unlocked.add(session.id);
            }
          }

          const sessionProgress = progress.get(session.id);
          if (sessionProgress?.completed) {
            completed.add(session.id);
          }
        } catch (sessionError) {
          console.warn(`Failed to load session ${session.id}:`, sessionError);
          // Continue with other sessions
        }
      }

      setUnlockedSessions(unlocked);
      setCompletedSessions(completed);
    } catch (error) {
      console.error('Failed to load progress:', error);
      setError('Failed to load art therapy progress. Please try again.');
      // Set default values in case of error
      setCompletionPercentage(0);
      setUnlockedSessions(new Set([1])); // At least first session should be unlocked
      setCompletedSessions(new Set());
    } finally {
      setLoading(false);
    }
  };

  const handleSessionPress = (session: ArtTherapySession) => {
    // Navigate to session chat screen using Expo Router
    router.push({
      pathname: '/art-therapy-session',
      params: { sessionId: session.id.toString() }
    });
  };

  const getGreeting = () => {
    const greetings = {
      en: 'Art Therapy Journey',
      ka: 'არტ თერაპიის მოგზაურობა',
      ru: 'Путь арт-терапии',
      hy: 'Արվեստի թերապիայի ճանապարհ'
    };
    return greetings[language as keyof typeof greetings] || greetings.en;
  };

  const getSubtitle = () => {
    const subtitles = {
      en: '15 Sessions of Deep Self-Discovery',
      ka: '15 სესია ღრმა თვითშემეცნების',
      ru: '15 сессий глубокого самопознания',
      hy: '15 նիստ խորը ինքնաճանաչման'
    };
    return subtitles[language as keyof typeof subtitles] || subtitles.en;
  };

  if (loading) {
    return (
      <LinearGradient
        colors={['#667eea', '#764ba2', '#f093fb']}
        style={styles.loadingContainer}
      >
        <Animated.View style={[
          styles.loadingContent,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }
        ]}>
          <View style={styles.loadingIconContainer}>
            <Text style={styles.loadingIcon}>🎨</Text>
            <Animated.View style={[
              styles.sparkle,
              {
                opacity: sparkleAnim,
                transform: [
                  {
                    rotate: sparkleAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg'],
                    }),
                  },
                ],
              }
            ]}>
              <Text style={styles.sparkleText}>✨</Text>
            </Animated.View>
          </View>
          <Text style={styles.loadingTitle}>Art Therapy</Text>
          <Text style={styles.loadingText}>Preparing your creative journey...</Text>
          <ActivityIndicator size="large" color="#ffffff" style={{ marginTop: 20 }} />
        </Animated.View>
      </LinearGradient>
    );
  }

  if (error) {
    return (
      <LinearGradient
        colors={['#fc466b', '#3f5efb']}
        style={styles.errorContainer}
      >
        <Animated.View style={[
          styles.errorContent,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }
        ]}>
          <View style={styles.errorIconContainer}>
            <Text style={styles.errorIcon}>😔</Text>
          </View>
          <Text style={styles.errorTitle}>Oops! Something went wrong</Text>
          <Text style={styles.errorText}>{error}</Text>
          <MagicButton
            title="Try Again"
            emoji="✨"
            onPress={loadProgress}
            colors={['#667eea', '#764ba2']}
            style={{ marginTop: 20 }}
          />
        </Animated.View>
      </LinearGradient>
    );
  }

  return (
    <View style={styles.container}>
      {/* Particle System */}
      <ParticleSystem />
      
      {/* Floating Earth */}
      <FloatingEarth />
      
      {/* Rainbow Path */}
      <RainbowPath />
      
      {/* Floating Hearts */}
      <FloatingHearts />
      
      {/* Animated Background */}
      <LinearGradient
        colors={['#667eea', '#764ba2', '#f093fb']}
        style={styles.backgroundGradient}
      >
        {/* Floating Elements */}
        <Animated.View style={[
          styles.floatingElement,
          styles.floatingElement1,
          {
            opacity: sparkleAnim,
            transform: [
              {
                translateY: sparkleAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -20],
                }),
              },
            ],
          }
        ]}>
          <Text style={styles.floatingEmoji}>🎨</Text>
        </Animated.View>
        
        <Animated.View style={[
          styles.floatingElement,
          styles.floatingElement2,
          {
            opacity: sparkleAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.3, 0.8],
            }),
            transform: [
              {
                translateX: sparkleAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 15],
                }),
              },
            ],
          }
        ]}>
          <Text style={styles.floatingEmoji}>✨</Text>
        </Animated.View>

        <Animated.View style={[
          styles.floatingElement,
          styles.floatingElement3,
          {
            opacity: sparkleAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.5, 1],
            }),
            transform: [
              {
                rotate: sparkleAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '180deg'],
                }),
              },
            ],
          }
        ]}>
          <Text style={styles.floatingEmoji}>🌟</Text>
        </Animated.View>
      </LinearGradient>

      {/* Header with enhanced design */}
      <Animated.View style={[
        styles.header,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }
      ]}>
        <View style={styles.headerContent}>
          <View style={styles.titleContainer}>
            <Text style={styles.headerTitle}>{getGreeting()}</Text>
            <Text style={styles.headerSubtitle}>{getSubtitle()}</Text>
          </View>
          
          {/* Enhanced Progress Container */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBar}>
                <Animated.View 
                  style={[
                    styles.progressFill, 
                    { 
                      width: progressAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      })
                    }
                  ]} 
                />
                <View style={styles.progressShine} />
                {/* Magic Sparkles on Progress */}
                {Array.from({ length: 5 }, (_, i) => (
                  <Animated.View
                    key={i}
                    style={[
                      styles.progressSparkle,
                      {
                        left: `${(i + 1) * 20}%`,
                        opacity: progressAnim.interpolate({
                          inputRange: [0, 0.2 * (i + 1), 1],
                          outputRange: [0, 1, 0.5],
                          extrapolate: 'clamp',
                        }),
                        transform: [{
                          rotate: progressAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0deg', '360deg'],
                          })
                        }]
                      }
                    ]}
                  >
                    <Text style={styles.progressSparkleText}>✨</Text>
                  </Animated.View>
                ))}
              </View>
              <Text style={styles.progressText}>{completionPercentage}% Complete ✨</Text>
            </View>
          </View>

          {/* Enhanced Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{completedSessions.size}</Text>
              <Text style={styles.statLabel}>Completed</Text>
              <Text style={styles.statEmoji}>🏆</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{15 - completedSessions.size}</Text>
              <Text style={styles.statLabel}>Remaining</Text>
              <Text style={styles.statEmoji}>🎯</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{unlockedSessions.size}</Text>
              <Text style={styles.statLabel}>Unlocked</Text>
              <Text style={styles.statEmoji}>🔓</Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* Session List with enhanced scrolling */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.sessionList}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: new Animated.Value(0) } } }],
          { 
            useNativeDriver: false,
            listener: (event: any) => {
              const y = event.nativeEvent.contentOffset.y;
              if (y % 100 < 10) { // Haptic feedback every 100px
                Haptics.selectionAsync();
              }
            }
          }
        )}
        scrollEventThrottle={16}
      >
        {ART_THERAPY_SESSIONS.map((session, index) => (
          <Animated.View
            key={session.id}
            style={{
              opacity: fadeAnim,
              transform: [
                {
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 50],
                    outputRange: [index * 10, 0],
                  }),
                },
              ],
            }}
          >
            <SessionCard
              session={session}
              isUnlocked={unlockedSessions.has(session.id)}
              isCompleted={completedSessions.has(session.id)}
              onPress={() => handleSessionPress(session)}
              language={language}
            />

            {/* Enhanced Connection Line */}
            {index < ART_THERAPY_SESSIONS.length - 1 && (
              <View style={styles.connectionLine}>
                <View
                  style={[
                    styles.connectionDot,
                    unlockedSessions.has(session.id + 1) && styles.connectionDotUnlocked
                  ]}
                />
                <View style={styles.connectionPath} />
              </View>
            )}
          </Animated.View>
        ))}

        {/* Enhanced Completion Message */}
        {completionPercentage === 100 && (
          <Animated.View style={[
            styles.completionCard,
            {
              opacity: fadeAnim,
              transform: [{ scale: fadeAnim }],
            }
          ]}>
            <LinearGradient
              colors={['#10B981', '#059669', '#047857']}
              style={styles.completionGradient}
            >
              <Animated.Text style={[
                styles.completionEmoji,
                {
                  transform: [
                    {
                      rotate: sparkleAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '360deg'],
                      }),
                    },
                  ],
                }
              ]}>🎉</Animated.Text>
              
              <Text style={styles.completionTitle}>Journey Complete!</Text>
              <Text style={styles.completionText}>
                You've completed all 15 art therapy sessions. This is a profound achievement in your healing journey!
              </Text>
              
              <View style={styles.celebrationElements}>
                <Animated.Text style={[
                  styles.celebrationEmoji,
                  {
                    opacity: sparkleAnim,
                    transform: [{ scale: sparkleAnim }],
                  }
                ]}>🌟</Animated.Text>
                
                <Animated.Text style={[
                  styles.celebrationEmoji,
                  {
                    opacity: sparkleAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.5, 1],
                    }),
                    transform: [
                      {
                        rotate: sparkleAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '-360deg'],
                        }),
                      },
                    ],
                  }
                ]}>✨</Animated.Text>
                
                <Animated.Text style={[
                  styles.celebrationEmoji,
                  {
                    opacity: sparkleAnim,
                    transform: [
                      { scale: sparkleAnim },
                      {
                        rotate: sparkleAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '180deg'],
                        }),
                      },
                    ],
                  }
                ]}>🎊</Animated.Text>
              </View>
              
              <MagicButton
                title="Celebrate Achievement"
                emoji="🏆"
                onPress={() => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }}
                colors={['#FFFFFF', '#F0F9FF']}
                textStyle={{ color: '#047857' }}
                style={{ marginTop: 20 }}
              />
            </LinearGradient>
          </Animated.View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB'
  },
  
  // Background & Floating Elements
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
  },
  floatingElement: {
    position: 'absolute',
  },
  floatingElement1: {
    top: 80,
    right: 40,
  },
  floatingElement2: {
    top: 150,
    left: 30,
  },
  floatingElement3: {
    top: 120,
    right: 80,
  },
  floatingEmoji: {
    fontSize: 24,
    opacity: 0.7,
  },

  // Loading Styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingIconContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  loadingIcon: {
    fontSize: 64,
  },
  sparkle: {
    position: 'absolute',
    top: -10,
    right: -10,
  },
  sparkleText: {
    fontSize: 24,
  },
  loadingTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 24,
  },

  // Error Styles
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContent: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  errorIcon: {
    fontSize: 40,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  retryButton: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  retryGradient: {
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Header Styles
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 24,
    paddingHorizontal: 20,
    position: 'relative',
    zIndex: 1,
  },
  headerContent: {
    alignItems: 'center',
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
    textAlign: 'center',
  },

  // Progress Styles
  progressContainer: {
    marginBottom: 20,
    width: '100%',
  },
  progressBarContainer: {
    alignItems: 'center',
  },
  progressBar: {
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
    width: '100%',
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    position: 'relative',
  },
  progressShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 6,
  },
  progressText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
  },
  progressSparkle: {
    position: 'absolute',
    top: -8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressSparkleText: {
    fontSize: 12,
    color: '#FFD700',
  },

  // Stats Styles
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  statCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    minWidth: 80,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.8,
    marginTop: 4,
  },
  statEmoji: {
    fontSize: 16,
    marginTop: 4,
  },

  // Session Card Styles
  scrollView: {
    flex: 1,
  },
  sessionList: {
    padding: 20,
  },
  sessionCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      }
    })
  },
  sessionCardLocked: {
    opacity: 0.7,
  },
  sessionGradient: {
    padding: 20,
    position: 'relative',
  },
  glowOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
  },
  cardShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '30%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
    zIndex: 1,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 28,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionNumber: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 4,
    opacity: 0.9,
  },
  sessionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  textLocked: {
    color: 'rgba(255, 255, 255, 0.6)',
  },
  lockIcon: {
    marginLeft: 8,
  },
  lockEmoji: {
    fontSize: 20,
  },
  completedIcon: {
    marginLeft: 8,
  },
  completedEmoji: {
    fontSize: 24,
  },
  sessionBody: {
    marginTop: 8,
    position: 'relative',
    zIndex: 1,
  },
  sessionTheme: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 8,
    opacity: 0.9,
  },
  sessionDescription: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 20,
    marginBottom: 12,
    opacity: 0.8,
  },
  sessionMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
    opacity: 0.8,
  },
  completedBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  completedText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // Connection Line
  connectionLine: {
    alignItems: 'center',
    marginVertical: 8,
    position: 'relative',
  },
  connectionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E5E7EB',
  },
  connectionDotUnlocked: {
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  connectionPath: {
    position: 'absolute',
    width: 2,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    top: 12,
  },

  // Completion Card
  completionCard: {
    marginTop: 24,
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      }
    })
  },
  completionGradient: {
    padding: 32,
    alignItems: 'center',
    position: 'relative',
  },
  completionEmoji: {
    fontSize: 72,
    marginBottom: 16,
  },
  completionTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  completionText: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.9,
    marginBottom: 20,
  },
  celebrationElements: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 16,
  },
  celebrationEmoji: {
    fontSize: 32,
  },

  // Deprecated styles for backward compatibility
  statItem: {
    alignItems: 'center'
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)'
  },
  languageSelector: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    right: 20,
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 4,
  },
  languageButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16
  },
  languageButtonActive: {
    backgroundColor: '#6366F1'
  },
  languageText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B'
  },
  languageTextActive: {
    color: '#FFFFFF'
  }
});
