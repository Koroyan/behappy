import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { View } from 'react-native';

import { AppText, Banner, Button, Card, Divider, ListRow, Screen, SectionHeader, space, TextField, useFeedback } from '@/design';
import { useT } from '@/i18n';
import { useAccount } from '@/lib/api/account';
import { ApiError } from '@/lib/api/client';
import { getRelations, saveProfile, setBlocked, setMuted } from '@/lib/api/community';

type Rel = { ref: string; pseudonym: string; since: number };

export default function CommunitySettings() {
  const { t } = useT();
  const { me, refresh } = useAccount();
  const { toast } = useFeedback();
  const profile = (me?.community as { profile: { pseudonym: string } | null } | undefined)?.profile;
  const [name, setName] = useState(profile?.pseudonym || '');
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlockedList] = useState<Rel[]>([]);
  const [muted, setMutedList] = useState<Rel[]>([]);

  const load = useCallback(async () => {
    try {
      const r = await getRelations();
      setBlockedList(r.blocked);
      setMutedList(r.muted);
    } catch {
      // shown as empty
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      setName(profile?.pseudonym || '');
    }, [load, profile?.pseudonym])
  );

  const save = async () => {
    setError(null);
    try {
      await saveProfile(name.trim(), true);
      await refresh();
      toast(t('community.settings.saved'));
    } catch (e) {
      setError(t(`community.setup.errors.${(e instanceof ApiError && e.code) || 'generic'}`));
    }
  };

  const list = (items: Rel[], kind: 'block' | 'mute') =>
    items.length ? (
      <Card padding={8}>
        {items.map((r, i) => (
          <View key={r.ref} style={{ paddingHorizontal: 12 }}>
            {i ? <Divider /> : null}
            <ListRow
              title={r.pseudonym}
              right={
                <Button
                  label={kind === 'block' ? t('community.settings.unblock') : t('community.settings.unmute')}
                  size="sm"
                  variant="quiet"
                  onPress={async () => {
                    await (kind === 'block' ? setBlocked(r.ref, false) : setMuted(r.ref, false)).catch(() => {});
                    load();
                  }}
                />
              }
            />
          </View>
        ))}
      </Card>
    ) : (
      <AppText variant="small" color="textSecondary">
        {t('community.settings.none')}
      </AppText>
    );

  return (
    <Screen title={t('community.settings.title')} back width="reading" keyboard testID="screen-community-settings">
      <View style={{ gap: space[6] }}>
        {profile ? (
          <Card padding={20}>
            <View style={{ gap: space[3] }}>
              <TextField label={t('community.settings.name')} value={name} onChangeText={setName} maxLength={24} autoCorrect={false} helper={t('community.setup.body')} />
              {error ? <Banner tone="danger" body={error} /> : null}
              <Button label={t('community.settings.change')} onPress={save} disabled={name.trim().length < 3 || name.trim() === profile.pseudonym} />
            </View>
          </Card>
        ) : null}
        <View>
          <SectionHeader title={t('community.settings.blocked')} />
          {list(blocked, 'block')}
        </View>
        <View>
          <SectionHeader title={t('community.settings.muted')} />
          {list(muted, 'mute')}
        </View>
      </View>
    </Screen>
  );
}
