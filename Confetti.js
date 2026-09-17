import * as THREE from 'three';

/**
 * Confetti (versión 3D)
 * ----------------------
 * Genera piezas de confeti como pequeños cubos con física simple
 * (velocidad + gravedad), dentro de la MISMA escena Three.js del
 * monstruo — así aparecen en el mundo 3D real, no como una capa 2D
 * superpuesta. La cantidad y paleta cambian según la fase.
 *
 * `Monster` es quien la posee y quien llama a `actualizar(delta)` en
 * cada frame de su propio bucle de animación (responsabilidad única:
 * esta clase solo sabe de partículas, no de cuándo dibujar el frame).
 */
const CONFIGURACION_POR_FASE = {
  bebe: { cantidad: 20, colores: [0x7ed957], velocidadY: 0.05, giro: false },
  infantil: { cantidad: 35, colores: [0x7ed957, 0xffc93c], velocidadY: 0.06, giro: false },
  joven: { cantidad: 70, colores: [0xffc93c, 0xb187f0, 0xffffff], velocidadY: 0.08, giro: true },
  epica: { cantidad: 110, colores: [0xffc93c, 0xffffff, 0xffd700], velocidadY: 0.09, giro: true },
};

const CONFIGURACION_NIVEL_MAXIMO = {
  cantidad: 160,
  colores: [0xffc93c, 0xffffff, 0xffd700],
  velocidadY: 0.1,
  giro: true,
};

export class Confetti {
  constructor(scene) {
    this._scene = scene;
    this._piezas = [];
    this._geometriaPieza = new THREE.BoxGeometry(0.08, 0.08, 0.08);
  }

  lanzar(fase, { esNivelMaximo = false } = {}) {
    const config = esNivelMaximo
      ? CONFIGURACION_NIVEL_MAXIMO
      : (CONFIGURACION_POR_FASE[fase] ?? CONFIGURACION_POR_FASE.bebe);

    for (let i = 0; i < config.cantidad; i += 1) {
      const color = config.colores[Math.floor(Math.random() * config.colores.length)];
      const material = new THREE.MeshStandardMaterial({ color });
      const pieza = new THREE.Mesh(this._geometriaPieza, material);

      pieza.position.set(
        (Math.random() - 0.5) * 2.5,
        2 + Math.random() * 1.5,
        (Math.random() - 0.5) * 1.5,
      );
      pieza.userData.velocidad = new THREE.Vector3(
        (Math.random() - 0.5) * 0.03,
        -(config.velocidadY + Math.random() * 0.03),
        (Math.random() - 0.5) * 0.03,
      );
      pieza.userData.giro = config.giro ? (Math.random() - 0.5) * 0.3 : 0;
      pieza.userData.vida = 2.5 + Math.random();

      this._scene.add(pieza);
      this._piezas.push(pieza);
    }
  }

  /** Avanza la física de todas las piezas activas; retira las que ya vivieron su tiempo. */
  actualizar(delta) {
    for (let i = this._piezas.length - 1; i >= 0; i -= 1) {
      const pieza = this._piezas[i];
      pieza.position.addScaledVector(pieza.userData.velocidad, delta * 60);
      pieza.rotation.x += pieza.userData.giro;
      pieza.rotation.y += pieza.userData.giro;
      pieza.userData.vida -= delta;

      if (pieza.userData.vida <= 0) {
        this._scene.remove(pieza);
        pieza.material.dispose();
        this._piezas.splice(i, 1);
      }
    }
  }
}
