// Live check of the card-reflection instructions (server/prompts/cards.md) on
// the model the server uses (AI_MODEL_CARDS, AI_REASONING_CARDS), with the Plus
// output budget and the free reflection's (AI_CARDS_FREE_MAX_OUTPUT_TOKENS). Scripted,
// synthetic person turns with the real deck images; no real person's data.
// Costs real OpenAI tokens (a few cents).
//
//   node scripts/qa/cards-model-eval.mjs [--setups plus,free] [--prompt old-cards.md] [--out docs/eval/cards-eval.json]
//
// Every reply is printed and saved for reading. Automatic counts per reply:
//   questions   question marks (the method: exactly one open question, none when closing)
//   suspect     words that usually mean interpreting or advising ("symbolises",
//               "maybe you feel", "you should", "it seems" and the same in ru/ka)
//   echo        the reply says the person's last words back before asking
//               (most of their words, in a sentence that isn't the question).
//               Now and then is fine; in every reply, or two in a row, it isn't.
// Summaries: questions (one "to take with you" is allowed), words, and the
// suspect check. Read the replies too: a count can't tell a gentle question
// from a leading one.
import fs from 'node:fs';
import path from 'node:path';

import { config } from '../../server/config.mjs';
import { HELP_SCREEN_NAMES, SERVER_PROMPTS } from '../../server/prompts/index.mjs';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', '..');
const arg = (n, d) => (process.argv.includes(`--${n}`) ? process.argv[process.argv.indexOf(`--${n}`) + 1] : d);
const OUT = arg('out', '');
// --prompt <file>: another version of cards.md (to compare with an earlier one, e.g. from git show).
const INSTRUCTIONS = arg('prompt', '') ? `${fs.readFileSync(arg('prompt', ''), 'utf8').trim()}\n\n${HELP_SCREEN_NAMES}` : SERVER_PROMPTS.cards.instructions;
const SETUPS = {
  plus: { model: config.ai.models.cards, reasoning: config.ai.cards.reasoning, maxOutputTokens: config.ai.cards.maxOutputTokens },
  free: { model: config.ai.models.cards, reasoning: config.ai.cards.reasoning, maxOutputTokens: config.ai.cards.freeMaxOutputTokens },
};
const which = arg('setups', 'plus,free').split(',');
const SUMMARY_REQUEST = "We've covered a lot of meaningful ground. I'm ready for the session summary now. Please provide the summary of this reflection.";

const image = (p) => `data:image/${p.endsWith('.png') ? 'png' : 'jpeg'};base64,${fs.readFileSync(path.join(root, 'assets', 'cards', p)).toString('base64')}`;
// The first message is what the app sends (services/cardTherapyService.ts describeCards).
const SCENARIOS = [
  {
    name: 'en-emotion',
    first: '[Card reflection] The person chose emotion card #3 from the BeHappy card decks; the card image is shared in this conversation. Reply in English.',
    images: ['emotions/card3.jpg'],
    turns: ['I chose it because the person looks lonely', "I don't know", 'What does this card mean?', 'It reminds me of my school years, I was alone a lot', 'Can you give me some advice?', 'I would like to stop now.'],
    summary: true,
  },
  {
    name: 'ka-resource',
    first: '[Card reflection] The person chose resource card #5 from the BeHappy card decks; the card image is shared in this conversation. Reply in Georgian.',
    images: ['resources/card5.jpg'],
    turns: ['ეს ბარათი იმიტომ ავირჩიე, რომ ძალიან მომეწონა', 'სიმშვიდეს ვგრძნობ', 'შენ რას ფიქრობ, რას ნიშნავს?', 'ბავშვობაში სოფელში ბებიასთან ვიყავი ასე', 'ახლა ასეთი სიმშვიდე იშვიათად მაქვს, სულ ვჩქარობ', 'ალბათ შაბათს ბებიას დავურეკავ'],
    summary: true,
  },
  {
    name: 'ka-heart-latin',
    first: '[Card reflection] The person chose emotion card #8 from the BeHappy card decks; the card image is shared in this conversation. Reply in Georgian.',
    images: ['emotions/card8.jpg'],
    turns: ['es avirchie imitom rom feri momewona', 'sevdas vgrdznob', 'gulshi vgrdznob', 'mdzimea, titqos qva midevs', 'deda gamaxsenda, isic xshirad iyo sevdiani', 'minda rom am baratze meti sinatle iyos', 'axla cota upro msubukad var'],
    summary: true,
  },
  {
    name: 'ru-pair',
    first: '[Card reflection] The person chose a light and heavy pair: card #2 (light) and card #7 (heavy) from the BeHappy card decks; the card image is shared in this conversation. Reply in Russian.',
    images: ['positivenegative/2.jpg', 'positivenegative/7.jpg'],
    turns: ['Начну с тяжёлой', 'Мне тяжело на неё смотреть', 'не знаю', 'Наверное, это как моя работа сейчас, всё давит', 'На светлой карте есть простор, мне его не хватает', 'Хочу в выходные просто погулять одной'],
    summary: true,
  },
];
const SUSPECT = /symboli|represent|this card (is|shows|means)|it seems|maybe you|perhaps you|you might feel|you should|try to|символ|означает, что|возможно, вы|кажется, вы|вам стоит|სიმბოლ|ალბათ|ნიშნავს, რომ|უნდა გააკეთო/i;

// Letters only, lower case; Georgian verbs change their first letter ("vgrdznob" →
// "grdznob"), so a word counts as said back when its 4 letters after the first appear.
const words = (t) => String(t).toLowerCase().match(/[\p{L}]+/gu) || [];
const statements = (t) => String(t).split(/(?<=[.!?。！？])\s+|\n+/).filter((x) => !/[?？؟]\s*$/.test(x.trim())).join(' ');
function echoes(person, reply) {
  const said = words(person).filter((w) => w.length >= 4);
  if (said.length < 2) return false;
  const back = words(statements(reply)).join(' ');
  const hits = said.filter((w) => back.includes(w.slice(1, 5)));
  return hits.length / said.length >= 0.6;
}
const KA_LATIN = { a: 'ა', b: 'ბ', g: 'გ', d: 'დ', e: 'ე', v: 'ვ', z: 'ზ', t: 'თ', i: 'ი', k: 'კ', l: 'ლ', m: 'მ', n: 'ნ', o: 'ო', p: 'პ', r: 'რ', s: 'ს', u: 'უ', f: 'ფ', q: 'ქ', y: 'ყ', c: 'ც', j: 'ჯ', h: 'ჰ', x: 'ხ', w: 'წ' };
// Enough to compare a Latin-typed Georgian turn with a reply in Georgian script.
const kaScript = (t) => String(t).replace(/sh/g, 'შ').replace(/ch/g, 'ჩ').replace(/dz/g, 'ძ').replace(/gh/g, 'ღ').replace(/zh/g, 'ჟ').replace(/ts/g, 'ც').replace(/[a-z]/g, (c) => KA_LATIN[c] || c);

async function call(setup, input) {
  const started = Date.now();
  const res = await fetch(`${config.openai.baseUrl}/responses`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.openai.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: setup.model, instructions: INSTRUCTIONS, reasoning: { effort: setup.reasoning }, max_output_tokens: setup.maxOutputTokens, store: false, input }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`${res.status} ${JSON.stringify(data.error || data).slice(0, 200)}`);
  const text = (data.output || []).flatMap((o) => o.content || []).filter((c) => c.type === 'output_text').map((c) => c.text).join('');
  return { text, ms: Date.now() - started, usage: data.usage };
}

if (!config.openai.apiKey) {
  console.error('OPENAI_API_KEY is missing (server/.env).');
  process.exit(1);
}
const results = [];
for (const name of which) {
  const setup = SETUPS[name];
  if (!setup) continue;
  for (const s of SCENARIOS) {
    const input = [{ role: 'user', content: [{ type: 'input_text', text: s.first }, ...s.images.map((p) => ({ type: 'input_image', image_url: image(p) }))] }];
    const log = { setup: name, model: setup.model, reasoning: setup.reasoning, scenario: s.name, turns: [] };
    for (const said of [null, ...s.turns, ...(s.summary ? [SUMMARY_REQUEST] : [])]) {
      if (said !== null) input.push({ role: 'user', content: [{ type: 'input_text', text: said }] });
      const r = await call(setup, input);
      input.push({ role: 'assistant', content: [{ type: 'output_text', text: r.text }] });
      const questions = (r.text.match(/[?？؟]/g) || []).length;
      const suspect = r.text.match(SUSPECT)?.[0] || null;
      const isSummary = said === SUMMARY_REQUEST;
      const echo = said && !isSummary ? echoes(/[ა-ჰ]/.test(r.text) && !/[ა-ჰ]/.test(said) ? kaScript(said) : said, r.text) : false;
      const wordCount = words(r.text).length;
      log.turns.push({ person: said, bea: r.text, questions, suspect, echo, words: wordCount, ms: r.ms, inputTokens: r.usage?.input_tokens, outputTokens: r.usage?.output_tokens });
      console.log(`\n[${name} ${s.name}] ${said === null ? '(start)' : `Person: ${said}`}\nBea (${r.ms} ms, ${questions}?${echo ? ', ECHO' : ''}${isSummary ? `, ${wordCount} words` : ''}): ${r.text}`);
    }
    results.push(log);
  }
}
const replies = results.flatMap((l) => l.turns.filter((t) => t.person !== SUMMARY_REQUEST).map((t) => ({ ...t, setup: l.setup })));
const summary = {};
for (const name of which) {
  const t = replies.filter((x) => x.setup === name);
  if (!t.length) continue;
  const ms = t.map((x) => x.ms).sort((a, b) => a - b);
  const logs = results.filter((l) => l.setup === name);
  const echoInRow = logs.reduce((n, l) => n + l.turns.filter((x, i) => x.echo && l.turns[i - 1]?.echo).length, 0);
  const sums = logs.flatMap((l) => l.turns.filter((x) => x.person === SUMMARY_REQUEST));
  summary[name] = {
    model: SETUPS[name].model,
    reasoning: SETUPS[name].reasoning,
    replies: t.length,
    moreThanOneQuestion: t.filter((x) => x.questions > 1).length,
    noQuestion: t.filter((x) => x.questions === 0).length,
    suspect: t.filter((x) => x.suspect).length,
    echo: t.filter((x) => x.echo).length,
    echoTwiceInRow: echoInRow,
    summaries: sums.length,
    summaryWords: sums.map((x) => x.words),
    summaryMoreThanOneQuestion: sums.filter((x) => x.questions > 1).length,
    summarySuspect: sums.filter((x) => x.suspect).length,
    medianMs: ms[ms.length >> 1],
  };
  console.log(`\n== ${name} (${SETUPS[name].model}, ${SETUPS[name].reasoning}): ${JSON.stringify(summary[name])}`);
}
if (OUT) {
  fs.writeFileSync(path.resolve(root, OUT), JSON.stringify({ date: new Date().toISOString(), summary, results }, null, 2));
  console.log(`saved ${OUT}`);
}
