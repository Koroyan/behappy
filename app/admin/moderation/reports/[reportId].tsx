/**
 * One report on its own page (phones, links, and "earlier reports"). Wide
 * screens show the report and the actions side by side; phones stack them,
 * with the decision list in a sheet.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useRef } from 'react';
import { View } from 'react-native';

import { Button, useLayout } from '@/design';
import { keepFilters, ReportHandle, ReportWorkspace } from '@/features/admin/moderation';
import { AdminPage } from '@/features/admin/ui';
import { useT } from '@/i18n';

export default function ModerationReport() {
  const { t } = useT();
  const router = useRouter();
  const { width, isCompact } = useLayout();
  const params = useLocalSearchParams<{ reportId: string; view?: string; q?: string }>();
  const id = Number(params.reportId);
  const view = typeof params.view === 'string' ? params.view : undefined;
  const q = typeof params.q === 'string' ? params.q : undefined;
  const ref = useRef<ReportHandle>(null);
  const wide = !isCompact && width - 252 - 56 >= 900;
  const back = () => router.push(`/admin/moderation${keepFilters(view, q)}` as any);
  return (
    <AdminPage
      title={t('ac.mod.reportN', { id: Number.isFinite(id) ? id : '—' })}
      actions={<Button label={t('ac.mod.backToQueue')} size="sm" variant="ghost" icon="arrow-back" onPress={back} testID="mod-back-queue" />}
      testID="screen-admin-moderation-report"
    >
      <View>{Number.isFinite(id) ? <ReportWorkspace ref={ref} id={id} layout={wide ? 'columns' : 'stack'} view={view} q={q} /> : null}</View>
    </AdminPage>
  );
}
