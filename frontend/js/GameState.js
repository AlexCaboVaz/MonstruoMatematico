/**
 * GameState
 * ---------
 * Única fuente de verdad del estado del jugador en el cliente.
 * Extiende `EventTarget` para que otras clases (Monster, Shop,
 * CardSystem) puedan reaccionar a cambios (patrón Observer) sin
 * conocerse entre sí — así CardSystem no necesita saber que Monster
 * existe, solo que GameState avisa cuando algo cambió.
 */
export class GameState extends EventTarget {
  constructor() {
    super();
    this.playerId = null;
    this.nombre = '';
    this.colorBase = 'verde';
    this.nivelActual = 1;
    this.balanceEstrellas = 0;
    this.faseMonstruo = 'bebe';
    // Aciertos acumulados en la ronda en curso (NO se reinicia al
    // fallar una carta, solo al empezar una ronda nueva). Como cada
    // una de las 12 cartas solo sale de la cola al acertarla, esto
    // garantiza siempre exactamente 12 aciertos por ronda completa
    // -> 4 estrellas, sin importar cuántas veces se falle por medio.
    this.rachaActual = 0;
  }

  cargarDesdeJugador(jugadorDto) {
    this.playerId = jugadorDto.id;
    this.nombre = jugadorDto.nombre;
    this.colorBase = jugadorDto.color_base;
    this.nivelActual = jugadorDto.nivel_actual;
    this.balanceEstrellas = jugadorDto.balance_estrellas;
    this.faseMonstruo = jugadorDto.fase_monstruo;
    this._emitir('estado-cambiado');
  }

  registrarRespuesta({ esCorrecta, nuevaRacha, estrellaOtorgada, balanceEstrellas }) {
    // `nuevaRacha` ya viene calculada por el backend (fuente de
    // verdad): solo sube con los aciertos, nunca se resetea al fallar.
    this.rachaActual = nuevaRacha;
    if (estrellaOtorgada) {
      this.balanceEstrellas = balanceEstrellas;
      this._emitir('estrella-ganada');
    }
  }

  registrarCompra({ balanceEstrellas }) {
    this.balanceEstrellas = balanceEstrellas;
    this._emitir('estado-cambiado');
  }

  registrarEvolucion({ nivelActual, faseMonstruo, evoluciono }) {
    this.nivelActual = nivelActual;
    this.faseMonstruo = faseMonstruo;
    if (evoluciono) {
      this._emitir('monstruo-evoluciono');
    }
  }

  _emitir(nombreEvento, detalle = {}) {
    this.dispatchEvent(new CustomEvent(nombreEvento, { detail: detalle }));
  }
}
