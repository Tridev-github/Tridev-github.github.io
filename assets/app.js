/* V3: click-to-traverse (links as big hit targets), zoom-to-selected, high-contrast toggle, clearer visuals */
const svg = d3.select("#skillTree");
const toast = document.getElementById("toast");
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
document.getElementById("contrastBtn").addEventListener("click", () => {
  const cur = document.documentElement.getAttribute("data-contrast");
  const next = cur === "high" ? "normal" : "high";
  document.documentElement.setAttribute("data-contrast", next);
  notify(next === "high" ? "High contrast on" : "High contrast off");
});

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
const gLinksHit = gWorld.append("g").attr("class", "links-hit"); // invisible fat strokes for click
const gLinks = gWorld.append("g").attr("class", "links");
const gNodes = gWorld.append("g").attr("class", "nodes");

/* Responsive viewBox */
const WIDTH = () => svg.node().clientWidth || 900;
const HEIGHT = () => svg.node().clientHeight || 600;
function setViewBox(){ svg.attr("viewBox", [0, 0, WIDTH(), HEIGHT()]); }
window.addEventListener("resize", setViewBox); setViewBox();

/* Zoom & pan + zoomToSelected */
const zoom = d3.zoom().scaleExtent([0.5, 2.8]).on("zoom", (ev) => {
  gWorld.attr("transform", ev.transform);
});
svg.call(zoom).on("dblclick.zoom", null);

// helpers for zooming to a node
function zoomToNode(n, k = 1.25){
  const t = d3.zoomTransform(svg.node());
  const x = n.x, y = n.y;
  const w = WIDTH(), h = HEIGHT();
  const xt = w/2 - k * x;
  const yt = h/2 - k * y;
  const tr = d3.zoomIdentity.translate(xt, yt).scale(k);
  svg.transition().duration(reduceMotion ? 0 : 450).call(zoom.transform, tr);
}

document.getElementById("resetBtn").addEventListener("click", () =>
  svg.transition().duration(reduceMotion ? 0 : 400).call(zoom.transform, d3.zoomIdentity)
);

/* Export PNG */
document.getElementById("exportBtn").addEventListener("click", exportPNG);
async function exportPNG(){
  const serializer = new XMLSerializer();
  const clone = svg.node().cloneNode(true);
  clone.setAttribute("width", WIDTH());
  clone.setAttribute("height", HEIGHT());
  const svgString = serializer.serializeToString(clone);
  const blob = new Blob([svgString], {type: "image/svg+xml;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.onload = function(){
    const canvas = document.createElement("canvas");
    canvas.width = WIDTH(); canvas.height = HEIGHT();
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--panel").trim() || "#0f1119";
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
mkGrad("gradSkill", "#a3e6ff", "#b8f7d0");
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
    setSelection(selectedId || "me", {zoom:true});
    updateLensCounts();
    notify("Click links to travel • drag to pin • Contrast for visibility");
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
    pushNode({ id, label: item.title || item.company, type: baseType, level: 3, tags: (item.tags||[]).map(skillTag), data:item, meta });

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
  const nodeRadius = n => ({ root:34, domain:24, skill:15, project:18, experience:20, edu:16, pub:14, pat:14 }[n.type] || 14);
  const fillByType = {
    root:"url(#gradRoot)", domain:"url(#gradDom)", skill:"url(#gradSkill)",
    project:"url(#gradProj)", experience:"url(#gradExp)", edu:"url(#gradEdu)",
    pub:"url(#gradPub)", pat:"url(#gradPat)"
  };

  sim = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(links).id(d=>d.id).distance(l => 72 + 8 * (l.target.level || 0)).strength(.16))
    .force("charge", d3.forceManyBody().strength(-240))
    .force("collide", d3.forceCollide().radius(d=>nodeRadius(d)+7).iterations(2))
    .force("x", d3.forceX().x(d=>xScale(d.level)).strength(.32))
    .force("y", d3.forceY().y(()=>HEIGHT()/2).strength(.07))
    .alpha(1).alphaDecay(reduceMotion ? 0.15 : 0.03);

  // Visible links
  const link = gLinks.selectAll("path.link").data(links).join("path")
    .attr("class","link")
    .attr("stroke-width",1.8);

  // Click targets (fat invisible strokes)
  const linkHit = gLinksHit.selectAll("path.link-hit").data(links).join("path")
    .attr("class","link-hit")
    .on("click", (_, l) => {
      // Travel along the link: if selected endpoint exists, go to the other end; else go to source
      const nextId = (selectedId === l.source.id) ? l.target.id
                    : (selectedId === l.target.id) ? l.source.id
                    : l.target.id;
      setSelection(nextId, {zoom:true, open:true});
      writeURLState();
    });

  const drag = d3.drag()
    .on("start", (ev, d) => {
      if (!ev.active) sim.alphaTarget(.2).restart();
      d.fx = d.x; d.fy = d.y; d.pinned = true; updatePinIndicator(d);
    })
    .on("drag", (ev,d) => { d.fx = ev.x; d.fy = ev.y; })
    .on("end", (ev,d) => { if (!ev.active) sim.alphaTarget(0); });

  const node = gNodes.selectAll("g.node").data(nodes, d=>d.id).join(enter => {
    const g = enter.append("g").attr("class","node").attr("tabindex",0).call(drag);
    g.append("title").text(d => `${d.label}`);
    g.append("circle").attr("r", d=>nodeRadius(d)).attr("fill", d=>fillByType[d.type]);
    g.append("text").attr("class","label").attr("text-anchor","middle")
      .attr("dy", d => d.type==="skill" ? "-1.2em" : d.type==="domain" ? "-1.35em" : "-1.1em")
      .text(d=>d.label)
      .style("font-size", d => `${({ root:18, domain:15, skill:12, project:13, experience:13, edu:12, pub:11, pat:11 }[d.type])}px`);
    g.on("click", (_,d)=>{ setSelection(d.id, {zoom:true, open:true}); writeURLState(); });
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

  sim.on("tick", () => {
    // straight segments (fast + crisp)
    const seg = d => `M${d.source.x},${d.source.y} L${d.target.x},${d.target.y}`;
    link.attr("d", seg);
    linkHit.attr("d", seg);

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

  // Hotkeys kept minimal for a11y (click is primary). Only pin & focus for power users:
  window.addEventListener("keydown", e => {
    if (["INPUT","TEXTAREA"].includes(document.activeElement.tagName)) return;
    const cur = nodes.find(n=>n.id===selectedId); if (!cur) return;
    if (e.key.toLowerCase()==="p"){
      cur.pinned = !cur.pinned;
      if (!cur.pinned){ cur.fx = cur.fy = null; }
      else { cur.fx = cur.x; cur.fy = cur.y; }
      updatePinIndicator(cur);
    } else if (e.key.toLowerCase()==="f"){
      focusMode = !focusMode; focusBtn.setAttribute("aria-pressed", String(focusMode)); updateFocus();
    }
  });

  notify("Tip: click a link to travel • Contrast for high visibility");
}

function updatePinIndicator(n){
  const el = gNodes.selectAll("g.node").filter(d => d.id === n.id).select("circle");
  el.attr("stroke", n.pinned ? "var(--ok)" : "var(--edge)").attr("stroke-width", n.pinned ? 2.6 : 1.4);
}

function updateLens(){
  const active = new Set(nodes.filter(n => {
    if (!LENSES[currentLens].tags?.length) return true;
    return (n.tags||[]).some(t => LENSES[currentLens].tags.includes(t));
  }).map(n => n.id));

  const useDim = LENSES[currentLens].tags?.length > 0;
  gNodes.selectAll(".node").classed("dimmed", d => useDim && !active.has(d.id));
  gLinks.selectAll(".link").classed("dimmed", l => useDim && !(active.has(l.source.id) || active.has(l.target.id)));
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

function setSelection(id, opts = {}){
  selectedId = id;
  const n = id ? byId(id) : null;
  gNodes.selectAll(".node").classed("selected", d => d.id === id);
  gLinks.selectAll(".link").classed("active", l => l.source.id === id || l.target.id === id);
  if (opts.zoom && n) zoomToNode(n);
  if (opts.open && n) openDetail(n);
}

function openDetail(n){
  if (!n) return;
  detailTitle.textContent = n.label;
  detailBody.innerHTML = renderDetail(n);
}

function renderDetail(n){
  // Build neighbor chips (parents & children) for click traversal
  const parents = links.filter(l=>l.target.id===n.id).map(l=>l.source);
  const children = links.filter(l=>l.source.id===n.id).map(l=>l.target);
  const neighborChips = `
    <h3>Neighbors</h3>
    <div class="badges">
      ${parents.slice(0,6).map(p=>`<a class="badge" href="#" data-goto="${p.id}">⬆︎ ${escapeHTML(p.label)}</a>`).join("")}
      ${children.slice(0,10).map(c=>`<a class="badge" href="#" data-goto="${c.id}">⬇︎ ${escapeHTML(c.label)}</a>`).join("")}
    </div>`;

  let html = "";
  if (n.type === "root") {
    html = `
      <p class="meta">${escapeHTML(n.meta || "Developer • ML/CV • RAG • MLOps")}</p>
      <div class="badges">
        <span class="badge">📍 Buffalo, NY</span>
        <span class="badge">Open to: ML / CV / Applied Research</span>
        <span class="badge">Contact: +1 (716) 750-3488</span>
      </div>
      ${neighborChips}
    `;
  } else if (n.type === "domain" || n.type === "skill") {
    const related = links.filter(l => l.source.id === n.id).map(l => l.target);
    html = `
      <p class="meta">${n.type === "domain" ? "Domain" : "Skill"} • ${related.length} unlocks</p>
      <div class="badges">${(n.tags || []).map(t => `<span class="badge">#${t}</span>`).join("")}</div>
      ${neighborChips}
    `;
  } else if (n.type === "experience") {
    const e = n.data || {};
    html = `
      <p class="meta">${escapeHTML(e.role || "")} • ${escapeHTML(e.location || "")} • ${escapeHTML(range(e.start, e.end))}</p>
      ${renderBullets(e.bullets)}
      <div class="badges">${(e.metrics || []).map(b => `<span class="badge">${escapeHTML(b)}</span>`).join("")}</div>
      <h3>Stack</h3>
      <div class="badges">${(e.tags || []).map(t => `<span class="badge">#${escapeHTML(t)}</span>`).join("")}</div>
      ${e.proof?.length ? `<h3>Receipts</h3><ul>${e.proof.map(p => `<li><a target="_blank" rel="noreferrer" href="${p.url}">${escapeHTML(p.label)}</a></li>`).join("")}</ul>`:""}
      ${neighborChips}
    `;
  } else if (n.type === "project") {
    const p = n.data || {};
    html = `
      <p class="meta">${escapeHTML(p.meta || "")}</p>
      ${renderBullets(p.bullets)}
      <div class="badges">${(p.metrics || []).map(b => `<span class="badge">${escapeHTML(b)}</span>`).join("")}</div>
      <h3>Stack</h3>
      <div class="badges">${(p.tags || []).map(t => `<span class="badge">#${escapeHTML(t)}</span>`).join("")}</div>
      ${p.proof?.length ? `<h3>Receipts</h3><ul>${p.proof.map(pf => `<li><a target="_blank" rel="noreferrer" href="${pf.url}">${escapeHTML(pf.label)}</a></li>`).join("")}</ul>`:""}
      ${neighborChips}
    `;
  } else if (n.type === "edu") {
    const ed = n.data || {};
    html = `<p class="meta">${escapeHTML(ed.degree || "")} • GPA ${escapeHTML(ed.gpa || "")} • ${escapeHTML(range(ed.start, ed.end))}</p>
            <div class="badges">${(ed.tags || []).map(t => `<span class="badge">#${escapeHTML(t)}</span>`).join("")}</div>
            ${neighborChips}`;
  } else if (n.type === "pub" || n.type === "pat") {
    const p = n.data || {};
    html = `<p class="meta">${n.type==="pub"?"Publication":"Patent"} • ${escapeHTML(p.venue || p.status || "")} • ${escapeHTML(p.year || "")}</p>
            <p>${escapeHTML(p.title || "")}</p>
            <div class="badges">${(p.tags || []).map(t => `<span class="badge">#${escapeHTML(t)}</span>`).join("")}</div>
            ${neighborChips}`;
  }

  // wire neighbor chip clicks
  setTimeout(() => {
    detailBody.querySelectorAll("[data-goto]").forEach(a => {
      a.addEventListener("click", (ev) => {
        ev.preventDefault();
        const id = a.getAttribute("data-goto");
        setSelection(id, {zoom:true, open:true});
        writeURLState();
      });
    });
  }, 0);

  detailBody.innerHTML = html;
}

function renderBullets(list=[]){ return list.length ? `<ul>${list.map(x=>`<li>${escapeHTML(x)}</li>`).join("")}</ul>` : ""; }

/* Helpers */
function notify(msg){ toast.textContent = msg; toast.classList.add("show"); setTimeout(() => toast.classList.remove("show"), 1300); }
function pushNode(n){ if (!nodes.find(x=>x.id===n.id)) nodes.push(n); }
function pushLink(s,t){ const src = byId(s), tgt = byId(t); if (src && tgt) links.push({ source: src, target: tgt }); }
function byId(id){ return nodes.find(n=>n.id===id); }
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
  if (node && byId(node)) { setSelection(node, {zoom:true, open:true}); }
}
function writeURLState(){
  const params = new URLSearchParams(location.search);
  params.set("lens", currentLens);
  if (selectedId) params.set("node", selectedId);
  history.replaceState(null, "", `${location.pathname}?${params.toString()}`);
}
