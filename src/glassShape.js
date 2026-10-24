// Glass shape: superellipsoid built on the GPU from a sphere's uv grid, so halfSize,
// depth, shapePow and edgeRound are uniforms that can animate every frame.
// The same uniforms drive the icon mask on the plane underneath.
import * as THREE from 'three/webgpu';
import { uniform, uv, vec3, float, abs, pow, max, cos, sin, sign, transformNormalToView } from 'three/tsl';

export const shape = {
  half: uniform(0),
  shapePow: uniform(2),
  depth: uniform(0),
  edgeRound: uniform(0),
};

// Push shape params to the uniforms (live, no geometry rebuild)
export function applyShape(params) {
  shape.half.value = params.halfSize;
  shape.shapePow.value = Math.max(params.shapePow, 0.05); // 0 would divide by zero in the shape maths
  shape.depth.value = params.depth;
  shape.edgeRound.value = params.edgeRound;
}

export const sphereGeometry = new THREE.SphereGeometry(1, 256, 128);

// signed powers of cos / sin
const tsc = (w, m) => sign(cos(w)).mul(pow(abs(cos(w)), m));
const tss = (w, m) => sign(sin(w)).mul(pow(abs(sin(w)), m));
const lon = uv().x.mul(Math.PI * 2);
const lat = uv().y.sub(0.5).mul(Math.PI);
const e1 = shape.edgeRound;
const e2 = float(2).div(shape.shapePow);

// sits on the icon plane: centre lifted by depth (+ small gap)
export const glassPosition = vec3(
  shape.half.mul(tsc(lat, e1)).mul(tsc(lon, e2)),
  shape.half.mul(tsc(lat, e1)).mul(tss(lon, e2)),
  shape.depth.mul(tss(lat, e1)).add(shape.depth).add(0.01),
);

const normalLocal = vec3(
  tsc(lat, float(2).sub(e1)).mul(tsc(lon, float(2).sub(e2))).div(shape.half),
  tsc(lat, float(2).sub(e1)).mul(tss(lon, float(2).sub(e2))).div(shape.half),
  tss(lat, float(2).sub(e1)).div(max(shape.depth, 1e-4)),
)
  .normalize()
  .toVarying('vGlassNormal');

// NodeMaterial.normalNode expects view space
export const glassNormal = transformNormalToView(normalLocal).normalize();
