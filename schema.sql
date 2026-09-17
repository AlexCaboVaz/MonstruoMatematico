-- =====================================================================
-- MONSTRUO MATEMÁTICO — Fase 1: Esquema de Base de Datos (PostgreSQL)
-- =====================================================================
-- Filosofía: cero frustración, sin Game Over, refuerzo 100% positivo.
-- Este esquema soporta:
--   1) Progreso del jugador (players)
--   2) Ítems comprados en la Nevera Mágica (inventory)
--   3) Historial de aciertos/fallos por operación para el algoritmo
--      de repaso espaciado (analytics)
--
-- Se añade además una tabla de catálogo (shop_items) para no
-- "hardcodear" los ítems de la tienda en el backend ni en el frontend:
-- así el diseño de niveles 1-10 vive en datos, no en código (principio
-- Open/Closed: añadir un ítem nuevo no requiere tocar lógica).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Extensión para UUIDs (opcional pero recomendable en apps client-facing,
-- evita exponer IDs secuenciales predecibles).
-- ---------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------
-- Tabla: players
-- Representa el perfil del niño/a: nombre, color del slime base,
-- la "tabla" en la que está trabajando (nivel_actual) y sus estrellas.
-- ---------------------------------------------------------------------
CREATE TABLE players (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre              VARCHAR(40)  NOT NULL,
    color_base          VARCHAR(20)  NOT NULL
                         CHECK (color_base IN ('verde', 'azul', 'rojo', 'morado')),
    nivel_actual        SMALLINT     NOT NULL DEFAULT 1
                         CHECK (nivel_actual BETWEEN 1 AND 10),
    balance_estrellas   INTEGER      NOT NULL DEFAULT 0
                         CHECK (balance_estrellas >= 0),
    -- Fase visual del monstruo, derivada de nivel_actual pero cacheada
    -- para no recalcularla en cada render del frontend.
    fase_monstruo       VARCHAR(20)  NOT NULL DEFAULT 'bebe'
                         CHECK (fase_monstruo IN ('bebe', 'infantil', 'joven', 'epica')),
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now()
);

COMMENT ON TABLE players IS 'Perfil de cada niño/a jugador: identidad, progreso y economía de estrellas.';
COMMENT ON COLUMN players.nivel_actual IS 'Tabla de multiplicar activa (1 a 10). Sube al evolucionar al monstruo.';
COMMENT ON COLUMN players.fase_monstruo IS 'Fase visual cacheada: bebe(1-2) infantil(3-4) joven(5-7) epica(8-10).';

-- ---------------------------------------------------------------------
-- Tabla: shop_items (catálogo maestro de la Nevera Mágica)
-- No es una de las 3 tablas pedidas explícitamente, pero es necesaria
-- para que `inventory` tenga integridad referencial real y para poder
-- añadir/editar comida bizarra sin tocar código (dato, no lógica).
-- ---------------------------------------------------------------------
CREATE TABLE shop_items (
    id              SERIAL PRIMARY KEY,
    item_key        VARCHAR(50)  NOT NULL UNIQUE,
    nombre          VARCHAR(60)  NOT NULL,
    emoji           VARCHAR(10)  NOT NULL,
    costo_estrellas SMALLINT     NOT NULL CHECK (costo_estrellas > 0),
    -- Rango de niveles en los que aparece disponible en la nevera.
    nivel_min       SMALLINT     NOT NULL CHECK (nivel_min BETWEEN 1 AND 10),
    nivel_max       SMALLINT     NOT NULL CHECK (nivel_max BETWEEN 1 AND 10),
    CHECK (nivel_max >= nivel_min)
);

COMMENT ON TABLE shop_items IS 'Catálogo de comida bizarra disponible en la Nevera Mágica, agrupada por rango de nivel.';

-- Semilla de ejemplo (ampliable sin tocar backend/frontend):
INSERT INTO shop_items (item_key, nombre, emoji, costo_estrellas, nivel_min, nivel_max) VALUES
    ('calcetin_radiactivo', 'Calcetín radiactivo', '🧦', 1, 1, 3),
    ('tuerca_dorada',       'Tuerca dorada',        '🔩', 1, 1, 3),
    ('nube_tormenta',       'Nube de tormenta',     '⛈️', 2, 4, 6),
    ('sombrero_macarrones', 'Sombrero de macarrones','🍝', 2, 4, 6),
    ('planeta_mini',        'Planeta en miniatura', '🪐', 3, 7, 10),
    ('volcan_bolsillo',     'Volcán de bolsillo',   '🌋', 3, 7, 10);

-- ---------------------------------------------------------------------
-- Tabla: inventory
-- Registra cada compra que hace el jugador en la nevera mágica.
-- Un mismo item_id puede comprarse varias veces (histórico de "comidas").
-- ---------------------------------------------------------------------
CREATE TABLE inventory (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id       UUID        NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    item_id         INTEGER     NOT NULL REFERENCES shop_items(id),
    -- true = ya fue arrastrado a la boca del monstruo (consumido).
    consumido       BOOLEAN     NOT NULL DEFAULT FALSE,
    comprado_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    consumido_at    TIMESTAMPTZ
);

COMMENT ON TABLE inventory IS 'Ítems comprados por cada jugador y si ya fueron dados de comer al monstruo.';

CREATE INDEX idx_inventory_player_pendiente
    ON inventory (player_id)
    WHERE consumido = FALSE;

-- ---------------------------------------------------------------------
-- Tabla: analytics
-- Núcleo del algoritmo de repaso espaciado: cuántas veces acertó/falló
-- el jugador cada operación concreta (ej. "4x7"), para poder elegir
-- las 2 cartas de repaso de niveles anteriores con más fail_count.
-- ---------------------------------------------------------------------
CREATE TABLE analytics (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id       UUID        NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    -- operation_id identifica la operación de forma determinista,
    -- ej. "3x7" (factor_a x factor_b con factor_a <= factor_b para
    -- evitar duplicar 3x7 y 7x3 como filas distintas).
    operation_id    VARCHAR(10) NOT NULL,
    factor_a        SMALLINT    NOT NULL CHECK (factor_a BETWEEN 1 AND 10),
    factor_b        SMALLINT    NOT NULL CHECK (factor_b BETWEEN 1 AND 10),
    success_count   INTEGER     NOT NULL DEFAULT 0 CHECK (success_count >= 0),
    fail_count      INTEGER     NOT NULL DEFAULT 0 CHECK (fail_count >= 0),
    last_practiced_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (player_id, operation_id)
);

COMMENT ON TABLE analytics IS 'Historial por jugador y operación: base del algoritmo de repaso espaciado.';
COMMENT ON COLUMN analytics.operation_id IS 'Clave determinista de la operación, ej. "3x7".';

-- Índice clave para el algoritmo de spaced repetition: traer rápido
-- las operaciones con más fallos de niveles YA SUPERADOS.
CREATE INDEX idx_analytics_repaso
    ON analytics (player_id, fail_count DESC);

-- ---------------------------------------------------------------------
-- Trigger utilitario: mantener updated_at de players al día.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_players_updated_at
    BEFORE UPDATE ON players
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
