import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';

import { AppText, Button, TextField, useFeedback } from '@/design';
import { useAdmin } from '@/features/admin/AdminProvider';
import { adminPost, errorCode, useAdminData } from '@/features/admin/api';
import { AdminPage, AdminState, KeyValues, Note, Panel, Pill, useFmt } from '@/features/admin/ui';
import { useAdminColors } from '@/features/admin/theme';
import { useT } from '@/i18n';

export default function AdminTicket() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useT();
  const f = useFmt();
  const c = useAdminColors();
  const router = useRouter();
  const { can, act } = useAdmin();
  const { toast } = useFeedback();
  const q = useAdminData<any>(`/support/tickets/${encodeURIComponent(String(id))}`);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const d = q.data;
  const post = async (path: string, body: object, done: string) => {
    setBusy(true);
    try {
      await act(() => adminPost(`/support/tickets/${encodeURIComponent(String(id))}${path}`, body));
      toast(t(done));
      q.reload();
      return true;
    } catch (e) {
      toast(t('ac.common.failed', { code: errorCode(e) }));
      return false;
    } finally {
      setBusy(false);
    }
  };
  return (
    <AdminPage
      title={d?.ticket.subject || t('ac.nav.support')}
      subtitle={d ? `${t(`ac.support.categories.${d.ticket.category}`)} · ${t(`ac.support.status.${d.ticket.status}`)} · ${f.dateTime(d.ticket.createdAt)}` : undefined}
      actions={
        d && can('support.respond') ? (
          <>
            <Button label={t('ac.support.assignMe')} size="sm" variant="secondary" onPress={() => post('/assign', {}, 'ac.support.assigned')} />
            {d.ticket.status !== 'resolved' ? <Button label={t('ac.support.resolve')} size="sm" variant="secondary" onPress={() => post('/status', { status: 'resolved' }, 'ac.support.resolved')} /> : null}
            {d.ticket.status !== 'closed' ? <Button label={t('ac.support.close')} size="sm" variant="ghost" onPress={() => post('/status', { status: 'closed' }, 'ac.support.closed')} /> : <Button label={t('ac.support.reopen')} size="sm" variant="ghost" onPress={() => post('/status', { status: 'open' }, 'ac.support.reopened')} />}
          </>
        ) : null
      }
      testID="screen-admin-ticket"
    >
      <AdminState error={q.error} loading={q.loading} hasData={Boolean(d)} onRetry={q.reload}>
        {d ? (
          <>
            {d.ticket.category === 'safety' ? <Note tone="warning" icon="heart-circle-outline">{t('ac.support.safetyNote')}</Note> : null}
            {d.ticket.category === 'deletion' ? <Note icon="trash-outline">{t('ac.support.deletionNote')}</Note> : null}
            <Panel title={t('ac.support.person')}>
              {d.account ? (
                <KeyValues
                  items={[
                    [t('ac.users.cols.account'), d.account.email || d.account.id],
                    [t('ac.users.cols.type'), t(d.account.registered ? 'ac.users.registered' : 'ac.users.deviceOnly')],
                    [t('ac.users.cols.status'), <Pill key="s" label={t(`ac.users.status.${d.account.status}`)} tone={d.account.status === 'active' ? 'neutral' : 'danger'} />],
                  ]}
                />
              ) : (
                <AppText variant="small" style={{ color: c.textSecondary }}>
                  {t('ac.support.deletedAccount')}
                </AppText>
              )}
              {d.account && can('users.view') ? <Button label={t('ac.support.openAccount')} variant="ghost" size="sm" onPress={() => router.push(`/admin/users/${d.account.id}` as any)} style={{ alignSelf: 'flex-start' }} /> : null}
            </Panel>
            <Panel title={t('ac.support.conversation')} subtitle={t('ac.support.encrypted')}>
              <View style={{ gap: 10 }}>
                {d.messages.map((m: any) => (
                  <View key={m.id} style={{ alignSelf: m.from === 'staff' ? 'flex-end' : 'flex-start', maxWidth: '86%', backgroundColor: m.from === 'staff' ? c.accent : c.cardMuted, borderRadius: 14, padding: 12, gap: 4 }}>
                    <AppText variant="caption" style={{ color: c.textMuted }}>
                      {t(`ac.support.from.${m.from}`)} · {f.dateTime(m.at)}
                    </AppText>
                    <AppText variant="small" style={{ color: m.from === 'staff' ? c.accentText : c.text }} selectable>
                      {m.body}
                    </AppText>
                  </View>
                ))}
              </View>
              {can('support.respond') ? (
                <View style={{ gap: 8 }}>
                  <TextField value={reply} onChangeText={setReply} placeholder={t('ac.support.replyPlaceholder')} multiline testID="admin-ticket-reply" />
                  <Button
                    label={t('ac.support.send')}
                    onPress={async () => {
                      if (await post('/reply', { body: reply }, 'ac.support.sent')) setReply('');
                    }}
                    loading={busy}
                    disabled={reply.trim().length < 2}
                    style={{ alignSelf: 'flex-end' }}
                    testID="admin-ticket-send"
                  />
                </View>
              ) : null}
            </Panel>
          </>
        ) : null}
      </AdminState>
    </AdminPage>
  );
}
