/* 공통 스크립트: 머리글·바닥글, 숫자 표시, 페이지별 화면 구성 */
(function () {
  "use strict";

  var S = window.SITE;
  var O = S.office;
  var PY = 0.3025; // 1㎡ = 0.3025평

  /* ---------- 숫자·표시 도우미 ---------- */
  function comma(n, d) {
    return Number(n).toLocaleString("ko-KR", { maximumFractionDigits: d == null ? 0 : d, minimumFractionDigits: d || 0 });
  }
  // 만원 → "72억" / "72억 5,000만원"
  function won(man) {
    if (man == null) return pending();
    var neg = man < 0; man = Math.abs(Math.round(man));
    var eok = Math.floor(man / 10000), rest = man % 10000, s;
    if (eok && rest) s = comma(eok) + "억 " + comma(rest) + "만원";
    else if (eok) s = comma(eok) + "억 원";
    else s = comma(rest) + "만원";
    return (neg ? "-" : "") + s;
  }
  function py(m2) { return m2 * PY; }
  function area(m2) {
    if (m2 == null) return pending();
    return comma(m2, 1) + "㎡ <span class=\"muted\">(" + comma(py(m2), 1) + "평)</span>";
  }
  function pending() { return "<span class=\"pending\">확인 중</span>"; }
  function val(x, suffix) { return x == null || x === "" ? pending() : esc(x) + (suffix || ""); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
    });
  }
  function perPy(b) { return b.price / py(b.building.grossArea); } // 연면적 평단가(만원)
  function yieldPct(b) {
    var inc = b.income; if (!inc || !inc.monthlyRent) return 0;
    return inc.monthlyRent * 12 / (b.price - inc.deposit) * 100;
  }
  function findBrief(id) { return S.briefs.filter(function (b) { return b.id === id; })[0]; }
  function param(k) { return new URLSearchParams(location.search).get(k); }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function store(k, v) {
    try {
      if (v === undefined) return JSON.parse(localStorage.getItem(k) || "null");
      localStorage.setItem(k, JSON.stringify(v));
    } catch (e) { return null; }
  }

  /* ---------- 공통 머리글·바닥글 ---------- */
  function layout() {
    var page = document.body.dataset.page;
    var nav = [
      ["index", "index.html", "홈"],
      ["briefs", "briefs.html", "매물 브리핑"],
      ["contact-sell", "contact.html?type=sell", "매도 의뢰"],
    ];
    var links = nav.map(function (n) {
      var cur = page === n[0] || (page === "brief" && n[0] === "briefs");
      return "<a href=\"" + n[1] + "\"" + (cur ? " aria-current=\"page\"" : "") + ">" + n[2] + "</a>";
    }).join("");

    document.body.insertAdjacentHTML("afterbegin",
      "<div class=\"demo-bar\"><strong>예시 사이트</strong> · 매물과 시장 수치는 모두 가상의 예시 데이터입니다.</div>" +
      "<header class=\"site-header\"><div class=\"wrap\">" +
      "<a class=\"brand\" href=\"index.html\"><b>" + esc(O.shortName) + "</b><span>50억~100억 중소기업 사옥 매수·매도</span></a>" +
      "<button class=\"nav-toggle\" aria-expanded=\"false\" aria-controls=\"nav\">메뉴</button>" +
      "<nav class=\"nav\" id=\"nav\">" + links + "<a class=\"btn sm\" href=\"contact.html?type=buy\">브리핑 미팅 요청</a></nav>" +
      "</div></header>");

    document.body.insertAdjacentHTML("beforeend",
      "<footer class=\"site-footer\"><div class=\"wrap\">" +
      "<div><b>" + esc(O.name) + "</b><br>" +
      "대표 공인중개사 " + esc(O.ceo) + " · 중개사무소 등록번호 " + esc(O.regNo) + " · 사업자등록번호 " + esc(O.bizNo) + "<br>" +
      esc(O.address) + "<br>" +
      "전화 " + esc(O.phone) + " · 이메일 " + esc(O.email) + " · " + esc(O.hours) + "</div>" +
      "<div><a href=\"briefs.html\">매물 브리핑</a><br><a href=\"contact.html?type=buy\">매수 브리핑 요청</a><br>" +
      "<a href=\"contact.html?type=sell\">매도 의뢰</a><br><a href=\"privacy.html\">개인정보처리방침</a></div>" +
      "<p class=\"disclaimer\">이 사이트의 매물·시장 수치는 예시이며 실제 매물이 아닙니다. 세금·대출 계산은 참고용 추정치로, 실제 금액은 세무사·금융기관 확인이 필요합니다. " +
      "매물 정보는 거래 전 건축물대장·등기사항전부증명서 등 공적 서류로 반드시 확인하십시오.</p>" +
      "</div></footer>");

    var t = $(".nav-toggle"), n = $("#nav");
    t.addEventListener("click", function () {
      var open = n.classList.toggle("open");
      t.setAttribute("aria-expanded", open);
    });
  }

  /* ---------- 브리핑 카드 ---------- */
  function card(b, withCompare) {
    var bd = b.building;
    return "<article class=\"brief-card\">" +
      "<div class=\"cover\" style=\"background:" + b.photoTone + "\">" +
      "<div class=\"code\">BRIEF " + esc(b.id) + " · " + esc(b.region) + "</div>" +
      "<div class=\"price num\">" + won(b.price) + "</div></div>" +
      "<div class=\"body\">" +
      "<div><span class=\"badge" + (b.status === "협의 중" ? " hold" : "") + "\">" + esc(b.status) + "</span></div>" +
      "<h3><a href=\"brief.html?id=" + encodeURIComponent(b.id) + "\">" + esc(b.title) + "</a></h3>" +
      "<p class=\"small muted\" style=\"margin:0\">" + esc(b.headline) + "</p>" +
      "<div class=\"kv num\">" +
      "<div><span>연면적</span>" + comma(py(bd.grossArea), 0) + "평</div>" +
      "<div><span>규모</span>B" + bd.floorsBelow + "/" + bd.floorsAbove + "F</div>" +
      "<div><span>평단가</span>" + comma(perPy(b), 0) + "만</div>" +
      "</div></div>" +
      "<div class=\"foot\">" +
      (withCompare ? "<label class=\"check\"><input type=\"checkbox\" data-compare=\"" + esc(b.id) + "\"> 비교 담기</label>" : "<span class=\"small muted\">" + esc(b.transit.split(" / ")[0]) + "</span>") +
      "<a class=\"btn sm ghost\" href=\"brief.html?id=" + encodeURIComponent(b.id) + "\">브리핑 보기</a>" +
      "</div></article>";
  }

  /* ---------- 홈 ---------- */
  function pageIndex() {
    var prices = S.briefs.map(function (b) { return b.price; });
    $("#hero-meta").innerHTML =
      "<div><b class=\"num\">" + S.briefs.length + "건</b><span>현재 브리핑 가능한 사옥 매물 (예시)</span></div>" +
      "<div><b class=\"num\">" + Math.round(Math.min.apply(null, prices) / 10000) + "억 ~ " + Math.round(Math.max.apply(null, prices) / 10000) + "억</b><span>매매가 범위</span></div>" +
      "<div><b>A4 1장</b><span>매물마다 인쇄용 브리핑 시트 제공</span></div>";

    $("#market-asof").textContent = S.market.asOf;
    $("#market-stats").innerHTML = S.market.stats.map(function (s) {
      return "<div class=\"card stat\"><b class=\"num\">" + esc(s.value) + "</b><div class=\"label\">" + esc(s.label) + "</div><div class=\"small muted\">" + esc(s.note) + "</div></div>";
    }).join("");
    $("#market-regions").innerHTML = S.market.regions.map(function (r) {
      var cls = r.trend.charAt(0) === "-" ? "down" : "up";
      var count = S.briefs.filter(function (b) { return b.area === r.name; }).length;
      return "<tr><td>" + esc(r.name) + "</td><td class=\"r num\">" + comma(r.price) + "만원</td><td class=\"r num " + cls + "\">" + esc(r.trend) + "</td>" +
        "<td class=\"r\">" + (count ? "<a href=\"briefs.html?area=" + encodeURIComponent(r.name) + "\">" + count + "건 보기</a>" : "-") + "</td></tr>";
    }).join("");

    $("#featured").innerHTML = S.briefs.filter(function (b) { return b.status !== "협의 중"; }).slice(0, 3).map(function (b) { return card(b, false); }).join("");
  }

  /* ---------- 브리핑 목록 + 비교 ---------- */
  var MAX_COMPARE = 3;
  function pageBriefs() {
    var areaSel = $("#f-area");
    var areas = [];
    S.briefs.forEach(function (b) { if (areas.indexOf(b.area) < 0) areas.push(b.area); });
    areaSel.innerHTML = "<option value=\"\">전체 지역</option>" + areas.map(function (a) { return "<option>" + esc(a) + "</option>"; }).join("");
    if (param("area")) areaSel.value = param("area");

    var picked = (store("ob-compare") || []).filter(findBrief);

    function render() {
      var a = areaSel.value, p = $("#f-price").value, g = $("#f-gross").value, sort = $("#f-sort").value;
      var list = S.briefs.filter(function (b) {
        var gp = py(b.building.grossArea);
        if (a && b.area !== a) return false;
        if (p === "lt70" && b.price >= 700000) return false;
        if (p === "70-85" && (b.price < 700000 || b.price >= 850000)) return false;
        if (p === "ge85" && b.price < 850000) return false;
        if (g === "lt300" && gp >= 300) return false;
        if (g === "300-500" && (gp < 300 || gp >= 500)) return false;
        if (g === "ge500" && gp < 500) return false;
        return true;
      });
      list.sort(function (x, y) {
        if (sort === "price-desc") return y.price - x.price;
        if (sort === "perpy") return perPy(x) - perPy(y);
        if (sort === "gross") return y.building.grossArea - x.building.grossArea;
        return x.price - y.price;
      });
      $("#count").textContent = list.length;
      $("#list").innerHTML = list.length ? list.map(function (b) { return card(b, true); }).join("")
        : "<p class=\"muted\">조건에 맞는 매물이 없습니다. 조건을 넓히거나 <a href=\"contact.html?type=buy\">맞춤 브리핑을 요청</a>해 주세요.</p>";
      $$("[data-compare]").forEach(function (c) {
        c.checked = picked.indexOf(c.dataset.compare) >= 0;
        c.addEventListener("change", function () {
          var id = c.dataset.compare;
          if (c.checked) {
            if (picked.length >= MAX_COMPARE) { c.checked = false; alert("비교는 최대 " + MAX_COMPARE + "건까지 담을 수 있습니다."); return; }
            picked.push(id);
          } else picked = picked.filter(function (x) { return x !== id; });
          store("ob-compare", picked);
          bar();
        });
      });
    }

    function bar() {
      var el = $("#compare-bar");
      el.classList.toggle("show", picked.length > 0);
      $("#compare-names").textContent = picked.length + "건 선택: " + picked.join(", ");
      $("#compare-go").disabled = picked.length < 2;
      $("#compare-go").textContent = picked.length < 2 ? "2건 이상 담으세요" : "비교표 보기";
      if (!$("#compare").hidden) table();
    }

    function table() {
      var bs = picked.map(findBrief);
      var sec = $("#compare");
      if (bs.length < 2) { sec.hidden = true; return; }
      var rows = [
        ["매매가", function (b) { return won(b.price); }],
        ["지역", function (b) { return esc(b.region + " · " + b.area); }],
        ["연면적", function (b) { return area(b.building.grossArea); }],
        ["대지면적", function (b) { return area(b.building.landArea); }],
        ["연면적 평단가", function (b) { return comma(perPy(b)) + "만원"; }],
        ["규모", function (b) { return "지하 " + b.building.floorsBelow + "층 / 지상 " + b.building.floorsAbove + "층"; }],
        ["주용도", function (b) { return val(b.building.mainUse); }],
        ["용도지역", function (b) { return val(b.building.zoning); }],
        ["사용승인", function (b) { return val(b.building.approved); }],
        ["주차", function (b) { return val(b.building.parking); }],
        ["승강기", function (b) { return val(b.building.elevators); }],
        ["현 임대 수익률", function (b) { var y = yieldPct(b); return y ? comma(y, 2) + "%" : "임대 수입 없음"; }],
        ["입주 가능", function (b) { return val(b.moveIn); }],
        ["교통", function (b) { return val(b.transit); }],
      ];
      $("#compare-table").innerHTML =
        "<thead><tr><th>항목</th>" + bs.map(function (b) { return "<th><a href=\"brief.html?id=" + encodeURIComponent(b.id) + "\">" + esc(b.id) + "</a><br><span class=\"small muted\">" + esc(b.title) + "</span></th>"; }).join("") + "</tr></thead>" +
        "<tbody>" + rows.map(function (r) { return "<tr><th>" + r[0] + "</th>" + bs.map(function (b) { return "<td class=\"num\">" + r[1](b) + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody>";
      sec.hidden = false;
    }

    $$("#filters select").forEach(function (s) { s.addEventListener("change", render); });
    $("#compare-go").addEventListener("click", function () { table(); $("#compare").scrollIntoView({ behavior: "smooth" }); });
    $("#compare-clear").addEventListener("click", function () { picked = []; store("ob-compare", picked); $("#compare").hidden = true; render(); bar(); });
    $("#compare-print").addEventListener("click", function () { window.print(); });
    render(); bar();
  }

  /* ---------- 브리핑 시트 ---------- */
  function pageBrief() {
    var b = findBrief(param("id")) || S.briefs[0];
    var bd = b.building;
    document.title = b.title + " | " + O.shortName;
    var y = yieldPct(b);

    $("#sheet").innerHTML =
      "<div class=\"sheet-head\"><div class=\"wrap\">" +
      "<div class=\"crumbs\"><a href=\"index.html\">홈</a> › <a href=\"briefs.html\">매물 브리핑</a> › " + esc(b.id) + "</div>" +
      "<div class=\"row\"><div><div class=\"eyebrow\">Investment Brief · " + esc(b.id) + " · 예시</div>" +
      "<h1 style=\"margin:0 0 6px\">" + esc(b.title) + "</h1><div class=\"muted\">" + esc(b.address) + " · " + esc(b.deal) + "</div></div>" +
      "<div class=\"price num\">" + won(b.price) + "<small>연면적 3.3㎡당 " + comma(perPy(b)) + "만원</small></div></div>" +
      "</div></div>" +

      "<div class=\"wrap\">" +
      "<div class=\"metrics num\">" +
      "<div><span>연면적</span><b>" + comma(py(bd.grossArea), 1) + "평</b></div>" +
      "<div><span>대지면적</span><b>" + comma(py(bd.landArea), 1) + "평</b></div>" +
      "<div><span>규모</span><b>B" + bd.floorsBelow + " / " + bd.floorsAbove + "F</b></div>" +
      "<div><span>사용승인</span><b>" + val(bd.approved) + "</b></div>" +
      "<div><span>주차</span><b>" + val(bd.parking.split(" ")[0]) + "</b></div>" +
      "<div><span>현 임대 수익률</span><b>" + (y ? comma(y, 2) + "%" : "공실") + "</b></div>" +
      "</div>" +

      "<div class=\"no-print\" style=\"display:flex;gap:8px;flex-wrap:wrap;margin-top:16px\">" +
      "<a class=\"btn\" href=\"contact.html?type=buy&id=" + encodeURIComponent(b.id) + "\">이 매물 브리핑 미팅 요청</a>" +
      "<button class=\"btn ghost\" id=\"print\">브리핑 시트 인쇄 / PDF 저장</button></div>" +

      "<section><h2>브리핑 요약</h2><p style=\"font-size:1.05rem\">" + esc(b.headline) + "</p>" +
      "<div class=\"two-col\"><div class=\"card\"><h3>투자 포인트</h3><ul class=\"list-pos\">" + b.points.map(function (p) { return "<li>" + esc(p) + "</li>"; }).join("") + "</ul></div>" +
      "<div class=\"card\"><h3>검토 필요 사항</h3><ul class=\"list-neg\">" + b.risks.map(function (p) { return "<li>" + esc(p) + "</li>"; }).join("") + "</ul></div></div></section>" +

      "<section><h2>건축물 개요</h2><dl class=\"spec\">" +
      spec("소재지", esc(b.address)) + spec("도로명주소", esc(b.roadAddress)) +
      spec("주용도", val(bd.mainUse)) + spec("주구조", val(bd.structure)) +
      spec("층수", "지하 " + bd.floorsBelow + "층 / 지상 " + bd.floorsAbove + "층") + spec("사용승인일", val(bd.approved)) +
      spec("대지면적", area(bd.landArea)) + spec("건축면적", area(bd.buildingArea)) +
      spec("연면적", area(bd.grossArea)) + spec("건폐율 / 용적률", val(bd.bcr, "%") + " / " + val(bd.far, "%")) +
      spec("용도지역", val(bd.zoning)) + spec("개별공시지가", bd.landPrice == null ? pending() : comma(bd.landPrice) + "만원/㎡") +
      spec("승강기", val(bd.elevators)) + spec("주차", val(bd.parking)) +
      spec("내진설계", val(bd.quake)) + spec("위반건축물", val(bd.violation)) +
      "</dl></section>" +

      "<section><h2>층별 현황</h2><div class=\"table-wrap\"><table class=\"num\"><thead><tr><th>층</th><th>용도</th><th class=\"r\">면적(㎡)</th><th class=\"r\">면적(평)</th><th>사용 현황</th></tr></thead><tbody>" +
      b.floors.map(function (f) {
        return "<tr><td>" + esc(f.floor) + "</td><td>" + esc(f.use) + "</td><td class=\"r\">" + comma(f.area, 1) + "</td><td class=\"r\">" + comma(py(f.area), 1) + "</td><td>" + esc(f.tenant) + "</td></tr>";
      }).join("") +
      "</tbody></table></div>" +
      "<p class=\"small muted\" style=\"margin-top:8px\">현재 임대: 보증금 " + won(b.income.deposit) + " · 월 임대료 " + won(b.income.monthlyRent) +
      " · 월 관리비 수입 " + (b.mgmtFee == null ? "확인 중" : comma(b.mgmtFee) + "원") + (y ? " · 연 수익률 " + comma(y, 2) + "% (월세×12 ÷ (매매가−보증금))" : "") + "</p></section>" +

      "<section><h2>자금 계획 시뮬레이션</h2><div class=\"calc\">" +
      "<div class=\"card inputs\">" +
      inp("c-price", "매입가 (만원)", b.price, "브리핑 가격 기준, 협상가로 바꿔 보세요") +
      inp("c-ltv", "대출 비율 LTV (%)", 60, "법인 사옥 담보대출 통상 50~70%") +
      inp("c-rate", "대출 금리 (연 %)", 4.5, "") +
      inp("c-tax", "취득세 등 (%)", 4.6, "비주거 기본: 취득세 4% + 지방교육세 0.4% + 농특세 0.2%") +
      inp("c-fee", "중개보수 (%)", 0.9, "비주택 법정 상한 0.9% 이내 협의") +
      inp("c-etc", "기타 부대비용 (%)", 0.3, "법무사·감정평가·인지세 등") +
      "</div><div class=\"card\" id=\"c-out\"></div></div></section>" +

      "<section><h2>매입 vs 임차 비교 (연간 비용)</h2><div class=\"calc\">" +
      "<div class=\"card inputs\">" +
      inp("r-rent", "같은 면적 임차 시 월 임대료+관리비 (만원)", Math.round(py(bd.grossArea) * 6 / 10) * 10, "기본값: 연면적 평당 월 6만원 가정") +
      inp("r-opp", "자기자본 기회비용 (연 %)", 3.0, "예금·운용 시 기대 수익률") +
      "<label class=\"check\" style=\"flex-direction:row\"><input type=\"checkbox\" id=\"r-keep\"" + (b.income.monthlyRent ? "" : " disabled") + " style=\"width:auto\"> 기존 임차인 유지 (임대 수입 반영)</label>" +
      "<span class=\"hint small muted\">체크하면 회사가 쓰는 면적이 줄어드니, 위 임차 비용도 실제 쓸 면적 기준으로 바꿔 넣으세요.</span>" +
      "</div><div class=\"card\" id=\"r-out\"></div></div>" +
      "<p class=\"note\">보유세(재산세·종부세), 감가상각 비용 처리, 자산가치 상승·하락, 수선비는 반영하지 않은 단순 비교입니다. 투자·세무 판단은 전문가와 상의하십시오.</p></section>" +

      "<section><div class=\"two-col\">" +
      "<div class=\"card\"><h2>위치·교통</h2><p>" + esc(b.transit) + "</p><p class=\"small muted\">정확한 지번은 비밀유지 확인 후 미팅에서 안내합니다.</p></div>" +
      "<div class=\"card\"><h2>확인 서류 (미팅 시 제공)</h2><ul class=\"small\" style=\"margin:0;padding-left:18px\">" +
      "<li>건축물대장 (표제부·전유부)</li><li>토지대장 · 지적도</li><li>등기사항전부증명서 (토지·건물)</li><li>토지이용계획확인원</li><li>임대차 현황표 · 관리비 내역</li></ul></div>" +
      "</div></section>" +

      "<section><h2>표시·광고 명시사항</h2><dl class=\"spec\">" +
      spec("중개사무소", esc(O.name)) + spec("등록번호", esc(O.regNo)) +
      spec("소재지", esc(O.address)) + spec("연락처", esc(O.phone)) +
      spec("대표 공인중개사", esc(O.ceo)) + spec("매물 종류", "건물 (" + esc(bd.mainUse) + ")") +
      spec("소재지", esc(b.address)) + spec("면적", "대지 " + area(bd.landArea) + " · 연면적 " + area(bd.grossArea)) +
      spec("가격 / 거래형태", won(b.price) + " / " + esc(b.deal)) + spec("총 층수", "지하 " + bd.floorsBelow + "층 / 지상 " + bd.floorsAbove + "층") +
      spec("사용승인일", val(bd.approved)) + spec("주차대수", val(bd.parking)) +
      spec("입주 가능일", val(b.moveIn)) + spec("관리비", b.mgmtFee == null ? pending() : "월 " + comma(b.mgmtFee) + "원 (건물 전체)") +
      "</dl><p class=\"note\">이 브리핑의 매물은 가상의 예시입니다. 실제 거래 시 공적 서류로 모든 사항을 확인하십시오.</p></section>" +

      "<p class=\"print-only small muted\" style=\"margin-top:16px\">" + esc(O.name) + " · " + esc(O.phone) + " · " + esc(O.email) + "</p>" +
      "</div>";

    $("#print").addEventListener("click", function () { window.print(); });
    $$(".calc input").forEach(function (i) { i.addEventListener("input", calc); });
    calc();

    function calc() {
      var n = function (id) { var v = parseFloat($("#" + id).value); return isNaN(v) ? 0 : v; };
      var price = n("c-price"), loan = price * n("c-ltv") / 100;
      var tax = price * n("c-tax") / 100, fee = price * n("c-fee") / 100, etc = price * n("c-etc") / 100;
      var equity = price - loan + tax + fee + etc;
      var yearInt = loan * n("c-rate") / 100;
      $("#c-out").innerHTML =
        row("매입가", won(price)) + row("대출금", won(loan)) +
        row("취득세 등", won(tax)) + row("중개보수 (상한)", won(fee)) + row("기타 부대비용", won(etc)) +
        row("필요 자기자본", won(equity), "total") +
        row("월 대출 이자 (이자만 상환)", won(yearInt / 12), "hl") + row("연 대출 이자", won(yearInt)) +
        "<p class=\"note\">과밀억제권역 내 설립 5년 미만 법인 등은 취득세가 중과될 수 있습니다. 중과 여부는 세무사 확인이 필요합니다.</p>";

      var rentYear = n("r-rent") * 12;
      var incYear = $("#r-keep").checked ? b.income.monthlyRent * 12 : 0;
      var oppYear = equity * n("r-opp") / 100;
      var ownYear = yearInt + oppYear - incYear;
      var diff = rentYear - ownYear;
      $("#r-out").innerHTML =
        "<h3>매입 시 연간 실질 부담</h3>" +
        row("대출 이자", won(yearInt)) + row("자기자본 기회비용", won(oppYear)) +
        (incYear ? row("기존 임대 수입 (차감)", "-" + won(incYear)) : "") +
        row("합계", won(ownYear), "total") +
        "<h3 style=\"margin-top:16px\">임차 시 연간 비용</h3>" + row("임대료+관리비 × 12", won(rentYear), "total") +
        "<div class=\"verdict\">" + (diff >= 0
          ? "매입이 연간 약 <b>" + won(diff) + "</b> 유리합니다 (단순 비교)."
          : "임차가 연간 약 <b>" + won(-diff) + "</b> 유리합니다 (단순 비교). 자산가치 상승을 기대한다면 장기 관점의 검토가 필요합니다.") + "</div>";
    }
  }
  function spec(k, v) { return "<div><dt>" + k + "</dt><dd>" + v + "</dd></div>"; }
  function inp(id, label, v, hint) {
    return "<label for=\"" + id + "\">" + label + (hint ? " <span class=\"hint\">" + hint + "</span>" : "") +
      "<input id=\"" + id + "\" type=\"number\" inputmode=\"decimal\" step=\"any\" min=\"0\" value=\"" + v + "\"></label>";
  }
  function row(k, v, cls) { return "<div class=\"result-row num " + (cls || "") + "\"><span>" + k + "</span><b>" + v + "</b></div>"; }

  /* ---------- 문의 폼 (화면만, 전송하지 않음) ---------- */
  function pageContact() {
    var type = param("type") === "sell" ? "sell" : "buy";

    var sel = $("#buy-interest");
    sel.innerHTML = "<option value=\"\">선택 안 함 (맞춤 추천 요청)</option>" + S.briefs.map(function (b) {
      return "<option value=\"" + esc(b.id) + "\">" + esc(b.id + " · " + b.title + " (" + won(b.price) + ")") + "</option>";
    }).join("");
    if (param("id") && findBrief(param("id"))) sel.value = param("id");
    $("#office-contact").textContent = O.phone + " / " + O.email;

    function show(t) {
      $$(".tabs button").forEach(function (btn) { btn.setAttribute("aria-selected", btn.dataset.tab === t); });
      $$("form[data-form]").forEach(function (f) { f.hidden = f.dataset.form !== t; });
      $$(".nav a").forEach(function (a) { a.removeAttribute("aria-current"); });
      if (t === "sell") { var a = $(".nav a[href='contact.html?type=sell']"); if (a) a.setAttribute("aria-current", "page"); }
      $("#done").hidden = true;
    }
    $$(".tabs button").forEach(function (btn) {
      btn.addEventListener("click", function () {
        show(btn.dataset.tab);
        history.replaceState(null, "", "contact.html?type=" + btn.dataset.tab);
      });
    });
    show(type);

    $$("form[data-form]").forEach(function (f) {
      f.addEventListener("submit", function (e) {
        e.preventDefault();
        if (f.querySelector(".hp input").value) return; // 스팸 방지 숨은 칸
        var ok = true, first = null;
        $$(".field", f).forEach(function (fd) {
          var input = fd.querySelector("input, select, textarea");
          var err = fd.querySelector(".err");
          if (!input || !err) return;
          var msg = "";
          if (input.required && !input.value.trim()) msg = "필수 항목입니다.";
          else if (input.type === "email" && input.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value)) msg = "이메일 형식을 확인해 주세요.";
          else if (input.type === "tel" && input.value && !/^[0-9\-+\s()]{9,}$/.test(input.value)) msg = "연락처 형식을 확인해 주세요.";
          fd.classList.toggle("invalid", !!msg);
          err.textContent = msg;
          if (msg) { ok = false; first = first || input; }
        });
        var consent = f.querySelector("[name=consent]");
        var cErr = f.querySelector(".consent-err");
        cErr.textContent = consent.checked ? "" : "개인정보 수집·이용에 동의해 주세요.";
        if (!consent.checked) { ok = false; first = first || consent; }
        if (!ok) { first.focus(); return; }

        var d = $("#done");
        d.innerHTML = "<b>입력 확인 완료 — 실제로 전송되지는 않았습니다.</b><br>이 사이트는 접수 화면 시연용입니다. 실제 상담은 " + esc(O.phone) + " 또는 " + esc(O.email) + "로 연락해 주세요.";
        d.hidden = false;
        d.scrollIntoView({ behavior: "smooth", block: "center" });
        f.reset();
        if (f.dataset.form === "buy" && param("id")) sel.value = param("id");
      });
    });
  }

  function pagePrivacy() {
    $$("[data-office]").forEach(function (el) { el.textContent = O[el.dataset.office]; });
  }

  /* ---------- 시작 ---------- */
  layout();
  var pages = { index: pageIndex, briefs: pageBriefs, brief: pageBrief, contact: pageContact, privacy: pagePrivacy };
  var fn = pages[document.body.dataset.page];
  if (fn) fn();
})();
