import { LINES, STATIONS } from './data.js';

document.addEventListener('DOMContentLoaded', () => {
  const svg = document.getElementById('metro');
  const tooltip = document.getElementById('tooltip');
  const panel = document.getElementById('panel');
  const closeBtn = document.getElementById('close');
  const titleEl = document.getElementById('p-title');
  const subEl = document.getElementById('p-sub');
  const bodyEl = document.getElementById('p-body');
  const bulletsEl = document.getElementById('p-bullets');
  const tagsEl = document.getElementById('p-tags');
  const linksEl = document.getElementById('p-links');
  const searchEl = document.getElementById('search');
  const textViewBtn = document.getElementById('textView');
  const printable = document.getElementById('printable');
  const printContent = document.getElementById('print-content');

  // Helper to safely add listeners
  const on = (el, ev, fn) => el && el.addEventListener(ev, fn);

  on(closeBtn, 'click', () => panel.classList.add('hidden'));

  // ---- Draw rails ----
  function drawLine(line){
    const path = document.createElementNS('http://www.w3.org/2000/svg','polyline');
    path.setAttribute('class', `rail ${line.css}`);
    path.setAttribute('points', line.path.map(p=>p.join(',')).join(' '));
    path.dataset.line = line.id;
    svg.appendChild(path);
  }

  // ---- Draw stations ----
  function drawStation(st){
    const g = document.createElementNS('http://www.w3.org/2000/svg','g');
    g.setAttribute('class', 'station');
    g.dataset.id = st.id;
    g.dataset.line = st.line;

    const [x,y] = st.at;
    const c = document.createElementNS('http://www.w3.org/2000/svg','circle');
    c.setAttribute('cx', x); c.setAttribute('cy', y);
    c.setAttribute('r', 8);
    c.setAttribute('class', `node ${LINES.find(l=>l.id===st.line).css}`);
    g.appendChild(c);

    const label = document.createElementNS('http://www.w3.org/2000/svg','text');
    label.setAttribute('x', x + 12); label.setAttribute('y', y + 4);
    label.setAttribute('class','label');
    label.textContent = st.title.replace(' — ',' – ');
    g.appendChild(label);

    g.addEventListener('mouseenter', ()=>{
      if (!svg || !tooltip) return;
      tooltip.textContent = st.sub || st.title;
      tooltip.style.left = (x * (svg.clientWidth/1200)) + 'px';
      tooltip.style.top  = (y * (svg.clientHeight/800)) + 'px';
      tooltip.classList.remove('hidden');
    });
    g.addEventListener('mouseleave', ()=> tooltip && tooltip.classList.add('hidden'));
    g.addEventListener('click', ()=> openPanel(st));

    svg.appendChild(g);
  }

  function openPanel(st){
    if (!panel) return;
    if (titleEl) titleEl.textContent = st.title;
    if (subEl)   subEl.textContent   = st.sub || '';
    if (bodyEl)  bodyEl.textContent  = st.body || '';
    if (bulletsEl) bulletsEl.innerHTML = (st.bullets || []).map(b=>`<li>${b}</li>`).join('');
    if (tagsEl)    tagsEl.innerHTML    = (st.tags || []).map(t=>`<span class="tag">${t}</span>`).join('');
    if (linksEl)   linksEl.innerHTML   = (st.links || []).map(l=>`<a href="${l.href}" target="_blank" rel="noreferrer">${l.label}</a>`).join('');
    panel.classList.remove('hidden');
    panel.scrollTop = 0;
  }

  // ---- Filters ----
  document.querySelectorAll('.legend input[type="checkbox"]').forEach(cb=>{
    cb.addEventListener('change', ()=>{
      const line = cb.getAttribute('data-line');
      const on = cb.checked;
      // rails
      svg.querySelectorAll(`.rail.${LINES.find(l=>l.id===line).css}`).forEach(el=>{
        el.style.display = on ? '' : 'none';
      });
      // stations
      svg.querySelectorAll(`.station[data-line="${line}"]`).forEach(el=>{
        el.style.display = on ? '' : 'none';
      });
    });
  });

  // ---- Search ----
  on(searchEl, 'keydown', (e)=>{
    if (e.key === 'Enter'){
      const q = searchEl.value.trim().toLowerCase();
      if (!q) return;
      const hit = STATIONS.find(s =>
        s.title.toLowerCase().includes(q) ||
        (s.sub||'').toLowerCase().includes(q) ||
        (s.body||'').toLowerCase().includes(q) ||
        (s.tags||[]).some(t=>t.toLowerCase().includes(q))
      );
      if (hit) openPanel(hit);
    }
  });

  // ---- Text / Print View ----
  on(textViewBtn, 'click', ()=>{
    if (!printable || !printContent) return;
    if (!printable.classList.contains('hidden')) { // hide
      printable.classList.add('hidden');
      return;
    }
    printContent.innerHTML = '';
    const sections = [
      { title:'Experience', ids:['pzs','here','suny','samsung'] },
      { title:'Projects', ids:['proj_mri','proj_bert','proj_rag'] },
      { title:'Education', ids:['edu_suny','edu_vit'] },
      { title:'Publications & Patents', ids:['pub_main','pub_submit','patents'] },
      { title:'Skills', ids:['skill_lang','skill_cv','skill_ml','skill_models','skill_ops'] },
      { title:'Contact', ids:['contact'] }
    ];
    for (const sec of sections){
      const wrap = document.createElement('section');
      const h = document.createElement('h2'); h.textContent = sec.title; wrap.appendChild(h);
      for (const id of sec.ids){
        const s = STATIONS.find(x=>x.id===id); if (!s) continue;
        const h3 = document.createElement('h3'); h3.textContent = s.title; wrap.appendChild(h3);
        if (s.sub){ const p = document.createElement('p'); p.className='muted'; p.textContent = s.sub; wrap.appendChild(p); }
        if (s.body){ const p = document.createElement('p'); p.textContent = s.body; wrap.appendChild(p); }
        if (s.bullets?.length){ const ul = document.createElement('ul'); s.bullets.forEach(b=>{ const li=document.createElement('li'); li.textContent=b; ul.appendChild(li); }); wrap.appendChild(ul); }
        if (s.tags?.length){ const p=document.createElement('p'); p.className='muted'; p.textContent='Tags: '+s.tags.join(', '); wrap.appendChild(p); }
        if (s.links?.length){ const p=document.createElement('p'); p.innerHTML=s.links.map(l=>`<a href="${l.href}" target="_blank">${l.label}</a>`).join(' · '); wrap.appendChild(p); }
      }
      printContent.appendChild(wrap);
    }
    printable.classList.remove('hidden');
  });

  // click outside print to close
  on(printable, 'click', (e)=>{ if (e.target === printable) printable.classList.add('hidden'); });

  // ---- Init ----
  function drawAll(){
    if (!svg) return;
    LINES.forEach(drawLine);
    STATIONS.forEach(drawStation);
  }
  drawAll();
});
