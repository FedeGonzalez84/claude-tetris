'use strict';

// Skins visuales. Se carga ANTES de game.js: solo define datos y funciones
// de dibujo; game.js delega en currentSkin().drawBlock().

const SKIN_STORAGE_KEY = 'tetris-skin';
const DEFAULT_SKIN = 'retro';

// ---- Helpers de color / trazado ----

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgba(hex, a) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

// amt > 0 mezcla con blanco, amt < 0 mezcla con negro
function shade(hex, amt) {
  const target = amt < 0 ? 0 : 255;
  const t = Math.abs(amt);
  const [r, g, b] = hexToRgb(hex).map(v => Math.round(v + (target - v) * t));
  return `rgb(${r},${g},${b})`;
}

function roundedRectPath(context, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  context.beginPath();
  context.moveTo(x + rad, y);
  context.arcTo(x + w, y, x + w, y + h, rad);
  context.arcTo(x + w, y + h, x, y + h, rad);
  context.arcTo(x, y + h, x, y, rad);
  context.arcTo(x, y, x + w, y, rad);
  context.closePath();
}

// ---- Skins ----

const SKINS = {
  // Cuadrados planos: comportamiento original
  retro: {
    label: 'RETRO',
    colors: [
      null,
      '#4dd0e1', // I - cyan
      '#ffd54f', // O - yellow
      '#ba68c8', // T - purple
      '#81c784', // S - green
      '#e57373', // Z - red
      '#90caf9', // J - pale blue
      '#ffb74d', // L - orange
      '#9e9e9e', // N - tuerca (gris metálico)
    ],
    drawBlock(context, x, y, colorIndex, size, alpha) {
      const color = this.colors[colorIndex];
      context.globalAlpha = alpha ?? 1;
      context.fillStyle = color;
      context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
      // highlight
      context.fillStyle = 'rgba(255,255,255,0.12)';
      context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
      context.globalAlpha = 1;
    },
  },

  // Fondo negro, bloques con borde brillante y resplandor (shadowBlur)
  neon: {
    label: 'NEON',
    colors: [
      null,
      '#00f0ff', // I
      '#fff200', // O
      '#d500ff', // T
      '#39ff14', // S
      '#ff073a', // Z
      '#4d6dff', // J
      '#ff9100', // L
      '#c8d0e0', // N
    ],
    drawBlock(context, x, y, colorIndex, size, alpha) {
      const color = this.colors[colorIndex];
      const px = x * size + 3;
      const py = y * size + 3;
      const s = size - 6;
      context.globalAlpha = alpha ?? 1;
      context.shadowColor = color;
      context.shadowBlur = Math.round(size * 0.5);
      context.fillStyle = rgba(color, 0.22);
      context.fillRect(px, py, s, s);
      context.strokeStyle = color;
      context.lineWidth = 2;
      context.strokeRect(px, py, s, s);
      // siempre limpiar el resplandor para no contaminar otros dibujos
      context.shadowBlur = 0;
      context.shadowColor = 'transparent';
      context.globalAlpha = 1;
    },
  },

  // Colores suaves y esquinas redondeadas
  pastel: {
    label: 'PASTEL',
    colors: [
      null,
      '#a8e6ef', // I
      '#fff0a6', // O
      '#d8b9f0', // T
      '#b4e8bf', // S
      '#f7b3b3', // Z
      '#b7d3f7', // J
      '#ffd2a4', // L
      '#cfd4dc', // N
    ],
    drawBlock(context, x, y, colorIndex, size, alpha) {
      const color = this.colors[colorIndex];
      const px = x * size + 1.5;
      const py = y * size + 1.5;
      const s = size - 3;
      const r = size * 0.28;
      context.globalAlpha = alpha ?? 1;
      roundedRectPath(context, px, py, s, s, r);
      context.fillStyle = color;
      context.fill();
      context.lineWidth = 1.5;
      context.strokeStyle = shade(color, -0.22);
      context.stroke();
      // brillo suave arriba
      roundedRectPath(context, px + s * 0.14, py + s * 0.1, s * 0.72, s * 0.28, r * 0.6);
      context.fillStyle = 'rgba(255,255,255,0.4)';
      context.fill();
      context.globalAlpha = 1;
    },
  },

  // Textura de pixeles claros/oscuros sobre cada bloque (rejilla 7x7)
  pixel: {
    label: 'PIXEL',
    colors: [
      null,
      '#29adff', // I
      '#ffec27', // O
      '#b04fd6', // T
      '#00e436', // S
      '#ff004d', // Z
      '#3b5dc9', // J
      '#ffa300', // L
      '#83769c', // N
    ],
    drawBlock(context, x, y, colorIndex, size, alpha) {
      const color = this.colors[colorIndex];
      const N = 7;
      const p = Math.max(1, Math.floor((size - 2) / N));
      const ox = x * size + Math.floor((size - N * p) / 2);
      const oy = y * size + Math.floor((size - N * p) / 2);
      const light = 'rgba(255,255,255,0.5)';
      const dark = 'rgba(0,0,0,0.4)';
      context.globalAlpha = alpha ?? 1;
      context.fillStyle = color;
      context.fillRect(ox, oy, N * p, N * p);
      for (let j = 0; j < N; j++) {
        for (let i = 0; i < N; i++) {
          let fill = null;
          if (j === 0 || i === 0) fill = light;              // borde superior/izquierdo
          else if (j === N - 1 || i === N - 1) fill = dark;  // borde inferior/derecho
          else if ((i === 1 && j === 1) || (i === 2 && j === 1) || (i === 1 && j === 2)) fill = light;
          else if (i === N - 2 && j === N - 2) fill = dark;
          else if ((i + j) % 2 === 0) fill = 'rgba(0,0,0,0.14)'; // tramado
          if (fill) {
            context.fillStyle = fill;
            context.fillRect(ox + i * p, oy + j * p, p, p);
          }
        }
      }
      context.globalAlpha = 1;
    },
  },
};

let currentSkinName = DEFAULT_SKIN;

function currentSkin() {
  return SKINS[currentSkinName];
}

function isValidSkin(name) {
  return typeof name === 'string' && Object.prototype.hasOwnProperty.call(SKINS, name);
}

// Cambia el skin (estado + DOM). No redibuja: ver redrawForSkin().
function setSkin(name, persist) {
  currentSkinName = isValidSkin(name) ? name : DEFAULT_SKIN;
  document.body.dataset.skin = currentSkinName;
  const select = document.getElementById('skin-select');
  if (select) select.value = currentSkinName;
  if (persist) {
    try {
      localStorage.setItem(SKIN_STORAGE_KEY, currentSkinName);
    } catch (e) { /* almacenamiento no disponible */ }
  }
}

// Redibuja tablero y preview con el skin/tema actuales, tambien en pausa o
// game over (allí no corre el loop; en game over no se dibuja la pieza actual
// porque colisiona con el tablero, ver commit 31a10cd).
function redrawForSkin() {
  if (gameOver) drawBoard();
  else draw();
  drawNext();
}

function loadSavedSkin() {
  try {
    const saved = localStorage.getItem(SKIN_STORAGE_KEY);
    return isValidSkin(saved) ? saved : DEFAULT_SKIN;
  } catch (e) {
    return DEFAULT_SKIN;
  }
}

(function initSkinSelector() {
  const select = document.getElementById('skin-select');
  if (select) {
    for (const name of Object.keys(SKINS)) {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = SKINS[name].label;
      select.appendChild(option);
    }
    select.addEventListener('change', () => {
      setSkin(select.value, true);
      redrawForSkin();
      select.blur(); // que las flechas/espacio sigan controlando el juego
    });
    // Con el foco en el selector, las flechas/espacio no deben cambiar el skin
    select.addEventListener('keydown', e => {
      if (e.code.startsWith('Arrow') || e.code === 'Space') {
        e.preventDefault();
        select.blur();
      }
    });
  }
  setSkin(loadSavedSkin(), false);
})();
