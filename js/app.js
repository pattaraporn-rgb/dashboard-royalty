// ════════════════════════════════════════════════════════════════
// APP — bootstrap, tab switching, clear-all, misc UI
// Must load LAST. References functions from all other files.
// ════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', ()=>{
  initColorPresets();
  loadSettings();
  loadStoredData();
  loadApiUrl();
  updateDbSummary();
  updateCrudSection();
  document.getElementById('footerYear').textContent = new Date().getFullYear();
  refreshIcons();
  // Auto-sync from Supabase on load
  addLog('info','เริ่ม Auto-sync จาก Supabase…');
  syncFromApi();
});

// ════════════════════════════════════════════════════════════════
// TAB SWITCHING
// ════════════════════════════════════════════════════════════════
function switchTab(n){
  document.querySelectorAll('.panel').forEach((p,i)=>p.classList.toggle('active',i===n));
  document.querySelectorAll('.tabs button').forEach((b,i)=>b.classList.toggle('active',n>=2&&i===n-2));
  const sBtn=document.getElementById('hdbtn-settings');
  const dBtn=document.getElementById('hdbtn-db');
  if(sBtn) sBtn.classList.toggle('active',n===0);
  if(dBtn) dBtn.classList.toggle('active',n===1);
  if(!rendered[n]){ renders[n](); rendered[n]=true; }
  refreshIcons();
}

// Tab indices: 0=Settings, 1=Database, 2=สมาชิก, 3=Sales, 4=Points, 5=Redemption
// Must come AFTER all renderP* functions are defined (render.js loads before app.js)
const renders=[()=>{},()=>renderDb(),()=>renderP2(),()=>renderP3(),()=>renderP4(),()=>renderP5()];

// ════════════════════════════════════════════════════════════════
// CLEAR DATA
// ════════════════════════════════════════════════════════════════
function showClearModal(){document.getElementById('clearModal').classList.add('show');}
function hideClearModal(){document.getElementById('clearModal').classList.remove('show');}

function clearAllData(){
  clearSheets();
  ['ld_contacts','ld_point','ld_redemp','ld_computed'].forEach(k=>localStorage.removeItem(k));
  fileInfo=[{},{},{}];D=null;inactiveData=null;qaStore=[null,null,null];
  updateKpis();updateDbSummary();updateFileCards();
  document.getElementById('dateRangeLabel').textContent='ยังไม่มีข้อมูล — กรุณาอัปโหลดไฟล์ในปุ่มฐานข้อมูล';
  destroyCharts(['c1','c3','c4a','c4b','c5a','c5b']);
  [2,3,4,5].forEach(i=>rendered[i]=false);
  hideClearModal();
  switchTab(1);
}

// ════════════════════════════════════════════════════════════════
// MISC UI — column info popup
// ════════════════════════════════════════════════════════════════
function toggleColInfo(i){
  const pop=document.getElementById('colpop'+i);
  pop.classList.toggle('show');
}

document.addEventListener('click',e=>{
  if(!e.target.closest('.columns-badge')&&!e.target.closest('.col-popup')){
    document.querySelectorAll('.col-popup').forEach(p=>p.classList.remove('show'));
  }
});

// Init render panel 0 (settings) immediately
rendered[0]=true;
