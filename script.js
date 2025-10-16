/* =========================================================================
   UI BASICS (год, тема, меню, неоновая почта)
   ========================================================================= */
(() => {
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  const root = document.documentElement;
  const THEME_KEY = 'ak_theme_v5';
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === 'light') root.classList.add('light');
  const tgl = document.getElementById('themeToggle');
  tgl && tgl.addEventListener('click', () => {
    root.classList.toggle('light');
    localStorage.setItem(THEME_KEY, root.classList.contains('light') ? 'light' : 'dark');
  }, { passive: true });

  const btn = document.getElementById('projectsBtn');
  const menu = document.getElementById('projMenu');
  function setOpen(open) {
    if (!btn || !menu) return;
    btn.setAttribute('aria-expanded', String(open));
    if (open) menu.removeAttribute('hidden'); else menu.setAttribute('hidden', '');
  }
  if (btn && menu) {
    setOpen(false);
    btn.addEventListener('click', (e) => { e.stopPropagation(); setOpen(menu.hasAttribute('hidden')); }, { passive: true });
    document.addEventListener('click', (e) => { if (!menu.contains(e.target) && e.target !== btn) setOpen(false); }, { passive: true });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); }, { passive: true });
    window.addEventListener('scroll', () => setOpen(false), { passive: true });
  }

  // Avatar loader с HEAD-проверкой (без 404 в консоли)
  const img = document.getElementById('avatar');
  if (img) {
    const candidates = [
      'img/avatar.png','img/avatar.jpg','img/me.png','img/me.jpg',
      'avatar.png','avatar.jpg','me.png','me.jpg','assets/avatar.png','assets/avatar.jpg'
    ];
    (async () => {
      for (const src of candidates) {
        try { const r = await fetch(src, { method:'HEAD' }); if (r.ok) { img.src = src; return; } } catch {}
      }
      img.remove();
    })();
  }

  // Неоновая почта: tap-and-hold для копирования
  const mail = document.getElementById('mailLink');
  const toast = document.getElementById('toast');
  if (mail && toast) {
    let holdTimer;
    const showToast = (txt) => {
      toast.textContent = txt || 'Скопировано';
      toast.hidden = false;
      clearTimeout(showToast._t);
      showToast._t = setTimeout(() => (toast.hidden = true), 1600);
    };
    mail.addEventListener('pointerdown', (e) => {
      holdTimer = setTimeout(async () => {
        try { await navigator.clipboard.writeText(mail.dataset.copy || mail.textContent.trim()); showToast('Скопировано в буфер'); }
        catch { showToast('Не удалось скопировать'); }
      }, 450);
    }, { passive: true });
    const clear = () => clearTimeout(holdTimer);
    mail.addEventListener('pointerup', clear, { passive: true });
    mail.addEventListener('pointercancel', clear, { passive: true });
    mail.addEventListener('pointerleave', clear, { passive: true });
  }
})();

/* =========================================================================
   SKILLS CLOUD — БИЛЬЯРД, МАГНИТ, МОБИЛЬНЫЙ ТЮНИНГ, ГИРО-ГРАВИТАЦИЯ
   ========================================================================= */
(() => {
  const canvas = document.getElementById('skillsCanvas');
  const dataEl = document.getElementById('skillsData'); // <script type="application/json">
  if (!canvas || !dataEl) return;

  const ctx = canvas.getContext('2d', { alpha: true });
  const DPR = () => Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  let dpr = DPR();

  // Определяем «мобильность»
  const isCoarse = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 700;

  // Базовый конфиг, дальше подстроим под устройство
  const CFG = {
    gravityToCenter: 0.0008,
    cursorMagnet:    0.004,      // сила магнита к курсору (ко всем шарам)
    grabStrength:    0.22,       // перетаскивание
    damping:         0.995,      // затухание
    wallBounce:      1.0,
    maxSpeed:        1100,       // px/s
    textScale:       0.90,
    fontFamily:      'Inter, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Helvetica Neue, Arial, Noto Sans, sans-serif',
    flickScale:      8,          // множитель «флика» при отпускании
    baseRadiusPct:   0.095       // от меньшей стороны контейнера
  };

  // Подстройка под смартфоны/планшеты
  if (isCoarse) {
    CFG.cursorMagnet = 0.0025;
    CFG.maxSpeed     = 750;
    CFG.damping      = 0.9965;
    CFG.flickScale   = 4.5;
    CFG.baseRadiusPct= 0.075;    // шары поменьше
    CFG.textScale    = 0.85;
  }

  // Читаем JSON с навыками
  let skills = [];
  try { skills = JSON.parse(dataEl.textContent || '[]'); } catch { skills = []; }

  // Геометрия
  let Wcss = 640, Hcss = 360;
  let W = 640, H = 360;
  function resize() {
    dpr = DPR();
    const rect = canvas.getBoundingClientRect();
    Wcss = Math.max(280, rect.width);
    Hcss = Math.max(240, rect.height);
    W = Math.round(Wcss * dpr); H = Math.round(Hcss * dpr);
    canvas.width = W; canvas.height = H;
    canvas.style.width = `${Math.round(Wcss)}px`;
    canvas.style.height = `${Math.round(Hcss)}px`;
    ctx.setTransform(1,0,0,1,0,0); ctx.scale(dpr, dpr);
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  // Шары
  const balls = skills.map((s, i) => {
    const base = Math.min(Wcss, Hcss) * CFG.baseRadiusPct;
    const r = base * (s.size ?? 1);
    const m = Math.max(1, (r * r) / 300);
    const angle = (i / Math.max(1, skills.length)) * Math.PI * 2;
    const cx = Wcss / 2, cy = Hcss / 2;
    const rx = Math.min(Wcss, Hcss) * 0.36;
    const ry = Math.min(Wcss, Hcss) * 0.26;
    return {
      label: s.label || 'Skill', hue: +s.hue || 220, r, m,
      x: cx + Math.cos(angle) * rx,
      y: cy + Math.sin(angle) * ry,
      vx: (Math.random() - 0.5) * 60,
      vy: (Math.random() - 0.5) * 60,
      grabbed: false
    };
  });

  // Указатель
  const pointer = { x: Wcss/2, y: Hcss/2, active:false, id:null, prevX:0, prevY:0, vx:0, vy:0, grabbedBall:-1, lastMove:performance.now() };
  const toLocal = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x:(e.clientX ?? (e.touches?.[0]?.clientX || r.left)) - r.left,
             y:(e.clientY ?? (e.touches?.[0]?.clientY || r.top))  - r.top };
  };
  const pointerVisible = () => (performance.now() - pointer.lastMove) < 3000;

  canvas.addEventListener('pointerdown', (e) => {
    const p = toLocal(e);
    Object.assign(pointer, { x:p.x, y:p.y, prevX:p.x, prevY:p.y, vx:0, vy:0, active:true, id:e.pointerId, lastMove:performance.now() });
    canvas.setPointerCapture?.(e.pointerId);
    pointer.grabbedBall = hitTestBall(p.x, p.y);
    if (pointer.grabbedBall >= 0) balls[pointer.grabbedBall].grabbed = true;
  }, { passive: true });

  canvas.addEventListener('pointermove', (e) => {
    const p = toLocal(e);
    pointer.vx = (p.x - pointer.prevX);
    pointer.vy = (p.y - pointer.prevY);
    pointer.prevX = p.x; pointer.prevY = p.y;
    pointer.x = p.x; pointer.y = p.y;
    pointer.lastMove = performance.now();
  }, { passive: true });

  canvas.addEventListener('pointerup', (e) => {
    if (e.pointerId === pointer.id && pointer.grabbedBall >= 0) {
      const b = balls[pointer.grabbedBall];
      b.grabbed = false;
      b.vx += pointer.vx * CFG.flickScale; // мягче на мобайле
      b.vy += pointer.vy * CFG.flickScale;
    }
    pointer.active = false; pointer.id = null; pointer.grabbedBall = -1;
  }, { passive: true });

  canvas.addEventListener('pointercancel', () => {
    pointer.active = false; pointer.id = null;
    if (pointer.grabbedBall >= 0) balls[pointer.grabbedBall].grabbed = false;
    pointer.grabbedBall = -1;
  }, { passive: true });

  function hitTestBall(x, y) {
    for (let i = balls.length - 1; i >= 0; i--) {
      const b = balls[i];
      const dx = x - b.x, dy = y - b.y;
      if (dx*dx + dy*dy <= b.r*b.r) return i;
    }
    return -1;
  }

  // Гироскоп-гравитация (тихо, только на мобильных)
  let tilt = { ax: 0, ay: 0 }; // небольшая добавка к ускорению
  if (isCoarse && 'DeviceOrientationEvent' in window) {
    window.addEventListener('deviceorientation', (e) => {
      // нормализуем и фильтруем
      const gx = (e.gamma || 0) / 90;   // -1..1
      const gy = (e.beta  || 0) / 180;  // -0.5..0.5 примерно
      const k = 18; // сила
      tilt.ax = gx * k;
      tilt.ay = gy * k;
    }, { passive: true });
  }

  // Физика
  let lastTs = performance.now();
  function step(ts) {
    const dtMs = Math.max(8, Math.min(32, ts - lastTs));
    lastTs = ts;
    const dt = dtMs / 1000;

    const cx = Wcss/2, cy = Hcss/2;
    const cursorOn = pointerVisible();

    for (const b of balls) {
      let ax = (cx - b.x) * CFG.gravityToCenter + tilt.ax;
      let ay = (cy - b.y) * CFG.gravityToCenter + tilt.ay;

      // медленный магнит ко всем шарам
      if (cursorOn) {
        const dx = pointer.x - b.x, dy = pointer.y - b.y;
        const d2 = Math.max(150, dx*dx + dy*dy);
        ax += (dx / d2) * CFG.cursorMagnet * 6000;
        ay += (dy / d2) * CFG.cursorMagnet * 6000;
      }

      if (b.grabbed && pointer.active) {
        const dx = pointer.x - b.x, dy = pointer.y - b.y;
        ax += dx * CFG.grabStrength; ay += dy * CFG.grabStrength;
        b.vx *= 0.9; b.vy *= 0.9;
      }

      b.vx = (b.vx + ax / Math.max(0.5, b.m)) * CFG.damping;
      b.vy = (b.vy + ay / Math.max(0.5, b.m)) * CFG.damping;

      const sp = Math.hypot(b.vx, b.vy);
      if (sp > CFG.maxSpeed) { const k = CFG.maxSpeed / sp; b.vx *= k; b.vy *= k; }

      b.x += b.vx * dt; b.y += b.vy * dt;
    }

    collideBalls(balls);

    // стенки
    for (const b of balls) {
      const pad = 2;
      if (b.x - b.r < pad) { b.x = pad + b.r; b.vx = Math.abs(b.vx) * 1.0; }
      else if (b.x + b.r > Wcss - pad) { b.x = Wcss - pad - b.r; b.vx = -Math.abs(b.vx) * 1.0; }
      if (b.y - b.r < pad) { b.y = pad + b.r; b.vy = Math.abs(b.vy) * 1.0; }
      else if (b.y + b.r > Hcss - pad) { b.y = Hcss - pad - b.r; b.vy = -Math.abs(b.vy) * 1.0; }
    }

    draw();
    requestAnimationFrame(step);
  }

  function collideBalls(arr) {
    for (let i = 0; i < arr.length; i++) {
      const a = arr[i];
      for (let j = i + 1; j < arr.length; j++) {
        const b = arr[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const rSum = a.r + b.r;
        const dist2 = dx*dx + dy*dy;
        if (dist2 < rSum*rSum) {
          const dist = Math.max(0.001, Math.sqrt(dist2));
          const nx = dx / dist, ny = dy / dist;
          const overlap = rSum - dist;
          const total = a.m + b.m;
          const pushA = overlap * (b.m / total);
          const pushB = overlap * (a.m / total);
          a.x -= nx * pushA; a.y -= ny * pushA;
          b.x += nx * pushB; b.y += ny * pushB;

          const rvx = b.vx - a.vx, rvy = b.vy - a.vy;
          const velN = rvx*nx + rvy*ny;
          if (velN < 0) {
            const j = -(1 + 1.0) * velN / (1/a.m + 1/b.m);
            const jx = j*nx, jy = j*ny;
            a.vx -= jx / a.m; a.vy -= jy / a.m;
            b.vx += jx / b.m; b.vy += jy / b.m;
          }
        }
      }
    }
  }

  function draw() {
    ctx.clearRect(0, 0, Wcss, Hcss); // прозрачный фон
    const fg = getComputedStyle(document.documentElement).getPropertyValue('--fg') || '#e6eef7';
    const border = getComputedStyle(document.documentElement).getPropertyValue('--border') || '#1a2736';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

    for (const b of balls) {
      const base = `hsla(${b.hue}, 90%, 55%, `;
      const grad = ctx.createRadialGradient(b.x - b.r*0.4, b.y - b.r*0.6, b.r*0.2, b.x, b.y, b.r);
      grad.addColorStop(0, `${base}0.35)`); grad.addColorStop(1, `${base}0.12)`);
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI*2); ctx.closePath(); ctx.fill();

      ctx.lineWidth = 1; ctx.strokeStyle = border; ctx.stroke();

      const baseFont = b.r * 0.5 * (CFG.textScale ?? 1);
      const fontSize = Math.max(10, Math.min(isCoarse ? 22 : 26, baseFont));
      ctx.font = `600 ${fontSize}px ${CFG.fontFamily}`;
      ctx.fillStyle = fg;
      drawMultilineCentered(ctx, b.label, b.x, b.y, b.r * 1.7, fontSize * 1.15);
    }
  }

  function drawMultilineCentered(ctx, text, cx, cy, maxWidth, lineH) {
    const words = String(text).split(/\s+/);
    const lines = [];
    let cur = '';
    for (const w of words) {
      const test = cur ? cur + ' ' + w : w;
      if (ctx.measureText(test).width <= maxWidth) cur = test;
      else { if (cur) lines.push(cur); cur = w; }
    }
    if (cur) lines.push(cur);
    const totalH = lines.length * lineH;
    let y = cy - totalH / 2 + lineH / 2;
    for (const ln of lines) { ctx.fillText(ln, cx, y); y += lineH; }
  }

  requestAnimationFrame((t) => { lastTs = t; step(t); });
})();
