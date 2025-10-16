/* =========================================================================
   UI BASICS (год, тема, меню)
   ========================================================================= */
(() => {
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  const root = document.documentElement;
  const THEME_KEY = 'ak_theme_v3';
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

  // Avatar fallback loader
  const img = document.getElementById('avatar');
  if (img) {
    const candidates = [
      'img/avatar.png', 'img/avatar.jpg', 'img/me.png', 'img/me.jpg',
      'avatar.png', 'avatar.jpg', 'me.png', 'me.jpg', 'assets/avatar.png', 'assets/avatar.jpg'
    ];
    let i = 0;
    (function tryNext() {
      if (i >= candidates.length) { img.remove(); return; }
      const src = candidates[i++];
      const test = new Image();
      test.onload = () => { img.src = src; };
      test.onerror = tryNext;
      test.src = src;
    })();
  }
})();

/* =========================================================================
   SKILLS CLOUD — БИЛЬЯРД + МЕДЛЕННЫЙ МАГНИТ К КУРСОРУ (Canvas, прозрачный фон)
   ========================================================================= */
(() => {
  const canvas = document.getElementById('skillsCanvas');
  const list = document.getElementById('skillsData');
  if (!canvas || !list) return;

  // Прозрачный фон канваса (поле не выделяем)
  const ctx = canvas.getContext('2d', { alpha: true });
  const DPR = () => Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  let dpr = DPR();

  // Конфиг
  const CFG = {
    gravityToCenter: 0.0007,   // лёгкое стягивание к центру
    cursorMagnet:    0.02,    // НОВОЕ: медленный магнит к курсору (всегда)
    grabStrength:    0.5,     // сила при перетаскивании
    damping:         0.995,    // затухание скорости
    wallBounce:      1.0,      // упругость стенок
    maxSpeed:        1100,     // px/s
    fontFamily:      'Inter, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Helvetica Neue, Arial, Noto Sans, sans-serif',
    textScale:       0.50 
  };

  // Данные из списка
  const skills = Array.from(list.querySelectorAll('li')).map(li => ({
    label: li.textContent.trim(),
    hue: Number(li.dataset.hue || 220),
    size: Math.max(0.7, Math.min(1.8, Number(li.dataset.size || 1.0)))
  }));

  // Геометрия
  let Wcss = 640, Hcss = 360;   // CSS
  let W = 640, H = 360;         // px
  function resize() {
    dpr = DPR();
    const rect = canvas.getBoundingClientRect();
    Wcss = Math.max(280, rect.width);
    Hcss = Math.max(240, rect.height);
    W = Math.round(Wcss * dpr);
    H = Math.round(Hcss * dpr);
    canvas.width = W; canvas.height = H;
    canvas.style.width = `${Math.round(Wcss)}px`;
    canvas.style.height = `${Math.round(Hcss)}px`;
    ctx.setTransform(1,0,0,1,0,0);
    ctx.scale(dpr, dpr);
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  // Шары (увеличены)
  const balls = skills.map((s, i) => {
    // увеличили базовый радиус (было ~0.06, стало 0.095)
    const base = Math.min(Wcss, Hcss) * 0.095;
    const r = base * s.size;
    const m = Math.max(1, (r * r) / 300); // масса пропорц. площади
    const angle = (i / skills.length) * Math.PI * 2;
    const cx = Wcss / 2, cy = Hcss / 2;
    const rx = Math.min(Wcss, Hcss) * 0.36;
    const ry = Math.min(Wcss, Hcss) * 0.26;
    return {
      label: s.label, hue: s.hue, r, m,
      x: cx + Math.cos(angle) * rx,
      y: cy + Math.sin(angle) * ry,
      vx: (Math.random() - 0.5) * 70,
      vy: (Math.random() - 0.5) * 70,
      grabbed: false
    };
  });

  // Указатель (и «видимость» курсора)
  const pointer = { x: Wcss / 2, y: Hcss / 2, active: false, id: null, prevX: 0, prevY: 0, vx: 0, vy: 0, grabbedBall: -1, lastMove: performance.now() };
  const toLocal = (e) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX ?? (e.touches?.[0]?.clientX || rect.left)) - rect.left,
      y: (e.clientY ?? (e.touches?.[0]?.clientY || rect.top)) - rect.top
    };
  };
  function pointerVisible() {
    // Курсор «видим» 3 сек после последнего движения (полезно для сенсоров)
    return (performance.now() - pointer.lastMove) < 3000;
  }

  canvas.addEventListener('pointerdown', (e) => {
    const p = toLocal(e);
    Object.assign(pointer, { x: p.x, y: p.y, prevX: p.x, prevY: p.y, vx: 0, vy: 0, active: true, id: e.pointerId, lastMove: performance.now() });
    canvas.setPointerCapture?.(e.pointerId);
    pointer.grabbedBall = hitTestBall(p.x, p.y);
    if (pointer.grabbedBall >= 0) balls[pointer.grabbedBall].grabbed = true;
  }, { passive: true });

  canvas.addEventListener('pointermove', (e) => {
    // Отслеживаем всегда — чтобы магнит работал и без зажатия
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
      // флик
      b.vx += pointer.vx * 8;
      b.vy += pointer.vy * 8;
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
      if (dx * dx + dy * dy <= b.r * b.r) return i;
    }
    return -1;
  }

  // Физика
  let lastTs = performance.now();
  function step(ts) {
    const dtMs = Math.max(8, Math.min(32, ts - lastTs));
    lastTs = ts;
    const dt = dtMs / 1000;

    const cx = Wcss / 2, cy = Hcss / 2;
    const cursorIsVisible = pointerVisible();

    for (const b of balls) {
      let ax = (cx - b.x) * CFG.gravityToCenter;
      let ay = (cy - b.y) * CFG.gravityToCenter;

      // Медленный магнит ко ВСЕМ шарам — даже без зажатия
      if (cursorIsVisible) {
        const dx = pointer.x - b.x, dy = pointer.y - b.y;
        const d2 = Math.max(150, dx * dx + dy * dy);
        ax += (dx / d2) * CFG.cursorMagnet * 6000;
        ay += (dy / d2) * CFG.cursorMagnet * 6000;
      }

      // Если шар схвачен — тянем сильнее к пальцу и демпфируем дрожание
      if (b.grabbed && pointer.active) {
        const dx = pointer.x - b.x, dy = pointer.y - b.y;
        ax += dx * CFG.grabStrength;
        ay += dy * CFG.grabStrength;
        b.vx *= 0.9; b.vy *= 0.9;
      }

      // Интеграция
      b.vx = (b.vx + ax / Math.max(0.5, b.m)) * CFG.damping;
      b.vy = (b.vy + ay / Math.max(0.5, b.m)) * CFG.damping;

      const sp = Math.hypot(b.vx, b.vy);
      if (sp > CFG.maxSpeed) { const k = CFG.maxSpeed / sp; b.vx *= k; b.vy *= k; }

      b.x += b.vx * dt;
      b.y += b.vy * dt;
    }

    // Столкновения
    collideBalls(balls);

    // Стенки
    for (const b of balls) {
      const pad = 2;
      if (b.x - b.r < pad) { b.x = pad + b.r; b.vx = Math.abs(b.vx) * CFG.wallBounce; }
      else if (b.x + b.r > Wcss - pad) { b.x = Wcss - pad - b.r; b.vx = -Math.abs(b.vx) * CFG.wallBounce; }
      if (b.y - b.r < pad) { b.y = pad + b.r; b.vy = Math.abs(b.vy) * CFG.wallBounce; }
      else if (b.y + b.r > Hcss - pad) { b.y = Hcss - pad - b.r; b.vy = -Math.abs(b.vy) * CFG.wallBounce; }
    }

    // Рендер (прозрачное поле)
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
        const dist2 = dx * dx + dy * dy;
        if (dist2 < rSum * rSum) {
          const dist = Math.max(0.001, Math.sqrt(dist2));
          const nx = dx / dist, ny = dy / dist;
          const overlap = rSum - dist;
          const total = a.m + b.m;
          const pushA = overlap * (b.m / total);
          const pushB = overlap * (a.m / total);
          a.x -= nx * pushA; a.y -= ny * pushA;
          b.x += nx * pushB; b.y += ny * pushB;

          const rvx = b.vx - a.vx, rvy = b.vy - a.vy;
          const velN = rvx * nx + rvy * ny;
          if (velN < 0) {
            const j = -(1 + 1.0) * velN / (1 / a.m + 1 / b.m);
            const jx = j * nx, jy = j * ny;
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
      const grad = ctx.createRadialGradient(b.x - b.r * 0.4, b.y - b.r * 0.6, b.r * 0.2, b.x, b.y, b.r);
      grad.addColorStop(0, `${base}0.35)`);
      grad.addColorStop(1, `${base}0.12)`);
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.closePath(); ctx.fill();

      ctx.lineWidth = 1;
      ctx.strokeStyle = border;
      ctx.stroke();

      const baseFont = b.r * 0.5 * (CFG.textScale ?? 1);
      const fontSize = Math.max(10, Math.min(26, baseFont)); // можно скорректировать пороги
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
