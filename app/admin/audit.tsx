import React, { useEffect, useState } from 'react';
import { View } from 'react-native';

import { AppText, Button, TextField } from '@/design';
import { adminGet, useAdminData } from '@/features/admin/api';
import { AdminPage, AdminState, Panel, useFmt } from '@/features/admin/ui';
import { useAdminColors } from '@/features/admin/theme';
import { useT } from '@/i18n';

export default function AdminAudit() {
  const { t } = useT();
  const f = useFmt();
  const c = useAdminColors();
  const [action, setAction] = useState('');
  const [target, setTarget] = useState('');
  const [query, setQuery] = useState({ action: '', target: '' });
  const [more, setMore] = useState<any[]>([]);
  useEffect(() => {
    const id = setTimeout(() => setQuery({ action: action.trim(), target: target.trim() }), 350);
    return () => clearTimeout(id);
  }, [action, target]);
  const q = useAdminData<any>('/audit', { limit: 100, action: query.action || undefined, target: query.target || undefined });
  useEffect(() => setMore([]), [q.data]);
  const rows = [...(q.data?.entries || []), ...more];
  const loadMore = async () => {
    const last = rows[rows.length - 1];
    if (!last) return;
    const r = await adminGet<any>('/audit', { limit: 100, before: last.id, action: query.action || undefined, target: query.target || undefined });
    setMore((m) => [...m, ...r.entries]);
  };
  return (
    <AdminPage
      title={t('ac.nav.audit')}
      subtitle={t('ac.audit.subtitle')}
      filters={
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', width: '100%' }}>
          <TextField value={action} onChangeText={setAction} placeholder={t('ac.audit.action')} autoCapitalize="none" containerStyle={{ flexGrow: 1, minWidth: 200 }} />
          <TextField value={target} onChangeText={setTarget} placeholder={t('ac.audit.target')} autoCapitalize="none" containerStyle={{ flexGrow: 1, minWidth: 200 }} />
        </View>
      }
      testID="screen-admin-audit"
    >
      <AdminState error={q.error} loading={q.loading} hasData={Boolean(q.data)} onRetry={q.reload}>
        <Panel>
          {rows.map((e: any) => (
            <View key={e.id} style={{ gap: 2, borderBottomWidth: 1, borderBottomColor: c.border, paddingBottom: 8 }}>
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'baseline' }}>
                <AppText variant="smallStrong" style={{ color: c.text }}>
                  {e.action}
                </AppText>
                <AppText variant="caption" style={{ color: c.textMuted }}>
                  {f.dateTime(e.createdAt)} · {e.actorEmail || e.actorRole}
                </AppText>
              </View>
              <AppText variant="caption" style={{ color: c.textSecondary }} selectable>
                {e.targetType ? `${e.targetType} ${e.targetId || ''}` : ''}
                {e.metadata && Object.keys(e.metadata).length ? ` · ${JSON.stringify(e.metadata).slice(0, 240)}` : ''}
              </AppText>
            </View>
          ))}
          {rows.length >= 100 ? <Button label={t('ac.common.loadMore')} variant="secondary" size="sm" onPress={loadMore} style={{ alignSelf: 'center' }} /> : null}
        </Panel>
      </AdminState>
    </AdminPage>
  );
}
