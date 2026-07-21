// Art therapy end-to-end session tester.
// Replays the EXACT Responses API call artTherapyService.sendMessage() makes,
// using the same stored prompt id/version, so we exercise the real backend flow.
import fs from 'node:fs';
import path from 'node:path';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// ---- 1) Reproduce the service's key resolution to see if it even finds a key ----
const serviceStyleKey =
  process.env.OPENAI_API_KEY /* extra.OPENAI_API_KEY == process.env.OPENAI_API_KEY */ ||
  process.env.EXPO_PUBLIC_OPENAI_API_KEY ||
  '';
console.log('🔑 Key found by artTherapyService resolution (OPENAI_API_KEY / EXPO_PUBLIC_OPENAI_API_KEY):',
  serviceStyleKey ? 'FOUND' : 'EMPTY ❌');

// The key that actually exists in .env / rest of app:
const realKey = process.env.EXPO_PUBLIC_API_KEY || '';
console.log('🔑 Key in .env under EXPO_PUBLIC_API_KEY:', realKey ? 'FOUND ✅' : 'EMPTY');

const apiKey = serviceStyleKey || realKey;
if (!apiKey) { console.error('No API key at all — aborting.'); process.exit(1); }

// ---- Config copied verbatim from artTherapyService.ts ----
const promptId = 'pmpt_690baa7920308196a2d94f41d4be76be0bd44ed1840b1049';
const promptVersion = '18';
const baseURL = 'https://api.openai.com/v1';
const LANG = 'ka';
const LANG_NAME = 'Georgian (ქართული)';
const THEME = process.argv[2] || 'Inner emotional landscape / how I feel right now';

const IMG1 = 'C:/Users/mailk/Downloads/art-therapy-type-drawing.jpg';
const IMG2 = 'C:/Users/mailk/Downloads/1130470882_sara roizen (12-18-10) - 019.jpg';

function toDataUrl(p) {
  const b = fs.readFileSync(p);
  return `data:image/jpeg;base64,${b.toString('base64')}`;
}

function buildSessionContext(phase, imageOnly) {
  const imageOnlyInstruction = imageOnly
    ? '\nThe latest user message contains only an image. First determine whether it clearly appears to be the client\'s own hand-made artwork for this art therapy session. If it is an ordinary photo, selfie, screenshot, digital/generated character, document, object, room, person, pet, food, landscape, or otherwise not clearly hand-made artwork, politely reject it without psychological interpretation and ask for a hand-made drawing or painting. If it is ambiguous, ask the client to confirm whether they made it by hand for this session.'
    : '';
  return `\n\n[Session Context: Theme: ${THEME}, Language: ${LANG_NAME}, Phase: ${phase}. CRITICAL: You MUST respond in ${LANG_NAME} language for ALL text, including response_text, phase_summary, session_summary, next_steps, and any question. Do NOT respond in English unless Language is English.${imageOnlyInstruction} Respond with valid JSON matching the ArtTherapyResponse schema.]`;
}

// messages: [{role, content, imageBase64}]
async function send(messages, phase) {
  const msgs = messages.map(m => ({ ...m }));
  for (let i = msgs.length - 1; i >= 0; i--) {
    if (msgs[i].role === 'user') {
      const imageOnly = Boolean(msgs[i].imageBase64) && !msgs[i].content;
      msgs[i].apiOnlyContent = (msgs[i].content || '') + buildSessionContext(phase, imageOnly);
      break;
    }
  }
  const input = [];
  for (const m of msgs) {
    const content = [];
    if (m.role === 'user') {
      const t = m.apiOnlyContent || m.content;
      if (t) content.push({ type: 'input_text', text: t });
      if (m.imageBase64) content.push({ type: 'input_image', image_url: m.imageBase64 });
      input.push({ role: 'user', content });
    } else if (m.role === 'assistant') {
      if (m.content) content.push({ type: 'output_text', text: m.content });
      input.push({ role: 'assistant', content });
    }
  }
  const t0 = Date.now();
  const res = await axios.post(`${baseURL}/responses`, {
    input, prompt: { id: promptId, version: promptVersion },
    max_output_tokens: 2048, store: false, text: { format: { type: 'json_object' } },
  }, { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` }, timeout: 90000 });
  const ms = Date.now() - t0;
  let outputText = res.data?.output_text;
  if (!outputText && Array.isArray(res.data?.output)) {
    for (const o of res.data.output) {
      const t = o?.content?.find?.(c => typeof c?.text === 'string')?.text;
      if (t) { outputText = t; break; }
    }
  }
  if (!outputText) {
    console.error('RAW RESPONSE KEYS:', Object.keys(res.data || {}));
    console.error('RAW:', JSON.stringify(res.data, null, 2).slice(0, 2000));
    throw new Error('no outputText');
  }
  let parsed;
  try { parsed = JSON.parse(outputText); }
  catch { const s = outputText.indexOf('{'), e = outputText.lastIndexOf('}'); parsed = JSON.parse(outputText.slice(s, e + 1)); }
  return { parsed, ms, usage: res.data?.usage };
}

function show(label, r) {
  const p = r.parsed;
  console.log(`\n${'='.repeat(70)}\n${label}   (⏱ ${r.ms}ms, tokens in/out: ${r.usage?.input_tokens}/${r.usage?.output_tokens})`);
  console.log('─'.repeat(70));
  console.log('💬 response_text:\n' + p.response_text);
  console.log('\n📊 phase:', p.session_phase, '| phase_complete:', p.phase_complete,
    '| session_complete:', p.session_complete, '| required_input:', p.required_input, '| action:', p.action);
  if (p.clinical_insights) {
    console.log('🎨 emotions:', p.clinical_insights.emotional_indicators?.detected_emotions?.join(', '));
    console.log('🧩 themes:', p.clinical_insights.psychological_themes?.join(', '));
    console.log('🎨 colors:', p.clinical_insights.visual_analysis?.colors?.join(', '));
  }
  if (p.safety_assessment) console.log('🛡 risk_level:', p.safety_assessment.risk_level);
  if (p.session_summary) console.log('\n📝 session_summary:\n' + p.session_summary);
}

const img1 = toDataUrl(IMG1);
const img2 = toDataUrl(IMG2);
console.log(`\n🖼 img1 size: ${(fs.statSync(IMG1).size/1024).toFixed(0)}KB, img2: ${(fs.statSync(IMG2).size/1024).toFixed(0)}KB`);

const messages = [];
try {
  // Turn 1: user uploads first drawing (image only) -> phase 0
  messages.push({ role: 'user', content: '', imageBase64: img1 });
  let r = await send(messages, 0);
  show('TURN 1 — First drawing uploaded (image only)', r);
  messages.push({ role: 'assistant', content: r.parsed.response_text });

  // Turn 2: user answers the reflection question
  messages.push({ role: 'user', content: 'როცა ვხატავდი, დაძაბული ვიყავი და ცოტა სევდიანი. ახლა უფრო მშვიდად ვგრძნობ თავს, მაგრამ სიცარიელეც არის.' });
  r = await send(messages, 1);
  show('TURN 2 — Client reflects on feelings', r);
  messages.push({ role: 'assistant', content: r.parsed.response_text });

  // Turn 3: user uploads a second drawing to compare
  messages.push({ role: 'user', content: '', imageBase64: img2 });
  r = await send(messages, 1);
  show('TURN 3 — Second drawing uploaded', r);
  messages.push({ role: 'assistant', content: r.parsed.response_text });

  // Turn 4: user asks to end session -> summary
  messages.push({ role: 'user', content: 'ახლა მინდა სესიის დასრულება. მადლობა.' });
  r = await send(messages, 2);
  show('TURN 4 — End session + summary', r);

  console.log('\n\n✅ SESSION TEST COMPLETE');
} catch (e) {
  console.error('\n❌ ERROR:', e.response?.status, JSON.stringify(e.response?.data || e.message, null, 2));
  process.exit(1);
}
