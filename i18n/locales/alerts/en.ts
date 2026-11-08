/**
 * Notifications & reminders (namespace `alerts`), English source.
 * Imported into each language's 3.0 file (../v3/<code>.ts) like `ac`.
 *
 * Voice: warm and unhurried. Reminders invite, they never count, compare or
 * warn (docs/ETHICS.md: no streaks, guilt or nagging). Reminder texts appear
 * on lock screens, so they never mention moods or anything personal.
 */
export const alertsEn = {
  settings: {
    title: 'Notifications & reminders',
    entry: 'Notifications & reminders',
    entryHint: 'Gentle reminders, chats and messages',
  },
  reminders: {
    section: 'Gentle reminders',
    intro: 'A quiet nudge for what helps you. No streaks — skipping a day is fine.',
    enable: 'Reminders on this phone',
    journal: 'Journal',
    journalHint: 'A moment to write, once a day',
    art: 'Art therapy',
    artHint: 'Every few days, or to finish a session you started',
    cards: 'Reflection cards',
    cardsHint: 'Every few days',
    time: 'Time',
    earlier: 'Earlier',
    later: 'Later',
    smart: 'Smart timing',
    smartHint: 'Learns when you usually write and reminds you then. Skips days you have already written and eases off when you take a break.',
    next: 'Next reminder: {when} · {what}',
    none: 'No reminders planned for the next few days.',
    denied: 'Notifications for BeHappy are turned off in your phone’s settings.',
    openSettings: 'Open settings',
  },
  chats: {
    section: 'Chats and messages',
    intro: 'Know when someone writes to you, even when BeHappy is closed.',
    enable: 'Notifications on this phone',
    community: 'Community: replies, mentions and rooms you follow',
    messages: 'Private messages',
    appointments: 'Appointments',
    account: 'Account, membership and support',
    previews: 'Show who wrote',
    previewsHint: 'Off: a notification only says “New message”. What people write is never shown.',
    web: 'Browser notifications while BeHappy is open in a tab',
    webDenied: 'Your browser blocks notifications for this site.',
    unavailable: 'This version of the app can’t receive notifications on this phone. Everything still appears in the app, with unread counts.',
    roomHint: 'To follow a room, open its settings and choose “Every message”.',
  },
  quiet: {
    title: 'Quiet hours',
    hint: 'Nothing arrives during these hours; what is still unread comes as one summary afterwards.',
    from: 'From',
    to: 'Until',
  },
  web: {
    newActivity: 'You have something new in BeHappy',
  },
  copy: {
    journal: {
      titles: ['A moment for yourself', 'Your journal is here', 'An evening pause'],
      bodies: ['How was today? A few lines are enough.', 'Write down one thing you noticed today, big or small.', 'What would you like to remember about today?'],
    },
    journalSoft: {
      titles: ['Take it gently', 'A softer moment'],
      bodies: ['If today feels heavy, a few words or one slow breath can help.', 'No need to write much. One sentence is plenty.'],
    },
    art: {
      titles: ['Time to draw?', 'Your art space is open'],
      bodies: ['Ten quiet minutes with colours can settle the mind.', 'A new art therapy session is waiting whenever you are.'],
    },
    artContinue: {
      titles: ['Pick up where you left off'],
      bodies: ['Your art therapy session is waiting for you.'],
    },
    cards: {
      titles: ['Draw a card', 'A question for today'],
      bodies: ['A reflection card can show your day from a new side.', 'Pick a card and see what it brings up.'],
    },
  },
};
