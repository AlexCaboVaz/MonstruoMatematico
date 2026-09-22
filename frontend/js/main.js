import { NIVEL_MAXIMO } from './config.js';
import { ApiClient } from './apiClient.js';
import { GameState } from './GameState.js';
import { CreationScreen } from './CreationScreen.js';
import { CardSystem } from './CardSystem.js';
import { Monster } from './Monster.js';
import { Shop } from './Shop.js';
import { Modal } from './Modal.js';
import { WorldMap } from './WorldMap.js';
import { MathWorld } from './MathWorld.js';
import { CatchGame } from './CatchGame.js';
import { generarSuma, generarMultiplicacionLibre, generarResta, generarDivision } from './operationGenerators.js';

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
  const screenHub = document.getElementById('screen-hub');
  const screenMultSubmenu = document.getElementById('screen-mult-submenu');
  const screenMathWorld = document.getElementById('screen-math-world');
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
    onJugadorCreado: () => irAlHub(),
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
    dragon: monster,
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

  // El badge "Tabla del N" abre el selector de tablas (el mismo mapa
  // de arriba), para poder saltar a cualquier tabla desbloqueada sin
  // pasar por el menú global.
  document.getElementById('btn-selector-tabla').addEventListener('click', () => {
    worldMap.mostrar(gameState.nivelActual);
  });

  // Minijuego de recompensa (atrapar comida) al terminar cada nivel
  // de 20 operaciones — compartido por Sumas, Restas, Multiplicaciones
  // y División a través de MathWorld.
  const catchGame = new CatchGame({
    elementos: {
      container: document.getElementById('math-catch-game'),
      playArea: document.getElementById('catch-play-area'),
      progress: document.getElementById('catch-progress'),
      dragonImg: document.getElementById('catch-dragon-img'),
    },
  });

  // Mundo Matemático genérico: una sola instancia reconfigurada para
  // cada mundo de "20 operaciones + input numérico" (Sumas, Restas,
  // Multiplicaciones libres y División).
  const mathWorld = new MathWorld({
    elementos: {
      screen: screenMathWorld,
      btnVolver: document.getElementById('btn-math-back'),
      levelSelect: document.getElementById('math-level-select'),
      worldTitle: document.getElementById('math-world-title'),
      levelGrid: document.getElementById('math-level-grid'),
      operationView: document.getElementById('math-operation-view'),
      progress: document.getElementById('math-progress'),
      operationText: document.getElementById('math-operation-text'),
      input: document.getElementById('math-answer-input'),
      btnComprobar: document.getElementById('btn-math-comprobar'),
      dragonImg: document.getElementById('math-dragon-img'),
      levelComplete: document.getElementById('math-level-complete'),
    },
    dragon: monster,
    catchGame,
  });

  // Menú global (☰): visible en todo momento tras crear el personaje,
  // en cualquier mundo, para poder volver siempre al Hub principal
  // o salir del todo a la pantalla de inicio.
  const globalMenuContainer = document.getElementById('global-menu-container');
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
  document.getElementById('menu-item-inicio').addEventListener('click', () => {
    menuDropdown.hidden = true;
    volverAlMenuPrincipal();
  });
  document.getElementById('menu-item-salir').addEventListener('click', () => {
    menuDropdown.hidden = true;
    salirALaPantallaDeInicio();
  });

  /** Vuelve al Hub desde CUALQUIER pantalla (Sumas, Multiplicaciones,
   * su submenú, o Tablas de Multiplicar), sin importar en qué punto
   * de esa pantalla estuviera el jugador. */
  function volverAlMenuPrincipal() {
    shop.cerrarNevera();
    modal.cerrar();
    catchGame.detener();
    screenMultSubmenu.hidden = true;
    screenMathWorld.hidden = true;
    screenJuego.hidden = true;
    irAlHub({ saludar: false });
  }

  /** Sale del todo a la pantalla de inicio (crear personaje), desde
   * cualquier pantalla del juego. */
  function salirALaPantallaDeInicio() {
    shop.cerrarNevera();
    modal.cerrar();
    catchGame.detener();
    screenHub.hidden = true;
    screenMultSubmenu.hidden = true;
    screenMathWorld.hidden = true;
    screenJuego.hidden = true;
    globalMenuContainer.hidden = true;
    screenCreacion.hidden = false;
  }

  // El contador de estrellas visible se mantenía al día solo al
  // acertar cartas. Al comprar en la nevera, GameState.balanceEstrellas
  // cambiaba por dentro pero nadie refrescaba el número en pantalla —
  // por eso una compra "no parecía hacer nada" a simple vista.
  gameState.addEventListener('estado-cambiado', () => {
    document.getElementById('star-count').textContent = gameState.balanceEstrellas;
  });

  // Hub de Mundos: tras crear el personaje, el jugador elige a qué
  // mundo ir.
  document.getElementById('world-suma').addEventListener('click', () => {
    screenHub.hidden = true;
    mathWorld.iniciar({
      titulo: 'Mundo de la Suma',
      imagenesNivel: {
        facil: 'assets/islas-suma/facil.png',
        medio: 'assets/islas-suma/medio.png',
        dificil: 'assets/islas-suma/dificil.png',
      },
      generador: generarSuma,
      onVolver: () => irAlHub({ saludar: false }),
    });
  });

  document.getElementById('world-resta').addEventListener('click', () => {
    screenHub.hidden = true;
    mathWorld.iniciar({
      titulo: 'Mundo de la Resta',
      imagenesNivel: {
        facil: 'assets/islas-resta/facil.png',
        medio: 'assets/islas-resta/medio.png',
        dificil: 'assets/islas-resta/dificil.png',
      },
      generador: generarResta,
      onVolver: () => irAlHub({ saludar: false }),
    });
  });

  document.getElementById('world-division').addEventListener('click', () => {
    screenHub.hidden = true;
    mathWorld.iniciar({
      titulo: 'Mundo de la División',
      imagenesNivel: {
        facil: 'assets/islas-division/facil.png',
        medio: 'assets/islas-division/medio.png',
        dificil: 'assets/islas-division/dificil.png',
      },
      generador: generarDivision,
      onVolver: () => irAlHub({ saludar: false }),
    });
  });

  document.getElementById('world-multiplicacion').addEventListener('click', () => {
    screenHub.hidden = true;
    screenMultSubmenu.hidden = false;
  });

  // Submenú de Multiplicación: Tablas (juego original, 10 islas +
  // Nevera Mágica) o Multiplicaciones (motor de 20 operaciones).
  document.getElementById('btn-mult-submenu-back').addEventListener('click', () => {
    screenMultSubmenu.hidden = true;
    irAlHub({ saludar: false });
  });

  document.getElementById('submenu-tablas').addEventListener('click', () => {
    screenMultSubmenu.hidden = true;
    irAPantallaDeJuego();
  });

  document.getElementById('submenu-multiplicaciones').addEventListener('click', () => {
    screenMultSubmenu.hidden = true;
    mathWorld.iniciar({
      titulo: 'Multiplicaciones',
      imagenesNivel: {
        facil: 'assets/islas-multop/facil.png',
        medio: 'assets/islas-multop/medio.png',
        dificil: 'assets/islas-multop/dificil.png',
      },
      generador: generarMultiplicacionLibre,
      onVolver: () => { screenMultSubmenu.hidden = false; },
    });
  });

  function irAlHub({ saludar = true } = {}) {
    screenCreacion.hidden = true;
    screenHub.hidden = false;
    globalMenuContainer.hidden = false;
    if (saludar) {
      document.getElementById('hub-greeting').textContent = `¡Elige un mundo, ${gameState.nombre}!`;
    }
  }

  function irAPantallaDeJuego() {
    screenHub.hidden = true;
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
