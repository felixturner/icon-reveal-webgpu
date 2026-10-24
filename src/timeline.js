// GSAP timelines, scrubbed every frame with seek(). The main timeline tweens the
// params (onUpdate pushes them to the shaders); the wave has its own timeline so it
// can be offset in time (waveOffset).
import * as THREE from 'three/webgpu';
import gsap from 'gsap';
import { wave } from './WavePass.js';

export const DURATION = 4;

export function createTimeline({ params, onUpdate }) {
  const anim = {
    playing: false, // the Play button runs it once from the start with sound
    speed: 2,
    time: 0,
    sizeStart: 0.05,
    sizeEnd: 0.35,
    shapeStart: 2, // circle
    shapeEnd: params.shapePow, // squircle
    morphAt: 0.15, // fraction of the timeline
    morphDuration: 0.5, // seconds
    iconStart: 0.55, // icon width, shrinks over the whole anim
    iconEnd: 0.4,
    iorStart: params.ior,
    iorEnd: 1, // 1 = no refraction
    iorFadeAt: 0.5, // fraction of the timeline
    depthStart: params.depth,
    depthEnd: 0,
    depthFadeAt: 0.25, // fraction of the timeline where depth starts flattening
    ringStrength: 0.096, // ripple wave peak slope
    ringEndRadius: 0.8, // how far the ripple travels (screen heights)
    waveOffset: -0.04, // seconds; negative = wave comes in earlier, positive = later
    hold: 1, // seconds held on the last frame
  };
  const end = () => DURATION + anim.hold;

  // before Play, sit on the end state of the anim
  anim.time = end();

  let tl;
  let waveTl;

  function build() {
    if (tl) tl.kill();
    if (waveTl) waveTl.kill();
    tl = gsap.timeline({ paused: true, onUpdate });
    tl.fromTo(params, { halfSize: anim.sizeStart }, { halfSize: anim.sizeEnd, duration: DURATION, ease: 'power2.out' }, 0);
    tl.fromTo(params, { iconWidth: anim.iconStart }, { iconWidth: anim.iconEnd, duration: DURATION, ease: 'power2.out' }, 0);
    tl.fromTo(
      params,
      { shapePow: anim.shapeStart },
      { shapePow: anim.shapeEnd, duration: anim.morphDuration, ease: 'power2.inOut' },
      anim.morphAt * DURATION,
    );
    // ior flattens out at the end
    tl.fromTo(
      params,
      { ior: anim.iorStart },
      { ior: anim.iorEnd, duration: DURATION * (1 - anim.iorFadeAt), ease: 'power2.inOut' },
      anim.iorFadeAt * DURATION,
    );
    // depth flattens on its own (earlier) schedule
    tl.fromTo(
      params,
      { depth: anim.depthStart },
      { depth: anim.depthEnd, duration: DURATION * (1 - anim.depthFadeAt), ease: 'power2.inOut' },
      anim.depthFadeAt * DURATION,
    );
    // hold on the last frame
    tl.set({}, {}, end());

    // ripple wave travels out and fades
    waveTl = gsap.timeline({ paused: true });
    waveTl.fromTo(wave.radius, { value: 0 }, { value: anim.ringEndRadius, duration: DURATION, ease: 'power2.out' }, 0);
    waveTl.fromTo(wave.amp, { value: 0 }, { value: anim.ringStrength, duration: 0.1, ease: 'power1.out' }, 0);
    waveTl.to(wave.amp, { value: 0, duration: DURATION - 0.6, ease: 'power1.out' }, 0.4);

    seek();
  }

  // Advance the clock (when playing) and apply the current time to both timelines
  function update(dt) {
    if (anim.playing) {
      anim.time += dt * anim.speed;
      if (anim.time > end()) {
        anim.time = end();
        anim.playing = false;
      }
    }
    seek();
  }

  function seek() {
    tl.time(anim.time, false);
    waveTl.time(THREE.MathUtils.clamp(anim.time - anim.waveOffset, 0, waveTl.duration()), false);
  }

  build();

  return { anim, end, build, update };
}
