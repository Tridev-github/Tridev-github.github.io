/* Tridev Methuku — RPG Skill Tree
   - D3 force-directed tree with tiers (x-position by level)
   - Lenses: ml, cv, agents, backend, lead
   - Search + detail panel + keyboard nav
*/
const svg = d3.select("#skillTree");
const gLinks = svg.append("g").attr("class", "links");
const gNodes = svg.append("g").attr("class", "nodes");
const toast = document.getElementById("toast");
const detail = document.getElementById("detail");
const detailTitle = document.getElementById("detail-title");
const detailBody = document.getElementById("detail-body");
const closeDetail = document.getElementById("closeDetail");
const searchInput = document.getElementById("search");
const yearSpan = document.getElementById("year");
yearSpan.textContent = new Date().getFullYear();

let reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const a11yToggle = document.getElementById("a11yToggle");
a11yToggle.addEventListener("click", e => {
  e.preventDefault();
  reduceMotion = !reduceMotion;
  notify(reduceMotion ? "Reduced motion: on" : "Reduced motion: off");
});

document.getElementById("printBtn").addEventListener("click", () => window.print());

const themeToggle = document.getElementById("themeToggle");
const root = document.documentElement;
const storedTheme = localStorage.getItem("theme");
if (storedTheme) document.documentElement.setAttribute("data-theme", storedTheme);
themeToggle.addEventListener("click", () => {
  const t = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", t);
  localStorage.setItem("theme", t);
});

closeDetail.addEventListener("click", () => setSelection(null));

function notify(msg) {
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 1300);
}

const LENSES = {
  all: { weight: () => 1 },
  ml: { tags: ["ml", "dl", "pytorch", "tensorflow", "bert", "gnn", "gan"] },
  cv: { tags: ["cv", "opencv", "yolo", "ssd", "hdr", "gate", "root", "imaging"] },
  agents: { tags: ["rag", "agents", "langchain", "mcp", "pinecone", "faiss", "rerank"] },
  backend: { tags: ["aws", "docker", "fastapi", "redis", "sql", "airflow", "mlflow"] },
  lead: { tags: ["lead", "team", "collab", "funding"] }
};

let currentLens = "all";
document.querySelectorAll(".lens").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".lens").forEach(b => b.setAttribute("aria-pressed", "false"));
    btn.setAttribute("aria-pressed", "true");
    currentLens = btn.dataset.lens;
    updateLens();
  });
});

let sim, nodes = [], links = [];
let selectedId = null;

const WIDTH = () => svg.node().clientWidth || 900;
const HEIGHT = () => svg.node().clientHeight || 600;

// Responsive viewBox
function setViewBox() {
  svg.attr("viewBox", [0, 0, WIDTH(), HEIGHT()]);
}
window.addEventListener("resize", setViewBox);
setViewBox();

// Load data and boot
fetch("./data/resume.json")
  .then(r => r.json())
  .then(data => buildGraph(data))
  .catch(err => {
    console.error(err);
    notify("Failed to load resume.json");
  });

function buildGraph(data) {
  // Create root
  pushNode({ id: "me", label: data.person.name, type: "root", level: 0, url: data.person.linkedin, meta: data.person.tagline });

  // Domains from skills categories
  const domains = Object.keys(data.skills);
  domains.forEach((dom, i) => {
    const domId = `dom:${slug(dom)}`;
    pushNode({ id: domId, label: dom, type: "domain", level: 1 });
    pushLink("me", domId);
    data.skills[dom].forEach(skill => {
      const sid = `skill:${slug(skill)}`;
      pushNode({ id: sid, label: skill, type: "skill", level: 2, tags: [skillTag(skill), domTag(dom)] });
      pushLink(domId, sid);
    });
  });

  // Experiences & projects
  const attachTagged = (item, baseType) => {
    const id = `${baseType}:${slug(item.title || item.company)}`;
    const label = item.title || item.company;
    const meta = [item.role, item.location, range(item.start, item.end)].filter(Boolean).join(" • ");
    pushNode({
      id, label, type: baseType, level: 3,
      tags: (item.tags || []).map(skillTag),
      data: item
    });

    // Connect to mentioned skills (exact match by tags)
    (item.tags || []).forEach(t => {
      const sid = `skill:${slug(t)}`;
      if (byId(sid)) pushLink(sid, id);
    });

    // If no explicit tags, link to domain guessed by type
    if (!(item.tags || []).length) {
      pushLink(`dom:${slug("MLOps/Infra")}`, id);
    }
  };

  data.experience.forEach(exp => attachTagged({ ...exp, title: exp.company }, "experience"));
  data.projects.forEach(p => attachTagged(p, "project"));

  // Education → root
  data.education.forEach(ed => {
    const id = `edu:${slug(ed.school)}`;
    pushNode({ id, label: `${ed.school}`, type: "edu", level: 3, data: ed });
    pushLink("me", id);
  });

  // Publications & patents → connect from related tags/skills
  data.publications.forEach(pub => {
    const id = `pub:${slug(pub.title)}`;
    pushNode({ id, label: pub.venue || "Publication", type: "pub", level: 4, data: pub, tags: (pub.tags || []).map(skillTag) });
    const attach = (pub.tags || []).map(t => `skill:${slug(t)}`).filter(byId);
    if (attach.length) attach.forEach(sid => pushLink(sid, id));
    else pushLink("me", id);
  });
  data.patents.forEach(p => {
    const id = `pat:${slug(p.title)}`;
    pushNode({ id, label: "Patent", type: "pat", level: 4, data: p, tags: (p.tags || []).map(skillTag) });
    const attach = (p.tags || []).map(t => `skill:${slug(t)}`).filter(byId);
    if (attach.length) attach.forEach(sid => pushLink(sid, id));
    else pushLink("me", id);
  });

  // Layout & draw
  draw();
  notify("Tip: press ←/→ to walk the path; Enter to open details.");
  setSelection("me");

  // Search
  searchInput.addEventListener("input", e => {
    const q = e.target.value.toLowerCase().trim();
    if (!q) return dimBySet(new Set());
    const ids = new Set(nodes.filter(n => (n.label || "").toLowerCase().includes(q) || (n.meta || "").toLowerCase().includes(q)).map(n => n.id));
    dimBySet(ids);
  });

  // Keyboard navigation
  window.addEventListener("keydown", e => {
    if (["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) return;
    const cur = nodes.find(n => n.id === selectedId);
    if (!cur) return;
    if (e.key === "ArrowRight") {
      const outs = links.filter(l => l.source.id === cur.id).map(l => l.target.id);
      if (outs.length) setSelection(outs[0]);
    } else if (e.key === "ArrowLeft") {
      const ins = links.filter(l => l.target.id === cur.id).map(l => l.source.id);
      if (ins.length) setSelection(ins[0]);
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      // cycle siblings
      const sibs = siblings(cur);
      if (sibs.length) {
        const idx = sibs.findIndex(s => s.id === cur.id);
        const next = e.key === "ArrowDown" ? (idx + 1) % sibs.length : (idx - 1 + sibs.length) % sibs.length;
        setSelection(sibs[next].id);
      }
    } else if (e.key === "Enter") {
      openDetail(cur);
    }
  });
}

function draw() {
  const xScale = d3.scalePoint().domain([0,1,2,3,4]).range([80, WIDTH()-80]);
  const nodeRadius = n => ({ root: 32, domain: 22, skill: 14, project: 16, experience: 18, edu: 14, pub: 12, pat: 12 }[n.type] || 12);
  const colors = {
    root: "url(#gradRoot)", domain: "url(#gradDom)",
    skill: "url(#gradSkill)", project: "url(#gradProj)", experience: "url(#gradExp)",
    edu: "url(#gradEdu)", pub: "url(#gradPub)", pat: "url(#gradPat)"
  };

  // defs gradients once
  const defs = svg.append("defs");
  const mkGrad = (id, c1, c2) => {
    const g = defs.append("linearGradient").attr("id", id).attr("x1","0%").attr("y1","0%").attr("x2","100%").attr("y2","100%");
    g.append("stop").attr("offset","0%").attr("stop-color", c1);
    g.append("stop").attr("offset","100%").attr("stop-color", c2);
  };
  mkGrad("gradRoot", "#a78bfa", "#22d3ee");
  mkGrad("gradDom", "#93c5fd", "#a78bfa");
  mkGrad("gradSkill", "#7dd3fc", "#a7f3d0");
  mkGrad("gradProj", "#fef08a", "#f59e0b");
  mkGrad("gradExp", "#fca5a5", "#fdba74");
  mkGrad("gradEdu", "#fde68a", "#86efac");
  mkGrad("gradPub", "#e9d5ff", "#93c5fd");
  mkGrad("gradPat", "#fbcfe8", "#a5b4fc");

  sim = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(links).id(d => d.id).distance(l => 70 + 8 * (l.target.level || 0)).strength(0.15))
    .force("charge", d3.forceManyBody().strength(-200))
    .force("collide", d3.forceCollide().radius(d => nodeRadius(d) + 6).iterations(2))
    .force("x", d3.forceX().x(d => xScale(d.level)))
    .force("y", d3.forceY().y(d => HEIGHT()/2).strength(0.05))
    .alpha(1).alphaDecay(reduceMotion ? 0.15 : 0.03);

  const link = gLinks.selectAll("line").data(links).join("line")
    .attr("class", "link")
    .attr("stroke-width", 1.5);

  const node = gNodes.selectAll("g.node").data(nodes, d => d.id).join(enter => {
    const g = enter.append("g").attr("class", "node").attr("tabindex", 0);
    g.append("circle").attr("r", d => nodeRadius(d)).attr("fill", d => colors[d.type] || "var(--chip)").attr("stroke", "var(--edge)").attr("stroke-width", 1);
    g.append("text").attr("class", "label").attr("text-anchor", "middle").attr("dy", d => d.type === "skill" ? "-1.2em" : d.type === "domain" ? "-1.4em" : "-1.1em").text(d => d.label).style("font-size", d => {
      const sz = ({ root: 16, domain: 14, skill: 11, project: 12, experience: 12, edu: 11, pub: 10, pat:10 }[d.type]);
      return `${sz}px`;
    });
    g.on("click", (_, d) => { setSelection(d.id); openDetail(d); });
    g.on("mouseenter", (_, d) => setSelection(d.id));
    g.on("focus", (_, d) => setSelection(d.id));
    return g;
  });

  sim.on("tick", () => {
    link
      .attr("x1", d => d.source.x).attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x).attr("y2", d => d.target.y);

    node.attr("transform", d => `translate(${d.x},${d.y})`);
  });
}

function updateLens() {
  const activeTags = (LENSES[currentLens].tags || []).map(t => t.toLowerCase());
  if (!activeTags.length) {
    gNodes.selectAll(".node").classed("dimmed", false);
    gLinks.selectAll(".link").classed("dimmed", false);
    notify("Lens: All");
    return;
  }
  const on = new Set(nodes.filter(n => (n.tags || []).some(t => activeTags.includes(t))).map(n => n.id));
  dimBySet(on);
  notify(`Lens: ${currentLens.toUpperCase()}`);
}

function dimBySet(keepSet) {
  const useDim = keepSet.size > 0;
  gNodes.selectAll(".node").classed("dimmed", d => useDim && !keepSet.has(d.id));
  gLinks.selectAll(".link").classed("dimmed", l => useDim && !(keepSet.has(l.source.id) || keepSet.has(l.target.id)));
}

function setSelection(id) {
  selectedId = id;
  gNodes.selectAll(".node").classed("selected", d => d.id === id);
  // emphasize path
  gLinks.selectAll(".link").classed("active", l => l.source.id === id || l.target.id === id);
}

function openDetail(n) {
  if (!n) return;
  detailTitle.textContent = n.label;
  detailBody.innerHTML = renderDetail(n);
}

function renderDetail(n) {
  if (n.type === "root") {
    return `
      <p class="meta">${escapeHTML(n.meta || "Developer • ML/CV • RAG • MLOps")}</p>
      <div class="badges">
        <span class="badge">📍 Buffalo, NY</span>
        <span class="badge">Open to: ML / CV / Applied Research</span>
        <span class="badge">Contact: +1 (716) 750-3488</span>
      </div>
      <p>Use the lenses above to explore different “builds” of my skill tree. Try <kbd>→</kbd> to follow edges, <kbd>Enter</kbd> to open details.</p>
    `;
  }
  if (n.type === "domain" || n.type === "skill") {
    const related = links.filter(l => l.source.id === n.id).map(l => l.target);
    return `
      <p class="meta">${n.type === "domain" ? "Domain" : "Skill"} • ${related.length} unlocks</p>
      <div class="badges">${(n.tags || []).map(t => `<span class="badge">#${t}</span>`).join("")}</div>
      <h3>Unlocked</h3>
      <ul>${related.slice(0,12).map(t => `<li>${escapeHTML(t.label)}</li>`).join("")}${related.length>12?`<li>…</li>`:""}</ul>
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
    return `
      <p class="meta">${escapeHTML(ed.degree || "")} • GPA ${escapeHTML(ed.gpa || "")} • ${escapeHTML(range(ed.start, ed.end))}</p>
      <div class="badges">${(ed.tags || []).map(t => `<span class="badge">#${escapeHTML(t)}</span>`).join("")}</div>
    `;
  }
  if (n.type === "pub" || n.type === "pat") {
    const p = n.data || {};
    return `
      <p class="meta">${n.type === "pub" ? "Publication" : "Patent"} • ${escapeHTML(p.venue || p.status || "")} • ${escapeHTML(p.year || "")}</p>
      <p>${escapeHTML(p.title || "")}</p>
      <div class="badges">${(p.tags || []).map(t => `<span class="badge">#${escapeHTML(t)}</span>`).join("")}</div>
    `;
  }
  return `<p>No details found.</p>`;
}

function renderBullets(list = []) {
  if (!list.length) return "";
  return `<ul>${list.map(item => `<li>${escapeHTML(item)}</li>`).join("")}</ul>`;
}

/* ---------- Graph data helpers ---------- */
function pushNode(n) {
  if (nodes.find(x => x.id === n.id)) return;
  nodes.push(n);
}
function pushLink(s, t) {
  const src = byId(s), tgt = byId(t);
  if (!src || !tgt) return;
  links.push({ source: src, target: tgt });
}
function byId(id) { return nodes.find(n => n.id === id); }
function siblings(n) {
  const ins = links.filter(l => l.target.id === n.id).map(l => l.source.id);
  if (!ins.length) return [n];
  const parent = ins[0];
  const sibs = links.filter(l => l.source.id === parent).map(l => l.target);
  return sibs.length ? sibs : [n];
}
function slug(s="") { return s.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,""); }
function skillTag(s="") { return slug(s); }
function domTag(s="") { return slug(s); }
function range(a,b){ return [a,b].filter(Boolean).join(" – "); }
function escapeHTML(s=""){ return s.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
