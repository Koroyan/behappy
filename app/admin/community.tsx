import { useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';

import { AppText, Button, Chip, IconButton, Sheet, TextField, Toggle, useFeedback } from '@/design';
import { useAdmin } from '@/features/admin/AdminProvider';
import { adminPost, adminPut, errorCode, useAdminData } from '@/features/admin/api';
import { RankedBars, TrendChart } from '@/features/admin/charts';
import { AdminPage, AdminState, DataTable, FilterChips, Grid, KpiTile, Note, Panel, Pill, useFmt } from '@/features/admin/ui';
import { useAdminColors } from '@/features/admin/theme';
import { LANGUAGE_NAMES, SUPPORTED_LANGUAGES } from '@/contexts/LanguageContext';
import { useT } from '@/i18n';

type State = 'all' | 'active' | 'paused' | 'archived';

export default function AdminCommunity() {
  const { t } = useT();
  const f = useFmt();
  const { focus } = useLocalSearchParams<{ focus?: string }>();
  const { range, can, act, ask } = useAdmin();
  const { toast } = useFeedback();
  const [lang, setLang] = useState<string>(focus ? String(focus).split(':')[1] || 'en' : 'en');
  const [state, setState] = useState<State>('all');
  const [room, setRoom] = useState<any | null>(null);
  const rooms = useAdminData<any>('/community/rooms', { lang, state: state === 'all' ? undefined : state });
  const stats = useAdminData<any>('/community/stats', { from: range.from, to: range.to });
  const topics = useAdminData<any>('/community/topics');
  const mods = useAdminData<any>(can('community.manage') ? '/community/moderators' : null);

  const roomAction = async (r: any, action: 'pause' | 'resume' | 'archive' | 'restore') => {
    const reason = await ask({ title: t(`ac.community.actions.${action}`), body: t('ac.community.reasonBody'), min: 5, destructive: action === 'archive' });
    if (!reason) return;
    try {
      await act(() => adminPost(`/community/rooms/${encodeURIComponent(r.id)}/state`, { action, reason }));
      toast(t('ac.common.saved'));
      rooms.reload();
    } catch (e) {
      toast(t('ac.common.failed', { code: errorCode(e) }));
    }
  };
  const move = async (id: string, dir: -1 | 1) => {
    const order = (topics.data?.topics || []).map((x: any) => x.id);
    const i = order.indexOf(id);
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]];
    try {
      const r = await act(() => adminPut('/community/topics/order', { order }));
      topics.setData(r);
    } catch (e) {
      toast(t('ac.common.failed', { code: errorCode(e) }));
    }
  };

  const s = stats.data;
  return (
    <AdminPage title={t('ac.nav.rooms')} subtitle={t('ac.community.subtitle')} testID="screen-admin-community">
      <Note icon="people-outline">{t('ac.community.privacy', { n: s?.minCohort ?? 5 })}</Note>
      <AdminState error={stats.error} loading={stats.loading} hasData={Boolean(s)} onRetry={stats.reload}>
        {s ? (
          <>
            <Grid min={180}>
              <KpiTile label={t('ac.community.messages')} value={f.num(s.totals.messages)} />
              <KpiTile label={t('ac.community.joins')} value={f.num(s.totals.joins)} />
              <KpiTile label={t('ac.community.anulia')} value={f.num(s.totals.anulia)} />
              <KpiTile label={t('ac.community.held')} value={f.num(s.totals.held)} />
            </Grid>
            <Grid min={420}>
              <Panel title={t('ac.community.messagesPerDay')}>
                <TrendChart kind="bars" data={s.daily.map((x: any) => ({ x: x.day, y: x.messages }))} format={f.compact} valueLabel={t('ac.community.messages')} />
              </Panel>
              <Panel title={t('ac.community.byTopic')} subtitle={t('ac.community.byTopicSub')}>
                <RankedBars items={s.byTopic.map((x: any) => ({ label: t(`community.topics.${x.topic}.name`), value: x.messages }))} format={f.num} />
              </Panel>
            </Grid>
          </>
        ) : null}
      </AdminState>

      <Panel title={t('ac.community.roomsTitle')}>
        <FilterChips value={lang} onChange={setLang} options={SUPPORTED_LANGUAGES.map((l) => ({ value: l, label: LANGUAGE_NAMES[l] }))} />
        <FilterChips<State> value={state} onChange={setState} options={(['all', 'active', 'paused', 'archived'] as State[]).map((v) => ({ value: v, label: t(`ac.community.states.${v}`) }))} />
        <AdminState error={rooms.error} loading={rooms.loading} hasData={Boolean(rooms.data)} onRetry={rooms.reload}>
          <DataTable
            rows={rooms.data?.rooms || []}
            keyFor={(r: any) => r.id}
            onRowPress={can('community.manage') ? setRoom : undefined}
            rowTestID="admin-room-row"
            columns={[
              { key: 'topic', label: t('ac.community.cols.room'), flex: 2, render: (r: any) => t(`community.topics.${r.topic}.name`) },
              { key: 'state', label: t('ac.community.cols.state'), render: (r: any) => <Pill label={t(`ac.community.states.${r.archived ? 'archived' : r.paused ? 'paused' : 'active'}`)} tone={r.archived ? 'neutral' : r.paused ? 'warning' : 'good'} /> },
              { key: 'members', label: t('ac.community.cols.members'), align: 'right', render: (r: any) => (r.members === null ? t('ac.common.hidden') : f.num(r.members)) },
              { key: 'm7', label: t('ac.community.cols.messages7'), align: 'right', render: (r: any) => f.num(r.messages7d) },
              { key: 'reports', label: t('ac.community.cols.openReports'), align: 'right', render: (r: any) => (r.openReports ? <Pill label={String(r.openReports)} tone="warning" /> : '0') },
              { key: 'last', label: t('ac.community.cols.last'), wideOnly: true, render: (r: any) => f.dateTime(r.lastActivityAt) },
            ]}
          />
        </AdminState>
      </Panel>

      <Grid min={380}>
        <Panel title={t('ac.community.topicsTitle')} subtitle={t('ac.community.topicsSub')}>
          {(topics.data?.topics || []).map((x: any, i: number, all: any[]) => (
            <View key={x.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <AppText variant="small" style={{ flex: 1 }}>
                {i + 1}. {t(`community.topics.${x.id}.name`)}
              </AppText>
              {can('community.manage') ? (
                <>
                  <IconButton icon="arrow-up" label={t('ac.community.up')} onPress={() => move(x.id, -1)} size={32} disabled={i === 0} />
                  <IconButton icon="arrow-down" label={t('ac.community.down')} onPress={() => move(x.id, 1)} size={32} disabled={i === all.length - 1} />
                </>
              ) : null}
            </View>
          ))}
        </Panel>
        {mods.data ? (
          <Panel title={t('ac.community.modsTitle')} subtitle={t('ac.community.modsSub')}>
            {mods.data.moderators.map((m: any) => (
              <ModeratorRow key={m.id} mod={m} onSaved={mods.reload} />
            ))}
          </Panel>
        ) : null}
      </Grid>
      {room ? <RoomSheet room={room} onClose={() => setRoom(null)} onAction={roomAction} onChanged={rooms.reload} /> : null}
    </AdminPage>
  );
}

function ModeratorRow({ mod, onSaved }: { mod: any; onSaved: () => void }) {
  const { t } = useT();
  const c = useAdminColors();
  const { act } = useAdmin();
  const { toast } = useFeedback();
  const [open, setOpen] = useState(false);
  const [langs, setLangs] = useState<string[]>(mod.languages);
  return (
    <View style={{ gap: 6, borderBottomWidth: 1, borderBottomColor: c.border, paddingBottom: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <AppText variant="small" style={{ flex: 1, color: c.text }} numberOfLines={1}>
          {mod.email}
        </AppText>
        <AppText variant="caption" style={{ color: c.textMuted }}>
          {mod.languages.length ? mod.languages.join(', ') : t('ac.community.allLanguages')}
        </AppText>
        <Button label={t(open ? 'common.cancel' : 'ac.community.edit')} size="sm" variant="ghost" onPress={() => setOpen((v) => !v)} />
      </View>
      {open ? (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {SUPPORTED_LANGUAGES.map((l) => (
              <Chip key={l} label={l} selected={langs.includes(l)} onPress={() => setLangs((x) => (x.includes(l) ? x.filter((y) => y !== l) : [...x, l]))} />
            ))}
          </View>
          <Button
            label={t('ac.common.save')}
            size="sm"
            onPress={async () => {
              try {
                await act(() => adminPut(`/community/moderators/${mod.id}/languages`, { languages: langs }));
                toast(t('ac.common.saved'));
                setOpen(false);
                onSaved();
              } catch (e) {
                toast(t('ac.common.failed', { code: errorCode(e) }));
              }
            }}
            style={{ alignSelf: 'flex-start' }}
          />
        </>
      ) : null}
    </View>
  );
}

function RoomSheet({ room, onClose, onAction, onChanged }: { room: any; onClose: () => void; onAction: (r: any, a: 'pause' | 'resume' | 'archive' | 'restore') => Promise<void>; onChanged: () => void }) {
  const { t } = useT();
  const c = useAdminColors();
  const { act } = useAdmin();
  const { toast } = useFeedback();
  const [notice, setNotice] = useState('');
  const [pin, setPin] = useState(false);
  const [desc, setDesc] = useState<{ en: string; ka: string }>({ en: room.description?.en || '', ka: room.description?.ka || '' });
  const post = async () => {
    try {
      await act(() => adminPost(`/community/rooms/${encodeURIComponent(room.id)}/notice`, { body: notice, pin }));
      toast(t('ac.community.noticePosted'));
      setNotice('');
      onChanged();
    } catch (e) {
      toast(t('ac.common.failed', { code: errorCode(e) }));
    }
  };
  const saveDesc = async () => {
    try {
      await act(() => adminPut(`/community/rooms/${encodeURIComponent(room.id)}/description`, { description: desc }));
      toast(t('ac.common.saved'));
      onChanged();
    } catch (e) {
      toast(t('ac.common.failed', { code: errorCode(e) }));
    }
  };
  return (
    <Sheet visible onClose={onClose} title={`${t(`community.topics.${room.topic}.name`)} · ${room.language}`} maxWidth={600} testID="admin-room-sheet">
      <View style={{ gap: 14 }}>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {room.paused ? <Button label={t('ac.community.actions.resume')} size="sm" onPress={() => onAction(room, 'resume').then(onClose)} /> : <Button label={t('ac.community.actions.pause')} size="sm" variant="secondary" onPress={() => onAction(room, 'pause').then(onClose)} testID="admin-room-pause" />}
          {room.archived ? <Button label={t('ac.community.actions.restore')} size="sm" variant="secondary" onPress={() => onAction(room, 'restore').then(onClose)} /> : <Button label={t('ac.community.actions.archive')} size="sm" variant="danger" onPress={() => onAction(room, 'archive').then(onClose)} />}
        </View>
        <AppText variant="bodyStrong" style={{ color: c.text }}>
          {t('ac.community.noticeTitle')}
        </AppText>
        <AppText variant="caption" style={{ color: c.textMuted }}>
          {t('ac.community.noticeBody')}
        </AppText>
        <TextField value={notice} onChangeText={setNotice} multiline placeholder={t('ac.community.noticePlaceholder')} testID="admin-room-notice" />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <AppText variant="small">{t('ac.community.pin')}</AppText>
          <Toggle value={pin} onValueChange={setPin} label={t('ac.community.pin')} />
        </View>
        <Button label={t('ac.community.postNotice')} onPress={post} disabled={notice.trim().length < 5} style={{ alignSelf: 'flex-start' }} />
        <AppText variant="bodyStrong" style={{ color: c.text }}>
          {t('ac.community.descTitle')}
        </AppText>
        <TextField label="English" value={desc.en} onChangeText={(v) => setDesc({ ...desc, en: v })} multiline />
        <TextField label="ქართული" value={desc.ka} onChangeText={(v) => setDesc({ ...desc, ka: v })} multiline />
        <Button label={t('ac.common.save')} variant="secondary" onPress={saveDesc} style={{ alignSelf: 'flex-start' }} />
      </View>
    </Sheet>
  );
}
