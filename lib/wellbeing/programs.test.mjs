// Run: npm run test:unit
// My Programs: one day at a time on calendar days, verified events complete
// the current day, missed days just wait, finishing, recommendations from what
// the person chose, and program reminders.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { fromRoot, loadTs } from '../../scripts/qa/load-ts.mjs';

process.env.TZ = 'Asia/Tbilisi';

const D = loadTs(fromRoot('lib/wellbeing/dates.ts'));
const E = loadTs(fromRoot('lib/wellbeing/events.ts'));
const P = loadTs(fromRoot('lib/wellbeing/programs.ts'));
const N = loadTs(fromRoot('lib/notifications/planner.ts'));

const at = (day, h = 12) => D.atMinute(day, h * 60);
const calm = P.programById('calm');
const sleep = P.programById('sleep');

test('every program has seven days with a main activity that works without AI', () => {
  assert.equal(P.PROGRAMS.length, 4);
  for (const def of P.PROGRAMS) {
    assert.equal(def.days.length, 7, def.id);
    assert.deepEqual(def.days.map((d) => d.n), [1, 2, 3, 4, 5, 6, 7]);
    for (const d of def.days) {
      assert.ok(P.ACTIVITIES[d.main], `${def.id} day ${d.n}`);
      assert.ok(!P.ACTIVITIES[d.main].ai, `${def.id} day ${d.n}: the main activity never needs AI`);
    }
    assert.equal(def.review, 'needs_clinical_review', 'marked for clinical review before release');
  }
});

test('day 1 opens on the start day; the next day opens the calendar day after', () => {
  let run = P.newRun(calm, 'r1', at('2026-11-02', 9));
  let st = P.runState(run, '2026-11-02');
  assert.equal(st.current, 1);
  assert.equal(st.openToday, true);
  run = P.markDay(run, 1, { doneAt: at('2026-11-02', 10), doneDay: '2026-11-02', source: 'manual' });
  st = P.runState(run, '2026-11-02');
  assert.equal(st.current, 2);
  assert.equal(st.openToday, false, 'one day at a time');
  assert.equal(st.opensOn, '2026-11-03');
  // Doing day 2 today is not possible (no rushing through a week in a day).
  assert.equal(P.markDay(run, 2, { doneAt: at('2026-11-02', 11), doneDay: '2026-11-02', source: 'manual' }), run);
  assert.equal(P.runState(run, '2026-11-03').openToday, true);
});

test('missed days just wait: nothing resets, nothing is "lost"', () => {
  let run = P.newRun(calm, 'r1', at('2026-11-02'));
  run = P.markDay(run, 1, { doneAt: at('2026-11-02'), doneDay: '2026-11-02', source: 'manual' });
  // Five quiet days later, day 2 is simply there.
  const st = P.runState(run, '2026-11-08');
  assert.equal(st.current, 2);
  assert.equal(st.openToday, true);
  assert.equal(st.done, 1);
  assert.equal(st.quietDays, 6);
});

test('a verified event completes the current day; opening a screen or an earlier practice does not', () => {
  const run = P.newRun(calm, 'r1', at('2026-11-02', 9));
  // Before the program started: doesn't count.
  assert.equal(P.autoMarkFor(run, E.makeEvent('calm.used', 'a', at('2026-11-02', 8), { kind: 'breathe' })), null);
  // The day's activity (Calm now): counts.
  const hit = P.autoMarkFor(run, E.makeEvent('calm.used', 'b', at('2026-11-02', 10), { kind: 'breathe' }));
  assert.equal(hit.n, 1);
  assert.equal(hit.mark.source, 'auto');
  // Something else (a journal entry) doesn't complete a breathing day.
  assert.equal(P.autoMarkFor(run, E.makeEvent('journal.saved', 'c', at('2026-11-02', 10))), null);
  // Paused: nothing completes.
  assert.equal(P.autoMarkFor({ ...run, status: 'paused' }, E.makeEvent('calm.used', 'd', at('2026-11-02', 11))), null);
});

test('the gratitude day needs a gratitude entry; the habits program starts with creating a Step', () => {
  const refl = P.programById('reflection');
  let run = P.newRun(refl, 'r2', at('2026-11-02'));
  run = P.markDay(run, 1, { doneAt: at('2026-11-02'), doneDay: '2026-11-02', source: 'manual' });
  assert.equal(P.autoMarkFor(run, E.makeEvent('journal.saved', 'x', at('2026-11-03'), { prompt: 'free' })), null);
  assert.equal(P.autoMarkFor(run, E.makeEvent('journal.saved', 'y', at('2026-11-03'), { prompt: 'gratitude' })).n, 2);
  const habits = P.newRun(P.programById('habits'), 'r3', at('2026-11-02'));
  assert.equal(P.autoMarkFor(habits, E.makeEvent('step.created', 's1', at('2026-11-02', 13), { template: 'walking' })).n, 1);
});

test('seven days done: the program is complete, with a summary from real events', () => {
  let run = P.newRun(sleep, 'r1', at('2026-11-02'));
  for (let n = 1; n <= 7; n += 1) {
    const day = D.addDays('2026-11-02', n - 1);
    run = P.markDay(run, n, { doneAt: at(day, 21), doneDay: day, source: n % 2 ? 'auto' : 'manual' });
  }
  assert.equal(run.status, 'completed');
  assert.equal(P.doneCount(run), 7);
  assert.equal(P.runState(run, '2026-11-09').current, null);
  const events = [E.makeEvent('breathing.completed', 1, at('2026-11-03'), { minutes: 4 }), E.makeEvent('sound.session', 2, at('2026-11-04'), { minutes: 20 }), E.makeEvent('journal.saved', 3, at('2026-11-06')), E.makeEvent('breathing.completed', 4, at('2026-10-20'), { minutes: 9 })];
  const s = P.runSummary(P.setNote(run, 3, 'Screens down helped.', at('2026-11-04')), events, '2026-11-09');
  assert.equal(s.daysDone, 7);
  assert.equal(s.calmMinutes, 24, 'only during the program');
  assert.equal(s.journalEntries, 1);
  assert.equal(s.notesWritten, 1);
  assert.equal(s.spanDays, 7);
  assert.equal(P.nextProgramAfter('sleep', ['sleep']), 'calm');
});

test('a reflection note is the person’s own text: trimmed to a sane length, removable', () => {
  let run = P.newRun(calm, 'r1', at('2026-11-02'));
  run = P.setNote(run, 1, 'x'.repeat(5000), at('2026-11-02'));
  assert.equal(run.notes['1'].text.length, 2000);
  run = P.setNote(run, 1, '   ', at('2026-11-02'));
  assert.equal(run.notes['1'], undefined);
});

test('recommendations come only from what the person chose themselves', () => {
  assert.equal(P.recommendProgram(['sleep']).id, 'sleep');
  assert.equal(P.recommendProgram(['stress']).id, 'calm');
  assert.equal(P.recommendProgram(['bea']).id, 'reflection');
  assert.equal(P.recommendProgram(['wellbeing']).id, 'habits');
  assert.equal(P.recommendProgram(['explore']), null);
  assert.equal(P.recommendProgram([]), null);
  assert.deepEqual(P.recommendProgram(['explore', 'anxiety']), { id: 'calm', because: 'anxiety' });
});

test('program reminders: only when on and active, at the chosen time, never in quiet hours, none for a done day', () => {
  const prefs = { quietFrom: 22 * 60, quietTo: 8 * 60 };
  const now = at('2026-11-02', 10);
  const base = { id: 'calm', active: true, reminder: { enabled: true, time: '12:30' }, daysLeft: 3, doneToday: false, opensOn: null };
  const plan = N.planProgramReminders(base, prefs, now);
  assert.equal(plan.length, 3);
  assert.ok(plan.every((r) => r.kind === 'program' && r.url === '/programs/calm'));
  assert.equal(new Date(plan[0].at).getHours(), 12);
  assert.equal(N.planProgramReminders({ ...base, reminder: { enabled: false, time: '12:30' } }, prefs, now).length, 0);
  assert.equal(N.planProgramReminders({ ...base, active: false }, prefs, now).length, 0);
  // Today's day is done: the first reminder is tomorrow.
  const tomorrowFirst = N.planProgramReminders({ ...base, doneToday: true }, prefs, now);
  assert.equal(D.dayKey(tomorrowFirst[0].at), '2026-11-03');
  // In quiet hours: moved out of them.
  const late = N.planProgramReminders({ ...base, reminder: { enabled: true, time: '23:30' } }, prefs, now);
  assert.ok(late.every((r) => { const h = new Date(r.at).getHours(); return h >= 8 && h < 22; }));
});
