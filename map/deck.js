/* DeckBuilder: turns filtered project rows into a PowerPoint (PptxGenJS). Shared by browser + node. */
(function (root) {
  var NAVY = "1F3864", GOLD = "B8860B", LIGHT = "DCE3EF", GRID = "BFBFBF", INK = "1A1A1A", MUTE = "6B6B6B";
  var GROUPS = [
    { key: "Operating", label: "Operating", match: ["Operating"] },
    { key: "UC", label: "Under construction", match: ["Under construction"] },
    { key: "Dev", label: "Development", match: ["Development - advanced", "Development - early"] },
    { key: "Ann", label: "Announced", match: ["Announced"] }
  ];
  var PHASES = [["MW_Operating", "Operating", "1F3864"], ["MW_Under_Construction", "Under construction", "C9A227"],
                ["MW_Development", "Development", "2A9D8F"], ["MW_Announced", "Announced", "9A8FB8"]];
  function num(v) { var n = parseFloat(String(v == null ? "" : v).replace(",", ".")); return isFinite(n) ? n : 0; }
  function total(r) { return num(r.MW_Operating) + num(r.MW_Under_Construction) + num(r.MW_Development) + num(r.MW_Announced); }
  function fmtMW(v) { return Math.round(v).toLocaleString("de-DE"); }
  function fmtCap(v) { return v >= 1000 ? (v / 1000).toFixed(1) + " GW" : Math.round(v) + " MW"; }
  function defaultNote(r) { return r.Status_Note || r.Status || ""; }

  // simple equirectangular projection scaled into a box
  function projector(outline, box) {
    var k = Math.cos(51.2 * Math.PI / 180), minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    outline.forEach(function (p) { var x = p[0] * k, y = -p[1]; minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); });
    var s = Math.min(box.w / (maxX - minX), box.h / (maxY - minY));
    var w = (maxX - minX) * s, h = (maxY - minY) * s, ox = box.x + (box.w - w) / 2, oy = box.y + (box.h - h) / 2;
    return { w: w, h: h, x: ox, y: oy, p: function (lon, lat) { return [ox + (lon * k - minX) * s, oy + (-lat - minY) * s]; } };
  }

  function clusterize(rows, clusterDefs) {
    var byName = {}, defs = {};
    (clusterDefs || []).forEach(function (c) { if (c.Cluster) defs[c.Cluster] = c; });
    rows.forEach(function (r) {
      var name = r.Cluster || r.City || "Other", c = byName[name];
      if (!c) c = byName[name] = { name: name, mw: 0, lat: 0, lon: 0, n: 0, def: defs[name] };
      var t = total(r); c.mw += t; c.n++;
      c.lat += num(r.Latitude); c.lon += num(r.Longitude);
    });
    return Object.keys(byName).map(function (k) {
      var c = byName[k];
      if (c.def && num(c.def.Bubble_Lat)) { c.lat = num(c.def.Bubble_Lat); c.lon = num(c.def.Bubble_Lon); }
      else { c.lat /= c.n; c.lon /= c.n; }
      c.hub = c.def && c.def.Hub_Marker ? String(c.def.Hub_Marker) : "";
      c.side = c.def && c.def.Label_Side ? String(c.def.Label_Side).toLowerCase() : (c.lon < 10.4 ? "left" : "right");
      return c;
    }).filter(function (c) { return c.mw > 0; }).sort(function (a, b) { return b.mw - a.mw; });
  }

  function tableRows(rows) {
    var out = [], sum = 0, f = { fontFace: "Arial", fontSize: 9, color: INK, valign: "middle" };
    out.push(["PROMOTER", "LOCATION", "MW", "STATUS"].map(function (t, i) {
      return { text: t, options: Object.assign({}, f, { bold: true, color: "FFFFFF", fill: { color: NAVY }, align: i === 2 ? "center" : "left" }) };
    }));
    GROUPS.forEach(function (g) {
      var rs = rows.filter(function (r) { return g.match.indexOf(r.Status) >= 0; }).sort(function (a, b) { return total(b) - total(a); });
      if (!rs.length) return;
      out.push([{ text: g.label.toUpperCase(), options: Object.assign({}, f, { bold: true, color: NAVY, fill: { color: LIGHT }, colspan: 4, fontSize: 8.5 }) }]);
      rs.forEach(function (r) {
        var t = total(r); sum += t;
        out.push([
          { text: r.Promoter || r.Project_Name || "", options: Object.assign({}, f, { bold: true, color: NAVY }) },
          { text: r.City || "", options: f },
          { text: fmtMW(t), options: Object.assign({}, f, { align: "center" }) },
          { text: defaultNote(r), options: Object.assign({}, f, { fontSize: 8 }) }
        ]);
      });
    });
    return { rows: out, sum: sum };
  }

  function addTitle(slide, x, y, w, text) {
    slide.addText(text.toUpperCase(), { x: x, y: y, w: w, h: 0.4, fontFace: "Arial", fontSize: 16, bold: true, color: GOLD, margin: 0 });
  }
  function addFooter(slide, opts, hasSample) {
    var t = (opts.source || "Source: internal data center pipeline database") + " · as of " + opts.asOf + " · capacity in MW (" + (opts.basis || "IT load") + ")";
    if (hasSample) t += "  ·  CONTAINS SAMPLE DATA";
    slide.addText(t, { x: 0.35, y: 7.1, w: 12.6, h: 0.25, fontFace: "Arial", fontSize: 7.5, color: hasSample ? "C00000" : MUTE, margin: 0 });
  }

  function build(PptxGenJS, rows, clusterDefs, outline, opts) {
    opts = opts || {};
    opts.asOf = opts.asOf || new Date().toISOString().slice(0, 10);
    var pptx = new PptxGenJS();
    pptx.layout = "LAYOUT_WIDE"; // 13.333 x 7.5 in
    pptx.title = opts.title || "Data center pipeline";
    var deckRows = rows.filter(function (r) { return String(r.Include_in_Deck || "Yes").toLowerCase() !== "no"; });
    var hasSample = deckRows.some(function (r) { return /sample/i.test(r.Confidence || ""); });

    // ---------- slide 1: map + table ----------
    var s = pptx.addSlide(); s.background = { color: "FFFFFF" };
    addTitle(s, 0.35, 0.25, 5.6, opts.mapTitle || "Capacity concentration");
    addTitle(s, 6.35, 0.25, 6.6, opts.title || "Data center pipeline");
    var P = projector(outline, { x: 0.45, y: 0.85, w: 5.3, h: 6.1 });
    var pts = outline.map(function (q) { var xy = P.p(q[0], q[1]); return { x: xy[0] - P.x, y: xy[1] - P.y }; });
    pts.push({ close: true });
    s.addShape(pptx.ShapeType.custGeom, { x: P.x, y: P.y, w: P.w, h: P.h, points: pts, fill: { color: "D9D9D9" }, line: { color: "FFFFFF", width: 1 } });

    var cl = clusterize(deckRows, clusterDefs), maxMW = cl.length ? cl[0].mw : 1, DMAX = opts.maxBubble || 1.45, DMIN = 0.32;
    cl.slice().reverse().forEach(function (c) { // small on top
      var d = Math.max(DMIN, DMAX * Math.sqrt(c.mw / maxMW)), xy = P.p(c.lon, c.lat);
      s.addShape(pptx.ShapeType.ellipse, { x: xy[0] - d / 2, y: xy[1] - d / 2, w: d, h: d, fill: { color: "2F4A7A", transparency: 8 }, line: { color: "FFFFFF", width: 1.25 } });
      if (c.hub) {
        var hd = 0.24;
        s.addShape(pptx.ShapeType.ellipse, { x: xy[0] - hd / 2, y: xy[1] + d * 0.12, w: hd, h: hd, fill: { color: "FFFFFF" }, line: { color: GOLD, width: 1.5 } });
        s.addText(c.hub, { x: xy[0] - hd / 2, y: xy[1] + d * 0.12, w: hd, h: hd, fontFace: "Arial", fontSize: 8, bold: true, color: NAVY, align: "center", valign: "middle", margin: 0 });
      }
      var lw = 1.9, side = c.side, lx, ly = xy[1] - 0.25, al;
      if (side === "left" && xy[0] - d / 2 - lw - 0.04 < 0.1) side = "right"; // never run off the slide
      if (side === "above" || side === "below") { lx = xy[0] - lw / 2; ly = side === "above" ? xy[1] - d / 2 - 0.52 : xy[1] + d / 2 + 0.02; al = "center"; }
      else if (side === "left") { lx = xy[0] - d / 2 - lw - 0.04; al = "right"; }
      else { lx = xy[0] + d / 2 + 0.04; al = "left"; }
      s.addText([
        { text: c.name, options: { bold: true, color: NAVY, fontSize: 10, breakLine: true } },
        { text: fmtCap(c.mw), options: { color: MUTE, fontSize: 9 } }
      ], { x: lx, y: ly, w: lw, h: 0.5, fontFace: "Arial", align: al, valign: "middle", margin: 0 });
    });

    // ---------- table (paginates) ----------
    var T = tableRows(deckRows), body = T.rows.slice(1), head = T.rows[0], PER = opts.rowsPerSlide || 19;
    var totalRow = [{ text: "", options: {} }, { text: "Total", options: { fontFace: "Arial", fontSize: 9, bold: true, color: NAVY } },
      { text: fmtMW(T.sum), options: { fontFace: "Arial", fontSize: 9, bold: true, color: NAVY, align: "center" } }, { text: "", options: {} }];
    var pages = []; for (var i = 0; i < body.length; i += PER) pages.push(body.slice(i, i + PER));
    if (!pages.length) pages.push([]);
    var tOpts = { colW: [2.0, 1.35, 0.75, 2.5], rowH: 0.27, border: { type: "solid", pt: 0.5, color: GRID }, autoPage: false, margin: [0.03, 0.06, 0.03, 0.06] };
    pages.forEach(function (pg, pi) {
      var rowsOut = [head].concat(pg); if (pi === pages.length - 1) rowsOut.push(totalRow);
      if (pi === 0) { s.addTable(rowsOut, Object.assign({ x: 6.35, y: 0.85, w: 6.6 }, tOpts)); addFooter(s, opts, hasSample); }
      else {
        var sc = pptx.addSlide(); addTitle(sc, 0.35, 0.25, 12, (opts.title || "Data center pipeline") + " (cont.)");
        sc.addTable(rowsOut, Object.assign({ x: 0.35, y: 0.85, w: 12.6 }, tOpts, { colW: [4.0, 2.4, 1.2, 5.0] }));
        addFooter(sc, opts, hasSample);
      }
    });

    // ---------- slide: capacity by cluster and phase (native, editable chart) ----------
    var c2 = pptx.addSlide(); addTitle(c2, 0.35, 0.25, 12, "Pipeline by cluster and phase (MW)");
    var names = cl.map(function (c) { return c.name; });
    var data = PHASES.map(function (ph) {
      return { name: ph[1], labels: names, values: names.map(function (n) {
        return deckRows.filter(function (r) { return (r.Cluster || r.City || "Other") === n; }).reduce(function (a, r) { return a + num(r[ph[0]]); }, 0); }) };
    });
    c2.addChart(pptx.ChartType.bar, data, { x: 0.35, y: 0.85, w: 12.6, h: 6.1, barDir: "bar", barGrouping: "stacked",
      chartColors: PHASES.map(function (p) { return p[2]; }), showLegend: true, legendPos: "t", legendFontFace: "Arial", legendFontSize: 10,
      catAxisFontFace: "Arial", catAxisFontSize: 10, catAxisOrientation: "maxMin", valAxisFontFace: "Arial", valAxisFontSize: 9, valGridLine: { color: "E5E5E5", size: 0.5 },
      valAxisLabelFormatCode: "#,##0", dataLabelFontSize: 8 });
    addFooter(c2, opts, hasSample);
    return pptx;
  }
  root.DeckBuilder = { build: build, total: total, clusterize: clusterize, GROUPS: GROUPS, fmtCap: fmtCap, fmtMW: fmtMW };
})(typeof window !== "undefined" ? window : globalThis);
