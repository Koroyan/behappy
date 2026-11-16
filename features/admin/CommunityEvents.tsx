/**
 * Staff: scheduled community discussions. A discussion belongs to one room
 * and is hosted by a real person (moderator, facilitator or verified
 * professional), never the AI. Members only see whether at least three
 * people are interested, never who.
 */
import React, { useState } from 'react';
import { View } from 'react-native';

import { AppText, Button, Chip, Sheet, TextField, useFeedback } from '@/design';
import { useAdmin } from '@/features/admin/AdminProvider';
import { adminPost, errorCode, useAdminData } from '@/features/admin/api';
import { DataTable, Panel, Pill } from '@/features/admin/ui';
import { useAdminColors } from '@/features/admin/theme';
import { useT } from '@/i18n';
import { TOPIC_IDS } from '@/lib/api/community';

const ROLES = ['moderator', 'facilitator', 'professional'] as const;
const LENGTHS = [30, 45, 60, 90];

export function CommunityEventsPanel({ lang }: { lang: string }) {
  const { t, formatDate, formatTime } = useT();
  const { can, act, ask } = useAdmin();
  const { toast } = useFeedback();
  const list = useAdminData<any>('/community/events');
  const [open, setOpen] = useState(false);
  const cancel = async (e: any) => {
    const reason = await ask({ title: t('ac.events.cancel'), body: t('ac.events.cancelBody'), min: 3, destructive: true });
    if (!reason) return;
    try {
      await act(() => adminPost(`/community/events/${e.id}/cancel`, { reason }));
      toast(t('ac.common.saved'));
      list.reload();
    } catch (err) {
      toast(t('ac.common.failed', { code: errorCode(err) }));
    }
  };
  const events = (list.data?.events || []) as any[];
  return (
    <Panel title={t('ac.events.title')} subtitle={t('ac.events.subtitle')} actions={can('community.manage') ? <Button label={t('ac.events.new')} icon="add" size="sm" onPress={() => setOpen(true)} testID="admin-event-new" /> : null} testID="admin-events">
      <DataTable
        columns={[
          { key: 'when', label: t('ac.events.when'), flex: 1.2, render: (e: any) => `${formatDate(e.startsAt, { day: 'numeric', month: 'short' })} ${formatTime(e.startsAt)}` },
          { key: 'room', label: t('ac.events.room'), flex: 1.2, render: (e: any) => `${t(`community.topics.${e.topic}.name`)} · ${e.language}` },
          { key: 'title', label: t('ac.events.titleField'), flex: 2, render: (e: any) => e.title },
          { key: 'host', label: t('ac.events.host'), flex: 1.2, wideOnly: true, render: (e: any) => `${e.host.name} (${t(`jr.discover.roles.${e.host.role}`)})` },
          { key: 'interest', label: t('ac.events.interest'), width: 90, align: 'right', render: (e: any) => String(e.interestCount ?? 0) },
          { key: 'status', label: t('ac.events.status'), width: 120, render: (e: any) => <Pill label={t(`ac.events.statuses.${e.status}`)} tone={e.status === 'scheduled' ? 'good' : 'neutral'} /> },
          { key: 'act', label: '', width: 110, render: (e: any) => (e.status === 'scheduled' && can('community.manage') ? <Button label={t('ac.events.cancel')} size="sm" variant="ghost" onPress={() => cancel(e)} /> : null) },
        ]}
        rows={events}
        keyFor={(e: any) => String(e.id)}
        empty={t('ac.events.empty')}
      />
      {open ? (
        <EventSheet
          lang={lang}
          onClose={() => setOpen(false)}
          onCreated={() => {
            setOpen(false);
            list.reload();
          }}
        />
      ) : null}
    </Panel>
  );
}

function EventSheet({ lang, onClose, onCreated }: { lang: string; onClose: () => void; onCreated: () => void }) {
  const { t } = useT();
  const { act } = useAdmin();
  const { toast } = useFeedback();
  const c = useAdminColors();
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const [topic, setTopic] = useState<string>('general');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(`${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`);
  const [time, setTime] = useState('19:00');
  const [minutes, setMinutes] = useState(60);
  const [hostName, setHostName] = useState('');
  const [hostRole, setHostRole] = useState<(typeof ROLES)[number]>('moderator');
  const [busy, setBusy] = useState(false);
  const startsAt = new Date(`${date}T${time}:00`).getTime();
  const valid = title.trim().length >= 3 && hostName.trim().length >= 2 && Number.isFinite(startsAt);
  const save = async () => {
    setBusy(true);
    try {
      await act(() => adminPost('/community/events', { roomId: `${topic}:${lang}`, title, description, startsAt, minutes, hostName, hostRole }));
      toast(t('ac.common.saved'));
      onCreated();
    } catch (e) {
      toast(t('ac.common.failed', { code: errorCode(e) }));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet visible onClose={onClose} title={t('ac.events.new')} subtitle={t('ac.events.newBody', { language: lang })} maxWidth={620} testID="admin-event-sheet" footer={<Button label={t('ac.events.create')} onPress={save} disabled={!valid} loading={busy} fullWidth testID="admin-event-create" />}>
      <View style={{ gap: 12 }}>
        <AppText variant="smallStrong" style={{ color: c.text }}>
          {t('ac.events.room')}
        </AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {TOPIC_IDS.map((id) => (
            <Chip key={id} label={t(`community.topics.${id}.name`)} selected={topic === id} onPress={() => setTopic(id)} />
          ))}
        </View>
        <TextField label={t('ac.events.titleField')} value={title} onChangeText={setTitle} maxLength={120} testID="admin-event-title" />
        <TextField label={t('ac.events.description')} value={description} onChangeText={setDescription} multiline maxLength={1000} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TextField label={t('ac.events.date')} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" containerStyle={{ flex: 1 }} testID="admin-event-date" />
          <TextField label={t('ac.events.time')} value={time} onChangeText={setTime} placeholder="HH:MM" containerStyle={{ flex: 1 }} testID="admin-event-time" />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {LENGTHS.map((m) => (
            <Chip key={m} label={t('ac.events.minutes', { n: m })} selected={minutes === m} onPress={() => setMinutes(m)} />
          ))}
        </View>
        <TextField label={t('ac.events.hostName')} value={hostName} onChangeText={setHostName} maxLength={60} helper={t('ac.events.hostHint')} testID="admin-event-host" />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {ROLES.map((r) => (
            <Chip key={r} label={t(`jr.discover.roles.${r}`)} selected={hostRole === r} onPress={() => setHostRole(r)} />
          ))}
        </View>
      </View>
    </Sheet>
  );
}
