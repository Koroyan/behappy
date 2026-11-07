import React, { useState } from 'react';
import { View } from 'react-native';

import { AppText, Button, Sheet, TextField, Toggle, useFeedback } from '@/design';
import { useAdmin } from '@/features/admin/AdminProvider';
import { adminPost, errorCode, useAdminData } from '@/features/admin/api';
import { AdminPage, AdminState, DataTable, KeyValues, Note, Panel, Pill, useFmt } from '@/features/admin/ui';
import { useAdminColors } from '@/features/admin/theme';
import { useT } from '@/i18n';

const TONE: Record<string, any> = { draft: 'warning', active: 'good', retired: 'neutral', withdrawn: 'neutral' };

export default function AdminPolicies() {
  const { t } = useT();
  const f = useFmt();
  const c = useAdminColors();
  const { can, act, ask, me } = useAdmin();
  const { toast } = useFeedback();
  const q = useAdminData<any>('/policies');
  const [form, setForm] = useState<null | { country: string; identityDocument: boolean; degreeDocument: boolean; licenseRequired: boolean; registryUrl: string; notes: string; sourceReference: string }>(null);
  const [busy, setBusy] = useState(false);

  const run = async (path: string, body: object, done: string) => {
    try {
      await act(() => adminPost(path, body));
      toast(t(done));
      q.reload();
      return true;
    } catch (e) {
      toast(t('ac.common.failed', { code: errorCode(e) }));
      return false;
    }
  };
  const save = async () => {
    if (!form) return;
    setBusy(true);
    const ok = await run('/policies', { ...form, country: form.country.trim().toUpperCase(), registryUrl: form.registryUrl.trim() || null }, 'ac.policies.drafted');
    setBusy(false);
    if (ok) setForm(null);
  };

  return (
    <AdminPage
      title={t('ac.nav.policies')}
      subtitle={t('ac.policies.subtitle')}
      actions={can('policies.edit') ? <Button label={t('ac.policies.new')} size="sm" icon="add" onPress={() => setForm({ country: '', identityDocument: true, degreeDocument: true, licenseRequired: false, registryUrl: '', notes: '', sourceReference: '' })} testID="admin-policy-new" /> : null}
      testID="screen-admin-policies"
    >
      <Note icon="scale-outline" tone="warning">
        {t('ac.policies.legalNote')}
      </Note>
      <AdminState error={q.error} loading={q.loading} hasData={Boolean(q.data)} onRetry={q.reload}>
        {q.data ? (
          <>
            <Panel title={t('ac.policies.defaultTitle')} subtitle={t('ac.policies.defaultSub')}>
              <KeyValues
                items={[
                  [t('ac.policies.identity'), t(q.data.defaultRule.identityDocument ? 'ac.common.required' : 'ac.common.notRequired')],
                  [t('ac.policies.degree'), t(q.data.defaultRule.degreeDocument ? 'ac.common.required' : 'ac.common.notRequired')],
                  [t('ac.policies.license'), t(q.data.defaultRule.licenseRequired ? 'ac.common.required' : 'ac.policies.whereRegister')],
                ]}
              />
            </Panel>
            <DataTable
              rows={q.data.policies}
              keyFor={(r: any) => String(r.id)}
              empty={t('ac.policies.none')}
              rowTestID="admin-policy-row"
              columns={[
                { key: 'country', label: t('ac.policies.cols.country'), width: 90, render: (r: any) => `${r.country} · v${r.version}` },
                { key: 'status', label: t('ac.policies.cols.status'), render: (r: any) => <Pill label={t(`ac.policies.status.${r.status}`)} tone={TONE[r.status]} /> },
                { key: 'rules', label: t('ac.policies.cols.rules'), flex: 2, render: (r: any) => [r.identityDocument && t('ac.policies.identity'), r.degreeDocument && t('ac.policies.degree'), r.licenseRequired && t('ac.policies.license')].filter(Boolean).join(', ') },
                { key: 'source', label: t('ac.policies.cols.source'), flex: 2, wideOnly: true, render: (r: any) => r.sourceReference },
                { key: 'review', label: t('ac.policies.cols.review'), wideOnly: true, render: (r: any) => (r.reviewReference ? `${r.reviewReference} · ${f.date(r.approvedAt)}` : '—') },
                {
                  key: 'actions',
                  label: '',
                  flex: 2,
                  render: (r: any) => (
                    <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                      {r.status === 'draft' && can('policies.approve') && r.draftedBy !== me?.accountId ? (
                        <Button
                          label={t('ac.policies.activate')}
                          size="sm"
                          onPress={async () => {
                            const reviewReference = await ask({ title: t('ac.policies.activate'), body: t('ac.policies.activateBody'), label: t('ac.policies.reviewReference'), min: 5, multiline: false });
                            if (reviewReference) await run(`/policies/${r.id}/activate`, { reviewReference }, 'ac.policies.activated');
                          }}
                          testID="admin-policy-activate"
                        />
                      ) : null}
                      {r.status === 'draft' && r.draftedBy === me?.accountId ? <Pill label={t('ac.policies.needsOther')} tone="info" /> : null}
                      {r.status === 'draft' && can('policies.edit') ? (
                        <Button
                          label={t('ac.policies.withdraw')}
                          size="sm"
                          variant="ghost"
                          onPress={async () => {
                            const reason = await ask({ title: t('ac.policies.withdraw'), min: 5 });
                            if (reason) await run(`/policies/${r.id}/withdraw`, { reason }, 'ac.policies.withdrawn');
                          }}
                        />
                      ) : null}
                      {r.status === 'active' && can('policies.approve') ? (
                        <Button
                          label={t('ac.policies.retire')}
                          size="sm"
                          variant="ghost"
                          onPress={async () => {
                            const reason = await ask({ title: t('ac.policies.retire'), body: t('ac.policies.retireBody'), min: 5 });
                            if (reason) await run(`/policies/${r.id}/retire`, { reason }, 'ac.policies.retired');
                          }}
                        />
                      ) : null}
                    </View>
                  ),
                },
              ]}
            />
          </>
        ) : null}
      </AdminState>
      <Sheet visible={Boolean(form)} onClose={() => setForm(null)} title={t('ac.policies.new')} maxWidth={560}>
        {form ? (
          <View style={{ gap: 12 }}>
            <TextField label={t('ac.policies.cols.country')} value={form.country} onChangeText={(v) => setForm({ ...form, country: v.replace(/[^a-zA-Z]/g, '').slice(0, 2).toUpperCase() })} autoCapitalize="characters" placeholder="GE" testID="admin-policy-country" />
            {(['identityDocument', 'degreeDocument', 'licenseRequired'] as const).map((k) => (
              <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <AppText variant="small" style={{ color: c.text }}>
                  {t(`ac.policies.fields.${k}`)}
                </AppText>
                <Toggle value={form[k]} onValueChange={(v) => setForm({ ...form, [k]: v })} label={t(`ac.policies.fields.${k}`)} />
              </View>
            ))}
            <TextField label={t('ac.policies.fields.registryUrl')} value={form.registryUrl} onChangeText={(v) => setForm({ ...form, registryUrl: v })} autoCapitalize="none" placeholder="https://" />
            <TextField label={t('ac.policies.fields.sourceReference')} helper={t('ac.policies.fields.sourceHelp')} value={form.sourceReference} onChangeText={(v) => setForm({ ...form, sourceReference: v })} testID="admin-policy-source" />
            <TextField label={t('ac.policies.fields.notes')} value={form.notes} onChangeText={(v) => setForm({ ...form, notes: v })} multiline />
            <Button label={t('ac.policies.saveDraft')} onPress={save} loading={busy} disabled={form.country.length !== 2 || form.sourceReference.trim().length < 5} testID="admin-policy-save" />
          </View>
        ) : null}
      </Sheet>
    </AdminPage>
  );
}
