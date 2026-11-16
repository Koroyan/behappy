/**
 * Finding a room that is alive, without manufacturing activity:
 * - the person's topic first (a chip they choose, kept on this device);
 * - rooms with real messages this week ("Active today / this week"); the
 *   quiet ones folded away, still one tap from joining;
 * - discussions scheduled and hosted by real people;
 * - an honest note when few moderators read a language;
 * - in a quiet room: first-post guidance and conversation ideas the person
 *   can put in their own words (nothing is posted for them), and the same
 *   topic in other languages — posts are never translated or moved.
 */
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import { type AppLanguage, LANGUAGE_NAMES } from '@/contexts/LanguageContext';
import { AppText, Badge, Banner, Button, Card, Chip, Icon, IconName, Press, radius, SectionHeader, Sheet, Skeleton, space, useFeedback, useTheme } from '@/design';
import { useT } from '@/i18n';
import { trackAction } from '@/lib/analytics';
import { ApiError } from '@/lib/api/client';
import { CommunityEvent, Discover, DiscoverRoom, discoverRooms, relatedRooms, RoomActivity, setEventInterest, TOPIC_IDS, TopicId } from '@/lib/api/community';
import { loadStart } from '@/lib/onboarding';
import { readJson, writeJson } from '@/lib/storage/json';

const TOPIC_KEY = '@behappy_community_topic_v1';
/** The first-launch choice suggests a topic until the person picks one. */
const GOAL_TOPIC: Record<string, TopicId> = { stress: 'stress', sleep: 'sleep' };

export async function loadTopicChoice(): Promise<TopicId | null> {
  const saved = await readJson<{ topic?: string | null }>(TOPIC_KEY, {});
  if (saved.topic === null) return null;
  if (saved.topic && (TOPIC_IDS as readonly string[]).includes(saved.topic)) return saved.topic as TopicId;
  const start = await loadStart().catch(() => null);
  return (start?.goal && GOAL_TOPIC[start.goal]) || null;
}

/** "Active today" / "Active this week" / "Quiet for now": real messages, never counts. */
export function ActivityTag({ activity }: { activity: RoomActivity }) {
  const { t } = useT();
  const { colors } = useTheme();
  const color = activity === 'today' ? colors.success : activity === 'week' ? colors.brand : colors.textTertiary;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }} accessibilityLabel={t(`jr.discover.activity.${activity}`)}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      <AppText variant="caption" color="textSecondary">
        {t(`jr.discover.activity.${activity}`)}
      </AppText>
    </View>
  );
}

function DiscoverRoomCard({ room, onPress, showLanguage }: { room: DiscoverRoom; onPress: () => void; showLanguage?: boolean }) {
  const { t, tp } = useT();
  const { colors } = useTheme();
  return (
    <Press
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={`${t(`community.topics.${room.topic}.name`)}. ${t(`jr.discover.activity.${room.activity}`)}`}
      testID={`discover-room-${room.id}`}
      feedback="scale"
      style={{ flexBasis: 280, flexGrow: 1, padding: 16, borderRadius: radius.xl, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 8 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={room.icon as IconName} size={20} color="onPrimarySoft" />
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <AppText variant="bodyStrong" numberOfLines={2}>
            {t(`community.topics.${room.topic}.name`)}
            {showLanguage && LANGUAGE_NAMES[room.language as AppLanguage] ? ` · ${LANGUAGE_NAMES[room.language as AppLanguage]}` : ''}
          </AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <ActivityTag activity={room.activity} />
            <AppText variant="caption" color="textTertiary">
              {tp('community.members', room.members)}
            </AppText>
          </View>
        </View>
        {room.joined ? <Badge label={t('community.joined')} tone="muted" /> : null}
      </View>
      <AppText variant="small" color="textSecondary" numberOfLines={2}>
        {t(`community.topics.${room.topic}.about`)}
      </AppText>
    </Press>
  );
}

/** A discussion with a real host; "I'm interested" only reminds the person, nobody sees who. */
export function EventCard({ event, onChange }: { event: CommunityEvent; onChange?: (e: CommunityEvent) => void }) {
  const { t, formatDate, formatTime } = useT();
  const { toast } = useFeedback();
  const [busy, setBusy] = useState(false);
  const toggle = async () => {
    setBusy(true);
    try {
      const r = await setEventInterest(event.id, !event.interested);
      if (r.interested) trackAction('community', 'event_interest');
      onChange?.({ ...event, interested: r.interested, interestCount: r.interestCount });
    } catch (e) {
      const code = e instanceof ApiError ? e.code : '';
      toast(code === 'profile_required' || code === 'registration_required' ? t('jr.discover.needProfile') : t('community.errors.generic'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card tone="lavender" padding={16} testID={`event-${event.id}`}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
        <Icon name="calendar-outline" size={22} color="onLavenderSoft" />
        <View style={{ flex: 1, gap: 4 }}>
          <AppText variant="caption" color="onLavenderSoft">
            {event.live ? t('jr.discover.live') : `${formatDate(event.startsAt, { weekday: 'short', day: 'numeric', month: 'short' })} · ${formatTime(event.startsAt)}`}
            {' · '}
            {t(`community.topics.${event.topic}.name`)}
          </AppText>
          <AppText variant="bodyStrong">{event.title}</AppText>
          {event.description ? (
            <AppText variant="small" color="textSecondary" numberOfLines={3}>
              {event.description}
            </AppText>
          ) : null}
          <AppText variant="caption" color="textSecondary">
            {t('jr.discover.host', { name: event.host.name, role: t(`jr.discover.roles.${event.host.role}`) })}
            {event.interestCount ? ` · ${t('jr.discover.interestCount', { n: event.interestCount })}` : ''}
          </AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
            <Button label={event.interested ? t('jr.discover.interestedOn') : t('jr.discover.interested')} icon={event.interested ? 'checkmark' : 'notifications-outline'} size="sm" variant={event.interested ? 'secondary' : 'primary'} onPress={toggle} loading={busy} testID={`event-interest-${event.id}`} />
          </View>
          <AppText variant="caption" color="textTertiary">
            {t('jr.discover.eventHint')}
          </AppText>
        </View>
      </View>
    </Card>
  );
}

/** The same topic in other languages: only rooms with messages this week. */
export function RelatedSheet({ topic, exclude, visible, onClose }: { topic: TopicId; exclude: string; visible: boolean; onClose: () => void }) {
  const router = useRouter();
  const { t } = useT();
  const [rooms, setRooms] = useState<DiscoverRoom[] | null>(null);
  useEffect(() => {
    if (!visible) return;
    setRooms(null);
    relatedRooms(topic, exclude)
      .then(setRooms)
      .catch(() => setRooms([]));
  }, [visible, topic, exclude]);
  return (
    <Sheet visible={visible} onClose={onClose} title={t('jr.discover.relatedTitle', { topic: t(`community.topics.${topic}.name`) })} subtitle={t('jr.discover.relatedBody')} testID="related-sheet">
      <View style={{ gap: space[3], paddingBottom: space[4] }}>
        {rooms === null ? (
          <Skeleton height={80} radius={22} />
        ) : rooms.length ? (
          rooms.map((r) => (
            <DiscoverRoomCard
              key={r.id}
              room={r}
              showLanguage
              onPress={() => {
                onClose();
                router.push(`/community/${encodeURIComponent(r.id)}` as never);
              }}
            />
          ))
        ) : (
          <AppText variant="small" color="textSecondary">
            {t('jr.discover.relatedNone')}
          </AppText>
        )}
      </View>
    </Sheet>
  );
}

/** Community tab: the person's topic, discussions, active rooms; quiet rooms folded. */
export function DiscoverRooms({ language, onOpen }: { language: AppLanguage; onOpen: (roomId: string) => void }) {
  const { t } = useT();
  const [topic, setTopic] = useState<TopicId | null | undefined>(undefined);
  const [data, setData] = useState<Discover | null>(null);
  const [failed, setFailed] = useState(false);
  const [showQuiet, setShowQuiet] = useState(false);
  const [relatedOpen, setRelatedOpen] = useState(false);

  useEffect(() => {
    loadTopicChoice().then(setTopic).catch(() => setTopic(null));
  }, []);

  const load = useCallback(() => {
    if (topic === undefined) return;
    setFailed(false);
    discoverRooms(language, topic)
      .then(setData)
      .catch(() => setFailed(true));
  }, [language, topic]);
  useFocusEffect(load);
  useEffect(() => {
    trackAction('community', 'discover_opened');
  }, []);

  const pick = (next: TopicId | null) => {
    setTopic(next);
    setData(null);
    writeJson(TOPIC_KEY, { topic: next }).catch(() => {});
  };
  const updateEvent = (e: CommunityEvent) => setData((d) => (d ? { ...d, events: d.events.map((x) => (x.id === e.id ? e : x)) } : d));

  return (
    <View style={{ gap: space[5] }} testID="community-discover">
      <View>
        <SectionHeader title={t('jr.discover.topicQuestion')} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Chip label={t('jr.discover.anyTopic')} selected={topic === null} onPress={() => pick(null)} testID="discover-topic-any" />
          {TOPIC_IDS.map((id) => (
            <Chip key={id} label={t(`community.topics.${id}.name`)} selected={topic === id} onPress={() => pick(id)} testID={`discover-topic-${id}`} />
          ))}
        </View>
      </View>

      {failed ? <Banner tone="danger" body={t('community.errors.generic')} action={<Button label={t('common.retry')} size="sm" variant="secondary" onPress={load} />} /> : null}
      {!data && !failed ? (
        <View style={{ gap: 12 }}>
          <Skeleton height={96} radius={22} />
          <Skeleton height={96} radius={22} />
        </View>
      ) : null}

      {data ? (
        <>
          {data.moderation.coverage === 'limited' ? <Banner tone="info" icon="shield-checkmark-outline" body={t('jr.discover.moderationLimited', { language: LANGUAGE_NAMES[language] })} /> : null}

          {data.events.length ? (
            <View>
              <SectionHeader title={t('jr.discover.events')} />
              <View style={{ gap: space[3] }}>
                {data.events.map((e) => (
                  <EventCard key={e.id} event={e} onChange={updateEvent} />
                ))}
              </View>
            </View>
          ) : null}

          {data.topicRoom ? (
            <View>
              <SectionHeader title={t('jr.discover.yourTopic')} />
              <DiscoverRoomCard room={data.topicRoom} onPress={() => onOpen(data.topicRoom!.id)} />
              {data.topicRoom.activity === 'quiet' ? (
                <View style={{ marginTop: space[2], gap: 6 }}>
                  <AppText variant="small" color="textSecondary">
                    {t('jr.discover.topicQuiet')}
                  </AppText>
                  <Button label={t('jr.discover.otherLanguages')} icon="globe-outline" size="sm" variant="quiet" onPress={() => setRelatedOpen(true)} style={{ alignSelf: 'flex-start' }} testID="discover-related" />
                </View>
              ) : null}
            </View>
          ) : null}

          <View>
            <SectionHeader title={t('jr.discover.activeNow')} />
            {data.active.length ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                {data.active.map((r) => (
                  <DiscoverRoomCard key={r.id} room={r} onPress={() => onOpen(r.id)} />
                ))}
              </View>
            ) : (
              <AppText variant="small" color="textSecondary" testID="discover-none-active">
                {t('jr.discover.activeNone', { language: LANGUAGE_NAMES[language] })}
              </AppText>
            )}
          </View>

          {data.quiet.length ? (
            <View>
              <Press onPress={() => setShowQuiet((v) => !v)} accessibilityRole="button" accessibilityState={{ expanded: showQuiet }} testID="discover-quiet-toggle" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 }}>
                <AppText variant="title3" style={{ flex: 1 }}>
                  {t('jr.discover.quietTitle', { n: data.quiet.length })}
                </AppText>
                <Icon name={showQuiet ? 'chevron-up' : 'chevron-down'} size={18} color="textSecondary" />
              </Press>
              <AppText variant="caption" color="textSecondary" style={{ marginBottom: space[2] }}>
                {t('jr.discover.quietHint')}
              </AppText>
              {showQuiet ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                  {data.quiet.map((r) => (
                    <DiscoverRoomCard key={r.id} room={r} onPress={() => onOpen(r.id)} />
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}
        </>
      ) : null}

      {topic ? <RelatedSheet topic={topic} exclude={language} visible={relatedOpen} onClose={() => setRelatedOpen(false)} /> : null}
    </View>
  );
}

/**
 * Inside a quiet room: honest words, first-post guidance and a few ideas the
 * person can use as a start of their own message (put in the box, never sent
 * for them), and the same topic in other languages.
 */
export function QuietRoomHelp({ topic, language, onStarter }: { topic: TopicId; language: string; onStarter: (text: string) => void }) {
  const { t, tl } = useT();
  const [relatedOpen, setRelatedOpen] = useState(false);
  return (
    <Card tone="muted" padding={16} testID="room-quiet-help">
      <AppText variant="bodyStrong">{t('jr.discover.quietRoomTitle')}</AppText>
      <AppText variant="small" color="textSecondary" style={{ marginTop: 4 }}>
        {t('jr.discover.quietRoomBody')}
      </AppText>
      <AppText variant="smallStrong" style={{ marginTop: space[3] }}>
        {t('jr.discover.firstPostTitle')}
      </AppText>
      <View style={{ gap: 6, marginTop: 6 }}>
        {tl('jr.discover.firstPostTips').map((tip) => (
          <View key={tip} style={{ flexDirection: 'row', gap: 8 }}>
            <Icon name="checkmark-circle-outline" size={18} color="brand" />
            <AppText variant="small" style={{ flex: 1 }}>
              {tip}
            </AppText>
          </View>
        ))}
      </View>
      <AppText variant="smallStrong" style={{ marginTop: space[3] }}>
        {t('jr.discover.startersTitle')}
      </AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
        {tl('jr.discover.starters').map((s, i) => (
          <Chip
            key={s}
            label={s}
            icon="create-outline"
            onPress={() => {
              trackAction('community', 'starter_used');
              onStarter(s);
            }}
            testID={`room-starter-${i}`}
          />
        ))}
      </View>
      <AppText variant="caption" color="textTertiary" style={{ marginTop: 6 }}>
        {t('jr.discover.startersNote')}
      </AppText>
      <Button label={t('jr.discover.otherLanguages')} icon="globe-outline" size="sm" variant="quiet" onPress={() => setRelatedOpen(true)} style={{ alignSelf: 'flex-start', marginTop: space[2] }} testID="room-related" />
      <RelatedSheet topic={topic} exclude={language} visible={relatedOpen} onClose={() => setRelatedOpen(false)} />
    </Card>
  );
}
