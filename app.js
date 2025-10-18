// All-browser RAG with Netflix-style UI + Turbo options
import { RESUME_CHUNKS } from './resume.js';

const transformers = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.0/dist/transformers.min.js');
const webllm       = await import('https://esm.run/@mlc-ai/web-llm');

const $  = (s) => document.querySelector(s);
const messagesEl   = $('#messages');
const ctxViewEl    = $('#ctx-view');
const embedStatus  = $('#embed-status');
const llmStatus    = $('#llm-status');
const progressWrap = $('#progress-wrap');
const progressBar  = $('#progress-bar');

const toggleTurbo  = $('#toggle-turbo');
const toggleWarm   = $('#toggle-warm');
const toggleStream = $('#toggle-stream');
const maxTokensEl  = $('#max-tokens');

$('#collapse-ctx').addEventListener('click', () => {
  ctxViewEl.classList.toggle('hidden');
});

function addMsg(role, text) {
  const el = document.createElement('div');
  el.className = `msg ${role}`;
  el.textContent = text;
  messagesEl.appendChild(el);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return el;
}
function setProgress(frac, text, target) {
  const pct = Math.round(frac * 100);
  progressWrap.classList.remove('hidden');
  progressBar.style.width = `${pct}%`;
  if (target) target.textContent = `${text} — ${pct}%`;
  if (pct >= 100) setTimeout(() => progressWrap.classList.add('hidden'), 300);
}

// Environment warnings
(function () {
  const warn = [];
  if (!('gpu' in navigator)) warn.push('WebGPU not detected — LLM may fall back to retrieval-only.');
  if (location.protocol === 'file:') warn.push('Serve from a web server (GitHub Pages or local) for proper module downloads.');
  if (warn.length) {
    const box = document.createElement('div');
    box.className = 'ctx-card';
    box.innerHTML = warn.map(w => `• ${w}`).join('<br>');
    document.querySelector('#env-warnings').appendChild(box);
  }
})();

// ---------- Embeddings ----------
const EMBED_MODEL = 'Xenova/all-MiniLM-L6-v2';
let extractor = null;
let embedCache = null;
const STORAGE_KEY = `resume_embedcache_v2_${EMBED_MODEL}`;

function dot(a, b) { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; }
function norm(a) { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * a[i]; return Math.sqrt(s); }
function normalize(vec) { const n = norm(vec) || 1e-12; return vec.map(v => v / n); }

async function initEmbeddings() {
  try {
    embedStatus.textContent = 'Loading…';
    const { pipeline } = transformers;
    const device = ('gpu' in navigator) ? 'webgpu' : 'auto';
    extractor = await pipeline('feature-extraction', EMBED_MODEL, { device });

    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      embedCache = JSON.parse(cached);
      embedStatus.textContent = `Ready (cached ${embedCache.vectors.length} chunks)`;
      return;
    }

    const vectors = [];
    for (let i = 0; i < RESUME_CHUNKS.length; i++) {
      const tex = RESUME_CHUNKS[i].text;
      const tens = await extractor(tex, { pooling: 'mean', normalize: false });
      const arr = Array.from(tens.data);
      const nrm = normalize(arr);
      vectors.push(nrm);
      setProgress((i + 1) / RESUME_CHUNKS.length, `Embedding ${i + 1}/${RESUME_CHUNKS.length}`, embedStatus);
      await new Promise(r => setTimeout(r));
    }
    embedCache = { model: EMBED_MODEL, vectors, meta: RESUME_CHUNKS.map(({id, section}) => ({id, section})), version: 2 };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(embedCache));
    embedStatus.textContent = `Ready (${vectors.length} chunks)`;
  } catch (e) {
    console.error(e);
    embedStatus.textContent = 'Error loading embeddings';
  }
}

function topK(queryVec, k = 6) {
  const scores = embedCache.vectors.map((v, i) => ({ i, score: dot(v, queryVec) }));
  scores.sort((a, b) => b.score - a.score);
  return scores.slice(0, k).map(s => ({ score: s.score, ...RESUME_CHUNKS[s.i] }));
}

// ---------- WebLLM ----------
let engine = null;
let llmReady = false;
let selectedModelId = null;

async function initLLM() {
  if (!('gpu' in navigator)) {
    llmStatus.textContent = 'WebGPU not available — retrieval-only mode.';
    return;
  }
  const tinyFirst = toggleTurbo.checked;
  const preferredTiny = [
    'Qwen2.5-1.5B-Instruct-q4f32_1-MLC',
    'Phi-3.5-mini-instruct-q4f32_1-MLC',
    'Llama-3.2-3B-Instruct-q4f32_1-MLC'
  ];
  const preferredLarge = [
    'Llama-3.1-8B-Instruct-q4f16_1-MLC',
    'Qwen2.5-3B-Instruct-q4f32_1-MLC'
  ];

  try {
    const avail = webllm.prebuiltAppConfig.model_list.map(m => m.model_id);
    const pref = tinyFirst ? preferredTiny.concat(preferredLarge) : preferredLarge.concat(preferredTiny);
    selectedModelId = pref.find(id => avail.includes(id)) || avail[0];

    llmStatus.textContent = `Downloading ${selectedModelId}…`;
    const engineOpts = {
      initProgressCallback: (p) => {
        const frac = Math.max(0, Math.min(1, (p?.progress ?? 0)));
        setProgress(frac, p?.text || 'Preparing model', llmStatus);
      }
    };
    engine = await webllm.CreateMLCEngine(selectedModelId, engineOpts);
    llmReady = true;
    llmStatus.textContent = `Ready (${selectedModelId})`;

    if (toggleWarm.checked) {
      await engine.chat.completions.create({
        messages: [{ role:'user', content:'Hello' }],
        max_tokens: 4, temperature: 0
      });
    }
  } catch (e) {
    console.error(e);
    llmStatus.textContent = 'Failed to load WebLLM — retrieval-only mode.';
  }
}

async function generateAnswer(question, hits) {
  const context = hits.map((h, i) => `[${i+1}] (${h.section}) ${h.text}`).join('\n');
  const sys = 'You are a concise portfolio assistant for Tridev Methuku. Answer only using the provided context. If unsure, say "Not in the resume." Cite snippets by [index].';
  const userPrompt = `Context:\n${context}\n\nUser question: ${question}\n\nAnswer (cite with [1], [2], ... as needed):`;

  const maxTokens = Math.max(64, Math.min(512, Number(maxTokensEl.value) || 192));

  if (llmReady && engine) {
    try {
      if (toggleStream.checked) {
        const thinking = addMsg('bot', '');
        const stream = await engine.chat.completions.create({
          messages: [{ role: 'system', content: sys }, { role: 'user', content: userPrompt }],
          temperature: 0.1, max_tokens: maxTokens, stream: true
        });
        let full = '';
        for await (const chunk of stream) {
          const delta = chunk?.choices?.[0]?.delta?.content ?? '';
          if (delta) { full += delta; thinking.textContent = full; }
        }
        return thinking.textContent;
      }
      const reply = await engine.chat.completions.create({
        messages: [{ role: 'system', content: sys }, { role: 'user', content: userPrompt }],
        temperature: 0.1, max_tokens: maxTokens
      });
      return reply.choices[0].message.content;
    } catch (e) {
      console.error(e);
    }
  }
  let summary = 'Top matching snippets:\n' + hits.map((h, i) => `[${i+1}] ${h.text}`).join('\n');
  summary += '\n\n(LLM fell back — WebGPU or model not ready.)';
  return summary;
}

document.querySelector('#send').addEventListener('click', onSend);
document.querySelector('#reset').addEventListener('click', () => { messagesEl.innerHTML = ''; ctxViewEl.innerHTML = ''; });

document.querySelector('#prompt').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); }
});

async function onSend() {
  const q = document.querySelector('#prompt').value.trim();
  if (!q) return;
  document.querySelector('#prompt').value = '';
  addMsg('user', q);

  const tens = await extractor(q, { pooling: 'mean', normalize: false });
  const qvec = normalize(Array.from(tens.data));

  const hits = topK(qvec, 6);
  ctxViewEl.innerHTML = hits.map((h, i) => `
    <div class="ctx-card">
      <h4>[${i+1}] ${h.section}</h4>
      <p>${h.text}</p>
    </div>
  `).join('');

  const thinking = addMsg('bot', 'Thinking…');
  const answer = await generateAnswer(q, hits);
  thinking.textContent = answer;
  const meta = document.createElement('span');
  meta.className = 'meta';
  meta.textContent = 'Sources: ' + hits.map((h, i) => `[${i+1}:${h.id}]`).join(' ');
  thinking.appendChild(meta);
}

(async function init() {
  await initEmbeddings();
  await initLLM();
  addMsg('bot', 'Hi! Ask me anything about Tridev’s background. First load may download models; Turbo is ON to pick a tiny model for faster answers.');
})();
