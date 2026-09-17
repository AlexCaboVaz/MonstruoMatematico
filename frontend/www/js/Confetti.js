/**
 * Confetti (versión 2D, DOM/CSS)
 * --------------------------------
 * Genera piezas de confeti como elementos <span> con emojis,
 * animadas por CSS (@keyframes confetti-fall en styles.css), dentro
 * de una capa fija que cubre toda la pantalla. Sin dependencias
 * externas ni lienzo: encaja con el resto de la interfaz, que ahora
 * es 100% DOM/CSS (ilustraciones + HTML), no una escena 3D aparte.
 */
const CONFIGURACION_POR_FASE = {
  bebe: { cantidad: 16, emojis: ['🎉'], duracionMs: 1100, dispersión: 0.4 },
  infantil: { cantidad: 28, emojis: ['🎊', '✨'], duracionMs: 1400, dispersión: 0.7 },
  joven: { cantidad: 55, emojis: ['⭐', '🌙', '✨'], duracionMs: 2000, dispersión: 1.1 },
  epica: { cantidad: 90, emojis: ['✨', '🌟', '🥇', '💛'], duracionMs: 2600, dispersión: 1.4 },
};

const CONFIGURACION_NIVEL_MAXIMO = {
  cantidad: 130,
  emojis: ['✨', '🌟', '🥇', '💛'],
  duracionMs: 2800,
  dispersión: 1.5,
};

export class Confetti {
  constructor(layerElement) {
    this._layer = layerElement;
  }

  lanzar(fase, { esNivelMaximo = false } = {}) {
    const config = esNivelMaximo
      ? CONFIGURACION_NIVEL_MAXIMO
      : (CONFIGURACION_POR_FASE[fase] ?? CONFIGURACION_POR_FASE.bebe);
    this._explosion(config);
  }

  _explosion({ cantidad, emojis, duracionMs, dispersión }) {
    const anchoPantalla = window.innerWidth;

    for (let i = 0; i < cantidad; i += 1) {
      const pieza = document.createElement('span');
      pieza.className = 'confetti-piece';
      pieza.textContent = emojis[Math.floor(Math.random() * emojis.length)];

      const origenX = anchoPantalla / 2 + (Math.random() - 0.5) * anchoPantalla * dispersión;
      const caida = 500 + Math.random() * 400;
      const giro = 180 + Math.random() * 540;
      const retraso = Math.random() * (duracionMs * 0.3);
      const duracionPieza = duracionMs * (0.7 + Math.random() * 0.5);

      pieza.style.left = `${origenX}px`;
      pieza.style.fontSize = `${16 + Math.random() * 18}px`;
      pieza.style.setProperty('--fall-distance', `${caida}px`);
      pieza.style.setProperty('--spin', `${giro}deg`);
      pieza.style.animationDuration = `${duracionPieza}ms`;
      pieza.style.animationDelay = `${retraso}ms`;

      this._layer.appendChild(pieza);
      setTimeout(() => pieza.remove(), duracionPieza + retraso + 100);
    }
  }
}
