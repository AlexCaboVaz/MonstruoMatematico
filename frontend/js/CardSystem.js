import { AudioFx } from './AudioFx.js';

/**
 * CardSystem
 * ----------
 * Gestiona la ronda de 12 cartas: pinta la pizarra y las 3 opciones,
 * procesa la respuesta del niño con feedback 100% positivo, reencola
 * los fallos al final de la cola y avisa cuando la ronda termina.
 * No sabe nada de la Nevera Mágica — pero sí notifica al Sistema
 * Global del Dragón (`dragon`) en cada acierto/fallo, igual que
 * hacen el resto de mundos (Sumas, Restas, Multiplicaciones, División).
 */
export class CardSystem {
  constructor({ apiClient, gameState, elements, dragon, onRondaCompleta }) {
    this._api = apiClient;
    this._gameState = gameState;
    this._el = elements; // { operationText, cardsContainer, starIcon, starCount, levelNumber }
    this._dragon = dragon;
    this._onRondaCompleta = onRondaCompleta;
    this._audio = new AudioFx();

    this._cola = [];
    this._procesandoRespuesta = false;
  }

  /**
   * @param {number|null} nivelPractica - Si se indica, genera una
   * ronda de práctica para ESE nivel (ej. "repetir tabla anterior")
   * sin tocar el progreso guardado del jugador. Si se omite, usa el
   * nivel_actual real del jugador (flujo normal de progresión).
   */
  async iniciarRonda(nivelPractica = null) {
    this._gameState.rachaActual = 0;
    this._el.levelNumber.textContent = nivelPractica ?? this._gameState.nivelActual;
    this._actualizarContadorEstrellas();

    const { cartas } = await this._api.generarRonda(this._gameState.playerId, nivelPractica);
    this._cola = cartas;
    this._pintarCartaActual();
  }

  _pintarCartaActual() {
    const carta = this._cola[0];
    this._el.operationText.textContent = `${carta.factor_a} × ${carta.factor_b} = ?`;
    this._el.cardsContainer.innerHTML = '';

    carta.opciones.forEach((opcion) => {
      const boton = document.createElement('button');
      boton.className = 'option-card';
      boton.type = 'button';
      boton.textContent = opcion.valor;
      boton.addEventListener('click', () => this._manejarRespuesta(carta, opcion, boton));
      this._el.cardsContainer.appendChild(boton);
    });
  }

  async _manejarRespuesta(carta, opcionElegida, botonElegido) {
    if (this._procesandoRespuesta) return;
    this._procesandoRespuesta = true;
    this._deshabilitarCartas();

    const esCorrecta = opcionElegida.es_correcta;

    if (esCorrecta) {
      botonElegido.classList.add('correcta');
      this._audio.reproducirAcierto();
      this._dragon.reaccionarAcierto();
    } else {
      botonElegido.classList.add('incorrecta');
      this._audio.reproducirMuelle();
      // No persistente: en Tablas la siguiente carta es una pregunta
      // distinta (la fallada vuelve al final de la cola), así que el
      // enfado es un destello breve, no un estado que deba mantenerse.
      this._dragon.reaccionarFallo();
    }

    try {
      const resultado = await this._api.enviarRespuesta(this._gameState.playerId, {
        operation_id: carta.operation_id,
        factor_a: carta.factor_a,
        factor_b: carta.factor_b,
        es_correcta: esCorrecta,
        racha_actual: this._gameState.rachaActual,
      });

      this._gameState.registrarRespuesta({
        esCorrecta: resultado.es_correcta,
        nuevaRacha: resultado.nueva_racha,
        estrellaOtorgada: resultado.estrella_otorgada,
        balanceEstrellas: resultado.balance_estrellas,
      });

      if (resultado.estrella_otorgada) {
        this._actualizarContadorEstrellas(true);
      }
    } finally {
      // Pausa breve para que el niño vea la animación antes de pasar
      // a la siguiente carta (evita sensación de "salto brusco").
      setTimeout(() => this._avanzar(esCorrecta), 650);
    }
  }

  _avanzar(fueCorrecta) {
    const cartaActual = this._cola.shift();
    if (!fueCorrecta) {
      this._cola.push(cartaActual); // la operación vuelve al final de la cola
    }

    this._procesandoRespuesta = false;

    if (this._cola.length === 0) {
      this._onRondaCompleta();
      return;
    }
    this._pintarCartaActual();
  }

  _deshabilitarCartas() {
    this._el.cardsContainer
      .querySelectorAll('.option-card')
      .forEach((boton) => boton.classList.add('disabled'));
  }

  _actualizarContadorEstrellas(conAnimacion = false) {
    this._el.starCount.textContent = this._gameState.balanceEstrellas;
    if (conAnimacion) {
      this._el.starIcon.classList.remove('pop');
      void this._el.starIcon.offsetWidth;
      this._el.starIcon.classList.add('pop');
    }
  }
}
