'use strict';

// Menú de pausa: Reanudar, Reiniciar, Ver controles y Nivel inicial.
// Se carga antes de game.js; solo usa globals de game.js dentro de handlers
// (togglePause, init), nunca en tiempo de carga.

const START_LEVEL_KEY = 'tetris-start-level';
const MIN_START_LEVEL = 1;
const MAX_START_LEVEL = 10;

const pauseMenu = document.getElementById('pause-menu');
const pauseMain = document.getElementById('pause-main');
const pauseControls = document.getElementById('pause-controls');
const resumeBtn = document.getElementById('resume-btn');
const pauseRestartBtn = document.getElementById('pause-restart-btn');
const controlsBtn = document.getElementById('controls-btn');
const controlsBackBtn = document.getElementById('controls-back-btn');
const startLevelSelect = document.getElementById('start-level');

function clampStartLevel(value) {
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) return MIN_START_LEVEL;
  return Math.min(MAX_START_LEVEL, Math.max(MIN_START_LEVEL, n));
}

function loadStartLevel() {
  try {
    return clampStartLevel(localStorage.getItem(START_LEVEL_KEY));
  } catch (err) {
    return MIN_START_LEVEL;
  }
}

function saveStartLevel(value) {
  try {
    localStorage.setItem(START_LEVEL_KEY, String(value));
  } catch (err) {
    // almacenamiento no disponible: el nivel solo vale para esta sesión
  }
}

let startLevel = loadStartLevel();

function showPauseView(showControls) {
  pauseMain.classList.toggle('hidden', showControls);
  pauseControls.classList.toggle('hidden', !showControls);
  (showControls ? controlsBackBtn : resumeBtn).focus();
}

function showPauseMenu() {
  startLevelSelect.value = String(startLevel);
  pauseMenu.classList.remove('hidden');
  showPauseView(false);
}

function hidePauseMenu() {
  pauseMenu.classList.add('hidden');
  // quitar el foco evita que Space/Enter reactiven un botón al volver al juego
  if (pauseMenu.contains(document.activeElement)) document.activeElement.blur();
}

// Esc dentro de "Ver controles" vuelve al menú en lugar de reanudar.
function closePauseSubview() {
  if (pauseControls.classList.contains('hidden')) return false;
  showPauseView(false);
  return true;
}

// Mantiene Tab dentro del menú mientras está abierto (aria-modal).
document.addEventListener('keydown', e => {
  if (e.code !== 'Tab' || pauseMenu.classList.contains('hidden')) return;
  const items = Array.from(pauseMenu.querySelectorAll('button, select'))
    .filter(el => el.offsetParent !== null);
  if (!items.length) return;
  const idx = items.indexOf(document.activeElement);
  const step = e.shiftKey ? -1 : 1;
  e.preventDefault();
  items[(idx + step + items.length) % items.length].focus();
});

for (let lv = MIN_START_LEVEL; lv <= MAX_START_LEVEL; lv++) {
  const opt = document.createElement('option');
  opt.value = String(lv);
  opt.textContent = String(lv);
  startLevelSelect.appendChild(opt);
}
startLevelSelect.value = String(startLevel);

startLevelSelect.addEventListener('change', () => {
  startLevel = clampStartLevel(startLevelSelect.value);
  saveStartLevel(startLevel);
});

resumeBtn.addEventListener('click', () => togglePause());
pauseRestartBtn.addEventListener('click', () => init());
controlsBtn.addEventListener('click', () => showPauseView(true));
controlsBackBtn.addEventListener('click', () => showPauseView(false));
