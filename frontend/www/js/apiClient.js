import { API_BASE_URL } from './config.js';

/**
 * ApiClient
 * ---------
 * Responsabilidad única: hablar con el backend por HTTP. Ninguna otra
 * clase del frontend construye una URL o llama a `fetch` directamente;
 * así, si el contrato de la API cambia, solo se toca este archivo.
 */
export class ApiClient {
  constructor(baseUrl = API_BASE_URL) {
    this._baseUrl = "https://juego-backend-usfs.onrender.com";
  }

  async _request(path, options = {}) {
    const respuesta = await fetch(`${this._baseUrl}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    if (!respuesta.ok) {
      const detalle = await respuesta.json().catch(() => ({}));
      throw new Error(detalle.detail || `Error de red (${respuesta.status})`);
    }
    return respuesta.json();
  }

  crearJugador(nombre, colorBase) {
    return this._request('/api/players', {
      method: 'POST',
      body: JSON.stringify({ nombre, color_base: colorBase }),
    });
  }

  obtenerJugador(playerId) {
    return this._request(`/api/players/${playerId}`);
  }

  generarRonda(playerId, nivel = null) {
    const query = nivel != null ? `?nivel=${nivel}` : '';
    return this._request(`/players/${playerId}/round${query}`);
  }

  enviarRespuesta(playerId, payload) {
    return this._request(`/players/${playerId}/answer`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  listarTienda(playerId) {
    return this._request(`/api/players/${playerId}/shop-items`);
  }

  listarComidaPendiente(playerId) {
    return this._request(`/api/players/${playerId}/pending-food`);
  }

  comprarItem(playerId, itemId) {
    return this._request(`/api/players/${playerId}/purchases`, {
      method: 'POST',
      body: JSON.stringify({ item_id: itemId }),
    });
  }

  alimentarMonstruo(playerId, inventoryId) {
    return this._request(`/api/players/${playerId}/feed`, {
      method: 'POST',
      body: JSON.stringify({ inventory_id: inventoryId }),
    });
  }
}
