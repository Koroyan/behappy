/**
 * The conversation around a reported message, on its own page. It opens only
 * through a report (the report is what allows it, and the server logs each
 * view); without one there is nothing to browse.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';

import { Button, EmptyState } from '@/design';
import { ContextThread, keepFilters } from '@/features/admin/moderation';
import { AdminPage, Panel } from '@/features/admin/ui';
import { useT } from '@/i18n';

export default function ModerationMessageContext() {
  const { t } = useT();
  const router = useRouter();
  const params = useLocalSearchParams<{ messageId: string; report?: string; view?: string; q?: string }>();
  const reportId = Number(params.report);
  const view = typeof params.view === 'string' ? params.view : undefined;
  const q = typeof params.q === 'string' ? params.q : undefined;
  const hasReport = Number.isFinite(reportId) && reportId > 0;
  return (
    <AdminPage
      title={t('ac.mod.context')}
      subtitle={t('ac.mod.contextSub')}
      actions={
        hasReport ? (
          <Button label={t('ac.mod.backToReport')} size="sm" variant="ghost" icon="arrow-back" onPress={() => router.push(`/admin/moderation/reports/${reportId}${keepFilters(view, q)}` as any)} testID="mod-back-report" />
        ) : (
          <Button label={t('ac.mod.backToQueue')} size="sm" variant="ghost" icon="arrow-back" onPress={() => router.push('/admin/moderation' as any)} />
        )
      }
      testID="screen-admin-moderation-context"
    >
      <Panel>{hasReport ? <ContextThread reportId={reportId} scrollToFocus /> : <EmptyState icon="flag-outline" title={t('ac.mod.noReport')} />}</Panel>
    </AdminPage>
  );
}
