import { AudioFx } from './AudioFx.js';

/**
 * Shop (Nevera Mágica)
 * --------------------
 * Muestra la comida disponible para el nivel actual, procesa compras
 * y gestiona que la comida llegue hasta Multidrake (por arrastre o
 * por toque directo). Cuando el backend informa que evolucionó, deja
 * ver el festejo y luego pide al llamador (vía `onPedirSiguientePaso`)
 * que decida cómo seguir — ya no salta de golpe a la siguiente ronda.
 */
export class Shop {
  constructor({
    apiClient, gameState, elements,
    onMonstruoEvolucionado, onComidaEntregada, onPedirSiguientePaso,
  }) {
    this._api = apiClient;
    this._gameState = gameState;
    this._el = elements; // { btnNevera, shopPanel, shopItemsContainer, mouthEl }
    this._onMonstruoEvolucionado = onMonstruoEvolucionado;
    this._onComidaEntregada = onComidaEntregada;
    this._onPedirSiguientePaso = onPedirSiguientePaso;
    this._audio = new AudioFx();

    this._el.btnNevera.addEventListener('click', () => this._alternarPanel());
    this._configurarZonaDeSoltado();
  }

  async mostrarBotonNevera() {
    this._el.btnNevera.hidden = false;
    this._el.btnNevera.classList.remove('enter');
    void this._el.btnNevera.offsetWidth;
    this._el.btnNevera.classList.add('enter');
  }

  /** Cierra y vacía la nevera. Pública: la usa `main.js` tras que el
   * jugador elige qué hacer en el diálogo de "siguiente paso". */
  cerrarNevera() {
    this._el.shopPanel.hidden = true;
    this._el.btnNevera.hidden = true;
    this._el.shopItemsContainer.innerHTML = '';
  }

  async _alternarPanel() {
    const abrir = this._el.shopPanel.hidden;
    this._el.shopPanel.hidden = !abrir;
    if (abrir) {
      await this._cargarItems();
    }
  }

  async _cargarItems() {
    // Se piden en paralelo: el catálogo (lo que se puede comprar) y lo
    // que YA se compró y sigue sin comerse. Sin esto último, la
    // comida comprada desaparecía de la vista al cerrar/reabrir la
    // nevera o recargar la página, aunque seguía existiendo (y
    // contando) en la base de datos.
    const [catalogo, pendientes] = await Promise.all([
      this._api.listarTienda(this._gameState.playerId),
      this._api.listarComidaPendiente(this._gameState.playerId),
    ]);

    this._el.shopItemsContainer.innerHTML = '';
    catalogo.forEach((item) => this._renderCatalogItem(item));
    pendientes.forEach((pendiente) => {
      this._renderItemListoParaComer(pendiente.item, pendiente.inventory_id);
    });
  }

  _renderCatalogItem(item) {
    const tarjeta = document.createElement('button');
    tarjeta.type = 'button';
    tarjeta.className = 'food-item buy-btn';
    tarjeta.innerHTML = `
      <span class="food-emoji">${item.emoji}</span>
      <span class="food-cost">⭐ ${item.costo_estrellas}</span>
    `;

    if (item.costo_estrellas > this._gameState.balanceEstrellas) {
      tarjeta.classList.add('locked');
      tarjeta.disabled = true;
    }

    tarjeta.addEventListener('click', () => this._comprar(item, tarjeta));
    this._el.shopItemsContainer.appendChild(tarjeta);
  }

  async _comprar(item, tarjetaCatalogo) {
    const resultado = await this._api.comprarItem(this._gameState.playerId, item.id);
    this._gameState.registrarCompra({ balanceEstrellas: resultado.balance_estrellas });

    tarjetaCatalogo.remove();
    this._renderItemListoParaComer(item, resultado.inventory_id);
    this._refrescarBloqueos();
  }

  _renderItemListoParaComer(item, inventoryId) {
    const chip = document.createElement('div');
    chip.className = 'food-item bought';
    chip.draggable = true;
    chip.dataset.inventoryId = inventoryId;
    chip.title = 'Arrastra o toca para dar de comer a Multidrake';
    chip.innerHTML = `<span class="food-emoji">${item.emoji}</span>`;

    chip.addEventListener('dragstart', (evento) => {
      evento.dataTransfer.setData('text/plain', inventoryId);
    });

    // Alternativa al arrastre: tocar/hacer clic también alimenta al
    // monstruo directamente. El "drag & drop" nativo del navegador
    // exige soltar justo sobre una zona muy pequeña (la boca); si el
    // gesto no termina exactamente ahí, se cancela en silencio y
    // parece que "no pasa nada". Con el clic no hace falta acertar.
    chip.addEventListener('click', () => this._alimentar(inventoryId, chip));

    this._el.shopItemsContainer.appendChild(chip);
  }

  _refrescarBloqueos() {
    this._el.shopItemsContainer.querySelectorAll('.buy-btn').forEach((tarjeta) => {
      const costo = Number(tarjeta.querySelector('.food-cost').textContent.replace('⭐', '').trim());
      const bloqueada = costo > this._gameState.balanceEstrellas;
      tarjeta.classList.toggle('locked', bloqueada);
      tarjeta.disabled = bloqueada;
    });
  }

  _configurarZonaDeSoltado() {
    const boca = this._el.mouthEl;

    boca.addEventListener('dragover', (evento) => {
      evento.preventDefault();
      boca.classList.add('drag-over');
    });
    boca.addEventListener('dragleave', () => boca.classList.remove('drag-over'));

    boca.addEventListener('drop', (evento) => {
      evento.preventDefault();
      boca.classList.remove('drag-over');

      const inventoryId = evento.dataTransfer.getData('text/plain');
      if (!inventoryId) return;

      const chip = this._el.shopItemsContainer.querySelector(`[data-inventory-id="${inventoryId}"]`);
      this._alimentar(inventoryId, chip);
    });
  }

  /** Da de comer un ítem a Multidrake: la comida vuela visualmente
   * hasta su boca, muerde con sonido, y solo entonces se resuelve la
   * evolución. Único punto de entrada tanto para drag & drop como
   * para el toque directo. */
  async _alimentar(inventoryId, chipElement) {
    const emoji = chipElement?.querySelector('.food-emoji')?.textContent ?? '🍽️';
    const animacionVuelo = chipElement
      ? this._volarComidaHastaBoca(emoji, chipElement)
      : Promise.resolve();

    chipElement?.remove();

    const [, evolucion] = await Promise.all([
      animacionVuelo,
      this._api.alimentarMonstruo(this._gameState.playerId, inventoryId),
    ]);

    this._audio.reproducirMordisco();
    this._onComidaEntregada();

    this._gameState.registrarEvolucion({
      nivelActual: evolucion.nivel_actual,
      faseMonstruo: evolucion.fase_monstruo,
      evoluciono: evolucion.evoluciono,
    });

    if (evolucion.evoluciono) {
      this._onMonstruoEvolucionado(evolucion);
      // Se espera a que se vea el festejo (pulso + confeti) antes de
      // preguntar cómo seguir — nunca se salta de golpe a lo siguiente.
      setTimeout(() => this._onPedirSiguientePaso(evolucion), 900);
    }
  }

  /** Anima un clon del emoji volando desde `origenEl` hasta la boca.
   * Devuelve una promesa que se resuelve cuando termina el vuelo. */
  _volarComidaHastaBoca(emoji, origenEl) {
    const origen = origenEl.getBoundingClientRect();
    const destino = this._el.mouthEl.getBoundingClientRect();

    const volador = document.createElement('span');
    volador.className = 'food-flying';
    volador.textContent = emoji;
    volador.style.left = `${origen.left + origen.width / 2 - 14}px`;
    volador.style.top = `${origen.top + origen.height / 2 - 14}px`;
    document.body.appendChild(volador);

    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        volador.style.left = `${destino.left + destino.width / 2 - 14}px`;
        volador.style.top = `${destino.top + destino.height / 2 - 14}px`;
        volador.style.transform = 'scale(0.35)';
        volador.style.opacity = '0';
      });
      setTimeout(() => {
        volador.remove();
        resolve();
      }, 520);
    });
  }
}
