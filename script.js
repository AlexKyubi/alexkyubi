// ===== Essentials =====
(function(){
  // Year
  const y = document.getElementById('year'); if(y) y.textContent = new Date().getFullYear();

  // Theme toggle (persist)
  const root = document.documentElement;
  const THEME_KEY = 'ak_theme_v1';
  const saved = localStorage.getItem(THEME_KEY);
  if(saved === 'light'){ root.classList.add('light'); }
  const tgl = document.getElementById('themeToggle');
  tgl && tgl.addEventListener('click', () => {
    root.classList.toggle('light');
    localStorage.setItem(THEME_KEY, root.classList.contains('light') ? 'light' : 'dark');
  });

  // Projects dropdown (robust)
  const btn = document.getElementById('projectsBtn');
  const list = document.getElementById('projMenu');
  const menu = list?.parentElement;
  if(btn && list && menu){
    const setOpen = (open)=>{
      btn.setAttribute('aria-expanded', String(open));
      menu.classList.toggle('open', open);
      if(open) list.removeAttribute('hidden'); else list.setAttribute('hidden','');
    };
    setOpen(false);
    btn.addEventListener('click', (e)=>{ e.stopPropagation(); setOpen(btn.getAttribute('aria-expanded')!=='true'); });
    document.addEventListener('click', (e)=>{ if(!menu.contains(e.target)) setOpen(false); });
    document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') setOpen(false); });
  }
})();

// ===== Tag Cloud (decorative, no selection) =====
(function initTagCloudSimple(){
  const host = document.querySelector('.skills-cloud');
  if(!host) return;
  const wrap = host.querySelector('.tags');
  let nodes = Array.from(wrap.querySelectorAll('.tag')).map(el => ({
    key: el.dataset.key || el.textContent.trim().toLowerCase(),
    w: parseFloat(getComputedStyle(el).getPropertyValue('--w')) || 1.0,
    el, x:0, y:0, vx:0, vy:0, r:30
  }));

  // hues
  const HUES = { python:180, web:210, excel:140, low:35, ai:305 };
  nodes.forEach(n => n.el.style.setProperty('--h', String(HUES[n.key] ?? 270)));

  const fit = ()=>{
    const r = host.getBoundingClientRect();
    W = Math.max(280, r.width); H = Math.max(200, r.height);
    cx = W/2; cy = H/2;
  };
  const measure = ()=> nodes.forEach(n=>{
    const rect = n.el.getBoundingClientRect();
    const approx = 18 * n.w;
    n.r = Math.max(rect.width || approx*4, rect.height || approx*2)/2 + 6;
  });

  let W=600, H=320, cx=0, cy=0;
  fit(); measure();
  window.addEventListener('resize', ()=>{ fit(); measure(); });

  // seed in ellipse
  nodes.forEach((n,i)=>{
    const a = (i / nodes.length) * Math.PI*2;
    n.x = cx + Math.cos(a) * (Math.min(W,H)*0.35);
    n.y = cy + Math.sin(a) * (Math.min(W,H)*0.22);
  });

  const mouse = { x:cx, y:cy, inside:false };
  host.addEventListener('pointerenter', ()=> mouse.inside = true);
  host.addEventListener('pointerleave', ()=> mouse.inside = false);
  host.addEventListener('pointermove', e=>{
    const b = host.getBoundingClientRect();
    mouse.x = e.clientX - b.left;
    mouse.y = e.clientY - b.top;
  });

  const conf = { centerPull: 0.002, mousePull: 0.010, repel: 0.8, damp: 0.965, maxV: 2.2 };

  function step(){
    nodes.forEach((a, i)=>{
      let ax=0, ay=0;

      // gentle pull to center
      ax += (cx - a.x) * conf.centerPull;
      ay += (cy - a.y) * conf.centerPull;

      // mouse influence
      if(mouse.inside){
        const dxm = mouse.x - a.x, dym = mouse.y - a.y;
        const dm2 = Math.max(90, dxm*dxm + dym*dym);
        ax += dxm / dm2 * conf.mousePull * 4000;
        ay += dym / dm2 * conf.mousePull * 4000;
      }

      // repel from others
      for(let j=i+1;j<nodes.length;j++){
        const b = nodes[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d2 = dx*dx + dy*dy;
        const minD = (a.r + b.r);
        if(d2 < (minD*minD)){
          const d = Math.max(1, Math.sqrt(d2));
          const overlap = (minD - d);
          const nx = dx / d, ny = dy / d;
          const f = overlap * conf.repel * 0.02;
          ax += nx * f; ay += ny * f;
          b.vx -= nx * f; b.vy -= ny * f;
        }
      }

      // integrate
      a.vx = (a.vx + ax) * conf.damp;
      a.vy = (a.vy + ay) * conf.damp;
      a.vx = Math.max(-conf.maxV, Math.min(conf.maxV, a.vx));
      a.vy = Math.max(-conf.maxV, Math.min(conf.maxV, a.vy));
      a.x += a.vx; a.y += a.vy;

      // bounds with soft walls
      const pad = 6;
      if(a.x < pad+a.r){ a.x = pad+a.r; a.vx *= -0.6; }
      if(a.x > W-pad-a.r){ a.x = W-pad-a.r; a.vx *= -0.6; }
      if(a.y < pad+a.r){ a.y = pad+a.r; a.vy *= -0.6; }
      if(a.y > H-pad-a.r){ a.y = H-pad-a.r; a.vy *= -0.6; }

      // render
      a.el.style.transform = `translate(${a.x - a.el.offsetWidth/2}px, ${a.y - a.el.offsetHeight/2}px)`;
    });

    requestAnimationFrame(step);
  }
  step();
})();

// === Avatar loader (try common file names; fallback to gradient) ===
(function(){
  const img = document.getElementById('avatar');
  if(!img) return;
  const candidates = [
    'img/avatar.png','img/avatar.jpg','img/me.png','img/me.jpg',
    'avatar.png','avatar.jpg','me.png','me.jpg','assets/avatar.png','assets/avatar.jpg'
  ];
  let i = 0;
  const tryNext = ()=>{
    if(i >= candidates.length){ img.remove(); return; } // leave gradient
    const src = candidates[i++];
    const test = new Image();
    test.onload = ()=>{ img.src = src; };
    test.onerror = tryNext;
    test.src = src;
  };
  tryNext();
})();

// === Projects: add 'live' pill next to items that have real links ===
(function(){
  const list = document.getElementById('projMenu');
  if(!list) return;
  list.querySelectorAll('a').forEach(a=>{
    const href = (a.getAttribute('href')||'').trim();
    const isLive = href && href !== '#' && !href.startsWith('javascript:');
    // Avoid duplicating
    if(isLive && !a.querySelector('.live')){
      const span = document.createElement('span');
      span.className = 'live';
      span.textContent = 'live';
      a.appendChild(span);
    }else{
      const exist = a.querySelector('.live');
      if(exist) exist.remove();
    }
  });
})();
