/**
 * Moderation 2.0 building blocks: queue rows, the report (evidence kept vs.
 * what the message is now), the conversation around a reported message, the
 * member's community profile and the action panel.
 *
 * Every call goes to /api/admin, where the server checks the permission,
 * keeps real identities out of moderation responses and logs each context
 * view. These components only arrange what the server returns.
 */
import { useRouter } from 'expo-router';
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react';
import { Platform, ScrollView, View } from 'react-native';

import { AppText, Button, Icon, Press, Sheet, useFeedback, useLayout } from '@/design';
import { useT } from '@/i18n';

import { useAdmin } from './AdminProvider';
import { adminGet, adminPost, errorCode, qs, useAdminData } from './api';
import { useAdminColors } from './theme';
import { AdminState, KeyValues, Note, Panel, Pill, Tone, useFmt } from './ui';

// ---------- Views, labels, errors ----------
export type ModView = 'open' | 'urgent' | 'mine' | 'unassigned' | 'in_review' | 'appeals' | 'resolved' | 'dismissed' | 'all';
export const MOD_VIEWS: ModView[] = ['open', 'urgent', 'mine', 'unassigned', 'in_review', 'appeals', 'resolved', 'dismissed', 'all'];
export const isModView = (v: unknown): v is ModView => typeof v === 'string' && (MOD_VIEWS as string[]).includes(v);

export type Decision = 'dismiss' | 'remove_message' | 'approve_message' | 'warn' | 'restrict_24h' | 'restrict_7d' | 'restrict_custom' | 'restrict_permanent';

const KNOWN_ERRORS = new Set(['second_reviewer_required', 'already_resolved', 'not_open', 'bad_assignee', 'reason_required', 'note_required', 'not_removed', 'no_context', 'own_decision', 'member_not_found']);

export function useModError() {
  const { t } = useT();
  return useCallback((e: unknown) => {
    const code = errorCode(e);
    return KNOWN_ERRORS.has(code) ? t(`ac.mod.errors.${code}`) : t('ac.common.failed', { code });
  }, [t]);
}

/** Labels for report reasons (the same list members choose from). */
export function useReasonLabel() {
  const { t } = useT();
  return useCallback((reason: string | null | undefined) => {
    if (!reason) return '—';
    const key = `ac.safety.reasons.${reason}`;
    const v = t(key);
    return v === key ? reason : v;
  }, [t]);
}

const statusTone = (s: string): Tone => (s === 'open' ? 'info' : s === 'in_review' ? 'brand' : s === 'resolved' ? 'good' : 'neutral');
const messageTone = (s: string): Tone => (s === 'visible' ? 'good' : s === 'held' ? 'warning' : 'neutral');
const standingTone = (s: string): Tone => (s === 'good' ? 'good' : s === 'warned' || s === 'past_actions' ? 'warning' : 'danger');

/** Query string that keeps the queue filters when moving between pages. */
export const keepFilters = (view?: string, q?: string) => qs({ view: view && view !== 'open' ? view : undefined, q: q || undefined });

export function PriorityPill({ priority }: { priority: number }) {
  const { t } = useT();
  if (priority >= 3) return <Pill label={t('ac.mod.urgent')} tone="danger" icon="alert-circle-outline" />;
  if (priority === 2) return <Pill label={t('ac.mod.raised')} tone="warning" />;
  return null;
}

// ---------- Queue rows ----------
export interface QueueItem {
  id: number;
  priority: number;
  reason: string;
  status: string;
  source: 'member' | 'automatic';
  createdAt: number;
  resolvedAt: number | null;
  target: 'message' | 'member';
  messageId: number | null;
  messageStatus: string | null;
  roomId: string | null;
  member: { ref: string; pseudonym: string } | null;
  snippet: string | null;
  assignedTo: { id: string; label: string | null; me: boolean } | null;
  secondReview: boolean;
}

export function QueueRow({ r, selected, onPress }: { r: QueueItem; selected?: boolean; onPress: () => void }) {
  const c = useAdminColors();
  const { t } = useT();
  const f = useFmt();
  const reason = useReasonLabel();
  const done = r.status === 'resolved' || r.status === 'dismissed';
  return (
    <Press
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(selected) }}
      accessibilityLabel={`${t('ac.mod.reportN', { id: r.id })}, ${reason(r.reason)}`}
      testID={`mod-row-${r.id}`}
      style={{ padding: 12, borderRadius: 12, borderWidth: selected ? 2 : 1, borderColor: selected ? c.primary : c.border, backgroundColor: selected ? c.cardMuted : c.card, gap: 6 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <PriorityPill priority={r.priority} />
        <AppText variant="smallStrong" style={{ color: c.text, flexShrink: 1 }} numberOfLines={1}>
          {reason(r.reason)}
        </AppText>
        <View style={{ flex: 1 }} />
        <AppText variant="caption" style={{ color: c.textMuted }}>
          {f.dateTime(r.createdAt)}
        </AppText>
      </View>
      {r.snippet ? (
        <AppText variant="small" style={{ color: c.textSecondary }} numberOfLines={2}>
          “{r.snippet}”
        </AppText>
      ) : r.target === 'member' ? (
        <AppText variant="small" style={{ color: c.textSecondary }}>
          {t('ac.mod.aboutMember')}
        </AppText>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <AppText variant="caption" style={{ color: c.textMuted }}>
          #{r.id}
          {r.member ? ` · ${r.member.pseudonym}` : ''}
          {r.roomId ? ` · ${r.roomId}` : ''}
        </AppText>
        {done ? (
          <Pill label={t(`ac.mod.status.${r.status}`)} tone={statusTone(r.status)} />
        ) : (
          <AppText variant="caption" style={{ color: r.assignedTo ? c.textSecondary : c.textMuted }}>
            {r.assignedTo ? (r.assignedTo.me ? t('ac.mod.takenByMe') : t('ac.mod.takenBy', { who: r.assignedTo.label || '—' })) : t('ac.mod.notTaken')}
          </AppText>
        )}
        {r.secondReview && !done ? <Pill label={t('ac.mod.secondReview')} tone="info" /> : null}
        {r.source === 'automatic' ? <Pill label={t('ac.mod.source.automatic')} tone="neutral" icon="hardware-chip-outline" /> : null}
      </View>
    </Press>
  );
}

export interface AppealItem {
  id: number;
  body: string;
  status: string;
  createdAt: number;
  suspensionKind: string | null;
  suspensionReason: string | null;
  suspensionEndsAt: number | null;
  suspensionLifted: boolean;
  pseudonym: string | null;
  memberRef: string | null;
}

export function AppealRow({ a, selected, onPress }: { a: AppealItem; selected?: boolean; onPress: () => void }) {
  const c = useAdminColors();
  const { t } = useT();
  const f = useFmt();
  return (
    <Press
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(selected) }}
      testID={`mod-appeal-${a.id}`}
      style={{ padding: 12, borderRadius: 12, borderWidth: selected ? 2 : 1, borderColor: selected ? c.primary : c.border, backgroundColor: selected ? c.cardMuted : c.card, gap: 6 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <AppText variant="smallStrong" style={{ color: c.text, flex: 1 }} numberOfLines={1}>
          {t('ac.mod.appeal', { id: a.id })}
        </AppText>
        <AppText variant="caption" style={{ color: c.textMuted }}>
          {f.dateTime(a.createdAt)}
        </AppText>
      </View>
      <AppText variant="small" style={{ color: c.textSecondary }} numberOfLines={2}>
        “{a.body}”
      </AppText>
      <AppText variant="caption" style={{ color: c.textMuted }}>
        {a.pseudonym || t('ac.mod.former')}
        {a.suspensionKind ? ` · ${t(`ac.mod.kind.${a.suspensionKind}`)}` : ''}
      </AppText>
    </Press>
  );
}

// ---------- The conversation around a reported message ----------
interface ContextMessage {
  id: number;
  author: { kind: string; pseudonym: string | null; ref: string | null; formerMember: boolean };
  body: string;
  status: string;
  replyTo: { pseudonym: string | null; snippet: string; hidden: boolean } | null;
  createdAt: number;
  isFocus: boolean;
}

export function ContextThread({ reportId, scrollToFocus = false }: { reportId: number; scrollToFocus?: boolean }) {
  const c = useAdminColors();
  const { t } = useT();
  const f = useFmt();
  const [size, setSize] = useState(5);
  const q = useAdminData<{ messages: ContextMessage[]; focusFound: boolean; room: any }>(`/moderation/reports/${reportId}/context`, { before: size, after: size });
  const d = q.data;
  // On its own page, bring the reported message into view.
  useEffect(() => {
    if (!scrollToFocus || !d || Platform.OS !== 'web' || typeof document === 'undefined') return;
    const el = document.querySelector('[data-testid="mod-context-focus"]') as HTMLElement | null;
    el?.scrollIntoView?.({ block: 'center' });
  }, [d, scrollToFocus]);
  return (
    <AdminState error={q.error} loading={q.loading} hasData={Boolean(d)} onRetry={q.reload}>
      {d ? (
        <View style={{ gap: 8 }} testID="mod-context">
          {!d.focusFound ? <Note tone="warning">{t('ac.mod.focusMissing')}</Note> : null}
          {d.messages.map((m) => {
            const who = m.author.kind === 'anulia' ? 'Bea' : m.author.formerMember ? t('ac.mod.former') : m.author.pseudonym || '—';
            const placeholder = m.status === 'removed' ? t('ac.mod.removedText') : m.status === 'deleted' ? t('ac.mod.deletedText') : null;
            return (
              <View
                key={m.id}
                testID={m.isFocus ? 'mod-context-focus' : undefined}
                style={{
                  borderRadius: 12,
                  padding: 10,
                  gap: 4,
                  borderWidth: m.isFocus ? 2 : 1,
                  borderColor: m.isFocus ? c.warning : c.border,
                  backgroundColor: m.isFocus ? c.warningSoft : m.author.kind === 'anulia' ? c.infoSoft : c.card,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  {m.isFocus ? <Icon name="flag" size={14} color={c.warning} /> : null}
                  <AppText variant="smallStrong" style={{ color: c.text }}>
                    {who}
                  </AppText>
                  <AppText variant="caption" style={{ color: c.textMuted }}>
                    {f.dateTime(m.createdAt)} · #{m.id}
                  </AppText>
                  {m.status !== 'visible' ? <Pill label={t(`ac.mod.messageStatus.${m.status}`)} tone={messageTone(m.status)} /> : null}
                  {m.isFocus ? <Pill label={t('ac.mod.reported')} tone="warning" /> : null}
                </View>
                {m.replyTo ? (
                  <AppText variant="caption" style={{ color: c.textMuted }} numberOfLines={1}>
                    ↳ {t('ac.mod.replyTo', { who: m.replyTo.pseudonym || t('ac.mod.former') })}
                    {m.replyTo.hidden ? '' : `: ${m.replyTo.snippet}`}
                  </AppText>
                ) : null}
                <AppText variant="small" style={{ color: placeholder ? c.textMuted : c.text, fontStyle: placeholder ? 'italic' : 'normal' }}>
                  {placeholder || m.body}
                </AppText>
              </View>
            );
          })}
          {size < 10 ? <Button label={t('ac.mod.contextMore')} variant="ghost" size="sm" icon="expand-outline" onPress={() => setSize(10)} testID="mod-context-more" /> : null}
        </View>
      ) : null}
    </AdminState>
  );
}

// ---------- Member profile (community side only) ----------
export function MemberPanel({ memberRef, reportId, onChanged, full = false }: { memberRef: string; reportId?: number; onChanged?: () => void; full?: boolean }) {
  const c = useAdminColors();
  const { t } = useT();
  const f = useFmt();
  const router = useRouter();
  const { act, ask, can } = useAdmin();
  const { toast } = useFeedback();
  const errText = useModError();
  const reason = useReasonLabel();
  const q = useAdminData<any>(can('moderation.members.view') ? `/moderation/members/${encodeURIComponent(memberRef)}` : null);
  const d = q.data;

  const run = async (fn: () => Promise<unknown>, done: string) => {
    try {
      await act(fn);
      toast(done);
      q.reload();
      onChanged?.();
    } catch (e) {
      toast(errText(e));
    }
  };
  const lift = async () => {
    const note = await ask({ title: t('ac.mod.liftTitle'), body: t('ac.mod.reasonBody'), min: 3 });
    if (note) await run(() => adminPost(`/moderation/restrictions/${d.member.activeRestriction.id}/lift`, { note }), t('ac.mod.lifted'));
  };
  const restrict = async () => {
    const hours = await ask({ title: t('ac.mod.restrictTitle'), label: t('ac.mod.restrictHours'), min: 1, multiline: false, initial: '24' });
    if (!hours) return;
    const h = Number(hours);
    if (!(h >= 1 && h <= 2160)) return toast(t('ac.mod.badHours'));
    const why = await ask({ title: t('ac.mod.restrictTitle'), body: t('ac.mod.reasonBody'), min: 3 });
    if (why) await run(() => adminPost(`/moderation/members/${encodeURIComponent(memberRef)}/restrict`, { hours: h, reason: why, reportId }), t('ac.mod.restricted'));
  };

  if (!can('moderation.members.view')) return null;
  return (
    <Panel
      title={full ? undefined : t('ac.mod.member')}
      actions={!full && d ? <Button label={t('ac.mod.openMember')} size="sm" variant="ghost" iconRight="chevron-forward" onPress={() => router.push(`/admin/moderation/members/${encodeURIComponent(memberRef)}` as any)} testID="mod-open-member" /> : undefined}
      testID="mod-member"
    >
      <AdminState error={q.error} loading={q.loading} hasData={Boolean(d)} onRetry={q.reload}>
        {d ? (
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
                <AppText variant="bodyStrong" style={{ color: c.accentText }}>
                  {(d.member.pseudonym || '?').slice(0, 1).toUpperCase()}
                </AppText>
              </View>
              <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
                <AppText variant="bodyStrong" style={{ color: c.text }} testID="mod-member-name">
                  {d.member.pseudonym}
                </AppText>
                <AppText variant="caption" style={{ color: c.textMuted }}>
                  {t('ac.mod.memberSince', { date: f.date(d.member.since) })}
                </AppText>
              </View>
            </View>
            <View style={{ flexDirection: 'row' }}>
              <Pill label={t(`ac.mod.standing.${d.member.standing}`)} tone={standingTone(d.member.standing)} />
            </View>
            <KeyValues
              items={[
                [t('ac.mod.counts.messages'), f.num(d.member.messages)],
                [t('ac.mod.counts.removed'), f.num(d.member.removedMessages)],
                [t('ac.mod.counts.reports'), f.num(d.member.reportsAgainst)],
                [t('ac.mod.counts.warnings'), f.num(d.member.warnings)],
                [t('ac.mod.counts.rooms'), f.num(d.member.roomsJoined)],
              ]}
            />
            {d.member.activeRestriction ? (
              <View style={{ backgroundColor: c.dangerSoft, borderRadius: 12, padding: 12, gap: 6 }} testID="mod-member-restriction">
                <AppText variant="smallStrong" style={{ color: c.text }}>
                  {t('ac.mod.activeRestriction')} · {d.member.activeRestriction.endsAt ? t('ac.mod.until', { date: f.dateTime(d.member.activeRestriction.endsAt) }) : t('ac.mod.permanently')}
                </AppText>
                {d.member.activeRestriction.reason ? (
                  <AppText variant="small" style={{ color: c.textSecondary }}>
                    {d.member.activeRestriction.reason}
                  </AppText>
                ) : null}
                {can('moderation.act') ? <Button label={t('ac.mod.lift')} size="sm" variant="secondary" onPress={lift} testID="mod-lift" /> : null}
              </View>
            ) : can('moderation.act') ? (
              <Button label={t('ac.mod.restrict')} size="sm" variant="outline" icon="pause-circle-outline" onPress={restrict} testID="mod-restrict" />
            ) : null}
            {d.accountId && can('users.view') ? (
              <Button label={t('ac.mod.openAccount')} size="sm" variant="ghost" icon="person-outline" onPress={() => router.push(`/admin/users/${encodeURIComponent(d.accountId)}?tab=community` as any)} testID="mod-open-account" />
            ) : (
              <AppText variant="caption" style={{ color: c.textMuted }}>
                {t('ac.mod.identityNote')}
              </AppText>
            )}
            {full ? (
              <>
                <MemberList title={t('ac.mod.reports')} rows={d.reports} render={(r: any) => `#${r.id} · ${reason(r.reason)} · ${t(`ac.mod.status.${r.status}`)} · ${f.date(r.at)}`} onPress={(r: any) => router.push(`/admin/moderation/reports/${r.id}` as any)} />
                <MemberList title={t('ac.mod.decisions')} rows={d.decisions} render={(a: any) => `${actLabel(t, a.action)}${a.hours ? ` (${t('ac.mod.hoursN', { n: a.hours })})` : ''}${a.reason ? ` · ${a.reason}` : ''} · ${f.date(a.at)}`} />
                <MemberList title={t('ac.mod.restrictions')} rows={d.restrictions} render={(s: any) => `${t(`ac.mod.kind.${s.kind}`)} · ${f.date(s.startsAt)}${s.endsAt ? ` → ${f.date(s.endsAt)}` : ''}${s.lifted ? ` · ${t('ac.mod.liftedTag')}` : ''}${s.reason ? ` · ${s.reason}` : ''}`} />
                <MemberList title={t('ac.mod.appealsList')} rows={d.appeals} render={(a: any) => `#${a.id} · ${t(`ac.moderation.appealStates.${a.status}`)} · ${f.date(a.at)}`} />
                <MemberList title={t('ac.mod.reportedRooms')} note={t('ac.mod.reportedRoomsNote')} rows={d.reportedRooms} render={(r: any) => `${r.roomId} · ${f.num(r.reports)}`} />
              </>
            ) : null}
          </View>
        ) : null}
      </AdminState>
    </Panel>
  );
}

function MemberList({ title, note, rows, render, onPress }: { title: string; note?: string; rows: any[]; render: (r: any) => string; onPress?: (r: any) => void }) {
  const c = useAdminColors();
  const { t } = useT();
  return (
    <View style={{ gap: 6 }}>
      <AppText variant="label" style={{ color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.6 }}>
        {title}
      </AppText>
      {note ? (
        <AppText variant="caption" style={{ color: c.textMuted }}>
          {note}
        </AppText>
      ) : null}
      {rows.length ? (
        rows.map((r, i) =>
          onPress ? (
            <Press key={r.id ?? i} onPress={() => onPress(r)} accessibilityRole="link" style={{ paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <AppText variant="small" style={{ color: c.primary, flex: 1 }}>
                {render(r)}
              </AppText>
              <Icon name="chevron-forward" size={14} color={c.textMuted} />
            </Press>
          ) : (
            <AppText key={r.id ?? i} variant="small" style={{ color: c.textSecondary, paddingVertical: 4 }}>
              {render(r)}
            </AppText>
          )
        )
      ) : (
        <AppText variant="small" style={{ color: c.textMuted }}>
          {t('ac.mod.none')}
        </AppText>
      )}
    </View>
  );
}

export const actLabel = (t: (k: string, v?: any) => string, action: string) => {
  const key = `ac.mod.act.${action}`;
  const v = t(key);
  return v === key ? action : v;
};

// ---------- The report workspace ----------
export interface ReportHandle {
  take: () => void;
  note: () => void;
  context: () => void;
  decide: (d: Decision) => void;
  escalate: () => void;
  openDecisions: () => void;
}

const DECISIONS: Decision[] = ['dismiss', 'remove_message', 'approve_message', 'warn', 'restrict_24h', 'restrict_7d', 'restrict_custom', 'restrict_permanent'];

/**
 * One report: summary, evidence and current state, the conversation (on
 * request), notes and history on one side; actions and the member on the
 * other. `layout` decides how the two sides sit: in scrolling panes (the
 * command center), side by side on a page, or stacked (phones).
 */
export const ReportWorkspace = forwardRef<ReportHandle, { id: number; layout: 'panes' | 'columns' | 'stack'; onChanged?: () => void; view?: string; q?: string }>(function ReportWorkspace({ id, layout, onChanged, view, q: search }, ref) {
  const c = useAdminColors();
  const { t } = useT();
  const f = useFmt();
  const router = useRouter();
  const { isCompact } = useLayout();
  const { act, ask, can } = useAdmin();
  const { toast } = useFeedback();
  const errText = useModError();
  const reason = useReasonLabel();
  const q = useAdminData<any>(`/moderation/reports/${id}`);
  const d = q.data;
  const [contextOpen, setContextOpen] = useState(false);
  const [decisionsOpen, setDecisionsOpen] = useState(false);
  const [assignees, setAssignees] = useState<{ id: string; label: string; me: boolean }[] | null>(null);

  const open = d && ['open', 'in_review'].includes(d.report.status);
  const blocked = Boolean(d?.report.secondReview?.byMe);
  const isMessage = d?.report.target === 'message';
  const available: Decision[] = d
    ? DECISIONS.filter((x) => {
        if (x === 'remove_message') return isMessage && d.current && ['visible', 'held'].includes(d.current.status);
        if (x === 'approve_message') return isMessage && d.current?.status === 'held';
        if (x === 'dismiss') return true;
        return Boolean(d.member);
      })
    : [];

  const run = async (fn: () => Promise<unknown>, done: string) => {
    try {
      await act(fn);
      toast(done);
      q.reload();
      onChanged?.();
      return true;
    } catch (e) {
      toast(errText(e));
      return false;
    }
  };
  const base = `/moderation/reports/${id}`;
  const take = () => (open ? run(() => adminPost(`${base}/assign`, {}), t('ac.mod.taken')) : undefined);
  const note = async () => {
    const body = await ask({ title: t('ac.mod.noteTitle'), body: t('ac.mod.noteBody'), min: 2 });
    if (body) await run(() => adminPost(`${base}/notes`, { body }), t('ac.mod.noteAdded'));
  };
  const second = async () => {
    const why = await ask({ title: t('ac.mod.secondTitle'), body: t('ac.mod.secondBody'), min: 5 });
    if (why) await run(() => adminPost(`${base}/second-review`, { reason: why }), t('ac.mod.secondAsked'));
  };
  const escalate = async () => {
    if (!can('safety.manage')) return;
    const body = await ask({ title: t('ac.mod.escalateTitle'), body: t('ac.mod.escalateBody'), min: 10 });
    if (body) await run(() => adminPost(`${base}/escalate`, { note: body }), t('ac.mod.escalated'));
  };
  const restore = async () => {
    const why = await ask({ title: t('ac.mod.restoreTitle'), body: t('ac.mod.reasonBody'), min: 3 });
    if (why) await run(() => adminPost(`${base}/restore`, { reason: why }), t('ac.mod.restored'));
  };
  const pickAssignee = async () => {
    try {
      const r = await adminGet<{ moderators: { id: string; label: string; me: boolean }[] }>('/moderation/moderators');
      setAssignees(r.moderators);
    } catch (e) {
      toast(errText(e));
    }
  };
  const decide = async (x: Decision) => {
    if (!d || !open || blocked || !available.includes(x)) return;
    setDecisionsOpen(false);
    const label = t(`ac.mod.decision.${x}`);
    let hours: number | undefined;
    if (x === 'restrict_custom') {
      const h = await ask({ title: t('ac.mod.hoursTitle'), label: t('ac.mod.restrictHours'), min: 1, multiline: false, initial: '48' });
      if (!h) return;
      hours = Number(h);
      if (!(hours >= 1 && hours <= 2160)) return toast(t('ac.mod.badHours'));
    }
    let why = '';
    if (x !== 'approve_message') {
      const r = await ask({ title: t('ac.mod.reasonTitle', { action: label }), body: t('ac.mod.reasonBody'), min: 3, destructive: x === 'restrict_permanent' || x === 'remove_message', confirmLabel: label });
      if (!r) return;
      why = r;
    }
    await run(() => adminPost(`${base}/decide`, { action: x, reason: why, hours }), t('ac.mod.done', { action: label }));
  };

  useImperativeHandle(ref, () => ({
    take: () => void take(),
    note: () => void note(),
    context: () => setContextOpen((v) => !v),
    decide: (x) => void decide(x),
    escalate: () => void escalate(),
    openDecisions: () => setDecisionsOpen(true),
  }));

  if (!d) {
    return (
      <View style={{ padding: layout === 'panes' ? 4 : 0 }}>
        <AdminState error={q.error} loading={q.loading} hasData={false} onRetry={q.reload}>
          {null}
        </AdminState>
      </View>
    );
  }

  const r = d.report;
  const reporter = r.source === 'automatic' ? t('ac.mod.byAutomatic') : r.reporter?.pseudonym || t('ac.mod.byFormer');
  const filters = keepFilters(view, search);
  const sideBySide = !isCompact && layout !== 'panes';

  const summary = (
    <Panel testID="mod-report">
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <AppText variant="title3" style={{ color: c.text }} accessibilityRole="header">
          {t('ac.mod.reportN', { id: r.id })}
        </AppText>
        <Pill label={t(`ac.mod.status.${r.status}`)} tone={statusTone(r.status)} />
        <PriorityPill priority={r.priority} />
        <Pill label={t(`ac.mod.source.${r.source}`)} tone="neutral" />
      </View>
      <AppText variant="bodyStrong" style={{ color: c.text }}>
        {reason(r.reason)}
      </AppText>
      <AppText variant="caption" style={{ color: c.textMuted }}>
        {t('ac.mod.reportedAt', { date: f.dateTime(r.createdAt) })} · {t('ac.mod.reportedBy', { who: reporter })}
      </AppText>
      {r.details ? (
        <View style={{ gap: 2 }}>
          <AppText variant="label" style={{ color: c.textMuted }}>
            {t('ac.mod.details')}
          </AppText>
          <AppText variant="small" style={{ color: c.text }}>
            {r.details}
          </AppText>
        </View>
      ) : null}
      {r.secondReview ? <Note tone="warning">{r.secondReview.byMe ? t('ac.mod.secondByMe') : t('ac.mod.secondByOther', { reason: r.secondReview.reason || '—' })}</Note> : null}
      {!open && r.resolution ? (
        <KeyValues items={[[t('ac.mod.decided'), t('ac.mod.decidedLine', { status: actLabel(t, r.resolution), date: f.dateTime(r.resolvedAt) })], ...(r.resolutionNote ? ([[t('ac.mod.details'), r.resolutionNote]] as [string, string][]) : [])]} />
      ) : null}
      {d.safetyIncident && can('safety.view') ? <Button label={t('ac.mod.openCase')} size="sm" variant="ghost" icon="heart-circle-outline" onPress={() => router.push(`/admin/safety/${d.safetyIncident.id}` as any)} /> : null}
    </Panel>
  );

  const evidence = isMessage ? (
    <Panel title={t('ac.mod.evidence')} subtitle={t('ac.mod.evidenceNote')} testID="mod-evidence">
      <View style={{ flexDirection: sideBySide ? 'row' : 'column', gap: 12 }}>
        <View style={{ flex: sideBySide ? 1 : undefined, gap: 6, backgroundColor: c.cardMuted, borderRadius: 12, padding: 12 }}>
          <AppText variant="label" style={{ color: c.textMuted }}>
            {d.evidence.pseudonym || d.member?.pseudonym || '—'}
          </AppText>
          <AppText variant="body" style={{ color: d.evidence.body ? c.text : c.textMuted }} testID="mod-evidence-body">
            {d.evidence.body ?? t('ac.mod.evidenceGone')}
          </AppText>
        </View>
        <View style={{ flex: sideBySide ? 1 : undefined, gap: 6, borderWidth: 1, borderColor: c.border, borderRadius: 12, padding: 12 }}>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <AppText variant="label" style={{ color: c.textMuted }}>
              {t('ac.mod.now')}
            </AppText>
            {d.current ? <Pill label={t(`ac.mod.messageStatus.${d.current.status}`)} tone={messageTone(d.current.status)} /> : null}
          </View>
          <AppText variant="small" style={{ color: c.textSecondary }}>
            {d.current?.visibleToMembers ? t('ac.mod.nowVisible') : t('ac.mod.nowHidden')}
          </AppText>
          {d.current?.room ? (
            <AppText variant="caption" style={{ color: c.textMuted }}>
              {t('ac.mod.room')}: {d.current.room.id}
              {d.current.room.archived ? ` · ${t('ac.mod.archived')}` : ''}
              {d.current.room.paused ? ` · ${t('ac.mod.paused')}` : ''}
            </AppText>
          ) : null}
          {d.current?.removalReason ? (
            <AppText variant="caption" style={{ color: c.textMuted }}>
              {reason(d.current.removalReason)}
            </AppText>
          ) : null}
        </View>
      </View>
    </Panel>
  ) : (
    <Note>{t('ac.mod.aboutMember')}</Note>
  );

  const context =
    isMessage && can('moderation.context') ? (
      <Panel
        title={t('ac.mod.context')}
        subtitle={t('ac.mod.contextSub')}
        actions={contextOpen ? <Button label={t('ac.mod.openContext')} size="sm" variant="ghost" iconRight="open-outline" onPress={() => router.push(`/admin/moderation/messages/${d.current?.messageId || 0}${qs({ report: r.id, view: view && view !== 'open' ? view : undefined, q: search || undefined })}` as any)} testID="mod-context-page" /> : undefined}
      >
        {contextOpen ? <ContextThread reportId={r.id} /> : <Button label={t('ac.mod.showContext')} variant="secondary" icon="chatbubbles-outline" onPress={() => setContextOpen(true)} testID="mod-show-context" />}
      </Panel>
    ) : null;

  const notes = (
    <Panel title={t('ac.mod.notes')} actions={<Button label={t('ac.mod.note')} size="sm" variant="ghost" icon="create-outline" onPress={note} testID="mod-note" />}>
      {d.notes.length ? (
        d.notes.map((n: any) => (
          <View key={n.id} style={{ gap: 2 }}>
            <AppText variant="small" style={{ color: c.text }}>
              {n.body}
            </AppText>
            <AppText variant="caption" style={{ color: c.textMuted }}>
              {n.author || '—'} · {f.dateTime(n.at)}
            </AppText>
          </View>
        ))
      ) : (
        <AppText variant="small" style={{ color: c.textMuted }}>
          {t('ac.mod.noNotes')}
        </AppText>
      )}
    </Panel>
  );

  const history = (
    <Panel title={t('ac.mod.history')} testID="mod-history">
      {d.history.length ? (
        d.history.map((h: any) => (
          <View key={h.id} style={{ gap: 2 }}>
            <AppText variant="smallStrong" style={{ color: c.text }}>
              {actLabel(t, h.action)}
              {h.hours ? ` · ${t('ac.mod.hoursN', { n: h.hours })}` : ''}
            </AppText>
            <AppText variant="caption" style={{ color: c.textMuted }}>
              {h.actor || '—'} · {f.dateTime(h.at)}
              {h.reason ? ` · ${h.reason}` : ''}
              {h.note ? ` · ${h.note}` : ''}
            </AppText>
          </View>
        ))
      ) : (
        <AppText variant="small" style={{ color: c.textMuted }}>
          {t('ac.mod.noHistory')}
        </AppText>
      )}
      {d.previousReports.length ? (
        <View style={{ gap: 4, marginTop: 6 }}>
          <AppText variant="label" style={{ color: c.textMuted }}>
            {t('ac.mod.previous')}
          </AppText>
          {d.previousReports.map((p: any) => (
            <Press key={p.id} onPress={() => router.push(`/admin/moderation/reports/${p.id}${filters}` as any)} accessibilityRole="link" style={{ paddingVertical: 4 }}>
              <AppText variant="small" style={{ color: c.primary }}>
                #{p.id} · {reason(p.reason)} · {t(`ac.mod.status.${p.status}`)} · {f.date(p.at)}
              </AppText>
            </Press>
          ))}
        </View>
      ) : null}
    </Panel>
  );

  const decisionButtons = (
    <View style={{ gap: 8 }}>
      {available.map((x) => (
        <Press
          key={x}
          onPress={() => decide(x)}
          disabled={!open || blocked}
          accessibilityRole="button"
          testID={`mod-decide-${x}`}
          style={{ borderWidth: 1, borderColor: x === 'restrict_permanent' ? c.danger : c.border, borderRadius: 12, padding: 10, opacity: !open || blocked ? 0.5 : 1, gap: 2 }}
        >
          <AppText variant="smallStrong" style={{ color: x === 'restrict_permanent' ? c.danger : c.text }}>
            {t(`ac.mod.decision.${x}`)}
          </AppText>
          <AppText variant="caption" style={{ color: c.textMuted }}>
            {t(`ac.mod.decisionHelp.${x}`)}
          </AppText>
        </Press>
      ))}
    </View>
  );

  const assignedLine = r.assignedTo ? (r.assignedTo.me ? t('ac.mod.takenByMe') : t('ac.mod.takenBy', { who: r.assignedTo.label || '—' })) : t('ac.mod.notTaken');
  const actions = (
    <Panel title={t('ac.mod.actions')} testID="mod-actions">
      <AppText variant="small" style={{ color: c.textSecondary }}>
        {assignedLine}
      </AppText>
      {open ? (
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {!r.assignedTo?.me ? <Button label={t('ac.mod.take')} size="sm" icon="hand-left-outline" onPress={take} testID="mod-take" /> : null}
          <Button label={t('ac.mod.assign')} size="sm" variant="outline" icon="swap-horizontal-outline" onPress={pickAssignee} testID="mod-assign" />
        </View>
      ) : null}
      {open ? (
        blocked ? (
          <Note tone="warning">{t('ac.mod.secondByMe')}</Note>
        ) : isCompact ? (
          <Button label={t('ac.mod.decide')} icon="checkmark-done-outline" onPress={() => setDecisionsOpen(true)} testID="mod-decide" />
        ) : (
          decisionButtons
        )
      ) : null}
      <View style={{ gap: 6 }}>
        {open && !r.secondReview ? <Button label={t('ac.mod.askSecond')} size="sm" variant="ghost" icon="people-outline" onPress={second} testID="mod-second" /> : null}
        {can('safety.manage') && !d.safetyIncident ? <Button label={t('ac.mod.escalate')} size="sm" variant="ghost" icon="heart-circle-outline" onPress={escalate} testID="mod-escalate" /> : null}
        {d.current?.status === 'removed' ? <Button label={t('ac.mod.restore')} size="sm" variant="ghost" icon="arrow-undo-outline" onPress={restore} testID="mod-restore" /> : null}
      </View>
    </Panel>
  );

  const member = d.member ? <MemberPanel memberRef={d.member.ref} reportId={r.id} onChanged={() => { q.reload(); onChanged?.(); }} /> : null;

  const sheets = (
    <>
      <Sheet visible={decisionsOpen} onClose={() => setDecisionsOpen(false)} title={t('ac.mod.decideTitle', { id: r.id })} testID="mod-decide-sheet">
        {decisionButtons}
      </Sheet>
      <Sheet visible={assignees !== null} onClose={() => setAssignees(null)} title={t('ac.mod.assignTitle')} testID="mod-assign-sheet">
        <View style={{ gap: 8, paddingBottom: 8 }}>
          {(assignees || []).map((m) => (
            <Button
              key={m.id}
              label={`${m.label}${m.me ? ` ${t('ac.mod.you')}` : ''}`}
              variant="outline"
              onPress={async () => {
                setAssignees(null);
                await run(() => adminPost(`${base}/assign`, { assigneeId: m.id }), t('ac.mod.assigned'));
              }}
            />
          ))}
        </View>
      </Sheet>
    </>
  );

  const main = (
    <>
      {summary}
      {evidence}
      {context}
      {notes}
      {history}
    </>
  );
  const side = (
    <>
      {actions}
      {member}
    </>
  );

  if (layout === 'stack') {
    return (
      <View style={{ gap: 16 }}>
        {summary}
        {actions}
        {evidence}
        {context}
        {member}
        {notes}
        {history}
        {sheets}
      </View>
    );
  }
  if (layout === 'columns') {
    return (
      <View style={{ flexDirection: 'row', gap: 16, alignItems: 'flex-start' }}>
        <View style={{ flex: 1, gap: 16, minWidth: 0 }}>{main}</View>
        <View style={{ width: 340, gap: 16 }}>{side}</View>
        {sheets}
      </View>
    );
  }
  return (
    <View style={{ flex: 1, flexDirection: 'row', gap: 16, minHeight: 0 }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 16, paddingBottom: 32 }}>
        {main}
      </ScrollView>
      <ScrollView style={{ width: 320, flexGrow: 0 }} contentContainerStyle={{ gap: 16, paddingBottom: 32 }}>
        {side}
      </ScrollView>
      {sheets}
    </View>
  );
});

// ---------- Review requests (appeals) ----------
export function AppealPanel({ appeal, onDone }: { appeal: AppealItem; onDone: () => void }) {
  const c = useAdminColors();
  const { t } = useT();
  const f = useFmt();
  const { act, ask } = useAdmin();
  const { toast } = useFeedback();
  const errText = useModError();
  const decide = async (decision: 'upheld' | 'overturned') => {
    const note = await ask({ title: t(decision === 'upheld' ? 'ac.mod.upholdTitle' : 'ac.mod.overturnTitle'), body: t('ac.mod.appealBody'), min: 3 });
    if (!note) return;
    try {
      await act(() => adminPost(`/api/moderation/appeals/${appeal.id}/decide`, { decision, note }));
      toast(t('ac.mod.appealDecided'));
      onDone();
    } catch (e) {
      toast(errText(e));
    }
  };
  return (
    <View style={{ gap: 16 }}>
      <Panel title={t('ac.mod.appeal', { id: appeal.id })} subtitle={t('ac.mod.appealsNote')} testID="mod-appeal">
        <AppText variant="caption" style={{ color: c.textMuted }}>
          {t('ac.mod.appealFrom', { who: appeal.pseudonym || t('ac.mod.former') })} · {f.dateTime(appeal.createdAt)}
        </AppText>
        {appeal.suspensionKind ? (
          <AppText variant="small" style={{ color: c.textSecondary }}>
            {t('ac.mod.appealAbout', { kind: t(`ac.mod.kind.${appeal.suspensionKind}`), reason: appeal.suspensionReason || '—' })}
            {appeal.suspensionEndsAt ? ` · ${t('ac.mod.until', { date: f.dateTime(appeal.suspensionEndsAt) })}` : ''}
          </AppText>
        ) : null}
        <View style={{ backgroundColor: c.cardMuted, borderRadius: 12, padding: 12, gap: 4 }}>
          <AppText variant="label" style={{ color: c.textMuted }}>
            {t('ac.mod.appealText')}
          </AppText>
          <AppText variant="body" style={{ color: c.text }}>
            {appeal.body}
          </AppText>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <Button label={t('ac.mod.uphold')} variant="outline" onPress={() => decide('upheld')} testID="mod-uphold" />
          <Button label={t('ac.mod.overturn')} onPress={() => decide('overturned')} testID="mod-overturn" />
        </View>
      </Panel>
      {appeal.memberRef ? <MemberPanel memberRef={appeal.memberRef} onChanged={onDone} /> : null}
    </View>
  );
}
