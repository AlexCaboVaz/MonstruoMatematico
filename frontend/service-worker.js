/**
 * service-worker.js
 * ------------------
 * Service worker mínimo: solo lo justo para que el navegador
 * considere la web una PWA instalable (es un requisito técnico de
 * la especificación, junto con el manifest.json). No cachea nada de
 * forma agresiva a propósito — este es un juego con datos en vivo
 * (estrellas, nivel), así que preferimos que siempre pida la versión
 * más fresca de la API en vez de arriesgarnos a mostrar datos viejos.
 */
self.addEventListener('install', (evento) => {
  self.skipWaiting();
});

self.addEventListener('activate', (evento) => {
  self.clients.claim();
});

// Passthrough: deja pasar todas las peticiones tal cual, sin caché.
self.addEventListener('fetch', (evento) => {
  evento.respondWith(fetch(evento.request));
});
