// Ripple wave: circular sine ring travelling out from the centre, refracting the
// whole rendered frame in a post pass. radius / amp are animated by the timeline.
import { Fn, uniform, screenUV, vec2, vec3, vec4, abs, exp, max, cos, sin, sign, dot, mix, clamp, smoothstep } from 'three/tsl';

export const wave = {
  aspect: uniform(1),
  radius: uniform(0),
  amp: uniform(0),
  freq: uniform(15.4),
  decay: uniform(12.06), // spatial falloff either side of the ring
  refract: uniform(1),
  dispersion: uniform(0.313),
  shade: uniform(2),
  debug: uniform(0), // 1 = overlay the ripple in red
  show: uniform(1), // 0 = wave off
};

// R/G/B weights for the fringe taps, normalised per channel
const TAPS = 8;
const weights = Array.from({ length: TAPS }, (_, i) => {
  const t = i / (TAPS - 1);
  return [0, 0.5, 1].map((c) => Math.max(0, 1 - Math.abs(t - c) * 2));
});
const sums = [0, 1, 2].map((c) => weights.reduce((a, w) => a + w[c], 0));

// Ring height h = amp * sin(s*freq) * exp(-|s|*decay) / freq, s = distance from
// the ring. Its slope offsets the lookup, split over a few taps for a small R/G/B
// fringe, and shades the frame slightly.
export function createWavePass(sceneColor) {
  return Fn(() => {
    const suv = screenUV;
    const aspectV = vec2(wave.aspect, 1);
    const p = suv.sub(0.5).mul(aspectV);
    const r = p.length();
    const s = r.sub(wave.radius);
    const env = exp(abs(s).mul(wave.decay).negate());
    // d/ds of the ring height
    const dh = wave.amp
      .mul(wave.show)
      .mul(env)
      .mul(cos(s.mul(wave.freq)).sub(sign(s).mul(wave.decay).div(wave.freq).mul(sin(s.mul(wave.freq)))));
    const grad = p.div(max(r, 1e-4)).mul(dh);
    const off = grad.mul(wave.refract).div(aspectV);
    const col = vec3(0).toVar();
    for (let i = 0; i < TAPS; i++) {
      const t = i / (TAPS - 1);
      const k = wave.dispersion.mul((t - 0.5) * 2).add(1);
      const w = weights[i].map((v, c) => v / sums[c]);
      col.addAssign(sceneColor.sample(suv.add(off.mul(k))).rgb.mul(vec3(...w)));
    }
    // light from top-left (screenUV y points down)
    const diff = dot(grad, vec2(-0.5, -0.7)).mul(wave.shade);
    // debug: ripple slope (normalised by amp) in red, fades as the wave dies
    const dbg = clamp(abs(dh).div(max(wave.amp, 1e-5)), 0, 1).mul(smoothstep(0, 0.002, wave.amp)).mul(wave.debug);
    return vec4(mix(col.add(diff), vec3(1, 0, 0), dbg), 1);
  })();
}
