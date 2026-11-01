/* cursor-destello.js · Índigo Prompt Studio  [copia de web-v3 con un arreglo: el tiempo del anillo nunca es negativo (arc con radio negativo)]
   Destello del cursor: estela de luz azul de marca (#0047FF → #7AA2FF) que se desvanece en ~350 ms, chispas al
   moverse rápido, brillo suave alrededor del puntero y un anillo que se expande al pulsar.
   - Solo con ratón: (hover: hover) and (pointer: fine). En táctil no se crea nada.
   - "Reducir movimiento": sin estela ni chispas; solo el brillo fijo que sigue al puntero.
   - Un único <canvas> fijo a pantalla completa, pointer-events: none, mix-blend-mode: screen (no tapa textos ni
     enlaces y luce sobre fondos oscuros y claros). requestAnimationFrame solo mientras hay algo que dibujar; se
     detiene en reposo y cuando la pestaña no está visible. DPR limitado a 1,5. */
(function (w, d) {
  'use strict';
  if (!w.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  var reduce = w.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var cv = d.createElement('canvas'); cv.className = 'cursor-fx'; cv.setAttribute('aria-hidden', 'true'); d.body.appendChild(cv);
  var g = cv.getContext('2d', { alpha: true }); if (!g) { cv.remove(); return; }
  var W = 0, H = 0, dpr = 1;
  function size() { dpr = Math.min(w.devicePixelRatio || 1, 1.5); W = w.innerWidth; H = w.innerHeight; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); g.setTransform(dpr, 0, 0, dpr, 0, 0); }
  size(); w.addEventListener('resize', size, { passive: true });

  var pts = [], chispas = [], anillos = [], mx = -100, my = -100, lastX = -100, lastY = -100, lastT = 0, ultimoMov = 0, dentro = false, raf = 0, activo = false;
  var VIDA = 360, VIDA_CHISPA = 520, VIDA_ANILLO = 480, BRILLO_MS = 1400;
  var C1 = '0,71,255', C2 = '122,162,255';

  function kick() { if (!raf && !d.hidden) raf = w.requestAnimationFrame(frame); }
  function onMove(e) {
    var t = performance.now(); mx = e.clientX; my = e.clientY; dentro = true; ultimoMov = t;
    if (!reduce) {
      var dx = mx - lastX, dy = my - lastY, dt = Math.max(1, t - lastT), v = Math.hypot(dx, dy) / dt; // px/ms
      if (lastX > -50 && Math.hypot(dx, dy) > 1) {
        pts.push({ x: mx, y: my, t: t, v: v });
        if (v > 1.1 && Math.hypot(dx, dy) > 6) { // chispas solo al moverse rápido
          var n = Math.min(3, 1 + Math.floor(v));
          for (var i = 0; i < n; i++) { var a = Math.atan2(dy, dx) + Math.PI + (Math.random() - 0.5) * 1.6, s = 0.08 + Math.random() * 0.22; chispas.push({ x: mx + (Math.random() - 0.5) * 6, y: my + (Math.random() - 0.5) * 6, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: t, r: 0.8 + Math.random() * 1.4 }); }
        }
        if (pts.length > 48) pts.splice(0, pts.length - 48);
      }
    }
    lastX = mx; lastY = my; lastT = t; kick();
  }
  function onLeave(e) { if (!e.relatedTarget) { dentro = false; kick(); } }
  function onDown(e) { if (e.button !== 0) return; if (!reduce) anillos.push({ x: e.clientX, y: e.clientY, t: performance.now() }); kick(); }

  function frame(now) {
    raf = 0;
    g.clearRect(0, 0, W, H);
    var hay = false;
    // estela: segmentos entre puntos recientes, más finos y tenues cuanto más viejos
    if (pts.length > 1) {
      g.lineCap = 'round'; g.lineJoin = 'round';
      for (var i = 1; i < pts.length; i++) {
        var p = pts[i], q = pts[i - 1], age = now - p.t; if (age > VIDA) continue; hay = true;
        var k = 1 - age / VIDA, e = k * k; // fundido rápido y suave
        var ancho = 2 + 10 * e * Math.min(1, 0.45 + p.v * 0.4);
        g.strokeStyle = 'rgba(' + C1 + ',' + (0.42 * e).toFixed(3) + ')'; g.lineWidth = ancho * 2.6; // halo exterior
        g.beginPath(); g.moveTo(q.x, q.y); g.lineTo(p.x, p.y); g.stroke();
        g.strokeStyle = 'rgba(' + C2 + ',' + (0.75 * e).toFixed(3) + ')'; g.lineWidth = ancho; // núcleo claro
        g.beginPath(); g.moveTo(q.x, q.y); g.lineTo(p.x, p.y); g.stroke();
        g.strokeStyle = 'rgba(255,255,255,' + (0.35 * e).toFixed(3) + ')'; g.lineWidth = Math.max(0.6, ancho * 0.28); // filo blanco
        g.beginPath(); g.moveTo(q.x, q.y); g.lineTo(p.x, p.y); g.stroke();
      }
    }
    while (pts.length && now - pts[0].t > VIDA) pts.shift(); // se purga siempre (también el último punto), así en reposo no queda nada
    // chispas
    for (var c = chispas.length - 1; c >= 0; c--) {
      var s = chispas[c], ag = now - s.t; if (ag > VIDA_CHISPA) { chispas.splice(c, 1); continue; } hay = true;
      var kk = 1 - ag / VIDA_CHISPA; s.x += s.vx * 16; s.y += s.vy * 16; s.vx *= 0.96; s.vy = s.vy * 0.96 + 0.004;
      g.fillStyle = 'rgba(' + C2 + ',' + (0.9 * kk).toFixed(3) + ')'; g.beginPath(); g.arc(s.x, s.y, s.r * (0.5 + kk), 0, 6.283); g.fill();
    }
    // anillo al pulsar
    for (var r = anillos.length - 1; r >= 0; r--) {
      var an = anillos[r], aa = Math.max(0, now - an.t); if (aa > VIDA_ANILLO) { anillos.splice(r, 1); continue; } hay = true;
      var kr = aa / VIDA_ANILLO, rad = 6 + 64 * (1 - Math.pow(1 - kr, 3));
      g.strokeStyle = 'rgba(' + C2 + ',' + (0.7 * (1 - kr)).toFixed(3) + ')'; g.lineWidth = 2.5 * (1 - kr) + 0.5; g.beginPath(); g.arc(an.x, an.y, rad, 0, 6.283); g.stroke();
      g.fillStyle = 'rgba(' + C1 + ',' + (0.18 * (1 - kr)).toFixed(3) + ')'; g.beginPath(); g.arc(an.x, an.y, rad * 0.9, 0, 6.283); g.fill();
    }
    // brillo suave alrededor del puntero (se apaga poco a poco si el ratón se queda quieto o sale)
    var quieto = now - ultimoMov, b = dentro ? Math.max(0, 1 - Math.max(0, quieto - 500) / BRILLO_MS) : 0;
    if (b > 0.01) {
      hay = hay || b > 0.02;
      var R = 70, gr = g.createRadialGradient(mx, my, 0, mx, my, R);
      gr.addColorStop(0, 'rgba(' + C2 + ',' + (0.22 * b).toFixed(3) + ')'); gr.addColorStop(0.35, 'rgba(' + C1 + ',' + (0.12 * b).toFixed(3) + ')'); gr.addColorStop(1, 'rgba(' + C1 + ',0)');
      g.fillStyle = gr; g.beginPath(); g.arc(mx, my, R, 0, 6.283); g.fill();
      if (b < 1) hay = true; // sigue animando mientras se apaga
    }
    activo = hay;
    if (hay && !d.hidden) raf = w.requestAnimationFrame(frame);
  }
  w.addEventListener('pointermove', onMove, { passive: true });
  d.addEventListener('mouseout', onLeave);
  w.addEventListener('pointerdown', onDown, { passive: true });
  d.addEventListener('visibilitychange', function () { if (d.hidden) { if (raf) { w.cancelAnimationFrame(raf); raf = 0; } g.clearRect(0, 0, W, H); } else kick(); });
  w.__ipsCursor = { estado: function () { return { activo: activo, puntos: pts.length, chispas: chispas.length, anillos: anillos.length, animando: !!raf, reduce: reduce }; } }; // para pruebas
})(window, document);
