// Run: npm run test:unit
// Events, My Steps, badges and challenges — on calendar days, across a DST change.
process.env.TZ = 'America/New_York'; // has DST changes (8 March and 1 November 2026)
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { fromRoot, loadTs } from '../../scripts/qa/load-ts.mjs';

const D = loadTs(fromRoot('lib/wellbeing/dates.ts'));
const E = loadTs(fromRoot('lib/wellbeing/events.ts'));
const S = loadTs(fromRoot('lib/wellbeing/steps.ts'));
const B = loadTs(fromRoot('lib/wellbeing/badges.ts'));

const at = (day, h = 12, m = 0) => D.atMinute(day, h * 60 + m);

test('calendar days stay whole across daylight-saving changes', () => {
  // 1 November 2026: 25 hours in New York. Adding days never skips or repeats one.
  assert.equal(D.addDays('2026-10-31', 1), '2026-11-01');
  assert.equal(D.addDays('2026-11-01', 1), '2026-11-02');
  assert.equal(D.addDays('2026-03-07', 2), '2026-03-09');
  assert.equal(D.daysBetween('2026-10-25', '2026-11-08'), 14);
  assert.deepEqual(D.dayRange('2026-10-30', '2026-11-02'), ['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02']);
  assert.equal(D.weekday('2026-11-01'), 0, 'Sunday');
  // 08:00 on the DST day is 08:00 local, not 07:00 or 09:00.
  assert.equal(new Date(at('2026-11-01', 8)).getHours(), 8);
  assert.equal(new Date(at('2026-03-08', 8)).getHours(), 8);
  assert.equal(D.parseTime('21:30'), 21 * 60 + 30);
  assert.equal(D.parseTime('25:00'), null);
});

test('events: deduplicated by id, versioned, legacy import is idempotent', () => {
  const a = E.makeEvent('journal.saved', 'je_1', at('2026-11-08', 9));
  assert.equal(a.id, 'journal.saved:je_1');
  assert.equal(a.v, 1);
  assert.equal(a.day, '2026-11-08');
  const first = E.mergeEvents([], [a, a], at('2026-11-09'));
  assert.equal(first.list.length, 1);
  const legacy = { journal: [{ id: 'je_1', timestamp: at('2026-11-08', 9) }], checkIns: [{ id: 'ci_1', at: at('2026-11-08', 8), mood: 3, feelings: ['calm'] }], breathing: [{ at: at('2026-11-08', 10), minutes: 3 }], meditation: [], art: [{ sessionId: 1, completedAt: at('2026-11-08', 21) }], cards: [] };
  const once = E.mergeEvents(first.list, E.legacyEvents(legacy), at('2026-11-09'));
  const twice = E.mergeEvents(once.list, E.legacyEvents(legacy), at('2026-11-09'));
  assert.equal(once.added.length, 3, 'the journal entry was already there');
  assert.equal(twice.added.length, 0, 'importing again adds nothing');
  assert.deepEqual(once.list.map((e) => e.type), ['mood.checkin', 'journal.saved', 'breathing.completed', 'art.completed']);
  // Bounded history.
  const old = E.makeEvent('mood.checkin', 'old', at('2025-01-01'));
  assert.equal(E.mergeEvents([], [old], at('2026-11-09')).list.length, 0, 'older than 400 days is dropped');
});

const step = (template, patch = {}) => S.newStep(template, `s_${template}`, at('2026-11-01', 7), patch);

test('steps: planned days, verified auto-completion only, one mark per day', () => {
  const journal = step('journal');
  const gratitude = step('gratitude');
  const walk = step('walking', { days: [1, 3, 5] }); // Mon, Wed, Fri
  assert.equal(S.isScheduled(walk, '2026-11-09'), true, 'Monday');
  assert.equal(S.isScheduled(walk, '2026-11-10'), false, 'Tuesday');
  assert.equal(S.isScheduled(journal, '2026-10-31'), false, 'not before it was created');
  assert.equal(S.isScheduled({ ...journal, paused: true }, '2026-11-09'), false);

  // Opening the editor records nothing; only a saved entry is an event.
  const saved = E.makeEvent('journal.saved', 'je_9', at('2026-11-09', 20));
  const marks = S.autoMarksFor([journal, gratitude, walk], [], saved);
  assert.deepEqual(marks.map((m) => m.stepId), ['s_journal'], 'a plain entry is not a gratitude entry');
  const grateful = E.makeEvent('journal.saved', 'je_10', at('2026-11-09', 21), { prompt: 'gratitude' });
  assert.deepEqual(S.autoMarksFor([journal, gratitude], marks, grateful).map((m) => m.stepId), ['s_gratitude'], 'journal already done today');
  // Breathing on a day the breathing step isn't planned: no mark.
  const breathe = step('breathing', { days: [1] });
  assert.equal(S.autoMarksFor([breathe], [], E.makeEvent('breathing.completed', 1, at('2026-11-10', 9))).length, 0);

  let list = S.setMark([], { stepId: 's_walking', day: '2026-11-09', status: 'skipped', at: 1, source: 'manual' });
  list = S.setMark(list, { stepId: 's_walking', day: '2026-11-09', status: 'done', at: 2, source: 'manual' });
  assert.equal(list.length, 1, 'one mark per step and day');
  assert.equal(S.clearMark(list, 's_walking', '2026-11-09').length, 0, 'undo');
});

test('steps: gentle consistency (5 of 7), skips are neutral, today counts once done', () => {
  const s = step('breathing'); // every day, created 1 Nov
  const done = ['2026-11-03', '2026-11-04', '2026-11-05', '2026-11-07', '2026-11-08'];
  let marks = done.map((day) => ({ stepId: s.id, day, status: 'done', at: at(day), source: 'manual' }));
  assert.deepEqual(S.consistency([s], marks, '2026-11-09'), { done: 5, planned: 6 }, '3–8 Nov planned, today still open');
  marks = S.setMark(marks, { stepId: s.id, day: '2026-11-06', status: 'skipped', at: 1, source: 'manual' });
  assert.deepEqual(S.consistency([s], marks, '2026-11-09'), { done: 5, planned: 5 }, 'a chosen rest day is not a miss');
  // Classic streak (behind the ethics flag): skips don't break it, a missed planned day does.
  assert.equal(S.classicStreak(s, marks, '2026-11-09'), 5);
  marks = S.clearMark(marks, s.id, '2026-11-06');
  assert.equal(S.classicStreak(s, marks, '2026-11-09'), 2);
  // Calendar for November across the DST change: 30 days.
  const grid = S.monthGrid([s], marks, 2026, 11);
  assert.equal(grid.length, 30);
  assert.equal(grid.find((g) => g.day === '2026-11-01').planned, 1);
});

test('badges: deterministic dates, permanent once earned; challenges are gentle', () => {
  const events = [1, 2, 3, 4, 5].map((n) => E.makeEvent('breathing.completed', n, at(`2026-11-0${n}`, 9)));
  const first = B.newBadges(events, []);
  assert.ok(first.find((b) => b.id === 'calm5'));
  assert.equal(first.find((b) => b.id === 'calm5').earnedAt, at('2026-11-05', 9), 'dated by the fifth session');
  assert.deepEqual(B.newBadges(events, first), [], 'never earned twice');
  assert.deepEqual(B.newBadges([], first), [], 'quiet days take nothing away');
  assert.deepEqual(B.newBadges([...events].reverse(), []), first, 'same history, same badges');

  const calm = B.CHALLENGES.find((c) => c.id === 'calm14');
  const run = { id: 'calm14', runId: 'r1', startDay: '2026-11-01', status: 'active' };
  const s1 = B.challengeState(calm, run, events, '2026-11-09');
  assert.deepEqual([s1.progress, s1.target, s1.dayNumber, s1.status], [5, 10, 9, 'active']);
  const ended = B.challengeState(calm, run, events, '2026-11-20');
  assert.equal(ended.status, 'ended', 'the window passed; no penalty, just over');
  const more = [...events, ...[6, 7, 8, 9, 10].map((n) => E.makeEvent('meditation.completed', n, at(`2026-11-${String(n).padStart(2, '0')}`, 9)))];
  const done = B.challengeState(calm, run, more, '2026-11-10');
  assert.equal(done.status, 'completed');
  assert.equal(done.reachedDay, '2026-11-10');
});
