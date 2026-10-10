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

  /* ---------- Scroll suave (Lenis) ---------- */
  var lenis = null;
  if (!reduce && w.Lenis) {
    try {
      lenis = new w.Lenis({ lerp: 0.1, smoothWheel: true, anchors: false });
      var rafL = function (t) { lenis.raf(t); w.requestAnimationFrame(rafL); };
      w.requestAnimationFrame(rafL);
    } catch (e) { lenis = null; }
  }
  function scrollToEl(el, offset) {
    var y = el.getBoundingClientRect().top + (w.scrollY || w.pageYOffset) + (offset || -88);
    if (lenis) lenis.scrollTo(y, { duration: 1.1 }); else w.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
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
  var story = $('.story'), storyHero = $('#storyHero'), chapters = $$('.ch'), hint = $('#scrollHint'), prog = $('.story-progress');
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
      if (scene) scene.setProgress(p);
      if (root.classList.contains('story-on')) {
        if (storyHero) storyHero.classList.toggle('out', p > 0.08);
        if (hint) hint.classList.toggle('out', p > 0.03);
        if (prog) prog.style.setProperty('--sp', p.toFixed(3));
        var idx = p <= 0.08 ? -1 : Math.min(chapters.length - 1, Math.floor((p - 0.08) / (0.92 / chapters.length)));
        if (idx !== lastCh) { lastCh = idx; chapters.forEach(function (c, i) { c.classList.toggle('on', i === idx); }); }
      }
    }
    if (process) {
      var pr = process.getBoundingClientRect();
      var pp = clamp((vh * 0.7 - pr.top) / pr.height, 0, 1);
      process.style.setProperty('--pp', pp.toFixed(3));
      pSteps.forEach(function (s, i) {
        var sr = s.getBoundingClientRect(); s.classList.toggle('on', sr.top < vh * 0.62 || reduce);
      });
    }
  }
  w.addEventListener('scroll', onScroll, { passive: true });
  w.addEventListener('resize', function () { vh = w.innerHeight; onScroll(); }, { passive: true });

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
    function fail() { root.classList.remove('story-on'); root.classList.add('no-gl'); cv.classList.remove('on'); scene = null; update(); }
    if (!root.classList.contains('story-on')) { root.classList.add('no-gl'); return; }
    function go() {
      import('./scene.js').then(function (m) {
        var s = m.start(cv, { small: w.innerWidth < 760, visibilityTarget: story, onReady: function () { cv.classList.add('on'); var fb = $('.story-fallback'); if (fb) fb.classList.add('gone'); }, onFail: fail });
        if (!s) return;
        scene = s; update();
      }).catch(fail);
    }
    // La escena arranca con la primera interacción o, como mucho, 3,5 s después de cargar la página (mientras tanto se ve el símbolo en imagen)
    var started = false;
    function once() { if (started) return; started = true; ['pointerdown', 'keydown', 'touchstart', 'wheel', 'scroll'].forEach(function (ev) { w.removeEventListener(ev, once); }); go(); }
    function arm() { ['pointerdown', 'keydown', 'touchstart', 'wheel', 'scroll'].forEach(function (ev) { w.addEventListener(ev, once, { passive: true, once: true }); }); w.setTimeout(once, 3500); }
    if (d.readyState === 'complete') arm(); else w.addEventListener('load', arm);
  })();

  /* ---------- Capas: menú, búsqueda, visor ---------- */
  var lastFocus = null, openEl = null;
  function setInert(on) { $$('.topbar, .nav, main, .foot').forEach(function (x) { if (on) x.setAttribute('inert', ''); else x.removeAttribute('inert'); }); }
  function focusables(el) { return $$('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])', el).filter(function (x) { return x.offsetParent !== null || x === d.activeElement; }); }
  function openLayer(el, first) {
    if (openEl) closeLayer();
    lastFocus = d.activeElement; openEl = el;
    el.hidden = false; d.body.classList.add('locked'); if (lenis) lenis.stop(); setInert(true);
    if (el.id === 'menu') $('#btnMenu').setAttribute('aria-expanded', 'true');
    var f = first || focusables(el)[0]; if (f) w.setTimeout(function () { f.focus(); }, 30);
  }
  function closeLayer() {
    if (!openEl) return;
    var el = openEl; openEl = null;
    el.hidden = true; d.body.classList.remove('locked'); if (lenis) lenis.start(); setInert(false);
    if (el.id === 'menu') $('#btnMenu').setAttribute('aria-expanded', 'false');
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
    if ((e.key === '/' || (e.key.toLowerCase() === 'k' && (e.ctrlKey || e.metaKey))) && !openEl && !/input|textarea|select/i.test(d.activeElement.tagName)) { e.preventDefault(); openSearch(); }
  });
  $('#btnMenu').addEventListener('click', function () { openLayer($('#menu')); });

  // Visor de demos
  var DATA = {
    dental: { img: 'dental', app: 'app-dental', cat: 'Clínica dental', title: 'NÁCAR Dental', text: 'Demo de web para una clínica dental ficticia: tratamientos explicados con claridad, imagen luminosa con un diente en 3D y versión app para el móvil.', tags: ['Pedir cita en un gesto', 'Tratamientos', 'Objeto 3D', 'Versión app'] },
    inmo: { img: 'inmo', app: 'app-inmo', cat: 'Inmobiliaria', title: 'AURA Estates', text: 'Demo de web para una inmobiliaria ficticia: vídeo a pantalla completa, buscador por zona y tipo de inmueble, fichas y solicitud de visita.', tags: ['Vídeo a pantalla completa', 'Buscador por zona y tipo', 'Solicitar visita', 'Versión app'] },
    ropa: { img: 'ropa', app: 'app-ropa', cat: 'Tienda de moda', title: 'ATELIER NORTE', text: 'Demo de tienda online de moda ficticia: catálogo por secciones, fichas de producto y cesta, con versión app para el móvil.', tags: ['Catálogo por secciones', 'Fichas de producto', 'Cesta', 'Versión app'] }
  };
  $$('[data-open]').forEach(function (b) {
    b.addEventListener('click', function () {
      var it = DATA[b.getAttribute('data-open')]; if (!it) return;
      var im = $('#viewerImg'); im.src = 'assets/img/' + it.img + '-1200.webp'; im.alt = 'Captura de la demo ' + it.title + ' (' + it.cat.toLowerCase() + ')';
      var ap = $('#viewerApp');
      if (it.app) { ap.src = 'assets/img/' + it.app + '.webp'; ap.alt = 'Versión móvil de la demo ' + it.title; ap.classList.remove('none'); } else { ap.classList.add('none'); ap.alt = ''; }
      $('#viewerCat').textContent = it.cat; $('#viewerTitle').textContent = it.title; $('#viewerText').textContent = it.text;
      var tg = $('#viewerTags'); tg.innerHTML = ''; it.tags.forEach(function (t) { var li = d.createElement('li'); li.textContent = t; tg.appendChild(li); });
      openLayer($('#viewer'));
    });
  });

  // Búsqueda (el índice se genera en la compilación y se carga al abrirla)
  var q = $('#q'), results = $('#results'), idxLoading = false;
  function norm(s) { return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function render() {
    var v = norm(q.value.trim()), INDEX = w.IPS_INDEX || [];
    if (!w.IPS_INDEX) { results.innerHTML = '<li class="empty">Cargando...</li>'; return; }
    var words = v.split(/\s+/).filter(Boolean);
    var list = INDEX.filter(function (r) { var h = norm(r[0] + ' ' + r[3]); return words.every(function (x) { return h.indexOf(x) !== -1; }); }).slice(0, 30);
    results.innerHTML = '';
    if (!list.length) { var li = d.createElement('li'); li.className = 'empty'; li.textContent = 'Sin resultados. Prueba con «precio», «dominio» o «tienda».'; results.appendChild(li); return; }
    list.forEach(function (r) {
      var li = d.createElement('li'), a = d.createElement('a');
      a.href = r[1];
      var t = d.createElement('span'); t.textContent = r[0];
      var m = d.createElement('span'); m.className = 'mono'; m.textContent = r[2];
      a.appendChild(t); a.appendChild(m); li.appendChild(a); results.appendChild(li);
      a.addEventListener('click', function (e) {
        var here = location.pathname.split('/').pop() || 'index.html', parts = r[1].split('#');
        if (parts[1] && (parts[0] === here || (parts[0] === 'index.html' && here === ''))) {
          e.preventDefault(); closeLayer(); var el = d.getElementById(parts[1]); if (el) { scrollToEl(el); openIfDetails(el); }
        } else closeLayer();
      });
    });
  }
  function openSearch() {
    q.value = ''; openLayer($('#search'), q);
    if (!w.IPS_INDEX && !idxLoading) { idxLoading = true; var s = d.createElement('script'); s.src = 'js/search-index.js'; s.onload = render; s.onerror = function () { results.innerHTML = '<li class="empty">No se pudo cargar el buscador.</li>'; idxLoading = false; }; d.head.appendChild(s); }
    render();
  }
  $('#btnSearch').addEventListener('click', openSearch);
  q.addEventListener('input', render);
  q.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { var a = results.querySelector('a'); if (a) { e.preventDefault(); a.click(); if (a.getAttribute('target') !== '_blank' && a.href.indexOf('#') === -1) location.href = a.getAttribute('href'); } }
    if (e.key === 'ArrowDown') { var f = results.querySelector('a'); if (f) { e.preventDefault(); f.focus(); } }
  });
  results.addEventListener('keydown', function (e) {
    var links = $$('a', results), i = links.indexOf(d.activeElement);
    if (e.key === 'ArrowDown' && i < links.length - 1) { e.preventDefault(); links[i + 1].focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); if (i > 0) links[i - 1].focus(); else q.focus(); }
  });

  /* ---------- Preguntas: abrir por enlace, buscar y abrir todas ---------- */
  function openIfDetails(el) { var dt = el.closest && el.closest('details'); if (dt) dt.open = true; }
  function hashDetails() { if (location.hash.length > 1) { var el = null; try { el = d.getElementById(decodeURIComponent(location.hash.slice(1))); } catch (x) {} if (el) { openIfDetails(el); w.setTimeout(function () { scrollToEl(el); }, 120); } } }
  w.addEventListener('hashchange', hashDetails);
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

  /* ---------- Proyectos: filtro por sector ---------- */
  (function filterInit() {
    var box = $('#filters'); if (!box) return;
    var works = $$('#works .work:not(.work-cta)'), btns = $$('.filter', box), live = $('#filterLive');
    function set(cat) {
      var n = 0;
      works.forEach(function (wk) { var ok = !cat || (wk.getAttribute('data-cat') || '').split(' ').indexOf(cat) !== -1; wk.hidden = !ok; if (ok) { n++; wk.classList.add('in'); } });
      btns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-filter') === (cat || ''))); });
      live.textContent = n + (n === 1 ? ' demo' : ' demos') + (cat ? ' en este sector' : '');
    }
    btns.forEach(function (b) { b.addEventListener('click', function () { set(b.getAttribute('data-filter')); }); });
    var m = /[?&]sector=(\w+)/.exec(location.search); if (m) set(m[1]);
  })();

  /* ---------- Formulario de contacto ---------- */
  (function formInit() {
    var f = $('#form'); if (!f) return;
    var st = $('#formStatus'), btn = $('#formSubmit'), boxes = { ok: $('#formOk'), pend: $('#formPend'), err: $('#formErr') };
    var rules = {
      nombre: function (v) { return v.trim().length >= 2; },
      email: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()); },
      tipo: function (v) { return !!v; },
      mensaje: function (v) { return v.trim().length >= 10; }
    };
    function mark(el, ok) {
      var wrap = el.closest('.field'); if (!wrap) return;
      wrap.classList.toggle('bad', !ok); el.setAttribute('aria-invalid', String(!ok));
      if (ok) el.removeAttribute('aria-invalid');
    }
    function check(name) { var el = f.elements[name]; if (!el) return true; var ok = rules[name](el.value); mark(el, ok); return ok; }
    function checkConsent() { var c = f.elements.consent, ok = c.checked, e = $('#e-consent'); $('#consentBox').classList.toggle('bad', !ok); e.style.display = ok ? 'none' : 'block'; c.setAttribute('aria-invalid', String(!ok)); if (ok) c.removeAttribute('aria-invalid'); return ok; }
    $('#e-consent').style.display = 'none';
    Object.keys(rules).forEach(function (n) {
      var el = f.elements[n];
      el.addEventListener('blur', function () { if (el.value) check(n); });
      el.addEventListener('input', function () { if (el.getAttribute('aria-invalid')) check(n); });
    });
    f.elements.consent.addEventListener('change', checkConsent);
    function show(which) {
      f.hidden = which !== null; Object.keys(boxes).forEach(function (k) { boxes[k].classList.toggle('show', k === which); });
      if (which) { boxes[which].focus({ preventScroll: true }); boxes[which].scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' }); }
    }
    function busy(on) { btn.disabled = on; btn.setAttribute('aria-disabled', String(on)); btn.innerHTML = on ? '<span class="spin" aria-hidden="true"></span><span class="lbl">Enviando...</span>' : '<span class="lbl">Enviar mensaje</span>'; }
    function payload() {
      return { nombre: f.nombre.value.trim(), email: f.email.value.trim(), negocio: f.negocio.value.trim(), tipo: f.tipo.value, presupuesto: f.presupuesto.value, quiereGuia: f.guia.checked, mensaje: f.mensaje.value.trim(), origen: location.href, consentimiento: true };
    }
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var bad = null;
      Object.keys(rules).forEach(function (n) { if (!check(n) && !bad) bad = f.elements[n]; });
      if (!checkConsent() && !bad) bad = f.elements.consent;
      if (bad) { st.className = 'form-status error'; st.textContent = 'Revisa los campos marcados para poder enviar.'; bad.focus(); return; }
      st.className = 'form-status'; st.textContent = '';
      var trap = f.elements[CFG.campoTrampa || 'empresa_web'];
      if (trap && trap.value) { show('ok'); return; } // robot: se simula el éxito y no se envía
      var data = payload(), mode = CFG.formModo || 'pendiente';
      if (mode === 'endpoint' && CFG.formEndpoint) {
        busy(true);
        var ctl = ('AbortController' in w) ? new AbortController() : null, timer = ctl ? w.setTimeout(function () { ctl.abort(); }, 15000) : 0;
        fetch(CFG.formEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(data), signal: ctl ? ctl.signal : undefined })
          .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); busy(false); f.reset(); show('ok'); })
          .catch(function () { busy(false); show('err'); })
          .then(function () { if (timer) w.clearTimeout(timer); });
      } else if (mode === 'mailto' && CFG.email) {
        var body = 'Nombre: ' + data.nombre + '\nCorreo: ' + data.email + '\nNegocio: ' + data.negocio + '\nTipo de web: ' + data.tipo + '\nPresupuesto: ' + data.presupuesto + '\n\n' + data.mensaje;
        w.location.href = 'mailto:' + CFG.email + '?subject=' + encodeURIComponent('Consulta web: ' + data.tipo) + '&body=' + encodeURIComponent(body);
        st.className = 'form-status ok'; st.textContent = 'Se ha abierto tu programa de correo con el mensaje listo. Pulsa enviar allí para terminar.';
      } else {
        show('pend');
      }
    });
    $('#formAgain').addEventListener('click', function () { show(null); f.reset(); f.elements.nombre.focus(); });
    $('#formBack').addEventListener('click', function () { show(null); f.elements.nombre.focus(); });
    $('#formRetry').addEventListener('click', function () { show(null); btn.focus(); });
  })();

  if (location.hash) w.setTimeout(hashDetails, 200);
  update();
})();
