// ════════════════════════════════════════════════════════════════
// API — Supabase sync (fetch all, backup, clear) + CRUD modals
// ════════════════════════════════════════════════════════════════

function loadApiUrl(){
  const url=localStorage.getItem('ld_api_url')||'';
  document.getElementById('apiUrlInput').value=url;
}

function saveApiUrl(){
  const url=document.getElementById('apiUrlInput').value.trim();
  localStorage.setItem('ld_api_url',url);
  addLog('info','บันทึก URL แล้ว: '+url.substring(0,60)+'...');
  updateCrudSection();
}

// ── Pull all rows from one Supabase table (paginated) ──
async function supaFetchAll(table){
  const rows=[], PAGE=1000; let from=0;
  while(true){
    const res=await fetch(`${SUPA.url}/${table}?select=*&order=id&limit=${PAGE}&offset=${from}`,{headers:SUPA.h});
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const batch=await res.json();
    rows.push(...batch);
    if(batch.length<PAGE) break;
    from+=PAGE;
  }
  return rows;
}

async function syncFromApi(){
  addLog('info','กำลัง sync จาก Supabase...');
  try{
    const [contacts,pointReport,redemptions]=await Promise.all([
      supaFetchAll('contacts'),
      supaFetchAll('point_report'),
      supaFetchAll('redemptions')
    ]);
    const ts=new Date().toLocaleString('th-TH');
    if(contacts.length){
      inactiveData = computeInactiveData(contacts);
      storeContacts(contacts,{name:'Supabase Sync',rows:contacts.length,uploadDate:ts});
      fileInfo[0]={name:'Supabase Sync',rows:contacts.length,uploadDate:ts};
      addLog('ok',`Contacts: ${contacts.length.toLocaleString()} แถว`);
    }
    if(pointReport.length){
      storePointReport(pointReport,{name:'Supabase Sync',rows:pointReport.length,uploadDate:ts});
      fileInfo[1]={name:'Supabase Sync',rows:pointReport.length,uploadDate:ts};
      addLog('ok',`Point Report: ${pointReport.length.toLocaleString()} แถว`);
    }
    if(redemptions.length){
      storeRedemptions(redemptions,{name:'Supabase Sync',rows:redemptions.length,uploadDate:ts});
      fileInfo[2]={name:'Supabase Sync',rows:redemptions.length,uploadDate:ts};
      addLog('ok',`Redemptions: ${redemptions.length.toLocaleString()} แถว`);
    }
    if(!contacts.length&&!pointReport.length&&!redemptions.length){
      addLog('info','Supabase ยังไม่มีข้อมูล — อัปโหลด Excel เพื่อ backup ครั้งแรก');
      return;
    }
    recomputeAndRender();
    addLog('ok','Sync สำเร็จ — Dashboard อัปเดตแล้ว');
  }catch(err){
    addLog('err','Sync ไม่สำเร็จ: '+err.message);
  }
}

function addLog(type, msg){
  const log=document.getElementById('syncLog');
  const ts=new Date().toLocaleTimeString('th-TH');
  log.innerHTML+=`<div class="log-${type}">[${ts}] ${msg}</div>`;
  log.scrollTop=log.scrollHeight;
}

// ════════════════════════════════════════════════════════════════
// CRUD MODALS — manual insert via Supabase
// ════════════════════════════════════════════════════════════════
function updateCrudSection(){
  const sec=document.getElementById('crudSection');
  if(sec) sec.style.display='block';
}

function addCrudLog(type,msg){
  const log=document.getElementById('crudLog');
  if(!log) return;
  log.style.display='block';
  const ts=new Date().toLocaleTimeString('th-TH');
  log.innerHTML=`<div class="log-${type}">[${ts}] ${msg}</div>`;
}

async function writeToSheet(action,sheet,data){
  const table=SUPA_TABLE[sheet]||sheet;
  addCrudLog('info','กำลังเขียนข้อมูลเข้า Supabase...');
  try{
    let res;
    if(action==='insert'){
      res=await fetch(`${SUPA.url}/${table}`,{method:'POST',headers:{...SUPA.h,'Prefer':'return=minimal'},body:JSON.stringify(data)});
    }else if(action==='delete'&&data&&data.rowId){
      res=await fetch(`${SUPA.url}/${table}?id=eq.${data.rowId}`,{method:'DELETE',headers:SUPA.h});
    }
    if(res&&!res.ok){const t=await res.text();throw new Error(`HTTP ${res.status}: ${t}`);}
    addCrudLog('ok','บันทึกสำเร็จ — กำลัง Sync Dashboard...');
    return true;
  }catch(err){
    addCrudLog('err','เขียนไม่สำเร็จ: '+err.message);
    return false;
  }
}

function openAddModal(type){
  const now=new Date();
  const dtLocal=toLocalISODateTime(now);
  const dateOnly=toLocalISODate(now);
  if(type==='contact'){
    document.getElementById('ci_regdate').value=dateOnly;
    document.getElementById('ci_name').value='';
    document.getElementById('ci_phone').value='';
    document.getElementById('ci_tier').value='';
    document.getElementById('ci_pts').value='0';
    document.getElementById('addContactModal').classList.add('show');
  }else if(type==='point'){
    document.getElementById('pi_dt').value=dtLocal;
    document.getElementById('pi_name').value='';
    document.getElementById('pi_tel').value='';
    document.getElementById('pi_pts').value='0';
    document.getElementById('pi_sale').value='0';
    document.getElementById('pi_source').value='';
    document.getElementById('pi_subchannel').value='';
    document.getElementById('addPointModal').classList.add('show');
  }else if(type==='redemption'){
    document.getElementById('ri_dt').value=dtLocal;
    document.getElementById('ri_reward').value='';
    document.getElementById('ri_code').value='';
    document.getElementById('ri_pts').value='0';
    document.getElementById('ri_name').value='';
    document.getElementById('ri_tel').value='';
    document.getElementById('addRedemptionModal').classList.add('show');
  }
}

function closeAddModal(type){
  const ids={contact:'addContactModal',point:'addPointModal',redemption:'addRedemptionModal'};
  document.getElementById(ids[type]).classList.remove('show');
}

async function submitAdd(type){
  let sheet,data,btnId;
  if(type==='contact'){
    sheet='contacts'; btnId='submitContactBtn';
    const d=document.getElementById('ci_regdate').value;
    data={
      'Name':document.getElementById('ci_name').value,
      'Status':document.getElementById('ci_status').value,
      'Register Date':d?new Date(d).toLocaleDateString('en-GB'):'',
      'Phone No':document.getElementById('ci_phone').value,
      'Gender':document.getElementById('ci_gender').value,
      'Tier':document.getElementById('ci_tier').value,
      'Points balance':Number(document.getElementById('ci_pts').value)||0
    };
  }else if(type==='point'){
    sheet='Point Report'; btnId='submitPointBtn';
    const dt=new Date(document.getElementById('pi_dt').value);
    data={
      'Date & time':dt.toLocaleDateString('en-GB')+' '+dt.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}),
      'Member name':document.getElementById('pi_name').value,
      'Member tel':document.getElementById('pi_tel').value,
      'Point type':document.getElementById('pi_type').value,
      'Points collected':Number(document.getElementById('pi_pts').value)||0,
      'Sale amount (THB)':Number(document.getElementById('pi_sale').value)||0,
      'Source':document.getElementById('pi_source').value,
      'Channel':document.getElementById('pi_channel').value,
      'Sub channel':document.getElementById('pi_subchannel').value
    };
  }else if(type==='redemption'){
    sheet='Redemptions'; btnId='submitRedemptionBtn';
    const dt=new Date(document.getElementById('ri_dt').value);
    data={
      'Date & time':dt.toLocaleDateString('en-GB')+' '+dt.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}),
      'Reward name':document.getElementById('ri_reward').value,
      'Reward code':document.getElementById('ri_code').value,
      'Points used':Number(document.getElementById('ri_pts').value)||0,
      'Member name':document.getElementById('ri_name').value,
      'Member tel':document.getElementById('ri_tel').value
    };
  }
  const btn=document.getElementById(btnId);
  const origLabel=btn.textContent;
  btn.disabled=true; btn.textContent='กำลังบันทึก...';
  const ok=await writeToSheet('insert',sheet,data);
  btn.disabled=false; btn.textContent=origLabel;
  if(ok){
    closeAddModal(type);
    addLog('info','Sync ข้อมูลใหม่จาก Sheets...');
    await syncFromApi();
  }
}

// ════════════════════════════════════════════════════════════════
// SUPABASE BACKUP & CLEAR — bulk operations
// ════════════════════════════════════════════════════════════════
function supaDateStr(v){
  const d=parseDate(v);
  if(!d) return v;
  return toLocalISODate(d); // "YYYY-MM-DD" using local timezone (avoids UTC shift to previous day)
}

async function backupToSheet(slot, rows){
  const TABLE_NAMES=['contacts','point_report','redemptions'];
  const table=TABLE_NAMES[slot];
  const cols=SUPA_COLS[table];
  // Keep only schema columns; all rows must have identical keys (PGRST102 requires uniform keys in batch insert)
  const clean=rows.map(r=>{const o={};cols.forEach(c=>{const keys=SUPA_ALIASES[c]||[c];const v=findVal(r,keys);o[c]=(v!==''&&v!=null)?(SUPA_DATE_COLS.has(c)?supaDateStr(v):v):null;});return o;});
  addLog('info',`Backup ${clean.length.toLocaleString()} แถว → Supabase "${table}"...`);
  try{
    await fetch(`${SUPA.url}/${table}?id=gte.0`,{method:'DELETE',headers:SUPA.h});
    const CHUNK=500;
    for(let i=0;i<clean.length;i+=CHUNK){
      const res=await fetch(`${SUPA.url}/${table}`,{
        method:'POST',headers:{...SUPA.h,'Prefer':'return=minimal'},
        body:JSON.stringify(clean.slice(i,i+CHUNK))
      });
      if(!res.ok){const t=await res.text();throw new Error(`HTTP ${res.status}: ${t}`);}
    }
    addLog('ok',`Backup สำเร็จ ${clean.length.toLocaleString()} แถว → Supabase`);
  }catch(err){
    addLog('warn',`Backup ไม่สำเร็จ: ${err.message}`);
  }
}

async function clearSheets(){
  addLog('info','กำลังล้างข้อมูลใน Supabase...');
  try{
    await Promise.all([
      fetch(`${SUPA.url}/contacts?id=gte.0`,{method:'DELETE',headers:SUPA.h}),
      fetch(`${SUPA.url}/point_report?id=gte.0`,{method:'DELETE',headers:SUPA.h}),
      fetch(`${SUPA.url}/redemptions?id=gte.0`,{method:'DELETE',headers:SUPA.h})
    ]);
    addLog('ok','ล้างข้อมูลใน Supabase ทั้งหมดแล้ว');
  }catch(err){
    addLog('warn',`ล้างไม่สำเร็จ: ${err.message}`);
  }
}
