import { useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';

import { AppText, Button, Chip, TextField, useFeedback } from '@/design';
import { useAdmin } from '@/features/admin/AdminProvider';
import { adminPost, errorCode, useAdminData } from '@/features/admin/api';
import { AdminPage, AdminState, KeyValues, Note, Panel, Pill, useFmt } from '@/features/admin/ui';
import { useAdminColors } from '@/features/admin/theme';
import { useT } from '@/i18n';

const RESOLUTIONS = ['resources_shared', 'referred_to_emergency', 'no_risk_found', 'duplicate', 'other'];

export default function AdminSafetyCase() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useT();
  const f = useFmt();
  const c = useAdminColors();
  const { can, act, ask } = useAdmin();
  const { toast } = useFeedback();
  const q = useAdminData<any>(`/safety/incidents/${encodeURIComponent(String(id))}`);
  const [note, setNote] = useState('');
  const [resolution, setResolution] = useState<string | null>(null);
  const d = q.data;
  const base = `/safety/incidents/${encodeURIComponent(String(id))}`;
  const post = async (path: string, body: object, done: string) => {
    try {
      await act(() => adminPost(`${base}${path}`, body));
      toast(t(done));
      q.reload();
      return true;
    } catch (e) {
      toast(t('ac.common.failed', { code: errorCode(e) }));
      return false;
    }
  };
  const manage = can('safety.manage');
  const resolved = d?.incident.status === 'resolved';
  return (
    <AdminPage
      title={t('ac.safety.caseTitle', { id: String(id) })}
      subtitle={d ? `${t(`ac.safety.status.${d.incident.status}`)} · ${f.dateTime(d.incident.createdAt)}` : undefined}
      actions={
        d && manage ? (
          <>
            {!resolved ? <Button label={t('ac.safety.takeIt')} size="sm" variant="secondary" onPress={() => post('/assign', {}, 'ac.safety.taken')} testID="admin-safety-take" /> : null}
            {!resolved ? (
              <Button
                label={t('ac.safety.escalate')}
                size="sm"
                variant="danger"
                onPress={async () => {
                  const body = await ask({ title: t('ac.safety.escalate'), body: t('ac.safety.escalateBody'), min: 10 });
                  if (body) await post('/escalate', { body }, 'ac.safety.escalated');
                }}
              />
            ) : (
              <Button
                label={t('ac.safety.reopen')}
                size="sm"
                variant="secondary"
                onPress={async () => {
                  const body = await ask({ title: t('ac.safety.reopen'), min: 5 });
                  if (body) await post('/reopen', { body }, 'ac.safety.reopened');
                }}
              />
            )}
          </>
        ) : null
      }
      testID="screen-admin-safety-case"
    >
      <Note tone="warning" icon="heart-circle-outline">
        {t('ac.safety.caseNote')}
      </Note>
      <AdminState error={q.error} loading={q.loading} hasData={Boolean(d)} onRetry={q.reload}>
        {d ? (
          <>
            <Panel title={t('ac.safety.what')}>
              {d.incident.reported ? (
                <View style={{ backgroundColor: c.cardMuted, borderRadius: 12, padding: 12, gap: 4 }}>
                  <AppText variant="caption" style={{ color: c.textMuted }}>
                    {d.incident.reported.pseudonym || t('ac.safety.member')} · {d.incident.roomId || ''}
                  </AppText>
                  <AppText variant="small" style={{ color: c.text }} selectable>
                    {d.incident.reported.body}
                  </AppText>
                </View>
              ) : null}
              <KeyValues
                items={[
                  [t('ac.safety.cols.source'), t(`ac.safety.sources.${d.incident.source}`)],
                  [t('ac.safety.reason'), d.incident.reason ? t(`ac.safety.reasons.${d.incident.reason}`) : t('ac.safety.reasons.support_request')],
                  [t('ac.safety.reportStatus'), d.incident.reportStatus ? t(`ac.safety.reportStatuses.${d.incident.reportStatus}`) : '—'],
                  [t('ac.safety.outcome'), d.incident.resolution ? t(`ac.safety.resolutions.${d.incident.resolution}`) : '—'],
                ]}
              />
              {d.incident.details ? (
                <AppText variant="small" style={{ color: c.textSecondary }}>
                  {d.incident.details}
                </AppText>
              ) : null}
            </Panel>
            <Panel title={t('ac.safety.notes')} subtitle={t('ac.safety.notesSub')}>
              {d.notes.length ? (
                d.notes.map((n: any) => (
                  <View key={n.id} style={{ gap: 2, borderBottomWidth: 1, borderBottomColor: c.border, paddingBottom: 8 }}>
                    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <Pill label={t(`ac.safety.noteKinds.${n.kind}`)} tone={n.kind === 'escalated' ? 'danger' : n.kind === 'resolved' ? 'good' : 'neutral'} />
                      <AppText variant="caption" style={{ color: c.textMuted }}>
                        {n.author?.email || t('ac.safety.system')} · {f.dateTime(n.at)}
                      </AppText>
                    </View>
                    {n.body ? (
                      <AppText variant="small" style={{ color: c.text }} selectable>
                        {n.body}
                      </AppText>
                    ) : null}
                  </View>
                ))
              ) : (
                <AppText variant="small" style={{ color: c.textSecondary }}>
                  {t('ac.safety.noNotes')}
                </AppText>
              )}
              {manage && !resolved ? (
                <View style={{ gap: 8 }}>
                  <TextField value={note} onChangeText={setNote} placeholder={t('ac.safety.notePlaceholder')} multiline testID="admin-safety-note" />
                  <Button
                    label={t('ac.safety.addNote')}
                    variant="secondary"
                    size="sm"
                    disabled={note.trim().length < 3}
                    onPress={async () => {
                      if (await post('/notes', { body: note }, 'ac.safety.noteAdded')) setNote('');
                    }}
                    style={{ alignSelf: 'flex-end' }}
                  />
                </View>
              ) : null}
            </Panel>
            {manage && !resolved ? (
              <Panel title={t('ac.safety.close')} subtitle={t('ac.safety.closeSub')}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {RESOLUTIONS.map((r) => (
                    <Chip key={r} label={t(`ac.safety.resolutions.${r}`)} selected={resolution === r} onPress={() => setResolution(r)} testID={`admin-safety-outcome-${r}`} />
                  ))}
                </View>
                <Button
                  label={t('ac.safety.resolve')}
                  disabled={!resolution}
                  onPress={async () => {
                    const body = resolution === 'other' ? await ask({ title: t('ac.safety.resolve'), min: 10 }) : '';
                    if (body === null) return;
                    await post('/resolve', { resolution, body }, 'ac.safety.resolved');
                  }}
                  style={{ alignSelf: 'flex-start' }}
                  testID="admin-safety-resolve"
                />
              </Panel>
            ) : null}
          </>
        ) : null}
      </AdminState>
    </AdminPage>
  );
}
