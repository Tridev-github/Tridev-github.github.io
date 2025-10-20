/* ---- tiny helpers ------------------------------------------------------ */
const $ = (q, el=document) => el.querySelector(q);
const $$ = (q, el=document) => [...el.querySelectorAll(q)];
const state = { data:null, mode:'docs', persona:'all', paletteOpen:false };

const setMode = (m) => {
  state.mode = m;
  $$('#tab-docs, #tab-story').forEach(b => b.setAttribute('aria-selected', String(b.dataset.mode===m)));
  $$('#mode-docs, #mode-story').forEach(s => s.classList.toggle('hidden', s.dataset.modePanel !== m));
  history.replaceState({}, '', `#${m}`);
};
const setPersona = (p) => {
  state.persona = p;
  renderExperience();
  renderProjects();
  dimBullets();
};

const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
let theme = localStorage.getItem('theme') || (prefersDark ? 'dark' : 'light');
document.documentElement.dataset.theme = theme;

/* ---- init -------------------------------------------------------------- */
window.addEventListener('DOMContentLoaded', async () => {
  $('#year').textContent = new Date().getFullYear();

  // wiring
  $('#tab-docs').addEventListener('click', () => setMode('docs'));
  $('#tab-story').addEventListener('click', () => setMode('story'));
  $('#persona').addEventListener('change', e => setPersona(e.target.value));
  $('#print').addEventListener('click', () => window.print());
  $('#theme').addEventListener('click', () => {
    theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('theme', theme);
  });
  $('#cmdk').addEventListener('click', openPalette);
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k'){ e.preventDefault(); openPalette(); }
    if (state.paletteOpen && e.key === 'Escape'){ e.preventDefault(); closePalette(); }
  });

  $('.nav-toggle').addEventListener('click', () => {
    const sb = $('#sidebar'); const open = sb.classList.toggle('open');
    $('.nav-toggle').setAttribute('aria-expanded', String(open));
  });
  $('#filter').addEventListener('input', (e) => filterNav(e.target.value));

  // deep link: #story or #docs
  const hashMode = (location.hash || '').replace('#','');
  if (hashMode === 'story') setMode('story');

  // load data
  const res = await fetch('resume.json');
  state.data = await res.json();

  renderQuickBadges();
  renderTOC();
  renderExperience();
  renderProjects();
  renderSkills();
  renderEducation();
  renderTalks();
  renderStory();
});

/* ---- rendering --------------------------------------------------------- */
function renderQuickBadges(){
  const list = $('#quick-badges');
  const badges = [
    state.data.title, state.data.location, `${state.data.years_experience}y exp`,
    ...state.data.specialties.slice(0,3)
  ];
  list.innerHTML = badges.map(b => `<li>${b}</li>`).join('');
}

function renderTOC(){
  const toc = $('#toc');
  const sections = $$('#mode-docs [data-section]');
  toc.innerHTML = sections.map(s => `<li role="treeitem"><a href="#${s.id}">${$('h2', s).textContent}</a></li>`).join('');
}

function filterNav(q){
  q = q.toLowerCase().trim();
  $$('#toc a').forEach(a => a.parentElement.style.display = a.textContent.toLowerCase().includes(q) ? '' : 'none');
}

function chip(text){ return `<span class="chip">${text}</span>`; }
function meta(dateRange, location){ return `<span class="endpoint-meta">${dateRange} • ${location}</span>`; }

function renderExperience(){
  const wrap = $('#experience-list'); const exp = state.data.experience;
  wrap.innerHTML = exp.map(job => {
    const path = `/experience/${slug(job.company)}/${slug(job.role)}`;
    const tags = job.stack.map(chip).join(' ');
    const bullets = job.highlights.map(pt => `<li data-tags="${(pt.tags||[]).join(',')}">${pt.text}</li>`).join('');
    return `
      <section class="endpoint" id="${path}">
        <div class="endpoint-header">
          <div>
            <div class="endpoint-path">GET ${path}</div>
            <h3>${job.role} @ ${job.company}</h3>
            ${meta(job.date_range, job.location)}
          </div>
          <div class="kv">${tags}</div>
        </div>
        <div class="endpoint-body">
          <ul class="points">${bullets}</ul>
          <details>
            <summary>Example response</summary>
            <pre><code>${escapeHtml(JSON.stringify(job, null, 2))}</code></pre>
          </details>
        </div>
      </section>`;
  }).join('');
  dimBullets();
}

function renderProjects(){
  const wrap = $('#projects-list'); const proj = state.data.projects;
  wrap.innerHTML = proj.map(p => {
    const path = `/projects/${slug(p.name)}`;
    const metrics = (p.metrics||[]).map(m => `<span class="metric">${m}</span>`).join(' ');
    const tags = p.tags.map(chip).join(' ');
    const bullets = (p.highlights||[]).map(pt => `<li data-tags="${(pt.tags||[]).join(',')}">${pt.text}</li>`).join('');
    const link = p.link ? `<a href="${p.link}" target="_blank" rel="noopener">Live</a>` : '';
    return `
      <section class="endpoint" id="${path}">
        <div class="endpoint-header">
          <div>
            <div class="endpoint-path">GET ${path}</div>
            <h3>${p.name}</h3>
            <div class="endpoint-meta">${p.description || ''} ${metrics}</div>
          </div>
          <div class="kv">${tags} ${link}</div>
        </div>
        <div class="endpoint-body">
          ${bullets ? `<ul class="points">${bullets}</ul>` : ''}
          <details><summary>Example response</summary>
          <pre><code>${escapeHtml(JSON.stringify(p, null, 2))}</code></pre></details>
        </div>
      </section>`;
  }).join('');
  dimBullets();
}

function renderSkills(){
  const grid = $('#skills-grid');
  const cats = state.data.skills;
  grid.innerHTML = Object.entries(cats).map(([k,arr]) => `<span class="chip"><strong>${k}:</strong> ${arr.join(' · ')}</span>`).join('');
}

function renderEducation(){
  const list = $('#education-list');
  list.innerHTML = state.data.education.map(e => `
    <div class="card">
      <strong>${e.school}</strong><br/>
      ${e.degree} — ${e.date_range}<br/>
      <span class="endpoint-meta">${e.details||''}</span>
    </div>`).join('');
}

function renderTalks(){
  const list = $('#talks-list');
  list.innerHTML = (state.data.talks||[]).map(t => `
    <div class="card">
      <strong>${t.title}</strong><br/>
      ${t.event} — ${t.year}<br/>
      ${t.link ? `<a href="${t.link}" target="_blank" rel="noopener">Watch/Read</a>` : ''}
    </div>`).join('');
}

function renderStory(){
  const t = $('#story-timeline');
  const steps = state.data.story || [];
  t.innerHTML = steps.map(s => `
    <section class="step">
      <h3>${s.title}</h3>
      <div class="meta">${s.when} • ${s.context}</div>
      <p>${s.narrative}</p>
      ${ (s.metrics||[]).map(m => `<span class="metric">${m}</span>`).join('') }
    </section>
  `).join('');
}

function dimBullets(){
  // De-emphasize bullets that don't match persona tags
  const p = state.persona;
  $$('.points li').forEach(li => {
    if (p === 'all'){ li.dataset.dimmed = 'false'; return; }
    const tags = (li.dataset.tags||'').split(',').map(s=>s.trim()).filter(Boolean);
    li.dataset.dimmed = String(!tags.includes(p));
  });
}

/* ---- command palette --------------------------------------------------- */
function openPalette(){
  const dlg = $('#palette');
  dlg.hidden = false; state.paletteOpen = true;
  $('#palette-input').value = ''; $('#palette-list').innerHTML = '';
  $('#palette-input').focus();
  document.addEventListener('keydown', handlePaletteKeys);
  $('#palette-input').addEventListener('input', handleSearch);
  buildPaletteIndex(); // lazy
}
function closePalette(){
  const dlg = $('#palette'); dlg.hidden = true; state.paletteOpen = false;
  document.removeEventListener('keydown', handlePaletteKeys);
}
let paletteIndex = [];
function buildPaletteIndex(){
  if (paletteIndex.length) return;
  const data = state.data;
  const push = (t, sub, href, kind) => paletteIndex.push({ t, sub, href, kind, score:0 });
  data.experience.forEach(j => {
    push(`${j.role} @ ${j.company}`, j.location, `#${encodeURI(`/experience/${slug(j.company)}/${slug(j.role)}`)}`, 'Experience');
  });
  data.projects.forEach(p => {
    push(`${p.name}`, p.description||'', `#${encodeURI(`/projects/${slug(p.name)}`)}`, 'Project');
  });
  Object.entries(data.skills).forEach(([k,arr]) => arr.forEach(s => push(s, k, '#skills', 'Skill')));
}
function handleSearch(e){
  const q = e.target.value.trim();
  const list = $('#palette-list');
  if (!q){ list.innerHTML = ''; return; }
  // simple fuzzy score: all query terms must appear; score by compactness
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  paletteIndex.forEach(item => {
    const hay = (item.t + ' ' + item.sub).toLowerCase();
    let ok = true, score = 0;
    for (const term of terms){
      const idx = hay.indexOf(term);
      if (idx === -1){ ok=false; break; }
      score += 100 - idx; // earlier match = higher
    }
    item.score = ok ? score : -1;
  });
  const results = paletteIndex.filter(i => i.score >=0).sort((a,b)=>b.score-a.score).slice(0, 12);
  list.innerHTML = results.map((r,i)=>`
    <li role="option" data-href="${r.href}" aria-selected="${i===0}">
      <div><strong>${escapeHtml(r.t)}</strong><br><span class="endpoint-meta">${escapeHtml(r.sub)}</span></div>
      <span class="chip">${r.kind}</span>
    </li>`).join('');
}
function handlePaletteKeys(e){
  if (!state.paletteOpen) return;
  const items = $$('#palette-list li');
  if (!items.length) return;
  const curr = items.findIndex(li => li.getAttribute('aria-selected') === 'true');
  if (e.key === 'ArrowDown'){ e.preventDefault(); const next = items[Math.min(items.length-1, curr+1)];
    if (next){ items.forEach(li=>li.setAttribute('aria-selected','false')); next.setAttribute('aria-selected','true'); next.scrollIntoView({block:'nearest'}); } }
  if (e.key === 'ArrowUp'){ e.preventDefault(); const prev = items[Math.max(0, curr-1)];
    if (prev){ items.forEach(li=>li.setAttribute('aria-selected','false')); prev.setAttribute('aria-selected','true'); prev.scrollIntoView({block:'nearest'}); } }
  if (e.key === 'Enter'){ e.preventDefault();
    const sel = items.find(li => li.getAttribute('aria-selected') === 'true');
    if (sel){ closePalette(); location.hash = sel.dataset.href; $('#palette').hidden = true; }
  }
  if (e.key === 'Escape'){ e.preventDefault(); closePalette(); }
}
$('#palette-list')?.addEventListener?.('click', (e)=>{
  const li = e.target.closest('li[data-href]'); if (!li) return; closePalette(); location.hash = li.dataset.href;
});

/* ---- utils ------------------------------------------------------------- */
function slug(s){ return s.toLowerCase().replace(/[^\w]+/g,'-').replace(/(^-|-$)/g,''); }
function escapeHtml(s){ return s.replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
