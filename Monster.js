import * as THREE from 'three';
import { Confetti } from './Confetti.js';

/**
 * Monster (versión 3D)
 * ---------------------
 * Renderiza al monstruo como una escena Three.js real (geometría
 * procedural + iluminación + partículas de confeti), en vez de un
 * emoji plano. Mantiene la MISMA interfaz pública que la versión
 * anterior (`render`, `evolucionar`) para que `Shop` y `main.js` no
 * necesiten conocer que la implementación interna cambió.
 *
 * No usa modelos 3D externos (.glb, texturas, etc.): el cuerpo y los
 * accesorios se construyen con primitivas de Three.js, coherente con
 * el requisito original de "sin activos externos".
 */

const COLOR_HEX = {
  verde: 0x68d391,
  azul: 0x4fa8f0,
  rojo: 0xff6f6f,
  morado: 0xb187f0,
};

const ESCALA_POR_FASE = {
  bebe: 0.7,
  infantil: 0.85,
  joven: 1.05,
  epica: 1.25,
};

export class Monster {
  constructor({ canvasEl }) {
    this._canvas = canvasEl;
    this._reloj = new THREE.Clock();
    this._faseActual = 'bebe';

    this._inicializarEscena();
    this._construirCuerpo();
    this._confetti = new Confetti(this._scene);
    this._animar();

    window.addEventListener('resize', () => this._ajustarTamano());
  }

  // -------------------------------------------------------------
  // Configuración de la escena (cámara, luces, renderer)
  // -------------------------------------------------------------
  _inicializarEscena() {
    this._scene = new THREE.Scene();

    const ancho = this._canvas.clientWidth || 300;
    const alto = this._canvas.clientHeight || 260;
    this._camera = new THREE.PerspectiveCamera(40, ancho / alto, 0.1, 100);
    this._camera.position.set(0, 1.1, 6);
    this._camera.lookAt(0, 0.3, 0);

    this._renderer = new THREE.WebGLRenderer({ canvas: this._canvas, alpha: true, antialias: true });
    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this._ajustarTamano();

    const luzAmbiente = new THREE.AmbientLight(0xffffff, 0.75);
    const luzDireccional = new THREE.DirectionalLight(0xffffff, 0.9);
    luzDireccional.position.set(2, 4, 3);
    this._scene.add(luzAmbiente, luzDireccional);
  }

  _ajustarTamano() {
    const ancho = this._canvas.clientWidth;
    const alto = this._canvas.clientHeight;
    if (!ancho || !alto) return;
    this._renderer.setSize(ancho, alto, false);
    this._camera.aspect = ancho / alto;
    this._camera.updateProjectionMatrix();
  }

  // -------------------------------------------------------------
  // Construcción del cuerpo del monstruo
  // -------------------------------------------------------------
  _construirCuerpo() {
    this._grupo = new THREE.Group();

    const geometriaCuerpo = new THREE.SphereGeometry(1, 32, 24);
    this._materialCuerpo = new THREE.MeshStandardMaterial({
      color: COLOR_HEX.verde,
      roughness: 0.4,
      metalness: 0.05,
    });
    this._cuerpo = new THREE.Mesh(geometriaCuerpo, this._materialCuerpo);
    this._cuerpo.scale.set(1, 0.82, 1); // achatado, aspecto "slime"
    this._grupo.add(this._cuerpo);

    // Ojos (siempre visibles, en todas las fases)
    const geometriaOjo = new THREE.SphereGeometry(0.13, 12, 12);
    const materialOjo = new THREE.MeshStandardMaterial({ color: 0x1a1330 });
    const ojoIzq = new THREE.Mesh(geometriaOjo, materialOjo);
    const ojoDer = new THREE.Mesh(geometriaOjo, materialOjo);
    ojoIzq.position.set(-0.32, 0.25, 0.82);
    ojoDer.position.set(0.32, 0.25, 0.82);
    this._grupo.add(ojoIzq, ojoDer);

    // Grupo de accesorios: se reconstruye por completo en cada
    // cambio de fase (ver `_reconstruirAccesorios`).
    this._accesorios = new THREE.Group();
    this._grupo.add(this._accesorios);

    this._scene.add(this._grupo);
  }

  // -------------------------------------------------------------
  // API pública (idéntica a la versión 2D)
  // -------------------------------------------------------------
  render({ colorBase, faseMonstruo }) {
    this._faseActual = faseMonstruo;
    this._materialCuerpo.color.setHex(COLOR_HEX[colorBase] ?? COLOR_HEX.verde);
    this._grupo.scale.setScalar(ESCALA_POR_FASE[faseMonstruo] ?? ESCALA_POR_FASE.bebe);
    this._reconstruirAccesorios(faseMonstruo);
  }

  evolucionar({ colorBase, faseMonstruo, nivelActual, nivelMaximo }) {
    this.render({ colorBase, faseMonstruo });
    this._animarPulsoEvolucion();
    this._confetti.lanzar(faseMonstruo, { esNivelMaximo: nivelActual >= nivelMaximo });
  }

  // -------------------------------------------------------------
  // Accesorios por fase: bracitos (infantil), piernas+antena (joven),
  // cuernos+alas (épica) — tal como pide la especificación.
  // -------------------------------------------------------------
  _reconstruirAccesorios(fase) {
    while (this._accesorios.children.length) {
      const hijo = this._accesorios.children[0];
      this._accesorios.remove(hijo);
    }

    const material = this._materialCuerpo;

    if (fase === 'infantil' || fase === 'joven' || fase === 'epica') {
      const geometriaBrazo = new THREE.SphereGeometry(0.18, 10, 10);
      const brazoIzq = new THREE.Mesh(geometriaBrazo, material);
      const brazoDer = new THREE.Mesh(geometriaBrazo, material);
      brazoIzq.position.set(-1.0, -0.1, 0);
      brazoDer.position.set(1.0, -0.1, 0);
      this._accesorios.add(brazoIzq, brazoDer);
    }

    if (fase === 'joven' || fase === 'epica') {
      const geometriaPierna = new THREE.CylinderGeometry(0.12, 0.12, 0.4, 10);
      const piernaIzq = new THREE.Mesh(geometriaPierna, material);
      const piernaDer = new THREE.Mesh(geometriaPierna, material);
      piernaIzq.position.set(-0.35, -0.95, 0);
      piernaDer.position.set(0.35, -0.95, 0);
      this._accesorios.add(piernaIzq, piernaDer);

      const antena = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 8), material);
      antena.position.set(0, 1.1, 0);
      const bolaAntena = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), material);
      bolaAntena.position.set(0, 1.4, 0);
      this._accesorios.add(antena, bolaAntena);
    }

    if (fase === 'epica') {
      const geometriaCuerno = new THREE.ConeGeometry(0.1, 0.35, 8);
      const cuernoIzq = new THREE.Mesh(geometriaCuerno, material);
      const cuernoDer = new THREE.Mesh(geometriaCuerno, material);
      cuernoIzq.position.set(-0.3, 0.85, 0.1);
      cuernoDer.position.set(0.3, 0.85, 0.1);
      cuernoIzq.rotation.z = 0.3;
      cuernoDer.rotation.z = -0.3;
      this._accesorios.add(cuernoIzq, cuernoDer);

      const geometriaAla = new THREE.PlaneGeometry(0.7, 0.9);
      const materialAla = new THREE.MeshStandardMaterial({
        color: material.color.getHex(),
        transparent: true,
        opacity: 0.75,
        side: THREE.DoubleSide,
      });
      const alaIzq = new THREE.Mesh(geometriaAla, materialAla);
      const alaDer = new THREE.Mesh(geometriaAla, materialAla);
      alaIzq.position.set(-0.9, 0.3, -0.3);
      alaDer.position.set(0.9, 0.3, -0.3);
      alaIzq.rotation.y = 0.5;
      alaDer.rotation.y = -0.5;
      this._accesorios.add(alaIzq, alaDer);
    }
  }

  _animarPulsoEvolucion() {
    const inicio = performance.now();
    const duracion = 700;
    const escalaBase = this._grupo.scale.x;

    const paso = (ahora) => {
      const t = Math.min((ahora - inicio) / duracion, 1);
      const pulso = 1 + Math.sin(t * Math.PI) * 0.35;
      this._grupo.scale.setScalar(escalaBase * pulso);
      if (t < 1) requestAnimationFrame(paso);
      else this._grupo.scale.setScalar(escalaBase);
    };
    requestAnimationFrame(paso);
  }

  // -------------------------------------------------------------
  // Bucle de animación: idle + física del confeti + render
  // -------------------------------------------------------------
  _animar() {
    const ciclo = () => {
      const delta = this._reloj.getDelta();
      const t = this._reloj.getElapsedTime();

      this._grupo.position.y = Math.sin(t * 1.4) * 0.12;
      if (this._faseActual === 'epica') {
        this._grupo.rotation.y = Math.sin(t * 0.6) * 0.15; // levita y se mece
      }

      this._confetti.actualizar(delta);
      this._renderer.render(this._scene, this._camera);
      requestAnimationFrame(ciclo);
    };
    requestAnimationFrame(ciclo);
  }
}
