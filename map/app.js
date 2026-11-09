/* Map tool. Reads ../data/projects.csv and ../data/clusters.csv; a CSV or Excel file can also be dropped onto the page. */
var STATUS = [
  ["Operating","--st-op"],["Under construction","--st-uc"],["Development - advanced","--st-da"],["Development - early","--st-de"],
  ["Announced","--st-an"],["Paused","--st-pa"],["Cancelled","--st-ca"]];
var KPI = [["Operating","MW_Operating","--st-op"],["Under construction","MW_Under_Construction","--st-uc"],["Development","MW_Development","--st-da"],["Announced","MW_Announced","--st-an"]];
var state = { rows: [], clusters: [], file: "", sample: true, view: "proj", selected: null, statusOn: {} };
STATUS.forEach(function(s){ state.statusOn[s[0]] = s[0] !== "Cancelled"; });
var $ = function(id){ return document.getElementById(id); };
var css = function(v){ return getComputedStyle(document.documentElement).getPropertyValue(v).trim() || "#888"; };
var num = function(v){ var n = parseFloat(String(v == null ? "" : v).replace(",", ".")); return isFinite(n) ? n : 0; };
var total = DeckBuilder.total, fmtMW = DeckBuilder.fmtMW, fmtCap = DeckBuilder.fmtCap;
function stVar(s){ for (var i=0;i<STATUS.length;i++) if (STATUS[i][0]===s) return STATUS[i][1]; return "--st-pa"; }
function esc(s){ return String(s == null ? "" : s).replace(/[&<>"]/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }

/* ---------- data loading ---------- */
function normRow(r){
  var o = {}; Object.keys(r).forEach(function(k){ var v = r[k]; if (v instanceof Date) v = v.toISOString().slice(0,10); o[String(k).trim()] = v; });
  return o;
}
function setData(projects, clusters, file, isSample){
  state.rows = projects.map(normRow).filter(function(r){ return r.Project_Name || r.Promoter; });
  state.clusters = (clusters || []).map(normRow);
  state.file = file; state.sample = isSample; state.selected = null;
  var maxMW = Math.max.apply(null, state.rows.map(total).concat([100]));
  $("fMin").max = Math.ceil(maxMW / 50) * 50;
  fillSelect("fState","Bundesland","All states"); fillSelect("fType","DC_Type","All types"); fillSelect("fOwner","Owner_Country","All countries");
  render(true);
}
function fillSelect(id, key, all){
  var vals = {}; state.rows.forEach(function(r){ if (r[key]) vals[r[key]] = 1; });
  $(id).innerHTML = '<option value="">' + all + '</option>' + Object.keys(vals).sort().map(function(v){ return '<option>' + esc(v) + '</option>'; }).join("");
}
/* CSV parser: handles quotes, line breaks inside quotes, a BOM, and both "," and ";" (German Excel) separators. */
function parseCSV(text){
  text = text.replace(/^\uFEFF/, "");
  var first = text.split(/\r?\n/, 1)[0], sep = (first.split(";").length > first.split(",").length) ? ";" : ",";
  var rows = [], row = [], cell = "", q = false;
  for (var i = 0; i < text.length; i++) {
    var ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; }
    else if (ch === '"') q = true;
    else if (ch === sep) { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += ch;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  var head = (rows.shift() || []).map(function(h){ return h.trim(); });
  return rows.filter(function(r){ return r.some(function(c){ return c.trim() !== ""; }); }).map(function(r){
    var o = {}; head.forEach(function(h, k){ if (h) o[h] = (r[k] || "").trim(); }); return o;
  });
}
function isProjects(rows){ return rows.length && ("Latitude" in rows[0]) && ("Status" in rows[0]); }
function isClusters(rows){ return rows.length && ("Bubble_Lat" in rows[0]); }
function loadFile(f){
  var fr = new FileReader();
  if (/\.csv$/i.test(f.name)) {
    fr.onload = function(){
      var rows = parseCSV(fr.result);
      if (isClusters(rows)) { state.clusters = rows.map(normRow); render(); return; }
      if (!isProjects(rows)) { showSrcError(f.name + " has no Latitude/Status columns. Use data/projects.csv or data/clusters.csv."); return; }
      setData(rows, state.clusters, f.name, rows.some(function(r){ return /sample/i.test(r.Confidence || ""); }));
    };
    fr.readAsText(f, "utf-8"); return;
  }
  if (!window.XLSX) { showSrcError("The Excel reader could not load (cdnjs.cloudflare.com blocked?). Save the sheet as CSV and load that instead."); return; }
  fr.onload = function(){
    try {
      var wb = XLSX.read(new Uint8Array(fr.result), { type: "array", cellDates: true });
      var sh = wb.Sheets["Projects"] || wb.Sheets[wb.SheetNames[0]];
      var rows = XLSX.utils.sheet_to_json(sh, { defval: "" });
      var cl = wb.Sheets["Clusters"] ? XLSX.utils.sheet_to_json(wb.Sheets["Clusters"], { defval: "" }).filter(function(c){ return c.Cluster && c.Cluster !== "Total" && c.Bubble_Lat !== ""; }) : state.clusters;
      if (!isProjects(rows)) { showSrcError("No sheet with Latitude and Status columns found in " + f.name + "."); return; }
      setData(rows, cl, f.name, rows.some(function(r){ return /sample/i.test(r.Confidence || ""); }));
    } catch (e) { showSrcError("Could not read " + f.name + ": " + e.message); }
  };
  fr.readAsArrayBuffer(f);
}
function showSrcError(t){ $("src").innerHTML = '<span class="msg err">' + esc(t) + '</span>'; }

/* ---------- filtering ---------- */
function filtered(){
  var q = $("q").value.trim().toLowerCase(), st = $("fState").value, ty = $("fType").value, ow = $("fOwner").value, mn = num($("fMin").value);
  var stale = $("fStale").checked, deck = $("fDeck").checked, cutoff = Date.now() - 180 * 864e5;
  return state.rows.filter(function(r){
    if (!state.statusOn[r.Status] && !(r.Status in state.statusOn ? false : state.statusOn["Paused"])) return false;
    if (st && r.Bundesland !== st) return false;
    if (ty && r.DC_Type !== ty) return false;
    if (ow && r.Owner_Country !== ow) return false;
    if (total(r) < mn) return false;
    if (stale && (!r.Last_Verified || new Date(r.Last_Verified).getTime() < cutoff)) return false;
    if (deck && String(r.Include_in_Deck).toLowerCase() === "no") return false;
    if (q && [r.Project_Name, r.Promoter, r.Operator, r.City, r.Cluster, r.ID].join(" ").toLowerCase().indexOf(q) < 0) return false;
    return true;
  });
}

/* ---------- map ---------- */
var map, layer, outlineLayer;
function initMap(){
  if (!window.L) { $("map").innerHTML = '<p class="msg err" style="padding:16px">The map library could not load (cdnjs.cloudflare.com blocked?). Filters, the project list and PowerPoint export still work.</p>'; return; }
  map = L.map("map", { zoomSnap: 0.25, minZoom: 5, maxZoom: 17, attributionControl: true }).fitBounds([[47.2, 5.8], [55.1, 15.1]]);
  L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", { subdomains: "abcd", maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>' }).addTo(map);
  outlineLayer = L.polygon(OUTLINE.map(function(p){ return [p[1], p[0]]; }), { color: css("--mute"), weight: 1, fillColor: css("--land"), fillOpacity: .35, interactive: false }).addTo(map);
  layer = L.layerGroup().addTo(map);
}
function drawMap(rows){
  if (!map) return;
  layer.clearLayers();
  if (state.view === "clu") {
    var cl = DeckBuilder.clusterize(rows, state.clusters), max = cl.length ? cl[0].mw : 1;
    cl.forEach(function(c){
      var m = L.circleMarker([c.lat, c.lon], { radius: Math.max(9, 46 * Math.sqrt(c.mw / max)), color: "#fff", weight: 1.5, fillColor: css("--st-op"), fillOpacity: .85 }).addTo(layer);
      var dir = c.side === "left" ? "left" : c.side === "above" ? "top" : c.side === "below" ? "bottom" : "right";
      m.bindTooltip(esc(c.name) + "<small>" + fmtCap(c.mw) + " · " + c.n + " projects</small>", { permanent: true, direction: dir, className: "cl-label", offset: [dir === "left" ? -6 : dir === "right" ? 6 : 0, 0] });
      m.on("click", function(){ $("q").value = ""; state.view = "proj"; syncView(); map.flyTo([c.lat, c.lon], 9); render(); });
    });
    return;
  }
  var max = Math.max.apply(null, rows.map(total).concat([1]));
  rows.slice().sort(function(a, b){ return total(b) - total(a); }).forEach(function(r){
    var lat = num(r.Latitude), lon = num(r.Longitude); if (!lat || !lon) return;
    var sel = state.selected === r;
    var m = L.circleMarker([lat, lon], { radius: Math.max(5, 26 * Math.sqrt(total(r) / max)), color: sel ? css("--gold") : "#fff", weight: sel ? 3 : 1,
      fillColor: css(stVar(r.Status)), fillOpacity: .88 }).addTo(layer);
    m.bindTooltip("<b>" + esc(r.Project_Name || r.Promoter) + "</b><br>" + esc(r.City || "") + " · " + fmtMW(total(r)) + " MW · " + esc(r.Status));
    m.on("click", function(){ select(r); });
  });
}

/* ---------- side panel ---------- */
function drawSide(rows){
  var side = $("side");
  if (state.selected && rows.indexOf(state.selected) >= 0) { side.innerHTML = detailHTML(state.selected); $("backBtn").onclick = function(){ state.selected = null; render(); }; return; }
  state.selected = null;
  var sorted = rows.slice().sort(function(a, b){ return total(b) - total(a); });
  side.innerHTML = '<div class="head"><b>Projects</b><span>' + rows.length + ' shown · sorted by MW</span></div><div class="list">' +
    sorted.map(function(r, i){
      return '<div class="row" tabindex="0" data-i="' + state.rows.indexOf(r) + '" style="--c:var(' + stVar(r.Status) + ')"><i></i><span class="n">' + esc(r.Project_Name || r.Promoter) +
        '</span><span class="m">' + fmtMW(total(r)) + ' MW</span><span class="s">' + esc([r.Promoter, r.City, r.Status].filter(Boolean).join(" · ")) + '</span></div>';
    }).join("") + (rows.length ? "" : '<p class="msg" style="padding:14px">No projects match these filters.</p>') + '</div>';
  side.querySelectorAll(".row").forEach(function(el){
    var go = function(){ select(state.rows[+el.dataset.i]); };
    el.onclick = go; el.onkeydown = function(e){ if (e.key === "Enter") go(); };
  });
}
function detailHTML(r){
  var t = total(r) || 1;
  var bar = KPI.map(function(k){ return '<span style="width:' + (num(r[k[1]]) / t * 100) + '%;background:var(' + k[2] + ')"></span>'; }).join("");
  var fields = [["Promoter","Promoter"],["Operator","Operator"],["Owner (UBO)","Owner_UBO"],["Owner country","Owner_Country"],["Owner type","Owner_Type"],["End user","End_User_Tenant"],
    ["Type","DC_Type"],["Construction stage","Construction_Stage"],["Location","City"],["District","District_Landkreis"],["Bundesland","Bundesland"],["Cluster","Cluster"],
    ["Coordinates precision","Location_Precision"],["Capacity basis","Capacity_Basis"],["Grid connection (MW)","Grid_Connection_MW"],["Grid operator","Grid_Operator"],["Grid status","Grid_Status"],
    ["Voltage (kV)","Voltage_kV"],["Planning status","Planning_Status"],["Land (ha)","Land_Area_ha"],["Floor area (m²)","Building_GFA_m2"],["Announced","Announcement_Date"],
    ["Construction start","Construction_Start"],["COD first phase","COD_First_Phase"],["COD full build-out","COD_Full_Buildout"],["Design PUE","Design_PUE"],["Cooling","Cooling"],
    ["Heat reuse","Heat_Reuse"],["On-site generation","Onsite_Generation"],["Investment (EUR m)","Investment_EUR_m"],["Confidence","Confidence"],["Last verified","Last_Verified"],["Comments","Comments"]];
  var dl = fields.filter(function(f){ return r[f[1]] !== undefined && r[f[1]] !== ""; }).map(function(f){ return "<dt>" + f[0] + "</dt><dd>" + esc(r[f[1]]) + "</dd>"; }).join("");
  var src = ["Source_1","Source_2","Source_3"].map(function(k){ var v = r[k]; if (!v) return ""; return /^https?:\/\//.test(v) ? '<a href="' + esc(v) + '" target="_blank" rel="noopener">' + esc(v.replace(/^https?:\/\/(www\.)?/, "").slice(0, 48)) + "</a>" : esc(v); }).filter(Boolean).join("<br>");
  return '<div class="detail"><button type="button" class="back" id="backBtn">← All projects</button>' +
    '<div><span class="pill" style="--c:var(' + stVar(r.Status) + ')">' + esc(r.Status) + '</span></div><h2>' + esc(r.Project_Name || r.Promoter) + '</h2>' +
    (r.Status_Note ? '<div class="msg">' + esc(r.Status_Note) + '</div>' : "") +
    '<div class="fl"><span class="lbl">Capacity ' + fmtMW(total(r)) + ' MW</span><div class="bar">' + bar + '</div><div class="phases">' +
    [["Operating"],["U/C"],["Development"],["Announced"]].map(function(l,i){ var k = KPI[i]; return "<div>" + l[0] + "<b>" + fmtMW(num(r[k[1]])) + "</b></div>"; }).join("") + '</div></div>' +
    '<dl>' + dl + '</dl>' + (src ? '<div class="fl"><span class="lbl">Sources</span><div style="font-size:13px">' + src + '</div></div>' : "") + '</div>';
}
function select(r){ state.selected = r; if (map && num(r.Latitude)) map.flyTo([num(r.Latitude), num(r.Longitude)], Math.max(map.getZoom(), 9)); render(); }

/* ---------- KPIs, status filter, legend ---------- */
function drawKpis(rows){
  var sum = function(k){ return rows.reduce(function(a, r){ return a + num(r[k]); }, 0); }, tot = rows.reduce(function(a, r){ return a + total(r); }, 0);
  $("kpis").innerHTML = KPI.map(function(k){ return '<div class="kpi" style="--c:var(' + k[2] + ')"><span>' + k[0] + '</span><b>' + fmtMW(sum(k[1])) + ' MW</b></div>'; }).join("") +
    '<div class="kpi" style="--c:var(--gold)"><span>Total pipeline</span><b>' + fmtCap(tot) + '</b><small>' + rows.length + ' projects</small></div>';
}
function drawStatus(){
  var counts = {}; state.rows.forEach(function(r){ counts[r.Status] = (counts[r.Status] || 0) + 1; });
  $("statusBox").innerHTML = STATUS.map(function(s, i){
    return '<label class="chk" style="--c:var(' + s[1] + ')"><input type="checkbox" id="st' + i + '"' + (state.statusOn[s[0]] ? " checked" : "") + '><i></i>' + s[0] + '<em>' + (counts[s[0]] || 0) + '</em></label>';
  }).join("");
  STATUS.forEach(function(s, i){ $("st" + i).onchange = function(e){ state.statusOn[s[0]] = e.target.checked; render(); }; });
  $("legend").innerHTML = state.view === "clu" ? '<div><i style="--c:var(--st-op)"></i>Bubble = MW per cluster</div>' :
    STATUS.slice(0, 5).map(function(s){ return '<div><i style="--c:var(' + s[1] + ')"></i>' + s[0] + '</div>'; }).join("") + '<div class="msg">Circle size = MW</div>';
}
function render(full){
  var rows = filtered();
  if (state.file) $("src").innerHTML = (state.sample ? '<span class="badge">Sample data</span>' : "") + '<span>' + esc(state.file) + ' · ' + state.rows.length + ' rows</span>';
  if (full !== false) drawStatus();
  drawKpis(rows); drawMap(rows); drawSide(rows);
  $("minOut").textContent = $("fMin").value;
}
function syncView(){ $("vProj").setAttribute("aria-pressed", state.view === "proj"); $("vClu").setAttribute("aria-pressed", state.view === "clu"); }

/* ---------- export ---------- */
function exportDeck(){
  var rows = filtered(), msg = $("exportMsg");
  if (!rows.length) { msg.className = "msg err"; msg.textContent = "No projects match the current filters. Widen the filters and try again."; return; }
  try {
    var p = DeckBuilder.build(PptxGenJS, rows, state.clusters, OUTLINE, { title: $("tTitle").value, source: $("tSource").value });
    var name = "DC_Pipeline_" + new Date().toISOString().slice(0, 10) + ".pptx";
    msg.className = "msg"; msg.textContent = "Building " + name + " …";
    p.writeFile({ fileName: name }).then(function(){ msg.textContent = "Saved " + name + " to your downloads (" + rows.length + " projects)."; })
      .catch(function(e){ msg.className = "msg err"; msg.textContent = "Download blocked: " + e.message; });
  } catch (e) { msg.className = "msg err"; msg.textContent = "Export failed: " + e.message; }
}

/* ---------- wiring ---------- */
["q","fState","fType","fOwner","fMin","fStale","fDeck"].forEach(function(id){ $(id).addEventListener(id === "q" || id === "fMin" ? "input" : "change", function(){ render(false); }); });
$("vProj").onclick = function(){ state.view = "proj"; syncView(); render(); };
$("vClu").onclick = function(){ state.view = "clu"; state.selected = null; syncView(); render(); };
$("reset").onclick = function(){ ["q","fState","fType","fOwner"].forEach(function(id){ $(id).value = ""; }); $("fMin").value = 0; $("fStale").checked = $("fDeck").checked = false;
  STATUS.forEach(function(s){ state.statusOn[s[0]] = s[0] !== "Cancelled"; }); state.selected = null; render(); };
$("file").onchange = function(e){ if (e.target.files[0]) loadFile(e.target.files[0]); };
document.querySelector('label[for=file]').onkeydown = function(e){ if (e.key === "Enter" || e.key === " ") { e.preventDefault(); $("file").click(); } };
$("exportBtn").onclick = function(){ $("exportMsg").textContent = ""; $("sheet").hidden = false; };
$("cancelExport").onclick = function(){ $("sheet").hidden = true; };
$("doExport").onclick = exportDeck;
var dragN = 0;
window.addEventListener("dragenter", function(e){ e.preventDefault(); dragN++; $("drop").hidden = false; });
window.addEventListener("dragleave", function(){ if (--dragN <= 0) { dragN = 0; $("drop").hidden = true; } });
window.addEventListener("dragover", function(e){ e.preventDefault(); });
window.addEventListener("drop", function(e){ e.preventDefault(); dragN = 0; $("drop").hidden = true; if (e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0]); });

initMap();

/* ---------- start: load the repository data ---------- */
function fetchText(url){ return fetch(url, { cache: "no-store" }).then(function(r){ if (!r.ok) throw new Error(r.status); return r.text(); }); }
Promise.all([fetchText("../data/projects.csv"), fetchText("../data/clusters.csv").catch(function(){ return ""; })])
  .then(function(t){
    var rows = parseCSV(t[0]), cl = t[1] ? parseCSV(t[1]) : [];
    setData(rows, cl, "data/projects.csv", rows.some(function(r){ return /sample/i.test(r.Confidence || ""); }));
  })
  .catch(function(){
    setData([], [], "", false);
    showSrcError("Could not read data/projects.csv automatically (the page was opened straight from disk). Drag projects.csv onto this page, or use Load file.");
  });
