import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { View } from 'react-native';

import { AppText, Badge, Button, Card, Icon, ProgressRing, Press, Screen, Skeleton, space, useLayout, useTheme } from '@/design';
import { HowItWorks, MaterialsCard } from '@/features/art/Materials';
import { loadProgram, needsAccess, ProgramState, sessionStatus } from '@/features/art/program';
import { useT } from '@/i18n';
import { useAccount } from '@/lib/api/account';

export default function ArtProgramScreen() {
  const router = useRouter();
  const { t, tp, language } = useT();
  const { colors } = useTheme();
  const { isCompact } = useLayout();
  const { entitlements } = useAccount();
  const [state, setState] = useState<ProgramState | null>(null);
  const [open, setOpen] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadProgram(language)
        .then((s) => {
          setState(s);
          const current = s.sessions.find((x) => x.id === (s.inProgressId ?? s.nextId));
          setOpen((o) => o ?? current?.module ?? 1);
        })
        .catch(() => setState(null));
    }, [language])
  );

  const hasProgram = entitlements.artProgram.active;
  const currentId = state?.inProgressId ?? state?.nextId ?? null;
  const current = state?.sessions.find((s) => s.id === currentId);

  const hero = (
    <Card tone="peach" padding={isCompact ? 20 : 28} testID="art-hero">
      <View style={{ flexDirection: isCompact ? 'column' : 'row', gap: space[5], alignItems: isCompact ? 'flex-start' : 'center' }}>
        <ProgressRing value={state ? state.completed / state.total : 0} size={96} stroke={8} label={t('art.progress', { done: state?.completed ?? 0, total: state?.total ?? 43 })}>
          <AppText variant="title2">{state?.completed ?? 0}</AppText>
          <AppText variant="caption" color="textSecondary">
            / {state?.total ?? 43}
          </AppText>
        </ProgressRing>
        <View style={{ flex: 1, gap: 6 }}>
          <AppText variant="label" color="onPeachSoft">
            {state?.inProgressId ? t('art.continueTitle') : t('art.startTitle')}
          </AppText>
          {current ? (
            <>
              <AppText variant="title2">
                {t('art.session.label', { number: current.id })} · {current.title}
              </AppText>
              <AppText variant="small" color="textSecondary">
                {current.theme}
              </AppText>
            </>
          ) : state ? (
            <AppText variant="title2">{t('art.progress', { done: state.completed, total: state.total })}</AppText>
          ) : (
            <Skeleton height={24} width="70%" />
          )}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: space[3], flexWrap: 'wrap' }}>
            {current ? <Button label={state?.inProgressId ? t('art.session.continue') : t('art.session.start')} icon="play" onPress={() => router.push(`/art/${current.id}`)} testID="art-continue" /> : null}
            <Button label={t('art.gallery.title')} icon="images-outline" variant="quiet" onPress={() => router.push('/art/gallery')} />
          </View>
        </View>
      </View>
    </Card>
  );

  const access = (
    <Card tone={hasProgram ? 'sage' : 'muted'} padding={18}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <Icon name={hasProgram ? 'checkmark-circle-outline' : 'lock-open-outline'} size={22} color={hasProgram ? 'success' : 'textSecondary'} />
        <AppText variant="small" style={{ flex: 1 }}>
          {entitlements.artProgram.owned ? t('art.access.owned') : entitlements.plus.active ? t('art.access.viaPlus') : t('art.access.freeFirst')}
        </AppText>
        {!hasProgram ? <Button label={t('art.access.cta')} size="sm" variant="secondary" onPress={() => router.push('/pricing')} /> : null}
      </View>
    </Card>
  );

  const statusBadge = (id: number) => {
    if (!state) return null;
    const st = sessionStatus(state, id);
    if (st === 'completed') return <Badge label={t('art.status.completed')} tone="success" icon="checkmark" />;
    if (st === 'inProgress') return <Badge label={t('art.status.inProgress')} tone="gold" />;
    if (st === 'locked') return <Icon name="lock-closed-outline" size={16} color="textTertiary" />;
    if (needsAccess(id, hasProgram)) return <Icon name="sparkles-outline" size={16} color="textTertiary" />;
    return id === 1 && !hasProgram ? <Badge label={t('art.session.freeBadge')} tone="primary" /> : <Badge label={t('art.status.available')} tone="primary" />;
  };

  return (
    <Screen back title={t('art.title')} subtitle={t('art.subtitle')} aside={<><MaterialsCard /><HowItWorks /></>} testID="screen-art">
      <View style={{ gap: space[5] }}>
        {hero}
        {access}
        {state ? (
          state.modules.map(({ module, sessions }) => {
            const doneCount = sessions.filter((s) => state.progress.get(s.id)?.completed).length;
            const expanded = open === module;
            return (
              <Card key={module} padding={0} testID={`module-${module}`}>
                <Press onPress={() => setOpen(expanded ? null : module)} accessibilityRole="button" accessibilityState={{ expanded }} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.peachSoft, alignItems: 'center', justifyContent: 'center' }}>
                    <AppText variant="bodyStrong" color="onPeachSoft">
                      {module}
                    </AppText>
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText variant="caption" color="textTertiary">
                      {t('art.moduleLabel', { number: module })} · {tp('common.sessions', sessions.length)}
                    </AppText>
                    <AppText variant="title3">{t(`art.modules.${module}`)}</AppText>
                  </View>
                  <AppText variant="small" color="textSecondary">
                    {doneCount}/{sessions.length}
                  </AppText>
                  <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color="textTertiary" />
                </Press>
                {expanded ? (
                  <View style={{ paddingHorizontal: 10, paddingBottom: 10 }}>
                    {sessions.map((s) => {
                      const st = sessionStatus(state, s.id);
                      return (
                        <Press
                          key={s.id}
                          onPress={() => router.push(`/art/${s.id}`)}
                          accessibilityLabel={`${t('art.session.label', { number: s.id })}. ${s.title}`}
                          testID={`art-session-${s.id}`}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, opacity: st === 'locked' ? 0.6 : 1 }}
                        >
                          <AppText style={{ fontSize: 22, width: 32, textAlign: 'center' }}>{s.icon}</AppText>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <AppText variant="callout" numberOfLines={1}>
                              {s.id}. {s.title}
                            </AppText>
                            <AppText variant="caption" color="textSecondary" numberOfLines={1}>
                              {s.theme} · {tp('common.minutes', s.estimatedDuration)}
                            </AppText>
                          </View>
                          {statusBadge(s.id)}
                        </Press>
                      );
                    })}
                  </View>
                ) : null}
              </Card>
            );
          })
        ) : (
          [0, 1, 2].map((i) => <Skeleton key={i} height={80} radius={22} />)
        )}
      </View>
    </Screen>
  );
}
