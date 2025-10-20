/* Minimalist Resume RPG — vanilla Canvas
 * Rooms: Experience, Projects, Skills, Education, Publications, Patents, Contact
 * Interactions read from resume.json (same folder). No external libs.
 */

const CANVAS = document.getElementById('game');
const CTX = CANVAS.getContext('2d');
const HUD = document.getElementById('hud');
const TIP = document.getElementById('tooltip');
const YEAR = document.getElementById('year');
const HELP = document.getElementById('help');
const FAST = document.getElementById('fasttravel');
const FT_LIST = document.getElementById('ft-list');

YEAR.textContent = new Date().getFullYear();

let data = null; // resume.json
let reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let theme = (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

const STATE = {
  rooms: [],
  npcs: [],
  player: { x: 120, y: 120, w: 16, h: 16, vx: 0, vy: 0, speed: 2.1, facing:'down' },
  keys: {},
  dialog: null,
  visited: new Set(JSON.parse(localStorage.getItem('resume-rpg-visited')||'[]')),
  lastSay: 0,
  paletteOpen: false,
};

const COLORS = {
  grid: '#e5e7eb', gridDark:'#1f2937',
  ink: '#0f172a', inkDark:'#e5e7eb',
  soft: '#9aa5b1', softDark:'#9aa5b1',
  room: '#11182710',
  acc1: '#6366f1', acc2:'#22d3ee'
};

const ROOM_W = 300, ROOM_H = 180, GAP = 20;
const WORLD = { w: 960, h: 600, padding: 20 };

// Simple RNG for subtle jitter
const rand = (min, max) => Math.random()*(max-min)+min;

// --- Load data ---
(async function init(){
  try{
    const res = await fetch('resume.json', {cache:'no-store'});
    data = await res.json();
  }catch(e){
    // Fallback stub if resume.json missing
    data = {
      name: "Tridev Methuku",
      title: "AI/ML Engineer & Researcher",
      location: "Buffalo, NY",
      experience: [{ company:"HERE Technologies", role:"Research Engineer Intern", date_range:"May–Aug 2025", location:"Chicago, IL",
        highlights:[ "Lane-level analytics for last-meter navigation (+12% route accuracy)", "Multi-LLM + multimodal guidance", "AWS + Docker pipeline (10k+/day)"]
      }],
      projects:[{name:"GAN MRI", description:"FID 15.2 (PyTorch + SageMaker)"}],
      skills:{ Languages:["Python","C++","SQL"], "ML/DL":["PyTorch","TensorFlow"], "LLM/Agents":["RAG","LangChain","MCP"] },
      education:[{school:"SUNY Buffalo", degree:"M.S. CS (AI/ML)", date_range:"2024—present"}],
      publications:[], patents:[]
    };
  }
  buildWorldFromData(data);
  makeFastTravel();
  renderListView(); // accessible
  loop();
})();

// --- Build rooms/NPCs from resume.json ---
function buildWorldFromData(d){
  // Layout grid of rooms (2 rows x N)
  const sections = [
    { id:'experience', title:'Experience' },
    { id:'projects', title:'Projects' },
    { id:'skills', title:'Skills' },
    { id:'education', title:'Education' },
    { id:'publications', title:'Publications' },
    { id:'patents', title:'Patents' },
    { id:'contact', title:'Contact' }
  ];
  const marginLeft = WORLD.padding, marginTop = WORLD.padding + 20;
  let x = marginLeft, y = marginTop, cols = 3, col=0;

  STATE.rooms.length = 0; STATE.npcs.length = 0;

  for(const sec of sections){
    STATE.rooms.push({
      id: sec.id, title: sec.title, x, y, w: ROOM_W, h: ROOM_H
    });
    x += ROOM_W + GAP; col++;
    if (col===cols){ col=0; x=marginLeft; y += ROOM_H + GAP; }
  }

  // NPCs per section
  const r = (id) => STATE.rooms.find(r => r.id===id);
  // Experience
  (d.experience||[]).forEach((job,i)=>{
    addNPC({ room:r('experience'), label:`${job.role} @ ${job.company}`, lines:[
      job.date_range + (job.location ? ` • ${job.location}` : ''),
      ...(job.highlights?.map(h => typeof h==='string'? h : h.text) || []).slice(0,4)
    ]});
  });
  // Projects
  (d.projects||[]).forEach((p,i)=>{
    addNPC({ room:r('projects'), label:p.name, lines:[
      p.description || '', ...(p.metrics||[]).slice(0,2),
      ...(p.highlights?.map(h => typeof h==='string'? h : h.text) || []).slice(0,2)
    ]});
  });
  // Skills — terminal instead of human
  addNPC({ room:r('skills'), label:'Terminal: Skills', isTerminal:true, lines: Object.entries(d.skills||{}).map(([k,v]) => `${k}: ${v.join(', ')}`) });
  // Education
  (d.education||[]).forEach(e => addNPC({ room:r('education'), label:e.school, lines:[ `${e.degree||''} • ${e.date_range||''}`, e.location||'', e.details||'' ]}));
  // Publications
  (d.publications||[]).forEach(p => addNPC({ room:r('publications'), label:`${p.venue} ${p.year}`, lines:[ p.title || '', p.status ? `Status: ${p.status}` : '' ]}));
  // Patents
  (d.patents||[]).forEach(p => addNPC({ room:r('patents'), label:p.title, lines:[ p.status ? `Status: ${p.status}` : '' ]}));
  // Contact
  addNPC({ room:r('contact'), label:`Contact`, lines:[
    d.name, d.title, d.location||'',
    (d.contact?.email)||'tridevmethuku.0@gmail.com',
    (d.contact?.linkedin)||'',
    (d.contact?.github)||''
  ]});

  HUD.textContent = `${d.name} — ${d.title}`;
  TIP.textContent = `Explore the rooms. Press E near a person/terminal. ${STATE.visited.size? `Visited: ${STATE.visited.size}`:''}`;
}

function addNPC({room, label, lines, isTerminal=false}){
  if(!room) return;
  const pad = 24;
  const nx = room.x + pad + Math.floor(Math.random()*(room.w - pad*2));
  const ny = room.y + pad + Math.floor(Math.random()*(room.h - pad*2));
  STATE.npcs.push({ x:nx, y:ny, w:16, h:16, label, lines, isTerminal, id: slug(label) });
}

function slug(s){ return String(s||'').toLowerCase().replace(/[^\w]+/g,'-'); }

// --- Draw ---
function draw(){
  // Clear
  CTX.clearRect(0,0,CANVAS.width,CANVAS.height);
  // Grid / background
  drawBackdrop();

  // Rooms
  for(const room of STATE.rooms){
    drawRoom(room);
  }

  // NPCs
  for(const n of STATE.npcs){
    drawNPC(n);
  }

  // Player
  drawPlayer();
  // Dialog
  if (STATE.dialog) drawDialog(STATE.dialog);
}

function drawBackdrop(){
  const grid = (theme==='dark')? COLORS.gridDark : COLORS.grid;
  CTX.save();
  CTX.fillStyle = (theme==='dark')? '#0b1020' : '#ffffff';
  CTX.fillRect(0,0,CANVAS.width,CANVAS.height);
  CTX.strokeStyle = grid;
  CTX.lineWidth = 1;
  const step = 30;
  CTX.beginPath();
  for(let x=0; x<=CANVAS.width; x+=step){ CTX.moveTo(x,0); CTX.lineTo(x,CANVAS.height); }
  for(let y=0; y<=CANVAS.height; y+=step){ CTX.moveTo(0,y); CTX.lineTo(CANVAS.width,y); }
  CTX.stroke();
  CTX.restore();
}

function drawRoom(rm){
  CTX.save();
  CTX.strokeStyle = (theme==='dark')? '#2a3550' : '#dbe3f1';
  CTX.fillStyle = (theme==='dark')? 'rgba(99,102,241,0.06)' : 'rgba(17,24,39,0.03)';
  CTX.lineWidth = 2;
  roundRect(CTX, rm.x, rm.y, rm.w, rm.h, 12);
  CTX.fill(); CTX.stroke();

  // Title (thin mono line)
  CTX.font = '600 12px JetBrains Mono, monospace';
  CTX.fillStyle = (theme==='dark')? '#e5e7eb' : '#0f172a';
  CTX.fillText(rm.title, rm.x + 12, rm.y + 18);
  CTX.restore();
}

function drawNPC(n){
  CTX.save();
  // Node as minimalist dot + label line
  CTX.fillStyle = gradientAccent(n.x, n.y);
  CTX.beginPath();
  CTX.arc(n.x, n.y, 6, 0, Math.PI*2);
  CTX.fill();

  // Label “floating”
  CTX.font = '600 11px Inter, system-ui, sans-serif';
  CTX.fillStyle = (theme==='dark')? '#cbd5e1' : '#334155';
  CTX.fillText(n.label, n.x + 10, n.y + 4);

  // Completion halo if visited
  if (STATE.visited.has(n.id)){
    CTX.strokeStyle = (theme==='dark')? '#84cc16' : '#16a34a';
    CTX.lineWidth = 1.5;
    CTX.beginPath(); CTX.arc(n.x, n.y, 9, 0, Math.PI*2); CTX.stroke();
  }
  CTX.restore();
}

function drawPlayer(){
  const p = STATE.player;
  CTX.save();
  // Chic player: outlined square
  CTX.strokeStyle = (theme==='dark')? '#e5e7eb' : '#0f172a';
  CTX.lineWidth = 2;
  CTX.strokeRect(p.x-8, p.y-8, 16, 16);
  // direction hint
  CTX.beginPath();
  CTX.moveTo(p.x, p.y);
  const d = {up:[0,-10], down:[0,10], left:[-10,0], right:[10,0]}[p.facing];
  CTX.lineTo(p.x + d[0], p.y + d[1]);
  CTX.stroke();
  CTX.restore();
}

function gradientAccent(x,y){
  const g = CTX.createRadialGradient(x,y,0,x,y,20);
  g.addColorStop(0, (theme==='dark')? '#6366f1' : '#111827');
  g.addColorStop(1, (theme==='dark')? 'rgba(99,102,241,0.0)' : 'rgba(17,24,39,0.0)');
  return g;
}

function drawDialog(d){
  const w = Math.min(820, CANVAS.width - 40), h = 150;
  const x = (CANVAS.width - w)/2, y = CANVAS.height - h - 16;
  CTX.save();
  // Panel
  CTX.fillStyle = (theme==='dark')? 'rgba(15,23,42,0.9)' : 'rgba(255,255,255,0.95)';
  CTX.strokeStyle = (theme==='dark')? '#334155' : '#e2e8f0';
  CTX.lineWidth = 1.5;
  roundRect(CTX, x, y, w, h, 12); CTX.fill(); CTX.stroke();

  CTX.font = '700 14px Inter, system-ui, sans-serif';
  CTX.fillStyle = (theme==='dark')? '#e5e7eb' : '#0f172a';
  CTX.fillText(d.title, x+14, y+24);

  CTX.font = '12px Inter, system-ui, sans-serif';
  CTX.fillStyle = (theme==='dark')? '#cbd5e1' : '#334155';

  const lines = wrapLines(d.text.join(' • '), w-28, CTX);
  let oy = y+46;
  for (const line of lines.slice(0,4)){
    CTX.fillText(line, x+14, oy); oy += 18;
  }

  CTX.font = '600 11px JetBrains Mono, monospace';
  CTX.fillStyle = (theme==='dark')? '#93c5fd' : '#2563eb';
  CTX.fillText('Enter/Space: Next • Esc: Close', x+w-230, y+h-12);

  CTX.restore();
}

// Rounded rect helper
function roundRect(ctx, x, y, w, h, r){
  const rr = Math.min(r, w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x+rr, y);
  ctx.arcTo(x+w, y, x+w, y+h, rr);
  ctx.arcTo(x+w, y+h, x, y+h, rr);
  ctx.arcTo(x, y+h, x, y, rr);
  ctx.arcTo(x, y, x+w, y, rr);
  ctx.closePath();
}

function wrapLines(text, maxW, ctx){
  const words = text.split(/\s+/);
  let line = '', lines = [];
  for(const w of words){
    const test = (line? line+' ' : '') + w;
    if (ctx.measureText(test).width > maxW){ lines.push(line); line = w; } else { line = test; }
  }
  if (line) lines.push(line);
  return lines;
}

// --- Game loop ---
let last = 0;
function loop(ts=0){
  const dt = Math.min(32, ts - last); last = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

function update(dt){
  const p = STATE.player;
  // movement
  const k = STATE.keys;
  let ax=0, ay=0;
  if (k['ArrowUp']||k['KeyW']) ay = -1;
  if (k['ArrowDown']||k['KeyS']) ay = 1;
  if (k['ArrowLeft']||k['KeyA']) ax = -1;
  if (k['ArrowRight']||k['KeyD']) ax = 1;

  if (ax || ay){
    const mag = Math.hypot(ax, ay) || 1;
    p.vx = (ax/mag) * p.speed;
    p.vy = (ay/mag) * p.speed;
    if (Math.abs(ax)>Math.abs(ay)) p.facing = ax>0 ? 'right' : 'left';
    else p.facing = ay>0 ? 'down' : 'up';
  } else { p.vx = p.vy = 0; }

  // update position with simple bounds + room walls
  const nx = clamp(p.x + p.vx, WORLD.padding, CANVAS.width - WORLD.padding);
  const ny = clamp(p.y + p.vy, WORLD.padding+10, CANVAS.height - WORLD.padding-10);

  // avoid leaving rooms area? keep free but prevent clipping into room frames (optional)
  p.x = nx; p.y = ny;
}

function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

// --- Interaction ---
document.addEventListener('keydown', (e)=>{
  // palette
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase()==='k'){ e.preventDefault(); openPalette(); return; }
  if (STATE.paletteOpen){
    handlePaletteKeys(e); return;
  }
  if (e.key === 'Escape'){ closeDialogs(); }

  STATE.keys[e.code] = true;
  if (e.code === 'Space' || e.code === 'KeyE'){ interact(); }
  if (e.code === 'KeyF'){ openFastTravel(); }
});
document.addEventListener('keyup', (e)=>{ STATE.keys[e.code] = false; });

function closeDialogs(){
  STATE.dialog = null;
  if (HELP.open) HELP.close();
  if (FAST.open) FAST.close();
  if (!PALETTE.hidden) hidePalette();
}

function interact(){
  const near = nearestNPC();
  if (!near) return;
  const key = near.id;
  STATE.visited.add(key);
  localStorage.setItem('resume-rpg-visited', JSON.stringify([...STATE.visited]));
  const d = { title: near.label, text: near.lines.filter(Boolean) };
  STATE.dialog = d;
}

function nearestNPC(){
  const p = STATE.player;
  const range = 28;
  let best = null, bestD = Infinity;
  for(const n of STATE.npcs){
    const d = Math.hypot(p.x - n.x, p.y - n.y);
    if (d < range && d < bestD){ best = n; bestD = d; }
  }
  TIP.textContent = best ? `Interact with ${best.label} (E)` : 'Walk around. Press F to fast travel.';
  return best;
}

// --- Fast travel ---
function openFastTravel(){
  FT_LIST.innerHTML = '';
  for(const room of STATE.rooms){
    const btn = document.createElement('button');
    btn.textContent = room.title;
    btn.addEventListener('click', ()=>{ // place player center of room
      STATE.player.x = room.x + room.w/2;
      STATE.player.y = room.y + room.h/2;
      FAST.close();
    });
    FT_LIST.appendChild(btn);
  }
  FAST.showModal();
}

// --- Theming / controls ---
document.getElementById('btn-theme').addEventListener('click', ()=>{
  theme = (theme==='dark')? 'light' : 'dark';
});
document.getElementById('btn-a11y').addEventListener('click', (e)=>{
  reducedMotion = !reducedMotion;
  e.currentTarget.setAttribute('aria-pressed', String(reducedMotion));
});
document.getElementById('btn-help').addEventListener('click', ()=> HELP.showModal());

const LIST = document.getElementById('listview');
const BTN_VIEW = document.getElementById('btn-view');
BTN_VIEW.addEventListener('click', ()=>{
  const show = LIST.hasAttribute('hidden');
  LIST.toggleAttribute('hidden', !show); // if hidden, show; else hide
  BTN_VIEW.setAttribute('aria-pressed', String(show));
  if (show) document.getElementById('lv-content').focus();
});

// --- Accessible List View render ---
function renderListView(){
  const c = document.getElementById('lv-content');
  const d = data;
  const fmt = (s) => (s && s.length) ? s : '';
  let html = '';
  html += `<h1>${d.name}</h1><p class="lv-meta">${d.title} — ${fmt(d.location)}</p>`;

  // Experience
  html += `<h2>Experience</h2>`;
  html += (d.experience||[]).map(j=>`
    <section>
      <h3>${j.role} @ ${j.company}</h3>
      <p class="lv-meta">${j.date_range || ''} • ${j.location || ''}</p>
      <ul>${(j.highlights||[]).map(h=>`<li>${typeof h==='string'? h : h.text}</li>`).join('')}</ul>
    </section>`).join('');

  // Projects
  html += `<h2>Projects</h2>`;
  html += (d.projects||[]).map(p=>`
    <section>
      <h3>${p.name}</h3>
      <p class="lv-meta">${p.description||''} ${(p.metrics||[]).join(' • ')}</p>
      ${(p.highlights&&p.highlights.length)? `<ul>${p.highlights.map(h=>`<li>${typeof h==='string'? h : h.text}</li>`).join('')}</ul>`:''}
    </section>`).join('');

  // Skills
  html += `<h2>Skills</h2>`;
  html += `<ul>${Object.entries(d.skills||{}).map(([k,v])=>`<li><strong>${k}:</strong> ${v.join(', ')}</li>`).join('')}</ul>`;

  // Education
  html += `<h2>Education</h2>`;
  html += (d.education||[]).map(e=>`
    <section>
      <h3>${e.school}</h3>
      <p class="lv-meta">${e.degree||''} — ${e.date_range||''} ${e.location? '• '+e.location : ''}</p>
      ${e.details? `<p>${e.details}</p>`:''}
    </section>`).join('');

  if (d.publications?.length){
    html += `<h2>Publications</h2>` + d.publications.map(p=>`<p><strong>${p.venue} ${p.year}:</strong> ${p.title} ${p.status? `(${p.status})`:''}</p>`).join('');
  }
  if (d.patents?.length){
    html += `<h2>Patents</h2>` + d.patents.map(p=>`<p>${p.title} ${p.status? `(${p.status})`:''}</p>`).join('');
  }
  c.innerHTML = html;
}

// --- Command palette (Ctrl/Cmd+K) ---
const PALETTE = document.getElementById('palette');
const PINPUT = document.getElementById('pinput');
const PLIST = document.getElementById('plist');

function openPalette(){
  STATE.paletteOpen = true;
  PALETTE.hidden = false;
  PINPUT.value = '';
  PLIST.innerHTML = '';
  PINPUT.focus();
  buildIndex();
}
function hidePalette(){ STATE.paletteOpen=false; PALETTE.hidden = true; }

document.addEventListener('click', (e)=>{ if (e.target===PALETTE) hidePalette(); });

let INDEX = [];
function buildIndex(){
  if (!data) return;
  INDEX.length = 0;
  const push = (title, sub, roomId) => INDEX.push({ title, sub, roomId });
  (data.experience||[]).forEach(j=> push(`${j.role} @ ${j.company}`, j.location || j.date_range || '', 'experience'));
  (data.projects||[]).forEach(p=> push(p.name, p.description || '', 'projects'));
  Object.entries(data.skills||{}).forEach(([k,arr])=> arr.forEach(s=> push(s, k, 'skills')));
  (data.education||[]).forEach(e=> push(e.school, e.degree || '', 'education'));
}

PINPUT.addEventListener('input', ()=>{
  const q = PINPUT.value.trim().toLowerCase();
  PLIST.innerHTML = '';
  if (!q) return;
  const res = INDEX
    .map(item => ({...item, score: score(item, q)}))
    .filter(i => i.score > 0)
    .sort((a,b)=> b.score - a.score)
    .slice(0,12);

  for(const [i,r] of res.entries()){
    const li = document.createElement('li');
    li.setAttribute('aria-selected', String(i===0));
    li.innerHTML = `<div><strong>${escapeHtml(r.title)}</strong><br><span class="lv-meta">${escapeHtml(r.sub)}</span></div><span>${r.roomId}</span>`;
    li.addEventListener('click', ()=> { jumpToRoom(r.roomId); hidePalette(); });
    PLIST.appendChild(li);
  }
});

function handlePaletteKeys(e){
  const items = [...PLIST.querySelectorAll('li')];
  if (!items.length) { if (e.key==='Escape') hidePalette(); return; }
  let idx = items.findIndex(li => li.getAttribute('aria-selected')==='true');
  if (e.key==='ArrowDown'){ e.preventDefault(); idx = Math.min(items.length-1, idx+1); }
  if (e.key==='ArrowUp'){ e.preventDefault(); idx = Math.max(0, idx-1); }
  if (e.key==='Enter'){ e.preventDefault(); items[idx]?.click(); }
  items.forEach(li=>li.setAttribute('aria-selected','false'));
  if (idx>=0) items[idx].setAttribute('aria-selected','true');
  if (e.key==='Escape'){ hidePalette(); }
}

function score(item, q){
  const hay = (item.title + ' ' + item.sub).toLowerCase();
  const terms = q.split(/\s+/).filter(Boolean);
  let s = 0;
  for(const t of terms){
    const i = hay.indexOf(t);
    if (i === -1) return 0;
    s += 100 - i;
  }
  return s;
}

function jumpToRoom(roomId){
  const room = STATE.rooms.find(r=>r.id===roomId);
  if (!room) return;
  STATE.player.x = room.x + room.w/2;
  STATE.player.y = room.y + room.h/2;
}

// --- Utilities ---
function escapeHtml(s){ return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

// --- Topbar buttons ---
document.getElementById('btn-fast').addEventListener('click', openFastTravel);

// Keep HUD tidy
setInterval(()=> {
  TIP.textContent = `Visited: ${STATE.visited.size}`;
}, 4000);

// --- Responsive: scale canvas (CSS handles width). Maintain crisp lines by 1px align.
window.addEventListener('resize', ()=>{ /* canvas scales via CSS; drawing stays native */ });

// ---- END ----
