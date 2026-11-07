import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { View } from 'react-native';

import { AppText, Badge, Banner, Button, Card, Chip, EmptyState, Screen, Skeleton, space, TextField, useFeedback } from '@/design';
import { useT } from '@/i18n';
import { ApiError } from '@/lib/api/client';
import { createTicket, listTickets, SUPPORT_CATEGORIES, SupportCategory, SupportTicket } from '@/lib/api/support';

const TONE: Record<SupportTicket['status'], 'gold' | 'primary' | 'muted' | 'success'> = { open: 'gold', waiting_on_staff: 'gold', waiting_on_user: 'primary', resolved: 'success', closed: 'muted' };

/** Help and support: write to the BeHappy team and follow the replies. */
export default function SupportScreen() {
  const router = useRouter();
  const { t, formatDate } = useT();
  const { toast } = useFeedback();
  const [list, setList] = useState<SupportTicket[] | null>(null);
  const [form, setForm] = useState(false);
  const [category, setCategory] = useState<SupportCategory>('account');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      listTickets()
        .then(setList)
        .catch(() => setList([]));
    }, [])
  );

  const send = async () => {
    setBusy(true);
    try {
      const ticket = await createTicket({ category, subject: subject.trim(), body: body.trim() });
      toast(t('help.sent'));
      setForm(false);
      setSubject('');
      setBody('');
      router.push(`/support/${ticket.id}` as any);
    } catch (e) {
      toast(e instanceof ApiError && e.code === 'slow_down' ? t('help.slowDown') : t('common.errorBody'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen back title={t('help.title')} subtitle={t('help.subtitle')} width="reading" testID="screen-support">
      <View style={{ gap: space[4] }}>
        {form ? (
          <Card padding={18}>
            <View style={{ gap: 12 }}>
              <AppText variant="label" color="textSecondary">
                {t('help.category')}
              </AppText>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {SUPPORT_CATEGORIES.map((c) => (
                  <Chip key={c} label={t(`help.categories.${c}`)} selected={category === c} onPress={() => setCategory(c)} testID={`support-category-${c}`} />
                ))}
              </View>
              {category === 'safety' ? (
                <Banner tone="danger" title={t('help.safetyTitle')} body={t('help.safetyBody')} action={<Button label={t('community.getHelp')} size="sm" variant="danger" onPress={() => router.push('/safety')} />} />
              ) : null}
              {category === 'deletion' ? <Banner tone="info" body={t('help.deletionHint')} /> : null}
              <TextField label={t('help.subject')} value={subject} onChangeText={setSubject} maxLength={120} testID="support-subject" />
              <TextField label={t('help.body')} helper={t('help.bodyHint')} value={body} onChangeText={setBody} multiline maxLength={4000} testID="support-body" />
              <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end' }}>
                <Button label={t('common.cancel')} variant="ghost" onPress={() => setForm(false)} />
                <Button label={t('help.send')} onPress={send} loading={busy} disabled={subject.trim().length < 3 || body.trim().length < 10} testID="support-send" />
              </View>
            </View>
          </Card>
        ) : (
          <Button label={t('help.new')} icon="create-outline" onPress={() => setForm(true)} testID="support-new" />
        )}
        {list === null ? (
          <Skeleton height={90} radius={18} />
        ) : list.length === 0 ? (
          <EmptyState icon="chatbox-ellipses-outline" title={t('help.empty')} />
        ) : (
          list.map((tk) => (
            <Card key={tk.id} padding={16} onPress={() => router.push(`/support/${tk.id}` as any)} accessibilityLabel={tk.subject} testID="support-ticket">
              <View style={{ gap: 4 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                  <AppText variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
                    {tk.subject}
                  </AppText>
                  <Badge label={t(`help.status.${tk.status}`)} tone={TONE[tk.status]} />
                </View>
                <AppText variant="caption" color="textTertiary">
                  {t(`help.categories.${tk.category}`)} · {formatDate(tk.updatedAt, { day: 'numeric', month: 'short' })}
                </AppText>
              </View>
            </Card>
          ))
        )}
      </View>
    </Screen>
  );
}
