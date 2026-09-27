'use strict';

// Tabla de records local (localStorage['tetris-records']):
// { top: [{ name, score, lines, date }] (max 5, orden desc), bestCombo, maxLines }

const RECORDS_KEY = 'tetris-records';
const RECORDS_MAX_TOP = 5;
const RECORDS_NAME_MAX = 10;
const RECORDS_DEFAULT_NAME = 'Anónimo';

const recordsListEls = [
  document.getElementById('records-list'),
  document.getElementById('overlay-records-list'),
];
const bestComboEl = document.getElementById('best-combo');
const maxLinesEl = document.getElementById('max-lines');
const resetRecordsBtn = document.getElementById('reset-records-btn');
const overlayRecords = document.getElementById('overlay-records');
const overlayStats = document.getElementById('overlay-stats');
const nameForm = document.getElementById('name-form');
const nameInput = document.getElementById('player-name');
const nameHint = document.getElementById('name-hint');

let records = loadRecords();
let recordsPending = null;   // { score, lines } a la espera de nombre
let recordsHighlight = -1;   // fila del top a resaltar
let comboCurrent = 0;        // locks consecutivos con línea(s) en la partida actual
let comboGame = 0;           // mejor racha de la partida actual

function emptyRecords() {
  return { top: [], bestCombo: 0, maxLines: 0 };
}

function toCount(v) {
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
}

function loadRecords() {
  const result = emptyRecords();
  try {
    const data = JSON.parse(localStorage.getItem(RECORDS_KEY));
    if (!data || typeof data !== 'object') return result;
    if (Array.isArray(data.top)) {
      for (const e of data.top) {
        if (!e || typeof e !== 'object' || !Number.isFinite(e.score) || e.score <= 0) continue;
        result.top.push({
          name: (typeof e.name === 'string' ? e.name.trim().slice(0, RECORDS_NAME_MAX) : '') || RECORDS_DEFAULT_NAME,
          score: Math.floor(e.score),
          lines: toCount(e.lines),
          date: typeof e.date === 'string' ? e.date.slice(0, 10) : '',
        });
      }
      result.top.sort((a, b) => b.score - a.score);
      result.top.length = Math.min(result.top.length, RECORDS_MAX_TOP);
    }
    result.bestCombo = toCount(data.bestCombo);
    result.maxLines = toCount(data.maxLines);
  } catch (err) {
    return emptyRecords();
  }
  return result;
}

function saveRecords() {
  try {
    localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
  } catch (err) {
    // almacenamiento no disponible: los records viven solo en memoria
  }
}

// Relee el almacenamiento antes de modificar (por si hay otra pestaña abierta).
function refreshRecords() {
  try {
    if (localStorage.getItem(RECORDS_KEY) !== null) records = loadRecords();
  } catch (err) {
    // se mantiene la copia en memoria
  }
}

function recordsToday() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function recordsQualifies(finalScore) {
  if (finalScore <= 0) return false;
  return records.top.length < RECORDS_MAX_TOP || finalScore > records.top[RECORDS_MAX_TOP - 1].score;
}

function recordsRankFor(finalScore) {
  const idx = records.top.findIndex(e => e.score < finalScore);
  return idx === -1 ? records.top.length : idx;
}

function renderRecordsList(listEl) {
  listEl.textContent = '';
  for (let i = 0; i < RECORDS_MAX_TOP; i++) {
    const entry = records.top[i];
    const li = document.createElement('li');
    if (i === recordsHighlight) li.classList.add('current');
    const rank = document.createElement('span');
    rank.className = 'rec-rank';
    rank.textContent = `${i + 1}.`;
    const name = document.createElement('span');
    name.className = 'rec-name';
    const pts = document.createElement('span');
    pts.className = 'rec-score';
    if (entry) {
      name.textContent = entry.name;
      pts.textContent = entry.score.toLocaleString();
      li.title = `${entry.lines} líneas${entry.date ? ' · ' + entry.date : ''}`;
    } else {
      name.textContent = '---';
      pts.textContent = '-';
      li.classList.add('empty');
    }
    li.append(rank, name, pts);
    listEl.appendChild(li);
  }
}

function renderRecords() {
  recordsListEls.forEach(renderRecordsList);
  bestComboEl.textContent = records.bestCombo;
  maxLinesEl.textContent = records.maxLines;
  overlayStats.textContent = `Mejor combo: ${records.bestCombo} · Máx. líneas: ${records.maxLines}`;
}

// Llamado desde clearLines() en cada bloqueo de pieza.
function registerLock(cleared) {
  comboCurrent = cleared > 0 ? comboCurrent + 1 : 0;
  if (comboCurrent > comboGame) comboGame = comboCurrent;
}

// Llamado desde endGame(), con el overlay ya visible.
function showGameOverRecords(finalScore, finalLines) {
  refreshRecords();
  records.bestCombo = Math.max(records.bestCombo, comboGame);
  records.maxLines = Math.max(records.maxLines, finalLines);
  saveRecords();
  recordsHighlight = -1;
  recordsPending = null;

  if (recordsQualifies(finalScore)) {
    recordsPending = { score: finalScore, lines: finalLines };
    nameHint.textContent = `¡Nuevo record! Puesto #${recordsRankFor(finalScore) + 1}`;
    nameInput.value = '';
    nameForm.classList.remove('hidden');
  } else {
    nameForm.classList.add('hidden');
  }
  overlayRecords.classList.remove('hidden');
  renderRecords();
  // Con retraso para que teclas pulsadas al perder no acaben escritas en el campo.
  setTimeout(() => { if (recordsPending && document.activeElement !== nameInput) nameInput.focus(); }, 300);
}

function commitPendingRecord(rawName) {
  if (!recordsPending) return;
  const entry = {
    name: String(rawName || '').trim().slice(0, RECORDS_NAME_MAX) || RECORDS_DEFAULT_NAME,
    score: recordsPending.score,
    lines: recordsPending.lines,
    date: recordsToday(),
  };
  recordsPending = null;
  refreshRecords();
  const idx = recordsRankFor(entry.score);
  records.top.splice(idx, 0, entry);
  records.top.length = Math.min(records.top.length, RECORDS_MAX_TOP);
  recordsHighlight = idx < RECORDS_MAX_TOP ? idx : -1;
  saveRecords();
}

// Llamado desde init(): guarda el score pendiente (si no se puso nombre) y reinicia el combo.
function startRecordsRound() {
  commitPendingRecord(nameInput.value);
  comboCurrent = 0;
  comboGame = 0;
  recordsHighlight = -1;
  nameInput.blur();
  nameForm.classList.add('hidden');
  overlayRecords.classList.add('hidden');
  renderRecords();
}

nameForm.addEventListener('submit', e => {
  e.preventDefault();
  commitPendingRecord(nameInput.value);
  nameForm.classList.add('hidden');
  renderRecords();
  document.getElementById('restart-btn').focus();
});

// Que escribir en el campo (P, espacio, flechas...) no active atajos del juego.
nameInput.addEventListener('keydown', e => e.stopPropagation());
nameInput.addEventListener('input', () => {
  nameInput.value = nameInput.value.replace(/^\s+/, '');
});

// Si se cierra la pestaña con un score pendiente, se guarda con el nombre escrito (o "Anónimo").
window.addEventListener('pagehide', () => commitPendingRecord(nameInput.value));

resetRecordsBtn.addEventListener('click', () => {
  resetRecordsBtn.blur();
  if (!confirm('¿Resetear todos los records?')) return;
  records = emptyRecords();
  recordsHighlight = -1;
  saveRecords();
  renderRecords();
});

renderRecords();
