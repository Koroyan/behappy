// Community topics, languages and the small fixed vocabularies the API accepts.

export const TOPICS = [
  { id: 'panic', icon: 'pulse-outline' },
  { id: 'anxiety', icon: 'cloudy-outline' },
  { id: 'stress', icon: 'thunderstorm-outline' },
  { id: 'burnout', icon: 'battery-dead-outline' },
  { id: 'depression', icon: 'rainy-outline' },
  { id: 'grief', icon: 'flower-outline' },
  { id: 'loneliness', icon: 'person-outline' },
  { id: 'relationships', icon: 'people-outline' },
  { id: 'self_esteem', icon: 'sparkles-outline' },
  { id: 'sleep', icon: 'moon-outline' },
  { id: 'emotional_regulation', icon: 'water-outline' },
  { id: 'growth', icon: 'leaf-outline' },
  { id: 'general', icon: 'chatbubbles-outline' },
];

// The 19 app languages: every topic has its own room in each.
export const LANGUAGES = ['ka', 'en', 'ru', 'hy', 'uk', 'tr', 'az', 'de', 'fr', 'es', 'it', 'pt', 'pl', 'id', 'ar', 'hi', 'zh', 'ja', 'ko'];

export const REACTIONS = ['support', 'hug', 'strength', 'thanks', 'same'];

export const REPORT_REASONS = ['harassment', 'hate', 'self_harm_risk', 'spam', 'misinformation', 'impersonation', 'sexual', 'privacy', 'violence', 'other'];

export const roomId = (topic, lang) => `${topic}:${lang}`;
export const isRoomId = (id) => {
  const [topic, lang] = String(id || '').split(':');
  return TOPICS.some((t) => t.id === topic) && LANGUAGES.includes(lang);
};

/** Creates every topic and every language room (idempotent). */
export async function seedCommunity(db) {
  await db.tx(async (t) => {
    for (const [i, topic] of TOPICS.entries()) {
      await t.query('insert into community_topics (id, sort, icon) values ($1, $2, $3) on conflict (id) do update set sort = excluded.sort, icon = excluded.icon', [topic.id, i, topic.icon]);
      for (const lang of LANGUAGES) {
        await t.query('insert into community_rooms (id, topic_id, language) values ($1, $2, $3) on conflict (id) do nothing', [roomId(topic.id, lang), topic.id, lang]);
      }
    }
  });
}
