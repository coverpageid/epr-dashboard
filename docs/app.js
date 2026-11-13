/* EPR Sell In dashboard renderer — vanilla JS, inline SVG, no CDN.
   Reads window.DASHBOARD_DATA produced by dashboard.py. */
(function () {
  "use strict";
  var D = window.DASHBOARD_DATA;
  if (!D) {
    document.getElementById("meta").textContent =
      "data.js belum dibuat — jalankan `python dashboard.py` dulu.";
    return;
  }

  // ---------- helpers ----------
  var CAT = D.categories;                       // ["Consumer",...]
  var MONTHS = D.months;                        // 12 labels
  var SPLIT = D.targetSplit;                    // {h1,h2}
  var H1 = SPLIT.h1, H2 = SPLIT.h2;
  var Q_RANGE = [[0,2],[3,5],[6,8],[9,11]];     // Q1..Q4 month indices
  var QNAME = ["Q1","Q2","Q3","Q4"];

  function fmt(n) {
    if (n == null || isNaN(n)) return "–";
    return "Rp " + Math.round(n).toLocaleString("id-ID");
  }
  function fmtShort(n) {
    if (n == null || isNaN(n)) return "–";
    var a = Math.abs(n);
    if (a >= 1e9) return "Rp " + (n/1e9).toFixed(1) + " M";
    if (a >= 1e6) return "Rp " + (n/1e6).toFixed(1) + " jt";
    if (a >= 1e3) return "Rp " + (n/1e3).toFixed(0) + " rb";
    return "Rp " + Math.round(n);
  }
  function pct(a, t) { return (t && t > 0) ? (a / t) : null; }
  function pctStr(v) { return v == null ? "–" : (v * 100).toFixed(1) + "%"; }
  function achColor(v) {
    if (v == null) return "#93a2bb";
    if (v >= 1) return "#22c55e";
    if (v >= 0.8) return "#f59e0b";
    return "#ef4444";
  }
  function pill(v, txt) {
    return '<span class="pill" style="background:' + achColor(v) + '22;color:' +
      achColor(v) + '">' + (txt != null ? txt : pctStr(v)) + "</span>";
  }
  function sum(arr, a, b) {
    var s = 0; for (var i = a; i <= b; i++) s += (arr[i] || 0); return s;
  }
  function total(arr) { return sum(arr, 0, arr.length - 1); }

  // monthly target for one EPR (H1 months share/6, H2 months share/6)
  function monthlyTarget(K) {
    var out = [];
    for (var i = 0; i < 12; i++) out.push((i < 6 ? H1 : H2) * K / 6);
    return out;
  }
  function qTarget(K, qi) { return ((qi < 2) ? H1 : H2) * K / 2; }

  // ---------- chart ----------
  function chart(opts) {
    var W = opts.width || 940, H = opts.height || 330;
    var padL = 72, padR = 18, padT = 18, padB = 46;
    var n = MONTHS.length, band = (W - padL - padR) / n;
    var ymax = 0;
    opts.series.forEach(function (s) {
      s.values.forEach(function (v) { if (v != null && v > ymax) ymax = v; });
    });
    if (ymax <= 0) ymax = 1;
    ymax *= 1.12;
    var plotH = H - padT - padB;
    var xc = function (i) { return padL + band * i + band / 2; };
    var y = function (v) { return padT + plotH - (v / ymax) * plotH; };
    var svg = '<svg viewBox="0 0 ' + W + " " + H +
      '" width="100%" preserveAspectRatio="xMidYMid meet" font-family="Segoe UI,system-ui,sans-serif">';
    var steps = 4;
    for (var g = 0; g <= steps; g++) {
      var val = ymax * g / steps, yy = y(val);
      svg += '<line x1="' + padL + '" y1="' + yy + '" x2="' + (W - padR) + '" y2="' + yy +
        '" stroke="#26324a" stroke-width="1"/>';
      svg += '<text x="' + (padL - 8) + '" y="' + (yy + 4) + '" fill="#93a2bb" font-size="11" text-anchor="end">' +
        fmtShort(val) + "</text>";
    }
    MONTHS.forEach(function (lb, i) {
      svg += '<text x="' + xc(i) + '" y="' + (H - padB + 18) +
        '" fill="#93a2bb" font-size="10.5" text-anchor="middle">' + lb + "</text>";
    });
    opts.series.forEach(function (s) {
      if (s.type === "bar") {
        var bw = band * 0.62;
        s.values.forEach(function (v, i) {
          if (v == null) return;
          var yy = y(v), top = padT + plotH;
          svg += '<rect x="' + (xc(i) - bw / 2) + '" y="' + yy + '" width="' + bw +
            '" height="' + (top - yy) + '" fill="' + s.color + '" opacity="0.85">' +
            '<title>' + MONTHS[i] + ": " + fmt(v) + "</title></rect>";
        });
      } else {
        var pts = [];
        s.values.forEach(function (v, i) { if (v != null) pts.push([xc(i), y(v)]); });
        if (pts.length) {
          var d = pts.map(function (p, i) { return (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1); }).join(" ");
          svg += '<path d="' + d + '" fill="none" stroke="' + s.color + '" stroke-width="2.5"/>';
          pts.forEach(function (p) {
            svg += '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="3" fill="' + s.color + '"/>';
          });
        }
      }
    });
    svg += "</svg>";
    return svg;
  }

  // ---------- overview ----------
  function renderOverview() {
    document.getElementById("meta").textContent =
      "Di-generate: " + D.generated + "  ·  " + D.eprs.length +
      " EPR  ·  data Apr 2026 – Mar 2027  ·  (nama toko disamarkan)";

    var tRev = D.totalRev, K = D.totalTargetK;
    var h1Rev = sum(tRev, 0, 5), h2Rev = sum(tRev, 6, 11);
    var tgtMonthly = monthlyTarget(K);
    var kpis = [
      ["Target K (total)", fmt(K)],
      ["Revenue net (total)", fmt(total(tRev))],
      ["ACH FY", pill(pct(total(tRev), K))],
      ["ACH H1", pill(pct(h1Rev, H1 * K))],
      ["ACH H2", pill(pct(h2Rev, H2 * K))]
    ];
    document.getElementById("kpi").innerHTML = kpis.map(function (k) {
      return "<div>" + k[0] + "<b>" + k[1] + "</b></div>";
    }).join("");

    document.getElementById("totalChart").innerHTML = chart({
      series: [
        { type: "bar", color: "#3b82f6", values: tRev },
        { type: "line", color: "#f59e0b", values: tgtMonthly }
      ]
    });
    document.getElementById("totalLegend").innerHTML =
      '<span><i style="background:#3b82f6"></i>Revenue net per bulan</span>' +
      '<span><i style="background:#f59e0b"></i>Target bulanan (H1 52%÷6, H2 48%÷6)</span>';
  }

  // ---------- EPR table ----------
  var sortKey = "achFY", sortDir = -1, filterQ = "";
  function eprMetrics(e) {
    var K = e.targetK, rev = e.rev;
    var h1 = sum(rev, 0, 5), h2 = sum(rev, 6, 11), fy = total(rev);
    return {
      revFY: fy, revH1: h1, revH2: h2,
      achFY: pct(fy, K), achH1: pct(h1, H1 * K), achH2: pct(h2, H2 * K), K: K
    };
  }
  function visible() {
    var q = filterQ.toLowerCase();
    return D.eprs.filter(function (e) {
      if (!q) return true;
      return [e.code, e.city, e.category, e.am].join(" ").toLowerCase().indexOf(q) >= 0;
    });
  }
  function renderTable() {
    var rows = visible().map(function (e) {
      var m = eprMetrics(e); e._m = m; return e;
    });
    rows.sort(function (a, b) {
      var va = sortKey === "code" ? a.code : a._m[sortKey];
      var vb = sortKey === "code" ? b.code : b._m[sortKey];
      if (typeof va === "string") return va.localeCompare(vb) * sortDir;
      return ((va == null ? -1 : va) - (vb == null ? -1 : vb)) * sortDir;
    });
    document.getElementById("cnt").textContent = "(" + rows.length + " dari " + D.eprs.length + ")";
    var cols = [
      ["code", "Kode"], ["city", "Kota"], ["category", "Kategori"], ["am", "AM"],
      ["K", "Target K"], ["revFY", "Rev FY"], ["achFY", "ACH FY"],
      ["achH1", "ACH H1"], ["achH2", "ACH H2"]
    ];
    var head = "<tr>" + cols.map(function (c) {
      var arrow = sortKey === c[0] ? (sortDir < 0 ? " ▼" : " ▲") : "";
      return "<th data-k='" + c[0] + "'>" + c[1] + arrow + "</th>";
    }).join("") + "</tr>";
    var body = rows.map(function (e) {
      var m = e._m, w = m.achFY == null ? 0 : Math.min(m.achFY, 1.5) * 60;
      return "<tr data-code='" + e.code + "'>" +
        "<td>" + e.code + "</td><td>" + (e.city || "–") + "</td><td>" + (e.category || "–") +
        "</td><td>" + (e.am || "–") + "</td>" +
        "<td>" + fmt(m.K) + "</td><td>" + fmt(m.revFY) + "</td>" +
        "<td>" + pill(m.achFY) + "</td><td>" + pill(m.achH1) + "</td><td>" + pill(m.achH2) +
        '<span class="bar" style="width:60px;margin-left:6px"><i style="width:' + w +
        "px;background:" + achColor(m.achFY) + '"></i></span></td></tr>';
    }).join("");
    var tbl = document.getElementById("eprTable");
    tbl.innerHTML = head + body;
    Array.prototype.forEach.call(tbl.querySelectorAll("th"), function (th) {
      th.onclick = function () {
        var k = th.getAttribute("data-k");
        if (sortKey === k) sortDir *= -1; else { sortKey = k; sortDir = (k === "code") ? 1 : -1; }
        renderTable();
      };
    });
    Array.prototype.forEach.call(tbl.querySelectorAll("tr[data-code]"), function (tr) {
      tr.onclick = function () { showDrill(tr.getAttribute("data-code")); };
    });
  }

  // ---------- drilldown ----------
  function showDrill(code) {
    var e = D.eprs.filter(function (x) { return x.code === code; })[0];
    if (!e) return;
    var K = e.targetK, rev = e.rev, m = eprMetrics(e);
    document.getElementById("drill").style.display = "block";
    document.getElementById("drillTitle").textContent = "EPR " + e.code +
      (e.city ? " · " + e.city : "") + (e.category ? " · " + e.category : "") + (e.am ? " · AM " + e.am : "");
    document.getElementById("drillKpi").innerHTML = [
      ["Target K", fmt(K)], ["Rev FY", fmt(m.revFY)], ["ACH FY", pill(m.achFY)],
      ["ACH H1", pill(m.achH1)], ["ACH H2", pill(m.achH2)]
    ].map(function (k) { return "<div>" + k[0] + "<b>" + k[1] + "</b></div>"; }).join("");

    // monthly: bars = net revenue, line = monthly target, lines = per category
    var tgtMonthly = monthlyTarget(K);
    var catLines = CAT.map(function (c, i) {
      return { type: "line", color: ["#22c55e", "#a855f7", "#06b6d4", "#f97316"][i % 4], values: e.revByCat[c] };
    });
    document.getElementById("drillMonthly").innerHTML = chart({
      series: [{ type: "bar", color: "#3b82f6", values: rev }].concat(
        [{ type: "line", color: "#f59e0b", values: tgtMonthly }], catLines)
    });

    // quarter table
    var qh = "<tr><th>Q</th><th>Actual</th><th>Target</th><th>ACH</th></tr>";
    Q_RANGE.forEach(function (r, qi) {
      var act = sum(rev, r[0], r[1]), tg = qTarget(K, qi), a = pct(act, tg);
      qh += "<tr><td>" + QNAME[qi] + "</td><td>" + fmt(act) + "</td><td>" + fmt(tg) +
        "</td><td>" + pill(a) + "</td></tr>";
    });
    document.getElementById("drillQ").innerHTML = qh;

    // half table
    var hh = "<tr><th>Semester</th><th>Actual</th><th>Target</th><th>ACH</th></tr>";
    [["H1", 0, 5, H1], ["H2", 6, 11, H2]].forEach(function (p) {
      var act = sum(rev, p[1], p[2]), tg = p[3] * K, a = pct(act, tg);
      hh += "<tr><td>" + p[0] + "</td><td>" + fmt(act) + "</td><td>" + fmt(tg) +
        "</td><td>" + pill(a) + "</td></tr>";
    });
    document.getElementById("drillH").innerHTML = hh;

    // category totals (horizontal bars)
    var maxc = 0; CAT.forEach(function (c) { var s = total(e.revByCat[c]); if (s > maxc) maxc = s; });
    document.getElementById("drillCat").innerHTML = CAT.map(function (c, i) {
      var s = total(e.revByCat[c]), w = maxc > 0 ? (s / maxc * 100) : 0;
      return "<div class='row' style='margin:4px 0'><span style='width:110px'>" + c +
        "</span><span class='bar' style='width:60%'><i style='width:" + w +
        "%;background:" + ["#22c55e", "#a855f7", "#06b6d4", "#f97316"][i % 4] +
        "'></i></span><span class='muted'>" + fmt(s) + "</span></div>";
    }).join("");

    document.getElementById("drill").scrollIntoView({ behavior: "smooth" });
  }

  // ---------- wire up ----------
  document.getElementById("search").addEventListener("input", function (e) {
    filterQ = e.target.value; renderTable();
  });
  document.getElementById("back").addEventListener("click", function () {
    document.getElementById("drill").style.display = "none";
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  renderOverview();
  renderTable();
})();
