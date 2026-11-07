import React, { useState } from 'react';
import { View } from 'react-native';

import { AppText, Button, Chip, TextField, Toggle, useFeedback } from '@/design';
import { useAdmin } from '@/features/admin/AdminProvider';
import { adminPut, errorCode, useAdminData } from '@/features/admin/api';
import { AdminPage, AdminState, Note, Panel, Pill, useFmt } from '@/features/admin/ui';
import { useAdminColors } from '@/features/admin/theme';
import { useT } from '@/i18n';

export default function AdminSettings() {
  const { t } = useT();
  const f = useFmt();
  const c = useAdminColors();
  const { can, act, ask, me } = useAdmin();
  const { toast } = useFeedback();
  const q = useAdminData<any>('/settings');
  const manage = can('settings.manage');
  const isOwner = me?.roles.includes('owner');

  const save = async (key: string, value: unknown) => {
    const reason = await ask({ title: t('ac.settings.changeTitle'), body: t(`ac.settings.keys.${key}`) });
    if (!reason) return false;
    try {
      await act(() => adminPut(`/settings/${key}`, { value, reason }));
      toast(t('ac.common.saved'));
      q.reload();
      return true;
    } catch (e) {
      const code = errorCode(e);
      toast(t(code === 'enable_mfa_first' ? 'ac.settings.enableMfaFirst' : code === 'owner_only' ? 'ac.settings.ownerOnly' : 'ac.common.failed', { code }));
      return false;
    }
  };

  const settings: any[] = q.data?.settings || [];
  const get = (k: string) => settings.find((s) => s.key === k);
  return (
    <AdminPage title={t('ac.nav.settings')} subtitle={t('ac.settings.subtitle')} testID="screen-admin-settings">
      <AdminState error={q.error} loading={q.loading} hasData={Boolean(q.data)} onRetry={q.reload}>
        {q.data ? (
          <>
            <Panel title={t('ac.settings.switches')}>
              {['analytics.enabled', 'staff.mfaRequired', 'features.sensitiveAccess'].map((k) => {
                const s = get(k);
                if (!s) return null;
                const locked = !manage || (s.ownerOnly && !isOwner);
                return (
                  <View key={k} style={{ gap: 4, borderBottomWidth: 1, borderBottomColor: c.border, paddingBottom: 10 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                      <View style={{ flex: 1, gap: 2 }}>
                        <AppText variant="smallStrong" style={{ color: c.text }}>
                          {t(`ac.settings.keys.${k}`)}
                        </AppText>
                        <AppText variant="caption" style={{ color: c.textMuted }}>
                          {t(`ac.settings.help.${k}`)}
                        </AppText>
                      </View>
                      {locked ? <Pill label={t(s.value ? 'ac.common.on' : 'ac.common.off')} tone={s.value ? 'good' : 'neutral'} /> : <Toggle value={Boolean(s.value)} onValueChange={(v) => save(k, v)} label={t(`ac.settings.keys.${k}`)} testID={`admin-setting-${k}`} />}
                    </View>
                    <AppText variant="caption" style={{ color: c.textMuted }}>
                      {s.ownerOnly ? `${t('ac.settings.ownerOnly')} · ` : ''}
                      {s.updatedAt ? t('ac.settings.changed', { date: f.dateTime(s.updatedAt) }) : t('ac.settings.default')}
                    </AppText>
                  </View>
                );
              })}
            </Panel>
            <NumberSetting setting={get('analytics.retentionDays')} label={t('ac.settings.keys.analytics.retentionDays')} help={t('ac.settings.help.analytics.retentionDays')} editable={manage} onSave={(v) => save('analytics.retentionDays', v)} />
            <NumberSetting setting={get('staff.stepUpMinutes')} label={t('ac.settings.keys.staff.stepUpMinutes')} help={t('ac.settings.help.staff.stepUpMinutes')} editable={manage && Boolean(isOwner)} onSave={(v) => save('staff.stepUpMinutes', v)} />
            <Announcement setting={get('announcement')} editable={manage} onSave={(v) => save('announcement', v)} />
            <Note>{t('ac.settings.aiNote')}</Note>
          </>
        ) : null}
      </AdminState>
    </AdminPage>
  );
}

function NumberSetting({ setting, label, help, editable, onSave }: { setting: any; label: string; help: string; editable: boolean; onSave: (v: number) => Promise<boolean> }) {
  const { t } = useT();
  const [v, setV] = useState<string | null>(null);
  if (!setting) return null;
  return (
    <Panel title={label} subtitle={help}>
      {editable ? (
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <TextField value={v ?? String(setting.value)} onChangeText={setV} keyboardType="number-pad" containerStyle={{ width: 140 }} />
          <Button label={t('ac.common.save')} size="sm" variant="secondary" disabled={v === null} onPress={async () => v !== null && (await onSave(Number(v))) && setV(null)} />
        </View>
      ) : (
        <AppText variant="bodyStrong">{String(setting.value)}</AppText>
      )}
    </Panel>
  );
}

function Announcement({ setting, editable, onSave }: { setting: any; editable: boolean; onSave: (v: any) => Promise<boolean> }) {
  const { t } = useT();
  const c = useAdminColors();
  const [draft, setDraft] = useState<any | null>(null);
  if (!setting) return null;
  const value = draft || setting.value;
  const set = (patch: any) => setDraft({ ...value, ...patch });
  return (
    <Panel title={t('ac.settings.announcement')} subtitle={t('ac.settings.announcementSub')}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <AppText variant="small" style={{ color: c.text }}>
          {t('ac.settings.showAnnouncement')}
        </AppText>
        {editable ? <Toggle value={value.active} onValueChange={(v) => set({ active: v })} label={t('ac.settings.showAnnouncement')} testID="admin-announcement-active" /> : <Pill label={t(value.active ? 'ac.common.on' : 'ac.common.off')} />}
      </View>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {(['info', 'warning'] as const).map((tone) => (
          <Chip key={tone} label={t(`ac.settings.tones.${tone}`)} selected={value.tone === tone} onPress={editable ? () => set({ tone }) : undefined} />
        ))}
      </View>
      {(['en', 'ka'] as const).map((l) => (
        <View key={l} style={{ gap: 6 }}>
          <TextField label={`${t('ac.settings.annTitle')} (${l})`} value={value.title[l]} onChangeText={(v) => set({ title: { ...value.title, [l]: v } })} editable={editable} testID={`admin-announcement-title-${l}`} />
          <TextField label={`${t('ac.settings.annBody')} (${l})`} value={value.body[l]} onChangeText={(v) => set({ body: { ...value.body, [l]: v } })} editable={editable} multiline />
        </View>
      ))}
      <AppText variant="caption" style={{ color: c.textMuted }}>
        {t('ac.settings.annLanguages')}
      </AppText>
      {editable ? <Button label={t('ac.common.save')} disabled={!draft} onPress={async () => (await onSave(value)) && setDraft(null)} style={{ alignSelf: 'flex-start' }} testID="admin-announcement-save" /> : null}
    </Panel>
  );
}
