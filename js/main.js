/* Índigo Prompt Studio · web v3 · JS propio (más Lenis para el scroll suave y Three.js solo en la portada) */
(function () {
  'use strict';
  var d = document, w = window, root = d.documentElement;
  var CFG = w.IPS || {};
  var reduce = w.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = w.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var $ = function (s, c) { return (c || d).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var vh = w.innerHeight;

  /* ---------- Scroll suave (Lenis, solo con ratón o trackpad) + scroll perfecto (un gesto, una parada) ---------- */
  var lenis = null, sp = null;
  var pasos = d.body.getAttribute('data-scroll') === 'pasos';
  var tactil = w.matchMedia('(hover: none) and (pointer: coarse)').matches;
  var story = $('.story'), storyOn = root.classList.contains('story-on');
  var STEPS = $$('.ch').length || 5;
  if (story && storyOn) story.style.setProperty('--story-steps', STEPS);
  function storyStops() { // paradas de la portada: el héroe y una por tarjeta
    if (!story || !root.classList.contains('story-on')) return [];
    var top = story.getBoundingClientRect().top + (w.scrollY || w.pageYOffset), total = story.offsetHeight - vh, out = [];
    for (var k = 0; k <= STEPS; k++) out.push(Math.round(top + total * k / STEPS));
    return out;
  }
  function secciones() { return $$('main > section').filter(function (s) { return !s.classList.contains('story'); }).concat($$('.foot')); }
  function zonas() {
    // La portada es el único tramo por paradas. A partir de aquí el contenido se
    // recorre libremente: ninguna tarjeta larga puede quedar saltada por un snap.
    return storyStops().map(function (y) { return { a: y, b: y }; });
  }
  if (!reduce && w.Lenis && !tactil) {
    try {
      lenis = new w.Lenis({ lerp: 0.1, smoothWheel: true, anchors: false, autoRaf: false,
        virtualScroll: function (data) { return sp ? sp.handle(data) : true; } });
      var rafL = function (t) { lenis.raf(t); w.requestAnimationFrame(rafL); };
      w.requestAnimationFrame(rafL);
      if (pasos && story && w.ScrollPerfecto) { sp = w.ScrollPerfecto.init({ lenis: lenis, zonas: zonas, libreDespues: true }); w.__ipsSP = sp; }
    } catch (e) { lenis = null; }
  }
  // Táctil: snap nativo obligatorio solo dentro de la portada. Fuera de ella el
  // dedo conserva su inercia normal para poder leer cualquier contenido largo.
  function marcadores() {
    if (!story) return;
    // se crean una vez y luego solo se recolocan: quitar el punto de anclaje activo hace que el navegador salte a otro
    var ms = $$('.story-stop', story);
    if (!root.classList.contains('story-on')) { ms.forEach(function (m) { m.remove(); }); return; }
    var total = story.offsetHeight - vh;
    for (var k = 0; k <= STEPS; k++) {
      var m = ms[k]; if (!m) { m = d.createElement('i'); m.className = 'story-stop'; m.setAttribute('aria-hidden', 'true'); story.appendChild(m); }
      var top = Math.round(total * k / STEPS + 96) + 'px'; if (m.style.top !== top) m.style.top = top;
    }
  }
  // Un enlace con ancla a algo posterior a la portada (index.html#seccion) no puede arrancar con el snap
  // obligatorio activo: el navegador devolvería el salto a la última parada y nunca se llegaría a la sección.
  var anclaFuera = (function () {
    if (!story || location.hash.length < 2) return false;
    var el = null; try { el = d.getElementById(decodeURIComponent(location.hash.slice(1))); } catch (x) {}
    return !!el && !story.contains(el) && !!(story.compareDocumentPosition(el) & 4);
  })();
  function prepTactil() {
    if (pasos && tactil && !reduce && story && w.ScrollPerfecto) {
      marcadores();
      w.ScrollPerfecto.tactil([story], {
        nav: 72,
        fuerte: true,
        activo: function () {
          var y = w.scrollY || w.pageYOffset, top = story.getBoundingClientRect().top + y, fin = top + story.offsetHeight - w.innerHeight + 2;
          if (anclaFuera) { if (y > fin) anclaFuera = false; else return false; }
          return y <= fin;
        }
      });
    }
  }
  prepTactil();
  w.addEventListener('load', prepTactil);
  function scrollToEl(el, offset) {
    var y = el.getBoundingClientRect().top + (w.scrollY || w.pageYOffset) + (offset || -88);
    if (lenis) lenis.scrollTo(y, { duration: 1.2, easing: w.ScrollPerfecto ? w.ScrollPerfecto.easeIO : undefined }); else w.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
  }
  d.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute('href') === '#') return;
    var el = d.getElementById(a.getAttribute('href').slice(1));
    if (!el) return;
    e.preventDefault(); scrollToEl(el); openIfDetails(el);
    if (a.classList.contains('skip')) el.focus({ preventScroll: true });
    if (history.replaceState) history.replaceState(null, '', a.getAttribute('href'));
  });

  /* ---------- Bucle de scroll ---------- */
  var nav = $('#nav'), fab = $('#fab');
  var storyHero = $('#storyHero'), chapters = $$('.ch'), hint = $('#scrollHint'), prog = $('.story-progress');
  var process = $('#process'), pSteps = process ? $$('.step', process) : [];
  var scene = null, ticking = false, lastCh = -2;
  function onScroll() { if (!ticking) { ticking = true; w.requestAnimationFrame(update); } }
  function update() {
    ticking = false;
    var y = w.scrollY || w.pageYOffset;
    if (nav) nav.classList.toggle('stuck', y > 24);
    if (fab) fab.classList.toggle('show', y > Math.max(500, vh * 0.8));
    if (story) {
      var r = story.getBoundingClientRect(), total = story.offsetHeight - vh;
      var p = root.classList.contains('story-on') && total > 0 ? clamp(-r.top / total, 0, 1) : 0;
      if (scene) scene.setProgress(p, STEPS);
      if (root.classList.contains('story-on')) {
        var idx = Math.round(p * STEPS) - 1; // -1 = portada; el cambio ocurre a mitad de cada transición
        if (storyHero) storyHero.classList.toggle('out', idx >= 0);
        if (hint) hint.classList.toggle('out', p > 0.03);
        if (prog) prog.style.setProperty('--sp', p.toFixed(3));
        if (idx !== lastCh) { lastCh = idx; chapters.forEach(function (c, i) { c.classList.toggle('on', i === idx); c.setAttribute('aria-hidden', String(i !== idx)); if (i === idx) c.removeAttribute('inert'); else c.setAttribute('inert', ''); }); }
      }
    }
    if (process) {
      var pr = process.getBoundingClientRect();
      var pp = clamp((vh * 0.7 - pr.top) / pr.height, 0, 1);
      process.style.setProperty('--pp', pp.toFixed(3));
      pSteps.forEach(function (s) { var sr = s.getBoundingClientRect(); s.classList.toggle('on', sr.top < vh * 0.62 || reduce); });
    }
  }
  w.addEventListener('scroll', onScroll, { passive: true });
  var rzT = 0;
  w.addEventListener('resize', function () { vh = w.innerHeight; onScroll(); w.clearTimeout(rzT); rzT = w.setTimeout(prepTactil, 200); }, { passive: true });

  /* ---------- Entradas, palabras y efectos de puntero ---------- */
  function splitWords(el) {
    var n = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (c) {
        if (c.nodeType === 3) {
          var parts = c.textContent.split(/(\s+)/), frag = d.createDocumentFragment();
          parts.forEach(function (t) {
            if (!t) return;
            if (/^\s+$/.test(t)) { frag.appendChild(d.createTextNode(' ')); return; }
            var o = d.createElement('span'), i = d.createElement('span');
            o.className = 'w'; i.textContent = t; i.style.setProperty('--i', n++); o.appendChild(i); frag.appendChild(o);
          });
          node.replaceChild(frag, c);
        } else if (c.nodeType === 1) walk(c);
      });
    })(el);
  }
  if (!reduce) $$('.words').forEach(splitWords);
  var revealEls = $$('.reveal, .words');
  if (reduce || !('IntersectionObserver' in w)) {
    revealEls.forEach(function (e) { e.classList.add('in'); });
  } else {
    revealEls.forEach(function (e, i) { if (e.classList.contains('reveal')) e.style.setProperty('--d', ((i % 3) * 0.08) + 's'); });
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealEls.forEach(function (e) { io.observe(e); });
  }
  if (fine && !reduce) {
    $$('[data-spot]').forEach(function (c) {
      c.addEventListener('pointermove', function (e) { var r = c.getBoundingClientRect(); c.style.setProperty('--mx', (e.clientX - r.left) + 'px'); c.style.setProperty('--my', (e.clientY - r.top) + 'px'); });
    });
    $$('[data-tilt3d]').forEach(function (c) {
      var st = $('.avatar-stage', c);
      c.addEventListener('pointermove', function (e) { var r = c.getBoundingClientRect(); st.style.setProperty('--ry', (((e.clientX - r.left) / r.width - 0.5) * 14).toFixed(2) + 'deg'); st.style.setProperty('--rx', (-((e.clientY - r.top) / r.height - 0.5) * 12).toFixed(2) + 'deg'); });
      c.addEventListener('pointerleave', function () { st.style.setProperty('--ry', '0deg'); st.style.setProperty('--rx', '0deg'); });
    });
    var art = $('.phero-art img');
    if (art) w.addEventListener('pointermove', function (e) { art.style.setProperty('--px', ((e.clientX / w.innerWidth - 0.5) * 18).toFixed(1) + 'px'); art.style.setProperty('--py', ((e.clientY / vh - 0.5) * 12).toFixed(1) + 'px'); }, { passive: true });
    $$('.btn-primary').forEach(function (b) {
      b.addEventListener('pointermove', function (e) { var r = b.getBoundingClientRect(); b.style.transform = 'translate(' + (((e.clientX - r.left) / r.width - 0.5) * 8).toFixed(1) + 'px,' + (((e.clientY - r.top) / r.height - 0.5) * 6).toFixed(1) + 'px)'; });
      b.addEventListener('pointerleave', function () { b.style.transform = ''; });
    });
  }

  /* ---------- Escena 3D de la portada ---------- */
  (function sceneInit() {
    var cv = $('#gl');
    if (!cv) return;
    function fail() { root.classList.remove('story-on'); root.classList.add('no-gl'); cv.classList.remove('on'); scene = null; if (sp) sp.refresh(); marcadores(); update(); }
    if (!root.classList.contains('story-on')) { root.classList.add('no-gl'); return; }
    // En la escena móvil el panel puede ocupar casi todo el ancho físico: la
    // fuente 720 px quedaba por debajo de 390 CSS px a DPR 3.
    var paneles = ((w.IPS && w.IPS.creaciones) || []).slice(0, 3).map(function (c) { return 'assets/img/' + c.id + '-1200.webp'; });
    function go() {
      if (sp && sp.animating) { w.setTimeout(go, 400); return; } // nunca en mitad de un salto
      import('./scene.js').then(function (m) {
        return m.start(cv, { small: w.innerWidth < 760, paneles: paneles, visibilityTarget: story, onReady: function () { cv.classList.add('on'); var fb = $('.story-fallback'); if (fb) fb.classList.add('gone'); }, onFail: fail });
      }).then(function (s) { if (!s) return; scene = s; w.__ipsScene = s; medirBandas(); update(); }).catch(fail);
    }
    // En pantallas estrechas la D se coloca entre la cabecera y el texto: se mide dónde empieza el texto de verdad
    function medirBandas() {
      if (!scene || !story) return;
      var st = $('.story-stick', story), h = $('#storyHero'), c = $('#chapters'); if (!st || !h) return;
      var top = st.getBoundingClientRect().top;
      scene.setBandas({ hero: Math.round(h.getBoundingClientRect().top - top), card: c ? Math.round(c.getBoundingClientRect().top - top) : 0 });
    }
    w.addEventListener('resize', function () { w.setTimeout(medirBandas, 220); }, { passive: true });
    // Se prepara en un momento libre justo después de cargar (antes se cargaba con el primer gesto de scroll y lo congelaba ~1 s)
    function arm() { if ('requestIdleCallback' in w) w.requestIdleCallback(go, { timeout: 900 }); else w.setTimeout(go, 300); }
    if (d.readyState === 'complete') arm(); else w.addEventListener('load', arm);
  })();

  /* ---------- Capas: menú y visor ---------- */
  var lastFocus = null, openEl = null;
  function setInert(on) { $$('.topbar, .nav, main, .foot').forEach(function (x) { if (on) x.setAttribute('inert', ''); else x.removeAttribute('inert'); }); }
  function focusables(el) { return $$('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])', el).filter(function (x) { return x.offsetParent !== null || x === d.activeElement; }); }
  function openLayer(el, first) {
    if (openEl) closeLayer();
    lastFocus = d.activeElement; openEl = el;
    el.hidden = false; d.body.classList.add('locked'); if (lenis) lenis.stop(); setInert(true);
    if (scene && scene.setPaused) scene.setPaused(true); // la portada 3D descansa mientras una capa la tapa
    var f = first || focusables(el)[0]; if (f) w.setTimeout(function () { f.focus(); }, 30);
  }
  function closeLayer() {
    if (!openEl) return;
    var el = openEl; openEl = null;
    el.hidden = true; d.body.classList.remove('locked'); if (lenis) lenis.start(); setInert(false);
    if (el.id === 'viewer' && typeof cerrarVisor === 'function') cerrarVisor();
    if (scene && scene.setPaused) scene.setPaused(false);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  $$('.overlay').forEach(function (el) { el.addEventListener('click', function (e) { if (e.target.closest('[data-close]')) closeLayer(); }); });
  d.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && openEl) { e.preventDefault(); closeLayer(); return; }
    if (e.key === 'Tab' && openEl) {
      var f = focusables(openEl); if (!f.length) return;
      var a = f[0], z = f[f.length - 1];
      if (e.shiftKey && d.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && d.activeElement === z) { e.preventDefault(); a.focus(); }
    }
  });

  // Visor de creaciones: la web REAL viva en un iframe (vídeos, 3D y efectos funcionando), a tamaño real de
  // escritorio (1280 px) o de móvil (390 px) y escalada para llenar el marco. Si una creación no tiene versión
  // viva ("vivo" en site-config), se usa la captura de página entera.
  var CREA = {}; ((CFG.creaciones) || []).forEach(function (c) { CREA[c.id] = c; });
  var vScroll = $('#viewerScroll'), vImg = $('#viewerImg'), vHint = $('#viewerHint'), vModes = $$('.vm'), vActual = null, vModo = 'pc', vFrame = null, vCarga = null, vHintT = 0;
  function encajarFrame() {
    if (!vFrame || !vActual || !vActual.vivo) return;
    var box = vScroll.getBoundingClientRect(), movil = vModo === 'movil', W, k;
    if (box.width < 10 || box.height < 10) { w.requestAnimationFrame(encajarFrame); return; } // la capa aún no se ve: medir en el siguiente fotograma
    if (movil) { if (box.width < 520) { W = Math.round(box.width); k = 1; } else { W = 390; k = Math.min(1, (box.width - 48) / W); } }
    else { W = 1280; k = Math.min(1, box.width / W); }
    vFrame.style.width = W + 'px'; vFrame.style.height = Math.round((box.height - (movil && k < 1 ? 36 : 0)) / k) + 'px'; vFrame.style.transform = k === 1 ? 'none' : 'scale(' + k.toFixed(4) + ')';
    vFrame.style.marginTop = movil && k < 1 ? '18px' : '0';
    // el marco escalado sigue ocupando su tamaño real en el flujo: se compensa para que no desborde
    vFrame.style.marginBottom = k === 1 ? '0' : (-(1 - k) * Math.round(box.height / k)) + 'px';
    vFrame.style.marginRight = k === 1 ? '0' : (-(1 - k) * W) + 'px';
  }
  function verModo(modo) {
    if (!vActual) return;
    var c = vActual, cambia = modo !== vModo; vModo = modo;
    vScroll.classList.toggle('movil', modo === 'movil'); vScroll.scrollTop = 0;
    vModes.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-mode') === modo)); });
    if (vHint) { vHint.classList.remove('out'); w.clearTimeout(vHintT); vHintT = w.setTimeout(function () { vHint.classList.add('out'); }, 3500); }
    if (c.vivo) {
      vScroll.classList.add('vivo'); vScroll.classList.remove('lista');
      if (!vFrame) {
        vCarga = d.createElement('div'); vCarga.className = 'viewer-cargando'; vCarga.textContent = 'Cargando la web…'; vScroll.appendChild(vCarga);
        vFrame = d.createElement('iframe'); vFrame.className = 'viewer-frame'; vFrame.setAttribute('loading', 'eager'); vFrame.setAttribute('referrerpolicy', 'no-referrer'); vFrame.setAttribute('allow', 'autoplay; fullscreen'); vFrame.setAttribute('scrolling', 'yes');
        vFrame.addEventListener('load', function () { if (vFrame.getAttribute('src') && vFrame.getAttribute('src') !== 'about:blank') vScroll.classList.add('lista'); });
        vScroll.appendChild(vFrame);
      }
      vFrame.title = 'Web completa de ' + c.nombre + ' (' + c.sector.toLowerCase() + '), vista ' + (modo === 'movil' ? 'móvil' : 'de ordenador');
      encajarFrame();
      var url = c.vivo; if (cambia || vFrame.getAttribute('src') !== url) { vScroll.classList.remove('lista'); vFrame.setAttribute('src', url); }
    } else {
      vScroll.classList.remove('vivo', 'lista'); if (vFrame) vFrame.setAttribute('src', 'about:blank');
      var src = c.previa ? 'assets/img/creaciones/' + c.id + '-' + modo + '.webp' : (modo === 'movil' && c.app ? 'assets/img/app-' + c.id + '.webp' : 'assets/img/' + c.id + '-1200.webp');
      vImg.removeAttribute('width'); vImg.removeAttribute('height');
      vImg.src = src; vImg.alt = 'Vista ' + (modo === 'movil' ? 'móvil' : 'de ordenador') + ' de la web completa de ' + c.nombre + ' (' + c.sector.toLowerCase() + ')';
    }
  }
  function cerrarVisor() { if (vFrame) { vFrame.setAttribute('src', 'about:blank'); vScroll.classList.remove('lista'); } } // para los vídeos: nada sigue sonando ni consumiendo
  vModes.forEach(function (b) { b.addEventListener('click', function () { verModo(b.getAttribute('data-mode')); }); });
  if (vScroll) vScroll.addEventListener('scroll', function () { if (vHint && vScroll.scrollTop > 40) vHint.classList.add('out'); }, { passive: true });
  w.addEventListener('resize', function () { if (openEl && openEl.id === 'viewer') encajarFrame(); }, { passive: true });
  function abrirCreacion(id) {
    var c = CREA[id]; if (!c) return;
    vActual = c;
    $('#viewerCat').textContent = c.sector; $('#viewerTitle').textContent = c.nombre; $('#viewerText').textContent = c.texto;
    $('#viewerUrl').textContent = c.nombre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '') + '.es';
    var tg = $('#viewerTags'); tg.innerHTML = ''; (c.tags || []).forEach(function (t) { var li = d.createElement('li'); li.textContent = t; tg.appendChild(li); });
    var wa = $('#viewerWa'); if (wa && CFG.wa) wa.href = CFG.wa.replace(/text=[^&]*/, 'text=' + encodeURIComponent('Hola, he visto ' + c.nombre + ' en vuestra web y me gustaría una web así para mi negocio.'));
    openLayer($('#viewer'), vScroll); // primero se abre la capa (para poder medir el escenario) y luego se carga la web
    verModo(w.innerWidth < 700 ? 'movil' : 'pc');
  }
  d.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-open]'); if (b) abrirCreacion(b.getAttribute('data-open')); });

  // Carrusel de creaciones: se mueve solo y despacio, se para con el cursor o el dedo, admite añadir más
  (function creaInit() {
    var box = $('#crea'), view = $('#creaView'), track = $('#creaTrack'); if (!box || !view || !track) return;
    var items = $$('.crea-item', track), pausaBtn = $('#creaPause'), auto = !reduce && items.length > 1;
    if (!auto) { box.classList.add('no-auto'); if (pausaBtn) pausaBtn.hidden = true; }
    // copias para el bucle infinito (no se anuncian ni reciben foco)
    if (auto) items.forEach(function (it) { var c = it.cloneNode(true); c.setAttribute('aria-hidden', 'true'); c.setAttribute('inert', ''); c.classList.add('clon'); track.appendChild(c); });
    var acc = view.scrollLeft, vel = 34, pausado = false, sobre = false, toque = 0, visible = false, last = 0, raf = 0;
    function mitad() { return track.scrollWidth / 2; }
    function loop(t) {
      raf = 0; if (!visible || d.hidden) return;
      raf = w.requestAnimationFrame(loop);
      var dt = Math.min(64, t - (last || t)); last = t;
      if (pausado || sobre || openEl || t < toque) { acc = view.scrollLeft; return; }
      acc += vel * dt / 1000;
      var m = mitad(); if (acc >= m) acc -= m;
      view.scrollLeft = acc;
    }
    function kick() { if (auto && !raf && visible) { last = 0; raf = w.requestAnimationFrame(loop); } }
    if ('IntersectionObserver' in w) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; kick(); }).observe(view); else { visible = true; kick(); }
    d.addEventListener('visibilitychange', kick);
    box.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') sobre = true; });
    box.addEventListener('pointerleave', function () { sobre = false; });
    box.addEventListener('focusin', function () { sobre = true; }); box.addEventListener('focusout', function () { sobre = false; });
    view.addEventListener('touchstart', function () { toque = performance.now() + 4000; }, { passive: true });
    view.addEventListener('scroll', function () { if (auto && view.scrollLeft >= mitad() + 2 && (sobre || toque)) { view.scrollLeft -= mitad(); acc = view.scrollLeft; } }, { passive: true });
    function paso(dir) { var it = items[0], wd = it ? it.getBoundingClientRect().width + 22 : 400; toque = performance.now() + 5000; view.scrollBy({ left: dir * wd, behavior: reduce ? 'auto' : 'smooth' }); }
    var pv = $('#creaPrev'), nx = $('#creaNext');
    if (pv) pv.addEventListener('click', function () { if (auto && view.scrollLeft < 40) { view.scrollLeft += mitad(); } paso(-1); });
    if (nx) nx.addEventListener('click', function () { paso(1); });
    if (pausaBtn) pausaBtn.addEventListener('click', function () {
      pausado = !pausado; pausaBtn.setAttribute('aria-pressed', String(pausado));
      pausaBtn.setAttribute('aria-label', pausado ? 'Reanudar el movimiento del carrusel' : 'Pausar el movimiento del carrusel');
      pausaBtn.innerHTML = pausado ? '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 5.5v13l10-6.5z"/></svg>' : '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9 6v12M15 6v12"/></svg>';
    });
  })();

  /* ---------- Preguntas: abrir por enlace, buscar y abrir todas ---------- */
  function openIfDetails(el) { var dt = el.closest && el.closest('details'); if (dt) dt.open = true; }
  function hashDetails() { if (location.hash.length > 1) { var el = null; try { el = d.getElementById(decodeURIComponent(location.hash.slice(1))); } catch (x) {} if (el) { openIfDetails(el); w.setTimeout(function () { scrollToEl(el); }, 120); } } }
  w.addEventListener('hashchange', hashDetails);
  function norm(s) { return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  (function faqInit() {
    var list = $('#faqList'); if (!list) return;
    var items = $$('details', list), qi = $('#faqQ'), empty = $('#faqEmpty'), live = $('#faqLive'), tg = $('#faqToggle');
    function filter() {
      var v = norm(qi.value.trim()), words = v.split(/\s+/).filter(Boolean), n = 0;
      items.forEach(function (it) { var ok = !words.length || words.every(function (x) { return norm(it.textContent).indexOf(x) !== -1; }); it.hidden = !ok; if (ok) n++; });
      $$('.faq-group', list).forEach(function (g) { g.hidden = !$$('details:not([hidden])', g).length; });
      empty.hidden = n > 0; live.textContent = v ? (n + (n === 1 ? ' pregunta encontrada' : ' preguntas encontradas')) : '';
    }
    qi.addEventListener('input', filter);
    tg.addEventListener('click', function () {
      var open = tg.getAttribute('aria-pressed') !== 'true'; tg.setAttribute('aria-pressed', String(open)); tg.textContent = open ? 'Cerrar todas' : 'Abrir todas';
      items.forEach(function (it) { if (!it.hidden) it.open = open; });
    });
  })();


  /* ---------- Botón atrás y recarga: volver a la misma altura (con Lenis y la portada fija el navegador no siempre acierta) ---------- */
  (function restaurar() {
    var KEY = 'ips-y:' + location.pathname;
    try { if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; } catch (e) {}
    w.addEventListener('pagehide', function () { try { sessionStorage.setItem(KEY, String(Math.round(w.scrollY || w.pageYOffset))); } catch (e) {} });
    function ir() {
      var nv = (w.performance && performance.getEntriesByType) ? performance.getEntriesByType('navigation')[0] : null;
      if (!nv || (nv.type !== 'back_forward' && nv.type !== 'reload') || location.hash) return;
      var y = 0; try { y = +sessionStorage.getItem(KEY) || 0; } catch (e) {}
      if (y > 0) { if (lenis) lenis.scrollTo(y, { immediate: true, force: true }); else w.scrollTo(0, y); update(); }
    }
    if (d.readyState === 'complete') w.requestAnimationFrame(ir); else w.addEventListener('load', function () { w.requestAnimationFrame(ir); });
  })();

  if (location.hash) w.setTimeout(hashDetails, 200);
  update();
})();
