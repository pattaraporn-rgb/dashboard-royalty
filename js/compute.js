// ════════════════════════════════════════════════════════════════
// COMPUTE DASHBOARD DATA (D object) — reads localStorage, fills D, re-renders
// ════════════════════════════════════════════════════════════════

function recomputeAndRender(){
  D = null;
  const contStore = JSON.parse(localStorage.getItem('ld_contacts')||'null');
  const ptStore = JSON.parse(localStorage.getItem('ld_point')||'null');
  const rdStore = JSON.parse(localStorage.getItem('ld_redemp')||'null');

  if(contStore) fileInfo[0] = contStore.fi||{};
  if(ptStore)   fileInfo[1] = ptStore.fi||{};
  if(rdStore)   fileInfo[2] = rdStore.fi||{};

  D = {};

  // -- s1: New User --
  if(contStore){
    const rows = contStore.rows;
    const curPeriod = getPeriod(new Date());
    const allActive = rows.filter(r=>String(r.status).trim().toUpperCase()==='ACTIVE');
    const activeRows = allActive.filter(r=>r.regDate && r.regDate<curPeriod);
    const byM = {};
    activeRows.forEach(r=>{byM[r.regDate]=(byM[r.regDate]||0)+1;});
    const months = Object.keys(byM).sort();
    const active = months.map(m=>byM[m]);
    const pch = active.map((v,i)=>i===0?null:(active[i-1]?((v-active[i-1])/active[i-1]):null));
    D.s1 = {months, active, pch, total_active: activeRows.length};
    // Attach in-memory inactive data (null if page was refreshed without re-uploading)
    D.s1.inactive = inactiveData;
  }

  // -- s3, s4a, s4b partial, s5 partial --
  if(ptStore){
    const rows = ptStore.rows;
    const given = rows.filter(r=>String(r.ptype).trim().toUpperCase()==='GIVEN');
    const redeemed = rows.filter(r=>String(r.ptype).trim().toUpperCase()==='REDEEMED');
    const allPeriods = [...new Set(given.map(r=>r.period))].sort();

    // s3 sales
    const s3data={};
    const s3total={};
    CH_KEYS.forEach(k=>{s3data[k]={}});
    given.forEach(r=>{
      const k=getChannelKey(r);
      if(!k) return;
      s3data[k][r.period]=(s3data[k][r.period]||0)+r.sale;
      s3total[r.period]=(s3total[r.period]||0)+r.sale;
    });
    const s3months=allPeriods;
    D.s3={months:s3months, data:{}, total:s3months.map(m=>s3total[m]||0), pch:[], totals:{}, grand:0};
    CH_KEYS.forEach(k=>{D.s3.data[k]=s3months.map(m=>s3data[k][m]||0);D.s3.totals[k]=D.s3.data[k].reduce((a,b)=>a+b,0);});
    D.s3.grand=CH_KEYS.reduce((a,k)=>a+D.s3.totals[k],0);
    D.s3.pch=D.s3.total.map((v,i)=>i===0?null:(D.s3.total[i-1]?(v-D.s3.total[i-1])/D.s3.total[i-1]:null));

    // s4a points by channel
    const p4a={};
    CH_KEYS.forEach(k=>{p4a[k]={}});
    const p4atotal={};
    given.forEach(r=>{
      const k=getChannelKey(r);
      if(!k) return;
      p4a[k][r.period]=(p4a[k][r.period]||0)+r.pts;
      p4atotal[r.period]=(p4atotal[r.period]||0)+r.pts;
    });
    D.s4a={months:s3months,data:{},total:s3months.map(m=>p4atotal[m]||0),pch:[],totals:{},grand:0};
    CH_KEYS.forEach(k=>{D.s4a.data[k]=s3months.map(m=>p4a[k][m]||0);D.s4a.totals[k]=D.s4a.data[k].reduce((a,b)=>a+b,0);});
    D.s4a.grand=CH_KEYS.reduce((a,k)=>a+D.s4a.totals[k],0);
    D.s4a.pch=D.s4a.total.map((v,i)=>i===0?null:(D.s4a.total[i-1]?(v-D.s4a.total[i-1])/D.s4a.total[i-1]:null));

    // s4b all sources
    const allSources=[...new Set(given.map(r=>r.source))].filter(Boolean);
    const p4b={};
    allSources.forEach(src=>{p4b[src]={}});
    const p4btotal={};
    given.forEach(r=>{
      const src=r.source||'Unknown';
      if(!p4b[src]) p4b[src]={};
      p4b[src][r.period]=(p4b[src][r.period]||0)+r.pts;
      p4btotal[r.period]=(p4btotal[r.period]||0)+r.pts;
    });
    const s4bkeys=SC_KEYS.filter(k=>allSources.includes(k));
    const extraSources=allSources.filter(s=>!SC_KEYS.includes(s));
    const allS4bKeys=[...s4bkeys,...extraSources];
    D.s4b={months:s3months,data:{},total:s3months.map(m=>p4btotal[m]||0),pch:[],totals:{},grand:0};
    allS4bKeys.forEach(k=>{D.s4b.data[k]=s3months.map(m=>(p4b[k]&&p4b[k][m])||0);D.s4b.totals[k]=D.s4b.data[k].reduce((a,b)=>a+b,0);});
    D.s4b.grand=Object.values(D.s4b.totals).reduce((a,b)=>a+b,0);
    D.s4b.pch=D.s4b.total.map((v,i)=>i===0?null:(D.s4b.total[i-1]?(v-D.s4b.total[i-1])/D.s4b.total[i-1]:null));
    D.s4b.sckeys=allS4bKeys;

    // Redeemed pts by month (for s5)
    const redeemedByM={};
    redeemed.forEach(r=>{redeemedByM[r.period]=(redeemedByM[r.period]||0)+Math.abs(r.pts);});
    D._redeemedByM=redeemedByM;
  }

  // -- s5: Redemption --
  if(rdStore){
    const rows=rdStore.rows;
    const countByM={},rewardsByM={},ptsByM={};
    rows.forEach(r=>{
      if(!r.period) return;
      countByM[r.period]=(countByM[r.period]||0)+1;
      ptsByM[r.period]=(ptsByM[r.period]||0)+r.ptsUsed;
      if(!rewardsByM[r.period]) rewardsByM[r.period]=[];
      if(r.rewardName){
        const ex=rewardsByM[r.period].find(x=>x[0]===r.rewardName);
        if(ex) ex[1]++; else rewardsByM[r.period].push([r.rewardName,1]);
      }
    });
    const s5months=Object.keys(countByM).sort();
    const count=s5months.map(m=>countByM[m]||0);
    const pts_detail=s5months.map(m=>ptsByM[m]||0);
    const pts_point=s5months.map(m=>(D._redeemedByM&&D._redeemedByM[m])||0);
    const count_pch=count.map((v,i)=>i===0?null:(count[i-1]?(v-count[i-1])/count[i-1]:null));
    const pts_pch=pts_point.map((v,i)=>i===0?null:(pts_point[i-1]?(v-pts_point[i-1])/pts_point[i-1]:null));

    // reward list
    const allRewards={};
    s5months.forEach(m=>{(rewardsByM[m]||[]).forEach(([n,q])=>{
      if(!allRewards[n])allRewards[n]={};
      allRewards[n][m]=(allRewards[n][m]||0)+q;
    });});
    const reward_list=Object.entries(allRewards).sort((a,b)=>Object.values(b[1]).reduce((x,y)=>x+y,0)-Object.values(a[1]).reduce((x,y)=>x+y,0));

    D.s5={months:s5months,count,pts_detail,pts_point,count_pch,pts_pch,
      total_count:count.reduce((a,b)=>a+b,0),
      total_pts:pts_detail.reduce((a,b)=>a+b,0),
      rewards:rewardsByM, reward_list};
  }

  // Store computed D — strip PII (name/phone arrays) before persisting
  if(Object.keys(D).length>0){
    const toStore=JSON.parse(JSON.stringify(D));
    if(toStore.s1&&toStore.s1.inactive){
      const ia=toStore.s1.inactive;
      toStore.s1.inactive={hasColumn:ia.hasColumn,totalActive:ia.totalActive,cutoffStr:ia.cutoffStr,blankCount:ia.blankCount,overdueCount:ia.overdueCount,blank:[],overdue:[]};
    }
    localStorage.setItem('ld_computed',JSON.stringify(toStore));
  }

  // Update UI
  updateKpis();
  updateDbSummary();
  updateFileCards();
  updateDateLabel();

  // Re-render open panels
  [2,3,4,5].forEach((tabN,i)=>{
    if(rendered[tabN]){
      destroyCharts(['c1','c3','c4a','c4b','c5a','c5b']);
      rendered[tabN]=false;
    }
  });
  const activeIdx=[...document.querySelectorAll('.panel')].findIndex(p=>p.classList.contains('active'));
  if(activeIdx>=2){ rendered[activeIdx]=false; renders[activeIdx](); rendered[activeIdx]=true; }
  refreshIcons();
}

function loadStoredData(){
  try{
    const fi0=JSON.parse(localStorage.getItem('ld_contacts')||'null');
    const fi1=JSON.parse(localStorage.getItem('ld_point')||'null');
    const fi2=JSON.parse(localStorage.getItem('ld_redemp')||'null');
    if(fi0) fileInfo[0]=fi0.fi||{};
    if(fi1) fileInfo[1]=fi1.fi||{};
    if(fi2) fileInfo[2]=fi2.fi||{};
    recomputeAndRender(); // always compute from raw stores — never read stale ld_computed
  }catch(e){console.error('loadStoredData',e);}
}

function getChannelKey(r){
  const src=String(r.source||'').trim();
  const ch=String(r.channel||'').toLowerCase().trim();
  if(src==='Third Party'){
    if(ch==='tiktok') return 'TikTok';
    if(ch==='shopee') return 'Shopee';
    if(ch==='lazada') return 'Lazada';
  }
  if(src==='Loyalty Manual') return 'Loyalty Manual';
  if(src==='Upload Receipt') return 'Upload Receipt';
  return null;
}
