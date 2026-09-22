import { AudioFx } from './AudioFx.js';

const NIVELES = [
  { clave: 'facil', etiqueta: 'Fácil' },
  { clave: 'medio', etiqueta: 'Medio' },
  { clave: 'dificil', etiqueta: 'Difícil' },
];

/**
 * MathWorld
 * ---------
 * Motor genérico para cualquier mundo de "20 operaciones con
 * respuesta numérica" (Sumas, Multiplicaciones libres, y en la
 * próxima fase Restas y Divisiones). Una única instancia se
 * RECONFIGURA con `iniciar(config)` para cada mundo — no hace falta
 * crear una clase nueva por mundo, solo pasarle su propio generador
 * de operaciones y sus propias imágenes de isla.
 *
 * config = {
 *   titulo: 'Mundo de la Suma',
 *   imagenesNivel: { facil, medio, dificil },   // rutas de imagen
 *   generador: (nivel) => [{ a, b, operador, respuesta }, ...20],
 *   onVolver: () => void,                        // adónde volver al terminar
 * }
 *
 * No sabe nada de HTTP ni de la base de datos: es una mecánica 100%
 * local (generar, preguntar, comprobar), separada a propósito del
 * mundo de Tablas de Multiplicar (que sí usa el backend para el
 * repaso espaciado y el sistema de estrellas).
 */
export class MathWorld {
  constructor({ elementos, dragon, catchGame }) {
    this._el = elementos;
    this._dragon = dragon;
    this._catchGame = catchGame;
    this._audio = new AudioFx();

    this._operaciones = [];
    this._indice = 0;
    this._config = null;
    this._procesando = false;

    this._el.btnVolver.addEventListener('click', () => this._volver());
    this._el.btnComprobar.addEventListener('click', () => this._comprobar());
    this._el.input.addEventListener('keydown', (evento) => {
      if (evento.key === 'Enter') this._comprobar();
    });
  }

  /** Muestra la selección de nivel para el mundo indicado por `config`. */
  iniciar(config) {
    this._config = config;
    this._el.screen.hidden = false;
    this._el.levelSelect.hidden = false;
    this._el.operationView.hidden = true;
    this._el.levelComplete.hidden = true;
    this._el.worldTitle.textContent = config.titulo;

    this._el.levelGrid.innerHTML = '';
    NIVELES.forEach(({ clave, etiqueta }) => {
      const tarjeta = document.createElement('button');
      tarjeta.type = 'button';
      tarjeta.className = 'math-level-card';

      const imagen = document.createElement('img');
      imagen.className = 'math-level-card-img';
      imagen.src = config.imagenesNivel[clave];
      imagen.alt = `Isla ${etiqueta}`;

      const etiquetaEl = document.createElement('span');
      etiquetaEl.className = 'math-level-card-label';
      etiquetaEl.textContent = etiqueta;

      tarjeta.appendChild(imagen);
      tarjeta.appendChild(etiquetaEl);
      tarjeta.addEventListener('click', () => this._iniciarNivel(clave));
      this._el.levelGrid.appendChild(tarjeta);
    });
  }

  _iniciarNivel(nivel) {
    this._operaciones = this._config.generador(nivel);
    this._indice = 0;
    this._procesando = false;

    this._dragon.adjuntarA(this._el.dragonImg);

    this._el.levelSelect.hidden = true;
    this._el.levelComplete.hidden = true;
    this._el.operationView.hidden = false;
    this._pintarOperacionActual();
  }

  _pintarOperacionActual() {
    const operacion = this._operaciones[this._indice];
    this._el.progress.textContent = `${this._indice + 1} / ${this._operaciones.length}`;
    this._el.operationText.textContent = `${operacion.a} ${operacion.operador} ${operacion.b} = ?`;
    this._el.input.value = '';
    this._el.input.classList.remove('input-shake');
    this._el.input.focus();
  }

  _comprobar() {
    if (this._procesando) return;

    const operacion = this._operaciones[this._indice];
    const respuestaDada = Number.parseInt(this._el.input.value, 10);
    const esCorrecta = respuestaDada === operacion.respuesta;

    if (esCorrecta) {
      this._procesando = true;
      this._dragon.reaccionarAcierto();
      this._audio.reproducirAcierto();
      this._el.input.disabled = true;

      setTimeout(() => {
        this._el.input.disabled = false;
        this._procesando = false;
        this._indice += 1;
        if (this._indice < this._operaciones.length) {
          this._pintarOperacionActual();
        } else {
          this._terminarNivel();
        }
      }, 700);
    } else {
      this._dragon.reaccionarFallo({ persistente: true });
      this._audio.reproducirMuelle();

      this._el.input.classList.remove('input-shake');
      void this._el.input.offsetWidth; // fuerza reflow para repetir la animación
      this._el.input.classList.add('input-shake');
      this._el.input.value = '';
      this._el.input.focus();
      // No avanza: el jugador reintenta la MISMA operación.
    }
  }

  /** Al terminar las 20 operaciones, el premio no es un simple cartel:
   * es el minijuego de atrapar comida (`CatchGame`). Solo al terminar
   * ESE minijuego se muestra el "¡Nivel completado!" y se vuelve al
   * menú correspondiente. */
  _terminarNivel() {
    this._el.operationView.hidden = true;
    this._catchGame.iniciar({
      onCompletado: () => this._mostrarNivelCompletadoYVolver(),
    });
  }

  _mostrarNivelCompletadoYVolver() {
    this._el.levelComplete.hidden = false;
    setTimeout(() => {
      this._el.levelComplete.hidden = true;
      this._el.screen.hidden = true;
      this._config.onVolver();
    }, 1800);
  }

  _volver() {
    this._el.screen.hidden = true;
    this._config.onVolver();
  }
}
