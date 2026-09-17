import { NIVEL_MAXIMO } from './config.js';
import { ApiClient } from './apiClient.js';
import { GameState } from './GameState.js';
import { CreationScreen } from './CreationScreen.js';
import { CardSystem } from './CardSystem.js';
import { Monster } from './Monster.js';
import { Shop } from './Shop.js';
import { Modal } from './Modal.js';
import { WorldMap } from './WorldMap.js';

const NOMBRE_MONSTRUO = 'Multidrake';

/**
 * main.js
 * -------
 * Composition root del frontend: instancia las clases y las conecta
 * mediante callbacks explícitos. Ninguna clase importa a otra
 * directamente salvo `Monster` (usa `Confetti`) — así cada pieza es
 * reemplazable y testeable de forma aislada.
 */
function main() {
  const api = new ApiClient();
  const gameState = new GameState();

  const screenCreacion = document.getElementById('screen-creation');
  const screenJuego = document.getElementById('screen-game');

  const modal = new Modal({
    overlayEl: document.getElementById('modal-overlay'),
    titleEl: document.getElementById('modal-title'),
    actionsEl: document.getElementById('modal-actions'),
  });

  const creationScreen = new CreationScreen({
    apiClient: api,
    gameState,
    elements: {
      preview: document.getElementById('creation-preview'),
      input: document.getElementById('input-nombre'),
      colorPicker: document.getElementById('color-picker'),
      btnDespertar: document.getElementById('btn-despertar'),
      errorText: document.getElementById('creation-error'),
    },
    onJugadorCreado: () => irAPantallaDeJuego(),
  });

  const monster = new Monster({
    imgEl: document.getElementById('monster-img'),
    confettiLayerEl: document.getElementById('confetti-layer'),
  });

  const cardSystem = new CardSystem({
    apiClient: api,
    gameState,
    elements: {
      operationText: document.getElementById('operation-text'),
      cardsContainer: document.getElementById('cards-container'),
      starIcon: document.querySelector('.star-icon'),
      starCount: document.getElementById('star-count'),
      levelNumber: document.getElementById('level-number'),
    },
    onRondaCompleta: () => shop.mostrarBotonNevera(),
  });

  const shop = new Shop({
    apiClient: api,
    gameState,
    elements: {
      btnNevera: document.getElementById('btn-nevera'),
      shopPanel: document.getElementById('shop-panel'),
      shopItemsContainer: document.getElementById('shop-items'),
      mouthEl: document.getElementById('monster-mouth'),
    },
    onMonstruoEvolucionado: (evolucion) => {
      monster.evolucionar({
        colorBase: gameState.colorBase,
        faseMonstruo: evolucion.fase_monstruo,
        nivelActual: evolucion.nivel_actual,
        nivelMaximo: NIVEL_MAXIMO,
      });
    },
    // Mordisco/reacción de Multidrake al recibir la comida (drag &
    // drop o toque directo) — independiente de si eso evoluciona o no.
    onComidaEntregada: () => monster.reaccionarComida(),
    // Tras evolucionar, en vez de saltar directo a la siguiente ronda,
    // se pregunta cómo seguir (ver `mostrarDialogoSiguientePaso`).
    onPedirSiguientePaso: (evolucion) => mostrarDialogoSiguientePaso(evolucion),
  });

  // Mapa de las Tablas: permite repasar cualquier tabla ya
  // desbloqueada sin tener que terminar la partida desde cero.
  const worldMap = new WorldMap({
    overlayEl: document.getElementById('map-overlay'),
    nodesContainerEl: document.getElementById('map-nodes'),
    closeBtnEl: document.getElementById('btn-cerrar-mapa'),
    nivelMaximo: NIVEL_MAXIMO,
    onNivelSeleccionado: (nivel) => {
      shop.cerrarNevera();
      modal.cerrar();
      const esNivelActual = nivel === gameState.nivelActual;
      // El nivel actual usa el flujo normal (sin override); cualquier
      // tabla anterior se pide como práctica explícita — el mismo
      // mecanismo que ya usa "Repasar la tabla anterior" del diálogo
      // de evolución, sin necesitar ningún endpoint nuevo.
      cardSystem.iniciarRonda(esNivelActual ? null : nivel);
    },
  });

  // Menú desplegable (☰), accesible en todo momento durante la partida.
  const btnMenu = document.getElementById('btn-menu');
  const menuDropdown = document.getElementById('menu-dropdown');

  btnMenu.addEventListener('click', () => {
    menuDropdown.hidden = !menuDropdown.hidden;
  });
  document.addEventListener('click', (evento) => {
    if (!menuDropdown.hidden && !evento.target.closest('.menu-container')) {
      menuDropdown.hidden = true;
    }
  });
  document.getElementById('menu-item-mapa').addEventListener('click', () => {
    menuDropdown.hidden = true;
    worldMap.mostrar(gameState.nivelActual);
  });

  // El contador de estrellas visible se mantenía al día solo al
  // acertar cartas. Al comprar en la nevera, GameState.balanceEstrellas
  // cambiaba por dentro pero nadie refrescaba el número en pantalla —
  // por eso una compra "no parecía hacer nada" a simple vista.
  gameState.addEventListener('estado-cambiado', () => {
    document.getElementById('star-count').textContent = gameState.balanceEstrellas;
  });

  function irAPantallaDeJuego() {
    screenCreacion.hidden = true;
    screenJuego.hidden = false;
    monster.render({ colorBase: gameState.colorBase, faseMonstruo: gameState.faseMonstruo });
    cardSystem.iniciarRonda();
  }

  /**
   * Diálogo tras evolucionar: seguir a la siguiente tabla, repetir la
   * que se acaba de superar (repaso extra, sin tocar el progreso
   * guardado) o salir. Sustituye el salto automático de antes.
   */
  function mostrarDialogoSiguientePaso(evolucion) {
    const nivelNuevo = evolucion.nivel_actual;
    const nivelAnterior = Math.max(1, nivelNuevo - 1);
    const llegoAlTope = nivelNuevo >= NIVEL_MAXIMO;

    const opciones = [];

    if (!llegoAlTope) {
      opciones.push({
        texto: `¡Siguiente! Tabla del ${nivelNuevo}`,
        onClick: () => {
          shop.cerrarNevera();
          cardSystem.iniciarRonda();
        },
      });
    }

    opciones.push({
      texto: `Repasar la tabla del ${nivelAnterior}`,
      secundario: true,
      onClick: () => {
        shop.cerrarNevera();
        cardSystem.iniciarRonda(nivelAnterior);
      },
    });

    opciones.push({
      texto: 'Salir por ahora',
      secundario: true,
      onClick: () => salirDelJuego(),
    });

    const titulo = llegoAlTope
      ? `¡${NOMBRE_MONSTRUO} alcanzó su forma máxima! 🎉`
      : `¡${NOMBRE_MONSTRUO} creció! ¿Qué hacemos ahora?`;

    modal.mostrar(titulo, opciones);
  }

  function salirDelJuego() {
    document.getElementById('cards-container').innerHTML = '';
    document.getElementById('operation-text').textContent = `¡Hasta pronto! ${NOMBRE_MONSTRUO} te espera 🐉`;
    shop.cerrarNevera();
  }
}

document.addEventListener('DOMContentLoaded', main);

// Registro del service worker (requisito de la PWA para poder
// "instalarse" en el móvil / empaquetarse como APK con PWABuilder).
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(() => {
      // Si falla (ej. servido sin HTTPS en desarrollo), el juego debe
      // seguir funcionando igual; la PWA es un extra, no un requisito.
    });
  });
}
