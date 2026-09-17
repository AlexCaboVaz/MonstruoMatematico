-- =====================================================================
-- Seed de la Nevera Magica -- VERSION SEGURA (UPDATE, no DELETE)
-- =====================================================================
-- No borra filas (evitamos el conflicto con la tabla "inventory", que
-- ya tiene compras referenciando estos items) -- solo actualiza el
-- nombre y el emoji de cada fila existente, identificandola por su
-- "item_key" (que nunca cambia).
--
-- Los emojis y tildes van como escapes Unicode ASCII (U&'\+01F9E6'):
-- PostgreSQL los convierte al caracter real YA DENTRO del servidor,
-- asi que no hay ningun byte especial que Windows pueda corromper por
-- el camino.
--
-- Uso:  psql -d monstruo_db -f seed_shop_items_ascii.sql
-- =====================================================================

UPDATE shop_items SET nombre = U&'Calcet\00EDn radiactivo', emoji = U&'\+01F9E6' WHERE item_key = 'calcetin_radiactivo';
UPDATE shop_items SET nombre = U&'Tuerca dorada',           emoji = U&'\+01F529' WHERE item_key = 'tuerca_dorada';
UPDATE shop_items SET nombre = U&'Nube de tormenta',        emoji = U&'\26C8'    WHERE item_key = 'nube_tormenta';
UPDATE shop_items SET nombre = U&'Sombrero de macarrones',  emoji = U&'\+01F35D' WHERE item_key = 'sombrero_macarrones';
UPDATE shop_items SET nombre = U&'Planeta en miniatura',    emoji = U&'\+01FA90' WHERE item_key = 'planeta_mini';
UPDATE shop_items SET nombre = U&'Volc\00E1n de bolsillo',  emoji = U&'\+01F30B' WHERE item_key = 'volcan_bolsillo';

-- Verificacion: la columna "bytes" debe mostrar 3 o 4 (NO 2).
SELECT item_key, octet_length(emoji) AS bytes FROM shop_items;
