// config.js
// ---------
// Constantes de la aplicación. Aislar la URL base de la API en un
// único lugar evita repetirla ("magic string") en cada clase.
//
// Ruta RELATIVA a propósito ('/api', no 'http://localhost:8000/api'):
// así, cuando el backend sirve también el frontend (ver main.py,
// StaticFiles), el juego funciona igual en localhost, en la red
// local del móvil, o ya desplegado en un dominio real — sin tener
// que tocar este archivo ni volver a generar el APK cada vez.
export const API_BASE_URL = '/api';

export const FASES_MONSTRUO = Object.freeze({
  BEBE: 'bebe',
  INFANTIL: 'infantil',
  JOVEN: 'joven',
  EPICA: 'epica',
});

// Debe coincidir con `settings.nivel_maximo` del backend (Fase 2).
export const NIVEL_MAXIMO = 10;
