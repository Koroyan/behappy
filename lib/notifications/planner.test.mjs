// Run: npm run test:unit
// Gentle reminders: daily journal, art and cards every few days, smart timing,
// easing off after silence, never at night, never for what is already done.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const file = path.join(path.dirname(fileURLToPath(import.meta.url)), 'planner.ts');
const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const mod = { exports: {} };
new Function('module', 'exports', js)(mod, mod.exports);
const { planReminders, usualMinute, welcomeAfter, DEFAULT_REMINDER_PREFS, inQuiet } = mod.exports;

const at = (day, h, m = 0) => new Date(2026, 10, day, h, m).getTime(); // November 2026, local time
const NOW = at(8, 10); // Sunday 8 November, 10:00
const prefs = (p = {}) => ({ ...DEFAULT_REMINDER_PREFS, enabled: true, enabledAt: NOW - 60 * 1000, ...p });
const none = { journal: [], art: [], cards: [], checkIns: [], artUnfinished: null };
const hm = (t) => {
  const d = new Date(t);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
const days = (list) => list.map((r) => new Date(r.at).getDate());

test('off means nothing is planned', () => {
  assert.deepEqual(planReminders(none, { ...DEFAULT_REMINDER_PREFS, enabled: false }, NOW), []);
});

test('journal: once a day at the chosen time, not today if already written', () => {
  const plan = planReminders(none, prefs({ art: false, cards: false }), NOW);
  assert.ok(plan.every((r) => r.kind === 'journal' && hm(r.at) === '20:30'));
  // Daily for three days; if nothing is recorded meanwhile, every other day.
  assert.deepEqual(days(plan), [8, 9, 10, 12, 14]);
  const written = planReminders({ ...none, journal: [at(8, 9)] }, prefs({ art: false, cards: false }), NOW);
  assert.equal(days(written)[0], 9, 'already written today: the first reminder is tomorrow');
});

test('smart timing follows the usual writing time; off uses the chosen time', () => {
  const evenings = [at(1, 21, 5), at(3, 20, 55), at(5, 21, 10), at(6, 21, 0)];
  const plan = planReminders({ ...none, journal: evenings }, prefs({ art: false, cards: false }), NOW);
  assert.equal(hm(plan[0].at), '21:00');
  const fixed = planReminders({ ...none, journal: evenings }, prefs({ art: false, cards: false, smart: false, journalTime: 19 * 60 }), NOW);
  assert.equal(hm(fixed[0].at), '19:00');
  // A night owl around half past midnight is not split across days.
  assert.equal(usualMinute([at(1, 0, 20), at(2, 23, 50), at(3, 0, 40)], NOW, 0), 15);
});

test('never in quiet hours', () => {
  const plan = planReminders(none, prefs({ art: false, cards: false, journalTime: 23 * 60 }), NOW);
  assert.ok(plan.every((r) => !inQuiet(new Date(r.at).getHours() * 60 + new Date(r.at).getMinutes(), 22 * 60, 8 * 60)));
  assert.equal(hm(plan[0].at), '21:30');
});

test('easing off after silence: every other day, then weekly, then nothing', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7, 13, 14, 20, 21].map(welcomeAfter), [true, true, true, false, true, false, true, true, false, true, false, false]);
  const tenDaysAgo = planReminders({ ...none, journal: [at(8, 9) - 10 * 86400000] }, prefs({ enabledAt: 0, art: false, cards: false }), NOW);
  assert.deepEqual(days(tenDaysAgo), [12], 'ten quiet days: one gentle reminder this week');
  const longAgo = planReminders({ ...none, journal: [NOW - 30 * 86400000] }, prefs({ enabledAt: 0 }), NOW);
  assert.deepEqual(longAgo, [], 'after three quiet weeks reminders stop until the app is opened again');
});

test('art every few days, inviting to continue an unfinished session; cards not on art days', () => {
  const plan = planReminders({ ...none, art: [at(6, 18)], artUnfinished: { id: 7, at: at(7, 18) } }, prefs({ journal: false }), NOW);
  const art = plan.filter((r) => r.kind === 'art');
  assert.ok(art.length >= 1);
  assert.equal(new Date(art[0].at).getDate(), 10, 'three days after the last art session');
  assert.equal(art[0].variant, 'continue');
  assert.equal(art[0].url, '/art/session?sessionId=7');
  const cards = plan.filter((r) => r.kind === 'cards');
  assert.ok(cards.length >= 1);
  for (const c of cards) assert.ok(!art.some((a) => new Date(a.at).getDate() === new Date(c.at).getDate()), 'no cards reminder on an art day');
});

test('at most two a day, at least three hours apart', () => {
  const plan = planReminders({ ...none, art: [at(1, 20, 30), at(2, 20, 30), at(3, 20, 30)], cards: [at(1, 20, 0), at(2, 20, 15), at(4, 20, 0)] }, prefs(), NOW);
  const byDay = new Map();
  for (const r of plan) byDay.set(new Date(r.at).getDate(), [...(byDay.get(new Date(r.at).getDate()) || []), r.at]);
  for (const list of byDay.values()) {
    assert.ok(list.length <= 2);
    if (list.length === 2) assert.ok(Math.abs(list[0] - list[1]) >= 3 * 3600000);
  }
});

test('softer words after a heavy check-in, only for the next day or so', () => {
  const plan = planReminders({ ...none, checkIns: [{ at: NOW - 3600000, mood: 0 }] }, prefs({ art: false, cards: false }), NOW);
  assert.deepEqual(plan.map((r) => r.variant).slice(0, 3), ['soft', 'soft', 'default']);
});

test('ids are stable per kind and day, so rescheduling replaces instead of duplicating', () => {
  const a = planReminders(none, prefs(), NOW).map((r) => r.id);
  const b = planReminders(none, prefs(), NOW + 60000).map((r) => r.id);
  assert.deepEqual(a, b);
  assert.equal(new Set(a).size, a.length);
});

test('Step reminders: chosen days and time, quiet hours respected, nothing for done/skipped, at most 3 a day', () => {
  const { planStepReminders, planReflectionReminders, planSleepCheckIn } = mod.exports;
  const step = (id, time, extra = {}) => ({ id, template: 'walking', days: [0, 1, 2, 3, 4, 5, 6], time, reminder: true, paused: false, createdAt: NOW - 86400000, ...extra });
  const quiet = { quietFrom: 22 * 60, quietTo: 8 * 60 };
  // Sunday 8 Nov, 10:00 now. 18:00 walk today and on the next days.
  const walk = planStepReminders([step('w', '18:00')], new Set(), quiet, NOW, { days: 3 });
  assert.deepEqual(walk.map((r) => [new Date(r.at).getDate(), hm(r.at)]), [[8, '18:00'], [9, '18:00'], [10, '18:00']]);
  assert.equal(walk[0].url, '/steps');
  // Done today: no reminder today. Skipped tomorrow: none tomorrow.
  const marked = new Set(['w:2026-11-08', 'w:2026-11-09']);
  assert.deepEqual(planStepReminders([step('w', '18:00')], marked, quiet, NOW, { days: 3 }).map((r) => new Date(r.at).getDate()), [10]);
  // 23:30 is in quiet hours: moved to half an hour before they start.
  assert.equal(hm(planStepReminders([step('late', '23:30')], new Set(), quiet, NOW, { days: 1 })[0].at), '21:30');
  // Only Mondays; paused or without "remind me": nothing.
  assert.deepEqual(planStepReminders([step('m', '09:00', { days: [1] })], new Set(), quiet, NOW, { days: 7 }).map((r) => new Date(r.at).getDay()), [1]);
  assert.equal(planStepReminders([step('p', '12:00', { paused: true }), step('n', '12:00', { reminder: false })], new Set(), quiet, NOW).length, 0);
  // Five steps at noon: at most three reminders that day.
  const many = ['a', 'b', 'c', 'd', 'e'].map((id, i) => step(id, `1${i + 2}:00`));
  assert.equal(planStepReminders(many, new Set(), quiet, NOW, { days: 1 }).length, 3);
  // Reflection: today (not made yet) and tomorrow; sleep question the morning after a sleep session.
  assert.deepEqual(planReflectionReminders({ enabled: true, time: '21:00' }, false, quiet, NOW).map((r) => [new Date(r.at).getDate(), hm(r.at)]), [[8, '21:00'], [9, '21:00']]);
  assert.equal(planReflectionReminders({ enabled: true, time: '21:00' }, true, quiet, NOW).length, 1, 'made today: only tomorrow');
  const bed = at(7, 23, 10); // Saturday 23:10 → Sunday 8 Nov morning, but it is already 10:00
  assert.equal(planSleepCheckIn(bed, new Set(), true, quiet, NOW).length, 0, 'that morning has passed');
  const tonight = at(8, 23, 0);
  const q = planSleepCheckIn(tonight, new Set(), true, quiet, at(8, 23, 5));
  assert.deepEqual([new Date(q[0].at).getDate(), hm(q[0].at), q[0].url], [9, '08:30', '/sleep?morning=1']);
  assert.equal(planSleepCheckIn(tonight, new Set(['2026-11-09']), true, quiet, at(8, 23, 5)).length, 0, 'already answered');
});
