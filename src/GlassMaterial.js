// Glass block material: MeshPhysicalNodeMaterial for reflections, plus a custom
// spectral refraction node added in outputNode ('custom' mode), or three's built-in
// transmission ('three' mode) for comparison.
import * as THREE from 'three/webgpu';
import {
  Fn,
  uniform,
  texture,
  positionWorld,
  normalWorld,
  cameraPosition,
  cameraProjectionMatrix,
  cameraViewMatrix,
  refract,
  output,
  vec2,
  vec3,
  vec4,
  float,
  mix,
  pow,
  max,
  cos,
  dot,
} from 'three/tsl';
import { glassPosition, glassNormal } from './glassShape.js';

// Refraction taps per pixel. More taps = smooth gradient instead of three's
// 3 hard R/G/B copies.
const TAPS = 16;

export function createGlassMaterial({ params, backdropTexture }) {
  const material = new THREE.MeshPhysicalNodeMaterial({
    metalness: 0,
    roughness: 0.164,
    clearcoat: 0,
    clearcoatRoughness: 0,
    specularIntensity: 0.79,
  });
  material.positionNode = glassPosition;
  material.normalNode = glassNormal;

  // Glass draws after the icon plane (transparent queue) without blending: it fully
  // covers what's behind (three's built-in transmission reads the framebuffer).
  // Blending also caused a white ghost of the icon with three's transmission.
  material.transparent = true;
  material.blending = THREE.NoBlending;

  const r = {
    ior: uniform(1),
    thickness: uniform(0),
    dispersion: uniform(0), // negative flips the colour order
    hue: uniform(0), // rotates the palette
    range: uniform(1), // how much of the rainbow the taps span
    sharp: uniform(1),
    sat: uniform(1),
    dirAmount: uniform(0),
    dirVec: uniform(new THREE.Vector2()),
    edgeThin: uniform(1),
    fresnel: uniform(0),
  };
  const backdrop = texture(backdropTexture);

  // Refract the view ray once per tap, each tap with a slightly different IOR and a
  // colour from a rotatable rainbow palette, and sample the icon backdrop.
  const spectralRefraction = Fn(() => {
    const n = normalWorld;
    // hue offset by which way this edge faces (screen-ish xy of the normal)
    const facing = n.xy.div(max(n.xy.length(), 1e-4));
    const hueOffset = r.hue.add(r.dirAmount.mul(dot(facing, r.dirVec)));
    const v = cameraPosition.sub(positionWorld).normalize();
    // glass is thin at the rim: scale the light path by how much the surface
    // faces the view, so steep edges don't sample far-off bits of the icon
    const thick = r.thickness.mul(mix(float(1), max(dot(n, v), 0), r.edgeThin));
    // same spread scale as three: (ior - 1) * 0.025 * dispersion
    const halfSpread = r.ior.sub(1).mul(r.dispersion.mul(0.025));
    const acc = vec3(0).toVar();
    const wsum = vec3(0).toVar();
    for (let i = 0; i < TAPS; i++) {
      const t = i / (TAPS - 1);
      const iorT = r.ior.add(halfSpread.mul(t * 2 - 1));
      const ray = refract(v.negate(), n, float(1).div(iorT));
      const exit = positionWorld.add(ray.mul(thick));
      const ndc = cameraProjectionMatrix.mul(cameraViewMatrix.mul(vec4(exit, 1)));
      const suv = ndc.xy.div(ndc.w).add(1).div(2);
      const col = backdrop.sample(vec2(suv.x, suv.y.oneMinus())).rgb;
      // rainbow palette: t = 0 red -> green -> blue, rotated by hue
      const ang = r.range.mul(t).add(hueOffset).mul(Math.PI * 2);
      const w = pow(cos(vec3(0, -2.0944, -4.1888).add(ang)).mul(0.5).add(0.5), r.sharp);
      acc.addAssign(col.mul(w));
      wsum.addAssign(w);
    }
    const col = acc.div(max(wsum, vec3(1e-4)));
    const luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
    return max(mix(vec3(luma), col, r.sat), vec3(0));
  });

  function applyRefractionMode() {
    const custom = params.refraction === 'custom';
    // custom: black diffuse + no transmission, so the lit output is reflections only
    material.color.set(custom ? 0x000000 : 0xffffff);
    material.transmission = custom ? 0 : 1;
    if (custom) {
      // Fresnel-weighted refraction under the physical reflections
      const v = cameraPosition.sub(positionWorld).normalize();
      const f0 = r.ior.sub(1).div(r.ior.add(1)).pow(2);
      const fres = f0
        .add(float(1).sub(f0).mul(float(1).sub(max(dot(normalWorld, v), 0)).pow(5)))
        .mul(r.fresnel);
      material.outputNode = vec4(output.rgb.add(spectralRefraction().mul(float(1).sub(fres))), 1);
    } else {
      material.outputNode = null;
    }
    material.needsUpdate = true;
  }

  // Push refraction params to the uniforms (and three's transmission settings)
  function syncRefraction() {
    r.ior.value = params.ior;
    r.thickness.value = params.thickness;
    r.dispersion.value = params.dispersion;
    r.edgeThin.value = params.edgeThin;
    r.fresnel.value = params.fresnel;
    r.hue.value = params.hue;
    r.range.value = params.spectrumRange;
    r.sharp.value = params.bandSharpness;
    r.sat.value = params.saturation;
    r.dirAmount.value = params.hueDirAmount;
    const a = THREE.MathUtils.degToRad(params.hueDirAngle);
    r.dirVec.value.set(Math.cos(a), Math.sin(a));
    material.ior = params.ior;
    material.thickness = params.thickness;
    material.dispersion = Math.abs(params.dispersion);
  }

  syncRefraction();
  applyRefractionMode();

  return { material, applyRefractionMode, syncRefraction };
}
