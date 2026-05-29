// ════════════════════════════════════════════════════════════════
// FILE UPLOAD & PARSING — Excel → validate → backup → store → recompute
// ════════════════════════════════════════════════════════════════

function dropFile(e,slot){
  e.preventDefault();
  document.getElementById('dz'+slot).classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if(file) processFile(file, slot);
}

function handleFileSelect(input, slot){
  if(input.files[0]) processFile(input.files[0], slot);
}

function processFile(file, slot){
  const status = document.getElementById('uc'+slot+'_status');
  status.innerHTML = '<span style="color:#f39c12">กำลังอ่านไฟล์…</span>';
  const reader = new FileReader();
  reader.onload = e=>{
    try{
      const data = new Uint8Array(e.target.result);
      const wb = XLSX.read(data, {type:'array', cellDates:true});
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, {defval:'', raw:false, dateNF:'yyyy-mm-dd'});
      if(rows.length===0){ status.innerHTML='<span style="color:red">ไฟล์ว่างเปล่า</span>'; return; }

      const fi = {name:file.name, rows:rows.length, uploadDate:new Date().toLocaleString('th-TH'), slot};
      fileInfo[slot] = fi;

      // Validate raw rows before stripping
      qaStore[slot] = slot===0 ? validateContacts(rows) : slot===1 ? validatePointReport(rows) : validateRedemptions(rows);
      renderQualityReport();

      // Compute inactive analysis from raw contacts (in-memory only, avoids localStorage quota)
      if(slot===0) inactiveData = computeInactiveData(rows);

      // Backup full raw rows to Supabase (fire-and-forget, non-blocking)
      backupToSheet(slot, rows);

      // Process and store
      if(slot===0) storeContacts(rows, fi);
      else if(slot===1) storePointReport(rows, fi);
      else storeRedemptions(rows, fi);

      updateFileCard(slot, fi);
      recomputeAndRender();
    }catch(err){
      status.innerHTML=`<span style="color:red">อ่านไฟล์ไม่ได้: ${err.message}</span>`;
      console.error(err);
    }
  };
  reader.readAsArrayBuffer(file);
}

// ── Inactive member analysis (in-memory, not persisted) ──
function computeInactiveData(rows){
  const cutoff=new Date(); cutoff.setMonth(cutoff.getMonth()-3);
  const cutoffStr=toLocalISODate(cutoff);
  const LAD_KEYS=['last activity date','lastactivitydate','last activity','lastactivity','last login','lastlogin'];
  const hasColumn=rows.some(r=>String(findVal(r,LAD_KEYS)||'').trim()!=='');
  const activeRows=rows.filter(r=>String(findVal(r,['status'])||'').trim().toUpperCase()==='ACTIVE');
  const blank=[], overdue=[];
  activeRows.forEach(r=>{
    const name=String(findVal(r,['name','full name','fullname'])||'').trim();
    const phone=String(findVal(r,['phone no','phone','tel','telephone','mobile','member tel','membertel'])||'').replace(/\D/g,'').trim();
    const lastActStr=String(findVal(r,LAD_KEYS)||'').trim();
    const lastAct=lastActStr?parseDate(lastActStr):null;
    const lastActIso=lastAct?toLocalISODate(lastAct):'';
    const regDate=String(findVal(r,['register date','registerdate'])||'').trim();
    const lineUserId=String(findVal(r,['line user id','line user','lineuserid','line id'])||'').trim();
    const status=String(findVal(r,['status'])||'').trim().toUpperCase();
    const entry={name,phone,regDate,lastActivityDate:lastActIso,lineUserId,status};
    if(!lastActStr||!lastActIso) blank.push(entry);
    else if(lastActIso<cutoffStr) overdue.push(entry);
  });
  return {hasColumn, totalActive:activeRows.length, cutoffStr,
    blank: hasColumn?blank:[], blankCount: hasColumn?blank.length:activeRows.length,
    overdue, overdueCount:overdue.length};
}

// ── Data storage (strips to compact schema before localStorage) ──
function storeContacts(rows, fi){
  const processed = rows.map(r=>{
    const status = findVal(r,['status']);
    const regDate = parseDate(findVal(r,['register date','registerdate']));
    return {status, regDate: regDate ? getPeriod(regDate) : null};
  });
  localStorage.setItem('ld_contacts', JSON.stringify({rows:processed, fi}));
}

function storePointReport(rows, fi){
  const processed = rows.map(r=>{
    const dt = parseDate(findVal(r,['date & time','date&time','datetime','date time']));
    const ptype = findVal(r,['point type','pointtype']);
    const pts = parseFloat(findVal(r,['points collected','points'])||0)||0;
    const sale = parseFloat(findVal(r,['sale amount (thb)','sale amount','saleamount'])||0)||0;
    const source = findVal(r,['source']);
    const channel = String(findVal(r,['channel'])||'').toLowerCase().trim();
    return {period: dt?getPeriod(dt):null, ptype, pts, sale, source, channel};
  }).filter(r=>r.period);
  localStorage.setItem('ld_point', JSON.stringify({rows:processed, fi}));
}

function storeRedemptions(rows, fi){
  const processed = rows.map(r=>{
    const dt = parseDate(findVal(r,['date & time','date&time','datetime','date time']));
    const rewardName = findVal(r,['reward name','rewardname']);
    const ptsUsed = parseFloat(findVal(r,['points used','pointsused'])||0)||0;
    return {period: dt?getPeriod(dt):null, rewardName, ptsUsed};
  }).filter(r=>r.period);
  localStorage.setItem('ld_redemp', JSON.stringify({rows:processed, fi}));
}
