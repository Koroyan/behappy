import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { getDailyMotivation } from '@/services/motivationalMessageService';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

export default function DailyMotivationCard() {
  const { language } = useLanguage();
  const { isDark } = useTheme();
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getDailyMotivation(language)
      .then((message) => {
        if (mounted) setText(message);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [language]);

  if (!loading && !text) return null;

  return (
    <View style={styles.wrapper}>
      <LinearGradient
        colors={isDark ? ['#1E1B4B', '#312E81'] : ['#EEF2FF', '#E0E7FF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={[styles.iconWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(99,102,241,0.14)' }]}>
          <Ionicons name="sparkles" size={16} color={isDark ? '#C4B5FD' : '#6D28D9'} />
        </View>
        <View style={styles.textWrap}>
          {loading ? (
            <ActivityIndicator size="small" color={isDark ? '#C4B5FD' : '#6D28D9'} />
          ) : (
            <Text style={[styles.text, { color: isDark ? '#EDE9FE' : '#312E81' }]}>{text}</Text>
          )}
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    marginTop: 12,
  },
  card: {
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textWrap: {
    flex: 1,
  },
  text: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
});
