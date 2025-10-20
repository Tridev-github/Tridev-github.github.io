const $ = (q, el=document) => el.querySelector(q);
const $$ = (q, el=document) => [...el.querySelectorAll(q)];

const state = { data:null, persona:'all', paletteOpen:false };

window.addEventListener('DOMContentLoaded', async () => {
  $('#year').textContent = new Date().getFullYear();

  $('#print').addEventListener('click', () => window.print());
  $('#theme').addEventListener('click', toggleTheme);
  $('#cmdk').addEventListener('click', openPalette);
  document.addEventListener('keydown', (e)=>{ if ((e.metaKey||e.ctrlKey) && e.key.toLowerCase()==='k'){ e.preventDefault(); openPalette(); } });

  $('#persona').addEventListener('change', (e)=>{ state.persona = e.target.value; dimBullets(); });
  $('#filter').addEventListener('input', (e)=> filterNav(e.target.value));

  const res = await fetch('resume.json', {cache:'no-store'});
  state.data = await res.json();

  // Hero / brand
  $('#name').textContent = state.data.name;
  $('#brand-name').textContent = state.data.name;
  $('#title').textContent = state.data.title;
  $('#brand-title').textContent = state.data.title;
  $('#emailLink').href = `mailto:${state.data.contact?.email || 'tridevmethuku.0@gmail.com'}`;
  $('#pdfLink').href = state.data.contact?.pdf || 'resume.pdf';
  renderBadges();

  renderExperience();
  renderProjects();
  renderSkills();
  renderEducation();
  renderPubs();

  buildTOC();
  buildPaletteIndex();
  observeSections();
});

function renderBadges(){
  const b = $('#badges');
  const d = state.data;
  const badges = [d.location, `${d.years_experience||'3'}y exp`, ...(d.specialties||[]).slice(0,3)];
  b.innerHTML = badges.filter(Boolean).map(x=> `<li>${x}</li>`).join('');
}

/* ---- Experience ---- */
function renderExperience(){
  const wrap = $('#experience-list');
  wrap.innerHTML = (state.data.experience||[]).map(job => {
    const tags = job.stack ? job.stack.map(s=>`<span class="chip">${s}</span>`).join(' ') : '';
    const bullets = (job.highlights||[]).map(h => {
      const text = typeof h === 'string' ? h : h.text;
      const tags = (typeof h === 'object' && h.tags) ? h.tags.join(',') : '';
      return `<li data-tags="${tags}">${text}</li>`;
    }).join('');
    return `
      <article class="card" id="${slug(job.company)+'-'+slug(job.role)}">
        <header>
          <div>
            <h3>${job.role} @ ${job.company}</h3>
            <div class="meta">${job.date_range || ''} • ${job.location || ''}</div>
          </div>
          <div class="stack">${tags}</div>
        </header>
        <ul class="points">${bullets}</ul>
      </article>`;
  }).join('');
  dimBullets();
}

/* ---- Projects ---- */
function renderProjects(){
  const wrap = $('#projects-list');
  wrap.innerHTML = (state.data.projects||[]).map(p => {
    const tags = (p.tags||[]).map(t=>`<span class="chip">${t}</span>`).join(' ');
    const metrics = (p.metrics||[]).map(m=>`<span class="chip">${m}</span>`).join(' ');
    const bullets = (p.highlights||[]).map(h=>{
      const text = typeof h==='string' ? h : h.text;
      const tags = (typeof h==='object' && h.tags) ? h.tags.join(',') : '';
      return `<li data-tags="${tags}">${text}</li>`;
    }).join('');
    return `
      <article class="card" id="project-${slug(p.name)}">
        <header>
          <div>
            <h3>${p.name}</h3>
            <div class="meta">${p.description||''}</div>
          </div>
          <div class="stack">${tags} ${metrics}</div>
        </header>
        ${bullets ? `<ul class="points">${bullets}</ul>`: ''}
      </article>`;
  }).join('');
  dimBullets();
}

/* ---- Skills ---- */
function renderSkills(){
  const grid = $('#skills-grid');
  const s = state.data.skills || {};
  grid.innerHTML = Object.entries(s).map(([k,arr]) => `<span class="chip"><strong>${k}:</strong> ${arr.join(' · ')}</span>`).join('');
}

/* ---- Education ---- */
function renderEducation(){
  const list = $('#education-list');
  list.innerHTML = (state.data.education||[]).map(e=> `
    <article class="card">
      <h3>${e.school}</h3>
      <div class="meta">${e.degree||''} — ${e.date_range||''} ${e.location? '• '+e.location : ''}</div>
      ${e.details? `<p class="meta">${e.details}</p>`:''}
    </article>
  `).join('');
}

/* ---- Pubs & Patents ---- */
function renderPubs(){
  const wrap = $('#pubs-list');
  const pubs = (state.data.publications||[]).map(p => `<p class="bullet"><strong>${p.venue} ${p.year}:</strong> ${p.title}${p.status?` (${p.status})`:''}</p>`).join('');
  const pats = (state.data.patents||[]).map(p => `<p class="bullet"><strong>Patent:</strong> ${p.title}${p.status?` (${p.status})`:''}</p>`).join('');
  wrap.innerHTML = pubs + pats;
}

/* ---- Persona filtering ---- */
function dimBullets(){
  const persona = state.persona;
  $$('.points li').forEach(li => {
    if (persona === 'all'){ li.dataset.dimmed = 'false'; return; }
    const tags = (li.dataset.tags||'').split(',').map(x=>x.trim()).filter(Boolean);
    li.dataset.dimmed = String(!tags.includes(persona));
  });
}

/* ---- TOC + scroll spy ---- */
function buildTOC(){
  const toc = $('#toc');
  toc.innerHTML = $$('#main [data-section]').map(sec => {
    const title = sec.querySelector('h2').textContent;
    return `<li><a href="#${sec.id}">${title}</a></li>`;
  }).join('');
}
function filterNav(q){
  q = q.toLowerCase().trim();
  $$('#toc a').forEach(a => a.parentElement.style.display = a.textContent.toLowerCase().includes(q) ? '' : 'none');
}
function observeSections(){
  const map = new Map($$('#toc a').map(a => [a.getAttribute('href').slice(1), a]));
  const io = new IntersectionObserver(entries => {
    const vis = entries.filter(e=>e.isIntersecting).sort((a,b)=> b.intersectionRatio-a.intersectionRatio)[0];
    if (!vis) return;
    const id = vis.target.id;
    $$('#toc a').forEach(a => a.classList.toggle('active', a===map.get(id)));
  }, { rootMargin:'-40% 0px -55% 0px', threshold:[0, .2, .5, 1]});
  $$('#main [data-section]').forEach(sec=> io.observe(sec));
}

/* ---- Command palette ---- */
const PALETTE = $('#palette'), PINPUT = $('#pinput'), PLIST = $('#plist');
let INDEX = [];
function buildPaletteIndex(){
  const d = state.data;
  const push = (t, sub, id) => INDEX.push({t, sub, id});
  (d.experience||[]).forEach(j => push(`${j.role} @ ${j.company}`, j.location || j.date_range || '', 'experience'));
  (d.projects||[]).forEach(p => push(`${p.name}`, p.description || '', 'projects'));
  Object.entries(d.skills||{}).forEach(([k,arr]) => arr.forEach(s=> push(s, k, 'skills')));
  (d.education||[]).forEach(e=> push(e.school, e.degree || '', 'education'));
}
function openPalette(){
  PALETTE.hidden = false; PINPUT.value=''; PLIST.innerHTML=''; PINPUT.focus();
  state.paletteOpen = true;
}
function closePalette(){ PALETTE.hidden = true; state.paletteOpen=false; }
document.addEventListener('keydown', (e)=>{ if (state.paletteOpen) handlePaletteKeys(e); });
document.addEventListener('click', (e)=>{ if (e.target===PALETTE) closePalette(); });
PINPUT.addEventListener('input', ()=> {
  const q = PINPUT.value.trim().toLowerCase(); PLIST.innerHTML='';
  if (!q) return;
  const res = INDEX.map(x => ({...x, score: score(x, q)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,12);
  PLIST.innerHTML = res.map((r,i)=> `<li role="option" aria-selected="${i===0}"><div><strong>${escape(r.t)}</strong><br><span class="meta">${escape(r.sub)}</span></div><span>${r.id}</span></li>`).join('');
  $$('#plist li').forEach(li => li.addEventListener('click', ()=>{ location.hash = '#'+$(`#${li.querySelector('span').textContent}`).id; closePalette(); }));
});
function handlePaletteKeys(e){
  const items = $$('#plist li'); if (!items.length){ if (e.key==='Escape') closePalette(); return; }
  let idx = items.findIndex(li => li.getAttribute('aria-selected')==='true');
  if (e.key==='ArrowDown'){ e.preventDefault(); idx=Math.min(items.length-1, idx+1); }
  if (e.key==='ArrowUp'){ e.preventDefault(); idx=Math.max(0, idx-1); }
  if (e.key==='Enter'){ e.preventDefault(); items[idx]?.click(); }
  items.forEach(li=>li.setAttribute('aria-selected','false'));
  if (idx>=0) items[idx].setAttribute('aria-selected','true');
  if (e.key==='Escape'){ closePalette(); }
}
function score(item, q){
  const hay = (item.t + ' ' + item.sub).toLowerCase();
  return q.split(/\s+/).every(t => hay.includes(t)) ? (200 - hay.indexOf(q.split(/\s+/)[0])) : 0;
}

/* ---- Theme ---- */
let theme = localStorage.getItem('theme') || 'system';
applyTheme(theme);
function toggleTheme(){
  theme = theme==='dark' ? 'light' : theme==='light' ? 'system' : 'dark';
  applyTheme(theme); localStorage.setItem('theme', theme);
}
function applyTheme(t){
  document.documentElement.dataset.theme = t;
  if (t==='dark') document.documentElement.style.colorScheme = 'dark';
  else if (t==='light') document.documentElement.style.colorScheme = 'light';
  else document.documentElement.style.colorScheme = 'normal';
}

/* ---- Utils ---- */
function slug(s){ return String(s).toLowerCase().replace(/[^\w]+/g,'-'); }
function escape(s){ return String(s).replace(/[&<>"]/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }


