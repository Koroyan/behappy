/**
 * Notifications & reminders: gentle reminders (phones), chats and messages
 * (phone notifications or, on the web, browser notifications) and quiet hours.
 * Every switch here does something; what can't work on this device is not shown.
 */
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Linking, Platform, View } from 'react-native';

import { AppText, Banner, Button, Card, IconButton, ListRow, Screen, SectionHeader, space, Toggle } from '@/design';
import { AccountGate } from '@/features/account/AccountParts';
import { useT } from '@/i18n';
import { useIdentity } from '@/lib/api/account';
import { DEFAULT_REMINDER_PREFS, ReminderPrefs } from '@/lib/notifications/planner';
import { disableThisPhone, enableThisPhone, getPushPrefs, loadPushState, pushAvailability, PushPrefs, setPushPrefs } from '@/lib/notifications/push';
import { askNotificationPermission, loadReminderPrefs, notificationsAllowed, remindersSupported, rescheduleReminders, saveReminderPrefs, scheduledReminders } from '@/lib/notifications/reminders';
import { useReminderCopy } from '@/lib/notifications/useReminderCopy';
import { setWebNotify, webNotifyBlocked, webNotifyEnabled, webNotifySupported } from '@/lib/notifications/web';

const DAY_MINUTES = 24 * 60;

/** A time of day, changed in steps (15 or 30 minutes). */
function TimeStepper({ label, minute, step, onChange, testID }: { label: string; minute: number; step: number; onChange: (m: number) => void; testID?: string }) {
  const { t, formatTime } = useT();
  const shown = formatTime(new Date(2000, 0, 1, Math.floor(minute / 60), minute % 60));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, paddingLeft: 52 }} testID={testID}>
      <AppText variant="body" color="textSecondary">
        {label}
      </AppText>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <IconButton icon="remove" label={`${t('alerts.reminders.earlier')} (${label})`} size={36} variant="soft" onPress={() => onChange((minute - step + DAY_MINUTES) % DAY_MINUTES)} testID={testID ? `${testID}-earlier` : undefined} />
        <AppText variant="bodyStrong" style={{ minWidth: 64, textAlign: 'center' }}>
          {shown}
        </AppText>
        <IconButton icon="add" label={`${t('alerts.reminders.later')} (${label})`} size={36} variant="soft" onPress={() => onChange((minute + step) % DAY_MINUTES)} testID={testID ? `${testID}-later` : undefined} />
      </View>
    </View>
  );
}

export default function NotificationSettings() {
  const { t, formatDate, formatTime, language } = useT();
  const identity = useIdentity();
  const copy = useReminderCopy();
  const native = Platform.OS === 'ios' || Platform.OS === 'android';
  const availability = pushAvailability();

  const [reminders, setReminders] = useState<ReminderPrefs>(DEFAULT_REMINDER_PREFS);
  const [next, setNext] = useState<{ kind: string; at: number }[]>([]);
  const [denied, setDenied] = useState(false);
  const [phoneOn, setPhoneOn] = useState(false);
  const [prefs, setPrefs] = useState<PushPrefs | null>(null);
  const [webOn, setWebOn] = useState(webNotifyEnabled());
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const replan = useCallback(async () => {
    if (!remindersSupported) return;
    await rescheduleReminders(copy).catch(() => {});
    setNext(await scheduledReminders());
  }, [copy]);

  useFocusEffect(
    useCallback(() => {
      loadReminderPrefs().then(setReminders);
      scheduledReminders().then(setNext);
      if (native) notificationsAllowed().then((ok) => setDenied(!ok));
      loadPushState().then((s) => setPhoneOn(s.enabled));
      if (identity.registered) getPushPrefs().then(setPrefs).catch(() => setPrefs(null));
    }, [identity.registered, native])
  );

  const updateReminders = async (patch: Partial<ReminderPrefs>) => {
    const nextPrefs = { ...reminders, ...patch };
    setReminders(nextPrefs);
    await saveReminderPrefs(nextPrefs);
    await replan();
  };

  const toggleReminders = async (on: boolean) => {
    setProblem(null);
    if (on && (await askNotificationPermission()) !== 'granted') {
      setDenied(true);
      return;
    }
    setDenied(false);
    await updateReminders({ enabled: on, enabledAt: on ? Date.now() : reminders.enabledAt });
  };

  const togglePhone = async (on: boolean) => {
    setProblem(null);
    setBusy(true);
    try {
      if (!on) {
        await disableThisPhone();
        setPhoneOn(false);
        return;
      }
      const r = await enableThisPhone(language);
      if (r === 'ok') {
        setPhoneOn(true);
        setPrefs(await getPushPrefs().catch(() => prefs));
      } else if (r === 'denied') setDenied(true);
      else setProblem(t('common.errorBody'));
    } finally {
      setBusy(false);
    }
  };

  const updatePush = async (patch: Partial<PushPrefs>) => {
    if (!prefs) return;
    const optimistic = { ...prefs, ...patch };
    setPrefs(optimistic);
    try {
      setPrefs(await setPushPrefs(patch));
    } catch {
      setPrefs(prefs);
      setProblem(t('common.errorBody'));
    }
  };

  // Quiet hours apply to both: phone notifications (server) and reminders (this phone).
  const quiet = prefs ? { on: prefs.quiet, from: prefs.quietFrom, to: prefs.quietTo } : { on: reminders.quietFrom !== reminders.quietTo, from: reminders.quietFrom, to: reminders.quietTo };
  const lastQuiet = reminders.quietFrom !== reminders.quietTo ? { from: reminders.quietFrom, to: reminders.quietTo } : { from: 22 * 60, to: 8 * 60 };
  const setQuiet = async (q: { on: boolean; from: number; to: number }) => {
    if (prefs) await updatePush({ quiet: q.on, quietFrom: q.from, quietTo: q.to });
    if (remindersSupported) await updateReminders(q.on ? { quietFrom: q.from, quietTo: q.to } : { quietFrom: 0, quietTo: 0 });
  };

  const kindLabel = (k: string) => (k === 'journal' ? t('alerts.reminders.journal') : k === 'art' ? t('alerts.reminders.art') : t('alerts.reminders.cards'));
  const showChats = identity.registered && ((native && availability === 'ok') || webNotifySupported());

  return (
    <Screen back title={t('alerts.settings.title')} width="reading" testID="screen-notification-settings">
      <View style={{ gap: space[6] }}>
        {problem ? <Banner tone="danger" body={problem} /> : null}
        {denied && native ? (
          <Banner tone="warning" body={t('alerts.reminders.denied')} action={<Button label={t('alerts.reminders.openSettings')} size="sm" variant="secondary" onPress={() => Linking.openSettings().catch(() => {})} />} />
        ) : null}

        {remindersSupported ? (
          <View>
            <SectionHeader title={t('alerts.reminders.section')} subtitle={t('alerts.reminders.intro')} />
            <Card padding={8}>
              <ListRow icon="notifications-outline" iconTone="primary" title={t('alerts.reminders.enable')} right={<Toggle value={reminders.enabled} onValueChange={toggleReminders} label={t('alerts.reminders.enable')} testID="toggle-reminders" />} />
              {reminders.enabled ? (
                <>
                  <ListRow icon="book-outline" iconTone="peach" title={t('alerts.reminders.journal')} subtitle={t('alerts.reminders.journalHint')} right={<Toggle value={reminders.journal} onValueChange={(v) => updateReminders({ journal: v })} label={t('alerts.reminders.journal')} testID="toggle-reminder-journal" />} />
                  {reminders.journal ? <TimeStepper label={t('alerts.reminders.time')} minute={reminders.journalTime} step={15} onChange={(m) => updateReminders({ journalTime: m })} testID="reminder-journal-time" /> : null}
                  <ListRow icon="sparkles-outline" iconTone="lavender" title={t('alerts.reminders.smart')} subtitle={t('alerts.reminders.smartHint')} right={<Toggle value={reminders.smart} onValueChange={(v) => updateReminders({ smart: v })} label={t('alerts.reminders.smart')} testID="toggle-reminder-smart" />} />
                  <ListRow icon="color-palette-outline" iconTone="gold" title={t('alerts.reminders.art')} subtitle={t('alerts.reminders.artHint')} right={<Toggle value={reminders.art} onValueChange={(v) => updateReminders({ art: v })} label={t('alerts.reminders.art')} testID="toggle-reminder-art" />} />
                  <ListRow icon="albums-outline" iconTone="sage" title={t('alerts.reminders.cards')} subtitle={t('alerts.reminders.cardsHint')} right={<Toggle value={reminders.cards} onValueChange={(v) => updateReminders({ cards: v })} label={t('alerts.reminders.cards')} testID="toggle-reminder-cards" />} />
                </>
              ) : null}
            </Card>
            {reminders.enabled ? (
              <AppText variant="small" color="textSecondary" style={{ marginTop: space[3] }} testID="reminder-next">
                {next.length ? t('alerts.reminders.next', { when: `${formatDate(next[0].at, { weekday: 'long' })} ${formatTime(next[0].at)}`, what: kindLabel(next[0].kind) }) : t('alerts.reminders.none')}
              </AppText>
            ) : null}
          </View>
        ) : null}

        <View>
          <SectionHeader title={t('alerts.chats.section')} subtitle={t('alerts.chats.intro')} />
          {!identity.registered ? (
            <AccountGate returnTo="/settings/notifications" />
          ) : native && availability !== 'ok' ? (
            <Banner tone="info" body={t('alerts.chats.unavailable')} />
          ) : showChats ? (
            <Card padding={8}>
              {native ? (
                <ListRow icon="phone-portrait-outline" iconTone="primary" title={t('alerts.chats.enable')} right={<Toggle value={phoneOn} onValueChange={(v) => !busy && togglePhone(v)} label={t('alerts.chats.enable')} testID="toggle-push" />} />
              ) : (
                <ListRow
                  icon="desktop-outline"
                  iconTone="primary"
                  title={t('alerts.chats.web')}
                  subtitle={webNotifyBlocked() ? t('alerts.chats.webDenied') : undefined}
                  right={<Toggle value={webOn} onValueChange={async (v) => setWebOn(await setWebNotify(v))} label={t('alerts.chats.web')} testID="toggle-web-notify" />}
                />
              )}
              {native && phoneOn && prefs ? (
                <>
                  <ListRow icon="people-outline" title={t('alerts.chats.community')} right={<Toggle value={prefs.community} onValueChange={(v) => updatePush({ community: v })} label={t('alerts.chats.community')} testID="toggle-push-community" />} />
                  <ListRow icon="mail-outline" title={t('alerts.chats.messages')} right={<Toggle value={prefs.messages} onValueChange={(v) => updatePush({ messages: v })} label={t('alerts.chats.messages')} testID="toggle-push-messages" />} />
                  <ListRow icon="calendar-outline" title={t('alerts.chats.appointments')} right={<Toggle value={prefs.appointments} onValueChange={(v) => updatePush({ appointments: v })} label={t('alerts.chats.appointments')} />} />
                  <ListRow icon="person-circle-outline" title={t('alerts.chats.account')} right={<Toggle value={prefs.account} onValueChange={(v) => updatePush({ account: v })} label={t('alerts.chats.account')} />} />
                  <ListRow icon="eye-outline" title={t('alerts.chats.previews')} subtitle={t('alerts.chats.previewsHint')} right={<Toggle value={prefs.previews} onValueChange={(v) => updatePush({ previews: v })} label={t('alerts.chats.previews')} testID="toggle-push-previews" />} />
                </>
              ) : null}
            </Card>
          ) : null}
          {identity.registered ? (
            <AppText variant="small" color="textSecondary" style={{ marginTop: space[3] }}>
              {t('alerts.chats.roomHint')}
            </AppText>
          ) : null}
        </View>

        {(remindersSupported && reminders.enabled) || (native && phoneOn && prefs) ? (
          <View>
            <SectionHeader title={t('alerts.quiet.title')} subtitle={t('alerts.quiet.hint')} />
            <Card padding={8}>
              <ListRow icon="moon-outline" iconTone="lavender" title={t('alerts.quiet.title')} right={<Toggle value={quiet.on} onValueChange={(v) => setQuiet({ on: v, ...(v && quiet.from === quiet.to ? lastQuiet : { from: quiet.from, to: quiet.to }) })} label={t('alerts.quiet.title')} testID="toggle-quiet" />} />
              {quiet.on ? (
                <>
                  <TimeStepper label={t('alerts.quiet.from')} minute={quiet.from} step={30} onChange={(m) => setQuiet({ ...quiet, from: m })} testID="quiet-from" />
                  <TimeStepper label={t('alerts.quiet.to')} minute={quiet.to} step={30} onChange={(m) => setQuiet({ ...quiet, to: m })} testID="quiet-to" />
                </>
              ) : null}
            </Card>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}
