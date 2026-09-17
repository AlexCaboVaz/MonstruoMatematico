-- =====================================================================
-- Inserta (o actualiza si ya existieran) los 6 alimentos de la Nevera
-- Magica -- VERSION ASCII, segura frente a la codificacion WIN1252
-- de las terminales de Windows.
--
-- A diferencia de seed_shop_items_ascii.sql (que solo hacia UPDATE y
-- asumia que las filas ya existian), este script las INSERTA si no
-- existen, y las actualiza si ya existen (ON CONFLICT) -- asi sirve
-- tanto para una base nueva como para "arreglar" una a la que el
-- INSERT original le fallo por la codificacion.
--
-- Uso:  psql "TU_URL_DE_CONEXION" -f seed_shop_items_insert_ascii.sql
-- =====================================================================

INSERT INTO shop_items (item_key, nombre, emoji, costo_estrellas, nivel_min, nivel_max) VALUES
    ('calcetin_radiactivo', U&'Calcet\00EDn radiactivo',  U&'\+01F9E6', 1, 1,  3),
    ('tuerca_dorada',       U&'Tuerca dorada',            U&'\+01F529', 1, 1,  3),
    ('nube_tormenta',       U&'Nube de tormenta',         U&'\26C8',    2, 4,  6),
    ('sombrero_macarrones', U&'Sombrero de macarrones',   U&'\+01F35D', 2, 4,  6),
    ('planeta_mini',        U&'Planeta en miniatura',     U&'\+01FA90', 3, 7, 10),
    ('volcan_bolsillo',     U&'Volc\00E1n de bolsillo',   U&'\+01F30B', 3, 7, 10)
ON CONFLICT (item_key) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    emoji = EXCLUDED.emoji,
    costo_estrellas = EXCLUDED.costo_estrellas,
    nivel_min = EXCLUDED.nivel_min,
    nivel_max = EXCLUDED.nivel_max;

-- Verificacion: deben salir 6 filas con "bytes" en 3 o 4 (NO 2, NO 0 filas).
SELECT item_key, octet_length(emoji) AS bytes FROM shop_items;
