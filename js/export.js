// ════════════════════════════════════════════════════════════════
// EXPORT — Excel templates, GAS code, full HTML snapshot
// ════════════════════════════════════════════════════════════════

function downloadTemplate(slot){
  const templates=[
    {name:'template_contacts.xlsx',rows:[
      ['Name','Status','Register Date','Phone No','Gender','Tier','Points balance'],
      ['ตัวอย่าง สมาชิก','ACTIVE','2025-04-15 09:00:00','0812345678','FEMALE','Bronze','0'],
      ['อีกตัวอย่าง','ACTIVE','2025-05-01 10:00:00','0898765432','MALE','Silver','500'],
    ]},
    {name:'template_point_report.xlsx',rows:[
      ['Date & time','Member name','Member tel','Point type','Points collected','Sale amount (THB)','Source','Channel','Sub channel'],
      ['2025-04-15 10:30:00','ตัวอย่าง สมาชิก','0812345678','GIVEN','10','500','Third Party','shopee','My Shop'],
      ['2025-04-16 14:00:00','สมาชิก ทดสอบ','0898765432','GIVEN','5','250','Third Party','tiktok','My Shop'],
      ['2025-04-17 09:00:00','ใหม่ สมาชิก','0871234567','GIVEN','1000','0','Welcome Point','',''],
      ['2025-04-20 15:00:00','ตัวอย่าง สมาชิก','0812345678','REDEEMED','-100','0','Redemption','',''],
    ]},
    {name:'template_redemptions.xlsx',rows:[
      ['Date & time','Reward name','Reward code','Points used','Member name','Member tel'],
      ['15/04/2025 10:00','ของรางวัล A','CODE001','100','ตัวอย่าง สมาชิก','0812345678'],
      ['20/04/2025 14:30','ของรางวัล B','CODE002','200','สมาชิก ทดสอบ','0898765432'],
    ]},
  ];
  const t=templates[slot];
  const ws=XLSX.utils.aoa_to_sheet(t.rows);
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Template');
  XLSX.writeFile(wb,t.name);
}

function copyGasCode(){
  const code=`// ════ Google Apps Script — Loyalty Dashboard v2 (Read + Write + Backup) ════
// 1. เปิด Google Sheet → Extensions → Apps Script
// 2. วาง code ทั้งหมด → Run "setupSheets" ครั้งแรก → สร้าง Sheets อัตโนมัติ
// 3. Deploy → New Deployment → Web App → Execute as: Me, Access: Anyone → Copy URL
// 4. ทุกครั้งที่แก้ code ต้อง Deploy version ใหม่เพื่ออัปเดต

const SHEET_HEADERS = {
  "contacts":     ["Name","Status","Register Date","Phone No","Gender","Tier","Points balance"],
  "Point Report": ["Date & time","Member name","Member tel","Point type","Points collected","Sale amount (THB)","Source","Channel","Sub channel"],
  "Redemptions":  ["Date & time","Reward name","Reward code","Points used","Member name","Member tel"]
};

function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.entries(SHEET_HEADERS).forEach(([name, headers]) => {
    let sh = ss.getSheetByName(name);
    if (!sh) { sh = ss.insertSheet(name); }
    if (sh.getLastRow() === 0) {
      sh.appendRow(headers);
      sh.getRange(1,1,1,headers.length).setFontWeight("bold").setBackground("#004EE6").setFontColor("#ffffff");
      sh.setFrozenRows(1);
    }
  });
  SpreadsheetApp.getUi().alert("✅ สร้าง Sheets สำเร็จ!");
}

// GET: read data only
function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return jsonOut({
    contacts:    getData(ss, "contacts"),
    pointReport: getData(ss, "Point Report"),
    redemptions: getData(ss, "Redemptions"),
    exportedAt:  new Date().toISOString()
  });
}

// POST: batch replace / insert / delete — ข้อมูลส่งใน request body (ไม่ใช่ URL)
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (body.action === "batch_replace") {
      const sh = ss.getSheetByName(body.sheet);
      if (!sh) return jsonOut({success:false, error:"Sheet not found: " + body.sheet});
      const rows = body.rows || [];
      sh.clearContents();
      if (rows.length === 0) return jsonOut({success:true, inserted:0});
      const headers = Object.keys(rows[0]);
      const values = [headers, ...rows.map(r => headers.map(h => r[h] !== undefined ? String(r[h]) : ""))];
      sh.getRange(1, 1, values.length, headers.length).setValues(values);
      sh.getRange(1,1,1,headers.length).setFontWeight("bold").setBackground("#004EE6").setFontColor("#ffffff");
      sh.setFrozenRows(1);
      return jsonOut({success:true, inserted:rows.length, sheet:body.sheet});
    }
    if (body.action === "insert") {
      const sh = ss.getSheetByName(body.sheet);
      if (!sh) return jsonOut({success:false, error:"Sheet not found"});
      const data = body.data || {};
      const headers = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];
      sh.appendRow(headers.map(h => data[h] !== undefined ? data[h] : ""));
      return jsonOut({success:true, insertedAt:new Date().toISOString()});
    }
    if (body.action === "delete") {
      const sh = ss.getSheetByName(body.sheet);
      if (!sh) return jsonOut({success:false, error:"Sheet not found"});
      sh.deleteRow(parseInt(body.rowId) + 2);
      return jsonOut({success:true});
    }
  } catch(err) {
    return jsonOut({success:false, error:err.message});
  }
  return jsonOut({error:"Unknown action"});
}

function getData(ss, sheetName) {
  const sh = ss.getSheetByName(sheetName);
  if (!sh || sh.getLastRow() < 2) return [];
  const rows = sh.getDataRange().getValues();
  const headers = rows[0];
  return rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((h,i) => { if(h) obj[h] = row[i]; });
    return obj;
  }).filter(r => Object.values(r).some(v => v !== ""));
}

function jsonOut(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}`;
  navigator.clipboard.writeText(code).then(()=>{
    const btn=event.target;
    btn.textContent='คัดลอกแล้ว';
    setTimeout(()=>{btn.innerHTML='<i data-lucide="clipboard" class="icon-sm"></i> คัดลอก';refreshIcons();},2000);
  });
}

// ════════════════════════════════════════════════════════════════
// EXPORT AS HTML — Full Dashboard Snapshot (self-contained file)
// ════════════════════════════════════════════════════════════════
function exportAsHTML(){
  if(!D||Object.keys(D).length===0){
    alert('ยังไม่มีข้อมูล กรุณาอัปโหลดหรือ Sync ก่อน');
    return;
  }
  const sett=JSON.parse(localStorage.getItem('ld_settings')||'{}');
  const logo=localStorage.getItem('ld_logo')||document.getElementById('logoImg').src;
  const brand=sett.color||'#004EE6';
  const brandDk=darkenColor(brand,0.25);
  const brandLt=lightenColor(brand,0.9);
  const storeName=sett.storeName||'Loyalty Dashboard';
  const tagline=sett.tagline||'Powered by Rocket Loyalty CRM';
  const exportDate=new Date().toLocaleString('th-TH',{year:'numeric',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit'});

  // Get full CSS and patch brand variables + add export-only overrides
  const styleEl=Array.from(document.querySelectorAll('style')).find(el=>el.textContent.includes('--brand'));
  let css=(styleEl?styleEl.textContent:'').replace(/:root\{[\s\S]*?\}/,
    `:root{--brand:${brand};--brand-dark:${brandDk};--brand-light:${brandLt};--ink:#1A1A1A;--bg:#f0f0f3;--card:#fff;--mut:#8a8a93;--line:#e6e6ea;--ok:#1a8f3c;--warn:#f39c12;--err:#C8102E;}`);
  css+=`\n.hd-actions{display:none!important;}
.export-banner{background:${brandLt};border-left:4px solid ${brand};padding:10px 28px;font-size:12px;color:${brandDk};font-weight:600;letter-spacing:.2px;}
.export-banner span{opacity:.7;font-weight:400;}`;

  // KPIs for header
  const fN=n=>(n||0).toLocaleString('en-US');
  const kpisHtml=[
    [fN(D.s1&&D.s1.total_active),'สมาชิก ACTIVE ทั้งหมด','คน'],
    ['฿'+fN(D.s3&&D.s3.grand),'ยอดขายรวม','บาท (THB)'],
    [fN(D.s4b&&D.s4b.grand),'คะแนนรวมทุกแหล่ง','แต้ม (รวม Welcome)'],
    [fN(D.s5&&D.s5.total_count),'การแลกของรางวัล',fN(D.s5&&D.s5.total_pts)+' แต้ม'],
  ].map(k=>`<div class="kpi"><div class="lab">${k[1]}</div><div class="val">${k[0]}</div><div class="unit">${k[2]}</div></div>`).join('');
  const drLabel=sett.dateRange?'ข้อมูล '+sett.dateRange:(D.s3&&D.s3.months.length?`ข้อมูล ${ML[D.s3.months[0]]||D.s3.months[0]} – ${ML[D.s3.months[D.s3.months.length-1]]||D.s3.months[D.s3.months.length-1]}`:'');

  // Embed all data + render functions as script
  const embJS=[
    'const D='+JSON.stringify(D).replace(/<\/script>/gi,'<\\/script>')+';',
    'const S='+JSON.stringify(sett)+';',
    'const CHART_COLORS='+JSON.stringify(CHART_COLORS)+';',
    'const CH_KEYS='+JSON.stringify(CH_KEYS)+';',
    'const SC_KEYS='+JSON.stringify(SC_KEYS)+';',
    'const ML='+JSON.stringify(ML)+';',
    'let chartInstances={};',
    'Chart.defaults.font.family="\'Sarabun\',\'Tahoma\',sans-serif";Chart.defaults.font.size=11;',
    'if(typeof ChartDataLabels!=="undefined"){Chart.register(ChartDataLabels);Chart.defaults.set("plugins.datalabels",{display:false});}',
    darkenColor.toString(),
    lightenColor.toString(),
    'function getBrandColor(){return S.color||"#004EE6";}',
    'const fmt='+fmt.toString()+';',
    'const pchCell='+pchCell.toString()+';',
    'const thC='+thC.toString()+';',
    'const chTh='+chTh.toString()+';',
    'function stat(val,lbl,accent){accent=accent||(S&&S.color)||"#004EE6";return`<div class="stat" style="border-left-color:${accent}"><div class="stat-val">${val}</div><div class="stat-lbl">${lbl}</div></div>`;}',
    destroyCharts.toString(),
    mkChart.toString(),
    setPanelContent.toString(),
    // Chart-config helpers that renderP2-P5 reference. Without these the
    // exported snapshot throws ReferenceError when a panel mounts.
    'const softGrid='+JSON.stringify(softGrid)+';',
    topOfStackLabel.toString(),
    valueLabel.toString(),
    focusLegendClick.toString(),
    buildRewardPivot.toString(),
    renderP2.toString(),
    renderP3.toString(),
    renderP4.toString(),
    renderP5.toString(),
    // Simplified switchTab: panels p2-p5 = indices 0-3
    'function switchTab(n){document.querySelectorAll(".panel").forEach((p,i)=>p.classList.toggle("active",i===n-2));document.querySelectorAll(".tabs button").forEach((b,i)=>b.classList.toggle("active",i===n-2));}',
    // Init
    'document.addEventListener("DOMContentLoaded",()=>{'+
      'const br=S.color||"#004EE6";'+
      'document.documentElement.style.setProperty("--brand",br);'+
      'document.documentElement.style.setProperty("--brand-dark",darkenColor(br,0.25));'+
      'document.documentElement.style.setProperty("--brand-light",lightenColor(br,0.9));'+
      'document.getElementById("appHeader").style.background="linear-gradient(120deg,"+darkenColor(br,0.3)+" 0%,"+br+" 60%,"+lightenColor(br,0.2)+" 100%)";'+
      'renderP2();renderP3();renderP4();renderP5();switchTab(2);'+
      'if(typeof lucide!=="undefined")lucide.createIcons();'+
    '});',
  ].join('\n');

  const panelsHtml=`
<!-- PANEL 1: NEW USER -->
<div class="panel" id="p2">
<div class="card">
  <div class="sh"><span class="snum">1</span><span class="stitle">New User Registration</span><span class="sen">ผู้ใช้รายใหม่ (ACTIVE)</span></div>
  <div class="desc">จำนวนผู้ใช้ใหม่สถานะ <b>ACTIVE</b> จัดกลุ่มตาม Register Date — ไม่รวมเดือนปัจจุบันที่ข้อมูลยังไม่ครบ</div>
  <div id="p2_empty" class="empty-state" style="display:none"><div class="es-icon"><i data-lucide="users"></i></div><h3>ไม่มีข้อมูล</h3></div>
  <div id="p2_content" style="display:none"><div class="stat-row" id="kpi1"></div><div class="chartbox"><canvas id="c1"></canvas></div><div class="tbl-wrap tbl-narrow"><div id="t1"></div></div><div class="note" id="n1"></div></div>
</div></div>
<!-- PANEL 2: SALES -->
<div class="panel" id="p3">
<div class="card">
  <div class="sh"><span class="snum">2</span><span class="stitle">Sales Report</span><span class="sen">ยอดขาย (THB) แยกตามช่องทาง</span></div>
  <div class="desc">ยอดขาย (บาท) จาก Point Report เฉพาะ Point type = <b>GIVEN</b></div>
  <div id="p3_empty" class="empty-state" style="display:none"><div class="es-icon"><i data-lucide="circle-dollar-sign"></i></div><h3>ไม่มีข้อมูล</h3></div>
  <div id="p3_content" style="display:none"><div class="stat-row" id="kpi3"></div><div class="chart-hint"><i data-lucide="info"></i> คลิกชื่อช่องทาง = โฟกัสเฉพาะอันนั้น • Shift+คลิก = เพิ่ม/ลบหลายอัน (เทียบกัน) • คลิกซ้ำที่อันเดิม = แสดงทั้งหมด</div><div class="chartbox scroll"><div class="chart-scroll-inner"><canvas id="c3"></canvas></div></div><div class="tbl-wrap"><div id="t3"></div></div></div>
</div></div>
<!-- PANEL 3: POINTS -->
<div class="panel" id="p4">
<div class="card">
  <div class="sh"><span class="snum">3</span><span class="stitle">Points Report</span><span class="sen">คะแนนสะสม (GIVEN)</span></div>
  <div id="p4_empty" class="empty-state" style="display:none"><div class="es-icon"><i data-lucide="star"></i></div><h3>ไม่มีข้อมูล</h3></div>
  <div id="p4_content" style="display:none">
    <div class="stat-row" id="kpi4"></div>
    <div class="subhd">3.1 · คะแนนตามช่องทาง</div><div class="desc">คะแนนที่แจก (GIVEN) แยกตามช่องทาง — ไม่รวม Welcome Point</div>
    <div class="chartbox sm"><canvas id="c4a"></canvas></div><div class="tbl-wrap"><div id="t4a"></div></div>
    <div class="subhd">3.2 · คะแนนแยกตามแหล่งที่มาทั้งหมด</div><div class="desc">รวมทุกแหล่ง รวมถึง <b>Welcome Point</b></div>
    <div class="chartbox sm"><canvas id="c4b"></canvas></div><div class="tbl-wrap"><div id="t4b"></div></div>
    <div class="note" id="n4"></div>
  </div>
</div></div>
<!-- PANEL 4: REDEMPTION -->
<div class="panel" id="p5">
<div class="card">
  <div class="sh"><span class="snum">4</span><span class="stitle">Redemption Report</span><span class="sen">การแลกของรางวัล</span></div>
  <div class="desc">จำนวนการแลกของรางวัล + เปรียบเทียบ Give Points กับ Used Points</div>
  <div id="p5_empty" class="empty-state" style="display:none"><div class="es-icon"><i data-lucide="gift"></i></div><h3>ไม่มีข้อมูล</h3></div>
  <div id="p5_content" style="display:none">
    <div class="stat-row" id="kpi5"></div>
    <div class="grid2"><div class="chartbox sm"><canvas id="c5a"></canvas></div><div class="chartbox sm"><canvas id="c5b"></canvas></div></div>
    <div class="tbl-wrap"><div id="t5"></div></div>
    <div class="subhd">4.2 · ของรางวัลยอดนิยม <span id="pivotModeLabel" style="font-size:11px;font-weight:400;color:var(--mut);"></span></div>
    <div class="tbl-wrap"><div id="t5r"></div></div>
  </div>
</div></div>`;

  const yr=new Date().getFullYear();
  const html=`<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${storeName} — Dashboard</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"><\/script>
<script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.2.0"><\/script>
<script src="https://unpkg.com/lucide@0.456.0/dist/umd/lucide.min.js"><\/script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>${css}</style>
</head>
<body>
<header id="appHeader">
<div class="wrap">
  <div class="hd-top">
    <div class="logo-area">
      <img id="logoImg" src="${logo}" alt="Logo" style="height:65px;filter:drop-shadow(0 2px 6px rgba(0,0,0,.25));border-radius:8px;object-fit:contain;background:rgba(255,255,255,.15);">
      <div class="logo-box">
        <div id="storeName" style="font-size:32px;font-weight:900;color:#fff;letter-spacing:-1px;font-family:'Segoe UI',sans-serif;">${storeName}</div>
        <div class="logo-tag">${tagline}</div>
      </div>
    </div>
    <div class="hd-meta">
      <div class="brand">ROCKET LOYALTY CRM</div>
      <h1>Loyalty Dashboard Pro</h1>
      <div class="sub">${drLabel}</div>
    </div>
  </div>
  <div class="kpis">${kpisHtml}</div>
</div>
</header>
<div class="tabs" id="tabBar">
  <button onclick="switchTab(2)"><span class="tnum">1</span> สมาชิกใหม่</button>
  <button onclick="switchTab(3)"><span class="tnum">2</span> Sales Report</button>
  <button onclick="switchTab(4)"><span class="tnum">3</span> Points Report</button>
  <button onclick="switchTab(5)"><span class="tnum">4</span> Redemption</button>
</div>
<div class="content">${panelsHtml}</div>
<footer>
<b>วิธีคำนวณ:</b> %Ch = (เดือนนี้ − เดือนก่อนหน้า) ÷ เดือนก่อนหน้า &nbsp;|&nbsp; New User: Status=ACTIVE &nbsp;|&nbsp; Sales/Points: Point type=GIVEN<br>
<div style="margin-top:10px;padding-top:10px;border-top:1px solid #222;color:#888;">© ${yr} Rocket Innovation Dashboard &nbsp;·&nbsp; จัดทำขึ้นเพื่อเป็นข้อมูล Internal และเพื่อวิเคราะห์ข้อมูลเท่านั้น</div>
</footer>
<div class="export-banner with-icon"><i data-lucide="camera" class="icon-sm"></i> Dashboard Snapshot &nbsp;·&nbsp; <span>Export วันที่ ${exportDate}</span></div>
<script>${embJS}<\/script>
</body></html>`;

  const blob=new Blob([html],{type:'text/html;charset=utf-8'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=storeName.replace(/[^\w฀-๿]/g,'_')+'_dashboard_'+toLocalISODate(new Date())+'.html';
  document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(a.href);
}
