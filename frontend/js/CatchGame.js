import { AudioFx } from './AudioFx.js';

const META_ATRAPADOS = 20;
const PROBABILIDAD_BOMBA = 0.22;

// Mismos emojis que la Nevera Mágica (Tablas de Multiplicar): así la
// "comida" es coherente en todo el juego, no una lista inventada aparte.
const EMOJIS_COMIDA = ['🧦', '🔩', '⛈️', '🍝', '🪐', '🌋'];
const EMOJI_BOMBA = '💣';

/**
 * CatchGame
 * ---------
 * Minijuego de recompensa al terminar un nivel de 20 operaciones: el
 * niño ARRASTRA a Multidrake de un lado a otro (con el dedo o el
 * ratón) para que toque la comida que cae — no se toca la comida
 * directamente, es el contacto físico con el dragón lo que "atrapa".
 * Tocar una bomba reinicia el contador a 0.
 *
 * No sabe nada de operaciones matemáticas ni de niveles — solo sabe
 * "mover al dragón y atrapar cosas hasta 20, evitando bombas" — por
 * eso `MathWorld` lo usa como el paso final de CUALQUIER mundo
 * (Sumas, Restas, Multiplicaciones, División), sin duplicar código.
 */
export class CatchGame {
  constructor({ elementos }) {
    this._el = elementos; // { container, playArea, progress, dragonImg }
    this._audio = new AudioFx();
    this._atrapados = 0;
    this._activo = false;
    this._timeoutSpawn = null;
    this._itemsActivos = []; // [{ el, esBomba }]
    this._cicloColisionId = null;

    // Arrastrar al dragón: funciona igual con dedo (touch) o ratón,
    // gracias a los eventos de puntero unificados.
    this._el.playArea.addEventListener('pointerdown', (evento) => this._moverDragonA(evento.clientX));
    this._el.playArea.addEventListener('pointermove', (evento) => {
      if (evento.buttons === 0 && evento.pointerType === 'mouse') return; // ratón: solo si está pulsado
      this._moverDragonA(evento.clientX);
    });
  }

  iniciar({ onCompletado }) {
    this._onCompletado = onCompletado;
    this._atrapados = 0;
    this._activo = true;
    this._el.playArea.innerHTML = '';
    this._itemsActivos = [];
    this._el.dragonImg.classList.remove('catch-dragon-feliz', 'catch-dragon-enfadado');
    this._actualizarProgreso();
    this._el.container.hidden = false;
    this._centrarDragon();
    this._programarSiguienteItem();
    this._cicloColisionId = requestAnimationFrame(() => this._cicloColision());
  }

  _centrarDragon() {
    const anchoArea = this._el.playArea.clientWidth;
    const anchoDragon = this._el.dragonImg.offsetWidth || 92;
    this._el.dragonImg.style.left = `${(anchoArea - anchoDragon) / 2}px`;
  }

  _moverDragonA(clientX) {
    const rectArea = this._el.playArea.getBoundingClientRect();
    const anchoDragon = this._el.dragonImg.offsetWidth || 92;
    let nuevoLeft = clientX - rectArea.left - anchoDragon / 2;
    nuevoLeft = Math.max(0, Math.min(nuevoLeft, rectArea.width - anchoDragon));
    this._el.dragonImg.style.left = `${nuevoLeft}px`;
  }

  _programarSiguienteItem() {
    if (!this._activo) return;
    const retraso = 450 + Math.random() * 550;
    this._timeoutSpawn = setTimeout(() => {
      this._crearItemCayendo();
      this._programarSiguienteItem();
    }, retraso);
  }

  _crearItemCayendo() {
    const esBomba = Math.random() < PROBABILIDAD_BOMBA;
    const emoji = esBomba ? EMOJI_BOMBA : EMOJIS_COMIDA[Math.floor(Math.random() * EMOJIS_COMIDA.length)];

    const item = document.createElement('span');
    item.className = 'falling-item';
    item.textContent = emoji;
    item.style.left = `${Math.random() * 88}%`;

    const duracion = 3800 + Math.random() * 2000;
    item.style.animationDuration = `${duracion}ms`;

    const registro = { el: item, esBomba };
    item.addEventListener('animationend', () => this._quitarItem(registro)); // llegó abajo sin que el dragón la tocara

    this._el.playArea.appendChild(item);
    this._itemsActivos.push(registro);
  }

  /** Bucle continuo (requestAnimationFrame) que comprueba si el
   * dragón ha tocado alguno de los items que están cayendo. */
  _cicloColision() {
    if (!this._activo) return;

    const rectDragon = this._zonaDeContacto();
    // Copia porque _atrapar puede modificar this._itemsActivos mientras iteramos.
    [...this._itemsActivos].forEach((registro) => {
      if (!registro.el.isConnected || registro.el.classList.contains('atrapado')) return;
      const rectItem = registro.el.getBoundingClientRect();
      if (this._seSolapan(rectDragon, rectItem)) {
        this._atrapar(registro);
      }
    });

    this._cicloColisionId = requestAnimationFrame(() => this._cicloColision());
  }

  /** La imagen de Multidrake incluye el brazo levantado y la varita,
   * que sobresalen bastante del cuerpo — si se usara la imagen
   * entera como zona de contacto, esquivar una bomba sería casi
   * imposible. Se usa en su lugar un recuadro más pequeño, centrado
   * en el cuerpo (60% del ancho, 55% del alto, pegado abajo). */
  _zonaDeContacto() {
    const completo = this._el.dragonImg.getBoundingClientRect();
    const anchoZona = completo.width * 0.6;
    const altoZona = completo.height * 0.55;
    return {
      left: completo.left + (completo.width - anchoZona) / 2,
      right: completo.left + (completo.width - anchoZona) / 2 + anchoZona,
      top: completo.bottom - altoZona,
      bottom: completo.bottom,
    };
  }

  _seSolapan(a, b) {
    return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  }

  _quitarItem(registro) {
    registro.el.remove();
    this._itemsActivos = this._itemsActivos.filter((r) => r !== registro);
  }

  _atrapar(registro) {
    if (!this._activo || registro.el.classList.contains('atrapado')) return;
    registro.el.classList.add('atrapado');
    setTimeout(() => this._quitarItem(registro), 350);

    if (registro.esBomba) {
      this._atrapados = 0;
      this._audio.reproducirMuelle();
      this._reaccionDragon('catch-dragon-enfadado');
    } else {
      this._atrapados += 1;
      this._audio.reproducirAcierto();
      this._reaccionDragon('catch-dragon-feliz');
    }

    this._actualizarProgreso();

    if (this._atrapados >= META_ATRAPADOS) {
      this._terminar();
    }
  }

  _reaccionDragon(clase) {
    this._el.dragonImg.classList.remove('catch-dragon-feliz', 'catch-dragon-enfadado');
    void this._el.dragonImg.offsetWidth; // fuerza reflow para poder repetir la animación
    this._el.dragonImg.classList.add(clase);
  }

  _actualizarProgreso() {
    this._el.progress.textContent = `${this._atrapados} / ${META_ATRAPADOS}`;
  }

  _terminar() {
    this._activo = false;
    cancelAnimationFrame(this._cicloColisionId);
    clearTimeout(this._timeoutSpawn);
    this._el.playArea.innerHTML = '';
    this._itemsActivos = [];
    this._el.container.hidden = true;
    this._onCompletado();
  }

  /** Detiene el minijuego en seco (sin llamar a onCompletado), para
   * cuando el jugador sale a otro sitio en mitad de la partida. */
  detener() {
    this._activo = false;
    cancelAnimationFrame(this._cicloColisionId);
    clearTimeout(this._timeoutSpawn);
    this._el.playArea.innerHTML = '';
    this._itemsActivos = [];
    this._el.container.hidden = true;
  }
}
