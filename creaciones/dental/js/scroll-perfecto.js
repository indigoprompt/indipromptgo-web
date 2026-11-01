/* scroll-perfecto.js · Índigo Prompt Studio (skill .claude/skills/scroll-perfecto)
   Modelo "coche automático" (Richi, 10-oct-2026): el scroll es suave y continuo (Lenis sigue la rueda o el
   trackpad con inercia) y, cuando el gesto termina, el destino se corrige a la parada que toca y la página
   desacelera sola hasta quedarse justo donde se ve bien lo importante. No hay saltos: se cambia el destino
   de la misma inercia, nunca se arranca una animación nueva.
   - Parada elegida: la que mejor encaja con hasta dónde iba a llegar la inercia, siempre por delante de donde
     empezó el gesto (un toque corto lleva a la siguiente; un gesto largo se detiene en la más cercana).
   - Secciones más altas que la pantalla: zona libre, se recorren sin frenos y al salir de ellas se vuelve a frenar.
   - Teclado (flechas, espacio, Re Pág / Av Pág): parada a parada con la misma desaceleración.
   - Táctil: no intercepta el dedo; usa scroll-snap nativo del navegador (clases snap-s/snap-c/story-stop).
   - Movimiento reducido: no hace nada (scroll nativo).
   Uso: var sp = ScrollPerfecto.init({ lenis: lenis, zonas: function () { return [{a: y, b: y}, ...]; } });
        sp.refresh(); sp.go(y); sp.next(); sp.prev(); sp.destroy(); */
(function (w, d) {
  'use strict';
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var easeIO = function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  var now = function () { return w.performance ? w.performance.now() : Date.now(); };

  function maxScroll() { return Math.max(0, d.documentElement.scrollHeight - w.innerHeight); }

  /* Zonas a partir de secciones: las que caben se centran en el hueco bajo la cabecera; las altas son libres. */
  function zonasSecciones(els, opt) {
    opt = opt || {};
    var nav = opt.nav || 0, vh = w.innerHeight, sy = w.scrollY || w.pageYOffset, max = maxScroll(), zs = [];
    els.forEach(function (el) {
      if (!el || !el.getBoundingClientRect) return;
      // se mide el contenido real (del primer al último hijo), sin el relleno de la sección
      var hijos = Array.prototype.filter.call(el.children, function (c) { var cs = getComputedStyle(c); return cs.display !== 'none' && cs.position !== 'fixed' && c.getBoundingClientRect().height > 0; });
      if (!hijos.length) hijos = [el];
      var r0 = hijos[0].getBoundingClientRect(), r1 = hijos[hijos.length - 1].getBoundingClientRect();
      var top = r0.top + sy, h = r1.bottom - r0.top, hueco = vh - nav; if (h <= 0) return;
      if (h <= hueco - 24) { var t = top - nav - (hueco - h) / 2; zs.push({ a: t, b: t, el: el }); }
      else zs.push({ a: top - nav - 16, b: top + h - vh + 32, el: el });
    });
    zs.forEach(function (z) { z.a = clamp(Math.round(z.a), 0, max); z.b = clamp(Math.round(z.b), 0, max); if (z.b < z.a) z.b = z.a; });
    return zs;
  }

  function ordenar(zs) {
    var max = maxScroll();
    zs = zs.concat([{ a: 0, b: 0 }, { a: max, b: max }]).sort(function (x, y) { return x.a - y.a; });
    var out = [];
    zs.forEach(function (z) {
      var p = out[out.length - 1];
      if (p && z.a - p.b < 40) { p.b = Math.max(p.b, z.b); return; } // paradas casi iguales: una sola
      out.push({ a: z.a, b: z.b });
    });
    return out;
  }

  function init(opt) {
    opt = opt || {};
    var lenis = opt.lenis, api = { animating: false, enabled: true, destino: null, modelo: 'coche' };
    var zonas = [], silencio = opt.silencio || 140, LERP = opt.lerp || 0.085;
    var reduce = w.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !lenis) { api.enabled = false; api.refresh = function () {}; api.go = function (y) { w.scrollTo(0, y); }; api.next = api.prev = function () {}; api.destroy = function () {}; return api; }

    function y() { return lenis.animatedScroll != null ? lenis.animatedScroll : (w.scrollY || w.pageYOffset); }
    function objetivo() { return lenis.targetScroll != null ? lenis.targetScroll : y(); } // hasta dónde llegaría la inercia
    function refresh() { zonas = ordenar(opt.zonas ? opt.zonas() : []); api.zonas = zonas; }
    function enLibre(p) { // ¿cae dentro de una sección alta (zona libre)?
      for (var i = 0; i < zonas.length; i++) { var z = zonas[i]; if (z.b - z.a >= 8 && p > z.a + 4 && p < z.b - 4) return z; }
      return null;
    }
    function siguiente(dir, desde) { // primera parada por delante de "desde" en esa dirección
      var best = null;
      zonas.forEach(function (z) {
        var c = dir > 0 ? z.a : z.b;
        if (dir > 0 && c > desde + 4 && (best === null || c < best)) best = c;
        if (dir < 0 && c < desde - 4 && (best === null || c > best)) best = c;
      });
      return best;
    }
    function paradaParaInercia(dir, origen, proj) { // la parada por delante del origen que mejor encaja con la inercia
      var best = null, bd = Infinity;
      zonas.forEach(function (z) {
        var c = dir > 0 ? z.a : z.b;
        if (dir > 0 ? c > origen + 4 : c < origen - 4) { var dd = Math.abs(c - proj); if (dd < bd) { bd = dd; best = c; } }
      });
      return best;
    }
    var vigila = 0;
    function irA(t, k) { // corrige el destino con la misma inercia (lerp), sin cortar el movimiento
      t = clamp(Math.round(t), 0, maxScroll());
      if (Math.abs(t - y()) < 1 && Math.abs(t - objetivo()) < 1) return;
      api.animating = true; api.destino = t;
      w.clearTimeout(vigila); vigila = w.setTimeout(function () { api.animating = false; }, 3000); // red de seguridad: nunca deja la página "ocupada"
      lenis.scrollTo(t, { lerp: k || LERP, force: true, onComplete: function () { api.animating = false; w.clearTimeout(vigila); if (opt.onParada) opt.onParada(t); } });
      if (opt.onSalto) opt.onSalto(t);
    }

    // ---- Rueda y trackpad: Lenis se encarga del movimiento; aquí solo se decide dónde frenar ----
    var g = null, timer = 0; // gesto en curso
    function frenar() {
      if (!g || g.frenando) return;
      g.frenando = true;
      var proj = objetivo();
      if (enLibre(proj)) return; // en una sección alta la inercia se queda donde pare
      var best = paradaParaInercia(g.dir, g.origen, proj);
      if (best === null) return;
      irA(best);
    }
    api.handle = function (data) {
      var e = data.event;
      if (!api.enabled || !e || e.type.indexOf('wheel') === -1 || e.ctrlKey) return true;
      if (Math.abs(data.deltaY) < Math.abs(data.deltaX)) return true; // gesto horizontal: carruseles
      var tg = e.target;
      if (tg && tg.closest && tg.closest('[data-lenis-prevent],[data-lenis-prevent-wheel],[data-scroll-libre]')) return true;
      if (lenis.isStopped) return true;
      // hora de entrada del evento (no de procesado): si el hilo se para un instante, las muescas de un mismo
      // gesto siguen contando como uno y no se convierten en dos paradas
      var t = (e.timeStamp && e.timeStamp > 0) ? e.timeStamp : now(), dir = data.deltaY > 0 ? 1 : -1, m = Math.abs(data.deltaY);
      var nuevo = !g || (t - g.lastT > silencio) || dir !== g.dir || (g.frenando && m > g.maxMag * 0.6 + 4);
      if (nuevo) {
        // si se empuja mientras aún desacelera hacia una parada, el nuevo gesto parte de esa parada
        var origen = (api.animating && api.destino != null) ? api.destino : y();
        g = { origen: origen, dir: dir, lastT: t, maxMag: m, lastMag: m, baj: 0, n: 0, frenando: false };
      }
      g.lastT = t; g.n++;
      if (m < g.lastMag) g.baj++; else g.baj = 0;
      g.lastMag = m; if (m > g.maxMag) g.maxMag = m;
      if (g.frenando) { if (e.cancelable) e.preventDefault(); return false; } // cola de inercia del trackpad: ya estamos frenando
      w.clearTimeout(timer);
      // trackpad: cuando los impulsos llevan un rato bajando ya es inercia del propio trackpad; se frena ya
      if (g.n >= 6 && g.baj >= 3 && m <= Math.max(6, g.maxMag * 0.35)) { frenar(); if (e.cancelable) e.preventDefault(); return false; }
      timer = w.setTimeout(frenar, silencio); // ratón o fin del gesto: en cuanto hay silencio se decide la parada
      return true; // Lenis mueve la página con su inercia normal
    };

    // ---- Teclado: flechas, espacio, Re Pág / Av Pág ----
    function onKey(e) {
      if (!api.enabled || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      var t = e.target, tag = (t && t.tagName) || '';
      if (/INPUT|TEXTAREA|SELECT/.test(tag) || (t && t.isContentEditable)) return;
      if (d.body.classList.contains('locked') || lenis.isStopped) return;
      if (t && t.closest && t.closest('[data-lenis-prevent],[data-scroll-libre],.crea-view')) return;
      var k = e.key, dir = 0, flecha = false;
      if (k === 'ArrowDown') { dir = 1; flecha = true; } else if (k === 'ArrowUp') { dir = -1; flecha = true; }
      else if (k === 'PageDown') dir = 1; else if (k === 'PageUp') dir = -1;
      else if (k === ' ' || k === 'Spacebar') { if (/BUTTON|A|SUMMARY/.test(tag)) return; dir = e.shiftKey ? -1 : 1; }
      if (!dir) return;
      e.preventDefault();
      var desde = (api.animating && api.destino != null) ? api.destino : y();
      var z = enLibre(desde);
      if (z && !(api.animating)) { // dentro de una sección alta: avanzar dentro de ella
        var paso = dir * (flecha ? 140 : w.innerHeight * 0.8), tt = clamp(desde + paso, z.a, z.b);
        if (Math.abs(tt - desde) > 2) { irA(tt, 0.11); return; }
      }
      var obj = siguiente(dir, desde); if (obj !== null) irA(obj);
    }
    d.addEventListener('keydown', onKey);

    var rto = 0;
    function onResize() { w.clearTimeout(rto); rto = w.setTimeout(refresh, 160); }
    w.addEventListener('resize', onResize, { passive: true });
    w.addEventListener('load', refresh);
    var ro = ('ResizeObserver' in w) ? new ResizeObserver(onResize) : null; if (ro) ro.observe(d.body);
    refresh();

    api.refresh = refresh; api.go = function (t) { irA(t); };
    api.estado = function () { return { y: Math.round(y()), objetivo: Math.round(objetivo()), destino: api.destino, animating: api.animating, gesto: g && { origen: Math.round(g.origen), dir: g.dir, n: g.n, frenando: g.frenando, maxMag: g.maxMag } }; }; // para pruebas
    api.next = function () { var o = siguiente(1, y()); if (o !== null) irA(o); }; api.prev = function () { var o = siguiente(-1, y()); if (o !== null) irA(o); };
    api.destroy = function () { api.enabled = false; w.clearTimeout(timer); d.removeEventListener('keydown', onKey); w.removeEventListener('resize', onResize); if (ro) ro.disconnect(); };
    return api;
  }

  /* Táctil: paradas con scroll-snap nativo (el navegador respeta la inercia del dedo y nunca bloquea). */
  function tactil(els, opt) {
    opt = opt || {};
    var root = d.documentElement, vh = w.innerHeight, nav = opt.nav || 0;
    root.classList.add('snap'); if (opt.fuerte) root.classList.add('snap-fuerte');
    // Con paradas obligatorias, un deslizamiento corto devolvería a la misma parada: si el dedo se movió con
    // intención (>48 px) y la página no cambió de parada, se completa el gesto hacia la siguiente.
    if (opt.fuerte && !root.__spTouch) {
      root.__spTouch = true;
      var y0 = 0, s0 = 0, dedo = 0;
      d.addEventListener('touchstart', function (e) { if (e.touches.length !== 1) return; y0 = e.touches[0].clientY; s0 = w.scrollY; dedo = 0; }, { passive: true });
      d.addEventListener('touchmove', function (e) { if (e.touches.length === 1) dedo = y0 - e.touches[0].clientY; }, { passive: true });
      d.addEventListener('touchend', function (e) {
        var dir = dedo > 48 ? 1 : dedo < -48 ? -1 : 0; if (!dir) return;
        if (e.target && e.target.closest && e.target.closest('.crea-view,[data-scroll-libre],.overlay')) return;
        var t0 = now(), ultimo = -1;
        (function mirar() {
          var y = w.scrollY;
          if (y !== ultimo && now() - t0 < 900) { ultimo = y; return w.setTimeout(mirar, 120); }
          if (Math.abs(y - s0) < 24 && !d.body.classList.contains('locked')) w.scrollBy({ top: dir * w.innerHeight * 0.45, behavior: 'smooth' });
        })();
      }, { passive: true });
    }
    els.forEach(function (el) {
      var box = (opt.contenido && el.querySelector(opt.contenido)) || el, h = el.getBoundingClientRect().height - (parseFloat(getComputedStyle(el).paddingTop) || 0);
      var cl = h <= vh - nav - 24 ? 'snap-c' : 'snap-s', otra = cl === 'snap-c' ? 'snap-s' : 'snap-c';
      if (!box.classList.contains(cl)) { box.classList.remove(otra); box.classList.add(cl); } // sin tocar lo que no cambia (evita saltos)
    });
  }

  w.ScrollPerfecto = { init: init, zonasSecciones: zonasSecciones, tactil: tactil, easeIO: easeIO };
})(window, document);
