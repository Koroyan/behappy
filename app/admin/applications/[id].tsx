import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { View } from 'react-native';

import { LANGUAGE_NAMES } from '@/contexts/LanguageContext';
import { AppText, Banner, Button, Card, Divider, Icon, Press, Screen, SectionHeader, Skeleton, space, TextField, useFeedback } from '@/design';
import { StaffGate } from '@/features/account/StaffGate';
import { InfoRow, MembershipBadge, ProAvatar, VerificationBadge } from '@/features/pro/ProParts';
import { useT } from '@/i18n';
import { canStaff, useIdentity } from '@/lib/api/account';
import { ApiError } from '@/lib/api/client';
import { adminApplication, adminGrant, adminReview, MembershipState, openAdminDocument, ProProfile } from '@/lib/api/pros';

/** Which review actions each status allows (mirrors server/professional/profiles.mjs ACTIONS). */
const ACTIONS_BY_STATUS: Record<string, string[]> = {
  submitted: ['start_review', 'request_info', 'approve', 'reject'],
  under_review: ['request_info', 'approve', 'reject'],
  more_info_required: ['reject'],
  expired: ['request_info', 'approve'],
  approved: ['suspend'],
  suspended: ['reinstate'],
};
const NEEDS_MESSAGE = ['request_info', 'reject', 'suspend'];

function Check({ checked, label, onPress, testID }: { checked: boolean; label: string; onPress: () => void; testID?: string }) {
  return (
    <Press onPress={onPress} accessibilityRole="checkbox" accessibilityState={{ checked }} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 }} testID={testID}>
      <Icon name={checked ? 'checkbox' : 'square-outline'} size={22} color={checked ? 'primary' : 'textSecondary'} />
      <AppText variant="callout" style={{ flex: 1 }}>
        {label}
      </AppText>
    </Press>
  );
}

export default function AdminApplication() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const identity = useIdentity();
  const { t, formatDate, formatTime, formatPrice } = useT();
  const { confirm, toast } = useFeedback();
  const allowed = canStaff(identity, 'professionals.view');
  const [p, setP] = useState<ProProfile | null>(null);
  const [membership, setMembership] = useState<MembershipState | null>(null);
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [verifiedQuals, setVerifiedQuals] = useState<number[]>([]);
  const [message, setMessage] = useState('');
  const [note, setNote] = useState('');
  const [grantDays, setGrantDays] = useState('30');
  const [grantReason, setGrantReason] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await adminApplication(String(id));
      setP(r.professional);
      setMembership(r.membership);
      setVerifiedQuals(r.professional.qualifications.filter((q) => q.verified || r.professional.status !== 'approved').map((q) => Number(q.id)));
    } catch {
      setError(t('common.errorBody'));
    }
  }, [id, t]);

  useFocusEffect(
    useCallback(() => {
      if (allowed) load();
    }, [allowed, load])
  );

  if (!allowed) {
    return (
      <Screen back title={t('admin.applications.title')} width="reading" testID="screen-admin-application">
        <StaffGate permission="professionals.view" returnTo={`/admin/applications/${id}`} />
      </Screen>
    );
  }
  if (!p) {
    return (
      <Screen back title={t('admin.applications.title')} width="reading" testID="screen-admin-application">
        {error ? <Banner tone="danger" body={error} /> : <Skeleton height={320} radius={22} />}
      </Screen>
    );
  }

  const long = { day: 'numeric', month: 'long', year: 'numeric' } as const;
  const actions = ACTIONS_BY_STATUS[p.status] || [];
  const errText = (e: unknown) => {
    const code = e instanceof ApiError ? e.code : undefined;
    return t(`admin.applications.errors.${code && ['message_required', 'incomplete', 'bad_transition', 'cannot_review_self'].includes(code) ? code : 'generic'}`);
  };

  const act = async (action: string) => {
    setError(null);
    if (NEEDS_MESSAGE.includes(action) && message.trim().length < 5) {
      setError(t('admin.applications.errors.message_required'));
      return;
    }
    if (action === 'approve') {
      const ok = await confirm({ title: t('admin.applications.actions.approve'), body: t('admin.applications.approveConfirm', { name: p.publicName || p.legalName || '' }), confirmLabel: t('admin.applications.actions.approve') });
      if (!ok) return;
    }
    setBusy(action);
    try {
      await adminReview(p.id, { action, message: message.trim() || undefined, internalNote: note.trim() || undefined, checklist: checks, verifiedQualificationIds: action === 'approve' ? verifiedQuals : undefined });
      setMessage('');
      setNote('');
      toast(t('admin.applications.done'));
      await load();
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(null);
    }
  };

  const grant = async () => {
    setError(null);
    if (grantReason.trim().length < 3) {
      setError(t('admin.applications.grantReason'));
      return;
    }
    setBusy('grant');
    try {
      await adminGrant(p.id, Number(grantDays) || 30, grantReason.trim());
      setGrantReason('');
      toast(t('admin.applications.done'));
      await load();
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen back title={p.publicName || p.legalName || t('admin.applications.title')} subtitle={t(`pro.status.${p.status}`)} width="reading" keyboard testID="screen-admin-application" headerRight={<VerificationBadge status={p.status} />}>
      <View style={{ gap: space[5] }}>
        <Card padding={20}>
          <View style={{ gap: space[3] }}>
            <SectionHeader title={t('admin.applications.identity')} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <ProAvatar name={p.publicName || p.legalName || '?'} photoUrl={p.photoUrl} size={60} />
              <View style={{ flex: 1 }}>
                <AppText variant="title3">{p.legalName || '—'}</AppText>
                <AppText variant="small" color="textSecondary">
                  {p.publicName} · {[p.city, p.country].filter(Boolean).join(', ')}
                </AppText>
              </View>
            </View>
            <InfoRow icon="mail-outline" label={t('admin.applications.contact')} value={`${p.contactEmail || '—'} · ${p.phone || '—'}${p.phone && !p.phoneVerified ? ` (${t('admin.applications.phoneUnverified')})` : ''}`} />
            {p.verificationExpiresAt ? <InfoRow icon="shield-checkmark-outline" label={t('pro.status.approved')} value={formatDate(p.verificationExpiresAt, long)} /> : null}
            {membership ? (
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <MembershipBadge state={membership.state} />
                {membership.endsAt ? (
                  <AppText variant="caption" color="textSecondary">
                    {t('pro.endsOn', { date: formatDate(membership.endsAt, long) })}
                  </AppText>
                ) : null}
              </View>
            ) : null}
          </View>
        </Card>

        <Card padding={20}>
          <View style={{ gap: space[2] }}>
            <SectionHeader title={t('pro.apply.steps.qualifications')} />
            {p.qualifications.map((q) => (
              <Check
                key={q.id}
                checked={verifiedQuals.includes(Number(q.id))}
                onPress={() => setVerifiedQuals((list) => (list.includes(Number(q.id)) ? list.filter((x) => x !== Number(q.id)) : [...list, Number(q.id)]))}
                label={`${t(`pro.apply.qualificationKinds.${q.kind}`)}: ${q.title}${q.institution ? ` · ${q.institution}` : ''}${q.number ? ` · №${q.number}` : ''}${q.year ? ` · ${q.year}` : ''}${q.verified ? ` · ${t('admin.applications.qualificationChecked')}` : ''}`}
              />
            ))}
            <Divider />
            <SectionHeader title={t('pro.apply.documents')} />
            {p.documents.length ? (
              p.documents.map((d) => (
                <View key={d.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Icon name="document-lock-outline" size={20} color="textSecondary" />
                  <AppText variant="small" style={{ flex: 1 }} numberOfLines={1}>
                    {t(`pro.apply.documentKinds.${d.kind}`)} · {d.fileName} · {Math.ceil(d.size / 1024)} KB
                  </AppText>
                  <Button label={t('admin.applications.openDocument')} size="sm" variant="quiet" onPress={() => openAdminDocument(p.id, d.id)} testID="admin-open-document" />
                </View>
              ))
            ) : (
              <AppText variant="small" color="textSecondary">
                {t('admin.applications.noDocuments')}
              </AppText>
            )}
          </View>
        </Card>

        <Card padding={20}>
          <View style={{ gap: space[2] }}>
            <SectionHeader title={t('admin.applications.practice')} />
            <AppText variant="body">{p.bio || '—'}</AppText>
            {p.practiceAreas ? (
              <AppText variant="small" color="textSecondary">
                {p.practiceAreas}
              </AppText>
            ) : null}
            <InfoRow icon="language-outline" label={t('pro.apply.languages')} value={`${p.languages.map((l) => LANGUAGE_NAMES[l as keyof typeof LANGUAGE_NAMES] || l).join(', ') || '—'}${p.languagesConfirmed ? ' ✓' : ''}`} />
            <InfoRow icon="pricetags-outline" label={t('pro.apply.specializations')} value={p.specializations.map((s) => t(`specialists.specializations.${s}`)).join(', ') || '—'} />
            <InfoRow icon="time-outline" label={t('pro.apply.experience')} value={p.experienceYears !== null ? String(p.experienceYears) : '—'} />
            <InfoRow icon="videocam-outline" label={t('pro.apply.formats')} value={[p.offersOnline ? t('specialists.online') : null, p.offersInPerson ? t('specialists.inPerson') : null].filter(Boolean).join(', ') || '—'} />
          </View>
        </Card>

        <Card padding={20}>
          <View style={{ gap: space[2] }}>
            <SectionHeader title={t('admin.applications.services')} />
            {p.services.filter((s) => s.active !== false).map((s) => (
              <AppText key={s.id} variant="small">
                {s.title} · {s.minutes} min · {formatPrice(s.priceMinor, s.currency)} · {s.mode === 'online' ? t('specialists.online') : t('specialists.inPerson')}
              </AppText>
            ))}
            <InfoRow icon="cash-outline" label={t('pro.apply.paymentArrangement')} value={p.paymentArrangement || '—'} />
            <InfoRow icon="document-text-outline" label={t('pro.apply.cancellationPolicy')} value={`${p.cancellationPolicy || '—'} (${p.cancellationNoticeHours} h)`} />
          </View>
        </Card>

        {p.missing.length ? <Banner tone="warning" title={t('admin.applications.missing')} body={p.missing.map((m) => t(`pro.apply.missing.${m}`)).join(' · ')} /> : null}

        {actions.length ? (
          <Card padding={20}>
            <View style={{ gap: space[3] }}>
              <SectionHeader title={t('admin.applications.checklist')} />
              {(p.checklistItems || []).map((k) => (
                <Check key={k} checked={Boolean(checks[k])} onPress={() => setChecks((c) => ({ ...c, [k]: !c[k] }))} label={t(`admin.applications.checks.${k}`)} testID={`admin-check-${k}`} />
              ))}
              <TextField label={t('admin.applications.message')} value={message} onChangeText={setMessage} multiline maxLength={1500} testID="admin-message" />
              <TextField label={t('admin.applications.internalNote')} value={note} onChangeText={setNote} multiline maxLength={1500} />
              {error ? <Banner tone="danger" body={error} /> : null}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {actions.map((a) => (
                  <Button
                    key={a}
                    label={t(`admin.applications.actions.${a}`)}
                    variant={a === 'approve' || a === 'reinstate' ? 'primary' : a === 'reject' || a === 'suspend' ? 'danger' : 'secondary'}
                    size="sm"
                    loading={busy === a}
                    disabled={Boolean(busy)}
                    onPress={() => act(a)}
                    testID={`admin-action-${a}`}
                  />
                ))}
              </View>
            </View>
          </Card>
        ) : null}

        {p.status === 'approved' ? (
          <Card padding={20}>
            <View style={{ gap: space[3] }}>
              <SectionHeader title={t('admin.applications.grant')} />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TextField label={t('admin.applications.grantDays')} value={grantDays} onChangeText={(v) => setGrantDays(v.replace(/\D/g, '').slice(0, 3))} keyboardType="number-pad" containerStyle={{ width: 100 }} />
                <TextField label={t('admin.applications.grantReason')} value={grantReason} onChangeText={setGrantReason} containerStyle={{ flex: 1 }} />
              </View>
              <Button label={t('admin.applications.grant')} size="sm" variant="secondary" loading={busy === 'grant'} onPress={grant} />
            </View>
          </Card>
        ) : null}

        <View>
          <SectionHeader title={t('admin.applications.history')} />
          <Card padding={4}>
            {p.events.map((e, i) => (
              <View key={e.id}>
                {i ? <Divider /> : null}
                <View style={{ padding: 14, gap: 4 }}>
                  <AppText variant="smallStrong">
                    {e.from ? `${t(`pro.status.${e.from}`)} → ` : ''}
                    {t(`pro.status.${e.to}`)} · {e.actorKind}
                  </AppText>
                  <AppText variant="caption" color="textTertiary">
                    {formatDate(e.createdAt, { day: 'numeric', month: 'short', year: 'numeric' })} {formatTime(e.createdAt)}
                  </AppText>
                  {e.message ? <AppText variant="small">{e.message}</AppText> : null}
                  {e.internalNote ? (
                    <AppText variant="small" color="textSecondary">
                      🔒 {e.internalNote}
                    </AppText>
                  ) : null}
                </View>
              </View>
            ))}
          </Card>
        </View>
      </View>
    </Screen>
  );
}
