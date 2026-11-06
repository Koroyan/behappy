// Phone verification for professional applicants.
//
// Drivers:
//  - "twilio": Twilio Verify (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN,
//    TWILIO_VERIFY_SERVICE_SID). Twilio generates and checks the code.
//  - "log": development only. A 6-digit code is stored (hashed) like email
//    codes and put in the dev outbox.
//  - "none": unavailable (503).

import { createCode, consumeCode } from '../identity.mjs';

const E164 = /^\+[1-9]\d{6,14}$/;
export const normalizePhone = (value) => {
  const digits = String(value || '').replace(/[\s().-]/g, '');
  return E164.test(digits) ? digits : null;
};

export function createSms({ driver = 'log', isProduction = false, fixedCode = null, twilioAccountSid = '', twilioAuthToken = '', twilioVerifyServiceSid = '', fetchImpl = globalThis.fetch } = {}) {
  const effective = driver === 'log' && isProduction ? 'none' : driver;
  const available = effective === 'twilio' ? Boolean(twilioAccountSid && twilioAuthToken && twilioVerifyServiceSid) : effective === 'log';
  const outbox = [];

  const unavailable = () => {
    const err = new Error('SMS is not configured on this server.');
    err.status = 503;
    err.code = 'sms_unavailable';
    throw err;
  };

  const twilio = async (pathPart, form) => {
    const res = await fetchImpl(`https://verify.twilio.com/v2/Services/${twilioVerifyServiceSid}/${pathPart}`, {
      method: 'POST',
      headers: { Authorization: `Basic ${Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(form).toString(),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      const err = new Error(`SMS provider answered ${res.status}`);
      err.status = 502;
      err.code = 'sms_failed';
      throw err;
    }
    return res.json();
  };

  return {
    driver: effective,
    available,
    outbox,
    lastTo: (phone) => outbox.filter((m) => m.to === phone).at(-1) || null,
    async start(q, { accountId, phone, now }) {
      if (!available) unavailable();
      if (effective === 'twilio') {
        await twilio('Verifications', { To: phone, Channel: 'sms' });
        return;
      }
      const code = await createCode(q, { accountId, purpose: 'verify_phone', target: phone, now, fixedCode: isProduction ? null : fixedCode });
      outbox.push({ to: phone, text: `BeHappy code: ${code}`, at: now });
      if (outbox.length > 200) outbox.shift();
      console.log(`[sms:dev] to ${phone.slice(0, 4)}***: BeHappy code`);
    },
    async check(q, { accountId, phone, code, now }) {
      if (!available) unavailable();
      if (effective === 'twilio') {
        const r = await twilio('VerificationCheck', { To: phone, Code: String(code || '') });
        return r.status === 'approved' ? { ok: true, target: phone } : { ok: false, error: 'code_wrong' };
      }
      const result = await consumeCode(q, { accountId, purpose: 'verify_phone', code, now });
      if (result.ok && result.target !== phone) return { ok: false, error: 'code_wrong' };
      return result;
    },
  };
}
