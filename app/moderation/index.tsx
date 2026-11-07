import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { View } from 'react-native';

import { AppText, Badge, Banner, Button, Card, EmptyState, Screen, Segmented, space, TextField, useFeedback } from '@/design';
import { useT } from '@/i18n';
import { canStaff, useIdentity } from '@/lib/api/account';
import { ApiError } from '@/lib/api/client';
import * as mod from '@/lib/api/moderation';
import type { ModAction, ModAppeal, ModReport, ResolveAction } from '@/lib/api/moderation';

type Tab = 'reports' | 'appeals' | 'history';

function ReportCard({ report, onDone }: { report: ModReport; onDone: () => void }) {
  const { t, tp, formatDate } = useT();
  const { toast } = useFeedback();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const room = report.roomId || report.snapshot.roomId;
  const [topic, lang] = (room || ':').split(':');
  const held = report.messageStatus === 'held';
  const act = async (action: ResolveAction, hours?: number) => {
    setBusy(action + (hours || ''));
    try {
      await mod.resolve(report.id, action, { hours, note: note.trim() || undefined });
      toast(t('moderation.done'));
      onDone();
    } catch {
      toast(t('community.errors.generic'));
    } finally {
      setBusy(null);
    }
  };
  return (
    <Card padding={18} testID="mod-report">
      <View style={{ gap: space[2] }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          {report.priority >= 3 ? <Badge label={t('moderation.urgent')} tone="danger" icon="alert-circle-outline" /> : null}
          <Badge label={t(`community.report.reasons.${report.reason}`)} tone={report.priority >= 2 ? 'peach' : 'muted'} />
          <Badge label={report.reporterKind === 'system' ? t('moderation.automatic') : t('moderation.byMember')} tone="lavender" />
          <AppText variant="caption" color="textTertiary">
            {formatDate(report.createdAt, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </AppText>
        </View>
        {room ? (
          <AppText variant="caption" color="textSecondary">
            {t('moderation.room')}: {t(`community.topics.${topic}.name`)} · {lang}
          </AppText>
        ) : null}
        <AppText variant="caption" color="textSecondary">
          {t('moderation.member')}: {report.targetPseudonym || report.snapshot.pseudonym || t('community.room.formerMember')}
          {report.priorReports ? ` · ${tp('moderation.priorReports', report.priorReports)}` : ''}
        </AppText>
        {report.snapshot.body ? (
          <Card tone="muted" padding={12}>
            <AppText variant="body" selectable>
              {report.snapshot.body}
            </AppText>
          </Card>
        ) : null}
        {report.details ? (
          <AppText variant="small" color="textSecondary" style={{ fontStyle: 'italic' }}>
            “{report.details}”
          </AppText>
        ) : null}
        {report.messageStatus && report.messageStatus !== 'visible' && report.messageStatus !== 'held' ? (
          <AppText variant="caption" color="textTertiary">
            {t('moderation.messageGone')}
          </AppText>
        ) : null}
        <TextField value={note} onChangeText={setNote} placeholder={t('moderation.note')} maxLength={500} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {report.targetType === 'message' && held ? <Button label={t('moderation.actions.approve_message')} size="sm" variant="secondary" onPress={() => act('approve_message')} loading={busy === 'approve_message'} testID="mod-approve" /> : null}
          {report.targetType === 'message' && report.messageStatus !== 'removed' ? <Button label={t('moderation.actions.remove_message')} size="sm" variant="danger" onPress={() => act('remove_message')} loading={busy === 'remove_message'} testID="mod-remove" /> : null}
          <Button label={t('moderation.actions.warn')} size="sm" variant="quiet" onPress={() => act('warn')} loading={busy === 'warn'} />
          <Button label={t('moderation.actions.suspend')} size="sm" variant="quiet" onPress={() => act('suspend', 24)} loading={busy === 'suspend24'} />
          <Button label={t('moderation.actions.suspend7')} size="sm" variant="quiet" onPress={() => act('suspend', 24 * 7)} loading={busy === 'suspend168'} />
          <Button label={t('moderation.actions.ban')} size="sm" variant="quiet" onPress={() => act('ban')} loading={busy === 'ban'} />
          <Button label={t('moderation.actions.dismiss')} size="sm" variant="outline" onPress={() => act('dismiss')} loading={busy === 'dismiss'} testID="mod-dismiss" />
        </View>
      </View>
    </Card>
  );
}

function AppealCard({ appeal, onDone }: { appeal: ModAppeal; onDone: () => void }) {
  const { t, formatDate } = useT();
  const { toast } = useFeedback();
  const [note, setNote] = useState('');
  const decide = async (d: 'upheld' | 'overturned') => {
    try {
      await mod.decideAppeal(appeal.id, d, note.trim() || undefined);
      toast(t('moderation.done'));
      onDone();
    } catch (e) {
      toast(e instanceof ApiError && e.code === 'own_decision' ? t('moderation.ownDecision') : t('community.errors.generic'));
    }
  };
  return (
    <Card padding={18}>
      <View style={{ gap: space[2] }}>
        <AppText variant="bodyStrong">{appeal.pseudonym || t('community.room.formerMember')}</AppText>
        <AppText variant="caption" color="textSecondary">
          {appeal.suspensionReason} · {formatDate(appeal.createdAt, { day: 'numeric', month: 'short' })}
        </AppText>
        <Card tone="muted" padding={12}>
          <AppText variant="body">{appeal.body}</AppText>
        </Card>
        <TextField value={note} onChangeText={setNote} placeholder={t('moderation.note')} maxLength={500} />
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <Button label={t('moderation.appealOverturn')} size="sm" variant="secondary" onPress={() => decide('overturned')} />
          <Button label={t('moderation.appealUphold')} size="sm" variant="outline" onPress={() => decide('upheld')} />
        </View>
      </View>
    </Card>
  );
}

export default function ModerationScreen() {
  const router = useRouter();
  const { t, tp, formatDate } = useT();
  const identity = useIdentity();
  const staff = canStaff(identity, 'moderation.act');
  const [tab, setTab] = useState<Tab>('reports');
  const [reports, setReports] = useState<ModReport[]>([]);
  const [appeals, setAppeals] = useState<ModAppeal[]>([]);
  const [actions, setActions] = useState<ModAction[]>([]);
  const [counts, setCounts] = useState({ openReports: 0, urgentReports: 0, openAppeals: 0 });

  const load = useCallback(async () => {
    if (!staff) return;
    try {
      const [s, r, a, h] = await Promise.all([mod.summary(), mod.listReports(), mod.listAppeals(), mod.history()]);
      setCounts(s);
      setReports(r);
      setAppeals(a);
      setActions(h.actions);
    } catch {
      // stays empty; the server enforces access
    }
  }, [staff]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (!staff) {
    return (
      <Screen back title={t('moderation.title')} width="reading" testID="screen-moderation">
        <Banner tone="info" title={t('moderation.staffOnly')} body={t('moderation.signInAsStaff')} action={<Button label={t('account.signIn')} size="sm" onPress={() => router.push('/account/sign-in' as any)} />} />
      </Screen>
    );
  }

  return (
    <Screen back title={t('moderation.title')} subtitle={t('moderation.subtitle')} testID="screen-moderation">
      <View style={{ gap: space[4] }}>
        <Segmented<Tab>
          label={t('moderation.title')}
          value={tab}
          onChange={setTab}
          options={[
            { value: 'reports', label: `${t('moderation.reports')} (${counts.openReports})` },
            { value: 'appeals', label: `${t('moderation.appeals')} (${counts.openAppeals})` },
            { value: 'history', label: t('moderation.history') },
          ]}
        />
        {counts.urgentReports ? <Banner tone="danger" body={`${t('moderation.urgent')}: ${tp('moderation.open', counts.urgentReports)}`} /> : null}
        {tab === 'reports' ? (
          reports.length ? (
            reports.map((r) => <ReportCard key={r.id} report={r} onDone={load} />)
          ) : (
            <EmptyState icon="shield-checkmark-outline" title={t('moderation.reports')} body={t('moderation.empty')} />
          )
        ) : tab === 'appeals' ? (
          appeals.length ? appeals.map((a) => <AppealCard key={a.id} appeal={a} onDone={load} />) : <EmptyState icon="chatbox-ellipses-outline" title={t('moderation.appeals')} body={t('moderation.noAppeals')} />
        ) : actions.length ? (
          <Card padding={8}>
            {actions.map((a) => (
              <View key={a.id} style={{ paddingHorizontal: 12, paddingVertical: 10 }}>
                <AppText variant="callout">{t(`moderation.actionNames.${a.action}`)}</AppText>
                <AppText variant="caption" color="textSecondary">
                  {[a.targetPseudonym, a.reason, a.note, formatDate(a.createdAt, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })].filter(Boolean).join(' · ')}
                </AppText>
              </View>
            ))}
          </Card>
        ) : (
          <EmptyState icon="time-outline" title={t('moderation.history')} body={t('moderation.noHistory')} />
        )}
      </View>
    </Screen>
  );
}
