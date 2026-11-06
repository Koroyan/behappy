// Outgoing email (verification codes, password resets, booking and
// membership notices).
//
// Drivers:
//  - "resend": https://resend.com HTTP API (RESEND_API_KEY, MAIL_FROM). The
//    owner must create the account and verify the sending domain.
//  - "log": development only. Messages go to an in-memory outbox (readable by
//    the DEV_TOOLS endpoint and tests) and a one-line console note.
//  - "none": email is unavailable; features that need it answer 503.
// In production the "log" driver is refused, so codes are never just printed.

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;
export const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
export const isEmail = (value) => EMAIL.test(normalizeEmail(value)) && normalizeEmail(value).length <= 254;
export const maskEmail = (email) => {
  const [user, domain] = String(email).split('@');
  return `${(user || '').slice(0, 2)}***@${domain || ''}`;
};

export function createMailer({ driver = 'log', from = '', resendApiKey = '', isProduction = false, fetchImpl = globalThis.fetch } = {}) {
  const outbox = [];
  const effective = driver === 'log' && isProduction ? 'none' : driver;
  const available = effective === 'resend' ? Boolean(resendApiKey && from) : effective === 'log';

  async function send({ to, subject, text }) {
    if (!available) {
      const err = new Error('Email is not configured on this server.');
      err.status = 503;
      err.code = 'email_unavailable';
      throw err;
    }
    if (effective === 'log') {
      outbox.push({ to: normalizeEmail(to), subject, text, at: Date.now() });
      if (outbox.length > 200) outbox.shift();
      console.log(`[mail:dev] to ${maskEmail(to)}: ${subject}`);
      return { id: `dev-${outbox.length}` };
    }
    const res = await fetchImpl('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [normalizeEmail(to)], subject, text }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      const err = new Error(`Email provider answered ${res.status}`);
      err.status = 502;
      err.code = 'email_failed';
      throw err;
    }
    return res.json().catch(() => ({}));
  }

  return { driver: effective, available, send, outbox, lastTo: (to) => outbox.filter((m) => m.to === normalizeEmail(to)).at(-1) || null };
}

// Short transactional texts. The app shows most notices in-app (translated by
// the app itself); email carries only codes and essential reminders.
const TEXTS = {
  en: {
    verifySubject: 'Your BeHappy code: {code}',
    verifyBody: 'Your BeHappy verification code is {code}. It expires in 15 minutes.\n\nIf you did not ask for it, you can ignore this email.',
    resetSubject: 'Reset your BeHappy password',
    resetBody: 'Your BeHappy password reset code is {code}. It expires in 15 minutes.\n\nIf you did not ask for it, your password stays as it is.',
    notice: '{text}\n\nOpen BeHappy to see the details.',
  },
  ka: {
    verifySubject: 'შენი BeHappy კოდი: {code}',
    verifyBody: 'შენი BeHappy დადასტურების კოდია {code}. ის 15 წუთში იწურება.\n\nთუ ეს კოდი არ გითხოვია, შეგიძლია ეს წერილი უგულებელყო.',
    resetSubject: 'BeHappy-ის პაროლის აღდგენა',
    resetBody: 'შენი BeHappy პაროლის აღდგენის კოდია {code}. ის 15 წუთში იწურება.\n\nთუ ეს არ გითხოვია, პაროლი უცვლელი რჩება.',
    notice: '{text}\n\nდეტალებისთვის გახსენი BeHappy.',
  },
  ru: {
    verifySubject: 'Ваш код BeHappy: {code}',
    verifyBody: 'Ваш код подтверждения BeHappy: {code}. Он действует 15 минут.\n\nЕсли вы его не запрашивали, просто проигнорируйте это письмо.',
    resetSubject: 'Сброс пароля BeHappy',
    resetBody: 'Ваш код для сброса пароля BeHappy: {code}. Он действует 15 минут.\n\nЕсли вы его не запрашивали, пароль останется прежним.',
    notice: '{text}\n\nОткройте BeHappy, чтобы увидеть подробности.',
  },
};

export function mailText(lang, key, vars = {}) {
  const table = TEXTS[lang] || TEXTS.en;
  const template = table[key] || TEXTS.en[key] || '';
  return template.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m));
}
