/**
 * CreationScreen
 * --------------
 * Controla la pantalla "¡Hola! ¿Cómo te llamas?": nombre, color del
 * slime y el botón "¡Despertar!". Al confirmar, crea el jugador en
 * el backend y notifica a la app mediante `onJugadorCreado`.
 */
export class CreationScreen {
  constructor({ apiClient, gameState, elements, onJugadorCreado }) {
    this._api = apiClient;
    this._gameState = gameState;
    this._el = elements; // { preview, input, colorPicker, btnDespertar, errorText }
    this._onJugadorCreado = onJugadorCreado;

    this._colorSeleccionado = null;

    this._el.input.addEventListener('input', () => this._revisarFormulario());

    this._el.colorPicker.querySelectorAll('.color-dot').forEach((boton) => {
      boton.addEventListener('click', () => this._seleccionarColor(boton));
    });

    this._el.btnDespertar.addEventListener('click', () => this._confirmar());
  }

  _seleccionarColor(botonElegido) {
    this._el.colorPicker.querySelectorAll('.color-dot').forEach((boton) => {
      boton.classList.remove('selected');
    });
    botonElegido.classList.add('selected');
    this._colorSeleccionado = botonElegido.dataset.color;
    this._el.preview.style.filter = `hue-rotate(${this._gradosPorColor(this._colorSeleccionado)})`;
    this._revisarFormulario();
  }

  _gradosPorColor(color) {
    return { verde: '0deg', azul: '150deg', rojo: '220deg', morado: '280deg' }[color] ?? '0deg';
  }

  _revisarFormulario() {
    const nombreValido = this._el.input.value.trim().length > 0;
    this._el.btnDespertar.disabled = !(nombreValido && this._colorSeleccionado);
  }

  async _confirmar() {
    this._el.errorText.hidden = true;
    this._el.btnDespertar.disabled = true;

    try {
      const jugador = await this._api.crearJugador(
        this._el.input.value.trim(),
        this._colorSeleccionado,
      );
      this._gameState.cargarDesdeJugador(jugador);
      this._onJugadorCreado();
    } catch (error) {
      this._el.errorText.textContent = 'No pudimos despertar a tu amigo. ¡Inténtalo de nuevo!';
      this._el.errorText.hidden = false;
      this._el.btnDespertar.disabled = false;
    }
  }
}
