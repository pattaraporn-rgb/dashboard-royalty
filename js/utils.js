// ════════════════════════════════════════════════════════════════
// UTILITIES — color, date, find, formatting helpers
// ════════════════════════════════════════════════════════════════

// ── Color ──
function getBrandColor(){
  return getComputedStyle(document.documentElement).getPropertyValue('--brand').trim()||'#004EE6';
}

function darkenColor(hex, amount){
  const num=parseInt(hex.replace('#',''),16);
  const r=Math.max(0,Math.min(255,(num>>16)-Math.round(255*amount)));
  const g=Math.max(0,Math.min(255,((num>>8)&255)-Math.round(255*amount)));
  const b=Math.max(0,Math.min(255,(num&255)-Math.round(255*amount)));
  return '#'+[r,g,b].map(x=>x.toString(16).padStart(2,'0')).join('');
}

function lightenColor(hex, t){
  const num=parseInt(hex.replace('#',''),16);
  const r=(num>>16), g=((num>>8)&255), b=(num&255);
  const lr=Math.round(r+(255-r)*t), lg=Math.round(g+(255-g)*t), lb=Math.round(b+(255-b)*t);
  return '#'+[lr,lg,lb].map(x=>x.toString(16).padStart(2,'0')).join('');
}

// ── Column lookup (case-insensitive, underscore→space) ──
function findVal(row, keys){
  const rowKeys = Object.keys(row);
  const norm = s => s.toLowerCase().trim().replace(/_/g,' ');
  for(const k of keys){
    const kn = norm(k);
    const found = rowKeys.find(rk => norm(rk) === kn);
    if(found !== undefined) return row[found];
    const partial = rowKeys.find(rk => norm(rk).includes(kn));
    if(partial !== undefined) return row[partial];
  }
  return '';
}

// ── Date parsing (handles Excel serial, Buddhist Era, slash/dash formats) ──
function parseDate(val){
  if(!val && val!==0) return null;
  if(val instanceof Date) return isNaN(val)?null:val;
  if(typeof val==='number'){
    const d=new Date(Math.round((val-25569)*86400*1000));
    return isNaN(d)?null:d;
  }
  const s=String(val).trim();
  if(!s) return null;
  // Numeric string = Excel serial stored as text in Supabase (e.g. "44927" or "44927.5")
  if(/^\d+(\.\d+)?$/.test(s)&&+s>20000){
    const d=new Date(Math.round((parseFloat(s)-25569)*86400*1000));
    return isNaN(d)?null:d;
  }
  // DD/MM/YYYY HH:MM or DD/MM/YYYY (handles Buddhist Era: year>2499 → subtract 543)
  const m1=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if(m1){const y=+m1[3]>2499?+m1[3]-543:+m1[3];return new Date(y,+m1[2]-1,+m1[1]);}
  // YYYY-MM-DD... (handles Buddhist Era)
  const m2=s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(m2){const y=+m2[1]>2499?+m2[1]-543:+m2[1];return new Date(y,+m2[2]-1,+m2[3]);}
  // YYYY/MM/DD (Thai format with slashes, handles Buddhist Era e.g. "2566/01/15")
  const m3=s.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})/);
  if(m3){const y=+m3[1]>2499?+m3[1]-543:+m3[1];return new Date(y,+m3[2]-1,+m3[3]);}
  const d=new Date(s);
  return isNaN(d)?null:d;
}

function getPeriod(d){
  if(!d||isNaN(d)) return null;
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}

// ── Local-timezone-safe date formatters (avoid toISOString UTC shift) ──
// Bug fixed: toISOString() converts local Date to UTC, so 1 May 00:00 ICT
// becomes "2025-04-30" → wrong month when feeding back into parseDate/Supabase.
function toLocalISODate(d){
  if(!d||isNaN(d)) return '';
  const y=d.getFullYear();
  const m=String(d.getMonth()+1).padStart(2,'0');
  const day=String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}

function toLocalISODateTime(d){
  if(!d||isNaN(d)) return '';
  return `${toLocalISODate(d)}T${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

// ── Lucide icon system ──
// After injecting HTML containing <i data-lucide="icon-name">, call this to convert
// those <i> placeholders into actual SVG icons. Safe to call before lucide loads.
function refreshIcons(){
  if(typeof lucide!=='undefined'&&typeof lucide.createIcons==='function'){
    try{lucide.createIcons();}catch(e){}
  }
}

// ── Display formatting ──
const fmt=n=>{if(!n&&n!==0)return'–';return Math.round(n).toLocaleString('en-US');};
function pchCell(v){
  if(v===null||v===undefined)return'<td class="flat">–</td>';
  const p=v*100,cls=p>0.05?'up':(p<-0.05?'down':'flat'),ar=p>0.05?'▲':(p<-0.05?'▼':'–');
  return`<td class="${cls}">${ar} ${p>0?'+':''}${p.toFixed(1)}%</td>`;
}
function thC(label,bg,fg='#fff'){return`<th style="background:${bg};color:${fg};border-color:${bg}">${label}</th>`;}
function chTh(keys){return keys.map(k=>thC(k,CHART_COLORS[k]||'#555')).join('');}
function stat(val,lbl,accent='#004EE6'){return`<div class="stat" style="border-left-color:${accent}"><div class="stat-val">${val}</div><div class="stat-lbl">${lbl}</div></div>`;}
