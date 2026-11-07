/**
 * A member's community profile for moderators: standing, reports, decisions,
 * restrictions and review requests, under their community name only. The
 * link to the account appears only for staff who may open accounts.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';

import { Button } from '@/design';
import { MemberPanel } from '@/features/admin/moderation';
import { AdminPage, Note } from '@/features/admin/ui';
import { useT } from '@/i18n';

export default function ModerationMember() {
  const { t } = useT();
  const router = useRouter();
  const params = useLocalSearchParams<{ memberRef: string }>();
  const ref = String(params.memberRef || '');
  return (
    <AdminPage
      title={t('ac.mod.member')}
      actions={<Button label={t('ac.mod.backToQueue')} size="sm" variant="ghost" icon="arrow-back" onPress={() => (router.canGoBack() ? router.back() : router.push('/admin/moderation' as any))} testID="mod-back" />}
      testID="screen-admin-moderation-member"
    >
      <Note icon="eye-off-outline">{t('ac.mod.identityNote')}</Note>
      {ref ? <MemberPanel memberRef={ref} full /> : null}
    </AdminPage>
  );
}
