// ════════════════════════════════════════════════════════════════
// DATA QUALITY VALIDATORS — run on uploaded rows before storing
// ════════════════════════════════════════════════════════════════

function validateContacts(rows){
  const issues=[], activePhones={};
  rows.forEach((r,i)=>{
    const phone=String(findVal(r,['phone no','phone','tel','telephone','mobile','member tel','membertel'])||'').replace(/\D/g,'').trim();
    const name=String(findVal(r,['name','full name','fullname'])||'').trim();
    const dateStr=String(findVal(r,['register date','registerdate'])||'').trim();
    const status=String(findVal(r,['status'])||'').trim();
    const raw={phone, name, registerDate:dateStr, status};
    if(phone){
      const isActive=status.toUpperCase()==='ACTIVE';
      if(isActive){
        if(activePhones[phone]){
          // Same phone with 2 ACTIVE accounts = real system bug (points double-counted)
          issues.push({level:'err',type:'เบอร์ซ้ำ (ACTIVE)',row:i+2,msg:`เบอร์ ${phone}${name?' — '+name:''} มี 2 account ACTIVE  (แถว ${i+2} ซ้ำกับแถว ${activePhones[phone]})`,raw});
        } else activePhones[phone]=i+2;
      }
      // INACTIVE duplicates are expected (incomplete registrations) — not flagged
    }
    if(dateStr&&!parseDate(dateStr)){
      issues.push({level:'warn',type:'วันที่ผิดรูป',row:i+2,msg:`วันที่อ่านไม่ได้: "${dateStr}"  (แถว ${i+2})`,raw});
    }
  });
  const dupCount=issues.filter(x=>x.type==='เบอร์ซ้ำ (ACTIVE)').length;
  const hasErr=issues.some(x=>x.level==='err'), hasWarn=issues.some(x=>x.level==='warn');
  return {label:'Contacts',total:rows.length,level:hasErr?'err':hasWarn?'warn':'ok',dupCount,issues};
}

function validatePointReport(rows){
  const issues=[], seen={};
  rows.forEach((r,i)=>{
    const dt=String(findVal(r,['date & time','date&time','datetime','date time'])||'').trim();
    const tel=String(findVal(r,['member tel','membertel','tel','phone'])||'').replace(/\D/g,'').trim();
    const pts=findVal(r,['points collected','points'])||0;
    const ptype=String(findVal(r,['point type','pointtype'])||'').trim();
    const sale=parseFloat(findVal(r,['sale amount (thb)','sale amount','saleamount'])||0)||0;
    const source=String(findVal(r,['source'])||'').trim();
    const channel=String(findVal(r,['channel'])||'').trim();
    const note=String(findVal(r,['note','หมายเหตุ','remark','remarks','memo','description'])||'').trim();
    const raw={date:dt, tel, pointType:ptype, points:pts, saleAmount:sale, source, channel, note};
    const ptypeLow=ptype.toLowerCase();
    const key=`${dt}|${tel}|${pts}`;
    if(tel&&dt){
      if(seen[key]){
        issues.push({level:'err',type:'แถวซ้ำ',row:i+2,msg:`ซ้ำ: ${dt} | tel ${tel} | pts ${pts}  (แถว ${i+2})`,raw});
      } else seen[key]=i+2;
    }
    // Only warn GIVEN+zero-sale for purchase-based sources, not bonus points
    const isBonusSource=QA_BONUS_SOURCES.some(b=>source.toLowerCase().includes(b));
    if((ptypeLow==='given'||ptypeLow==='give')&&sale===0&&!isBonusSource){
      const noteHint=note?` | Note: "${note}"`:'';
      issues.push({level:'warn',type:'GIVEN ยอดขาย 0',row:i+2,msg:`GIVEN แต่ยอดขาย = 0  (แถว ${i+2} | source: ${source||'-'}${noteHint})`,raw});
    }
    if(dt&&!parseDate(dt)){
      issues.push({level:'warn',type:'วันที่ผิดรูป',row:i+2,msg:`วันที่อ่านไม่ได้: "${dt}"  (แถว ${i+2})`,raw});
    }
  });
  const dupCount=issues.filter(x=>x.type==='แถวซ้ำ').length;
  const hasErr=issues.some(x=>x.level==='err'), hasWarn=issues.some(x=>x.level==='warn');
  return {label:'Point Report',total:rows.length,level:hasErr?'err':hasWarn?'warn':'ok',dupCount,issues};
}

function validateRedemptions(rows){
  const issues=[], seen={};
  rows.forEach((r,i)=>{
    const dt=String(findVal(r,['date & time','date&time','datetime','date time'])||'').trim();
    const tel=String(findVal(r,['member tel','membertel','tel','phone'])||'').replace(/\D/g,'').trim();
    const reward=String(findVal(r,['reward name','rewardname'])||'').trim();
    const pts=parseFloat(findVal(r,['points used','pointsused'])||0)||0;
    const raw={date:dt, tel, rewardName:reward, pointsUsed:pts};
    const key=`${dt}|${tel}|${reward}|${pts}`;
    if(tel&&dt){
      if(seen[key]){
        issues.push({level:'err',type:'แถวซ้ำ',row:i+2,msg:`ซ้ำ: ${dt} | tel ${tel} | ${reward}  (แถว ${i+2})`,raw});
      } else seen[key]=i+2;
    }
    if(pts===0){
      issues.push({level:'warn',type:'Points Used 0',row:i+2,msg:`Points Used = 0  (แถว ${i+2} | tel ${tel||'-'} | ${reward||'-'})`,raw});
    }
    if(dt&&!parseDate(dt)){
      issues.push({level:'warn',type:'วันที่ผิดรูป',row:i+2,msg:`วันที่อ่านไม่ได้: "${dt}"  (แถว ${i+2})`,raw});
    }
  });
  const dupCount=issues.filter(x=>x.type==='แถวซ้ำ').length;
  const hasErr=issues.some(x=>x.level==='err'), hasWarn=issues.some(x=>x.level==='warn');
  return {label:'Redemptions',total:rows.length,level:hasErr?'err':hasWarn?'warn':'ok',dupCount,issues};
}

function qaIssueList(issues, slot, expanded){
  if(!issues.length) return '';
  const SHOW=5;
  const shown = expanded ? issues : issues.slice(0,SHOW);
  const more = issues.length - SHOW;
  const items = shown.map(x=>`<li><span class="qa-dot ${x.level}"></span><span>${x.msg}</span></li>`).join('');
  const toggle = (!expanded && more>0)
    ? `<li style="list-style:none"><button class="qa-toggle" onclick="qaExpand(${slot})">ดูอีก ${more} รายการ ▾</button></li>`
    : (expanded && issues.length>SHOW ? `<li style="list-style:none"><button class="qa-toggle" onclick="qaCollapse(${slot})">ย่อ ▴</button></li>` : '');
  return `<ul class="qa-issues">${items}${toggle}</ul>`;
}

function qaExpand(slot){qaExpanded[slot]=true;renderQualityReport();}
function qaCollapse(slot){qaExpanded[slot]=false;renderQualityReport();}

function exportQaReport(slot){
  const q=qaStore[slot]; if(!q||!q.issues.length) return;
  // Column schema per file type — use actual uploaded values, not synthesized messages
  const SCHEMAS=[
    {headers:['ประเภทปัญหา','ระดับ','แถว (ไฟล์)','เบอร์โทร','ชื่อ','วันสมัคร','Status'],
     row:x=>[x.type, x.level==='err'?'ERROR':'WARNING', x.row, x.raw?.phone||'', x.raw?.name||'', x.raw?.registerDate||'', x.raw?.status||'']},
    {headers:['ประเภทปัญหา','ระดับ','แถว (ไฟล์)','Date & Time','Member Tel','Point Type','Points Collected','Sale Amount','Source','Channel','Note'],
     row:x=>[x.type, x.level==='err'?'ERROR':'WARNING', x.row, x.raw?.date||'', x.raw?.tel||'', x.raw?.pointType||'', x.raw?.points||'', x.raw?.saleAmount||'', x.raw?.source||'', x.raw?.channel||'', x.raw?.note||'']},
    {headers:['ประเภทปัญหา','ระดับ','แถว (ไฟล์)','Date & Time','Member Tel','Reward Name','Points Used'],
     row:x=>[x.type, x.level==='err'?'ERROR':'WARNING', x.row, x.raw?.date||'', x.raw?.tel||'', x.raw?.rewardName||'', x.raw?.pointsUsed||'']},
  ];
  const s=SCHEMAS[slot];
  const csvRows=[s.headers, ...q.issues.map(s.row)];
  const csv=csvRows.map(r=>r.map(c=>'"'+String(c).replace(/"/g,'""')+'"').join(',')).join('\n');
  const blob=new Blob(['﻿'+csv],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=`qa_${q.label.replace(/\s/g,'_')}_${toLocalISODate(new Date())}.csv`;
  a.click();
}

function renderQualityReport(){
  const el=document.getElementById('qaSection');
  if(!qaStore.some(q=>q)){el.style.display='none';return;}
  const ICONS=['users','star','gift'], NAMES=['Contacts','Point Report','Redemptions'];
  const levelIcon=lvl=>lvl==='err'?'<i data-lucide="x-circle" style="color:#C8102E"></i>':lvl==='warn'?'<i data-lucide="alert-triangle" style="color:#f39c12"></i>':'<i data-lucide="check-circle" style="color:#1a8f3c"></i>';
  const cards=qaStore.map((q,i)=>{
    if(!q) return `<div class="qa-file-card"><div class="qa-file-name with-icon"><i data-lucide="${ICONS[i]}" class="icon-sm"></i> ${NAMES[i]}</div><span class="qa-badge empty">ยังไม่อัปโหลด</span></div>`;
    const labelTh=q.level==='err'?'พบปัญหา':q.level==='warn'?'ควรตรวจสอบ':'ผ่านการตรวจ';
    const dupNote=q.dupCount>0?` &nbsp;·&nbsp; <b style="color:#c0392b">${q.dupCount} แถวซ้ำ</b>`:'';
    const issHtml=qaIssueList(q.issues, i, qaExpanded[i]);
    const exportBtn=q.issues.length?`<button class="qa-export-btn" onclick="exportQaReport(${i})"><i data-lucide="download" class="icon-sm"></i> Export รายงาน .csv</button>`:'';
    return `<div class="qa-file-card ${q.level}">
      <div class="qa-file-name with-icon"><i data-lucide="${ICONS[i]}" class="icon-sm"></i> ${NAMES[i]}</div>
      <span class="qa-badge ${q.level} with-icon">${levelIcon(q.level)} ${labelTh}</span>
      <div class="qa-meta">${q.total.toLocaleString()} แถว${dupNote} &nbsp;·&nbsp; ${q.issues.length} รายการ</div>
      ${issHtml}
      ${exportBtn}
    </div>`;
  }).join('');
  const overallLevel=qaStore.filter(Boolean).reduce((w,q)=>q.level==='err'?'err':w==='err'?'err':q.level==='warn'?'warn':w,'ok');
  const overallMsg=overallLevel==='err'?'พบข้อมูลซ้ำหรือผิดพลาด — กรุณาตรวจสอบก่อนนำเสนอ':overallLevel==='warn'?'มีรายการที่ควรตรวจสอบ':'ข้อมูลทั้งหมดผ่านการตรวจสอบ';
  el.style.display='block';
  el.innerHTML=`<div class="qa-section"><div class="qa-title with-icon">${levelIcon(overallLevel)} Data Quality Check &nbsp;—&nbsp; ${overallMsg}</div><div class="qa-grid">${cards}</div></div>`;
  refreshIcons();
}
