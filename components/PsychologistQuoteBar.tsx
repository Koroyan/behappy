import { AppLanguage, useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { PSYCHOLOGIST_QUOTES } from '@/constants/psychologistQuotes';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const pick = (map: Record<string, string>, lang: AppLanguage) => map[lang] ?? map.en;

const pickRandomIndex = (excludeIndex: number | null, length: number): number => {
  if (length <= 1) return 0;
  let next = Math.floor(Math.random() * length);
  while (next === excludeIndex) next = Math.floor(Math.random() * length);
  return next;
};

export default function PsychologistQuoteBar() {
  const { language } = useLanguage();
  const { isDark, theme } = useTheme();
  const [index, setIndex] = useState<number | null>(null);
  const lastIndex = useRef<number | null>(null);

  const shuffle = useCallback(() => {
    const next = pickRandomIndex(lastIndex.current, PSYCHOLOGIST_QUOTES.length);
    lastIndex.current = next;
    setIndex(next);
  }, []);

  useFocusEffect(
    useCallback(() => {
      shuffle();
    }, [shuffle])
  );

  if (index === null) return null;
  const quote = PSYCHOLOGIST_QUOTES[index];

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        style={[styles.card, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFFFFF', borderColor: theme.colors.border }]}
        onPress={shuffle}
        activeOpacity={0.8}
      >
        <Ionicons name="chatbubble-ellipses-outline" size={16} color={isDark ? '#A78BFA' : '#6D28D9'} />
        <View style={styles.textWrap}>
          <Text style={[styles.quoteText, { color: theme.colors.text }]} numberOfLines={2}>
            &ldquo;{pick(quote.text, language)}&rdquo;
          </Text>
          <Text style={[styles.authorText, { color: theme.colors.textMuted }]}>— {quote.author}</Text>
        </View>
        <Ionicons name="shuffle" size={16} color={isDark ? '#9CA3AF' : '#6B7280'} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    marginTop: 10,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  textWrap: {
    flex: 1,
  },
  quoteText: {
    fontSize: 12,
    lineHeight: 17,
    fontStyle: 'italic',
  },
  authorText: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 3,
  },
});
