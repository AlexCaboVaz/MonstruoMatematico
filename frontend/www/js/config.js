// config.js
// ---------
// Constantes de la aplicación. Aislar la URL base de la API en un
// único lugar evita repetirla ("magic string") en cada clase.
export const API_BASE_URL = 'https://juego-backend-usfs.onrender.com/';

export const FASES_MONSTRUO = Object.freeze({
  BEBE: 'bebe',
  INFANTIL: 'infantil',
  JOVEN: 'joven',
  EPICA: 'epica',
});

// Debe coincidir con `settings.nivel_maximo` del backend (Fase 2).
export const NIVEL_MAXIMO = 10;
