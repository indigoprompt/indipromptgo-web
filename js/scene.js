/* Índigo Prompt Studio · escena 3D de la portada (Three.js, MIT).
   Extruye el símbolo plano del logo (dirección C) en tiempo real, lo rodea de las demos y lo mueve con el scroll.
   Se carga solo en la portada, tras el primer pintado, y solo si el navegador tiene WebGL y no pide reducir movimiento. */
import * as THREE from 'three';
import { SVGLoader } from './lib/SVGLoader.js';
import { RoomEnvironment } from './lib/RoomEnvironment.js';

const PATH = 'M128,334 L398,64 H600 C885,64 1072,255 1072,505 V700 C1072,950 885,1136 650,1136 H650 Q636,1136 636,1122 V1036 Q636,1022 622,1022 H406 Q392,1022 392,1036 V1122 Q392,1136 378,1136 H142 Q128,1136 128,1122 V334 Z M478.0,212 A44,44 0 0 1 566.0,212 C566.0,230 560.0,242 568.0,254 L804.0,703 Q810.0,712 800.0,720 C722.0,770 650.0,850 640.0,940 Q638.0,955 622.0,955 H422.0 Q406.0,955 404.0,940 C394.0,850 322.0,770 244.0,720 Q234.0,712 240.0,703 L476.0,254 C484.0,242 478.0,230 478.0,212 Z M504.0,228 H540.0 Q546.0,228 546.0,234 V608 C546.0,618 566.0,616 580.0,634 A80,80 0 1 1 464.0,634 C478.0,616 498.0,618 498.0,608 V234 Q498.0,228 504.0,228 Z M128,64 H358 L128,294 Z';
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const lerp = (a, b, k) => a + (b - a) * k;

function glowTexture(inner, outer) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'), r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  r.addColorStop(0, inner); r.addColorStop(0.4, outer); r.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = r; g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function start(canvas, opt) {
  opt = opt || {};
  let small = !!opt.small;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: !small, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { if (opt.onFail) opt.onFail(e); return null; }
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  let dpr = Math.min(window.devicePixelRatio || 1, small ? 1.5 : 1.75);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex; scene.environmentIntensity = 0.7;
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 80);

  /* Símbolo extruido */
  const data = new SVGLoader().parse('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1200"><path fill-rule="evenodd" d="' + PATH + '"/></svg>');
  const shapes = [];
  data.paths.forEach((p) => SVGLoader.createShapes(p).forEach((s) => shapes.push(s)));
  const geo = new THREE.ExtrudeGeometry(shapes, { depth: 150, bevelEnabled: true, bevelThickness: 12, bevelSize: 9, bevelSegments: 3, curveSegments: small ? 10 : 18 });
  geo.center();
  const S = 3.2 / 1072;
  const body = new THREE.MeshPhysicalMaterial({ color: 0x060a1c, metalness: 0.95, roughness: 0.24, clearcoat: 0.8, clearcoatRoughness: 0.15, emissive: 0x00124d, emissiveIntensity: 0.3, envMapIntensity: 1.25 });
  const mesh = new THREE.Mesh(geo, body);
  mesh.scale.set(S, -S, S);
  const edgeMat = new THREE.LineBasicMaterial({ color: 0x8fb0ff, transparent: true, opacity: 1 });
  const shellMat = new THREE.MeshBasicMaterial({ color: 0x0047ff, side: THREE.BackSide, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false });
  const shell = new THREE.Mesh(geo, shellMat); shell.scale.setScalar(1.018); mesh.add(shell);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 28), edgeMat);
  mesh.add(edges);
  const spin = new THREE.Group(); spin.add(mesh);
  const rig = new THREE.Group(); rig.add(spin);
  scene.add(rig);

  /* Luces */
  scene.add(new THREE.AmbientLight(0x1b2c6e, 0.8));
  const key = new THREE.DirectionalLight(0x9db9ff, 2.2); key.position.set(3, 4, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(0x0047ff, 4.5); rim.position.set(-4, 1, -3); scene.add(rim);
  const rim2 = new THREE.DirectionalLight(0x3c78ff, 2.2); rim2.position.set(4, -2, -2); scene.add(rim2);

  /* Resplandor detrás y suelo azul */
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), new THREE.MeshBasicMaterial({ map: glowTexture('rgba(30,90,255,.55)', 'rgba(0,50,200,.18)'), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  halo.position.z = -2.2; rig.add(halo);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.MeshBasicMaterial({ map: glowTexture('rgba(40,110,255,.7)', 'rgba(0,60,220,.2)'), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -2.15; rig.add(floor);

  /* Partículas */
  const N = small ? 70 : 150, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const r = 3 + Math.random() * 4.5, a = Math.random() * Math.PI * 2, b = (Math.random() - 0.5) * 3.2;
    pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = b * 1.4; pos[i * 3 + 2] = Math.sin(a) * r;
  }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dots = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0x7aa2ff, size: 0.04, sizeAttenuation: true, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }));
  rig.add(dots);

  /* Demos orbitando (capturas reales de los proyectos) */
  const orbit = new THREE.Group(); rig.add(orbit);
  const panels = [];
  const loader = new THREE.TextureLoader();
  ['dental', 'inmo', 'ropa'].forEach((n, i) => {
    const w = 2.1, h = w * 0.625;
    const m = new THREE.MeshBasicMaterial({ color: 0x0d111c, transparent: true, opacity: 0, side: THREE.DoubleSide, toneMapped: false });
    loader.load('assets/img/' + n + '-720.webp', (t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; m.map = t; m.color.set(0xffffff); m.needsUpdate = true; });
    const g = new THREE.PlaneGeometry(w, h), mesh2 = new THREE.Mesh(g, m);
    const bm = new THREE.LineBasicMaterial({ color: 0x7aa2ff, transparent: true, opacity: 0 });
    mesh2.add(new THREE.LineSegments(new THREE.EdgesGeometry(g), bm));
    mesh2.userData = { a: (i / 3) * Math.PI * 2, mats: [m, bm] };
    orbit.add(mesh2); panels.push(mesh2);
  });

  /* Tamaño y encuadre */
  let aspect = 1, wide = true;
  function resize() {
    const cw = canvas.clientWidth || 1, ch = canvas.clientHeight || 1;
    renderer.setPixelRatio(dpr); renderer.setSize(cw, ch, false);
    aspect = cw / ch; wide = aspect > 1.15;
    camera.aspect = aspect;
    camera.position.set(0, wide ? 0.2 : 0, wide ? 11 : clamp(7 / (0.5735 * aspect), 11, 30));
    camera.lookAt(0, 0, 0); camera.updateProjectionMatrix();
  }
  resize();
  const ro = new ResizeObserver(resize); ro.observe(canvas);

  /* Puntero */
  let tx = 0, ty = 0, px = 0, py = 0;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const onMove = (e) => { tx = e.clientX / window.innerWidth - 0.5; ty = e.clientY / window.innerHeight - 0.5; };
  if (fine) window.addEventListener('pointermove', onMove, { passive: true });

  /* Bucle */
  let P = 0, ps = 0, vis = true, running = false, raf = 0, t0 = performance.now(), last = t0, acc = 0, nfr = 0, first = true;
  function frame(now) {
    raf = 0;
    if (!vis || document.hidden) { running = false; return; }
    raf = requestAnimationFrame(frame);
    const dt = Math.min(now - last, 100); last = now; const t = (now - t0) / 1000;
    if (dt < 250) { acc += dt; nfr++; }
    if (nfr >= 90) { const avg = acc / nfr; acc = 0; nfr = 0; if (avg > 24 && dpr > 0.8) { dpr = Math.max(0.8, dpr * 0.8); resize(); } }
    ps = lerp(ps, P, 1 - Math.exp(-dt / 140));
    px = lerp(px, tx, 0.06); py = lerp(py, ty, 0.06);
    const showPanels = smooth(0.5, 0.64, ps) * (1 - smooth(0.97, 1, ps));
    const sc = lerp(1, 0.8, smooth(0.45, 0.62, ps));
    // posición del conjunto: a la derecha en pantallas anchas, arriba en móvil
    const rx = wide ? lerp(2.6, 1.7, smooth(0.1, 0.5, ps)) : 0;
    const ry = wide ? 0 : lerp(3.3, 1.5, smooth(0.04, 0.2, ps));
    rig.position.set(rx, ry, 0);
    spin.rotation.y = 0.55 + t * 0.14 + ps * Math.PI * 2.4 + px * 0.9;
    spin.rotation.x = 0.08 + py * 0.5 + Math.sin(t * 0.5) * 0.03;
    spin.position.y = Math.sin(t * 0.8) * 0.08;
    spin.scale.setScalar(sc);
    edgeMat.opacity = 0.75 + 0.25 * (0.5 + 0.5 * Math.sin(t * 1.6 + ps * 6)); shellMat.opacity = 0.4 + 0.2 * (0.5 + 0.5 * Math.sin(t * 1.2));
    dots.rotation.y = t * 0.03 + ps * 0.8;
    // demos
    const R = wide ? 2.4 : 2.0;
    orbit.rotation.y = -ps * Math.PI * 1.3 + t * 0.06;
    panels.forEach((p, i) => {
      const a = p.userData.a;
      p.position.set(Math.sin(a) * R, (i - 1) * 0.55, Math.cos(a) * R);
      p.getWorldPosition(p.userData.wp || (p.userData.wp = new THREE.Vector3()));
      p.lookAt(camera.position.x, p.userData.wp.y, camera.position.z);
      const front = 0.45 + 0.55 * smooth(-1, 1, Math.cos(a + orbit.rotation.y));
      p.userData.mats[0].opacity = showPanels * front; p.userData.mats[1].opacity = showPanels * front * 0.8;
      p.scale.setScalar((wide ? 1 : 0.8) * (0.7 + 0.3 * showPanels));
    });
    renderer.render(scene, camera);
    if (first) { first = false; if (opt.onReady) opt.onReady(); }
  }
  function kick() { if (!running && vis && !document.hidden) { running = true; last = performance.now(); raf = requestAnimationFrame(frame); } }
  const target = opt.visibilityTarget || canvas;
  const io = new IntersectionObserver((es) => { vis = es[0].isIntersecting; if (vis) kick(); }, { threshold: 0 }); io.observe(target);
  document.addEventListener('visibilitychange', kick);
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); vis = false; if (opt.onFail) opt.onFail(new Error('contexto perdido')); });
  kick();

  return {
    setProgress(p) { P = clamp(p, 0, 1); },
    dispose() { vis = false; cancelAnimationFrame(raf); io.disconnect(); ro.disconnect(); window.removeEventListener('pointermove', onMove); geo.dispose(); renderer.dispose(); }
  };
}
