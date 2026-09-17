/**
 * AudioFx
 * -------
 * Efectos de sonido generados con la Web Audio API (osciladores),
 * para no depender de archivos de audio externos. Se instancia de
 * forma perezosa porque los navegadores exigen una interacción del
 * usuario antes de permitir audio.
 */
export class AudioFx {
  constructor() {
    this._ctx = null;
  }

  _obtenerContexto() {
    if (!this._ctx) {
      const AudioContextCls = window.AudioContext || window.webkitAudioContext;
      this._ctx = new AudioContextCls();
    }
    return this._ctx;
  }

  /** Sonido de "muelle" (spring) para el feedback de fallo, sin dramatismo. */
  reproducirMuelle() {
    try {
      const ctx = this._obtenerContexto();
      const oscilador = ctx.createOscillator();
      const ganancia = ctx.createGain();

      oscilador.type = 'sine';
      oscilador.frequency.setValueAtTime(220, ctx.currentTime);
      oscilador.frequency.exponentialRampToValueAtTime(90, ctx.currentTime + 0.18);

      ganancia.gain.setValueAtTime(0.12, ctx.currentTime);
      ganancia.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);

      oscilador.connect(ganancia).connect(ctx.destination);
      oscilador.start();
      oscilador.stop(ctx.currentTime + 0.22);
    } catch {
      // Si el navegador bloquea audio (aún sin interacción, etc.) el
      // juego debe seguir funcionando igual: el sonido es un extra.
    }
  }

  /** Campanita suave para el acierto. */
  reproducirAcierto() {
    try {
      const ctx = this._obtenerContexto();
      const oscilador = ctx.createOscillator();
      const ganancia = ctx.createGain();

      oscilador.type = 'triangle';
      oscilador.frequency.setValueAtTime(520, ctx.currentTime);
      oscilador.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);

      ganancia.gain.setValueAtTime(0.1, ctx.currentTime);
      ganancia.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

      oscilador.connect(ganancia).connect(ctx.destination);
      oscilador.start();
      oscilador.stop(ctx.currentTime + 0.25);
    } catch {
      // El sonido es un extra; nunca debe romper el flujo del juego.
    }
  }

  /** Mordisco corto y grave al dar de comer a Multidrake. */
  reproducirMordisco() {
    try {
      const ctx = this._obtenerContexto();
      const oscilador = ctx.createOscillator();
      const ganancia = ctx.createGain();

      oscilador.type = 'square';
      oscilador.frequency.setValueAtTime(140, ctx.currentTime);
      oscilador.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.12);

      ganancia.gain.setValueAtTime(0.14, ctx.currentTime);
      ganancia.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

      oscilador.connect(ganancia).connect(ctx.destination);
      oscilador.start();
      oscilador.stop(ctx.currentTime + 0.15);
    } catch {
      // El sonido es un extra; nunca debe romper el flujo del juego.
    }
  }
}
