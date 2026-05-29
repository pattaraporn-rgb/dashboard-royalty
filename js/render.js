// ════════════════════════════════════════════════════════════════
// RENDER — UI updates + panel renderers (P2–P5) + chart helpers
// ════════════════════════════════════════════════════════════════

// Chart.js global defaults (Chart must be loaded via CDN before this file)
Chart.defaults.font.family="'Tahoma','Segoe UI',sans-serif";
Chart.defaults.font.size=11;
// Register chartjs-plugin-datalabels globally (loaded via CDN as ChartDataLabels)
// Default display:false so other charts don't show labels unless they opt in.
if(typeof ChartDataLabels!=='undefined'){Chart.register(ChartDataLabels);Chart.defaults.set('plugins.datalabels',{display:false});}

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
    status.innerHTML=`<span class="loaded">✓ โหลดแล้ว — ${fi.rows.toLocaleString()} แถว</span><br><span style="color:#888;font-size:10px">${fi.name} · ${fi.uploadDate||''}</span>`;
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
      <div class="db-sum-val">${hasContact?'✓':'–'}</div>
      <div class="db-sum-sub">${hasContact?(fileInfo[0].rows||0).toLocaleString()+' แถว':'ยังไม่อัปโหลด'}</div>
    </div>
    <div class="db-sum-card ${hasPoint?'ok':''}">
      <div class="db-sum-label">Point Report</div>
      <div class="db-sum-val">${hasPoint?'✓':'–'}</div>
      <div class="db-sum-sub">${hasPoint?(fileInfo[1].rows||0).toLocaleString()+' แถว':'ยังไม่อัปโหลด'}</div>
    </div>
    <div class="db-sum-card ${hasRedemp?'ok':''}">
      <div class="db-sum-label">Redemptions</div>
      <div class="db-sum-val">${hasRedemp?'✓':'–'}</div>
      <div class="db-sum-sub">${hasRedemp?(fileInfo[2].rows||0).toLocaleString()+' แถว':'ยังไม่อัปโหลด'}</div>
    </div>
    <div class="db-sum-card ${allOk?'ok':'warn'}">
      <div class="db-sum-label">Dashboard</div>
      <div class="db-sum-val">${allOk?'✅':'⚠️'}</div>
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
        borderWidth:2,pointRadius:5,pointHoverRadius:7,tension:0.3,fill:false,order:1}
    ]},
    options:{responsive:true,maintainAspectRatio:false,layout:{padding:{top:24}},
      plugins:{
        legend:{display:false},
        tooltip:{filter:i=>i.datasetIndex===0},
        datalabels:{display:ctx=>ctx.dataset.type==='bar',
          labels:{
            value:{anchor:'end',align:'top',color:'#1A1A1A',font:{weight:'bold',size:11},formatter:v=>fmt(v)},
            percent:{
              // Smart position: center inside bar when tall enough, otherwise above bar
              anchor:ctx=>{const v=ctx.dataset.data[ctx.dataIndex],yMax=ctx.chart.scales.y.max||1,barH=(v/yMax)*ctx.chart.chartArea.height;return barH<28?'end':'center';},
              align:ctx=>{const v=ctx.dataset.data[ctx.dataIndex],yMax=ctx.chart.scales.y.max||1,barH=(v/yMax)*ctx.chart.chartArea.height;return barH<28?'top':'center';},
              offset:ctx=>{const v=ctx.dataset.data[ctx.dataIndex],yMax=ctx.chart.scales.y.max||1,barH=(v/yMax)*ctx.chart.chartArea.height;return barH<28?20:0;},
              color:'#fff',borderRadius:10,padding:{top:3,bottom:3,left:7,right:7},
              font:{weight:'bold',size:10},
              backgroundColor:ctx=>{const p=s.pch[ctx.dataIndex];if(p==null)return null;return p>0.0005?'#1a8f3c':p<-0.0005?'#C8102E':'#888';},
              // Bug fix: include dataset type check so pill renders only on bars, not line points
              display:ctx=>ctx.dataset.type==='bar'&&s.pch[ctx.dataIndex]!=null,
              formatter:(_,ctx)=>{const p=s.pch[ctx.dataIndex];if(p==null)return'';const pct=(p*100).toFixed(1);return(p>0?'+':'')+pct+'%';}
            }
          }
        }
      },
      scales:{y:{beginAtZero:true,ticks:{callback:v=>fmt(v)}}}
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
    el.innerHTML=`<div class="inactive-section"><div class="inactive-title" style="color:var(--mut);font-weight:400;font-size:12px;">😴 Last Activity Date — อัปโหลดไฟล์ Contacts อีกครั้งเพื่อดูข้อมูล (ข้อมูลนี้ไม่ได้บันทึกถาวร)</div></div>`;
    return;
  }
  const cutoffLabel=ia.cutoffStr?ia.cutoffStr.slice(0,7).replace('-','/'):'-';
  const blankCount=ia.blankCount;
  const noColNote=!ia.hasColumn?`<div style="font-size:10px;color:#e67e22;margin-top:4px;">⚠️ ไม่พบคอลัมน์ Last Activity Date ในไฟล์</div>`:'';
  el.style.display='block';
  el.innerHTML=`<div class="inactive-section">
    <div class="inactive-title">😴 สมาชิก ACTIVE ที่ไม่ได้ใช้งาน &nbsp;—&nbsp; จาก ${fmt(ia.totalActive)} คน ACTIVE ทั้งหมด</div>
    ${noColNote}
    <div class="inactive-grid">
      <div class="inactive-card blank">
        <div class="inactive-label">🔲 ไม่มีข้อมูล Last Activity</div>
        <div class="inactive-count">${fmt(blankCount)}</div>
        <div class="inactive-sub">คน — ไม่เคยมีประวัติการเข้าระบบ${!ia.hasColumn?' (ไม่พบคอลัมน์ในไฟล์)':''}</div>
        ${ia.blank.length>0?`<button class="inactive-export" onclick="exportInactiveMembers('blank')">📥 Export รายชื่อ (${fmt(ia.blank.length)} คน) .csv</button>`:''}
      </div>
      <div class="inactive-card overdue">
        <div class="inactive-label">⏰ ไม่ได้เข้าระบบ &gt;3 เดือน (ก่อน ${cutoffLabel})</div>
        <div class="inactive-count">${fmt(ia.overdueCount)}</div>
        <div class="inactive-sub">คน — Last Activity Date ก่อน ${cutoffLabel}<br>อาจเป็นลูกค้าที่หลุดออกจากระบบ</div>
        ${ia.overdueCount>0?`<button class="inactive-export" onclick="exportInactiveMembers('overdue')">📥 Export รายชื่อ (${fmt(ia.overdueCount)} คน) .csv</button>`:''}
      </div>
    </div>
  </div>`;
}

function exportInactiveMembers(type){
  const ia=inactiveData; if(!ia){alert('⚠️ ไม่พบข้อมูล กรุณาอัปโหลดไฟล์ Contacts ใหม่อีกครั้ง');return;}
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
  mkChart('c3',{type:'bar',
    data:{labels:lab, datasets:CH_KEYS.filter(k=>s.data[k]).map(k=>({label:k,data:s.data[k],backgroundColor:CHART_COLORS[k],borderRadius:3}))},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'top'}},scales:{x:{stacked:true},y:{stacked:true,beginAtZero:true,ticks:{callback:v=>fmt(v)}}}}
  });
  const useKeys=CH_KEYS.filter(k=>s.data[k]&&s.totals[k]>0);
  document.getElementById('kpi3').innerHTML=
    stat('฿'+fmt(s.grand),'ยอดขายรวม','#5a3a00')+
    useKeys.map(k=>stat('฿'+fmt(s.totals[k]),k,CHART_COLORS[k]||'#555')).join('');
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
  mkChart('c4a',{type:'bar',
    data:{labels:lab,datasets:aKeys.map(k=>({label:k,data:a.data[k],backgroundColor:CHART_COLORS[k],borderRadius:3}))},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'top'}},scales:{x:{stacked:true},y:{stacked:true,beginAtZero:true,ticks:{callback:v=>fmt(v)}}}}
  });
  mkChart('c4b',{type:'bar',
    data:{labels:lab,datasets:bKeys.map(k=>({label:k,data:b.data[k],backgroundColor:CHART_COLORS[k]||'#999'}))},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'top'}},scales:{x:{stacked:true},y:{stacked:true,beginAtZero:true,ticks:{callback:v=>fmt(v)}}}}
  });
  const wpTotal=b.totals['Welcome Point']||0;
  document.getElementById('kpi4').innerHTML=
    stat(fmt(a.grand),'คะแนน 3.1 (ช่องทาง)','#5a3a00')+
    stat(fmt(b.grand),'คะแนน 3.2 (ทุกแหล่ง)','#333')+
    stat(fmt(wpTotal),'Welcome Point','#C8102E')+
    stat(b.grand>0?(wpTotal/b.grand*100).toFixed(0)+'%':'–','% Welcome/รวม','#888');
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
  mkChart('c5a',{type:'bar',
    data:{labels:lab,datasets:[{label:'จำนวนที่แลก (ครั้ง)',data:s.count,backgroundColor:'#7B1E26',borderRadius:4}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'top'},title:{display:true,text:'จำนวนการแลกของรางวัล'}},scales:{y:{beginAtZero:true}}}
  });
  mkChart('c5b',{type:'bar',
    data:{labels:lab,datasets:[
      {label:'Give Points (แจก-ทุกแหล่ง)',data:s5GivePts,backgroundColor:'#3A4DA0',borderRadius:3},
      {label:'Used Points (REDEEMED)',data:s.pts_point,backgroundColor:'#7B1E26',borderRadius:3}
    ]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'top'},title:{display:true,text:'Give Points เทียบ Used Points'}},scales:{y:{beginAtZero:true,ticks:{callback:v=>fmt(v)}}}}
  });
  document.getElementById('kpi5').innerHTML=
    stat(fmt(s.total_count),'การแลกทั้งหมด','#7B1E26')+
    stat(fmt(s.total_pts),'คะแนนที่ใช้แลก (Redemption)','#7B1E26')+
    stat(fmt(totalUsed),'Used Points (REDEEMED)','#C8102E')+
    stat(totalGive>0?(totalUsed/totalGive*100).toFixed(1)+'%':'–','Used/Give Rate','#3A4DA0');

  // ตารางหลัก เรียงจากเก่าไปใหม่ (ascending)
  let r5=`<table><tr><th>เดือน</th>${thC('Give Points','#3A4DA0')}${thC('Used Points','#7B1E26')}<th>%Ch</th>${thC('จำนวนที่แลก','#1A1A1A')}<th>%Ch</th>${thC('Used/Give %','#004EE6')}</tr>`;
  s.months.forEach((m,i)=>{
    const gv=s5GivePts[i]||0,us=s.pts_point[i]||0;
    const prevUs=i>0?s.pts_point[i-1]:null;
    r5+=`<tr><td>${ML[m]||m}</td><td>${fmt(gv)}</td><td>${fmt(us)}</td>${pchCell(prevUs!==null&&prevUs!==0?(us-prevUs)/prevUs:null)}<td>${fmt(s.count[i])}</td>${pchCell(s.count_pch[i])}<td>${gv>0?(us/gv*100).toFixed(1)+'%':'–'}</td></tr>`;
  });
  r5+=`<tr class="tot"><td>รวม</td><td>${fmt(totalGive)}</td><td>${fmt(totalUsed)}</td><td>–</td><td>${fmt(s.total_count)}</td><td>–</td><td>${totalGive>0?(totalUsed/totalGive*100).toFixed(1)+'%':'–'}</td></tr></table>`;
  document.getElementById('t5').innerHTML=r5;

  // Pivot ของรางวัล: monthly ≤15 เดือน, quarterly >15 เดือน
  const pv=buildRewardPivot(s);
  const modeEl=document.getElementById('pivotModeLabel');
  if(modeEl) modeEl.textContent=pv.isQuarterly?'(รายไตรมาส — ข้อมูลมากกว่า 15 เดือน)':'(รายเดือน)';
  let r5r=`<table class="tname"><tr><th style="text-align:left">ของรางวัล</th>${pv.cols.map((c,i)=>'<th>'+pv.colLabels[i]+'</th>').join('')}<th>รวม</th></tr>`;
  pv.rdList.forEach(([n,data])=>{
    const tot=Object.values(data).reduce((a,b)=>a+b,0);
    r5r+=`<tr><td>${n}</td>${pv.cols.map(c=>'<td>'+(data[c]||'–')+'</td>').join('')}<td><b>${tot}</b></td></tr>`;
  });
  r5r+=`<tr class="tot"><td style="text-align:left">รวม</td>${pv.cols.map(c=>'<td>'+(pv.countByCol[c]||0)+'</td>').join('')}<td>${s.total_count}</td></tr></table>`;
  document.getElementById('t5r').innerHTML=r5r;
}
