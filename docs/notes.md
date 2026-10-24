# Icon Reveal WebGPU — notes

## Goal

Recreate the water-drop ripple refraction + chromatic split from a music app logo animation as a WebGPU shader (three.js TSL).

- 4 variants in the ref video: text logo / icon × white bg / black bg.
- **Start with: text logo on white.**

## Source

- Post: https://bsky.app/profile/storm.bsky.social/post/3myjprfxek22z
- Post: https://x.com/avstorm/status/2112930113654280449
- Assets in `public/`: `icon-wb/bw.png` (wb = black on white, bw = inverted), icon bg levelled to pure white.

## Effect breakdown (from frames)

1. **Lens / droplet** — a circular bulge appears at center and expands. Inside it the whole logo is heavily minified + swirled (fisheye, looks like looking through a water drop).
2. **Rim** — thick bright specular edge on the lens, soft grey shadow just outside it. Content crossing the rim gets radially smeared.
3. **Chromatic split** — strong spectral dispersion (blue/cyan, magenta, red) along the smear direction, strongest where displacement is largest (rim + text ends).
4. **Settle** — lens expands past the logo, strength decays, faint concentric ripple rings stay in the bg shading; text ends keep a horizontal RGB smear for a while then resolve to a clean logo.

## Approach

`npm run dev`, single page. Code in `src/`: `main.js` (renderer, scene, loop, wiring), `params.js` (tuned defaults + WB/BW presets), `glassShape.js` (GPU superellipsoid), `IconPlane.js` (icon plane + backdrop scene), `GlassMaterial.js` (physical material + spectral refraction), `WavePass.js` (ripple post pass), `timeline.js` (GSAP), `gui.js`, `ui.js` (Play, timebar, top bar). An earlier 2D-only version (one fullscreen shader with a fake height field) was dropped in favour of this.

Real glass block over a flat unlit icon plane, perspective camera framed 1 unit tall at z=0, orbit controls.
- **Shape:** superellipsoid built in the vertex shader from a sphere's uv grid (`positionNode` + analytic `normalNode`), so `halfSize`, `depth`, `shapePow`, `edgeRound` are live uniforms.
- **Material:** `MeshPhysicalNodeMaterial` with black diffuse + no transmission → output = reflections only (roughness, specularIntensity, scene env via `RoomEnvironment`). Our refraction is added in `outputNode`.
- **Custom spectral refraction** (replaces three's 3-sample R/G/B dispersion, which gives 3 hard copies):
  - 16 taps, each refracts the view ray with ior ± spread (`(ior-1)·0.025·dispersion`, same scale as three), projects the exit point to screen, samples the icon backdrop.
  - Rainbow palette per tap: `spectrumRange 0.667` = R/G/B at low/mid/high ior (matches three's colours). `bandSharpness`, `saturation`, `hue`, directional hue (`hueDirAmount/Angle`).
  - **Negative dispersion** puts blue inside / red on the outer edge, like the ref.
  - `edgeThin`: thickness × n·v, so the rim doesn't sample far-off bits of the icon (fixed an icon outline around the edge).
  - `fresnel` 0: keep refraction at grazing angles (Fresnel swap to the mid-grey env darkened the edges).
- **Backdrop:** icon plane rendered to its own render target before the main frame; glass samples that.
- **Icon:** masked to the block footprint (`maskIcon`), x/y offset, WB/BW.
- **Post:** ripple wave pass (circular sine ring, refracts the whole frame, small RGB split + shade).
- **Timeline (4s + 1s hold, speed 2):** size 0.05→0.35 (`power2.out`); circle→squircle at 15% over 0.5s; icon width 0.55→0.4; depth → 0 from 25%, ior → 1 from 50%; ripple travels out and fades (own timeline, `waveOffset`). Play restarts it with `heal2.mp3`.

### Gotchas (three r180 WebGPU)
- **Textures:** load as `SRGBColorSpace` — `NoColorSpace` washed out the greys.
- **Transmission blending:** three flags transmission materials `transparent`, which blended the glass with the plane behind → white ghost of the icon. Fix: `blending = NoBlending`.
- **Env intensity:** `envMapIntensity` is ignored when using `scene.environment`; use `scene.environmentIntensity`.
- **No nested renders:** don't render a pass/blur from inside a material used in another pass (e.g. a gaussian-blurred backdrop sampled by the glass) → "Parent encoder is already finished". Render it beforehand, or only blur a pass texture in the post chain.

Possible later upgrade: real wave-equation heightfield sim (ping-pong compute) instead of the analytic ring, for click-to-drop interaction.

## Refs

### Physics-based water refraction
- Evan Wallace — WebGL Water (heightfield sim, raytraced refraction, caustics): https://madebyevan.com/webgl-water/
- jeantimex — three.js port of WebGL Water (WebGPU/three, caustics, ray-traced refraction): https://github.com/jeantimex/threejs-water/ · demo https://jeantimex.github.io/threejs-water/ · article https://80.lv/articles/real-time-water-simulation-with-three-js
- three.js official `webgpu_compute_water` (compute heightfield, mouse disturb): https://threejs.org/examples/webgpu_compute_water.html
- Amanda Ghassaei gpu-io 2D wave equation + caustics: https://apps.amandaghassaei.com/gpu-io/examples/wave2d/
- Pngine WebGPU wave sim (ping-pong wave equation, good data-layout ref): https://hugodaniel.com/pages/pngine/docs/samples/wave-simulation/

### Shader / screen-space refs
- three.js `ChromaticAberrationNode` (TSL): https://threejs.org/docs/pages/ChromaticAberrationNode.html
- Codrops — refraction + dispersion through glass (three.js): https://tympanus.net/codrops/?p=89382
- tslfx (TSL effects collection): https://github.com/verekia/tslfx
- Shadertoy — rain drop ripples (Zavie): https://www.shadertoy.com/view/ldfyzl
- Shadertoy — refraction in water: https://www.shadertoy.com/view/Ms23zm
- Liquid glass in WebGL: https://dev.to/_carson_ye_/where-webgl-meets-liquid-glass-401l

### Glass refraction (3D / physical)
- pmndrs "router transitions" sandbox — drei `MeshTransmissionMaterial` (`backside`, `backsideThickness`, `thickness`) + Environment/Lightformer for rim highlights, bloom, contact shadows: https://codesandbox.io/p/sandbox/router-transitions-4j2q2. Ref only — no React/pmndrs.
- Codrops 2021 — transparent glass & plastic with `MeshPhysicalMaterial` (transmission, ior, thickness, roughness, clearcoat, normal map, HDR env, bloom): https://tympanus.net/codrops/2021/10/27/creating-the-effect-of-transparent-glass-and-plastic-in-three-js/ · code: https://github.com/kellymilligan/codrops-oct-2021-final
- Codrops 2025 — warping 3D text inside a glass torus (drei transmission material = shaders layered on `MeshPhysicalMaterial`): https://tympanus.net/codrops/2025/03/13/warping-3d-text-inside-a-glass-torus/
  - Torus `MeshTransmissionMaterial` settings (from article screenshot): `transmission 1, roughness 0, thickness 0.9, ior 1.068, chromaticAberration 0, anisotropy 0, distortion 0.5, distortionScale 0.5, temporalDistortion 0.5, clearcoat 1, attenuationDistance 0.5, attenuationColor #fff, color #b4a6ff, samples 10, resolution 2048, backside false, background #000`. Vanilla equivalents: transmission/roughness/thickness/ior/clearcoat/attenuation* are plain `MeshPhysicalMaterial`; distortion/temporalDistortion/chromaticAberration/samples are drei-only (noise-warped, multi-sample transmission lookup) → would need custom TSL.
- Codrops 2024 — 3D text distortion with R3F (`MeshTransmissionMaterial` on text ring): https://tympanus.net/codrops/2024/05/08/exploring-a-3d-text-distortion-effect-with-react-three-fiber/
- three r180 `MeshPhysicalNodeMaterial` supports transmission + `dispersion` on WebGPU.
