// ════════════════════════════════════════════════════════════════
// SETTINGS — store branding (color, name, tagline, logo)
// ════════════════════════════════════════════════════════════════

function initColorPresets(){
  const c = document.getElementById('colorPresets');
  c.innerHTML = PRESETS.map(p=>
    `<div class="color-preset" style="background:${p}" onclick="pickPreset('${p}')" title="${p}"></div>`
  ).join('');
  document.getElementById('inp_color').addEventListener('input', function(){
    document.getElementById('inp_color_hex').value = this.value.toUpperCase();
  });
  document.getElementById('inp_color_hex').addEventListener('input', function(){
    const v = this.value.trim();
    if(/^#[0-9A-Fa-f]{6}$/.test(v)) document.getElementById('inp_color').value = v;
  });
}

function pickPreset(color){
  document.getElementById('inp_color').value = color;
  document.getElementById('inp_color_hex').value = color.toUpperCase();
  document.querySelectorAll('.color-preset').forEach(el=>{
    el.classList.toggle('active', el.style.background===color || el.title===color);
  });
}

function loadSettings(){
  try{
    const s = JSON.parse(localStorage.getItem('ld_settings')||'{}');
    document.getElementById('inp_storeName').value = s.storeName||'Loyalty Dashboard';
    document.getElementById('inp_tagline').value = s.tagline||'Powered by Rocket Loyalty CRM';
    document.getElementById('inp_dateRange').value = s.dateRange||'';
    document.getElementById('inp_color').value = s.color||'#004EE6';
    document.getElementById('inp_color_hex').value = (s.color||'#004EE6').toUpperCase();
    applySettings(s);
  }catch(e){}
}

function applySettings(s){
  const color = s.color||'#004EE6';
  document.documentElement.style.setProperty('--brand', color);
  // Darken for --brand-dark
  document.documentElement.style.setProperty('--brand-dark', darkenColor(color, 0.25));
  document.documentElement.style.setProperty('--brand-light', lightenColor(color, 0.9));

  document.getElementById('storeName').textContent = s.storeName||'Loyalty Dashboard';
  document.getElementById('storeTagline').textContent = s.tagline||'Powered by Rocket Loyalty CRM';
  if(s.dateRange) document.getElementById('dateRangeLabel').textContent = 'ข้อมูล '+s.dateRange;
  if(s.logo){
    document.getElementById('logoImg').src = s.logo;
    const box = document.getElementById('logoPreviewBox');
    box.innerHTML = `<img src="${s.logo}" alt="logo" style="width:100%;height:100%;object-fit:contain;border-radius:8px;">`;
  }
  // Update header gradient
  document.getElementById('appHeader').style.background =
    `linear-gradient(120deg,${darkenColor(color,0.3)} 0%,${color} 60%,${lightenColor(color,0.2)} 100%)`;
}

function saveSettings(){
  const s = {
    storeName: document.getElementById('inp_storeName').value,
    tagline: document.getElementById('inp_tagline').value,
    dateRange: document.getElementById('inp_dateRange').value,
    color: document.getElementById('inp_color').value,
    logo: localStorage.getItem('ld_logo')||null
  };
  localStorage.setItem('ld_settings', JSON.stringify(s));
  applySettings(s);
  const msg = document.getElementById('saveMsg');
  msg.classList.add('show');
  setTimeout(()=>msg.classList.remove('show'), 2500);
}

function uploadLogo(input){
  const file = input.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = e=>{
    const data = e.target.result;
    localStorage.setItem('ld_logo', data);
    document.getElementById('logoImg').src = data;
    const box = document.getElementById('logoPreviewBox');
    box.innerHTML = `<img src="${data}" alt="logo" style="width:100%;height:100%;object-fit:contain;border-radius:8px;">`;
  };
  reader.readAsDataURL(file);
}

function clearLogo(){
  localStorage.removeItem('ld_logo');
  document.getElementById('logoImg').src = 'https://rewarding-rocket.s3.ap-southeast-1.amazonaws.com/1743486056316-success%20copy%202%201.png';
  document.getElementById('logoPreviewBox').innerHTML = '<i data-lucide="camera" class="icon-lg"></i><span>คลิกเพื่ออัปโหลด</span>';refreshIcons();
}
