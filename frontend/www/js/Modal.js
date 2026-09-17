/**
 * Modal
 * -----
 * Diálogo de decisión simple y genérico (título + botones). Se usa
 * tras evolucionar, para preguntar cómo seguir en vez de saltar
 * automáticamente a la siguiente ronda. No sabe nada del juego: solo
 * pinta lo que se le pasa y llama al callback del botón pulsado.
 */
export class Modal {
  constructor({ overlayEl, titleEl, actionsEl }) {
    this._overlay = overlayEl;
    this._title = titleEl;
    this._actions = actionsEl;
  }

  /**
   * @param {string} titulo
   * @param {{texto: string, secundario: boolean, onClick: Function}[]} opciones
   */
  mostrar(titulo, opciones) {
    this._title.textContent = titulo;
    this._actions.innerHTML = '';

    opciones.forEach((opcion) => {
      const boton = document.createElement('button');
      boton.type = 'button';
      boton.className = `modal-btn${opcion.secundario ? ' secundario' : ''}`;
      boton.textContent = opcion.texto;
      boton.addEventListener('click', () => {
        this.cerrar();
        opcion.onClick();
      });
      this._actions.appendChild(boton);
    });

    this._overlay.hidden = false;
  }

  cerrar() {
    this._overlay.hidden = true;
  }
}
