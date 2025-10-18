/* V2: zoom/pan, pin, focus mode, convex hulls, deep links, export PNG */
const svg = d3.select("#skillTree");
const toast = document.getElementById("toast");
const detail = document.getElementById("detail");
const detailTitle = document.getElementById("detail-title");
const detailBody = document.getElementById("detail-body");
const closeDetail = document.getElementById("closeDetail");
const searchInput = document.getElementById("search");
const yearSpan = document.getElementById("year");
yearSpan.textContent = new Date().getFullYear();

let reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
document.getElementById("a11yToggle").addEventListener("click", e => {
  e.preventDefault();
  reduceMotion = !reduceMotion;
  notify(reduceMotion ? "Reduced motion: on" : "Reduced motion: off");
});
document.getElementById("printBtn").addEventListener("click", () => window.print());

/* Theme */
const themeToggle = document.getElementById("themeToggle");
const storedTheme = localStorage.getItem("theme");
if (storedTheme) document.documentElement.setAttribute("data-theme", storedTheme);
themeToggle.addEventListener("click", () => {
  const t = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", t);
  localStorage.setItem("theme", t);
});

/* World groups (for zoom) */
const gWorld = svg.append("g").attr("class", "world");
const gHulls = gWorld.append("g").attr("class", "hulls");
const gLinks = gWorld.append("g").attr("class", "links");
const gNodes = gWorld.append("g").attr("class", "nodes");

/* Responsive viewBox */
const WIDTH = () => svg.node().clientWidth || 900;
const HEIGHT = () => svg.node().clientHeight || 600;
function setViewBox(){ svg.attr("viewBox", [0, 0, WIDTH(), HEIGHT()]); }
window.addEventListener("resize", setViewBox); setViewBox();

/* Zoom & pan */
const zoom = d3.zoom().scaleExtent([0.45, 2.6]).on("zoom", (ev) => {
  gWorld.attr("transform", ev.transform);
  // scale labels slightly to maintain readability
  const k = ev.transform.k;
  gNodes.selectAll("text.label").style("font-size", d => {
    const base = ({ root: 16, domain: 14, skill: 11, project: 12, experience: 12, edu: 11, pub: 10, pat: 10 }[d.type]);
    return `${(base / Math.sqrt(k)).toFixed(2)}px`;
  });
});
svg.call(zoom).on("dblclick.zoom", null);

document.getElementById("resetBtn").addEventListener("click", () =>
  svg.transition().duration(reduceMotion ? 0 : 400).call(zoom.transform, d3.zoomIdentity)
);

/* Export PNG */
document.getElementById("exportBtn").addEventListener("click", exportPNG);
async function exportPNG(){
  const serializer = new XMLSerializer();
  const svgNode = svg.node().cloneNode(true);
  // inline declared width/height for canvas export
  svgNode.setAttribute("width", WIDTH());
  svgNode.setAttribute("height", HEIGHT());
  const svgString = serializer.serializeToString(svgNode);
  const blob = new Blob([svgString], {type: "image/svg+xml;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.onload = function(){
    const canvas = document.createElement("canvas");
    canvas.width = WIDTH(); canvas.height = HEIGHT();
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--panel").trim() || "#0f1117";
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);
    canvas.toBlob(b => {
      const a = document.createElement("a");
      a.download = "tridev-skilltree.png";
      a.href = URL.createObjectURL(b);
      a.click();
    });
  };
  img.src = url;
}

/* Gradients */
const defs = svg.append("defs");
function mkGrad(id, c1, c2){
  const g = defs.append("linearGradient").attr("id", id).attr("x1","0%").attr("y1","0%").attr("x2","100%").attr("y2","100%");
  g.append("stop").attr("offset","0%").attr("stop-color", c1);
  g.append("stop").attr("offset","100%").attr("stop-color", c2);
}
mkGrad("gradRoot", "#93a7ff", "#32d4ff");
mkGrad("gradDom", "#9ad0ff", "#93a7ff");
mkGrad("gradSkill", "#9fe0ff", "#b8f7d0");
mkGrad("gradProj", "#ffe9a8", "#ffd166");
mkGrad("gradExp", "#ffb3b6", "#ffcf9b");
mkGrad("gradEdu", "#fceca1", "#aaf0c2");
mkGrad("gradPub", "#e9d5ff", "#9ac4ff");
mkGrad("gradPat", "#ffd2e0", "#b9c3ff");

const linkGrad = defs.append("linearGradient").attr("id","linkGrad").attr("x1","0%").attr("y1","0%").attr("x2","100%").attr("y2","0%");
linkGrad.append("stop").attr("offset","0%").attr("stop-color","#93a7ff");
linkGrad.append("stop").attr("offset","100%").attr("stop-color","#32d4ff");

/* Controls: lenses & focus */
const LENSES = {
  all: { tags: [] },
  ml: { tags: ["ml", "dl", "pytorch", "tensorflow", "bert", "gnn", "gan", "nlp"] },
  cv: { tags: ["cv", "opencv", "yolo", "ssd", "hdr", "gate", "root", "imaging"] },
  agents: { tags: ["rag", "agents", "langchain", "mcp", "pinecone", "faiss", "rerank", "redis", "fastapi"] },
  backend: { tags: ["aws", "docker", "fastapi", "redis", "sql", "airflow", "mlflow", "kubernetes"] },
  lead: { tags: ["lead", "team", "collab", "funding"] }
};
let focusMode = false;
const focusBtn = document.getElementById("focusBtn");
focusBtn.addEventListener("click", () => {
  focusMode = !focusMode;
  focusBtn.setAttribute("aria-pressed", String(focusMode));
  updateFocus();
});
let currentLens = "all";
document.querySelectorAll(".lens").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".lens").forEach(b => b.setAttribute("aria-pressed", "false"));
    btn.setAttribute("aria-pressed", "true");
    currentLens = btn.dataset.lens;
    updateLens();
    writeURLState();
  });
});

/* State */
let sim, nodes=[], links=[];
let selectedId = null;

/* Load data and boot */
fetch("./data/resume.json")
  .then(r => r.json())
  .then(data => {
    buildGraph(data);
    applyURLState();            // deep link
    setSelection(selectedId || "me");
    updateLensCounts();         // show counts on lens pills
    notify("Drag to pin • P: pin, F: focus • ←/→ to traverse");
  })
  .catch(err => { console.error(err); notify("Failed to load resume.json"); });

/* Build graph from data */
function buildGraph(data){
  pushNode({ id:"me", label:data.person.name, type:"root", level:0, url:data.person.linkedin, meta:data.person.tagline });

  const domains = Object.keys(data.skills);
  domains.forEach(dom => {
    const domId = `dom:${slug(dom)}`;
    pushNode({ id: domId, label: dom, type: "domain", level: 1, domain: domId });
    pushLink("me", domId);
    data.skills[dom].forEach(skill => {
      const sid = `skill:${slug(skill)}`;
      pushNode({ id: sid, label: skill, type: "skill", level: 2, domain: domId, tags: [skillTag(skill), domTag(dom)] });
      pushLink(domId, sid);
    });
  });

  const attachTagged = (item, baseType) => {
    const id = `${baseType}:${slug(item.title || item.company)}`;
    const meta = [item.role, item.location, range(item.start, item.end)].filter(Boolean).join(" • ");
    pushNode({ id, label: item.title || item.company, type: baseType, level: 3, domain: null, tags: (item.tags||[]).map(skillTag), data:item, meta });

    (item.tags || []).forEach(t => {
      const sid = `skill:${slug(t)}`;
      if (byId(sid)) pushLink(sid, id);
    });
    if (!(item.tags||[]).length) pushLink(`dom:${slug("MLOps/Infra")}`, id);
  };

  data.experience.forEach(exp => attachTagged({ ...exp, title: exp.company }, "experience"));
  data.projects.forEach(p => attachTagged(p, "project"));
  data.education.forEach(ed => {
    const id = `edu:${slug(ed.school)}`;
    pushNode({ id, label: ed.school, type:"edu", level:3, data:ed, meta:`${ed.degree} • GPA ${ed.gpa}` });
    pushLink("me", id);
  });
  data.publications.forEach(pub => {
    const id=`pub:${slug(pub.title)}`;
    pushNode({ id, label: pub.venue || "Publication", type:"pub", level:4, data:pub, tags:(pub.tags||[]).map(skillTag) });
    const attach=(pub.tags||[]).map(t=>`skill:${slug(t)}`).filter(byId);
    if(attach.length) attach.forEach(sid=>pushLink(sid,id)); else pushLink("me", id);
  });
  data.patents.forEach(p=>{
    const id=`pat:${slug(p.title)}`;
    pushNode({ id, label:"Patent", type:"pat", level:4, data:p, tags:(p.tags||[]).map(skillTag) });
    const attach=(p.tags||[]).map(t=>`skill:${slug(t)}`).filter(byId);
    if(attach.length) attach.forEach(sid=>pushLink(sid,id)); else pushLink("me", id);
  });

  draw();
}

/* Draw/Sim */
function draw(){
  const xScale = d3.scalePoint().domain([0,1,2,3,4]).range([90, WIDTH()-90]);
  const nodeRadius = n => ({ root:32, domain:22, skill:14, project:16, experience:18, edu:14, pub:12, pat:12 }[n.type] || 12);
  const fillByType = {
    root:"url(#gradRoot)", domain:"url(#gradDom)", skill:"url(#gradSkill)",
    project:"url(#gradProj)", experience:"url(#gradExp)", edu:"url(#gradEdu)",
    pub:"url(#gradPub)", pat:"url(#gradPat)"
  };

  sim = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(links).id(d=>d.id).distance(l => 70 + 8 * (l.target.level || 0)).strength(.15))
    .force("charge", d3.forceManyBody().strength(-220))
    .force("collide", d3.forceCollide().radius(d=>nodeRadius(d)+6).iterations(2))
    .force("x", d3.forceX().x(d=>xScale(d.level)).strength(.3))
    .force("y", d3.forceY().y(()=>HEIGHT()/2).strength(.06))
    .alpha(1).alphaDecay(reduceMotion ? 0.15 : 0.03);

  const link = gLinks.selectAll("line").data(links).join("line").attr("class","link").attr("stroke-width",1.5);

  const drag = d3.drag()
    .on("start", (ev, d) => {
      if (!ev.active) sim.alphaTarget(.2).restart();
      d.fx = d.x; d.fy = d.y; d.pinned = true;
      updatePinIndicator(d);
    })
    .on("drag", (ev,d) => { d.fx = ev.x; d.fy = ev.y; })
    .on("end", (ev,d) => { if (!ev.active) sim.alphaTarget(0); });

  const node = gNodes.selectAll("g.node").data(nodes, d=>d.id).join(enter => {
    const g = enter.append("g").attr("class","node").attr("tabindex",0).call(drag);
    g.append("title").text(d => `${d.label}`);
    g.append("circle").attr("r", d=>nodeRadius(d)).attr("fill", d=>fillByType[d.type]).attr("stroke","var(--edge)").attr("stroke-width",1.2);
    g.append("text").attr("class","label").attr("text-anchor","middle").attr("dy", d => d.type==="skill" ? "-1.15em" : d.type==="domain" ? "-1.35em" : "-1.0em").text(d=>d.label)
      .style("font-size", d => `${({ root:16, domain:14, skill:11, project:12, experience:12, edu:11, pub:10, pat:10 }[d.type])}px`);
    g.on("click", (_,d)=>{ setSelection(d.id); openDetail(d); writeURLState(); });
    g.on("mouseenter", (_,d)=> setSelection(d.id));
    g.on("focus", (_,d)=> setSelection(d.id));
    return g;
  });

  // convex hulls per domain (domain + its children)
  function hullData(){
    const doms = nodes.filter(n=>n.type==="domain");
    return doms.map(dom => {
      const pts = [dom, ...links.filter(l=>l.source.id===dom.id).map(l=>l.target)]
        .filter(Boolean).map(n => [n.x, n.y]);
      const poly = d3.polygonHull(pts);
      return { id: dom.id, poly };
    }).filter(h => h.poly && h.poly.length > 2);
  }
  let tickCount = 0;

  const hull = gHulls.selectAll("path.hull").data([], d=>d.id).join("path").attr("class","hull");

  sim.on("tick", () => {
    link.attr("x1", d=>d.source.x).attr("y1", d=>d.source.y)
        .attr("x2", d=>d.target.x).attr("y2", d=>d.target.y);
    node.attr("transform", d=>`translate(${d.x},${d.y})`);

    if ((tickCount++ % 3) === 0) {
      const data = hullData();
      const sel = gHulls.selectAll("path.hull").data(data, d=>d.id);
      sel.join(
        enter => enter.append("path").attr("class","hull").attr("d", d => "M"+d.poly.join("L")+"Z"),
        update => update.attr("d", d => "M"+d.poly.join("L")+"Z"),
        exit => exit.remove()
      );
    }
  });

  // hotkeys
  window.addEventListener("keydown", e => {
    if (["INPUT","TEXTAREA"].includes(document.activeElement.tagName)) return;
    const cur = nodes.find(n=>n.id===selectedId); if (!cur) return;

    if (e.key==="ArrowRight"){
      const outs = links.filter(l=>l.source.id===cur.id).map(l=>l.target.id);
      if (outs.length) setSelection(outs[0]);
    } else if (e.key==="ArrowLeft"){
      const ins = links.filter(l=>l.target.id===cur.id).map(l=>l.source.id);
      if (ins.length) setSelection(ins[0]);
    } else if (e.key==="ArrowDown" || e.key==="ArrowUp"){
      const sibs = siblings(cur);
      if (sibs.length){
        const idx = sibs.findIndex(s=>s.id===cur.id);
        const next = e.key==="ArrowDown" ? (idx+1)%sibs.length : (idx-1+sibs.length)%sibs.length;
        setSelection(sibs[next].id);
      }
    } else if (e.key==="Enter"){
      openDetail(cur);
    } else if (e.key.toLowerCase()==="p"){
      cur.pinned = !cur.pinned;
      if (!cur.pinned){ cur.fx = cur.fy = null; }
      else { cur.fx = cur.x; cur.fy = cur.y; }
      updatePinIndicator(cur);
    } else if (e.key.toLowerCase()==="f"){
      focusMode = !focusMode; focusBtn.setAttribute("aria-pressed", String(focusMode)); updateFocus();
    }
    writeURLState();
  });

  notify("Tip: zoom (wheel), pan (drag bg), drag node to pin.");
}

function updatePinIndicator(n){
  const el = gNodes.selectAll("g.node").filter(d => d.id === n.id).select("circle");
  el.attr("stroke", n.pinned ? "var(--ok)" : "var(--edge)").attr("stroke-width", n.pinned ? 2.5 : 1.2);
}

function updateLens(){
  const active = new Set(nodes.filter(n => {
    if (!LENSES[currentLens].tags?.length) return true;
    return (n.tags||[]).some(t => LENSES[currentLens].tags.includes(t));
  }).map(n => n.id));

  // dim everything not in the lens
  const useDim = LENSES[currentLens].tags?.length > 0;
  gNodes.selectAll(".node").classed("dimmed", d => useDim && !active.has(d.id));
  gLinks.selectAll(".link").classed("dimmed", l => useDim && !(active.has(l.source.id) || active.has(l.target.id)));
  notify(`Lens: ${currentLens.toUpperCase()}`);
}

function updateLensCounts(){
  document.querySelectorAll(".lens").forEach(btn => {
    const lens = btn.dataset.lens;
    const tags = LENSES[lens].tags || [];
    const count = tags.length ? nodes.filter(n => (n.tags||[]).some(t => tags.includes(t))).length : nodes.length;
    btn.textContent = `${btn.textContent.split(" (")[0]} (${count})`;
  });
}

function updateFocus(){
  if (!focusMode || !selectedId){
    gNodes.selectAll(".node").classed("dimmed", false);
    gLinks.selectAll(".link").classed("dimmed", false);
    return updateLens(); // re-apply lens dim if any
  }
  const keep = new Set();
  const frontier = [selectedId];
  const steps = 2; // show neighbors up to 2 hops
  for (let s=0; s<=steps; s++){
    const next = [];
    frontier.forEach(id => {
      keep.add(id);
      links.forEach(l => {
        if (l.source.id===id){ keep.add(l.target.id); next.push(l.target.id); }
        if (l.target.id===id){ keep.add(l.source.id); next.push(l.source.id); }
      });
    });
    frontier.length = 0; next.forEach(x => frontier.push(x));
  }
  gNodes.selectAll(".node").classed("dimmed", d => !keep.has(d.id));
  gLinks.selectAll(".link").classed("dimmed", l => !(keep.has(l.source.id) && keep.has(l.target.id)));
}

/* Search filter */
searchInput.addEventListener("input", e => {
  const q = e.target.value.toLowerCase().trim();
  if (!q){ updateLens(); return; }
  const ids = new Set(nodes.filter(n => (n.label||"").toLowerCase().includes(q) || (n.meta||"").toLowerCase().includes(q)).map(n => n.id));
  gNodes.selectAll(".node").classed("dimmed", d => !ids.has(d.id));
  gLinks.selectAll(".link").classed("dimmed", l => !(ids.has(l.source.id) || ids.has(l.target.id)));
});

/* Selection & detail */
closeDetail.addEventListener("click", () => setSelection(null));

function setSelection(id){
  selectedId = id;
  gNodes.selectAll(".node").classed("selected", d => d.id === id);
  gLinks.selectAll(".link").classed("active", l => l.source.id === id || l.target.id === id);
}

function openDetail(n){
  if (!n) return;
  detailTitle.textContent = n.label;
  detailBody.innerHTML = renderDetail(n);
}

function renderDetail(n){
  if (n.type === "root") {
    return `
      <p class="meta">${escapeHTML(n.meta || "Developer • ML/CV • RAG • MLOps")}</p>
      <div class="badges">
        <span class="badge">📍 Buffalo, NY</span>
        <span class="badge">Open to: ML / CV / Applied Research</span>
        <span class="badge">Contact: +1 (716) 750-3488</span>
      </div>
      <p>Use the lenses to filter. <kbd>F</kbd> toggles focus. Drag nodes to pin (green ring).</p>
    `;
  }
  if (n.type === "domain" || n.type === "skill") {
    const related = links.filter(l => l.source.id === n.id).map(l => l.target);
    return `
      <p class="meta">${n.type === "domain" ? "Domain" : "Skill"} • ${related.length} unlocks</p>
      <div class="badges">${(n.tags || []).map(t => `<span class="badge">#${t}</span>`).join("")}</div>
      <h3>Unlocked</h3>
      <ul>${related.slice(0,14).map(t => `<li>${escapeHTML(t.label)}</li>`).join("")}${related.length>14?`<li>…</li>`:""}</ul>
    `;
  }
  if (n.type === "experience") {
    const e = n.data || {};
    return `
      <p class="meta">${escapeHTML(e.role || "")} • ${escapeHTML(e.location || "")} • ${escapeHTML(range(e.start, e.end))}</p>
      ${renderBullets(e.bullets)}
      <div class="badges">${(e.metrics || []).map(b => `<span class="badge">${escapeHTML(b)}</span>`).join("")}</div>
      <h3>Stack</h3>
      <div class="badges">${(e.tags || []).map(t => `<span class="badge">#${escapeHTML(t)}</span>`).join("")}</div>
      ${e.proof?.length ? `<h3>Receipts</h3><ul>${e.proof.map(p => `<li><a target="_blank" rel="noreferrer" href="${p.url}">${escapeHTML(p.label)}</a></li>`).join("")}</ul>`:""}
    `;
  }
  if (n.type === "project") {
    const p = n.data || {};
    return `
      <p class="meta">${escapeHTML(p.meta || "")}</p>
      ${renderBullets(p.bullets)}
      <div class="badges">${(p.metrics || []).map(b => `<span class="badge">${escapeHTML(b)}</span>`).join("")}</div>
      <h3>Stack</h3>
      <div class="badges">${(p.tags || []).map(t => `<span class="badge">#${escapeHTML(t)}</span>`).join("")}</div>
      ${p.proof?.length ? `<h3>Receipts</h3><ul>${p.proof.map(pf => `<li><a target="_blank" rel="noreferrer" href="${pf.url}">${escapeHTML(pf.label)}</a></li>`).join("")}</ul>`:""}
    `;
  }
  if (n.type === "edu") {
    const ed = n.data || {};
    return `<p class="meta">${escapeHTML(ed.degree || "")} • GPA ${escapeHTML(ed.gpa || "")} • ${escapeHTML(range(ed.start, ed.end))}</p>
            <div class="badges">${(ed.tags || []).map(t => `<span class="badge">#${escapeHTML(t)}</span>`).join("")}</div>`;
  }
  if (n.type === "pub" || n.type === "pat") {
    const p = n.data || {};
    return `<p class="meta">${n.type==="pub"?"Publication":"Patent"} • ${escapeHTML(p.venue || p.status || "")} • ${escapeHTML(p.year || "")}</p>
            <p>${escapeHTML(p.title || "")}</p>
            <div class="badges">${(p.tags || []).map(t => `<span class="badge">#${escapeHTML(t)}</span>`).join("")}</div>`;
  }
  return "<p>No details found.</p>";
}

function renderBullets(list=[]){ return list.length ? `<ul>${list.map(x=>`<li>${escapeHTML(x)}</li>`).join("")}</ul>` : ""; }

/* Helpers */
function notify(msg){ toast.textContent = msg; toast.classList.add("show"); setTimeout(() => toast.classList.remove("show"), 1300); }
function pushNode(n){ if (!nodes.find(x=>x.id===n.id)) nodes.push(n); }
function pushLink(s,t){ const src = byId(s), tgt = byId(t); if (src && tgt) links.push({ source: src, target: tgt }); }
function byId(id){ return nodes.find(n=>n.id===id); }
function siblings(n){
  const ins = links.filter(l => l.target.id === n.id).map(l => l.source.id);
  if (!ins.length) return [n];
  const parent = ins[0];
  const sibs = links.filter(l => l.source.id === parent).map(l => l.target);
  return sibs.length ? sibs : [n];
}
function slug(s=""){ return s.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,""); }
function skillTag(s=""){ return slug(s); }
function domTag(s=""){ return slug(s); }
function range(a,b){ return [a,b].filter(Boolean).join(" – "); }
function escapeHTML(s=""){ return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

/* Deep links */
function applyURLState(){
  const params = new URLSearchParams(location.search);
  const lens = params.get("lens"); const node = params.get("node");
  if (lens && LENSES[lens]) {
    currentLens = lens;
    document.querySelectorAll(".lens").forEach(b => b.setAttribute("aria-pressed", "false"));
    document.querySelector(`.lens[data-lens="${lens}"]`)?.setAttribute("aria-pressed","true");
    updateLens();
  }
  if (node && byId(node)) { setSelection(node); openDetail(byId(node)); }
}
function writeURLState(){
  const params = new URLSearchParams(location.search);
  params.set("lens", currentLens);
  if (selectedId) params.set("node", selectedId);
  history.replaceState(null, "", `${location.pathname}?${params.toString()}`);
}
