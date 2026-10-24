// lil-gui panel (hidden by default, toggled by the GUI button)
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { DURATION } from './timeline.js';
import { wave } from './WavePass.js';

export function createGUI({ params, scene, controls, icon, glass, glassMat, timeline, applyShape, applyMode }) {
  const { anim, build } = timeline;
  const u = icon.uniforms;
  const shapeChange = () => applyShape(params);

  const gui = new GUI();
  gui.hide();

  gui.add(params, 'mode', ['WB', 'BW']).onChange(applyMode);
  gui.add({ resetView: () => controls.reset() }, 'resetView');

  const iconFolder = gui.addFolder('Icon');
  iconFolder.add(params, 'iconWidth', 0.05, 2, 0.01).onChange(icon.updateIconSize).listen();
  iconFolder.add(u.iconOffset.value, 'x', -0.5, 0.5, 0.001).name('iconX');
  iconFolder.add(u.iconOffset.value, 'y', -0.5, 0.5, 0.001).name('iconY');
  iconFolder.add(u.maskIcon, 'value', 0, 1, 1).name('maskIcon');
  iconFolder.add(u.shadow, 'value', 0, 1, 0.001).name('shadow');
  iconFolder.add(u.shadowWidth, 'value', 0.01, 1, 0.001).name('shadowWidth');
  iconFolder.add(u.brightness, 'value', -1, 1, 0.001).name('brightness').listen();
  iconFolder.add(u.contrast, 'value', 0, 3, 0.001).name('contrast');

  const shapeFolder = gui.addFolder('Shape');
  shapeFolder.add(params, 'halfSize', 0.05, 0.5, 0.001).onChange(shapeChange).listen();
  shapeFolder.add(params, 'depth', 0, 0.2, 0.001).onChange(shapeChange).listen();
  shapeFolder.add(params, 'shapePow', 2, 10, 0.01).onChange(shapeChange).listen();
  shapeFolder.add(params, 'edgeRound', 0.05, 1, 0.01).onChange(shapeChange);

  const { material, applyRefractionMode, syncRefraction } = glassMat;
  const glassFolder = gui.addFolder('Glass');
  glassFolder.add(glass, 'visible').name('showGlass');
  glassFolder.add(params, 'refraction', ['custom', 'three']).onChange(applyRefractionMode);
  glassFolder.add(params, 'ior', 1, 2.33, 0.001).onChange(syncRefraction).listen();
  glassFolder.add(params, 'thickness', 0, 2, 0.001).onChange(syncRefraction);
  glassFolder.add(params, 'dispersion', -100, 100, 0.01).onChange(syncRefraction).listen();
  const custom = (key, min, max, step) =>
    glassFolder.add(params, key, min, max, step).name(`${key} (custom)`).onChange(syncRefraction);
  custom('hue', -1, 1, 0.001);
  custom('spectrumRange', 0, 1.5, 0.001);
  custom('bandSharpness', 0.5, 12, 0.01);
  custom('saturation', 0, 4, 0.01);
  custom('hueDirAmount', -1, 1, 0.001);
  custom('hueDirAngle', -180, 180, 1);
  custom('edgeThin', 0, 1, 0.001);
  custom('fresnel', 0, 1, 0.001);
  glassFolder.add(material, 'roughness', 0, 1, 0.001);
  glassFolder.add(material, 'clearcoat', 0, 1, 0.01);
  glassFolder.add(material, 'clearcoatRoughness', 0, 1, 0.01);
  glassFolder.add(material, 'specularIntensity', 0, 1, 0.01).listen();
  glassFolder.add(scene, 'environmentIntensity', 0, 5, 0.01).name('envIntensity');
  glassFolder.add(scene.environmentRotation, 'y', -Math.PI, Math.PI, 0.01).name('envRotateY');

  const animFolder = gui.addFolder('Animation');
  animFolder.add(anim, 'speed', 0.05, 3, 0.01);
  animFolder.add(anim, 'time', 0, DURATION + 3, 0.001).listen();
  const key = (k, min, max, step) => animFolder.add(anim, k, min, max, step).onChange(build);
  key('sizeStart', 0.01, 0.5, 0.001);
  key('sizeEnd', 0.01, 0.5, 0.001);
  key('iconStart', 0.05, 2, 0.001);
  key('iconEnd', 0.05, 2, 0.001);
  key('shapeStart', 2, 10, 0.01);
  key('shapeEnd', 2, 10, 0.01);
  key('morphAt', 0, 1, 0.001);
  key('morphDuration', 0.01, 2, 0.01);
  key('iorStart', 1, 2.33, 0.001);
  key('iorEnd', 1, 2.33, 0.001);
  key('iorFadeAt', 0, 1, 0.001);
  key('depthStart', 0, 0.2, 0.001);
  key('depthEnd', 0, 0.2, 0.001);
  key('depthFadeAt', 0, 1, 0.001);
  animFolder.add(anim, 'hold', 0, 3, 0.01);

  const waveFolder = gui.addFolder('Wave');
  waveFolder.add(anim, 'ringStrength', 0, 0.2, 0.001).name('strength').onChange(build);
  waveFolder.add(anim, 'ringEndRadius', 0.1, 3, 0.01).name('endRadius').onChange(build);
  waveFolder.add(anim, 'waveOffset', -2, 2, 0.01).name('offset');
  waveFolder.add(wave.freq, 'value', 1, 150, 0.1).name('frequency');
  waveFolder.add(wave.decay, 'value', 0, 30, 0.01).name('spatialDecay');
  waveFolder.add(wave.refract, 'value', -3, 3, 0.01).name('refract');
  waveFolder.add(wave.dispersion, 'value', 0, 1, 0.001).name('dispersion');
  waveFolder.add(wave.shade, 'value', 0, 2, 0.01).name('shade');
  waveFolder.add({ show: true }, 'show').name('showWave').onChange((v) => (wave.show.value = v ? 1 : 0));
  waveFolder.add({ debug: false }, 'debug').onChange((v) => (wave.debug.value = v ? 1 : 0));

  return gui;
}
