/**
 * Community room building blocks: member avatars, message rows, the message
 * menu, the report sheet, the safety sheet and the first-time setup.
 */
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';

import { AnuliaMark, AppText, Badge, Banner, Button, Chip, Divider, Icon, ListRow, Press, radius, Sheet, space, TextField, useTheme } from '@/design';
import { useT } from '@/i18n';
import { REACTIONS, REPORT_REASONS } from '@/lib/api/community';
import type { ReactionKey, ReportReason, RoomMessage } from '@/lib/api/community';

const TONES = [
  ['sageSoft', 'onPrimarySoft'],
  ['peachSoft', 'onPeachSoft'],
  ['lavenderSoft', 'onLavenderSoft'],
  ['goldSoft', 'onGoldSoft'],
] as const;

export function MemberAvatar({ seed = 0, name, kind = 'member', size = 34 }: { seed?: number; name?: string | null; kind?: 'member' | 'anulia' | 'system'; size?: number }) {
  const { colors } = useTheme();
  if (kind === 'anulia') return <AnuliaMark size={size} />;
  const [bg, fg] = TONES[Math.abs(seed) % TONES.length];
  const initial = (name || '').trim().charAt(0).toUpperCase();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors[bg], alignItems: 'center', justifyContent: 'center' }}>
      {initial ? (
        <AppText variant="smallStrong" color={fg as any} style={{ fontSize: size * 0.42 }}>
          {initial}
        </AppText>
      ) : (
        <Icon name="person-outline" size={size * 0.5} color={fg as any} />
      )}
    </View>
  );
}

export interface MessageRowProps {
  message: RoomMessage;
  myName?: string;
  time: string;
  grouped?: boolean;
  onReply?: () => void;
  onMore?: () => void;
  onReact?: (r: ReactionKey) => void;
  onRetry?: () => void;
}

/** One message in a room. Own messages on the end side; AI replies clearly marked. */
export function MessageRow({ message: m, myName, time, grouped, onReply, onMore, onReact, onRetry }: MessageRowProps) {
  const { t } = useT();
  const { colors } = useTheme();
  const [showMuted, setShowMuted] = useState(false);
  const mine = m.author.isMe;
  const ai = m.author.kind === 'anulia';
  // An official notice written by the BeHappy team (staff tools).
  const official = m.author.kind === 'system';
  const hidden = m.status === 'removed' || m.status === 'deleted';
  const name = mine ? myName || t('community.room.you') : ai ? 'Anulia' : official ? 'BeHappy' : m.author.formerMember ? t('community.room.formerMember') : m.author.pseudonym || '';

  if (m.mutedAuthor && !showMuted && !hidden) {
    return (
      <Press onPress={() => setShowMuted(true)} accessibilityRole="button" style={{ paddingVertical: 6, paddingStart: 44 }}>
        <AppText variant="caption" color="textTertiary">
          {t('community.room.mutedMessage')} · {t('community.room.show')}
        </AppText>
      </Press>
    );
  }

  const bubbleBg = hidden ? colors.surfaceSunken : mine ? colors.chatUser : ai ? colors.lavenderSoft : official ? colors.sageSoft : colors.surface;
  const reactions = REACTIONS.filter((r) => (m.reactions[r.key] || 0) > 0);

  return (
    <View testID={ai ? 'room-msg-anulia' : official ? 'room-msg-official' : mine ? 'room-msg-mine' : 'room-msg'} style={{ flexDirection: mine ? 'row-reverse' : 'row', gap: 10, marginTop: grouped ? 2 : space[3], alignItems: 'flex-end' }}>
      <View style={{ width: 34 }}>{!grouped && !mine ? <MemberAvatar seed={m.author.avatarSeed} name={name} kind={m.author.kind} /> : null}</View>
      <View style={{ flexShrink: 1, maxWidth: '82%', alignItems: mine ? 'flex-end' : 'flex-start', gap: 4 }}>
        {!grouped ? (
          <View style={{ flexDirection: mine ? 'row-reverse' : 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <AppText variant="smallStrong" color={ai ? 'onLavenderSoft' : 'text'}>
              {name}
            </AppText>
            {ai ? <Badge label={t('community.room.ai')} tone="lavender" icon="sparkles-outline" /> : null}
            {official ? <Badge label={t('shell.staff')} tone="primary" icon="shield-checkmark-outline" /> : null}
            <AppText variant="caption" color="textTertiary">
              {time}
            </AppText>
          </View>
        ) : null}
        <Press
          onPress={onMore}
          disabled={!onMore || Boolean(m.pending)}
          feedback="opacity"
          accessibilityLabel={`${name}: ${m.body}`}
          accessibilityHint={t('community.room.more')}
          style={{
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: radius.xl,
            borderTopStartRadius: !grouped && !mine ? 6 : radius.xl,
            borderTopEndRadius: !grouped && mine ? 6 : radius.xl,
            backgroundColor: bubbleBg,
            borderWidth: !mine && !ai && !hidden ? 1 : 0,
            borderColor: colors.border,
            opacity: m.pending === 'sending' ? 0.7 : 1,
            gap: 6,
          }}
        >
          {m.replyTo ? (
            <View style={{ borderStartWidth: 3, borderStartColor: colors.brand, paddingStart: 8, paddingVertical: 2 }}>
              <AppText variant="caption" color="textSecondary" numberOfLines={1}>
                {m.replyTo.pseudonym || t('community.room.formerMember')}
              </AppText>
              <AppText variant="caption" color="textTertiary" numberOfLines={2}>
                {m.replyTo.hidden ? t('community.room.removed') : m.replyTo.snippet}
              </AppText>
            </View>
          ) : null}
          {hidden ? (
            <AppText variant="small" color="textTertiary" style={{ fontStyle: 'italic' }}>
              {m.status === 'removed' ? t('community.room.removed') : t('community.room.deleted')}
            </AppText>
          ) : (
            <AppText variant="body" color={mine ? 'onChatUser' : 'text'} selectable>
              {m.body}
            </AppText>
          )}
          {m.status === 'held' ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name="time-outline" size={14} color="textTertiary" />
              <AppText variant="caption" color="textTertiary" style={{ flexShrink: 1 }}>
                {t('community.room.held')}
              </AppText>
            </View>
          ) : null}
          {ai ? (
            <AppText variant="caption" color="onLavenderSoft">
              {t('community.room.aiNote')}
            </AppText>
          ) : null}
        </Press>
        {m.pending === 'failed' ? (
          <Press onPress={onRetry} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Icon name="alert-circle-outline" size={14} color="danger" />
            <AppText variant="caption" color="danger">
              {t('community.room.sendFailed')}
            </AppText>
          </Press>
        ) : null}
        {reactions.length && !hidden ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
            {reactions.map((r) => {
              const meToo = m.myReactions.includes(r.key);
              return (
                <Press
                  key={r.key}
                  onPress={() => onReact?.(r.key)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: meToo }}
                  accessibilityLabel={`${t(`community.room.reactions.${r.key}`)} ${m.reactions[r.key]}`}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, backgroundColor: meToo ? colors.primarySoft : colors.surfaceMuted, borderWidth: 1, borderColor: meToo ? colors.primarySoft : colors.border }}
                >
                  <AppText variant="caption">{r.emoji}</AppText>
                  <AppText variant="caption" color={meToo ? 'onPrimarySoft' : 'textSecondary'}>
                    {m.reactions[r.key]}
                  </AppText>
                </Press>
              );
            })}
          </View>
        ) : null}
      </View>
      {!mine && !hidden && onReply && !m.pending ? (
        <Press onPress={onReply} accessibilityLabel={t('community.room.reply')} hitSlop={8} style={{ paddingBottom: 8 }}>
          <Icon name="arrow-undo-outline" size={18} color="textTertiary" />
        </Press>
      ) : null}
    </View>
  );
}

/** Actions for one message: reply, react, report, block, mute, delete. */
export function MessageMenu({
  message,
  onClose,
  onReply,
  onReact,
  onReport,
  onBlock,
  onMute,
  onDelete,
}: {
  message: RoomMessage | null;
  onClose: () => void;
  onReply: () => void;
  onReact: (r: ReactionKey) => void;
  onReport: () => void;
  onBlock: () => void;
  onMute: () => void;
  onDelete: () => void;
}) {
  const { t } = useT();
  const { colors } = useTheme();
  if (!message) return null;
  const m = message;
  const name = m.author.pseudonym || '';
  const canModerateOwn = m.author.isMe && (m.status === 'visible' || m.status === 'held');
  const isMember = m.author.kind === 'member' && Boolean(m.author.ref) && !m.author.isMe;
  return (
    <Sheet visible onClose={onClose} title={m.author.isMe ? t('community.room.you') : m.author.kind === 'anulia' ? 'Anulia' : name} testID="message-menu">
      {m.status === 'visible' ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: space[2] }}>
          {REACTIONS.map((r) => {
            const on = m.myReactions.includes(r.key);
            return (
              <Press
                key={r.key}
                onPress={() => onReact(r.key)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={t(`community.room.reactions.${r.key}`)}
                testID={`react-${r.key}`}
                style={{ alignItems: 'center', gap: 2, padding: 8, borderRadius: radius.md, backgroundColor: on ? colors.primarySoft : 'transparent', minWidth: 52 }}
              >
                <AppText variant="title2">{r.emoji}</AppText>
                <AppText variant="caption" color="textSecondary" numberOfLines={1}>
                  {t(`community.room.reactions.${r.key}`)}
                </AppText>
              </Press>
            );
          })}
        </View>
      ) : null}
      <Divider style={{ marginVertical: space[2] }} />
      {m.status === 'visible' && !m.author.isMe ? <ListRow icon="arrow-undo-outline" title={t('community.room.reply')} onPress={onReply} testID="menu-reply" /> : null}
      {!m.author.isMe && m.status === 'visible' ? <ListRow icon="flag-outline" iconTone="peach" title={t('community.report.title')} onPress={onReport} testID="menu-report" /> : null}
      {isMember ? <ListRow icon={m.mutedAuthor ? 'volume-high-outline' : 'volume-mute-outline'} title={m.mutedAuthor ? t('community.room.unmute', { name }) : t('community.room.mute', { name })} onPress={onMute} testID="menu-mute" /> : null}
      {isMember ? <ListRow icon="ban-outline" iconTone="danger" title={t('community.room.block', { name })} onPress={onBlock} destructive testID="menu-block" /> : null}
      {canModerateOwn ? <ListRow icon="trash-outline" iconTone="danger" title={t('community.room.deleteOwn')} onPress={onDelete} destructive testID="menu-delete" /> : null}
    </Sheet>
  );
}

export function ReportSheet({ visible, onClose, onSend }: { visible: boolean; onClose: () => void; onSend: (reason: ReportReason, details: string) => Promise<void> }) {
  const { t } = useT();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!reason) return;
    setBusy(true);
    try {
      await onSend(reason, details.trim());
      setReason(null);
      setDetails('');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={t('community.report.title')}
      subtitle={t('community.report.body')}
      testID="report-sheet"
      footer={<Button label={t('community.report.send')} onPress={submit} disabled={!reason} loading={busy} fullWidth testID="report-send" />}
    >
      <AppText variant="smallStrong" color="textSecondary" style={{ marginBottom: space[2] }}>
        {t('community.report.reason')}
      </AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {REPORT_REASONS.map((r) => (
          <Chip key={r} label={t(`community.report.reasons.${r}`)} selected={reason === r} onPress={() => setReason(r)} testID={`reason-${r}`} />
        ))}
      </View>
      {reason === 'self_harm_risk' ? (
        <View style={{ marginTop: space[3] }}>
          <Banner tone="danger" body={t('community.report.riskTip')} />
        </View>
      ) : null}
      <TextField label={t('community.report.details')} value={details} onChangeText={setDetails} multiline maxLength={1000} containerStyle={{ marginTop: space[4] }} inputStyle={{ minHeight: 72 }} />
    </Sheet>
  );
}

export function SafetySheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useT();
  const router = useRouter();
  return (
    <Sheet visible={visible} onClose={onClose} title={t('community.safety.title')} testID="safety-sheet">
      <AppText variant="body" color="textSecondary">
        {t('community.safety.body')}
      </AppText>
      <View style={{ gap: 10, marginTop: space[5] }}>
        <Button
          label={t('community.safety.cta')}
          variant="danger"
          icon="heart-outline"
          fullWidth
          onPress={() => {
            onClose();
            router.push('/safety');
          }}
          testID="safety-sheet-help"
        />
        <Button label={t('community.safety.later')} variant="quiet" fullWidth onPress={onClose} />
      </View>
    </Sheet>
  );
}

export function GuidelinesList() {
  const { t, tl } = useT();
  return (
    <View style={{ gap: space[3] }}>
      <AppText variant="body" color="textSecondary">
        {t('community.guidelines.intro')}
      </AppText>
      {tl('community.guidelines.items').map((item, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 10 }}>
          <Icon name="checkmark-circle-outline" size={20} color="brand" />
          <AppText variant="body" style={{ flex: 1 }}>
            {item}
          </AppText>
        </View>
      ))}
      <AppText variant="small" color="textTertiary">
        {t('community.guidelines.privacy')}
      </AppText>
    </View>
  );
}
