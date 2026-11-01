/* Índigo Prompt Studio · escena 3D de la portada (Three.js, MIT).
   La D del logo extruida en tiempo real. Sigue al cursor en los dos ejes con inercia suave y vuelve de frente
   cuando el cursor sale; nunca acumula giro ni se queda al revés (ángulo limitado). En el móvil, giro del
   dispositivo o un vaivén lento. Con el scroll por paradas, la D se desplaza entre tarjetas y las maquetas
   de las creaciones aparecen quietas, flotando un poco, junto a su tarjeta.
   Se carga solo en la portada, en un momento libre tras la carga, y solo con WebGL y sin "reducir movimiento". */
import * as THREE from 'three';
import { SVGLoader } from './lib/SVGLoader.js';
import { RoomEnvironment } from './lib/RoomEnvironment.js';

const PATH = 'M128,334 L398,64 H600 C885,64 1072,255 1072,505 V700 C1072,950 885,1136 650,1136 H650 Q636,1136 636,1122 V1036 Q636,1022 622,1022 H406 Q392,1022 392,1036 V1122 Q392,1136 378,1136 H142 Q128,1136 128,1122 V334 Z M478.0,212 A44,44 0 0 1 566.0,212 C566.0,230 560.0,242 568.0,254 L804.0,703 Q810.0,712 800.0,720 C722.0,770 650.0,850 640.0,940 Q638.0,955 622.0,955 H422.0 Q406.0,955 404.0,940 C394.0,850 322.0,770 244.0,720 Q234.0,712 240.0,703 L476.0,254 C484.0,242 478.0,230 478.0,212 Z M504.0,228 H540.0 Q546.0,228 546.0,234 V608 C546.0,618 566.0,616 580.0,634 A80,80 0 1 1 464.0,634 C478.0,616 498.0,618 498.0,608 V234 Q498.0,228 504.0,228 Z M128,64 H358 L128,294 Z';
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const lerp = (a, b, k) => a + (b - a) * k;
const YAW_MAX = 0.95, PITCH_MAX = 0.42; // límites: la cara de la D siempre mira al frente (nunca pasa de 90°)

function glowTexture(inner, outer) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'), r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  r.addColorStop(0, inner); r.addColorStop(0.4, outer); r.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = r; g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/* Muelle amortiguado (inercia lenta, sin rebotes bruscos) */
function spring(k, z) { return { x: 0, v: 0, t: 0, step(dt) { const c = 2 * Math.sqrt(k) * z; this.v += ((this.t - this.x) * k - this.v * c) * dt; this.x += this.v * dt; } }; }

export async function start(canvas, opt) {
  opt = opt || {};
  const small = !!opt.small;
  let renderer;
  try {
    // La silueta ocupa gran parte de la portada móvil: sin antialias se ven
    // dientes en sus bordes aun teniendo píxeles Retina suficientes.
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { if (opt.onFail) opt.onFail(e); return null; }
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  // En un móvil Retina la D ocupa toda la portada. Su suelo es su densidad
  // física (hasta 2): se puede sacrificar detalle en escritorio, nunca dejar
  // pixelada la D en un teléfono tras un tirón puntual o a 30 fps estables.
  // Escritorio (Richi, 1-nov-2026: «la D sale pixelada»): se pinta como mínimo a 1,5x aunque la pantalla sea
  // de 1x (sobremuestreo: el navegador reduce el lienzo y los bordes y las líneas finas salen suavizados) y
  // como máximo a 2x. Si la GPU va justa solo baja hasta 1,25x; el suelo anterior (0,8x) dejaba la D pixelada.
  const nativo = window.devicePixelRatio || 1;
  const dprCeiling = small ? Math.min(nativo, 2) : Math.min(Math.max(nativo, 1.5), 2);
  const dprFloor = small ? Math.min(nativo, 2) : Math.min(1.25, dprCeiling);
  let dpr = dprCeiling;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  scene.environment = envTex; scene.environmentIntensity = 0.7;
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 80);

  /* D extruida */
  const data = new SVGLoader().parse('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1200"><path fill-rule="evenodd" d="' + PATH + '"/></svg>');
  const shapes = [];
  data.paths.forEach((p) => SVGLoader.createShapes(p).forEach((s) => shapes.push(s)));
  const geo = new THREE.ExtrudeGeometry(shapes, { depth: 150, bevelEnabled: true, bevelThickness: 12, bevelSize: 9, bevelSegments: 3, curveSegments: small ? 10 : 18 });
  geo.center();
  const S = 3.2 / 1072;
  const body = new THREE.MeshPhysicalMaterial({ color: 0x060a1c, metalness: 0.95, roughness: 0.24, clearcoat: 0.8, clearcoatRoughness: 0.15, emissive: 0x00124d, emissiveIntensity: 0.3, envMapIntensity: 1.25 });
  const mesh = new THREE.Mesh(geo, body);
  mesh.scale.set(S, -S, S); // el SVG tiene la Y hacia abajo: se invierte para que la D quede derecha y de frente
  const edgeMat = new THREE.LineBasicMaterial({ color: 0x8fb0ff, transparent: true, opacity: 1 });
  const shellMat = new THREE.MeshBasicMaterial({ color: 0x0047ff, side: THREE.BackSide, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false });
  const shell = new THREE.Mesh(geo, shellMat); shell.scale.setScalar(1.018); mesh.add(shell);
  mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 28), edgeMat));
  const spin = new THREE.Group(); spin.add(mesh);
  const rig = new THREE.Group(); rig.add(spin);
  scene.add(rig);

  /* Luces */
  scene.add(new THREE.AmbientLight(0x1b2c6e, 0.8));
  const key = new THREE.DirectionalLight(0x9db9ff, 2.2); key.position.set(3, 4, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(0x0047ff, 4.5); rim.position.set(-4, 1, -3); scene.add(rim);
  const rim2 = new THREE.DirectionalLight(0x3c78ff, 2.2); rim2.position.set(4, -2, -2); scene.add(rim2);

  /* Resplandor y suelo azul (acompañan a la D) */
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), new THREE.MeshBasicMaterial({ map: glowTexture('rgba(30,90,255,.55)', 'rgba(0,50,200,.18)'), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  halo.position.z = -2.2; rig.add(halo);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.MeshBasicMaterial({ map: glowTexture('rgba(40,110,255,.7)', 'rgba(0,60,220,.2)'), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -2.15; rig.add(floor);

  /* Partículas del fondo */
  const N = small ? 70 : 150, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const r = 3 + Math.random() * 4.5, a = Math.random() * Math.PI * 2, b = (Math.random() - 0.5) * 3.2;
    pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = b * 1.4; pos[i * 3 + 2] = Math.sin(a) * r;
  }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dots = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0x7aa2ff, size: 0.04, sizeAttenuation: true, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(dots);

  /* Maquetas de las creaciones: quietas en su sitio, flotando un poco */
  const panels = [];
  const loader = new THREE.TextureLoader();
  (opt.paneles || []).forEach((src, i) => {
    const m = new THREE.MeshBasicMaterial({ color: 0x0d111c, transparent: true, opacity: 0, side: THREE.FrontSide, toneMapped: false, depthWrite: false });
    loader.load(src, (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.generateMipmaps = true;
      t.minFilter = THREE.LinearMipmapLinearFilter;
      t.magFilter = THREE.LinearFilter;
      t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      m.map = t; m.color.set(0xffffff); m.needsUpdate = true;
      try { renderer.initTexture(t); } catch (e) {}
    }); // se sube a la GPU al cargar, no al aparecer
    const g = new THREE.PlaneGeometry(1, 0.625), p = new THREE.Mesh(g, m);
    const bm = new THREE.LineBasicMaterial({ color: 0x7aa2ff, transparent: true, opacity: 0 });
    p.add(new THREE.LineSegments(new THREE.EdgesGeometry(g), bm));
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.1), new THREE.MeshBasicMaterial({ map: glowTexture('rgba(0,71,255,.45)', 'rgba(0,50,200,.12)'), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.position.z = -0.05; p.add(glow);
    p.userData = { mats: [m, bm, glow.material] };
    p.visible = false; scene.add(p); panels.push(p);
  });

  /* Tamaño y encuadre */
  let aspect = 1, wide = true, halfH = 1, halfW = 1, sizedW = 0, sizedH = 0, sizedDpr = 0;
  function resize() {
    const cw = canvas.clientWidth || 1, ch = canvas.clientHeight || 1;
    // Safari cambia el alto visible al ocultar/mostrar la barra. Rehacer el
    // buffer solo cuando de verdad cambie y pintar ahora evita un lienzo vacío
    // hasta el siguiente requestAnimationFrame.
    if (cw !== sizedW || ch !== sizedH || dpr !== sizedDpr) {
      renderer.setPixelRatio(dpr); renderer.setSize(cw, ch, false);
      sizedW = cw; sizedH = ch; sizedDpr = dpr;
    }
    aspect = cw / ch; wide = aspect > 1.15;
    camera.aspect = aspect;
    const z = wide ? 11 : clamp(7 / (0.5735 * aspect), 11, 30);
    camera.position.set(0, 0, z); camera.lookAt(0, 0, 0); camera.updateProjectionMatrix();
    halfH = z * Math.tan(THREE.MathUtils.degToRad(16)); halfW = halfH * aspect;
    renderer.render(scene, camera);
  }
  resize();
  const ro = new ResizeObserver(resize); ro.observe(canvas);

  /* Puntero: la D sigue la posición del cursor (dos ejes) y vuelve de frente cuando sale */
  const yaw = spring(9, 0.82), pitch = spring(9, 0.82);
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let mouseT = 0, gyroT = 0, beta0 = null, touchX = 0, touchY = 0, touchYaw = 0, touchMode = '', touchT = 0;
  const onMove = (e) => { mouseT = performance.now(); yaw.t = clamp((e.clientX / window.innerWidth - 0.5) * 2, -1, 1) * YAW_MAX; pitch.t = clamp((e.clientY / window.innerHeight - 0.5) * 2, -1, 1) * PITCH_MAX; };
  const onLeave = (e) => { if (!e.relatedTarget) { yaw.t = 0; pitch.t = 0; mouseT = 0; } };
  const onBlur = () => { yaw.t = 0; pitch.t = 0; mouseT = 0; };
  const onGyro = (e) => { if (reduced || e.gamma == null) return; gyroT = performance.now(); if (beta0 === null) beta0 = e.beta || 0; yaw.t = clamp(e.gamma / 35, -1, 1) * YAW_MAX * 0.75; pitch.t = clamp(((e.beta || 0) - beta0) / 35, -1, 1) * PITCH_MAX * 0.7; };
  // En tactil esperamos 8 px: vertical queda integramente para el scroll nativo;
  // horizontal captura solo la D y no deja que el vaiven la pise mientras se arrastra.
  const onTouchDown = (e) => { if (reduced || e.pointerType !== 'touch') return; touchX = e.clientX; touchY = e.clientY; touchYaw = yaw.x; yaw.t = yaw.x; pitch.t = pitch.x; touchMode = 'pending'; touchT = performance.now(); };
  const onTouchMove = (e) => {
    if (reduced || e.pointerType !== 'touch' || !touchMode) return;
    const dx = e.clientX - touchX, dy = e.clientY - touchY;
    if (touchMode === 'pending' && Math.hypot(dx, dy) >= 8) touchMode = Math.abs(dx) > Math.abs(dy) ? 'drag' : 'scroll';
    if (touchMode === 'drag') { e.preventDefault(); yaw.t = clamp(touchYaw + dx / Math.max(canvas.clientWidth, 1) * YAW_MAX * 1.6, -YAW_MAX, YAW_MAX); pitch.t = 0; touchT = performance.now(); }
  };
  const onTouchEnd = (e) => { if (e.pointerType !== 'touch' || !touchMode) return; if (touchMode === 'drag') { yaw.t = 0; pitch.t = 0; } touchMode = ''; touchT = performance.now(); };
  if (fine) { window.addEventListener('pointermove', onMove, { passive: true }); document.addEventListener('mouseout', onLeave); window.addEventListener('blur', onBlur); }
  else { window.addEventListener('deviceorientation', onGyro, { passive: true }); canvas.addEventListener('pointerdown', onTouchDown, { passive: true }); canvas.addEventListener('pointermove', onTouchMove, { passive: false }); canvas.addEventListener('pointerup', onTouchEnd, { passive: true }); canvas.addEventListener('pointercancel', onTouchEnd, { passive: true }); }

  /* Pantallas estrechas: la D se encaja entre la cabecera y el texto (que varía con el titular y el alto del móvil) */
  let bandas = null; // { hero: px, card: px } = borde superior del texto dentro de la escena, en px CSS
  function encuadreEstrecho(topePx) {
    const ch = canvas.clientHeight || 1, ppu = (ch / 2) / halfH; // píxeles por unidad de escena
    const arriba = 72, banda = Math.max(120, topePx - arriba), centro = arriba + banda / 2;
    const y = (1 - 2 * centro / ch), s = clamp((banda / 2 - 10) / (1.9 * ppu), 0.55, 1); // 1,9 u ≈ media altura visible de la D con su brillo
    return [0, y, s];
  }

  /* Encuadres por parada (coordenadas de pantalla: -1..1) */
  function layout(stage, nSteps) {
    // devuelve la posición/escala de la D para un valor continuo de parada (0 = portada)
    const L = wide
      ? { hero: [0.5, 0, 1], card: [0.46, 0, 1.06], panel: [0.76, 0.5, 0.36] }
      : { hero: bandas ? encuadreEstrecho(bandas.hero) : [0, 0.5, 1], card: bandas ? encuadreEstrecho(bandas.card) : [0, 0.44, 1.02], panel: [0.52, 0.7, 0.34] };
    const firstPanel = Math.max(1, nSteps - panels.length + 1);
    const a = smooth(0, 1, stage), b = panels.length ? smooth(firstPanel - 1, firstPanel, stage) : 0;
    const x = lerp(lerp(L.hero[0], L.card[0], a), L.panel[0], b), y = lerp(lerp(L.hero[1], L.card[1], a), L.panel[1], b), s = lerp(lerp(L.hero[2], L.card[2], a), L.panel[2], b);
    return { x: x * halfW, y: y * halfH, s, firstPanel };
  }

  /* Bucle */
  let P = 0, ps = 0, steps = 5, vis = true, paused = false, running = false, raf = 0, t0 = performance.now(), last = t0, acc = 0, nfr = 0, first = true;
  function frame(now) {
    raf = 0;
    if (!vis || paused || document.hidden) { running = false; return; }
    raf = requestAnimationFrame(frame);
    const dtMs = Math.min(now - last, 100); last = now; const dt = dtMs / 1000, t = (now - t0) / 1000;
    // Tres segundos de calentamiento y los hipos aislados no dicen nada de la
    // GPU. 30 fps estables (~33 ms) sí son aceptables: solo bajamos calidad en
    // escritorio ante una media sostenida claramente peor. En móvil el suelo
    // coincide con el techo, así que la resolución nunca se degrada.
    if (now - t0 > 3000 && dtMs < 80) { acc += dtMs; nfr++; }
    if (nfr >= 90) {
      const avg = acc / nfr; acc = 0; nfr = 0;
      if (!small && avg > 42 && dpr > dprFloor) { dpr = Math.max(dprFloor, dpr * 0.8); resize(); }
    }
    ps = lerp(ps, P, 1 - Math.exp(-dtMs / 90));
    const stage = ps * steps, seg = Math.floor(stage), f = stage - seg;

    // Sin cursor ni giroscopio: vaivén lento (solo táctil) o reposo de frente
    if (!fine && !reduced && !touchMode && performance.now() - gyroT > 1500 && performance.now() - touchT > 900) { yaw.t = Math.sin(t * 0.35) * 0.42; pitch.t = Math.sin(t * 0.23) * 0.1; }
    yaw.step(Math.min(dt, 0.05)); pitch.step(Math.min(dt, 0.05));
    // la D gira con el scroll como en la versión anterior, pero una vuelta completa por parada: en cada parada
    // vuelve a quedar de frente (nunca se queda del revés) y el ratón solo añade su inclinación
    const giro = Math.min(stage, steps) * Math.PI * 2;
    spin.rotation.y = giro + clamp(yaw.x, -YAW_MAX - 0.2, YAW_MAX + 0.2);
    spin.rotation.x = clamp(pitch.x + Math.sin(Math.PI * f) * 0.1, -PITCH_MAX - 0.1, PITCH_MAX + 0.1);
    spin.position.y = Math.sin(t * 0.8) * 0.08;

    const lay = layout(stage, steps);
    rig.position.set(lay.x, lay.y, (1 - smooth(0.4, 1, lay.s)) * 0.8); // delante de la maqueta cuando se hace pequeña
    rig.scale.setScalar(lay.s);
    edgeMat.opacity = 0.75 + 0.25 * (0.5 + 0.5 * Math.sin(t * 1.6)); shellMat.opacity = 0.4 + 0.2 * (0.5 + 0.5 * Math.sin(t * 1.2));
    dots.rotation.y = t * 0.025 + ps * 0.6;

    // maquetas: cada una junto a su tarjeta, quieta y flotando
    const W = wide ? halfW * 0.9 : halfW * 1.66;
    const cx = wide ? 0.4 * halfW : 0, cy = wide ? -0.04 * halfH : 0.3 * halfH;
    panels.forEach((p, i) => {
      const at = lay.firstPanel + i, v = 1 - smooth(0.18, 0.62, Math.abs(stage - at));
      p.visible = v > 0.001;
      if (!p.visible) return;
      const enter = stage < at ? 1 : -1;
      p.scale.set(W * (0.94 + 0.06 * v), W * (0.94 + 0.06 * v), 1);
      p.position.set(cx + (1 - v) * 0.6 * enter, cy + Math.sin(t * 0.9 + i * 1.7) * 0.07, 0);
      p.rotation.set(Math.sin(t * 0.6 + i) * 0.015, wide ? -0.16 + Math.sin(t * 0.5 + i) * 0.02 : Math.sin(t * 0.5 + i) * 0.02, 0);
      p.userData.mats[0].opacity = v; p.userData.mats[1].opacity = v * 0.7; p.userData.mats[2].opacity = v * 0.9;
    });
    renderer.render(scene, camera);
    if (first) { first = false; if (opt.onReady) opt.onReady(); }
  }
  function kick() { if (!running && vis && !paused && !document.hidden) { running = true; last = performance.now(); raf = requestAnimationFrame(frame); } }

  // Compilar los shaders sin bloquear el hilo principal (si el navegador lo permite) antes del primer fotograma
  if (renderer.extensions.has('KHR_parallel_shader_compile')) { try { await renderer.compileAsync(scene, camera); } catch (e) { /* se compila en el primer fotograma */ } }

  const target = opt.visibilityTarget || canvas;
  const io = new IntersectionObserver((es) => { vis = es[0].isIntersecting; if (vis) kick(); }, { threshold: 0 }); io.observe(target);
  document.addEventListener('visibilitychange', kick);
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); vis = false; if (opt.onFail) opt.onFail(new Error('contexto perdido')); });
  kick();

  return {
    setProgress(p, n) { P = clamp(p, 0, 1); if (n) steps = n; },
    setBandas(b) { bandas = b && b.hero > 0 ? { hero: b.hero, card: b.card > 0 ? b.card : b.hero } : null; },
    setPaused(p) { paused = !!p; if (!paused) kick(); }, // en pausa mientras una capa (visor, menú) tapa la portada
    // para pruebas: estado de giro actual
    debug() { const tau = Math.PI * 2, yw = ((spin.rotation.y % tau) + tau + Math.PI) % tau - Math.PI; return { arrastrando: touchMode === 'drag', yaw: yw, giroTotal: spin.rotation.y, paused, running, pitch: spin.rotation.x, yawT: yaw.t, pitchT: pitch.t, ps, stage: ps * steps, dpr, dprFloor, dprCeiling, canvasDpr: canvas.clientWidth ? canvas.width / canvas.clientWidth : 0, rig: rig.position.toArray(), scale: rig.scale.x, panels: panels.map((p) => p.visible ? +p.userData.mats[0].opacity.toFixed(2) : 0) }; },
    dispose() { vis = false; cancelAnimationFrame(raf); io.disconnect(); ro.disconnect(); window.removeEventListener('pointermove', onMove); document.removeEventListener('mouseout', onLeave); window.removeEventListener('blur', onBlur); window.removeEventListener('deviceorientation', onGyro); canvas.removeEventListener('pointerdown', onTouchDown); canvas.removeEventListener('pointermove', onTouchMove); canvas.removeEventListener('pointerup', onTouchEnd); canvas.removeEventListener('pointercancel', onTouchEnd); geo.dispose(); renderer.dispose(); }
  };
}
