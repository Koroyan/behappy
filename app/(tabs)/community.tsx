import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import { AppLanguage, LANGUAGE_NAMES, SUPPORTED_LANGUAGES, useLanguage } from '@/contexts/LanguageContext';
import { AppText, Banner, Button, Card, Icon, Press, Screen, SectionHeader, Sheet, Skeleton, space, TextField, useFeedback, useLayout } from '@/design';
import { AccountGate } from '@/features/account/AccountParts';
import { RoomCard } from '@/features/community/RoomCard';
import { ProfileButton } from '@/features/shell/ProfileButton';
import { GuidelinesList, MemberAvatar } from '@/features/community/RoomParts';
import { useT } from '@/i18n';
import { useAccount, useIdentity } from '@/lib/api/account';
import { ApiError } from '@/lib/api/client';
import { listMyRooms, listRooms, Room, saveProfile, sendAppeal, Suspension } from '@/lib/api/community';
import { onEvent } from '@/lib/realtime/socket';

interface CommunityMe {
  profile: { pseudonym: string; ref: string; avatarSeed: number } | null;
  suspension: Suspension | null;
  unreadRooms: number;
}

export default function CommunityHome() {
  const router = useRouter();
  const { isCompact } = useLayout();
  const { t, formatDate } = useT();
  const { language } = useLanguage();
  const { me, refresh } = useAccount();
  const identity = useIdentity();
  const { toast } = useFeedback();
  const community = (me?.community as CommunityMe | undefined) ?? null;
  const [browseLang, setBrowseLang] = useState<AppLanguage>(language);
  const [rooms, setRooms] = useState<Room[] | null>(null);
  const [mine, setMine] = useState<Room[]>([]);
  const [langOpen, setLangOpen] = useState(false);
  const [name, setName] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [appealOpen, setAppealOpen] = useState(false);
  const [appealText, setAppealText] = useState('');

  const profile = community?.profile ?? null;
  // A boolean, not the profile object: every refresh() returns a new object,
  // and depending on it re-ran this focus effect (and refresh) in a loop.
  const hasProfile = Boolean(profile);

  const load = useCallback(
    async (lang: AppLanguage) => {
      try {
        const [r, m] = await Promise.all([listRooms(lang), listMyRooms()]);
        setRooms(r);
        setMine(m);
      } catch {
        setRooms([]);
      }
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      refresh();
      if (identity.registered && hasProfile) load(browseLang);
    }, [refresh, identity.registered, hasProfile, browseLang, load])
  );

  // Live: someone wrote in one of your rooms while you look at the list.
  useEffect(() => {
    if (!identity.registered || !hasProfile) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const soon = () => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        load(browseLang);
      }, 800);
    };
    const offs = [onEvent('room:activity', soon), onEvent('unread:changed', soon)];
    return () => {
      offs.forEach((off) => off());
      if (timer) clearTimeout(timer);
    };
  }, [identity.registered, hasProfile, browseLang, load]);

  const createProfile = async () => {
    setSetupError(null);
    setSaving(true);
    try {
      await saveProfile(name.trim(), accepted);
      await refresh();
      toast(t('community.setup.done'));
      load(browseLang);
    } catch (e) {
      const code = e instanceof ApiError ? e.code : undefined;
      setSetupError(t(`community.setup.errors.${code || 'generic'}`));
    } finally {
      setSaving(false);
    }
  };

  const submitAppeal = async () => {
    if (!community?.suspension) return;
    try {
      await sendAppeal(community.suspension.id, appealText.trim());
      setAppealOpen(false);
      setAppealText('');
      toast(t('community.suspension.appealSent'));
    } catch (e) {
      toast(e instanceof ApiError && e.code === 'appeal_open' ? t('community.suspension.appealOpen') : t('community.errors.generic'));
    }
  };

  const peer = (
    <Banner
      tone="info"
      icon="people-outline"
      body={t('community.peerNotice')}
      action={<Button label={t('community.getHelp')} size="sm" variant="danger" icon="heart-outline" onPress={() => router.push('/safety')} testID="community-get-help" />}
    />
  );

  const aside = profile ? (
    <>
      <Card padding={18}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <MemberAvatar seed={profile.avatarSeed} name={profile.pseudonym} size={44} />
          <View style={{ flex: 1 }}>
            <AppText variant="label" color="textTertiary">
              {t('community.settings.name')}
            </AppText>
            <AppText variant="title3">{profile.pseudonym}</AppText>
          </View>
        </View>
        <Button label={t('community.settings.title')} variant="quiet" size="sm" icon="settings-outline" onPress={() => router.push('/community/settings' as any)} style={{ marginTop: space[3] }} />
      </Card>
      <Card tone="sage" padding={18} onPress={() => router.push('/community/guidelines' as any)} accessibilityLabel={t('community.guidelines.title')}>
        <AppText variant="smallStrong">{t('community.guidelines.title')}</AppText>
        <AppText variant="small" color="textSecondary" style={{ marginTop: 4 }}>
          {t('community.guidelines.read')}
        </AppText>
      </Card>
    </>
  ) : null;

  return (
    <Screen tab brand title={t('community.title')} subtitle={t('community.subtitle')} headerRight={isCompact ? <ProfileButton /> : undefined} aside={aside} asideOnNarrow="below" testID="screen-community">
      <View style={{ gap: space[5] }}>
        {peer}
        {!identity.registered ? (
          <AccountGate returnTo="/community" />
        ) : !profile ? (
          <Card padding={22} testID="community-setup">
            <View style={{ gap: space[4] }}>
              <View style={{ gap: 6 }}>
                <AppText variant="title3">{t('community.setup.title')}</AppText>
                <AppText variant="small" color="textSecondary">
                  {t('community.setup.body')}
                </AppText>
              </View>
              <TextField label={t('community.setup.pseudonym')} value={name} onChangeText={setName} maxLength={24} autoCapitalize="words" autoCorrect={false} testID="setup-pseudonym" />
              <Card tone="muted" padding={16}>
                <AppText variant="smallStrong" style={{ marginBottom: space[2] }}>
                  {t('community.guidelines.title')}
                </AppText>
                <GuidelinesList />
              </Card>
              <Press onPress={() => setAccepted((v) => !v)} accessibilityRole="checkbox" accessibilityState={{ checked: accepted }} testID="setup-accept" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Icon name={accepted ? 'checkbox' : 'square-outline'} size={22} color={accepted ? 'primary' : 'textSecondary'} />
                <AppText variant="callout" style={{ flex: 1 }}>
                  {t('community.guidelines.accept')}
                </AppText>
              </Press>
              {setupError ? <Banner tone="danger" body={setupError} /> : null}
              <Button label={t('community.setup.cta')} onPress={createProfile} disabled={name.trim().length < 3 || !accepted} loading={saving} fullWidth testID="setup-save" />
            </View>
          </Card>
        ) : (
          <>
            {community?.suspension ? (
              <Banner
                tone="warning"
                title={t('community.suspension.title')}
                body={
                  community.suspension.kind === 'permanent'
                    ? t('community.suspension.permanent', { reason: community.suspension.reason })
                    : t('community.suspension.temporary', { date: formatDate(community.suspension.endsAt || 0, { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }), reason: community.suspension.reason })
                }
                action={<Button label={t('community.suspension.appeal')} size="sm" variant="secondary" onPress={() => setAppealOpen(true)} />}
              />
            ) : null}

            <View>
              <SectionHeader title={t('community.myRooms')} />
              {mine.length ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                  {mine.map((r) => (
                    <RoomCard key={r.id} room={r} onPress={() => router.push(`/community/${encodeURIComponent(r.id)}` as any)} />
                  ))}
                </View>
              ) : (
                <AppText variant="small" color="textSecondary">
                  {t('community.myRoomsEmpty')}
                </AppText>
              )}
            </View>

            <View>
              <SectionHeader title={t('community.roomsIn', { language: LANGUAGE_NAMES[browseLang] })} actionLabel={t('community.otherLanguage')} onAction={() => setLangOpen(true)} />
              {rooms === null ? (
                <View style={{ gap: 12 }}>
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
            
          </>
        )}
      </View>

      <Sheet visible={langOpen} onClose={() => setLangOpen(false)} title={t('community.chooseLanguage')} subtitle={t('community.languageNote')}>
        <View style={{ gap: 4, paddingBottom: space[4] }}>
          {SUPPORTED_LANGUAGES.map((l) => (
            <Press
              key={l}
              onPress={() => {
                setBrowseLang(l);
                setRooms(null);
                setLangOpen(false);
                load(l);
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected: l === browseLang }}
              testID={`community-lang-${l}`}
              style={{ paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between' }}
            >
              <AppText variant="callout">{LANGUAGE_NAMES[l]}</AppText>
              {l === browseLang ? <Icon name="checkmark" size={18} color="primary" /> : null}
            </Press>
          ))}
        </View>
      </Sheet>

      <Sheet
        visible={appealOpen}
        onClose={() => setAppealOpen(false)}
        title={t('community.suspension.appealTitle')}
        subtitle={t('community.suspension.appealBody')}
        footer={<Button label={t('community.suspension.appealSend')} onPress={submitAppeal} disabled={appealText.trim().length < 10} fullWidth />}
      >
        <TextField value={appealText} onChangeText={setAppealText} placeholder={t('community.suspension.appealPlaceholder')} multiline maxLength={2000} inputStyle={{ minHeight: 120 }} />
      </Sheet>
    </Screen>
  );
}
