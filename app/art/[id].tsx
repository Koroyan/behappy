import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { View } from 'react-native';

import { AppText, Badge, Banner, Button, Card, Chip, Icon, Screen, Skeleton, space } from '@/design';
import { MaterialsCard } from '@/features/art/Materials';
import { loadProgram, needsAccess, ProgramState, sessionStatus } from '@/features/art/program';
import { useT } from '@/i18n';
import { useAccount } from '@/lib/api/account';

// Modules that work with childhood and painful memories get a gentle note.
const SENSITIVE_MODULES = new Set([2, 6]);

export default function ArtSessionDetail() {
  const { id: raw } = useLocalSearchParams<{ id: string }>();
  const id = Number(raw);
  const router = useRouter();
  const { t, tp, language } = useT();
  const { entitlements } = useAccount();
  const [state, setState] = useState<ProgramState | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadProgram(language).then(setState).catch(() => setState(null));
    }, [language])
  );

  const session = state?.sessions.find((s) => s.id === id);
  const status = state ? sessionStatus(state, id) : null;
  const blockedByAccess = needsAccess(id, entitlements.artProgram.active);

  const cta = () => {
    if (!session || !status) return null;
    if (status === 'locked') return <Banner tone="info" icon="lock-closed-outline" body={t('art.status.locked')} />;
    if (blockedByAccess)
      return (
        <Card tone="peach" padding={18}>
          <AppText variant="bodyStrong">{t('art.status.needsAccess')}</AppText>
          <AppText variant="small" color="textSecondary" style={{ marginTop: 4 }}>
            {t('art.access.freeFirst')}
          </AppText>
          <Button label={t('art.access.cta')} onPress={() => router.push('/pricing')} style={{ marginTop: space[3] }} />
        </Card>
      );
    const label = status === 'completed' ? t('art.session.review') : status === 'inProgress' ? t('art.session.continue') : t('art.session.start');
    return <Button label={label} icon={status === 'completed' ? 'reader-outline' : 'play'} size="lg" onPress={() => router.push(`/art/session?sessionId=${id}`)} fullWidth testID="art-start" />;
  };

  return (
    <Screen
      back
      eyebrow={session ? `${t('art.moduleLabel', { number: session.module })} · ${t(`art.modules.${session.module}`)}` : undefined}
      title={session ? `${t('art.session.label', { number: id })}: ${session.title}` : undefined}
      width="reading"
      testID="screen-art-detail"
    >
      {!session ? (
        <View style={{ gap: space[3] }}>
          <Skeleton height={28} width="60%" />
          <Skeleton height={140} radius={22} />
        </View>
      ) : (
        <View style={{ gap: space[5] }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <Badge label={t('art.session.duration', { minutes: session.estimatedDuration })} tone="muted" icon="time-outline" />
            {id === 1 && !entitlements.artProgram.active ? <Badge label={t('art.session.freeBadge')} tone="primary" /> : null}
            {status === 'completed' ? <Badge label={t('art.status.completed')} tone="success" icon="checkmark" /> : null}
          </View>

          <View style={{ gap: 6 }}>
            <AppText variant="label" color="textTertiary">
              {t('art.session.theme')}
            </AppText>
            <AppText variant="title3">{session.theme}</AppText>
            <AppText variant="body" color="textSecondary">
              {session.description}
            </AppText>
          </View>

          <Card tone="lavender" padding={22}>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 8 }}>
              <Icon name="brush-outline" size={18} color="onLavenderSoft" />
              <AppText variant="smallStrong" color="onLavenderSoft">
                {t('art.session.invitation')}
              </AppText>
            </View>
            <AppText variant="bodySerif">{session.drawingPrompt}</AppText>
          </Card>

          {/* The focus tags exist only in English (89 tags); in other languages they showed as untranslated English. */}
          {session.focusAreas?.length && language === 'en' ? (
            <View style={{ gap: 8 }}>
              <AppText variant="smallStrong" color="textSecondary">
                {t('art.session.focus')}
              </AppText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {session.focusAreas.map((f) => (
                  <Chip key={f} label={f.replace(/-/g, ' ')} tone="sage" />
                ))}
              </View>
            </View>
          ) : null}

          {SENSITIVE_MODULES.has(session.module) ? <Banner tone="info" icon="heart-outline" body={t('art.session.gentleNote')} /> : null}

          {cta()}

          <MaterialsCard compact />
          <AppText variant="caption" color="textTertiary">
            {tp('common.minutes', session.estimatedDuration)}
          </AppText>
        </View>
      )}
    </Screen>
  );
}
