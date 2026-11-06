import { useRouter } from 'expo-router';
import React from 'react';

import { Banner, Button, EmptyState } from '@/design';
import { useT } from '@/i18n';
import { useIdentity } from '@/lib/api/account';

/**
 * Shown on a staff screen the current session can't use. Someone who has the
 * role but is on a device session (for example, they registered on this
 * device) is asked to sign in with email and password; others see that the
 * area is for the BeHappy team. The server enforces the same rule.
 */
export function StaffGate({ role, returnTo }: { role: 'admin' | 'moderator'; returnTo: string }) {
  const router = useRouter();
  const identity = useIdentity();
  const { t } = useT();
  const title = t(role === 'admin' ? 'admin.staffOnly' : 'moderation.staffOnly');
  const hasRole = identity.roles.includes(role) || (role === 'moderator' && identity.roles.includes('admin'));
  if (!hasRole) return <EmptyState icon="lock-closed-outline" title={title} />;
  return (
    <Banner
      tone="info"
      title={title}
      body={t(role === 'admin' ? 'account.signInBody' : 'moderation.signInAsStaff')}
      action={<Button label={t('account.signIn')} size="sm" onPress={() => router.push(`/account/sign-in?returnTo=${encodeURIComponent(returnTo)}` as any)} testID="staff-sign-in" />}
    />
  );
}
