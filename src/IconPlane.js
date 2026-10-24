// Flat unlit plane with the icon, masked to the glass block footprint, plus an
// optional soft shadow halo. Also builds a scene with just this plane, rendered to
// its own target as the backdrop the glass refracts.
import * as THREE from 'three/webgpu';
import { Fn, uniform, texture, positionLocal, float, mix, abs, pow, exp, max, smoothstep, clamp } from 'three/tsl';
import { shape } from './glassShape.js';

// Images: WB = black on white, BW = white on black (inverted).
// Image black/white are remapped to dark/light; bg fills outside the icon mask.
const modeColors = {
  WB: { dark: '#000000', light: '#e5e6e8', bg: '#e5e6e8' },
  BW: { dark: '#000000', light: '#ffffff', bg: '#000000' },
};

export function createIconPlane({ params, base, scene }) {
  const loader = new THREE.TextureLoader();
  const loadTexture = (url) => {
    const tex = loader.load(url, applyLook);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  };
  const textures = { WB: loadTexture(base + 'icon-wb.png'), BW: loadTexture(base + 'icon-bw.png') };

  const u = {
    iconSize: uniform(new THREE.Vector2(0.5, 0.5)),
    iconOffset: uniform(new THREE.Vector2(0, 0)),
    dark: uniform(new THREE.Color('#000000')),
    light: uniform(new THREE.Color('#e5e6e8')),
    bgColor: uniform(new THREE.Color('#e5e6e8')),
    maskIcon: uniform(1), // 1 = icon only visible inside the glass block footprint
    shadow: uniform(0),
    shadowWidth: uniform(0.12),
    brightness: uniform(-0.475),
    contrast: uniform(1),
    imgBg: uniform(1), // value of the image background (1 = white, 0 = black)
  };

  const iconNode = texture(textures.WB, positionLocal.xy.sub(u.iconOffset).div(u.iconSize).add(0.5));

  function updateIconSize() {
    const img = iconNode.value.image;
    const w = params.iconWidth;
    if (img) u.iconSize.value.set(w, w / (img.width / img.height));
  }

  function applyLook() {
    iconNode.value = textures[params.mode];
    const c = modeColors[params.mode];
    u.dark.value.set(c.dark);
    u.light.value.set(c.light);
    u.bgColor.value.set(c.bg);
    u.imgBg.value = params.mode === 'WB' ? 1 : 0;
    scene.background.set(c.bg); // shared with the backdrop scene
    document.body.style.background = c.bg;
    document.body.classList.toggle('bw', params.mode === 'BW'); // text button colour
    updateIconSize();
  }

  const material = new THREE.MeshBasicNodeMaterial({ side: THREE.DoubleSide });
  material.colorNode = Fn(() => {
    const p = positionLocal.xy;
    const img = iconNode;
    // B/C on icon pixels only: fade out near the image background value
    const iconAmt = smoothstep(0.02, 0.2, abs(img.r.sub(u.imgBg)));
    const bc = clamp(img.rgb.sub(0.5).mul(u.contrast).add(0.5).add(u.brightness), 0, 1);
    const adj = mix(img.rgb, bc, iconAmt);
    // superellipse distance for the icon mask + shadow halo
    const a = abs(p).add(1e-5);
    const r = pow(pow(a.x, shape.shapePow).add(pow(a.y, shape.shapePow)), float(1).div(shape.shapePow));
    // mask the icon to the glass block footprint
    const inside = float(1).sub(smoothstep(shape.half.mul(0.985), shape.half, r));
    const col = mix(u.bgColor, mix(u.dark, u.light, adj), mix(float(1), inside, u.maskIcon));
    const outside = smoothstep(shape.half.mul(0.9), shape.half.mul(1.05), r);
    const sh = exp(max(r.sub(shape.half), 0).div(u.shadowWidth).negate()).mul(u.shadow).mul(outside);
    return col.mul(float(1).sub(sh));
  })();

  const geometry = new THREE.PlaneGeometry(8, 8);
  const mesh = new THREE.Mesh(geometry, material);

  // Icon plane on its own, for the backdrop the glass refracts
  const backdropScene = new THREE.Scene();
  backdropScene.background = scene.background;
  backdropScene.add(new THREE.Mesh(geometry, material));

  applyLook();

  return { mesh, backdropScene, uniforms: u, applyLook, updateIconSize };
}
