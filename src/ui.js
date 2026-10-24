// Page UI: Play button + sound, 0-1 timebar, space to pause, top bar buttons.
export function setupUI({ base, timeline, gui, onToggleMode }) {
  const { anim, end } = timeline;
  const sound = new Audio(base + 'sounds/heal2.mp3');

  // Play (button or click on the icon): always restarts the timeline from 0 with the sound
  const play = () => {
    anim.time = 0;
    anim.playing = true;
    sound.currentTime = 0;
    sound.play();
  };
  document.getElementById('play').addEventListener('click', play);
  document.getElementById('play-area').addEventListener('click', play);

  // Space = pause / resume
  window.addEventListener('keydown', (e) => {
    if (e.code !== 'Space') return;
    e.preventDefault();
    if (anim.time >= end()) return;
    anim.playing = !anim.playing;
    if (anim.playing) sound.play();
    else sound.pause();
  });

  // 0-1 timebar (fraction of anim + hold)
  const timebar = document.getElementById('timebar');
  timebar.addEventListener('input', () => {
    anim.time = Number(timebar.value) * end();
  });

  // Top bar
  document.getElementById('toggle-bw').addEventListener('click', () => {
    onToggleMode();
    gui.controllersRecursive().forEach((c) => c.updateDisplay());
  });
  document.getElementById('toggle-gui').addEventListener('click', () => gui.show(gui._hidden));

  // call every frame to keep the timebar in sync
  return {
    update() {
      timebar.value = anim.time / end();
    },
  };
}
