/* v3.js · NÁCAR Dental · estándar v3 de Índigo Prompt Studio
   - Scroll "coche automático": Lenis + scroll-perfecto.js (copias sin tocar de web-v3). Paradas en la portada y en el
     contenido de cada sección. Táctil: no se intercepta el dedo, scroll-snap nativo.
   - Anclas por Lenis (caen en la parada de la sección), dock de WhatsApp/Instagram al bajar, botón atrás y recarga a la
     misma altura.
   Con "reducir movimiento": scroll nativo, sin paradas. Los efectos propios de la web (molar flotando, implante que
   se une, cristal, vídeos de fondo, grano, halo, tarjetas con foco de luz, botones magnéticos) no se tocan. */
(function (w, d) {
  'use strict';
  var body = d.body;
  var qsa = function (s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); };
  var reduce = w.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var tactil = w.matchMedia('(hover: none) and (pointer: coarse)').matches;
  var lenis = null, sp = null;
  var SEC_PC = 'main > section:not(.hero) > .wrap, footer';
  var SEC_TACTIL = '#inicio, main > section:not(.hero), footer';

  // la portada es una sola pantalla con piezas sueltas (palabra gigante, molar): su parada es el inicio
  function zonas() { return w.ScrollPerfecto ? [{ a: 0, b: 0 }].concat(w.ScrollPerfecto.zonasSecciones(qsa(SEC_PC), { nav: 0 })) : []; }

  if (!reduce && !tactil && w.Lenis && w.ScrollPerfecto) {
    try {
      lenis = new w.Lenis({ lerp: 0.1, smoothWheel: true, anchors: false, autoRaf: false, virtualScroll: function (data) { return sp ? sp.handle(data) : true; } });
      var rafL = function (t) { lenis.raf(t); w.requestAnimationFrame(rafL); };
      w.requestAnimationFrame(rafL);
      sp = w.ScrollPerfecto.init({ lenis: lenis, zonas: zonas });
      w.__dentalSP = sp;
    } catch (e) { lenis = null; sp = null; }
  }

  // Táctil: snap nativo por secciones (se recoloca al cargar y al girar; los marcadores no se recrean)
  function prepTactil() { if (tactil && !reduce && w.ScrollPerfecto) w.ScrollPerfecto.tactil(qsa(SEC_TACTIL), { nav: 0 }); }
  prepTactil(); w.addEventListener('load', prepTactil); w.addEventListener('resize', prepTactil, { passive: true });

  /* ---------- Anclas: caen en la parada de la sección ---------- */
  d.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]'); if (!a || a.getAttribute('href') === '#') return;
    var el = d.getElementById(a.getAttribute('href').slice(1)); if (!el) return;
    e.preventDefault();
    var y;
    if (el.id === 'inicio') y = 0;
    else { var z = w.ScrollPerfecto ? w.ScrollPerfecto.zonasSecciones([el.querySelector(':scope > .wrap') || el], { nav: 0 })[0] : null; y = z ? z.a : el.getBoundingClientRect().top + (w.scrollY || w.pageYOffset); }
    if (lenis) lenis.scrollTo(y, { duration: 1.2, easing: w.ScrollPerfecto.easeIO }); else w.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
    if (a.classList.contains('skip')) el.focus({ preventScroll: true });
  });

  /* ---------- Dock de contacto: aparece al bajar ---------- */
  var tick = false;
  function update() { tick = false; body.classList.toggle('dock-on', (w.scrollY || w.pageYOffset) > 60); }
  w.addEventListener('scroll', function () { if (!tick) { tick = true; w.requestAnimationFrame(update); } }, { passive: true });

  /* ---------- Botón atrás y recarga: misma altura ---------- */
  (function restaurar() {
    var KEY = 'nacar-y';
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
  update();
})(window, document);
