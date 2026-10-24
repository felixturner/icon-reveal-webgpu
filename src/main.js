// Icon reveal: glass squircle with spectral refraction over the icon + ripple wave.
import * as THREE from 'three/webgpu';
import { pass } from 'three/tsl';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { params, modeSettings } from './params.js';
import { applyShape, sphereGeometry } from './glassShape.js';
import { createIconPlane } from './IconPlane.js';
import { createGlassMaterial } from './GlassMaterial.js';
import { wave, createWavePass } from './WavePass.js';
import { createTimeline } from './timeline.js';
import { createGUI } from './gui.js';
import { setupUI } from './ui.js';

// public/ asset root (differs on GitHub Pages)
const BASE = import.meta.env.BASE_URL;
const FOV = 20;

const renderer = new THREE.WebGPURenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#e5e6e8');
scene.environmentRotation.y = 1.44;
scene.environmentIntensity = 1; // scene.environment ignores material.envMapIntensity

// Camera framed so the view is 1 unit tall at z = 0
const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);
camera.position.z = 0.5 / Math.tan(THREE.MathUtils.degToRad(FOV / 2));

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.saveState();

applyShape(params);

// Icon plane + its backdrop scene (rendered to a target the glass samples).
// Rendering the backdrop from inside the glass material broke WebGPU's command
// encoder, so it's rendered before the main frame instead (see loop).
const icon = createIconPlane({ params, base: BASE, scene });
scene.add(icon.mesh);
const backdropTarget = new THREE.RenderTarget(1, 1, { type: THREE.HalfFloatType });

const glassMat = createGlassMaterial({ params, backdropTexture: backdropTarget.texture });
const glass = new THREE.Mesh(sphereGeometry, glassMat.material);
scene.add(glass);

// Post: ripple wave over the rendered frame
const postProcessing = new THREE.PostProcessing(renderer);
postProcessing.outputNode = createWavePass(pass(scene, camera).getTextureNode('output'));

const timeline = createTimeline({
  params,
  onUpdate: () => {
    applyShape(params);
    icon.updateIconSize();
    glassMat.syncRefraction();
  },
});

function applyMode() {
  const m = modeSettings[params.mode];
  params.dispersion = Math.abs(params.dispersion) * m.dispersionSign;
  glassMat.material.specularIntensity = m.specularIntensity;
  icon.uniforms.brightness.value = m.brightness;
  glassMat.syncRefraction();
  icon.applyLook();
}

const gui = createGUI({ params, scene, controls, icon, glass, glassMat, timeline, applyShape, applyMode });
const ui = setupUI({
  base: BASE,
  timeline,
  gui,
  onToggleMode: () => {
    params.mode = params.mode === 'WB' ? 'BW' : 'WB';
    applyMode();
  },
});

function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  const dpr = renderer.getPixelRatio();
  backdropTarget.setSize(window.innerWidth * dpr, window.innerHeight * dpr);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  wave.aspect.value = camera.aspect;
}
window.addEventListener('resize', resize);
resize();

renderer
  .init()
  .then(() => {
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    document.getElementById('loading').remove();
    const clock = new THREE.Clock();
    renderer.setAnimationLoop(() => {
      timeline.update(clock.getDelta());
      ui.update();
      controls.update();
      renderer.setRenderTarget(backdropTarget);
      renderer.render(icon.backdropScene, camera);
      renderer.setRenderTarget(null);
      postProcessing.render();
    });
  })
  .catch((err) => {
    console.error('WebGPU initialization failed:', err);
    document.getElementById('loading').textContent = 'WebGPU not supported.';
  });
