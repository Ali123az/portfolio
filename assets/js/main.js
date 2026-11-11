/* Portfolio Ali Azami — interactions et animations (sans dépendance) */
(() => {
  'use strict';

  const doc = document;
  const root = doc.documentElement;
  const $ = (sel, ctx = doc) => ctx.querySelector(sel);
  const $$ = (sel, ctx = doc) => Array.from(ctx.querySelectorAll(sel));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const lang = root.lang || 'fr';
  const hasIO = 'IntersectionObserver' in window;
  // Mode allégé : posé avant le premier affichage par le script du <head>, ou plus tard par la sonde de fluidité
  const isLite = () => root.classList.contains('lite');

  /* ---- Bus de défilement (une seule passe par image) ---------------------- */
  const scrollTasks = [];
  let ticking = false;
  const runScroll = () => {
    ticking = false;
    const y = window.scrollY;
    for (const task of scrollTasks) task(y);
  };
  const requestScroll = () => {
    if (!ticking) { ticking = true; requestAnimationFrame(runScroll); }
  };
  addEventListener('scroll', requestScroll, { passive: true });
  addEventListener('resize', requestScroll);

  /* ---- En-tête, barre de progression, retour en haut --------------------- */
  const header = $('[data-header]');
  const bar = $('.scroll-progress span');
  const toTop = $('[data-to-top]');
  const ring = $('.to-top-ring');
  scrollTasks.push((y) => {
    const max = root.scrollHeight - innerHeight;
    const p = max > 0 ? clamp(y / max, 0, 1) : 0;
    if (header) header.classList.toggle('is-scrolled', y > 24);
    if (bar) bar.style.transform = `scaleX(${p})`;
    if (ring) ring.style.strokeDashoffset = String(1 - p);
    if (toTop) toTop.classList.toggle('is-visible', y > innerHeight * 0.6);
  });

  /* ---- Menu mobile -------------------------------------------------------- */
  const navToggle = $('[data-nav-toggle]');
  const nav = $('[data-nav]');
  const setNav = (open) => {
    root.classList.toggle('nav-open', open);
    if (navToggle) navToggle.setAttribute('aria-expanded', String(open));
  };
  if (navToggle && nav) {
    navToggle.addEventListener('click', () => setNav(!root.classList.contains('nav-open')));
    nav.addEventListener('click', (e) => { if (e.target.closest('a')) setNav(false); });
    addEventListener('keydown', (e) => { if (e.key === 'Escape') setNav(false); });
    matchMedia('(min-width: 961px)').addEventListener('change', () => setNav(false));
  }

  /* ---- Lien actif et pastille glissante ---------------------------------- */
  const navLinks = $$('.nav-link[data-section]');
  const indicator = $('[data-nav-indicator]');
  const sections = navLinks.map((l) => doc.getElementById(l.dataset.section)).filter(Boolean);
  let activeLink = null;
  const moveIndicator = (link) => {
    if (!indicator) return;
    if (!link) { indicator.style.opacity = '0'; return; }
    const li = link.parentElement;
    indicator.style.opacity = '1';
    indicator.style.width = `${li.offsetWidth}px`;
    indicator.style.transform = `translateX(${li.offsetLeft}px)`;
  };
  if (sections.length) {
    scrollTasks.push((y) => {
      const probe = y + innerHeight * 0.38;
      let id = null;
      for (const s of sections) if (s.getBoundingClientRect().top + y <= probe) id = s.id;
      const link = navLinks.find((l) => l.dataset.section === id) || null;
      if (link === activeLink) return;
      activeLink = link;
      navLinks.forEach((l) => {
        const on = l === link;
        l.classList.toggle('is-active', on);
        if (on) l.setAttribute('aria-current', 'true'); else l.removeAttribute('aria-current');
      });
      moveIndicator(link);
    });
  }
  const navList = $('.nav-list');
  if (navList && finePointer) {
    navLinks.forEach((l) => l.addEventListener('pointerenter', () => moveIndicator(l)));
    navList.addEventListener('pointerleave', () => moveIndicator(activeLink));
  }
  addEventListener('resize', () => moveIndicator(activeLink));
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(() => moveIndicator(activeLink));

  /* ---- Apparition au défilement ------------------------------------------ */
  const revealEls = $$('[data-reveal]');
  if (reduced || !hasIO) {
    revealEls.forEach((el) => el.classList.add('is-in'));
  } else {
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) { entry.target.classList.add('is-in'); io.unobserve(entry.target); }
      }
    }, { rootMargin: '0px 0px -7% 0px', threshold: 0.06 });
    revealEls.forEach((el) => io.observe(el));
  }

  /* ---- Titre : lettres animées ------------------------------------------- */
  $$('[data-split]').forEach((el) => {
    const text = el.textContent.trim();
    el.textContent = '';
    const sr = doc.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = text;
    el.appendChild(sr);
    let i = 0;
    text.split(/\s+/).forEach((w) => {
      const word = doc.createElement('span');
      word.className = 'word';
      word.setAttribute('aria-hidden', 'true');
      for (const ch of w) {
        const c = doc.createElement('span');
        c.className = 'char';
        c.style.setProperty('--i', String(i++));
        c.textContent = ch;
        word.appendChild(c);
      }
      el.appendChild(word);
      el.appendChild(doc.createTextNode(' '));
    });
  });

  /* ---- Ligne « terminal » qui s'écrit ------------------------------------ */
  const typedEl = $('[data-typed]');
  if (typedEl && !reduced) {
    let words = [];
    try { words = JSON.parse(typedEl.dataset.typed); } catch (e) { words = []; }
    if (words.length > 1) {
      let wi = 0;
      let ci = words[0].length;
      let deleting = true;
      const step = () => {
        if (deleting) {
          ci -= 1;
          if (ci <= 0) { ci = 0; deleting = false; wi = (wi + 1) % words.length; }
          typedEl.textContent = deleting ? words[wi].slice(0, ci) : '';
          setTimeout(step, deleting ? 26 : 320);
        } else {
          ci += 1;
          typedEl.textContent = words[wi].slice(0, ci);
          if (ci >= words[wi].length) { deleting = true; setTimeout(step, 2100); } else setTimeout(step, 52);
        }
      };
      setTimeout(step, 3200);
    }
  }

  /* ---- Compteurs ---------------------------------------------------------- */
  const formatNumber = (v, decimals) => {
    const s = v.toFixed(decimals);
    return lang === 'fr' ? s.replace('.', ',') : s;
  };
  const counters = $$('[data-count]');
  if (counters.length && !reduced && hasIO) {
    const run = (el) => {
      const target = parseFloat(el.dataset.count);
      const decimals = parseInt(el.dataset.decimals || '0', 10);
      const t0 = performance.now();
      const dur = 1600;
      const frame = (now) => {
        const k = clamp((now - t0) / dur, 0, 1);
        const eased = 1 - Math.pow(1 - k, 4);
        el.textContent = formatNumber(target * eased, decimals);
        if (k < 1) requestAnimationFrame(frame);
      };
      el.textContent = formatNumber(0, decimals);
      requestAnimationFrame(frame);
    };
    const cio = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting) { run(entry.target); cio.unobserve(entry.target); }
    }, { threshold: 0.6 });
    counters.forEach((el) => cio.observe(el));
  }

  /* ---- Étiquettes de section : effet de décodage -------------------------- */
  const glyphs = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#/<>_';
  const scrambleEls = $$('[data-scramble]');
  if (scrambleEls.length && !reduced && hasIO) {
    const scramble = (el) => {
      const final = el.textContent;
      const total = 18;
      let n = 0;
      const tick = () => {
        n += 1;
        const done = Math.floor((final.length * n) / total);
        el.textContent = Array.from(final, (ch, i) => (i < done || ch === ' ' ? ch : glyphs[(Math.random() * glyphs.length) | 0])).join('');
        if (n < total) setTimeout(tick, 34); else el.textContent = final;
      };
      tick();
    };
    const sio = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting) { scramble(entry.target); sio.unobserve(entry.target); }
    }, { threshold: 0.9 });
    scrambleEls.forEach((el) => sio.observe(el));
  }

  /* ---- Hero : signal animé (ondes, échantillons, curseur d'acquisition) --- */
  const canvas = $('[data-signal]');
  if (canvas && canvas.getContext) {
    const ctx = canvas.getContext('2d');
    const hero = canvas.closest('[data-hero]') || canvas.parentElement;
    const waves = [
      { amp: 0.085, len: 0.62, speed: 0.050, phase: 0.0, y: 0.40, alpha: 0.95, width: 1.8, samples: true },
      { amp: 0.060, len: 0.44, speed: -0.036, phase: 2.1, y: 0.47, alpha: 0.38, width: 1.2 },
      { amp: 0.110, len: 0.95, speed: 0.024, phase: 4.2, y: 0.53, alpha: 0.24, width: 1.2 },
      { amp: 0.045, len: 0.30, speed: 0.070, phase: 1.3, y: 0.33, alpha: 0.18, width: 1.0 }
    ];
    let w = 0, h = 0, raf = 0, visible = true, px = -1, py = -1, influence = 0;
    const TAU = Math.PI * 2;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const yAt = (wave, x, t) => {
      const u = x / w;
      const env = 0.3 + 0.7 * Math.sin(Math.PI * clamp(u, 0, 1));
      const base = Math.sin((u / wave.len) * TAU + t * wave.speed * TAU + wave.phase)
        + 0.42 * Math.sin((u / wave.len) * TAU * 2.3 - t * wave.speed * TAU * 1.7 + wave.phase * 1.7);
      let amp = wave.amp * h * env;
      if (influence > 0.01) {
        const dx = (x - px) / 190;
        amp *= 1 + 0.9 * influence * Math.exp(-dx * dx);
      }
      return wave.y * h + base * amp * 0.62;
    };
    const draw = (now) => {
      const t = now / 1000;
      ctx.clearRect(0, 0, w, h);
      // Le fondu vers la gauche est intégré au dégradé plutôt que confié à un masque CSS
      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, 'rgba(52, 216, 245, .12)'); grad.addColorStop(0.38, 'rgba(70, 221, 230, .32)');
      grad.addColorStop(0.7, 'rgba(110, 231, 200, .96)'); grad.addColorStop(1, 'rgba(246, 181, 69, 1)');
      ctx.strokeStyle = grad; ctx.fillStyle = grad; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      for (const wave of waves) {
        ctx.globalAlpha = wave.alpha; ctx.lineWidth = wave.width;
        ctx.beginPath();
        for (let x = -8; x <= w + 8; x += 7) {
          const y = yAt(wave, x, t);
          if (x === -8) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
        if (wave.samples) {
          const scanX = ((t * 120) % (w + 360)) - 180;
          const zero = wave.y * h;
          for (let x = 14; x < w; x += 28) {
            const y = yAt(wave, x, t);
            const near = Math.exp(-Math.pow((x - scanX) / 90, 2));
            ctx.globalAlpha = 0.16 + 0.5 * near; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(x, zero); ctx.lineTo(x, y); ctx.stroke();
            ctx.globalAlpha = 0.55 + 0.45 * near;
            ctx.beginPath(); ctx.arc(x, y, 2 + 2.2 * near, 0, TAU); ctx.fill();
          }
        }
      }
      ctx.globalAlpha = 1;
    };
    const loop = (now) => {
      raf = 0;
      influence += ((px >= 0 ? 1 : 0) - influence) * 0.06;
      draw(now);
      if (visible && !doc.hidden) raf = requestAnimationFrame(loop);
    };
    const start = () => { if (!raf && !reduced) raf = requestAnimationFrame(loop); };

    resize();
    draw(reduced ? 4200 : performance.now());
    addEventListener('resize', () => { resize(); if (reduced) draw(4200); });
    if (!reduced) {
      if (hasIO) new IntersectionObserver((entries) => { visible = entries[0].isIntersecting; if (visible) start(); }).observe(hero);
      doc.addEventListener('visibilitychange', () => { if (!doc.hidden) start(); });
      if (finePointer) {
        hero.addEventListener('pointermove', (e) => { const r = canvas.getBoundingClientRect(); px = e.clientX - r.left; py = e.clientY - r.top; }, { passive: true });
        hero.addEventListener('pointerleave', () => { px = -1; py = -1; });
      }
      start();
    }
  }

  /* ---- Hero : léger effet de profondeur au défilement --------------------- */
  const heroGrid = $('.hero-grid');
  if (heroGrid && !reduced) {
    scrollTasks.push((y) => {
      // Seulement quand le bloc tient dans l'écran : sinon il s'estomperait avant d'être lu
      if (innerWidth <= 1000 || heroGrid.offsetHeight > innerHeight * 0.9) {
        if (heroGrid.style.opacity) { heroGrid.style.opacity = ''; heroGrid.style.transform = ''; }
        return;
      }
      if (y > innerHeight * 1.2) return;
      heroGrid.style.transform = `translate3d(0, ${(y * 0.12).toFixed(1)}px, 0)`;
      heroGrid.style.opacity = String(clamp(1 - y / (innerHeight * 0.9), 0, 1));
    });
  }

  /* ---- Halo qui suit le pointeur, projecteur des cartes, inclinaison ------ */
  if (finePointer && !reduced) {
    const glow = $('.bg-glow');
    if (glow) {
      let gx = innerWidth / 2, gy = innerHeight / 3, tx = gx, ty = gy, moving = false;
      const follow = () => {
        gx += (tx - gx) * 0.12; gy += (ty - gy) * 0.12;
        glow.style.transform = `translate3d(${gx.toFixed(1)}px, ${gy.toFixed(1)}px, 0)`;
        if (Math.abs(tx - gx) + Math.abs(ty - gy) > 0.4) requestAnimationFrame(follow); else moving = false;
      };
      addEventListener('pointermove', (e) => {
        if (isLite()) return;
        tx = e.clientX; ty = e.clientY;
        glow.classList.add('is-on');
        if (!moving) { moving = true; requestAnimationFrame(follow); }
      }, { passive: true });
    }

    $$('[data-spot]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${e.clientX - r.left}px`);
        el.style.setProperty('--my', `${e.clientY - r.top}px`);
      }, { passive: true });
    });

    $$('[data-tilt]').forEach((el) => {
      const max = el.classList.contains('pcard') ? 4 : 6;
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const nx = (e.clientX - r.left) / r.width - 0.5;
        const ny = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = `perspective(900px) rotateX(${(-ny * max).toFixed(2)}deg) rotateY(${(nx * max).toFixed(2)}deg)`;
      }, { passive: true });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });

    $$('[data-magnetic]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${(dx * 0.22).toFixed(1)}px, ${(dy * 0.32).toFixed(1)}px)`;
      }, { passive: true });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  /* ---- Frise : la ligne se remplit avec le défilement --------------------- */
  const timeline = $('[data-timeline]');
  if (timeline) {
    scrollTasks.push(() => {
      const r = timeline.getBoundingClientRect();
      timeline.style.setProperty('--p', clamp((innerHeight * 0.62 - r.top) / r.height, 0, 1).toFixed(3));
    });
  }

  /* ---- Cycle de vie produit : boucle animée et interactive ---------------- */
  const cycle = $('[data-cycle]');
  if (cycle) {
    const path = $('[data-cycle-path]', cycle);
    const pulse = $('[data-cycle-pulse]', cycle);
    const nodesGroup = $('[data-cycle-nodes]', cycle);
    const steps = $$('[data-cycle-step]', cycle);
    const numEl = $('[data-cycle-num]', cycle);
    const nameEl = $('[data-cycle-name]', cycle);
    const textEl = $('[data-cycle-text]', cycle);
    const N = steps.length;
    const L = path.getTotalLength();
    const SVG = 'http://www.w3.org/2000/svg';
    const SEGMENT_MS = 2600;
    const nodes = steps.map((_, i) => {
      const pt = path.getPointAtLength((L * i) / N);
      const g = doc.createElementNS(SVG, 'g');
      g.setAttribute('class', 'cycle-node');
      g.setAttribute('transform', `translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)})`);
      const c = doc.createElementNS(SVG, 'circle');
      c.setAttribute('r', '14');
      const tx = doc.createElementNS(SVG, 'text');
      tx.textContent = String(i + 1);
      g.append(c, tx);
      nodesGroup.appendChild(g);
      return g;
    });
    let t = 0, last = 0, raf = 0, active = -1, pinned = -1, onScreen = false;

    const setActive = (i) => {
      if (i === active) return;
      active = i;
      steps.forEach((s, k) => s.classList.toggle('is-active', k === i));
      nodes.forEach((n, k) => n.classList.toggle('is-active', k === i));
      numEl.textContent = String(i + 1).padStart(2, '0');
      nameEl.textContent = steps[i].querySelector('strong').textContent;
      if (textEl) textEl.textContent = steps[i].querySelector('.cycle-step-body > span').textContent;
    };
    const place = () => {
      const pt = path.getPointAtLength(L * t);
      pulse.setAttribute('cx', pt.x.toFixed(1));
      pulse.setAttribute('cy', pt.y.toFixed(1));
      path.style.strokeDashoffset = String(0.1 - t);
    };
    const frame = (now) => {
      raf = 0;
      const dt = Math.min(now - last, 60);
      last = now;
      if (pinned >= 0) {
        const diff = ((pinned / N - t + 1.5) % 1) - 0.5;
        t = (t + diff * 0.16 + 1) % 1;
        setActive(pinned);
      } else {
        t = (t + dt / (N * SEGMENT_MS)) % 1;
        setActive(Math.floor(t * N + 0.02) % N);
      }
      place();
      if (onScreen && !doc.hidden) raf = requestAnimationFrame(frame);
    };
    const start = () => { if (!raf && !reduced) { last = performance.now(); raf = requestAnimationFrame(frame); } };
    const pin = (i) => {
      pinned = i;
      if (reduced) { t = i / N; setActive(i); place(); }
    };
    steps.forEach((s, i) => {
      s.addEventListener('pointerenter', () => pin(i));
      s.addEventListener('focus', () => pin(i));
      s.addEventListener('click', () => pin(i));
      s.addEventListener('pointerleave', () => { if (!reduced) pinned = -1; });
      s.addEventListener('blur', () => { if (!reduced) pinned = -1; });
    });
    setActive(0);
    place();
    if (!reduced) {
      if (hasIO) new IntersectionObserver((entries) => { onScreen = entries[0].isIntersecting; if (onScreen) start(); }, { threshold: 0.15 }).observe(cycle);
      else { onScreen = true; start(); }
      doc.addEventListener('visibilitychange', () => { if (!doc.hidden && onScreen) start(); });
    }
  }

  /* ---- Filtre des projets ------------------------------------------------- */
  const grid = $('[data-pgrid]');
  if (grid) {
    const cards = $$('.pcard', grid);
    const buttons = $$('[data-filter]');
    cards.forEach((c, i) => { c.style.viewTransitionName = `pcard-${i}`; });
    const apply = (key) => cards.forEach((c) => { c.hidden = !(key === 'all' || c.dataset.kind === key); });
    buttons.forEach((b) => b.addEventListener('click', () => {
      buttons.forEach((x) => {
        const on = x === b;
        x.classList.toggle('is-active', on);
        x.setAttribute('aria-pressed', String(on));
      });
      if (doc.startViewTransition && !reduced) doc.startViewTransition(() => apply(b.dataset.filter));
      else apply(b.dataset.filter);
    }));
  }

  /* ---- Bordure lumineuse du poste actuel : en pause hors écran ------------ */
  const nowBorder = $('.now-border');
  if (nowBorder && hasIO) {
    new IntersectionObserver((entries) => {
      nowBorder.classList.toggle('is-paused', !entries[0].isIntersecting);
    }).observe(nowBorder);
  }

  /* ---- Visuels SVG : en pause hors écran ---------------------------------- */
  const vizEls = $$('.viz');
  if (vizEls.length && hasIO) {
    const vio = new IntersectionObserver((entries) => {
      for (const entry of entries) entry.target.classList.toggle('is-paused', !entry.isIntersecting);
    }, { rootMargin: '80px' });
    vizEls.forEach((v) => vio.observe(v));
  }

  /* ---- Copier l'adresse e-mail -------------------------------------------- */
  $$('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const value = btn.dataset.copy;
      try {
        await navigator.clipboard.writeText(value);
      } catch (err) {
        const ta = doc.createElement('textarea');
        ta.value = value; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
        doc.body.appendChild(ta); ta.select();
        try { doc.execCommand('copy'); } catch (e) { /* rien à faire */ }
        ta.remove();
      }
      const label = $('span', btn);
      const original = label.textContent;
      label.textContent = btn.dataset.copied;
      btn.classList.add('is-done');
      setTimeout(() => { label.textContent = original; btn.classList.remove('is-done'); }, 1800);
    });
  });

  /* ---- Mesure d'audience : clics utiles ----------------------------------- */
  doc.addEventListener('click', (e) => {
    const el = e.target.closest('[data-track]');
    if (el && typeof window.gtag === 'function') window.gtag('event', el.dataset.track, { link_url: el.getAttribute('href') || '' });
  });

  /* ---- Sonde de fluidité --------------------------------------------------
     Si l'affichage ne suit pas (médiane au-delà de 30 ms par image, soit moins de
     33 images/seconde), on bascule en mode allégé et on s'en souvient pour la session. */
  if (!isLite() && !reduced) {
    const probe = () => {
      const samples = [];
      let last = 0;
      const tick = (now) => {
        if (doc.hidden) { last = 0; samples.length = 0; }
        else if (last) { const d = now - last; if (d < 400) samples.push(d); }
        last = now;
        if (samples.length < 50) { requestAnimationFrame(tick); return; }
        samples.sort((a, b) => a - b);
        if (samples[25] > 30) {
          root.classList.add('lite');
          try { sessionStorage.setItem('perf', 'lite'); } catch (e) { /* stockage indisponible */ }
        }
      };
      requestAnimationFrame(tick);
    };
    addEventListener('load', () => setTimeout(probe, 900));
  }

  requestScroll();
  addEventListener('load', requestScroll);
})();
