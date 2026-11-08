// Run: node --test server/test/art.test.mjs
// Art reflection: the existing three-phase flow (0 explore → 1 change or story
// → 2 close) is locked down, and every reply is checked before the person sees
// it — image comparison, their own words (Georgian/Russian in Latin letters,
// negation), invalid model output and session summaries.
// The "model" here is scripted; live-model checks are in
// scripts/qa/art-model-eval.mjs (docs/BEHAPPY_AI_MODEL_EVALUATION.md).
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';

import { compareFingerprints, fingerprint } from '../art/imageCompare.mjs';
import { claimsVisualChange, extractFacts, languageNote, polarityOf } from '../art/facts.mjs';
import { cleanSummary, normalizeState } from '../art/validate.mjs';
import { ART_TEXT } from '../art/texts.mjs';
import * as img from './art-images.mjs';
import { startTestServer } from './helpers.mjs';

// ---------- A scriptable model ----------
const calls = [];
let script = [];
const reply = (o = {}) => ({
  response_text: 'Что вы замечаете, когда смотрите на рисунок?',
  session_phase: 0,
  phase_complete: false,
  session_complete: false,
  required_input: 'text',
  action: 'continue_exploration',
  phase_summary: '',
  session_summary: '',
  clinical_insights: { emotional_indicators: { detected_emotions: [] }, psychological_themes: [] },
  safety_assessment: { risk_level: 'none', concerning_imagery: [], immediate_action_needed: false, safety_recommendations: [] },
  progress_tracking: { emotional_shift: '', insight_gained: '', therapeutic_alliance: '' },
  comparison_claim: 'none',
  ...o,
});
async function fakeOpenAi(url, init) {
  const body = init?.body ? JSON.parse(init.body) : {};
  calls.push({ url: String(url), body });
  if (String(url).endsWith('/responses')) {
    const step = script.length ? script.shift() : reply();
    const r = typeof step === 'function' ? step(body) : step;
    if (r.httpStatus) return new Response(r.error || 'error', { status: r.httpStatus });
    const text = typeof r.raw === 'string' ? r.raw : JSON.stringify(r);
    return new Response(JSON.stringify({ id: `resp_t${calls.length}`, status: r.incomplete ? 'incomplete' : 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text }] }], usage: { input_tokens: 120, output_tokens: 60 } }), { status: 200 });
  }
  return new Response('{}', { status: 200 });
}
const noteOf = (call) => (call?.body?.input || []).filter((i) => i.role === 'developer').map((i) => i.content).join('\n');

// ---------- Drawings ----------
const base = img.drawing();
const FIRST = img.encode(base, 85);
const REENCODED = img.encode(base, 60);
const LIGHTING = img.encode(img.lighting(base, { gain: 0.78, gradient: 0.3, cast: [1.07, 1, 0.9] }), 80);
const MODIFIED = img.encode(img.circle(img.clone(base), 380, 250, 40, [20, 20, 20]), 85);

describe('Art: building blocks', () => {
  test('image comparison: identical, re-encoded, lighting, shift and tilt are not changes; real changes are', () => {
    const a = fingerprint(FIRST);
    const cmp = (url) => compareFingerprints(a, fingerprint(url)).state;
    assert.equal(cmp(FIRST), 'identical');
    assert.equal(cmp(REENCODED), 'likely_same');
    assert.equal(cmp(img.encode(img.resize(base, 1024), 80)), 'likely_same');
    assert.equal(cmp(LIGHTING), 'likely_same');
    assert.equal(cmp(img.encode(img.shift(base, 12), 80)), 'likely_same');
    assert.equal(cmp(img.encode(img.rotate(base, 2), 80)), 'likely_same');
    assert.equal(cmp(img.encode(img.noise(base, 8), 80)), 'likely_same');
    assert.equal(cmp(MODIFIED), 'different');
    assert.equal(cmp(img.encode(img.circle(img.clone(base), 240, 130, 62, [40, 70, 210]), 85)), 'different', 'recoloured');
    assert.equal(cmp(img.encode(img.rect(img.clone(base), 40, 290, 440, 340, [246, 243, 236]), 85)), 'different', 'erased');
    assert.notEqual(cmp(img.encode(img.circle(img.clone(base), 60, 300, 12, [200, 30, 120]), 85)), 'likely_same', 'a small new detail is never "unchanged"');
    assert.equal(compareFingerprints(a, fingerprint('data:image/png;base64,iVBORw0KGgo=')).state, 'comparison_unavailable');
    assert.equal(compareFingerprints(null, a).state, 'comparison_unavailable');
    const ev = compareFingerprints(a, fingerprint(MODIFIED)).evidence;
    assert.ok(ev.regions.includes('bottom-right') || ev.regions.includes('right'), JSON.stringify(ev));
  });

  test('Georgian and Russian in Latin letters, negation, short answers', () => {
    const pol = (t) => polarityOf(extractFacts(t).feelings);
    assert.equal(pol('kargad vgrdznob da vgrdznobdi'), 1);
    assert.equal(pol('ara sasiamovno'), -1);
    assert.equal(pol('ar aris sasiamovno'), -1);
    assert.equal(pol('სასიამოვნო არ იყო'), -1);
    assert.equal(pol('naprajenie'), -1);
    assert.equal(pol('не приятно'), -1);
    assert.equal(pol('было приятно'), 1);
    assert.equal(pol('not pleasant at all'), -1);
    assert.equal(pol('ոչ հաճելի'), -1);
    assert.deepEqual(extractFacts('witeli').colours, ['red']);
    assert.deepEqual(extractFacts('tavshi').body, ['head']);
    assert.equal(pol('energia'), 0);
    assert.match(languageNote('ara sasiamovno'), /არა სასიამოვნო/);
    assert.match(languageNote('naprajenie'), /напражение/);
    assert.equal(languageNote('I feel calm today'), '');
  });

  test('change claims respect negation', () => {
    assert.equal(claimsVisualChange('Центр стал ярче, и вокруг появились новые цвета.'), true);
    assert.equal(claimsVisualChange('При сравнении изображений заметных изменений не удалось подтвердить.'), false);
    assert.equal(claimsVisualChange('The sun is now bigger.'), true);
    assert.equal(claimsVisualChange("I don't see any changes."), false);
    assert.equal(claimsVisualChange('ცენტრი უფრო ნათელი გახდა.'), true);
    assert.equal(claimsVisualChange('Что изменилось?'), false, 'a question is not a claim');
  });

  test('state machine: the three phases can only move forward and close properly', () => {
    const n = (out, ctx) => normalizeState(reply(out), ctx);
    assert.equal(n({ session_phase: 0 }, { phase: 1 }).value.session_phase, 1, 'never back to phase 0');
    assert.equal(n({ session_phase: 2 }, { phase: 0 }).value.session_phase, 1, 'no skipping the change-or-story choice');
    const early = n({ session_phase: 0, session_complete: true, action: 'close_session', response_text: 'Спасибо.' }, { phase: 0 });
    assert.equal(early.value.session_complete, false);
    assert.ok(early.fixes.includes('premature_close'));
    const asked = n({ session_phase: 2, session_complete: true, action: 'close_session', response_text: 'Что вы чувствуете?' }, { phase: 2 });
    assert.equal(asked.value.session_complete, false, 'a question cannot close the session');
    const end = n({ session_phase: 0, session_complete: true, action: 'close_session', required_input: 'none', response_text: 'Спасибо за сессию.', session_summary: 'Итог.' }, { phase: 0, endIntent: true });
    assert.equal(end.value.session_complete, true, 'the person asked to end: early end still works');
    assert.equal(end.value.session_phase, 2);
    assert.equal(n({ session_phase: 1, action: 'compare_drawings' }, { phase: 1, hasSecondImage: false }).value.action, 'continue_exploration');
    assert.equal(n({ session_phase: 1, action: 'compare_drawings' }, { phase: 1, hasSecondImage: null }).value.action, 'compare_drawings', 'older sessions (unknown) are left alone');
    const v2 = n({ session_phase: 0, action: 'none', required_input: 'none' }, { phase: 1, upload: 'image_v2' }).value;
    assert.deepEqual([v2.session_phase, v2.action, v2.required_input, v2.session_complete], [1, 'analyze_second_drawing', 'text', false]);
    assert.equal(n({ session_phase: 1, required_input: 'image_v2', action: 'request_modified_drawing' }, { phase: 1 }).value.required_input, 'image_v2', 'asking for the changed drawing stays');
    assert.equal(n({ session_phase: 'x', required_input: 'weird', action: 'dance' }, { phase: 1 }).value.action, 'continue_exploration');
  });

  test('summary: unsupported sentences are removed, the AI note is kept or added', () => {
    const ctx = { language: 'ru', hasSecondImage: true, comparison: { state: 'identical' }, sessionFacts: extractFacts('naprajenie ara sasiamovno').feelings };
    const expected = 'Во время сессии вы связали красный цвет с энергией и описали неприятное напряжение в голове. При сравнении изображений заметных изменений не удалось подтвердить. Вы отметили, что эта часть работы не имеет для вас особого значения.';
    const ok = cleanSummary(`${expected} ${ART_TEXT.ru.note}`, ctx);
    assert.deepEqual(ok.removed, []);
    assert.ok(ok.text.startsWith(expected));
    const bad = cleanSummary('Вы описали приятное напряжение. Центр рисунка стал ярче. Это похоже на депрессию. Вы выбрали красный цвет.', ctx);
    assert.deepEqual(bad.removed.sort(), ['clinical', 'contradiction', 'visual_claim']);
    assert.match(bad.text, /красный/);
    assert.ok(bad.text.endsWith(ART_TEXT.ru.note));
  });
});

describe('Art: checked turns through the server', () => {
  let t;
  before(async () => {
    t = await startTestServer({ openai: fakeOpenAi, config: { ai: { models: { art: 'gpt-6.1-sol' }, art: { fallbackModel: 'gpt-5.4-mini', reasoning: 'medium', maxOutputTokens: 8000, store: true } } } });
  });
  after(() => t.stop());

  const person = async () => (await t.newAccount()).token;
  const turn = async (token, { phase = 0, text = '', image = null, prev, lang = 'Russian (Русский)', end = null, run = 'r1', stream = true } = {}) => {
    const block = `\n\n[Session Context: Theme: Feelings, Language: ${lang}, Phase: ${phase}. CRITICAL: respond in the selected language.]${end ? `\n[Prior Sessions]\n[User Action: The person asked to close the session via ${end}.]` : ''}`;
    const content = [{ type: 'input_text', text: (text || (image ? 'An image was uploaded without text. Before guiding the art reflection session…' : '')) + block }];
    if (image) content.push({ type: 'input_image', image_url: image, detail: 'high' });
    const res = await fetch(`${t.base}/api/ai/responses`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'x-behappy-feature': 'art', 'x-behappy-art-session': '1', 'x-behappy-art-run': run },
      body: JSON.stringify({ input: [{ role: 'user', content }], stream, store: true, max_output_tokens: 2048, text: { format: { type: 'json_object' } }, ...(prev ? { previous_response_id: prev } : {}) }),
    });
    const raw = await res.text();
    if (res.status !== 200) return { status: res.status, raw };
    if (!stream) {
      const j = JSON.parse(raw);
      return { status: 200, out: JSON.parse(j.output_text), id: j.id };
    }
    const events = raw.split('\n\n').map((f) => f.split('\n').find((l) => l.startsWith('data:'))).filter(Boolean).map((l) => JSON.parse(l.slice(5)));
    const done = events.find((e) => e.type === 'response.completed');
    return { status: 200, out: JSON.parse(done.response.output_text), id: done.response.id, events };
  };
  const lastCall = () => calls[calls.length - 1];

  test('A — the original three-phase journey is unchanged (image → explore → change → compare → close)', async () => {
    const me = await person();
    const steps = [];
    script = [reply({ response_text: 'Когда вы смотрите на это изображение сейчас, что вы чувствуете? Пока вы его создавали, что вы чувствовали — отличалось ли это от того, что сейчас?' })];
    let r = await turn(me, { image: FIRST });
    steps.push(r.out);
    assert.equal(r.out.session_phase, 0);
    assert.equal((r.out.response_text.match(/\?/g) || []).length, 2, 'the two image questions are kept');
    assert.ok(r.events.some((e) => e.type === 'response.output_text.delta'), 'the app receives the same event shape');

    script = [reply({ response_text: 'Что для вас значит красный цвет?' })];
    r = await turn(me, { text: 'witeli', prev: r.id });
    assert.equal(r.out.session_phase, 0);
    assert.match(noteOf(lastCall()), /Georgian typed in Latin letters/);

    script = [reply({ response_text: 'Хотите изменить рисунок или придумать по нему короткую историю?', session_phase: 1, phase_complete: true })];
    r = await turn(me, { text: 'energia', prev: r.id });
    assert.equal(r.out.session_phase, 1);
    assert.equal(r.out.phase_complete, true);

    script = [reply({ response_text: 'Пожалуйста, измените рисунок на бумаге и пришлите фото.', session_phase: 1, required_input: 'image_v2', action: 'request_modified_drawing' })];
    r = await turn(me, { phase: 1, text: 'хочу изменить', prev: r.id });
    assert.equal(r.out.required_input, 'image_v2');
    assert.equal(r.out.action, 'request_modified_drawing');

    script = [reply({ response_text: 'Когда вы смотрите на эту новую версию сейчас, что вы чувствуете? Пока вы её меняли, что вы чувствовали?', session_phase: 1, action: 'analyze_second_drawing' })];
    r = await turn(me, { phase: 1, image: MODIFIED, prev: r.id });
    assert.deepEqual([r.out.session_phase, r.out.action, r.out.required_input], [1, 'analyze_second_drawing', 'text']);
    assert.match(noteOf(lastCall()), /IMAGE COMPARISON \(reliable\): the drawing changed; the clearest differences are in the (bottom-right|right)/);

    script = [reply({ response_text: 'Справа внизу появился тёмный круг. Что для вас значит это изменение?', session_phase: 1, action: 'compare_drawings', comparison_claim: 'change_described' })];
    r = await turn(me, { phase: 1, text: 'spokoino', prev: r.id });
    assert.equal(r.out.action, 'compare_drawings');
    assert.match(r.out.response_text, /тёмный круг/, 'a verified change may be described');

    script = [reply({ response_text: 'Что вы хотели бы забрать с собой из этой сессии?', session_phase: 2 })];
    r = await turn(me, { phase: 1, text: 'ничего особенного', prev: r.id });
    assert.equal(r.out.session_phase, 2);
    assert.equal(r.out.session_complete, false);

    const summary = `Вы связали красный цвет с энергией и добавили тёмный круг справа внизу. ${ART_TEXT.ru.note}`;
    script = [reply({ response_text: 'Спасибо, что поделились этим.', session_phase: 2, phase_complete: true, session_complete: true, required_input: 'none', action: 'close_session', session_summary: summary })];
    r = await turn(me, { phase: 2, text: 'спокойствие', prev: r.id });
    assert.equal(r.out.session_complete, true);
    assert.equal(r.out.session_summary, summary, 'a supported summary is kept as it is');
  });

  test('B — the story branch (no second drawing) still closes normally', async () => {
    const me = await person();
    script = [reply({ response_text: 'Хотите изменить рисунок или сочинить короткую историю?', session_phase: 1, phase_complete: true })];
    let r = await turn(me, { image: FIRST });
    script = [reply({ response_text: 'Кто главный герой этой истории?', session_phase: 1 })];
    r = await turn(me, { phase: 1, text: 'историю', prev: r.id });
    assert.equal(r.out.session_phase, 1);
    assert.equal(r.out.action, 'continue_exploration');
    script = [reply({ response_text: 'Спасибо за эту историю.', session_phase: 2, phase_complete: true, session_complete: true, required_input: 'none', action: 'close_session', session_summary: 'Вы придумали историю о солнце над морем.' })];
    r = await turn(me, { phase: 1, text: 'солнце над морем', prev: r.id });
    assert.equal(r.out.session_complete, true, 'closing from the story branch is allowed');
    assert.ok(r.out.session_summary.endsWith(ART_TEXT.ru.note), 'the AI-companion note is added when missing');
  });

  test('C — "naprajenie… ara sasiamovno" is never called pleasant (one retry, then a clarifying question)', async () => {
    const me = await person();
    script = [reply()];
    let r = await turn(me, { image: FIRST });
    script = [reply({ response_text: 'Где вы это чувствуете?' })];
    r = await turn(me, { text: 'naprajenie', prev: r.id });
    // The real failure, then a corrected draft.
    script = [reply({ response_text: 'Сейчас это звучит как приятное переживание. Что вы замечаете?' }), reply({ response_text: 'Похоже, это напряжение было неприятным. Где в теле вы его чувствуете?' })];
    const before = calls.length;
    r = await turn(me, { text: 'ara sasiamovno', prev: r.id });
    assert.equal(calls.length - before, 2, 'one corrective retry');
    assert.match(noteOf(calls[before]), /"sasiamovno" \(negated\) = unpleasant/);
    assert.match(noteOf(calls[before + 1]), /they said it was unpleasant/);
    assert.doesNotMatch(r.out.response_text, /приятное переживание/);
    // The model insists twice: the person gets a clarifying question instead.
    script = [reply({ response_text: 'Это приятное ощущение.' }), reply({ response_text: 'Звучит приятно.' }), reply({ response_text: 'Это было хорошо.' })];
    r = await turn(me, { text: 'ara sasiamovno, naprajenie tavshi', prev: r.id });
    assert.equal(r.out.response_text, ART_TEXT.ru.clarifyNeg);
    assert.equal(r.out.session_phase, 0, 'still the same phase');
    // The next turn continues from what the person saw.
    script = [reply()];
    await turn(me, { text: 'da', prev: r.id });
    assert.match(noteOf(lastCall()), new RegExp(`What they actually saw from you was: «${ART_TEXT.ru.clarifyNeg.replace(/[?]/g, '\\?')}»`));
  });

  const toSecondDrawing = async (me, second) => {
    script = [reply()];
    let r = await turn(me, { image: FIRST });
    script = [reply({ session_phase: 1, phase_complete: true })];
    r = await turn(me, { text: 'хочу изменить', prev: r.id });
    script = [reply({ session_phase: 1, required_input: 'image_v2', action: 'request_modified_drawing' })];
    r = await turn(me, { phase: 1, text: 'да', prev: r.id });
    return { r, upload: (s) => ((script = s), turn(me, { phase: 1, image: second, prev: r.id })) };
  };

  test('D — the same drawing uploaded twice: no invented difference', async () => {
    const me = await person();
    const { upload } = await toSecondDrawing(me, FIRST);
    const invented = reply({ response_text: 'Центр стал ярче, и вокруг появились новые цвета. Что вы чувствуете?', session_phase: 1, action: 'analyze_second_drawing', comparison_claim: 'change_described' });
    const r = await upload([invented, invented, invented]);
    assert.equal(r.out.response_text, ART_TEXT.ru.identical);
    assert.deepEqual([r.out.session_phase, r.out.action, r.out.required_input], [1, 'analyze_second_drawing', 'text'], 'phase 1 continues');
    assert.match(noteOf(calls[calls.length - 3]), /same image as the first one/);
    // A model that follows the note is used as it is.
    const me2 = await person();
    const second = await toSecondDrawing(me2, FIRST);
    const honest = await second.upload([reply({ response_text: 'Я не вижу изменений между изображениями. Возможно, это тот же рисунок? Можем продолжить с ним.', session_phase: 1, action: 'analyze_second_drawing', comparison_claim: 'no_change' })]);
    assert.match(honest.out.response_text, /не вижу изменений/);
  });

  test('E/F — a re-encoded copy or the same drawing in different light: no confident change', async () => {
    for (const [name, copy] of [['re-encoded', REENCODED], ['lighting', LIGHTING]]) {
      const me = await person();
      const { upload } = await toSecondDrawing(me, copy);
      let r = await upload([reply({ response_text: 'Когда вы смотрите на эту новую версию сейчас, что вы чувствуете? Пока вы её меняли, что вы чувствовали?', session_phase: 1, action: 'analyze_second_drawing' })]);
      assert.match(noteOf(lastCall()), /very likely the same drawing/, name);
      const claim = reply({ response_text: 'Солнце стало больше и ярче. Что это значит для вас?', session_phase: 1, action: 'compare_drawings', comparison_claim: 'change_described' });
      script = [claim, claim, claim];
      r = await turn(me, { phase: 1, text: 'tsota spokoini', prev: r.id });
      assert.equal(r.out.response_text, ART_TEXT.ru.uncertain, name);
      assert.equal(r.out.action, 'compare_drawings');
    }
  });

  test('G — a really changed drawing: the change is reported to the model and may be described', async () => {
    const me = await person();
    const { upload } = await toSecondDrawing(me, MODIFIED);
    const r = await upload([reply({ response_text: 'Когда вы смотрите на эту новую версию сейчас, что вы чувствуете? Пока вы её меняли, что вы чувствовали?', session_phase: 1, action: 'analyze_second_drawing' })]);
    assert.match(noteOf(lastCall()), /the drawing changed/);
    assert.match(noteOf(lastCall()), /more was drawn/);
    script = [reply({ response_text: 'Справа внизу появился тёмный круг. Что он значит для вас?', session_phase: 1, action: 'compare_drawings', comparison_claim: 'change_described' })];
    const c = await turn(me, { phase: 1, text: 'da', prev: r.id });
    assert.match(c.out.response_text, /тёмный круг/);
  });

  test('H — facts and the comparison persist between turns (and a fresh run starts clean)', async () => {
    const me = await person();
    script = [reply()];
    let r = await turn(me, { image: FIRST, run: 'h1' });
    script = [reply()];
    r = await turn(me, { text: 'naprajenie', run: 'h1', prev: r.id });
    script = [reply({ response_text: 'Какой цвет для вас самый важный?' })];
    r = await turn(me, { text: 'ну', run: 'h1', prev: r.id });
    assert.match(noteOf(lastCall()), /Earlier in this session the person said — feelings in their own words: "naprajenie" = unpleasant/);
    script = [reply()];
    await turn(me, { text: 'ну', run: 'h2' });
    assert.doesNotMatch(noteOf(lastCall()), /naprajenie/, 'another run of the session has its own facts');
  });

  test('I — broken model output is recovered within the current phase', async () => {
    const me = await person();
    script = [reply()];
    let r = await turn(me, { image: FIRST });
    script = [{ raw: '{"response_text": "Что вы' }, reply({ response_text: 'Что вы замечаете?' })];
    r = await turn(me, { text: 'kargad', prev: r.id });
    assert.equal(r.out.response_text, 'Что вы замечаете?', 'cut-off JSON → one retry');
    assert.match(noteOf(lastCall()), /not one complete JSON object/);
    script = [{ raw: 'not json' }, { raw: 'still not json' }, { raw: '' }];
    r = await turn(me, { text: 'kargad', prev: r.id });
    assert.equal(r.out.response_text, ART_TEXT.ru.retry);
    assert.equal(r.out.session_phase, 0);
    assert.equal(r.out.session_complete, false);
    script = [reply({ session_phase: 2, session_complete: true, action: 'close_session', response_text: 'Пока!' })];
    r = await turn(me, { text: 'ok', prev: r.id });
    assert.equal(r.out.session_complete, false, 'no closing in phase 0 unless the person asks');
    script = [reply({ session_phase: 1, action: 'compare_drawings' })];
    r = await turn(me, { text: 'ok', prev: r.id });
    assert.equal(r.out.action, 'continue_exploration', 'nothing to compare without a second drawing');
    script = [reply({ session_phase: 0 })];
    r = await turn(me, { phase: 1, text: 'ok', prev: r.id });
    assert.equal(r.out.session_phase, 1, 'never back to phase 0');
  });

  test('J — the closing summary keeps only what the person said', async () => {
    const me = await person();
    const { upload } = await toSecondDrawing(me, FIRST);
    let r = await upload([reply({ response_text: ART_TEXT.ru.identical, session_phase: 1, action: 'analyze_second_drawing', comparison_claim: 'no_change' })]);
    script = [reply({ session_phase: 1, action: 'compare_drawings', comparison_claim: 'no_change' })];
    r = await turn(me, { phase: 1, text: 'witeli energia, naprajenie tavshi, ara sasiamovno', prev: r.id });
    const invented = `Вы описали приятное напряжение. Центр рисунка стал ярче. Вы связали красный цвет с энергией. ${ART_TEXT.ru.note}`;
    const close = (summary) => reply({ response_text: 'Спасибо за сессию.', session_phase: 2, phase_complete: true, session_complete: true, required_input: 'none', action: 'close_session', session_summary: summary });
    script = [close(invented), close(invented), close(invented)];
    r = await turn(me, { phase: 2, text: 'eto nichego ne znachit', prev: r.id });
    assert.equal(r.out.session_complete, true);
    assert.doesNotMatch(r.out.session_summary, /приятное напряжение|стал ярче/);
    assert.match(r.out.session_summary, /красный цвет с энергией/);
    assert.ok(r.out.session_summary.endsWith(ART_TEXT.ru.note));
    assert.match(noteOf(calls[calls.length - 3]), /Verified from their words: .*"naprajenie" = unpleasant.*colours they named: red.*where in the body: head/);
  });

  test('K — sessions started before this update keep working (no fingerprints, no run id)', async () => {
    const me = await person();
    script = [reply({ session_phase: 1, action: 'compare_drawings', response_text: 'Что вы изменили?' })];
    const r = await turn(me, { phase: 1, text: 'ok', run: '' });
    assert.equal(r.out.action, 'compare_drawings', 'unknown history is not treated as "no second drawing"');
    const plain = await turn(me, { phase: 1, text: 'ok', run: '', stream: false });
    assert.equal(plain.status, 200, 'non-streaming callers get the same checked reply as JSON');
  });

  test('model settings: Sol with medium reasoning and a large output budget; fallback when the model is unavailable', async () => {
    const me = await person();
    script = [reply()];
    await turn(me, { text: 'hi' });
    const body = lastCall().body;
    assert.equal(body.model, 'gpt-6.1-sol');
    assert.deepEqual(body.reasoning, { effort: 'medium' });
    assert.equal(body.max_output_tokens, 8000, 'reasoning tokens must not cut the JSON off');
    assert.equal(body.stream, undefined);
    assert.equal(body.store, true);
    script = [{ httpStatus: 404, error: '{"error":{"code":"model_not_found","message":"The model gpt-6.1-sol does not exist"}}' }, reply()];
    const r = await turn(me, { text: 'hi' });
    assert.equal(r.status, 200);
    assert.equal(lastCall().body.model, 'gpt-5.4-mini');
  });

  test('upstream errors: a lost chain answers 409 (the app resends), other errors 502', async () => {
    const me = await person();
    script = [reply()];
    const first = await turn(me, { text: 'hi' });
    script = [{ httpStatus: 400, error: '{"error":{"message":"Previous response with id resp_x not found."}}' }];
    assert.equal((await turn(me, { text: 'hi', prev: first.id })).status, 409);
    script = [{ httpStatus: 500, error: 'boom' }];
    assert.equal((await turn(me, { text: 'hi' })).status, 502);
  });
});

describe('Art: privacy mode without OpenAI storage', () => {
  let t;
  before(async () => {
    t = await startTestServer({ openai: fakeOpenAi, config: { ai: { models: { art: 'gpt-6.1-sol' }, art: { store: false } } } });
  });
  after(() => t.stop());

  test('AI_ART_STORE=false: nothing stored at OpenAI, no chain id handed to the app', async () => {
    const { token } = await t.newAccount();
    script = [reply()];
    const res = await fetch(`${t.base}/api/ai/responses`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'x-behappy-feature': 'art', 'x-behappy-art-session': '1' },
      body: JSON.stringify({ input: [{ role: 'user', content: 'hello\n\n[Session Context: Theme: X, Language: English, Phase: 0.]' }], stream: false, store: true }),
    });
    const j = await res.json();
    assert.equal(res.status, 200);
    assert.equal(j.id, undefined, 'the app falls back to sending its own history');
    assert.equal(calls[calls.length - 1].body.store, false);
  });
});
