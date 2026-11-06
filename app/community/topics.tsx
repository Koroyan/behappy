import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { AppLanguage, LANGUAGE_NAMES, SUPPORTED_LANGUAGES, useLanguage } from '@/contexts/LanguageContext';
import { AppText, Chip, Screen, Skeleton, space } from '@/design';
import { AccountGate } from '@/features/account/AccountParts';
import { RoomCard } from '@/features/community/RoomCard';
import { useT } from '@/i18n';
import { useIdentity } from '@/lib/api/account';
import { listRooms, Room } from '@/lib/api/community';

/** Every topic room in one language; switch languages deliberately. */
export default function ExploreTopics() {
  const router = useRouter();
  const { t } = useT();
  const { language } = useLanguage();
  const identity = useIdentity();
  const [lang, setLang] = useState<AppLanguage>(language);
  const [rooms, setRooms] = useState<Room[] | null>(null);

  const load = useCallback(async (l: AppLanguage) => {
    setRooms(null);
    try {
      setRooms(await listRooms(l));
    } catch {
      setRooms([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (identity.registered) load(lang);
    }, [identity.registered, lang, load])
  );

  return (
    <Screen back title={t('shell.exploreTopics')} subtitle={t('community.languageNote')} testID="screen-community-topics">
      {!identity.registered ? (
        <AccountGate returnTo="/community/topics" />
      ) : (
        <View style={{ gap: space[5] }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
            {SUPPORTED_LANGUAGES.map((l) => (
              <Chip key={l} label={LANGUAGE_NAMES[l]} selected={l === lang} onPress={() => setLang(l)} testID={`topics-lang-${l}`} />
            ))}
          </ScrollView>
          <AppText variant="title2">{t('community.roomsIn', { language: LANGUAGE_NAMES[lang] })}</AppText>
          {rooms === null ? (
            <View style={{ gap: 12 }}>
              <Skeleton height={96} radius={22} />
              <Skeleton height={96} radius={22} />
              <Skeleton height={96} radius={22} />
            </View>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {rooms.map((r) => (
                <RoomCard key={r.id} room={r} onPress={() => router.push(`/community/${encodeURIComponent(r.id)}` as any)} />
              ))}
            </View>
          )}
        </View>
      )}
    </Screen>
  );
}
