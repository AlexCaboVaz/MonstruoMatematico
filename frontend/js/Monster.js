import { Confetti } from './Confetti.js';
import { HUE_POR_COLOR } from './config.js';

/**
 * Monster ("Multidrake") — Sistema Global del Dragón
 * -----------------------------------------------------
 * Componente único y reutilizable para TODO el juego: es el sistema
 * global de reacciones que cualquier mundo (Sumas, Restas,
 * Multiplicaciones, División, Tablas de Multiplicar) usa para dar
 * feedback de acierto/fallo, sin duplicar lógica.
 *
 * Cuatro sprites cubren todos los estados del juego:
 *   - reposo.png    -> estado por defecto, mientras se piensa la respuesta
 *   - evolucion.png -> "feliz": acierto en cualquier mundo, o evolución de tabla
 *   - comiendo.png  -> específico de la Nevera Mágica (Tablas de Multiplicar)
 *   - enfadado.png  -> fallo en cualquier mundo
 *
 * Como solo hay UN diseño por sprite (no uno distinto por fase bebé/
 * infantil/joven/épica), el crecimiento entre fases de Tablas se
 * representa agrandando la misma ilustración.
 *
 * `adjuntarA(imgEl)` permite que distintas pantallas (el juego de
 * Tablas, el Mundo de la Suma, etc.) compartan la MISMA instancia —
 * y por tanto el mismo estado — del dragón, aunque cada pantalla
 * tenga su propio elemento <img> en el DOM (solo una está visible a
 * la vez). Así "el dragón" es de verdad un sistema global, no una
 * copia distinta por mundo.
 */

const ESCALA_POR_FASE = {
  bebe: 0.78,
  infantil: 0.92,
  joven: 1.08,
  epica: 1.25,
};

const SPRITES = {
  reposo: 'assets/multidrake-reposo.png',
  comiendo: 'assets/multidrake-comiendo.png',
  evolucion: 'assets/multidrake-evolucion.png',
  enfadado: 'assets/multidrake-enfadado.png',
};

export class Monster {
  constructor({ imgEl, confettiLayerEl }) {
    this._img = imgEl;
    this._confetti = new Confetti(confettiLayerEl);
    this._colorActual = 'verde';
    this._faseActual = 'bebe';
    this._timeoutReaccion = null;

    // Precarga los cuatro sprites para que no haya parpadeo/retardo
    // la primera vez que se muestra cada uno.
    Object.values(SPRITES).forEach((src) => {
      const precarga = new Image();
      precarga.src = src;
    });

    this._mostrarSprite(SPRITES.reposo);
  }

  /**
   * Traslada el dragón a un <img> distinto (de otra pantalla/mundo)
   * y repinta ahí mismo su estado actual (color, escala, sprite en
   * reposo). Es lo que hace posible que Sumas, Multiplicaciones y
   * Tablas compartan un único "dragón global" en vez de duplicarlo.
   */
  adjuntarA(nuevoImgEl) {
    clearTimeout(this._timeoutReaccion);
    this._img = nuevoImgEl;
    this._aplicarFiltroYEscala();
    this._mostrarSprite(SPRITES.reposo);
  }

  render({ colorBase, faseMonstruo }) {
    this._colorActual = colorBase;
    this._faseActual = faseMonstruo;
    this._aplicarFiltroYEscala();
    clearTimeout(this._timeoutReaccion);
    this._mostrarSprite(SPRITES.reposo);
  }

  /**
   * Reacción de ACIERTO, para cualquier mundo: Sumas, Multiplicaciones
   * y también cada carta correcta de Tablas de Multiplicar. Muestra
   * el sprite "feliz" un instante y vuelve sola a reposo.
   */
  reaccionarAcierto(duracionMs = 700) {
    this._reaccionTemporal(SPRITES.evolucion, 'monster-img-mordisco', duracionMs);
  }

  /**
   * Reacción de FALLO, para cualquier mundo.
   * `persistente: true` la usan las pruebas de respuesta numérica
   * (Sumas, Restas, Multiplicaciones, División): el dragón se queda
   * enfadado hasta que el niño acierte, porque debe reintentar la
   * MISMA pregunta. En Tablas de Multiplicar (`persistente: false`,
   * por defecto) la siguiente carta es otra pregunta distinta, así
   * que el enfado es solo un destello breve, igual que el acierto.
   */
  reaccionarFallo({ persistente = false, duracionMs = 700 } = {}) {
    clearTimeout(this._timeoutReaccion);
    this._img.classList.remove('monster-img-mordisco');
    void this._img.offsetWidth;
    this._img.classList.add('monster-img-enfadado');
    this._mostrarSprite(SPRITES.enfadado, { conservarClase: true });

    if (!persistente) {
      this._timeoutReaccion = setTimeout(() => {
        this._img.classList.remove('monster-img-enfadado');
        this._mostrarSprite(SPRITES.reposo);
      }, duracionMs);
    }
  }

  /** Sprite de "comiendo" un instante, específico de la Nevera Mágica. */
  reaccionarComida() {
    this._reaccionTemporal(SPRITES.comiendo, 'monster-img-mordisco', 900);
  }

  evolucionar({ colorBase, faseMonstruo, nivelActual, nivelMaximo }) {
    clearTimeout(this._timeoutReaccion);
    this._colorActual = colorBase;
    this._faseActual = faseMonstruo;
    this._aplicarFiltroYEscala();
    this._img.classList.remove('monster-img-enfadado');
    this._mostrarSprite(SPRITES.evolucion, { conservarClase: true });
    this._img.classList.add('monster-img-evolucion');

    this._confetti.lanzar(faseMonstruo, { esNivelMaximo: nivelActual >= nivelMaximo });

    // Tras el festejo, vuelve a reposo (el diálogo de "siguiente
    // paso" ya se muestra por separado, con su propio temporizador).
    this._timeoutReaccion = setTimeout(() => {
      this._img.classList.remove('monster-img-evolucion');
      this._mostrarSprite(SPRITES.reposo);
    }, 1400);
  }

  // -------------------------------------------------------------
  // Privado
  // -------------------------------------------------------------
  _reaccionTemporal(sprite, claseAnimacion, duracionMs) {
    clearTimeout(this._timeoutReaccion);
    this._img.classList.remove('monster-img-enfadado', claseAnimacion);
    void this._img.offsetWidth; // fuerza reflow para poder repetir la animación
    this._img.classList.add(claseAnimacion);
    this._mostrarSprite(sprite, { conservarClase: true });

    this._timeoutReaccion = setTimeout(() => {
      this._img.classList.remove(claseAnimacion);
      this._mostrarSprite(SPRITES.reposo);
    }, duracionMs);
  }

  _mostrarSprite(src, { conservarClase = false } = {}) {
    if (!conservarClase) {
      this._img.classList.remove('monster-img-mordisco', 'monster-img-evolucion', 'monster-img-enfadado');
    }
    this._img.src = src;
  }

  _aplicarFiltroYEscala() {
    this._img.style.filter = `hue-rotate(${HUE_POR_COLOR[this._colorActual] ?? '0deg'})`;
    this._img.style.transform = `scale(${ESCALA_POR_FASE[this._faseActual] ?? ESCALA_POR_FASE.bebe})`;
  }
}
