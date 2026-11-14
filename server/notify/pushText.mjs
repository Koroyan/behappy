// Text for phone notifications, in the language the phone uses.
//
// A push is shown by the phone's operating system, so the server writes it.
// It never contains what anyone wrote: private messages are encrypted at rest
// and community posts can be personal. With "show who wrote and where" on
// (the default) it says who and in which room: the room's name as the title
// ("Panic attacks"), the person's community pseudonym or professional name in
// the text ("New message from Nino"). Turned off, a push only says "BeHappy:
// You have a new message" (lock screens are visible to others).

import { TOPIC_NAMES } from './topicNames.mjs';

const TEXT = {
  en: {
    message: 'You have a new message',
    notification: 'You have a new notification',
    summary: 'New notifications: {n}',
    community_reply: '{name} replied to you',
    community_mention: '{name} mentioned you',
    community_activity: 'New messages in a room you follow',
    pro_message: 'New message from {name}',
    appointment: 'Update about an appointment',
    account: 'Update about your account',
  },
  ka: {
    message: 'ახალი შეტყობინება გაქვს',
    notification: 'ახალი ამბავი გაქვს',
    summary: 'ახალი შეტყობინებები: {n}',
    community_reply: '{name}-მა გიპასუხა',
    community_mention: '{name}-მა მოგიხსენია',
    community_activity: 'ახალი შეტყობინებები ოთახში, რომელსაც მიჰყვები',
    pro_message: 'ახალი შეტყობინება — {name}',
    appointment: 'სიახლე შეხვედრის შესახებ',
    account: 'სიახლე შენი ანგარიშის შესახებ',
  },
  ru: {
    message: 'У вас новое сообщение',
    notification: 'У вас новое уведомление',
    summary: 'Новых уведомлений: {n}',
    community_reply: '{name} ответил(а) вам',
    community_mention: '{name} упомянул(а) вас',
    community_activity: 'Новые сообщения в комнате, за которой вы следите',
    pro_message: 'Новое сообщение: {name}',
    appointment: 'Новости о вашей встрече',
    account: 'Новости о вашем аккаунте',
  },
  hy: {
    message: 'Նոր հաղորդագրություն ունեք',
    notification: 'Նոր ծանուցում ունեք',
    summary: 'Նոր ծանուցումներ՝ {n}',
    community_reply: '{name}-ը պատասխանեց ձեզ',
    community_mention: '{name}-ը հիշատակեց ձեզ',
    community_activity: 'Նոր հաղորդագրություններ ձեր հետևած սենյակում',
    pro_message: 'Նոր հաղորդագրություն՝ {name}',
    appointment: 'Նորություն հանդիպման մասին',
    account: 'Նորություն ձեր հաշվի մասին',
  },
  uk: {
    message: 'У вас нове повідомлення',
    notification: 'У вас нове сповіщення',
    summary: 'Нових сповіщень: {n}',
    community_reply: '{name} відповідає вам',
    community_mention: '{name} згадує вас',
    community_activity: 'Нові повідомлення в кімнаті, за якою ви стежите',
    pro_message: 'Нове повідомлення: {name}',
    appointment: 'Новини про вашу зустріч',
    account: 'Новини про ваш обліковий запис',
  },
  az: {
    message: 'Yeni mesajınız var',
    notification: 'Yeni bildirişiniz var',
    summary: 'Yeni bildirişlər: {n}',
    community_reply: '{name} sizə cavab verdi',
    community_mention: '{name} sizi qeyd etdi',
    community_activity: 'İzlədiyiniz otaqda yeni mesajlar var',
    pro_message: 'Yeni mesaj: {name}',
    appointment: 'Görüşünüzlə bağlı yenilik',
    account: 'Hesabınızla bağlı yenilik',
  },
  tr: {
    message: 'Yeni bir mesajın var',
    notification: 'Yeni bir bildirimin var',
    summary: 'Yeni bildirimler: {n}',
    community_reply: '{name} sana yanıt verdi',
    community_mention: '{name} senden bahsetti',
    community_activity: 'Takip ettiğin odada yeni mesajlar var',
    pro_message: 'Yeni mesaj: {name}',
    appointment: 'Randevunla ilgili bir güncelleme',
    account: 'Hesabınla ilgili bir güncelleme',
  },
  de: {
    message: 'Du hast eine neue Nachricht',
    notification: 'Du hast eine neue Mitteilung',
    summary: 'Neue Mitteilungen: {n}',
    community_reply: '{name} hat dir geantwortet',
    community_mention: '{name} hat dich erwähnt',
    community_activity: 'Neue Nachrichten in einem Raum, dem du folgst',
    pro_message: 'Neue Nachricht von {name}',
    appointment: 'Neuigkeit zu einem Termin',
    account: 'Neuigkeit zu deinem Konto',
  },
  fr: {
    message: 'Vous avez un nouveau message',
    notification: 'Vous avez une nouvelle notification',
    summary: 'Nouvelles notifications : {n}',
    community_reply: '{name} vous a répondu',
    community_mention: '{name} vous a mentionné(e)',
    community_activity: 'Nouveaux messages dans un salon que vous suivez',
    pro_message: 'Nouveau message de {name}',
    appointment: 'Du nouveau sur un rendez-vous',
    account: 'Du nouveau sur votre compte',
  },
  es: {
    message: 'Tienes un mensaje nuevo',
    notification: 'Tienes una notificación nueva',
    summary: 'Notificaciones nuevas: {n}',
    community_reply: '{name} te respondió',
    community_mention: '{name} te mencionó',
    community_activity: 'Mensajes nuevos en una sala que sigues',
    pro_message: 'Mensaje nuevo de {name}',
    appointment: 'Novedades sobre una cita',
    account: 'Novedades sobre tu cuenta',
  },
  it: {
    message: 'Hai un nuovo messaggio',
    notification: 'Hai una nuova notifica',
    summary: 'Nuove notifiche: {n}',
    community_reply: '{name} ti ha risposto',
    community_mention: '{name} ti ha menzionato',
    community_activity: 'Nuovi messaggi in una stanza che segui',
    pro_message: 'Nuovo messaggio da {name}',
    appointment: 'Novità su un appuntamento',
    account: 'Novità sul tuo account',
  },
  pt: {
    message: 'Tem uma nova mensagem',
    notification: 'Tem uma nova notificação',
    summary: 'Novas notificações: {n}',
    community_reply: '{name} respondeu-lhe',
    community_mention: 'Menção de {name}',
    community_activity: 'Novas mensagens numa sala que segue',
    pro_message: 'Nova mensagem de {name}',
    appointment: 'Novidade sobre uma consulta',
    account: 'Novidade sobre a sua conta',
  },
  pl: {
    message: 'Masz nową wiadomość',
    notification: 'Masz nowe powiadomienie',
    summary: 'Nowe powiadomienia: {n}',
    community_reply: 'Odpowiedź od: {name}',
    community_mention: 'Wzmianka od: {name}',
    community_activity: 'Nowe wiadomości w pokoju, który obserwujesz',
    pro_message: 'Nowa wiadomość: {name}',
    appointment: 'Nowość dotycząca spotkania',
    account: 'Nowość dotycząca Twojego konta',
  },
  ar: {
    message: 'لديك رسالة جديدة',
    notification: 'لديك إشعار جديد',
    summary: 'إشعارات جديدة: {n}',
    community_reply: 'ردّ عليك {name}',
    community_mention: 'ذكرك {name}',
    community_activity: 'رسائل جديدة في غرفة تتابعها',
    pro_message: 'رسالة جديدة من {name}',
    appointment: 'تحديث بشأن موعد',
    account: 'تحديث بشأن حسابك',
  },
  hi: {
    message: 'आपके लिए एक नया संदेश है',
    notification: 'आपके लिए एक नई सूचना है',
    summary: 'नई सूचनाएँ: {n}',
    community_reply: '{name} ने आपको जवाब दिया',
    community_mention: '{name} ने आपका ज़िक्र किया',
    community_activity: 'आप जिस कमरे को फ़ॉलो करते हैं, उसमें नए संदेश',
    pro_message: '{name} का नया संदेश',
    appointment: 'एक अपॉइंटमेंट के बारे में अपडेट',
    account: 'आपके खाते के बारे में अपडेट',
  },
  id: {
    message: 'Ada pesan baru untukmu',
    notification: 'Ada notifikasi baru untukmu',
    summary: 'Notifikasi baru: {n}',
    community_reply: '{name} membalasmu',
    community_mention: '{name} menyebutmu',
    community_activity: 'Pesan baru di ruang yang kamu ikuti',
    pro_message: 'Pesan baru dari {name}',
    appointment: 'Kabar tentang janji temu',
    account: 'Kabar tentang akunmu',
  },
  ja: {
    message: '新しいメッセージがあります',
    notification: '新しいお知らせがあります',
    summary: '新しいお知らせ: {n}件',
    community_reply: '{name}さんから返信がありました',
    community_mention: '{name}さんがあなたをメンションしました',
    community_activity: 'フォロー中のルームに新しいメッセージがあります',
    pro_message: '{name}さんから新しいメッセージ',
    appointment: '予約についてのお知らせ',
    account: 'アカウントについてのお知らせ',
  },
  ko: {
    message: '새 메시지가 있어요',
    notification: '새 알림이 있어요',
    summary: '새 알림: {n}개',
    community_reply: '{name}님이 답장했어요',
    community_mention: '{name}님이 회원님을 언급했어요',
    community_activity: '팔로우하는 방에 새 메시지가 있어요',
    pro_message: '{name}님의 새 메시지',
    appointment: '예약 관련 소식',
    account: '계정 관련 소식',
  },
  zh: {
    message: '你有一条新消息',
    notification: '你有一条新通知',
    summary: '新通知：{n} 条',
    community_reply: '{name} 回复了你',
    community_mention: '{name} 提到了你',
    community_activity: '你关注的房间有新消息',
    pro_message: '来自 {name} 的新消息',
    appointment: '关于预约的新动态',
    account: '关于你账户的新动态',
  },
};

export const PUSH_LANGUAGES = Object.keys(TEXT);

const fill = (s, vars) => s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined && vars[k] !== null && vars[k] !== '' ? String(vars[k]) : m));

/** The phone category a notification belongs to (one switch per category in the app). */
export function categoryOf(kind) {
  if (kind.startsWith('community_')) return 'community';
  if (kind === 'pro_message') return 'messages';
  if (kind.startsWith('booking_')) return 'appointments';
  return 'account';
}

/** Name of the person behind a notification, when it has one. */
const nameOf = (n) => {
  const d = n.data || {};
  if (n.kind === 'pro_message') return d.from || '';
  if (n.kind.startsWith('community_')) return d.pseudonym || '';
  return '';
};

const languageOf = (language) => (TEXT[language] ? language : TEXT[String(language || '').split('-')[0]] ? String(language).split('-')[0] : 'en');

/** A community room's name in the phone's language ("panic:en" → "Panic attacks"), or ''. */
export function roomName(language, roomId) {
  const topic = String(roomId || '').split(':')[0];
  return TOPIC_NAMES[languageOf(language)]?.[topic] || TOPIC_NAMES.en?.[topic] || '';
}

/** The room all these notifications are about, if they are about one room. */
export function roomOf(items) {
  const id = items[0]?.data?.roomId;
  return id && items.every((n) => n.kind.startsWith('community_') && n.data?.roomId === id) ? String(id) : '';
}

/**
 * Title and body for one push. `items` are the notifications it covers (one,
 * or several merged into a summary). `previews`: say who wrote and where.
 */
export function pushText(language, items, { previews = true } = {}) {
  const tx = TEXT[languageOf(language)];
  const title = 'BeHappy';
  const room = previews ? roomName(language, roomOf(items)) : '';
  if (items.length > 1) return { title: room || title, body: fill(tx.summary, { n: items.length }) };
  const n = items[0];
  const chat = ['community', 'messages'].includes(categoryOf(n.kind));
  if (!previews) return { title, body: chat ? tx.message : tx.notification };
  const name = nameOf(n);
  if (n.kind === 'community_activity') return { title: room || title, body: name ? fill(tx.pro_message, { name }) : tx.community_activity };
  if (n.kind === 'pro_message') return name ? { title: name, body: tx.message } : { title, body: tx.message };
  if (name && tx[n.kind]) return { title: room || title, body: fill(tx[n.kind], { name }) };
  if (chat) return { title: room || title, body: tx.message };
  return { title, body: categoryOf(n.kind) === 'appointments' ? tx.appointment : tx.account };
}

/** Where tapping the push opens the app (the same places as the in-app list). */
export function pushUrl(items) {
  if (items.length !== 1) return '/notifications';
  const n = items[0];
  const d = n.data || {};
  if (n.kind.startsWith('community_') && d.roomId) return `/community/${d.roomId}`;
  if (n.kind === 'pro_message' && d.threadId) return `/messages/${d.threadId}`;
  if (n.kind.startsWith('booking_') && d.bookingId && !['booking_requested', 'booking_confirmed_auto'].includes(n.kind)) return `/appointments/${d.bookingId}`;
  if (n.kind === 'booking_requested' || n.kind === 'booking_confirmed_auto') return '/pro/bookings';
  if (n.kind === 'support_reply' && d.ticketId) return `/support/${d.ticketId}`;
  if (n.kind === 'payment_approved' || n.kind === 'payment_refunded') return '/purchases';
  if (n.kind === 'plus_ending' || n.kind === 'plus_ended') return '/pricing';
  return '/notifications';
}
