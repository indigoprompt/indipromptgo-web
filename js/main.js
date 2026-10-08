/* Índigo Prompt Studio · web v3 · JS propio, sin librerías */
(function(){
  'use strict';
  var d = document, w = window, root = d.documentElement;
  root.classList.add('js');
  var reduce = w.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = w.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var $ = function(s, c){ return (c || d).querySelector(s); };
  var $$ = function(s, c){ return Array.prototype.slice.call((c || d).querySelectorAll(s)); };
  var clamp = function(v, a, b){ return Math.min(b, Math.max(a, v)); };
  var WA = 'https://wa.me/34621206210?text=';

  /* ---------- Bucle de scroll único ---------- */
  var nav = $('#nav'), fab = $('.fab-wa'), hero = $('#inicio'), heroInner = $('.hero-inner');
  var scrolly = $('#scroll-3d'), process = $('#process');
  var steps = process ? $$('.step', process) : [];
  var miniSteps = $$('.steps-mini li');
  var ticking = false, vh = w.innerHeight;
  var seq = { draw: null, p: 0 };

  function onScroll(){
    if(!ticking){ ticking = true; w.requestAnimationFrame(update); }
  }
  function update(){
    ticking = false;
    var y = w.scrollY || w.pageYOffset;
    nav.classList.toggle('stuck', y > 30);
    var hh = hero.offsetHeight;
    fab.classList.toggle('show', y > hh * 0.7);
    if(!reduce){
      var hp = clamp(y / (hh * 0.85), 0, 1);
      heroInner.style.setProperty('--hp', hp.toFixed(3));
      gl.p = hp;
    }
    // Escena de la pulsera
    if(scrolly){
      var r = scrolly.getBoundingClientRect();
      var total = scrolly.offsetHeight - vh;
      var sp = total > 0 ? clamp(-r.top / total, 0, 1) : 0;
      seq.p = sp;
      if(seq.draw) seq.draw(sp);
      var idx = sp < 0.34 ? 0 : sp < 0.67 ? 1 : 2;
      for(var i = 0; i < miniSteps.length; i++) miniSteps[i].classList.toggle('on', reduce || i === idx);
      var pct = $('#seqPct'); if(pct) pct.textContent = ('00' + Math.round(sp * 360)).slice(-3);
    }
    // Línea del proceso
    if(process){
      var pr = process.getBoundingClientRect();
      var pp = clamp((vh * 0.75 - pr.top) / (pr.height + vh * 0.2), 0, 1);
      process.style.setProperty('--pp', pp.toFixed(3));
      for(var j = 0; j < steps.length; j++) steps[j].classList.toggle('on', pp >= (j + 0.35) / steps.length);
    }
  }
  w.addEventListener('scroll', onScroll, { passive: true });
  w.addEventListener('resize', function(){ vh = w.innerHeight; onScroll(); }, { passive: true });

  /* ---------- Entradas al hacer scroll ---------- */
  if(!reduce && 'IntersectionObserver' in w){
    var targets = $$('.sec-head, .work, .cat, .tile, .step, .price-card, .faq details, .contact, .foot-grid');
    targets.forEach(function(el, i){ el.classList.add('reveal'); el.style.transitionDelay = ((i % 3) * 0.08) + 's'; });
    var io = new IntersectionObserver(function(es){
      es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    targets.forEach(function(el){ io.observe(el); });
  }

  /* ---------- Portada WebGL: objeto holográfico por raymarching ---------- */
  var gl = { p: 0 };
  (function heroGL(){
    var cv = $('#gl');
    if(!cv || reduce){ root.classList.add('no-gl'); return; }
    var ctx = null;
    try{ ctx = cv.getContext('webgl', { antialias: false, alpha: false, depth: false, powerPreference: 'high-performance', preserveDrawingBuffer: false }); }catch(e){}
    if(!ctx){ root.classList.add('no-gl'); return; }
    var small = w.innerWidth < 760;
    var STEPS = small ? 40 : 56;
    var vs = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
    var fs = [
      'precision mediump float;',
      'uniform vec2 R;uniform float T;uniform float P;uniform vec2 M;uniform float O;',
      'mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}',
      'float box(vec3 p,vec3 b,float r){vec3 q=abs(p)-b;return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.)-r;}',
      'float tor(vec3 p,vec2 t){vec2 q=vec2(length(p.xz)-t.x,p.y);return length(q)-t.y;}',
      'vec3 tf(vec3 p){',
      ' p.xz*=rot(T*.22+P*2.6+M.x*.6);p.yz*=rot(.5+T*.13+M.y*.5+P*1.2);',
      ' p.xz*=rot(p.y*(.45+P*1.4));return p;}',
      'float map(vec3 p){p=tf(p);',
      ' float b=box(p,vec3(.52),.16);',
      ' float t=tor(p,vec2(.72,.22+.03*sin(T)));',
      ' return mix(b,t,smoothstep(.05,.9,P));}',
      'vec3 nor(vec3 p){vec2 e=vec2(.002,-.002);',
      ' return normalize(e.xyy*map(p+e.xyy)+e.yyx*map(p+e.yyx)+e.yxy*map(p+e.yxy)+e.xxx*map(p+e.xxx));}',
      'void main(){',
      ' vec2 uv=(gl_FragCoord.xy-.5*R)/R.y;',
      ' vec2 bu=uv;',
      ' uv.x-=O;uv.y-=(R.x<R.y?.2:0.);',
      // fondo: degradado y aurora suave
      ' float g=exp(-3.2*length(uv*vec2(.8,1.)));',
      ' float au=.5+.5*sin(bu.x*2.2+T*.25+sin(bu.y*3.1-T*.2)*1.4);',
      ' vec3 col=vec3(0.)+vec3(0.,.12,.55)*g*.9+vec3(0.,.05,.25)*au*smoothstep(1.2,-.4,bu.y+.2)*.55;',
      ' vec3 ro=vec3(0.,0.,(R.x<R.y?7.4:6.2)),rd=normalize(vec3(uv,-1.75));',
      ' float t=0.,dm=9.;bool hit=false;',
      ' for(int i=0;i<' + STEPS + ';i++){vec3 p=ro+rd*t;float h=map(p);dm=min(dm,h);if(h<.002){hit=true;break;}t+=h*.9;if(t>10.)break;}',
      ' col+=vec3(.15,.35,1.)*.18/(1.+dm*dm*40.);',
      ' if(hit){vec3 p=ro+rd*t;vec3 n=nor(p);vec3 q=tf(p);',
      '  float fr=pow(1.-max(dot(n,-rd),0.),2.4);',
      '  vec3 l=normalize(vec3(.6,.8,.6));float df=max(dot(n,l),0.);',
      '  float sp=pow(max(dot(reflect(rd,n),l),0.),40.);',
      '  float ir=.5+.5*sin(dot(n,vec3(3.,2.,4.))+T*.6+q.y*4.);',
      '  vec3 base=mix(vec3(0.,.03,.16),vec3(0.,.16,.7),df*.7);',
      '  vec3 rim=mix(vec3(0.,.28,1.),vec3(.48,.64,1.),ir);',
      '  vec3 gq=abs(fract(q*6.)-.5);float grid=smoothstep(.47,.5,max(gq.x,max(gq.y,gq.z)));',
      '  float scan=smoothstep(.0,.04,abs(fract(q.y*1.6-T*.35)-.5)-.44);',
      '  col=base+rim*fr*1.25+vec3(.75,.85,1.)*sp*.9+vec3(.3,.5,1.)*grid*(.25+fr*.5)+vec3(.4,.6,1.)*scan*.35;',
      ' }',
      ' col*=1.-.25*dot(bu*.6,bu*.6);',
      ' col=pow(col,vec3(.95));',
      ' gl_FragColor=vec4(col,1.);}'
    ].join('\n');
    function sh(type, src){ var s = ctx.createShader(type); ctx.shaderSource(s, src); ctx.compileShader(s); if(!ctx.getShaderParameter(s, ctx.COMPILE_STATUS)){ throw new Error(ctx.getShaderInfoLog(s)); } return s; }
    var prog;
    try{
      prog = ctx.createProgram();
      ctx.attachShader(prog, sh(ctx.VERTEX_SHADER, vs)); ctx.attachShader(prog, sh(ctx.FRAGMENT_SHADER, fs));
      ctx.linkProgram(prog);
      if(!ctx.getProgramParameter(prog, ctx.LINK_STATUS)) throw new Error('link');
    }catch(e){ root.classList.add('no-gl'); return; }
    ctx.useProgram(prog);
    var buf = ctx.createBuffer(); ctx.bindBuffer(ctx.ARRAY_BUFFER, buf);
    ctx.bufferData(ctx.ARRAY_BUFFER, new Float32Array([-1,-1,3,-1,-1,3]), ctx.STATIC_DRAW);
    var loc = ctx.getAttribLocation(prog, 'a'); ctx.enableVertexAttribArray(loc); ctx.vertexAttribPointer(loc, 2, ctx.FLOAT, false, 0, 0);
    var U = { R: ctx.getUniformLocation(prog, 'R'), T: ctx.getUniformLocation(prog, 'T'), P: ctx.getUniformLocation(prog, 'P'), M: ctx.getUniformLocation(prog, 'M'), O: ctx.getUniformLocation(prog, 'O') };

    var scale = small ? 0.5 : 0.62, minScale = 0.3;
    var dpr = Math.min(w.devicePixelRatio || 1, 1.5);
    function size(){
      small = w.innerWidth < 760;
      var cw = cv.clientWidth || w.innerWidth, ch = cv.clientHeight || w.innerHeight;
      var px = cw * ch * dpr * dpr * scale * scale, cap = small ? 260000 : 700000, k = px > cap ? Math.sqrt(cap / px) : 1;
      cv.width = Math.max(2, Math.round(cw * dpr * scale * k));
      cv.height = Math.max(2, Math.round(ch * dpr * scale * k));
      ctx.viewport(0, 0, cv.width, cv.height);
      ctx.uniform2f(U.R, cv.width, cv.height);
      var aspect = cw / ch;
      ctx.uniform1f(U.O, aspect > 1.1 ? Math.min(aspect * 0.34, 0.66) : 0.0);
    }
    size();
    w.addEventListener('resize', size, { passive: true });

    var mx = 0, my = 0, tmx = 0, tmy = 0, ps = 0;
    if(fine){ w.addEventListener('pointermove', function(e){ tmx = e.clientX / w.innerWidth - 0.5; tmy = e.clientY / w.innerHeight - 0.5; }, { passive: true }); }
    var visible = true, running = false, t0 = performance.now(), last = t0, acc = 0, n = 0, raf = 0;
    function frame(now){
      raf = 0;
      if(!visible || d.hidden){ running = false; return; }
      raf = w.requestAnimationFrame(frame);
      var dt = now - last; last = now;
      if(dt < 250){ acc += dt; n++; }
      if(n >= 60){ var avg = acc / n; acc = 0; n = 0; if(avg > 21 && scale > minScale){ scale = Math.max(minScale, scale * 0.82); size(); } }
      mx += (tmx - mx) * 0.05; my += (tmy - my) * 0.05; ps += (gl.p - ps) * 0.08;
      ctx.uniform1f(U.T, (now - t0) / 1000);
      ctx.uniform1f(U.P, ps);
      ctx.uniform2f(U.M, mx, my);
      ctx.drawArrays(ctx.TRIANGLES, 0, 3);
    }
    function start(){ if(!running && visible && !d.hidden){ running = true; last = performance.now(); raf = w.requestAnimationFrame(frame); } }
    if('IntersectionObserver' in w){
      new IntersectionObserver(function(es){ visible = es[0].isIntersecting; if(visible) start(); }, { threshold: 0 }).observe(hero);
    }
    d.addEventListener('visibilitychange', start);
    cv.addEventListener('webglcontextlost', function(e){ e.preventDefault(); visible = false; root.classList.add('no-gl'); });
    start();
    w.requestAnimationFrame(function(){ cv.classList.add('on'); });
  })();

  /* ---------- Secuencia 3D de la pulsera (fotogramas WebP) ---------- */
  (function seqInit(){
    var cv = $('#seq');
    if(!cv) return;
    var c2 = cv.getContext('2d');
    var TOTAL = 74, stepN = w.innerWidth < 760 ? 2 : 1;
    var frames = [], loaded = 0, started = false, cur = -1;
    function src(i){ return 'assets/seq/' + ('00' + i).slice(-3) + '.webp'; }
    function nearest(i){
      for(var k = 0; k < TOTAL; k++){
        var a = i - k, b = i + k;
        if(a >= 0 && frames[a] && frames[a].complete && frames[a].naturalWidth) return frames[a];
        if(b < TOTAL && frames[b] && frames[b].complete && frames[b].naturalWidth) return frames[b];
      }
      return null;
    }
    function draw(p){
      var i = Math.round(p * (TOTAL - 1));
      if(i === cur && frames[i]) return;
      var img = nearest(i);
      if(!img) return;
      cur = i;
      c2.clearRect(0, 0, cv.width, cv.height);
      c2.drawImage(img, 0, 0, cv.width, cv.height);
    }
    function load(){
      if(started) return; started = true;
      var order = [];
      for(var i = 0; i < TOTAL; i += stepN) order.push(i);
      if(order[order.length - 1] !== TOTAL - 1) order.push(TOTAL - 1);
      order.forEach(function(i, k){
        var im = new Image(); im.decoding = 'async';
        im.onload = function(){ loaded++; if(k === 0 || loaded % 6 === 0){ cur = -1; draw(seq.p); } };
        im.src = src(i); frames[i] = im;
      });
      seq.draw = draw;
    }
    if(reduce){ var im0 = new Image(); im0.onload = function(){ c2.drawImage(im0, 0, 0, cv.width, cv.height); }; im0.src = src(18); return; }
    if('IntersectionObserver' in w){
      var o = new IntersectionObserver(function(es){ if(es[0].isIntersecting){ load(); o.disconnect(); } }, { rootMargin: '900px 0px' });
      o.observe(scrolly);
    } else { load(); }
  })();

  /* ---------- Tarjetas de trabajos: inclinación y foco de luz ---------- */
  if(fine && !reduce){
    $$('.work').forEach(function(card){
      var rect = null;
      card.addEventListener('pointerenter', function(){ rect = card.getBoundingClientRect(); });
      card.addEventListener('pointermove', function(e){
        if(!rect) rect = card.getBoundingClientRect();
        var x = (e.clientX - rect.left) / rect.width, y = (e.clientY - rect.top) / rect.height;
        card.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
        card.style.setProperty('--my', (y * 100).toFixed(1) + '%');
        card.style.setProperty('--ry', ((x - 0.5) * 5).toFixed(2) + 'deg');
        card.style.setProperty('--rx', ((0.5 - y) * 4).toFixed(2) + 'deg');
      });
      card.addEventListener('pointerleave', function(){ rect = null; card.style.setProperty('--rx', '0deg'); card.style.setProperty('--ry', '0deg'); });
    });
  }

  /* ---------- Filtro por tipo de web ---------- */
  var works = $$('#works .work'), note = $('#filterNote'), noteLabel = $('#filterLabel');
  function setFilter(cat, label){
    works.forEach(function(wk){
      var cats = (wk.getAttribute('data-cat') || '').split(' ');
      var empty = wk.classList.contains('work-empty');
      wk.hidden = cat ? cats.indexOf(cat) === -1 : empty;
      wk.classList.toggle('work-wide', !cat && wk === works[0]);
      if(!wk.hidden) wk.classList.add('in');
    });
    $$('.cat').forEach(function(b){ b.setAttribute('aria-pressed', String(b.getAttribute('data-filter') === cat)); });
    if(cat){ note.hidden = false; noteLabel.textContent = 'Mostrando: ' + label; } else { note.hidden = true; }
  }
  $$('.cat').forEach(function(b){
    b.setAttribute('aria-pressed', 'false');
    b.setAttribute('aria-label', b.querySelector('h3').textContent + ': ' + parseInt(b.querySelector('.cat-count').textContent, 10) + ' demos. Ver en trabajos');
    b.addEventListener('click', function(){
      setFilter(b.getAttribute('data-filter'), b.querySelector('h3').textContent);
      $('#trabajos').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    });
  });
  $('#filterClear').addEventListener('click', function(){ setFilter(null); });

  /* ---------- Capas: menú, búsqueda, vídeo, visor ---------- */
  var lastFocus = null, openEl = null;
  function focusables(el){ return $$('a[href], button:not([disabled]), input, select, textarea, video[controls], [tabindex]:not([tabindex="-1"])', el).filter(function(x){ return x.offsetParent !== null || x === d.activeElement; }); }
  function openLayer(el, first){
    if(openEl) closeLayer();
    lastFocus = d.activeElement; openEl = el;
    el.hidden = false; d.body.classList.add('locked');
    if(el.id === 'menu') $('#btnMenu').setAttribute('aria-expanded', 'true');
    var f = first || focusables(el)[0]; if(f) setTimeout(function(){ f.focus(); }, 30);
  }
  function closeLayer(){
    if(!openEl) return;
    var el = openEl; openEl = null;
    el.hidden = true; d.body.classList.remove('locked');
    if(el.id === 'menu') $('#btnMenu').setAttribute('aria-expanded', 'false');
    if(el.id === 'videoModal'){ var v = $('#vid'); try{ v.pause(); }catch(e){} }
    if(lastFocus && lastFocus.focus) lastFocus.focus();
  }
  $$('.overlay').forEach(function(el){
    el.addEventListener('click', function(e){ if(e.target.closest('[data-close]')) closeLayer(); });
  });
  d.addEventListener('keydown', function(e){
    if(e.key === 'Escape' && openEl){ e.preventDefault(); closeLayer(); return; }
    if(e.key === 'Tab' && openEl){
      var f = focusables(openEl); if(!f.length) return;
      var a = f[0], z = f[f.length - 1];
      if(e.shiftKey && d.activeElement === a){ e.preventDefault(); z.focus(); }
      else if(!e.shiftKey && d.activeElement === z){ e.preventDefault(); a.focus(); }
    }
    if((e.key === '/' || (e.key.toLowerCase() === 'k' && (e.ctrlKey || e.metaKey))) && !openEl && !/input|textarea|select/i.test(d.activeElement.tagName)){ e.preventDefault(); openSearch(); }
  });
  // Menú: cerrar al elegir enlace
  $('#btnMenu').addEventListener('click', function(){ openLayer($('#menu')); });
  $$('#menu a[href^="#"]').forEach(function(a){ a.addEventListener('click', function(){ closeLayer(); }); });

  // Vídeo (se carga solo al abrirlo)
  $('#btnVideo').addEventListener('click', function(){
    var v = $('#vid'), s = v.querySelector('source');
    if(s && !s.getAttribute('src')){ s.setAttribute('src', s.getAttribute('data-src')); v.load(); }
    openLayer($('#videoModal'), v);
    var pr = v.play(); if(pr && pr.catch) pr.catch(function(){});
  });

  // Visor de trabajos
  var DATA = {
    virion: { img: 'virion', app: '', cat: 'Tienda de joyería', title: 'Virion', text: 'Demo de tienda online de joyería con la pieza en 3D que gira al hacer scroll, fichas de producto y diseño oscuro y elegante.', live: 'https://indigoprompt.github.io/virion-demo/' },
    dental: { img: 'dental', app: 'app-dental', cat: 'Clínica dental', title: 'NÁCAR Dental', text: 'Demo de web para clínica dental: tratamientos explicados con claridad, imagen luminosa y versión app para el móvil.' },
    boxeo: { img: 'boxeo', app: 'app-boxeo', cat: 'Gimnasio de boxeo', title: 'FM Boxing', text: 'Demo de web para entrenador de boxeo: imagen con fuerza, programas, tarifas y reserva desde el móvil.' },
    inmo: { img: 'inmo', app: 'app-inmo', cat: 'Inmobiliaria', title: 'AURA Estates', text: 'Demo de web para inmobiliaria: vídeo a pantalla completa, buscador por zona y tipo, y fichas de inmuebles.' },
    ropa: { img: 'ropa', app: 'app-ropa', cat: 'Moda', title: 'ATELIER NORTE', text: 'Demo de tienda de ropa online: catálogo, fichas de producto y cesta, con versión app para el móvil.' }
  };
  $$('[data-open]').forEach(function(b){
    b.addEventListener('click', function(){
      var k = b.getAttribute('data-open'), it = DATA[k]; if(!it) return;
      var im = $('#viewerImg');
      im.src = 'assets/img/' + it.img + '-1200.webp';
      im.alt = 'Captura de la demo ' + it.title + ' (' + it.cat.toLowerCase() + ')';
      var ap = $('#viewerApp');
      if(it.app){ ap.src = 'assets/img/' + it.app + '.webp'; ap.alt = 'Versión móvil de la demo ' + it.title; ap.classList.remove('none'); } else { ap.classList.add('none'); ap.alt = ''; }
      $('#viewerCat').textContent = it.cat;
      $('#viewerTitle').textContent = it.title;
      $('#viewerText').textContent = it.text;
      $('#viewerWa').href = WA + encodeURIComponent('Hola, he visto la demo de ' + it.title + ' y quiero una web así para mi negocio');
      var live = $('#viewerLive');
      if(it.live){ live.href = it.live; live.hidden = false; } else { live.hidden = true; }
      openLayer($('#viewer'));
    });
  });

  // Búsqueda local
  var INDEX = [
    ['Trabajos: demos de webs', '#trabajos', 'Sección', 'trabajos proyectos portfolio demos ejemplos'],
    ['Virion · tienda de joyería', '#trabajos', 'Demo', 'joyas joyeria pulsera tienda online ecommerce 3d virion'],
    ['NÁCAR Dental · clínica dental', '#trabajos', 'Demo', 'dentista clinica salud dental nacar'],
    ['FM Boxing · gimnasio de boxeo', '#trabajos', 'Demo', 'gimnasio boxeo deporte entrenador fitness'],
    ['AURA Estates · inmobiliaria', '#trabajos', 'Demo', 'inmobiliaria pisos casas villas aura'],
    ['ATELIER NORTE · tienda de moda', '#trabajos', 'Demo', 'moda ropa tienda online marca atelier'],
    ['Producto en 3D con scroll', '#scroll-3d', 'Demo', '3d producto animacion scroll joyeria'],
    ['Tipos de web', '#tipos', 'Sección', 'categorias sectores tipos negocio'],
    ['Restaurante y local', '#tipos', 'Tipo', 'restaurante bar cafeteria local carta reservas'],
    ['Proceso: de la idea a la web', '#proceso', 'Sección', 'proceso pasos como trabajamos plazo'],
    ['Qué incluye', '#incluye', 'Sección', 'incluye diseño movil velocidad seo textos formulario'],
    ['Precio: desde 1.000 € + IVA', '#precio', 'Sección', 'precio cuanto cuesta presupuesto tarifa euros'],
    ['¿Qué necesito para empezar?', '#faq', 'Pregunta', 'empezar necesito logo fotos'],
    ['¿Cuánto tarda una web?', '#faq', 'Pregunta', 'plazo tarda tiempo'],
    ['¿Qué pasa con el dominio y el alojamiento?', '#faq', 'Pregunta', 'dominio alojamiento hosting'],
    ['¿Hacéis mantenimiento?', '#faq', 'Pregunta', 'mantenimiento actualizaciones'],
    ['¿La web incluye SEO?', '#faq', 'Pregunta', 'seo google posicionamiento'],
    ['¿Puedo pedir cambios?', '#faq', 'Pregunta', 'cambios revisiones'],
    ['Contacto y demo gratis', '#contacto', 'Sección', 'contacto whatsapp demo gratis formulario'],
    ['Instagram @indigoprompt', 'https://www.instagram.com/indigoprompt/', 'Enlace', 'instagram redes']
  ];
  var q = $('#q'), results = $('#results');
  function norm(s){ return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function render(){
    var v = norm(q.value.trim());
    var list = INDEX.filter(function(r){ return !v || norm(r[0] + ' ' + r[3]).indexOf(v) !== -1; });
    results.innerHTML = '';
    if(!list.length){ var li = d.createElement('li'); li.className = 'empty'; li.textContent = 'Sin resultados. Prueba con «tienda», «precio» o «dominio».'; results.appendChild(li); return; }
    list.forEach(function(r){
      var li = d.createElement('li'), a = d.createElement('a');
      a.href = r[1]; a.setAttribute('role', 'option');
      if(r[1].indexOf('http') === 0){ a.target = '_blank'; a.rel = 'noopener'; }
      var t = d.createElement('span'); t.textContent = r[0];
      var m = d.createElement('span'); m.className = 'mono'; m.textContent = r[2];
      a.appendChild(t); a.appendChild(m); li.appendChild(a); results.appendChild(li);
      a.addEventListener('click', function(){
        closeLayer();
        if(r[2] === 'Pregunta'){ $$('.faq details').forEach(function(dt){ if(dt.querySelector('h3').textContent === r[0]) dt.open = true; }); }
      });
    });
  }
  function openSearch(){ q.value = ''; render(); openLayer($('#search'), q); }
  $('#btnSearch').addEventListener('click', openSearch);
  q.addEventListener('input', render);
  q.addEventListener('keydown', function(e){
    if(e.key === 'Enter'){ var a = results.querySelector('a'); if(a){ e.preventDefault(); a.click(); if(a.target !== '_blank') location.hash = a.getAttribute('href'); } }
    if(e.key === 'ArrowDown'){ var f = results.querySelector('a'); if(f){ e.preventDefault(); f.focus(); } }
  });
  results.addEventListener('keydown', function(e){
    var links = $$('a', results), i = links.indexOf(d.activeElement);
    if(e.key === 'ArrowDown' && i < links.length - 1){ e.preventDefault(); links[i + 1].focus(); }
    if(e.key === 'ArrowUp'){ e.preventDefault(); if(i > 0) links[i - 1].focus(); else q.focus(); }
  });

  /* ---------- Formulario (sin envío real: ver comentario en index.html) ---------- */
  (function initForm(){
    var f = $('#form'), st = $('#formStatus');
    if(!f) return;
    f.addEventListener('submit', function(e){
      e.preventDefault();
      var bad = null;
      $$('[required]', f).forEach(function(el){ var ok = el.value.trim().length > 1; el.setAttribute('aria-invalid', String(!ok)); if(!ok && !bad) bad = el; });
      if(bad){ st.textContent = 'Completa los campos marcados para continuar.'; bad.focus(); return; }
      var msg = 'Hola, soy ' + f.nombre.value.trim() + ' (' + f.negocio.value.trim() + '). Quiero una web de tipo: ' + f.tipo.value + '. ' + f.mensaje.value.trim();
      st.textContent = '';
      var span = d.createElement('span'); span.textContent = 'Este formulario todavía no envía mensajes. ';
      var a = d.createElement('a'); a.href = WA + encodeURIComponent(msg); a.target = '_blank'; a.rel = 'noopener'; a.textContent = 'Envíalo por WhatsApp con tu texto ya escrito';
      st.appendChild(span); st.appendChild(a);
    });
    $$('[required]', f).forEach(function(el){ el.addEventListener('input', function(){ if(el.value.trim().length > 1) el.removeAttribute('aria-invalid'); }); });
  })();

  update();
})();
