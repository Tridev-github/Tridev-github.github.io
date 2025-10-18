// 100% browser RAG chatbot for a single-resume corpus
// - Embeddings: Transformers.js (WebGPU if available)
// - Vector search: cosine sim over normalized vectors
// - LLM generation: WebLLM (WebGPU). Fallback: retrieval-only answers.

import { RESUME_CHUNKS } from './resume.js';

// Load libs via ESM CDNs
const transformers = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.0/dist/transformers.min.js');
const webllm       = await import('https://esm.run/@mlc-ai/web-llm');

// UI helpers
const $ = (sel) => document.querySelector(sel);
const messagesEl = $('#messages');
const ctxViewEl  = $('#ctx-view');
const embedStatus = $('#embed-status');
const llmStatus   = $('#llm-status');
const progressWrap = $('#progress-wrap');
const progressBar  = $('#progress-bar');

function addMsg(role, text) {
  const el = document.createElement('div');
  el.className = `msg ${role}`;
  el.textContent = text;
  messagesEl.appendChild(el);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return el;
}

// Environment warnings
(function () {
  const warn = [];
  if (!('gpu' in navigator)) {
    warn.push('WebGPU not detected — will still work, but downloads/inference may be slower. Try Chrome ≥ 113 or Edge on desktop for best speed.');
  }
  if (location.protocol === 'file:') {
    warn.push('Please serve via GitHub Pages or a local server — some browsers block module/cached downloads from file://');
  }
  if (warn.length) {
    const box = document.createElement('div');
    box.className = 'card';
    box.style.marginTop = '8px';
    box.innerHTML = '<strong>Heads-up:</strong><br>' + warn.map(w => `• ${w}`).join('<br>');
    $('#env-warnings').appendChild(box);
  }
})();

// ---- Embedding model ----
const EMBED_MODEL = 'Xenova/all-MiniLM-L6-v2'; // light & widely supported
let extractor = null;
let embedCache = null;

const STORAGE_KEY = `resume_embedcache_v1_${EMBED_MODEL}`;

function dot(a, b) { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; }
function norm(a) { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * a[i]; return Math.sqrt(s); }
function normalize(vec) { const n = norm(vec) || 1e-12; return vec.map(v => v / n); }

async function initEmbeddings() {
  try {
    embedStatus.textContent = 'Loading…';
    const device = ('gpu' in navigator) ? 'webgpu' : 'auto';
    const { pipeline } = transformers;
    extractor = await pipeline('feature-extraction', EMBED_MODEL, { device });

    // Load cache or build
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      embedCache = JSON.parse(cached);
      embedStatus.textContent = `Ready (cached ${embedCache.vectors.length} chunks)`;
      return;
    }

    // Compute embeddings for chunks (first load)
    progressWrap.classList.remove('hidden');
    progressBar.style.width = '0%';
    const vectors = [];
    for (let i = 0; i < RESUME_CHUNKS.length; i++) {
      const t = RESUME_CHUNKS[i].text;
      const tens = await extractor(t, { pooling: 'mean', normalize: false });
      // Convert to JS array and L2-normalize
      const arr = Array.from(tens.data);
      const nrm = normalize(arr);
      vectors.push(nrm);
      progressBar.style.width = `${Math.round(((i + 1) / RESUME_CHUNKS.length) * 100)}%`;
      await new Promise(r => setTimeout(r)); // yield to UI
    }
    progressWrap.classList.add('hidden');
    embedCache = { model: EMBED_MODEL, vectors, meta: RESUME_CHUNKS.map(({id, section}) => ({id, section})), version: 1 };
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

// ---- WebLLM (LLM in-browser) ----
let engine = null;
let llmReady = false;
let selectedModelId = null;

async function initLLM() {
  if (!('gpu' in navigator)) {
    llmStatus.textContent = 'WebGPU not available — using retrieval-only fallback.';
    return;
  }
  llmStatus.textContent = 'Loading model list…';
  const preferred = [
    'Llama-3.2-3B-Instruct-q4f32_1-MLC',
    'Qwen2.5-1.5B-Instruct-q4f32_1-MLC',
    'Phi-3.5-mini-instruct-q4f32_1-MLC',
    'Llama-3.1-8B-Instruct-q4f16_1-MLC'
  ];
  try {
    const available = webllm.prebuiltAppConfig.model_list.map(m => m.model_id);
    selectedModelId = preferred.find(id => available.includes(id)) || available[0];
    llmStatus.textContent = `Downloading ${selectedModelId}… (first time can take a few minutes)`;

    progressWrap.classList.remove('hidden');
    progressBar.style.width = '0%';
    const engineOpts = {
      initProgressCallback: (p) => {
        // p.progress is 0..1 in many versions; guard otherwise
        const frac = Math.max(0, Math.min(1, (p?.progress ?? 0)));
        progressBar.style.width = `${Math.round(frac * 100)}%`;
      }
    };
    engine = await webllm.CreateMLCEngine(selectedModelId, engineOpts);
    llmReady = true;
    progressWrap.classList.add('hidden');
    llmStatus.textContent = `Ready (${selectedModelId})`;
  } catch (e) {
    console.error(e);
    progressWrap.classList.add('hidden');
    llmStatus.textContent = 'Failed to load WebLLM — using retrieval-only fallback.';
  }
}

async function generateAnswer(question, hits) {
  const context = hits.map((h, i) => `[${i+1}] (${h.section}) ${h.text}`).join('\n');
  const sys = 'You are a concise portfolio assistant for Tridev Methuku. Only use the provided context to answer. If unsure, say you do not know. Cite snippets by [index].';
  const userPrompt = `Context:\n${context}\n\nUser question: ${question}\n\nAnswer (cite with [1], [2], ... as needed):`;

  if (llmReady && engine) {
    try {
      const reply = await engine.chat.completions.create({
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.2,
        max_tokens: 256
      });
      return reply.choices[0].message.content;
    } catch (e) {
      console.error(e);
      // fall through to extractive mode
    }
  }
  // Fallback: extractive answer (no generation)
  let summary = 'Top matching snippets:\n' + hits.map((h, i) => `[${i+1}] ${h.text}`).join('\n');
  summary += '\n\n(LLM fell back — WebGPU or model not ready.)';
  return summary;
}

// ---- Wire up UI ----
$('#send').addEventListener('click', onSend);
$('#reset').addEventListener('click', () => { messagesEl.innerHTML = ''; ctxViewEl.textContent = ''; });

$('#prompt').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    onSend();
  }
});

async function onSend() {
  const q = $('#prompt').value.trim();
  if (!q) return;
  $('#prompt').value = '';
  addMsg('user', q);

  // Embed query
  const tens = await extractor(q, { pooling: 'mean', normalize: false });
  const qvec = normalize(Array.from(tens.data));

  const hits = topK(qvec, 6);
  // Render context view
  ctxViewEl.textContent = hits.map((h, i) => `[${i+1}] (${h.section}) ${h.text}`).join('\n');

  const thinking = addMsg('bot', 'Thinking…');
  const answer = await generateAnswer(q, hits);
  thinking.textContent = answer + '\n';
  const refs = hits.map((h, i) => ` [${i+1}:${h.id}]`).join('');
  const citeEl = document.createElement('small');
  citeEl.textContent = `Sources:${refs}`;
  thinking.appendChild(citeEl);
}

// ---- Init ----
(async function init() {
  await initEmbeddings();
  await initLLM();
  addMsg('bot', 'Hi! Ask me anything about Tridev’s background. This chat runs fully in your browser — first load downloads small models, so it may take a bit.');
})();
