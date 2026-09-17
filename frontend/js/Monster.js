import { Confetti } from './Confetti.js';

/**
 * Monster ("Multidrake") — versión con ilustración real
 * -------------------------------------------------------
 * Renderiza a Multidrake como una imagen 2D (ilustración del propio
 * usuario), no como geometría 3D generada por código. Tres sprites
 * cubren los tres momentos del juego:
 *   - reposo.png    -> mientras se resuelven las cartas
 *   - comiendo.png  -> al recibir comida en la Nevera Mágica
 *   - evolucion.png -> al evolucionar de tabla (celebración)
 *
 * Como solo hay UN diseño (no uno distinto por cada fase bebé/
 * infantil/joven/épica), el crecimiento entre fases se representa
 * agrandando la misma ilustración — más simple y honesto que
 * fingir accesorios que no están dibujados.
 *
 * Mantiene la misma interfaz pública que las versiones anteriores
 * (`render`, `evolucionar`, `reaccionarComida`) para que `Shop` y
 * `main.js` no necesiten cambiar cómo la usan.
 */

const ESCALA_POR_FASE = {
  bebe: 0.78,
  infantil: 0.92,
  joven: 1.08,
  epica: 1.25,
};

// Rotación de matiz para reflejar el color de slime elegido en la
// creación sobre la MISMA ilustración (que está dibujada en verde).
const HUE_POR_COLOR = {
  verde: '0deg',
  azul: '150deg',
  rojo: '220deg',
  morado: '280deg',
};

const SPRITES = {
  reposo: 'assets/multidrake-reposo.png',
  comiendo: 'assets/multidrake-comiendo.png',
  evolucion: 'assets/multidrake-evolucion.png',
};

export class Monster {
  constructor({ imgEl, confettiLayerEl }) {
    this._img = imgEl;
    this._confetti = new Confetti(confettiLayerEl);
    this._colorActual = 'verde';
    this._timeoutComida = null;

    // Precarga los tres sprites para que no haya parpadeo/retardo la
    // primera vez que se muestra "comiendo" o "evolución".
    Object.values(SPRITES).forEach((src) => {
      const precarga = new Image();
      precarga.src = src;
    });

    this._img.src = SPRITES.reposo;
  }

  render({ colorBase, faseMonstruo }) {
    this._colorActual = colorBase;
    this._img.src = SPRITES.reposo;
    this._img.style.filter = `hue-rotate(${HUE_POR_COLOR[colorBase] ?? '0deg'})`;
    this._img.style.transform = `scale(${ESCALA_POR_FASE[faseMonstruo] ?? ESCALA_POR_FASE.bebe})`;
  }

  /** Sprite de "comiendo" un instante, y vuelve solo a reposo. */
  reaccionarComida() {
    this._img.src = SPRITES.comiendo;
    this._img.classList.add('monster-img-mordisco');

    clearTimeout(this._timeoutComida);
    this._timeoutComida = setTimeout(() => {
      this._img.src = SPRITES.reposo;
      this._img.classList.remove('monster-img-mordisco');
    }, 900);
  }

  evolucionar({ colorBase, faseMonstruo, nivelActual, nivelMaximo }) {
    clearTimeout(this._timeoutComida);
    this._colorActual = colorBase;
    this._img.style.filter = `hue-rotate(${HUE_POR_COLOR[colorBase] ?? '0deg'})`;
    this._img.style.transform = `scale(${ESCALA_POR_FASE[faseMonstruo] ?? ESCALA_POR_FASE.bebe})`;
    this._img.src = SPRITES.evolucion;
    this._img.classList.add('monster-img-evolucion');

    this._confetti.lanzar(faseMonstruo, { esNivelMaximo: nivelActual >= nivelMaximo });

    // Tras el festejo, vuelve a reposo (el diálogo de "siguiente
    // paso" ya se muestra por separado, con su propio temporizador).
    setTimeout(() => {
      this._img.src = SPRITES.reposo;
      this._img.classList.remove('monster-img-evolucion');
    }, 1400);
  }
}
