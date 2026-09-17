/**
 * WorldMap ("Mapa de las Tablas")
 * --------------------------------
 * Muestra las 10 tablas como islas ilustradas (arte real, no
 * geometría/emoji): completadas (con ✅, nivel ya superado), la
 * actual (con 📍 y brillo dorado) y las que aún no se han
 * desbloqueado (oscurecidas, con 🔒). No necesita ningún endpoint
 * nuevo: `nivel_actual` del jugador ya es toda la información que
 * hace falta para saber qué está desbloqueado.
 *
 * Al elegir un nivel ya desbloqueado, delega en `onNivelSeleccionado`
 * — normalmente conectado a `CardSystem.iniciarRonda(nivel)` — para
 * que el jugador pueda repasar cualquier tabla anterior sin tener
 * que empezar de cero cada vez que entra al juego.
 */

// Cada tabla tiene su propia isla ilustrada (assets/islas/isla-N.jpg).
const RUTA_ISLA = (nivel) => `assets/islas/isla-${nivel}.jpg`;

export class WorldMap {
  constructor({ overlayEl, nodesContainerEl, closeBtnEl, nivelMaximo, onNivelSeleccionado }) {
    this._overlay = overlayEl;
    this._nodesContainer = nodesContainerEl;
    this._nivelMaximo = nivelMaximo;
    this._onNivelSeleccionado = onNivelSeleccionado;

    closeBtnEl.addEventListener('click', () => this.ocultar());
    this._overlay.addEventListener('click', (evento) => {
      if (evento.target === this._overlay) this.ocultar(); // clic fuera de la caja
    });
  }

  mostrar(nivelActual) {
    this._renderIslas(nivelActual);
    this._overlay.hidden = false;
  }

  ocultar() {
    this._overlay.hidden = true;
  }

  _renderIslas(nivelActual) {
    this._nodesContainer.innerHTML = '';

    for (let nivel = 1; nivel <= this._nivelMaximo; nivel += 1) {
      const tarjeta = document.createElement('button');
      tarjeta.type = 'button';
      tarjeta.className = 'map-island';

      const imagen = document.createElement('img');
      imagen.src = RUTA_ISLA(nivel);
      imagen.alt = `Tabla del ${nivel}`;
      imagen.loading = 'lazy';
      tarjeta.appendChild(imagen);

      const distintivo = document.createElement('span');
      distintivo.className = 'map-island-badge';

      if (nivel < nivelActual) {
        tarjeta.classList.add('completado');
        distintivo.textContent = '✅';
        tarjeta.title = `Tabla del ${nivel} — superada`;
      } else if (nivel === nivelActual) {
        tarjeta.classList.add('actual');
        distintivo.textContent = '📍';
        tarjeta.title = `Tabla del ${nivel} — en curso`;
      } else {
        tarjeta.classList.add('locked');
        distintivo.textContent = '🔒';
        tarjeta.disabled = true;
        tarjeta.title = 'Todavía no desbloqueada';
      }
      tarjeta.appendChild(distintivo);

      if (nivel <= nivelActual) {
        tarjeta.addEventListener('click', () => {
          this.ocultar();
          this._onNivelSeleccionado(nivel);
        });
      }

      this._nodesContainer.appendChild(tarjeta);
    }
  }
}
