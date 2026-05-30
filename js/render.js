// ════════════════════════════════════════════════════════════════
// RENDER — UI updates + panel renderers (P2–P5) + chart helpers
// ════════════════════════════════════════════════════════════════

// Chart.js global defaults (Chart must be loaded via CDN before this file)
Chart.defaults.font.family="'Tahoma','Segoe UI',sans-serif";
Chart.defaults.font.size=11;
Chart.defaults.color='#1A1A1A';
// Tooltip polish: dark branded background, padded, formatted
Chart.defaults.plugins.tooltip.backgroundColor='rgba(20,22,46,0.95)';
Chart.defaults.plugins.tooltip.titleColor='#fff';
Chart.defaults.plugins.tooltip.titleFont={weight:'bold',size:12};
Chart.defaults.plugins.tooltip.bodyColor='#fff';
Chart.defaults.plugins.tooltip.bodyFont={size:11};
Chart.defaults.plugins.tooltip.padding={top:10,bottom:10,left:14,right:14};
Chart.defaults.plugins.tooltip.cornerRadius=8;
Chart.defaults.plugins.tooltip.boxPadding=6;
Chart.defaults.plugins.tooltip.boxWidth=10;
Chart.defaults.plugins.tooltip.boxHeight=10;
Chart.defaults.plugins.tooltip.borderColor='rgba(255,255,255,0.08)';
Chart.defaults.plugins.tooltip.borderWidth=1;
// Legend polish: more breathing room, consistent box size
Chart.defaults.plugins.legend.labels.padding=14;
Chart.defaults.plugins.legend.labels.boxWidth=12;
Chart.defaults.plugins.legend.labels.boxHeight=12;
Chart.defaults.plugins.legend.labels.usePointStyle=false;
// Animation: a touch slower so values feel like they "land"
Chart.defaults.animation.duration=600;
// Register chartjs-plugin-datalabels globally (loaded via CDN as ChartDataLabels)
// Default display:false so other charts don't show labels unless they opt in.
if(typeof ChartDataLabels!=='undefined'){Chart.register(ChartDataLabels);Chart.defaults.set('plugins.datalabels',{display:false});}

// ── Datalabel helpers ──
// Total label on top of a stacked bar chart — finds the highest non-zero dataset
// at each index and renders the sum of all datasets there.
function topOfStackLabel(){
  return {
    display:ctx=>{
      const datasets=ctx.chart.data.datasets;
      // walk from top dataset down to find first one with a positive value
      for(let i=datasets.length-1;i>=0;i--){
        if((+datasets[i].data[ctx.dataIndex]||0)>0) return ctx.datasetIndex===i;
      }
      return false;
    },
    formatter:(_,ctx)=>fmt(ctx.chart.data.datasets.reduce((s,ds)=>s+(+ds.data[ctx.dataIndex]||0),0)),
    anchor:'end',align:'top',
    color:'#1A1A1A',font:{weight:'bold',size:10}
  };
}
// Simple value label above a non-stacked bar
function valueLabel(formatter){
  return {display:true,anchor:'end',align:'top',
    color:'#1A1A1A',font:{weight:'bold',size:10},
    formatter:v=>(formatter||fmt)(v)};
}
// Soft grid styling — light enough to not compete with the data
const softGrid={color:'rgba(0,0,0,0.05)',drawBorder:false};

// Legend click handler — two modes, picked by modifier key:
//
//   PLAIN CLICK = SOLO (focus)
//     - first click on a series → hide every other series
//     - click the same series again (now the only visible one) → restore all
//     - click a different series while solo → switch focus to that series
//
//   SHIFT / CMD / CTRL + CLICK = TOGGLE (compare-mode)
//     - flips just that series on/off without touching the others
//     - lets the user build a custom comparison set, e.g. show only
//       TikTok + Shopee by clicking the others off one by one
//
// Drop this into chart.options.plugins.legend.onClick.
function focusLegendClick(e,legendItem,legend){
  const chart=legend.chart;
  const target=legendItem.datasetIndex;
  const n=chart.data.datasets.length;
  // Modifier held → individual toggle (matches Mac Finder / Tableau / Plotly)
  const ev=e&&e.native;
  if(ev&&(ev.shiftKey||ev.metaKey||ev.ctrlKey)){
    if(chart.isDatasetVisible(target)) chart.hide(target);
    else chart.show(target);
    return;
  }
  // Plain click → solo / restore
  let visible=0;
  for(let i=0;i<n;i++) if(chart.isDatasetVisible(i)) visible++;
  const isSolo=visible===1&&chart.isDatasetVisible(target);
  if(isSolo){
    for(let i=0;i<n;i++) chart.show(i);
  } else {
    for(let i=0;i<n;i++){ if(i===target) chart.show(i); else chart.hide(i); }
  }
}

// ── Chart lifecycle ──
function destroyCharts(ids){ids.forEach(id=>{if(chartInstances[id]){chartInstances[id].destroy();delete chartInstances[id];}});}
function mkChart(id, config){destroyCharts([id]);chartInstances[id]=new Chart(document.getElementById(id),config);return chartInstances[id];}

function setPanelContent(pId, hasData){
  document.getElementById(pId+'_empty').style.display=hasData?'none':'block';
  document.getElementById(pId+'_content').style.display=hasData?'block':'none';
}

// ════════════════════════════════════════════════════════════════
// UI UPDATES
// ════════════════════════════════════════════════════════════════
function updateKpis(){
  const el=document.getElementById('kpis');
  if(!D||!D.s1){
    el.innerHTML=`
      <div class="kpi"><div class="lab">สมาชิก ACTIVE</div><div class="val">—</div><div class="unit">รอข้อมูล</div></div>
      <div class="kpi"><div class="lab">ยอดขายรวม</div><div class="val">—</div><div class="unit">รอข้อมูล</div></div>
      <div class="kpi"><div class="lab">คะแนนรวม</div><div class="val">—</div><div class="unit">รอข้อมูล</div></div>
      <div class="kpi"><div class="lab">การแลกของรางวัล</div><div class="val">—</div><div class="unit">รอข้อมูล</div></div>`;
    return;
  }
  const f=n=>(n||0).toLocaleString('en-US');
  el.innerHTML=[
    [f(D.s1&&D.s1.total_active),'สมาชิก ACTIVE ทั้งหมด','คน'],
    ['฿'+f(D.s3&&D.s3.grand),'ยอดขายรวม','บาท (THB)'],
    [f(D.s4b&&D.s4b.grand),'คะแนนรวมทุกแหล่ง','แต้ม (รวม Welcome)'],
    [f(D.s5&&D.s5.total_count),'การแลกของรางวัล',f(D.s5&&D.s5.total_pts)+' แต้ม'],
  ].map(k=>`<div class="kpi"><div class="lab">${k[1]}</div><div class="val">${k[0]}</div><div class="unit">${k[2]}</div></div>`).join('');
}

function updateDateLabel(){
  if(!D||!D.s3) return;
  const months=D.s3.months||[];
  if(months.length===0) return;
  const start=ML[months[0]]||months[0];
  const end=ML[months[months.length-1]]||months[months.length-1];
  const s=JSON.parse(localStorage.getItem('ld_settings')||'{}');
  if(!s.dateRange){
    document.getElementById('dateRangeLabel').textContent=`ข้อมูล ${start} – ${end}`;
  }
}

function updateFileCards(){
  [0,1,2].forEach(i=>updateFileCard(i, fileInfo[i]));
}

function updateFileCard(slot, fi){
  const card=document.getElementById('uc'+slot);
  const status=document.getElementById('uc'+slot+'_status');
  const prog=document.getElementById('uc'+slot+'_prog');
  if(fi&&fi.rows){
    card.classList.add('has-data');
    status.innerHTML=`<span class="loaded with-icon"><i data-lucide="check-circle" class="icon-sm"></i> โหลดแล้ว — ${fi.rows.toLocaleString()} แถว</span><br><span style="color:#888;font-size:10px">${fi.name} · ${fi.uploadDate||''}</span>`;
    prog.style.width='100%';
  } else {
    card.classList.remove('has-data');
    status.innerHTML='<span class="empty">ยังไม่มีข้อมูล</span>';
    prog.style.width='0%';
  }
}

function updateDbSummary(){
  const el=document.getElementById('dbSummary');
  if(!el) return;
  const hasContact=!!localStorage.getItem('ld_contacts');
  const hasPoint=!!localStorage.getItem('ld_point');
  const hasRedemp=!!localStorage.getItem('ld_redemp');
  const allOk=hasContact&&hasPoint&&hasRedemp;
  el.innerHTML=`
    <div class="db-sum-card ${hasContact?'ok':''}">
      <div class="db-sum-label">Contacts File</div>
      <div class="db-sum-val">${hasContact?'<i data-lucide="check" style="color:#1a8f3c"></i>':'–'}</div>
      <div class="db-sum-sub">${hasContact?(fileInfo[0].rows||0).toLocaleString()+' แถว':'ยังไม่อัปโหลด'}</div>
    </div>
    <div class="db-sum-card ${hasPoint?'ok':''}">
      <div class="db-sum-label">Point Report</div>
      <div class="db-sum-val">${hasPoint?'<i data-lucide="check" style="color:#1a8f3c"></i>':'–'}</div>
      <div class="db-sum-sub">${hasPoint?(fileInfo[1].rows||0).toLocaleString()+' แถว':'ยังไม่อัปโหลด'}</div>
    </div>
    <div class="db-sum-card ${hasRedemp?'ok':''}">
      <div class="db-sum-label">Redemptions</div>
      <div class="db-sum-val">${hasRedemp?'<i data-lucide="check" style="color:#1a8f3c"></i>':'–'}</div>
      <div class="db-sum-sub">${hasRedemp?(fileInfo[2].rows||0).toLocaleString()+' แถว':'ยังไม่อัปโหลด'}</div>
    </div>
    <div class="db-sum-card ${allOk?'ok':'warn'}">
      <div class="db-sum-label">Dashboard</div>
      <div class="db-sum-val">${allOk?'<i data-lucide="check-circle" style="color:#1a8f3c"></i>':'<i data-lucide="alert-triangle" style="color:#f39c12"></i>'}</div>
      <div class="db-sum-sub">${allOk?'พร้อมแสดงผล':'ต้องการไฟล์ครบ 3 ไฟล์'}</div>
    </div>`;
}

function renderDb(){
  updateDbSummary();
  updateFileCards();
}

// ════════════════════════════════════════════════════════════════
// PANEL RENDERERS
// ════════════════════════════════════════════════════════════════
function renderP2(){
  if(!D||!D.s1){ setPanelContent('p2',false); return; }
  setPanelContent('p2',true);
  const s=D.s1, lab=s.months.map(m=>ML[m]||m);
  const brand=getBrandColor(), trendColor=darkenColor(brand,0.35);
  mkChart('c1',{type:'bar',
    data:{labels:lab,datasets:[
      {type:'bar',label:'สมาชิกใหม่ (ACTIVE)',data:s.active,backgroundColor:brand,borderRadius:4,order:2},
      {type:'line',label:'Trend',data:s.active,borderColor:trendColor,backgroundColor:trendColor,
        borderWidth:2,pointRadius:3.5,pointHoverRadius:6,tension:0.3,fill:false,order:1}
    ]},
    // Top padding leaves room for the stacked labels above each bar (count + pill)
    options:{responsive:true,maintainAspectRatio:false,layout:{padding:{top:52}},
      plugins:{
        legend:{display:false},
        tooltip:{filter:i=>i.datasetIndex===0,callbacks:{label:c=>` ${fmt(c.parsed.y)} คน`}},
        datalabels:{display:ctx=>ctx.dataset.type==='bar',
          labels:{
            // Bottom layer: month count — bold black, sits directly above the bar
            value:{anchor:'end',align:'top',offset:0,
              color:'#1A1A1A',font:{weight:'bold',size:11},formatter:v=>fmt(v)},
            // Top layer: % change — small colored pill, stacked above the count (no overlap)
            // First month is skipped because pch is null
            percent:{anchor:'end',align:'top',offset:18,
              color:'#fff',borderRadius:10,padding:{top:2,bottom:2,left:6,right:6},
              font:{weight:'bold',size:9},
              backgroundColor:ctx=>{const p=s.pch[ctx.dataIndex];if(p==null)return null;return p>0.0005?'#1a8f3c':p<-0.0005?'#C8102E':'#888';},
              display:ctx=>ctx.dataset.type==='bar'&&s.pch[ctx.dataIndex]!=null,
              formatter:(_,ctx)=>{const p=s.pch[ctx.dataIndex];if(p==null)return'';const pct=(p*100).toFixed(1);return(p>0?'+':'')+pct+'%';}
            }
          }
        }
      },
      scales:{x:{grid:{display:false}},y:{beginAtZero:true,grid:softGrid,ticks:{callback:v=>fmt(v)}}}
    }
  });
  const chartTotal=s.active.reduce((a,b)=>a+b,0);
  const max=s.active.length?Math.max(...s.active):0, imax=s.active.indexOf(max);
  document.getElementById('kpi1').innerHTML=
    stat(fmt(s.total_active),'สมาชิก ACTIVE รวม')+
    stat(fmt(max),'เดือนสูงสุด: '+(s.months.length&&imax>=0?(ML[s.months[imax]]||s.months[imax]):'–'),'#1a8f3c')+
    stat(fmt(s.months.length?Math.round(chartTotal/s.months.length):0),'เฉลี่ยต่อเดือน','#555');
  let r=`<table><tr><th>เดือน</th><th>สมาชิกใหม่ (ACTIVE)</th><th>%Ch</th></tr>`;
  s.months.forEach((m,i)=>{r+=`<tr><td>${ML[m]||m}</td><td>${fmt(s.active[i])}</td>${pchCell(s.pch[i])}</tr>`;});
  r+=`<tr class="tot"><td>รวม</td><td>${fmt(chartTotal)}</td><td>–</td></tr></table>`;
  document.getElementById('t1').innerHTML=r;
  document.getElementById('n1').innerHTML=`สมาชิกใหม่ (ACTIVE) <b>${fmt(chartTotal)} คน</b> — ไม่รวมเดือนปัจจุบันที่ข้อมูลยังไม่ครบ`;

  // Inactive members section (not present in exported HTML)
  const el=document.getElementById('inactiveSection');
  if(!el) return;
  const ia=s.inactive;
  if(!ia){
    el.style.display='block';
    el.innerHTML=`<div class="inactive-section"><div class="inactive-title with-icon" style="color:var(--mut);font-weight:400;font-size:12px;"><i data-lucide="moon" class="icon-sm"></i> Last Activity Date — อัปโหลดไฟล์ Contacts อีกครั้งเพื่อดูข้อมูล (ข้อมูลนี้ไม่ได้บันทึกถาวร)</div></div>`;
    return;
  }
  const cutoffLabel=ia.cutoffStr?ia.cutoffStr.slice(0,7).replace('-','/'):'-';
  const blankCount=ia.blankCount;
  const noColNote=!ia.hasColumn?`<div class="with-icon" style="font-size:10px;color:#e67e22;margin-top:4px;"><i data-lucide="alert-triangle" class="icon-sm"></i> ไม่พบคอลัมน์ Last Activity Date ในไฟล์</div>`:'';
  el.style.display='block';
  el.innerHTML=`<div class="inactive-section">
    <div class="inactive-title with-icon"><i data-lucide="moon"></i> สมาชิก ACTIVE ที่ไม่ได้ใช้งาน &nbsp;—&nbsp; จาก ${fmt(ia.totalActive)} คน ACTIVE ทั้งหมด</div>
    ${noColNote}
    <div class="inactive-grid">
      <div class="inactive-card blank">
        <div class="inactive-label with-icon"><i data-lucide="help-circle" class="icon-sm"></i> ไม่มีข้อมูล Last Activity</div>
        <div class="inactive-count">${fmt(blankCount)}</div>
        <div class="inactive-sub">คน — ไม่เคยมีประวัติการเข้าระบบ${!ia.hasColumn?' (ไม่พบคอลัมน์ในไฟล์)':''}</div>
        ${typeof exportInactiveMembers==='function'&&ia.blank.length>0?`<button class="inactive-export" onclick="exportInactiveMembers('blank')"><i data-lucide="download" class="icon-sm"></i> Export รายชื่อ (${fmt(ia.blank.length)} คน) .csv</button>`:''}
      </div>
      <div class="inactive-card overdue">
        <div class="inactive-label with-icon"><i data-lucide="alarm-clock" class="icon-sm"></i> ไม่ได้เข้าระบบ &gt;3 เดือน (ก่อน ${cutoffLabel})</div>
        <div class="inactive-count">${fmt(ia.overdueCount)}</div>
        <div class="inactive-sub">คน — Last Activity Date ก่อน ${cutoffLabel}<br>อาจเป็นลูกค้าที่หลุดออกจากระบบ</div>
        ${typeof exportInactiveMembers==='function'&&ia.overdueCount>0?`<button class="inactive-export" onclick="exportInactiveMembers('overdue')"><i data-lucide="download" class="icon-sm"></i> Export รายชื่อ (${fmt(ia.overdueCount)} คน) .csv</button>`:''}
      </div>
    </div>
  </div>`;
}

function exportInactiveMembers(type){
  const ia=inactiveData; if(!ia){alert('ไม่พบข้อมูล กรุณาอัปโหลดไฟล์ Contacts ใหม่อีกครั้ง');return;}
  const members=type==='blank'?ia.blank:ia.overdue;
  if(!members.length) return;
  const headers=['ชื่อ','เบอร์โทร','Line User ID','วันสมัคร','Last Activity Date','Status'];
  const csvRows=[headers,...members.map(m=>[m.name||'',m.phone||'',m.lineUserId||'',m.regDate||'',m.lastActivityDate||'',m.status||''])];
  const csv=csvRows.map(r=>r.map(c=>'"'+String(c).replace(/"/g,'""')+'"').join(',')).join('\n');
  const blob=new Blob(['﻿'+csv],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=`inactive_${type}_${toLocalISODate(new Date())}.csv`;
  a.click();
}

function renderP3(){
  if(!D||!D.s3){ setPanelContent('p3',false); return; }
  setPanelContent('p3',true);
  const s=D.s3, lab=s.months.map(m=>ML[m]||m);
  const useKeys=CH_KEYS.filter(k=>s.data[k]&&s.totals[k]>0);

  // Lines need ~90px per month for labels to breathe; horizontal scroll handles
  // long time ranges. Min 720px so a short range still fills the panel.
  const scrollInner=document.getElementById('c3').closest('.chart-scroll-inner');
  if(scrollInner) scrollInner.style.minWidth=Math.max(720,s.months.length*90)+'px';

  // Multi-line chart: one line per channel. Grouped bars made small channels
  // (Lazada, Loyalty Manual) invisible whenever a dominant channel (Shopee)
  // was on the same scale. Lines stay legible even when flat, point markers +
  // value labels show exact numbers, and the focus-on-click legend isolates a
  // single channel with every monthly number readable.
  mkChart('c3',{type:'line',
    data:{labels:lab, datasets:useKeys.map(k=>({
      label:k, data:s.data[k],
      borderColor:CHART_COLORS[k], backgroundColor:CHART_COLORS[k],
      borderWidth:2.5, tension:0.3, fill:false,
      pointRadius:4, pointHoverRadius:7,
      // White-fill / colored-ring markers stay readable even where lines cross
      pointBackgroundColor:'#fff', pointBorderColor:CHART_COLORS[k], pointBorderWidth:2
    }))},
    options:{responsive:true,maintainAspectRatio:false,layout:{padding:{top:28}},
      interaction:{mode:'index',intersect:false},
      plugins:{
        legend:{position:'top',align:'end',onClick:focusLegendClick,
          labels:{padding:14,boxWidth:14,boxHeight:14,usePointStyle:false}},
        tooltip:{
          callbacks:{
            label:c=>` ${c.dataset.label}: ฿${fmt(c.parsed.y)}`,
            footer:items=>'รวมเดือนนี้: ฿'+fmt(items.reduce((sum,i)=>sum+(+i.parsed.y||0),0))
          },
          footerFont:{weight:'bold',size:12},
          footerMarginTop:8
        },
        // Value labels on every point. display:'auto' hides labels that would
        // overlap each other → when 5 lines crowd a region only the readable
        // labels show. Solo a channel (click legend) → all labels appear.
        datalabels:{
          display:'auto', anchor:'end', align:'top', offset:6,
          color:ctx=>ctx.dataset.borderColor,
          font:{weight:'bold',size:9},
          backgroundColor:'rgba(255,255,255,0.88)',
          borderRadius:4, padding:{top:2,bottom:2,left:5,right:5},
          formatter:v=>v>0?fmt(v):''
        }
      },
      scales:{x:{grid:{display:false}},y:{beginAtZero:true,grid:softGrid,ticks:{callback:v=>fmt(v)}}}
    }
  });

  // Two-row KPI: hero (total) on top, per-channel breakdown with % share below.
  // % share lets marketing see channel mix at a glance ("Shopee = 58% of revenue")
  // without doing mental math against the total.
  const heroCard=`<div class="kpi-hero"><div class="kpi-hero-lab">ยอดขายรวม (THB)</div><div class="kpi-hero-val">฿${fmt(s.grand)}</div></div>`;
  const channelCards='<div class="stat-row">'+useKeys.map(k=>{
    const share=s.grand>0?(s.totals[k]/s.grand*100).toFixed(1):'0.0';
    const color=CHART_COLORS[k]||'#555';
    return `<div class="stat" style="border-left-color:${color}"><div class="stat-val">฿${fmt(s.totals[k])}</div><div class="stat-lbl">${k}<span class="stat-share">${share}%</span></div></div>`;
  }).join('')+'</div>';
  document.getElementById('kpi3').innerHTML=heroCard+channelCards;

  let r=`<table><tr><th>เดือน</th>${chTh(useKeys)}<th>รวม (THB)</th><th>%Ch</th></tr>`;
  s.months.forEach((m,i)=>{r+=`<tr><td>${ML[m]||m}</td>${useKeys.map(k=>'<td>'+fmt(s.data[k][i])+'</td>').join('')}<td><b>${fmt(s.total[i])}</b></td>${pchCell(s.pch[i])}</tr>`;});
  r+=`<tr class="tot"><td>รวม</td>${useKeys.map(k=>'<td>'+fmt(s.totals[k])+'</td>').join('')}<td>${fmt(s.grand)}</td><td>–</td></tr></table>`;
  document.getElementById('t3').innerHTML=r;
}

function renderP4(){
  if(!D||!D.s4a){ setPanelContent('p4',false); return; }
  setPanelContent('p4',true);
  const a=D.s4a, b=D.s4b, lab=a.months.map(m=>ML[m]||m);
  const aKeys=CH_KEYS.filter(k=>a.data[k]&&a.totals[k]>0);
  const bKeys=(b.sckeys||SC_KEYS).filter(k=>b.data[k]&&b.totals[k]>0);

  // Same multi-line treatment as P3 (Sales): channels become independent lines
  // so a dominant series (e.g. Shopee or Welcome Point) doesn't crush the rest;
  // value labels with display:'auto' show ✦ where they fit; tooltip groups all
  // series for the hovered month with a bold "รวมเดือนนี้" footer.
  const lineDs=(k,data)=>{
    const color=CHART_COLORS[k]||'#999';
    return {label:k,data,borderColor:color,backgroundColor:color,
      borderWidth:2.5,tension:0.3,fill:false,
      pointRadius:4,pointHoverRadius:7,
      pointBackgroundColor:'#fff',pointBorderColor:color,pointBorderWidth:2};
  };
  const lineOpts=()=>({
    responsive:true,maintainAspectRatio:false,layout:{padding:{top:28}},
    interaction:{mode:'index',intersect:false},
    plugins:{
      legend:{position:'top',align:'end',onClick:focusLegendClick,
        labels:{padding:14,boxWidth:14,boxHeight:14,usePointStyle:false}},
      tooltip:{
        callbacks:{
          label:c=>` ${c.dataset.label}: ${fmt(c.parsed.y)} แต้ม`,
          footer:items=>'รวมเดือนนี้: '+fmt(items.reduce((sum,i)=>sum+(+i.parsed.y||0),0))+' แต้ม'
        },
        footerFont:{weight:'bold',size:12},
        footerMarginTop:8
      },
      datalabels:{
        display:'auto',anchor:'end',align:'top',offset:6,
        color:ctx=>ctx.dataset.borderColor,
        font:{weight:'bold',size:9},
        backgroundColor:'rgba(255,255,255,0.88)',
        borderRadius:4,padding:{top:2,bottom:2,left:5,right:5},
        formatter:v=>v>0?fmt(v):''
      }
    },
    scales:{x:{grid:{display:false}},y:{beginAtZero:true,grid:softGrid,ticks:{callback:v=>fmt(v)}}}
  });

  // 3.1 — Points by channel (5 channels)
  const c4aScroll=document.getElementById('c4a').closest('.chart-scroll-inner');
  if(c4aScroll) c4aScroll.style.minWidth=Math.max(720,a.months.length*90)+'px';
  mkChart('c4a',{type:'line',data:{labels:lab,datasets:aKeys.map(k=>lineDs(k,a.data[k]))},options:lineOpts()});

  // 3.2 — Points by all sources (includes Welcome, Invite, Import, Survey, etc.)
  const c4bScroll=document.getElementById('c4b').closest('.chart-scroll-inner');
  if(c4bScroll) c4bScroll.style.minWidth=Math.max(720,b.months.length*90)+'px';
  mkChart('c4b',{type:'line',data:{labels:lab,datasets:bKeys.map(k=>lineDs(k,b.data[k]))},options:lineOpts()});
  const wpTotal=b.totals['Welcome Point']||0;
  // Hero = total points across all sources (3.2). The three sub-cards keep the
  // channel-only subtotal (3.1), Welcome-Point subset, and Welcome ratio so
  // marketing can see "how much did we spend, where did it come from, how
  // much is acquisition cost" at a glance.
  const heroP4=`<div class="kpi-hero"><div class="kpi-hero-lab">คะแนนแจกรวมทุกแหล่ง (3.2)</div><div class="kpi-hero-val">${fmt(b.grand)}<span class="kpi-hero-unit">แต้ม</span></div></div>`;
  const subP4='<div class="stat-row">'+
    `<div class="stat" style="border-left-color:#5a3a00"><div class="stat-val">${fmt(a.grand)}</div><div class="stat-lbl">คะแนน 3.1 (เฉพาะช่องทาง)</div></div>`+
    `<div class="stat" style="border-left-color:#C8102E"><div class="stat-val">${fmt(wpTotal)}</div><div class="stat-lbl">Welcome Point</div></div>`+
    `<div class="stat" style="border-left-color:#888"><div class="stat-val">${b.grand>0?(wpTotal/b.grand*100).toFixed(0)+'%':'–'}</div><div class="stat-lbl">% Welcome / รวม</div></div>`+
  '</div>';
  document.getElementById('kpi4').innerHTML=heroP4+subP4;
  // ตาราง 3.1 เรียงจากเก่าไปใหม่ (ascending)
  let r4a=`<table><tr><th>เดือน</th>${chTh(aKeys)}<th>รวม</th><th>%Ch</th></tr>`;
  a.months.forEach((m,i)=>{r4a+=`<tr><td>${ML[m]||m}</td>${aKeys.map(k=>'<td>'+fmt(a.data[k][i])+'</td>').join('')}<td><b>${fmt(a.total[i])}</b></td>${pchCell(a.pch[i])}</tr>`;});
  r4a+=`<tr class="tot"><td>รวม</td>${aKeys.map(k=>'<td>'+fmt(a.totals[k])+'</td>').join('')}<td>${fmt(a.grand)}</td><td>–</td></tr></table>`;
  document.getElementById('t4a').innerHTML=r4a;
  let r4b=`<table><tr><th>เดือน</th>${chTh(bKeys)}<th>รวม</th><th>%Ch</th></tr>`;
  b.months.forEach((m,i)=>{r4b+=`<tr><td>${ML[m]||m}</td>${bKeys.map(k=>'<td>'+fmt(b.data[k][i])+'</td>').join('')}<td><b>${fmt(b.total[i])}</b></td>${pchCell(b.pch[i])}</tr>`;});
  r4b+=`<tr class="tot"><td>รวม</td>${bKeys.map(k=>'<td>'+fmt(b.totals[k])+'</td>').join('')}<td>${fmt(b.grand)}</td><td>–</td></tr></table>`;
  document.getElementById('t4b').innerHTML=r4b;
  document.getElementById('n4').innerHTML=`<b>Welcome Point รวม ${fmt(wpTotal)} แต้ม</b> (${b.grand>0?(wpTotal/b.grand*100).toFixed(0):0}% ของทั้งหมด) — ตาราง 3.1 ไม่นับรวม Welcome Point`;
}

function buildRewardPivot(s){
  const THRESHOLD=15;
  const months=s.months; // ascending
  if(months.length<=THRESHOLD){
    // Monthly columns
    const rdMap={};
    months.forEach(m=>{(s.rewards[m]||[]).forEach(([n,q])=>{if(!rdMap[n])rdMap[n]={};rdMap[n][m]=(rdMap[n][m]||0)+q;});});
    const countByCol={};months.forEach((m,i)=>{countByCol[m]=s.count[i];});
    const rdList=Object.entries(rdMap).sort((a,b)=>Object.values(b[1]).reduce((x,y)=>x+y,0)-Object.values(a[1]).reduce((x,y)=>x+y,0));
    return{cols:months,colLabels:months.map(m=>ML[m]||m),rdMap,rdList,countByCol,isQuarterly:false};
  } else {
    // Quarterly columns
    const qKey=m=>{const[y,mo]=m.split('-');return y+'-Q'+Math.ceil(Number(mo)/3);};
    const qLabel=k=>{const[y,q]=k.split('-Q');return'Q'+q+'/'+y;};
    const cols=[...new Set(months.map(qKey))].sort();
    const colLabels=cols.map(qLabel);
    const rdMap={};
    months.forEach(m=>{const q=qKey(m);(s.rewards[m]||[]).forEach(([n,v])=>{if(!rdMap[n])rdMap[n]={};rdMap[n][q]=(rdMap[n][q]||0)+v;});});
    const countByCol={};months.forEach((m,i)=>{const q=qKey(m);countByCol[q]=(countByCol[q]||0)+s.count[i];});
    const rdList=Object.entries(rdMap).sort((a,b)=>Object.values(b[1]).reduce((x,y)=>x+y,0)-Object.values(a[1]).reduce((x,y)=>x+y,0));
    return{cols,colLabels,rdMap,rdList,countByCol,isQuarterly:true};
  }
}

function renderP5(){
  if(!D||!D.s5){ setPanelContent('p5',false); return; }
  setPanelContent('p5',true);
  const s=D.s5;
  const giveByM={};
  if(D.s4b&&D.s4b.months){D.s4b.months.forEach((m,i)=>{giveByM[m]=D.s4b.total[i];});}
  const s5GivePts=s.months.map(m=>giveByM[m]||0);
  const totalGive=s5GivePts.reduce((a,b)=>a+b,0);
  const totalUsed=s.pts_point.reduce((a,b)=>a+b,0);
  const lab=s.months.map(m=>ML[m]||m);
  // Chart 1 — Redemption count: bar (volume) + trend line overlay + bold value
  // labels on each bar. The line makes month-to-month movement obvious; the
  // labels give the exact count without a tooltip.
  mkChart('c5a',{type:'bar',
    data:{labels:lab,datasets:[
      {type:'bar',label:'จำนวนที่แลก (ครั้ง)',data:s.count,backgroundColor:'#7B1E26',borderRadius:4,order:2},
      {type:'line',label:'แนวโน้ม',data:s.count,borderColor:'#C8102E',backgroundColor:'#C8102E',
        borderWidth:2.5,tension:0.3,fill:false,pointRadius:3.5,pointHoverRadius:6,
        pointBackgroundColor:'#fff',pointBorderColor:'#C8102E',pointBorderWidth:2,order:1}
    ]},
    options:{responsive:true,maintainAspectRatio:false,layout:{padding:{top:30}},
      plugins:{
        legend:{display:false},
        title:{display:true,text:'จำนวนการแลกของรางวัล (ครั้ง)',font:{size:14,weight:'bold'},padding:{bottom:12}},
        datalabels:{display:ctx=>ctx.dataset.type==='bar',anchor:'end',align:'top',
          color:'#1A1A1A',font:{weight:'bold',size:11},formatter:v=>v>0?fmt(v):''},
        tooltip:{filter:i=>i.datasetIndex===0,callbacks:{label:c=>` ${fmt(c.parsed.y)} ครั้ง`}}
      },
      scales:{x:{grid:{display:false}},y:{beginAtZero:true,grid:softGrid,ticks:{callback:v=>fmt(v)}}}
    }
  });
  // Chart 2 — Give vs Used points: grouped bars with a value label above each
  // bar so the two series can be compared per month at a glance. display:'auto'
  // hides labels that would collide; a white pill keeps them readable over bars.
  mkChart('c5b',{type:'bar',
    data:{labels:lab,datasets:[
      {label:'Give Points (แจก-ทุกแหล่ง)',data:s5GivePts,backgroundColor:'#3A4DA0',borderRadius:3},
      {label:'Used Points (REDEEMED)',data:s.pts_point,backgroundColor:'#7B1E26',borderRadius:3}
    ]},
    options:{responsive:true,maintainAspectRatio:false,layout:{padding:{top:30}},
      plugins:{
        legend:{position:'top',align:'end',onClick:focusLegendClick},
        title:{display:true,text:'Give Points เทียบ Used Points (แต้ม)',font:{size:14,weight:'bold'},padding:{bottom:12}},
        datalabels:{display:'auto',anchor:'end',align:'top',offset:2,
          color:ctx=>ctx.dataset.backgroundColor,font:{weight:'bold',size:9},
          backgroundColor:'rgba(255,255,255,0.85)',borderRadius:4,padding:{top:1,bottom:1,left:4,right:4},
          formatter:v=>v>0?fmt(v):''},
        tooltip:{callbacks:{label:c=>` ${c.dataset.label}: ${fmt(c.parsed.y)} แต้ม`}}
      },
      scales:{x:{grid:{display:false}},y:{beginAtZero:true,grid:softGrid,ticks:{callback:v=>fmt(v)}}}
    }
  });
  // Hero = total redemption count (the engagement headline). Sub-cards keep
  // the points spent + Used-Points-from-point_report + Used/Give ratio so the
  // marketing team can see "how many redemptions, how many points it cost,
  // is the program working?" without scrolling to the table.
  const heroP5=`<div class="kpi-hero"><div class="kpi-hero-lab">การแลกของรางวัลทั้งหมด</div><div class="kpi-hero-val">${fmt(s.total_count)}<span class="kpi-hero-unit">ครั้ง</span></div></div>`;
  const subP5='<div class="stat-row">'+
    `<div class="stat" style="border-left-color:#7B1E26"><div class="stat-val">${fmt(s.total_pts)}</div><div class="stat-lbl">คะแนนที่ใช้แลก (Redemption)</div></div>`+
    `<div class="stat" style="border-left-color:#C8102E"><div class="stat-val">${fmt(totalUsed)}</div><div class="stat-lbl">Used Points (REDEEMED)</div></div>`+
    `<div class="stat" style="border-left-color:#3A4DA0"><div class="stat-val">${totalGive>0?(totalUsed/totalGive*100).toFixed(1)+'%':'–'}</div><div class="stat-lbl">Used / Give Rate</div></div>`+
  '</div>';
  document.getElementById('kpi5').innerHTML=heroP5+subP5;

  // ตารางหลัก เรียงจากเก่าไปใหม่ (ascending)
  // คอลัมน์ %Ch ของจำนวนที่แลกถูกตัดออก — โฟกัสที่ตัวเลขแลกต่อเดือน ไม่ใช่ % เปลี่ยนแปลง
  let r5=`<table><tr><th>เดือน</th>${thC('Give Points','#3A4DA0')}${thC('Used Points','#7B1E26')}${thC('%Ch (Used)','#6c6f7e')}${thC('จำนวนที่แลก','#1A1A1A')}${thC('Used/Give %','#004EE6')}</tr>`;
  s.months.forEach((m,i)=>{
    const gv=s5GivePts[i]||0,us=s.pts_point[i]||0;
    const prevUs=i>0?s.pts_point[i-1]:null;
    r5+=`<tr><td>${ML[m]||m}</td><td>${fmt(gv)}</td><td>${fmt(us)}</td>${pchCell(prevUs!==null&&prevUs!==0?(us-prevUs)/prevUs:null)}<td>${fmt(s.count[i])}</td><td>${gv>0?(us/gv*100).toFixed(1)+'%':'–'}</td></tr>`;
  });
  r5+=`<tr class="tot"><td>รวม</td><td>${fmt(totalGive)}</td><td>${fmt(totalUsed)}</td><td>–</td><td>${fmt(s.total_count)}</td><td>${totalGive>0?(totalUsed/totalGive*100).toFixed(1)+'%':'–'}</td></tr></table>`;
  document.getElementById('t5').innerHTML=r5;

  // Pivot ของรางวัล: monthly ≤15 เดือน, quarterly >15 เดือน
  const pv=buildRewardPivot(s);
  const modeEl=document.getElementById('pivotModeLabel');
  if(modeEl) modeEl.textContent=pv.isQuarterly?'(รายไตรมาส — ข้อมูลมากกว่า 15 เดือน)':'(รายเดือน)';
  // rdList มาเรียงจากมากไปน้อยอยู่แล้ว → 5 แถวแรกคือ Top 5
  // ใส่เหรียญอันดับ + ไฮไลต์ให้เด่น ส่วนอันดับ 6 เป็นต้นไปแสดงปกติ
  let r5r=`<table class="tname"><tr><th style="text-align:left">อันดับ / ของรางวัล</th>${pv.cols.map((c,i)=>'<th>'+pv.colLabels[i]+'</th>').join('')}<th>รวม</th></tr>`;
  pv.rdList.forEach(([n,data],idx)=>{
    const tot=Object.values(data).reduce((a,b)=>a+b,0);
    const rank=idx+1;
    const isTop=rank<=5;
    const badge=`<span class="rank-badge rank-${isTop?rank:'n'}">${rank}</span>`;
    r5r+=`<tr class="${isTop?'reward-top':''}"><td>${badge}${n}</td>${pv.cols.map(c=>'<td>'+(data[c]||'–')+'</td>').join('')}<td><b>${tot}</b></td></tr>`;
  });
  r5r+=`<tr class="tot"><td style="text-align:left">รวม</td>${pv.cols.map(c=>'<td>'+(pv.countByCol[c]||0)+'</td>').join('')}<td>${s.total_count}</td></tr></table>`;
  document.getElementById('t5r').innerHTML=r5r;
}
